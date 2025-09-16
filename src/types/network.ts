import { Address, Chain } from "viem";

export interface NetworkConfig extends Chain {
    circlesRpcUrl: string;
    profileServiceUrl: string;
    v1HubAddress: Address;
    v2HubAddress: Address;
    nameRegistryAddress: Address;
    migrationAddress: Address;
}