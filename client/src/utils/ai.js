// Thin wrapper over the server-side AI endpoints. Falls back to identity on any error.

export async function detectLanguage(text) {
  if (!text) return "hinglish";
  try {
    const r = await fetch("/api/ai/detect-language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) return "hinglish";
    const data = await r.json();
    return data.language || "hinglish";
  } catch {
    return "hinglish";
  }
}

export async function localize(text, targetLanguage) {
  if (!text || !targetLanguage || targetLanguage === "hinglish") return text;
  try {
    const r = await fetch("/api/ai/localize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage }),
    });
    if (!r.ok) return text;
    const data = await r.json();
    return data.text || text;
  } catch {
    return text;
  }
}

// Localize a whole reply object in parallel (text + summary string fields).
export async function localizeReply(reply, lang) {
  if (!reply || !lang || lang === "hinglish") return reply;
  const out = { ...reply };
  const tasks = [];
  if (reply.text) tasks.push(localize(reply.text, lang).then((t) => (out.text = t)));
  await Promise.all(tasks);
  return out;
}
