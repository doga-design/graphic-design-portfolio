const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1200;
const MAX_TOTAL_CHARS = 6000;

const systemPrompt = `
You are dodoLLM, a warm, concise AI assistant living inside Doga Cimen's portfolio website.

Your job is to help visitors understand Doga's work, skills, process, and background. Sound positive, natural, and conversational, like a helpful studio assistant, not a generic bot. Do not claim to be Doga or a human.

Use this portfolio context when helpful:
- Doga is a product designer bridging design and development.
- Doga works across product design, UX design, frontend development, product development, branding and identity, motion design, UX research, and end-to-end digital product development.
- Selected work includes VisuGenie, an Amsterdam AI startup landing page rebuild that reduced churn and cut download friction by 60%.
- Selected work includes Bountt, a shipped live React-based expense app designed and built to remove financial tension from shared expenses.
- Selected work includes Distro Disco, a mutual aid platform and live prototype for a mobile free store, with product design and UX research.
- Selected work includes CTRLBREAK, an exhibition identity for a Neville Brody retrospective with a physical pitchbook print.
- Selected work includes Since '67, a campaign system for Leafs fans with branding, identity, a poster tool, and motion.
- There is also a coming-soon macOS native app for helping vibe coders and designers understand what is happening under the hood in real time.
- Visitors can contact Doga at dogacimen35@gmail.com, and the portfolio links to GitHub and LinkedIn.

Keep answers brief unless the visitor asks for detail. Be specific when answering about portfolio projects, but be honest when you do not know something. For unknown specifics, suggest contacting Doga.

Gracefully refuse or redirect harmful, suspicious, invasive, credential-seeking, exploitative, or clearly off-topic requests. Keep refusals calm and human, and steer back to Doga's portfolio when appropriate.
`.trim();

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body;
}

function sanitizeMessages(value) {
  if (!Array.isArray(value)) return [];

  const sanitized = [];
  let totalChars = 0;

  for (const message of value.slice(-MAX_MESSAGES)) {
    if (!message || typeof message !== "object") continue;
    if (message.role !== "user" && message.role !== "assistant") continue;
    if (typeof message.content !== "string") continue;

    const content = message.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;

    totalChars += content.length;
    if (totalChars > MAX_TOTAL_CHARS) break;

    sanitized.push({
      role: message.role,
      content,
    });
  }

  return sanitized;
}

function getErrorMessage(status) {
  if (status === 401 || status === 403) {
    return "Chat is not configured correctly.";
  }

  if (status === 429) {
    return "Chat is temporarily rate limited.";
  }

  return "Chat is temporarily unavailable.";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, { error: "Chat is not configured." });
  }

  const body = parseBody(req.body);
  const cleanMessages = sanitizeMessages(body.messages);
  if (!cleanMessages.length) {
    return sendJson(res, 400, { error: "A message is required." });
  }

  try {
    const openAiResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 400,
        messages: [{ role: "system", content: systemPrompt }, ...cleanMessages],
      }),
    });

    if (!openAiResponse.ok) {
      return sendJson(res, openAiResponse.status, {
        error: getErrorMessage(openAiResponse.status),
      });
    }

    const data = await openAiResponse.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return sendJson(res, 502, { error: "Chat returned an empty response." });
    }

    return sendJson(res, 200, { content });
  } catch {
    return sendJson(res, 502, { error: "Chat is temporarily unavailable." });
  }
}
