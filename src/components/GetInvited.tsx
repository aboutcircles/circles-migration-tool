import { truncateAddress } from "../utils/address";
import { AvatarWithProfile } from "../context/CirclesContext";

interface GetInvitedProps {
    invitations: AvatarWithProfile[];
    onInviterSelected: (inviter: `0x${string}`) => void;
}

export function GetInvited({ invitations, onInviterSelected }: GetInvitedProps) {
    return (
        <div className="divide-y divide-gray-200">
            {invitations.map((avatarWithProfile) => {
                const { avatar, profile } = avatarWithProfile;
                const displayName = profile.name || avatar.name || 'Unknown';
                
                return (
                <button
                    key={avatar.avatar}
                    onClick={() => onInviterSelected(avatar.avatar)}
                    className="w-full flex items-center space-x-3 text-left"
                >
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img 
                            src={profile.previewImageUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="font-medium text-gray-900">
                            {displayName}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                            {truncateAddress(avatar.avatar)}
                        </div>
                    </div>
                </button>
                );
            })}
        </div>
    );
}