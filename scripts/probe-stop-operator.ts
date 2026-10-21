// Can a linked bot key create a stop (SL) for its owner? Simulate createTriggerOrder from the bot key.
import { encodeFunctionData, parseAbi, zeroAddress, formatEther } from "viem"
import { markets, owner, RPC_URL } from "./client.js"
import { decodeRevert } from "./lib/errors.js"

const abi = parseAbi([
  "function createTriggerOrder(((bool isBid, address owner, uint64 userData, uint256 quantity) order, uint8 orderType, uint256 triggerPrice, uint8 triggerOperator, uint256 limitPrice, address builder, uint96 builderFeeBpsTimes1k) orderWithTrigger, uint8 intent) payable returns (uint128 pendingOrderId)",
  "function somiPaymentPerOrder() view returns (uint256)",
])
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === "BTC")!
const pc = markets.client.getViemClient()
const pay = await pc.readContract({ address: m.stopRegistry, abi, functionName: "somiPaymentPerOrder" })
const tick = BigInt(m.tickSize)
const trigger = ((BigInt(m.markPrice) * 80n) / 100n / tick) * tick // SL 20% below mark
const call = async (from: string, orderOwner: string, intent: number) => {
  const data = encodeFunctionData({ abi, functionName: "createTriggerOrder", args: [{
    order: { isBid: false, owner: orderOwner as `0x${string}`, userData: 0n, quantity: BigInt(m.minQuantity) },
    orderType: 1, triggerPrice: trigger, triggerOperator: 1, limitPrice: 0n, builder: zeroAddress, builderFeeBpsTimes1k: 0n,
  }, intent] })
  const body = { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ from, to: m.stopRegistry, data, value: `0x${pay.toString(16)}`, gas: "0x989680" }, "latest"] }
  const r: any = await (await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json()
  return r.error ? `REVERT ${decodeRevert(r.error.data)} (${r.error.data})` : `ok ${r.result}`
}
console.log({ registry: m.stopRegistry, somiPaymentPerOrder: formatEther(pay), trigger: trigger.toString() })
console.log("bot key -> owner=app wallet, reduceOnly:", await call(markets.walletAddress!, owner!, 0))
console.log("bot key -> owner=bot key,  reduceOnly:", await call(markets.walletAddress!, markets.walletAddress!, 0))
console.log("app wallet (as from) -> owner=app wallet, reduceOnly:", await call(owner!, owner!, 0))
process.exit(0)
