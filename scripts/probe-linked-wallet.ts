// Is the linked-wallet / isolated-margin rail live, and has anyone used it? Read-only.
import { createPublicClient, http, parseAbi } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { RPC_URL } from "./client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 30_000, retryCount: 6 }) })
const BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394" as const
const ENGINE = "0xA66d3C24Ad4a389d863846905D8173e1017e9F4D" as const
const bankAbi = parseAbi(["function getLinkedWalletRegistry() view returns (address)"])
const engAbi = parseAbi(["function getLinkedWalletRegistry() view returns (address)"])
let bankReg = "n/a", engReg = "n/a"
try { bankReg = await pc.readContract({ address: BANK, abi: bankAbi, functionName: "getLinkedWalletRegistry" }) as string } catch (e: any) { bankReg = "ERR " + (e?.shortMessage ?? e?.name) }
try { engReg = await pc.readContract({ address: ENGINE, abi: engAbi, functionName: "getLinkedWalletRegistry" }) as string } catch (e: any) { engReg = "ERR " + (e?.shortMessage ?? e?.name) }
console.log({ bankLinkedWalletRegistry: bankReg, engineLinkedWalletRegistry: engReg })

// Indexer usage
const G = "https://hideki-dev.smk.somnia.host/v1/graphql"
const q = async (query: string) => { const r: any = await (await fetch(G, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) })).json(); return r.data ?? r.errors }
for (const t of ["PerpWalletLinkEvent", "PerpMainFundingEvent", "PerpMarginPull"]) {
  const d: any = await q(`{ ${t}_aggregate { aggregate { count } } }`)
  console.log(t, "count:", JSON.stringify(d))
}
console.log("sample link events:", JSON.stringify(await q(`{ PerpWalletLinkEvent(order_by:{id:desc}, limit:5){ id } }`)))
process.exit(0)
