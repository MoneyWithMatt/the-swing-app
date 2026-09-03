import "server-only";

function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) {
    throw new Error("A Stripe sandbox secret key is required for the pilot.");
  }
  return key;
}

async function stripeGet<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeKey()}` },
    cache: "no-store"
  });
  const result = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || "Stripe request failed.");
  return result;
}

export async function stripePost<T>(path: string, values: URLSearchParams): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: values,
    cache: "no-store"
  });
  const result = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(result.error?.message || "Stripe request failed.");
  }
  return result;
}

async function ensureMatt100PromotionCode() {
  const code = encodeURIComponent("MATT100");
  const existing = await stripeGet<{ data: Array<{ id: string }> }>(`/promotion_codes?code=${code}&active=true&limit=1`);
  if (existing.data.length) return;

  const coupon = new URLSearchParams();
  coupon.set("id", "swing_app_matt100");
  coupon.set("name", "Swing App friends & family 100% off");
  coupon.set("percent_off", "100");
  coupon.set("duration", "once");
  coupon.set("metadata[app]", "the-swing-app");
  coupon.set("metadata[purpose]", "testing");
  try {
    await stripePost("/coupons", coupon);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.toLowerCase().includes("already exists")) throw error;
  }

  const promotionCode = new URLSearchParams();
  promotionCode.set("active", "true");
  promotionCode.set("code", "MATT100");
  promotionCode.set("promotion[type]", "coupon");
  promotionCode.set("promotion[coupon]", "swing_app_matt100");
  promotionCode.set("metadata[app]", "the-swing-app");
  promotionCode.set("metadata[purpose]", "friends-and-family-testing");
  try {
    await stripePost("/promotion_codes", promotionCode);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.toLowerCase().includes("already exists")) throw error;
  }
}

export async function createCheckoutSession(input: {
  submissionId: string;
  publicToken: string;
  email: string;
  appUrl: string;
}) {
  await ensureMatt100PromotionCode();
  const values = new URLSearchParams();
  values.set("mode", "payment");
  values.set("allow_promotion_codes", "true");
  values.set("customer_email", input.email);
  values.set("success_url", `${input.appUrl}/account?submitted=success`);
  values.set("cancel_url", `${input.appUrl}/request/${input.publicToken}?payment=cancelled`);
  values.set("line_items[0][price_data][currency]", "gbp");
  values.set("line_items[0][price_data][unit_amount]", "500");
  values.set("line_items[0][price_data][product_data][name]", "Golf swing analysis from Matt");
  values.set("line_items[0][quantity]", "1");
  values.set("payment_intent_data[capture_method]", "manual");
  values.set("metadata[submission_id]", input.submissionId);
  values.set("payment_intent_data[metadata][submission_id]", input.submissionId);
  return stripePost<{ id: string; url: string }>("/checkout/sessions", values);
}

export async function capturePaymentIntent(paymentIntentId: string) {
  return stripePost<{ id: string; status: string }>(`/payment_intents/${paymentIntentId}/capture`, new URLSearchParams());
}
