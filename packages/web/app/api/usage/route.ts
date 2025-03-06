import { NextResponse, NextRequest } from "next/server";
import { db, UserUsageTable, createEmptyUserUsage } from "@/drizzle/schema";
import { and, eq, not } from "drizzle-orm";
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

    // Get user usage data
    const userUsage = await db
      .select({
        tokenUsage: UserUsageTable.tokenUsage,
        maxTokenUsage: UserUsageTable.maxTokenUsage,
        subscriptionStatus: UserUsageTable.subscriptionStatus,
        currentPlan: UserUsageTable.currentPlan,
      })
      .from(UserUsageTable)
      .where(
        and(
          eq(UserUsageTable.userId, userId),
        )
      )
      .limit(1);

    // If user not found, create a default user record in development mode
    if (!userUsage.length) {
      if (process.env.NODE_ENV === "development") {
        // Create a default user record for development
        await createEmptyUserUsage(userId);
        
        // Return default usage data
        return NextResponse.json({
          tokenUsage: 0,
          maxTokenUsage: 10000, // Default token limit for development
          subscriptionStatus: "active", // Default to active for development
          currentPlan: "development",
        });
      } else {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    return NextResponse.json(userUsage[0]);
  } catch (error) {
    console.error("Error in usage API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
