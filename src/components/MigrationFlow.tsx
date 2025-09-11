import { Address } from "viem";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { truncateAddress } from "../utils/address";
import { Profile } from "@circles-sdk/profiles";
import { AvatarRow, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { getStatuses } from "../utils/status";

interface MigrationFlowProps {
    address: Address;
    profile: Profile;
    onStartMigration: () => void;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
    state: "not-registered" | "registered-v2" | "migrated" | "ready-to-migrate" | "migrating";
    invitations: AvatarRow[];
}

export function MigrationFlow({ address, profile, state, onStartMigration, circlesBalance, trustConnections, invitations }: MigrationFlowProps) {
    const [copied, setCopied] = useState(false);
    const statuses = getStatuses(onStartMigration);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleAction = (action: () => void) => {
        action();
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Status Header */}
            <div className="bg-green-50 border-b border-green-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">{statuses[state].title}</h2>
                <p className="text-sm text-gray-600">{statuses[state].description}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">Avatar</h3>
                        {state === "ready-to-migrate" && (
                            <div className="flex items-center space-x-2">
                                <span className="badge badge-xs badge-error">{invitations.length} invitation{invitations.length !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <div className="flex items-center space-x-2">
                            <img src={profile.previewImageUrl} alt="Avatar" className="w-8 h-8 rounded-full" />
                            <div className="flex flex-col space-x-2">
                                {profile.name}
                                <span className="font-mono text-sm text-gray-900">
                                    {truncateAddress(address)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleCopy}
                                className="btn btn-sm btn-ghost btn-circle"
                                title="Copy address"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>
                            <a href={`https://explorer.aboutcircles.com/avatar/${address}`} target="_blank" rel="noopener noreferrer"
                                className="btn btn-sm btn-ghost btn-circle"
                                title="View on explorer"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Balance</h3>
                        <div className="text-xl font-semibold text-gray-900">
                            {circlesBalance.reduce((acc, balance) => acc + balance.circles, 0).toFixed(2)} CRC
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Trust Connections</h3>
                        <div className="text-xl font-semibold text-gray-900">
                            {trustConnections.length} trust{trustConnections.length > 1 ? "s" : ""}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center space-y-3">
                    <button
                        onClick={() => handleAction(statuses[state].action)}
                        className="btn btn-sm btn-primary"
                        disabled={state === "ready-to-migrate" && invitations.length === 0}
                    >
                        {statuses[state].actionTitle}
                    </button>

                    {state === "ready-to-migrate" && invitations.length === 0 && (
                        <a
                            href="https://circles.garden/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <span>Get invited to Circles</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        </div >
    );
}