// Local stdio MCP server — habit-reminders
// Implements the MCP JSON-RPC protocol over stdin/stdout.
// Logs and reminder output go to stderr so they don't corrupt the protocol stream.

import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function respond(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function errorResponse(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

const TOOLS = [
  {
    name: 'send_reminder',
    description: 'Send a streak reminder for a habit that is at risk of breaking today',
    inputSchema: {
      type: 'object',
      properties: {
        habitName: { type: 'string', description: 'Name of the habit' },
        streakCount: { type: 'number', description: 'Current streak length in days' },
      },
      required: ['habitName', 'streakCount'],
    },
  },
];

rl.on('line', (line) => {
  let msg;
  try {
    msg = JSON.parse(line.trim());
  } catch {
    return;
  }

  const { id, method, params } = msg;

  if (method === 'initialize') {
    respond(id, {
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'habit-reminders', version: '1.0.0' },
      capabilities: { tools: {} },
    });

  } else if (method === 'notifications/initialized') {
    // notification — no response required

  } else if (method === 'tools/list') {
    respond(id, { tools: TOOLS });

  } else if (method === 'tools/call') {
    const { name, arguments: args } = params;
    if (name === 'send_reminder') {
      const { habitName, streakCount } = args;
      const msg = `[habit-reminders] Reminder sent: "${habitName}" — ${streakCount}-day streak at risk of breaking. Check in before midnight!`;
      process.stderr.write(msg + '\n');
      respond(id, {
        content: [{ type: 'text', text: msg }],
      });
    } else {
      errorResponse(id, -32601, `Unknown tool: ${name}`);
    }

  } else if (id !== undefined) {
    errorResponse(id, -32601, `Method not found: ${method}`);
  }
});

process.stderr.write('[habit-reminders MCP] Server started\n');
