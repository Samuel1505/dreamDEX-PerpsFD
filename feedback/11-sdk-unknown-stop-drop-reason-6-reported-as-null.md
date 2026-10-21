# SDK doesn't know perp stop drop reason 6: failed stops are reported with `dropReason: null`
Severity: normal
Area: SDK

## Steps to reproduce
1. Take perp stop `0x52e2ccebaec9332672c247e9a90aa3d61fb615ef_4316538113248035079316` (BTC-PERP registry, owner `0x96952c957590d58d245d38476030ea9adb3ef3d3`).
2. Read its trigger log on-chain: `PendingOrderTriggered(uint128 indexed pendingOrderId, bool success, uint8 dropReason, uint128 indexed placedOrderId)` in tx `0x7546159190c92ffdc3e15182004c7aa7ab150ccc4402c433391d8c23051eb491` (block 22512846). Script: [scripts/lib/stop-trigger-log.ts](../scripts/lib/stop-trigger-log.ts).
3. Call `client.listPerpStopOrders({ account: owner, status: ["TRIGGER_FAILED"] })` and find the row. Script: [scripts/repro/11-stop-drop-reason-6.ts](../scripts/repro/11-stop-drop-reason-6.ts).

## Expected
The SDK decodes every drop reason the registry emits, so a UI can tell the trader why their stop fired and did nothing.

## Actual
- The registry emits `success = false, dropReason = 6`.
- `PERP_STOP_DROP_REASON` in 0.32.1 stops at index 5: `["None","ReduceOnlyNoPosition","ReduceOnlyWrongSide","ReduceOnlyBelowMinQty","PlacementFailed","NoFill"]`.
- So `listPerpStopOrders` returns `status: "TRIGGER_FAILED", dropReason: null`, the same value it uses for "no drop".
- Five perp stops have this reason so far. All five were MARKET stop-losses whose position stayed open afterwards (owners `0x9695…f3d3`, `0xa350…711c`, `0x33e2…ededc`, `0x7b9f…afe2` and one more).
- The SDK's own comment in `dist/perp/stops.js` says the registry "demonstrably appends to its enums — `DropReason` gained `NoFill`". Reason 6 is the next such addition, and the shipped SDK, the one the app runs, doesn't know it.

Impact: a trader whose stop-loss fired and did nothing sees no reason. A UI can't distinguish this from a normal trigger without reading raw logs. Reason 6 also appears nowhere in the dreamDEX or Somnia Markets docs.

Suggested fix: add the seventh `DropReason` member to `PERP_STOP_DROP_REASON` and to the docs. Surface unknown indices as something like `"Unknown(6)"` rather than `null`, so a failed stop never shows "no reason".

## Evidence
On-chain log decoded:
```
{ block: '22512846', tx: '0x7546159190c92ffdc3e15182004c7aa7ab150ccc4402c433391d8c23051eb491',
  args: { pendingOrderId: '4316538113248035079316', placedOrderId: '0', success: false, dropReason: 6 } }
```
SDK output:
```
SDK PERP_STOP_DROP_REASON: [ 'None', 'ReduceOnlyNoPosition', 'ReduceOnlyWrongSide', 'ReduceOnlyBelowMinQty', 'PlacementFailed', 'NoFill' ]
listPerpStopOrders row: { "id": "0x52e2…f615ef_4316538113248035079316", "status": "TRIGGER_FAILED", "dropReason": null }
```

## Environment
- SDK: @somnia-chain/markets-sdk 0.32.1
- Network: Somnia testnet (Hideki, chain ID 50383)
- Reporter wallet: 0xf202e4d6caA5Cfda981608AD98DdD35568b74f59 (read-only)
