import { Address } from "viem";
import { MigrationFlow } from "./MigrationFlow";
import { useCircles } from "../context/CirclesContext";
import { useState, useEffect } from "react";
import { MigrationState } from "../types/migration";
import { ArrowLeft } from "lucide-react";

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

    const pushState = (newState: MigrationState) => {
        setStateStack(prev => [...prev, newState]);
    };

    const popState = () => {
        setStateStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    };

    const handleStartMigration = () => {
        pushState("selecting-inviter");
    };

    const canGoBack = stateStack.length > 1;

    if (isLoadingAvatarData) {
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

    if (avatarError) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
                    <p className="text-red-600">
                        Impossible to check your status on Circles: {avatarError}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl w-full mx-auto p-6">
            {/* Bouton de retour global */}
            {canGoBack && (
                <div className="mb-4">
                    <button
                        onClick={popState}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                </div>
            )}


            <MigrationFlow
                address={address}
                profile={profile}
                onStartMigration={handleStartMigration}
                circlesBalance={circlesBalance || []}
                trustConnections={trustConnections || []}
                state={currentState}
                invitations={invitations || []}
            />
        </div>
    );
}
