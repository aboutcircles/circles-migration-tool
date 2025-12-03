import { useSwitchChain } from 'wagmi';

export function WrongNetwork() {
    const { switchChain } = useSwitchChain();

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-base-300">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-base-content mb-3">Wrong Network</h1>
                    <p className="text-base-content/70 mb-6">
                        Please switch to Gnosis Chain to use the Circles Migration Tool.
                    </p>
                    <button
                        onClick={() => switchChain({ chainId: 100 })}
                        className="btn btn-neutral btn-lg w-full rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                        Switch to Gnosis Chain
                    </button>
                </div>
            </div>
        </div>
    );
}
