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

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error("Telegram send error:", err);
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

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error("Telegram editMessageText error:", err);
    return false;
  }
}
