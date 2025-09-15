import { Address } from "viem";
import { MigrationFlow } from "./MigrationFlow";
import { useCircles } from "../context/CirclesContext";
import { useState, useEffect } from "react";
import { MigrationState } from "../types/migration";
import { ArrowLeft } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { useLoadingToast } from "../hooks/useLoadingToast";
import { MigrationStepper } from "./MigrationStepper";

export function Dashboard({ address }: { address: Address }) {
    const {
        avatarWithProfile,
        circlesBalance,
        trustConnections,
        invitationsWithProfiles,
        isLoadingAvatarData,
        avatarError
    } = useCircles();
    const { isLoadingSafe, circlesSdkRunner } = useWallet();
    const [stateStack, setStateStack] = useState<MigrationState[]>(["not-registered"]);
    const currentState = stateStack[stateStack.length - 1];

    useEffect(() => {
        const newState = avatarWithProfile?.avatar?.hasV1 && avatarWithProfile?.avatar?.version === 2
            ? "migrated"
            : avatarWithProfile?.avatar?.hasV1
                ? "ready-to-migrate"
                : avatarWithProfile?.avatar?.version === 2
                    ? "registered-v2"
                    : "not-registered";
        setStateStack([newState]);
    }, [avatarWithProfile]);

    useLoadingToast({
        id: "safe",
        isLoading: isLoadingSafe,
        loading: "Connecting your Safe…",
        silentSuccess: true,
    });

    useLoadingToast({
        id: "avatar",
        isLoading: isLoadingAvatarData,
        loading: "Checking your status on Circles…",
        error: avatarError,
        silentSuccess: true,
    });

    const pushState = (newState: MigrationState) => {
        setStateStack(prev => [...prev, newState]);
    };

    const popState = () => {
        setStateStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    };

    const canGoBack = stateStack.length > 1;
    const showStepper = ["ready-to-migrate", "selecting-inviter", "create-profile", "execute-migration"].includes(currentState);

    if (isLoadingAvatarData || isLoadingSafe || !circlesSdkRunner || !avatarWithProfile) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded-md w-48 mb-6"></div>
                    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-64"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl w-full mx-auto p-2 space-y-6">
            {showStepper && (
                <MigrationStepper currentState={currentState} />
            )}

            {canGoBack && (
                <button
                    onClick={popState}
                    className="btn btn-sm btn-ghost mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
            )}

            <MigrationFlow
                address={address}
                profile={avatarWithProfile?.profile}
                pushState={pushState}
                circlesBalance={circlesBalance || []}
                trustConnections={trustConnections || []}
                state={currentState}
                invitationsWithProfiles={invitationsWithProfiles || []}
                circlesSdkRunner={circlesSdkRunner}
            />
        </div>
    );
}
