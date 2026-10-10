import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../server/.env') });

const TOPICS = [
  'animals', 'nature', 'food and fruit', 'vehicles', 'weather',
  'plants', 'space', 'school supplies', 'sports', 'household objects',
];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Set GEMINI_API_KEY in server/.env');
  }
  return new OpenAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey,
  });
}

const getModel = () => process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

const server = new McpServer({ name: 'eduplayground', version: '1.0.0' });

server.tool(
  'generate_riddle',
  'Generate a kid-friendly riddle powered by Google Gemini. Returns the riddle question, answer, and explanation.',
  {
    topic: z.string().optional().describe(
      'Topic for the riddle, e.g. animals, space, food and fruit. A random topic is chosen if omitted.'
    ),
  },
  async ({ topic }) => {
    const client = getClient();
    const chosen = topic || TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: `You are a creative educator generating child-friendly riddles for kids aged 5-10.
Respond ONLY with valid JSON using exactly these fields:
{ "prompt": "the riddle as a fun question", "answerText": "one or two word answer", "explanation": "one friendly sentence", "topic": "subject area" }`,
        },
        { role: 'user', content: `Generate one riddle about: ${chosen}` },
      ],
      temperature: 0.85,
      max_tokens: 256,
      response_format: { type: 'json_object' },
    });
    const riddle = JSON.parse(completion.choices[0].message.content);
    return {
      content: [{
        type: 'text',
        text: `**Topic:** ${riddle.topic}\n\n**Riddle:** ${riddle.prompt}\n\n**Answer:** ||${riddle.answerText}||\n\n**Explanation:** ${riddle.explanation}`,
      }],
    };
  }
);

server.tool(
  'generate_logo_hint',
  'Generate a child-friendly visual clue for a brand logo without revealing the brand name. Powered by Google Gemini.',
  {
    brand_name: z.string().describe('The brand to generate a hint for, e.g. YouTube, Apple, Nike.'),
  },
  async ({ brand_name }) => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: `You give child-friendly hints about a brand's logo without naming the brand.
Describe the logo's colors, shape or symbol, and what the company does in 2-3 short sentences.
Never say the brand name. Respond with JSON: { "hint": "..." }`,
        },
        { role: 'user', content: `Give a hint for the brand: ${brand_name}` },
      ],
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });
    const { hint } = JSON.parse(completion.choices[0].message.content);
    return {
      content: [{
        type: 'text',
        text: `**Logo Hint for "${brand_name}":**\n\n${hint}`,
      }],
    };
  }
);

server.tool(
  'list_exams',
  'List all available practice exam topics in the EduPlayground platform.',
  {},
  async () => ({
    content: [{
      type: 'text',
      text: [
        '**EduPlayground — Available Practice Exams:**',
        '',
        '| ID | Title | Description |',
        '|---|---|---|',
        '| `aws` | AWS Cloud Practitioner | Core AWS services, security, pricing, and architecture |',
        '| `azure` | Azure Fundamentals | Core Azure services, governance, and security |',
        '| `kubernetes` | Kubernetes Basics | Pods, deployments, services, and networking |',
        '| `docker` | Docker Essentials | Containers, images, networking, and volumes |',
        '',
        'Each exam has 50 randomised questions with a full answer review after submission.',
      ].join('\n'),
    }],
  })
);

server.tool(
  'gemini_status',
  'Check whether the Google Gemini API integration is configured.',
  {},
  async () => ({
    content: [{
      type: 'text',
      text: process.env.GEMINI_API_KEY?.trim()
        ? '✅ Gemini is configured. The API key is present and AI features are active.'
        : '❌ Gemini is NOT configured. Set GEMINI_API_KEY in server/.env to enable AI features.',
    }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
