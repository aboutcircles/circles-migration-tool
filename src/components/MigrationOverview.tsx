import { Profile } from "@circles-sdk/profiles";
import { AvatarWithProfile } from "../context/CirclesContext";

interface MigrationOverviewProps {
    draftProfile: Profile;
    selectedInviter: `0x${string}` | null;
    invitationsWithProfiles: AvatarWithProfile[];
}

export function MigrationOverview({ draftProfile, selectedInviter, invitationsWithProfiles }: MigrationOverviewProps) {
    const inviterWithProfile = invitationsWithProfiles.find(
        (invitation) => invitation.avatar.avatar === selectedInviter
    );

    return (
        <div className="space-y-4">
            <div className="divide-y divide-base-300 text-sm space-y">
                <div className="flex justify-between items-center py-4">
                    <span className="text-base-content/70">Your profile</span>
                    <span className="font-semibold">
                        {draftProfile.name || "No name"}
                    </span>
                </div>
                <div className="flex justify-between items-center py-2 mt-2">
                    <span className="text-base-content/70">Invited by</span>
                    <span className="font-semibold">
                        {inviterWithProfile?.profile.name || "No name"}
                    </span>
                </div>
            </div>

            <div className="bg-warning/10 border border-warning rounded-box p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="text-sm sm:text-base text-base-content">
                        <div className="font-semibold mb-2 text-warning flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            On chain migration
                        </div>
                        <div className="text-base-content text-opacity-80">
                            Your profile will be created and your avatar will be migrated to Circles v2.
                            This action is irreversible.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
