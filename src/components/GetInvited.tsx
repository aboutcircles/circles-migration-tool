import { truncateAddress } from "../utils/address";
import { InvitationWithProfile } from "../context/CirclesContext";

interface GetInvitedProps {
    invitations: InvitationWithProfile[];
    onInviterSelected: (inviter: `0x${string}`) => void;
}

export function GetInvited({ invitations, onInviterSelected }: GetInvitedProps) {
    return (
        <div className="divide-y divide-gray-200">
            {invitations.map((invitationWithProfile) => {
                const { invitation, profile } = invitationWithProfile;
                const displayName = profile?.name || invitation.name || 'Unknown';
                const displayImage = profile?.previewImageUrl || invitation.avatar || '/profile.svg';
                
                return (
                <button
                    key={invitation.avatar}
                    onClick={() => onInviterSelected(invitation.avatar)}
                    className="w-full flex items-center space-x-3 text-left"
                >
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img 
                            src={displayImage} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="font-medium text-gray-900">
                            {displayName}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                            {truncateAddress(invitation.avatar)}
                        </div>
                    </div>
                </button>
                );
            })}
        </div>
    );
}