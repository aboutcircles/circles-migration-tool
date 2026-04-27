import {
  CirclesData,
  CirclesQuery,
  CirclesRpc,
  type AvatarRow,
  type Namespace,
  type Table,
} from "@circles-sdk/data";
import type { Address } from "viem";

type SafeOwnerRow = {
  safeAddress: Address;
};

export interface MigrationVerificationData {
  findSafesByOwner(ownerAddress: Address): Promise<Address[]>;
  getAvatarInfo(avatarAddress: Address): Promise<AvatarRow | undefined>;
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
