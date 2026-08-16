'use strict';

// 输入控制：把合成后的鼠标事件翻译成游戏指令。
// 依赖 adapter.bindTouch 注入的鼠标事件（见 EventSynthesizer 手势映射）。
// 事件坐标 = 画布物理像素。

const C = require('./config');
const S = require('./state');
const UI = require('./ui');

function createInputController(refs) {
  const ctrl = {
    pressOnButton: false,
    overRestart: false,
    pending: null, // { tab } | { cell }

    onMouseDown(ev) {
      const { getState, getLayout, toast, restart } = refs;
      const state = getState();
      const l = getLayout();

      if (UI.hitRestart(l, ev.clientX, ev.clientY)) {
        this.pressOnButton = true;
        this.overRestart = true;
        return;
      }

      const tab = UI.hitTab(l, ev.clientX, ev.clientY);
      if (tab) {
        this.pressOnButton = true;
        this.pending = { tab };
        return;
      }

      const cell = UI.hitCell(l, ev.clientX, ev.clientY, state.panelTab);
      if (cell) {
        this.pressOnButton = true;
        this.pending = { cell };
        return;
      }

      if (state.over) {
        this.pressOnButton = true;
        this.overRestart = true;
        return;
      }

      if (state.placement) {
        // 放置模式：先记录悬停，点击时落子
        const p = UI.toMap(l, ev.clientX, ev.clientY);
        if (p) state.placementPos = p;
        return;
      }

      // 点选 / 框选起点
      const p = UI.toMap(l, ev.clientX, ev.clientY);
      const hit = p ? S.unitAt(state, C.TEAM.P, p.x, p.y, 14) : null;
      state.selection = hit ? [hit.id] : [];
      state.box = { x0: ev.clientX, y0: ev.clientY, x1: ev.clientX, y1: ev.clientY };
      state.dragMoved = false;
    },

    onMouseMove(ev) {
      const { getState, getLayout } = refs;
      const state = getState();
      const l = getLayout();

      if (state.placement) {
        const p = UI.toMap(l, ev.clientX, ev.clientY);
        state.placementPos = p;
        return;
      }

      if (state.box) {
        state.box.x1 = ev.clientX;
        state.box.y1 = ev.clientY;
        if (Math.abs(state.box.x1 - state.box.x0) + Math.abs(state.box.y1 - state.box.y0) > 8) {
          state.dragMoved = true;
        }
      }
    },

    onMouseUp() {
      const { getState, getLayout } = refs;
      const state = getState();
      const l = getLayout();

      if (state.over) return;

      if (state.box) {
        if (state.dragMoved) {
          // 框选：选中框内己方单位
          const box = state.box;
          const minX = Math.min(box.x0, box.x1);
          const maxX = Math.max(box.x0, box.x1);
          const minY = Math.min(box.y0, box.y1);
          const maxY = Math.max(box.y0, box.y1);
          const ids = [];
          for (const e of state.ents) {
            if (e.kind !== 'unit' || e.team !== C.TEAM.P) continue;
            const s = UI.toScreen(l, e.x, e.y);
            if (s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY) ids.push(e.id);
          }
          state.selection = ids;
        }
        state.box = null;
      }
    },

    onClick(ev) {
      const { getState, getLayout, toast, restart } = refs;
      const state = getState();
      const l = getLayout();

      if (this.pressOnButton) {
        this.pressOnButton = false;
        if (this.overRestart) {
          this.overRestart = false;
          restart();
        } else if (this.pending) {
          const pending = this.pending;
          this.pending = null;
          if (pending.tab) ctrl.tabAction(pending.tab, state, toast);
          else ctrl.cellAction(pending.cell, state, toast);
        }
        return;
      }

      if (state.over) {
        restart();
        return;
      }

      if (state.placement) {
        const p = UI.toMap(l, ev.clientX, ev.clientY);
        if (p) {
          const res = S.placeBuilding(
            state,
            C.TEAM.P,
            state.placement.type,
            Math.floor(p.x / C.TILE),
            Math.floor(p.y / C.TILE),
          );
          if (res.ok) {
            toast(`${C.BUILDINGS[state.placement.type].name} 已建造`);
            state.placement = null;
            state.placementPos = null;
          } else {
            toast(res.reason);
          }
        }
      }
    },

    onContextMenu(ev) {
      const { getState, getLayout, toast, log } = refs;
      const state = getState();
      const l = getLayout();

      if (state.over) return;

      if (state.placement) {
        state.placement = null;
        state.placementPos = null;
        toast('已取消建造');
        return;
      }

      if (!state.selection.length) return;
      const p = UI.toMap(l, ev.clientX, ev.clientY);
      if (!p) return;

      const target = S.entAt(state, p.x, p.y);
      if (target && target.team !== C.TEAM.P) {
        S.giveOrder(state, state.selection, { kind: 'attack', targetId: target.id });
        state.orderFx.push({ x: target.x, y: target.y, t: 0, kind: 'attack' });
        log('攻击目标: ' + target.name);
      } else {
        S.giveOrder(state, state.selection, { kind: 'move', x: p.x, y: p.y });
        state.orderFx.push({ x: p.x, y: p.y, t: 0, kind: 'move' });
        log('移动指令');
      }
    },

    onWheel() {
      const { log } = refs;
      log('双指缩放功能开发中');
    },

    tabAction(tab, state, toast) {
      const next = tab.id.slice('tab:'.length);
      if (state.panelTab === next) return;
      state.panelTab = next;
      state.placement = null;
      state.placementPos = null;
      toast(next === 'build' ? '建筑列表' : '兵种列表');
    },

    cellAction(cell, state, toast) {
      if (cell.kind === 'build') {
        const def = C.BUILDINGS[cell.type];
        if (def.cost < 0) return;
        if (state.money.P < def.cost) {
          toast('资金不足');
          return;
        }
        if (state.placement && state.placement.type === cell.type) {
          state.placement = null;
          state.placementPos = null;
        } else {
          state.placement = { type: cell.type };
          toast('点击地图放置，长按取消');
        }
      } else {
        const res = S.queueUnit(state, C.TEAM.P, cell.type);
        if (res.ok) toast(`开始生产 ${C.UNITS[cell.type].name}`);
        else toast(res.reason);
      }
    },
  };

  return ctrl;
}

module.exports = { createInputController };
