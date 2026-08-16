'use strict';

// 游戏纯逻辑核心：地图、资源、建筑、单位、战斗、胜负。
// 不依赖任何平台 API（无 tt / canvas / DOM），便于 Node 单测与复用。

const C = require('./config');

const TEAM = C.TEAM;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createMap(rng) {
  const cols = C.MAP_COLS;
  const rows = C.MAP_ROWS;
  const grid = [];
  for (let y = 0; y < rows; y++) {
    grid.push(new Array(cols).fill(C.TILE_KIND.GROUND));
  }

  // 中央金矿带
  const orePatches = 5;
  for (let i = 0; i < orePatches; i++) {
    const px = Math.floor(rng() * (cols - 5)) + 2;
    const py = Math.floor(rng() * (rows - 5)) + 2;
    const pw = 2 + Math.floor(rng() * 3);
    const ph = 2 + Math.floor(rng() * 3);
    for (let y = py; y < py + ph && y < rows; y++) {
      for (let x = px; x < px + pw && x < cols; x++) {
        grid[y][x] = C.TILE_KIND.ORE;
      }
    }
  }

  // 随机岩石
  const rocks = 26;
  for (let i = 0; i < rocks; i++) {
    const rx = Math.floor(rng() * cols);
    const ry = Math.floor(rng() * rows);
    grid[ry][rx] = C.TILE_KIND.ROCK;
  }

  // 出生点清场（保证基地可放置）
  clearArea(grid, 1, 1, 7, 7);
  clearArea(grid, cols - 8, rows - 8, 7, 7);

  return grid;
}

function clearArea(grid, x0, y0, w, h) {
  for (let y = y0; y < Math.min(y0 + h, grid.length); y++) {
    for (let x = x0; x < Math.min(x0 + w, grid[y].length); x++) {
      grid[y][x] = C.TILE_KIND.GROUND;
    }
  }
}

function createGame(opts) {
  const o = opts || {};
  const rng = o.rng || mulberry32(o.seed == null ? Date.now() & 0xffffffff : o.seed);

  const state = {
    t: 0,
    rng,
    map: createMap(rng),
    money: { P: C.START_GOLD, E: C.START_GOLD },
    ents: [], // 单位 + 建筑统一列表
    idSeq: 1,
    selection: [], // 玩家选中单位 id 列表
    placement: null, // { type: 建筑类型 } 放置模式
    placementPos: null, // { x, y } 地图空间光标
    box: null, // 框选 { x0, y0, x1, y1 }（屏幕坐标）
    dragMoved: false,
    incomeNext: C.INCOME.tickMs,
    over: null, // { winner: 'P'|'E' } | null
    aiNext: 1000,
    wave: { active: false, threshold: 6, next: 0 },
    orderFx: [], // { x, y, t, kind } 指令特效（渲染用，纯数据）
    stats: { P: { built: {}, killed: 0 }, E: { built: {}, killed: 0 } },
  };

  spawnBuilding(state, TEAM.P, 'base', C.MAP_COLS - 7, C.MAP_ROWS - 7);
  spawnBuilding(state, TEAM.E, 'base', 2, 2);
  return state;
}

// ---------- 工具 ----------

function tileAt(state, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= C.MAP_COLS || gy >= C.MAP_ROWS) return null;
  return state.map[gy][gx];
}

function rectFits(state, gx, gy, w, h, team) {
  for (let y = gy; y < gy + h; y++) {
    for (let x = gx; x < gx + w; x++) {
      if (x < 0 || y < 0 || x >= C.MAP_COLS || y >= C.MAP_ROWS) return false;
      const kind = state.map[y][x];
      if (kind === C.TILE_KIND.ROCK || kind === C.TILE_KIND.ORE) return false;
      if (buildingAt(state, x, y)) return false;
    }
  }
  return true;
}

function buildingAt(state, gx, gy) {
  for (const e of state.ents) {
    if (e.kind !== 'building') continue;
    if (gx >= e.gx && gx < e.gx + e.w && gy >= e.gy && gy < e.gy + e.h) return e;
  }
  return null;
}

