import "dotenv/config";
import { resolve } from "node:path";
import { createApp } from "./app.js";
import { CirclesMigrationVerificationData } from "./circlesData.js";
import { loadServerConfig } from "./config.js";
import { FileFundingLedger } from "./fundingLedger.js";
import { MigrationFundingService } from "./migrationFunding.js";
import { ViemNativeFunder } from "./nativeFunder.js";

const config = loadServerConfig();
const migrationFundingService = new MigrationFundingService({
  data: new CirclesMigrationVerificationData(config.circlesRpcUrl),
  ledger: new FileFundingLedger(config.fundingLedgerPath),
  funder: new ViemNativeFunder(config.funderPrivateKey, config.backendRpcUrl),
  fundingAmountWei: config.fundingAmountWei,
});

const app = createApp({
  migrationFundingService,
  staticDir: resolve(process.cwd(), "dist"),
});

app.listen(config.port, () => {
  console.log(`Migration backend listening on port ${config.port}`);
});
