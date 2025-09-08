import { Address } from "viem";
import { MigrationFlow } from "./MigrationFlow";
import { useCircles } from "../context/CirclesContext";

export function Dashboard({ address }: { address: Address }) {
    const { 
        userToken, 
        isRegisteredOnV1, 
        isRegisteredOnV2, 
        isLoadingMigrationData,
        migrationError 
    } = useCircles();

    if (isLoadingMigrationData) {
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

    if (migrationError) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
                    <p className="text-red-600">
                        Impossible to check your status on Circles: {migrationError}
                    </p>
                </div>
            </div>
        );
    }

    if(isRegisteredOnV1 && isRegisteredOnV2) {
        return (
            <div className="max-w-4xl w-full mx-auto p-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-green-800 mb-2">Success</h2>
                    <p className="">
                        Migration already completed
                    </p>
                </div>
            </div>
        );
    }

    if(isRegisteredOnV1 && !isRegisteredOnV2) {
        return (
            <div className="max-w-4xl w-full mx-auto p-6">
                <MigrationFlow 
                    address={address}
                    userToken={userToken || ""}
                />
            </div>
        );
    }

    // Fallback for other cases
    return (
        <div className="max-w-4xl w-full mx-auto p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-yellow-800 mb-2">Not Ready</h2>
                <p className="text-yellow-700">
                    Please ensure you have a Circles v1 account to migrate.
                </p>
            </div>
        </div>
    );
    
}
