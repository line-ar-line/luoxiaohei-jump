import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, jumpDistance, containsPoint } from '../src/game.js';

test('蓄力距离有上下限，且可覆盖所有生成的浮岛间距', () => {
  assert.equal(jumpDistance(-1), RULES.minDistance);
  assert.equal(jumpDistance(2), RULES.minDistance + RULES.distanceRange);
  for (let dx = 145; dx <= 222; dx++) {
    const distance = Math.hypot(dx, dx * .52);
    const charge = (distance - RULES.minDistance) / RULES.distanceRange;
    assert.ok(charge > 0 && charge < 1);
    assert.ok(Math.abs(jumpDistance(charge) - distance) < .0001);
  }
});

test('等距菱形落点排除矩形包围框内、浮岛外的角落', () => {
  const island = { x: 100, y: 80, width: 140, depth: 70 };
  assert.equal(containsPoint(island, { x: 100, y: 80 }), true);
  assert.equal(containsPoint(island, { x: 160, y: 80 }), true);
  assert.equal(containsPoint(island, { x: 100, y: 110 }), true);
  assert.equal(containsPoint(island, { x: 160, y: 110 }), false);
  assert.equal(containsPoint(island, { x: 171, y: 80 }), false);
  assert.equal(containsPoint(island, { x: 100, y: 116 }), false);
});

test('碰撞判定在长距离世界坐标下保持平移一致', () => {
  for (let i = 0; i < 1000; i++) {
    const x = i * 193, y = -i * 97;
    assert.equal(containsPoint({ x, y, width: 120, depth: 60 }, { x: x + 20, y: y - 5 }), true);
    assert.equal(containsPoint({ x, y, width: 120, depth: 60 }, { x: x + 59, y: y + 20 }), false);
  }
});
