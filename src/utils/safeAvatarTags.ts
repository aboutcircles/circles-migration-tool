import { Sdk } from "@circles-sdk/sdk";
import { Address } from "viem";

export type SafeAvatarTag = "v1 human" | "v1 org" | "v2 human" | "v2 org";
type HexAddress = `0x${string}`;

type AvatarInfoLike = {
  avatar?: string;
  version?: number | null;
  type?: string | null;
  isHuman?: boolean | null;
};

export function deriveSafeAvatarTag(info: AvatarInfoLike | null | undefined): SafeAvatarTag | undefined {
  if (!info) {
    return undefined;
  }

  const version = info.version ?? null;
  const type = (info.type || "").toLowerCase();
  const isHuman = info.isHuman ?? null;

  if (version === 1 || type.includes("crcv1")) {
    if (type.includes("organization")) {
      return "v1 org";
    }
    if (type.includes("signup") || type.includes("human") || isHuman === true) {
      return "v1 human";
    }
  }

  if (version === 2 || type.includes("crcv2")) {
    if (type.includes("organization")) {
      return "v2 org";
    }
    if (isHuman === true || type.includes("human")) {
      return "v2 human";
    }
    if (isHuman === false) {
      return "v2 org";
    }
  }

  return undefined;
}

export async function fetchSafeAvatarTags(
  sdk: Sdk,
  safeAddresses: Address[]
): Promise<Record<string, SafeAvatarTag>> {
  const uniqueSafes: HexAddress[] = Array.from(
    new Set(safeAddresses.map((safe) => safe.toLowerCase() as HexAddress))
  );

  if (uniqueSafes.length === 0) {
    return {};
  }

  const tags: Record<string, SafeAvatarTag> = {};

  try {
    const infos = await sdk.data.getAvatarInfoBatch(uniqueSafes);
    for (const info of infos as AvatarInfoLike[]) {
      if (!info.avatar) {
        continue;
      }

      const tag = deriveSafeAvatarTag(info);
      if (tag) {
        tags[info.avatar.toLowerCase()] = tag;
      }
    }

    return tags;
  } catch (batchError) {
    console.warn("Failed to fetch safe avatar tags in batch, falling back to single calls:", batchError);
  }

  const infoResults = await Promise.allSettled(uniqueSafes.map((safe) => sdk.data.getAvatarInfo(safe)));
  for (const result of infoResults) {
    if (result.status !== "fulfilled") {
      continue;
    }

    const info = result.value as AvatarInfoLike | null;
    if (!info?.avatar) {
      continue;
    }

    const tag = deriveSafeAvatarTag(info);
    if (tag) {
      tags[info.avatar.toLowerCase()] = tag;
    }
  }

  return tags;
}
