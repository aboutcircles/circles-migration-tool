import { Sdk } from "@circles-sdk/sdk";
import { Profile } from "@circles-sdk/profiles";
import { Address, cidV0ToUint8Array } from "@circles-sdk/utils";
import Safe from "@safe-global/protocol-kit";
import { Contract, JsonRpcProvider, ZeroAddress } from "ethers";
import { addSafeFallbackHandlerTransactionIfNeeded as addSafeFallbackHandlerTxIfNeeded } from "./safeFallbackHandler";

const V1_TOKEN_ABI = [
  "function stopped() view returns (bool)",
  "function update()",
  "function stop()",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function increaseAllowance(address spender, uint256 addedValue)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
] as const;

const MIGRATION_ABI = [
  "function migrate(address[] _avatars, uint256[] _amounts)",
] as const;

const NAME_REGISTRY_ABI = [
  "function updateMetadataDigest(bytes32 _metadataDigest)",
] as const;

const MAX_TRUST_EXPIRY = BigInt("79228162514264337593543950335");

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

async function isAlreadyRegisteredOnV2(
  sdk: Sdk,
  avatar: Address,
  avatarType: string
): Promise<boolean> {
  if (!sdk.v2Hub) {
    return false;
  }

  if (avatarType === "CrcV1_Signup") {
    return sdk.v2Hub.isHuman(avatar);
  }

  if (avatarType === "CrcV1_OrganizationSignup") {
    return sdk.v2Hub.isOrganization(avatar);
  }

  return false;
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

  await addSafeFallbackHandlerTxIfNeeded(safe, batch);
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

async function shouldAddIssuanceCalculationTransaction(
  sdk: Sdk,
  avatar: Address,
  avatarVersion: number
): Promise<boolean> {
  if (avatarVersion === 1) {
    return true;
  }

  if (!sdk.v2Hub || !sdk.circlesConfig.v2HubAddress) {
    return false;
  }

  const provider = new JsonRpcProvider(sdk.circlesConfig.circlesRpcUrl);
  const data = sdk.v2Hub.interface.encodeFunctionData("calculateIssuanceWithCheck", [avatar]);

  try {
    await provider.call({
      from: avatar,
      to: sdk.circlesConfig.v2HubAddress,
      data,
    });
    return true;
  } catch (error) {
    console.warn("Skipping calculateIssuanceWithCheck because it reverts for avatar:", avatar, error);
    return false;
  }
}

async function addRegistrationTransactionsIfNeeded(
  sdk: Sdk,
  batch: BatchRunner,
  avatar: Address,
  inviter: Address,
  profile: Profile,
  metadataDigest: Uint8Array
): Promise<boolean> {
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

  const isRegisteredOnV2 = avatarInfo.version === 2
    ? true
    : await isAlreadyRegisteredOnV2(sdk, avatar, avatarInfo.type);
  const wasAlreadyRegisteredOnV2AtStart = isRegisteredOnV2;

  if (!isRegisteredOnV2 && avatarInfo.version === 1) {
    if (avatarInfo.type === "CrcV1_Signup") {
      const canSelfMigrate = await sdk.canSelfMigrate({ ...avatarInfo });

      if (inviter === ZeroAddress && !canSelfMigrate) {
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

  const isMigratingFromV1 = avatarInfo.hasV1;
  const shouldAddIssuance = isMigratingFromV1
    ? true
    : await shouldAddIssuanceCalculationTransaction(sdk, avatar, isRegisteredOnV2 ? 2 : avatarInfo.version);

  if (avatarInfo.isHuman && shouldAddIssuance) {
    batch.addTransaction({
      to: sdk.circlesConfig.v2HubAddress,
      data: sdk.v2Hub.interface.encodeFunctionData("calculateIssuanceWithCheck", [avatar]),
      value: 0n,
    });
  }

  return wasAlreadyRegisteredOnV2AtStart;
}

function addMetadataUpdateTransaction(
  sdk: Sdk,
  batch: BatchRunner,
  metadataDigest: Uint8Array
): void {
  if (!sdk.circlesConfig.nameRegistryAddress) {
    throw new Error("Name registry address not set");
  }

  const provider = new JsonRpcProvider(sdk.circlesConfig.circlesRpcUrl);
  const nameRegistry = new Contract(sdk.circlesConfig.nameRegistryAddress, NAME_REGISTRY_ABI, provider);

  batch.addTransaction({
    to: sdk.circlesConfig.nameRegistryAddress,
    data: nameRegistry.interface.encodeFunctionData("updateMetadataDigest", [metadataDigest]),
    value: 0n,
  });
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

  const migrateAmounts = await Promise.all(
    tokensToMigrate.map(async (tokenBalance) => {
      const isOwnToken = tokenBalance.tokenOwner.toLowerCase() === avatarLower;
      if (isOwnToken) {
        const token = new Contract(tokenBalance.tokenAddress, V1_TOKEN_ABI, provider);
        return (await token.balanceOf(avatar)) as bigint;
      }
      return BigInt(tokenBalance.attoCrc);
    })
  );

  const MAX_UINT256 = (1n << 256n) - 1n;

  const allowances = await Promise.all(
    tokensToMigrate.map(async (tokenBalance) => {
      const token = new Contract(tokenBalance.tokenAddress, V1_TOKEN_ABI, provider);
      return token.allowance(avatar, sdk.circlesConfig.migrationAddress!);
    })
  );

  for (let index = 0; index < tokensToMigrate.length; index += 1) {
    const tokenBalance = tokensToMigrate[index];
    const isOwnToken = tokenBalance.tokenOwner.toLowerCase() === avatarLower;
    const amount = migrateAmounts[index];
    const allowance = allowances[index];

    if (isOwnToken) {
      if (allowance < MAX_UINT256) {
        const token = new Contract(tokenBalance.tokenAddress, V1_TOKEN_ABI, provider);
        batch.addTransaction({
          to: tokenBalance.tokenAddress,
          data: token.interface.encodeFunctionData("approve", [
            sdk.circlesConfig.migrationAddress,
            MAX_UINT256,
          ]),
          value: 0n,
        });
      }
    } else {
      if (allowance >= amount) {
        continue;
      }
      const token = new Contract(tokenBalance.tokenAddress, V1_TOKEN_ABI, provider);
      batch.addTransaction({
        to: tokenBalance.tokenAddress,
        data: token.interface.encodeFunctionData("increaseAllowance", [
          sdk.circlesConfig.migrationAddress,
          amount - allowance,
        ]),
        value: 0n,
      });
    }
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
      migrateAmounts,
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
  const metadataDigest = await createMetadataDigest(sdk, profile);
  await addSafeFallbackHandlerTransactionIfNeeded(sdk, batch);
  const wasAlreadyRegisteredOnV2AtStart = await addRegistrationTransactionsIfNeeded(
    sdk,
    batch,
    avatar,
    inviter,
    profile,
    metadataDigest
  );

  if (!options.skipBalanceMigration) {
    await addEligibleV1BalanceMigrationTransactions(sdk, batch, avatar);
  }

  addTrustTransactions(sdk, batch, trustRelations);
  if (wasAlreadyRegisteredOnV2AtStart) {
    addMetadataUpdateTransaction(sdk, batch, metadataDigest);
  }
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
