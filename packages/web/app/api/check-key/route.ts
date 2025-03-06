import { NextRequest, NextResponse } from "next/server";
import { handleClerkAuthorization } from "@/lib/handleClerkAuthorization";
import { handleAuthorizationV2 } from "@/lib/handleAuthorization";

export async function POST(request: NextRequest) {
  try {
    let userId;
    
    // Try Clerk authentication first
    try {
      const result = await handleClerkAuthorization(request);
      userId = result.userId;
      return NextResponse.json({ message: "Valid session", userId }, { status: 200 });
    } catch (clerkError) {
      // Fall back to API key authentication
      try {
        const result = await handleAuthorizationV2(request);
        userId = result.userId;
        return NextResponse.json({ message: "Valid key", userId }, { status: 200 });
      } catch (apiKeyError) {
        // In development mode, use a default user ID
        if (process.env.NODE_ENV === "development") {
          userId = "dev-user";
          return NextResponse.json({ message: "Development mode", userId }, { status: 200 });
        } else {
          throw apiKeyError;
        }
      }
    }
  } catch (error) {
    console.log("Error checking authentication", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
  }
}
