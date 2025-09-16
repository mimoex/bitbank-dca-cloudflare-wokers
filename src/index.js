// src/index.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Enable test page only when DEBUG_MODE is true
    if (env.DEBUG_MODE === "true") {
      // Show test page with button
      if (url.pathname === "/") {
        return new Response(
          `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>DCA Debug</title></head>
          <body style="font-family:sans-serif; margin:2em;">
            <h1>DCA Debug Mode</h1>
            <form action="/run" method="post">
              <button type="submit">Execute DCA</button>
            </form>
          </body>
          </html>
          `,
          { headers: { "Content-Type": "text/html; charset=UTF-8" } }
        );
      }

      // Handle POST /run (manual execution)
      if (url.pathname === "/run" && request.method === "POST") {
        await executeDCA(env);
        return new Response("✅ DCA executed (manual debug trigger)", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=UTF-8" },
        });
      }
    }

    // Default response: 404
    return new Response("Not Found", { status: 404 });
  },

  // Cron trigger (runs every Monday JST 09:30)
  async scheduled(event, env, ctx) {
    await executeDCA(env);
  },
};

const FGI_API_URL = "https://api.alternative.me/fng/";
const BITBANK_TICKER_URL = "https://public.bitbank.cc/btc_jpy/ticker";
const BASE_INVESTMENT = 30000 / 4; // Weekly investment (example: 30,000 JPY per month)

async function executeDCA(env) {
  const fgi = await getFGIValue();
  if (fgi == null) return;

  const currentPrice = await getCurrentBTCPrice();
  if (currentPrice == null) return;

  const limitPrice = getLimitPrice(currentPrice);
  const investmentParent = calculateInvestment(fgi, BASE_INVESTMENT);
  const btcParent = +(investmentParent / limitPrice).toFixed(4);
  const orderBTC = btcParent * 2;

  console.log(`Order: ${btcParent} BTC @ ${limitPrice}`);
  await placeOrder(env, limitPrice, orderBTC);
}

async function getFGIValue() {
  try {
    const res = await fetch(FGI_API_URL);
    const data = await res.json();
    const fgi = parseInt(data.data[0].value);
    console.log("Fear and Greed Index:", fgi, data.data[0].value_classification);
    return fgi;
  } catch (e) {
    console.error("Error fetching FGI:", e);
    return null;
  }
}

async function getCurrentBTCPrice() {
  try {
    const res = await fetch(BITBANK_TICKER_URL);
    const data = await res.json();
    return parseFloat(data.data.last);
  } catch (e) {
    console.error("Error fetching BTC price:", e);
    return null;
  }
}

function calculateInvestment(fgi, base) {
  if (fgi <= 20) return base * 2;
  if (fgi <= 40) return base * 1.5;
  if (fgi <= 60) return base;
  if (fgi <= 80) return base * 0.75;
  return base * 0.5;
}

function getLimitPrice(price) {
  const adjusted = price * 0.995;
  return Math.floor(adjusted / 1000) * 1000;
}

async function placeOrder(env, price, size) {
  if (size < 0.0001) {
    console.error("⚠ Order skipped: below minimum size (0.0001 BTC).");
    return;
  }

  const path = "/v1/user/spot/order";
  const url = "https://api.bitbank.cc" + path;
  const requestTime = Date.now().toString();
  const timeWindow = "5000";

  const body = {
    pair: "btc_jpy",
    amount: size.toFixed(6),
    price: String(price),
    side: "buy",
    type: "limit",
    post_only: true,
  };
  const bodyJSON = JSON.stringify(body);
  const message = requestTime + timeWindow + bodyJSON;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const signature = Array.from(new Uint8Array(signatureBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const headers = {
    "ACCESS-KEY": env.API_KEY,
    "ACCESS-SIGNATURE": signature,
    "ACCESS-REQUEST-TIME": requestTime,
    "ACCESS-TIME-WINDOW": timeWindow,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, { method: "POST", headers, body: bodyJSON });
  if (res.ok) {
    const result = await res.json();
    if (result.success === 1) {
      console.log("[OK] Order successful:", result.data);
    } else {
      console.error("[NG] Order failed:", result);
    }
  } else {
    console.error("[NG] HTTP error:", res.status, await res.text());
  }
}
