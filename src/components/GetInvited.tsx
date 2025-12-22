import { truncateAddress } from "../utils/address";
import { InvitationWithProfile, InvitationSource } from "../context/CirclesContext";

interface GetInvitedProps {
    invitations: InvitationWithProfile[];
    onInviterSelected: (inviter: `0x${string}`) => void;
}

// Badge component for invitation source
function SourceBadge({ source }: { source: InvitationSource }) {
    const sourceConfig = {
        trust: {
            label: 'Trust',
            className: 'badge-primary',
            description: 'Invited via trust'
        },
        escrow: {
            label: 'Escrow',
            className: 'badge-secondary',
            description: 'CRC escrowed for you'
        },
        atScale: {
            label: 'Referral',
            className: 'badge-accent',
            description: 'Pre-created account'
        }
    };

    const config = sourceConfig[source];

    return (
        <span className={`badge badge-sm ${config.className}`} title={config.description}>
            {config.label}
        </span>
    );
}

// Format escrow amount from atto-circles to human readable
function formatEscrowAmount(attoCircles: string): string {
    const amount = Number(attoCircles) / 1e18;
    return amount.toFixed(2);
}

export function GetInvited({ invitations, onInviterSelected }: GetInvitedProps) {
    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-primary mb-4">Select an inviter</h3>
            <div className="divide-y divide-base-300">
                {invitations.map((invitation) => {
                    const { address, source, profile, balance, escrowedAmount, escrowDays } = invitation;
                    const displayName = profile.name || 'Unknown';

                    return (
                    <button
                        key={address}
                        onClick={() => onInviterSelected(address)}
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
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-base-content text-base sm:text-lg">
                                    {displayName}
                                </span>
                                <SourceBadge source={source} />
                            </div>
                            <div className="text-sm text-base-content/60 font-mono truncate">
                                {truncateAddress(address)}
                            </div>
                            {/* Source-specific details */}
                            {source === 'trust' && balance && (
                                <div className="text-xs text-base-content/50 mt-1">
                                    Balance: {Number(balance).toFixed(2)} CRC
                                </div>
                            )}
                            {source === 'escrow' && escrowedAmount && (
                                <div className="text-xs text-base-content/50 mt-1">
                                    Escrowed: {formatEscrowAmount(escrowedAmount)} CRC
                                    {escrowDays !== undefined && ` (${escrowDays} days)`}
                                </div>
                            )}
                            {source === 'atScale' && (
                                <div className="text-xs text-base-content/50 mt-1">
                                    Pre-created referral account
                                </div>
                            )}
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