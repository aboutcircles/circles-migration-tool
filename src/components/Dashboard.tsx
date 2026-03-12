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
import { hasAnyMigratableV1Balances } from "../utils/migrationFallback";
import { isInvitationModuleEnabled } from "../utils/invitationModule";
import { Profile } from "@circles-sdk/profiles";
import { MIN_DUST_THRESHOLD } from "../utils/constants";

type V2TokenEligibility = "unknown" | "checking" | "active" | "missing" | "stopped" | "error";
type SelfMigrationEligibility = "checking" | "eligible" | "ineligible" | "not-applicable";
type EligibleBalanceStatus = "unknown" | "checking" | "available" | "unavailable" | "not-applicable";
type InvitationModuleStatus = "checking" | "enabled" | "disabled" | "not-applicable";
const IN_PROGRESS_FLOW_STATES: MigrationState[] = [
    "create-profile",
    "enable-invitation-module",
    "execute-migration",
];
const EMPTY_DRAFT_PROFILE: Profile = {
    name: "",
    description: "",
    previewImageUrl: "",
    imageUrl: "",
};

export function Dashboard({ address }: { address: Address }) {
    const {
        avatarWithProfile,
        circlesBalance,
        trustConnections,
        isLoadingAvatarData,
        refreshData
    } = useCircles();
    const { isLoadingSafe, circlesSdkRunner, invitationModuleAddress } = useWallet();
    const [stateStack, setStateStack] = useState<MigrationState[]>(["not-registered"]);
    const [hasMigrated, setHasMigrated] = useState(false);
    const [selfMigrationEligibility, setSelfMigrationEligibility] = useState<SelfMigrationEligibility>("not-applicable");
    const [v2TokenEligibility, setV2TokenEligibility] = useState<V2TokenEligibility>("unknown");
    const [eligibleBalanceStatus, setEligibleBalanceStatus] = useState<EligibleBalanceStatus>("not-applicable");
    const [invitationModuleStatus, setInvitationModuleStatus] = useState<InvitationModuleStatus>("not-applicable");
    const [invitationModuleRefreshNonce, setInvitationModuleRefreshNonce] = useState(0);
    const [draftProfile, setDraftProfile] = useState<Profile>(EMPTY_DRAFT_PROFILE);
    const [profileErrors, setProfileErrors] = useState<string[]>(["Name is required"]);
    const [migrateTrustRelations, setMigrateTrustRelations] = useState(false);
    const [wasOrganizationMigration, setWasOrganizationMigration] = useState(false);
    const currentState = stateStack[stateStack.length - 1];
    const avatar = avatarWithProfile?.avatar;
    const hasV1 = !!avatar?.hasV1;
    const isV2Avatar = avatar?.version === 2;
    const isV1AvatarPendingMigration = hasV1 && avatar?.version !== 2;
    const isV1Organization = isV1AvatarPendingMigration && avatarWithProfile?.avatar?.type === "CrcV1_OrganizationSignup";
    const canExecuteMigrationFlow = isV1AvatarPendingMigration;
    const isSupportedMigrationType =
        avatar?.type === "CrcV1_Signup" || avatar?.type === "CrcV1_OrganizationSignup";
    const hasBatchSupport =
        typeof (circlesSdkRunner?.contractRunner as { sendBatchTransaction?: unknown } | undefined)?.sendBatchTransaction === "function";
    const needsInviter = isV1AvatarPendingMigration && avatarWithProfile?.avatar?.type === "CrcV1_Signup" && selfMigrationEligibility === "ineligible";
    const requiresInvitationModuleEnablement =
        needsInviter && invitationModuleStatus === "disabled";
    const migrationBlockReason = isV1AvatarPendingMigration && !isSupportedMigrationType
        ? `Avatar type ${avatar?.type ?? "unknown"} is not supported for migration in this app.`
        : canExecuteMigrationFlow && !hasBatchSupport
            ? "Migration is not supported by the current wallet runner (batch transactions unavailable). Please switch wallet/safe and try again."
            : null;
    const hasV1Balances = (circlesBalance || []).some(
        (balance) => balance.version === 1 && BigInt(balance.attoCrc) > MIN_DUST_THRESHOLD
    );
    const showBalanceMigration = isV2Avatar && hasV1Balances && eligibleBalanceStatus === "available";
    const isCheckingV2TokenEligibility = hasV1 && isV2Avatar && (v2TokenEligibility === "unknown" || v2TokenEligibility === "checking");
    const hasInProgressFlow = stateStack.length > 1 || IN_PROGRESS_FLOW_STATES.includes(currentState);

    useEffect(() => {
        setStateStack(["not-registered"]);
        setHasMigrated(false);
        setDraftProfile(EMPTY_DRAFT_PROFILE);
        setProfileErrors(["Name is required"]);
        setMigrateTrustRelations(false);
        setWasOrganizationMigration(false);
    }, [address]);

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
        let isCancelled = false;

        const checkInvitationModuleStatus = async () => {
            if (!circlesSdkRunner || !needsInviter || !invitationModuleAddress) {
                setInvitationModuleStatus("not-applicable");
                return;
            }

            setInvitationModuleStatus("checking");

            try {
                const enabled = await isInvitationModuleEnabled(
                    circlesSdkRunner,
                    invitationModuleAddress
                );

                if (!isCancelled) {
                    setInvitationModuleStatus(enabled ? "enabled" : "disabled");
                }
            } catch (error) {
                console.warn("Failed to check invitation module status:", error);
                if (!isCancelled) {
                    setInvitationModuleStatus("not-applicable");
                }
            }
        };

        checkInvitationModuleStatus();

        return () => {
            isCancelled = true;
        };
    }, [circlesSdkRunner, invitationModuleAddress, invitationModuleRefreshNonce, needsInviter]);

    useEffect(() => {
        let isCancelled = false;

        const checkEligibleBalances = async () => {
            if (!circlesSdkRunner || !isV2Avatar || !hasV1 || !hasV1Balances) {
                setEligibleBalanceStatus("not-applicable");
                return;
            }

            setEligibleBalanceStatus("checking");
            try {
                const hasEligibleBalances = await hasAnyMigratableV1Balances(
                    circlesSdkRunner,
                    address as `0x${string}`
                );
                if (!isCancelled) {
                    setEligibleBalanceStatus(hasEligibleBalances ? "available" : "unavailable");
                }
            } catch (error) {
                console.warn("Failed to check eligible v1 balances for v2 avatar:", error);
                if (!isCancelled) {
                    setEligibleBalanceStatus("unavailable");
                }
            }
        };

        checkEligibleBalances();

        return () => {
            isCancelled = true;
        };
    }, [address, circlesSdkRunner, hasV1, hasV1Balances, isV2Avatar]);

    useEffect(() => {
        if (hasMigrated) return;

        let newState: MigrationState;

        if (!avatarWithProfile?.avatar) {
            newState = "not-registered";
        } else if (!avatarWithProfile.avatar.hasV1) {
            newState = avatarWithProfile.avatar.version === 2 ? "registered-v2" : "not-registered";
        } else if (avatarWithProfile.avatar.version === 2) {
            newState = "registered-v2";
        } else {
            newState = "ready-to-migrate";
        }

        setStateStack((prev) => {
            const current = prev[prev.length - 1];
            const isMidFlow = prev.length > 1 || IN_PROGRESS_FLOW_STATES.includes(current);

            if (newState === "not-registered" || newState === "registered-v2") {
                return current === newState && prev.length === 1 ? prev : [newState];
            }

            if (isMidFlow) {
                return prev;
            }

            return current === newState && prev.length === 1 ? prev : [newState];
        });
    }, [avatarWithProfile, hasMigrated]);

    useEffect(() => {
        if (isV1Organization) {
            setWasOrganizationMigration(true);
        }
    }, [isV1Organization]);

    useEffect(() => {
        setStateStack((prev) => {
            const current = prev[prev.length - 1];

            if (!requiresInvitationModuleEnablement) {
                const withoutModuleStep = prev.filter((step) => step !== "enable-invitation-module");

                if (current === "enable-invitation-module") {
                    return withoutModuleStep[withoutModuleStep.length - 1] === "execute-migration"
                        ? withoutModuleStep
                        : [...withoutModuleStep, "execute-migration"];
                }

                return withoutModuleStep.length === prev.length ? prev : withoutModuleStep;
            }

            return prev;
        });
    }, [requiresInvitationModuleEnablement]);

    useEffect(() => {
        let isCancelled = false;

        const checkCanSelfMigrate = async () => {
            if (
                !circlesSdkRunner ||
                !avatarWithProfile?.avatar?.hasV1 ||
                avatarWithProfile.avatar.version === 2 ||
                avatarWithProfile.avatar.type !== "CrcV1_Signup"
            ) {
                setSelfMigrationEligibility("not-applicable");
                return;
            }

            setSelfMigrationEligibility("checking");
            try {
                const canMigrate = await circlesSdkRunner.canSelfMigrate({ ...avatarWithProfile.avatar });
                if (!isCancelled) {
                    setSelfMigrationEligibility(canMigrate ? "eligible" : "ineligible");
                }
            } catch (error) {
                console.warn("Failed to check self migration eligibility:", error);
                if (!isCancelled) {
                    setSelfMigrationEligibility("ineligible");
                }
            }
        };

        checkCanSelfMigrate();

        return () => {
            isCancelled = true;
        };
    }, [avatarWithProfile, circlesSdkRunner]);

    const pushState = (newState: MigrationState) => {
        if (newState === "migrated") {
            setHasMigrated(true);
        }
        setStateStack(prev => prev[prev.length - 1] === newState ? prev : [...prev, newState]);
    };

    const popState = () => {
        setStateStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    };

    const canGoBack = stateStack.length > 1;
    const showStepper = ["ready-to-migrate", "create-profile", "enable-invitation-module", "execute-migration"].includes(currentState);

    if (
        isLoadingSafe ||
        !circlesSdkRunner ||
        (!hasInProgressFlow && (
            isLoadingAvatarData ||
            isCheckingV2TokenEligibility ||
            eligibleBalanceStatus === "checking" ||
            invitationModuleStatus === "checking" ||
            selfMigrationEligibility === "checking"
        ))
    ) {
        const loadingTitle = isCheckingV2TokenEligibility
            ? "Checking v1 token status"
            : eligibleBalanceStatus === "checking"
            ? "Checking migratable v1 balances"
            : invitationModuleStatus === "checking"
            ? "Checking invitation module"
            : selfMigrationEligibility === "checking"
            ? "Checking self-migration eligibility"
            : isLoadingSafe
            ? "Switching to selected Safe"
            : "Loading your Circles account";
        const loadingDescription = isCheckingV2TokenEligibility
            ? "Verifying whether your v2 avatar still has an active v1 token."
            : eligibleBalanceStatus === "checking"
            ? "Checking whether this v2 avatar still has any eligible v1 balances left to migrate."
            : invitationModuleStatus === "checking"
            ? "Checking whether your Safe has the invitation module enabled."
            : selfMigrationEligibility === "checking"
            ? "Checking whether this v1 human can migrate without an invite."
            : isLoadingSafe
            ? "Applying your Safe selection and syncing account context."
            : "Fetching profile, balances, and trust relations.";

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
                    showModuleStep={requiresInvitationModuleEnablement}
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
                circlesSdkRunner={circlesSdkRunner}
                needsInviter={needsInviter}
                requiresInvitationModuleEnablement={requiresInvitationModuleEnablement}
                invitationModuleAddress={invitationModuleAddress}
                onInvitationModuleEnabled={() => setInvitationModuleRefreshNonce((current) => current + 1)}
                isV1Organization={isV1Organization}
                wasOrganizationMigration={wasOrganizationMigration}
                migrationBlockReason={migrationBlockReason}
                draftProfile={draftProfile}
                setDraftProfile={setDraftProfile}
                profileErrors={profileErrors}
                setProfileErrors={setProfileErrors}
                migrateTrustRelations={migrateTrustRelations}
                setMigrateTrustRelations={setMigrateTrustRelations}
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
