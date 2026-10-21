import { contractErrorsAbi } from "@somnia-chain/markets-sdk"
import { decodeErrorResult, type Hex } from "viem"
/** Decode revert data against the SDK's full contract error ABI. */
export function decodeRevert(data?: Hex | string): string {
  if (!data || data === "0x") return "bare revert (no data)"
  try {
    const r = decodeErrorResult({ abi: contractErrorsAbi as any, data: data as Hex })
    return `${r.errorName}(${(r.args ?? []).map(String).join(",")})`
  } catch { return `unknown ${data.slice(0, 10)}` }
}
