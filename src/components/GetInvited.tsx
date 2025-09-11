import { AvatarRow } from "@circles-sdk/data";

interface GetInvitedProps {
    invitations: AvatarRow[];
    onInviterSelected: (inviter: `0x${string}`) => void;
}

export function GetInvited({ invitations, onInviterSelected }: GetInvitedProps) {
    console.log(invitations);
    return (
        <div className="p-6">
            <div className="space-y-3">
                {invitations.map((invitation) => (
                    <button
                        key={invitation.avatar}
                        onClick={() => onInviterSelected(invitation.avatar)}
                        className="w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                    >
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                                {invitation.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-gray-900">
                                {invitation.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500 font-mono">
                                {invitation.avatar}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}