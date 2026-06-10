import { Address } from "viem";
import { MigrationFlow } from "./MigrationFlow";
import { useCircles } from "../context/CirclesContext";
import { useState, useEffect } from "react";
import { MigrationState } from "../types/migration";
import { ArrowLeft } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { MigrationStepper } from "./MigrationStepper";
import { fallbackProfile } from "../context/CirclesContext";
import { V1BalanceMigration } from "./V1BalanceMigration";
import { SeedPhraseDisplay } from "./SeedPhraseDisplay";
import { AccountLoading } from "./AccountLoading";
import { requestMigrationFunding, type MigrationFundingStatus } from "../utils/migrationFunding";
import { getSafeFallbackHandlerStatus, type SafeFallbackHandlerStatus } from "../utils/safeFallbackHandler";
import {
    getInitialMigrationState,
    isPendingV1Avatar,
    isPendingV1Organization,
    isSupportedPendingV1Migration,
    shouldRequestBackendFunding,
    shouldShowV1BalanceMigration,
} from "../utils/journey";

type FundingState = "not_needed" | "checking" | MigrationFundingStatus | "error";
type SafeFallbackState = "not_needed" | "checking" | "valid" | "needs_update" | "error";

export function Dashboard({ address }: { address: Address }) {
    const {
        avatarWithProfile,
        circlesBalance,
        trustConnections,
        invitationsWithProfiles,
        isLoadingAvatarData,
        invitationValidationError,
        refreshData
    } = useCircles();
    const { isLoadingSafe, circlesSdkRunner, safeAddress, eoaAddress } = useWallet();
    const [stateStack, setStateStack] = useState<MigrationState[]>(["not-registered"]);
    const [canSelfMigrate, setCanSelfMigrate] = useState(false);
    const [fundingState, setFundingState] = useState<FundingState>("not_needed");
    const [fundingError, setFundingError] = useState<string | null>(null);
    const [safeFallbackState, setSafeFallbackState] = useState<SafeFallbackState>("not_needed");
    const [safeFallbackError, setSafeFallbackError] = useState<string | null>(null);
    const [safeFallbackStatus, setSafeFallbackStatus] = useState<SafeFallbackHandlerStatus | null>(null);
    const currentState = stateStack[stateStack.length - 1];
    const avatar = avatarWithProfile?.avatar;
    const isV1AvatarPendingMigration = isPendingV1Avatar(avatar);
    const isV1Organization = isPendingV1Organization(avatar);
    const canExecuteMigrationFlow = isV1AvatarPendingMigration;
    const isSupportedMigrationType = isSupportedPendingV1Migration(avatar);
    const requiresBackendFunding = shouldRequestBackendFunding(avatar, safeAddress, eoaAddress, circlesBalance || []);
    const hasBatchSupport =
        typeof (circlesSdkRunner?.contractRunner as { sendBatchTransaction?: unknown } | undefined)?.sendBatchTransaction === "function";
    const needsInviter = isV1AvatarPendingMigration && avatarWithProfile?.avatar?.type === "CrcV1_Signup" && !canSelfMigrate;
    const isFundingReady =
        !requiresBackendFunding ||
        fundingState === "funded" ||
        fundingState === "already_funded" ||
        fundingState === "sufficient_balance";
    const shouldCheckSafeFallback = isV1AvatarPendingMigration && isSupportedMigrationType && hasBatchSupport && isFundingReady;
    const needsSafeFallbackUpdate = safeFallbackState === "needs_update";
    const fundingBlockReason = requiresBackendFunding && fundingState === "error"
        ? fundingError ?? "Could not prepare your account for migration. Please try again."
        : requiresBackendFunding &&
          fundingState !== "funded" &&
          fundingState !== "already_funded" &&
          fundingState !== "sufficient_balance"
            ? "Preparing your account for migration. Please wait."
            : null;
    const safeFallbackBlockReason = safeFallbackState === "error"
        ? safeFallbackError ?? "Could not check your Safe compatibility. Please try again."
        : null;
    const migrationBlockReason = isV1AvatarPendingMigration && !isSupportedMigrationType
        ? `Avatar type ${avatar?.type ?? "unknown"} is not supported for migration in this app.`
        : canExecuteMigrationFlow && !hasBatchSupport
            ? "Migration is not supported by the current wallet runner (batch transactions unavailable). Please switch wallet/safe and try again."
            : fundingBlockReason ?? safeFallbackBlockReason;
    const accountPreparationStatusMessage = requiresBackendFunding && fundingState === "funded"
        ? "Your account is ready for migration."
        : requiresBackendFunding && fundingState === "already_funded"
            ? "Your account is ready for migration."
            : requiresBackendFunding && fundingState === "sufficient_balance"
            ? "Your account is ready for migration."
            : null;
    const safeFallbackStatusMessage = safeFallbackStatus?.currentFallbackHandler
        ? `Current fallback handler: ${safeFallbackStatus.currentFallbackHandler}`
        : null;
    const showBalanceMigration = shouldShowV1BalanceMigration(avatar, currentState, circlesBalance || []);

    useEffect(() => {
        if (!avatarWithProfile?.avatar) {
            setStateStack(["not-registered"]);
            return;
        }

        setStateStack([getInitialMigrationState(avatarWithProfile.avatar)]);
    }, [avatarWithProfile]);

    useEffect(() => {
        let isCancelled = false;

        const checkCanSelfMigrate = async () => {
            if (
                !circlesSdkRunner ||
                !avatarWithProfile?.avatar?.hasV1 ||
                avatarWithProfile.avatar.version === 2 ||
                avatarWithProfile.avatar.type !== "CrcV1_Signup"
            ) {
                setCanSelfMigrate(false);
                return;
            }

            try {
                const canMigrate = await circlesSdkRunner.canSelfMigrate({ ...avatarWithProfile.avatar });
                if (!isCancelled) {
                    setCanSelfMigrate(canMigrate);
                }
            } catch (error) {
                console.warn("Failed to check self migration eligibility:", error);
                if (!isCancelled) {
                    setCanSelfMigrate(false);
                }
            }
        };

        checkCanSelfMigrate();

        return () => {
            isCancelled = true;
        };
    }, [avatarWithProfile, circlesSdkRunner]);

    useEffect(() => {
        if (!requiresBackendFunding || !safeAddress || !eoaAddress) {
            setFundingState("not_needed");
            setFundingError(null);
            return;
        }

        const controller = new AbortController();
        setFundingState("checking");
        setFundingError(null);

        requestMigrationFunding(safeAddress, eoaAddress, controller.signal)
            .then((result) => {
                setFundingState(result.status);
            })
            .catch((error) => {
                if (controller.signal.aborted) {
                    return;
                }
                const message = error instanceof Error
                    ? error.message
                    : "Could not prepare your account for migration. Please try again.";
                setFundingState("error");
                setFundingError(message);
                console.error("Account preparation request failed:", error);
            });

        return () => {
            controller.abort();
        };
    }, [requiresBackendFunding, safeAddress, eoaAddress]);

    const refreshSafeFallbackStatus = async () => {
        if (!circlesSdkRunner || !shouldCheckSafeFallback) {
            setSafeFallbackState("not_needed");
            setSafeFallbackError(null);
            setSafeFallbackStatus(null);
            return;
        }

        setSafeFallbackState("checking");
        setSafeFallbackError(null);

        const status = await getSafeFallbackHandlerStatus(circlesSdkRunner);
        setSafeFallbackStatus(status);
        setSafeFallbackState(status.needsUpdate ? "needs_update" : "valid");
    };

    useEffect(() => {
        let isCancelled = false;

        const checkSafeFallback = async () => {
            if (!circlesSdkRunner || !shouldCheckSafeFallback) {
                setSafeFallbackState("not_needed");
                setSafeFallbackError(null);
                setSafeFallbackStatus(null);
                return;
            }

            setSafeFallbackState("checking");
            setSafeFallbackError(null);

            try {
                const status = await getSafeFallbackHandlerStatus(circlesSdkRunner);
                if (isCancelled) {
                    return;
                }
                setSafeFallbackStatus(status);
                setSafeFallbackState(status.needsUpdate ? "needs_update" : "valid");
            } catch (error) {
                if (isCancelled) {
                    return;
                }
                const message = error instanceof Error
                    ? error.message
                    : "Could not check your Safe compatibility. Please try again.";
                setSafeFallbackState("error");
                setSafeFallbackError(message);
                setSafeFallbackStatus(null);
                console.error("Safe fallback handler check failed:", error);
            }
        };

        checkSafeFallback();

        return () => {
            isCancelled = true;
        };
    }, [circlesSdkRunner, shouldCheckSafeFallback]);

    const pushState = (newState: MigrationState) => {
        setStateStack(prev => [...prev, newState]);
    };

    const popState = () => {
        setStateStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    };

    const canGoBack = stateStack.length > 1;
    const showStepper = ["ready-to-migrate", "selecting-inviter", "create-profile", "execute-migration"].includes(currentState);

    if (isLoadingAvatarData || isLoadingSafe || !circlesSdkRunner || fundingState === "checking" || safeFallbackState === "checking") {
        const loadingTitle = fundingState === "checking"
            ? "Preparing your account"
            : safeFallbackState === "checking"
            ? "Checking Safe compatibility"
            : isLoadingSafe
            ? "Switching to selected Safe"
            : "Loading your Circles account";
        const loadingDescription = fundingState === "checking"
            ? "Preparing your account for migration."
            : safeFallbackState === "checking"
            ? "Checking whether your v1 Safe fallback handler needs an update."
            : isLoadingSafe
            ? "Applying your Safe selection and syncing account context."
            : "Fetching profile, balances, trust relations, and invitations.";

        return (
            <AccountLoading
                title={loadingTitle}
                description={loadingDescription}
            />
        );
    }

    return (
        <div className="max-w-4xl w-full mx-auto p-2 space-y-6">
            {showStepper && (
                <MigrationStepper
                    currentState={currentState}
                    needsInviter={needsInviter}
                    needsSafeFallbackUpdate={needsSafeFallbackUpdate}
                />
            )}

            {canGoBack && (
                <button
                    onClick={popState}
                    className="btn btn-sm btn-ghost mb-0 sm:mb-4 hover:bg-base-200 rounded-xl"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
            )}

            <MigrationFlow
                key={`migration-flow-${address.toLowerCase()}`}
                address={address}
                profile={avatarWithProfile?.profile || fallbackProfile}
                pushState={pushState}
                refreshData={refreshData}
                circlesBalance={circlesBalance || []}
                trustConnections={trustConnections || []}
                state={currentState}
                invitationsWithProfiles={invitationsWithProfiles || []}
                circlesSdkRunner={circlesSdkRunner}
                needsInviter={needsInviter}
                isV1Organization={isV1Organization}
                invitationValidationError={invitationValidationError}
                migrationBlockReason={migrationBlockReason}
                accountPreparationStatusMessage={accountPreparationStatusMessage}
                needsSafeFallbackUpdate={needsSafeFallbackUpdate}
                safeFallbackStatusMessage={safeFallbackStatusMessage}
                onSafeFallbackUpdated={refreshSafeFallbackStatus}
            />

            {showBalanceMigration && (
                <V1BalanceMigration
                    key={`v1-balance-${address.toLowerCase()}`}
                    address={address}
                    circlesBalance={circlesBalance || []}
                    circlesSdkRunner={circlesSdkRunner}
                    onMigrationComplete={refreshData}
                />
            )}
            <SeedPhraseDisplay />
        </div>
        
    );
}
