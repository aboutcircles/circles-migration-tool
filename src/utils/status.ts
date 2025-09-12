import { MigrationState, MigrationStatusConfig } from "../types/migration";

export const getStatuses = (pushState: (state: MigrationState) => void): MigrationStatusConfig => ({
    "not-registered": {
        title: "Not Registered",
        description: "Your v1 account has not been registered on Circles",
        actionTitle: "Go to Metri",
        action: () => {
            window.open("https://app.metri.xyz/", "_blank");
        },
    },
    "registered-v2": {
        title: "Registered on v2",
        description: "Your v1 account has been registered on Circles v2",
        actionTitle: "Go to Metri",
        action: () => {
            window.open("https://app.metri.xyz/", "_blank");
        },
    },
    "migrated": {
        title: "Migrated",
        description: "Your v1 account has been migrated to v2",
        actionTitle: "Go to Metri",
        action: () => {
            window.open("https://app.metri.xyz/", "_blank");
        },
    },
    "ready-to-migrate": {
        title: "Ready to migrate",
        description: "Your v1 account is ready to be migrated to v2",
        actionTitle: "Start migration",
        action: () => pushState("selecting-inviter"),
    },
    "selecting-inviter": {
        title: "Select Inviter",
        description: "Select who will invite you to migrate to v2",
        actionTitle: "Select Inviter",
        action: () => pushState("create-profile"),
    },
    "create-profile": {
        title: "Create Profile",
        description: "Create your new profile",
        actionTitle: "Create Profile",
        action: () => {},
    },
});