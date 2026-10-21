// Real tx: min-size resting buy in a market the docs say paper USDso can't open (default ZRO), then cancel.
import { markets, owner } from "../client.js"
import { placeFor, cancelFor } from "../lib/orders.js"

const sym = process.argv[2] ?? "ZRO"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === sym)!
const voucher = await markets.client.getPerpVoucher(m.marginBank, owner!)
const tick = BigInt(m.tickSize)
const price = ((BigInt(m.markPrice) * 90n) / 100n / tick) * tick
const quantity = BigInt(m.minQuantity)
console.log({ market: sym, pool: m.poolAddress, owner, voucherFloor: voucher?.floor?.toString(), price: price.toString(), quantity: quantity.toString() })
const placed = await placeFor(m.poolAddress, { isBid: true, price, quantity })
console.log("place:", { ...placed, gasUsed: placed.gasUsed.toString(), orderId: placed.orderId?.toString() })
if (placed.orderId !== undefined) console.log("cancel:", await cancelFor(m.poolAddress, placed.orderId))
process.exit(0)
