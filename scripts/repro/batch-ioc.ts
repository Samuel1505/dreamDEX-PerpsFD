// Batch placeOrdersFor: [IOC that can't fill, resting buy far below]. Docs: the IOC entry is refused
// without reverting, successes[0]=false, OrderRejected(reason 5), and listPerpOrderRejections names it.
import { encodeFunctionData, parseAbi, zeroAddress, decodeEventLog } from "viem"
import { markets, owner, wallet, RPC_URL, dump } from "../client.js"
import { decodeRevert } from "../lib/errors.js"
import { cancelFor } from "../lib/orders.js"
import { GTC_NS } from "../lib/pool.js"

const abi = parseAbi([
  "function placeOrdersFor(address owner, (bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k)[] requests) returns (bool[] successes, uint128[] ids)",
  "event OrderRejected(address indexed owner, uint8 indexed reason, uint256 requestIndex)",
])
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === "BTC")!
const s: any = await markets.client.getPerpState(m.poolAddress)
const tick = BigInt(m.tickSize), q = BigInt(m.minQuantity)
const al = (p: bigint) => (p / tick) * tick
const req = (isBid: boolean, price: bigint, orderType: number) => ({ isBid, userData: 0n, price, quantity: q, expireTimestampNs: GTC_NS, orderType, selfMatchingOption: 0, builder: zeroAddress, builderFeeBpsTimes1k: 0n })
const requests = [req(true, al((s.markPrice * 95n) / 100n), 2), req(true, al((s.markPrice * 90n) / 100n), 0)]
const data = encodeFunctionData({ abi, functionName: "placeOrdersFor", args: [owner!, requests] })
const sim: any = await (await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ from: markets.walletAddress, to: m.poolAddress, data, gas: "0x989680" }, "latest"] }) })).json()
console.log("simulate:", sim.error ? `REVERT ${decodeRevert(sim.error.data)}` : sim.result.slice(0, 200))
if (sim.error || process.argv[2] !== "--send") process.exit(0)

const hash = await wallet!.sendTransaction({ to: m.poolAddress, data, gas: 10_000_000n })
const r = await markets.client.getViemClient().waitForTransactionReceipt({ hash })
console.log("tx", hash, r.status)
const rejected = r.logs.flatMap((l) => { try { return [decodeEventLog({ abi, data: l.data, topics: l.topics as any })] } catch { return [] } })
console.log("OrderRejected logs:", dump(rejected))
const resting = r.logs.find((l) => l.address.toLowerCase() === m.poolAddress.toLowerCase() && l.topics[0] === "0xd90f62f61ee2f606b132cfdfd883ddd079228b6fd6bffd9d7cf848daf824639d")
if (resting) console.log("cancel resting:", await cancelFor(m.poolAddress, BigInt(resting.topics[1]!)))
await new Promise((res) => setTimeout(res, 8000))
console.log("listPerpOrderRejections:", dump(await markets.client.listPerpOrderRejections({ owner: owner!, limit: 5 })))
process.exit(0)
