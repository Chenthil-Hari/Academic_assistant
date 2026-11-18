export async function sendTelegramAlert(
  chatId: string,
  message: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error("Telegram send error:", err);
    return false;
  }
}
