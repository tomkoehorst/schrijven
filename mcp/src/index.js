// Schrijfkamer — MCP-server voor Claude Desktop (draait op je eigen computer)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCore, VERSION } from './core.js';

const core = createCore({
  url: process.env.SCHRIJF_SUPABASE_URL, key: process.env.SCHRIJF_SUPABASE_KEY, fn: process.env.SCHRIJF_FUNCTION,
  email: process.env.SCHRIJF_EMAIL, password: process.env.SCHRIJF_PASSWORD
});
const server = new McpServer({ name: 'schrijfkamer', version: VERSION });
for (const t of core.tools) server.tool(t.name, t.description, t.shape, t.handler);
for (const p of core.prompts) server.prompt(p.name, p.description, p.shape, p.render);
server.connect(new StdioServerTransport()).catch(e => { console.error(e); process.exit(1); });
