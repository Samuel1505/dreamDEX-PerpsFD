# Findings log

Only items that reproduce go into feedback/. Everything else stays here.

## Filed
| # | Title | Severity | Area |
|---|---|---|---|
| 01 | SDK JSDoc `@throws` is the same generic block on every method | normal | SDK |
| 02 | Paper USDso docs wrong: 6 markets not blocked; leverage can be changed | normal | docs |
| 03 | SDK has no placeOrderFor/cancelOrderFor/reduceOrderFor for linked bots | major | SDK |
| 04 | Perp contract errors undocumented (140/150); "full list" link is spot-only | major | docs |
| 05 | No reduce-only for perp orders; a retried close flips the position (tx proof) | major | contracts |
| 06 | previewPerpClosePnl prices at mark, not book (5.5x off on a real close) | normal | SDK |
| 07 | Position.lastUpdatedTimestampNs is 0 on all 4,908 positions | normal | contracts |
| 08 | Docs OI caps 2–4x below live; "a tenth of OI" position-cap rule wrong | normal | docs |
| 09 | placePerpOrder broadcasts doomed orders; misleading allowance error | normal | SDK |
| 10 | Perp stop-losses dropped by own resting order (CancelTaker): 59 cases, 22 traders | critical | contracts |
| 11 | SDK doesn't know stop dropReason 6, reports null | normal | SDK |

## Checked and found correct (don't re-test)
- getMaxPerpOrderSize is exact: max passes, max+1 lot reverts (6 markets, both sides)
- Tick/lot/min/expiry/IOC/FOK/PostOnly validation matches the Errors page
- Funding: hourly delta of cumulativeFundingPerUnit = index × rate / 8 exactly
- Liquidation-price previews are mathematically consistent (longs at ~1x clamp to 0)
- Indexer position changes and realized PnL match chain exactly (4 round trips)
- Depth (getSpotOrderBook on a perp pool) == top of book when pinned to one block
- Batch placeOrdersFor: IOC no-fill → successes[i]=false, OrderRejected reason 5, listPerpOrderRejections names it
- Withdrawals above the voucher floor only (WithdrawalBelowCreditFloor)
- Margin tiers / IMF / leverage / tick / min size in the docs table all match chain
- Indexer has no mutations; lag ~20 blocks
- Indexer markPrice is hourly-stale (0.3–4% off chain), but documented on PerpMarket.markPrice

- Liquidations: 7,436 accounts scanned, none below maintenance, no negative equity
- Access control (own accounts only): a stranger's placeOrderFor/cancelOrderFor/reduceOrderFor against our wallet all revert OnlyApprovedContracts; withdraw() is self-scoped (no withdrawFor); linked bot allowed as expected. No auth bypass found.
- Mark-price manipulation: the perp mark is INDEX-anchored (getMarkPrice tracks getIndexPrice within ±0.09% across all 21 markets; mark-vs-bookMid drifts up to 0.17%). Pushing the book does not move the mark, so wash-trading to trigger others' stops/liquidations does not apply. Defense holds. (scripts/probe-mark-source.ts)
- Fee farming: all perp fees are zero — taker, maker, and insurance-fund share — on all 21 markets (scripts/probe-fees.ts). No maker rebate to farm with a self-cross.
- Funding rounding: cumulative funding index carries ~37 significant digits (per-interval deltas ~1e37); funding owed = size*(cumNow-entryCum)/scale has dust-level granularity, no truncation-to-zero for real positions. Earlier check: hourly cumulative delta == index*rate/8 exactly. (scripts/probe-funding-rounding.ts)

## Open leads
- [ ] 65 NoFill market stops would fill at the parent block (likely liquidity consumed earlier in the block). Unproven, not filed.
- [ ] Stop orders (TP/SL): needs the app wallet to approve the stop registry once (set any TP/SL in the app). Then test: bot-key creation for owner (expect InvalidOrderOwner), 0.15 STT refund on cancel, linked-pair cancel/refund, getUnclaimedPerpStopSomi.
- [ ] Linked bots can't arm exchange TP/SL (documented). Possible missing-feature item, together with 05.
- [ ] No amendOrderFor for operators (bots must cancel+place, leaving gaps). Check the pool ABI.
- [ ] getLiquidationPrice returns 0 (not null) when the position can't be liquidated; the docs only mention null-when-flat.
- [ ] Network naming Hideki / Tokyo / DreamDEX region (low value).
