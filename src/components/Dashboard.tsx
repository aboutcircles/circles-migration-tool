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
import { Contract, JsonRpcProvider } from "ethers";

type V2TokenEligibility = "unknown" | "checking" | "active" | "missing" | "stopped" | "error";

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
    const { isLoadingSafe, circlesSdkRunner } = useWallet();
    const [stateStack, setStateStack] = useState<MigrationState[]>(["not-registered"]);
    const [canSelfMigrate, setCanSelfMigrate] = useState(false);
    const [v2TokenEligibility, setV2TokenEligibility] = useState<V2TokenEligibility>("unknown");
    const currentState = stateStack[stateStack.length - 1];
    const avatar = avatarWithProfile?.avatar;
    const hasV1 = !!avatar?.hasV1;
    const isV2Avatar = avatar?.version === 2;
    const isV1AvatarPendingMigration = hasV1 && avatar?.version !== 2;
    const isV2WithActiveV1Token = hasV1 && isV2Avatar && v2TokenEligibility === "active";
    const isV1Organization = isV1AvatarPendingMigration && avatarWithProfile?.avatar?.type === "CrcV1_OrganizationSignup";
    const canExecuteMigrationFlow = isV1AvatarPendingMigration || isV2WithActiveV1Token;
    const isSupportedMigrationType =
        avatar?.type === "CrcV1_Signup" || avatar?.type === "CrcV1_OrganizationSignup";
    const hasBatchSupport =
        typeof (circlesSdkRunner?.contractRunner as { sendBatchTransaction?: unknown } | undefined)?.sendBatchTransaction === "function";
    const needsInviter = isV1AvatarPendingMigration && avatarWithProfile?.avatar?.type === "CrcV1_Signup" && !canSelfMigrate;
    const migrationBlockReason = isV1AvatarPendingMigration && !isSupportedMigrationType
        ? `Avatar type ${avatar?.type ?? "unknown"} is not supported for migration in this app.`
        : canExecuteMigrationFlow && !hasBatchSupport
            ? "Migration is not supported by the current wallet runner (batch transactions unavailable). Please switch wallet/safe and try again."
            : null;
    const hasMigratedAvatar = currentState === "migrated" || isV2WithActiveV1Token;
    const hasV1Balances = (circlesBalance || []).some(
        (balance) => balance.version === 1 && BigInt(balance.attoCrc) > 0n
    );
    const showBalanceMigration = hasMigratedAvatar && hasV1Balances;
    const isCheckingV2TokenEligibility = hasV1 && isV2Avatar && (v2TokenEligibility === "unknown" || v2TokenEligibility === "checking");

    useEffect(() => {
        let isCancelled = false;

        const checkV2TokenEligibility = async () => {
            if (!circlesSdkRunner || !avatar?.hasV1 || avatar.version !== 2) {
                setV2TokenEligibility("unknown");
                return;
            }

            if (!avatar.v1Token) {
                setV2TokenEligibility("missing");
                return;
            }

            if (typeof avatar.v1Stopped === "boolean") {
                setV2TokenEligibility(avatar.v1Stopped ? "stopped" : "active");
                return;
            }

            setV2TokenEligibility("checking");
            try {
                const provider = new JsonRpcProvider(circlesSdkRunner.circlesConfig.circlesRpcUrl);
                const v1Token = new Contract(avatar.v1Token, ["function stopped() view returns (bool)"], provider);
                const isStopped = await v1Token.stopped();
                if (!isCancelled) {
                    setV2TokenEligibility(isStopped ? "stopped" : "active");
                }
            } catch (error) {
                console.warn("Failed to check v1 token status for v2 avatar:", error);
                if (!isCancelled) {
                    setV2TokenEligibility("error");
                }
            }
        };

        checkV2TokenEligibility();

        return () => {
            isCancelled = true;
        };
    }, [avatar, circlesSdkRunner]);

    useEffect(() => {
        if (!avatarWithProfile?.avatar) {
            setStateStack(["not-registered"]);
            return;
        }

        let newState: MigrationState;

        if (!avatarWithProfile.avatar.hasV1) {
            newState = avatarWithProfile.avatar.version === 2 ? "registered-v2" : "not-registered";
        } else if (avatarWithProfile.avatar.version === 2) {
            newState = v2TokenEligibility === "active" ? "ready-to-migrate" : "registered-v2";
        } else {
            newState = "ready-to-migrate";
        }

        setStateStack([newState]);
    }, [avatarWithProfile, v2TokenEligibility]);

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

    const pushState = (newState: MigrationState) => {
        setStateStack(prev => [...prev, newState]);
    };

    const popState = () => {
        setStateStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    };

    const canGoBack = stateStack.length > 1;
    const showStepper = ["ready-to-migrate", "selecting-inviter", "create-profile", "execute-migration"].includes(currentState);

    if (isLoadingAvatarData || isLoadingSafe || !circlesSdkRunner || isCheckingV2TokenEligibility) {
        const loadingTitle = isCheckingV2TokenEligibility
            ? "Checking v1 token status"
            : isLoadingSafe
            ? "Switching to selected Safe"
            : "Loading your Circles account";
        const loadingDescription = isCheckingV2TokenEligibility
            ? "Verifying whether your v2 avatar still has an active v1 token."
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
                <MigrationStepper currentState={currentState} needsInviter={needsInviter} />
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
