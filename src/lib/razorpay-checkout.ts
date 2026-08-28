type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, handler: (payload: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load the payment window.")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment window."));
    document.body.appendChild(script);
  });
}

/// Creates the order server-side, opens Razorpay Checkout, then hands the
/// signed response back to the server for verification. The client is never
/// trusted to declare a payment successful.
export async function openRazorpayCheckout(params: {
  appointmentId: string;
  description: string;
  onSuccess: (receiptNo: string) => void;
  onError: (message: string) => void;
}) {
  const orderRes = await fetch("/api/payments/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: params.appointmentId }),
  });
  const orderJson = await orderRes.json();
  if (!orderJson.ok) throw new Error(orderJson.error ?? "Could not start the payment.");

  await loadScript();
  if (!window.Razorpay) throw new Error("Payment window is unavailable.");

  const checkout = new window.Razorpay({
    key: orderJson.data.keyId,
    order_id: orderJson.data.orderId,
    amount: orderJson.data.amountMinor,
    currency: orderJson.data.currency,
    name: params.description,
    description: "Appointment deposit",
    prefill: orderJson.data.prefill,
    theme: { color: "#1f7374" },
    handler: async (response: RazorpayResponse) => {
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      const verifyJson = await verifyRes.json();
      if (verifyJson.ok) params.onSuccess(verifyJson.data.receiptNo);
      else params.onError(verifyJson.error ?? "We could not verify the payment. Please call us.");
    },
  });

  checkout.on("payment.failed", (payload) => {
    params.onError(payload.error?.description ?? "The payment did not go through.");
  });

  checkout.open();
}
