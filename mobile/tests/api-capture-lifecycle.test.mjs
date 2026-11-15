import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldInterruptCapture, waitForCaptureForeground } from '../../shared/captureLifecycle.ts';

test('permission and startup transitions do not cancel a recording that has not started', () => {
  for (const state of ['inactive', 'background', 'active', 'unknown']) assert.equal(shouldInterruptCapture(false, state), false);
});

test('temporary inactive UI does not discard camera capture', () => {
  assert.equal(shouldInterruptCapture(true, 'inactive'), false);
  assert.equal(shouldInterruptCapture(true, 'active'), false);
});

test('a real background transition cancels an active recording', () => {
  assert.equal(shouldInterruptCapture(true, 'background'), true);
});

test('recording waits for permission UI to close and releases the temporary listener', async () => {
  let listener, removed = false, ready = false;
  const source = { currentState: 'background', addEventListener: (_, callback) => {
    listener = callback; return { remove: () => { removed = true; } };
  } };
  const pending = waitForCaptureForeground(source, 10, 500).then(() => { ready = true; });
  assert.equal(ready, false);
  listener('active');
  listener('inactive');
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(ready, false);
  listener('active');
  await pending;
  assert.equal(ready, true);
  assert.equal(removed, true);
});

test('remaining in the background produces a startup error without leaving a listener', async () => {
  let removed = false;
  const source = { currentState: 'background', addEventListener: () => ({ remove: () => { removed = true; } }) };
  await assert.rejects(waitForCaptureForeground(source, 5, 20), /layar depan/);
  assert.equal(removed, true);
});
