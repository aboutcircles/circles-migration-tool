import { Address } from "viem";
import { Sdk } from "@circles-sdk/sdk";
import { Profile } from "@circles-sdk/profiles";
import { MigrationState } from "../types/migration";
import { validateHumanRegistrationWithInviter } from "../utils/invitationValidation";
import {
    hasAnyMigratableV1Balances,
    isNoBalancesRpcError,
    migrate,
    migrateAvatarWithoutBalances,
} from "../utils/migrationFallback";
import { createSponsoredInvite } from "../utils/sponsorInvitation";
import { enableInvitationModule } from "../utils/invitationModule";

type Ctx = {
    address: Address;
    sdk: Sdk;
    needsInviter: boolean;
    requiresInvitationModuleEnablement: boolean;
    invitationModuleAddress?: Address;
    draftProfile: Profile;
    profileErrors: string[];
    selectedTrustRelations: Address[];
    onInvitationModuleEnabled: () => void;
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
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const STEP_CONFIG: Record<MigrationState, Step> = {
    "not-registered": {
        id: "not-registered",
        title: "Not Registered",
        description: "Create your account on Gnosis to get started",
        cta: "Visit Gnosis app",
        href: GNOSIS_URL,
    },
    "create-profile": {
        id: "create-profile",
        title: "Create Profile",
        description: "Create your new Circles profile",
        cta: "Review",
        guard: ({ profileErrors }) => profileErrors.length === 0,
        next: (ctx) =>
            ctx.requiresInvitationModuleEnablement
                ? "enable-invitation-module"
                : "execute-migration",
    },
    "ready-to-migrate": {
        id: "ready-to-migrate",
        title: "Migrate to V2",
        description: "Your v1 account is ready to be migrated to v2",
        cta: "Start migration",
        next: "create-profile",
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
    "enable-invitation-module": {
        id: "enable-invitation-module",
        title: "Enable Invitation Module",
        description: "Enable the invitation module on your Safe to receive a sponsored invite",
        cta: "Enable invitation module",
        onNext: async ({
            sdk,
            invitationModuleAddress,
            onInvitationModuleEnabled,
        }) => {
            if (!invitationModuleAddress) {
                throw new Error("Invitation module address is not configured for this network.");
            }

            await enableInvitationModule(sdk, invitationModuleAddress);
            onInvitationModuleEnabled();
        },
        next: "execute-migration",
    },
    "execute-migration": {
        id: "execute-migration",
        title: "Complete Migration",
        description: "Review your profile and complete the migration",
        cta: "Complete profile migration",
        guard: ({ draftProfile }) => {
            return Boolean(draftProfile.name && draftProfile.name.trim().length > 0);
        },
        onNext: async ({
            sdk,
            address,
            needsInviter,
            draftProfile,
            selectedTrustRelations,
        }) => {
            if (!draftProfile.name || draftProfile.name.trim().length === 0) {
                throw new Error("Profile name is required. Please go back and fill in your profile.");
            }
            try {
                let inviter: `0x${string}`;
                let isAlreadyRegisteredAfterInvite = false;
                if (needsInviter) {
                    const sponsoredInvite = await createSponsoredInvite(address as `0x${string}`);
                    inviter = sponsoredInvite.inviter as `0x${string}`;
                    isAlreadyRegisteredAfterInvite = sponsoredInvite.registered;
                } else {
                    inviter = ZERO_ADDRESS;
                }

                if (needsInviter && inviter.toLowerCase() !== address.toLowerCase() && !isAlreadyRegisteredAfterInvite) {
                    const validationResult = await validateHumanRegistrationWithInviter(
                        sdk,
                        address,
                        inviter as Address,
                    );

                    if (!validationResult.isValid) {
                        throw new Error(
                            validationResult.reason ?? "Selected inviter is not currently valid on-chain. Please choose another inviter or request a fresh invite."
                        );
                    }
                }

                try {
                    await migrate(
                        sdk,
                        inviter,
                        address as `0x${string}`,
                        draftProfile,
                        selectedTrustRelations.length > 0
                            ? selectedTrustRelations as `0x${string}`[]
                            : undefined
                    );
                } catch (error) {
                    if (!isNoBalancesRpcError(error)) {
                        throw error;
                    }

                    const hasMigratableBalances = await hasAnyMigratableV1Balances(
                        sdk,
                        address as `0x${string}`
                    );
                    if (hasMigratableBalances) {
                        throw new Error(
                            "Migration could not verify your v1 balances due to an RPC issue. Please retry so balances can be migrated safely."
                        );
                    }

                    await migrateAvatarWithoutBalances(
                        sdk,
                        inviter,
                        address as `0x${string}`,
                        draftProfile,
                        selectedTrustRelations.length > 0
                            ? selectedTrustRelations as `0x${string}`[]
                            : undefined
                    );
                }
            } catch (error) {
                console.error(error);
                throw error;
            }
        },
        next: "migrated",
    },
};
