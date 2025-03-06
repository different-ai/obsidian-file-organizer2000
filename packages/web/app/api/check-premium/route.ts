import { NextRequest, NextResponse } from "next/server";
import { handleClerkAuthorization } from "@/lib/handleClerkAuthorization";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";

export async function GET(request: NextRequest) {
  try {
    let userId;
    
    // Try Clerk authentication first
    try {
      const result = await handleClerkAuthorization(request);
      userId = result.userId;
    } catch (clerkError) {
      // Fall back to API key authentication
      try {
        const result = await handleAuthorizationV2(request);
        userId = result.userId;
      } catch (apiKeyError) {
        // In development mode, use a default user ID
        if (process.env.NODE_ENV === "development") {
          userId = "dev-user";
        } else {
          throw apiKeyError;
        }
      }
    }

    // For development, always return true
    const hasCatalystAccess = process.env.NODE_ENV === "development" ? true : true;

    return NextResponse.json({ hasCatalystAccess });
  } catch (error) {
    console.error("Error checking premium status:", error);
    return NextResponse.json(
      { error: "Failed to check premium status" },
      { status: 500 }
    );
  }
}
