import Anthropic from "@anthropic-ai/sdk";
import { isMissingEnvError } from "@/lib/infrastructure-errors";

export const runtime = "nodejs";

const agentPrompts = {
  cfo: "You are a risk-averse CFO reviewing this financial report. In 3-4 sentences, highlight your main concerns about costs, risks, and financial stability. Be direct and specific with numbers from the report.",
  investor: "You are an aggressive growth investor. In 3-4 sentences, explain why this is a buying opportunity. Be specific with growth metrics and future potential.",
  analyst: "You are a neutral financial analyst. In 3-4 sentences, give a balanced assessment comparing key metrics to industry standards. Use specific numbers.",
  shortSeller: "You are a short seller looking for red flags. In 3-4 sentences, identify the biggest risks and warning signs in this report. Be specific.",
  press: "You are a financial journalist. Write a 2-3 sentence news headline and lead paragraph about this report. Make it newsworthy.",
  regulator: "You are a financial regulator. In 3-4 sentences, identify compliance concerns, capital adequacy, and risk signals that need attention.",
};

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is missing");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function callAgent(anthropic, agentId, summaryText) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: `You are analyzing this financial report summary. Respond only in your assigned persona. Write ONLY 2 short sentences. Maximum 50 words total. No headers, no bullet points, plain text only.\n\nReport summary:\n${summaryText}`,
    messages: [
      { role: "user", content: agentPrompts[agentId] }
    ],
  });

  return response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function scoreConfidence(anthropic, responseText) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 10,
    system: "You rate financial analysis confidence. Respond with ONLY a number between 0 and 100. Nothing else.",
    messages: [
      {
        role: "user",
        content: `Read this financial analysis: ${responseText}\nRate the confidence level of this analysis from 0-100 based on: specificity of numbers used, strength of language, certainty of claims.\nRespond with ONLY a number between 0 and 100. Nothing else.`
      }
    ],
  });

  const raw = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
  const num = parseInt(raw, 10);
  return Number.isFinite(num) && num >= 0 && num <= 100 ? num : null;
}

async function assessRisk(anthropic, responses) {
  const perspectives = [
    `CFO Pessimist: ${responses.cfo || ""}`,
    `Aggressive Investor: ${responses.investor || ""}`,
    `Neutral Analyst: ${responses.analyst || ""}`,
    `Short Seller: ${responses.shortSeller || ""}`,
    `Financial Press: ${responses.press || ""}`,
    `Regulator: ${responses.regulator || ""}`,
  ].join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 250,
    system: "You are a financial risk assessor. You have received 6 different analyst perspectives on a financial report. Based on all their analyses, provide an overall risk score. Respond ONLY with valid JSON, no markdown fences.",
    messages: [
      {
        role: "user",
        content: `Here are 6 analyst perspectives:\n${perspectives}\n\nRespond in this exact JSON format:\n{"score": 73, "level": "MODERATE RISK", "factors": ["Risk factor 1 in one sentence", "Risk factor 2 in one sentence", "Risk factor 3 in one sentence"]}\n\nRules:\n- score: integer 0-100\n- level: "LOW RISK" (0-40), "MODERATE RISK" (41-70), or "HIGH RISK" (71-100)\n- factors: exactly 3 short sentences`
      }
    ],
  });

  const raw = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();

  try {
    const parsed = JSON.parse(raw);
    const score = typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50;
    const level = typeof parsed.level === "string" ? parsed.level : (score <= 40 ? "LOW RISK" : score <= 70 ? "MODERATE RISK" : "HIGH RISK");
    const factors = Array.isArray(parsed.factors) ? parsed.factors.slice(0, 3).map(String) : [];
    return { score, level, factors };
  } catch {
    return { score: 50, level: "MODERATE RISK", factors: [] };
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    if (!summary) {
      return Response.json({ error: "Summary text is required" }, { status: 400 });
    }

    const anthropic = getAnthropicClient();
    const truncated = summary.length > 8000 ? `${summary.slice(0, 8000)}\n…` : summary;

    const agentIds = Object.keys(agentPrompts);
    const results = await Promise.all(
      agentIds.map((id) => callAgent(anthropic, id, truncated))
    );

    const responses = {};
    agentIds.forEach((id, idx) => {
      responses[id] = results[idx];
    });

    // Score confidence for each response in parallel
    const scores = await Promise.all(
      agentIds.map((id) => scoreConfidence(anthropic, responses[id]))
    );
    const confidence = {};
    agentIds.forEach((id, idx) => {
      confidence[id] = scores[idx];
    });

    // Overall risk assessment based on all 6 perspectives
    const riskAssessment = await assessRisk(anthropic, responses);

    return Response.json({ responses, confidence, riskAssessment });
  } catch (error) {
    if (isMissingEnvError(error)) {
      return Response.json(
        { error: error?.message || "Configure ANTHROPIC_API_KEY in .env.local." },
        { status: 503 }
      );
    }
    return Response.json(
      { error: error?.message || "Simulation failed" },
      { status: 500 }
    );
  }
}
