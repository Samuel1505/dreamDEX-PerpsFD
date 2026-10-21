// Owner's opposite-side orders resting on a pool at a given block (indexer).
const G = "https://hideki-dev.smk.somnia.host/v1/graphql"
const [owner, block, restingIsBid, pool] = process.argv.slice(2)
const query = `{ Order(where:{owner:{_eq:"${owner}"}, market_id:{_eq:"${pool}"}, isBid:{_eq:${restingIsBid}}, placedAtBlock:{_lt:${block}}, lastUpdatedAtBlock:{_gte:${block}}}, order_by:{placedAtBlock:desc}, limit:4){ orderIdRaw isBid price fullQuantity quantityRemaining status rested placedAtBlock lastUpdatedAtBlock placedTxHash cancelReason } }`
const r: any = await (await fetch(G, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) })).json()
console.log(JSON.stringify(r.data ?? r.errors, null, 1))
process.exit(0)
