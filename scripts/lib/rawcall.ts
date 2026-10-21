import { encodeFunctionData } from "viem"
import { RPC_URL, markets, owner } from "../client.js"
import { POOL_ABI, orderArgs } from "./pool.js"

/** Raw eth_call of placeOrderFor; returns the JSON-RPC error object or result verbatim. */
export async function rawPlaceFor(pool: `0x${string}`, o: { isBid: boolean; price: bigint; quantity: bigint; orderType?: number; expireNs?: bigint }, gas = 10_000_000n) {
  const data = encodeFunctionData({ abi: POOL_ABI, functionName: "placeOrderFor", args: orderArgs({ owner: owner!, ...o }) })
  const body = { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ from: markets.walletAddress, to: pool, data, gas: `0x${gas.toString(16)}` }, "latest"] }
  const res = await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  return { request: body, response: await res.json() }
}
