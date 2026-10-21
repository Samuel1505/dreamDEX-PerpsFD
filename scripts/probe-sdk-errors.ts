// SDK placePerpOrder from the bot key's OWN (empty) perp account: what does the SDK do and say?
import { markets } from "./client.js"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === "BTC")!
const s: any = await markets.client.getPerpState(m.poolAddress)
const tick = BigInt(m.tickSize), q = BigInt(m.minQuantity)
const px = ((s.markPrice * 90n) / 100n / tick) * tick
const pc = markets.client.getViemClient()
const nonce0 = await pc.getTransactionCount({ address: markets.walletAddress! })
const tries: [string, any][] = [
  ["off-tick price", { pool: m.poolAddress, isBid: true, price: px + 1n, quantity: q }],
  ["below min qty", { pool: m.poolAddress, isBid: true, price: px, quantity: q - BigInt(m.lotSize) }],
  ["valid order, empty account", { pool: m.poolAddress, isBid: true, price: px, quantity: q }],
]
for (const [label, p] of tries) {
  try { const r = await markets.trader.placePerpOrder(p); console.log(label, "=> SENT", JSON.stringify(r, (_, v) => typeof v === "bigint" ? v.toString() : v)) }
  catch (e: any) { console.log(label, "=> THROW", e?.name, "|", e?.message?.split("\n").slice(0, 3).join(" / "), "| errorName:", e?.errorName ?? e?.revert?.name ?? e?.cause?.name ?? "-") }
}
const nonce1 = await pc.getTransactionCount({ address: markets.walletAddress! })
console.log("transactions sent by these attempts:", nonce1 - nonce0)
process.exit(0)
