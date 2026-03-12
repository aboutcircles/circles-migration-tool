import "dotenv/config";
import express, { type Request, type Response } from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Safe from "@safe-global/protocol-kit";
import * as AboutCirclesInvitations from "@aboutcircles/sdk-invitations";
import { circlesConfig as aboutCirclesConfig } from "@aboutcircles/sdk-utils";
import { createGelatoEvmRelayerClient, type GelatoEvmRelayerClient } from "@gelatocloud/gasless";
import { concat, Contract, Interface, JsonRpcProvider, Wallet, ZeroAddress, isAddress, zeroPadValue } from "ethers";

type HexString = `0x${string}`;

type SponsorBatchTransaction = {
  to: HexString;
  data: HexString;
  value?: bigint;
};

type InvitationsClient = {
  generateInvite(inviter: string, invitee: string): Promise<SponsorBatchTransaction[]>;
};

type InvitationsConstructor = new (
  config: typeof aboutCirclesConfig[100],
) => InvitationsClient;
type SafeFactory = {
  init(config: {
    provider: string;
    signer?: string;
    safeAddress: string;
  }): Promise<{
    getThreshold(): Promise<bigint>;
    getOwners(): Promise<string[]>;
    createTransaction(args: {
      transactions: Array<{ to: string; value: string; data: string }>;
    }): Promise<{
      data: {
        to: string;
        value: string;
        data: string;
        operation: number;
        safeTxGas: string;
        baseGas: string;
        gasPrice: string;
        gasToken?: string;
        refundReceiver?: string;
      };
    }>;
  }>;
};

type SponsorInvitationResponse = {
  inviter: string;
  created: boolean;
  registered: boolean;
  reused?: boolean;
  txHash?: HexString;
};

type GelatoRelayRequestBody = {
  chainId?: number;
  to?: string;
  data?: string;
  avatarAddress?: string;
};

type SponsorInvitationRequestBody = {
  invitee?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const distDir = path.join(projectRoot, "dist");

const port = Number(process.env.PORT || 8787);
const sponsorSafeAddress = process.env.SPONSOR_SAFE_ADDRESS?.trim();
const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY?.trim();
const gelatoRelayApiKey = process.env.GELATO_RELAY_API_KEY?.trim();
const defaultCirclesConfig = aboutCirclesConfig[100];
const circlesConfig = {
  ...defaultCirclesConfig,
  circlesRpcUrl: process.env.CIRCLES_RPC_URL?.trim() || defaultCirclesConfig.circlesRpcUrl,
};

const sponsorExecutionGasLimit = BigInt(process.env.SPONSOR_EXECUTION_GAS_LIMIT?.trim() || "3000000");
const dummyMetadataDigest = `0x${"11".repeat(32)}` as HexString;
const Invitations = (AboutCirclesInvitations as unknown as { Invitations: InvitationsConstructor }).Invitations;
const SafeApi = Safe as unknown as SafeFactory;
const provider = new JsonRpcProvider(circlesConfig.circlesRpcUrl);
const registerHumanInterface = new Interface([
  "function registerHuman(address _inviter, bytes32 _metadataDigest)",
]);
const safeExecutionInterface = new Interface([
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) returns (bool success)",
]);
const v2HubReadContract = new Contract(
  circlesConfig.v2HubAddress,
  ["function isHuman(address) view returns (bool)"],
  provider,
);

const app = express();
app.use(express.json());

type SafeInstance = Awaited<ReturnType<typeof SafeApi.init>>;

let sponsorSafePromise: Promise<SafeInstance> | undefined;
let gelatoRelayerClient: GelatoEvmRelayerClient | undefined;
let sponsorBatchQueue: Promise<unknown> = Promise.resolve();

function isSponsorConfigured(): boolean {
  return Boolean(sponsorSafeAddress && sponsorPrivateKey);
}

function isGelatoConfigured(): boolean {
  return Boolean(gelatoRelayApiKey);
}

function getGelatoRelayerClient(): GelatoEvmRelayerClient {
  if (!isGelatoConfigured()) {
    throw new Error("Gelato relay service is not configured.");
  }

  gelatoRelayerClient ??= createGelatoEvmRelayerClient({
    apiKey: gelatoRelayApiKey!,
  });

  return gelatoRelayerClient;
}

function isHexString(value: unknown): value is HexString {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value) && value.length % 2 === 0;
}

function logMigrationEvent(
  outcome: "success" | "failure",
  mode: "sponsor" | "relay",
  avatarAddress: string,
  details: Record<string, unknown>,
): void {
  const logEntry = {
    event: "migration_attempt",
    outcome,
    mode,
    avatarAddress: avatarAddress.toLowerCase(),
    timestamp: new Date().toISOString(),
    ...details,
  };

  const serialized = JSON.stringify(logEntry, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );

  if (outcome === "success") {
    console.log(serialized);
    return;
  }

  console.error(serialized);
}

