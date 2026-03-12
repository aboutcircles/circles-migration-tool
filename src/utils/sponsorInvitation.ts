import { Address } from "viem";

type SponsorInvitationResponse = {
  inviter: Address;
  created: boolean;
  registered: boolean;
  reused?: boolean;
  txHash?: `0x${string}`;
};

export async function createSponsoredInvite(
  invitee: Address
): Promise<SponsorInvitationResponse> {
  const response = await fetch("/api/sponsor-invitations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invitee }),
  });

  const payload = await response.json() as { error?: string } & Partial<SponsorInvitationResponse>;
  if (!response.ok || !payload.inviter) {
    throw new Error(payload.error ?? "Failed to create sponsored invite.");
  }

  return payload as SponsorInvitationResponse;
}
