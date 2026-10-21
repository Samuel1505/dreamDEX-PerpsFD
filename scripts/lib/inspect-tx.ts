import { markets } from "../client.js"
const r = await markets.client.getViemClient().getTransactionReceipt({ hash: process.argv[2] as `0x${string}` })
for (const l of r.logs) console.log(l.address, l.topics, l.data.slice(0, 200))
process.exit(0)
