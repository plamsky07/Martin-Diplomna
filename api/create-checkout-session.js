const Stripe = require("stripe");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, data) {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(data));
}

function readLocalEnv(name) {
  for (const fileName of [".env.local", ".env", "grocery-shop/.env.local", "grocery-shop/.env"]) {
    const filePath = join(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.startsWith(`${name}=`)) continue;
      return trimmed.slice(name.length + 1).replace(/^["']|["']$/g, "");
    }
  }

  return "";
}

module.exports = async function handler(req, res) {
  try {
    setCors(res);

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || readLocalEnv("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      return sendJson(res, 500, { error: "Missing STRIPE_SECRET_KEY" });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-02-25.clover",
    });

    const { items, orderId, clientUrl } = req.body || {};
    const safeItems = Array.isArray(items) ? items : [];

    if (!orderId) return sendJson(res, 400, { error: "Missing orderId" });
    if (!safeItems.length) return sendJson(res, 400, { error: "Cart is empty" });

    const origin = req.headers.origin ? String(req.headers.origin) : "";
    const host = req.headers.host ? `https://${req.headers.host}` : "";
    const baseUrl = String(clientUrl || origin || host).replace(/\/$/, "");

    if (!baseUrl) return sendJson(res, 400, { error: "Missing client URL" });

    const line_items = safeItems.map((item) => ({
      quantity: Math.max(1, Number(item.qty || 1)),
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name || "Product",
          ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
        },
        unit_amount: Math.round(Number(item.price || 0) * 100),
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${baseUrl}/cart?paid=1&orderId=${encodeURIComponent(orderId)}`,
      cancel_url: `${baseUrl}/cart?canceled=1&orderId=${encodeURIComponent(orderId)}`,
      metadata: { orderId },
    });

    return sendJson(res, 200, { url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return sendJson(res, 500, { error: error.message || "Failed to create checkout session" });
  }
};