async function getSponsorSafe(): Promise<SafeInstance> {
  if (!isSponsorConfigured()) {
    throw new Error("Sponsor service is not configured.");
  }

  if (!sponsorSafePromise) {
    const initPromise = SafeApi.init({
      provider: circlesConfig.circlesRpcUrl,
      signer: sponsorPrivateKey!,
      safeAddress: sponsorSafeAddress!,
    });
    sponsorSafePromise = initPromise;
    initPromise.catch(() => {
      if (sponsorSafePromise === initPromise) {
        sponsorSafePromise = undefined;
      }
    });
  }

  return sponsorSafePromise;
}

async function canRegisterHumanWithInviter(invitee: string, inviter: string): Promise<boolean> {
  const data = registerHumanInterface.encodeFunctionData("registerHuman", [
    inviter,
    dummyMetadataDigest,
  ]);

  try {
    await provider.call({
      from: invitee,
      to: circlesConfig.v2HubAddress,
      data,
    });
    return true;
  } catch {
    return false;
  }
}

async function isRegisteredHuman(avatar: string): Promise<boolean> {
  return v2HubReadContract.isHuman(avatar);
}

function getInvitationsClient(): InvitationsClient {
  return new Invitations(circlesConfig);
}

function createPrevalidatedSignature(ownerAddress: string): HexString {
  return concat([zeroPadValue(ownerAddress, 32), new Uint8Array(32), "0x01"]) as HexString;
}

async function executeSponsorBatchInner(transactions: SponsorBatchTransaction[]): Promise<HexString> {
  const sponsorSafe = await getSponsorSafe();
  const threshold = Number(await sponsorSafe.getThreshold());
  if (threshold !== 1) {
    throw new Error(`Sponsor Safe threshold ${threshold} is not supported by the sponsor server. Configure a threshold-1 Safe.`);
  }

  const signer = new Wallet(sponsorPrivateKey!, provider);
  const signerAddress = await signer.getAddress();
  const owners = await sponsorSafe.getOwners();
  if (!owners.some((owner: string) => owner.toLowerCase() === signerAddress.toLowerCase())) {
    throw new Error("SPONSOR_PRIVATE_KEY signer is not an owner of the configured sponsor Safe.");
  }

  const safeTransaction = await sponsorSafe.createTransaction({
    transactions: transactions.map((transaction) => ({
      to: transaction.to,
      value: (transaction.value ?? 0n).toString(),
      data: transaction.data,
    })),
  });

  const execTransactionData = safeExecutionInterface.encodeFunctionData("execTransaction", [
    safeTransaction.data.to,
    BigInt(safeTransaction.data.value),
    safeTransaction.data.data,
    safeTransaction.data.operation,
    BigInt(safeTransaction.data.safeTxGas),
    BigInt(safeTransaction.data.baseGas),
    BigInt(safeTransaction.data.gasPrice),
    safeTransaction.data.gasToken || ZeroAddress,
    safeTransaction.data.refundReceiver || ZeroAddress,
    createPrevalidatedSignature(signerAddress),
  ]);

  const executionTx = await signer.sendTransaction({
    to: sponsorSafeAddress,
    data: execTransactionData,
    gasLimit: sponsorExecutionGasLimit,
  });

  await executionTx.wait();
  return executionTx.hash as HexString;
}

function executeSponsorBatch(transactions: SponsorBatchTransaction[]): Promise<HexString> {
  const result = sponsorBatchQueue.then(
    () => executeSponsorBatchInner(transactions),
    () => executeSponsorBatchInner(transactions),
  );
  sponsorBatchQueue = result.then(() => {}, () => {});
  return result;
}

app.get("/api/gelato-relay/status", (_request: Request, response: Response) => {
  response.json({
    available: isGelatoConfigured(),
  });
});

