# Perp orders have no reduce-only flag in the contracts or SDK, so a retried close flips the position
Severity: major
Area: contracts

## Steps to reproduce
1. Start flat on BTC-PERP.
2. Open a long: IOC buy for `minQuantity` (0.00013 BTC) through `placeOrderFor` (or `trader.placePerpOrder` for the signer's own account).
3. Close it: IOC sell for the same quantity.
4. Send the same close again, as a bot does when it retries after a timeout or a `TransactionOutcomeUnknownError` (an error type the SDK itself defines).
5. Read `client.getPerpPosition({ pool, marginBank, account })`.

Script: [scripts/repro/05-no-reduce-only-flip.ts](../scripts/repro/05-no-reduce-only-flip.ts).

## Expected
There is a way to send an order that can only shrink a position. The [Orders](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/orders.md) page promises one: "**Reduce-only** orders can only shrink a position, never open or flip one." With reduce-only set, the second close fills nothing or is rejected, and the account stays flat.

## Actual
The second "close" opens a **short** of 0.00013 BTC. Nothing at the protocol or SDK level can prevent this:
- `PerpPool.placeOrder` / `placeOrderFor` take `(isBid, userData, price, quantity, expireTimestampNs, orderType, selfMatchingOption, builder, builderFeeBpsTimes1k)`. `orderType` is only `0` limit, `1` FOK, `2` IOC or `3` post-only. There is no reduce-only argument or order type.
- `PlacePerpOrderParams` / `BatchOrderRequest` in the SDK have no `reduceOnly` field.
- Reduce-only exists only in the PerpStopOrderRegistry, as `intent = ReduceOnly` for TP/SL and the `ReduceOnly*` drop reasons and `ReduceOnlyBudgetExceeded` error. Normal market and limit orders can't use it.
- The app's own bundle defines `market` and `limit` with `reduceOnly: false`. Only the stop and take-profit types are `reduceOnly: true`.

Impact: every bot or API integrator closes a position by sending an opposite-side order sized to the position. Any duplicate submission opens a position in the opposite direction:
- a retry after an RPC timeout
- two strategies closing at once
- a close racing a TP/SL that fires in the same block

That new position carries full margin and liquidation exposure, and nothing warns the trader. The docs promise reduce-only, but API traders can't use it. Integrators have to build their own locking and re-read the position before every close, and that still loses to a TP/SL firing at the same moment.

Suggested fix: add reduce-only to the order request (or as an `orderType` / flag bit) at the PerpPool level, clamping to the position at match time. Expose it as `reduceOnly` in `PlacePerpOrderParams`.

## Evidence
Run on BTC-PERP (pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`), bot key placing for the linked app wallet:
```
start size = 0
open long:        0x7457db389c53f57e26768e234cc4d62dbdda8864283870f2f04eca1a1ffbc587  fill 13000 @ 84161.6
after open size = 13000
close #1:         0x078023166ff3b938b2246c3f3d1b35bbec4b7ee00e5d6c2a0cb9acc8f2dc7371  fill 13000 @ 84161.5
after close #1 size = 0
close #2 (retry): 0x06e420fa0bff73dd624ce2f086dd89d44337db9ecdc5b9a25251dddd22c12872  fill 13000 @ 84161.9
after close #2 size = -13000
RESULT: position FLIPPED to short
```
Explorer links:
- [open](https://explorer.testnet.somnia.network/tokyo/tx/0x7457db389c53f57e26768e234cc4d62dbdda8864283870f2f04eca1a1ffbc587)
- [close #1](https://explorer.testnet.somnia.network/tokyo/tx/0x078023166ff3b938b2246c3f3d1b35bbec4b7ee00e5d6c2a0cb9acc8f2dc7371)
- [close #2](https://explorer.testnet.somnia.network/tokyo/tx/0x06e420fa0bff73dd624ce2f086dd89d44337db9ecdc5b9a25251dddd22c12872)

The accidental short was then closed by [`0xae92040b6fa1f2cdc255b948072f9d6ef30f0b341989900d0c3fbd2e3037bc49`](https://explorer.testnet.somnia.network/tokyo/tx/0xae92040b6fa1f2cdc255b948072f9d6ef30f0b341989900d0c3fbd2e3037bc49).

App bundle excerpt (app.testnet.dreamdex.io, perps trade page chunk):
```
market:{...,label:"Market",placementEnabled:!0,reduceOnly:!1,...},limit:{...,label:"Limit",placementEnabled:!0,reduceOnly:!1,...}
"stop-market":{...,reduceOnly:!0,...}
```

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Network: Somnia testnet (Hideki, chain ID 50383)
- Account: 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59 (orders sent by linked operator 0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6)
