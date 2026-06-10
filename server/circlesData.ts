import {
  CirclesData,
  CirclesQuery,
  CirclesRpc,
  type AvatarRow,
  type Namespace,
  type Table,
  type TokenBalanceRow,
} from "@circles-sdk/data";
import type { Address } from "viem";

type SafeOwnerRow = {
  safeAddress: Address;
};

export interface MigrationVerificationData {
  findSafesByOwner(ownerAddress: Address): Promise<Address[]>;
  getAvatarInfo(avatarAddress: Address): Promise<AvatarRow | undefined>;
  hasV1TokenBalances(avatarAddress: Address): Promise<boolean>;
}

export class CirclesMigrationVerificationData implements MigrationVerificationData {
  private readonly rpc: CirclesRpc;
  private readonly data: CirclesData;

  constructor(circlesRpcUrl: string) {
    this.rpc = new CirclesRpc(circlesRpcUrl);
    this.data = new CirclesData(this.rpc);
  }

  async findSafesByOwner(ownerAddress: Address): Promise<Address[]> {
    const normalizedOwner = ownerAddress.toLowerCase() as Address;
    const lowercaseResults = await this.querySafesByOwner(normalizedOwner);
    const mixedCaseResults =
      normalizedOwner === ownerAddress
        ? []
        : await this.querySafesByOwner(ownerAddress);

    const deduped = new Map<string, Address>();
    [...lowercaseResults, ...mixedCaseResults].forEach((safeAddress) => {
      deduped.set(safeAddress.toLowerCase(), safeAddress);
    });

    return [...deduped.values()];
  }

  async getAvatarInfo(avatarAddress: Address): Promise<AvatarRow | undefined> {
    return this.data.getAvatarInfo(avatarAddress);
  }

  async hasV1TokenBalances(avatarAddress: Address): Promise<boolean> {
    let balances: TokenBalanceRow[];
    try {
      balances = await this.data.getTokenBalances(avatarAddress.toLowerCase() as Address);
    } catch (error) {
      // The Circles RPC reports avatars without any balances as an error.
      if (error instanceof Error && error.message.toLowerCase().includes("no balances found")) {
        return false;
      }
      throw error;
    }

    return balances.some(
      (balance) => balance.version === 1 && BigInt(balance.attoCrc) > 0n,
    );
  }

  private async querySafesByOwner(ownerAddress: Address): Promise<Address[]> {
    const query = new CirclesQuery(this.rpc, {
      namespace: "V_Safe" as Namespace,
      table: "Owners" as Table,
      filter: [
        {
          Type: "FilterPredicate",
          Column: "owner",
          Value: ownerAddress,
          FilterType: "Equals",
        },
      ],
      columns: [],
      limit: 10000,
      sortOrder: "ASC",
    });

    const safes: Address[] = [];
    while (await query.queryNextPage()) {
      const page = query.currentPage;
      page?.results.forEach((safe: unknown) => {
        safes.push((safe as unknown as SafeOwnerRow).safeAddress);
      });

      if ((page?.size ?? 0) < (page?.limit ?? 0)) {
        break;
      }
    }

    return safes;
  }
}
