import { Sdk } from "@circles-sdk/sdk";
import { Address } from "viem";
import Safe from "@safe-global/protocol-kit";
import { addSafeFallbackHandlerTransactionIfNeeded } from "./safeFallbackHandler";

type BatchTransaction = {
  to: string;
  data: string;
  value: bigint;
};

type BatchRunner = {
  addTransaction: (tx: BatchTransaction) => void;
  run: () => Promise<unknown>;
};

type SafeAwareContractRunner = {
  getSafe?: () => Safe | undefined;
  sendBatchTransaction?: () => BatchRunner;
};

function getSafeAwareRunner(sdk: Sdk): SafeAwareContractRunner {
  return sdk.contractRunner as SafeAwareContractRunner;
}

function getSafe(sdk: Sdk): Safe {
  const safe = getSafeAwareRunner(sdk).getSafe?.();
  if (!safe) {
    throw new Error("A Safe-connected wallet is required for this migration flow.");
  }

  return safe;
}

function getBatchRunner(sdk: Sdk): BatchRunner {
  const batchRunner = getSafeAwareRunner(sdk).sendBatchTransaction?.();
  if (!batchRunner) {
    throw new Error("Batch transaction support is required to enable the invitation module.");
  }

  return batchRunner;
}

export async function isInvitationModuleEnabled(
  sdk: Sdk,
  moduleAddress: Address
): Promise<boolean> {
  const safe = getSafe(sdk);
  return safe.isModuleEnabled(moduleAddress);
}

export async function enableInvitationModule(
  sdk: Sdk,
  moduleAddress: Address
): Promise<void> {
  const safe = getSafe(sdk);
  const batch = getBatchRunner(sdk);
  let hasTransactions = await addSafeFallbackHandlerTransactionIfNeeded(safe, batch);
  const alreadyEnabled = await safe.isModuleEnabled(moduleAddress);

  if (!alreadyEnabled) {
    const safeTx = await safe.createEnableModuleTx(moduleAddress);
    batch.addTransaction({
      to: safeTx.data.to,
      data: safeTx.data.data,
      value: BigInt(safeTx.data.value),
    });
    hasTransactions = true;
  }

  if (!hasTransactions) {
    return;
  }

  await batch.run();
}
