// Boundary test: getMaxPerpOrderSize.maxQuantity must simulate OK; maxQuantity + 1 lot must revert.
import { markets, owner } from "./client.js"
import { POOL_ABI, orderArgs, revertName } from "./lib/pool.js"

const pc = markets.client.getViemClient()
const operator = markets.walletAddress!
const only = process.argv.slice(2)
const perps = ((await markets.client.listPerpMarkets()) as any[]).filter((m) => !only.length || only.includes(m.baseSymbol))
async function sim(pool: `0x${string}`, isBid: boolean, price: bigint, quantity: bigint) {
  try {
    const r = await pc.simulateContract({ address: pool, abi: POOL_ABI, functionName: "placeOrderFor",
      args: orderArgs({ owner: owner!, isBid, price, quantity }), account: operator, gas: 10_000_000n })
    return r.result[0] ? "ok" : "success=false"
  } catch (e) { return `REVERT ${revertName(e)}` }
}
const rows = []
for (const m of perps) {
  const tick = BigInt(m.tickSize), lot = BigInt(m.lotSize)
  for (const isBid of [true, false]) {
    // resting price 5% away from mark on the passive side
    const raw = (BigInt(m.markPrice) * (isBid ? 95n : 105n)) / 100n
    const price = (raw / tick) * tick
    const max: any = await markets.client.getMaxPerpOrderSize({ pool: m.poolAddress, marginBank: m.marginBank, account: owner!, isBid, price })
    const q = BigInt(max.maxQuantity)
    rows.push({
      m: m.baseSymbol, side: isBid ? "buy" : "sell", limitedBy: max.limitedBy, maxQty: q.toString(),
      atMax: await sim(m.poolAddress, isBid, price, q),
      "max+1lot": await sim(m.poolAddress, isBid, price, q + lot),
      "max+10lot": await sim(m.poolAddress, isBid, price, q + 10n * lot),
    })
  }
}
console.log("block", await pc.getBlockNumber())
console.table(rows)
process.exit(0)
