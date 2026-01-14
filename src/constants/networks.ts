import { gnosis } from 'wagmi/chains';
import { NetworkConfig } from '../types/network';

// Base URL for Circles services (can be overridden via environment)
const CIRCLES_BASE_URL = import.meta.env.VITE_CIRCLES_BASE_URL || 'https://staging.circlesubi.network';

export const NETWORK_CONFIG: Record<number, NetworkConfig> = {
    [gnosis.id]: {
        ...gnosis,
        // Circles indexer RPC (circles_* methods)
        circlesRpcUrl: `${CIRCLES_BASE_URL}/`,
        // Chain RPC for transactions (eth_* methods)
        chainRpcUrl: `${CIRCLES_BASE_URL}/chain-rpc/`,
        // Profile service
        profileServiceUrl: `${CIRCLES_BASE_URL}/profiles/`,
        // Contract addresses
        v1HubAddress: '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543',
        v2HubAddress: '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8',
        nameRegistryAddress: '0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474',
        migrationAddress: '0xD44B8dcFBaDfC78EA64c55B705BFc68199B56376',
    },
};
