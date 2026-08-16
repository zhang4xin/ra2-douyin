'use strict';

// 敌方 AI：按节奏发展经济/军备，攒一波兵力后进攻玩家基地。
// 纯逻辑（可用 state.rng 保证可复现），只调用 state.js 的公开操作。

const C = require('./config');
const S = require('./state');

const PLAN_STEPS = [
  { type: 'barracks', when: (s) => countType(s, TEAM_E, 'barracks') === 0 },
  { type: 'factory', when: (s) => countType(s, TEAM_E, 'factory') === 0 },
  { type: 'refinery', when: (s) => countType(s, TEAM_E, 'refinery') < 2 },
  { type: 'turret', when: (s) => countType(s, TEAM_E, 'turret') < 3 },
];

const TEAM_E = C.TEAM.E;
const TEAM_P = C.TEAM.P;

function countType(state, team, type) {
  let n = 0;
  for (const e of state.ents) {
    if (e.kind === 'building' && e.team === team && e.type === type) n++;
  }
  return n;
}

function unitCount(state, team) {
  let n = 0;
  for (const e of state.ents) {
    if (e.kind === 'unit' && e.team === team) n++;
  }
  return n;
}

function ownBase(state, team) {
  return state.ents.find((e) => e.kind === 'building' && e.team === team && e.type === 'base') || null;
}

// 在己方基地附近找一块空地（按环向外搜索，带随机偏移避免死板）
function findTileNearBase(state, team, w, h) {
  const base = ownBase(state, team);
  if (!base) return null;
  const cx = base.gx;
  const cy = base.gy;
  const order = [];
  for (let r = 1; r <= 7; r++) {
    const ring = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        ring.push({ gx: cx + dx, gy: cy + dy });
      }
    }
    // 随机打乱环内顺序
    for (let i = ring.length - 1; i > 0; i--) {
      const j = Math.floor(state.rng() * (i + 1));
      const tmp = ring[i];
      ring[i] = ring[j];
      ring[j] = tmp;
    }
    order.push(...ring);
  }
  for (const c of order) {
    if (S.rectFits(state, c.gx, c.gy, w, h, team)) return c;
  }
  return null;
}

function updateAI(state, dt) {
  if (state.over) return;
  state.aiNext -= dt;
  if (state.aiNext > 0) return;
  state.aiNext = 1000;

  const E = TEAM_E;
  if (!ownBase(state, E)) return;

  // 1. 基建计划
  for (const step of PLAN_STEPS) {
    if (!step.when(state)) continue;
    const def = C.BUILDINGS[step.type];
    if (state.money[E] >= def.cost) {
      const pos = findTileNearBase(state, E, def.w, def.h);
      if (pos) {
        S.placeBuilding(state, E, step.type, pos.gx, pos.gy);
        break;
      }
    }
  }

  // 2. 生产单位（保证攻击波成型）
  const preferred = unitCount(state, E) < 4 ? 'infantry' : 'tank';
  for (const e of state.ents) {
    if (e.kind !== 'building' || e.team !== E) continue;
    const def = C.BUILDINGS[e.type];
    for (const uType of def.produces) {
      if (e.prodQueue.length >= 2) continue;
      const pick = preferred === uType || state.rng() < 0.5;
      if (!pick) continue;
      const uDef = C.UNITS[uType];
      if (state.money[E] >= uDef.cost + 100) {
        S.queueUnit(state, E, uType);
      }
    }
  }

  // 3. 出兵进攻：攒够一波后出发，并每隔 8s 重申指令，让后续新兵持续跟上
  const army = unitCount(state, E);
  const pBase = ownBase(state, TEAM_P);
  if (pBase) {
    if (army >= state.wave.threshold && !state.wave.active) {
      state.wave.active = true;
      state.wave.next = 0;
    } else if (army === 0) {
      state.wave.active = false;
    }
    if (state.wave.active) {
      state.wave.next -= 1000;
      if (state.wave.next <= 0) {
        state.wave.next = 8000;
        const ids = state.ents.filter((e) => e.kind === 'unit' && e.team === E).map((e) => e.id);
        S.giveOrder(state, ids, { kind: 'move', x: pBase.x, y: pBase.y });
      }
    }
  }
}

module.exports = { updateAI, unitCount };
