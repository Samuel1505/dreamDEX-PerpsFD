// For every perp stop that triggered but placed/filled nothing (NoFill=5, PlacementFailed=4, unknown=6):
// was the owner's position in that market still open right after, i.e. left unprotected?
import { writeFileSync } from "node:fs"
const G = "https://hideki-dev.smk.somnia.host/v1/graphql"
const q = async (query: string) => { const r: any = await (await fetch(G, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.data }
const perp = (await q(`{ Market(where:{marketType:{_eq:"PERP"}}){ stopRegistry poolAddress baseSymbol baseDecimals } }`)).Market
const byReg = Object.fromEntries(perp.map((m: any) => [m.stopRegistry, m]))
const fails = (await q(`{ StopOrder(where:{registry:{_in:${JSON.stringify(perp.map((m: any) => m.stopRegistry))}}, dropReason:{_in:[4,5,6]}}, order_by:{updatedAt:asc}, limit:1000){ id owner registry dropReason orderType isBid quantity triggerPrice triggerOperator createdAt updatedAt } }`)).StopOrder
const out = []
for (const f of fails) {
  const m = byReg[f.registry]
  const before = (await q(`{ PerpPositionChange(where:{account:{_eq:"${f.owner}"}, pool:{_eq:"${m.poolAddress}"}, timestamp:{_lte:${f.updatedAt}}}, order_by:[{blockNumber:desc},{logIndex:desc}], limit:1){ sizeAfter timestamp } }`)).PerpPositionChange[0]
  const after = (await q(`{ PerpPositionChange(where:{account:{_eq:"${f.owner}"}, pool:{_eq:"${m.poolAddress}"}, timestamp:{_gt:${f.updatedAt}}}, order_by:[{blockNumber:asc},{logIndex:asc}], limit:1){ sizeBefore sizeAfter kind timestamp } }`)).PerpPositionChange[0]
  const sizeAtTrigger = before ? BigInt(before.sizeAfter) : 0n
  out.push({ id: f.id, market: m.baseSymbol, reason: f.dropReason, type: f.orderType === 1 ? "MARKET" : "LIMIT", owner: f.owner, triggeredAt: Number(f.updatedAt),
    stopQty: f.quantity, sizeAtTrigger: String(sizeAtTrigger), stillOpen: sizeAtTrigger !== 0n,
    nextChange: after ? `${after.kind} ${after.sizeBefore}->${after.sizeAfter} +${Number(after.timestamp) - Number(f.updatedAt)}s` : "none (still open now?)" })
}
const open = out.filter((r) => r.stillOpen)
const t = (xs: any[], k: string) => xs.reduce((a, r) => ((a[r[k]] = (a[r[k]] ?? 0) + 1), a), {})
console.log({ failedStops: out.length, positionStillOpenAtTrigger: open.length, byReason: t(open, "reason"), byType: t(open, "type"), byMarket: t(open, "market") })
console.table(open.slice(-15).map(({ id, owner, ...r }) => r))
writeFileSync(process.env.OUT ?? "/dev/null", JSON.stringify(out, null, 1))
process.exit(0)
