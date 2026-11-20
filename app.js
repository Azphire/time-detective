/* 界面：推演表、提示、成就、选关。依赖 engine.js 和已注册的案子。 */
/* =========================================================
   界面
   ========================================================= */
const $ = q => document.querySelector(q);
const state = CASES.map(cs => freshState(cs));
let ci = 0;
const CS = () => CASES[ci], ST = () => state[ci];
const cfgText = (cs, st) => cs.chars.filter(c => !c.fixed).map(c => `${c.name}·${c.nodes[st[c.id]].label}`).join('　');
const sameStarts = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- 成就（保存在这个浏览器里） ---------- */
const achKey = cs => 'timedet-ach-' + cs.id;
function loadAch(cs) {
  try { return new Set(JSON.parse(localStorage.getItem(achKey(cs)) || '[]')); } catch (e) { return new Set(); }
}
function saveAch(cs, set) {
  try { localStorage.setItem(achKey(cs), JSON.stringify([...set])); } catch (e) {}
}
const achState = CASES.map(cs => ({ got:loadAch(cs), fresh:new Set() }));
function checkAch(r) {
  const cs = CS(), s = ST(), A = achState[ci];
  const x = { r, s, cs, fired:new Set(r.truth.map(t => t.rule)),
    initial:cs.chars.every(c => s.starts[c.id] === c.start) };
  const newly = (cs.achievements || []).filter(a => !A.got.has(a.id) && a.test(x));
  newly.forEach(a => { A.got.add(a.id); A.fresh.add(a.id); });
  if (newly.length) { saveAch(cs, A.got); newly.forEach((a, i) => setTimeout(() => toastAch(a), 500 + i * 900)); }
  renderAch();
}
function renderAch() {
  const cs = CS(), A = achState[ci], list = cs.achievements || [];
  $('#achSec').hidden = !list.length;
  if (!list.length) return;
  $('#achCount').textContent = `${list.filter(a => A.got.has(a.id)).length} / ${list.length}`;
  $('#ach').innerHTML = list.map(a => A.got.has(a.id)
    ? `<div class="a ${A.fresh.has(a.id) ? 'new' : ''}"><b>${a.name}</b><span>${a.desc}</span></div>`
    : a.open ? `<div class="a lock open"><b>${a.name}</b><span>${a.desc}</span></div>`
    : `<div class="a lock"><b>？？？</b><span>未解锁</span></div>`).join('');
}
function toastAch(a) {
  const box = $('#achToast'), el = document.createElement('div');
  el.className = 't';
  el.innerHTML = `<small>成就解锁</small><b>${a.name}</b><span>${a.desc}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
}

/* ---------- 教学步骤 ---------- */
function renderGuide() {
  const cs = CS(), s = ST(), list = cs.guide || [];
  $('#guide').hidden = !list.length;
  if (!list.length) return;
  let nowSet = false, n = 0;
  $('#guideList').innerHTML = list.map(g => {
    const d = g.done(s);
    if (d) n++;
    let cls = d ? 'done' : '';
    if (!d && !nowSet) { cls = 'now'; nowSet = true; }
    return `<li class="${cls}">${g.text}</li>`;
  }).join('');
  $('#guideCount').textContent = `${n} / ${list.length}`;
}

// 还在写的案子：只占一个标签，点开显示「开发中」
const COMING = typeof COMING_SOON !== 'undefined' ? COMING_SOON : [];
let soon = -1;
function renderTabs() {
  $('#tabs').hidden = CASES.length + COMING.length < 2;
  $('#tabs').innerHTML = CASES.map((c, i) =>
    `<button class="tab ${soon < 0 && i === ci ? 'cur' : ''}" data-i="${i}">${c.tab} · ${c.title}${state[i].solved ? '<span class="ck">✓</span>' : ''}</button>`).join('')
    + COMING.map((c, k) => `<button class="tab soon ${soon === k ? 'cur' : ''}" data-soon="${k}">${c.tab} · ${c.title}</button>`).join('');
  $('#tabs').querySelectorAll('.tab[data-i]').forEach(b => b.onclick = () => openCase(+b.dataset.i));
  $('#tabs').querySelectorAll('.tab[data-soon]').forEach(b => b.onclick = () => openSoon(+b.dataset.soon));
  $('#runCount').textContent = soon < 0 ? `推演 ${ST().runs.length} 次` : '';
}
function openSoon(k) {
  soon = k;
  $('main').hidden = true;
  $('#soonView').hidden = false;
  $('#soonTab').textContent = COMING[k].tab;
  renderTabs();
  window.scrollTo({ top:0 });
}

function openCase(i) {
  ci = i;
  soon = -1;
  $('main').hidden = false;
  $('#soonView').hidden = true;
  const cs = CS(), s = ST();
  $('#eyebrow').hidden = true;
  $('#title').textContent = cs.title;
  $('#brief').textContent = cs.brief;
  $('#note').hidden = !cs.note;
  $('#note').innerHTML = cs.note ? `<b>注</b>${cs.note}` : '';
  $('#goal').textContent = cs.goal;
  renderTabs(); renderGuide(); renderLines(); renderRuns(); renderHints(); renderAch();
  if (s.shown >= 0) showResult(s.shown, false); else $('#resultSec').hidden = true;
  if (s.solved) renderTruth(); else $('#truthSec').hidden = true;
  window.scrollTo({ top:0 });
}

/* ---------- 明线 ---------- */
function leafCount(arr) {
  let n = 1;
  arr.forEach(el => { if (el.fork) n = el.fork.reduce((a, b) => a + leafCount(b.path), 0); });
  return n;
}
function reachFrom(node) {
  const set = new Set(), q = [node];
  while (q.length) {
    const n = q.shift(); if (set.has(n)) continue; set.add(n);
    if (!n.next) continue;
    if (n.next.node) q.push(n.next.node); else n.next.fork.forEach(b => q.push(b.path[0]));
  }
  return set;
}
function ancestors(ch, node) {
  const set = new Set();
  const walk = (arr, trail) => {
    for (const el of arr) {
      if (el.fork) { el.fork.forEach(b => walk(b.path, trail.slice())); return; }
      if (el === node) { trail.forEach(x => set.add(x)); return; }
      trail.push(el);
    }
  };
  walk(ch.tree, []);
  return set;
}

function renderLines() {
  const cs = CS(), s = ST(), box = $('#lines'), H = cs.hours.length;
  const cur = s.shown >= 0 && sameStarts(s.runs[s.shown].starts, s.starts) ? s.runs[s.shown].r : null;
  box.innerHTML = '';
  cs.chars.forEach(ch => {
    const start = ch.nodes[s.starts[ch.id]];
    const reach = reachFrom(start), anc = ancestors(ch, start);
    const taken = new Set(cur ? cur.hours.filter(h => !h.cut).map(h => h.pos[ch.id].node) : []);
    const nodeHTML = n => {
      let cls, tag = '';
      if (reach.has(n)) {
        const k = n.depth - start.depth;
        if (k < H) { cls = 'in'; tag = !n.next && k < H - 1 ? `${cs.hours[k]}–${cs.hours[H - 1]}` : cs.hours[k]; }
        else cls = 'out';
      } else cls = anc.has(n) ? 'past' : 'off';
      if (anc.has(n)) tag = '已过去';
      if (n === start) cls += ' start';
      if (taken.has(n.id)) cls += ' taken';
      return `<button class="node ${cls}" data-id="${n.id}">
        <span class="dot"></span>
        <span class="st"><span class="st-l">${n.label}</span><br><span class="st-m">${n.room}${n.doesText ? ' · ' + n.doesText.replace(/了$/, '') : ''}</span>${tag ? `<span class="tag2 num">${n === start ? '▸ ' : ''}${tag}</span>` : ''}</span>
        <span class="tag num">${tag}</span></button>`;
    };
    const known = b => s.solved || b.path.some(n => s.revealed.has(n.id));
    const pathHTML = arr => `<div class="path">${arr.map(el => el.fork
      ? `<div class="fork">${el.fork.map(b => {
          if (!known(b)) return `<div class="branch unknown"><div class="cond">&nbsp;</div><div class="q">？</div></div>`;
          const live = cur && b.path.some(n => taken.has(n.id));
          return `<div class="branch ${live ? 'live' : ''}"><div class="cond">${s.solved ? b.cond : '&nbsp;'}</div>${pathHTML(b.path)}</div>`;
        }).join('')}</div>`
      : nodeHTML(el)).join('')}</div>`;
    const visW = arr => {           // 这一列需要的宽度：已知分支各占一份，「？」占一小格
      let w = 0;
      arr.forEach(el => { if (el.fork) w = el.fork.reduce((a, b) => a + (known(b) ? visW(b.path) : 60), 0); });
      return w || 175;
    };
    const col = document.createElement('div');
    col.className = 'line' + (ch.fixed ? ' fixed' : '');
    const w = Math.max(ch.fixed ? 220 : 200, visW(ch.tree) + 36);   // 理想列宽：按内容，不铺满
    col.style.flex = `0 1 ${w}px`;
    col.style.minWidth = Math.round(Math.max(158, w * 0.8)) + 'px';  // 人多时先压缩到这里，再横向滚动
    col.innerHTML = `<div class="line-head"><span class="tok">${ch.short}</span><b>${ch.name}</b>${ch.fixed ? '<em>无法调整</em>' : ''}</div>${pathHTML(ch.tree)}`;
    if (!ch.fixed) col.querySelectorAll('.node').forEach(b => b.onclick = () => setStart(ch.id, b.dataset.id));
    box.appendChild(col);
  });
  $('#scene').innerHTML = `<b>现场</b>${cs.scene.map(x => `<span>${x}</span>`).join('')}`;
}

function setStart(id, nodeId) {
  const s = ST();
  s.touched[id] = true;
  if (s.starts[id] !== nodeId) s.starts[id] = nodeId;
  renderLines(); markStale();
  renderGuide();
}
function markStale() {
  const s = ST();
  if (s.shown < 0) return;
  const same = sameStarts(s.runs[s.shown].starts, s.starts);
  $('#resultSec').classList.toggle('stale', !same);
  $('#resSub').textContent = same ? subText(s.shown) : '明线已改动，需要重新推演';
}
const subText = i => (i === ST().runs.length - 1 ? '' : '回看 · ') + cfgText(CS(), ST().runs[i].starts);

/* ---------- 推演 ---------- */
function run() {
  const cs = CS(), s = ST();
  const r = simulate(cs, { ...s.starts });
  s.runs.push({ starts:{ ...s.starts }, r });
  r.hours.forEach(h => { if (!h.cut) Object.values(h.pos).forEach(p => s.revealed.add(p.node)); });
  const n = s.runs.length;
  new Set(r.truth.map(x => x.rule)).forEach(id => s.fired[id] = (s.fired[id] || 0) + 1);
  if (r.end.ok) s.solved = true;
  const first = (cs.hints || [])[0];
  if (first && first.autoAt && n >= first.autoAt && s.hintsOpen < 1) { s.hintsOpen = 1; renderHints(); }
  showResult(n - 1, true);
  checkAch(r);
  renderGuide();
  renderRuns(); renderTabs();
  if (s.solved) renderTruth();
  $('#resultSec').scrollIntoView({ behavior:'smooth', block:'start' });
}

function showResult(i, fresh) {
  const cs = CS(), s = ST(), { r } = s.runs[i];
  s.shown = i;
  if (fresh) s.real = false;
  const sec = $('#resultSec');
  sec.hidden = false; sec.classList.remove('stale');
  $('#resTitle').textContent = `第 ${i + 1} 次推演`;
  $('#resSub').textContent = subText(i);
  $('#resTools').hidden = !s.solved;
  $('#vMing').classList.toggle('on', !s.real);
  $('#vReal').classList.toggle('on', s.real);
  const real = s.solved && s.real;
  const head = `<thead><tr><th></th>${cs.rooms.map(rm => `<th>${rm}</th>`).join('')}</tr></thead>`;
  const body = r.hours.map((h, k) => {
    if (h.cut) return `<tr class="cut" style="animation-delay:${fresh ? k * 0.12 : 0}s"><th class="num">${h.hour}</th><td colspan="${cs.rooms.length}">案发之后，推演到此为止</td></tr>`;
    const cells = cs.rooms.map(rm => {
      let who = '';
      cs.chars.forEach(c => {
        const p = h.pos[c.id], q = h.real[c.id];
        if (!real) {
          if (p.room === rm) who += `<div class="who"><span class="tok">${c.short}</span>${p.label}</div>`;
          return;
        }
        if (q.room === rm) {
          const moved = q.room !== p.room, dozed = p.awake && !q.awake;
          const cls = moved ? 'sneak' : (q.awake ? '' : 'sleep');
          who += `<div class="who ${cls}"><span class="tok ${cls}">${c.short}</span>${p.label}${moved ? '（其实在这里）' : ''}${dozed ? '（打瞌睡）' : ''}</div>`;
        } else if (p.room === rm) {
          who += `<div class="who gone"><span class="tok">${c.short}</span>${p.label}（人不在）</div>`;
        }
      });
      const items = h.items.filter(it => it.room === rm).map(it => `<span class="item ${it.bad ? 'bad' : ''}">${it.text}</span>`).join('');
      let evs = h.events.filter(e => e.room === rm).map(e => `<div class="ev ${e.bad ? 'bad' : ''} ${e.witness ? 'wit' : ''}">${e.text}</div>`).join('');
      if (real) evs += h.hidden.filter(e => e.room === rm).map(e => `<div class="ev hid">${e.text}</div>`).join('');
      return `<td>${who}${items}${evs}</td>`;
    }).join('');
    return `<tr style="animation-delay:${fresh ? k * 0.12 : 0}s"><th class="num">${h.hour}</th>${cells}</tr>`;
  }).join('');
  $('#grid').innerHTML = head + `<tbody>${body}</tbody>`;
  const v = $('#verdict');
  v.className = 'verdict ' + (r.end.ok ? 'ok' : 'bad');
  v.textContent = (r.end.ok ? '✓ ' : '✕ ') + r.end.text;
  const tr = r.clues.map(c => c.rule === 'witness' ? c.text : `${c.room}：${c.text}`);
  $('#traces').innerHTML = `<span class="lbl">痕迹与证词</span>${tr.length ? tr.join('　') : '没有发现异常'}`;
  renderRuns(); renderLines();
}
function setView(real) { ST().real = real; showResult(ST().shown, false); }

function renderHints() {
  const cs = CS(), s = ST(), list = cs.hints || [];
  $('#hintSec').hidden = !list.length;
  if (!list.length) return;
  $('#hintCount').textContent = `${s.hintsOpen} / ${list.length}`;
  $('#hints').innerHTML = s.hintsOpen
    ? list.slice(0, s.hintsOpen).map(t => `<li>${typeof t === 'string' ? t : t.text}</li>`).join('')
    : '<li class="none">提示从弱到强排列，可以一条一条揭开。</li>';
  const b = $('#hintBtn');
  b.disabled = s.hintsOpen >= list.length;
  b.textContent = s.hintsOpen >= list.length ? '提示已全部揭开' : (s.hintsOpen ? '再揭开一条' : '揭开一条提示');
}
function revealHint() {
  const s = ST();
  if (s.hintsOpen < (CS().hints || []).length) { s.hintsOpen++; renderHints(); }
}
function renderRuns() {
  const ol = $('#runs'), cs = CS(), s = ST();
  if (!s.runs.length) { ol.innerHTML = '<li class="empty">还没有推演。</li>'; return; }
  const seen = new Set();
  const rows = s.runs.map((x, i) => {
    const cl = x.r.clues.map(c => {
      const txt = c.rule === 'witness' ? c.text : c.text;
      const nw = !seen.has(txt); seen.add(txt);
      return `<div class="cl"><span class="k">${c.rule === 'witness' ? '证词' : c.room}</span><span>${txt}${nw ? '<span class="nw">新</span>' : ''}</span></div>`;
    }).join('') || '<div class="cl none"><span></span><span>没有发现异常</span></div>';
    return `<li data-i="${i}" class="${i === s.shown ? 'shown' : ''}">
      <span class="n num">#${i + 1}</span><span class="cfg">${cfgText(cs, x.starts)}</span>
      <span class="res ${x.r.end.ok ? 'ok' : 'bad'}">${x.r.end.ok ? '✓ 阻止' : '✕ 案发'}</span>${cl}</li>`;
  });
  ol.innerHTML = rows.reverse().join('');
  ol.querySelectorAll('li[data-i]').forEach(li => li.onclick = () => {
    const i = +li.dataset.i;
    ST().starts = { ...ST().runs[i].starts };
    showResult(i, false);
    $('#resultSec').scrollIntoView({ behavior:'smooth', block:'start' });
  });
}

function forkList(cs) {
  const out = [];
  cs.chars.forEach(ch => {
    const walk = (arr, prev) => arr.forEach((el, i) => {
      if (!el.fork) return;
      const before = arr[i - 1] || prev;
      out.push({ who:ch.name, text:`「${before.label}」之后：` + el.fork.map(b => `${b.cond}，${b.path.map(n => n.label + '（' + n.room + '）').join(' → ')}`).join('；') + '。' });
      el.fork.forEach(b => walk(b.path, before));
    });
    walk(ch.tree, null);
  });
  return out;
}
function renderTruth() {
  const cs = CS(), s = ST(), sec = $('#truthSec');
  const firstWin = s.runs.findIndex(x => x.r.end.ok) + 1;
  const next = CASES[ci + 1];
  sec.innerHTML = `
    <h2>真相 · 暗线</h2>
    <p class="lead">第 ${firstWin} 次推演告破。</p>
    <ul class="truth">${cs.rules.filter(r => !r.hideTruth).map(r => `<li><span class="w">${r.who}</span><span>${r.truth}</span>
      <span class="s ${s.fired[r.id] ? 'hit' : ''}">${s.fired[r.id] ? `在 ${s.fired[r.id]} 次推演中发生过` : '从未被触发'}</span></li>`).join('')}</ul>
    <h2 style="margin-top:6px">分叉的条件</h2>
    <p class="lead">推演时看不到的岔路口：</p>
    <ul class="truth">${forkList(cs).map(f => `<li><span class="w">${f.who}</span><span>${f.text}</span><span class="s"></span></li>`).join('')}</ul>
    ${next ? `<div class="next"><button id="nextBtn">下一案：${next.title} →</button></div>` : ''}`;
  sec.hidden = false;
  if (next) $('#nextBtn').onclick = () => openCase(ci + 1);
  $('#resTools').hidden = false;
}

function freshState(cs) {
  return {
    starts:Object.fromEntries(cs.chars.map(c => [c.id, c.start])),
    runs:[], fired:{}, shown:-1, solved:false, real:false, hintsOpen:0, touched:{},
    revealed:new Set(cs.chars.map(c => c.start)),   // 走过（或起点所在）的节点；没走过的分支显示为「？」
  };
}
function newGame() {
  const cs = CS();
  state[ci] = freshState(cs);
  achState[ci] = { got:new Set(), fresh:new Set() };
  saveAch(cs, achState[ci].got);
  $('#achToast').innerHTML = '';
  $('#newDlg').hidden = true;
  openCase(ci);
}
$('#newBtn').addEventListener('click', () => {
  $('#newText').textContent = `「${CS().title}」的推演记录、已揭开的提示和已解锁的成就都会被清空，无法恢复。其他案子不受影响。`;
  $('#newDlg').hidden = false;
});
$('#newNo').addEventListener('click', () => { $('#newDlg').hidden = true; });
$('#newDlg').addEventListener('click', e => { if (e.target.id === 'newDlg') $('#newDlg').hidden = true; });
$('#newYes').addEventListener('click', newGame);
$('#runBtn').addEventListener('click', run);
$('#hintBtn').addEventListener('click', revealHint);
$('#vMing').addEventListener('click', () => setView(false));
$('#vReal').addEventListener('click', () => setView(true));
openCase(0);
