import { ArrowUpRight, X } from "lucide-react";
import { truncateAddress } from "../utils/address";
import { CopyButton } from "./CopyButton";
import { Address } from "viem";

interface AccountViewProps {
    address: Address;
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
            <div className="px-6 py-5 border-b border-base-300 bg-base-200/30">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-primary mb-2">
                            Connected Wallet
                        </h3>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-base-content font-mono">
                                {truncateAddress(address)}
                            </span>
                            <CopyButton text={address} />
                        </div>
                        <p className="text-xs text-base-content/60 font-medium">
                            {connectedChain}
                        </p>
                    </div>
                    <button 
                        onClick={handleDisconnect} 
                        className="btn btn-sm btn-outline btn-error rounded-lg hover:bg-error hover:text-white transition-all flex-shrink-0"
                    >
                        <X size={16} />
                        Disconnect
                    </button>
                </div>
            </div>

            {/* External Links Section */}
            <div className="p-6">
                {/* <h4 className="text-sm font-semibold text-base-content mb-4">Quick Links</h4> */}
                <div className="space-y-2">
                    <a
                        href="https://discord.com/invite/aboutcircles"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full p-3 text-sm rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all duration-200 group"
                    >
                        <span className="font-medium text-base-content group-hover:text-primary">Support</span>
                        <ArrowUpRight size={16} className="text-base-content/40 group-hover:text-primary" />
                    </a>
                </div>
            </div>
        </>
    );
} 