# Helius Webhook Configuration Guide

## Complete Setup Instructions

### Step 1: Webhook Configuration in Helius Dashboard

1. **Network**: Select `mainnet` (or `devnet` for testing)

2. **Webhook Type**: Select `enhanced`

3. **Transaction Type(s)**: 
   - If available, you can select `create_pool` or similar
   - **OR** leave as "Any" to capture all transactions (we'll filter by program IDs)

4. **Webhook URL**: 
   ```
   https://indexer.dxra.me/webhook/raydium
   ```

5. **Authentication Header**: (Optional)
   - Leave empty - we'll use webhook ID for validation
   - The webhook ID is found in your Helius dashboard (e.g., `0d64f9db-85a1-40f1-91c7-cb43308906f2`)

6. **Account Addresses** (IMPORTANT - This is where you add the program IDs):
   
   Click "Manage Addresses" and add these **3 Raydium program IDs**:

   **For Mainnet:**
   ```
   675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8
   CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C
   CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK
   ```

   **For Devnet:**
   ```
   DRaya7Kj3aMWQSy19kSjvmuwq9docCHofyP9kanQGaav
   DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb
   DRayAUgENGQBKVaX8owNhgzkEDyoHTGVEGHVJT1E9pfH
   ```

   **What each program ID is:**
   - `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` = AMM v4
   - `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` = CPMM
   - `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` = CLMM

7. **Confirm** the webhook configuration

---

## Why Account Addresses?

The **Account Addresses** section is where you tell Helius which Solana programs to monitor. By adding the Raydium program IDs:

- Helius will only send webhooks for transactions that involve these programs
- This filters out irrelevant transactions and saves credits
- Your indexer will receive webhooks when pools are created by these programs

---

## Verification

After setting up the webhook:

1. **Test the webhook endpoint:**
   ```bash
   curl -X POST https://indexer.dxra.me/webhook/raydium
   ```
   Should return `401 Unauthorized` (expected without secret)

2. **Check your application logs:**
   ```bash
   pm2 logs dxra-indexer
   ```

3. **Wait for a pool creation** - When a new Raydium pool is created, you should see:
   - Webhook received in logs
   - Pool detected message: `Detected new AMMV4 pool on mainnet: ...`
   - Pool saved to `data/pools-mainnet.json`

---

## Troubleshooting

### Webhook not receiving data

1. **Verify Account Addresses are correct:**
   - Double-check all 3 program IDs are added
   - Make sure you're using mainnet IDs for mainnet, devnet IDs for devnet

2. **Check webhook URL is accessible:**
   ```bash
   curl https://indexer.dxra.me/webhook/raydium
   ```

3. **Verify your server is running:**
   ```bash
   pm2 list
   pm2 logs dxra-indexer
   ```

4. **Check Helius webhook status:**
   - Go to Helius Dashboard → Webhooks
   - Check if webhook is active and receiving events
   - Look for any error messages

### No pools detected

1. **Check transaction logs:**
   - Verify transactions are being received
   - Check if log messages contain the expected patterns:
     - AMMV4: `InitializeInstruction2`
     - CPMM: `init_pool` or `initialize`
     - CLMM: `create_pool` or `initialize_pair`

2. **Verify program IDs match:**
   - Ensure the program IDs in transactions match the ones in your config
   - Check network (mainnet vs devnet)

---

## Environment Variable Setup

After configuring the webhook in Helius, add your webhook ID to your `.env` file:

```env
HELIUS_WEBHOOK_ID=0d64f9db-85a1-40f1-91c7-cb43308906f2
```

**Where to find your webhook ID:**
- Go to Helius Dashboard → Webhooks
- Click on your webhook
- The webhook ID is displayed (format: `xxxx-xxxx-xxxx-xxxx-xxxx`)

## Summary

✅ **Account Addresses section** = Add the 3 Raydium program IDs  
✅ **Transaction Type** = Can be "create_pool" or "Any" (filtering happens via Account Addresses)  
✅ **Webhook URL** = `https://indexer.dxra.me/webhook/raydium`  
✅ **Network** = mainnet (or devnet for testing)  
✅ **Webhook ID** = Add to `.env` file as `HELIUS_WEBHOOK_ID`

The Account Addresses section is the key - that's where Helius knows which programs to monitor!

