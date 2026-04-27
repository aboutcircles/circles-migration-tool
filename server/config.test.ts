import { describe, expect, it } from "vitest";
import { loadServerConfig } from "./config.js";

const PRIVATE_KEY = `0x${"a".repeat(64)}`;

describe("loadServerConfig", () => {
  it("loads the preferred backend funder private key", () => {
    const config = loadServerConfig({
      BACKEND_FUNDER_PRIVATE_KEY: PRIVATE_KEY,
      BACKEND_RPC_URL: "https://rpc.gnosischain.com",
    });

    expect(config.funderPrivateKey).toBe(PRIVATE_KEY);
  });

  it("falls back to the legacy sponsor private key", () => {
    const config = loadServerConfig({
      SPONSOR_PRIVATE_KEY: PRIVATE_KEY,
      BACKEND_RPC_URL: "https://rpc.gnosischain.com",
    });

    expect(config.funderPrivateKey).toBe(PRIVATE_KEY);
  });
});
