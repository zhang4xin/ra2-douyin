'use strict';

// 视口变换：逻辑分辨率固定 1024x768（config.ini viewport），
// 在任意手机横屏物理尺寸上等比缩放 + letterbox（上下留黑边），
// 并负责把触屏物理坐标换算为引擎逻辑坐标。

class ViewportTransform {
  constructor(logicalWidth, logicalHeight, physicalWidth, physicalHeight) {
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    this.setPhysical(physicalWidth, physicalHeight);
  }

  setPhysical(physicalWidth, physicalHeight) {
    this.physicalWidth = physicalWidth;
    this.physicalHeight = physicalHeight;

    const scaleX = physicalWidth / this.logicalWidth;
    const scaleY = physicalHeight / this.logicalHeight;
    // 等比适配：取较小缩放，保证 4:3 画布完整可见（上下黑边）。
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (physicalWidth - this.logicalWidth * this.scale) / 2;
    this.offsetY = (physicalHeight - this.logicalHeight * this.scale) / 2;
  }

  // 物理坐标 -> 逻辑坐标。返回 null 表示点在黑边区域外。
  toLogical(px, py) {
    const x = (px - this.offsetX) / this.scale;
    const y = (py - this.offsetY) / this.scale;
    if (x < 0 || y < 0 || x > this.logicalWidth || y > this.logicalHeight) {
      return null;
    }
    return { x, y };
  }

  // 逻辑坐标 -> 物理坐标（用于把引擎事件映射回屏幕绘制，Phase 2 渲染接管用）。
  toPhysical(x, y) {
    return {
      x: x * this.scale + this.offsetX,
      y: y * this.scale + this.offsetY,
    };
  }
}

module.exports = ViewportTransform;
