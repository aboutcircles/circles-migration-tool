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
        if (stepIndex === currentIndex) return "current";
        return "upcoming";
    };

    const renderStepCircle = (stepState: MigrationState, stepNumber: number) => {
        const status = getStepStatus(stepState);
        
        if (status === "completed") {
            return (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-primary text-white shadow-md">
                    <Check className="w-5 h-5" />
                </div>
            );
        }
        
        if (status === "current") {
            return (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-accent text-white shadow-md ring-4 ring-accent/20">
                    {stepNumber}
                </div>
            );
        }
        
        return (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-base-200 text-base-content/40">
                {stepNumber}
            </div>
        );
    };

    const getStepLabelClass = (stepState: MigrationState) => {
        const status = getStepStatus(stepState);
        if (status === "completed" || status === "current") {
            return "text-base-content font-medium";
        }
        return "text-base-content/40";
    };

    const getConnectorClass = (stepState: MigrationState) => {
        const status = getStepStatus(stepState);
        if (status === "completed") {
            return "bg-primary";
        }
        return "bg-base-300";
    };

    return (
        <div className="w-full max-w-3xl mb-8 overflow-x-auto pb-4">
            <div className="flex items-center min-w-max px-2">
                {/* Step 1 */}
                <div className="flex flex-col items-center">
                    {renderStepCircle("ready-to-migrate", 1)}
                    <span className={`mt-3 text-sm whitespace-nowrap ${getStepLabelClass("ready-to-migrate")}`}>
                        Start
                    </span>
                </div>

                {/* Connector */}
                <div className={`min-w-12 sm:min-w-16 flex-1 h-1 ${getConnectorClass("selecting-inviter")} mx-3 sm:mx-4 rounded-full`}></div>

                {/* Step 2 */}
                <div className="flex flex-col items-center">
                    {renderStepCircle("selecting-inviter", 2)}
                    <span className={`mt-3 text-sm whitespace-nowrap ${getStepLabelClass("selecting-inviter")}`}>
                        Choose Inviter
                    </span>
                </div>

                {/* Connector */}
                <div className={`min-w-12 sm:min-w-16 flex-1 h-1 ${getConnectorClass("create-profile")} mx-3 sm:mx-4 rounded-full`}></div>

                {/* Step 3 */}
                <div className="flex flex-col items-center">
                    {renderStepCircle("create-profile", 3)}
                    <span className={`mt-3 text-sm whitespace-nowrap ${getStepLabelClass("create-profile")}`}>
                        Create Profile
                    </span>
                </div>

                {/* Connector */}
                <div className={`min-w-12 sm:min-w-16 flex-1 h-1 ${getConnectorClass("execute-migration")} mx-3 sm:mx-4 rounded-full`}></div>

                {/* Step 4 */}
                <div className="flex flex-col items-center">
                    {renderStepCircle("execute-migration", 4)}
                    <span className={`mt-3 text-sm whitespace-nowrap ${getStepLabelClass("execute-migration")}`}>
                        Execute
                    </span>
                </div>
            </div>
        </div>
    );
}
