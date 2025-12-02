import { MigrationState } from "../types/migration";
import { Check } from "lucide-react";

interface MigrationStepperProps {
    currentState: MigrationState;
}

export function MigrationStepper({ currentState }: MigrationStepperProps) {
    const getStepStatus = (stepState: MigrationState) => {
        const stepOrder = ["ready-to-migrate", "selecting-inviter", "create-profile", "execute-migration"];
        const currentIndex = stepOrder.indexOf(currentState);
        const stepIndex = stepOrder.indexOf(stepState);

        if (stepIndex < currentIndex) return "completed";
        if (stepIndex === currentIndex) return "active";
        return "upcoming";
    };

    const renderStepCircle = (stepNumber: number, stepState: MigrationState) => {
        const status = getStepStatus(stepState);
        
        if (status === "completed") {
            return (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-content shadow-md">
                    <Check className="w-5 h-5" />
                </div>
            );
        }
        
        if (status === "active") {
            return (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-content shadow-md ring-4 ring-primary ring-opacity-20">
                    <span className="text-sm font-bold">{stepNumber}</span>
                </div>
            );
        }
        
        return (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-base-300 text-base-content text-opacity-60">
                <span className="text-sm font-medium">{stepNumber}</span>
            </div>
        );
    };

    return (
        <div className="w-full max-w-3xl mx-auto mb-8 sm:mb-12 px-2 sm:px-4">
            <div className="bg-base-100 rounded-box shadow-lg p-4 sm:p-6">
                <div className="flex items-center justify-between relative">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center flex-1">
                        {renderStepCircle(1, "ready-to-migrate")}
                        <span className={`mt-2 text-xs sm:text-sm font-medium text-center ${
                            getStepStatus("ready-to-migrate") === "upcoming" ? "text-base-content text-opacity-40" : "text-base-content"
                        }`}>
                            Start
                        </span>
                    </div>

                    {/* Connector 1 */}
                    <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full ${
                        getStepStatus("selecting-inviter") !== "upcoming" ? "bg-primary" : "bg-base-300"
                    }`}></div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center flex-1">
                        {renderStepCircle(2, "selecting-inviter")}
                        <span className={`mt-2 text-xs sm:text-sm font-medium text-center ${
                            getStepStatus("selecting-inviter") === "upcoming" ? "text-base-content text-opacity-40" : "text-base-content"
                        }`}>
                            Choose Inviter
                        </span>
                    </div>

                    {/* Connector 2 */}
                    <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full ${
                        getStepStatus("create-profile") !== "upcoming" ? "bg-primary" : "bg-base-300"
                    }`}></div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center flex-1">
                        {renderStepCircle(3, "create-profile")}
                        <span className={`mt-2 text-xs sm:text-sm font-medium text-center ${
                            getStepStatus("create-profile") === "upcoming" ? "text-base-content text-opacity-40" : "text-base-content"
                        }`}>
                            Create Profile
                        </span>
                    </div>

                    {/* Connector 3 */}
                    <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full ${
                        getStepStatus("execute-migration") !== "upcoming" ? "bg-primary" : "bg-base-300"
                    }`}></div>

                    {/* Step 4 */}
                    <div className="flex flex-col items-center flex-1">
                        {renderStepCircle(4, "execute-migration")}
                        <span className={`mt-2 text-xs sm:text-sm font-medium text-center ${
                            getStepStatus("execute-migration") === "upcoming" ? "text-base-content text-opacity-40" : "text-base-content"
                        }`}>
                            Execute
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
