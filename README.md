# Circles Migration Tool

A web application that helps Circles v1 users migrate their avatars to Circles v2 on Gnosis Chain.

## What it does

This tool guides users through the migration process:

1. **Connect** - Connect your wallet or import your Circles Garden key phrase
2. **Create Profile** - Set up your new v2 profile (name, description, avatar)
3. **Migrate** - Complete the on-chain migration to v2

All user transactions are gasless (sponsored via Gelato relay). Users who are not eligible for self-migration receive an automatic invitation as part of the migration flow.

## Development

```bash
# Install dependencies
pnpm install

# Start the backend (terminal 1)
pnpm run dev:server

# Start the frontend (terminal 2)
pnpm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8787`. The Vite dev server proxies `/api` requests to the backend automatically.

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
# Required
SPONSOR_SAFE_ADDRESS=0x...   # Safe that sponsors invitations
SPONSOR_PRIVATE_KEY=0x...    # Signer key for the sponsor Safe
GELATO_RELAY_API_KEY=...     # Gelato relay API key for gasless transactions

# Optional (defaults to https://rpc.circlesubi.network)
# CIRCLES_RPC_URL=https://rpc.circlesubi.network
```

## Production

```bash
pnpm run build
pnpm start
```

The server serves the built frontend from `dist/` and exposes the API endpoints on the same origin. No additional proxy or base URL configuration is needed.

## Support

Need help with migration? Join the [Circles Discord](https://discord.com/invite/aboutcircles) for support.
