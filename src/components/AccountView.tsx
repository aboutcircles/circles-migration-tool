import { ArrowUpRight, X } from "lucide-react";
import { truncateAddress } from "../utils/address";

interface AccountViewProps {
    address: `0x${string}`;
    connectedChain: string;
    disconnect: () => void;
    onClose: () => void
}

export function AccountView({ address, connectedChain, disconnect, onClose }: AccountViewProps) {

    const handleDisconnect = () => {
        disconnect();
        onClose();
    };

    return (
        <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-base-300">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-base">
                            Wallet
                        </h3>
                        <p className="text-sm text-base-content/70 font-mono">
                            {truncateAddress(address)}
                        </p>
                        <p className="text-xs text-base-content/50 mt-1">
                            {connectedChain}
                        </p>
                    </div>
                    <button onClick={handleDisconnect} className="btn btn-sm btn-outline btn-error">
                        Disconnect <X size={16} />
                    </button>
                </div>
            </div>

            {/* External Links Section */}
            <div className="border-t border-base-300">
                <div className="px-6 py-3">
                    <h4 className="text-sm font-medium text-base-content/70 mb-3">External Links</h4>
                    <div className="space-y-1">
                        <a 
                            href="https://app.metri.xyz/welcome"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between w-full p-2 text-sm rounded-lg hover:bg-base-200 transition-colors duration-200 group"
                        >
                            <span>Join Circles</span>
                            <ArrowUpRight size={16} />
                        </a>
                        <a
                            href="https://discord.com/invite/aboutcircles"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between w-full p-2 text-sm rounded-lg hover:bg-base-200 transition-colors duration-200 group"
                        >
                            <span>Get Help</span>
                            <ArrowUpRight size={16} />
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
} 