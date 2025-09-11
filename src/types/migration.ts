
export type MigrationState = 
  | "not-registered"
  | "registered-v2"
  | "migrated"
  | "ready-to-migrate" 
  | "selecting-inviter" 
  | "migrating";   


export interface MigrationStatus {
  title: string;
  description: string;
  actionTitle: string;
  action: () => void;
}

export type MigrationStatusConfig = Record<MigrationState, MigrationStatus>;
