// For every perp market: SDK max-size verdict vs SDK allowlist flag vs on-chain simulation
// of a minimum-size resting buy, placed by the linked bot key for the voucher account.
import { markets, owner } from "../client.js"
import { POOL_ABI, orderArgs, revertName } from "../lib/pool.js"

const pc = markets.client.getViemClient()
const operator = markets.walletAddress!
const perps = (await markets.client.listPerpMarkets()) as any[]
const rows = []
for (const m of perps) {
  const tick = BigInt(m.tickSize)
  const price = ((BigInt(m.markPrice) * 90n) / 100n / tick) * tick // 10% under mark: rests, doesn't fill
  const quantity = BigInt(m.minQuantity)
  const max: any = await markets.client.getMaxPerpOrderSize({
    pool: m.poolAddress, marginBank: m.marginBank, account: owner!, isBid: true, price,
  })
  const lev: any = await markets.client.getPerpLeverage({ pool: m.poolAddress, marginBank: m.marginBank, account: owner! })
  let sim: string
  try {
    const r = await pc.simulateContract({
      address: m.poolAddress, abi: POOL_ABI, functionName: "placeOrderFor",
      args: orderArgs({ owner: owner!, isBid: true, price, quantity }), account: operator, gas: 10_000_000n,
    })
    sim = `ok success=${r.result[0]}`
  } catch (e) {
    sim = `REVERT ${revertName(e)}`
  }
  rows.push({
    market: m.baseSymbol,
    "max.placeable": max.placeable,
    "max.limitedBy": max.limitedBy,
    voucherMarketAllowed: lev.voucherMarketAllowed,
    "sim placeOrderFor(min qty)": sim,
  })
}
console.log("owner", owner, "operator", operator, "block", await pc.getBlockNumber())
console.table(rows)
process.exit(0)
