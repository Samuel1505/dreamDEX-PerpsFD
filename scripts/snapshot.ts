// Every SDK view of one account+market, chain and indexer, for cross-checking.
import { markets, owner, dump } from "./client.js"

export async function snapshot(m: any) {
  const ref = { pool: m.poolAddress, marginBank: m.marginBank, account: owner! }
  const safe = async (f: () => Promise<unknown>) => { try { return await f() } catch (e: any) { return `ERR ${e?.name}: ${e?.message?.split("\n")[0]}` } }
  return {
    marginAccount: await safe(() => markets.client.getMarginAccount(m.marginBank, owner!)),
    position: await safe(() => markets.client.getPerpPosition(ref)),
    analytics: await safe(() => markets.client.getPerpPositionAnalytics(ref)),
    liquidationPrice: await safe(() => markets.client.getLiquidationPrice(ref)),
    closePreview: await safe(() => markets.client.previewPerpClosePnl(ref)),
    indexerPositions: await safe(() => markets.client.listPerpPositions(owner!, { pool: m.poolAddress })),
    portfolio: await safe(() => markets.client.getPerpPortfolio(owner!)),
  }
}

if (process.argv[1]?.endsWith("snapshot.ts")) {
  const m = ((await markets.client.listPerpMarkets()) as any[]).find((x) => x.baseSymbol === (process.argv[2] ?? "BTC"))!
  console.log(dump(await snapshot(m)))
  process.exit(0)
}
