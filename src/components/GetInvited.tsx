import { truncateAddress } from "../utils/address";
import { AvatarWithProfile } from "../context/CirclesContext";

interface GetInvitedProps {
    invitations: AvatarWithProfile[];
    onInviterSelected: (inviter: `0x${string}`) => void;
}

export function GetInvited({ invitations, onInviterSelected }: GetInvitedProps) {
    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-primary mb-4">Select an inviter</h3>
            <div className="divide-y divide-base-300">
                {invitations.map((avatarWithProfile) => {
                    const { avatar, profile } = avatarWithProfile;
                    const displayName = profile.name || avatar.name || 'Unknown';
                    
                    return (
                    <button
                        key={avatar.avatar}
                        onClick={() => onInviterSelected(avatar.avatar)}
                        className="w-full flex items-center space-x-4 text-left py-4 hover:bg-base-200/50 rounded-xl transition-all px-3 -mx-3"
                    >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-primary/20">
                            <img 
                                src={profile.previewImageUrl} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base-content text-base sm:text-lg">
                                {displayName}
                            </div>
                            <div className="text-sm text-base-content/60 font-mono truncate">
                                {truncateAddress(avatar.avatar)}
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    );
                })}
            </div>
        </div>
    );
}