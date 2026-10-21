import { decodeEventLog, parseAbi } from "viem"
import { markets } from "../client.js"
const abi = parseAbi(["event OrderFilled(uint128 indexed takerOrderId, uint128 indexed makerOrderId, uint256 quantityFilled, uint256 takerRemainingQuantity, uint256 makerRemainingQuantity, uint256 fillPrice)"])
export async function fillsOf(hash: `0x${string}`) {
  const r = await markets.client.getViemClient().getTransactionReceipt({ hash })
  const out = []
  for (const l of r.logs) { try { const d: any = decodeEventLog({ abi, data: l.data, topics: l.topics as any }); out.push({ qty: d.args.quantityFilled, price: d.args.fillPrice }) } catch {} }
  return { block: r.blockNumber, fills: out }
}
if (process.argv[1]?.endsWith("fills.ts")) { console.log(await fillsOf(process.argv[2] as `0x${string}`)); process.exit(0) }
