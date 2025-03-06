import { Notice, RequestUrlResponse, requestUrl } from "obsidian";
import { logMessage } from "./someUtils";
import { logger } from "./services/logger";

export async function makeApiRequest<T>(
  requestFn: () => Promise<RequestUrlResponse>
): Promise<RequestUrlResponse> {
  logMessage("Making API request", requestFn);
  const response: RequestUrlResponse = await requestFn();
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  if (response.json.error) {
    new Notice(`File Organizer error: ${response.json.error}`, 6000);
    throw new Error(response.json.error);
  }
  throw new Error("Unknown error");
}

export async function checkLicenseKey(
  serverUrl: string,
  key: string
): Promise<boolean> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/check-key`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
    });
    console.log("response", response.json);
    return response.status === 200;
  } catch (error) {
    logger.error("Error checking API key:", error);
    return false;
  }
}

export async function checkClerkAuth(
  serverUrl: string,
  token: string
): Promise<boolean> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/auth/validate`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.status === 200;
  } catch (error) {
    logger.error("Error checking Clerk authentication:", error);
    return false;
  }
}
