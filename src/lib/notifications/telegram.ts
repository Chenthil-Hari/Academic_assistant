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

/**
 * Downloads a file (e.g. incoming voice note .oga) from Telegram servers
 */
export async function downloadTelegramFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  if (!token || !fileId) return null;

  try {
    // 1. Get file path
    const metaRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const metaData = await metaRes.json();
    if (!metaData.ok || !metaData.result?.file_path) {
      return null;
    }

    const filePath = metaData.result.file_path;
    // 2. Download raw bytes
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) return null;

    const arrayBuffer = await fileRes.arrayBuffer();
    const mimeType = filePath.endsWith(".oga") || filePath.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg";

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  } catch (err) {
    console.error("Telegram download file error:", err);
    return null;
  }
}

/**
 * Sends a voice note (.mp3 / .ogg) back to the Telegram chat
 */
export async function sendTelegramVoice(
  chatId: string,
  audioBuffer: Buffer,
  caption?: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  if (!token || !chatId || !audioBuffer) return false;

  try {
    const formData = new FormData();
    formData.append("chat_id", chatId);
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" });
    formData.append("voice", blob, "voice.mp3");

    if (caption) {
      // Telegram voice caption limit is 1024 characters
      formData.append("caption", caption.slice(0, 1024));
      formData.append("parse_mode", "Markdown");
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error("sendTelegramVoice error:", err);
    return false;
  }
}

/**
 * Generates spoken voice audio (MP3 Buffer) for 100% free using Google TTS service
 */
export async function generateTtsAudio(text: string): Promise<Buffer | null> {
  try {
    // Clean text of markdown formatting, emojis, and URLs
    const cleanText = text
      .replace(/[*_#`~>\[\]\(\)]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .trim();

    if (!cleanText) return null;

    // Split text into chunks <= 180 chars (Google TTS limit per request)
    const sentences = cleanText.match(/[^.!?]+[.!?]+|\S+/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + " " + sentence).trim().length <= 180) {
        currentChunk = (currentChunk + " " + sentence).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence.trim().slice(0, 180);
      }
      if (chunks.length >= 4) break; // Keep voice note concise (~20-25 seconds)
    }
    if (currentChunk && chunks.length < 4) chunks.push(currentChunk);

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuf));
      }
    }

    if (audioBuffers.length === 0) return null;
    return Buffer.concat(audioBuffers);
  } catch (err) {
    console.error("generateTtsAudio error:", err);
    return null;
  }
}
