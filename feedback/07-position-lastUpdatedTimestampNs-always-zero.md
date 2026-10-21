# `Position.lastUpdatedTimestampNs` is always 0: checked across 4,908 open positions in all 21 markets
Severity: normal
Area: contracts

## Steps to reproduce
1. Open any position. Here: 0.00013 BTC long, tx `0x45a114b3…bfd7`.
2. Read it with `client.getPerpPosition({ pool, marginBank, account })`, which calls `MarginBank.getPosition(account, pool)`.
3. Read every holder of every perp market with `MarginBank.getSideHolderStatesPaginated(pool, isLong, 0, 200)` and count how many positions have a non-zero `lastUpdatedTimestampNs`.

Script: [scripts/probe-ts.ts](../scripts/probe-ts.ts).

## Expected
`lastUpdatedTimestampNs` holds the time of the position's last change. The SDK documents it as "Last position update (nanoseconds)" on `PerpPosition` (`dist/perp/state.d.ts`), and the field is in the contract's `Position` struct returned by `getPosition` and `getSideHolderStatesPaginated`.

## Actual
It's `0` for every position:
- my position, read seconds after it opened
- **all 4,908 positions** returned across both sides of all 21 perp markets at block 29412831

Decoding isn't the cause: the SDK ABI and the struct line up (`int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs`), and `size`, `avgEntryPrice` and `entryFundingIndex` all come back correct. The contract never writes the field.

Impact: integrators who use this field for staleness checks, "position age", or ordering positions by last activity get 0 (1970) for everything. They have to fall back to the indexer's `updatedAt`, which `listPerpPositions` returns correctly. Either populate the field or mark it as unused/deprecated in the struct and in the SDK docs.

## Evidence
`getPerpPosition` right after the open:
```json
{ "size": "13000", "avgEntryPrice": "84039900000000000000000",
  "entryFundingIndex": "2387177862027899440884492578538644125000",
  "lastUpdatedTimestampNs": "0" }
```
The same position in the indexer (`listPerpPositions`): `"updatedAt": "1792593128", "updatedAtBlock": 29411708`.

Market-wide check (`scripts/probe-ts.ts`):
```
BTC longs sample: [
  { acct: '0xd167376D0431131b4C2EC25e3581c6AF734794F3', size: '26000',   ts: '0' },
  { acct: '0xbc28A1b06eaF0513CD0B04D7345Ac605ec8b4bA3', size: '5627000', ts: '0' },
  { acct: '0xb6E8369a7270C8C12c912Bb50fae0550D0fF5b64', size: '19000',   ts: '0' } ] listLength 5451
{ positionsChecked: 4908, nonZeroTimestamps: 0, block: '29412831' }
```
MarginBank: `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`.

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Network: Somnia testnet (Hideki, chain ID 50383)
- Account: 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59
