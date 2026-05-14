import { NextResponse } from "next/server";

async function sendMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

export async function POST(req: Request) {
  try {
    const update = await req.json();

    const message = update.message;

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    if (text === "/start") {
      await sendMessage(
        chatId,
        `🎡 <b>ZIG ZAG Verification</b>

Выберите язык / Alegeți limba

🇷🇺 Напишите: RU
🇷🇴 Scrieți: RO`
      );
    } else if (text.toUpperCase() === "RU") {
      await sendMessage(
        chatId,
        `🇷🇺 Отлично! Теперь вернитесь на сайт ZIG ZAG.`
      );
    } else if (text.toUpperCase() === "RO") {
      await sendMessage(
        chatId,
        `🇷🇴 Perfect! Acum reveniți pe site-ul ZIG ZAG.`
      );
    } else {
      await sendMessage(
        chatId,
        `Напишите RU или RO / Scrieți RU sau RO`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Webhook error" },
      { status: 500 }
    );
  }
}