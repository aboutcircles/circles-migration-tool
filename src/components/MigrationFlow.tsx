import { Address, formatUnits } from "viem";
import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useReadContracts } from "wagmi";

interface MigrationFlowProps {
    address: Address;
    userToken: string;
}

export function MigrationFlow({ address, userToken }: MigrationFlowProps) {
    const [copied, setCopied] = useState(false);

    // Fetch balance and trust data
    //   const { data: migrationData, isLoading } = useReadContracts({
    //     contracts: [
    //       // Get token balance
    //       {
    //         address: userToken as Address,
    //         abi: erc20ABI,
    //         functionName: 'balanceOf',
    //         args: [address],
    //       },
    //       // Get token decimals
    //       {
    //         address: userToken as Address,
    //         abi: erc20ABI,
    //         functionName: 'decimals',
    //       },
    //       // We can't easily get trust count from the v1 Hub directly
    //       // For now, we'll use a placeholder or implement a more complex solution
    //     ]
    //   });

    // const balance = migrationData?.[0]?.result;
    // const decimals = migrationData?.[1]?.result || 18;
    const balance = 0;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleStartMigration = () => {
        // TODO: Implement actual migration logic
        console.log("Starting migration process...");
    };

    // Format address for display
    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Status Header */}
            <div className="bg-green-50 border-b border-green-100 px-6 py-4">
                <div className="flex items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Ready to migrate</h2>
                        <p className="text-sm text-gray-600">Your v1 account is ready for migration to v2</p>
                    </div>
                    <div className="ml-auto">
                        <span className="badge badge-sm badge-success">
                            Ready
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Avatar</h3>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <span className="font-mono text-sm text-gray-900">
                            {formatAddress(address)}
                        </span>
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
                        <div className="text-2xl font-semibold text-gray-900">
                            {balance} CRC
                        </div>
                    </div>

                    {/* Trust Connections */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Trust Connections</h3>
                        <div className="text-2xl font-semibold text-gray-900">
                            {/* Placeholder */}
                            <span className="text-gray-400">--</span> <span className="text-lg font-normal text-gray-500">trusts</span>
                        </div>
                    </div>
                </div>

                {/* Migration Button */}
                <button
                    onClick={handleStartMigration}
                    className="btn btn-primary mx-auto"
                >
                    Start Migration Process
                </button>
            </div>
        </div>
    );
}
