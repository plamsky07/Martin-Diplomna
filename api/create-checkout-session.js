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

function appendLineItem(params, item, index) {
  params.append(`line_items[${index}][quantity]`, String(Math.max(1, Number(item.qty || 1))));
  params.append(`line_items[${index}][price_data][currency]`, "eur");
  params.append(`line_items[${index}][price_data][product_data][name]`, item.name || "Product");
  if (item.imageUrl) {
    params.append(`line_items[${index}][price_data][product_data][images][0]`, item.imageUrl);
  }
  params.append(
    `line_items[${index}][price_data][unit_amount]`,
    String(Math.round(Number(item.price || 0) * 100))
  );
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

    const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || readLocalEnv("STRIPE_SECRET_KEY"))
      .replace(/^\uFEFF/, "")
      .trim();

    if (!stripeSecretKey) {
      return sendJson(res, 500, { error: "Missing STRIPE_SECRET_KEY" });
    }

    const { items, orderId, clientUrl } = req.body || {};
    const safeItems = Array.isArray(items) ? items : [];

    if (!orderId) return sendJson(res, 400, { error: "Missing orderId" });
    if (!safeItems.length) return sendJson(res, 400, { error: "Cart is empty" });

    const origin = req.headers.origin ? String(req.headers.origin) : "";
    const host = req.headers.host ? `https://${req.headers.host}` : "";
    const baseUrl = String(clientUrl || origin || host).replace(/\/$/, "");

    if (!baseUrl) return sendJson(res, 400, { error: "Missing client URL" });

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${baseUrl}/cart?paid=1&orderId=${encodeURIComponent(orderId)}`);
    params.append("cancel_url", `${baseUrl}/cart?canceled=1&orderId=${encodeURIComponent(orderId)}`);
    params.append("metadata[orderId]", orderId);
    safeItems.forEach((item, index) => appendLineItem(params, item, index));

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const session = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok || !session.url) {
      return sendJson(res, stripeRes.status || 500, {
        error: session?.error?.message || "Failed to create Stripe checkout session",
      });
    }

    return sendJson(res, 200, { url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return sendJson(res, 500, { error: error.message || "Failed to create checkout session" });
  }
};
