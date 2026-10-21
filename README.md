# dreamDEX Perps Builder Bounty — Feedback track

Reproducible bug reports, API/SDK issues and documentation gaps for dreamDEX perps on the Somnia testnet. Each item is a separate file in [feedback/](feedback/), in the bounty's format.

## Findings

| # | Title | Severity | Area |
|---|---|---|---|
| [10](feedback/10-perp-stop-loss-killed-by-own-resting-order.md) | Perp stop-losses silently dropped when the trader has a resting order on the other side (registry hard-codes `CancelTaker`) — 59 cases, 22 traders | critical | contracts |
| [03](feedback/03-sdk-no-operator-order-methods-for-linked-bots.md) | SDK has no `placeOrderFor`/`cancelOrderFor`/`reduceOrderFor` for linked bots | major | SDK |
| [04](feedback/04-docs-perp-contract-errors-undocumented.md) | 140/150 perp contract errors undocumented; "full list" link is spot-only | major | docs |
| [05](feedback/05-no-reduce-only-for-perp-orders-retry-flips-position.md) | No reduce-only for perp orders; a retried close flips the position | major | contracts |
| [01](feedback/01-sdk-throws-docs-are-generic-boilerplate.md) | SDK JSDoc `@throws` is the same generic block on every method | normal | SDK |
| [02](feedback/02-docs-paper-usdso-market-allowlist-is-wrong.md) | Paper USDso docs wrong: 6 markets not blocked; leverage can be changed | normal | docs |
| [06](feedback/06-sdk-previewPerpClosePnl-prices-at-mark-not-book.md) | `previewPerpClosePnl` prices at mark, not book | normal | SDK |
| [07](feedback/07-position-lastUpdatedTimestampNs-always-zero.md) | `Position.lastUpdatedTimestampNs` is 0 on all 4,908 positions | normal | contracts |
| [08](feedback/08-docs-open-interest-caps-and-position-cap-rule-wrong.md) | Docs OI caps 2–4x below live; "a tenth of OI" position-cap rule wrong | normal | docs |
| [09](feedback/09-sdk-placePerpOrder-broadcasts-doomed-orders.md) | `placePerpOrder` broadcasts doomed orders; misleading allowance error | normal | SDK |
| [11](feedback/11-sdk-unknown-stop-drop-reason-6-reported-as-null.md) | SDK doesn't know stop `dropReason` 6, reports `null` | normal | SDK |

Each report has steps to reproduce, expected vs actual, transaction hashes / on-chain evidence, and the environment.

## Reproducing

```sh
npm install
cp .env.example .env     # add a testnet-only key (PRIVATE_KEY) and the linked app wallet (OWNER_ADDRESS)
npm run smoke            # read-only: lists the 21 perp markets and the system config
npm run typecheck
```

The repro scripts live in [scripts/](scripts/) (and [scripts/repro/](scripts/repro/)). Read-only checks need no key; the ones that place orders use a bot key linked to an app wallet via **Link a Bot**, exactly as the bounty's developer docs describe.

- SDK: `@somnia-chain/markets-sdk` 0.32.1 (the version the app runs)
- Chain: Hideki testnet, chain ID `50383` (the app's "DreamDEX" region; explorer path `/tokyo`)
- Indexer: `https://hideki-dev.smk.somnia.host/v1/graphql`

[NOTES.md](NOTES.md) also lists what was checked and found correct (liquidations, access control, funding math, order-size limits, batch rejections, and more), so those aren't re-tested.

## Security

No exploitable vulnerability was found. In particular:

- **Access control** is enforced — unauthorized `placeOrderFor`/`cancelOrderFor`/`reduceOrderFor` revert `OnlyApprovedContracts`, and withdrawals are self-scoped (no `withdrawFor`).
- **Mark-price manipulation** does not apply — the perp mark is index-anchored (tracks the index oracle within ±0.09% across all markets, vs up to 0.17% drift from the book midpoint), so trading can't move it to sweep others' stops or liquidations.
- **Fee farming** does not apply — all perp fees are zero (taker, maker, insurance-fund share), so there is no maker rebate to farm.
- **Funding rounding** is dust-level (the cumulative funding index carries ~37 significant digits) with no truncation-to-zero for real positions.
- The indexer exposes **no write mutations**, and no account is below maintenance margin or carrying bad debt.

Had anything exploitable turned up, it would have gone privately to security@dreamdex.io, not here.
