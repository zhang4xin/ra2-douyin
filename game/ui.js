'use strict';

// 屏幕布局与坐标换算：地图 + 底部操作栏 + 顶部信息栏 + 重开按钮。
// 所有几何基于画布物理尺寸实时计算，适配任意横竖屏。

const C = require('./config');

const BUILD_BUTTONS = ['barracks', 'factory', 'refinery', 'turret'];
const UNIT_BUTTONS = ['infantry', 'tank'];

function layout(cw, ch) {
  const UI_H = Math.max(52, Math.round(ch * 0.16));
  const availH = Math.max(120, ch - UI_H);
  const mapW = C.MAP_COLS * C.TILE;
  const mapH = C.MAP_ROWS * C.TILE;
  const mapScale = Math.min(cw / mapW, availH / mapH);
  const scaledW = mapW * mapScale;
  const scaledH = mapH * mapScale;
  const mapX = (cw - scaledW) / 2;
  const mapY = (availH - scaledH) / 2;

  const btns = [];
  const margin = 6;
  const gap = 6;
  const count = BUILD_BUTTONS.length + UNIT_BUTTONS.length;
  const bw = (cw - margin * 2 - gap * (count - 1)) / count;
  const bh = UI_H - 12;
  const by = ch - UI_H + 6;
  const all = [
    ...BUILD_BUTTONS.map((t) => ({ id: 'build:' + t, label: C.BUILDINGS[t].name, cost: C.BUILDINGS[t].cost })),
    ...UNIT_BUTTONS.map((t) => ({ id: 'unit:' + t, label: C.UNITS[t].name, cost: C.UNITS[t].cost })),
  ];
  all.forEach((b, i) => {
    const x = margin + i * (bw + gap);
    btns.push(Object.assign({}, b, { x, y: by, w: bw, h: bh }));
  });

  const restartBtn = { x: cw - 76, y: 8, w: 68, h: 30 };

  return { cw, ch, UI_H, mapX, mapY, mapScale, mapW: scaledW, mapH: scaledH, btns, restartBtn };
}

function toMap(l, sx, sy) {
  if (sx < l.mapX || sy < l.mapY || sx > l.mapX + l.mapW || sy > l.mapY + l.mapH) return null;
  return { x: (sx - l.mapX) / l.mapScale, y: (sy - l.mapY) / l.mapScale };
}

function toScreen(l, mx, my) {
  return { x: l.mapX + mx * l.mapScale, y: l.mapY + my * l.mapScale };
}

function hitButton(l, sx, sy) {
  for (const b of l.btns) {
    if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return b;
  }
  return null;
}

function hitRestart(l, sx, sy) {
  const r = l.restartBtn;
  return sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h;
}

module.exports = { layout, toMap, toScreen, hitButton, hitRestart };
