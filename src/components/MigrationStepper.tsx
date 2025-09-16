import { MigrationState } from "../types/migration";

interface MigrationStepperProps {
    currentState: MigrationState;
}

export function MigrationStepper({ currentState }: MigrationStepperProps) {
    const getStepStatus = (stepState: MigrationState) => {
        const stepOrder = ["ready-to-migrate", "selecting-inviter", "create-profile", "execute-migration"];
        const currentIndex = stepOrder.indexOf(currentState);
        const stepIndex = stepOrder.indexOf(stepState);

        if (stepIndex < currentIndex) return "step-primary";
        if (stepIndex === currentIndex) return "step-primary";
        return "";
    };

    return (
        <div className="w-full max-w-2xl mb-16 overflow-x-auto">
            <div className="flex items-center min-w-max">
                {/* Step 1 */}
                <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        getStepStatus("ready-to-migrate") ? "bg-black text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                        1
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                        getStepStatus("ready-to-migrate") ? "text-black" : "text-gray-400"
                    }`}>
                        Start
                    </span>
                </div>

                {/* Connector */}
                <div className="min-w-8 flex-1 h-px bg-gray-200 mx-4"></div>

                {/* Step 2 */}
                <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        getStepStatus("selecting-inviter") ? "bg-black text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                        2
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                        getStepStatus("selecting-inviter") ? "text-black" : "text-gray-400"
                    }`}>
                        Choose Inviter
                    </span>
                </div>

                {/* Connector */}
                <div className="min-w-8 flex-1 h-px bg-gray-200 mx-4"></div>

                {/* Step 3 */}
                <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        getStepStatus("create-profile") ? "bg-black text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                        3
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                        getStepStatus("create-profile") ? "text-black" : "text-gray-400"
                    }`}>
                        Create Profile
                    </span>
                </div>

                {/* Connector */}
                <div className="min-w-8 flex-1 h-px bg-gray-200 mx-4"></div>

                {/* Step 4 */}
                <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        getStepStatus("execute-migration") ? "bg-black text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                        4
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                        getStepStatus("execute-migration") ? "text-black" : "text-gray-400"
                    }`}>
                        Execute
                    </span>
                </div>
            </div>
        </div>
    );
}
