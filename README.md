# Jetton Balance Viewer

Read-only TON testnet app for resolving an owner's jetton wallet and reading its balance through TON Center get methods.

## Framework

Vanilla Vite + TypeScript. No UI framework or wallet SDK. Browser `fetch` calls TON Center directly.

## Folder structure

```text
.
├── index.html
├── src/
│   ├── main.ts         UI, form state, result rendering
│   ├── style.css       Responsive visual system
│   └── toncenter.ts    TON Center request and response helpers
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .npmrc
```

## Data source

Live requests use the TON testnet endpoint:

`https://testnet.toncenter.com/api/v2`

The app calls `runGetMethodStd` twice:

1. `get_wallet_address` on jetton master with owner address slice.
2. `get_wallet_data` on returned jetton wallet.

Enter raw TON addresses in `0:<64 hexadecimal characters>` format. Jetton decimals and symbol are not available from the wallet data call, so viewer displays raw balance as 9-decimal `JETTON` units.

## Run

```bash
pnpm install
pnpm dev
```

Open Vite local URL. Production check:

```bash
pnpm build
pnpm preview
```

No wallet connection or private key required.
