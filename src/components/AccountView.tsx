import { ArrowUpRight, X } from "lucide-react";
import { truncateAddress } from "../utils/address";
import { CopyButton } from "./CopyButton";
import { Address } from "viem";
import { SafeAvatarTag } from "../utils/safeAvatarTags";

interface AccountViewProps {
    address: Address;
    safeAddress?: Address;
    safeAddresses: Address[];
    safeAvatarTags: Record<string, SafeAvatarTag>;
    isLoadingSafeAvatarTags: boolean;
    onSafeSelected: (safe: Address) => void;
    connectedChain: string;
    disconnect: () => void;
    onClose: () => void
}

const getTagClass = (tag: SafeAvatarTag): string => {
    return tag.startsWith("v2")
        ? "badge-success"
        : "badge-warning";
};

export function AccountView({
    address,
    safeAddress,
    safeAddresses,
    safeAvatarTags,
    isLoadingSafeAvatarTags,
    onSafeSelected,
    connectedChain,
    disconnect,
    onClose,
}: AccountViewProps) {

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
                {safeAddresses.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold text-base-content mb-3">Select Account for Migration</h4>
                        {safeAddresses.length > 1 && isLoadingSafeAvatarTags && (
                            <p className="text-xs text-base-content/60 mb-2">Loading Safe status tags...</p>
                        )}
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                            {safeAddresses.map((safe) => {
                                const isSelected = safeAddress?.toLowerCase() === safe.toLowerCase();
                                const safeTag = safeAvatarTags[safe.toLowerCase()];
                                return (
                                    <div key={safe} className="flex items-center justify-between gap-2 border border-base-300 rounded-xl p-3">
                                        <div className="min-w-0">
                                            <span className="font-mono text-xs break-all block">{safe}</span>
                                            {safeTag && (
                                                <span className={`badge badge-sm mt-1 ${getTagClass(safeTag)}`}>
                                                    {safeTag}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <CopyButton text={safe} />
                                            <button
                                                onClick={() => onSafeSelected(safe)}
                                                className={`btn btn-xs rounded-lg ${isSelected ? "btn-primary" : "btn-outline"}`}
                                                disabled={isSelected}
                                            >
                                                {isSelected ? "Selected" : "Use Safe"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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
