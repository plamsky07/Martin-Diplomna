const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

admin.initializeApp();

const app = express();

// ✅ CORS за локално
app.use(cors({ origin: true }));

// ⚠️ За webhook трябва RAW body
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // ✅ Плащането е минало
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        // session.metadata.orderId сме го сложили от create-checkout-session
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await admin.firestore().collection("orders").doc(orderId).update({
            status: "paid",
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            stripeSessionId: session.id,
          });
        }
      }

      res.json({ received: true });
    } catch (e) {
      console.error("❌ Webhook handler error:", e);
      res.status(500).send("Server error");
    }
  }
);

// ✅ След webhook-а връщаме JSON parser за другите routes
app.use(express.json());

// ✅ Create Stripe Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { items, orderId } = req.body;

    // items = [{ name, price, qty }]
    const line_items = (items || []).map((it) => ({
      quantity: Number(it.qty || 1),
      price_data: {
        currency: "eur",
        product_data: { name: it.name || "Product" },
        unit_amount: Math.round(Number(it.price || 0) * 100), // евро -> центове
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${process.env.CLIENT_URL}/cart?paid=1`,
      cancel_url: `${process.env.CLIENT_URL}/cart?canceled=1`,
      metadata: { orderId: orderId || "" },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create session" });
  }
});

exports.api = functions.https.onRequest(app);
