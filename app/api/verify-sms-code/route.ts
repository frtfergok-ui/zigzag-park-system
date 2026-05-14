import { NextResponse } from "next/server";
import { smsCodes } from "../send-sms-code/route";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { phone, code } = body;

    const savedCode = smsCodes.get(phone);

    if (savedCode === code) {
      smsCodes.delete(phone);

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
      { error: "Verification error" },
      { status: 500 }
    );
  }
}