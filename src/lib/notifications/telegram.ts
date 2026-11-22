export interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramReplyMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

const DEFAULT_BOT_TOKEN = "9007972451:AAF5VHHnHgRyNed_fmmBBreaJKVIbU5WlmA";

export async function sendTelegramAlert(
  chatId: string,
  message: string,
  replyMarkup?: TelegramReplyMarkup
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  if (!token || !chatId) {
    return false;
  }

  // Split into chunks if message exceeds Telegram's 4000 char limit
  const MAX_LEN = 3900;
  if (message.length > MAX_LEN) {
    const chunks: string[] = [];
    let remaining = message;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_LEN) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = remaining.lastIndexOf("\n\n", MAX_LEN);
      if (splitIdx === -1) splitIdx = remaining.lastIndexOf("\n", MAX_LEN);
      if (splitIdx === -1) splitIdx = MAX_LEN;
      chunks.push(remaining.substring(0, splitIdx));
      remaining = remaining.substring(splitIdx).trimStart();
    }

    let allSent = true;
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const sent = await sendSingleTelegramMessage(chatId, chunks[i], isLast ? replyMarkup : undefined);
      if (!sent) allSent = false;
    }
    return allSent;
  }

  return sendSingleTelegramMessage(chatId, message, replyMarkup);
}

async function sendSingleTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: TelegramReplyMarkup
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  if (!token || !chatId) return false;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data = await response.json();
    if (!data.ok) {
      // If Markdown parsing failed, retry as plain text
      delete payload.parse_mode;
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await response.json();
    }

    return Boolean(data.ok);
  } catch (err) {
    console.error("Telegram send error:", err);
    return false;
  }
}

export async function sendTelegramChatAction(
  chatId: string,
  action: "typing" | "upload_document" | "find_location" = "typing"
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  if (!token || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${token}/sendChatAction`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
    const data = await response.json();
    return Boolean(data.ok);
  } catch (err) {
    return false;
  }
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  if (!token || !callbackQueryId) return false;

  try {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "",
        show_alert: showAlert,
      }),
    });
    const data = await response.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error("Telegram answerCallbackQuery error:", err);
    return false;
  }
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  if (!token || !chatId || !messageId) return false;

  try {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    const payload: any = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "Markdown",
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = await response.json();
    if (!data.ok) {
      delete payload.parse_mode;
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await response.json();
    }
    return Boolean(data.ok);
  } catch (err) {
    console.error("Telegram editMessageText error:", err);
    return false;
  }
}
