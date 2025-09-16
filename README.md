# Bitbank DCA with Cloudflare Workers

Automated Bitcoin **Dollar-Cost Averaging (DCA)** orders on [Bitbank](https://bitbank.cc) using **Cloudflare Workers**.  
This Worker runs once a week (every Monday 9:30 JST) and places a limit order based on the current BTC/JPY price and the Fear & Greed Index (FGI).

---

## Features

- Runs fully serverless on **Cloudflare Workers**
- Triggered weekly using **Cron Triggers**
- Fetches the **Fear & Greed Index** from [alternative.me](https://alternative.me/crypto/fear-and-greed-index/)
- Fetches current BTC/JPY ticker price from **Bitbank Public API**
- Calculates dynamic investment amounts based on FGI
- Places **limit buy orders** on Bitbank via the Private API
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
   npx wrangler secret put API_KEY
   npx wrangler secret put API_SECRET
   ```

4. **Deploy**

   ```bash
   npx wrangler deploy
   ```

---

## Logs

Use Wrangler tail to view execution logs in real time:

```bash
npx wrangler tail
```

Example output:

```
[2025-09-22T00:30:01Z] Fear and Greed Index: 38 Neutral
[2025-09-22T00:30:01Z] Parent: 0.0123 BTC @ 6870000 JPY
[2025-09-22T00:30:01Z] Child: 0.0045 BTC @ 6870000 JPY
[2025-09-22T00:30:02Z] ✅ Order placed successfully
```

---

## Security Notes

* **Never commit your API\_KEY or API\_SECRET** to the repository.
* Use Cloudflare Secrets to securely store credentials.
* This project is for **educational and personal use**. Use at your own risk.
* Cryptocurrency trading carries financial risk. Ensure you understand the implications before deploying.

---

## License

MIT License © 2025
