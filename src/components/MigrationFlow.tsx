import { Address } from "viem";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { truncateAddress } from "../utils/address";
import { Profile } from "@circles-sdk/profiles";
import { TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";

interface MigrationFlowProps {
    address: Address;
    profile: Profile;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
    state: "not-registered" | "registered-v2" | "migrated" | "migrating";
}

const statuses = {
    "not-registered": {
        title: "Not Registered",
        description: "Your v1 account has not been registered on Circles",
        status: "Not Registered",
    },
    "registered-v2": {
        title: "Registered on v2",
        description: "Your v1 account has been registered on Circles v2",
        status: "Registered on v2",
    },
    "migrated": {
        title: "Migrated",
        description: "Your v1 account has been migrated to v2",
        status: "Migrated",
    },
    "migrating": {
        title: "Ready to migrate",
        description: "Your v1 account is ready to be migrated to v2",
        status: "Ready",
    },
};

export function MigrationFlow({ address, profile, state, circlesBalance, trustConnections }: MigrationFlowProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Status Header */}
            <div className="bg-green-50 border-b border-green-100 px-6 py-4">
                <div className="flex items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{statuses[state].title}</h2>
                        <p className="text-sm text-gray-600">{statuses[state].description}</p>
                    </div>
                    <div className="ml-auto">
                        <span className="badge badge-sm badge-success">
                            {statuses[state].status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Avatar</h3>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <div className="flex items-center space-x-2">
                            <img src={profile.previewImageUrl} alt="Avatar" className="w-10 h-10 rounded-full" />
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

                {/* Balance and Trust Connections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Balance */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Balance</h3>
                        <div className="text-xl font-semibold text-gray-900">
                            {circlesBalance.reduce((acc, balance) => acc + balance.circles, 0).toFixed(2)} CRC
                        </div>
                    </div>

                    {/* Trust Connections */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Trust Connections</h3>
                        <div className="text-xl font-semibold text-gray-900">
                            {trustConnections.length} trust{trustConnections.length > 1 ? "s" : ""}
                            {/* <span className="text-gray-400">--</span> <span className="text-lg font-normal text-gray-500">trusts</span> */}
                        </div>
                    </div>
                </div>

                <a
                    href={`https://app.metri.xyz/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary mx-auto"
                >
                    Go to Metri
                </a>
            </div>
        </div >
    );
}