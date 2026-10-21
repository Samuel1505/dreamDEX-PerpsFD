import { markets, dump } from "./client.js"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === "BTC")!
for (const [name, f] of [
  ["getSpotOrderBook(perpPool)", () => markets.client.getSpotOrderBook(m.poolAddress, { depth: 10 } as any)],
  ["getLiveSpotOrderBook(perpPool)", () => (markets.client as any).getLiveSpotOrderBook(m.poolAddress, { depth: 10 })],
  ["getBookTops([perp id])", () => markets.client.getBookTops([m.id])],
  ["getBookTopsOnchain", () => markets.client.getBookTopsOnchain([{ id: m.id, poolAddress: m.poolAddress }])],
] as const) {
  try { const r: any = await (f as any)(); console.log(name, "=>", dump(r).slice(0, 1500)) }
  catch (e: any) { console.log(name, "=> ERR", e?.name, e?.message?.split("\n").slice(0, 3).join(" | ")) }
}
process.exit(0)
