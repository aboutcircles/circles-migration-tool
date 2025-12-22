import { Address } from "viem";
import { Sdk } from "@circles-sdk/sdk";
import { AvatarWithProfile } from "../context/CirclesContext";
import { Profile } from "@circles-sdk/profiles";
import { MigrationState } from "../types/migration";

type Ctx = {
    address: Address;
    sdk: Sdk;
    invitationsWithProfiles: AvatarWithProfile[];
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
    href?: string;
};

const GNOSIS_URL = "https://app.gnosis.io/welcome/import";

export const STEP_CONFIG: Record<MigrationState, Step> = {
    "not-registered": {
        id: "not-registered",
        title: "Not Registered",
        description: "Create your account on Gnosis to get started",
        cta: "Visit Gnosis app",
        href: GNOSIS_URL,
    },
    "selecting-inviter": {
        id: "selecting-inviter",
        title: "Choose an Inviter",
        description: "Choose an inviter to invite you to Circles",
        cta: "Continue",
        guard: ({ selectedInviter }) => !!selectedInviter,
        next: "create-profile",
    },
    "create-profile": {
        id: "create-profile",
        title: "Create Profile",
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
        cta: "Visit Gnosis app",
        href: GNOSIS_URL,
    },
    "migrated": {
        id: "migrated",
        title: "Migration Complete",
        description: "Your migration is complete",
        cta: "Visit Gnosis app",
        href: GNOSIS_URL,
    },
    "execute-migration": {
        id: "execute-migration",
        title: "Complete Migration",
        description: "Review your profile and complete the migration",
        cta: "Complete profile migration",
        guard: ({ invitationsWithProfiles, selectedInviter }) =>
            invitationsWithProfiles.length > 0 && !!selectedInviter,
        onNext: async ({ sdk, address, selectedInviter, draftProfile }) => {
            try {
                await sdk.migrateAvatar(selectedInviter || "0x0000000000000000000000000000000000000000", address as `0x${string}`, draftProfile);
            } catch (error) {
                console.error(error);
                throw error;
            }
        },
        next: "migrated",
    },
};
