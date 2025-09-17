import { Chain } from "viem";

export interface NetworkConfig extends Chain {
    circlesRpcUrl: string;
    profileServiceUrl: string;
    v1HubAddress: `0x${string}`;
    v2HubAddress: `0x${string}`;
    nameRegistryAddress: `0x${string}`;
    migrationAddress: `0x${string}`;
}