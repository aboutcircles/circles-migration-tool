interface AccountLoadingProps {
    title?: string;
    description?: string;
}

export function AccountLoading({
    title = "Loading your account",
    description = "Preparing your Safe and fetching your Circles profile data.",
}: AccountLoadingProps) {
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
                    <div className="h-4 rounded-lg bg-base-200/80 animate-pulse w-11/12" />
                    <div className="h-4 rounded-lg bg-base-200/70 animate-pulse w-4/5" />
                    <div className="h-4 rounded-lg bg-base-200/60 animate-pulse w-3/5" />
                </div>
            </div>
        </div>
    );
}
