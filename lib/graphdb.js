import neo4j from "neo4j-driver";

let driver;

function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error("NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD mungojnë në .env.local");
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export async function runQuery(cypher, params = {}) {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } catch (err) {
    console.error("Neo4j query error:", err.message);
    return [];
  } finally {
    await session.close();
  }
}

export async function testConnection() {
  try {
    await runQuery("RETURN 1");
    console.log("Neo4j connected successfully");
    return true;
  } catch {
    return false;
  }
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}