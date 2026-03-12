export type MigrationState =
  | "not-registered"
  | "registered-v2"
  | "migrated"
  | "ready-to-migrate"
  | "create-profile"
  | "enable-invitation-module"
  | "execute-migration";
