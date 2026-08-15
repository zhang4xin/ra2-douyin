'use strict';

// 触控手势 -> 鼠标/键盘/wheel 事件合成器。
//
// 目标：让浏览器版 RTS 引擎（依赖 mousedown/mousemove/mouseup/click/
// contextmenu/dblclick/wheel/keydown）在无鼠标键盘的触屏上可用。
//
// 手势映射（P0，来自多部门头脑风暴结论）：
//   - 单击（<250ms 且位移 <10px）  -> mousedown(button:0) -> mouseup -> click
//   - 双击（<300ms 两次）          -> dblclick
//   - 拖动（位移 >=10px）          -> 高频 mousemove 流（16ms 插值补帧）
//   - 长按（>=500ms 无位移）       -> contextmenu(button:2) + 震动反馈
//   - 双指捏合                     -> wheel（deltaY 由两指距离增量换算）
//   - 双指拖动                     -> 中键平移（button:1）
//
// 说明：长按/拖动/双击的判定参数可通过 options 覆盖，便于真机调优。
// 所有合成事件经 dispatch(event) 派发，由调用方（适配层）挂到引擎事件链上。

const NOOP = function () {};

const DEFAULT_OPTIONS = {
  tapMaxMs: 250,
  tapMaxMove: 10,
  dblTapMaxMs: 300,
  longPressMs: 500,
  dragThreshold: 10,
  moveIntervalMs: 16,
  vibrate: true,
};

class EventSynthesizer {
  constructor(dispatch, options) {
    this.dispatch = dispatch || NOOP;
    this.opts = Object.assign({}, DEFAULT_OPTIONS, options || {});

    this.points = new Map(); // identifier -> {x,y,t0,down:true}
    this.mid = null; // 当前手势中点在物理坐标
    this.distance = 0; // 双指距离
    this.gesture = null; // 'none'|'tap'|'drag'|'longpress'|'pinch'|'pan'
    this.lastTapAt = 0; // 上次单击时间（判断双击）
    this.lastTapPos = null;
    this._tickTimer = null;
    this._longPressTimer = null;
  }

  // ---------- 供 tt.onTouchStart/Move/End 接入 ----------

  onTouchStart(ev) {
    const touches = ev.touches || [];
    const changed = ev.changedTouches || touches;
    for (const t of changed) {
      this.points.set(t.identifier, {
        _id: t.identifier,
        x: t.clientX != null ? t.clientX : t.pageX,
        y: t.clientY != null ? t.clientY : t.pageY,
        t0: Date.now(),
        down: true,
        moved: 0,
        consumed: false,
      });
    }
    if (this.points.size === 1) {
      this._scheduleLongPress(this._only());
    }
    this._updateMid();
    if (this.points.size === 2) {
      this._clearLongPress();
      this.distance = this._pointDistance();
      this.gesture = 'pinch';
    }
  }

  onTouchMove(ev) {
    const touches = ev.touches || [];
    for (const t of touches) {
      const p = this.points.get(t.identifier);
      if (!p) continue;
      const x = t.clientX != null ? t.clientX : t.pageX;
      const y = t.clientY != null ? t.clientY : t.pageY;
      const dx = x - p.x;
      const dy = y - p.y;
      p.moved += Math.abs(dx) + Math.abs(dy);
      p.x = x;
      p.y = y;
    }
    const active = this._activePoints();
    if (active.length >= 2) {
      this._clearLongPress();
      const prevDistance = this.distance;
      this.distance = this._pointDistance();
      this._updateMid();
      if (prevDistance > 0 && this.mid) {
        // 双指捏合 -> wheel 缩放
        this.dispatch(this._wheel(0, 0, (this.distance - prevDistance) * -1, this.mid.x, this.mid.y));
      }
      this.gesture = 'pinch';
      return;
    }
    if (active.length === 1 && this.points.size === 1) {
      const p = active[0];
      if (this.gesture !== 'drag' && p.moved >= this.opts.dragThreshold) {
        this._clearLongPress();
        this.gesture = 'drag';
        this._startMoveStream(p);
      }
      if (this.gesture === 'drag') {
        this.dispatch(this._mouse('mousemove', 0, p.x, p.y));
      }
    }
  }

