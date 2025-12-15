import { Profile } from "@circles-sdk/profiles";
import { InvitationWithProfile } from "../context/CirclesContext";

interface MigrationOverviewProps {
    draftProfile: Profile;
    selectedInviter: `0x${string}` | null;
    invitationsWithProfiles: InvitationWithProfile[];
}

// Map invitation source to human-readable label
const sourceLabels = {
    trust: 'Trust-based',
    escrow: 'Escrow',
    atScale: 'Referral'
};

export function MigrationOverview({ draftProfile, selectedInviter, invitationsWithProfiles }: MigrationOverviewProps) {
    const inviterWithProfile = invitationsWithProfiles.find(
        (invitation) => invitation.address === selectedInviter
    );

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Migration Summary</h3>
            
            <div className="bg-base-200/50 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-start py-2">
                    <span className="text-base-content/70 font-medium">Your profile</span>
                    <span className="font-bold text-primary text-right">
                        {draftProfile.name || "No name"}
                    </span>
                </div>
                <div className="flex justify-between items-start py-2 border-t border-base-300 pt-4">
                    <span className="text-base-content/70 font-medium">Invited by</span>
                    <div className="text-right">
                        <span className="font-bold text-primary block">
                            {inviterWithProfile?.profile.name || "No name"}
                        </span>
                        {inviterWithProfile?.source && (
                            <span className="text-xs text-base-content/50">
                                ({sourceLabels[inviterWithProfile.source]} invitation)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-5">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="text-sm flex-1">
                        <div className="font-bold mb-2 text-warning-content">On-chain Migration</div>
                        <div className="text-base-content/80 leading-relaxed">
                            Your profile will be created and your avatar will be migrated to Circles V2.
                            This action is irreversible and will be recorded on the blockchain.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
