// Which contract errors in the SDK's own error ABI never appear anywhere in the dreamDEX docs?
import { contractErrorsAbi } from "@somnia-chain/markets-sdk"
import { toFunctionSelector } from "viem"

const docs = await (await fetch("https://app.testnet.dreamdex.io/llms-full.txt")).text()
const words = new Set(docs.match(/[A-Za-z_][A-Za-z0-9_]*/g))
const errs = new Map<string, string>()
for (const e of contractErrorsAbi as readonly any[]) {
  if (e.type !== "error" || errs.has(e.name)) continue
  errs.set(e.name, toFunctionSelector(`function ${e.name}(${e.inputs.map((i: any) => i.type).join(",")})`))
}
const perp = /Margin|Collateral|Voucher|Liquidat|Position|Leverage|Isolated|Insurance|Funding|Mark|Adl|Circuit|FillPrice|Credit|Linked|Main|Child|Bidder|Somi|Trigger|Perp|OpenInterest|Feed|Band|Deficit|Reduce|Registry|Oracle/
const all = [...errs.keys()], perpErrs = all.filter((n) => perp.test(n))
const missing = (xs: string[]) => xs.filter((n) => !words.has(n))
console.log(`docs size: ${docs.length} chars`)
console.log(`SDK contract errors: ${all.length}, absent from dreamDEX docs: ${missing(all).length}`)
console.log(`perp-related errors: ${perpErrs.length}, absent from dreamDEX docs: ${missing(perpErrs).length}`)
const spotlight = ["InsufficientMarginForOrder", "MarkPriceUnavailable", "OraclePriceStale", "CircuitBreakerTriggered", "FillPriceOutsideBand",
  "OpenInterestCapExceeded", "InsufficientMarginAfterWithdrawal", "VoucherMarketNotAllowed", "VoucherLeverageCapNotSet", "MarketRestricted",
  "RegistryNotApprovedByOwner", "ReduceOnlyBudgetExceeded", "NoOpenPosition", "InvalidLeverage", "InsufficientCollateral", "MaxPositionSizeExceeded"]
console.table(spotlight.map((n) => ({ error: n, selector: errs.get(n), inDreamDexDocs: words.has(n) })))
process.exit(0)
