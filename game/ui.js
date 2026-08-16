'use strict';

// 屏幕布局与坐标换算：红警风格界面 —— 顶部信息条(资金/能量/雷达) + 底部建造面板(页签/格子)。
// 所有几何基于画布物理尺寸实时计算，适配任意横竖屏。

const C = require('./config');

// 底部面板两类格子
const BUILD_TYPES = ['barracks', 'factory', 'refinery', 'turret'];
const UNIT_TYPES = ['infantry', 'tank'];

function layout(cw, ch) {
  const topH = Math.max(52, Math.min(76, Math.round(ch * 0.09)));
  const panelH = Math.max(150, Math.min(232, Math.round(ch * 0.24)));
  const availH = ch - topH - panelH;

  const mapW = C.MAP_COLS * C.TILE;
  const mapH = C.MAP_ROWS * C.TILE;
  const mapScale = Math.min(cw / mapW, availH / mapH);
  const scaledW = mapW * mapScale;
  const scaledH = mapH * mapScale;
  const mapX = (cw - scaledW) / 2;
  const mapY = topH + (availH - scaledH) / 2;

  // 雷达（右上角）+ 能量条（雷达左侧）
  const radar = { x: cw - topH - 8, y: 8, w: topH, h: topH };
  const power = { x: radar.x - 18, y: 16, w: 10, h: topH - 32 };

  // 底部面板
  const px = 0;
  const py = ch - panelH;
  const stripH = 26;
  const strip = { x: px + 4, y: py + 4, w: cw - 8, h: stripH - 4 };
  const restartBtn = { x: cw - 66, y: py + stripH - 22, w: 60, h: 22 };

  // 左页签轨（RA2 风格竖向双页签）
  const tabsW = 62;
  const tabGap = 4;
  const tabAreaY = py + stripH + 4;
  const tabAreaH = panelH - stripH - 8;
  const tabH = Math.floor((tabAreaH - tabGap) / 2);
  const tabs = [
    { id: 'tab:build', label: '建筑', rect: { x: 6, y: tabAreaY, w: tabsW, h: tabH } },
    { id: 'tab:unit', label: '兵种', rect: { x: 6, y: tabAreaY + tabH + tabGap, w: tabsW, h: tabH } },
  ];

  // 格子区
  const cols = cw < 560 ? 3 : 6;
  const rows = Math.ceil(6 / cols);
  const gap = 4;
  const gridX0 = px + tabsW + 8;
  const gridW = cw - gridX0 - 6;
  const gridH = panelH - stripH - 6;
  const cellW = (gridW - gap * (cols - 1)) / cols;
  const cellH = (gridH - gap * (rows - 1)) / rows;

  const all = [
    ...BUILD_TYPES.map((t) => ({
      id: 'build:' + t,
      kind: 'build',
      type: t,
      label: C.BUILDINGS[t].name,
      cost: C.BUILDINGS[t].cost,
    })),
    ...UNIT_TYPES.map((t) => ({
      id: 'unit:' + t,
      kind: 'unit',
      type: t,
      label: C.UNITS[t].name,
      cost: C.UNITS[t].cost,
    })),
  ];
  const cells = [];
  all.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cells.push(
      Object.assign({}, it, {
        rect: {
          x: gridX0 + col * (cellW + gap),
          y: py + stripH + row * (cellH + gap),
          w: cellW,
          h: cellH,
        },
      }),
    );
  });

  return {
    cw,
    ch,
    topH,
    panelH,
    availH,
    mapX,
    mapY,
    mapScale,
    mapW: scaledW,
    mapH: scaledH,
    radar,
    power,
    tabs,
    cells,
    strip,
    restartBtn,
  };
}

function toMap(l, sx, sy) {
  if (sx < l.mapX || sy < l.mapY || sx > l.mapX + l.mapW || sy > l.mapY + l.mapH) return null;
  return { x: (sx - l.mapX) / l.mapScale, y: (sy - l.mapY) / l.mapScale };
}

function toScreen(l, mx, my) {
  return { x: l.mapX + mx * l.mapScale, y: l.mapY + my * l.mapScale };
}

function hitTab(l, sx, sy) {
  for (const t of l.tabs) {
    if (sx >= t.rect.x && sx <= t.rect.x + t.rect.w && sy >= t.rect.y && sy <= t.rect.y + t.rect.h) return t;
  }
  return null;
}

function hitCell(l, sx, sy, tab) {
  for (const c of l.cells) {
    if (c.kind !== tab) continue;
    const r = c.rect;
    if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return c;
  }
  return null;
}

function hitRestart(l, sx, sy) {
  const r = l.restartBtn;
  return sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h;
}

module.exports = { layout, toMap, toScreen, hitTab, hitCell, hitRestart };
