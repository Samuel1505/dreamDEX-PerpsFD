# Perps contract errors are missing from the dreamDEX docs: the "full list" link goes to spot-only tables
Severity: major
Area: docs

## Steps to reproduce
1. Open [Perps on Testnet for Developers](https://app.testnet.dreamdex.io/docs/developers/perps-testnet/README.md). Under "An IOC that fills nothing reverts" it says: "The full list of order errors is on the [Errors](../contracts/errors.md#order-rejection) page."
2. Follow the link. The Errors page has sections only for **SpotPool** and the **SpotStopOrderRegistry** (plus HTTP preflight). It has no section for PerpPool, MarginBank, LiquidationEngine, the PerpStopOrderRegistry or the VoucherDistributor.
3. Run [scripts/repro/04-perp-errors-undocumented.ts](../scripts/repro/04-perp-errors-undocumented.ts). It downloads the complete dreamDEX docs (`/llms-full.txt`) and checks every error in the SDK's own `contractErrorsAbi` against them.
4. Separately, trigger a common perps failure, for example creating a TP/SL before the owner has approved the stop registry. It reverts with `0x28e0a7ba`. Search the dreamDEX docs for that selector or its name.

## Expected
The perps developer docs list every revert a perps integrator can hit, with selector, meaning and fix, the way the Errors page already does for SpotPool. That covers at least the order, margin, voucher, stop-registry and oracle/mark errors.

## Actual
- 140 of the 150 perp-related contract errors in the SDK's error ABI appear nowhere in the dreamDEX docs. Across all errors it's 446 of 538.
- The only perp errors documented are `InsufficientCollateral`, `MaxPositionSizeExceeded` and `IsolatedMarketBlocked`, each mentioned in passing on the developer page.
- Undocumented errors include the ones a perps trader or bot hits most:

| Error | Selector | When you hit it |
|---|---|---|
| `InsufficientMarginForOrder` | `0x7ea61260` | order fails the margin check |
| `MarkPriceUnavailable` | `0x5b2ee6f6` | mark is stale; every order in the market fails |
| `OraclePriceStale` | `0x08b9f95b` | index oracle stale |
| `CircuitBreakerTriggered` | `0x2a958098` | price moved past the circuit band |
| `FillPriceOutsideBand` | `0xec4b288c` | fill too far from mark |
| `OpenInterestCapExceeded` | `0xd8ca61d6` | market-wide OI cap (the docs mention the cap but not this error) |
| `InsufficientMarginAfterWithdrawal` | `0x30c29a70` | withdrawing from the Perps account |
| `VoucherMarketNotAllowed` / `VoucherLeverageCapNotSet` | `0x649b887d` / `0x6485347d` | paper USDso rules |
| `MarketRestricted` | `0x819c6704` | market is close-only |
| `RegistryNotApprovedByOwner` | `0x28e0a7ba` | creating a TP/SL before approving the stop registry |
| `ReduceOnlyBudgetExceeded` | `0x4dd4646a` | reduce-only stop larger than the position |
| `InvalidLeverage` | `0x7fd13972` | `setLeverage` |

The [Somnia Markets SDK docs](https://prd.smk.somnia.host/llms.txt) do mention most of these names. But the dreamDEX perps page, which the bounty points developers to, sends them to a spot-only table. Someone decoding a perps revert with `cast 4byte` or the Errors page finds nothing.

A related problem on the same Errors page: it says "A bare `0x` revert with no selector is an out-of-gas or a low-level `call` failure." On a PerpPool, `placeOrderFor` with an out-of-range `orderType` (4 or 255) also reverts with no data, even with a 10M gas limit. A developer following the docs would keep raising gas.

## Evidence
Output of `scripts/repro/04-perp-errors-undocumented.ts`:
```
docs size: 436597 chars
SDK contract errors: 538, absent from dreamDEX docs: 446
perp-related errors: 150, absent from dreamDEX docs: 140
│ 'InsufficientMarginForOrder'        │ '0x7ea61260' │ false │
│ 'MarkPriceUnavailable'              │ '0x5b2ee6f6' │ false │
│ 'RegistryNotApprovedByOwner'        │ '0x28e0a7ba' │ false │
│ ...                                                         │
│ 'InsufficientCollateral'            │ '0x3a23d825' │ true  │
│ 'MaxPositionSizeExceeded'           │ '0x714b36d6' │ true  │
```

Live revert: `eth_call` to PerpStopOrderRegistry `0x52e2ccebaec9332672c247e9a90aa3d61fb615ef` (BTC-PERP), `createTriggerOrder` for a reduce-only SL, sent with 0.15 STT. Response: `{"code":3,"message":"execution reverted","data":"0x28e0a7ba"}`. That selector isn't in the dreamDEX docs. Script: [scripts/probe-stop-operator.ts](../scripts/probe-stop-operator.ts).

Bare revert with no data: `eth_call` `placeOrderFor` on the BTC-PERP pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0` with `orderType = 4`, gas 10,000,000, returns `execution reverted` with no data. Script: [scripts/probe-edges.ts](../scripts/probe-edges.ts).

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1 (`contractErrorsAbi`)
- Docs: app.testnet.dreamdex.io/llms-full.txt, fetched 2026-10-21
- Network: Somnia testnet (Hideki, chain ID 50383)
- Wallet: 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59 (operator 0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6)
