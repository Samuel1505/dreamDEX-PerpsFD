// Access-control check on MY OWN accounts only. Does the protocol stop an unauthorized
// caller from acting on an account it was never granted? Every attacker attempt is an
// eth_call (no state change) and targets OUR app wallet and OUR own order. The only real
// txs are placing one resting order on our app wallet and cancelling it at the end.
import { encodeFunctionData, parseAbi, zeroAddress } from "viem"
import { markets, owner, RPC_URL } from "./client.js"
import { decodeRevert } from "./lib/errors.js"
import { placeFor, cancelFor } from "./lib/orders.js"
import { GTC_NS } from "./lib/pool.js"

const BOT = markets.walletAddress!                            // our operator, linked only to `owner`
const STRANGER = "0x000000000000000000000000000000000000dEaD" // controls nothing
const abi = parseAbi([
  "function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool,uint128)",
  "function cancelOrderFor(address owner, uint128 orderId)",
  "function reduceOrderFor(address owner, uint128 orderId, uint256 newQuantityRemaining)",
  "function withdraw(uint256 amount)",
])
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === "BTC")!
const tick = BigInt(m.tickSize)
const price = ((BigInt(m.markPrice) * 90n) / 100n / tick) * tick // rests, never fills
const q = BigInt(m.minQuantity)

const call = async (from: string, to: string, data: `0x${string}`, value = 0n) => {
  const r: any = await (await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ from, to, data, gas: "0x989680", value: `0x${value.toString(16)}` }, "latest"] }) })).json()
  return r.error ? `REVERT ${decodeRevert(r.error.data)}` : `ALLOWED ${String(r.result).slice(0, 20)}`
}
const placeForData = (o: string) => encodeFunctionData({ abi, functionName: "placeOrderFor", args: [o as `0x${string}`, true, 0n, price, q, GTC_NS, 0, 0, zeroAddress, 0n] })

// 1) Place a real resting order on OUR app wallet via OUR linked bot (control case).
const placed = await placeFor(m.poolAddress, { isBid: true, price, quantity: q })
console.log("our order placed:", placed.hash, "id", placed.orderId?.toString())
const oid = placed.orderId!
const cancelData = encodeFunctionData({ abi, functionName: "cancelOrderFor", args: [owner! as `0x${string}`, oid] })
const reduceData = encodeFunctionData({ abi, functionName: "reduceOrderFor", args: [owner! as `0x${string}`, oid, q / 2n] })

console.log("\n-- unauthorized attempts against OUR wallet/order (all eth_call) --")
console.log("stranger placeOrderFor(ourWallet):", await call(STRANGER, m.poolAddress, placeForData(owner!)))
console.log("stranger cancelOrderFor(ourWallet,ourOrder):", await call(STRANGER, m.poolAddress, cancelData))
console.log("stranger reduceOrderFor(ourWallet,ourOrder):", await call(STRANGER, m.poolAddress, reduceData))
console.log("stranger withdraw() from MarginBank as ourWallet? (from=stranger):", await call(STRANGER, m.marginBank, encodeFunctionData({ abi, functionName: "withdraw", args: [1n] })))

console.log("\n-- sanity: our linked bot IS allowed --")
console.log("bot cancelOrderFor(ourWallet,ourOrder):", await call(BOT, m.poolAddress, cancelData))

// 2) Clean up our real order.
console.log("\ncleanup cancel:", await cancelFor(m.poolAddress, oid))
process.exit(0)
