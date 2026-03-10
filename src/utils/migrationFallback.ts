import { Sdk } from "@circles-sdk/sdk";
import { Profile } from "@circles-sdk/profiles";
import { Address, cidV0ToUint8Array } from "@circles-sdk/utils";
import Safe from "@safe-global/protocol-kit";
import { Contract, JsonRpcProvider, ZeroAddress } from "ethers";

const V1_TOKEN_ABI = [
  "function stopped() view returns (bool)",
  "function update()",
  "function stop()",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function increaseAllowance(address spender, uint256 addedValue)",
] as const;

const MIGRATION_ABI = [
  "function migrate(address[] _avatars, uint256[] _amounts)",
] as const;

const MAX_TRUST_EXPIRY = BigInt("79228162514264337593543950335");
const SAFE_FALLBACK_HANDLER_V1_3_0_L2 = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4".toLowerCase() as Address;
const SAFE_FALLBACK_HANDLER_V1_4_1 = "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226".toLowerCase() as Address;
const VALID_FALLBACK_HANDLERS: ReadonlySet<Address> = new Set([SAFE_FALLBACK_HANDLER_V1_3_0_L2, SAFE_FALLBACK_HANDLER_V1_4_1]);

type BatchTransaction = {
  to: string;
  data: string;
  value: bigint;
};

type BatchRunner = {
  addTransaction: (tx: BatchTransaction) => void;
  run: () => Promise<unknown>;
};

