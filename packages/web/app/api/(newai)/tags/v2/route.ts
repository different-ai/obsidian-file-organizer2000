import { NextRequest, NextResponse } from "next/server";
import { handleAuthorization } from "@/lib/handleAuthorization";
import { incrementAndLogTokenUsage } from "@/lib/incrementAndLogTokenUsage";
import { getModel } from "@/lib/models";
import { z } from "zod";
import { generateObject } from "ai";

const tagsSchema = z.object({
  suggestedTags: z.array(z.object({
    score: z.number().min(0).max(100),
    isNew: z.boolean(),
    tag: z.string(),
    reason: z.string(),
  }))
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await handleAuthorization(request);
    const { 
      content, 
      fileName, 
      existingTags = [], 
      customInstructions = "", 
      count = 3,
      model = process.env.MODEL_NAME,
      ollamaEndpoint
    } = await request.json();

    let modelProvider;
    try {
      if (model === 'ollama-deepseek-r1') {
        modelProvider = ollama("deepseek-r1");
      } else {
        modelProvider = getModel(model);
      }
    } catch (error) {
      console.error('Error initializing model:', error);
      return NextResponse.json(
        { error: 'Failed to initialize model. Please check your configuration.' },
        { status: 500 }
      );
    }

    const response = await generateObject({
      model: modelProvider,
      schema: tagsSchema,
      system: `You are a precise tag generator. Analyze content and suggest ${count} relevant tags.
              ${existingTags.length ? `Consider existing tags: ${existingTags.join(", ")}` : 'Create new tags if needed.'}
              ${customInstructions ? `Follow these custom instructions: ${customInstructions}` : ''}
              
              Guidelines:
              - Prefer existing tags when appropriate (score them higher)
              - Create specific, meaningful new tags when needed
              - Score based on relevance (0-100)
              - Include brief reasoning for each tag
              - Focus on key themes, topics, and document type`,
      prompt: `File: "${fileName}"
              
              Content: """
              ${content}
              """`,
    });

    await incrementAndLogTokenUsage(userId, response.usage.totalTokens);

    // Sort tags by score and format response
    const sortedTags = response.object.suggestedTags
      .sort((a, b) => b.score - a.score)
      .map(tag => ({
        ...tag,
        tag: tag.tag.startsWith('#') ? tag.tag : `#${tag.tag}`,
      }));

    return NextResponse.json({ tags: sortedTags });
  } catch (error) {
    console.error('Tag generation error:', error);
    const errorMessage = error.message || 'Failed to generate tags';
    const statusCode = error.status || 500;
    
    // Add more specific error messages for common issues
    if (error.message?.includes('ollama')) {
      return NextResponse.json(
        { error: 'Failed to connect to Ollama. Please ensure Ollama is running and accessible.' },
        { status: statusCode }
      );
    }
    
    if (error.message?.includes('OpenAI')) {
      return NextResponse.json(
        { error: 'OpenAI API error. Please check your API key and configuration.' },
        { status: statusCode }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
