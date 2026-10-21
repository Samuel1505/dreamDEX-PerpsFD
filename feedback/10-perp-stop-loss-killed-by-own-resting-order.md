# Perp stop-losses are silently dropped when the trader has a resting order on the other side (registry hard-codes `CancelTaker`)
Severity: critical
Area: contracts

## Summary
When a perp TP/SL fires, the PerpStopOrderRegistry places an IOC through `PerpPool.placeOrderFor` with `selfMatchingOption = CancelTaker`. If the owner has **any** resting order that the stop's IOC would cross, the pool reverts with `SelfMatchCancelTaker()`. The registry then records `PendingOrderTriggered(success = false, dropReason = PlacementFailed)` and removes the stop permanently. The position stays open and unprotected, and the 0.15 STT trigger fee is consumed.

This is a very common setup, for example "long with a buy-the-dip limit below the market and a stop-loss below that", or a market maker's quotes. In those cases the stop-loss can't work at exactly the moment it's needed. On testnet it has already happened **59 times to 22 different traders**. The stop struct has no self-match field, so users can't opt out, and the docs don't mention it.

## Steps to reproduce
On-chain (one account):
1. Open a long, for example on HYPE-PERP.
2. Place a resting limit **buy** below the market, for example 4% under mark.
3. Arm a reduce-only MARKET stop-loss (sell) with a trigger just above that bid. The registry's market-stop limit is mark × (1 − `slippageToleranceBps`) = mark − 5%, which is below the bid.
4. Wait for the mark to fall through the trigger, or pick a trigger that fires soon.
5. Read the registry's `PendingOrderTriggered` log and the position.

From existing testnet history (read-only):
- [scripts/scan-stops.ts](../scripts/scan-stops.ts) tallies every perp stop outcome from the indexer.
- [scripts/scan-stop-failures.ts](../scripts/scan-stop-failures.ts) checks whether each failed stop left the position open.
- [scripts/replay-all-stops.ts](../scripts/replay-all-stops.ts) replays each failed MARKET stop at its trigger's parent block (`eth_call` of `placeOrderFor` from the registry, IOC at mark ± `slippageToleranceBps`) and decodes the real revert.
- [scripts/lib/resting-at.ts](../scripts/lib/resting-at.ts) finds the owner's colliding resting order.

## Expected
A reduce-only stop-loss gets the trader out, or at least isn't removed because of the trader's own order. Reasonable behaviour, in order of preference:
- the registry places stop orders with `CancelMaker`, so the pool cancels the owner's crossing resting order (it emits `OrderCancelledSelfMatch`) and the stop executes
- or the stop struct exposes `selfMatchingOption`
- or, at minimum, the stop stays armed rather than being deleted, and the docs warn about it.

## Actual
- **Triggered perp stops so far:** 5,663. Of these, **456 failed** (`TRIGGER_FAILED`). The perp stop registries' `slippageToleranceBps` is 500 (5%).
- **Real failures:** 209 of the 456 are `PlacementFailed`, `NoFill` or reason `6`, where the position was still open. In **all 209** the position was still open at the trigger.
- **Replay of the 63 `PlacementFailed` MARKET stops at their trigger's parent block:** **59 revert with `SelfMatchCancelTaker()`**. That's 52 on BTC, 2 each on BNB, SOL and HYPE, and 1 on NEAR, across **22 distinct owners**.
- **No opt-out:** the stop struct users submit is `((isBid, owner, userData, quantity), orderType, triggerPrice, triggerOperator, limitPrice, builder, builderFeeBpsTimes1k)`. There is no self-match field.
- **Fee lost:** a triggered stop consumes its 0.15 STT even when it places nothing.
- **Undocumented:** the perps [Orders](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/orders.md) page says TP/SL "closes a position when the price reaches your target" and doesn't mention self-match or any failure mode. The "My stop did not work" FAQ says "Perps are not covered here."

## Evidence

