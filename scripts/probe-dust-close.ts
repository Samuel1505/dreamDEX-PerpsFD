// For a few real sub-min positions, simulate the OWNER's own close (read-only eth_call, from=owner):
// a reduce-only market order to flatten. If it reverts QuantityBelowMinimum, the position is stuck.
import { createPublicClient, http, parseAbi, encodeFunctionData, zeroAddress } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { markets, RPC_URL } from "./client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 30_000, retryCount: 6 }) })
const poolAbi = parseAbi(["function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool,uint128)"])
import { decodeRevert } from "./lib/errors.js"
// (account, market symbol, signed size) — real sub-min positions from scan-dust.ts
const cases: [string, string, bigint][] = [
  ["0x7Bf969ef8FdF264475d0518fFF6C766a43Affc67", "BTC", 12000n],
  ["0x8620a06995E57e5eD0B4841848362879e98D0F32", "BTC", 3000n],
  ["0xb853b97e1F8fa2c50268FDB28E050f6DcdDE233C", "TAO", -1000000n],
  ["0x6A33D41C8931a6cf19806bF35a6fAB0D07f0d94B", "SOL", 90000000n],
]
const ms = (await markets.client.listPerpMarkets()) as any[]
for (const [acct, sym, size] of cases) {
  const m = ms.find((x) => x.baseSymbol === sym)!
  const tick = BigInt(m.tickSize), mark = BigInt(m.markPrice)
  const closeIsBid = size < 0n // short closes by buying
  const qty = size < 0n ? -size : size
  const price = closeIsBid ? ((mark * 110n) / 100n / tick) * tick : ((mark * 90n) / 100n / tick) * tick // marketable
  const data = encodeFunctionData({ abi: poolAbi, functionName: "placeOrder", args: [closeIsBid, 0n, price, qty, BigInt(Date.now() + 3600_000) * 1_000_000n, 2, 0, zeroAddress, 0n] })
  const r: any = await (await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ from: acct, to: m.poolAddress, data, gas: "0x989680" }, "latest"] }) })).json()
  console.log(`${sym} ${acct.slice(0,10)} size=${size} close ${closeIsBid ? "BUY" : "SELL"} ${qty} (min ${m.minQuantity}):`, r.error ? `REVERT ${decodeRevert(r.error.data)}` : `ALLOWED ${r.result?.slice(0,20)}`)
}
process.exit(0)
