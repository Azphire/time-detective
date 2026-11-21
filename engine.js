/* =========================================================
   时间侦探 · 推演引擎
   ---------------------------------------------------------
   明线（tree）：每个人的一串时间点，可以分叉。
     · 节点 { id, label, room, awake, does?, doesText? }
       does(w) 是明面上的动作（大家都看得见），比如锁门。
     · 分叉 { fork:[ { cond:'若…', test:w=>bool, path:[...] }, ..., { cond:'否则', path:[...] } ] }
       走到分叉时，按「上一个钟点结束时」的世界状态选路——也就是别人在前面做过的事。
       cond 只用于破案后的揭晓；推演中玩家看不到分叉条件，没走过的分支也不显示。
     · 走到末尾就停在最后一个节点（不一定睡着，可能正醒着等机会）。
   暗线（rules）：每个钟点按顺序检查，条件满足就发生，玩家看不见。
     · c.sneak(人, 房间)：偷偷离开明线上的位置。推演表仍显示明线位置；
       如果原房间里有别人醒着，他们会注意到这个人不见了（证词）。
     · c.note(房间, 文字)：只在「真实经过」里显示的一句话，不移动任何人。
   ========================================================= */

function prepTree(ch) {
  ch.nodes = {}; ch.order = [];
  const walk = (arr, depth, conds) => {
    arr.forEach((el, i) => {
      if (el.fork) {
        el.fork.forEach(b => walk(b.path, depth + i, conds.concat([b.cond])));
        return;
      }
      el.depth = depth + i; el.conds = conds;
      const nx = arr[i + 1];
      el.next = nx ? (nx.fork ? { fork:nx.fork } : { node:nx }) : null;
      ch.nodes[el.id] = el; ch.order.push(el);
    });
  };
  walk(ch.tree, 0, []);
}
function advance(node, w) {
  if (!node.next) return node;
  if (node.next.node) return node.next.node;
  const b = node.next.fork.find(b => !b.test || b.test(w));
  return b.path[0];
}

function simulate(cs, starts) {
  const w = cs.world();
  const out = { hours:[], clues:[], truth:[], badAt:null };
  const cur = {};
  cs.hours.forEach((hour, t) => {
    if (out.badAt != null) { out.hours.push({ hour, cut:true }); return; }   // 案发后这一夜就停在那里
    // exitOnDeath：死了的人退出（不再前进、不在任何房间、不算醒着）。只有开了这个选项的案子才这样处理
    const gone = id => !!(cs.exitOnDeath && w.dead && w.dead[id]);
    cs.chars.forEach(ch => {
      if (t > 0 && gone(ch.id)) return;
      cur[ch.id] = t === 0 ? ch.nodes[starts[ch.id]] : advance(cur[ch.id], w);
    });
    const pos = {}, real = {};
    cs.chars.forEach(ch => {
      const n = cur[ch.id];
      if (gone(ch.id)) {
        pos[ch.id] = { room:null, awake:false, label:'', node:n.id, dead:true };
        real[ch.id] = { room:null, awake:false, dead:true };
        return;
      }
      pos[ch.id] = { room:n.room, awake:n.awake, label:n.label, node:n.id };
      real[ch.id] = { room:n.room, awake:n.awake };
    });
    const events = [], hidden = [], sneaks = [];
    const c = {
      t, hour, w,
      name:id => cs.chars.find(x => x.id === id).name,
      at:(id, nodeId) => pos[id].node === nodeId,
      atAny:(id, ids) => ids.includes(pos[id].node),
      awake:id => real[id].awake && !gone(id),
      room:id => real[id].room,
      awakeIn:(room, except) => cs.chars.filter(ch => ch.id !== except && real[ch.id].room === room && real[ch.id].awake && !gone(ch.id)).map(ch => ch.id),
      see:(room, text, bad) => events.push({ room, text, bad:!!bad }),
      doze:(id, text) => { real[id].awake = false; if (text) hidden.push({ room:real[id].room, text, who:id }); },
      wake:(id, text) => { real[id].awake = true; if (text) hidden.push({ room:real[id].room, text, who:id }); },
      note:(room, text) => hidden.push({ room, text }),        // 只在「真实经过」里显示的一句话，不改变任何人的位置
      sneak:(id, room, text, silent) => {
        const from = real[id].room;
        real[id].room = room;
        if (!silent) sneaks.push({ id, from, to:room });
        if (text !== '') hidden.push({ room, text:text || `${cs.chars.find(x => x.id === id).name}偷偷来到${room}`, who:id, from });   // text 传 '' 表示不留文字
      },
    };
    // 明面上的动作
    cs.chars.forEach(ch => {
      const n = cur[ch.id];
      if (gone(ch.id)) return;
      if (n.does) {
        const r = n.does(w, t, pos);
        if (r && typeof r === 'object') {            // { text, label }：这个钟点的动作和明线写的不一样
          if (r.label) pos[ch.id].label = r.label;
          if (r.text) events.push({ room:n.room, text:r.text });
        } else if (r !== false && r !== undefined || (r === undefined && n.doesText)) {
          events.push({ room:n.room, text: typeof r === 'string' ? r : n.doesText });
        }
      }
    });
    // 暗线
    for (const r of cs.rules) {
      if (!r.when(c)) continue;
      const preClue = typeof r.clue === 'function' ? r.clue(c) : null;
      r.act(c);
      out.truth.push({ hour, rule:r.id });
      if (r.note) hidden.push({ room:r.noteRoom ? r.noteRoom(c) : null, text:r.note });
      if (r.bad) {
        if (out.badAt == null) out.badAt = hour;
        if (cs.badSeen) events.push({ room:cs.badRoomFn ? cs.badRoomFn(w) : cs.badRoom, text:cs.badSeen, bad:true });
      }
      if (r.clue) {
        const cl = preClue || r.clue;
        const text = typeof cl.text === 'function' ? cl.text(c) : cl.text;
        if (!out.clues.some(x => x.text === text)) out.clues.push({ hour, room:cl.room, text, rule:r.id });
      }
    }
    // 证词：偷偷离开时，原房间里醒着的人会注意到
    sneaks.forEach(s => {
      if (w.dark) return;            // 停电时谁也看不清
      const wit = cs.chars.filter(ch => ch.id !== s.id && real[ch.id].room === s.from && real[ch.id].awake && !gone(ch.id));
      if (wit.length) {
        const nm = cs.chars.find(x => x.id === s.id).name;
        const tx = `${wit.map(x => x.name).join('、')}说：${nm}有一阵子不在${s.from}`;
        events.push({ room:s.from, text:tx, witness:true });
        out.clues.push({ hour, room:s.from, text:`${hour} ${tx}。`, rule:'witness' });
      }
    });
    out.hours.push({ hour, pos, real:JSON.parse(JSON.stringify(real)), items:cs.items(w), events, hidden });
  });
  out.end = cs.ending(w);
  return out;
}

/* =========================================================
   案子注册：每个案子文件调用 registerCase({...})
   ========================================================= */
const CASES = [];
function registerCase(cs) {
  if (CASES.some(c => c.id === cs.id)) { console.warn('重复的案子 id：' + cs.id); return; }
  cs.chars.forEach(prepTree);
  CASES.push(cs);
}
if (typeof module !== 'undefined') module.exports = { CASES, registerCase, simulate, prepTree, advance };
