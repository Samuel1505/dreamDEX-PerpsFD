// Find a perp stop's PendingOrderTriggered log (registry, orderId, ~unix time) and decode it.
import { createPublicClient, http, parseAbiItem, toHex } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { RPC_URL } from "../client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 60_000, retryCount: 3 }) })
const [registry, orderIdStr, tsStr] = process.argv.slice(2)
const ts = BigInt(tsStr)
let lo = 1n, hi = await pc.getBlockNumber()
while (lo < hi) { const mid = (lo + hi) / 2n; const b = await pc.getBlock({ blockNumber: mid }); if (b.timestamp < ts) lo = mid + 1n; else hi = mid }
const ev = parseAbiItem("event PendingOrderTriggered(uint128 indexed pendingOrderId, bool success, uint8 dropReason, uint128 indexed placedOrderId)")
const logs = await pc.getLogs({ address: registry as `0x${string}`, event: ev, args: { pendingOrderId: BigInt(orderIdStr) }, fromBlock: lo - 300n, toBlock: lo + 300n })
for (const l of logs) {
  const tx = await pc.getTransaction({ hash: l.transactionHash! })
  const r = await pc.getTransactionReceipt({ hash: l.transactionHash! })
  console.log({ block: String(l.blockNumber), tx: l.transactionHash, args: { ...l.args, pendingOrderId: String(l.args.pendingOrderId), placedOrderId: String(l.args.placedOrderId) }, txFrom: tx.from, txTo: tx.to, receiptLogs: r.logs.length,
    otherTopics: r.logs.filter((x) => x.address.toLowerCase() !== registry.toLowerCase()).map((x) => `${x.address.slice(0, 10)}:${x.topics[0]?.slice(0, 10)}`) })
}
if (!logs.length) console.log("no log found near block", String(lo))
process.exit(0)
