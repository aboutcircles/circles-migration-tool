import { useState, useMemo } from 'react';
import { Eye, EyeOff, Copy, Check, KeyRound } from 'lucide-react';
import { entropyToMnemonic } from 'bip39';
import { useWallet } from '../context/WalletContext';

export function SeedPhraseDisplay() {
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    const { seedPhrase, eoaAddress } = useWallet();

    // Access private key from localStorage if no seed phrase was provided directly
    const derivedMnemonic = useMemo(() => {
        if (seedPhrase) return seedPhrase;

        try {
            const storedKey = localStorage.getItem('circles-production-mainnet-privateKey');
            if (!storedKey) return null;
            const entropy = storedKey.startsWith('0x') ? storedKey.slice(2) : storedKey;
            return entropyToMnemonic(entropy);
        } catch {
            return null;
        }
    }, [seedPhrase]);

    if (!derivedMnemonic || !eoaAddress) return null;

    const words = derivedMnemonic.trim().split(/\s+/);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(derivedMnemonic);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <KeyRound size={20} className="text-primary" />
                    <h3 className="font-bold text-lg">Your Seed Phrase</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsVisible(!isVisible)}
                        className="btn btn-sm btn-ghost btn-circle hover:bg-primary/10"
                        title={isVisible ? 'Hide seed phrase' : 'Show seed phrase'}
                    >
                        {isVisible ? (
                            <Eye size={18} className="text-primary" />
                        ) : (
                            <EyeOff size={18} className="text-base-content/50" />
                        )}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="btn btn-sm btn-ghost btn-circle hover:bg-primary/10"
                        title="Copy seed phrase"
                    >
                        {copied ? (
                            <Check size={18} className="text-success" />
                        ) : (
                            <Copy size={18} className="text-base-content/50" />
                        )}
                    </button>
                </div>
            </div>

            {isVisible ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {words.map((word, i) => (
                        <div
                            key={i}
                            className="bg-base-200/60 rounded-lg px-3 py-2 text-sm font-mono"
                        >
                            <span className="text-base-content/40 mr-1">{i + 1}.</span>
                            {word}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-base-200/60 rounded-lg px-4 py-6 text-center text-sm text-base-content/50">
                    Click the eye icon to reveal your seed phrase
                </div>
            )}

            <p className="text-xs text-base-content/50 mt-4">
                {seedPhrase
                    ? 'This is the seed phrase you entered during import.'
                    : 'This seed phrase was derived from your localStorage key.'}
                {' '}Store it safely — anyone with this phrase can access your account.
            </p>
        </div>
    );
}
