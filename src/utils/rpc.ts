import { Sdk } from "@circles-sdk/sdk";
import { GNOSIS_CHAIN_RPC_URL } from "../constants/networks";

export function getSdkChainRpcUrl(sdk: Sdk): string {
  return (sdk.circlesConfig as { chainRpcUrl?: string }).chainRpcUrl ?? GNOSIS_CHAIN_RPC_URL;
}
