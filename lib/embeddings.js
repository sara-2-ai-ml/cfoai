import OpenAI from "openai";

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function createEmbedding(text) {
  const openai = getClient();
  const input = text.length > 8000 ? text.slice(0, 8000) : text;
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input
  });
  return response.data[0].embedding;
}

export async function createEmbeddings(texts) {
  return Promise.all(texts.map((text) => createEmbedding(text)));
}
