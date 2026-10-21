// Order edge cases, simulated via raw eth_call (no tx sent).
import { markets } from "./client.js"
import { rawPlaceFor } from "./lib/rawcall.js"
import { decodeRevert } from "./lib/errors.js"
import { ORDER } from "./lib/pool.js"

const sym = process.argv[2] ?? "BTC"
const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === sym)!
const tick = BigInt(m.tickSize), lot = BigInt(m.lotSize), min = BigInt(m.minQuantity), mark = BigInt(m.markPrice)
const align = (p: bigint) => (p / tick) * tick
const below = align((mark * 95n) / 100n), above = align((mark * 105n) / 100n)
const farCrossBuy = align((mark * 110n) / 100n), farCrossSell = align((mark * 90n) / 100n)
const nowNs = BigInt(Date.now()) * 1_000_000n
const cases: [string, Parameters<typeof rawPlaceFor>[1]][] = [
  ["baseline resting buy", { isBid: true, price: below, quantity: min }],
  ["price off tick", { isBid: true, price: below + 1n, quantity: min }],
  ["qty off lot", { isBid: true, price: below, quantity: min + 1n }],
  ["qty below min", { isBid: true, price: below, quantity: min - lot }],
  ["qty zero", { isBid: true, price: below, quantity: 0n }],
  ["price zero", { isBid: true, price: 0n, quantity: min }],
  ["price 1 tick", { isBid: true, price: tick, quantity: min }],
  ["price huge (1e40)", { isBid: true, price: 10n ** 40n, quantity: min }],
  ["sell price huge 1000x mark", { isBid: false, price: align(mark * 1000n), quantity: min }],
  ["buy far above mark (crosses)", { isBid: true, price: farCrossBuy, quantity: min }],
  ["sell far below mark (crosses)", { isBid: false, price: farCrossSell, quantity: min }],
  ["expired timestamp", { isBid: true, price: below, quantity: min, expireNs: nowNs - 60_000_000_000n }],
  ["expiry in ms not ns", { isBid: true, price: below, quantity: min, expireNs: BigInt(Date.now() + 3600_000) }],
  ["expiry in seconds", { isBid: true, price: below, quantity: min, expireNs: BigInt(Math.floor(Date.now() / 1000) + 3600) }],
  ["IOC no cross", { isBid: true, price: below, quantity: min, orderType: ORDER.IOC }],
  ["FOK no cross", { isBid: true, price: below, quantity: min, orderType: ORDER.FOK }],
  ["PostOnly crossing", { isBid: true, price: farCrossBuy, quantity: min, orderType: ORDER.POST_ONLY }],
  ["orderType 4 (invalid)", { isBid: true, price: below, quantity: min, orderType: 4 }],
  ["orderType 255", { isBid: true, price: below, quantity: min, orderType: 255 }],
  ["IOC crossing (market buy)", { isBid: true, price: farCrossBuy, quantity: min, orderType: ORDER.IOC }],
  ["IOC crossing (market sell)", { isBid: false, price: farCrossSell, quantity: min, orderType: ORDER.IOC }],
]
const rows = []
for (const [name, o] of cases) {
  const { response } = await rawPlaceFor(m.poolAddress, o)
  rows.push({ case: name, result: response.error ? `REVERT ${decodeRevert(response.error.data)}` : `ok ${String(response.result).slice(0, 2 + 64 * 2)}` })
}
console.log({ sym, mark: mark.toString(), tick: tick.toString(), lot: lot.toString(), min: min.toString() })
console.table(rows)
process.exit(0)
