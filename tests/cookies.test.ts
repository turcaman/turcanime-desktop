import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCookies } from '../src/main/cookies';

test('mergeCookies replaces values and appends new cookies', () => {
  const merged = mergeCookies('a=1; b=2', ['a=3; Path=/; HttpOnly', 'c=4']);
  assert.equal(merged, 'a=3; b=2; c=4');
});

test('mergeCookies drops malformed cookie pairs', () => {
  assert.equal(mergeCookies('', ['=bad', 'no-equals', 'd=5']), 'd=5');
  assert.equal(mergeCookies('keep=1', ['=bad']), 'keep=1');
});
