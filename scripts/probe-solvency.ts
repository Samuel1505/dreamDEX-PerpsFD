// Is the MarginBank's real USDso balance enough to back booked collateral + voucher budget?
// Hardcoded addresses (from the dev docs) to avoid the indexer. Retries on transient RPC errors.
import { createPublicClient, http, parseAbi, formatEther } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { RPC_URL } from "./client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL, { timeout: 30_000, retryCount: 6, retryDelay: 1500 }) })
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)", "function totalSupply() view returns (uint256)"])
const vd = parseAbi(["function budgetRemaining() view returns (uint256)"])
const COLLATERAL = "0xed7993A74dAe1e6656B704A424DcD8711aAf4F72" as const // perps USDso (quoteToken)
const BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394" as const
const DIST = "0x2ACD9EFdA721450906bfE1bef3edE269636E42C4" as const
const INS = "0x50826894D47C6D4f3BeA38BFDC7Dc5c5be171b80" as const
const bal = (a: `0x${string}`) => pc.readContract({ address: COLLATERAL, abi: erc20, functionName: "balanceOf", args: [a] }) as Promise<bigint>
const [supply, bankBal, distBal, insBal] = await Promise.all([
  pc.readContract({ address: COLLATERAL, abi: erc20, functionName: "totalSupply" }) as Promise<bigint>,
  bal(BANK), bal(DIST), bal(INS),
])
let budget = 0n; try { budget = await pc.readContract({ address: DIST, abi: vd, functionName: "budgetRemaining" }) as bigint } catch {}
console.log({
  totalSupply: formatEther(supply),
  marginBankUSDso: formatEther(bankBal),
  voucherDistributorUSDso: formatEther(distBal),
  insuranceFundUSDso: formatEther(insBal),
  distributorBudgetRemaining: formatEther(budget),
  distributorRealTokensCoverBudget: distBal >= budget,
  sumHeldVsSupply: formatEther(bankBal + distBal + insBal) + " / " + formatEther(supply),
})
process.exit(0)
