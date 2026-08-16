'use strict';

// 渲染：纯 canvas 2D 绘制（无 DOM）。输入为游戏状态 + 布局 + 画布 ctx。

const C = require('./config');
const S = require('./state');
const UI = require('./ui');

function font(px) {
  return `${px}px sans-serif`;
}

function draw(state, ctx, l) {
  ctx.fillStyle = C.COLORS.bg;
  ctx.fillRect(0, 0, l.cw, l.ch);

  drawMap(state, ctx, l);
  if (state.placement) drawPlacement(state, ctx, l);
  drawBuildings(state, ctx, l);
  drawUnits(state, ctx, l);
  drawOrderFx(state, ctx, l);
  drawSelection(state, ctx, l);
  if (state.box) drawBox(state, ctx);
  drawTopBar(state, ctx, l);
  drawBottomBar(state, ctx, l);
  if (state.toast && state.toast.t < state.toast.dur) drawToast(state, ctx, l);
  if (state.over) drawGameOver(state, ctx, l);
}

function drawMap(state, ctx, l) {
  const ts = C.TILE * l.mapScale;
  for (let gy = 0; gy < C.MAP_ROWS; gy++) {
    for (let gx = 0; gx < C.MAP_COLS; gx++) {
      const kind = state.map[gy][gx];
      const x = l.mapX + gx * ts;
      const y = l.mapY + gy * ts;
      let fill = C.COLORS.map.ground;
      if (kind === C.TILE_KIND.ORE) fill = C.COLORS.map.ore;
      else if (kind === C.TILE_KIND.ROCK) fill = C.COLORS.map.rock;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, ts + 0.5, ts + 0.5);
      if (kind === C.TILE_KIND.GROUND) {
        ctx.fillStyle = C.COLORS.map.groundLine;
        ctx.fillRect(x, y + ts - 1, ts, 1);
      }
    }
  }
  // 地图边框
  ctx.strokeStyle = C.COLORS.ui.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(l.mapX - 1, l.mapY - 1, l.mapW + 2, l.mapH + 2);
}

