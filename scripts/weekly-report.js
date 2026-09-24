import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "List the test files in backend/tests/ and summarize what each one covers in one sentence.",
  options: { maxTurns: 3, allowedTools: ["Read"] },
})) {
  console.log("[message type]:", message.type, message.subtype ?? "");
  if (message.type === "result" && message.subtype === "success") {
    console.log("\n--- FINAL RESULT ---");
    console.log(message.result);
  }
}
