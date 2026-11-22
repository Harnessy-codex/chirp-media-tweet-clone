/**
 * Chirp server
 * Uses built-in Node.js tools only. No server framework is needed.
 * It serves the website and keeps the OpenRouter key on the server.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Read settings from .env without using an extra package.
function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsAt = trimmed.indexOf('=');
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    let value = trimmed.slice(equalsAt + 1).trim();
    if (!key || Object.hasOwn(process.env, key)) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openrouter/free';
const MAX_BODY_SIZE = 100 * 1024;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 12000;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const requestTimes = new Map();

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(data));
}

function addSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://jsonplaceholder.typicode.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  );
}

function isRateLimited(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const ip = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : '') || request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const recentTimes = (requestTimes.get(ip) || []).filter((time) => time > oneMinuteAgo);

  if (recentTimes.length >= 20) {
    requestTimes.set(ip, recentTimes);
    return true;
  }

  recentTimes.push(now);
  requestTimes.set(ip, recentTimes);
  return false;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      const error = new Error('The request is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Please send valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

function checkMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return null;
  }

  const cleanMessages = [];
  for (const message of messages) {
    if (!message || typeof message !== 'object') return null;
    if (message.role !== 'user' && message.role !== 'assistant') return null;
    if (typeof message.content !== 'string') return null;

    const content = message.content.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) return null;

    cleanMessages.push({ role: message.role, content });
  }

  // A chat request must end with a message from the user.
  if (cleanMessages[cleanMessages.length - 1].role !== 'user') return null;
  return cleanMessages;
}

async function handleChat(request, response) {
  if (isRateLimited(request)) {
    sendJson(response, 429, { error: 'Too many AI requests. Please wait a minute and try again.' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || apiKey === 'put_your_openrouter_key_here') {
    sendJson(response, 503, {
      error: 'Ask AI is not set up yet. Add your OpenRouter key to the .env file, then restart Chirp.',
      code: 'MISSING_API_KEY',
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message });
    return;
  }

  const messages = checkMessages(body?.messages);
  if (!messages) {
    sendJson(response, 400, {
      error: 'The chat message list is not valid. Please try sending your message again.',
    });
    return;
  }

  const systemMessage = {
    role: 'system',
    content:
      'You are the helpful assistant inside Chirp, a social media app. Always use basic English. Use short sentences and common words. Explain hard words in a simple way. Keep your answers clear, friendly and useful. When asked to sum up a post and its comments, explain the main idea and the main replies in a short, easy-to-read way.',
  };

  try {
    const upstreamResponse = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || `http://localhost:${PORT}`,
        'X-Title': 'Chirp Social Feed',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [systemMessage, ...messages],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const result = await upstreamResponse.json().catch(() => ({}));
    if (!upstreamResponse.ok) {
      const apiError = result?.error?.message;
      sendJson(response, 502, {
        error: typeof apiError === 'string'
          ? `The AI service could not answer: ${apiError}`
          : 'The AI service could not answer right now. Please try again.',
      });
      return;
    }

    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      sendJson(response, 502, { error: 'The AI sent an empty reply. Please try again.' });
      return;
    }

    sendJson(response, 200, {
      reply: reply.trim(),
      model: result.model || OPENROUTER_MODEL,
    });
  } catch (error) {
    const message = error?.name === 'TimeoutError'
      ? 'The AI service took too long to reply. Please try again.'
      : 'Could not reach the AI service. Check your internet connection and try again.';
    sendJson(response, 502, { error: message });
  }
}

async function serveFile(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: 'This page address is not valid.' });
    return;
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, relativePath);

  // Do not allow a request to read files outside the project folder.
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    sendJson(response, 403, { error: 'You cannot open this file.' });
    return;
  }

  try {
    const fileInfo = await fs.promises.stat(filePath);
    if (!fileInfo.isFile()) {
      sendJson(response, 404, { error: 'Page not found.' });
      return;
    }

    const file = await fs.promises.readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': path.extname(filePath) === '.html' ? 'no-store' : 'public, max-age=3600',
    });
    if (request.method === 'HEAD') {
      response.end();
    } else {
      response.end(file);
    }
  } catch {
    sendJson(response, 404, { error: 'Page not found.' });
  }
}

const server = http.createServer(async (request, response) => {
  addSecurityHeaders(response);

  let requestUrl;
  try {
    requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  } catch {
    sendJson(response, 400, { error: 'The request address is not valid.' });
    return;
  }

  if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, {
      status: 'ok',
      aiReady: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'put_your_openrouter_key_here'),
    });
    return;
  }

  if (requestUrl.pathname === '/api/chat') {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      sendJson(response, 405, { error: 'Please use POST to send an AI message.' });
      return;
    }
    await handleChat(request, response);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendJson(response, 405, { error: 'This request type is not supported.' });
    return;
  }

  await serveFile(request, response, requestUrl.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Chirp is running at http://${HOST}:${PORT}`);
  console.log('Press Ctrl + C to stop the server.');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the other app or choose a different PORT in .env.`);
  } else {
    console.error('The server could not start:', error.message);
  }
  process.exitCode = 1;
});
