import { Fragment } from "react";
import { MigrationState } from "../types/migration";
import { Check } from "lucide-react";

interface MigrationStepperProps {
    currentState: MigrationState;
    needsInviter: boolean;
    needsSafeFallbackUpdate: boolean;
}

export function MigrationStepper({ currentState, needsInviter, needsSafeFallbackUpdate }: MigrationStepperProps) {
    const steps: { state: MigrationState; label: string }[] = needsInviter
        ? [
            { state: "ready-to-migrate", label: "Start" },
            ...(needsSafeFallbackUpdate ? [{ state: "update-safe-fallback" as MigrationState, label: "Update Safe" }] : []),
            { state: "selecting-inviter", label: "Choose Inviter" },
            { state: "create-profile", label: "Create Profile" },
            { state: "execute-migration", label: "Execute" },
        ]
        : [
            { state: "ready-to-migrate", label: "Start" },
            ...(needsSafeFallbackUpdate ? [{ state: "update-safe-fallback" as MigrationState, label: "Update Safe" }] : []),
            { state: "create-profile", label: "Create Profile" },
            { state: "execute-migration", label: "Execute" },
        ];

    const getStepStatus = (stepState: MigrationState) => {
        const stepOrder = steps.map((step) => step.state);
        const currentIndex = stepOrder.indexOf(currentState);
        const stepIndex = stepOrder.indexOf(stepState);

        if (stepIndex === -1) return "upcoming";
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
                {steps.map((step, index) => (
                    <Fragment key={step.state}>
                        <div className="flex flex-col items-center">
                            {renderStepCircle(step.state, index + 1)}
                            <span className={`mt-3 text-sm whitespace-nowrap ${getStepLabelClass(step.state)}`}>
                                {step.label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`min-w-12 sm:min-w-16 flex-1 h-1 ${getConnectorClass(steps[index + 1].state)} mx-3 sm:mx-4 rounded-full`}></div>
                        )}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