function drawBuildings(state, ctx, l) {
  for (const e of state.ents) {
    if (e.kind !== 'building') continue;
    const ts = C.TILE * l.mapScale;
    const x = l.mapX + e.gx * ts;
    const y = l.mapY + e.gy * ts;
    const w = e.w * ts;
    const h = e.h * ts;
    const col = C.COLORS[e.team];

    ctx.fillStyle = col.dark;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = col.main;
    ctx.lineWidth = Math.max(1.5, ts * 0.06);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // 类型标记（文字）
    ctx.fillStyle = col.light;
    ctx.font = font(Math.max(9, Math.floor(ts * 0.55)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mark =
      e.type === 'base'
        ? '基'
        : e.type === 'barracks'
          ? '营'
          : e.type === 'factory'
            ? '厂'
            : e.type === 'refinery'
              ? '矿'
              : '炮';
    ctx.fillText(mark, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    drawHpBar(ctx, x, y - Math.max(6, ts * 0.3), w, e.hp, e.maxHp, col.main);
    drawProdBar(ctx, e, x, y + h + Math.max(4, ts * 0.2), w);
  }
}

function drawUnits(state, ctx, l) {
  for (const e of state.ents) {
    if (e.kind !== 'unit') continue;
    const s = UI.toScreen(l, e.x, e.y);
    const r = e.r * l.mapScale;
    const col = C.COLORS[e.team];

    ctx.fillStyle = col.main;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = Math.max(1, l.mapScale * 1.2);
    ctx.stroke();
    drawHpBar(ctx, s.x - r, s.y - r - 6, r * 2, e.hp, e.maxHp, col.main);
  }
}

function drawHpBar(ctx, x, y, w, hp, maxHp, color) {
  const frac = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * frac, 4);
}

function drawProdBar(ctx, e, x, y, w) {
  if (!e.prodQueue || e.prodQueue.length === 0) return;
  const total = e.prodTotal || 1;
  const frac = Math.max(0, Math.min(1, e.prodT / total));
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = C.COLORS.ui.gold;
  ctx.fillRect(x, y, w * frac, 4);
}

function drawPlacement(state, ctx, l) {
  const p = state.placementPos;
  if (!p) return;
  const def = C.BUILDINGS[state.placement.type];
  const ts = C.TILE * l.mapScale;
  const gx = Math.floor(p.x / C.TILE);
  const gy = Math.floor(p.y / C.TILE);
  const fits = S.rectFits(state, gx, gy, def.w, def.h, C.TEAM.P);
  const x = l.mapX + gx * ts;
  const y = l.mapY + gy * ts;
  ctx.fillStyle = fits ? 'rgba(125,219,122,0.35)' : 'rgba(255,106,106,0.35)';
  ctx.fillRect(x, y, def.w * ts, def.h * ts);
  ctx.strokeStyle = fits ? C.COLORS.ui.good : C.COLORS.ui.bad;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, def.w * ts, def.h * ts);
}

function drawSelection(state, ctx, l) {
  if (!state.selection.length) return;
  for (const id of state.selection) {
    const e = S.entById(state, id);
    if (!e || e.kind !== 'unit') continue;
    const s = UI.toScreen(l, e.x, e.y);
    const r = e.r * l.mapScale + 5;
    ctx.strokeStyle = C.COLORS.ui.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBox(state, ctx) {
  const b = state.box;
  const x = Math.min(b.x0, b.x1);
  const y = Math.min(b.y0, b.y1);
  const w = Math.abs(b.x1 - b.x0);
  const h = Math.abs(b.y1 - b.y0);
  ctx.fillStyle = 'rgba(125,219,122,0.12)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.COLORS.ui.good;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
}

function drawOrderFx(state, ctx, l) {
  for (const f of state.orderFx) {
    const s = UI.toScreen(l, f.x, f.y);
    const p = Math.min(1, f.t / 600);
    const r = (8 + p * 16) * l.mapScale;
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = f.kind === 'attack' ? C.COLORS.ui.bad : C.COLORS.ui.good;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawTopBar(state, ctx, l) {
  ctx.fillStyle = C.COLORS.ui.bar;
  ctx.fillRect(0, 0, l.cw, 42);
  ctx.fillStyle = C.COLORS.ui.gold;
  ctx.font = font(Math.max(14, Math.round(l.cw * 0.02)));
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`资金 ${Math.floor(state.money.P)}`, 12, 21);
  ctx.fillStyle = C.COLORS.ui.text;
  ctx.fillText(`选中 ${state.selection.length} 单位`, 12 + l.cw * 0.18, 21);
  ctx.fillStyle = C.COLORS.ui.dim;
  ctx.fillText(`${C.GAME_NAME} v${C.GAME_VERSION}`, l.cw - 190, 21);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // 重开按钮
  const r = l.restartBtn;
  ctx.fillStyle = 'rgba(42,51,80,0.9)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = C.COLORS.ui.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = C.COLORS.ui.text;
  ctx.font = font(13);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('重开', r.x + r.w / 2, r.y + r.h / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawBottomBar(state, ctx, l) {
  ctx.fillStyle = C.COLORS.ui.bar;
  ctx.fillRect(0, l.ch - l.UI_H, l.cw, l.UI_H);
  for (const b of l.btns) {
    const isBuild = b.id.indexOf('build:') === 0;
    const cost = b.cost;
    const affordable = state.money.P >= cost;
    const active = isBuild && state.placement && state.placement.type === b.id.slice('build:'.length);
    ctx.fillStyle = active ? 'rgba(255,179,64,0.25)' : 'rgba(22,27,38,0.95)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = active ? C.COLORS.ui.hot : C.COLORS.ui.border;
    ctx.lineWidth = active ? 2 : 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = affordable ? C.COLORS.ui.text : C.COLORS.ui.dim;
    ctx.font = font(Math.max(12, Math.floor(b.h * 0.4)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h * 0.34);
    ctx.fillStyle = affordable ? C.COLORS.ui.gold : C.COLORS.ui.dim;
    ctx.font = font(Math.max(10, Math.floor(b.h * 0.3)));
    ctx.fillText(`${cost}金`, b.x + b.w / 2, b.y + b.h * 0.74);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

function drawToast(state, ctx, l) {
  const t = state.toast;
  const p = Math.min(1, t.t / t.dur);
  ctx.globalAlpha = p < 0.8 ? 1 : (1 - p) / 0.2;
  const msg = t.msg;
  ctx.font = font(16);
  const w = ctx.measureText ? ctx.measureText(msg).width + 24 : 160;
  const x = l.cw / 2 - w / 2;
  const y = 52;
  ctx.fillStyle = 'rgba(10,13,20,0.9)';
  ctx.fillRect(x, y, w, 30);
  ctx.strokeStyle = C.COLORS.ui.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, 30);
  ctx.fillStyle = C.COLORS.ui.text;
  ctx.font = font(15);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, l.cw / 2, y + 15);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
}

function drawGameOver(state, ctx, l) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, l.cw, l.ch);
  const win = state.over.winner === C.TEAM.P;
  ctx.fillStyle = win ? C.COLORS.ui.good : C.COLORS.ui.bad;
  ctx.font = font(Math.max(30, Math.round(l.cw * 0.06)));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(win ? '胜 利 !' : '战 败', l.cw / 2, l.ch / 2 - 30);
  ctx.fillStyle = C.COLORS.ui.text;
  ctx.font = font(15);
  ctx.fillText(win ? '敌军基地已被摧毁' : '你的基地已被摧毁', l.cw / 2, l.ch / 2 + 10);
  ctx.fillText('点击任意处重新开始', l.cw / 2, l.ch / 2 + 36);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

module.exports = { draw };
