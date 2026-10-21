# SDK has no way to place, cancel or reduce perp orders for a linked wallet (`placeOrderFor` etc.)
Severity: major
Area: SDK

## Steps to reproduce
1. In the app, link a bot key to your app wallet with [Link a Bot](https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot.md). This grants `placeOrderFor`, `cancelOrderFor` and `reduceOrderFor` on every perp pool. `client.isOperatorAuthorized({ pool, owner, operator, selector })` returns `true` for all three selectors on all 21 perp markets.
2. Build a `SomniaMarkets` with the bot key as `privateKey`, as the [developer docs](https://app.testnet.dreamdex.io/docs/developers/perps-testnet/README.md#trade-an-app-wallet-with-a-bot) describe ("link your key to it … the key can then place, cancel and reduce orders for that wallet").
3. Try to place a perp order for the app wallet through `markets.trader`.

## Expected
The SDK offers the operator side of the grant it already helps create. For example, `placePerpOrder({ ..., owner })`, or `placePerpOrderFor` / `cancelOrderFor` / `reduceOrderFor` methods, with the same sizing, tick/lot validation and order-ID parsing as `placePerpOrder`.

## Actual
- `PlacePerpOrderParams` has no `owner` field (`dist/trade.d.ts:729`). `placePerpOrder` always trades the signer's own account, which here is the bot key. That account has no margin, so every order would fail.
- `Trader` has no `placeOrderFor`, `cancelOrderFor` or `reduceOrderFor` method, and no `buildPlace…For` variant. A search of the 0.32.1 typings for these names finds them only in ABIs and comments.
- `Trader` does have the grant side: `setOperatorApprovalForPool` and `setOperatorApprovalGlobal`. So the SDK lets an owner authorize a bot but doesn't let the bot use that authorization.

So every bot that follows the documented Link a Bot flow has to drop down to raw viem calls. It must hand-write the `placeOrderFor` ABI, pick a gas limit itself, and parse the order ID out of the logs. The docs' "Raw and operator calls" section exists to cover these pitfalls (gas limits around 1.56M, decimal scaling, IOC no-fill reverts), which shows the problem is real. The official [bot kit](https://github.com/somnia-chain/dreamdex-bot-kit) doesn't use the SDK for this either: it keeps its own ABI and executor (`packages/core/src/contract.ts`, `packages/core/src/execute.ts → placeOrderFor`).

Smaller related doc errors:
- `setOperatorApprovalForPool` is documented as "Grant or revoke an operator on ONE SpotPool".
- `IsOperatorAuthorizedParams.pool` is documented as "SpotPool the grant applies on".

Both work on PerpPools (step 1 used them on all 21 perp pools), so perps developers reading the typings are told they don't apply.

## Evidence
Operator grant check, from [scripts/link-check.ts](../scripts/link-check.ts): `placeOrderFor` / `cancelOrderFor` / `reduceOrderFor` all return `true` on all 21 perp pools for owner `0xf202…4f59`, operator `0x89a6…Fdd6`.

`PlacePerpOrderParams` in `dist/trade.d.ts` has these fields: `pool`, `isBid`, `price`, `quantity`, `expireTimestampNs`, `orderType`, `selfMatchingOption`, `builder`, `builderFeeBpsTimes1k`, `gas`. There is no `owner`.

The workaround works on-chain, which shows the gap is only in the SDK. A raw viem `placeOrderFor` from the bot key for the app wallet ([scripts/lib/orders.ts](../scripts/lib/orders.ts)):
- Placed: [`0xc57abbdcd64f2c4c8e6c32e5ccbb828774179c3f2b8522203dd1a546c93da213`](https://explorer.testnet.somnia.network/tokyo/tx/0xc57abbdcd64f2c4c8e6c32e5ccbb828774179c3f2b8522203dd1a546c93da213) (ZRO-PERP, gas used 1,631,537)
- Cancelled with raw `cancelOrderFor`: [`0xf483a4ada84f9c2f4fd5fcf9e7f09779b4022bee45b40228afee51872450cbf5`](https://explorer.testnet.somnia.network/tokyo/tx/0xf483a4ada84f9c2f4fd5fcf9e7f09779b4022bee45b40228afee51872450cbf5)

The raw path also needed manual log parsing for the order ID. The OrderPlaced event indexes only `orderId` (`topic[1]`); the owner is in the data field. This is the kind of detail the SDK already handles for `placePerpOrder`.

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Network: Somnia testnet (Hideki, chain ID 50383)
- Owner (app wallet): 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59
- Operator (bot key): 0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6
