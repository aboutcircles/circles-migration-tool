import { gnosis } from 'wagmi/chains';
import { NetworkConfig } from '../types/network';

export const NETWORK_CONFIG: Record<number, NetworkConfig> = {
    [gnosis.id]: {
        ...gnosis,
        circlesRpcUrl: 'https://staging.circlesubi.network/',
        profileServiceUrl: 'https://staging.circlesubi.network/profiles/',
        v1HubAddress: '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543',
        v2HubAddress: '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8',
        nameRegistryAddress: '0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474',
        migrationAddress: '0xD44B8dcFBaDfC78EA64c55B705BFc68199B56376',
    },
};
