// Indexer (listPerpMarkets) mark/index/funding vs on-chain getPerpState, all markets.
import { markets } from "./client.js"
const pc = markets.client.getViemClient()
const now = Math.floor(Date.now() / 1000)
const ms = (await markets.client.listPerpMarkets()) as any[]
const block = await pc.getBlock()
const rows = []
for (const m of ms) {
  let chainMark = "ERR", chainIdx = "", markOk = ""
  try { const s: any = await markets.client.getPerpState(m.poolAddress); chainMark = String(s.markPrice); chainIdx = String(s.indexPrice); markOk = String(s.markPriceOk) } catch (e: any) { chainMark = "ERR " + e?.name }
  const idxMark = BigInt(m.markPrice)
  const dev = chainMark.startsWith("ERR") ? "" : (Number(((idxMark - BigInt(chainMark)) * 1000000n) / BigInt(chainMark)) / 10000).toFixed(3) + "%"
  rows.push({ m: m.baseSymbol, idxMark: m.markPrice, chainMark, dev, idxMarkAgeSec: now - Number(m.markPriceUpdatedAt), idxFundingAgeSec: now - Number(m.fundingUpdatedAt), lastTradeAgeSec: now - Number(m.lastTradeAt) })
}
console.log("chain head", block.number, "head ts", block.timestamp, "local now", now)
console.table(rows)
process.exit(0)
