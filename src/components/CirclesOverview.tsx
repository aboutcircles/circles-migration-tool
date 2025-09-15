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
    return (
        <>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Avatar</h3>
                <div className="flex items-center space-x-2">
                    <span className="badge badge-xs badge-error">{invitations.length} invitation{invitations.length !== 1 ? 's' : ''}</span>
                </div>
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
                    <CopyButton text={address} />
                    <a href={`https://explorer.aboutcircles.com/avatar/${address}`} target="_blank" rel="noopener noreferrer"
                        className="btn btn-sm btn-ghost btn-circle"
                        title="View on explorer"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
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
        </>
    );
}