import { markets, owner, dump } from "./client.js"
const p = await markets.client.getPerpPortfolio(owner!)
console.log("open orders:", dump(p.openOrders))
process.exit(0)
