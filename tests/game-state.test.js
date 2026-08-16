'use strict';

// 游戏核心逻辑单测：资源/建造/生产/移动/战斗/胜负/AI。
// 全部为纯逻辑，不依赖平台 API。

const test = require('node:test');
const assert = require('node:assert');

const C = require('../game/config');
const S = require('../game/state');
const AI = require('../game/ai');

const TILE = C.TILE;
const TEAM = C.TEAM;

function makeGame(seed) {
  return S.createGame({ seed: seed == null ? 42 : seed });
}

function run(state, ms) {
  const dt = 16;
  let t = 0;
  while (t < ms) {
    S.update(state, dt);
    AI.updateAI(state, dt);
    t += dt;
  }
}

function ownUnits(state, team) {
  return state.ents.filter((e) => e.kind === 'unit' && e.team === team);
}

function ownBuildings(state, team, type) {
  return state.ents.filter((e) => e.kind === 'building' && e.team === team && (!type || e.type === type));
}

// 找一块可放置 w×h 建筑的空地（避开出生基地）
function findFree(state, w, h) {
  const base = ownBuildings(state, TEAM.P, 'base')[0];
  for (let gy = 0; gy <= C.MAP_ROWS - h; gy++) {
    for (let gx = 0; gx <= C.MAP_COLS - w; gx++) {
      const onBase = base && gx < base.gx + base.w && gx + w > base.gx && gy < base.gy + base.h && gy + h > base.gy;
      if (onBase) continue;
      if (S.rectFits(state, gx, gy, w, h, TEAM.P)) return { gx, gy };
    }
  }
  return null;
}

test('初始状态：双方各有一个基地与初始资金', () => {
  const s = makeGame();
  assert.strictEqual(ownBuildings(s, TEAM.P, 'base').length, 1);
  assert.strictEqual(ownBuildings(s, TEAM.E, 'base').length, 1);
  assert.strictEqual(s.money.P, C.START_GOLD);
  assert.strictEqual(s.money.E, C.START_GOLD);
});

test('建造：资金充足时可在空地放建筑，不足时拒绝', () => {
  const s = makeGame();
  const spot = findFree(s, 2, 2);
  const res = S.placeBuilding(s, TEAM.P, 'barracks', spot.gx, spot.gy);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(ownBuildings(s, TEAM.P, 'barracks').length, 1);
  assert.strictEqual(s.money.P, C.START_GOLD - C.BUILDINGS.barracks.cost);

  s.money.P = 0;
  const res2 = S.placeBuilding(s, TEAM.P, 'factory', spot.gx, spot.gy);
  assert.strictEqual(res2.ok, false);
  assert.strictEqual(res2.reason, '资金不足');
});

test('建造：岩石/重叠位置不可用', () => {
  const s = makeGame();
  let rock = null;
  outer: for (let gy = 0; gy < C.MAP_ROWS; gy++) {
    for (let gx = 0; gx < C.MAP_COLS; gx++) {
      if (s.map[gy][gx] === C.TILE_KIND.ROCK) {
        rock = { gx, gy };
        break outer;
      }
    }
  }
  if (rock) {
    const res = S.placeBuilding(s, TEAM.P, 'turret', rock.gx, rock.gy);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.reason, '位置不可用');
  }
  const base = ownBuildings(s, TEAM.P, 'base')[0];
  const res2 = S.placeBuilding(s, TEAM.P, 'barracks', base.gx, base.gy);
  assert.strictEqual(res2.ok, false);
});

test('生产：兵营排队后按 buildMs 产出步兵', () => {
  const s = makeGame();
  s.money.P = 10000;
  const spot = findFree(s, 2, 2);
  S.placeBuilding(s, TEAM.P, 'barracks', spot.gx, spot.gy);
  const res = S.queueUnit(s, TEAM.P, 'infantry');
  assert.strictEqual(res.ok, true);
  const b = ownBuildings(s, TEAM.P, 'barracks')[0];
  assert.strictEqual(b.prodQueue.length, 1);
  run(s, C.UNITS.infantry.buildMs + 200);
  assert.strictEqual(ownUnits(s, TEAM.P).length, 1);
  assert.strictEqual(b.prodQueue.length, 0);
});

