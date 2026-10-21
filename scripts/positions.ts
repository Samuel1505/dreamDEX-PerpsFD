// Is the account flat? Active perp pools, equity, locked collateral, open orders.
import { markets, owner } from "./client.js"
const ms = (await markets.client.listPerpMarkets()) as any[]
const acct = await markets.client.getMarginAccount(ms[0].marginBank, owner!)
console.log("active pools:", acct.activePerpPools, "equity:", acct.equity.toString(), "locked:", acct.lockedCollateral.toString())
const p = await markets.client.getPerpPortfolio(owner!)
console.log("open orders:", p.openOrders.length)
process.exit(0)
