// Effective (OI-scaled) IMF vs static IMF vs docs table, every market.
import { markets, dump } from "./client.js"
const ms = (await markets.client.listPerpMarkets()) as any[]
const rows = []
for (const m of ms) {
  try {
    const h: any = await markets.client.getPerpHealthSnapshot(m.poolAddress)
    const r: any = await markets.client.getPerpRiskParams(m.poolAddress)
    rows.push({ m: m.baseSymbol, indexerIMbps: m.initialMarginBps, staticIMF: String(h.staticIMFBps ?? h.staticImfBps ?? ""), effectiveIMF: String(h.effectiveIMFBps ?? h.effectiveImfBps ?? ""),
      mm: String(h.maintenanceMarginBps ?? ""), closeOut: String(h.closeOutMarginBps ?? ""), risk: dump(r).replace(/\s+/g, " ").slice(0, 160) })
  } catch (e: any) { rows.push({ m: m.baseSymbol, err: e?.name + " " + e?.message?.split("\n")[0] }) }
}
console.table(rows.map(({ risk, ...x }) => x))
console.log("sample risk params:", rows[20].risk)
process.exit(0)
