// Replay a failed perp stop: find its trigger tx, then at the parent block simulate what the registry
// would place (IOC at mark ± slippageToleranceBps) and decode the real revert.
import { createPublicClient, http, parseAbi, parseAbiItem, encodeFunctionData, zeroAddress } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { RPC_URL } from "./client.js"
import { decodeRevert } from "./lib/errors.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 60_000, retryCount: 3 }) })
const G = "https://hideki-dev.smk.somnia.host/v1/graphql"
const q = async (query: string) => { const r: any = await (await fetch(G, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.data }
export async function replay(id: string) {
const [registry, orderIdStr] = id.split("_")
const so = (await q(`{ StopOrder_by_pk(id:"${id}"){ owner isBid quantity orderType triggerPrice triggerOperator updatedAt dropReason market { poolAddress marginBank tickSize baseSymbol } } }`)).StopOrder_by_pk
const m = so.market
let lo = 1n, hi = await pc.getBlockNumber(); const ts = BigInt(so.updatedAt)
while (lo < hi) { const mid = (lo + hi) / 2n; const b = await pc.getBlock({ blockNumber: mid }); if (b.timestamp < ts) lo = mid + 1n; else hi = mid }
const ev = parseAbiItem("event PendingOrderTriggered(uint128 indexed pendingOrderId, bool success, uint8 dropReason, uint128 indexed placedOrderId)")
const [log] = await pc.getLogs({ address: registry as `0x${string}`, event: ev, args: { pendingOrderId: BigInt(orderIdStr) }, fromBlock: lo - 300n, toBlock: lo + 300n })
const block = log.blockNumber!, parent = block - 1n
const regAbi = parseAbi(["function slippageToleranceBps() view returns (uint256)"])
const slip = await pc.readContract({ address: registry as `0x${string}`, abi: regAbi, functionName: "slippageToleranceBps", blockNumber: parent })
const snapAbi = parseAbi(["function getSideHolderStatesPaginated(address pool, bool isLong, uint256 start, uint256 count) view returns ((address account, bool priceable, uint8 status, int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq, (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs) position, int256 unlockedCollateralBalance, uint256 lockedCollateral)[] states, uint256 listLength, bool poolPriceable, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 staticIMFBps) poolSnapshot)"])
const [, , priceable, snap] = (await pc.readContract({ address: m.marginBank, abi: snapAbi, functionName: "getSideHolderStatesPaginated", args: [m.poolAddress, true, 0n, 1n], blockNumber: parent })) as any
const mark = snap.markPrice as bigint, tick = BigInt(m.tickSize)
const limit = so.isBid ? ((mark * (10000n + slip)) / 10000n / tick) * tick : (((mark * (10000n - slip)) / 10000n + tick - 1n) / tick) * tick
const poolAbi = parseAbi(["function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
  "function getBestBidAndAsk() view returns (uint256, uint256)"])
const sim = async (from: string, price: bigint) => {
  const data = encodeFunctionData({ abi: poolAbi, functionName: "placeOrderFor", args: [so.owner, so.isBid, 0n, price, BigInt(so.quantity), BigInt(Date.now() + 3600_000) * 1_000_000n, 2, 0, zeroAddress, 0n] })
  const r: any = await (await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ from, to: m.poolAddress, data, gas: "0x989680" }, `0x${parent.toString(16)}`] }) })).json()
  return r.error ? `REVERT ${decodeRevert(r.error.data)}` : `ok ${r.result.slice(0, 66)}`
}
return { stop: id, market: m.baseSymbol, owner: so.owner, side: so.isBid ? "BUY" : "SELL", qty: so.quantity, type: so.orderType === 1 ? "MARKET" : "LIMIT",
  dropReason: Number(log.args.dropReason), triggerTx: log.transactionHash, block: String(block), priceable, mark: String(mark), slip: String(slip), limit: String(limit),
  replay: await sim(registry, limit) }
}
if (process.argv[1]?.endsWith("replay-stop.ts")) { console.log(await replay(process.argv[2])); process.exit(0) }
