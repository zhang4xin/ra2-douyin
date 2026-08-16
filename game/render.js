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

const RA2 = {
  metalLight: '#9aa0aa',
  metalBase: '#6f7480',
  metalDark: '#4a4e58',
  bevelHi: 'rgba(255,255,255,0.25)',
  bevelLo: 'rgba(0,0,0,0.4)',
  panel: '#3c414b',
  panelBorder: '#565c68',
  money: '#00e000',
  cyan: '#00d8ff',
  red: '#ff3b30',
  gold: '#ffd24a',
  text: '#dfe5ee',
  dim: '#98a0ad',
};

function metalRect(ctx, x, y, w, h) {
  ctx.fillStyle = RA2.metalBase;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = RA2.bevelHi;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = RA2.bevelLo;
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x + w - 1, y, 1, h);
}

function screw(ctx, x, y) {
  ctx.fillStyle = RA2.metalDark;
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - 1.2, y - 1.2);
  ctx.lineTo(x + 1.2, y + 1.2);
  ctx.stroke();
}

function activeProductionOf(state, team, unitType) {
  for (const e of state.ents) {
    if (e.kind !== 'building' || e.team !== team) continue;
    if (e.prodQueue && e.prodQueue.length && e.prodQueue[0] === unitType) return e;
  }
  return null;
}

function activeProduction(state, team) {
  for (const e of state.ents) {
    if (e.kind !== 'building' || e.team !== team) continue;
    if (e.prodQueue && e.prodQueue.length) return { building: e, type: e.prodQueue[0] };
  }
  return null;
}

function drawTopBar(state, ctx, l) {
  metalRect(ctx, 0, 0, l.cw, l.topH);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // 资金（RA2 绿色）
  ctx.fillStyle = RA2.money;
  ctx.font = font(Math.max(16, Math.round(l.cw * 0.045)));
  ctx.fillText(`$${Math.floor(state.money.P)}`, 12, Math.round(l.topH * 0.34));

  // 部队 / 收入
  ctx.fillStyle = RA2.text;
  ctx.font = font(11);
  const units = state.ents.filter((e) => e.kind === 'unit' && e.team === C.TEAM.P).length;
  const income =
    C.INCOME.base +
    state.ents.filter((e) => e.kind === 'building' && e.team === C.TEAM.P && e.type === 'refinery').length *
      C.INCOME.perRefinery;
  ctx.fillText(`部队 ${units} · 收入 +${income}/10s`, 12, Math.round(l.topH * 0.72));

  drawPower(ctx, l, income);
  drawRadar(state, ctx, l);
}

