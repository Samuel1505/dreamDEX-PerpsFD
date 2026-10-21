// Same-block comparison: getSpotOrderBook depth vs getBookTopsOnchain, across all perp markets.
import { markets } from "./client.js"
const pc = markets.client.getViemClient()
const ms = (await markets.client.listPerpMarkets()) as any[]
const rows = []
for (const m of ms) {
  const blockNumber = (await pc.getBlockNumber()) - 2n
  const tops: any = await markets.client.getBookTopsOnchain([{ id: m.id, poolAddress: m.poolAddress }], { blockNumber } as any)
  const book: any = await markets.client.getSpotOrderBook(m.poolAddress, { depth: 12, blockNumber } as any)
  const t = tops.tops[m.id] ?? {}
  const bb = book.bids[0]?.price?.toString(), ba = book.asks[0]?.price?.toString()
  rows.push({ m: m.baseSymbol, block: String(blockNumber), topsBlock: String(tops.blockNumber), topBid: t.bestBid?.toString(), bookBid: bb, topAsk: t.bestAsk?.toString(), bookAsk: ba,
    bidMatch: String(t.bestBid) === bb, askMatch: String(t.bestAsk) === ba })
}
console.table(rows.map(({ m, bidMatch, askMatch, topBid, bookBid, topAsk, bookAsk }) => ({ m, bidMatch, askMatch, topBid, bookBid, topAsk, bookAsk })))
process.exit(0)
