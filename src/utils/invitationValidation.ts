import { Sdk } from "@circles-sdk/sdk";
import { Address } from "viem";
import { JsonRpcProvider } from "ethers";
import { getSdkChainRpcUrl } from "./rpc";

const DUMMY_METADATA_DIGEST = `0x${"11".repeat(32)}` as `0x${string}`;

export type InvitationValidationResult = {
  isValid: boolean;
  reason?: string;
};

function getReadableValidationError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      reason?: unknown;
      shortMessage?: unknown;
      message?: unknown;
      info?: { error?: { message?: unknown } };
    };

    if (typeof maybeError.reason === "string") {
      return maybeError.reason;
    }

    if (typeof maybeError.shortMessage === "string") {
      return maybeError.shortMessage;
    }

    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }

    if (typeof maybeError.info?.error?.message === "string") {
      return maybeError.info.error.message;
    }
  }

  return "Invitation check could not be completed due to an unknown RPC error.";
}

export async function validateHumanRegistrationWithInviter(
  sdk: Sdk,
  avatarAddress: Address,
  inviterAddress: Address
): Promise<InvitationValidationResult> {
  if (!sdk.v2Hub || !sdk.circlesConfig.v2HubAddress) {
    return {
      isValid: false,
      reason:
        "Invitation validation is unavailable right now (missing v2 hub configuration). Please try again shortly.",
    };
  }

  try {
    const provider = new JsonRpcProvider(getSdkChainRpcUrl(sdk));
    const data = sdk.v2Hub.interface.encodeFunctionData("registerHuman", [
      inviterAddress,
      DUMMY_METADATA_DIGEST,
    ]);

    await provider.call({
      from: avatarAddress,
      to: sdk.circlesConfig.v2HubAddress,
      data,
    });

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      reason: `This invite cannot be used for registration right now: ${getReadableValidationError(error)}`,
    };
  }
}

export async function canRegisterHumanWithInviter(
  sdk: Sdk,
  avatarAddress: Address,
  inviterAddress: Address
): Promise<boolean> {
  const result = await validateHumanRegistrationWithInviter(
    sdk,
    avatarAddress,
    inviterAddress
  );

  return result.isValid;
}
