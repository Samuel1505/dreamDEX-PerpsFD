// "Market order = IOC at the price extreme" (SDK docs). Does that work on a PerpPool?
import { markets } from "./client.js"
import { rawPlaceFor } from "./lib/rawcall.js"
import { decodeRevert } from "./lib/errors.js"
import { ORDER } from "./lib/pool.js"
const sym = process.argv[2] ?? "BTC"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === sym)!
const tick = BigInt(m.tickSize), mark = BigInt(m.markPrice), q = BigInt(m.minQuantity)
const al = (p: bigint) => (p / tick) * tick
const rows = []
for (const [label, buyPx, sellPx] of [
  ["1.01x / 0.99x", al((mark * 101n) / 100n), al((mark * 99n) / 100n)],
  ["1.05x / 0.95x", al((mark * 105n) / 100n), al((mark * 95n) / 100n)],
  ["1.2x / 0.8x", al((mark * 12n) / 10n), al((mark * 8n) / 10n)],
  ["2x / 0.5x", al(mark * 2n), al(mark / 2n)],
  ["10x / 1 tick", al(mark * 10n), tick],
  ["1000x / 1 tick", al(mark * 1000n), tick],
] as const) {
  const b = await rawPlaceFor(m.poolAddress, { isBid: true, price: buyPx, quantity: q, orderType: ORDER.IOC })
  const s = await rawPlaceFor(m.poolAddress, { isBid: false, price: sellPx, quantity: q, orderType: ORDER.IOC })
  const f = (r: any) => (r.response.error ? `REVERT ${decodeRevert(r.response.error.data)}` : "ok")
  rows.push({ limit: label, "IOC buy": f(b), "IOC sell": f(s) })
}
console.log(sym, "mark", mark.toString())
console.table(rows)
process.exit(0)
