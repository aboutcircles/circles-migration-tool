import { Address } from "viem";
import { CirclesQuery, CirclesRpc, Namespace, Table } from "@circles-sdk/data";

type SafeOwnerRow = {
  safeAddress: Address;
};

async function querySafesByOwner(ownerAddress: Address): Promise<Address[]> {
  const rpc = new CirclesRpc("https://rpc.aboutcircles.com");
  const circlesQuery = new CirclesQuery(rpc, {
    namespace: "V_Safe" as Namespace,
    table: "Owners" as Table,
    filter: [{
      Type: "FilterPredicate",
      Column: "owner",
      Value: ownerAddress,
      FilterType: "Equals"
    }],
    columns: [],
    limit: 10000,
    sortOrder: "ASC"
  });

  const safes: Address[] = [];
  while (await circlesQuery.queryNextPage()) {
    const page = circlesQuery.currentPage;
    page?.results.forEach((safe) => safes.push((safe as unknown as SafeOwnerRow).safeAddress));

    if ((page?.size ?? 0) < (page?.limit ?? 0)) {
      break;
    }
  }

  return safes;
}

export async function findSafesFromSigner(signerAddress: Address): Promise<Address[]> {
  try {
    const normalizedSigner = signerAddress.toLowerCase() as Address;
    const lowercaseResults = await querySafesByOwner(normalizedSigner);

    // Defensive fallback in case the backend keeps owner addresses in mixed case.
    const mixedCaseResults = normalizedSigner === signerAddress
      ? []
      : await querySafesByOwner(signerAddress);

    const deduped = new Map<string, Address>();
    [...lowercaseResults, ...mixedCaseResults].forEach((safeAddress) => {
      const key = safeAddress.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, safeAddress);
      }
    });

    return [...deduped.values()];
  } catch (error) {
    console.error("Error finding Safes from signer:", error);
    return [];
  }
}
