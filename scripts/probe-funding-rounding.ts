// Funding is the only nonzero value transfer. Check its granularity: cumulativeFundingPerUnit
// is scaled high, so funding owed = size*(cumNow-entryCum)/scale. Does a real position's
// one-interval funding truncate to 0 (free funding avoidance), or is granularity dust?
import { createPublicClient, http, parseAbi } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { markets, RPC_URL } from "./client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 60_000 }) })
const abi = parseAbi([
  "function getCumulativeFundingPerUnit() view returns (int256)",
  "function getProjectedCumulativeFundingPerUnit() view returns (int256)",
  "function getCurrentFundingRate() view returns (int256)",
])
for (const sym of ["BTC", "ETH", "SOL", "DOGE", "XRP"]) {
  const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === sym)!
  const cum = await pc.readContract({ address: m.poolAddress, abi, functionName: "getCumulativeFundingPerUnit" }) as bigint
  const proj = await pc.readContract({ address: m.poolAddress, abi, functionName: "getProjectedCumulativeFundingPerUnit" }) as bigint
  const perUnitDelta = proj - cum // accrued but unsettled, per base unit, in the cumulative's scale
  // funding owed by a position of `size` base units ~= size * perUnitDelta / 1e18 (entryFundingIndex is 1e18-scaled per docs)
  const minQ = BigInt(m.minQuantity)
  const owedMin = (minQ * (perUnitDelta < 0n ? -perUnitDelta : perUnitDelta)) / (10n ** 18n)
  // smallest size whose one-step funding is >= 1 raw quote unit:
  const absDelta = perUnitDelta < 0n ? -perUnitDelta : perUnitDelta
  const sizeForOneUnit = absDelta > 0n ? (10n ** 18n) / absDelta : 0n
  console.log(sym, { perUnitDeltaSinceSettle: perUnitDelta.toString(), minQty: minQ.toString(),
    fundingOwedByMinQty_rawQuote: owedMin.toString(), baseUnitsForFundingToExceed1RawQuote: sizeForOneUnit.toString() })
}
process.exit(0)
