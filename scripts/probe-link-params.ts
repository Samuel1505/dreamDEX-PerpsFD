import { createPublicClient, http, parseAbi, encodeFunctionData } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { markets, owner, RPC_URL } from "./client.js"
import { decodeRevert } from "./lib/errors.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 30_000, retryCount: 6 }) })
const REG = "0x5b3C5Bf1F7AdA852e8AA783f6299932E32073aFb" as const
const BOT = markets.walletAddress!
// Try common view getters on the registry
const names: [string,string][] = [["maxChildrenPerMain","uint256"],["maxChildren","uint256"],["getMaxChildren","uint256"],["linkingEnabled","bool"],["owner","address"],["marginBank","address"],["paused","bool"]]
for (const [n,ret] of names) { try { const v = await pc.readContract({ address: REG, abi: parseAbi([`function ${n}() view returns (${ret})`]), functionName: n as any }); console.log(n,"=",String(v)) } catch {} }
// SDK reads
try { console.log("getPerpMaxLinkedChildren:", await markets.client.getPerpMaxLinkedChildren(REG)) } catch (e:any) { console.log("getPerpMaxLinkedChildren ERR", e?.shortMessage ?? e?.name) }
try { console.log("linkage(ourWallet):", JSON.stringify(await markets.client.getPerpWalletLinkage(REG, owner!), (_,v)=>typeof v==="bigint"?v.toString():v)) } catch (e:any) { console.log("linkage ERR", e?.shortMessage ?? e?.name) }
// Simulate proposeLink(child=BOT) from owner (both ours), read-only
const data = encodeFunctionData({ abi: parseAbi(["function proposeLink(address child)"]), functionName: "proposeLink", args: [BOT] })
const r: any = await (await fetch(RPC_URL, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"eth_call", params:[{ from: owner, to: REG, data, gas:"0x989680" }, "latest"] }) })).json()
console.log("simulate proposeLink(ourMain->ourBot):", r.error ? `REVERT ${decodeRevert(r.error.data)}` : `ALLOWED ${r.result?.slice(0,20)}`)
process.exit(0)
