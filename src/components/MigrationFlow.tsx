import { Address } from "viem";
import { ExternalLink } from "lucide-react";
import { Profile } from "@circles-sdk/profiles";
import { AvatarRow, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { GetInvited } from "./GetInvited";
import { MigrationState } from "../types/migration";
import { useState } from "react";
import { CreateProfile } from "./CreateProfile";
import { Sdk } from "@circles-sdk/sdk";
import { STEP_CONFIG } from "../flow/steps";
import toast from "react-hot-toast";
import { CirclesOverview } from "./CirclesOverview";

interface MigrationFlowProps {
    address: Address;
    profile: Profile;
    pushState: (state: MigrationState) => void;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
    state: MigrationState;
    invitations: AvatarRow[];
    circlesSdkRunner: Sdk;
}

export function MigrationFlow({ address, profile, state, pushState, circlesBalance, trustConnections, invitations, circlesSdkRunner }: MigrationFlowProps) {
    const [selectedInviter, setSelectedInviter] = useState<`0x${string}` | null>(null);
    const [draftProfile, setDraftProfile] = useState<Profile>({ name: "", description: "", previewImageUrl: "", imageUrl: "" });
    const [profileErrors, setProfileErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const ctx = {
        address,
        sdk: circlesSdkRunner,
        invitations,
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
            <div className="bg-base-300/30 border border-black/10 px-6 py-4 rounded-md">
                <h2 className="text-lg font-semibold text-gray-900">{step.title}</h2>
                <p className="text-sm text-gray-400">{step.description}</p>
            </div>

            {/* Content */}
            <div className="flex flex-col w-full border border-black/10 px-10 py-6 rounded-md">
                {state === "selecting-inviter" && (
                    <GetInvited
                        invitations={invitations}
                        onInviterSelected={setSelectedInviter}
                    />
                )}
                {state === "create-profile" && (
                    <CreateProfile profile={draftProfile}
                        onChange={setDraftProfile}
                        onValidityChange={setProfileErrors} />
                )}

                {state !== "selecting-inviter" && state !== "create-profile" && (
                    <CirclesOverview invitations={invitations} profile={profile} address={address} circlesBalance={circlesBalance} trustConnections={trustConnections} />
                )}

                <div className="flex flex-col items-center space-y-3 mt-6">
                    {isLink ? (
                        <a
                            href={step.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                        >
                            {step.cta}
                        </a>
                    ) : (
                        <button
                            onClick={() => handlePrimary()}
                            className="btn btn-primary"
                            disabled={state === "ready-to-migrate" && invitations.length === 0 || !canProceed || isProcessing}
                        >
                            {isProcessing ? "Processing..." : step.cta}
                        </button>
                    )}

                    {state === "ready-to-migrate" && invitations.length === 0 && (
                        <a
                            href="https://circles.garden/"
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