import { TokenBalanceRow } from "@circles-sdk/data";
import { Address } from "viem";
import { MigrationState } from "../types/migration";

type AvatarJourneyInfo = {
  hasV1?: boolean;
  version?: number;
  type?: string;
};

export function isPendingV1Avatar(avatar: AvatarJourneyInfo | undefined): boolean {
  return Boolean(avatar?.hasV1 && avatar.version === 1);
}

export function isPendingV1Human(avatar: AvatarJourneyInfo | undefined): boolean {
  return isPendingV1Avatar(avatar) && avatar?.type === "CrcV1_Signup";
}

export function isPendingV1Organization(avatar: AvatarJourneyInfo | undefined): boolean {
  return isPendingV1Avatar(avatar) && avatar?.type === "CrcV1_OrganizationSignup";
}

export function isSupportedPendingV1Migration(avatar: AvatarJourneyInfo | undefined): boolean {
  return isPendingV1Human(avatar) || isPendingV1Organization(avatar);
}

export function getInitialMigrationState(avatar: AvatarJourneyInfo | undefined): MigrationState {
  if (!avatar) {
    return "not-registered";
  }

  if (avatar.version === 2) {
    return "registered-v2";
  }

  if (isPendingV1Avatar(avatar)) {
    return "ready-to-migrate";
  }

  return "not-registered";
}

export function hasV1TokenBalances(circlesBalance: TokenBalanceRow[]): boolean {
  return circlesBalance.some(
    (balance) => balance.version === 1 && BigInt(balance.attoCrc) > 0n
  );
}

export function shouldRequestBackendFunding(
  avatar: AvatarJourneyInfo | undefined,
  safeAddress: Address | undefined,
  eoaAddress: Address | undefined,
  circlesBalance: TokenBalanceRow[] = [],
): boolean {
  if (!safeAddress || !eoaAddress) {
    return false;
  }

  // v2 accounts that still hold v1 token balances need gas for the token migration.
  return (
    isSupportedPendingV1Migration(avatar) ||
    (avatar?.version === 2 && hasV1TokenBalances(circlesBalance))
  );
}

export function shouldShowV1BalanceMigration(
  avatar: AvatarJourneyInfo | undefined,
  currentState: MigrationState,
  circlesBalance: TokenBalanceRow[],
): boolean {
  const hasMigratedAvatar = currentState === "migrated" || avatar?.version === 2;
  return hasMigratedAvatar && hasV1TokenBalances(circlesBalance);
}