### Case 1: BTC short, stop-loss killed by the owner's own resting ask
- Owner `0xe67780675e1e06de038273aa139efadc4db8eec6`. Short 0.04026 BTC on BTC-PERP (pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`).
- Own resting **sell** order `8983564363896558144627`: 0.23012 BTC @ **82,500**. Placed at block 28420805 (tx `0x2c526da7be6ab92b1fe85eadf7541fdc9f10ff51e3dd1fffd25ba5d5067c7b8e`), live until block 28423349.
- Stop-loss (MARKET BUY, 0.03059 BTC), registry `0x52e2ccebaec9332672c247e9a90aa3d61fb615ef`, id `2268949521066274853534`. Triggered in [`0x2d2e659f9f6618f472cdd38835f9287b402b34355bf91ff9629871383f988ac5`](https://explorer.testnet.somnia.network/tokyo/tx/0x2d2e659f9f6618f472cdd38835f9287b402b34355bf91ff9629871383f988ac5) at block 28421917, with `success = false, dropReason = 4 (PlacementFailed)`.
- At the parent block: mark 81,476.68. Registry limit = mark × 1.05 = 85,550.5. That buy crosses the owner's own ask at 82,500.
- Replay: `eth_call` of `placeOrderFor(owner, true, 0, 85550.5e18, 3059000, …, IOC, CancelTaker, …)` from the registry at block 28421916 returns **`SelfMatchCancelTaker()`**.
- The short stayed open. The next change was 125 s later, from the owner's own action.

### Case 2: HYPE long, stop dropped, then the own bid filled and added to the losing long
- Owner `0x4fd9d3cb35219f82b9cf93b02420d14c95a379e1`. Long on HYPE-PERP (pool `0x63b47ed4a7de0fde659b0d82441dd74828b7297a`).
- Own resting **buy** order `885443715538062757490`: 3.8429 HYPE @ **78.0**. Placed at block 29315162 (tx `0x8b819d670c9b5849fdb1c25bcfa715d39f1d0fcf5b0c3296bbfefed54ccd6621`).
- Stop-loss (MARKET SELL, 2.1 HYPE), registry `0x44c24cd26cf41037c6ebf337948a6c9bbc0ee055`, id `664082786653543859323`. Triggered in [`0x7d8972d42767b417da35113935552130e17607c6c6e86b44cda6bdcd616f6c09`](https://explorer.testnet.somnia.network/tokyo/tx/0x7d8972d42767b417da35113935552130e17607c6c6e86b44cda6bdcd616f6c09) at block 29316196, with `dropReason = 4`.
- Parent-block mark 81.3365. Registry limit = mark × 0.95 = 77.27, below the owner's bid at 78.0. Replay: **`SelfMatchCancelTaker()`**.
- The bid then **filled** (status `Filled`, last update at block 29318944). The trader's long got *bigger* after their stop-loss should have closed part of it.

### Replay tally (`scripts/replay-all-stops.ts`, 192 failed MARKET stops)
```
dropReason | replayed revert at trigger's parent block      n
4 (PlacementFailed) | SelfMatchCancelTaker                  59
4 (PlacementFailed) | bare revert                            3
4 (PlacementFailed) | ok                                     1
5 (NoFill)          | ImmediateOrCancelNoFill               27
5 (NoFill)          | ok at parent block                    65
5 (NoFill)          | bare revert / margin errors           32
6 (unknown to SDK)  | bare revert                            5
```
Registry config read on-chain: `slippageToleranceBps() = 500`, `somiPaymentPerOrder() = 0.15 STT`.

## Suggested fix
Place triggered stops with `SelfMatchingOption.CancelMaker`. A protective reduce-only exit should take priority over the same owner's resting orders, and the pool already supports this, emitting `OrderCancelledSelfMatch`. Alternatively, add `selfMatchingOption` to the stop struct with `CancelMaker` as the default for reduce-only intents. Either way, document the behaviour on the perps Orders page and add a perps section to the stop FAQ.

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1. Indexer: hideki-dev.smk.somnia.host
- Network: Somnia testnet (Hideki, chain ID 50383)
- Data as of block ~29,436,000 (2026-10-21)
- Reporter wallet: 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59 (read-only analysis; affected accounts are third parties, listed only by public address)
