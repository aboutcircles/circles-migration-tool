import { Address } from "viem";
import { Profile } from "@circles-sdk/profiles";
import { TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { MigrationState } from "../types/migration";
import { useState } from "react";
import { CreateProfile } from "./CreateProfile";
import { Sdk } from "@circles-sdk/sdk";
import { STEP_CONFIG } from "../flow/steps";
import toast from "react-hot-toast";
import { CirclesOverview } from "./CirclesOverview";
import { MigrationOverview } from "./MigrationOverview";
import { TrustRelation } from "@circles-sdk/data";

interface MigrationFlowProps {
    address: Address;
    profile: Profile;
    pushState: (state: MigrationState) => void;
    refreshData: () => Promise<void>;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
    state: MigrationState;
    circlesSdkRunner: Sdk;
    needsInviter: boolean;
    requiresInvitationModuleEnablement: boolean;
    invitationModuleAddress?: Address;
    onInvitationModuleEnabled: () => void;
    isV1Organization: boolean;
    wasOrganizationMigration: boolean;
    migrationBlockReason: string | null;
    draftProfile: Profile;
    setDraftProfile: (profile: Profile) => void;
    profileErrors: string[];
    setProfileErrors: (errors: string[]) => void;
    migrateTrustRelations: boolean;
    setMigrateTrustRelations: (enabled: boolean) => void;
}

export function MigrationFlow({
    address,
    profile,
    state,
    pushState,
    refreshData,
    circlesBalance,
    trustConnections,
    circlesSdkRunner,
    needsInviter,
    requiresInvitationModuleEnablement,
    invitationModuleAddress,
    onInvitationModuleEnabled,
    isV1Organization,
    wasOrganizationMigration,
    migrationBlockReason,
    draftProfile,
    setDraftProfile,
    profileErrors,
    setProfileErrors,
    migrateTrustRelations,
    setMigrateTrustRelations,
}: MigrationFlowProps) {
    const [isProcessing, setIsProcessing] = useState(false);

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
        needsInviter,
        requiresInvitationModuleEnablement,
        invitationModuleAddress,
        draftProfile,
        profileErrors,
        selectedTrustRelations,
        onInvitationModuleEnabled,
    };

    const step = STEP_CONFIG[state];
    const canProceed = step.guard ? step.guard(ctx) : true;
    const isLink = Boolean(step.href);
    const circlesAppUrl = "https://app.aboutcircles.com/";

    const primaryHref = state === "migrated" && wasOrganizationMigration
        ? circlesAppUrl
        : step.href;
    const primaryCta = state === "migrated" && wasOrganizationMigration
        ? "Visit Circles App"
        : step.cta;

    const handlePrimary = async () => {
        if (migrationBlockReason) {
            toast.error(migrationBlockReason);
            return;
        }
        if (!canProceed || isProcessing) return;
        try {
            setIsProcessing(true);
            if (step.onNext) {
                const toastMessages = state === "enable-invitation-module"
                    ? {
                        loading: "Enabling invitation module…",
                        success: "Invitation module enabled!",
                        error: (error: unknown) => error instanceof Error
                            ? error.message
                            : "Failed to enable invitation module, please reach out to support on Discord",
                    }
                    : {
                        loading: "Migrating avatar…",
                        success: "Migration complete!",
                        error: (error: unknown) => error instanceof Error
                            ? error.message
                            : "Migration failed, please reach out to support on Discord",
                    };

                await toast.promise(step.onNext(ctx), toastMessages);

                try {
                    await refreshData();
                } catch (refreshError) {
                    console.warn("Step succeeded but refresh failed:", refreshError);
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
                {state === "create-profile" && (
                    <CreateProfile profile={draftProfile}
                        onChange={setDraftProfile}
                        onValidityChange={setProfileErrors} />
                )}

                {state === "enable-invitation-module" && (
                    <div className="text-center space-y-4">
                        <p className="text-base-content/70">
                            Your account requires a sponsored invitation to migrate. The invitation module
                            must be enabled on your Safe before the invitation can be created.
                        </p>
                    </div>
                )}

                {state === "execute-migration" && (
                    <MigrationOverview
                        draftProfile={draftProfile}
                        needsInviter={needsInviter}
                        isV1Organization={isV1Organization}
                        migratableTrustRelationCount={migratableTrustRelations.length}
                        migrateTrustRelations={migrateTrustRelations}
                        onMigrateTrustRelationsChange={setMigrateTrustRelations}
                    />
                )}

                {state !== "create-profile" && state !== "execute-migration" && state !== "enable-invitation-module" && (
                    <CirclesOverview profile={profile} address={address} circlesBalance={circlesBalance} trustConnections={trustConnections} />
                )}

                <div className="flex flex-col items-center space-y-3 mt-8">
                    {isLink ? (
                        <a
                            href={primaryHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-neutral btn-lg rounded-xl shadow-md hover:shadow-lg transition-all w-full sm:w-auto min-w-[200px]"
                        >
                            {primaryCta}
                        </a>
                    ) : (
                        <button
                            onClick={() => handlePrimary()}
                            className="btn btn-neutral btn-lg rounded-xl shadow-md hover:shadow-lg transition-all w-full sm:w-auto min-w-[200px]"
                            disabled={!canProceed || isProcessing || !!migrationBlockReason}
                        >
                            {isProcessing
                                ? "Processing..."
                                : primaryCta}
                        </button>
                    )}

                    {state === "ready-to-migrate" && migrationBlockReason && (
                        <div className="alert alert-error rounded-xl w-full max-w-xl">
                            <span>{migrationBlockReason}</span>
                        </div>
                    )}

                    {state === "ready-to-migrate" && needsInviter && (
                        <p className="text-sm text-base-content/70 text-center max-w-md">
                            An invitation will be created automatically as part of the migration process.
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