function drawPower(ctx, l, income) {
  const p = l.power;
  metalRect(ctx, p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#0a0f0a';
  ctx.fillRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  const ratio = Math.min(1, income / 400);
  const h = Math.max(0, Math.round((p.h - 2) * ratio));
  ctx.fillStyle = ratio >= 1 ? '#00e000' : ratio >= 0.5 ? '#b8d900' : '#d90000';
  ctx.fillRect(p.x + 1, p.y + p.h - 1 - h, p.w - 2, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const yy = p.y + 1 + ((p.h - 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(p.x + 1, yy);
    ctx.lineTo(p.x + p.w - 1, yy);
    ctx.stroke();
  }
}

function drawRadar(state, ctx, l) {
  const r = l.radar;
  ctx.fillStyle = '#101318';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const rs = Math.min((r.w - 4) / C.MAP_COLS, (r.h - 4) / C.MAP_ROWS);
  const ox = r.x + (r.w - C.MAP_COLS * rs) / 2;
  const oy = r.y + (r.h - C.MAP_ROWS * rs) / 2;
  for (let gy = 0; gy < C.MAP_ROWS; gy++) {
    for (let gx = 0; gx < C.MAP_COLS; gx++) {
      const k = state.map[gy][gx];
      ctx.fillStyle = k === C.TILE_KIND.ORE ? '#a88422' : k === C.TILE_KIND.ROCK ? '#5a626e' : '#22262c';
      ctx.fillRect(Math.round(ox + gx * rs), Math.round(oy + gy * rs), Math.ceil(rs), Math.ceil(rs));
    }
  }
  for (const e of state.ents) {
    const cx = e.kind === 'building' ? e.gx + e.w / 2 : e.x / C.TILE;
    const cy = e.kind === 'building' ? e.gy + e.h / 2 : e.y / C.TILE;
    const sz = e.kind === 'building' ? 2 : 1;
    ctx.fillStyle = e.team === C.TEAM.P ? '#55ccff' : '#ff5544';
    ctx.fillRect(Math.round(ox + cx * rs - sz / 2), Math.round(oy + cy * rs - sz / 2), sz, sz);
  }
  ctx.strokeStyle = RA2.metalLight;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  screw(ctx, r.x + 3, r.y + 3);
  screw(ctx, r.x + r.w - 3, r.y + 3);
  screw(ctx, r.x + 3, r.y + r.h - 3);
  screw(ctx, r.x + r.w - 3, r.y + r.h - 3);
}

function drawBottomBar(state, ctx, l) {
  const py = l.ch - l.panelH;
  metalRect(ctx, 0, py, l.cw, l.panelH);
  drawPanelStrip(state, ctx, l);
  drawTabs(state, ctx, l);
  drawCells(state, ctx, l);
}

function drawPanelStrip(state, ctx, l) {
  const s = l.strip;
  ctx.fillStyle = RA2.panel;
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.strokeStyle = RA2.panelBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = font(12);
  const prod = activeProduction(state, C.TEAM.P);
  if (prod) {
    ctx.fillStyle = RA2.gold;
    const label = `${C.UNITS[prod.type].name} 生产中`;
    ctx.fillText(label, s.x + 8, s.y + s.h / 2);
    const total = prod.building.prodTotal || 1;
    const frac = Math.max(0, Math.min(1, prod.building.prodT / total));
    const bw = Math.max(40, Math.floor(s.w * 0.24));
    const bx = s.x + s.w - bw - 74;
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(bx, s.y + s.h / 2 - 4, bw, 8);
    ctx.fillStyle = RA2.cyan;
    ctx.fillRect(bx, s.y + s.h / 2 - 4, bw * frac, 8);
  } else {
    ctx.fillStyle = RA2.dim;
    ctx.fillText(state.panelTab === 'build' ? '选择要建造的建筑' : '选择要生产的兵种', s.x + 8, s.y + s.h / 2);
  }

  // 重开按钮
  const r = l.restartBtn;
  metalRect(ctx, r.x, r.y, r.w, r.h);
  ctx.fillStyle = RA2.text;
  ctx.font = font(12);
  ctx.textAlign = 'center';
  ctx.fillText('重开', r.x + r.w / 2, r.y + r.h / 2);
  ctx.textAlign = 'left';
}

function drawTabs(state, ctx, l) {
  for (const t of l.tabs) {
    const active = state.panelTab === t.id.slice('tab:'.length);
    const r = t.rect;
    ctx.fillStyle = active ? '#4a7a52' : RA2.metalDark;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = RA2.bevelHi;
    ctx.fillRect(r.x, r.y, r.w, 1);
    ctx.fillRect(r.x, r.y, 1, r.h);
    ctx.fillStyle = RA2.bevelLo;
    ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
    ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
    ctx.strokeStyle = active ? RA2.cyan : RA2.panelBorder;
    ctx.lineWidth = active ? 2 : 1;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);

    const cx = r.x + r.w / 2;
    const icY = r.y + r.h * 0.32;
    const col = active ? '#aaffbb' : '#c8ceda';
    if (t.id === 'tab:build') drawBuildingIcon(ctx, cx, icY, 20, col);
    else drawInfantryIcon(ctx, cx, icY, 20, col);

    ctx.fillStyle = active ? '#ffffff' : RA2.dim;
    ctx.font = font(11);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.label, cx, r.y + r.h * 0.72);
    ctx.textAlign = 'left';
  }
}

function drawCells(state, ctx, l) {
  for (const c of l.cells) {
    if (c.kind !== state.panelTab) continue;
    const r = c.rect;
    const affordable = state.money.P >= c.cost;
    const placing = state.placement && state.placement.type === c.type;

    ctx.fillStyle = '#2a2f3a';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = RA2.bevelHi;
    ctx.fillRect(r.x, r.y, r.w, 1);
    ctx.fillRect(r.x, r.y, 1, r.h);
    ctx.fillStyle = RA2.bevelLo;
    ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
    ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
    ctx.strokeStyle = placing ? RA2.cyan : affordable ? RA2.metalLight : RA2.metalDark;
    ctx.lineWidth = placing ? 2 : 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

    const cx = r.x + r.w / 2;
    const icY = r.y + r.h * 0.3;
    const icColor = affordable ? '#dfe5ee' : '#6a7280';
    const icSize = Math.min(18, r.w * 0.3);
    if (c.kind === 'build') drawBuildingIcon(ctx, cx, icY, icSize, icColor, c.type);
    else drawInfantryIcon(ctx, cx, icY, icSize, icColor, c.type === 'tank');

    ctx.fillStyle = affordable ? RA2.text : RA2.dim;
    ctx.font = font(Math.max(10, Math.min(Math.floor(r.h * 0.2), Math.floor((r.w * 1.5) / c.label.length))));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.label, cx, r.y + r.h * 0.56);
    ctx.fillStyle = affordable ? RA2.money : RA2.red;
    ctx.font = font(Math.max(9, Math.floor(r.h * 0.16)));
    ctx.fillText(`${c.cost}金`, cx, r.y + r.h * 0.78);
    ctx.textAlign = 'left';

    if (c.kind === 'unit') {
      const prod = activeProductionOf(state, C.TEAM.P, c.type);
      if (prod) {
        const frac = Math.max(0, Math.min(1, prod.prodT / (prod.prodTotal || 1)));
        ctx.fillStyle = '#0a0f0a';
        ctx.fillRect(r.x + 4, r.y + r.h - 5, r.w - 8, 3);
        ctx.fillStyle = RA2.cyan;
        ctx.fillRect(r.x + 4, r.y + r.h - 5, (r.w - 8) * frac, 3);
      }
    }
  }
}

