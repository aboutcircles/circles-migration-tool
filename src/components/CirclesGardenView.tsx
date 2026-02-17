import { mnemonicToEntropy, validateMnemonic } from 'bip39';
import { Eye, EyeOff, Lock, Download, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Address } from 'viem';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { useWallet } from '../context/WalletContext';
import { findSafesFromSigner } from '../utils/safeDerivation';
import toast from 'react-hot-toast';
import { CopyButton } from './CopyButton';
import { JsonRpcProvider } from 'ethers';
import { PrivateKeyContractRunner } from '@circles-sdk/adapter-ethers';
import { Sdk } from '@circles-sdk/sdk';
import { fetchSafeAvatarTags, SafeAvatarTag } from '../utils/safeAvatarTags';

interface CirclesGardenViewProps {
    onClose?: () => void;
}

export function CirclesGardenView({ onClose }: CirclesGardenViewProps) {
    const [seedPhrase, setSeedPhrase] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    
    const [showNoSafeModal, setShowNoSafeModal] = useState(false);
    const [showSelectSafeModal, setShowSelectSafeModal] = useState(false);
    const [availableSafes, setAvailableSafes] = useState<Address[]>([]);
    const [safeAvatarTags, setSafeAvatarTags] = useState<Record<string, SafeAvatarTag>>({});
    const [pendingAccount, setPendingAccount] = useState<{ privateKey: `0x${string}`; account: PrivateKeyAccount; seedPhrase?: string } | null>(null);
    const [isCheckingSafe, setIsCheckingSafe] = useState(false);
    const { setPkAccount, setSelectedSafeAddress } = useWallet();
    const wordCount = seedPhrase.trim() ? seedPhrase.trim().split(/\s+/).length : 0;

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    const loadSafeAvatarTags = async (
        privateKey: `0x${string}`,
        safes: Address[]
    ): Promise<Record<string, SafeAvatarTag>> => {
        try {
            const rpcProvider = new JsonRpcProvider('https://rpc.circlesubi.network');
            const runner = new PrivateKeyContractRunner(rpcProvider, privateKey);
            await runner.init();
            const sdk = new Sdk(runner as any);
            return await fetchSafeAvatarTags(sdk, safes);
        } catch (error) {
            console.warn('Failed to fetch Safe status tags:', error);
            return {};
        }
    };

    const getTagClass = (tag: SafeAvatarTag): string => {
        return tag.startsWith("v2")
            ? "badge-success"
            : "badge-warning";
    };

    const findAndHandleSafes = async (
        privateKey: `0x${string}`,
        account: PrivateKeyAccount,
        seedPhraseInput?: string
    ) => {
        setIsCheckingSafe(true);
        try {
            const safes = await findSafesFromSigner(account.address);

            if (safes.length === 0) {
                setShowNoSafeModal(true);
                return;
            }

            if (safes.length === 1) {
                setSelectedSafeAddress(safes[0]);
                setPkAccount({ privateKey, account, seedPhrase: seedPhraseInput });
                onClose?.();
                return;
            }

            const tags = await loadSafeAvatarTags(privateKey, safes);
            setSafeAvatarTags(tags);
            setAvailableSafes(safes);
            setPendingAccount({ privateKey, account, seedPhrase: seedPhraseInput });
            setShowSelectSafeModal(true);
        } finally {
            setIsCheckingSafe(false);
        }
    };

    const handleImportFromLocalStorage = async () => {
        try {
            const storedKey = localStorage.getItem('circles-production-mainnet-privateKey');
            if (!storedKey) {
                toast.error('No key found in localStorage. Please enter your seed phrase manually.');
                return;
            }
            const privateKey = storedKey.startsWith('0x') ? storedKey : `0x${storedKey}`;
            const account = privateKeyToAccount(privateKey as `0x${string}`);
            console.log('EOA Address derived from localStorage key:', account.address);
            await findAndHandleSafes(privateKey as `0x${string}`, account);
        } catch (error) {
            setIsCheckingSafe(false);
            toast.error('Error reading key from localStorage. Please enter your seed phrase manually.');
        }
    };

    const handleValidate = async () => {
        try {
            const isValidMnemonic = validateMnemonic(seedPhrase);
            if (!isValidMnemonic) {
                toast.error('Invalid seed phrase. Please check your words and try again.');
                return;
            }

            const keyFromMnemonic = mnemonicToEntropy(seedPhrase);
            const account = privateKeyToAccount(`0x${keyFromMnemonic}` as `0x${string}`);
            console.log('EOA Address derived from seed phrase:', account.address);
            await findAndHandleSafes(`0x${keyFromMnemonic}`, account, seedPhrase);
        } catch (error) {
            toast.error('Error processing seed phrase. Please try again.');
        }
    };

    const handleSafeSelection = (safeAddress: Address) => {
        if (!pendingAccount) {
            return;
        }

        setSelectedSafeAddress(safeAddress);
        setPkAccount({
            privateKey: pendingAccount.privateKey,
            account: pendingAccount.account,
            seedPhrase: pendingAccount.seedPhrase,
        });
        setShowSelectSafeModal(false);
        setPendingAccount(null);
        setAvailableSafes([]);
        setSafeAvatarTags({});
        onClose?.();
    };

    return (
        <div className="p-6 sm:p-8 max-w-2xl mx-auto">
            {/* Header */}
            <h1 className="text-2xl font-bold text-primary">Enter Circles Garden key phrase</h1>
            <p className="text-sm text-base-content/70 mb-6">Please enter or paste your keyphrase from circles.garden below.</p>
            {/* Seed Phrase Input */}
            <div className="mb-6">
                <div className="relative">
                    <textarea
                        value={seedPhrase}
                        onChange={(e) => setSeedPhrase(e.target.value)}
                        placeholder="Enter your 24-word seed phrase..."
                        className={`textarea textarea-bordered w-full font-mono text-sm sm:text-base tracking-wider min-h-32 focus:ring-2 focus:ring-primary/20 ${
                            isVisible ? '' : 'text-security-disc'
                        }`}
                        rows={4}
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4 text-sm">
                    <span className={`font-semibold ${wordCount === 24 ? 'text-success' : 'text-base-content/70'}`}>
                        {wordCount}/24 words
                    </span>
                    <button
                        onClick={toggleVisibility}
                        className="btn btn-circle btn-sm btn-ghost hover:bg-primary/10"
                        title={isVisible ? "Hide seed phrase" : "Show seed phrase"}
                    >
                        {isVisible ? (
                            <Eye size={18} className="text-primary" />
                        ) : (
                            <EyeOff size={18} className="text-base-content/50" />
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-base-content/60">
                    <Lock size={14} className="flex-shrink-0" />
                    <span>Your seed phrase is never stored</span>
                </div>
            </div>

            {/* Validate Button */}
            <button
                onClick={handleValidate}
                disabled={wordCount !== 24}
                className="btn btn-neutral btn-lg w-full rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
                Continue
            </button>

            {/* Divider */}
            <div className="divider text-base-content/50 my-6">OR</div>

            {/* Import from localStorage */}
            <button
                onClick={handleImportFromLocalStorage}
                disabled={isCheckingSafe}
                className="btn btn-outline btn-lg w-full rounded-xl transition-all disabled:opacity-50"
            >
                {isCheckingSafe ? (
                    <span className="loading loading-spinner loading-sm"></span>
                ) : (
                    <Download size={18} />
                )}
                {isCheckingSafe ? 'Checking account...' : 'Import from browser (localStorage)'}
            </button>
            <p className="text-xs text-base-content/50 mt-2 text-center">
                Reads the key stored by Circles Garden in your browser's localStorage.
            </p>

            {/* No Safe Found Modal */}
            {showNoSafeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-base-100 rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                        <button
                            onClick={() => setShowNoSafeModal(false)}
                            className="btn btn-ghost btn-sm btn-circle absolute top-3 right-3"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center">
                                <AlertTriangle size={28} className="text-warning" />
                            </div>

                            <h3 className="text-lg font-bold">No Safe found</h3>

                            <p className="text-sm text-base-content/70">
                                No Safe was found for this signer address.
                                Please verify your key phrase and try again.
                            </p>

                            <button
                                onClick={() => setShowNoSafeModal(false)}
                                className="btn btn-neutral btn-md w-full rounded-xl mt-2"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSelectSafeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-base-100 rounded-2xl shadow-xl max-w-2xl w-full p-6 relative">
                        <button
                            onClick={() => setShowSelectSafeModal(false)}
                            className="btn btn-ghost btn-sm btn-circle absolute top-3 right-3"
                        >
                            <X size={18} />
                        </button>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold">Select Account to migrate</h3>
                            <p className="text-sm text-base-content/70">
                                Multiple Safes were found for this signer. Choose the Safe you want to use for migration.
                            </p>

                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {availableSafes.map((safe) => {
                                    const safeTag = safeAvatarTags[safe.toLowerCase()];
                                    return (
                                    <div key={safe} className="flex items-center justify-between gap-3 rounded-xl border border-base-300 p-3">
                                        <div className="min-w-0">
                                            <span className="font-mono text-xs sm:text-sm break-all block">{safe}</span>
                                            {safeTag && (
                                                <span className={`badge badge-sm mt-1 ${getTagClass(safeTag)}`}>
                                                    {safeTag}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <CopyButton text={safe} />
                                            <button
                                                onClick={() => handleSafeSelection(safe)}
                                                className="btn btn-sm btn-neutral rounded-lg"
                                            >
                                                Use Safe
                                            </button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
