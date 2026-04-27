import { describe, expect, it } from "vitest";
import {
  isValidSafeFallbackHandler,
  SAFE_FALLBACK_HANDLER_V1_3_0_L2,
  SAFE_FALLBACK_HANDLER_V1_4_1,
} from "./safeFallbackHandler";

describe("Safe fallback handler validation", () => {
  it("accepts known Safe fallback handlers", () => {
    expect(isValidSafeFallbackHandler(SAFE_FALLBACK_HANDLER_V1_3_0_L2)).toBe(true);
    expect(isValidSafeFallbackHandler(SAFE_FALLBACK_HANDLER_V1_4_1)).toBe(true);
    expect(isValidSafeFallbackHandler(SAFE_FALLBACK_HANDLER_V1_4_1.toUpperCase())).toBe(true);
  });

  it("rejects missing or unknown fallback handlers", () => {
    expect(isValidSafeFallbackHandler(undefined)).toBe(false);
    expect(isValidSafeFallbackHandler("0x0000000000000000000000000000000000000000")).toBe(false);
  });
});
