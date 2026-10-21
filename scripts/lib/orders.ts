import { markets, owner, wallet } from "../client.js"
import { POOL_ABI, orderArgs } from "./pool.js"
export const pc = () => markets.client.getViemClient()

/** placeOrderFor from the bot key; returns tx hash, receipt status and orderId (from logs). */
export async function placeFor(pool: `0x${string}`, o: { isBid: boolean; price: bigint; quantity: bigint; orderType?: number }) {
  const hash = await wallet!.writeContract({
    address: pool, abi: POOL_ABI, functionName: "placeOrderFor",
    args: orderArgs({ owner: owner!, ...o }), gas: 10_000_000n,
  })
  const r = await pc().waitForTransactionReceipt({ hash })
  // The pool's first log carries orderId as topic[1] (owner is in data, not indexed)
  const log = r.logs.find((l) => l.address.toLowerCase() === pool.toLowerCase() && l.topics.length === 2)
  return { hash, status: r.status, gasUsed: r.gasUsed, orderId: log?.topics[1] ? BigInt(log.topics[1]) : undefined, logs: r.logs.length }
}

export async function cancelFor(pool: `0x${string}`, orderId: bigint) {
  const hash = await wallet!.writeContract({ address: pool, abi: POOL_ABI, functionName: "cancelOrderFor", args: [owner!, orderId], gas: 3_000_000n })
  const r = await pc().waitForTransactionReceipt({ hash })
  return { hash, status: r.status }
}
