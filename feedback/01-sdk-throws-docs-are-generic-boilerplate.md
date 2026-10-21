# SDK JSDoc `@throws` lists the same 17 errors with identical text on every method
Severity: normal
Area: SDK

## Steps to reproduce
1. `npm i @somnia-chain/markets-sdk@0.32.1`
2. Open `node_modules/@somnia-chain/markets-sdk/dist/somniaMarketsClient.d.ts`, or hover any client method in an editor.
3. Count the boilerplate lines:
   ```sh
   grep -c 'A supplied RPC constructor or socket interrupts this chain read' \
     node_modules/@somnia-chain/markets-sdk/dist/somniaMarketsClient.d.ts
   # 959
   grep -c '@throws {BridgeLiquidityError}' \
     node_modules/@somnia-chain/markets-sdk/dist/somniaMarketsClient.d.ts
   # 113
   ```
4. Look at a read-only perps method, for example `getPerpVoucher` (lines 4573–4591) or `getMaxPerpOrderSize`.

## Expected
Each method's `@throws` lists the errors that method can actually throw, with a description of when each one happens. A read-only call shouldn't claim to throw signer or transaction errors, and a perps read shouldn't claim to throw bridge errors.

## Actual
Every method has the same block of 17 `@throws` tags (InvalidInputError, NotConfiguredError, NotSupportedError, SignerRequiredError, IndexerError, IndexerUnavailableError, IndexerWaitTimeoutError, RpcError, ContractRevertError, TransactionOutcomeUnknownError, FillHistoryRestartRequiredError, FillHistoryUnavailableError, IncompleteHistoryError, CollateralOnWrongChainError, BridgeLiquidityError, BridgeDeliveryTimeoutError, InvariantError). Every tag has the same description:

> A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.

That text applies to almost none of them, and it is wrong for write methods, which aren't "chain reads".

Example: `getPerpVoucher(marginBank, account)` is documented as throwing `SignerRequiredError`, `TransactionOutcomeUnknownError`, `BridgeLiquidityError` and `BridgeDeliveryTimeoutError`. It runs fine on a client built with no private key (see Evidence).

Impact: developers can't use the docs to decide which errors to handle (for example, which errors are worth retrying). Because every method lists everything, the list carries no information.

## Evidence
Repro script: [scripts/repro/01-throws-boilerplate.ts](../scripts/repro/01-throws-boilerplate.ts). It calls `getPerpVoucher` on a `SomniaMarkets` client with no `privateKey`:

```
getPerpVoucher with no signer: {
  "claimed": false,
  "floor": "0",
  "expiresAt": "0"
}
```

Excerpt, `somniaMarketsClient.d.ts` right above `getPerpVoucher`:
```
 * @throws {SignerRequiredError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
 * @throws {TransactionOutcomeUnknownError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
 * @throws {BridgeLiquidityError} A supplied RPC constructor or socket interrupts this chain read with this SDK error. The owning read retains its identity.
 ...
getPerpVoucher(marginBank: Address, account: Address): Promise<PerpVoucher | null>;
```

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Network: Somnia testnet (Hideki, chain ID 50383)
- Wallet: 0x89a68d0731F9Bc419d606f1F31Ead04c3fBDFdd6
