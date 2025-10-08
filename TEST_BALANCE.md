# Balance Test for Address

Your address: `0x30d3e6ccc894d4df2765383964d70ecedefd4c9c9839a29305202559206f6886`

## Changes Applied:

1. **Removed unnecessary tokens** - Only APT and USDC now
2. **Updated Popular Pairs** - Only APT/USDC and USDC/APT
3. **Cleaner balance fetching** - No more errors for WETH, WBTC, USDT

## What to Expect Now:

### Console Logs:
```
[BalanceService] Starting balance fetch for: 0x30d3e6ccc894d4df2765383964d70ecedefd4c9c9839a29305202559206f6886
[BalanceService] Found X resources
[BalanceService] Checking APT...
[BalanceService] APT balance: X.XXXXXXXX
[BalanceService] Checking USDC...
[BalanceService] Looking for primary fungible store for USDC...
[BalanceService] USDC balance from primary store: 3.00
[BalanceService] Final balances: {APT: X.XX, USDC: 3.00}
[SwapInterface] Balances received: {APT: X.XX, USDC: 3.00}
```

### UI Display:
- FROM field: Should show your APT balance
- TO field: Should show your USDC balance (3.00)
- MAX button: Should work properly
- Only APT and USDC in token selector

## Test Steps:

1. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Open console** (F12)
3. **Make sure Petra wallet is connected**
4. **Navigate to Swap interface**
5. **Watch console logs**
6. **Verify balances show in UI**

## If USDC Still Shows 0.00:

The USDC you have might be using a different metadata address. Let me know and I'll check:
- Wormhole USDC
- Circle Native USDC
- LayerZero USDC (currently configured)

Share the exact console logs if it still doesn't work!
