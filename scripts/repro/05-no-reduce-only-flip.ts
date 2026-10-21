// A "close" sent twice (e.g. a retry after an unknown tx outcome) flips a long into a short:
// regular perp orders have no reduce-only flag at the pool or SDK level.
import { markets, owner, dump } from "../client.js"
import { placeFor } from "../lib/orders.js"
import { fillsOf } from "../lib/fills.js"
import { ORDER } from "../lib/pool.js"

const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === "BTC")!
const ref = { pool: m.poolAddress, marginBank: m.marginBank, account: owner! }
const tick = BigInt(m.tickSize), q = BigInt(m.minQuantity)
const px = (up: boolean) => ((BigInt(m.markPrice) * (up ? 103n : 97n)) / 100n / tick) * tick
const pos = async (label: string) => { const p = await markets.client.getPerpPosition(ref); console.log(label, "size =", p.size.toString()); return p.size }

if ((await pos("start")) !== 0n) throw new Error("start flat")
const open = await placeFor(m.poolAddress, { isBid: true, price: px(true), quantity: q, orderType: ORDER.IOC })
console.log("open long:", open.hash, (await fillsOf(open.hash)).fills)
await pos("after open")
const close1 = await placeFor(m.poolAddress, { isBid: false, price: px(false), quantity: q, orderType: ORDER.IOC })
console.log("close #1:", close1.hash, (await fillsOf(close1.hash)).fills)
await pos("after close #1")
const close2 = await placeFor(m.poolAddress, { isBid: false, price: px(false), quantity: q, orderType: ORDER.IOC })
console.log("close #2 (retry):", close2.hash, (await fillsOf(close2.hash)).fills)
const final = await pos("after close #2")
console.log(final < 0n ? "RESULT: position FLIPPED to short" : "RESULT: no flip")
process.exit(0)
