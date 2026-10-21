// Docs OI-cap table vs on-chain maxOpenInterest / maxPositionSize / getMaxPerpOrderSize cap.
import { readFileSync } from "node:fs"
import { formatUnits } from "viem"
import { markets, owner } from "./client.js"
const doc = Object.fromEntries(readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => { const [s, v] = l.split(" "); return [s, parseFloat(v)] }))
const ms = (await markets.client.listPerpMarkets()) as any[]
const rows = []
for (const m of ms) {
  const r: any = await markets.client.getPerpRiskParams(m.poolAddress)
  const oi = Number(formatUnits(BigInt(r.maxOpenInterest), m.baseDecimals)), cap = Number(formatUnits(BigInt(r.maxPositionSize), m.baseDecimals))
  const mx: any = await markets.client.getMaxPerpOrderSize({ pool: m.poolAddress, marginBank: m.marginBank, account: owner!, isBid: true, price: BigInt(m.markPrice) })
  rows.push({ m: m.baseSymbol, docsOiCap: doc[m.baseSymbol], chainMaxOI: oi, "chain/docs": +(oi / doc[m.baseSymbol]).toFixed(4),
    chainMaxPosition: cap, "pos/chainOI": +(cap / oi).toFixed(4), "pos/docsOI": +(cap / doc[m.baseSymbol]).toFixed(4),
    sdkMaxPositionSize: mx.maxPositionSize !== undefined ? Number(formatUnits(BigInt(mx.maxPositionSize), m.baseDecimals)) : "n/a" })
}
console.table(rows)
process.exit(0)
