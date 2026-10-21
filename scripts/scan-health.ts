// Scan every holder of every perp market at one block: status, equity vs maintenance/close-out.
// Finds accounts that should have been liquidated, and accounts with negative equity (bad debt).
import { parseAbi, formatEther } from "viem"
import { writeFileSync } from "node:fs"
import { createPublicClient, http } from "viem"
import { markets, RPC_URL } from "./client.js"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const abi = parseAbi(["function getSideHolderStatesPaginated(address pool, bool isLong, uint256 start, uint256 count) view returns ((address account, bool priceable, uint8 status, int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq, (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs) position, int256 unlockedCollateralBalance, uint256 lockedCollateral)[] states, uint256 listLength, bool poolPriceable, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 staticIMFBps) poolSnapshot)"])
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 60_000, retryCount: 4 }) })
const PAGE = BigInt(process.env.PAGE ?? 150)
const blockNumber = (await pc.getBlockNumber()) - 3n
const ms = (await markets.client.listPerpMarkets()) as any[]
const accts = new Map<string, any>()
let rows = 0
for (const m of ms) for (const isLong of [true, false]) {
  for (let start = 0n; ; start += PAGE) {
    const [states, len, poolPriceable] = (await pc.readContract({ address: m.marginBank, abi, functionName: "getSideHolderStatesPaginated", args: [m.poolAddress, isLong, start, PAGE], blockNumber })) as any
    if (!poolPriceable) console.log("UNPRICEABLE pool", m.baseSymbol)
    for (const s of states) {
      rows++
      const a = accts.get(s.account) ?? { account: s.account, status: s.status, priceable: s.priceable, equity: s.equity, mmReq: s.mmReq, cmReq: s.cmReq, imReq: s.imReq, unlocked: s.unlockedCollateralBalance, positions: [] as any[] }
      a.positions.push({ m: m.baseSymbol, size: s.position.size.toString() })
      accts.set(s.account, a)
    }
    if (start + PAGE >= len) break
  }
}
const all = [...accts.values()]
const by = (f: (a: any) => boolean) => all.filter(f)
const statusNames = ["Healthy", "MarginCall", "PartialLiquidation", "CloseOut"]
const counts: Record<string, number> = {}
for (const a of all) counts[statusNames[a.status] ?? a.status] = (counts[statusNames[a.status] ?? a.status] ?? 0) + 1
const belowMM = by((a) => a.priceable && a.equity < a.mmReq)
const belowCM = by((a) => a.priceable && a.equity < a.cmReq)
const negative = by((a) => a.equity < 0n)
console.log({ block: String(blockNumber), holderRows: rows, accounts: all.length, statusCounts: counts, unpriceableAccounts: by((a) => !a.priceable).length, belowMaintenance: belowMM.length, belowCloseOut: belowCM.length, negativeEquity: negative.length })
const fmt = (a: any) => ({ account: a.account, status: statusNames[a.status], equity: formatEther(a.equity), mmReq: formatEther(a.mmReq), cmReq: formatEther(a.cmReq), positions: a.positions.map((p: any) => `${p.m}:${p.size}`).join(" ") })
console.log("worst by equity:"); console.table(all.sort((x, y) => (x.equity < y.equity ? -1 : 1)).slice(0, 12).map(fmt))
writeFileSync(process.env.OUT ?? "/dev/null", JSON.stringify({ block: String(blockNumber), accts: all.map(fmt) }, null, 1))
process.exit(0)