test('生产：没有对应建筑时拒绝生产', () => {
  const s = makeGame();
  s.money.P = 10000;
  const res = S.queueUnit(s, TEAM.P, 'tank');
  assert.strictEqual(res.ok, false);
  assert.ok(res.reason.indexOf('生产建筑') >= 0);
});

test('移动：下达移动指令后单位靠近目标点', () => {
  const s = makeGame();
  const u = S.spawnUnit(s, TEAM.P, 'infantry', 300, 300);
  const startX = u.x;
  S.giveOrder(s, [u.id], { kind: 'move', x: startX + 200, y: u.y });
  run(s, 3000);
  assert.ok(Math.abs(u.x - (startX + 200)) < 80, `期望靠近目标点，实际位移=${Math.round(Math.abs(u.x - startX))}`);
});

test('战斗：单位会攻击射程内敌方单位并造成伤害', () => {
  const s = makeGame();
  const p = S.spawnUnit(s, TEAM.P, 'infantry', 300, 300);
  const e = S.spawnUnit(s, TEAM.E, 'infantry', 320, 300);
  const eHp0 = e.hp;
  run(s, 3000);
  assert.ok(e.hp < eHp0, '敌方单位应受到伤害');
  assert.ok(p.hp > 0, '玩家单位应存活');
});

test('战斗：攻击指令会让单位追打目标', () => {
  const s = makeGame();
  const p = S.spawnUnit(s, TEAM.P, 'tank', 300, 300);
  const e = S.spawnUnit(s, TEAM.E, 'tank', 500, 300);
  S.giveOrder(s, [p.id], { kind: 'attack', targetId: e.id });
  run(s, 8000);
  assert.ok(e.hp < e.maxHp, '目标应被打');
});

test('胜负：敌方基地被摧毁后判胜', () => {
  const s = makeGame();
  const eBase = ownBuildings(s, TEAM.E, 'base')[0];
  eBase.hp = 1;
  S.spawnUnit(s, TEAM.P, 'tank', eBase.x + TILE * 2, eBase.y);
  run(s, 20000);
  assert.ok(s.over, '游戏应结束');
  assert.strictEqual(s.over.winner, TEAM.P);
});

test('胜负：玩家基地被摧毁后判负', () => {
  const s = makeGame();
  const pBase = ownBuildings(s, TEAM.P, 'base')[0];
  pBase.hp = 1;
  S.spawnUnit(s, TEAM.E, 'tank', pBase.x + TILE * 2, pBase.y);
  run(s, 20000);
  assert.ok(s.over);
  assert.strictEqual(s.over.winner, TEAM.E);
});

test('收入：时间到账后资金增加，矿场提升收入', () => {
  const s = makeGame();
  const before = s.money.P;
  run(s, C.INCOME.tickMs + 100);
  assert.ok(s.money.P > before, '资金应随时间增加');

  const s2 = makeGame();
  s2.money.P = 10000;
  const spot = findFree(s2, 2, 2);
  S.placeBuilding(s2, TEAM.P, 'refinery', spot.gx, spot.gy);
  const afterPlace = s2.money.P;
  run(s2, C.INCOME.tickMs + 100);
  const gained = s2.money.P - afterPlace;
  assert.ok(gained >= C.INCOME.base + C.INCOME.perRefinery, `带矿场收入应含加成，实际+${gained}`);
});

test('AI：会自主发展并出兵进攻玩家', () => {
  const s = makeGame();
  run(s, 120000);
  assert.ok(ownBuildings(s, TEAM.E, 'barracks').length >= 1, 'AI 应造出兵营');
  assert.ok(ownUnits(s, TEAM.E).length >= 1, 'AI 应造出单位');
});

test('AI：长时间运行玩家不操作时会被击败', () => {
  const s = makeGame();
  run(s, 240000);
  assert.ok(s.over && s.over.winner === TEAM.E, `4 分钟后 AI 应获胜，实际=${s.over ? s.over.winner : '未结束'}`);
});
