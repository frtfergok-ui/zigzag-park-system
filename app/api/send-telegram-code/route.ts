import { NextResponse } from "next/server";

export const codes = new Map<string, string>();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: "Username required" },
        { status: 400 }
      );
    }

    const cleanUsername = username.replace("@", "");

    const code = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    codes.set(cleanUsername, code);

    const token = process.env.TELEGRAM_BOT_TOKEN;

    const text = `
🎡 ZIG ZAG

🇷🇺 Ваш код подтверждения:
${code}

🇷🇴 Codul dvs. de confirmare:
${code}
`;

    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: `@${cleanUsername}`,
          text,
        }),
      }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}