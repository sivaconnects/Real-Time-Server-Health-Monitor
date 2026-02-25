const http = require('http');
const os   = require('os');
const fs   = require('fs');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const APP_START = Date.now();
let prevCpuInfo = os.cpus();

/* ─── Metric Helpers ─────────────────────────────────── */
function getCpu() {
  const cpus = os.cpus();
  let totalUsage = 0;
  const perCore = cpus.map((cpu, i) => {
    const prev  = prevCpuInfo[i];
    const pTot  = Object.values(prev.times).reduce((a, b) => a + b, 0);
    const cTot  = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const total = cTot - pTot || 1;
    const idle  = cpu.times.idle - prev.times.idle;
    const usage = Math.round((1 - idle / total) * 100);
    totalUsage += usage;
    return usage;
  });
  prevCpuInfo = cpus;
  const avg = Math.round(totalUsage / cpus.length);
  return { avg, perCore, model: cpus[0].model.trim(), cores: cpus.length, loadAvg: os.loadavg().map(l => +l.toFixed(2)) };
}

function getMem() {
  const total   = os.totalmem();
  const free    = os.freemem();
  const used    = total - free;
  const toMB    = v => Math.round(v / 1024 / 1024);
  return { total: toMB(total), used: toMB(used), free: toMB(free), pct: Math.round(used / total * 100) };
}

function getDisk() {
  try {
    const cols = execSync('df -k / | tail -1').toString().trim().split(/\s+/);
    const toGB = v => +(parseInt(v) * 1024 / 1024 / 1024 / 1024).toFixed(1);
    return { total: toGB(cols[1]), used: toGB(cols[2]), free: toGB(cols[3]), pct: parseInt(cols[4]) };
  } catch { return { total: 0, used: 0, free: 0, pct: 0 }; }
}

