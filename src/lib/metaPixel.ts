/**
 * Meta (Facebook) Pixel Integration
 * 
 * HOW TO CHANGE PIXEL ID:
 * Replace the PIXEL_ID constant below with your actual Meta Pixel ID.
 * You can find it in Meta Events Manager: https://business.facebook.com/events_manager
 * 
 * HOW TO TEST:
 * 1. Install "Meta Pixel Helper" Chrome extension
 * 2. Open your site → the extension icon should turn blue
 * 3. Click it to see which events are firing
 * 4. Set META_PIXEL_DEBUG = true below to see console logs
 */

// ======= REPLACE WITH YOUR REAL PIXEL ID =======
const PIXEL_ID = "XXXXXXXXXXXXXXXXX";
// ================================================

const META_PIXEL_DEBUG = import.meta.env.DEV; // Auto-enable in dev

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

let initialized = false;

export function initMetaPixel() {
  if (initialized || typeof window === "undefined") return;
  if (PIXEL_ID === "XXXXXXXXXXXXXXXXX") {
    if (META_PIXEL_DEBUG) console.warn("[Meta Pixel] No Pixel ID configured. Replace PIXEL_ID in src/lib/metaPixel.ts");
    return;
  }

  // Facebook Pixel base code
  const f = window;
  const b = document;
  const n = "script";
  if (f.fbq) return;
  const fbq: any = function () {
    fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  f.fbq = fbq;

  const s = b.createElement(n) as HTMLScriptElement;
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  const first = b.getElementsByTagName(n)[0];
  first?.parentNode?.insertBefore(s, first);

  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
  initialized = true;

  if (META_PIXEL_DEBUG) console.log("[Meta Pixel] ✅ Initialized with ID:", PIXEL_ID);
}

function track(event: string, params?: Record<string, any>) {
  if (META_PIXEL_DEBUG) {
    console.log(`[Meta Pixel] 📊 Event: ${event}`, params || "");
  }
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, params);
  }
}

export function trackViewContent(product: { id: string; name: string; price: number; category?: string }) {
  track("ViewContent", {
    content_name: product.name,
    content_ids: [product.id],
    content_type: "product",
    content_category: product.category || "",
    value: product.price,
    currency: "DZD",
  });
}

export function trackAddToCart(product: { id: string; name: string; price: number }, quantity = 1) {
  track("AddToCart", {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    value: product.price * quantity,
    currency: "DZD",
    num_items: quantity,
  });
}

export function trackInitiateCheckout(value: number, numItems: number) {
  track("InitiateCheckout", {
    value,
    currency: "DZD",
    num_items: numItems,
  });
}

export function trackPurchase(value: number, orderId: string) {
  track("Purchase", {
    value,
    currency: "DZD",
    content_type: "product",
    order_id: orderId,
  });
}
