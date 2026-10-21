// A perp stop whose on-chain PendingOrderTriggered.dropReason is 6: what does the SDK report?
import { PERP_STOP_DROP_REASON } from "@somnia-chain/markets-sdk"
import { markets } from "../client.js"
const owner = "0x96952c957590d58d245d38476030ea9adb3ef3d3"
const rows: any[] = await markets.client.listPerpStopOrders({ account: owner, status: ["TRIGGER_FAILED"] as any, limit: 100 })
const row = rows.find((r) => String(r.id).endsWith("4316538113248035079316"))
console.log("SDK PERP_STOP_DROP_REASON:", PERP_STOP_DROP_REASON)
console.log("listPerpStopOrders row:", JSON.stringify({ id: row?.id, status: row?.status, dropReason: row?.dropReason }, null, 1))
process.exit(0)
