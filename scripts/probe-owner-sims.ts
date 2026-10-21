// Owner-only actions simulated with eth_call (from = app wallet; no signature needed for a call).
import { encodeFunctionData, parseAbi } from "viem"
import { markets, owner, RPC_URL } from "./client.js"
import { decodeRevert } from "./lib/errors.js"
const abi = parseAbi(["function withdraw(uint256 amount)", "function setMaxLeverage(address perpPool, uint16 leverageX)"])
const ms = (await markets.client.listPerpMarkets()) as any[]
const bank = ms[0].marginBank as `0x${string}`
const btc = ms.find((x) => x.baseSymbol === "BTC")!
const acct = await markets.client.getMarginAccount(bank, owner!)
console.log("equity", acct.equity.toString(), "withdrawable", acct.withdrawable.toString())
const call = async (data: `0x${string}`) => {
  const body = { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ from: owner, to: bank, data, gas: "0x989680" }, "latest"] }
  const r: any = await (await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json()
  return r.error ? `REVERT ${decodeRevert(r.error.data)}` : `ok ${r.result}`
}
const w = BigInt(acct.withdrawable)
for (const [label, amt] of [["withdrawable", w], ["withdrawable+1", w + 1n], ["1 USDso", 10n ** 18n], ["all equity", BigInt(acct.equity)]] as const)
  console.log(`withdraw(${label}=${amt})`, await call(encodeFunctionData({ abi, functionName: "withdraw", args: [amt] })))
for (const lev of [1, 5, 10, 20, 21, 0])
  console.log(`setMaxLeverage(BTC, ${lev})`, await call(encodeFunctionData({ abi, functionName: "setMaxLeverage", args: [btc.poolAddress, lev] })))
process.exit(0)
