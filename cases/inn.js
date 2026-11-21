/* =========================================================
   第四案 · 黑化侦探
   现实：脑机接口剧本杀《落霞客栈》首测，设备 04:00 烧毁。
   游戏里死掉的人会退出、平安醒来；04:00 还在游戏里的人会脑死亡。
   这一案反过来：要让所有人在 04:00 前「死」一次。
   每个人只会因为一件事死，而且大多要先有人替他铺好路。
   ========================================================= */
(function () {
  const NAME = { liu:'柳三娘', man:'老满', bai:'白少爷', qin:'秦姑娘', sun:'孙郎中', asi:'阿四', tao:'陶书生' };
  const alive = (c, id) => !c.w.dead[id];
  // 这个人所在的房间里，除了 ids 之外还有没有别人醒着
  const lonely = (c, id, ...ids) => c.awakeIn(c.room(id), id).filter(x => !ids.includes(x)).length === 0;
  const die = (c, id, room, text) => {
    c.w.dead[id] = c.hour;
    c.see(room, `${NAME[id]}死亡`, true);
    if (text) c.see(room, text);
  };
  const ONSET = 2;
  // 偷偷离开时，在原房间留下一条看得见的动静
  const leave = (c, id, to, text) => {
    const from = c.room(id);
    if (from === to) return;
    c.see(from, text);
  };   // 毒喝下去两个小时后发作

  registerCase({
    id:'inn', tab:'第四案', title:'黑化侦探',
    exitOnDeath:true,
    brief:'一款脑机接口剧本杀首测，七名玩家进入了游戏《落霞客栈》。开局不久设备出了故障，04:00 就会彻底烧毁：在游戏里死掉的人会立刻退出、平安醒来，到时还留在游戏里的人会脑死亡。每个人手里都有一张任务卡。这一次，侦探要让案件发生。',
    goal:'04:00 前，让所有人都在游戏里死一次',
    achievements:[
      { open:true, id:'plan', name:'原计划', desc:'一处不改，照原本的安排推演一次。', test:x => x.initial },
      { open:true, id:'nohint', name:'无需提示', desc:'一条提示都没看就让所有人下线。', test:x => x.r.end.ok && x.s.hintsOpen <= x.cs.hints.filter(h => h.free).length },
      { open:true, id:'fast', name:'十步之内', desc:'十次推演之内让所有人下线。', test:x => x.r.end.ok && x.s.runs.length <= 10 },
      { open:true, id:'all', name:'豆沙了！', desc:'04:00 前，让所有人都在游戏里死一次。', test:x => x.r.end.ok },
      { id:'habit', name:'职业病发作', desc:'一个人都没死。', test:x => Object.keys(x.r.end.dead || {}).length === 0 },
      { id:'one', name:'轮到你了……吗？', desc:'六个人下线了，只剩一个人困在游戏里。', test:x => Object.keys(x.r.end.dead || {}).length === 6 },
      { id:'peep', name:'登徒子！', desc:'秦姑娘在天字房外偷看时，白少爷正好在换衣服。',
        test:x => x.r.hours.some(h => !h.cut && h.pos.qin.node === 'peek' && h.pos.bai.node === 'change') },
      { id:'cure', name:'妙手回春', desc:'有人中了毒，又被救了回来。', test:x => x.fired.has('sun-cure') || x.fired.has('self-cure') },
      { id:'paths', name:'全图探索', desc:'在推演中走遍每一条岔路。', test:x => x.cs.chars.every(ch => ch.order.every(n => x.s.revealed.has(n.id))) },
      { id:'sys', name:'系统提示', desc:'推演了 10 次，第一条提示自动揭开了。', test:x => x.s.runs.length >= 10 },
      { id:'addict', name:'是时候加入防沉迷了！', desc:'推演了 100 次。', test:x => x.s.runs.length >= 100 },
    ],
    hints:[
      { free:true, autoAt:10,
        text:'毒药喝下去两个小时才发作；毒发时人要是醒着，多半能自己扛过去。（推演满十次后自动揭开；揭开这一条不影响「无需提示」成就。）' },
      '每个人只会因为一件事死。先弄清楚每个人能死在谁手里。',
      '陶书生的任务是活下去，没人想杀他。得让他在正确时间自己“送死”，别让人拦住、也别让人点破。',
      '有人的死要靠别人先死：护卫没护住主人，会去找刺客报仇。',
      '少爷身边如果有护卫守护，刺客来刺杀，死的会是刺客。',
      '刺客要等到夜深（00:00 以后）才动手。',
      '阿四手脚不干净，他动过的东西，会害死东西的主人；被他偷了东西的人，也会去找他算账。',
      '孙郎中醒着的时候，中了毒的人只要和他待在一起就有救。',
    ],
    hours:['22:00','23:00','00:00','01:00','02:00','03:00'],
    rooms:['大堂','厨房','酒窖','天字房','地字房','后院'],
    scene:['04:00 设备烧毁','每个人都有一张任务卡'],
    world:() => ({ dead:{}, poison:{}, wine:false, box:false, book:false, baiKnows:false, baiHome:false, map:false, till:false }),
    items:w => [
      ...(w.book ? [] : [{ room:'天字房', text:'秘籍' }]),
      ...(w.till ? [] : [{ room:'大堂', text:'钱匣' }]),
    ],
    chars:[
      { id:'liu', name:'柳三娘', short:'柳', start:'cook', tree:[
        { id:'lamp', label:'挂灯笼', room:'大堂', awake:true },
        { id:'fire', label:'生火', room:'厨房', awake:true },
        { id:'prep', label:'在后厨备菜', room:'厨房', awake:true },
        { id:'greet', label:'招呼客人', room:'大堂', awake:true },
        { id:'cellar', label:'去酒窖取酒', room:'酒窖', awake:true },
        { id:'cook', label:'下厨', room:'厨房', awake:true },
        { id:'count', label:'在柜台盘账', room:'大堂', awake:true },
        { id:'lnap', label:'趴在柜台打盹', room:'大堂', awake:false },
      ]},
      { id:'man', name:'老满', short:'满', start:'mdrink', tree:[
        { id:'arrive', label:'赶着镖车进院', room:'后院', awake:true },
        { id:'blade', label:'擦刀', room:'后院', awake:true },
        { id:'feed', label:'喂马', room:'后院', awake:true },
        { id:'unload', label:'卸镖', room:'后院', awake:true },
        { id:'mdrink', label:'大堂喝酒', room:'大堂', awake:true },
        { fork:[
          { cond:'若白少爷已经回房', test:w => w.baiHome, path:[
            { id:'guard', label:'守在少爷门口', room:'天字房', awake:true },
            { id:'guard2', label:'守夜', room:'天字房', awake:true },
            { id:'mnap', label:'靠着门打盹', room:'天字房', awake:false },
          ]},
          { cond:'否则', path:[
            { id:'cart', label:'回后院看着镖车', room:'后院', awake:true },
            { id:'mnap2', label:'靠着镖车打盹', room:'后院', awake:false },
          ]},
        ]},
      ]},
      { id:'bai', name:'白少爷', short:'白', start:'bdrink', tree:[
        { id:'change', label:'回房更衣', room:'天字房', awake:true },
        { id:'rain', label:'大堂听雨', room:'大堂', awake:true },
        { id:'bdrink', label:'饮酒', room:'大堂', awake:true },
        { id:'chess', label:'在大堂下棋', room:'大堂', awake:true },
        { id:'read', label:'回房读秘籍', room:'天字房', awake:true },
        { fork:[
          { cond:'若发现秘籍不见了', test:w => w.baiKnows, path:[
            { id:'search', label:'下楼找秘籍', room:'大堂', awake:true },
            { id:'bsleep1', label:'睡下', room:'天字房', awake:false },
          ]},
          { cond:'否则', path:[
            { id:'bsleep2', label:'睡下', room:'天字房', awake:false },
          ]},
        ]},
      ]},
      { id:'qin', name:'秦姑娘', short:'秦', start:'sword', tree:[
        { id:'sing', label:'扮作卖唱女', room:'大堂', awake:true },
        { id:'peek', label:'在天字房外偷看', room:'天字房', awake:true },
        { id:'roof', label:'上屋顶探路', room:'后院', awake:true },
        { id:'qnap', label:'在柴房小睡', room:'后院', awake:false },
        { id:'tea', label:'大堂喝茶', room:'大堂', awake:true },
        { id:'sword', label:'后院练剑', room:'后院', awake:true },
        { id:'wait', label:'屋檐下守候', room:'后院', awake:true },
        { id:'qsleep', label:'回柴房歇息', room:'后院', awake:false },
      ]},
      { id:'sun', name:'孙郎中', short:'孙', start:'sroom', tree:[
        { id:'horse', label:'给马看蹄伤', room:'后院', awake:true },
        { id:'back', label:'出诊回来', room:'大堂', awake:true },
        { id:'pulse', label:'给人把脉', room:'大堂', awake:true },
        { id:'sroom', label:'回房配药', room:'地字房', awake:true },
        { id:'brew', label:'去厨房煎药', room:'厨房', awake:true },
        { id:'pill', label:'睡前服补药', room:'地字房', awake:true },
        { id:'ssleep', label:'睡下', room:'地字房', awake:false },
      ]},
      { id:'asi', name:'阿四', short:'四', start:'water1', tree:[
        { id:'sweepy', label:'扫院子', room:'后院', awake:true },
        { id:'chop', label:'劈柴', room:'后院', awake:true },
        { id:'boil', label:'烧水', room:'厨房', awake:true },
        { id:'serve', label:'跑堂', room:'大堂', awake:true },
        { id:'water1', label:'给天字房送热水', room:'天字房', awake:true },
        { id:'water2', label:'给地字房送热水', room:'地字房', awake:true },
        { id:'till', label:'去柜台摸钱', room:'大堂', awake:true },
        { id:'asleep', label:'在厨房睡下', room:'厨房', awake:false },
      ]},
      { id:'tao', name:'陶书生', short:'陶', start:'poem', tree:[
        { id:'lodge', label:'进店投宿', room:'大堂', awake:true },
        { id:'yard', label:'在后院赏雨', room:'后院', awake:true },
        { id:'snack', label:'找小二要夜宵', room:'大堂', awake:true },
        { id:'tread', label:'秉烛夜读', room:'大堂', awake:true },
        { id:'poem', label:'在大堂吟诗', room:'大堂', awake:true },
        { fork:[
          { cond:'若买到了藏宝图', test:w => w.map, path:[
            { id:'dig', label:'去后院挖宝', room:'后院', awake:true,
              does:w => w.map ? false : { label:'去后院挖宝，没有图', text:w.mapTold ? '陶书生在后院转了一圈，想起图是假的，又回去了' : '陶书生在后院转了一圈，不知道该往哪儿挖' } },
            { id:'tsleep1', label:'打地铺睡下', room:'大堂', awake:false },
          ]},
          { cond:'否则', path:[
            { id:'tsleep2', label:'打地铺睡下', room:'大堂', awake:false },
          ]},
        ]},
      ]},
    ],
    rules:[
      // ---------- 下毒、偷东西 ----------
      { id:'liu-poison', who:'柳三娘',
        truth:'柳三娘的任务卡：毒死镖头。她独自在酒窖时，会往给老满留的那壶酒里下毒。老满要是已经喝过酒了，就晚了。',
        clue:{ room:'酒窖', text:'酒窖里有一只酒壶的封口被揭开过，壶嘴上沾着一点白色粉末。' },
        when:c => !c.w.wine && alive(c, 'liu') && c.at('liu', 'cellar') && lonely(c, 'liu') && c.w.poison.man == null && !c.w.manDrank,
        act:c => { c.w.wine = true; } },
      { id:'man-drink', who:'老满', public:true, hideTruth:true, truth:'',
        when:c => alive(c, 'man') && c.at('man', 'mdrink') && !c.w.manDrank,
        act:c => { c.w.manDrank = true; if (c.w.wine) c.w.poison.man = c.t; } },
      { id:'asi-book', who:'阿四',
        truth:'阿四的任务卡：顺手牵羊。他独自在天字房时（没有别人醒着），会偷走白少爷的秘籍。',
        clue:{ room:'天字房', text:'白少爷的书箱被翻过，秘籍不见了。' },
        when:c => alive(c, 'asi') && !c.w.book && c.at('asi', 'water1') && lonely(c, 'asi'),
        act:c => { c.w.book = true; } },
      { id:'asi-box', who:'阿四',
        truth:'阿四独自在地字房时（没有别人醒着），会偷走孙郎中药箱里的人参，往补药瓶里掺上别的东西充数。',
        clue:{ room:'地字房', text:'孙郎中的补药瓶里，药丸的颜色深浅不一。' },
        when:c => alive(c, 'asi') && !c.w.box && c.at('asi', 'water2') && lonely(c, 'asi'),
        act:c => { c.w.box = true; } },
      { id:'sun-pill', who:'孙郎中', public:true, hideTruth:true, truth:'',
        when:c => alive(c, 'sun') && c.at('sun', 'pill') && c.w.box && c.w.poison.sun == null,
        act:c => { c.w.poison.sun = c.t; } },
      { id:'asi-till', who:'阿四',
        truth:'阿四去柜台摸钱时，柜台边要是只有醒着的柳三娘，他会杀了她灭口；要是没人醒着，就偷偷拿走钱匣。',
        clue:{ room:'大堂', text:'柜台上的钱匣不见了。' },
        when:c => alive(c, 'asi') && !c.w.till && c.at('asi', 'till')
          && (lonely(c, 'asi') || (alive(c, 'liu') && c.room('liu') === '大堂' && c.awake('liu') && lonely(c, 'asi', 'liu'))),
        act:c => { c.w.till = true; if (alive(c, 'liu') && c.room('liu') === '大堂' && c.awake('liu')) die(c, 'liu', '大堂', '柳三娘撞见阿四在摸钱匣'); } },
      { id:'tao-map', who:'阿四',
        truth:'陶书生找小二要夜宵时，阿四要是在大堂，会顺手把一张假藏宝图卖给他。',
        clue:{ room:'大堂', text:'阿四收了陶书生一串铜钱，可夜宵钱早就付过了。' },
        when:c => !c.w.map && alive(c, 'asi') && alive(c, 'tao') && c.at('tao', 'snack') && c.awake('asi') && c.room('asi') === '大堂',
        act:c => { c.w.map = true; c.w.mapAt = c.t; } },
      { id:'tao-told', who:'柳三娘 / 孙郎中',
        truth:'柳三娘和孙郎中都知道阿四画假图骗人。买到图以后，陶书生只要和他们当中醒着的人待在一起，就会被告知图是假的，不再去挖宝。',
        clue:c => ({ room:c.room('tao'), text:'陶书生的藏宝图被揉成一团，扔在了桌上。' }),
        when:c => c.w.map && c.t > c.w.mapAt && alive(c, 'tao') && c.awake('tao')
          && ['liu', 'sun'].some(id => alive(c, id) && c.awake(id) && c.room(id) === c.room('tao')),
        act:c => { c.w.map = false; c.w.mapTold = true; } },
      // ---------- 解毒 ----------
      { id:'sun-cure', who:'孙郎中',
        truth:'孙郎中的任务卡：别让任何人毒发身亡。中了毒的人只要跟醒着的孙郎中待在一起，就会被他救回来。',
        when:c => alive(c, 'sun') && c.awake('sun') && Object.keys(c.w.poison).some(id => id !== 'sun' && alive(c, id) && c.room(id) === c.room('sun')),
        act:c => Object.keys(c.w.poison).forEach(id => { if (id !== 'sun' && alive(c, id) && c.room(id) === c.room('sun')) { delete c.w.poison[id]; c.see(c.room('sun'), `孙郎中给${NAME[id]}喂了一颗药丸`); } }) },
      { id:'self-cure', who:'中毒的人',
        truth:'毒发的那个小时，中毒的人要是醒着，就能察觉不对、自己扛过去（老满运功逼毒，孙郎中给自己扎针）。',
        when:c => Object.entries(c.w.poison).some(([id, t]) => alive(c, id) && c.t - t >= ONSET && c.awake(id)),
        act:c => Object.entries(c.w.poison).forEach(([id, t]) => { if (alive(c, id) && c.t - t >= ONSET && c.awake(id)) { delete c.w.poison[id]; c.see(c.room(id), id === 'sun' ? '孙郎中脸色一白，给自己扎了几针' : `${NAME[id]}脸色一白，运功逼出了一口黑血`); } }) },
      { id:'poison-die', who:'毒药', public:true,
        truth:'毒喝下去两个小时后发作；睡着的人扛不过去。',
        when:c => Object.entries(c.w.poison).some(([id, t]) => alive(c, id) && c.t - t >= ONSET),
        act:c => Object.entries(c.w.poison).forEach(([id, t]) => { if (alive(c, id) && c.t - t >= ONSET) die(c, id, c.room(id), `${NAME[id]}在睡梦中再也没有醒来`); }) },
      // ---------- 刀剑 ----------
      { id:'bai-home', who:'白少爷', public:true, hideTruth:true, truth:'',
        when:() => true, act:c => { c.w.baiHome = alive(c, 'bai') && c.room('bai') === '天字房'; } },
      { id:'bai-know', who:'白少爷', public:true, hideTruth:true, truth:'',
        when:c => c.w.book && !c.w.baiKnows && alive(c, 'bai') && c.awake('bai') && c.room('bai') === '天字房',
        act:c => { c.w.baiKnows = true; c.see('天字房', '白少爷发现秘籍不见了'); } },
      { id:'bai-hunt', who:'白少爷',
        truth:'白少爷的任务卡：夺回秘籍。发现秘籍被偷后，他醒着时会去找阿四：阿四身边没有别人醒着，就会被他一剑刺死。',
        when:c => c.w.baiKnows && alive(c, 'bai') && alive(c, 'asi') && c.awake('bai') && lonely(c, 'asi', 'bai'),
        act:c => { const rm = c.room('asi'); leave(c, 'bai', rm, `白少爷提着剑出去了`); if (c.room('bai') !== rm) c.sneak('bai', rm, `白少爷去${rm}找阿四`); die(c, 'asi', rm); } },
      { id:'qin-strike', who:'秦姑娘',
        truth:'秦姑娘的任务卡：刺杀白少爷。00:00 夜深以后，她醒着时只要白少爷身边没有别人醒着，就会摸过去下手；可要是老满醒着守在白少爷身边，死的就是她自己。',
        when:c => c.t >= 2 && alive(c, 'qin') && alive(c, 'bai') && c.awake('qin') && c.room('qin') !== c.room('bai')
          && (lonely(c, 'bai') || (alive(c, 'man') && c.awake('man') && c.room('man') === c.room('bai') && lonely(c, 'bai', 'man'))),
        act:c => {
          const rm = c.room('bai');
          leave(c, 'qin', rm, '一道人影悄悄离开了');
          c.sneak('qin', rm, `秦姑娘摸进了${rm}`);
          if (alive(c, 'man') && c.awake('man') && c.room('man') === rm) die(c, 'qin', rm, '老满一刀挡下了刺客');
          else die(c, 'bai', rm);
        } },
      { id:'man-revenge', who:'老满',
        truth:'老满的任务卡：保护白少爷。少爷死了，醒着的老满会去找刺客报仇：秦姑娘身边没有别人醒着，就会被他杀死。',
        when:c => !alive(c, 'bai') && alive(c, 'man') && alive(c, 'qin') && c.awake('man') && lonely(c, 'qin', 'man'),
        act:c => { const rm = c.room('qin'); leave(c, 'man', rm, `有人提着刀冲向了${rm}`); if (c.room('man') !== rm) c.sneak('man', rm, `老满提着刀去了${rm}`); die(c, 'qin', rm); } },
      { id:'tao-stopped', who:'后院的人', public:true,
        truth:'陶书生拿着图去挖宝时，后院里只要有别人（睡着的也会被吵醒），就会把他拦下来。',
        when:c => c.t >= 2 && alive(c, 'tao') && c.at('tao', 'dig') && c.w.map
          && Object.keys(NAME).some(id => id !== 'tao' && alive(c, id) && c.room(id) === '后院'),
        act:c => { const who = Object.keys(NAME).filter(id => id !== 'tao' && alive(c, id) && c.room(id) === '后院'); c.see('后院', `${who.map(x => NAME[x]).join('、')}把往井里探身的陶书生拉了回来`); } },
      { id:'tao-well', who:'陶书生',
        truth:'陶书生的任务卡：活到天亮。拿着假藏宝图去后院挖宝时，夜深（00:00 以后）看不清井口，后院里又没有别人（睡着的人也会被他挖土的动静吵醒，拉住他），他会掉进枯井。',
        when:c => c.t >= 2 && alive(c, 'tao') && c.at('tao', 'dig') && c.w.map
          && !Object.keys(NAME).some(id => id !== 'tao' && alive(c, id) && c.room(id) === '后院'),
        act:c => die(c, 'tao', '后院', '陶书生照着图往枯井里探身，一脚踩空') },
    ],
    ending:w => {
      const left = Object.keys(NAME).filter(id => !w.dead[id]);
      return left.length ? { ok:false, dead:w.dead, text:'04:00，设备烧毁。' + left.map(x => NAME[x]).join('、') + '还困在游戏里。' }
        : { ok:true, dead:w.dead, text:'04:00 之前，七个人都在游戏里死了一次，平安醒了过来。' };
    },
  });
})();
