import { Address } from "viem";
import { ExternalLink } from "lucide-react";
import { Profile } from "@circles-sdk/profiles";
import { TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { GetInvited } from "./GetInvited";
import { MigrationState } from "../types/migration";
import { useState } from "react";
import { CreateProfile } from "./CreateProfile";
import { Sdk } from "@circles-sdk/sdk";
import { STEP_CONFIG } from "../flow/steps";
import toast from "react-hot-toast";
import { CirclesOverview } from "./CirclesOverview";
import { MigrationOverview } from "./MigrationOverview";
import { AvatarWithProfile } from "../context/CirclesContext";

interface MigrationFlowProps {
    address: Address;
    profile: Profile;
    pushState: (state: MigrationState) => void;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
    state: MigrationState;
    invitationsWithProfiles: AvatarWithProfile[];
    circlesSdkRunner: Sdk;
}

export function MigrationFlow({ address, profile, state, pushState, circlesBalance, trustConnections, invitationsWithProfiles, circlesSdkRunner }: MigrationFlowProps) {
    const [selectedInviter, setSelectedInviter] = useState<`0x${string}` | null>(null);
    const [draftProfile, setDraftProfile] = useState<Profile>({ name: "", description: "", previewImageUrl: "", imageUrl: "" });
    const [profileErrors, setProfileErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const ctx = {
        address,
        sdk: circlesSdkRunner,
        invitationsWithProfiles,
        selectedInviter,
        draftProfile,
        profileErrors,
    };

    const step = STEP_CONFIG[state];
    const canProceed = step.guard ? step.guard(ctx) : true;
    const isLink = Boolean(step.href);

    const handlePrimary = async () => {
        if (!canProceed || isProcessing) return;
        try {
            setIsProcessing(true);
            if (step.onNext) {
                await toast.promise(step.onNext(ctx), {
                    loading: "Migrating avatar…",
                    success: "Migration complete!",
                    error: () => "Migration failed, please reach out to support on Discord",
                });
            }

            const next =
                typeof step.next === "function" ? step.next(ctx) : step.next;
            if (next) pushState(next);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            {/* Status Header */}
            <div className="py-4">
                <h2 className="text-lg font-semibold text-gray-900">{step.title}</h2>
                <p className="text-sm text-gray-400">{step.description}</p>
            </div>

            {/* Content */}
            <div className="flex flex-col w-full sm:border border-black/10 sm:px-10 py-6 rounded-md">
                {state === "selecting-inviter" && (
                    <GetInvited
                        invitations={invitationsWithProfiles}
                        onInviterSelected={setSelectedInviter}
                    />
                )}
                {state === "create-profile" && (
                    <CreateProfile profile={draftProfile}
                        onChange={setDraftProfile}
                        onValidityChange={setProfileErrors} />
                )}

                {state === "execute-migration" && (
                    <MigrationOverview 
                        draftProfile={draftProfile}
                        selectedInviter={selectedInviter}
                        invitationsWithProfiles={invitationsWithProfiles}
                    />
                )}

                {state !== "selecting-inviter" && state !== "create-profile" && state !== "execute-migration" && (
                    <CirclesOverview invitationsWithProfiles={invitationsWithProfiles} profile={profile} address={address} circlesBalance={circlesBalance} trustConnections={trustConnections} />
                )}

                <div className="flex flex-col items-center space-y-3 mt-6">
                    {isLink ? (
                        <a
                            href={step.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-neutral"
                        >
                            {step.cta}
                        </a>
                    ) : (
                        <button
                            onClick={() => handlePrimary()}
                            className="btn btn-neutral"
                            disabled={state === "ready-to-migrate" && invitationsWithProfiles.length === 0 || !canProceed || isProcessing}
                        >
                            {isProcessing ? "Processing..." : step.cta}
                        </button>
                    )}

                    {state === "ready-to-migrate" && invitationsWithProfiles.length === 0 && (
                        <a
                            href="https://discord.com/invite/aboutcircles"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <span>Get invited to Circles</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        </>
    );
}