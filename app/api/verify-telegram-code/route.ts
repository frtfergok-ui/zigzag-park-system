import { NextResponse } from "next/server";
import { codes } from "../send-telegram-code/route";
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { username, code } = body;

    const cleanUsername = username.replace("@", "");

    const savedCode = codes.get(cleanUsername);

    if (savedCode === code) {
      codes.delete(cleanUsername);

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      { error: "Invalid code" },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}