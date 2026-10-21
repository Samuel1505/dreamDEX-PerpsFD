// Does the perp MARK track the book midpoint (trade-manipulable) or the INDEX oracle (not)?
import { createPublicClient, http, parseAbi } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { markets, RPC_URL } from "./client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 60_000 }) })
const poolAbi = parseAbi([
  "function getMarkPrice() view returns (uint256)",
  "function getIndexPrice() view returns (uint256 price, uint256 updatedAt)",
])
const ms = (await markets.client.listPerpMarkets()) as any[]
const block = (await pc.getBlockNumber()) - 2n
const tops: any = await markets.client.getBookTopsOnchain(ms.map((m) => ({ id: m.id, poolAddress: m.poolAddress })), { blockNumber: block } as any)
const rows = []
for (const m of ms) {
  const d = Number(m.quoteDecimals), n = (x: bigint) => Number(x) / 10 ** d
  const mark = await pc.readContract({ address: m.poolAddress, abi: poolAbi, functionName: "getMarkPrice", blockNumber: block }) as bigint
  const [idx] = await pc.readContract({ address: m.poolAddress, abi: poolAbi, functionName: "getIndexPrice", blockNumber: block }) as [bigint, bigint]
  const t = tops.tops[m.id] ?? {}
  const mid = t.mid ? BigInt(t.mid) : 0n
  const pct = (a: bigint, b: bigint) => b === 0n ? "-" : (Number(((a - b) * 1000000n) / b) / 10000).toFixed(3) + "%"
  rows.push({ m: m.baseSymbol, mark: n(mark).toPrecision(6), index: n(idx).toPrecision(6), bookMid: mid ? n(mid).toPrecision(6) : "-",
    "mark-index": pct(mark, idx), "mark-bookMid": mid ? pct(mark, mid) : "-" })
}
console.log("block", String(block))
console.table(rows)
process.exit(0)
