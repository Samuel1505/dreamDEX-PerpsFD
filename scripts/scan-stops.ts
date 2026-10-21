// Stop-order outcomes across all perp registries, from the indexer.
const G = "https://hideki-dev.smk.somnia.host/v1/graphql"
const q = async (query: string) => { const r: any = await (await fetch(G, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.data }
const perpRegs: string[] = (await q(`{ Market(where:{marketType:{_eq:"PERP"}}){ stopRegistry baseSymbol } }`)).Market.map((m: any) => m.stopRegistry)
const rows: any[] = []
for (let off = 0; ; off += 1000) {
  const d = await q(`{ StopOrder(where:{registry:{_in:${JSON.stringify(perpRegs)}}}, order_by:{createdAt:asc}, limit:1000, offset:${off}){ id status dropReason cancelReason intent orderType triggerOperator createdAt updatedAt placedOrderId market { baseSymbol } } }`)
  rows.push(...d.StopOrder); if (d.StopOrder.length < 1000) break
}
const tally = (k: (r: any) => string) => rows.reduce((a: any, r) => ((a[k(r)] = (a[k(r)] ?? 0) + 1), a), {})
console.log("perp stop orders:", rows.length)
console.log("by status:", tally((r) => r.status))
console.log("by status/dropReason:", tally((r) => `${r.status}/${r.dropReason ?? "-"}`))
console.log("by status/cancelReason:", tally((r) => `${r.status}/${r.cancelReason ?? "-"}`))
const dropped = rows.filter((r) => r.dropReason)
console.log("dropped by market:", dropped.reduce((a: any, r) => ((a[r.market?.baseSymbol] = (a[r.market?.baseSymbol] ?? 0) + 1), a), {}))
console.log("recent drops:", JSON.stringify(dropped.slice(-8), null, 0))
process.exit(0)
