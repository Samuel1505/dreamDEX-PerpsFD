// Every column of the docs' perps market table vs the live chain.
import { readFileSync } from "node:fs"
import { formatUnits } from "viem"
import { markets } from "../client.js"
const doc = JSON.parse(readFileSync(process.argv[2], "utf8"))
const ms = (await markets.client.listPerpMarkets()) as any[]
const rows = []
for (const m of ms) {
  const d = doc[m.baseSymbol]
  const r: any = await markets.client.getPerpRiskParams(m.poolAddress)
  const oi = Number(formatUnits(BigInt(r.maxOpenInterest), m.baseDecimals))
  const pos = Number(formatUnits(BigInt(r.maxPositionSize), m.baseDecimals))
  const tick = Number(formatUnits(BigInt(m.tickSize), m.quoteDecimals))
  const min = Number(formatUnits(BigInt(m.minQuantity), m.baseDecimals))
  const lev = 10000 / Number(r.initialMarginBps)
  rows.push({ m: m.baseSymbol,
    lev: lev === d.maxLev ? "ok" : `docs ${d.maxLev} chain ${lev}`,
    tick: tick === d.tick ? "ok" : `docs ${d.tick} chain ${tick}`,
    minSize: min === d.minSize ? "ok" : `docs ${d.minSize} chain ${min}`,
    docsOiCap: d.oiCap, chainOiCap: oi, "chain/docs": +(oi / d.oiCap).toFixed(3),
    accountCap: pos, "acct/chainOI": +(pos / oi).toFixed(4) })
}
console.log("block", await markets.client.getViemClient().getBlockNumber())
console.table(rows)
process.exit(0)
