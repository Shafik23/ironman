import assert from 'node:assert/strict';
import test from 'node:test';

import { SUIT_ZOOM } from '../js/constants.js';
import { resetSuitSystems, setSuitZoom } from '../js/suit-model.js';

test('suit model clamps zoom to configured schematic range', () => {
  resetSuitSystems({ source: 'test' });

  assert.equal(setSuitZoom(200, { source: 'test' }).zoom, 200);
  assert.equal(setSuitZoom(250, { source: 'test' }).zoom, SUIT_ZOOM.MAX);
  assert.equal(setSuitZoom(10, { source: 'test' }).zoom, SUIT_ZOOM.MIN);
});
