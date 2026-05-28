/**
 * CFOai RAGAS Evaluation
 * Run: node scripts/eval.cjs
 * Kerkon: npm run dev aktiv ne http://localhost:3000
 */

"use strict";

const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const AnthropicModule = require("@anthropic-ai/sdk");
const Anthropic = AnthropicModule.default ?? AnthropicModule;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_URL = "http://localhost:3000";

const TEST_CASES = [
  { question: "What was Apple total revenue for Q1 FY26?",
    ground_truth: "Apple total revenue for Q1 FY26 was $143,756 million." },
  { question: "What was iPhone revenue in Q1 FY26?",
    ground_truth: "iPhone revenue in Q1 FY26 was $85,269 million." },
  { question: "What was Apple net income for Q1 FY26?",
    ground_truth: "Apple net income for Q1 FY26 was $42,097 million." },
  { question: "What was the gross margin percentage in Q1 FY26?",
    ground_truth: "Apple gross margin was 48.2% in Q1 FY26." },
  { question: "What was Services revenue in Q1 FY26?",
    ground_truth: "Services revenue was $30,013 million in Q1 FY26." },
  { question: "How did iPhone revenue change year over year?",
    ground_truth: "iPhone revenue grew 23.3% from $69,138M in Q1 FY25 to $85,269M in Q1 FY26." },
  { question: "What was Mac revenue in Q1 FY26?",
    ground_truth: "Mac revenue was $8,386 million in Q1 FY26." },
  { question: "What was the diluted EPS in Q1 FY26?",
    ground_truth: "Diluted EPS was $2.84 in Q1 FY26." },
  { question: "What was iPad revenue in Q1 FY26?",
    ground_truth: "iPad revenue was $8,595 million in Q1 FY26." },
  { question: "What was the operating income in Q1 FY26?",
    ground_truth: "Operating income was $50,852 million in Q1 FY26." },
];

async function queryPipeline(question) {
  const res = await fetch(BASE_URL + "/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let answer = "", citations = [], buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.split("\n").find((x) => x.startsWith("data: "));
      if (!line) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "token") answer += data.token;
        if (data.type === "done") citations = data.citations || [];
      } catch {}
    }
  }
  return { answer, citations };
}

async function judgeWithClaude(question, answer, groundTruth, citations) {
  const prompt = `You are evaluating a RAG system for financial documents.

Question: "${question}"
Ground Truth: "${groundTruth}"
AI Answer: "${answer}"
Citations: ${citations.length} sources

Score each metric 0.0 to 1.0:
- FAITHFULNESS: Are all facts correct and grounded?
- ANSWER_RELEVANCY: Does it directly answer the question?
- CONTEXT_PRECISION: Are key facts from ground truth present?

Respond ONLY with JSON (no markdown):
{"faithfulness": 0.0, "answer_relevancy": 0.0, "context_precision": 0.0}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text.trim();
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[^}]+\}/);
    return m ? JSON.parse(m[0]) : { faithfulness: 0, answer_relevancy: 0, context_precision: 0 };
  }
}

function printResults(results) {
  console.log("\n" + "=".repeat(60));
  console.log("  CFOai - RAGAS EVALUATION RESULTS");
  console.log("=".repeat(60));

  let tF = 0, tR = 0, tP = 0;

  results.forEach((r, i) => {
    const f = (r.scores.faithfulness * 100).toFixed(0);
    const rv = (r.scores.answer_relevancy * 100).toFixed(0);
    const p = (r.scores.context_precision * 100).toFixed(0);
    const icon = (v) => v >= 80 ? "OK" : v >= 50 ? "!!" : "XX";
    console.log(`\n[${i + 1}] ${r.question}`);
    console.log(`    [${icon(+f)}] Faithfulness:      ${f}%`);
    console.log(`    [${icon(+rv)}] Answer Relevancy:  ${rv}%`);
    console.log(`    [${icon(+p)}] Context Precision: ${p}%`);
    console.log(`    Citations: ${r.citations}`);
    tF += r.scores.faithfulness;
    tR += r.scores.answer_relevancy;
    tP += r.scores.context_precision;
  });

  const n = results.length;
  const aF = ((tF / n) * 100).toFixed(1);
  const aR = ((tR / n) * 100).toFixed(1);
  const aP = ((tP / n) * 100).toFixed(1);
  const overall = (((tF + tR + tP) / (n * 3)) * 100).toFixed(1);

  console.log("\n" + "-".repeat(60));
  console.log("  FINAL SCORES");
  console.log("-".repeat(60));
  console.log(`  Faithfulness:      ${aF}%`);
  console.log(`  Answer Relevancy:  ${aR}%`);
  console.log(`  Context Precision: ${aP}%`);
  console.log("-".repeat(60));
  console.log(`  OVERALL SCORE:     ${overall}%`);
  console.log("=".repeat(60));
  console.log(`\nCV LINE:`);
  console.log(`"RAGAS-evaluated pipeline: ${aF}% faithfulness, ${aR}% answer relevancy, ${aP}% context precision"\n`);
}

async function main() {
  console.log("\nCFOai RAGAS Evaluation - Duke filluar...");
  console.log(TEST_CASES.length + " test cases\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY mungon ne .env.local");
    process.exit(1);
  }

  const results = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    process.stdout.write(`[${i + 1}/${TEST_CASES.length}] ${tc.question.slice(0, 45)}... `);
    try {
      const { answer, citations } = await queryPipeline(tc.question);
      const scores = await judgeWithClaude(tc.question, answer, tc.ground_truth, citations);
      results.push({ question: tc.question, scores, citations: citations.length });
      const avg = (((scores.faithfulness + scores.answer_relevancy + scores.context_precision) / 3) * 100).toFixed(0);
      console.log(avg + "%");
    } catch (err) {
      console.log("ERROR: " + err.message);
      results.push({ question: tc.question, scores: { faithfulness: 0, answer_relevancy: 0, context_precision: 0 }, citations: 0 });
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  printResults(results);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});