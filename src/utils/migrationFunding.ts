import type { Address } from "viem";

export type MigrationFundingStatus = "funded" | "already_funded" | "sufficient_balance";

export type MigrationFundingResult = {
  status: MigrationFundingStatus;
};

export async function requestMigrationFunding(
  safeAddress: Address,
  eoaAddress: Address,
  signal?: AbortSignal
): Promise<MigrationFundingResult> {
  const response = await fetch("/api/migration-funding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ safeAddress, eoaAddress }),
    signal,
  });

  const body = await response.json().catch(() => undefined) as
    | { error?: string; status?: MigrationFundingStatus }
    | undefined;

  if (!response.ok) {
    throw new Error(body?.error || "Account preparation request failed");
  }

  if (
    body?.status !== "funded" &&
    body?.status !== "already_funded" &&
    body?.status !== "sufficient_balance"
  ) {
    throw new Error("Account preparation response was invalid");
  }

  return { status: body.status };
}
