import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { checkTokenUsage } from "../drizzle/schema";
import PostHogClient from "./posthog";

class AuthorizationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export const getToken = (req: NextRequest) => {
  const header = req.headers.get("authorization");
  const token = header?.replace("Bearer ", "");
  return token;
};

export async function handleClerkAuthorization(req: NextRequest) {
  // this is to allow people to self host it easily without
  // setting up clerk
  if (process.env.ENABLE_USER_MANAGEMENT !== "true") {
    return { userId: "user", isCustomer: true };
  }
  
  try {
    // Get the session from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      throw new AuthorizationError("Unauthorized: No valid session", 401);
    }
    
    // Check token usage
    const { remaining, usageError } = await checkTokenUsage(userId);
    
    if (usageError) {
      throw new AuthorizationError("Error checking token usage", 500);
    }
    
    if (remaining <= 0) {
      throw new AuthorizationError(
        "Credits limit exceeded. Top up your credits in settings.",
        429
      );
    }
    
    // Log the API call
    const posthogClient = PostHogClient();
    if (posthogClient) {
      posthogClient.capture({
        distinctId: userId,
        event: "call-api",
        properties: {
          endpoint: req.nextUrl.pathname.replace("/api/", ""),
        },
      });
    }
    
    return { userId };
  } catch (error) {
    // For development environment, if Clerk is not properly configured
    if (process.env.NODE_ENV === "development") {
      console.warn("Clerk authentication error in development mode:", error);
      return { userId: "dev-user", isCustomer: true };
    }
    
    // Re-throw the error for production environment
    throw error;
  }
}
