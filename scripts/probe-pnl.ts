// Indexer view of my perp history vs the chain's known outcomes.
import { markets, owner, dump } from "./client.js"
const changes = await markets.client.listPerpPositionChanges({ account: owner!, limit: 50 } as any)
console.log("positionChanges:", dump(changes))
const G = "https://hideki-dev.smk.somnia.host/v1/graphql"
const q = async (query: string) => (await (await fetch(G, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) })).json())
console.log("AccountMarketPnl:", dump(await q(`{ AccountMarketPnl(where:{account:{_eq:"${owner!.toLowerCase()}"}}){ id } }`)))
console.log("margin events:", dump(await markets.client.getMarginEvents(owner!, { limit: 20 } as any)))
process.exit(0)
