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

const neo4j = require("neo4j-driver");

async function test() {
  console.log("Duke testuar Neo4j connection...");
  
  const driver = neo4j.default.driver(
    process.env.NEO4J_URI,
    neo4j.default.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
  );

  const session = driver.session();
  try {
    const result = await session.run("RETURN 'Neo4j connected!' AS message");
    console.log(result.records[0].get("message"));
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

test();