type SafeAwareContractRunner = {
  getSafe?: () => Safe | undefined;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isNoBalancesRpcError(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes("no balances found");
}

export async function hasAnyMigratableV1Balances(
  sdk: Sdk,
  avatar: Address
): Promise<boolean> {
  let balances;
  try {
    balances = await sdk.data.getTokenBalances(avatar);
  } catch (error) {
    if (isNoBalancesRpcError(error)) {
      return false;
    }
    throw error;
  }

  const v1Balances = balances.filter(
    (balance) => balance.version === 1 && BigInt(balance.attoCrc) > 0n
  );

  if (v1Balances.length === 0) {
    return false;
  }

  const tokenOwners = Array.from(
    new Set(v1Balances.map((balance) => balance.tokenOwner.toLowerCase() as Address))
  );
  const tokenOwnerInfos = await sdk.data.getAvatarInfoBatch(tokenOwners);
  const tokenOwnerVersionByAddress = new Map(
    tokenOwnerInfos.map((ownerInfo) => [ownerInfo.avatar.toLowerCase(), ownerInfo.version])
  );

  const avatarLower = avatar.toLowerCase();

  return v1Balances.some((balance) => {
    const ownerLower = balance.tokenOwner.toLowerCase();
    return ownerLower === avatarLower || tokenOwnerVersionByAddress.get(ownerLower) === 2;
  });
}

async function createMetadataDigest(sdk: Sdk, profile: Profile): Promise<Uint8Array> {
  if (!sdk.profiles) {
    throw new Error("Profiles service is not configured");
  }

  const profileCid = await sdk.profiles.create(profile);
  return cidV0ToUint8Array(profileCid);
}

function createBatchRunner(sdk: Sdk): BatchRunner {
  const contractRunner = sdk.contractRunner as {
    sendBatchTransaction?: () => BatchRunner;
  };

  if (!contractRunner.sendBatchTransaction) {
    throw new Error("Batch transaction not supported by contract runner");
  }

  return contractRunner.sendBatchTransaction();
}

async function addSafeFallbackHandlerTransactionIfNeeded(
  sdk: Sdk,
  batch: BatchRunner
): Promise<void> {
  const contractRunner = sdk.contractRunner as SafeAwareContractRunner;
  const safe = contractRunner.getSafe?.();

  if (!safe) {
    return;
  }

  const currentFallbackHandler = (await safe.getFallbackHandler()).toLowerCase() as Address;
  if (VALID_FALLBACK_HANDLERS.has(currentFallbackHandler)) {
    return;
  }

  const safeTx = await safe.createEnableFallbackHandlerTx(SAFE_FALLBACK_HANDLER_V1_4_1);
  batch.addTransaction({
    to: safeTx.data.to,
    data: safeTx.data.data,
    value: BigInt(safeTx.data.value),
  });
}

async function addV1StopTransactionsIfNeeded(
  sdk: Sdk,
  batch: BatchRunner,
  v1TokenAddress?: Address
): Promise<void> {
  if (!v1TokenAddress) {
    return;
  }

  const provider = new JsonRpcProvider(sdk.circlesConfig.circlesRpcUrl);
  const v1Token = new Contract(v1TokenAddress, V1_TOKEN_ABI, provider);
  const isStopped = await v1Token.stopped();

  if (isStopped) {
    return;
  }

  batch.addTransaction({
    to: v1TokenAddress,
    data: v1Token.interface.encodeFunctionData("update"),
    value: 0n,
  });
  batch.addTransaction({
    to: v1TokenAddress,
    data: v1Token.interface.encodeFunctionData("stop"),
    value: 0n,
  });
}

async function addRegistrationTransactionsIfNeeded(
  sdk: Sdk,
  batch: BatchRunner,
  avatar: Address,
  inviter: Address,
  profile: Profile
): Promise<void> {
  if (!sdk.v2Hub || !sdk.circlesConfig.v2HubAddress) {
    throw new Error("V2 hub not available");
  }

  const avatarInfo = await sdk.data.getAvatarInfo(avatar);
  if (!avatarInfo) {
    throw new Error("Avatar not found");
  }
  if (!avatarInfo.hasV1) {
    throw new Error("Avatar is not a V1 avatar");
  }

  await addV1StopTransactionsIfNeeded(sdk, batch, avatarInfo.v1Token ?? undefined);

  if (avatarInfo.version === 1) {
    const metadataDigest = await createMetadataDigest(sdk, profile);

    if (avatarInfo.type === "CrcV1_Signup") {
      if (inviter === ZeroAddress && !(await sdk.canSelfMigrate({ ...avatarInfo }))) {
        throw new Error(
          `Self registration not allowed for avatar ${avatar} because it did not stop minting in v1 during the migration period`
        );
      }

      batch.addTransaction({
        to: sdk.circlesConfig.v2HubAddress,
        data: sdk.v2Hub.interface.encodeFunctionData("registerHuman", [inviter, metadataDigest]),
        value: 0n,
      });
    } else if (avatarInfo.type === "CrcV1_OrganizationSignup") {
      batch.addTransaction({
        to: sdk.circlesConfig.v2HubAddress,
        data: sdk.v2Hub.interface.encodeFunctionData("registerOrganization", [profile.name, metadataDigest]),
        value: 0n,
      });
    } else {
      throw new Error(`Avatar type ${avatarInfo.type} not supported`);
    }
  }

  if (avatarInfo.isHuman) {
    batch.addTransaction({
      to: sdk.circlesConfig.v2HubAddress,
      data: sdk.v2Hub.interface.encodeFunctionData("calculateIssuanceWithCheck", [avatar]),
      value: 0n,
    });
  }

}

async function addEligibleV1BalanceMigrationTransactions(
  sdk: Sdk,
  batch: BatchRunner,
  avatar: Address
): Promise<void> {
  if (!sdk.circlesConfig.migrationAddress) {
    throw new Error("Migration address not set");
  }

  const balances = await sdk.data.getTokenBalances(avatar);
  const v1Balances = balances.filter(
    (balance) => balance.version === 1 && BigInt(balance.attoCrc) > 0n
  );

  if (v1Balances.length === 0) {
    return;
  }

  const tokenOwners = Array.from(
    new Set(v1Balances.map((balance) => balance.tokenOwner.toLowerCase() as Address))
  );
  const tokenOwnerInfos = await sdk.data.getAvatarInfoBatch(tokenOwners);
  const tokenOwnerVersionByAddress = new Map(
    tokenOwnerInfos.map((ownerInfo) => [ownerInfo.avatar.toLowerCase(), ownerInfo.version])
  );
  const avatarLower = avatar.toLowerCase();
  const tokensToMigrate = v1Balances.filter((balance) => {
    const ownerLower = balance.tokenOwner.toLowerCase();
    return ownerLower === avatarLower || tokenOwnerVersionByAddress.get(ownerLower) === 2;
  });

  if (tokensToMigrate.length === 0) {
    return;
  }

  const provider = new JsonRpcProvider(sdk.circlesConfig.circlesRpcUrl);
  const allowances = await Promise.all(
    tokensToMigrate.map(async (tokenBalance) => {
      const token = new Contract(tokenBalance.tokenAddress, V1_TOKEN_ABI, provider);
      return token.allowance(avatar, sdk.circlesConfig.migrationAddress!);
    })
  );

  for (let index = 0; index < tokensToMigrate.length; index += 1) {
    const tokenBalance = tokensToMigrate[index];
    const balance = BigInt(tokenBalance.attoCrc);
    const allowance = allowances[index];

    if (allowance >= balance) {
      continue;
    }

    const token = new Contract(tokenBalance.tokenAddress, V1_TOKEN_ABI, provider);
    batch.addTransaction({
      to: tokenBalance.tokenAddress,
      data: token.interface.encodeFunctionData("increaseAllowance", [
        sdk.circlesConfig.migrationAddress,
        balance - allowance,
      ]),
      value: 0n,
    });
  }

  const migrationContract = new Contract(
    sdk.circlesConfig.migrationAddress,
    MIGRATION_ABI,
    provider
  );
  batch.addTransaction({
    to: sdk.circlesConfig.migrationAddress,
    data: migrationContract.interface.encodeFunctionData("migrate", [
      tokensToMigrate.map((balance) => balance.tokenOwner),
      tokensToMigrate.map((balance) => BigInt(balance.attoCrc)),
    ]),
    value: 0n,
  });
}

function addTrustTransactions(
  sdk: Sdk,
  batch: BatchRunner,
  trustRelations?: Address[]
): void {
  if (!trustRelations || trustRelations.length === 0 || !sdk.circlesConfig.v2HubAddress || !sdk.v2Hub) {
    return;
  }

  for (const trustRelation of trustRelations) {
    batch.addTransaction({
      to: sdk.circlesConfig.v2HubAddress,
      data: sdk.v2Hub.interface.encodeFunctionData("trust", [
        trustRelation,
        MAX_TRUST_EXPIRY,
      ]),
      value: 0n,
    });
  }
}

async function runManualMigration(
  sdk: Sdk,
  inviter: Address,
  avatar: Address,
  profile: Profile,
  trustRelations: Address[] | undefined,
  options: {
    skipBalanceMigration: boolean;
  }
): Promise<void> {
  avatar = avatar.toLowerCase() as Address;
  inviter = inviter.toLowerCase() as Address;

  const batch = createBatchRunner(sdk);
  await addSafeFallbackHandlerTransactionIfNeeded(sdk, batch);
  await addRegistrationTransactionsIfNeeded(sdk, batch, avatar, inviter, profile);

  if (!options.skipBalanceMigration) {
    await addEligibleV1BalanceMigrationTransactions(sdk, batch, avatar);
  }

  addTrustTransactions(sdk, batch, trustRelations);
  await batch.run();
}

export async function migrate(
  sdk: Sdk,
  inviter: Address,
  avatar: Address,
  profile: Profile,
  trustRelations?: Address[]
): Promise<void> {
  await runManualMigration(sdk, inviter, avatar, profile, trustRelations, {
    skipBalanceMigration: false,
  });
}

/**
 * Fallback migration path for zero-balance avatars where circles_getTokenBalances returns
 * "No balances found". It performs registration steps and skips v1 token-balance migration.
 */
export async function migrateAvatarWithoutBalances(
  sdk: Sdk,
  inviter: Address,
  avatar: Address,
  profile: Profile,
  trustRelations?: Address[]
): Promise<void> {
  await runManualMigration(sdk, inviter, avatar, profile, trustRelations, {
    skipBalanceMigration: true,
  });
}
