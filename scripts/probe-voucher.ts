import { markets, owner, dump } from "./client.js"
const ms = (await markets.client.listPerpMarkets()) as any[]
const bank = ms[0].marginBank
console.log("campaign:", dump(await markets.client.getPerpVoucherCampaign(bank)))
console.log("voucher:", dump(await markets.client.getPerpVoucher(bank, owner!)))
for (const sym of ["BTC", "ETH", "ADA", "ZRO"]) {
  const m = ms.find((x) => x.baseSymbol === sym)!
  const ref = { pool: m.poolAddress, marginBank: bank, account: owner! }
  const lev: any = await markets.client.getPerpLeverage(ref)
  const maxLev = await markets.client.getPerpMaxLeverage(ref)
  console.log(sym, "initialMarginBps", m.initialMarginBps, "getPerpLeverage:", dump(lev), "getPerpMaxLeverage:", maxLev)
}
process.exit(0)
