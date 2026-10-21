// Close the whole position with a reduce IOC, comparing previewPerpClosePnl to the realised outcome.
import { markets, owner, dump } from "./client.js"
import { placeFor } from "./lib/orders.js"
import { ORDER } from "./lib/pool.js"
import { snapshot } from "./snapshot.js"

const sym = process.argv[2] ?? "BTC"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === sym)!
const ref = { pool: m.poolAddress, marginBank: m.marginBank, account: owner! }
const pos = await markets.client.getPerpPosition(ref)
if (pos.size === 0n) throw new Error("flat")
const isBid = pos.size < 0n
const quantity = isBid ? -pos.size : pos.size
const tick = BigInt(m.tickSize)
const mark = BigInt(m.markPrice)
const limit = ((mark * (isBid ? 102n : 98n)) / 100n / tick) * tick

const pre = await markets.client.getMarginAccount(m.marginBank, owner!)
const previewDefault = await markets.client.previewPerpClosePnl(ref)
const previewAtLimit = await markets.client.previewPerpClosePnl({ ...ref, price: limit })
console.log("position:", dump(pos))
console.log("PRE margin:", dump(pre))
console.log("PREVIEW close (default):", dump(previewDefault))
console.log("PREVIEW close (price=limit):", dump(previewAtLimit))
const placed = await placeFor(m.poolAddress, { isBid, price: limit, quantity, orderType: ORDER.IOC })
console.log("CLOSE TX:", dump(placed))
const post = await markets.client.getMarginAccount(m.marginBank, owner!)
console.log("POST margin:", dump(post))
console.log("REALISED (equity delta incl. any funding/fees):", (BigInt(post.unlockedCollateralBalance) - BigInt(pre.unlockedCollateralBalance)).toString())
await new Promise((r) => setTimeout(r, 6000))
console.log("POST snapshot:", dump(await snapshot(m)))
process.exit(0)
