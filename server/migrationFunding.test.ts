import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseEther, type Address, type Hex } from "viem";
import { HttpError } from "./errors.js";
import { FileFundingLedger } from "./fundingLedger.js";
import { MigrationFundingService } from "./migrationFunding.js";
import type { MigrationVerificationData } from "./circlesData.js";
import type { NativeFunder } from "./nativeFunder.js";

const SAFE = "0x1111111111111111111111111111111111111111" as Address;
const EOA = "0x2222222222222222222222222222222222222222" as Address;
const OTHER_SAFE = "0x3333333333333333333333333333333333333333" as Address;
const TX_HASH = `0x${"a".repeat(64)}` as Hex;
const FUNDING_AMOUNT = parseEther("0.01");

type AvatarInfo = Awaited<ReturnType<MigrationVerificationData["getAvatarInfo"]>>;

function v1HumanAvatar(overrides: Partial<NonNullable<AvatarInfo>> = {}): NonNullable<AvatarInfo> {
  return {
    avatar: SAFE,
    blockNumber: 1,
    transactionIndex: 0,
    logIndex: 0,
    timestamp: 1,
    transactionHash: TX_HASH,
    version: 1,
    type: "CrcV1_Signup",
    hasV1: true,
    isHuman: true,
    ...overrides,
  };
}

describe("MigrationFundingService", () => {
  let tempDir: string;
  let data: MigrationVerificationData;
  let funder: NativeFunder;
  let send: ReturnType<typeof vi.fn>;
  let getBalance: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "circles-funding-"));
    send = vi.fn().mockResolvedValue(TX_HASH);
    getBalance = vi.fn().mockResolvedValue(0n);
    data = {
      findSafesByOwner: vi.fn().mockResolvedValue([SAFE]),
      getAvatarInfo: vi.fn().mockResolvedValue(v1HumanAvatar()),
    };
    funder = { getBalance, send };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function createService(ledgerPath = join(tempDir, "funding-ledger.json")) {
    return new MigrationFundingService({
      data,
      funder,
      ledger: new FileFundingLedger(ledgerPath),
      fundingAmountWei: FUNDING_AMOUNT,
    });
  }

  it("rejects invalid addresses before chain checks", async () => {
    const service = createService();

    await expect(
      service.requestFunding({ safeAddress: "not-an-address", eoaAddress: EOA }),
    ).rejects.toMatchObject<HttpError>({ statusCode: 400 });

    expect(data.findSafesByOwner).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects when the EOA does not own the submitted Safe", async () => {
    vi.mocked(data.findSafesByOwner).mockResolvedValue([OTHER_SAFE]);
    const service = createService();

    await expect(
      service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA }),
    ).rejects.toMatchObject<HttpError>({ statusCode: 403 });

    expect(send).not.toHaveBeenCalled();
  });

  it("rejects Safes that are not supported pending v1 users", async () => {
    vi.mocked(data.getAvatarInfo).mockResolvedValue(
      v1HumanAvatar({ version: 2, type: "CrcV2_RegisterHuman" }),
    );
    const service = createService();

    await expect(
      service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA }),
    ).rejects.toMatchObject<HttpError>({ statusCode: 403 });

    expect(send).not.toHaveBeenCalled();
  });

  it("sends 0.01 xDAI when the EOA balance is below 0.01 xDAI", async () => {
    getBalance.mockResolvedValue(parseEther("0.004"));
    const service = createService();

    await expect(
      service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA }),
    ).resolves.toEqual({ status: "funded" });

    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(EOA, FUNDING_AMOUNT);
  });

  it("does not send xDAI when the EOA already has at least 0.01 xDAI", async () => {
    getBalance.mockResolvedValue(FUNDING_AMOUNT);
    const service = createService();

    await expect(
      service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA }),
    ).resolves.toEqual({ status: "sufficient_balance" });

    expect(send).not.toHaveBeenCalled();
  });

  it("does not write a funding ledger entry when no xDAI was sent", async () => {
    getBalance.mockResolvedValue(FUNDING_AMOUNT);
    const service = createService();

    await service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA });
    await expect(
      service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA }),
    ).resolves.toEqual({ status: "sufficient_balance" });

    expect(getBalance).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
  });

  it("funds pending v1 organizations", async () => {
    vi.mocked(data.getAvatarInfo).mockResolvedValue(
      v1HumanAvatar({ type: "CrcV1_OrganizationSignup", isHuman: false }),
    );
    const service = createService();

    await expect(
      service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA }),
    ).resolves.toEqual({ status: "funded" });

    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(EOA, FUNDING_AMOUNT);
  });

  it("does not fund the same Safe and EOA pair twice", async () => {
    const service = createService();

    await service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA });
    await expect(
      service.requestFunding({ safeAddress: SAFE, eoaAddress: EOA }),
    ).resolves.toEqual({ status: "already_funded" });

    expect(send).toHaveBeenCalledOnce();
  });

  it("keeps the one-time funding record in the file-backed ledger", async () => {
    const ledgerPath = join(tempDir, "funding-ledger.json");
    await createService(ledgerPath).requestFunding({ safeAddress: SAFE, eoaAddress: EOA });

    await expect(
      createService(ledgerPath).requestFunding({ safeAddress: SAFE, eoaAddress: EOA }),
    ).resolves.toEqual({ status: "already_funded" });

    expect(send).toHaveBeenCalledOnce();
  });
});