function unitAt(state, team, mx, my, tolerance) {
  const tol = tolerance == null ? 14 : tolerance;
  let best = null;
  let bestD = Infinity;
  for (const e of state.ents) {
    if (e.kind !== 'unit' || (team && e.team !== team)) continue;
    const d = Math.hypot(e.x - mx, e.y - my);
    if (d <= e.r + tol && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

function entAt(state, mx, my) {
  // 优先单位，其次建筑
  const u = unitAt(state, null, mx, my, 12);
  if (u) return u;
  for (const e of state.ents) {
    if (e.kind !== 'building') continue;
    const cx = (e.gx + e.w / 2) * C.TILE;
    const cy = (e.gy + e.h / 2) * C.TILE;
    const hw = (e.w * C.TILE) / 2;
    const hh = (e.h * C.TILE) / 2;
    if (mx >= cx - hw && mx <= cx + hw && my >= cy - hh && my <= cy + hh) return e;
  }
  return null;
}

function entById(state, id) {
  return state.ents.find((e) => e.id === id) || null;
}

function enemyOf(team) {
  return team === TEAM.P ? TEAM.E : TEAM.P;
}

function spawnBuilding(state, team, type, gx, gy) {
  const def = C.BUILDINGS[type];
  const b = {
    id: state.idSeq++,
    kind: 'building',
    team,
    type,
    gx,
    gy,
    w: def.w,
    h: def.h,
    x: (gx + def.w / 2) * C.TILE,
    y: (gy + def.h / 2) * C.TILE,
    hp: def.hp,
    maxHp: def.hp,
    name: def.name,
    prodQueue: [],
    prodT: 0,
    prodTotal: 0, // 当前生产目标的总时长（渲染进度）
    weapon: def.weapon ? Object.assign({ cd: 0 }, def.weapon) : null,
    income: def.income,
    isBuilding: true,
  };
  state.ents.push(b);
  return b;
}

function spawnUnit(state, team, type, x, y) {
  const def = C.UNITS[type];
  const u = {
    id: state.idSeq++,
    kind: 'unit',
    team,
    type,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    r: def.r,
    speed: def.speed,
    dps: def.dps,
    range: def.range,
    attackMs: def.attackMs,
    attackCd: 0,
    autoRange: def.autoRange,
    order: null,
    targetId: null,
    isBuilding: false,
  };
  state.ents.push(u);
  return u;
}

function removeEnt(state, id) {
  const idx = state.ents.findIndex((e) => e.id === id);
  if (idx >= 0) state.ents.splice(idx, 1);
  const si = state.selection.indexOf(id);
  if (si >= 0) state.selection.splice(si, 1);
  for (const e of state.ents) {
    if (e.targetId === id) e.targetId = null;
  }
}

// ---------- 玩家/通用操作 ----------

function placeBuilding(state, team, type, gx, gy) {
  const def = C.BUILDINGS[type];
  if (!def) return { ok: false, reason: '未知建筑' };
  if (def.cost < 0) return { ok: false, reason: '不可建造' };
  if (state.money[team] < def.cost) return { ok: false, reason: '资金不足' };
  let owned = 0;
  for (const e of state.ents) {
    if (e.kind === 'building' && e.team === team && e.type === type) owned++;
  }
  if (def.maxOwn >= 0 && owned >= def.maxOwn) return { ok: false, reason: '已达上限' };
  if (!rectFits(state, gx, gy, def.w, def.h, team)) return { ok: false, reason: '位置不可用' };

  state.money[team] -= def.cost;
  const b = spawnBuilding(state, team, type, gx, gy);
  if (state.stats[team]) state.stats[team].built[type] = (state.stats[team].built[type] || 0) + 1;
  return { ok: true, ent: b };
}

function findProductionBuilding(state, team, unitType) {
  for (const e of state.ents) {
    if (e.kind !== 'building' || e.team !== team) continue;
    const def = C.BUILDINGS[e.type];
    if (def.produces.includes(unitType) && e.prodQueue.length < 3) return e;
  }
  return null;
}

function queueUnit(state, team, unitType) {
  const def = C.UNITS[unitType];
  if (!def) return { ok: false, reason: '未知单位' };
  if (state.money[team] < def.cost) return { ok: false, reason: '资金不足' };
  const prod = findProductionBuilding(state, team, unitType);
  if (!prod) return { ok: false, reason: '没有空闲的对应生产建筑' };
  state.money[team] -= def.cost;
  prod.prodQueue.push(unitType);
  if (prod.prodT === 0) {
    prod.prodTotal = C.UNITS[unitType].buildMs;
    prod.prodT = 0.0001;
  }
  return { ok: true };
}

function findSpawnTile(state, b) {
  for (let ring = 1; ring <= 4; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const gx = b.gx + b.w / 2 + dx;
        const gy = b.gy + b.h / 2 + dy;
        const tx = Math.floor(gx);
        const ty = Math.floor(gy);
        if (tileAt(state, tx, ty) === C.TILE_KIND.GROUND && !buildingAt(state, tx, ty)) {
          return { x: (tx + 0.5) * C.TILE, y: (ty + 0.5) * C.TILE };
        }
      }
    }
  }
  return null;
}

function giveOrder(state, ids, order) {
  for (const id of ids) {
    const e = entById(state, id);
    if (!e || e.kind !== 'unit') continue;
    e.order = order && order.kind === 'move' ? { kind: 'move', x: order.x, y: order.y } : null;
    e.targetId = order && order.kind === 'attack' ? order.targetId : null;
  }
}

// ---------- 更新 ----------

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function update(state, dt) {
  if (state.over) return;
  state.t += dt;

  updateIncome(state, dt);
  updateProduction(state, dt);
  updateUnits(state, dt);
  updateTurrets(state, dt);
  checkDeath(state);
  checkWin(state);
  fadeFx(state, dt);
}

function updateIncome(state, dt) {
  state.incomeNext -= dt;
  if (state.incomeNext > 0) return;
  state.incomeNext += C.INCOME.tickMs;
  const count = (team) => {
    let n = 0;
    for (const e of state.ents) {
      if (e.kind === 'building' && e.team === team && e.income > 0) n++;
    }
    return n;
  };
  state.money.P += C.INCOME.base + count(TEAM.P) * C.INCOME.perRefinery;
  state.money.E += C.INCOME.base + count(TEAM.E) * C.INCOME.perRefinery;
}

function updateProduction(state, dt) {
  for (const b of state.ents) {
    if (b.kind !== 'building' || b.prodQueue.length === 0) continue;
    const type = b.prodQueue[0];
    b.prodT += dt;
    if (b.prodT >= C.UNITS[type].buildMs) {
      b.prodQueue.shift();
      b.prodT = 0;
      const pos = findSpawnTile(state, b);
      if (pos) {
        spawnUnit(state, b.team, type, pos.x, pos.y);
      } else {
        // 没位置：退钱，避免卡死
        state.money[b.team] += C.UNITS[type].cost;
      }
    }
  }
  // 进度显示
  for (const b of state.ents) {
    if (b.kind === 'building' && b.prodQueue.length > 0) {
      b.prodTotal = C.UNITS[b.prodQueue[0]].buildMs;
    }
  }
}

function updateUnits(state, dt) {
  for (const u of state.ents) {
    if (u.kind !== 'unit') continue;
    u.attackCd = Math.max(0, u.attackCd - dt);

    if (u.targetId) {
      const t = entById(state, u.targetId);
      if (!t || t.team === u.team) {
        u.targetId = null;
      } else if (t.hp <= 0) {
        u.targetId = null;
      }
    }

    // 自动索敌
    if (!u.targetId) {
      u.targetId = acquireTarget(state, u);
    }

    if (u.targetId) {
      const t = entById(state, u.targetId);
      const range = u.range + (t.kind === 'unit' ? t.r : 0);
      if (t && dist(u, t) > range) {
        moveToward(state, u, t.x, t.y, dt);
      } else if (t && u.attackCd <= 0) {
        t.hp -= u.dps * (u.attackMs / 1000);
        u.attackCd = u.attackMs;
        if (t.hp <= 0 && state.stats[u.team]) state.stats[u.team].killed++;
      }
      continue;
    }

    // 无战斗目标：执行移动指令
    if (u.order && u.order.kind === 'move') {
      const ox = u.order.x;
      const oy = u.order.y;
      if (dist(u, { x: ox, y: oy }) > u.speed * (dt / 1000) + 2) {
        moveToward(state, u, ox, oy, dt);
      } else {
        u.order = null;
      }
    }
  }
}

function acquireTarget(state, u) {
  let best = null;
  let bestD = Infinity;
  const enemy = enemyOf(u.team);
  for (const e of state.ents) {
    if (e.team !== enemy) continue;
    const d = dist(u, e);
    if (d <= u.autoRange && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best ? best.id : null;
}

function moveToward(state, u, tx, ty, dt) {
  const dx = tx - u.x;
  const dy = ty - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return;
  const step = Math.min(u.speed * (dt / 1000), d);
  let nx = u.x + (dx / d) * step;
  let ny = u.y + (dy / d) * step;
  if (!unitBlocked(state, u, nx, ny)) {
    u.x = nx;
    u.y = ny;
    return;
  }
  // 正路被堵：沿 X / Y 分量滑行绕障（简易寻路，够用）
  const sx = Math.sign(dx) * step;
  const sy = Math.sign(dy) * step;
  if (!unitBlocked(state, u, u.x + sx, u.y)) u.x += sx;
  if (!unitBlocked(state, u, u.x, u.y + sy)) u.y += sy;
}

function unitBlocked(state, u, x, y) {
  const gx = Math.floor(x / C.TILE);
  const gy = Math.floor(y / C.TILE);
  if (tileAt(state, gx, gy) === C.TILE_KIND.ROCK) return true;
  const b = buildingAt(state, gx, gy);
  if (b) {
    // 建筑中心不阻挡（允许贴着），防止出生点卡死
    const cx = b.gx + b.w / 2;
    const cy = b.gy + b.h / 2;
    const bx = Math.floor(x / C.TILE);
    const by = Math.floor(y / C.TILE);
    if (bx === Math.floor(cx) && by === Math.floor(cy)) return false;
    return true;
  }
  return false;
}

function updateTurrets(state, dt) {
  for (const t of state.ents) {
    if (t.kind !== 'building' || !t.weapon) continue;
    t.weapon.cd = Math.max(0, t.weapon.cd - dt);
    const enemy = enemyOf(t.team);
    let target = entById(state, t.targetId);
    if (!target || target.team !== enemy || target.hp <= 0) {
      t.targetId = null;
      let best = null;
      let bestD = Infinity;
      for (const e of state.ents) {
        if (e.team !== enemy) continue;
        const d = dist(t, e);
        if (d <= t.weapon.autoRange && d < bestD) {
          best = e;
          bestD = d;
        }
      }
      t.targetId = best ? best.id : null;
      target = best;
    }
    if (target && t.weapon.cd <= 0 && dist(t, target) <= t.weapon.range) {
      target.hp -= t.weapon.dps * (t.weapon.attackMs / 1000);
      t.weapon.cd = t.weapon.attackMs;
    }
  }
}

function checkDeath(state) {
  const dead = state.ents.filter((e) => e.hp <= 0);
  for (const e of dead) removeEnt(state, e.id);
}

function checkWin(state) {
  if (state.over) return;
  const baseOf = (team) => state.ents.find((e) => e.kind === 'building' && e.team === team && e.type === 'base');
  const pBase = baseOf(TEAM.P);
  const eBase = baseOf(TEAM.E);
  if (!pBase) state.over = { winner: TEAM.E };
  else if (!eBase) state.over = { winner: TEAM.P };
}

function fadeFx(state, dt) {
  state.orderFx = state.orderFx.filter((f) => (f.t += dt) < 600);
}

module.exports = {
  mulberry32,
  createMap,
  createGame,
  tileAt,
  rectFits,
  placeBuilding,
  queueUnit,
  giveOrder,
  update,
  entById,
  entAt,
  unitAt,
  spawnBuilding,
  spawnUnit,
};
