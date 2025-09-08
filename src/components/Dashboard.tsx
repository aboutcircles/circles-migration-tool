import { Address } from "viem";
import { NetworkConfig } from "../types/network";
import v1HubABI from "../abi/v1Hub";
import { useReadContracts } from "wagmi";
import v2HubABI from "../abi/v2Hub";

export function Dashboard({ address, network }: { address: Address, network: NetworkConfig }) {

    const v1HubContract = {
        address: network.v1HubAddress,
        abi: v1HubABI,
      } as const
      const v2HubContract = {
        address: network.v2HubAddress,
        abi: v2HubABI,
      } as const

    const {
        data,
        error,
        isPending
    } = useReadContracts({
        contracts: [{
            ...v1HubContract,
            functionName: 'userToToken',
            args: [address],
        }, {
            ...v2HubContract,
            functionName: 'avatars',
            args: [address],
        }, {
            ...v2HubContract,
            functionName: 'isHuman',
            args: [address],
        }]
    })

    const userToken = data?.[0];
    const avatars = data?.[1];
    // const isHuman = data?.[2];

    const isRegisteredOnV1 = userToken && userToken.result !== "0x0000000000000000000000000000000000000000";
    const isRegisteredOnV2 = avatars && avatars.result !== "0x0000000000000000000000000000000000000000";
    // const isHumanOnV2 = isHuman && isHuman.result === true;

    if (isPending) {
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

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
                    <p className="text-red-600">
                        Impossible to check your status on Circles v1: {error.message}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Migration dashboard</h1>

            {!isRegisteredOnV1 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-yellow-800">
                                You are not registered on Circles v1
                            </h2>
                            <p className="text-yellow-700 mt-2">
                                Your address ({address}) does not have a Circles v1 account.
                                You must first create a Circles v1 account before you can migrate to the v2.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-green-800">
                                Circles v1 account detected !
                            </h2>
                            <p className="text-green-700 mt-2">
                                Your address is registered on Circles v1 with the token :
                                <span className="font-mono text-sm bg-green-100 px-2 py-1 rounded ml-2">
                                    {userToken?.result}
                                </span>
                            </p>
                            <div className="mt-4">
                                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                                    Start migration to v2
                                    <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="space-y-3">
                    <span className="text-sm font-medium text-gray-500">V1 status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${isRegisteredOnV1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {isRegisteredOnV1 ? 'Registered' : 'Not registered'}
                    </span>
                </div>
            </div>
        </div>
    );
}
