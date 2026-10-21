// Replay every failed perp MARKET stop (parallel) and tally the real revert at the trigger's parent block.
import { readFileSync, writeFileSync } from "node:fs"
import { replay } from "./replay-stop.js"
const fails = JSON.parse(readFileSync(process.argv[2], "utf8")).filter((r: any) => r.type === "MARKET")
const out: any[] = []
let i = 0
async function worker() {
  while (i < fails.length) {
    const f = fails[i++]
    try { out.push(await replay(f.id)) } catch (e: any) { out.push({ stop: f.id, market: f.market, dropReason: f.reason, replay: "ERR " + (e?.shortMessage ?? e?.message)?.slice(0, 80) }) }
    if (out.length % 20 === 0) console.log(`progress ${out.length}/${fails.length}`)
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
const key = (r: any) => `${r.dropReason} | ${String(r.replay).replace(/\(.*$/, "").replace(/^ok .*/, "ok (would succeed)")}`
const t = out.reduce((a: any, r) => ((a[key(r)] = (a[key(r)] ?? 0) + 1), a), {})
console.log("market stops replayed:", out.length); console.table(Object.entries(t).map(([k, n]) => ({ "dropReason | replayed revert": k, n })))
writeFileSync(process.argv[3], JSON.stringify(out, null, 1))
process.exit(0)
