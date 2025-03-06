import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getToken, handleAuthorizationV2 } from "@/lib/handleAuthorization";
import { handleClerkAuthorization } from "@/lib/handleClerkAuthorization";
import { createAnonymousUser } from "../anon";
import { createLicenseKeyFromUserId } from "@/app/actions";
import { createEmptyUserUsage } from "@/drizzle/schema";
import { config,  PRICES } from "@/srm.config";
import { getUrl } from "@/lib/getUrl";
  
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

async function createFallbackUser() {
  try {
    const user = await createAnonymousUser();
    await createEmptyUserUsage(user.id);
    const { key } = await createLicenseKeyFromUserId(user.id);
    return { userId: user.id, licenseKey: key.key };
  } catch (error) {
    console.error("Failed to create fallback user:", error);
    throw new Error("Unable to create or authorize user");
  }
}

async function ensureAuthorizedUser(req: NextRequest) {
  const initialLicenseKey = getToken(req);

  try {
    // Try Clerk authentication first
    try {
      const { userId } = await handleClerkAuthorization(req);
      return { userId, licenseKey: initialLicenseKey };
    } catch (clerkError) {
      // Fall back to API key authentication
      try {
        const { userId } = await handleAuthorizationV2(req);
        return { userId, licenseKey: initialLicenseKey };
      } catch (apiKeyError) {
        // In development mode, use a default user ID
        if (process.env.NODE_ENV === "development") {
          return { userId: "dev-user", licenseKey: initialLicenseKey || "dev-key" };
        } else {
          throw apiKeyError;
        }
      }
    }
  } catch (error) {
    console.log("Authorization failed, creating anonymous user:", error);
    return createFallbackUser();
  }
}

export async function POST(req: NextRequest) {
  let userId, licenseKey;

  try {
    ({ userId, licenseKey } = await ensureAuthorizedUser(req));
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }

  const baseUrl = getUrl();
  console.log("baseUrl", baseUrl);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    payment_intent_data: {
      metadata: {
        userId,
        type: config.products.PayOnceTopUp.metadata.type,
        plan: config.products.PayOnceTopUp.metadata.plan,
        tokens: "5000000", // 5M tokens
      },
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "5M Tokens Top-up",
            description: "One-time purchase of 5M additional tokens",
          },
          unit_amount: PRICES.TOP_UP,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/top-up-success`,
    cancel_url: `${baseUrl}/top-up-cancelled`,
    allow_promotion_codes: true,
    metadata: {
      userId,
      type: config.products.PayOnceTopUp.metadata.type,
      plan: config.products.PayOnceTopUp.metadata.plan,
      tokens: "5000000", // 5M tokens
    },
  });

  return NextResponse.json({ url: session.url, licenseKey });
}
