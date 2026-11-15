import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, decodeApiResponse } from '../src/lib/api/response.ts';

test('an old backend plain-text 404 produces an actionable error instead of JSON parse error', async () => {
  const response = new Response('page not found\n', { status: 404 });
  await assert.rejects(decodeApiResponse(response), (error) => error instanceof ApiError
    && error.status === 404 && error.message.includes('backend terbaru') && !error.message.includes('JSON parse'));
});

test('a successful login returns the validated server envelope data', async () => {
  const data = { token: 'test-token', user: { id: 7 } };
  assert.deepEqual(await decodeApiResponse(new Response(JSON.stringify({ success: true, data }))), data);
});

test('JSON authentication errors retain status and message even with a text content type', async () => {
  const response = new Response('{"error":"invalid or expired session"}', { status: 401 });
  await assert.rejects(decodeApiResponse(response), (error) => error instanceof ApiError
    && error.status === 401 && error.message === 'invalid or expired session');
});

test('HTML, empty, and unrelated successful JSON responses are rejected without leaking body contents', async () => {
  for (const body of ['<html>private proxy page</html>', '', 'null', '[]', '{"hello":"metro"}']) {
    await assert.rejects(decodeApiResponse(new Response(body)), (error) => error instanceof ApiError
      && !error.message.includes('private proxy page') && !error.message.includes('metro'));
  }
});
