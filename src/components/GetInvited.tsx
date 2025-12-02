import { truncateAddress } from "../utils/address";
import { AvatarWithProfile } from "../context/CirclesContext";

interface GetInvitedProps {
    invitations: AvatarWithProfile[];
    onInviterSelected: (inviter: `0x${string}`) => void;
}

export function GetInvited({ invitations, onInviterSelected }: GetInvitedProps) {
    return (
        <div className="space-y-3">
            {invitations.map((avatarWithProfile) => {
                const { avatar, profile } = avatarWithProfile;
                const displayName = profile.name || avatar.name || 'Unknown';
                
                return (
                <button
                    key={avatar.avatar}
                    onClick={() => onInviterSelected(avatar.avatar)}
                    className="w-full flex items-center space-x-4 p-4 text-left bg-base-200 hover:bg-base-300 rounded-box transition-all duration-200 border border-base-300 hover:border-primary min-h-[60px]"
                >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-base-300">
                        <img 
                            src={profile.previewImageUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base-content truncate">
                            {displayName}
                        </div>
                        <div className="text-sm text-base-content text-opacity-60 font-mono truncate">
                            {truncateAddress(avatar.avatar)}
                        </div>
                    </div>
                </button>
                );
            })}
        </div>
    );
}