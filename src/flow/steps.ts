import { Address } from "viem";
import { Sdk } from "@circles-sdk/sdk";
import { AvatarRow } from "@circles-sdk/data";
import { Profile } from "@circles-sdk/profiles";
import { MigrationState } from "../types/migration";

type Ctx = {
    address: Address;
    sdk: Sdk;
    invitations: AvatarRow[];
    selectedInviter: `0x${string}` | null;
    draftProfile: Profile;
    profileErrors: string[];
};

type Step = {
    id: MigrationState;
    title: string;
    description?: string;
    cta: string;
    guard?: (c: Ctx) => boolean;
    onNext?: (c: Ctx) => Promise<void>;
    next?: MigrationState | ((c: Ctx) => MigrationState);
};

export const STEP_CONFIG: Record<MigrationState, Step> = {
    "not-registered": {
        id: "not-registered",
        title: "Not registered",
        description: "Register your account on Metri to get started",
        cta: "Go to Metri",
    },
    "selecting-inviter": {
        id: "selecting-inviter",
        title: "Choose an inviter",
        description: "Choose an inviter to invite you to Circles",
        cta: "Continue",
        guard: ({ selectedInviter }) => !!selectedInviter,
        next: "create-profile",
    },
    "create-profile": {
        id: "create-profile",
        title: "Create profile",
        description: "Create your new Circles profile",
        cta: "Review",
        guard: ({ profileErrors }) => profileErrors.length === 0,
        next: "execute-migration",
    },
    "ready-to-migrate": {
        id: "ready-to-migrate",
        title: "Migrate to V2",
        description: "Your v1 account is ready to be migrated to v2",
        cta: "Start migration",
        next: "selecting-inviter",
    },
    "registered-v2": {
        id: "registered-v2",
        title: "Already on V2",
        description: "You are already registered on Circles v2",
        cta: "Go to Metri",
    },
    "migrated": {
        id: "migrated",
        title: "Migration complete",
        description: "Your migration is complete",
        cta: "Go to Metri",
    },
    "execute-migration": {
        id: "execute-migration",
        title: "Execute Migration",
        cta: "Execute Migration",
        guard: ({ invitations, selectedInviter }) =>
            invitations.length > 0 && !!selectedInviter,
        onNext: async ({ sdk, address, selectedInviter, draftProfile }) => {
            const result = await sdk.migrateAvatar(address as `0x${string}`, selectedInviter || "0x0000000000000000000000000000000000000000", draftProfile);
            console.log(result);
        },
        next: "migrated",
    },
};
