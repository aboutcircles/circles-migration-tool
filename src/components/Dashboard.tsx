import { Address } from "viem";
import { MigrationFlow } from "./MigrationFlow";
import { useCircles } from "../context/CirclesContext";
import { useState, useEffect } from "react";

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
    const [state, setState] = useState<"not-registered" | "registered-v2" | "migrated" | "ready-to-migrate" | "migrating">("not-registered");

    useEffect(() => {
        setState(avatarData?.hasV1 && avatarData?.version === 2 ? "migrated" : avatarData?.hasV1 ? "ready-to-migrate" : avatarData?.version === 2 ? "registered-v2" : "not-registered");
    }, [avatarData]);

    const handleStartMigration = () => {
        setState("migrating");
    };

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
            <MigrationFlow
                address={address}
                profile={profile}
                onStartMigration={handleStartMigration}
                circlesBalance={circlesBalance || []}
                trustConnections={trustConnections || []}
                state={state}
                invitations={invitations || []}
            />
        </div>
    );
}
