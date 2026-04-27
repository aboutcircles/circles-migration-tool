import type { Address } from "viem";
import { normalizeAddress } from "./config.js";
import { HttpError } from "./errors.js";
import { createFundingKey, type FundingLedger } from "./fundingLedger.js";
import type { MigrationVerificationData } from "./circlesData.js";
import type { NativeFunder } from "./nativeFunder.js";

export type MigrationFundingResponse = {
  status: "funded" | "already_funded" | "sufficient_balance";
};

export type MigrationFundingRequestBody = {
  safeAddress?: unknown;
  eoaAddress?: unknown;
};

type MigrationFundingServiceDeps = {
  data: MigrationVerificationData;
  ledger: FundingLedger;
  funder: NativeFunder;
  fundingAmountWei: bigint;
};

export class MigrationFundingService {
  private readonly inFlight = new Map<string, Promise<MigrationFundingResponse>>();

  constructor(private readonly deps: MigrationFundingServiceDeps) {}

  async requestFunding(body: MigrationFundingRequestBody): Promise<MigrationFundingResponse> {
    let safeAddress: Address;
    let eoaAddress: Address;

    try {
      safeAddress = normalizeAddress(body.safeAddress, "safeAddress");
      eoaAddress = normalizeAddress(body.eoaAddress, "eoaAddress");
    } catch (error) {
      throw new HttpError(400, error instanceof Error ? error.message : "Invalid request body");
    }

    const key = createFundingKey(safeAddress, eoaAddress);
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const pending = this.verifyAndFund(key, safeAddress, eoaAddress).finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, pending);
    return pending;
  }

  private async verifyAndFund(
    key: string,
    safeAddress: Address,
    eoaAddress: Address,
  ): Promise<MigrationFundingResponse> {
    if (await this.deps.ledger.has(key)) {
      return { status: "already_funded" };
    }

    const ownedSafes = await this.deps.data.findSafesByOwner(eoaAddress);
    const ownsSafe = ownedSafes.some(
      (ownedSafe) => ownedSafe.toLowerCase() === safeAddress.toLowerCase(),
    );
    if (!ownsSafe) {
      throw new HttpError(403, "EOA does not control the submitted Safe");
    }

    const avatarInfo = await this.deps.data.getAvatarInfo(safeAddress);
    if (!avatarInfo) {
      throw new HttpError(403, "Submitted Safe is not a Circles avatar");
    }

    if (
      !avatarInfo.hasV1 ||
      avatarInfo.version !== 1 ||
      (avatarInfo.type !== "CrcV1_Signup" && avatarInfo.type !== "CrcV1_OrganizationSignup")
    ) {
      throw new HttpError(403, "Submitted Safe is not a supported pending v1 user");
    }

    const currentBalance = await this.deps.funder.getBalance(eoaAddress);
    if (currentBalance >= this.deps.fundingAmountWei) {
      return { status: "sufficient_balance" };
    }

    const txHash = await this.deps.funder.send(eoaAddress, this.deps.fundingAmountWei);
    await this.deps.ledger.add(key, {
      safeAddress,
      eoaAddress,
      txHash,
      amountWei: this.deps.fundingAmountWei.toString(),
      fundedAt: new Date().toISOString(),
    });

    return { status: "funded" };
  }
}
