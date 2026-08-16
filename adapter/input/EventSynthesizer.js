'use strict';

// 触控手势 -> 鼠标/wheel 事件合成器。
//
// 目标：让浏览器版 RTS 引擎（依赖 mousedown/mousemove/mouseup/click/
// contextmenu/dblclick/wheel）在无鼠标键盘的触屏上可用。
//
// 手势映射（P0，来自多部门头脑风暴结论）：
//   - 单击（<250ms 且位移 <10px）  -> mousedown(button:0) -> mouseup -> click
//   - 双击（<300ms 两次）          -> dblclick
//   - 拖动（位移 >=10px）          -> 随 touchmove 派发 mousemove
//   - 长按（>=500ms 无位移）       -> contextmenu(button:2) + 震动反馈
//   - 双指捏合                     -> wheel（deltaY 由两指距离增量换算）
//
// 说明：
//   - 双指拖动平移（中键 button:1）推迟到 Phase 2 引擎渲染接管后再做
//     （见 docs/mobile-controls.md），避免提前产出引擎不消费的事件。
//   - 判定参数可通过 options 覆盖，便于真机调优。
//   - 触控输入按信任边界处理：坐标非有限值、触点数超上限的触点直接丢弃。

const NOOP = function () {};

const DEFAULT_OPTIONS = {
  tapMaxMs: 250,
  tapMaxMove: 10,
  dblTapMaxMs: 300,
  longPressMs: 500,
  dragThreshold: 10,
  vibrate: true,
};

const MAX_POINTS = 10;

class EventSynthesizer {
  constructor(dispatch, options) {
    this.dispatch = dispatch || NOOP;
    this.opts = Object.assign({}, DEFAULT_OPTIONS, options || {});

    this.points = new Map(); // identifier -> {x, y, t0, moved}
    this.mid = null; // 当前手势中点（物理坐标）
    this.distance = 0; // 双指距离
    this.gesture = null; // null | 'drag' | 'longpress' | 'pinch'
    this.lastTapAt = 0;
    this.lastTapPos = null;
    this._longPressTimer = null;
  }

  // 从触点对象提取有限坐标；无效返回 null（信任边界过滤）。
  _point(t) {
    const x = typeof t.clientX === 'number' ? t.clientX : t.pageX;
    const y = typeof t.clientY === 'number' ? t.clientY : t.pageY;
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
      return null;
    }
    return { x, y };
  }

  onTouchStart(ev) {
    const changed = ev.changedTouches || ev.touches || [];
    for (const t of changed) {
      const pt = this._point(t);
      if (!pt || this.points.size >= MAX_POINTS) continue;
      this.points.set(t.identifier, { x: pt.x, y: pt.y, t0: Date.now(), moved: 0 });
    }
    if (this.points.size === 1) {
      this._scheduleLongPress(this._only());
    }
    if (this.points.size === 2) {
      this._clearLongPress();
      this.distance = this._pointDistance();
      this.gesture = 'pinch';
    }
    this._updateMid();
  }

  onTouchMove(ev) {
    const touches = ev.touches || [];
    for (const t of touches) {
      const p = this.points.get(t.identifier);
      const pt = this._point(t);
      if (!p || !pt) continue;
      p.moved += Math.abs(pt.x - p.x) + Math.abs(pt.y - p.y);
      p.x = pt.x;
      p.y = pt.y;
    }
    if (this.points.size >= 2) {
      const prevDistance = this.distance;
      const prevMid = this.mid;
      this.distance = this._pointDistance();
      this._updateMid();
      if (prevDistance > 0 && this.mid && prevMid) {
        const dz = (this.distance - prevDistance) * -1;
        if (dz !== 0) this.dispatch(this._wheel(0, dz, 0, this.mid.x, this.mid.y));
      }
      this.gesture = 'pinch';
      return;
    }
    if (this.points.size === 1) {
      const p = this._only();
      if (this.gesture !== 'drag' && p.moved >= this.opts.dragThreshold) {
        this._clearLongPress();
        this.gesture = 'drag';
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
      const dt = Date.now() - p.t0;
      const isQuickTap = dt < this.opts.tapMaxMs && p.moved < this.opts.tapMaxMove;

      if (this.points.size >= 2) {
        // 双指手势结束，无需合成点击。
      } else if (this.gesture === 'longpress') {
        // 长按已派发 contextmenu，结束不补 click。
      } else if (this.gesture === 'drag') {
        this.dispatch(this._mouse('mouseup', 0, p.x, p.y));
      } else if (isQuickTap) {
        this._clearLongPress();
        this.dispatch(this._mouse('mousedown', 0, p.x, p.y));
        this.dispatch(this._mouse('mouseup', 0, p.x, p.y));
        this.dispatch(this._mouse('click', 0, p.x, p.y));

        const dtSinceLast = Date.now() - this.lastTapAt;
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
          this.lastTapAt = Date.now();
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
    this._updateMid();
    if (this.points.size === 0) this.gesture = null;
  }

  // ---------- 内部 ----------

  _activePoints() {
    return [...this.points.values()];
  }

  _only() {
    const arr = this._activePoints();
    return arr.length === 1 ? arr[0] : null;
  }

  _pointDistance() {
    const arr = this._activePoints();
    if (arr.length < 2) return 0;
    return Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
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
