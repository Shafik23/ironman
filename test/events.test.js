import assert from 'node:assert/strict';
import test from 'node:test';

import { events } from '../js/events.js';

test('event bus emits payloads to subscribed handlers', () => {
  const eventName = 'test:emit-payload';
  const payloads = [];
  const unsubscribe = events.on(eventName, payload => payloads.push(payload));

  events.emit(eventName, { system: 'arc-reactor', value: 42 });
  unsubscribe();

  assert.deepEqual(payloads, [{ system: 'arc-reactor', value: 42 }]);
});

test('event bus unsubscribe removes only the matching handler', () => {
  const eventName = 'test:unsubscribe';
  const calls = [];
  const first = payload => calls.push(`first:${payload}`);
  const second = payload => calls.push(`second:${payload}`);

  const unsubscribeFirst = events.on(eventName, first);
  const unsubscribeSecond = events.on(eventName, second);

  unsubscribeFirst();
  events.emit(eventName, 'mark-7');
  unsubscribeSecond();

  assert.deepEqual(calls, ['second:mark-7']);
});

test('event bus keeps dispatching when handlers mutate subscriptions', () => {
  const eventName = 'test:mutating-listeners';
  const calls = [];
  let unsubscribeSecond;

  const first = () => {
    calls.push('first');
    unsubscribeSecond();
  };
  const second = () => calls.push('second');

  const unsubscribeFirst = events.on(eventName, first);
  unsubscribeSecond = events.on(eventName, second);

  events.emit(eventName);
  unsubscribeFirst();

  assert.deepEqual(calls, ['first', 'second']);
});

test('event bus isolates handler failures', () => {
  const eventName = 'test:error-isolation';
  const calls = [];
  const originalConsoleError = console.error;
  console.error = () => {};

  const unsubscribeThrowing = events.on(eventName, () => {
    throw new Error('simulated suit fault');
  });
  const unsubscribeHealthy = events.on(eventName, payload => calls.push(payload));

  try {
    events.emit(eventName, 'backup-online');
  } finally {
    unsubscribeThrowing();
    unsubscribeHealthy();
    console.error = originalConsoleError;
  }

  assert.deepEqual(calls, ['backup-online']);
});
