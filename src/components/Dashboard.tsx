import { Address } from "viem";
import { MigrationFlow } from "./MigrationFlow";
import { useCircles } from "../context/CirclesContext";
import { useState, useEffect } from "react";
import { MigrationState } from "../types/migration";
import { ArrowLeft } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { useLoadingToast } from "../hooks/useLoadingToast";

export function Dashboard({ address }: { address: Address }) {
    const {
        profile,
        avatarData,
        circlesBalance,
        trustConnections,
        invitations,
        isLoadingAvatarData,
        avatarError
    } = useCircles();
    const { isLoadingSafe, circlesSdkRunner } = useWallet();
    const [stateStack, setStateStack] = useState<MigrationState[]>(["not-registered"]);
    const currentState = stateStack[stateStack.length - 1];

    useEffect(() => {
        const newState = avatarData?.hasV1 && avatarData?.version === 2
            ? "migrated"
            : avatarData?.hasV1
                ? "ready-to-migrate"
                : avatarData?.version === 2
                    ? "registered-v2"
                    : "not-registered";
        setStateStack([newState]);
    }, [avatarData]);

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

    const getStepStatus = (stepState: MigrationState) => {
        const stepOrder = ["ready-to-migrate", "selecting-inviter", "create-profile", "execute-migration"];
        const currentIndex = stepOrder.indexOf(currentState);
        const stepIndex = stepOrder.indexOf(stepState);

        if (stepIndex < currentIndex) return "step-primary";
        if (stepIndex === currentIndex) return "step-primary";
        return "";
    };

    if (isLoadingAvatarData || isLoadingSafe || !circlesSdkRunner) {
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
            {canGoBack && (
                <button
                    onClick={popState}
                    className="btn btn-sm btn-ghost mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
            )}

            {showStepper && (
                <div className="">
                    <ul className="steps steps-horizontal w-full">
                        <li className={`step ${getStepStatus("ready-to-migrate")}`}>
                            <div className="text-xs">Start</div>
                        </li>
                        <li className={`step ${getStepStatus("selecting-inviter")}`}>
                            <div className="text-xs">Choose Inviter</div>
                        </li>
                        <li className={`step ${getStepStatus("create-profile")}`}>
                            <div className="text-xs">Create Profile</div>
                        </li>
                        <li className={`step ${getStepStatus("execute-migration")}`}>
                            <div className="text-xs">Execute</div>
                        </li>
                    </ul>
                </div>
            )}

            <MigrationFlow
                address={address}
                profile={profile}
                pushState={pushState}
                circlesBalance={circlesBalance || []}
                trustConnections={trustConnections || []}
                state={currentState}
                invitations={invitations || []}
                circlesSdkRunner={circlesSdkRunner}
            />
        </div>
    );
}