  onTouchEnd(ev) {
    const changed = ev.changedTouches || [];
    for (const t of changed) {
      const p = this.points.get(t.identifier);
      if (!p) continue;
      const now = Date.now();
      const dt = now - p.t0;
      const isQuickTap = dt < this.opts.tapMaxMs && p.moved < this.opts.tapMaxMove;

      if (this.points.size >= 2) {
        // 双指手势结束，无需合成点击。
      } else if (this.gesture === 'longpress') {
        // 长按已派发 contextmenu，结束不补 click。
      } else if (this.gesture === 'drag') {
        this._stopMoveStream();
        this.dispatch(this._mouse('mouseup', 0, p.x, p.y));
      } else if (isQuickTap) {
        this._clearLongPress();
        this.dispatch(this._mouse('mousedown', 0, p.x, p.y));
        this.dispatch(this._mouse('mouseup', 0, p.x, p.y));
        this.dispatch(this._mouse('click', 0, p.x, p.y));

        const now2 = Date.now();
        const dtSinceLast = now2 - this.lastTapAt;
        if (
          this.lastTapPos &&
          dtSinceLast < this.opts.dblTapMaxMs &&
          Math.abs(p.x - this.lastTapPos.x) < this.opts.tapMaxMove * 2 &&
          Math.abs(p.y - this.lastTapPos.y) < this.opts.tapMaxMove * 2
        ) {
          this.dispatch(this._mouse('dblclick', 0, p.x, p.y));
          this.lastTapAt = 0;
          this.lastTapPos = null;
        } else {
          this.lastTapAt = now2;
          this.lastTapPos = { x: p.x, y: p.y };
        }
      }
      this.points.delete(t.identifier);
    }
    this._updateMid();
    if (this.points.size === 0) {
      this._clearLongPress();
      this.gesture = null;
    }
  }

  onTouchCancel(ev) {
    const changed = ev.changedTouches || [];
    for (const t of changed) this.points.delete(t.identifier);
    this._clearLongPress();
    this._stopMoveStream();
    this._updateMid();
    if (this.points.size === 0) this.gesture = null;
  }

  // ---------- 内部 ----------

  _activePoints() {
    const out = [];
    this.points.forEach((p) => p.down && out.push(p));
    return out;
  }

  _only() {
    const arr = this._activePoints();
    return arr.length === 1 ? arr[0] : null;
  }

  _pointDistance() {
    const arr = this._activePoints();
    if (arr.length < 2) return 0;
    const dx = arr[0].x - arr[1].x;
    const dy = arr[0].y - arr[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _updateMid() {
    const arr = this._activePoints();
    if (arr.length === 0) {
      this.mid = null;
      return;
    }
    let sx = 0;
    let sy = 0;
    for (const p of arr) {
      sx += p.x;
      sy += p.y;
    }
    this.mid = { x: sx / arr.length, y: sy / arr.length };
  }

  _scheduleLongPress(p) {
    this._clearLongPress();
    if (!p) return;
    this._longPressTimer = setTimeout(() => {
      if (this.points.size === 1) {
        this.gesture = 'longpress';
        this.dispatch(this._mouse('contextmenu', 2, p.x, p.y));
        if (this.opts.vibrate && typeof tt !== 'undefined' && tt.vibrateShort) {
          try {
            tt.vibrateShort({ type: 'medium' });
          } catch (_) {
            /* 真机不支持时忽略 */
          }
        }
      }
    }, this.opts.longPressMs);
  }

  _clearLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  _startMoveStream(p) {
    this._stopMoveStream();
    const opts = this.opts;
    this._tickTimer = setInterval(() => {
      const cur = this.points.get(p._id);
      if (!cur) return;
      this.dispatch(this._mouse('mousemove', 0, cur.x, cur.y));
    }, opts.moveIntervalMs);
  }

  _stopMoveStream() {
    if (this._tickTimer) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
  }

  _mouse(type, button, x, y) {
    return {
      type,
      button,
      buttons: type === 'mousedown' || type === 'mousemove' ? button + 1 : 0,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      offsetX: x,
      offsetY: y,
      target: null,
      currentTarget: null,
      bubbles: true,
      cancelable: true,
      detail: type === 'dblclick' ? 2 : 1,
      preventDefault() {},
      stopPropagation() {},
      synthetic: true,
    };
  }

  _wheel(deltaX, deltaY, deltaZ, x, y) {
    return {
      type: 'wheel',
      deltaX,
      deltaY,
      deltaZ,
      deltaMode: 0,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      target: null,
      bubbles: true,
      cancelable: true,
      preventDefault() {},
      stopPropagation() {},
      synthetic: true,
    };
  }
}

module.exports = EventSynthesizer;
