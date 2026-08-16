// M0.7 WASM Spike · 抖音小游戏端
// 验证：7zz.wasm 能否在抖音运行时内通过 tt.getFileSystemManager 读取 + WebAssembly 实例化，
//       并走 7zz.js 胶水完成一次真实的 7z 建包/解压闭环。
// 结果绘制到画布便于截图，同时输出到 Console。
// 依赖：本目录下自包含的 7zz.js / 7zz.wasm（与 runtime/releases/0.83.4-r0918ad8-dac2bf5b2 同源）。
// 完成后该 spike 目录将被删除。

var fsMgr = tt.getFileSystemManager();
var canvas = tt.getGameCanvas();
var ctx = canvas.getContext('2d');

var LINES = [];
function log(msg) {
  LINES.push(String(msg));
  console.log('[spike]', msg);
  paint();
}
function paint() {
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e8e8f0';
  ctx.font = '14px sans-serif';
  ctx.textBaseline = 'top';
  LINES.slice(-22).forEach(function (t, i) {
    ctx.fillText(t, 12, 12 + i * 20);
  });
}

function readFile(filePath) {
  return new Promise(function (resolve, reject) {
    fsMgr.readFile({
      filePath: filePath,
      success: function (res) {
        resolve(res.data);
      },
      fail: function (err) {
        reject(new Error(err.errMsg || 'readFile fail'));
      },
    });
  });
}

function step(name, fn) {
  return fn().then(
    function () {
      log('PASS ' + name);
    },
    function (e) {
      log('FAIL ' + name + ' -> ' + (e && e.message ? e.message : e));
    },
  );
}

paint();
log('spike start, canvas ' + canvas.width + 'x' + canvas.height);

step('读取 7zz.wasm (tt fs)', function () {
  return readFile('7zz.wasm').then(function (bytes) {
    log('readFile ok, bytes=' + bytes.byteLength);
    if (bytes.byteLength < 1000000) throw new Error('wasm 体积异常');
  });
});

step('WebAssembly.instantiate（平台原生）', function () {
  return readFile('7zz.wasm')
    .then(function (bytes) {
      return WebAssembly.instantiate(bytes, {
        env: {},
        wasi_snapshot_preview1: {},
      });
    })
    .then(function (res) {
      var exp = Object.keys(res.instance.exports);
      log(
        'exports: ' +
          exp
            .filter(function (k) {
              return /main|memory/.test(k);
            })
            .join(', '),
      );
      if (
        !exp.some(function (k) {
          return k === '_main' || k === 'main';
        })
      ) {
        throw new Error('缺少 main 导出');
      }
    });
});

step('7zz.js 胶水 + 真实建/解 7z 闭环', function () {
  var SevenZip = require('./7zz.js');
  return readFile('7zz.wasm')
    .then(function (bytes) {
      return SevenZip({
        wasmBinary: bytes,
        print: function (s) {
          console.log('[7z]', s);
        },
        printErr: function (s) {
          console.error('[7z]', s);
        },
      });
    })
    .then(function (m) {
      var FS = m.FS;
      FS.writeFile('/spike.txt', 'douyin-wasm-spike-' + Date.now());
      m.callMain(['a', '/spike.7z', '/spike.txt']);
      var size = FS.stat('/spike.7z').size;
      if (size <= 0) throw new Error('建包失败');
      log('archive created, ' + size + ' bytes');
      FS.mkdir('/out');
      m.callMain(['x', '-y', '-o/out', '/spike.7z']);
      FS.chmod('/out/spike.txt', 0o644);
      var back = FS.readFile('/out/spike.txt', { encoding: 'utf8' });
      if (back.indexOf('douyin-wasm-spike') !== 0) throw new Error('解压内容不一致');
      log('解压读回一致: ' + JSON.stringify(back.slice(0, 24)));
    });
});

log('M0.7 spike 完成，请在开发者工具 Console 查看 [spike] 与 [7z] 日志并截图');
