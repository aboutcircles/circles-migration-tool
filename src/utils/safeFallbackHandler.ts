import Safe from "@safe-global/protocol-kit";

type BatchTransaction = {
  to: string;
  data: string;
  value: bigint;
};

type BatchRunner = {
  addTransaction: (tx: BatchTransaction) => void;
};

const SAFE_FALLBACK_HANDLER_V1_3_0_L2 = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4".toLowerCase();
const SAFE_FALLBACK_HANDLER_V1_4_1 = "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226".toLowerCase();
const VALID_FALLBACK_HANDLERS = new Set([
  SAFE_FALLBACK_HANDLER_V1_3_0_L2,
  SAFE_FALLBACK_HANDLER_V1_4_1,
]);

export async function addSafeFallbackHandlerTransactionIfNeeded(
  safe: Safe,
  batch: BatchRunner,
): Promise<boolean> {
  const currentFallbackHandler = (await safe.getFallbackHandler()).toLowerCase();
  if (VALID_FALLBACK_HANDLERS.has(currentFallbackHandler)) {
    return false;
  }

  const safeTx = await safe.createEnableFallbackHandlerTx(SAFE_FALLBACK_HANDLER_V1_4_1);
  batch.addTransaction({
    to: safeTx.data.to,
    data: safeTx.data.data,
    value: BigInt(safeTx.data.value),
  });

  return true;
}
