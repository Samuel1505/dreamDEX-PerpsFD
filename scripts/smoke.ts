import { markets, dump } from "./client.js"

const perps = await markets.client.listPerpMarkets()
console.log(`perp markets: ${perps.length}`)
console.table(
  perps.map((m: any) => ({
    base: m.baseSymbol,
    baseDecimals: m.baseDecimals,
    quoteDecimals: m.quoteDecimals,
    pool: m.poolAddress,
  })),
)

const first = perps[0] as any
const sys = await markets.client.getPerpSystemConfig(first.marginBank)
console.log("system config:", dump(sys))
console.log("market row sample:", dump(first))

if (markets.walletAddress) console.log("wallet:", markets.walletAddress)
process.exit(0)
