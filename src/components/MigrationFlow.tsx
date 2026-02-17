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
import { TrustRelation } from "@circles-sdk/data";

interface MigrationFlowProps {
    address: Address;
    profile: Profile;
    pushState: (state: MigrationState) => void;
    refreshData: () => Promise<void>;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
    state: MigrationState;
    invitationsWithProfiles: AvatarWithProfile[];
    circlesSdkRunner: Sdk;
    needsInviter: boolean;
    isV1Organization: boolean;
    invitationValidationError: string | null;
    migrationBlockReason: string | null;
}

export function MigrationFlow({
    address,
    profile,
    state,
    pushState,
    refreshData,
    circlesBalance,
    trustConnections,
    invitationsWithProfiles,
    circlesSdkRunner,
    needsInviter,
    isV1Organization,
    invitationValidationError,
    migrationBlockReason,
}: MigrationFlowProps) {
    const [selectedInviter, setSelectedInviter] = useState<`0x${string}` | null>(null);
    const [draftProfile, setDraftProfile] = useState<Profile>({ name: "", description: "", previewImageUrl: "", imageUrl: "" });
    const [profileErrors, setProfileErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [migrateTrustRelations, setMigrateTrustRelations] = useState(false);

    const migratableTrustRelations = Array.from(
        new Set(
            trustConnections
                .filter((relation) =>
                    (relation.relation as TrustRelation) === "trusts" ||
                    (relation.relation as TrustRelation) === "mutuallyTrusts"
                )
                .map((relation) => relation.objectAvatar.toLowerCase())
                .filter((objectAvatar) => objectAvatar !== address.toLowerCase())
        )
    ) as `0x${string}`[];

    const selectedTrustRelations: `0x${string}`[] = migrateTrustRelations
        ? migratableTrustRelations
        : [];

    const ctx = {
        address,
        sdk: circlesSdkRunner,
        invitationsWithProfiles,
        needsInviter,
        selectedInviter,
        draftProfile,
        profileErrors,
        selectedTrustRelations,
    };

    const step = STEP_CONFIG[state];
    const canProceed = step.guard ? step.guard(ctx) : true;
    const isLink = Boolean(step.href);

    const handlePrimary = async () => {
        if (migrationBlockReason) {
            toast.error(migrationBlockReason);
            return;
        }
        if (!canProceed || isProcessing) return;
        try {
            setIsProcessing(true);
            if (step.onNext) {
                await toast.promise(step.onNext(ctx), {
                    loading: "Migrating avatar…",
                    success: "Migration complete!",
                    error: (error) => error instanceof Error
                        ? error.message
                        : "Migration failed, please reach out to support on Discord",
                });

                try {
                    await refreshData();
                } catch (refreshError) {
                    console.warn("Migration succeeded but refresh failed:", refreshError);
                }
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
            <div className="py-4 px-2">
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">{step.title}</h2>
                <p className="text-sm sm:text-base text-base-content/70">{step.description}</p>
            </div>

            {/* Content */}
            <div className="flex flex-col w-full bg-white border border-base-300 sm:px-10 px-6 py-8 rounded-2xl shadow-lg">
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
                        needsInviter={needsInviter}
                        isV1Organization={isV1Organization}
                        selectedInviter={selectedInviter}
                        invitationsWithProfiles={invitationsWithProfiles}
                        migratableTrustRelationCount={migratableTrustRelations.length}
                        migrateTrustRelations={migrateTrustRelations}
                        onMigrateTrustRelationsChange={setMigrateTrustRelations}
                    />
                )}

                {state !== "selecting-inviter" && state !== "create-profile" && state !== "execute-migration" && (
                    <CirclesOverview invitationsWithProfiles={invitationsWithProfiles} profile={profile} address={address} circlesBalance={circlesBalance} trustConnections={trustConnections} />
                )}

                <div className="flex flex-col items-center space-y-3 mt-8">
                    {isLink ? (
                        <a
                            href={step.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-neutral btn-lg rounded-xl shadow-md hover:shadow-lg transition-all w-full sm:w-auto min-w-[200px]"
                        >
                            {step.cta}
                        </a>
                    ) : (
                        <button
                            onClick={() => handlePrimary()}
                            className="btn btn-neutral btn-lg rounded-xl shadow-md hover:shadow-lg transition-all w-full sm:w-auto min-w-[200px]"
                            disabled={
                                (state === "ready-to-migrate" && needsInviter && invitationsWithProfiles.length === 0) ||
                                !canProceed ||
                                isProcessing ||
                                !!migrationBlockReason
                            }
                        >
                            {isProcessing ? "Processing..." : step.cta}
                        </button>
                    )}

                    {state === "ready-to-migrate" && migrationBlockReason && (
                        <div className="alert alert-error rounded-xl w-full max-w-xl">
                            <span>{migrationBlockReason}</span>
                        </div>
                    )}

                    {state === "ready-to-migrate" && needsInviter && (
                        <p className="text-sm text-base-content/70 text-center max-w-md">
                            Self-migration is not available for this avatar. You need an invite from an existing Circles user to continue.
                        </p>
                    )}

                    {state === "ready-to-migrate" && needsInviter && invitationsWithProfiles.length === 0 && invitationValidationError && (
                        <div className="alert alert-error rounded-xl w-full max-w-xl">
                            <span>{invitationValidationError}</span>
                        </div>
                    )}

                    {state === "ready-to-migrate" && needsInviter && invitationsWithProfiles.length === 0 && (
                        <a
                            href="https://discord.com/invite/aboutcircles"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-sm text-primary hover:text-secondary transition-colors font-medium"
                        >
                            <span>Get invited to Circles</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>
        </>
    );
}
