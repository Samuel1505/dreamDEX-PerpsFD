// Account snapshot: gas, paper USDso voucher, positions, and max size per market.
import { markets, dump, owner } from "./client.js"

const account = owner
if (!account) throw new Error("PRIVATE_KEY not set")
const perps = (await markets.client.listPerpMarkets()) as any[]
const bank = perps[0].marginBank

console.log("bot key:", markets.walletAddress, "trading for:", account)
console.log("voucher:", dump(await markets.client.getPerpVoucher(bank, account)))
console.log("eligibility:", dump(await markets.client.getPerpVoucherEligibility(bank, account)))
console.log("portfolio:", dump(await markets.client.getPerpPortfolio(account)))

const rows = []
for (const m of perps) {
  const price = BigInt(m.markPrice)
  for (const isBid of [true, false]) {
    try {
      const r: any = await markets.client.getMaxPerpOrderSize({
        pool: m.poolAddress, marginBank: bank, account, isBid, price,
      })
      rows.push({ m: m.baseSymbol, side: isBid ? "buy" : "sell", placeable: r.placeable, priceable: r.priceable,
        maxQty: r.maxQuantity?.toString(), limitedBy: r.limitedBy, minQty: m.minQuantity })
    } catch (e: any) {
      rows.push({ m: m.baseSymbol, side: isBid ? "buy" : "sell", error: e?.name + ": " + e?.message?.slice(0, 80) })
    }
  }
}
console.table(rows)
process.exit(0)
