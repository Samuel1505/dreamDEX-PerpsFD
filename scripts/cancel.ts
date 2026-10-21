// npx tsx scripts/cancel.ts <SYMBOL> <orderId>
import { markets } from "./client.js"
import { cancelFor } from "./lib/orders.js"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === process.argv[2])!
console.log(await cancelFor(m.poolAddress, BigInt(process.argv[3])))
process.exit(0)
