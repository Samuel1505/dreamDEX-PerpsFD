// Is the bot key authorized to placeOrderFor / cancelOrderFor the app wallet, per perp market?
import { markets, owner } from "./client.js"

const SEL = { placeOrderFor: "0x80054449", cancelOrderFor: "0xe37b444b", reduceOrderFor: "0x364c2587" } as const
const operator = markets.walletAddress!
const perps = (await markets.client.listPerpMarkets()) as any[]
const rows = []
for (const m of perps) {
  const row: Record<string, unknown> = { m: m.baseSymbol }
  for (const [name, selector] of Object.entries(SEL)) {
    try {
      row[name] = await markets.client.isOperatorAuthorized({ pool: m.poolAddress, owner: owner!, operator, selector })
    } catch (e: any) {
      row[name] = `${e?.name}: ${e?.shortMessage ?? e?.message?.slice(0, 60)}`
    }
  }
  rows.push(row)
}
console.log("operator", operator, "owner", owner)
console.table(rows)
process.exit(0)
