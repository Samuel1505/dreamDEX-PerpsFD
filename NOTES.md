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
- OI symmetry: sum(long sizes) == sum(short sizes) == getOpenInterest() in all 21 markets, delta 0. Position accounting sound. (scripts/scan-oi-symmetry.ts)
- Solvency: VoucherDistributor holds 413.008M real USDso == its budgetRemaining, so paper vouchers are fully token-backed (real tokens move to the bank on claim). MarginBank holds 296M USDso. No fractional reserve. Insurance fund = 0 (documented: no testnet backstop bidders). (scripts/probe-solvency.ts)
- Dust positions: 62 real positions sit below the current minQuantity (min was raised after they opened). NOT stuck — reducing orders are EXEMPT from minQuantity, so owners can close them (simulated each owner's close from=owner: ALLOWED). So min only bites OPENING orders. (scripts/scan-dust.ts, scripts/probe-dust-close.ts)
- Funding rounding: cumulative funding index carries ~37 significant digits (per-interval deltas ~1e37); funding owed = size*(cumNow-entryCum)/scale has dust-level granularity, no truncation-to-zero for real positions. Earlier check: hourly cumulative delta == index*rate/8 exactly. (scripts/probe-funding-rounding.ts)

## Linked-wallet / isolated-margin rail (investigated; blocked on funds)
- Rail is LIVE but undocumented and unused: MarginBank.getLinkedWalletRegistry() = 0x5b3C5Bf1F7AdA852e8AA783f6299932E32073aFb, maxChildren=12, proposeLink simulates ALLOWED. App says isolated margin is "coming soon"; 0 link events on-chain. (scripts/probe-linked-wallet.ts, probe-link-params.ts)
- Consent/validation logic SOUND (all eth_call): proposeLink(self)->CannotLinkSelf, acceptLink w/o proposal->NoProposalPending, unlink not-linked->NotLinked, recall/repay w/o principal->NoFundedPrincipal. (scripts/probe-link-logic.ts)
- BLOCKER: main-funding money flow (auto-pull to fund a child, recallFromChild, repayFunding) needs real withdrawable USDso. Our app wallet holds only the 1000 voucher, whose getPerpWalletPullCapacity = 0 — vouchers can't fund a child. Can't test the misrouting paths without a funded (non-voucher) account. (scripts/probe-pull-capacity.ts)
- UNPROVEN lead (needs funds): LiquidationEngine.getLinkedWalletRegistry() = 0x0 (engine NOT link-aware) while the bank's IS set. Whether liquidating a main-funded child claws back principal correctly is untested — can't force a funded, underwater child without real USDso. Not filed (not reproducible yet).

## Open leads
- [ ] 65 NoFill market stops would fill at the parent block (likely liquidity consumed earlier in the block). Unproven, not filed.
- [ ] Stop orders (TP/SL): needs the app wallet to approve the stop registry once (set any TP/SL in the app). Then test: bot-key creation for owner (expect InvalidOrderOwner), 0.15 STT refund on cancel, linked-pair cancel/refund, getUnclaimedPerpStopSomi.
- [ ] Linked bots can't arm exchange TP/SL (documented). Possible missing-feature item, together with 05.
- [ ] No amendOrderFor for operators (bots must cancel+place, leaving gaps). Check the pool ABI.
- [ ] getLiquidationPrice returns 0 (not null) when the position can't be liquidated; the docs only mention null-when-flat.
- [ ] Network naming Hideki / Tokyo / DreamDEX region (low value).
