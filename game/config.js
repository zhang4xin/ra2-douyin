'use strict';

// 游戏常量与平衡表（原创游戏，无任何红警素材/代码）。
// 数值约定：地图空间单位 px、时间 ms、资源 金币。

const GAME_NAME = '钢铁前线';
const GAME_VERSION = '0.1.0';

const TILE = 22; // 地图格边长（地图空间）
const MAP_COLS = 22; // 竖屏：竖长战场（484 x 748）
const MAP_ROWS = 34;

const TILE_KIND = { GROUND: 0, ORE: 1, ROCK: 2 };

const TEAM = { P: 'P', E: 'E' };

const COLORS = {
  P: { main: '#4da6ff', dark: '#165a9e', light: '#b8dcff' },
  E: { main: '#ff6a4d', dark: '#a23a1e', light: '#ffc0ae' },
  bg: '#0e1116',
  map: { ground: '#20261c', groundLine: '#2a3125', ore: '#d9a62e', rock: '#4c535e' },
  ui: {
    bar: 'rgba(10,13,20,0.92)',
    border: '#2a3350',
    text: '#d9deea',
    dim: '#8a93a8',
    gold: '#ffd24a',
    good: '#7ddb7a',
    bad: '#ff6a6a',
    hot: '#ffb340',
  },
};

// 收入：每隔 incomeTick 发放一次。
const INCOME = { tickMs: 10000, base: 150, perRefinery: 220 };
const START_GOLD = 1000;

const BUILDINGS = {
  base: {
    name: '主基地',
    cost: -1,
    hp: 1500,
    w: 3,
    h: 3,
    produces: [],
    income: 0,
    maxOwn: 1,
    weapon: null,
  },
  barracks: {
    name: '兵营',
    cost: 400,
    hp: 650,
    w: 2,
    h: 2,
    produces: ['infantry'],
    income: 0,
    maxOwn: 99,
    weapon: null,
  },
  factory: {
    name: '战车工厂',
    cost: 700,
    hp: 850,
    w: 2,
    h: 2,
    produces: ['tank'],
    income: 0,
    maxOwn: 99,
    weapon: null,
  },
  refinery: {
    name: '矿场',
    cost: 350,
    hp: 520,
    w: 2,
    h: 2,
    produces: [],
    income: INCOME.perRefinery,
    maxOwn: 99,
    weapon: null,
  },
  turret: {
    name: '炮塔',
    cost: 400,
    hp: 480,
    w: 1,
    h: 1,
    produces: [],
    income: 0,
    maxOwn: 99,
    weapon: { dps: 34, range: 175, attackMs: 900, autoRange: 185 },
  },
};

const UNITS = {
  infantry: {
    name: '步兵',
    cost: 80,
    hp: 60,
    speed: 62,
    r: 6,
    dps: 9,
    range: 100,
    attackMs: 800,
    autoRange: 150,
    buildMs: 3000,
    teamCount: -1, // 不限
  },
  tank: {
    name: '坦克',
    cost: 250,
    hp: 270,
    speed: 46,
    r: 11,
    dps: 27,
    range: 140,
    attackMs: 1100,
    autoRange: 190,
    buildMs: 5000,
    teamCount: -1,
  },
};

module.exports = {
  GAME_NAME,
  GAME_VERSION,
  TILE,
  MAP_COLS,
  MAP_ROWS,
  TILE_KIND,
  TEAM,
  COLORS,
  INCOME,
  START_GOLD,
  BUILDINGS,
  UNITS,
};
