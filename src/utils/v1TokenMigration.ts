import { AvatarRow, TokenBalanceRow } from "@circles-sdk/data";
import { getErrorMessage } from "./migrationFallback";

export interface ClassifiedBalance {
  tokenAddress: string;
  tokenOwner: string;
  attoCrc: string;
  circles: number;
  ownerVersion: number | null;
}

export function getV1TokenBalances(circlesBalance: TokenBalanceRow[]): TokenBalanceRow[] {
  return circlesBalance.filter(
    (balance) => balance.version === 1 && BigInt(balance.attoCrc) > 0n
  );
}

/**
 * Hub v2's migrate() reverts unless every token owner is a registered v2 human.
 * Owners that re-registered in v2 as an organization or group are rejected
 * on-chain, so version alone is not enough.
 */
export function isEligibleTokenOwner(ownerInfo: AvatarRow | undefined): boolean {
  return ownerInfo?.version === 2 && ownerInfo.isHuman === true;
}

export function classifyV1Balances(
  v1Balances: TokenBalanceRow[],
  ownerInfos: AvatarRow[],
  avatarAddress: string
): { eligible: ClassifiedBalance[]; ineligible: ClassifiedBalance[] } {
  const avatarLower = avatarAddress.toLowerCase();
  const ownerInfoByAddress = new Map(
    ownerInfos.map((info) => [info.avatar.toLowerCase(), info])
  );

  const eligible: ClassifiedBalance[] = [];
  const ineligible: ClassifiedBalance[] = [];

  for (const balance of v1Balances) {
    const ownerLower = balance.tokenOwner.toLowerCase();
    const ownerInfo = ownerInfoByAddress.get(ownerLower);
    const isSelf = ownerLower === avatarLower;
    const canMigrate = isSelf || isEligibleTokenOwner(ownerInfo);

    const row: ClassifiedBalance = {
      tokenAddress: balance.tokenAddress.toLowerCase(),
      tokenOwner: ownerLower,
      attoCrc: balance.attoCrc,
      circles: balance.circles,
      ownerVersion: ownerInfo?.version ?? null,
    };

    if (canMigrate) {
      eligible.push(row);
    } else {
      ineligible.push(row);
    }
  }

  return { eligible, ineligible };
}

const USER_REJECTION_PATTERN = /user rejected|user denied|action_rejected|rejected the request/i;
const MAX_ERROR_LENGTH = 160;

export function getMigrationErrorMessage(error: unknown): string {
  const raw = getErrorMessage(error);

  if (USER_REJECTION_PATTERN.test(raw)) {
    return "the transaction was rejected in your wallet";
  }

  // The SDK wraps contract reverts in a JSON-encoded custom error; its name is
  // the most useful part for support triage.
  const customErrorName = raw.match(/"name":\s*"(\w+)"/)?.[1];
  const detail = customErrorName ?? raw;
  return detail.length > MAX_ERROR_LENGTH
    ? `${detail.slice(0, MAX_ERROR_LENGTH - 3)}...`
    : detail;
}