function getUptime() {
  const s   = Math.floor((Date.now() - APP_START) / 1000);
  const d   = Math.floor(s / 86400);
  const h   = Math.floor((s % 86400) / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

function metrics() {
  return {
    ts:      Date.now(),
    uptime:  getUptime(),
    sysUptime: Math.floor(os.uptime()),
    host:    { name: os.hostname(), platform: os.platform(), release: os.release(), arch: os.arch() },
    cpu:     getCpu(),
    mem:     getMem(),
    disk:    getDisk(),
    proc:    { pid: process.pid, node: process.version, mem: Math.round(process.memoryUsage().rss / 1024 / 1024) },
  };
}

/* ─── SSE Handler ─────────────────────────────────────── */
const sseClients = new Set();

function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('retry: 3000\n\n');
  const send = () => res.write(`data: ${JSON.stringify(metrics())}\n\n`);
  send();
  const iv = setInterval(send, 2000);
  sseClients.add(iv);
  req.on('close', () => { clearInterval(iv); sseClients.delete(iv); });
}

/* ─── HTML Dashboard ──────────────────────────────────── */
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Server Health Monitor</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  :root{
    --bg:#080b14; --bg2:#0d1117; --surface:rgba(255,255,255,.04);
    --border:rgba(255,255,255,.07); --text:#e2e8f0; --muted:#4b5563;
    --green:#22c55e; --cyan:#06b6d4; --indigo:#818cf8;
    --orange:#f97316; --red:#ef4444; --yellow:#eab308;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:24px 20px}
  /* grid */
  .wrap{max-width:1100px;margin:0 auto}
  /* header */
  header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
  .hdr-left{display:flex;align-items:center;gap:14px}
  .hdr-icon{width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#06b6d4);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
  .hdr-title{font-size:20px;font-weight:700;letter-spacing:-.5px}
  .hdr-sub{font-size:12px;color:var(--muted);margin-top:2px;font-family:'JetBrains Mono',monospace}
  .hdr-right{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .pill{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:500;border:1px solid}
  .pill-green{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.3);color:var(--green)}
  .pill-muted{background:var(--surface);border-color:var(--border);color:var(--muted);font-family:'JetBrains Mono',monospace}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:blink 1.4s infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
  /* stat row */
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px}
  .stat{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;transition:transform .2s,border-color .2s}
  .stat:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.14)}
  .stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .stat-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
  .stat-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}
  .stat-val{font-size:28px;font-weight:700;font-family:'JetBrains Mono',monospace;line-height:1}
  .stat-sub{font-size:12px;color:var(--muted);margin-top:6px}
  /* progress bar */
  .bar-wrap{margin-top:14px}
  .bar-track{height:6px;background:rgba(255,255,255,.07);border-radius:999px;overflow:hidden}
  .bar-fill{height:100%;border-radius:999px;transition:width .8s cubic-bezier(.4,0,.2,1)}
  .bar-row{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:5px;font-family:'JetBrains Mono',monospace}
  /* sparkline panel */
  .panels{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
  @media(max-width:680px){.panels{grid-template-columns:1fr}}
  .panel{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px}
  .panel-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:8px}
  /* canvas chart */
  canvas{width:100%;border-radius:8px}
  /* core bars */
  .cores{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .core-row{display:flex;align-items:center;gap:8px;font-size:12px;font-family:'JetBrains Mono',monospace}
  .core-label{color:var(--muted);width:44px;flex-shrink:0}
  .core-track{flex:1;height:5px;background:rgba(255,255,255,.07);border-radius:999px;overflow:hidden}
  .core-fill{height:100%;border-radius:999px;transition:width .6s}
  .core-val{color:var(--muted);width:32px;text-align:right;flex-shrink:0}
  /* info table */
  .info-table{width:100%;font-size:13px;border-collapse:collapse}
  .info-table tr{border-bottom:1px solid var(--border)}
  .info-table tr:last-child{border-bottom:none}
  .info-table td{padding:10px 0}
  .info-table td:first-child{color:var(--muted);width:130px}
  .info-table td:last-child{font-family:'JetBrains Mono',monospace;font-size:12px}
  /* load avg */
  .load-chips{display:flex;gap:8px;margin-top:8px}
  .chip{background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:8px;padding:8px 14px;text-align:center}
  .chip-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
  .chip-val{font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;margin-top:3px}
  /* alert banner */
  .alert{display:none;align-items:center;gap:10px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:12px;padding:12px 18px;margin-bottom:18px;font-size:13px}
  .alert.show{display:flex}
  footer{text-align:center;color:var(--muted);font-size:12px;margin-top:10px}
  /* color helpers */
  .c-green{color:var(--green)} .c-cyan{color:var(--cyan)} .c-indigo{color:var(--indigo)} .c-orange{color:var(--orange)} .c-red{color:var(--red)}
  .bg-green{background:rgba(34,197,94,.15)} .bg-cyan{background:rgba(6,182,212,.15)} .bg-indigo{background:rgba(129,140,248,.15)} .bg-orange{background:rgba(249,115,22,.15)}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="hdr-left">
      <div class="hdr-icon">📡</div>
      <div>
        <div class="hdr-title">Server Health Monitor</div>
        <div class="hdr-sub" id="hostname">Loading...</div>
      </div>
    </div>
    <div class="hdr-right">
      <div class="pill pill-green"><div class="dot"></div> Stream Active</div>
      <div class="pill pill-muted" id="clock">--:--:--</div>
    </div>
  </header>

  <div class="alert" id="alert">⚠️ <span id="alert-msg"></span></div>

  <!-- Stat Cards -->
  <div class="stats">
    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">CPU Usage</div>
        <div class="stat-icon bg-indigo">🔲</div>
      </div>
      <div class="stat-val c-indigo" id="cpu-val">--%</div>
      <div class="stat-sub" id="cpu-model">--</div>
      <div class="bar-wrap">
        <div class="bar-track"><div class="bar-fill" id="cpu-bar" style="background:#818cf8;width:0%"></div></div>
        <div class="bar-row"><span id="cpu-cores">-- cores</span><span id="cpu-load">load: --</span></div>
      </div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Memory</div>
        <div class="stat-icon bg-cyan">💾</div>
      </div>
      <div class="stat-val c-cyan" id="mem-val">--%</div>
      <div class="stat-sub" id="mem-detail">-- MB used</div>
      <div class="bar-wrap">
        <div class="bar-track"><div class="bar-fill" id="mem-bar" style="background:#06b6d4;width:0%"></div></div>
        <div class="bar-row"><span id="mem-used">Used: --</span><span id="mem-total">Total: --</span></div>
      </div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Disk</div>
        <div class="stat-icon bg-orange">🗄️</div>
      </div>
      <div class="stat-val c-orange" id="disk-val">--%</div>
      <div class="stat-sub" id="disk-detail">-- GB used</div>
      <div class="bar-wrap">
        <div class="bar-track"><div class="bar-fill" id="disk-bar" style="background:#f97316;width:0%"></div></div>
        <div class="bar-row"><span id="disk-used">Used: --</span><span id="disk-total">Total: --</span></div>
      </div>
    </div>

    <div class="stat">
      <div class="stat-top">
        <div class="stat-label">Uptime</div>
        <div class="stat-icon bg-green">⏱️</div>
      </div>
      <div class="stat-val c-green" id="uptime-val" style="font-size:18px;padding-top:6px">--</div>
      <div class="stat-sub" id="sys-uptime">System: --</div>
      <div style="margin-top:14px">
        <div class="bar-row">
          <span>PID</span><span id="proc-pid" style="font-family:'JetBrains Mono',monospace;font-size:12px">--</span>
        </div>
        <div class="bar-row" style="margin-top:6px">
          <span>Node</span><span id="proc-node" style="font-family:'JetBrains Mono',monospace;font-size:12px">--</span>
        </div>
        <div class="bar-row" style="margin-top:6px">
          <span>RSS Mem</span><span id="proc-mem" style="font-family:'JetBrains Mono',monospace;font-size:12px">--</span>
        </div>
      </div>
    </div>
  </div>

  <div class="panels">
    <!-- CPU Sparkline -->
    <div class="panel">
      <div class="panel-title">📈 CPU History <span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px" id="chart-latest"></span></div>
      <canvas id="chart" height="100"></canvas>
    </div>

    <!-- Per-Core -->
    <div class="panel">
      <div class="panel-title">⚙️ Per-Core Usage</div>
      <div class="cores" id="cores"></div>
    </div>

    <!-- Load Average -->
    <div class="panel">
      <div class="panel-title">📊 Load Average</div>
      <div class="load-chips">
        <div class="chip" style="flex:1"><div class="chip-label">1 min</div><div class="chip-val c-indigo" id="load1">--</div></div>
        <div class="chip" style="flex:1"><div class="chip-label">5 min</div><div class="chip-val c-cyan" id="load5">--</div></div>
        <div class="chip" style="flex:1"><div class="chip-label">15 min</div><div class="chip-val c-green" id="load15">--</div></div>
      </div>
    </div>

    <!-- System Info -->
    <div class="panel">
      <div class="panel-title">🖥️ System Info</div>
      <table class="info-table">
        <tr><td>Hostname</td><td id="si-host">--</td></tr>
        <tr><td>Platform</td><td id="si-platform">--</td></tr>
        <tr><td>OS Release</td><td id="si-release">--</td></tr>
        <tr><td>Architecture</td><td id="si-arch">--</td></tr>
        <tr><td>CPU Model</td><td id="si-cpu">--</td></tr>
      </table>
    </div>
  </div>

  <footer>Built with Node.js · Server-Sent Events · Deployed on AWS EC2 &nbsp;🚀</footer>
</div>

<script>
const MAX_HIST = 40;
const history  = [];
const canvas   = document.getElementById('chart');
const ctx      = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = canvas.offsetWidth * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  drawChart();
}

