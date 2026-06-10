import { describe, expect, it } from "vitest";
import { TokenBalanceRow } from "@circles-sdk/data";
import {
  getInitialMigrationState,
  isPendingV1Human,
  isPendingV1Organization,
  isSupportedPendingV1Migration,
  shouldRequestBackendFunding,
  shouldShowV1BalanceMigration,
} from "./journey";

const SAFE = "0x1111111111111111111111111111111111111111";
const EOA = "0x2222222222222222222222222222222222222222";

function balance(version: number, attoCrc: string): TokenBalanceRow {
  return {
    tokenAddress: "0x3333333333333333333333333333333333333333",
    tokenOwner: "0x4444444444444444444444444444444444444444",
    version,
    attoCrc,
    circles: Number(attoCrc) / 1e18,
  } as unknown as TokenBalanceRow;
}

describe("migration journey routing", () => {
  it("routes unknown accounts to not registered", () => {
    expect(getInitialMigrationState(undefined)).toBe("not-registered");
  });

  it("routes pending v1 humans to the profile migration journey and backend funding", () => {
    const avatar = { hasV1: true, version: 1, type: "CrcV1_Signup" };

    expect(getInitialMigrationState(avatar)).toBe("ready-to-migrate");
    expect(isPendingV1Human(avatar)).toBe(true);
    expect(isSupportedPendingV1Migration(avatar)).toBe(true);
    expect(shouldRequestBackendFunding(avatar, SAFE, EOA)).toBe(true);
  });

  it("routes pending v1 organizations to profile migration with backend funding", () => {
    const avatar = { hasV1: true, version: 1, type: "CrcV1_OrganizationSignup" };

    expect(getInitialMigrationState(avatar)).toBe("ready-to-migrate");
    expect(isPendingV1Organization(avatar)).toBe(true);
    expect(isSupportedPendingV1Migration(avatar)).toBe(true);
    expect(shouldRequestBackendFunding(avatar, SAFE, EOA)).toBe(true);
  });

  it("routes unsupported pending v1 avatars to migration start so the blocker is shown", () => {
    const avatar = { hasV1: true, version: 1, type: "UnsupportedAvatarType" };

    expect(getInitialMigrationState(avatar)).toBe("ready-to-migrate");
    expect(isSupportedPendingV1Migration(avatar)).toBe(false);
    expect(shouldRequestBackendFunding(avatar, SAFE, EOA)).toBe(false);
  });

  it("routes all v2 avatars to already on v2, including users with legacy v1 tokens", () => {
    expect(
      getInitialMigrationState({ hasV1: false, version: 2, type: "CrcV2_RegisterHuman" })
    ).toBe("registered-v2");
    expect(
      getInitialMigrationState({ hasV1: true, version: 2, type: "CrcV2_RegisterHuman" })
    ).toBe("registered-v2");
    expect(
      getInitialMigrationState({ hasV1: true, version: 2, type: "CrcV2_RegisterOrganization" })
    ).toBe("registered-v2");
  });

  it("requests backend funding for v2 avatars that still hold v1 token balances", () => {
    const v2Avatar = { hasV1: true, version: 2, type: "CrcV2_RegisterHuman" };
    const v1Balances = [balance(1, "1000000000000000000")];

    expect(shouldRequestBackendFunding(v2Avatar, SAFE, EOA, v1Balances)).toBe(true);
    expect(shouldRequestBackendFunding(v2Avatar, SAFE, EOA, [])).toBe(false);
    expect(shouldRequestBackendFunding(v2Avatar, SAFE, EOA, [balance(1, "0")])).toBe(false);
    expect(shouldRequestBackendFunding(v2Avatar, SAFE, EOA, [balance(2, "1000000000000000000")])).toBe(false);
    expect(shouldRequestBackendFunding(v2Avatar, undefined, EOA, v1Balances)).toBe(false);
    expect(shouldRequestBackendFunding(v2Avatar, SAFE, undefined, v1Balances)).toBe(false);
  });

  it("shows v1 balance migration only for migrated or v2 avatars with positive v1 balances", () => {
    const v2Avatar = { hasV1: true, version: 2, type: "CrcV2_RegisterHuman" };
    const v1Avatar = { hasV1: true, version: 1, type: "CrcV1_Signup" };
    const balances = [balance(1, "1000000000000000000")];

    expect(shouldShowV1BalanceMigration(v2Avatar, "registered-v2", balances)).toBe(true);
    expect(shouldShowV1BalanceMigration(v1Avatar, "migrated", balances)).toBe(true);
    expect(shouldShowV1BalanceMigration(v1Avatar, "ready-to-migrate", balances)).toBe(false);
    expect(shouldShowV1BalanceMigration(v2Avatar, "registered-v2", [balance(1, "0")])).toBe(false);
    expect(shouldShowV1BalanceMigration(v2Avatar, "registered-v2", [balance(2, "1000000000000000000")])).toBe(false);
  });
});
