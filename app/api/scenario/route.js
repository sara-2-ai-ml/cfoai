import Anthropic from "@anthropic-ai/sdk";
import { isMissingEnvError } from "@/lib/infrastructure-errors";

export const runtime = "nodejs";

const agentPersonas = {
  cfo: "a risk-averse CFO focused on costs, risks, and financial stability",
  investor: "an aggressive growth investor looking for opportunity",
  analyst: "a neutral financial analyst comparing to industry standards",
  shortSeller: "a short seller looking for red flags and risks",
  press: "a financial journalist writing headlines",
  regulator: "a financial regulator focused on compliance and risk signals",
};

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is missing");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function callScenarioAgent(anthropic, agentId, scenarioText, summaryText) {
  const persona = agentPersonas[agentId];
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: `You are ${persona}. Respond in plain text only, no headers, no bullet points. Maximum 3 sentences.`,
    messages: [
      {
        role: "user",
        content: `SCENARIO: ${scenarioText}\n\nGiven this financial context: ${summaryText}\n\nHow does this specific scenario change your analysis? Be specific about the impact.`
      }
    ],
  });

  return response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function assessScenarioRisk(anthropic, scenarioText, responses) {
  const perspectives = Object.entries(responses)
    .map(([id, text]) => `${id}: ${text}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 250,
    system: "You are a financial risk assessor evaluating a what-if scenario. Respond ONLY with valid JSON, no markdown fences.",
    messages: [
      {
        role: "user",
        content: `Given scenario: "${scenarioText}" and these 6 analyst responses:\n${perspectives}\n\nProvide updated risk assessment in this exact JSON format:\n{"score": 85, "level": "HIGH RISK", "factors": ["Factor 1", "Factor 2", "Factor 3"]}\n\nRules:\n- score: integer 0-100\n- level: "LOW RISK" (0-40), "MODERATE RISK" (41-70), or "HIGH RISK" (71-100)\n- factors: exactly 3 short sentences`
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
    const score = typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 70;
    const level = typeof parsed.level === "string" ? parsed.level : (score <= 40 ? "LOW RISK" : score <= 70 ? "MODERATE RISK" : "HIGH RISK");
    const factors = Array.isArray(parsed.factors) ? parsed.factors.slice(0, 3).map(String) : [];
    return { score, level, factors };
  } catch {
    return { score: 70, level: "HIGH RISK", factors: [] };
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenario = typeof body.scenario === "string" ? body.scenario.trim() : "";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";

    if (!scenario) {
      return Response.json({ error: "Scenario text is required" }, { status: 400 });
    }
    if (!summary) {
      return Response.json({ error: "Financial summary is required" }, { status: 400 });
    }

    const anthropic = getAnthropicClient();
    const truncatedSummary = summary.length > 6000 ? `${summary.slice(0, 6000)}\n…` : summary;

    const agentIds = Object.keys(agentPersonas);
    const results = await Promise.all(
      agentIds.map((id) => callScenarioAgent(anthropic, id, scenario, truncatedSummary))
    );

    const responses = {};
    agentIds.forEach((id, idx) => {
      responses[id] = results[idx];
    });

    const riskAssessment = await assessScenarioRisk(anthropic, scenario, responses);

    return Response.json({ responses, riskAssessment });
  } catch (error) {
    if (isMissingEnvError(error)) {
      return Response.json(
        { error: error?.message || "Configure ANTHROPIC_API_KEY in .env.local." },
        { status: 503 }
      );
    }
    return Response.json(
      { error: error?.message || "Scenario analysis failed" },
      { status: 500 }
    );
  }
}
