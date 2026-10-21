// Repro for feedback/01: a read documented as throwing SignerRequiredError works with no signer.
import {
  SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  SomniaMarkets,
} from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { INDEXER_URL, dump } from "../client.js"

const readOnly = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: INDEXER_URL,
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
})
const [m] = (await readOnly.client.listPerpMarkets()) as any[]
const v = await readOnly.client.getPerpVoucher(m.marginBank, "0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6")
console.log("getPerpVoucher with no signer:", dump(v))
process.exit(0)
