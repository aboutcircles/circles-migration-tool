import { mnemonicToEntropy, validateMnemonic } from 'bip39';
import { Eye, EyeOff, Lock, Download } from 'lucide-react';
import { useState } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import { useWallet } from '../context/WalletContext';
import toast from 'react-hot-toast';

interface CirclesGardenViewProps {
    onClose?: () => void;
}

export function CirclesGardenView({ onClose }: CirclesGardenViewProps) {
    const [seedPhrase, setSeedPhrase] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    
    const { setPkAccount } = useWallet();
    const wordCount = seedPhrase.trim() ? seedPhrase.trim().split(/\s+/).length : 0;

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    const handleImportFromLocalStorage = () => {
        try {
            const storedKey = localStorage.getItem('circles-production-mainnet-privateKey');
            if (!storedKey) {
                toast.error('No key found in localStorage. Please enter your seed phrase manually.');
                return;
            }
            const privateKey = storedKey.startsWith('0x') ? storedKey : `0x${storedKey}`;
            const account = privateKeyToAccount(privateKey as `0x${string}`);
            console.log('EOA Address derived from localStorage key:', account.address);
            setPkAccount({ privateKey, account });

            onClose?.();
        } catch (error) {
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
            setPkAccount({privateKey: `0x${keyFromMnemonic}`, account: account});

            onClose?.();
        } catch (error) {
            toast.error('Error processing seed phrase. Please try again.');
        }
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
                className="btn btn-outline btn-lg w-full rounded-xl transition-all"
            >
                <Download size={18} />
                Import from browser (localStorage)
            </button>
            <p className="text-xs text-base-content/50 mt-2 text-center">
                Reads the key stored by Circles Garden in your browser's localStorage.
            </p>
        </div>
    );
} 