import { truncateAddress } from "../utils/address";
import { CopyButton } from "./CopyButton";
import { ExternalLink } from "lucide-react";
import { AvatarRow, TokenBalanceRow } from "@circles-sdk/data";
import { TrustRelationRow } from "@circles-sdk/data";
import { Address } from "viem";
import { Profile } from "@circles-sdk/profiles";

interface CirclesOverviewProps {
    invitations: AvatarRow[];
    profile: Profile;
    address: Address;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
}


export function CirclesOverview({ invitations, profile, address, circlesBalance, trustConnections }: CirclesOverviewProps) {
    const totalBalance = circlesBalance.reduce((acc, balance) => acc + balance.circles, 0);

    return (
        <>
            {/* Avatar Section */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full">
                        <img src={profile.previewImageUrl || '/profile.svg'} alt="Avatar" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-base-content">Avatar</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-sm text-base-content/70">
                                {truncateAddress(address)}
                            </span>
                            <CopyButton text={address} />
                            <a href={`https://explorer.aboutcircles.com/avatar/${address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-xs btn-circle"
                                title="View on explorer">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>

                {invitations.length > 0 && (
                    <div className="badge badge-soft badge-sm">
                        {invitations.length} invitation{invitations.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Stats Section */}
            <div className="divide-y divide-base-300 mt-4 text-sm space-y">
                <div className="flex justify-between items-center py-4">
                    <span className="text-base-content/70">Balance</span>
                    <span className="font-semibold">
                        {totalBalance.toFixed(2)} CRC
                    </span>
                </div>
                <div className="flex justify-between items-center py-2 mt-2">
                    <span className="text-base-content/70">Trust connections</span>
                    <span className="font-semibold">
                        {trustConnections.length} trust{trustConnections.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </>
    );
}