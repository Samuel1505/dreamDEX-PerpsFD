// Is MarginBank Position.lastUpdatedTimestampNs ever non-zero, across every holder of several markets?
import { parseAbi } from "viem"
import { markets } from "./client.js"
const abi = parseAbi(["function getSideHolderStatesPaginated(address pool, bool isLong, uint256 start, uint256 count) view returns ((address account, bool priceable, uint8 status, int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq, (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs) position, int256 unlockedCollateralBalance, uint256 lockedCollateral)[] states, uint256 listLength, bool poolPriceable, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 staticIMFBps) poolSnapshot)"])
const pc = markets.client.getViemClient()
const ms = (await markets.client.listPerpMarkets()) as any[]
let total = 0, nonzero = 0
for (const m of ms) {
  for (const isLong of [true, false]) {
    const [states, len] = (await pc.readContract({ address: m.marginBank, abi, functionName: "getSideHolderStatesPaginated", args: [m.poolAddress, isLong, 0n, 200n] })) as any
    for (const s of states) { total++; if (s.position.lastUpdatedTimestampNs !== 0n) nonzero++ }
    if (m.baseSymbol === "BTC" && isLong) console.log("BTC longs sample:", states.slice(0, 3).map((s: any) => ({ acct: s.account, size: s.position.size.toString(), ts: s.position.lastUpdatedTimestampNs.toString() })), "listLength", len.toString())
  }
}
console.log({ positionsChecked: total, nonZeroTimestamps: nonzero, block: (await pc.getBlockNumber()).toString() })
process.exit(0)
