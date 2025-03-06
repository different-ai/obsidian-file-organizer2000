import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }
    
    // Generate a new token (this is a simplified example)
    const token = Buffer.from(`${userId}:${Date.now()}`).toString("base64");
    
    return NextResponse.json({
      token,
      userId,
      expiresAt: Date.now() + 3600000, // 1 hour from now
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 401 }
    );
  }
}
