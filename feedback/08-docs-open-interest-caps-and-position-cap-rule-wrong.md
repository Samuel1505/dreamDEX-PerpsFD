# Docs market table: open-interest caps are 2–4x below the live values, and the "a tenth of OI" position-cap rule is wrong
Severity: normal
Area: docs

## Steps to reproduce
1. Read the [Perps on Testnet → Markets](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/README.md#markets) table, column **Open interest cap**, and the note under it: "A single account is capped at a tenth of it on most markets."
2. The [developer page](https://app.testnet.dreamdex.io/docs/developers/perps-testnet/README.md#common-pitfalls) repeats it: "Each account has a position cap per market, a tenth of the market's open interest cap on most markets."
3. For each market, read `client.getPerpRiskParams(pool)` (`maxOpenInterest`, `maxPositionSize`) and scale by the market's `baseDecimals`.
4. Optionally confirm the per-account cap with `client.getMaxPerpOrderSize(...)`, which reports `maxPositionSize`. It returns the same values as step 3.

Script: [scripts/repro/08-market-table-vs-chain.ts](../scripts/repro/08-market-table-vs-chain.ts). It checks every column of the table (max leverage, tick, min size, OI cap).

## Expected
The OI cap column matches each market's live `maxOpenInterest`, and the per-account cap is a tenth of it, as both pages say.

## Actual
Max leverage, price tick and min size match in all 21 markets. The OI caps and the position-cap rule don't:

- **OI cap:** the live cap is **4x** the docs value in 16 markets, **2x** in BTC, ETH, SOL and HYPE, and equal only in TAO.
- **Per-account cap** is a tenth of the OI cap only in TAO. Elsewhere it's 2.5% (all 5x markets except TAO and ZEC), about 5% (all 10x markets, XRP, HYPE, SOL, ETH), 20% (BTC, a flat 100 BTC) or 25% (ZEC, where the account cap of 420 equals the docs' whole-market OI cap).

| Market | Docs OI cap | Live `maxOpenInterest` | Live / docs | Live `maxPositionSize` | Position / live OI |
|---|---|---|---|---|---|
| BTC | 246.81545 | 493.6309 | 2x | 100 | 20.3% |
| ETH | 3,995.6125 | 7,991.225 | 2x | 399.5612 | 5% |
| SOL | 47,654.44 | 95,308.88 | 2x | 4,765.44 | 5% |
| HYPE | 23,812.72 | 47,625.44 | 2x | 2,381.27 | 5% |
| XRP | 344,632 | 1,378,528 | 4x | 68,926.4 | 5% |
| ADA | 2,254,678 | 9,018,712 | 4x | 450,934 | 5% |
| AVAX | 66,672.2 | 266,688.8 | 4x | 13,334.4 | 5% |
| BNB | 693.975 | 2,775.9 | 4x | 140 | 5.04% |
| DOGE | 5,613,590 | 22,454,360 | 4x | 1,122,700 | 5% |
| LINK | 42,643.6 | 170,574.4 | 4x | 8,528.6 | 5% |
| NEAR | 250,410 | 1,001,640 | 4x | 50,000 | 4.99% |
| SUI | 635,009 | 2,540,036 | 4x | 127,000 | 5% |
| XLM | 2,677,780 | 10,711,120 | 4x | 535,556 | 5% |
| 1000PEPE | 130,285,600 | 521,142,400 | 4x | 13,028,500 | 2.5% |
| LIT | 138,896.6 | 555,586.4 | 4x | 13,889.6 | 2.5% |
| PUMP | 87,993,700 | 351,974,800 | 4x | 8,799,300 | 2.5% |
| VVV | 21,786.14 | 87,144.56 | 4x | 2,178.61 | 2.5% |
| WLD | 1,264,000 | 5,056,000 | 4x | 126,400 | 2.5% |
| ZRO | 250,599.5 | 1,002,398 | 4x | 25,059.9 | 2.5% |
| ZEC | 420 | 1,680 | 4x | 420 | 25% |
| TAO | 2,185.491 | 2,185.491 | 1x | 218.549 | 10% |

So the table is out of date (the note says the figures "are read from the live markets", but they no longer are). And the "a tenth" rule doesn't describe how position caps are actually set. A trader sizing a large position, or a market maker planning inventory, gets both limits wrong: market capacity is understated by 2–4x, and the per-account limit can't be derived from the OI cap with the documented rule.

Suggested fix: generate the table from `getPerpRiskParams` at build time, add a **Max position per account** column with `maxPositionSize`, and drop the "a tenth" sentence, or explain how the per-market ratio is chosen.

## Evidence
Output of `scripts/repro/08-market-table-vs-chain.ts` at block 29425321 (the lev/tick/minSize columns read `ok` for all 21 markets):
```
│ 'ZRO'  │ ok │ ok │ ok │ 250599.5  │ 1002398  │ 4 │ 25059.9  │ 0.025  │
│ 'ZEC'  │ ok │ ok │ ok │ 420       │ 1680     │ 4 │ 420      │ 0.25   │
│ 'TAO'  │ ok │ ok │ ok │ 2185.491  │ 2185.491 │ 1 │ 218.549  │ 0.1    │
│ 'ETH'  │ ok │ ok │ ok │ 3995.6125 │ 7991.225 │ 2 │ 399.5612 │ 0.05   │
│ 'BTC'  │ ok │ ok │ ok │ 246.81545 │ 493.6309 │ 2 │ 100      │ 0.2026 │
```
Raw BTC values from `getPerpRiskParams(0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0)`: `maxOpenInterest = 49363090000`, `maxPositionSize = 10000000000` (BTC has 8 decimals). `getMaxPerpOrderSize` reports the same `maxPositionSize` for every market.

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Docs: app.testnet.dreamdex.io/docs/trading/perps-testnet/README.md, read 2026-10-21
- Network: Somnia testnet (Hideki, chain ID 50383)
- Wallet: 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59
