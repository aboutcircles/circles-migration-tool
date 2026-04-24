# Circles Migration Tool

A web application that helps Circles v1 users migrate their avatars to Circles v2 on Gnosis Chain.

## What it does

This tool guides users through a 4-step migration process:

1. **Start** - Connect your wallet and verify your v1 Circles account
2. **Choose Inviter** - Select someone to invite you to Circles v2
3. **Create Profile** - Set up your new profile (name, description, avatar)
4. **Execute Migration** - Complete the migration to v2

## Development

```bash
# Install dependencies
pnpm install

# Start backend and frontend development servers
pnpm run dev

# Build for production
pnpm run build

# Run the production server after building
pnpm run start
```

## Backend funding

The migration backend funds verified v1 human and organization Safe owners with `0.01` xDAI so they can pay their own migration gas.
Set these server-only environment variables before running the backend:

```bash
BACKEND_FUNDER_PRIVATE_KEY=...
BACKEND_RPC_URL=https://rpc.gnosischain.com
BACKEND_CIRCLES_RPC_URL=https://rpc.aboutcircles.com
FUNDING_AMOUNT_XDAI=0.01
FUNDING_LEDGER_PATH=.data/funding-ledger.json
PORT=8787
```

Do not prefix the backend private key with `VITE_`; only `VITE_` variables are exposed to the browser by Vite.
The backend loads these values from `.env` through `dotenv` during local development and production startup.
For compatibility with older local env files, `SPONSOR_PRIVATE_KEY` is accepted as a fallback when `BACKEND_FUNDER_PRIVATE_KEY` is empty.

## Support

Need help with migration? Join the [Circles Discord](https://discord.com/invite/aboutcircles) for support.
