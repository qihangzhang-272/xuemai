import { execFileSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
const portArg = process.argv.find((arg) => arg.startsWith("--port="));
const hostArg = process.argv.find((arg) => arg.startsWith("--host="));
const port = Number(portArg?.split("=")[1] ?? process.env.PORT ?? 3016);
const host = hostArg?.split("=")[1] ?? process.env.HOSTNAME ?? "127.0.0.1";
const clean = !args.has("--no-clean");
const stopOnly = args.has("--stop-only");

if (!Number.isInteger(port) || port <= 0) {
  console.error("[dev-stable] Invalid port. Use --port=3016.");
  process.exit(1);
}

stopPortListeners(port);
if (stopOnly) {
  process.exit(0);
}
wait(800);

if (clean) {
  const nextDir = join(process.cwd(), ".next");
  if (existsSync(nextDir)) {
    console.log("[dev-stable] Removing .next to avoid stale HMR/cache state.");
    rmSync(nextDir, { force: true, recursive: true });
  }
}

const nextBin = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const visibleHost = host === "0.0.0.0" ? "127.0.0.1" : host;

console.log(`[dev-stable] Starting Next dev at http://${visibleHost}:${port}/dashboard`);
const child = spawn(nextBin, ["dev", "-H", host, "-p", String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, HOSTNAME: host, PORT: String(port) },
  stdio: "inherit"
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

function stopPortListeners(targetPort) {
  const pids = getPortPids(targetPort).filter((pid) => pid !== process.pid);
  if (!pids.length) {
    console.log(`[dev-stable] Port ${targetPort} is free.`);
    return;
  }

  console.log(`[dev-stable] Stopping existing listener(s) on port ${targetPort}: ${pids.join(", ")}`);
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      console.error(`[dev-stable] Failed to stop PID ${pid}. Close it manually or rerun with permission.`);
      throw error;
    }
  }

  if (waitForPortFree(targetPort, 3000)) {
    console.log(`[dev-stable] Port ${targetPort} is free.`);
    return;
  }

  const remaining = getPortPids(targetPort).filter((pid) => pid !== process.pid);
  if (remaining.length) {
    console.log(`[dev-stable] Force stopping listener(s) still on port ${targetPort}: ${remaining.join(", ")}`);
    for (const pid of remaining) {
      process.kill(pid, "SIGKILL");
    }
  }

  if (waitForPortFree(targetPort, 2000)) {
    console.log(`[dev-stable] Port ${targetPort} is free.`);
    return;
  }

  throw new Error(`[dev-stable] Port ${targetPort} is not ready. Listening PID(s): ${getPortPids(targetPort).join(", ") || "none"}.`);
}

function wait(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForPortFree(targetPort, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = getPortPids(targetPort).filter((pid) => pid !== process.pid);
    if (!remaining.length) return true;
    wait(100);
  }
  return false;
}

function getPortPids(targetPort) {
  try {
    return execFileSync("lsof", ["-nP", `-tiTCP:${targetPort}`, "-sTCP:LISTEN"], { encoding: "utf8" })
      .split(/\s+/)
      .filter(Boolean)
      .map((pid) => Number(pid))
      .filter((pid, index, pids) => Number.isInteger(pid) && pids.indexOf(pid) === index);
  } catch {
    return [];
  }
}
