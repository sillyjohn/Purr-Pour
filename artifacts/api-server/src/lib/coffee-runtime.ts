import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { logger } from "./logger";

// A private loopback service, not a browser-facing URL.
export const coffeePort = 8091;
export const gatewaySecret = process.env.COFFEE_GATEWAY_SECRET || randomBytes(48).toString("hex");

let child: ChildProcess | undefined;

export async function startCoffeeRuntime(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for the Spring Boot backend");
  const database = new URL(databaseUrl);
  const params = new URLSearchParams(database.search);
  const jdbc = `jdbc:postgresql://${database.hostname}:${database.port || "5432"}${database.pathname}${params.size ? `?${params}` : ""}`;
  const jar = fileURLToPath(new URL("../../../services/coffee-api/target/coffee-api-1.0.0.jar", import.meta.url));
  if (!existsSync(jar)) throw new Error("Spring Boot jar missing. Run the API build first.");
  child = spawn("java", ["-Xms64m", "-Xmx256m", "-jar", jar], {
    env: {
      ...process.env,
      COFFEE_PORT: String(coffeePort),
      COFFEE_BIND: "127.0.0.1",
      COFFEE_GATEWAY_SECRET: gatewaySecret,
      COFFEE_JDBC_URL: jdbc,
      COFFEE_DB_USER: decodeURIComponent(database.username),
      COFFEE_DB_PASSWORD: decodeURIComponent(database.password),
    },
    stdio: "inherit",
  });
  let exited = false;
  child.once("exit", (code) => {
    exited = true;
    logger.error({ code }, "Spring Boot process stopped");
    process.exitCode = 1;
    process.kill(process.pid, "SIGTERM");
  });
  child.once("error", (err) => { exited = true; logger.error({ err }, "Spring Boot process failed"); });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (exited) throw new Error("Spring Boot did not start");
    const ready = await new Promise<boolean>((resolveReady) => {
      const socket = createConnection({ port: coffeePort, host: "127.0.0.1" });
      socket.once("connect", () => { socket.destroy(); resolveReady(true); });
      socket.once("error", () => { socket.destroy(); resolveReady(false); });
    });
    if (ready) { logger.info("Spring Boot coffee backend is ready"); return; }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Spring Boot startup timed out");
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    child?.removeAllListeners("exit");
    child?.kill(signal);
    setTimeout(() => process.exit(0), 200).unref();
  });
}
