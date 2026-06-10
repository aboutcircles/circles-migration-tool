import { describe, expect, it } from "vitest";
import { AvatarRow, TokenBalanceRow } from "@circles-sdk/data";
import {
  classifyV1Balances,
  getMigrationErrorMessage,
  getV1TokenBalances,
  isEligibleTokenOwner,
} from "./v1TokenMigration";

const SELF = "0x1111111111111111111111111111111111111111";
const V2_HUMAN = "0x2222222222222222222222222222222222222222";
const V2_ORG = "0x3333333333333333333333333333333333333333";
const V2_GROUP = "0x4444444444444444444444444444444444444444";
const V1_ONLY = "0x5555555555555555555555555555555555555555";

function balance(tokenOwner: string, attoCrc = "1000000000000000000", version = 1): TokenBalanceRow {
  return {
    tokenAddress: `0xaa${tokenOwner.slice(4)}`,
    tokenOwner,
    version,
    attoCrc,
    circles: Number(attoCrc) / 1e18,
  } as unknown as TokenBalanceRow;
}

function ownerInfo(avatar: string, version: number, isHuman: boolean): AvatarRow {
  return { avatar, version, isHuman } as unknown as AvatarRow;
}

const OWNER_INFOS = [
  ownerInfo(SELF, 2, true),
  ownerInfo(V2_HUMAN, 2, true),
  ownerInfo(V2_ORG, 2, false),
  ownerInfo(V2_GROUP, 2, false),
  ownerInfo(V1_ONLY, 1, true),
];

describe("getV1TokenBalances", () => {
  it("keeps only positive v1 balances", () => {
    const balances = [
      balance(V2_HUMAN),
      balance(V2_HUMAN, "0"),
      balance(V2_HUMAN, "1000000000000000000", 2),
    ];

    expect(getV1TokenBalances(balances)).toHaveLength(1);
  });
});

describe("isEligibleTokenOwner", () => {
  it("accepts only v2 humans", () => {
    expect(isEligibleTokenOwner(ownerInfo(V2_HUMAN, 2, true))).toBe(true);
    expect(isEligibleTokenOwner(ownerInfo(V2_ORG, 2, false))).toBe(false);
    expect(isEligibleTokenOwner(ownerInfo(V1_ONLY, 1, true))).toBe(false);
    expect(isEligibleTokenOwner(undefined)).toBe(false);
  });
});

describe("classifyV1Balances", () => {
  it("marks own tokens and v2 human owners eligible", () => {
    const { eligible, ineligible } = classifyV1Balances(
      [balance(SELF), balance(V2_HUMAN)],
      OWNER_INFOS,
      SELF
    );

    expect(eligible.map((b) => b.tokenOwner)).toEqual([SELF, V2_HUMAN]);
    expect(ineligible).toHaveLength(0);
  });

  it("rejects owners that re-registered in v2 as organizations or groups", () => {
    const { eligible, ineligible } = classifyV1Balances(
      [balance(V2_ORG), balance(V2_GROUP)],
      OWNER_INFOS,
      SELF
    );

    expect(eligible).toHaveLength(0);
    expect(ineligible.map((b) => b.tokenOwner)).toEqual([V2_ORG, V2_GROUP]);
  });

  it("rejects owners that are still on v1", () => {
    const { ineligible } = classifyV1Balances([balance(V1_ONLY)], OWNER_INFOS, SELF);

    expect(ineligible).toHaveLength(1);
    expect(ineligible[0].ownerVersion).toBe(1);
  });

  it("matches addresses case-insensitively", () => {
    const checksummed = "0xAbCDef1234567890aBcdEF1234567890abCDeF12";
    const { eligible } = classifyV1Balances(
      [balance(checksummed)],
      [],
      checksummed.toLowerCase()
    );

    expect(eligible).toHaveLength(1);
    expect(eligible[0].tokenOwner).toBe(checksummed.toLowerCase());
  });
});

describe("getMigrationErrorMessage", () => {
  it("recognizes wallet rejections", () => {
    expect(getMigrationErrorMessage(new Error("user rejected action (action=...)"))).toBe(
      "the transaction was rejected in your wallet"
    );
    expect(getMigrationErrorMessage(new Error("MetaMask Tx Signature: User denied transaction signature."))).toBe(
      "the transaction was rejected in your wallet"
    );
  });

  it("extracts the custom error name from SDK-wrapped contract reverts", () => {
    const sdkError = new Error(
      JSON.stringify({ name: "CirclesErrorOneAddressArg", args: ["0x123", "5"] }, null, 2)
    );

    expect(getMigrationErrorMessage(sdkError)).toBe("CirclesErrorOneAddressArg");
  });

  it("truncates long messages and handles non-Error values", () => {
    const long = "x".repeat(500);
    expect(getMigrationErrorMessage(new Error(long))).toHaveLength(160);
    expect(getMigrationErrorMessage("plain string failure")).toBe("plain string failure");
  });
});
