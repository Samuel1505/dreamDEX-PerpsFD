import "dotenv/config"
import {
  SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  SomniaMarkets,
} from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"

export const INDEXER_URL = "https://hideki-dev.smk.somnia.host/v1/graphql"

const rawKey = process.env.PRIVATE_KEY?.trim()
const privateKey = rawKey
  ? ((rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`)
  : undefined

export const markets = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: INDEXER_URL,
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  ...(privateKey ? { privateKey } : {}),
})

// BigInt-safe JSON for logging evidence into feedback reports
export const dump = (v: unknown) =>
  JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x), 2)

// App wallet the bot key trades for (Link a Bot). Falls back to the key's own address.
export const owner = (process.env.OWNER_ADDRESS?.trim() || markets.walletAddress) as
  | `0x${string}`
  | undefined

// Raw viem wallet for operator calls the SDK doesn't expose (placeOrderFor / cancelOrderFor).
import { createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
export const RPC_URL = "https://api.hideki2.infra.testnet.somnia.network"
export const wallet = privateKey
  ? createWalletClient({ account: privateKeyToAccount(privateKey), chain: hidekiTestnet, transport: http(RPC_URL) })
  : undefined
