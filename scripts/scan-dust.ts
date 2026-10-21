// Positions whose |size| is below the market's current minQuantity (or not a lot multiple).
// Such a position can't be the subject of an order >= minQuantity — can it still be closed/liquidated?
import { createPublicClient, http, parseAbi, formatUnits } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { markets, RPC_URL } from "./client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 30_000, retryCount: 8, retryDelay: 2000 }) })
const bankAbi = parseAbi(["function getSideHolderStatesPaginated(address pool, bool isLong, uint256 start, uint256 count) view returns ((address account, bool priceable, uint8 status, int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq, (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs) position, int256 unlockedCollateralBalance, uint256 lockedCollateral)[] states, uint256 listLength, bool poolPriceable, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 staticIMFBps) poolSnapshot)"])
const PAGE = 100n
const ms = (await markets.client.listPerpMarkets()) as any[]
const block = (await pc.getBlockNumber()) - 3n
const dust = []
for (const m of ms) {
  const min = BigInt(m.minQuantity), lot = BigInt(m.lotSize)
  for (const isLong of [true, false]) {
    for (let start = 0n; ; start += PAGE) {
      const [states, len] = (await pc.readContract({ address: m.marginBank, abi: bankAbi, functionName: "getSideHolderStatesPaginated", args: [m.poolAddress, isLong, start, PAGE], blockNumber: block })) as any
      for (const x of states) {
        const sz = x.position.size as bigint, abs = sz < 0n ? -sz : sz
        if (abs > 0n && (abs < min || abs % lot !== 0n)) dust.push({ m: m.baseSymbol, account: x.account, size: sz.toString(), min: min.toString(), lot: lot.toString(), belowMin: abs < min, offLot: abs % lot !== 0n, status: Number(x.status) })
      }
      if (start + PAGE >= len) break
    }
  }
}
console.log("block", String(block), "dust/off-lot positions:", dust.length)
console.table(dust.slice(0, 30))
process.exit(0)
