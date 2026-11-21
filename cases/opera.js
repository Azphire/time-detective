/* =========================================================
   第六案 · 封箱
   戏班唱完封箱戏，全班留在园子里守岁。班主把台柱青衣许给贝勒爷做妾，贝勒府的护卫今夜带着彩礼来，天亮接人。
   这一案的新东西是「消息」：一句话在人和人之间传开，有人听了改主意，有人听了想不开。
     · 身世：老琴师 → 青衣（两人独处；他得「下了决心」，而且今晚没沾过酒）→ 青衣翻转，不再杀班主
     · 她知道了：青衣（翻转后）当面告诉班主 → 班主不再灭口，去厢房向醒着的护卫退亲
     · 谣言「她是自愿的」：护卫见到武生就炫耀；班主让学徒四处去说。武生先听到它，青衣不在身边就会上吊
     · 真话「我不愿意」：青衣和武生独处时说。武生先听到它，就不会上吊，但会趁护卫睡着去杀他
     · 查账：班主对账时当众嚷出来。账房没拿彩礼补上亏空的话，会杀睡着的班主，或者午夜后一个人时上吊
     · 03:00 轿子到门口：班主还没退亲的话，青衣一个人时会悬梁
   凶手：班主→老琴师、青衣→班主（两面派）、账房→班主、武生→护卫；会自尽的：武生、账房、青衣。
   唯一解：班主·训斥琴师、青衣·天井赏雪、武生·练功、老琴师·下了决心（分支）、账房·账房记账、学徒·收拾戏服。
   ========================================================= */
