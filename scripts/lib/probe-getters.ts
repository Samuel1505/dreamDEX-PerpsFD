// Try candidate view getters on a contract; print the ones that answer.
import { createPublicClient, http, parseAbi } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { RPC_URL } from "../client.js"
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC_URL) })
const addr = process.argv[2] as `0x${string}`
const names = ["slippageToleranceBps","slippageBps","marketSlippageBps","maxSlippageBps","marketOrderSlippageBps","slippageTolerance","defaultSlippageBps","minStopDistanceBps","perpPool","pool","marginBank","orderBook","somiPaymentPerOrder","owner","subscriptionId","gasLimit","triggerGasLimit","maxOrdersPerTrigger","emaThreshold","priceFeed","markPriceFeed","operatorRegistry","version","VERSION"]
for (const n of names) {
  for (const ret of ["uint256", "address"]) {
    try { const v = await pc.readContract({ address: addr, abi: parseAbi([`function ${n}() view returns (${ret})`]), functionName: n as any }); console.log(n, "=", String(v)); break } catch {}
  }
}
process.exit(0)
