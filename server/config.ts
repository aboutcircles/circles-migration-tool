import { resolve } from "node:path";
import { getAddress, isAddress, parseEther, type Hex } from "viem";

export type ServerConfig = {
  port: number;
  backendRpcUrl: string;
  circlesRpcUrl: string;
  funderPrivateKey: Hex;
  fundingAmountWei: bigint;
  fundingLedgerPath: string;
};

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function requireFirstEnv(env: NodeJS.ProcessEnv, names: string[]): string {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required environment variable ${names.join(" or ")}`);
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 8787;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

function parsePrivateKey(value: string): Hex {
  const privateKey = value.startsWith("0x") ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("BACKEND_FUNDER_PRIVATE_KEY must be a 32-byte hex private key");
  }

  return privateKey as Hex;
}

export function normalizeAddress(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error(`${fieldName} must be a valid EVM address`);
  }

  return getAddress(value);
}

export function loadServerConfig(env = process.env): ServerConfig {
  const fundingAmount = env.FUNDING_AMOUNT_XDAI?.trim() || "0.01";
  const fundingLedgerPath = env.FUNDING_LEDGER_PATH?.trim() || ".data/funding-ledger.json";

  return {
    port: parsePort(env.PORT),
    backendRpcUrl: requireEnv(env, "BACKEND_RPC_URL"),
    circlesRpcUrl: env.BACKEND_CIRCLES_RPC_URL?.trim() || "https://rpc.aboutcircles.com",
    funderPrivateKey: parsePrivateKey(
      requireFirstEnv(env, ["BACKEND_FUNDER_PRIVATE_KEY", "SPONSOR_PRIVATE_KEY"]),
    ),
    fundingAmountWei: parseEther(fundingAmount),
    fundingLedgerPath: resolve(process.cwd(), fundingLedgerPath),
  };
}
