import { useSwitchChain } from 'wagmi';

export function WrongNetwork() {
    const { switchChain } = useSwitchChain();

    return (
        <div className="absolute top-0 z-20 w-screen h-screen bg-black/50 flex text-black items-end sm:items-center justify-center">
            <div className="bg-white p-8 rounded-t-lg sm:rounded-lg w-full sm:w-auto">
                <h1 className="text-2xl font-bold">Wrong Network</h1>
                <p className="mt-4">Please switch to the correct network to continue.</p>
                <button
                    onClick={() => switchChain({ chainId: 100 })}
                    className="btn btn-sm btn-neutral mt-4"
                >
                    Switch to Gnosis Chain
                </button>
            </div>
        </div>
    );
}