function drawChart() {
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  ctx.clearRect(0, 0, W, H);
  if (history.length < 2) return;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,.05)';
  ctx.lineWidth   = 1;
  [25, 50, 75].forEach(pct => {
    const y = H - (pct / 100) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  });

  const step = W / (MAX_HIST - 1);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(129,140,248,.35)');
  grad.addColorStop(1, 'rgba(129,140,248,.01)');
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = i * step, y = H - (v / 100) * H;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo((history.length - 1) * step, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  history.forEach((v, i) => {
    const x = i * step, y = H - (v / 100) * H;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Latest dot
  const lx = (history.length - 1) * step, ly = H - (history[history.length - 1] / 100) * H;
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#a5b4fc';
  ctx.fill();
}

function fmtSysUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? \`\${d}d \${h}h \${m}m\` : \`\${h}h \${m}m\`;
}

function barColor(pct) {
  if (pct > 85) return '#ef4444';
  if (pct > 60) return '#eab308';
  return null;
}

function update(d) {
  // Alert
  const alert = document.getElementById('alert');
  const msgs = [];
  if (d.cpu.avg > 85) msgs.push(\`High CPU: \${d.cpu.avg}%\`);
  if (d.mem.pct > 85) msgs.push(\`High Memory: \${d.mem.pct}%\`);
  if (d.disk.pct > 90) msgs.push(\`Disk almost full: \${d.disk.pct}%\`);
  if (msgs.length) { alert.classList.add('show'); document.getElementById('alert-msg').textContent = msgs.join(' · '); }
  else alert.classList.remove('show');

  // Header
  document.getElementById('hostname').textContent = d.host.name;
  document.getElementById('si-host').textContent  = d.host.name;
  document.getElementById('si-platform').textContent = d.host.platform;
  document.getElementById('si-release').textContent  = d.host.release;
  document.getElementById('si-arch').textContent     = d.host.arch;
  document.getElementById('si-cpu').textContent      = d.cpu.model.split('@')[0].trim();

  // CPU
  const cpuColor = barColor(d.cpu.avg) || '#818cf8';
  document.getElementById('cpu-val').textContent  = d.cpu.avg + '%';
  document.getElementById('cpu-val').style.color  = cpuColor;
  document.getElementById('cpu-bar').style.width  = d.cpu.avg + '%';
  document.getElementById('cpu-bar').style.background = cpuColor;
  document.getElementById('cpu-model').textContent = d.cpu.model.split('@')[0].trim();
  document.getElementById('cpu-cores').textContent = d.cpu.cores + ' cores';
  document.getElementById('cpu-load').textContent  = 'load: ' + d.cpu.loadAvg[0];

  // Memory
  const memColor = barColor(d.mem.pct) || '#06b6d4';
  document.getElementById('mem-val').textContent   = d.mem.pct + '%';
  document.getElementById('mem-val').style.color   = memColor;
  document.getElementById('mem-bar').style.width   = d.mem.pct + '%';
  document.getElementById('mem-bar').style.background = memColor;
  document.getElementById('mem-detail').textContent = d.mem.used + ' MB used of ' + d.mem.total + ' MB';
  document.getElementById('mem-used').textContent  = 'Used: ' + d.mem.used + 'MB';
  document.getElementById('mem-total').textContent = 'Total: ' + d.mem.total + 'MB';

  // Disk
  const dkColor = barColor(d.disk.pct) || '#f97316';
  document.getElementById('disk-val').textContent  = d.disk.pct + '%';
  document.getElementById('disk-val').style.color  = dkColor;
  document.getElementById('disk-bar').style.width  = d.disk.pct + '%';
  document.getElementById('disk-bar').style.background = dkColor;
  document.getElementById('disk-detail').textContent = d.disk.used + ' GB used of ' + d.disk.total + ' GB';
  document.getElementById('disk-used').textContent = 'Used: ' + d.disk.used + 'GB';
  document.getElementById('disk-total').textContent= 'Total: ' + d.disk.total + 'GB';

  // Uptime
  document.getElementById('uptime-val').textContent = d.uptime;
  document.getElementById('sys-uptime').textContent  = 'System: ' + fmtSysUptime(d.sysUptime);
  document.getElementById('proc-pid').textContent   = d.proc.pid;
  document.getElementById('proc-node').textContent  = d.proc.node;
  document.getElementById('proc-mem').textContent   = d.proc.mem + ' MB';

  // Load avg
  document.getElementById('load1').textContent  = d.cpu.loadAvg[0];
  document.getElementById('load5').textContent  = d.cpu.loadAvg[1];
  document.getElementById('load15').textContent = d.cpu.loadAvg[2];

  // Per-core
  const coresEl = document.getElementById('cores');
  coresEl.innerHTML = d.cpu.perCore.map((v, i) => \`
    <div class="core-row">
      <span class="core-label">Core \${i}</span>
      <div class="core-track"><div class="core-fill" style="width:\${v}%;background:\${barColor(v)||'#818cf8'}"></div></div>
      <span class="core-val">\${v}%</span>
    </div>\`).join('');

  // Chart
  history.push(d.cpu.avg);
  if (history.length > MAX_HIST) history.shift();
  document.getElementById('chart-latest').textContent = d.cpu.avg + '%';
  drawChart();
}

// Clock
setInterval(() => {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}, 1000);

// SSE
const es = new EventSource('/stream');
es.onmessage = e => update(JSON.parse(e.data));
es.onerror   = ()  => console.warn('SSE reconnecting...');

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);
</script>
</body>
</html>`;

/* ─── HTTP Router ──────────────────────────────────────── */
const server = http.createServer((req, res) => {
  if (req.url === '/stream')       return sseHandler(req, res);
  if (req.url === '/api/metrics')  {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(metrics(), null, 2));
  }
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`\n🚀  Server Health Monitor`);
  console.log(`📡  Dashboard  → http://localhost:${PORT}`);
  console.log(`📊  Metrics    → http://localhost:${PORT}/api/metrics`);
  console.log(`🔗  SSE Stream → http://localhost:${PORT}/stream\n`);
});
