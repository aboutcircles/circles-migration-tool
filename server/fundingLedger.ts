import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Address, Hex } from "viem";

export type FundingRecord = {
  safeAddress: Address;
  eoaAddress: Address;
  txHash: Hex | "0x";
  amountWei: string;
  fundedAt: string;
};

export interface FundingLedger {
  has(key: string): Promise<boolean>;
  add(key: string, record: FundingRecord): Promise<void>;
}

type LedgerFile = {
  records: Record<string, FundingRecord>;
};

export function createFundingKey(safeAddress: Address, eoaAddress: Address): string {
  return `${safeAddress.toLowerCase()}:${eoaAddress.toLowerCase()}`;
}

export class FileFundingLedger implements FundingLedger {
  constructor(private readonly filePath: string) {}

  async has(key: string): Promise<boolean> {
    const ledger = await this.readLedger();
    return Boolean(ledger.records[key]);
  }

  async add(key: string, record: FundingRecord): Promise<void> {
    const ledger = await this.readLedger();
    ledger.records[key] = record;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  }

  private async readLedger(): Promise<LedgerFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<LedgerFile>;
      return {
        records: parsed.records ?? {},
      };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return { records: {} };
      }

      throw error;
    }
  }
}
