import { decodeErrorResult, parseAbi, zeroAddress, type Hex } from "viem"

export const POOL_ABI = parseAbi([
  "function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
  "function cancelOrderFor(address owner, uint128 orderId)",
  "function getOrderBookParameters() view returns (uint256 tickSize, uint256 minQuantity, uint256 lotSize)",
  "error VoucherMarketNotAllowed()",
  "error VoucherLeverageCapNotSet()",
  "error InsufficientCollateral()",
  "error ImmediateOrCancelNoFill()",
  "error MaxPositionSizeExceeded()",
  "error IsolatedMarketBlocked()",
])

export const ORDER = { LIMIT: 0, FOK: 1, IOC: 2, POST_ONLY: 3 } as const
export const GTC_NS = BigInt(Date.now() + 365 * 86400_000) * 1_000_000n

export const orderArgs = (o: {
  owner: `0x${string}`; isBid: boolean; price: bigint; quantity: bigint; orderType?: number; expireNs?: bigint
}) => [o.owner, o.isBid, 0n, o.price, o.quantity, o.expireNs ?? GTC_NS, o.orderType ?? ORDER.LIMIT, 0, zeroAddress, 0n] as const

/** Best-effort revert name from a viem error. */
export function revertName(e: any): string {
  const named = e?.walk?.((x: any) => x?.data?.errorName)?.data?.errorName
  if (named) return named
  const raw = e?.walk?.((x: any) => typeof x?.raw === "string")?.raw
  const data: Hex | undefined = raw ?? e?.walk?.((x: any) => typeof x?.data === "string")?.data
  if (typeof data === "string" && data.startsWith("0x") && data.length >= 10) {
    try { return decodeErrorResult({ abi: POOL_ABI, data }).errorName } catch { return `unknown selector ${data.slice(0, 10)}` }
  }
  return e?.shortMessage ?? e?.message?.split("\n")[0] ?? String(e)
}
