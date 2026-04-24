import { Sdk } from "@circles-sdk/sdk";
import { Profile } from "@circles-sdk/profiles";
import { Address, cidV0ToUint8Array } from "@circles-sdk/utils";
import { Contract, JsonRpcProvider, ZeroAddress } from "ethers";
import { getSdkChainRpcUrl } from "./rpc";

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
  avatar = avatar.toLowerCase() as Address;
  inviter = inviter.toLowerCase() as Address;

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

  const contractRunner = sdk.contractRunner as {
    sendBatchTransaction?: () => {
      addTransaction: (tx: { to: string; data: string; value: bigint }) => void;
      run: () => Promise<unknown>;
    };
  };
  if (!contractRunner.sendBatchTransaction) {
    throw new Error("Batch transaction not supported by contract runner");
  }

  const batch = contractRunner.sendBatchTransaction();

  if (avatarInfo.v1Token) {
    const provider = new JsonRpcProvider(getSdkChainRpcUrl(sdk));
    const v1Token = new Contract(avatarInfo.v1Token, [
      "function stopped() view returns (bool)",
      "function update()",
      "function stop()",
    ], provider);

    const isStopped = await v1Token.stopped();
    if (!isStopped) {
      batch.addTransaction({
        to: avatarInfo.v1Token,
        data: v1Token.interface.encodeFunctionData("update"),
        value: 0n,
      });
      batch.addTransaction({
        to: avatarInfo.v1Token,
        data: v1Token.interface.encodeFunctionData("stop"),
        value: 0n,
      });
    }
  }

  if (avatarInfo.version === 1) {
    const metadataDigest = await createMetadataDigest(sdk, profile);

    if (avatarInfo.type === "CrcV1_Signup") {
      if (inviter === ZeroAddress && !(await sdk.canSelfMigrate({ ...avatarInfo }))) {
        throw new Error(`Self registration not allowed for avatar ${avatar}`);
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

  if (trustRelations) {
    for (const trustRelation of trustRelations) {
      batch.addTransaction({
        to: sdk.circlesConfig.v2HubAddress,
        data: sdk.v2Hub.interface.encodeFunctionData("trust", [
          trustRelation,
          BigInt("79228162514264337593543950335"),
        ]),
        value: 0n,
      });
    }
  }

  await batch.run();
}
