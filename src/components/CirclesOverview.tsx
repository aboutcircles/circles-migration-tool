import { truncateAddress } from "../utils/address";
import { CopyButton } from "./CopyButton";
import { ExternalLink } from "lucide-react";
import { TokenBalanceRow } from "@circles-sdk/data";
import { TrustRelationRow } from "@circles-sdk/data";
import { Address } from "viem";
import { Profile } from "@circles-sdk/profiles";
import { InvitationWithProfile } from "../context/CirclesContext";

interface CirclesOverviewProps {
    invitationsWithProfiles: InvitationWithProfile[];
    profile: Profile;
    address: Address;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
}


export function CirclesOverview({ invitationsWithProfiles, profile, address, circlesBalance, trustConnections }: CirclesOverviewProps) {
    const totalBalance = circlesBalance.reduce((acc, balance) => acc + balance.circles, 0);

    return (
        <>
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-primary/10">
                        <img src={profile.previewImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-primary mb-1">Avatar</h2>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs sm:text-sm text-base-content/70">
                                {truncateAddress(address)}
                            </span>
                            <CopyButton text={address} />
                            <a href={`https://explorer.aboutcircles.com/avatar/${address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-xs btn-circle hover:bg-primary/10"
                                title="View on explorer">
                                <ExternalLink className="w-4 h-4 text-primary" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className={`badge badge-lg ${invitationsWithProfiles.length > 0 ? 'badge-primary' : 'badge-error'} font-medium`}>
                    {invitationsWithProfiles.length} invitation{invitationsWithProfiles.length !== 1 ? 's' : ''}
                </div>
            </div>

            <div className="divide-y divide-base-300 mt-6 text-sm sm:text-base space-y">
                <div className="flex justify-between items-center py-4">
                    <span className="text-base-content/70 font-medium">Balance</span>
                    <span className="font-bold text-primary text-lg">
                        {totalBalance.toFixed(2)} <span className="text-sm">CRC</span>
                    </span>
                </div>
                <div className="flex justify-between items-center py-4">
                    <span className="text-base-content/70 font-medium">Trust connections</span>
                    <span className="font-bold text-primary text-lg">
                        {trustConnections.length}
                    </span>
                </div>
            </div>
        </>
    );
}