function drawBuildingIcon(ctx, cx, cy, s, color, type) {
  const half = s / 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.4;
  if (type === 'base' || type === 'barracks') {
    ctx.strokeRect(cx - half, cy - half * 0.7, s, s * 0.85);
    ctx.beginPath();
    ctx.moveTo(cx - half, cy - half * 0.7);
    ctx.lineTo(cx, cy - half * 1.1);
    ctx.lineTo(cx + half, cy - half * 0.7);
    ctx.stroke();
    ctx.fillRect(cx - 2, cy + half * 0.15, 4, 4);
  } else if (type === 'factory') {
    ctx.strokeRect(cx - half, cy - half * 0.5, s, s * 0.6);
    ctx.fillRect(cx - half * 0.4, cy - half * 1.1, 5, 4);
  } else if (type === 'refinery') {
    ctx.strokeRect(cx - half, cy - half * 0.5, s, s * 0.7);
    ctx.beginPath();
    ctx.moveTo(cx - half, cy + half * 0.2);
    ctx.lineTo(cx, cy + half * 0.6);
    ctx.lineTo(cx + half, cy + half * 0.2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy + 2, s * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + 2);
    ctx.lineTo(cx, cy - half);
    ctx.stroke();
  }
}

function drawInfantryIcon(ctx, cx, cy, s, color, isTank) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  if (isTank) {
    ctx.fillRect(cx - s * 0.45, cy - s * 0.25, s * 0.9, s * 0.5);
    ctx.fillRect(cx + s * 0.2, cy - s * 0.15, s * 0.55, s * 0.15);
    ctx.fillRect(cx - s * 0.5, cy + s * 0.3, s, s * 0.14);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.35, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.15);
    ctx.lineTo(cx, cy + s * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.05);
    ctx.lineTo(cx - s * 0.3, cy + s * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.05);
    ctx.lineTo(cx + s * 0.3, cy + s * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.2);
    ctx.lineTo(cx - s * 0.25, cy + s * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.2);
    ctx.lineTo(cx + s * 0.25, cy + s * 0.5);
    ctx.stroke();
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
