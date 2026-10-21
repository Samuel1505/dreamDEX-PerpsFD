// Read-only battery against the link registry + bank: consent/validation logic.
// All eth_call (no state change). Uses our two own addresses; dead addr only as an unrelated input.
import { parseAbi, encodeFunctionData } from "viem"
import { markets, owner, RPC_URL } from "./client.js"
import { decodeRevert } from "./lib/errors.js"
const REG = "0x5b3C5Bf1F7AdA852e8AA783f6299932E32073aFb" as const
const BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394" as const
const MAIN = owner!                              // our app wallet
const CHILD = markets.walletAddress!             // our bot key
const DEAD = "0x000000000000000000000000000000000000dEaD" as const
const regAbi = parseAbi(["function proposeLink(address child)","function acceptLink(address main)","function cancelLinkProposal(address child)","function unlink(address counterparty)"])
const bankAbi = parseAbi(["function recallFromChild(address child, uint256 amount)","function repayFunding(uint256 amount)"])
const sim = async (from: string, to: string, abi: any, fn: string, args: any[]) => {
  const data = encodeFunctionData({ abi, functionName: fn, args })
  const r: any = await (await fetch(RPC_URL, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"eth_call", params:[{ from, to, data, gas:"0x989680" }, "latest"] }) })).json()
  return r.error ? `REVERT ${decodeRevert(r.error.data)}` : `ALLOWED`
}
const T: [string, Promise<string>][] = [
  ["proposeLink(self)                 main->main",  sim(MAIN, REG, regAbi, "proposeLink", [MAIN])],
  ["proposeLink(child)                main->bot",   sim(MAIN, REG, regAbi, "proposeLink", [CHILD])],
  ["proposeLink(dead)                 main->dead",  sim(MAIN, REG, regAbi, "proposeLink", [DEAD])],
  ["acceptLink(no proposal)           bot<-main",   sim(CHILD, REG, regAbi, "acceptLink", [MAIN])],
  ["acceptLink(self)                  main<-main",  sim(MAIN, REG, regAbi, "acceptLink", [MAIN])],
  ["cancelLinkProposal(none)          main",        sim(MAIN, REG, regAbi, "cancelLinkProposal", [CHILD])],
  ["unlink(not linked)               main/bot",     sim(MAIN, REG, regAbi, "unlink", [CHILD])],
  ["unlink(self)                     main/main",    sim(MAIN, REG, regAbi, "unlink", [MAIN])],
  ["recallFromChild(not linked,1)    main",         sim(MAIN, BANK, bankAbi, "recallFromChild", [CHILD, 1n])],
  ["recallFromChild(huge)            main",         sim(MAIN, BANK, bankAbi, "recallFromChild", [CHILD, 10n**30n])],
  ["recallFromChild(self)            main",         sim(MAIN, BANK, bankAbi, "recallFromChild", [MAIN, 1n])],
  ["repayFunding(no principal,1)     bot",          sim(CHILD, BANK, bankAbi, "repayFunding", [1n])],
]
for (const [label, p] of T) console.log(label.padEnd(38), await p)
process.exit(0)
