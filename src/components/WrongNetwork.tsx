import { useSwitchChain } from 'wagmi';

export function WrongNetwork() {
    const { switchChain } = useSwitchChain();

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-base-100 p-6 sm:p-8 rounded-box shadow-2xl w-full max-w-md border border-base-300">
                <h1 className="text-2xl font-bold text-primary">Wrong Network</h1>
                <p className="mt-4 text-base-content text-opacity-80">Please switch to Gnosis Chain to continue with your migration.</p>
                <button
                    onClick={() => switchChain({ chainId: 100 })}
                    className="btn btn-primary w-full mt-6 min-h-[44px] shadow-md hover:shadow-lg transition-all"
                >
                    Switch to Gnosis Chain
                </button>
            </div>
        </div>
    );
}
