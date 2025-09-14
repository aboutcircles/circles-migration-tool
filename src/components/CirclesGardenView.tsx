import { mnemonicToEntropy, validateMnemonic } from 'bip39';
import { Eye, EyeOff, Lock } from 'lucide-react';
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

    const handleValidate = async () => {
        try {
            const isValidMnemonic = validateMnemonic(seedPhrase);
            if (!isValidMnemonic) {
                toast.error('Invalid seed phrase. Please check your words and try again.');
                return;
            }

            const keyFromMnemonic = mnemonicToEntropy(seedPhrase);
            const account = privateKeyToAccount(`0x${keyFromMnemonic}` as `0x${string}`);
            setPkAccount({privateKey: `0x${keyFromMnemonic}`, account: account});
            
            onClose?.();
        } catch (error) {
            toast.error('Error processing seed phrase. Please try again.');
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            {/* Header */}
            <h1 className="text-2xl font-bold text-primary">Enter Secret Garden key phrase</h1>
            <p className="text-sm text-base-content/70 mb-6">Please enter or paste your keyphrase from circles.garden below.</p>

            {/* Seed Phrase Input */}
            <div className="mb-6">
                <div className="relative">
                    <textarea
                        value={seedPhrase}
                        onChange={(e) => setSeedPhrase(e.target.value)}
                        placeholder="twenty-four words..."
                        className="textarea textarea-bordered w-full font-mono tracking-wider"
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4 text-sm">
                    <span className="text-base-content/70">
                        {wordCount}/24 words
                    </span>
                    <button
                        onClick={toggleVisibility}
                        className="btn btn-circle btn-sm btn-ghost"
                    >
                        {isVisible ? (
                            <Eye size={16} />
                        ) : (
                            <EyeOff size={16} />
                        )}
                    </button>
                </div>

                <div className="flex items-center space-x-2 text-sm text-base-content/50">
                    <Lock size={12} />
                    <span className="text-sm text-base-content/50">Your seed phrase is never stored.</span>
                </div>
            </div>

            {/* Validate Button */}
            <button
                onClick={handleValidate}
                disabled={wordCount !== 24}
                className="btn btn-primary"
            >
                Connect
            </button>
        </div>
    );
} 