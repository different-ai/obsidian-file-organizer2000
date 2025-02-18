import { NextRequest, NextResponse } from "next/server";
import { handleAuthorization } from "@/lib/handleAuthorization";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import { getModel } from "@/lib/models";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";
import { generateObject } from "ai";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await handleAuthorization(request);
    const {
      content,
      fileName,
      customInstructions,
      count = 3,
      model = process.env.MODEL_NAME
    } = await request.json();
    const modelProvider = model === 'ollama-deepseek-r1' ? ollama("deepseek-r1") : getModel(model);
    const shouldRename = await generateObject({
      model: modelProvider,
      schema: z.object({
        score: z.number().min(0).max(100),
        shouldRename: z.boolean(),
        reason: z.string(),
      }),
      prompt: `Given the content and file name: "${fileName}", should we rename the file? Content: "${content}", based on ${customInstructions}`,
    });
    console.log("should rename", shouldRename.object, customInstructions);
    if (!shouldRename.object.shouldRename) {
      // remove extension from fileName if it exists
      return NextResponse.json({
        titles: [
          {
            score: shouldRename.object.score,
            title: fileName,
            reason: shouldRename.object.reason,
          },
        ],
      });
    }

    const response = await generateObject({
      model: modelProvider,
      schema: z.object({
        suggestedTitles: z
          .array(
            z.object({
              score: z.number().min(0).max(100),
              title: z.string(),
              reason: z.string(),
            })
          )
          .min(1)
          .max(count),
      }),
      system: `Given the content and file name: "${fileName}", suggest exactly ${count} clear titles. Avoid special characters. ${
        customInstructions ? `Instructions: "${customInstructions}"` : ""
      }`,
      prompt: `Content: "${content}"`,
    });

    // increment tokenUsage
    const tokens = response.usage.totalTokens;
    console.log("incrementing token usage titles", userId, tokens);
    await incrementAndLogTokenUsage(userId, tokens);
    // make sure all titles are file system safe
    console.log("sanitizing titles", response.object.suggestedTitles);
    const safeTitles = response.object.suggestedTitles.map((title) => {
      return { ...title, title: title.title };
    });

    return NextResponse.json({
      titles: safeTitles.sort((a, b) => b.score - a.score),
    });
  } catch (error) {
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
  }
}