(function () {
  const HOURS = ['21:00','22:00','23:00','00:00','01:00','02:00','03:00','04:00'];
  const NAME = { boss:'班主', qing:'青衣', wu:'武生', adj:'护卫', qin:'老琴师', acct:'账房', boy:'学徒' };
  const alive = (c, id) => !c.w.dead[id];
  const up = (c, id) => alive(c, id) && c.awake(id);
  // 这个人所在的房间里，除了 ids 之外还有没有别人醒着
  const lonely = (c, id, ...ids) => c.awakeIn(c.room(id), id).filter(x => !ids.includes(x) && alive(c, x)).length === 0;
  // 两个人醒着待在同一个房间，屋里没有第三个醒着的人
  const pair = (c, a, b) => up(c, a) && up(c, b) && c.room(a) === c.room(b) && lonely(c, a, b);
  const die = (c, id, room, text) => {
    c.w.dead[id] = c.hour;
    c.see(room, `${NAME[id]}死亡`, true);
    if (text) c.see(room, text);
  };
  const deaths = r => r.end.ok || !r.end.key ? [] : String(r.end.key).split(',');
  const CASE = {
    id:'opera', tab:'第六案', title:'封箱',
    brief:'封箱戏散了，锣鼓声停了。班主把台柱青衣许给贝勒爷做妾，贝勒府的护卫今夜带着彩礼来，天一亮就接人。按照原本的安排，天还没亮，戏台的横梁上就吊着一个人。这一夜，戏班里每个人都有不能说的话。护卫的明线无法调整。',
    goal:'天亮前谁都不能死',
    achievements:[
      { open:true, id:'plan', name:'原计划', desc:'一处不改，照原本的安排推演一次。', test:x => x.initial },
      { open:true, id:'nohint', name:'无需提示', desc:'一条提示都没看就破了案。', test:x => x.r.end.ok && x.s.hintsOpen <= x.cs.hints.filter(h => h.free).length },
      { open:true, id:'fast', name:'十步之内', desc:'十次推演之内破了案。', test:x => x.r.end.ok && x.s.runs.length <= 10 },
      { open:true, id:'all', name:'新春快乐', desc:'这一夜谁都没有死。', test:x => x.r.end.ok },
      { id:'bawang', name:'不嫁！打死我都不嫁！', desc:'青衣宁死也不上轿。', test:x => x.fired.has('qing-hang') },
      { id:'ledger', name:'当财务哪有不疯的', desc:'账房没熬过查账这一关。', test:x => x.fired.has('acct-hang') || x.fired.has('acct-kill') },
      { id:'stress', name:'欸，不吃压力', desc:'班主来训斥老琴师的时候，老琴师正在喝酒，或者已经醉倒了。',
        test:x => x.r.hours.some(h => !h.cut && h.pos.boss.node === 'scold' && ['drinkq', 'more', 'passout'].includes(h.pos.qin.node)) },
      { id:'reaper', name:'生死簿编辑', desc:'能死的人，都在推演里死过一次。',
        test:x => ['boss', 'qing', 'wu', 'adj', 'qin', 'acct'].every(id => x.s.runs.some(run => deaths(run.r).includes(id))) },
      { id:'allpaths', name:'人生真是丰富多彩啊', desc:'所有人的支线都解锁了。',
        test:x => x.cs.chars.every(c => c.order.every(n => x.s.revealed.has(n.id))) },
      // 能死的有六个人，可同一次推演里最多只能死四个（出事的那个小时一过，这一夜就停了）
      { id:'curtain', name:'都死了算了', desc:'一次推演里死了四个人，一夜最多也就能死这么多了。', test:x => deaths(x.r).length >= 4 },
      { id:'bonus', name:'老板大气', desc:'账房从发红包开始。', test:x => x.s.starts.acct === 'redenv' },
      { id:'where', name:'人呢？', desc:'学徒来给护卫添茶，护卫却不在厢房。',
        test:x => x.r.hours.some(h => !h.cut && h.pos.boy.node === 'tea' && h.real.adj.room !== '厢房') },
      { id:'sleep', name:'事已至此先睡觉吧', desc:'能睡觉的人都从睡觉开始。',
        // 明线上有睡着格子的人（护卫无法调整，不算），起点全部选在睡着的格子上
        test:x => x.cs.chars.filter(c => !c.fixed && c.order.some(n => !n.awake)).every(c => !c.nodes[x.s.starts[c.id]].awake) },
      { id:'sys', name:'这里有个提词器', desc:'推演了 10 次，第一条提示自动揭开了。', test:x => x.s.runs.length >= 10 },
      { id:'addict', name:'总得有个头吧？', desc:'推演了 100 次。', test:x => x.s.runs.length >= 100 },
    ],
    hints:[
      { free:true, autoAt:10,
        text:'这一夜，一句话就能改变一个人。有人听了会放下刀，有人听了会想不开——同一个人先听到哪一句，就信哪一句。（推演满十次后自动揭开；揭开这一条不影响「无需提示」成就。）' },
      '想杀人的不止一个，想寻短见的也不止一个。这一夜谁死了都算失败。',
      '老琴师知道一个秘密，只肯说给青衣一个人听。可他今晚要是沾了酒，说的话就没人信了。',
      '知道了身世的青衣，不会再对班主下手。班主当面听她说「我都知道了」，也就不必再灭谁的口，还会去退了这门亲。',
      '轿子 03:00 就到门口。到那时还没退亲，青衣宁死也不上轿。',
      '护卫见到武生就会炫耀；学徒被班主叫去以后，嘴也不严。',
      '听过真话的武生会去找护卫。护卫醒着时腰里挂着刀，睡着时就得有人守着。',
      '账上的窟窿，班主一对账就会嚷出来。彩礼只有在护卫醒着时，才交得到账房手上。',
    ],
    hours:HOURS,
    rooms:['戏台','后台','书房','账房','天井','厢房'],
    scene:['天亮接人','护卫的明线无法调整'],
    world:() => ({ dead:{}, scolded:false, qingKnows:false, bossKnows:false, boyRumor:false,
      wuFirst:null, acctAudit:false, paid:false, soup:null }),
    items:w => [
      ...(w.paid ? [] : [{ room:'厢房', text:'彩礼' }]),
      ...(w.soupReady ? [{ room:'书房', text:'参汤' }] : []),
    ],
    chars:[
      { id:'adj', name:'护卫', short:'护', fixed:true, start:'arrive', tree:[
        { id:'arrive', label:'在天井候着', room:'天井', awake:true },
        { id:'teaf', label:'厢房喝茶', room:'厢房', awake:true },
        { id:'watchf', label:'戏台看收拾', room:'戏台', awake:true },
        { id:'wine', label:'厢房喝酒', room:'厢房', awake:true },
        { id:'nap', label:'厢房打盹', room:'厢房', awake:false },
        { id:'smoke', label:'天井赏月', room:'天井', awake:true },
        { id:'dawn', label:'厢房等天亮', room:'厢房', awake:true },
      ]},
      { id:'boss', name:'班主', short:'主', start:'see', tree:[
        { id:'see', label:'送客', room:'戏台', awake:true },
        { id:'ancestor', label:'拜祖师爷', room:'后台', awake:true },
        { id:'toast', label:'给护卫敬酒', room:'厢房', awake:true },
        { id:'scold', label:'训斥琴师', room:'天井', awake:true },
        { id:'order', label:'吩咐学徒', room:'书房', awake:true },
        { id:'books', label:'书房对账', room:'书房', awake:true },
        { fork:[
          { cond:'若他知道青衣已经知道了身世', test:w => w.bossKnows, path:[
            { id:'refuse', label:'去厢房退亲', room:'厢房', awake:true },
            { id:'brest', label:'回书房安睡', room:'书房', awake:false },
          ]},
          { cond:'否则', path:[
            { id:'hunt', label:'去天井找琴师', room:'天井', awake:true },
            { id:'bsleep', label:'书房睡下', room:'书房', awake:false },
          ]},
        ]},
      ]},
      { id:'qing', name:'青衣', short:'青', start:'qbow', tree:[
        { id:'qbow', label:'谢幕', room:'戏台', awake:true },
        { id:'flowers', label:'收花篮', room:'戏台', awake:true },
        { id:'makeup', label:'卸妆', room:'后台', awake:true },
        { id:'incense', label:'给祖师爷上香', room:'后台', awake:true },
        { id:'yard', label:'天井赏雪', room:'天井', awake:true },
        { id:'qwait', label:'后台候着', room:'后台', awake:true },
        { fork:[
          { cond:'若她从老琴师口中知道了身世', test:w => w.qingKnows, path:[
            { id:'father', label:'去书房认父', room:'书房', awake:true },
            { id:'findwu', label:'去后台找武生', room:'后台', awake:true },
            { id:'qguard', label:'守在书房', room:'书房', awake:true },
          ]},
          { cond:'否则', path:[
            { id:'stew', label:'炖参汤', room:'后台', awake:true },
            { id:'deliver', label:'去书房送参汤', room:'书房', awake:true },
            { id:'qlie', label:'在书房等班主', room:'书房', awake:true },
          ]},
        ]},
      ]},
      { id:'wu', name:'武生', short:'武', start:'bow', tree:[
        { id:'bow', label:'谢幕', room:'戏台', awake:true },
        { id:'armor', label:'卸靠', room:'后台', awake:true },
        { id:'drill', label:'练功', room:'戏台', awake:true },
        { id:'knife', label:'擦刀', room:'戏台', awake:true },
        { id:'wdrink', label:'天井喝酒', room:'天井', awake:true },
        { fork:[
          { cond:'若他先听到的是「她是自愿的」', test:w => w.wuFirst === 'rumor', path:[
            { id:'stage', label:'独坐戏台', room:'戏台', awake:true },
            { id:'beam', label:'望着戏台的横梁', room:'戏台', awake:true },
          ]},
          { cond:'若他先听到青衣亲口说「我不愿意」', test:w => w.wuFirst === 'truth', path:[
            { id:'lurk', label:'去厢房外候着', room:'天井', awake:true },
            { id:'wwatch', label:'天井守夜', room:'天井', awake:true },
          ]},
          { cond:'否则', path:[
            { id:'sulk', label:'喝闷酒', room:'后台', awake:true },
            { id:'confront', label:'去厢房找护卫', room:'厢房', awake:true },
          ]},
        ]},
      ]},
      { id:'qin', name:'老琴师', short:'琴', start:'tune', tree:[
        { id:'tune', label:'调弦', room:'后台', awake:true },
        { id:'play', label:'戏台拉琴', room:'戏台', awake:true },
        { id:'drinkq', label:'天井喝酒', room:'天井', awake:true },
        { fork:[
          { cond:'若班主训斥过他', test:w => w.scolded, path:[
            { id:'resolve', label:'下了决心', room:'后台', awake:true },
            { id:'waitq', label:'后台等青衣', room:'后台', awake:true },
            { id:'qinsleep', label:'后台睡下', room:'后台', awake:false },
          ]},
          { cond:'否则', path:[
            { id:'more', label:'接着喝', room:'天井', awake:true },
            { id:'passout', label:'醉倒在天井', room:'天井', awake:false },
          ]},
        ]},
      ]},
      { id:'acct', name:'账房', short:'账', start:'aseal', tree:[
        { id:'aseal', label:'给箱子贴封条', room:'后台', awake:true },
        { id:'tally', label:'封箱盘账', room:'账房', awake:true },
        { id:'redenv', label:'给大家发红包', room:'后台', awake:true },
        { id:'ledger', label:'账房记账', room:'账房', awake:true },
        { id:'count', label:'去厢房清点彩礼', room:'厢房', awake:true },
        { id:'aback', label:'回账房守岁', room:'账房', awake:true },
      ]},
      { id:'boy', name:'学徒', short:'徒', start:'boil', tree:[
        { id:'boil', label:'烧开水', room:'后台', awake:true },
        { id:'lamp', label:'挂灯笼', room:'戏台', awake:true },
        { id:'clothes', label:'收拾戏服', room:'后台', awake:true },
        { id:'sweep', label:'扫戏台', room:'戏台', awake:true },
        { id:'listen', label:'去书房听吩咐', room:'书房', awake:true },
        { id:'msg', label:'去账房传话', room:'账房', awake:true },
        { id:'tea', label:'给护卫添茶', room:'厢房', awake:true },
        { id:'ysnow', label:'天井扫雪', room:'天井', awake:true },
        { id:'yfire', label:'后台烤火', room:'后台', awake:true },
        { id:'ysleep', label:'后台睡下', room:'后台', awake:false },
      ]},
    ],
    rules:[
      // ---------- 消息 ----------
      { id:'scold', who:'班主',
        truth:'班主怕老琴师酒后乱说，在天井撞见醒着的老琴师，就会训斥他一顿。老琴师憋了二十年的话，反倒因此下了决心要说出来。',
        when:c => !c.w.scolded && c.at('boss', 'scold') && c.room('qin') === '天井' && up(c, 'qin'),
        act:c => { c.w.scolded = true; c.see('天井', '天井里传来班主压低嗓子的呵斥声'); } },
      { id:'qin-drink', who:'老琴师', public:true, hideTruth:true, truth:'',
        when:c => c.atAny('qin', ['drinkq', 'more', 'passout']),
        act:c => { c.w.qinDrank = true; } },
      { id:'tell-blood', who:'老琴师',
        truth:'老琴师知道青衣的身世：班主是她的生父，她母亲的死另有其人。他下了决心以后（「下了决心」「后台等青衣」这两格），只要和青衣独处，就会把一切告诉她。可他今晚要是沾过酒，说出来的话青衣只当是醉话，不会信。',
        when:c => !c.w.qingKnows && !c.w.qinDrank && c.atAny('qin', ['resolve', 'waitq']) && pair(c, 'qin', 'qing'),
        act:c => { c.w.qingKnows = true; c.see(c.room('qing'), `${c.room('qing')}里有人低声说了很久的话，后来传出一阵压抑的哭声`); } },
      { id:'tell-father', who:'青衣',
        truth:'知道了身世的青衣，见到醒着的班主，会当面告诉他：她都知道了。',
        when:c => c.w.qingKnows && !c.w.bossKnows && up(c, 'qing') && up(c, 'boss') && c.room('qing') === c.room('boss'),
        act:c => { c.w.bossKnows = true; c.see(c.room('boss'), `${c.room('boss')}里，班主和青衣对坐着，谁也没有说话`); } },
      { id:'order-boy', who:'班主',
        truth:'班主一到书房，就把学徒叫来交代：四处说一句「青衣是自愿跟贝勒爷走的」，好让武生死心。',
        when:c => !c.w.boyRumor && c.at('boss', 'order') && up(c, 'boss') && up(c, 'boy'),
        act:c => { c.w.boyRumor = true; if (c.room('boy') !== '书房') c.sneak('boy', '书房', '学徒被班主叫到了书房'); c.see('书房', '班主把学徒叫进书房，压低嗓子交代了几句'); } },
      { id:'truth-wu', who:'青衣',
        truth:'青衣和武生独处时，会亲口告诉他：她不愿意走。武生要是先听到这句，就再也不会信别的说法，但也铁了心要杀护卫。',
        when:c => !c.w.wuFirst && pair(c, 'qing', 'wu'),
        act:c => { c.w.wuFirst = 'truth'; c.see(c.room('wu'), `${c.room('wu')}里，青衣拉着武生说了好一会儿话`); } },
      { id:'boast', who:'护卫',
        truth:'护卫醒着时见到武生，会得意地说一句「姑娘是自愿的」。',
        when:c => !c.w.wuFirst && up(c, 'adj') && up(c, 'wu') && c.room('adj') === c.room('wu'),
        act:c => { c.w.wuFirst = 'rumor'; c.see(c.room('wu'), `${c.room('wu')}里，护卫大笑着说了句什么，武生的脸一下子白了`); } },
      { id:'refuse', who:'班主',
        truth:'知道青衣已经知道了身世的班主，去厢房找醒着的护卫退亲：彩礼退回去，人不嫁了。',
        when:c => !c.w.refused && c.w.bossKnows && c.at('boss', 'refuse') && up(c, 'adj') && c.room('adj') === '厢房',
        act:c => { c.w.refused = true; c.see('厢房', '厢房里，班主朝护卫深深作了个揖，护卫摔了茶碗'); } },
      { id:'boy-wu', who:'学徒',
        truth:'学徒藏不住话。他听过班主的吩咐以后，见到武生就会把「青衣是自愿的」说给他听。',
        when:c => !c.w.wuFirst && c.w.boyRumor && up(c, 'boy') && up(c, 'wu') && c.room('boy') === c.room('wu'),
        act:c => { c.w.wuFirst = 'rumor'; c.see(c.room('wu'), `${c.room('wu')}里，学徒凑到武生耳边嘀咕了一句，武生一拳砸在柱子上`); } },
      { id:'books-audit', who:'班主',
        truth:'班主在书房对账时发现账上有个大窟窿，当场嚷出来：天亮查账。这话一夜之间就传遍了园子。',
        when:c => !c.w.acctAudit && c.at('boss', 'books') && up(c, 'boss'),
        act:c => { c.w.acctAudit = true; c.see('书房', '书房里传出班主的吼声：天一亮就查账！'); } },
      { id:'paid', who:'账房',
        truth:'账房去厢房清点彩礼时，护卫要是醒着，会把彩礼交给他。账房趁机拿出一部分补上了自己的亏空，从此不怕查账了。',
        when:c => !c.w.paid && c.at('acct', 'count') && up(c, 'adj') && c.room('adj') === '厢房',
        act:c => { c.w.paid = true; c.see('厢房', '厢房里，护卫把一只沉甸甸的木箱推给了账房'); } },
      // ---------- 杀人和自尽 ----------
      { id:'soup', who:'青衣',
        truth:'不知道身世的青衣，会把下了毒的参汤送到书房，搁在班主的书桌上。',
        when:c => !c.w.qingKnows && !c.w.soupReady && c.w.soup == null && c.at('qing', 'deliver') && up(c, 'qing'),
        act:c => { c.w.soupReady = true; c.see('书房', '书房的桌上多了一碗参汤，还冒着热气'); } },
      { id:'sip', who:'班主', public:true, hideTruth:true, truth:'',
        when:c => c.w.soupReady && alive(c, 'boss') && c.room('boss') === '书房',
        act:c => { c.w.soupReady = false; c.w.soup = c.t; } },
      { id:'soup-die', who:'青衣', bad:true,
        truth:'班主一回书房就会喝掉桌上的参汤（睡前也要喝）。汤里的毒，喝下的下一个小时发作。',
        clue:c => ({ room:c.room('boss'), text:'班主手边的参汤碗里，沉着一层黑色的药渣。' }),
        when:c => c.w.soup != null && c.t > c.w.soup && alive(c, 'boss'),
        act:c => die(c, 'boss', c.room('boss')) },
      { id:'qing-stab', who:'青衣', bad:true,
        truth:'不知道身世的青衣还有第二个办法：班主睡着时，身边要是没有别人醒着，她自己也没被人盯着，就会摸过去下手。',
        clue:c => ({ room:c.room('boss'), text:'班主枕边落着一枚青衣头面上的银簪。' }),
        when:c => !c.w.qingKnows && alive(c, 'boss') && up(c, 'qing') && !c.awake('boss')
          && lonely(c, 'boss', 'qing') && (c.room('qing') === c.room('boss') || lonely(c, 'qing')),
        act:c => { const rm = c.room('boss'); if (c.room('qing') !== rm) c.sneak('qing', rm, `青衣来到${rm}`, true); die(c, 'boss', rm); } },
      { id:'acct-kill', who:'账房', bad:true,
        truth:'听说天亮要查账、亏空又没补上的账房，想一了百了：班主睡着时，身边要是没有别人醒着，他自己也没被人盯着，就会摸过去捂死他。',
        clue:c => ({ room:c.room('boss'), text:'班主的枕头上，沾着一点账房常用的朱砂印泥。' }),
        when:c => c.w.acctAudit && !c.w.paid && alive(c, 'boss') && !c.awake('boss') && up(c, 'acct')
          && lonely(c, 'boss', 'acct') && (c.room('acct') === c.room('boss') || lonely(c, 'acct')),
        act:c => { const rm = c.room('boss'); if (c.room('acct') !== rm) c.sneak('acct', rm, `账房来到${rm}`, true); die(c, 'boss', rm); } },
      { id:'acct-hang', who:'账房', bad:true,
        truth:'听说天亮要查账、亏空又没补上的账房，过了午夜要是一个人待着（身边没有别人醒着），就会想不开。',
        clue:{ room:'账房', text:'账房的桌上摊着一本账簿，最后一页写着「无颜见班主」。' },
        when:c => c.t >= 3 && c.w.acctAudit && !c.w.paid && up(c, 'acct') && lonely(c, 'acct'),
        act:c => die(c, 'acct', c.room('acct')) },
      { id:'boss-kill', who:'班主', bad:true,
        truth:'班主要让老琴师永远闭嘴，只等他睡着就下手。学徒和账房是下人，班主一句话就能把他们打发走，拦不住他；别人醒着在旁边（不管是在老琴师身边，还是在班主自己身边），他就不敢。他要是知道青衣已经知道了，灭口就没有意义了。',
        clue:c => ({ room:c.room('qin'), text:`${c.room('qin')}里，老琴师的胡琴断了一根弦。` }),
        when:c => !c.w.bossKnows && alive(c, 'qin') && !c.awake('qin') && up(c, 'boss')
          && lonely(c, 'qin', 'boss', 'boy', 'acct') && (c.room('boss') === c.room('qin') || lonely(c, 'boss', 'boy', 'acct')),
        act:c => { const rm = c.room('qin'); if (c.room('boss') !== rm) c.sneak('boss', rm, `班主来到${rm}`, true); die(c, 'qin', rm); } },
      { id:'wu-hang', who:'武生', bad:true,
        truth:'先听到「她是自愿的」的武生，心灰意冷。除了青衣，谁也劝不住他：只要青衣不在身边，他就会去戏台，在横梁上吊。',
        clue:{ room:'戏台', text:'戏台的横梁上，搭着一条武生的大带。' },
        when:c => c.w.wuFirst === 'rumor' && up(c, 'wu') && !(up(c, 'qing') && c.room('qing') === c.room('wu')),
        act:c => { const rm = c.room('wu'); if (rm !== '戏台') c.sneak('wu', '戏台', '武生一个人去了戏台', true); die(c, 'wu', '戏台'); } },
      { id:'qing-hang', who:'青衣', bad:true,
        truth:'03:00 以后，贝勒府的轿子到了门口。班主要是还没退亲，青衣宁死也不上轿：身边没有别人醒着时，她会用水袖悬梁。',
        clue:c => ({ room:c.room('qing'), text:`${c.room('qing')}的梁上，垂着一截雪白的水袖。` }),
        when:c => c.t >= 6 && !c.w.refused && up(c, 'qing') && lonely(c, 'qing'),
        act:c => die(c, 'qing', c.room('qing')) },
      { id:'wu-hunt', who:'武生 / 护卫', bad:true,
        truth:'先听到青衣亲口说「我不愿意」的武生，铁了心要杀护卫。护卫醒着时腰里挂着刀，武生不敢近身；护卫一睡着，只要身边没有别人醒着、武生自己也没被人盯着，他就会摸过去下手。',
        clue:c => ({ room:c.room('adj'), text:`${c.room('adj')}的门槛上，有一道刀鞘刮出的白印。` }),
        when:c => c.w.wuFirst === 'truth' && up(c, 'wu') && alive(c, 'adj') && !c.awake('adj') && lonely(c, 'adj', 'wu')
          && (c.room('wu') === c.room('adj') || lonely(c, 'wu')),
        act:c => { const rm = c.room('adj'); if (c.room('wu') !== rm) c.sneak('wu', rm, `武生来到${rm}`, true); die(c, 'adj', rm); } },
    ],
    ending:w => {
      const d = Object.keys(w.dead);
      return d.length ? { ok:false, key:d.join(','), text:'天亮前，' + d.map(x => NAME[x]).join('、') + '死了。' }
        : { ok:true, text:'天亮了，园子里响起开箱的锣鼓。这一夜谁都没有死。' };
    },
  };
  registerCase(CASE);
})();
