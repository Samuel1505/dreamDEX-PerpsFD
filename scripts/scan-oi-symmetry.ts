// CLOB invariant: sum(long sizes) == sum(short sizes) per market, and == getOpenInterest().
// Also sum of signed sizes must be 0. A break here is a critical accounting bug.
import { createPublicClient, http, parseAbi, formatUnits } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { markets, RPC_URL } from "./client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 30_000, retryCount: 8, retryDelay: 2000 }) })
const bankAbi = parseAbi(["function getSideHolderStatesPaginated(address pool, bool isLong, uint256 start, uint256 count) view returns ((address account, bool priceable, uint8 status, int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq, (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs) position, int256 unlockedCollateralBalance, uint256 lockedCollateral)[] states, uint256 listLength, bool poolPriceable, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 staticIMFBps) poolSnapshot)"])
const poolAbi = parseAbi(["function getOpenInterest() view returns (uint256)"])
const PAGE = 100n
const ms = (await markets.client.listPerpMarkets()) as any[]
const block = (await pc.getBlockNumber()) - 3n
const rows = []
for (const m of ms) {
  const sideSum = async (isLong: boolean) => {
    let s = 0n, n = 0
    for (let start = 0n; ; start += PAGE) {
      const [states, len] = (await pc.readContract({ address: m.marginBank, abi: bankAbi, functionName: "getSideHolderStatesPaginated", args: [m.poolAddress, isLong, start, PAGE], blockNumber: block })) as any
      for (const x of states) { const sz = x.position.size as bigint; s += sz < 0n ? -sz : sz; n++ }
      if (start + PAGE >= len) break
    }
    return { s, n }
  }
  const L = await sideSum(true), S = await sideSum(false)
  const oi = await pc.readContract({ address: m.poolAddress, abi: poolAbi, functionName: "getOpenInterest", blockNumber: block }) as bigint
  const d = Number(m.baseDecimals)
  rows.push({ m: m.baseSymbol, longHolders: L.n, shortHolders: S.n, longSize: formatUnits(L.s, d), shortSize: formatUnits(S.s, d),
    symmetric: L.s === S.s, "L-S": formatUnits(L.s - S.s, d), oiContract: formatUnits(oi, d), "OI==long": oi === L.s })
}
console.log("block", String(block))
console.table(rows)
const bad = rows.filter((r) => !r.symmetric || !r["OI==long"])
console.log(bad.length ? "ASYMMETRIES: " + JSON.stringify(bad, null, 1) : "all markets: long OI == short OI == getOpenInterest()")
process.exit(0)
