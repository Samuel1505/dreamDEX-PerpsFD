# `trader.placePerpOrder` broadcasts orders that can't succeed (off-tick, below minimum, no margin) and reports a misleading allowance error
Severity: normal
Area: SDK

## Steps to reproduce
1. Create `SomniaMarkets` with a private key whose perp account has no margin (any fresh key with some STT for gas).
2. Call `markets.trader.placePerpOrder` on BTC-PERP three times:
   - price 1 wei off the tick grid (`tickSize` is on the market row)
   - quantity one lot below `minQuantity` (also on the market row)
   - a valid, tick- and lot-aligned resting buy for `minQuantity` 10% under mark
3. Compare the key's nonce before and after, and look the transactions up on the explorer.

Script: [scripts/probe-sdk-errors.ts](../scripts/probe-sdk-errors.ts). Transaction listing: [scripts/lib/recent-txs.ts](../scripts/lib/recent-txs.ts).

## Expected
- The first two orders fail inside the SDK before anything is sent. The market row the SDK just returned has `tickSize`, `lotSize` and `minQuantity`, and the bot kit validates exactly these client-side (`assertPriceMultipleOfTick`, `assertQtyMultipleOfLot`, `assertQtyAboveMin`). At minimum, a free `eth_call` preflight should catch them.
- The third order is also caught before broadcast. `client.getMaxPerpOrderSize` already knows this account can place nothing. If it does get sent, the error should name the real cause: no collateral in the MarginBank.
- The developer docs say an owner's own order with too little collateral fails with `ERC20: transfer amount exceeds balance`.

## Actual
All three orders were **broadcast and mined as reverted transactions**, each costing gas. The SDK raised `ContractRevertError` only after mining, by replaying the receipt. `placePerpOrder` (`dist/orders.js:1634`) just calls `w.executeOrder(perpOrderCall(w, p))`: no validation and no simulation, and `TraderConfig` has no option to turn either on.

| Attempt | SDK error | Tx (reverted) | Gas used | Fee (STT) |
|---|---|---|---|---|
| off-tick price | `InvalidPrice(76086700000000000000001, 100000000000000000)` | `0x2acfada9…c51` | 71,132 | 0.000427 |
| qty below min | `QuantityBelowMinimum(12000, 13000)` | `0x2fbda088…704` | 87,372 | 0.000524 |
| valid order, empty margin | `Error(ERC20: insufficient allowance)` | `0xb399255e…6d7` | 394,535 | 0.002367 |

The third error is misleading. The account's MarginBank balance is zero, and the pool falls back to pulling USDso from the wallet, which has neither an allowance nor a balance. A developer reading "insufficient allowance" will approve USDso and try again, which still fails because the wallet holds none. The fix is to deposit margin. The message also differs from what the docs promise (`transfer amount exceeds balance`).

Impact: bots commonly compute prices with floating-point math and get off-tick values. With this SDK, every such bug is a mined, paid, reverted transaction plus a confirmation wait, not an instant local error. The first order on a new account, before margin is deposited, fails with a message that points the wrong way.

Suggested fix: validate tick, lot and minimum from the cached market row, and add an opt-in or default `eth_call` preflight before signing. When the account has no margin, map the allowance revert to an SDK error such as "no perp margin: deposit with `trader.depositMargin`". Also correct the error text in the docs.

## Evidence
SDK output:
```
off-tick price => THROW ContractRevertError | placeOrder reverted: InvalidPrice(76086700000000000000001, 100000000000000000)
below min qty  => THROW ContractRevertError | placeOrder reverted: QuantityBelowMinimum(12000, 13000)
valid order, empty account => THROW ContractRevertError | placeOrder reverted: Error(ERC20: insufficient allowance)
transactions sent by these attempts: 3
```
On-chain (sender `0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6`, to BTC-PERP pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`), all `status: reverted`:
- [`0x2acfada9861ce319a510532d7ddd18d0ec34f223193334040318a9694aac1c51`](https://explorer.testnet.somnia.network/tokyo/tx/0x2acfada9861ce319a510532d7ddd18d0ec34f223193334040318a9694aac1c51), block 29425885
- [`0x2fbda088a82935917a5588927a5dc3da6558208a75af3055e6e48690ee89b704`](https://explorer.testnet.somnia.network/tokyo/tx/0x2fbda088a82935917a5588927a5dc3da6558208a75af3055e6e48690ee89b704), block 29425896
- [`0xb399255e640599af1611f6516a2f83243fa55e4dafe65f199fe574644da1f6d7`](https://explorer.testnet.somnia.network/tokyo/tx/0xb399255e640599af1611f6516a2f83243fa55e4dafe65f199fe574644da1f6d7), block 29425906

Before sending, `getMaxPerpOrderSize` for this account returns `placeable: false, maxQuantity: 0, limitedBy: "collateral"` on every market (see [scripts/status.ts](../scripts/status.ts) run on a key without margin).

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Network: Somnia testnet (Hideki, chain ID 50383)
- Wallet: 0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6 (own perp account, no margin)
