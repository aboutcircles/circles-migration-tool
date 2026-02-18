import { useEffect, useState } from "react";

interface AccountLoadingProps {
    title?: string;
    description?: string;
}

export function AccountLoading({
    title = "Loading your account",
    description = "Preparing your Safe and fetching your Circles profile data.",
}: AccountLoadingProps) {
    const [progress, setProgress] = useState(10);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    return 100;
                }

                if (prev < 70) {
                    return Math.min(prev + 8, 100);
                }

                if (prev < 90) {
                    return Math.min(prev + 4, 100);
                }

                return Math.min(prev + 2, 100);
            });
        }, 120);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    return (
        <div className="max-w-3xl mx-auto px-2 py-6">
            <div className="bg-white border border-base-300 rounded-2xl shadow-lg p-8 sm:p-10">
                <div className="flex items-start sm:items-center gap-4">
                    <span className="loading loading-spinner loading-lg text-primary shrink-0" />
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-primary">{title}</h2>
                        <p className="text-sm sm:text-base text-base-content/70 mt-1">{description}</p>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="h-2 rounded-full bg-base-200 overflow-hidden">
                        <div
                            className="h-full bg-primary/80 rounded-full transition-[width] duration-150 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-base-content/60">{progress}%</p>
                    <div className="h-4 rounded-lg bg-base-200/80 animate-pulse w-11/12" />
                    <div className="h-4 rounded-lg bg-base-200/70 animate-pulse w-4/5" />
                    <div className="h-4 rounded-lg bg-base-200/60 animate-pulse w-3/5" />
                </div>

                <div className="mt-8 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-primary/70 animate-bounce" />
                </div>
            </div>
        </div>
    );
}
