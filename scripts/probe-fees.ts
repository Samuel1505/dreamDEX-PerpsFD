// Per-market perp fee params + a real round-trip's actual fees, to check the "zero fees" claim
// and look for a maker rebate (negative makerFee) that a self-cross could farm.
import { createPublicClient, http, parseAbi } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { markets, RPC_URL } from "./client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 60_000 }) })
const abi = parseAbi(["function getPerpPoolParameters() view returns ((uint256 initialMarginBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 maxOpenInterest, uint256 maxPositionSize, uint256 takerFeeBpsTimes1k, int256 makerFeeBpsTimes1k, uint256 insuranceFundShareBps))"])
const ms = (await markets.client.listPerpMarkets()) as any[]
const rows = []
for (const m of ms) {
  const p = await pc.readContract({ address: m.poolAddress, abi, functionName: "getPerpPoolParameters" }) as any
  rows.push({ m: m.baseSymbol, takerBps: Number(p.takerFeeBpsTimes1k) / 1000, makerBps: Number(p.makerFeeBpsTimes1k) / 1000, insFundShareBps: Number(p.insuranceFundShareBps) })
}
console.table(rows)
const nonzero = rows.filter((r) => r.takerBps !== 0 || r.makerBps !== 0)
console.log(nonzero.length ? "NON-ZERO FEE MARKETS: " + JSON.stringify(nonzero) : "all perp fees are zero (taker and maker)")
process.exit(0)
