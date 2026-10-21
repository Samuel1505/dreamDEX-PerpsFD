# Paper USDso docs are wrong twice: 6 markets aren't blocked, and leverage can be changed
Severity: normal
Area: docs

## Steps to reproduce
1. Read [Perps on Testnet → Markets](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/README.md#markets). The **Paper USDso** column says **No** for 1000PEPE-PERP, LIT-PERP, PUMP-PERP, VVV-PERP, ZEC-PERP and ZRO-PERP.
2. [Margin & Liquidations → Paper USDso](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/margin-and-liquidations.md#paper-usdso) says the same: "You can open or increase positions only in the markets marked **Yes** … The six newest markets are not on that list."
3. The [developer page](https://app.testnet.dreamdex.io/docs/developers/perps-testnet/README.md#common-pitfalls) repeats it: "Increasing a position in a market outside the credit's allowlist reverts, and `getMaxPerpOrderSize` reports it as `limitedBy: "voucherBlocked"`."
4. Take an account that has claimed the voucher and holds only the voucher (`getPerpVoucher` → `claimed: true`, `floor: 1000e18`). For every perp market:
   - call `client.getPerpLeverage({ pool, marginBank, account })` and read `voucherMarketAllowed`
   - call `client.getMaxPerpOrderSize({ pool, marginBank, account, isBid: true, price })`
   - simulate a minimum-size resting buy (10% under mark) with `placeOrderFor`
5. Place a real minimum-size buy in ZRO-PERP, one of the "No" markets.
6. The same Paper USDso section says: "**Your leverage setting can't be changed** while it remains." From the voucher account, simulate `MarginBank.setMaxLeverage(btcPool, leverageX)` for 1, 5, 10 and 20.

Script for step 6: [scripts/probe-owner-sims.ts](../scripts/probe-owner-sims.ts). Script for steps 4–5: [scripts/repro/02-voucher-allowlist.ts](../scripts/repro/02-voucher-allowlist.ts) and [scripts/repro/02b-voucher-place-blocked-market.ts](../scripts/repro/02b-voucher-place-blocked-market.ts).

## Expected
Following the docs: in the six "No" markets, `voucherMarketAllowed` is `false`, `getMaxPerpOrderSize` returns `limitedBy: "voucherBlocked"`, and placing an order reverts with `VoucherMarketNotAllowed`.

## Actual
**Allowlist (steps 1–5):**
In all 21 markets, the six "No" markets included, `voucherMarketAllowed` is `true`, `getMaxPerpOrderSize` returns `placeable: true, limitedBy: "collateral"`, and the simulated order succeeds. A real minimum-size buy in ZRO-PERP from the voucher account was accepted and rested on the book.

The SDK and the contracts agree with each other. Only the docs are out of date: they turn traders away from 6 of 21 markets, and they tell developers to expect a `voucherBlocked` result and a revert that don't happen on testnet right now.

**Leverage (step 6):** `setMaxLeverage` succeeds for 1x, 5x, 10x and 20x on the voucher account (`creditFloor` = 1000 USDso). Only out-of-range values (0 and 21) revert, with `InvalidLeverage()`, the same as for any account. The SDK docs describe this as intended: on `PerpLeverage.voucherLeverageCapX`, "a STRICTER user setting still wins". So the contract lets a voucher holder change their leverage setting, and the dreamDEX docs say they can't.

The withdrawal rule in the same section is correct: `withdraw(withdrawable)` succeeds, and `withdraw(withdrawable + 1)` reverts `WithdrawalBelowCreditFloor()`.

Suggested fix: update the Paper USDso column, the "six newest markets" sentence, and the leverage sentence (for example: "You can lower your leverage setting; the credit caps it at `voucherLeverageCapX`"). If the allowlist is meant to change over time, point readers to `getPerpLeverage().voucherMarketAllowed` instead of a static table.

## Evidence
Voucher account state at the time of the test:
```
getPerpVoucher → { "claimed": true, "floor": "1000000000000000000000", "expiresAt": "1793742573" }
```

Output of `scripts/repro/02-voucher-allowlist.ts` (block 29398299), rows for the markets the docs mark "No":
```
│ market     │ max.placeable │ max.limitedBy │ voucherMarketAllowed │ sim placeOrderFor(min qty) │
│ 'ZRO'      │ true          │ 'collateral'  │ true                 │ 'ok success=true'          │
│ 'LIT'      │ true          │ 'collateral'  │ true                 │ 'ok success=true'          │
│ 'VVV'      │ true          │ 'collateral'  │ true                 │ 'ok success=true'          │
│ '1000PEPE' │ true          │ 'collateral'  │ true                 │ 'ok success=true'          │
│ 'PUMP'     │ true          │ 'collateral'  │ true                 │ 'ok success=true'          │
│ 'ZEC'      │ true          │ 'collateral'  │ true                 │ 'ok success=true'          │
```
(The other 15 markets give the same result.)

Real order in ZRO-PERP (pool `0x2a1822b02039ddf0e293f3f7243673fc03eaf16c`), buy 5.1 ZRO at 1.8146 USDso (10% under mark), placed through `placeOrderFor` by the linked bot key:
- Placed: [`0xc57abbdcd64f2c4c8e6c32e5ccbb828774179c3f2b8522203dd1a546c93da213`](https://explorer.testnet.somnia.network/tokyo/tx/0xc57abbdcd64f2c4c8e6c32e5ccbb828774179c3f2b8522203dd1a546c93da213), status success, orderId `0xa000000000005479d`
- Cancelled: [`0xf483a4ada84f9c2f4fd5fcf9e7f09779b4022bee45b40228afee51872450cbf5`](https://explorer.testnet.somnia.network/tokyo/tx/0xf483a4ada84f9c2f4fd5fcf9e7f09779b4022bee45b40228afee51872450cbf5)

Leverage simulation (`eth_call` from the voucher account to MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`):
```
equity 1000030030000000000000 withdrawable 30030000000000000
withdraw(withdrawable=30030000000000000) ok 0x
withdraw(withdrawable+1=30030000000000001) REVERT WithdrawalBelowCreditFloor()
setMaxLeverage(BTC, 1) ok 0x
setMaxLeverage(BTC, 5) ok 0x
setMaxLeverage(BTC, 10) ok 0x
setMaxLeverage(BTC, 20) ok 0x
setMaxLeverage(BTC, 21) REVERT InvalidLeverage()
setMaxLeverage(BTC, 0) REVERT InvalidLeverage()
```

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Network: Somnia testnet (Hideki, chain ID 50383)
- Account (voucher holder): 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59
- Operator (linked bot key): 0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6
