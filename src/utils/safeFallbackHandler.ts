import { Sdk } from "@circles-sdk/sdk";
import type Safe from "@safe-global/protocol-kit";
import type { Address } from "viem";

export const SAFE_FALLBACK_HANDLER_V1_3_0_L2 =
  "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4".toLowerCase() as Address;
export const SAFE_FALLBACK_HANDLER_V1_4_1 =
  "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226".toLowerCase() as Address;

const VALID_FALLBACK_HANDLERS = new Set<Address>([
  SAFE_FALLBACK_HANDLER_V1_3_0_L2,
  SAFE_FALLBACK_HANDLER_V1_4_1,
]);

type SafeAwareContractRunner = {
  safe?: Safe;
  getSafe?: () => Safe | undefined;
};

export type SafeFallbackHandlerStatus = {
  canCheck: boolean;
  needsUpdate: boolean;
  currentFallbackHandler?: Address;
};

export function isValidSafeFallbackHandler(fallbackHandler: string | undefined): boolean {
  if (!fallbackHandler) {
    return false;
  }

  return VALID_FALLBACK_HANDLERS.has(fallbackHandler.toLowerCase() as Address);
}

export function getSafeFromSdk(sdk: Sdk): Safe | undefined {
  const runner = sdk.contractRunner as SafeAwareContractRunner;
  return runner.getSafe?.() ?? runner.safe;
}

export async function getSafeFallbackHandlerStatus(sdk: Sdk): Promise<SafeFallbackHandlerStatus> {
  const safe = getSafeFromSdk(sdk);
  if (!safe) {
    return {
      canCheck: false,
      needsUpdate: false,
    };
  }

  const currentFallbackHandler = (await safe.getFallbackHandler()).toLowerCase() as Address;

  return {
    canCheck: true,
    needsUpdate: !isValidSafeFallbackHandler(currentFallbackHandler),
    currentFallbackHandler,
  };
}

export async function updateSafeFallbackHandlerIfNeeded(sdk: Sdk): Promise<void> {
  const safe = getSafeFromSdk(sdk);
  if (!safe) {
    throw new Error("Safe fallback handler update is unavailable for the current wallet runner.");
  }

  const currentFallbackHandler = await safe.getFallbackHandler();
  if (isValidSafeFallbackHandler(currentFallbackHandler)) {
    return;
  }

  const safeTx = await safe.createEnableFallbackHandlerTx(SAFE_FALLBACK_HANDLER_V1_4_1);
  const result = await safe.executeTransaction(safeTx);
  const transactionResponse = result.transactionResponse as
    | { wait?: () => Promise<unknown> }
    | undefined;
  await transactionResponse?.wait?.();
}
