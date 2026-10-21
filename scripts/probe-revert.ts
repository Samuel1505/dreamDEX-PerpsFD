import { markets } from "./client.js"
import { rawPlaceFor } from "./lib/rawcall.js"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === "BTC")!
const tick = BigInt(m.tickSize)
const price = ((BigInt(m.markPrice) * 95n) / 100n / tick) * tick
const huge = BigInt(m.lotSize) * 10n ** 9n
const r = await rawPlaceFor(m.poolAddress, { isBid: true, price, quantity: huge })
console.log(JSON.stringify(r.response, null, 1))
process.exit(0)