app.post("/api/gelato-relay", async (request: Request<unknown, unknown, GelatoRelayRequestBody>, response: Response) => {
  if (!isGelatoConfigured()) {
    response.status(503).json({
      error: "Gelato relay service is not configured.",
    });
    return;
  }

  const chainId = Number(request.body?.chainId);
  const to = typeof request.body?.to === "string" ? request.body.to.trim() : "";
  const data = typeof request.body?.data === "string" ? request.body.data.trim() : "";
  const avatarAddress = typeof request.body?.avatarAddress === "string" ? request.body.avatarAddress.trim() : "";

  if (!Number.isInteger(chainId) || chainId <= 0) {
    response.status(400).json({
      error: "A valid chainId is required.",
    });
    return;
  }

  if (!isAddress(to)) {
    response.status(400).json({
      error: "A valid target address is required.",
    });
    return;
  }

  if (!isHexString(data)) {
    response.status(400).json({
      error: "A valid hex calldata payload is required.",
    });
    return;
  }

  if (!isAddress(avatarAddress)) {
    response.status(400).json({
      error: "A valid avatarAddress is required.",
    });
    return;
  }

  try {
    const relayer = getGelatoRelayerClient();
    const relayResult = await relayer.sendTransactionSync(
      {
        chainId,
        to,
        data,
      },
      {
        throwOnReverted: true,
      },
    );

    response.json({
      transactionHash: relayResult.transactionHash,
    });
    logMigrationEvent("success", "relay", avatarAddress, {
      chainId,
      target: to,
      transactionHash: relayResult.transactionHash,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to relay sponsored transaction.";
    const isRateLimited = errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit");
    logMigrationEvent("failure", "relay", avatarAddress, {
      chainId,
      target: to,
      error: errorMessage,
    });
    if (isRateLimited) {
      response.status(429).json({
        error: "The relay service is temporarily rate-limited. Please try again in a few minutes.",
      });
    } else {
      response.status(502).json({
        error: "Failed to relay sponsored transaction.",
      });
    }
  }
});

app.get("/api/sponsor-invitations/status", async (_request: Request, response: Response) => {
  if (!isSponsorConfigured()) {
    response.json({
      available: false,
      reason: "Sponsor service is not configured.",
    });
    return;
  }

  try {
    const sponsorSafe = await getSponsorSafe();
    const threshold = Number(await sponsorSafe.getThreshold());
    response.json({
      available: true,
      inviter: sponsorSafeAddress,
      threshold,
    });
  } catch (error) {
    response.status(503).json({
      available: false,
      reason: error instanceof Error ? error.message : "Sponsor service is unavailable.",
    });
  }
});

app.post(
  "/api/sponsor-invitations",
  async (request: Request<unknown, unknown, SponsorInvitationRequestBody>, response: Response) => {
    if (!isSponsorConfigured()) {
      response.status(503).json({
        error: "Sponsor service is not configured.",
      });
      return;
    }

    const invitee = typeof request.body?.invitee === "string" ? request.body.invitee.trim() : "";
    if (!isAddress(invitee)) {
      response.status(400).json({
        error: "A valid invitee address is required.",
      });
      return;
    }

    try {
      if (await isRegisteredHuman(invitee)) {
        const payload: SponsorInvitationResponse = {
          inviter: sponsorSafeAddress!,
          created: false,
          reused: true,
          registered: true,
        };
        logMigrationEvent("success", "sponsor", invitee, {
          inviter: sponsorSafeAddress,
          created: false,
          reused: true,
          registered: true,
        });
        response.json(payload);
        return;
      }

      if (await canRegisterHumanWithInviter(invitee, sponsorSafeAddress!)) {
        const payload: SponsorInvitationResponse = {
          inviter: sponsorSafeAddress!,
          created: false,
          reused: true,
          registered: false,
        };
        logMigrationEvent("success", "sponsor", invitee, {
          inviter: sponsorSafeAddress,
          created: false,
          reused: true,
          registered: false,
        });
        response.json(payload);
        return;
      }

      const invitations = getInvitationsClient();
      const transactions = (await invitations.generateInvite(
        sponsorSafeAddress!,
        invitee,
      )) as SponsorBatchTransaction[];
      const txHash = await executeSponsorBatch(transactions);

      if (await isRegisteredHuman(invitee)) {
        const payload: SponsorInvitationResponse = {
          inviter: sponsorSafeAddress!,
          created: true,
          registered: true,
          txHash,
        };
        logMigrationEvent("success", "sponsor", invitee, {
          inviter: sponsorSafeAddress,
          created: true,
          registered: true,
          txHash,
        });
        response.json(payload);
        return;
      }

      const isValid = await canRegisterHumanWithInviter(invitee, sponsorSafeAddress!);
      if (!isValid) {
        throw new Error("The sponsored invite transaction succeeded, but the invite is still not usable on-chain.");
      }

      const payload: SponsorInvitationResponse = {
        inviter: sponsorSafeAddress!,
        created: true,
        registered: false,
        txHash,
      };
      logMigrationEvent("success", "sponsor", invitee, {
        inviter: sponsorSafeAddress,
        created: true,
        registered: false,
        txHash,
      });
      response.json(payload);
    } catch (error) {
      logMigrationEvent("failure", "sponsor", invitee, {
        inviter: sponsorSafeAddress,
        error: error instanceof Error ? error.message : "Failed to create sponsored invite.",
      });
      response.status(502).json({
        error: error instanceof Error ? error.message : "Failed to create sponsored invite.",
      });
    }
  },
);

if (existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get(/^\/(?!api).*/, (_request: Request, response: Response) => {
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Sponsor server listening on http://localhost:${port}`);
});
