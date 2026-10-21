// Last N txs sent by the bot key (scan recent blocks), with status and fee.
import { formatEther } from "viem"
import { markets } from "../client.js"
const pc = markets.client.getViemClient()
const me = markets.walletAddress!.toLowerCase()
const head = await pc.getBlockNumber()
const want = Number(process.argv[2] ?? 3)
const found: any[] = []
for (let b = head; b > head - 3000n && found.length < want; b--) {
  const blk = await pc.getBlock({ blockNumber: b, includeTransactions: true })
  for (const tx of blk.transactions as any[]) if (tx.from?.toLowerCase() === me) {
    const r = await pc.getTransactionReceipt({ hash: tx.hash })
    found.push({ block: String(b), hash: tx.hash, to: tx.to, status: r.status, gasUsed: String(r.gasUsed), feeSTT: formatEther(r.gasUsed * r.effectiveGasPrice) })
  }
}
console.table(found)
process.exit(0)
