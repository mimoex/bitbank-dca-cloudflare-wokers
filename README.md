# Bitbank DCA with Cloudflare Workers

Automated Bitcoin **Dollar-Cost Averaging (DCA)** orders on [Bitbank](https://bitbank.cc) using [**Cloudflare Workers**](https://workers.cloudflare.com/).

This Worker runs once a week (every Monday 9:30 JST) and places a limit order based on the current BTC/JPY price and the Fear & Greed Index (FGI).

---

## Features

- Runs fully serverless on **Cloudflare Workers**
- Triggered weekly using [**Cron Triggers**](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- Fetches the **Fear & Greed Index** from [alternative.me](https://alternative.me/crypto/fear-and-greed-index/)
- Fetches current BTC/JPY ticker price from [**Bitbank Public API**](https://github.com/bitbankinc/bitbank-api-docs/blob/master/public-api.md)
- Calculates dynamic investment amounts based on FGI
- Places **limit buy orders** on Bitbank via the [Private API](https://github.com/bitbankinc/bitbank-api-docs/blob/master/rest-api.md)
- Secure API key/secret management via **Cloudflare Secrets**
- GitHub repository stores only the source code (no credentials)

---

## Project Structure

```

bitbank-dca-worker/
├─ src/
│   └─ index.js       # Cloudflare Worker code
├─ wrangler.toml      # Worker configuration
└─ README.md          # Project documentation

````

---

## How It Works

1. **Scheduled execution**  
   - Cron trigger: `30 0 * * MON` (UTC 0:30 = JST 9:30)  
   - The Worker fetches FGI and BTC/JPY price.

2. **Investment calculation**  
   - Higher investment when market sentiment is *fearful*  
   - Lower investment when market sentiment is *greedy*  

3. **Limit order placement**  
   - Limit price = 0.5% below current price, rounded to nearest 1,000 JPY  
   - Uses HMAC-SHA256 signature for Bitbank Private API authentication  
   - Skips orders below **0.0001 BTC** (minimum order size)

---

## Deployment

1. **Create a Cloudflare Worker**  
   ```bash
   npm create cloudflare@latest
    ```

2. **Configure wrangler.toml**
   Example:

   ```toml
   name = "bitbank-dca"
   main = "src/index.js"
   compatibility_date = "2025-09-16"

   [triggers]
   crons = ["30 0 * * MON"] # JST 09:30
   ```

3. **Add secrets**

   ```bash
   npx wrangler --name "worker_name" secret put API_KEY
   npx wrangler --name "worker_name" secret put API_SECRET
   ```

4. **Deploy**

   ```bash
   npx wrangler deploy
   ```

---

## Logs

Use Wrangler tail to view execution logs in real time:

```bash
npx wrangler tail "worker_name"
```

Example output:

```
GET https://ownproject.workers.dev/ - Ok @ 2025/9/16 15:29:34
  (log) Fear and Greed Index: 52 Neutral
  (log) 今週の購入額: 0.0004 BTC @ 16976000
  (log) [OK] 注文成功: {
  order_id: 49797220968,
  pair: 'btc_jpy',
  side: 'buy',
  type: 'limit',
  start_amount: '0.0008',
  remaining_amount: '0.0008',
  executed_amount: '0.0000',
  user_cancelable: true,
  price: '16976000',
  average_price: '0',
  ordered_at: 1758004174507,
  status: 'UNFILLED',
  expire_at: 1773556174507,
  post_only: true
}
```

---

## Security Notes

* **Never commit your API\_KEY or API\_SECRET** to the repository.
* Use Cloudflare Secrets to securely store credentials.
* This project is for **educational and personal use**. Use at your own risk.
* Cryptocurrency trading carries financial risk. Ensure you understand the implications before deploying.

---
# Bitbank DCA with Cloudflare Workers

Automated Bitcoin Dollar-Cost Averaging (DCA) orders on Bitbank using Cloudflare Workers.  
This Worker runs once a week (every Monday 9:30 JST) and places a limit order based on the current BTC/JPY price and the Fear & Greed Index (FGI).

---

## Debug Mode (Manual Testing)

In addition to the scheduled cron job, you can enable a **debug mode** that provides a simple web page with a button to trigger DCA manually.

### Configuration

In `wrangler.toml`:

```toml
[vars]
DEBUG_MODE = "false" # default: disabled
````

* Set `DEBUG_MODE = "true"` to enable the test page.
* When enabled, visiting the Worker root URL (`/`) shows a page with a button:

  * Pressing the button sends a POST request to `/run`, which triggers `executeDCA()`.
* When disabled (`false`), the Worker always returns **404** for `/` and `/run`.

This way, you can safely test manual execution without exposing it during normal operation.
