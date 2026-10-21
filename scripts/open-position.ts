// Open a min-size position with an IOC that crosses, comparing SDK previews to what actually happened.
// npx tsx scripts/open-position.ts BTC buy|sell
import { markets, owner, dump } from "./client.js"
import { placeFor } from "./lib/orders.js"
import { ORDER } from "./lib/pool.js"
import { snapshot } from "./snapshot.js"

const sym = process.argv[2] ?? "BTC"
const isBid = (process.argv[3] ?? "buy") === "buy"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === sym)!
const tick = BigInt(m.tickSize)
const mark = BigInt(m.markPrice)
const price = ((mark * (isBid ? 102n : 98n)) / 100n / tick) * tick // 2% slippage room
const quantity = BigInt(m.minQuantity)
const ref = { pool: m.poolAddress, marginBank: m.marginBank, account: owner! }

const pre = await markets.client.getMarginAccount(m.marginBank, owner!)
const marginPreview = await markets.client.previewPerpOrderMargin({ ...ref, isBid, quantity, price })
const liqPreview = await markets.client.previewPerpLiquidationPrice({ ...ref, isBid, quantity, price })
console.log("PRE margin account:", dump(pre))
console.log("PREVIEW order margin:", dump(marginPreview))
console.log("PREVIEW liquidation:", dump(liqPreview))

const placed = await placeFor(m.poolAddress, { isBid, price, quantity, orderType: ORDER.IOC })
console.log("PLACED:", dump(placed))
await new Promise((r) => setTimeout(r, 6000)) // let the indexer catch up
console.log("POST:", dump(await snapshot(m)))
process.exit(0)
