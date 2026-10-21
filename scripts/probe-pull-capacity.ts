import { markets, owner, dump } from "./client.js"
const BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394" as const
const BOT = markets.walletAddress!
for (const [label, acct] of [["app wallet (voucher 1000)", owner!], ["bot key (empty)", BOT]] as const) {
  try { console.log(label, "pullCapacity:", dump(await markets.client.getPerpWalletPullCapacity(BANK, acct))) } catch (e: any) { console.log(label, "pullCapacity ERR", e?.shortMessage ?? e?.name) }
  try { console.log(label, "mainFunding:", dump(await markets.client.getPerpMainFunding(BANK, acct))) } catch (e: any) { console.log(label, "mainFunding ERR", e?.shortMessage ?? e?.name) }
}
process.exit(0)
