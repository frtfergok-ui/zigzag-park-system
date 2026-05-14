import { NextResponse } from "next/server";

export const smsCodes = new Map<string, string>();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone required" },
        { status: 400 }
      );
    }

    const code = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    smsCodes.set(phone, code);

    const apiKey = process.env.SMSMD_API_KEY;

    const text = `ZIG ZAG code: ${code}`;

    const response = await fetch(
      "https://api.sms.md/sms/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: phone,
          text,
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "SMS send error" },
      { status: 500 }
    );
  }
}