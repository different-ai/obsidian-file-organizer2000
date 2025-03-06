import { requestUrl, RequestUrlResponse } from "obsidian";
import { logger } from "../services/logger";

export interface ClerkAuthResponse {
  token: string;
  userId: string;
  expiresAt: number;
}

export async function signInWithClerk(
  serverUrl: string,
  email: string,
  password: string
): Promise<ClerkAuthResponse | null> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/sign-in`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (response.status === 200) {
      return response.json;
    }
    return null;
  } catch (error) {
    logger.error("Error signing in with Clerk:", error);
    return null;
  }
}

export async function refreshClerkToken(
  serverUrl: string,
  token: string
): Promise<ClerkAuthResponse | null> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/refresh`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (response.status === 200) {
      return response.json;
    }
    return null;
  } catch (error) {
    logger.error("Error refreshing Clerk token:", error);
    return null;
  }
}

export async function isClerkTokenValid(
  serverUrl: string,
  token: string
): Promise<boolean> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/validate`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    
    return response.status === 200;
  } catch (error) {
    logger.error("Error validating Clerk token:", error);
    return false;
  }
}
