# `previewPerpClosePnl` prices the close at the mark, not the book, so a close modal shows the wrong PnL
Severity: normal
Area: SDK

## Steps to reproduce
1. Open a small long on BTC-PERP. Here: 0.00013 BTC filled at 84,039.9.
2. Call `client.previewPerpClosePnl({ pool, marginBank, account })` with no `price`. This is the call the docstring tells a close modal to use.
3. Close the whole position with an IOC sell straight away.
4. Compare `netProceeds` from step 2 with the realized change in `getMarginAccount().unlockedCollateralBalance`.

Script: [scripts/close-position.ts](../scripts/close-position.ts), opening via [scripts/open-position.ts](../scripts/open-position.ts).

## Expected
The docstring says the method returns "What closing a position — all of it or part — would actually realise. Backs a close modal." and "`netProceeds` is the number to show". So the default result should estimate the price a close would actually get on the book (best bid for a long, walking the depth for size). If it doesn't, the docs should say it uses the mark and that `price` must be passed.

## Actual
With no `price`, the preview uses `fillPrice = markPrice` and ignores the order book. Perp books on testnet trade noticeably away from the mark: at test time, BTC's best bid/ask was about 84,270 while the mark was 84,081. So the preview was off by more than 5x:

| | value |
|---|---|
| `previewPerpClosePnl` default `fillPrice` | 84,081.37 (= `markPrice`) |
| `previewPerpClosePnl` default `netProceeds` | **+0.005391 USDso** |
| actual close fill | 84,268.6 |
| actual realized (collateral delta) | **+0.029731 USDso** |

Nothing in the signature or docstring says `price` defaults to the mark. `PerpClosePreview` even names the field `fillPrice` while setting it equal to `markPrice`. Passing `price` doesn't fix it either: the method then assumes the whole close fills at that single price, with no depth walk.

For larger positions, or markets where the mark and the book drift apart, a close modal built on this method shows a materially wrong expected PnL. The error can go either way: too optimistic when the book is below the mark, too pessimistic when above.

Suggested fix: default the price to the executable side of the book, using `getSpotOrderBook` depth (which works on perp pools) and walking levels for the closed quantity. Or document plainly that the default is the mark and return the book's estimate alongside it.

## Evidence
Open: [`0x45a114b30ff75dfd2076a382a47f44f859b931b7fb0f8eaa1f2df6709551bfd7`](https://explorer.testnet.somnia.network/tokyo/tx/0x45a114b30ff75dfd2076a382a47f44f859b931b7fb0f8eaa1f2df6709551bfd7). `OrderFilled` 13000 @ 84039.9.

Preview taken immediately before the close (block 29414062):
```json
{ "closedQuantity": "13000", "fullClose": true,
  "realizedPnl": "5391256389468690", "fundingSettled": "0", "fee": "0",
  "netProceeds": "5391256389468690",
  "fillPrice": "84081371202995913000000", "markPrice": "84081371202995913000000",
  "avgEntryPrice": "84039900000000000000000" }
```
Close: [`0xfcf0844f4180e09b15cf49fdbc058241b66ba687bb97a59cd83ac349d43a86a2`](https://explorer.testnet.somnia.network/tokyo/tx/0xfcf0844f4180e09b15cf49fdbc058241b66ba687bb97a59cd83ac349d43a86a2). `OrderFilled` 13000 @ **84268.6**. `unlockedCollateralBalance` went from 1000.000000 to 1000.029731 (**+0.029731**). That equals 0.00013 × (84268.6 − 84039.9).

Book vs mark at the same block (`getBookTopsOnchain` and `getSpotOrderBook` agree): BTC best bid 84,269.6, best ask 84,269.7. Mark around 84,081.

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Network: Somnia testnet (Hideki, chain ID 50383)
- Account: 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59 (operator 0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6)
