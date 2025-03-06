import { convertToCoreMessages, streamText, createDataStreamResponse, generateId } from "ai";
import { NextResponse, NextRequest } from "next/server";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import { handleAuthorization, handleAuthorizationV2 } from "@/lib/handleAuthorization";
import { handleClerkAuthorization } from "@/lib/handleClerkAuthorization";
import { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google";
import { z } from "zod";

import { getModel } from "@/lib/models";
import { getChatSystemPrompt } from "@/lib/prompts/chat-prompt";
import { chatTools } from "./tools";

interface GroundingMetadataItem {
  content: string;
  title: string;
  relevanceScore: number;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return createDataStreamResponse({
    execute: async (dataStream) => {
      try {
        let userId;
        
        // Try Clerk authentication first
        try {
          const result = await handleClerkAuthorization(req);
          userId = result.userId;
        } catch (clerkError) {
          // Fall back to API key authentication
          try {
            const result = await handleAuthorizationV2(req);
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
        
        const {
          messages,
          newUnifiedContext,
          enableScreenpipe,
          currentDatetime,
          unifiedContext: oldUnifiedContext,
          model: bodyModel,
          enableSearchGrounding = false,
        } = await req.json();

        let chosenModelName;
        if (enableSearchGrounding) {
          console.log("Enabling search grounding");
          console.log("GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY);
          console.log("GOOGLE_GENERATIVE_AI_API_KEY:", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
          if (process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.log("Using Gemini model");
            chosenModelName = "gemini-2.0-flash-exp";
          } else {
            console.log("Using GPT-4o model");
            chosenModelName = "gpt-4o";
          }
        } else {
          chosenModelName = "gpt-4o";
        }
        console.log("Chat using model:", chosenModelName);
        const model = getModel(chosenModelName);

        const contextString =
          newUnifiedContext ||
          oldUnifiedContext
            ?.map((file) => {
              return `File: ${file.title}\n\nContent:\n${file.content}\nPath: ${file.path} Reference: ${file.reference}`;
            })
            .join("\n\n");

        dataStream.writeData('initialized call');

        const result = await streamText({
          model,
          system: getChatSystemPrompt(
            contextString,
            enableScreenpipe,
            currentDatetime
          ),
          maxSteps: 3,
          messages: convertToCoreMessages(messages),
          tools: chatTools,
          onFinish: async ({ usage, experimental_providerMetadata }) => {
            console.log("Token usage:", usage);
            const googleMetadata = experimental_providerMetadata?.google as unknown as GoogleGenerativeAIProviderMetadata | undefined;
            console.log("Google metadata:", JSON.stringify(googleMetadata, null, 2));

            if (googleMetadata?.groundingMetadata) {
              dataStream.writeMessageAnnotation({
                type: "search-results",
                groundingMetadata: googleMetadata.groundingMetadata
              });
            }

            await incrementAndLogTokenUsage(userId, usage.totalTokens);
            dataStream.writeData('call completed');
          },
        });

        result.mergeIntoDataStream(dataStream);
      } catch (error) {
        console.error("Error in POST request:", error);
        throw error;
      }
    },
    onError: (error) => {
      console.error("Error in stream:", error);
      return error instanceof Error ? error.message : String(error);
    },
  });
}
