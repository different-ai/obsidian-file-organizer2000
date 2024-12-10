"use server";
import { Vercel } from "@vercel/sdk";
import { auth } from "@clerk/nextjs/server";
import { db, vercelTokens } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { createLicenseKeyFromUserId } from "@/app/actions";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
if (!VERCEL_TOKEN) {
  throw new Error("VERCEL_TOKEN environment variable is not set");
}

const GITHUB_ORG = "different-ai";
const GITHUB_REPO = "file-organizer-2000";
const GITHUB_BRANCH = "master";

export async function setupProject(vercelToken: string, openaiKey: string) {
  const { userId } = auth();
  // create an api key for the user
  if (!userId) {
    throw new Error("User not authenticated");
  }
  const apiKey = await createLicenseKeyFromUserId(userId);

  if (!vercelToken) {
    throw new Error("Vercel token is required");
  }

  if (!openaiKey) {
    throw new Error("OpenAI API key is required");
  }

  // Store or update the token
  const existingToken = await db
    .select()
    .from(vercelTokens)
    .where(eq(vercelTokens.userId, userId));

  if (existingToken) {
    // Update existing token
    await db
      .update(vercelTokens)
      .set({ token: vercelToken, updatedAt: new Date() })
      .where(eq(vercelTokens.userId, userId));
  } else {
    // Insert new token
    await db.insert(vercelTokens).values({
      userId,
      token: vercelToken,
    });
  }

  const vercel = new Vercel({
    bearerToken: vercelToken,
  });

  console.log("Starting setupProject process");
  const uniqueProjectName = `file-organizer-${Math.random()
    .toString(36)
    .substring(2, 15)}`;

  console.log("apiKey", apiKey.key.key);
  try {
    // Create project with required settings
    console.log("Creating new project...");
    const createProjectResponse = await vercel.projects.createProject({
      requestBody: {
        name: uniqueProjectName,
        rootDirectory: "web",
        publicSource: true,
        framework: "nextjs",
        buildCommand: "pnpm build:self-host",
        installCommand: "pnpm install",
        outputDirectory: ".next",
        environmentVariables: [
          {
            key: "SOLO_API_KEY",
            value: apiKey.key.key,
            type: "plain",
            target: "production",
          },
          {
            key: "OPENAI_API_KEY",
            type: "plain",
            value: openaiKey,
            target: "production",
          },
        ],
      },
    });
    console.log(`✅ Project created successfully: ${createProjectResponse.id}`);

    // Create deployment with project settings
    console.log("Creating deployment...");
    const deploymentResponse = await vercel.deployments.createDeployment({
      requestBody: {
        name: uniqueProjectName,
        target: "production",
        gitSource: {
          type: "github",
          repo: GITHUB_REPO,
          ref: GITHUB_BRANCH,
          org: GITHUB_ORG,
        },
        projectSettings: {
          framework: "nextjs",
          buildCommand: "pnpm build:self-host",
          installCommand: "pnpm install",
          outputDirectory: ".next",
          rootDirectory: "web",
        },
      },
    });
    

    // Update token record with project details
    await db
      .update(vercelTokens)
      .set({
        projectId: createProjectResponse.id,
        deploymentUrl: deploymentResponse.url,
        updatedAt: new Date(),
      })
      .where(eq(vercelTokens.userId, userId));

    return {
      success: true,
      deploymentUrl: deploymentResponse.url,
      projectId: createProjectResponse.id,
      licenseKey: apiKey.key.key,
    };
  } catch (error: any) {
    console.error("❌ Error in setupProject:", error);
    throw error;
  }
}

// Helper function to get user's Vercel deployment info
export async function getVercelDeployment() {
  const { userId } = auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const tokenRecord = await db
    .select()
    .from(vercelTokens)
    .where(eq(vercelTokens.userId, userId))
    .limit(1);

  return tokenRecord[0]
    ? {
        deploymentUrl: tokenRecord[0].deploymentUrl,
        projectId: tokenRecord[0].projectId,
      }
    : null;
}
