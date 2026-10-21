import { markets, owner, dump } from "./client.js"
const ms = (await markets.client.listPerpMarkets()) as any[]
for (const sym of ["BTC", "ETH", "ZRO"]) {
  const m = ms.find((x) => x.baseSymbol === sym)!
  const ref = { pool: m.poolAddress, marginBank: m.marginBank, account: owner! }
  const tick = BigInt(m.tickSize), mark = BigInt(m.markPrice)
  for (const isBid of [true, false]) {
    for (const mult of [1n, 100n]) {
      const quantity = BigInt(m.minQuantity) * mult
      const price = ((mark * (isBid ? 101n : 99n)) / 100n / tick) * tick
      try {
        const p: any = await markets.client.previewPerpLiquidationPrice({ ...ref, isBid, quantity, price })
        console.log(sym, isBid ? "long" : "short", `qty=min*${mult}`, "projLiq=", p.projectedLiquidationPrice?.toString(), "mark=", p.markPrice?.toString(), "lev(bps)=", p.projectedPositionLeverageBps?.toString())
      } catch (e: any) { console.log(sym, isBid, mult, "ERR", e?.name, e?.message?.split("\n")[0]) }
    }
  }
}
process.exit(0)
