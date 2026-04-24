import { describe, expect, it } from "vitest";
import { STEP_CONFIG } from "./steps";

const baseCtx = {
  address: "0x1111111111111111111111111111111111111111",
  sdk: {},
  invitationsWithProfiles: [],
  needsInviter: false,
  selectedInviter: null,
  draftProfile: {},
  profileErrors: [],
  selectedTrustRelations: [],
  needsSafeFallbackUpdate: false,
} as any;

describe("migration step transitions", () => {
  it("routes from start to Safe fallback update after funding when needed", () => {
    const next = STEP_CONFIG["ready-to-migrate"].next;

    expect(typeof next).toBe("function");
    expect((next as Function)({ ...baseCtx, needsSafeFallbackUpdate: true })).toBe("update-safe-fallback");
  });

  it("routes from start to inviter selection when fallback is valid and inviter is needed", () => {
    const next = STEP_CONFIG["ready-to-migrate"].next;

    expect((next as Function)({
      ...baseCtx,
      needsSafeFallbackUpdate: false,
      needsInviter: true,
    })).toBe("selecting-inviter");
  });

  it("routes from Safe fallback update to the normal next migration step", () => {
    const next = STEP_CONFIG["update-safe-fallback"].next;

    expect(typeof next).toBe("function");
    expect((next as Function)({ ...baseCtx, needsInviter: false })).toBe("create-profile");
    expect((next as Function)({ ...baseCtx, needsInviter: true })).toBe("selecting-inviter");
  });
});
