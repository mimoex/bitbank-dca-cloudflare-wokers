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

## Deployment (Cloudflare Web UI only)

This project deploys from **GitHub** via Cloudflare’s dashboard.

1) **Prepare the GitHub repo**
- Push this code to a GitHub repository (public/private both fine).
- Keep secrets **out** of the repo. `wrangler.toml` can stay, but do not put keys there.

2) **Connect GitHub in Cloudflare**
- Go to **Cloudflare Dashboard → Workers & Pages → Create → Worker**.
- Choose **Deploy from Git** (or “Connect to Git”).
- Select your repository and branch (e.g., `main`).
- **Build command**: leave empty (not needed).
- **Root directory**: `/` (project root).
- **Entry**: Cloudflare auto-detects `src/index.js` (module syntax).

3) **Set environment variables & secrets**
- Open your Worker → **Settings → Variables**.
  - **Environment Variables** (plain, non-secret):
    - `DEBUG_MODE` = `false` (default off; enables manual `/run` button page when `true`)
  - **Secrets** (hidden):
    - `API_KEY`
    - `API_SECRET`
- Click **Save and deploy**.

4) **Add the cron trigger**
- Worker → **Triggers → Cron Triggers → Add**.
- Cron expression: `30 0 * * MON` (UTC 00:30 = JST 09:30).
- Save.

5) **Verify**
- Open the Worker URL (e.g., `https://<name>.<account>.workers.dev/`).
  - With `DEBUG_MODE = false`, `/` returns 404 (test UI disabled).
  - For manual testing, temporarily set `DEBUG_MODE = true` in **Settings → Variables**, then:
    - Visit `/` to see the **Execute DCA** button.
    - Pressing it POSTs to `/run` and triggers the job.
    - Turn `DEBUG_MODE` back to `false` after testing.
- Check logs in **Workers → your worker → Logs**.

### Notes
- **Production domain**: optionally add a custom domain/route under **Triggers → HTTP Routes**.
- Keep `API_KEY` / `API_SECRET` in **Secrets** only. Never commit them to Git.
- Cron runs weekly at the specified time regardless of `DEBUG_MODE`.
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
