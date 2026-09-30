import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt:
    "Read backend/models/Habit.js to understand the habit schema. Then read client/src/components/HabitList.jsx to understand streak logic. Generate a weekly habit report summary (habits tracked, streak logic, completion categories) and save it to reports/weekly-report.txt. At the end, print: 'Report saved — would email to the project owner in production.'",
  options: { maxTurns: 10, allowedTools: ["Read", "Write", "Bash(node:*)"] },
})) {
  console.log("[message type]:", message.type, message.subtype ?? "");
  if (message.type === "result" && message.subtype === "success") {
    console.log("\n--- FINAL RESULT ---");
    console.log(message.result);
  }
}
