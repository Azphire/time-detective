/* =========================================================
   第五案 · 加冕前夜
   西幻王宫，女王天亮加冕。今夜有三个人起了杀心，目标各不相同：
     · 宫廷法师 → 女王（时之沙漏：下一个小时转动，回到这一个小时，同一个小时里出现在两个地方）
     · 圣女 → 大祭司（权力之争：圣杯下毒，或趁他睡着下手）
     · 公爵 → 王子（侍卫长是同谋：替他开门、支开旁人、作假证）
   会魔法的人（大祭司、圣女、法师）能感应到近处有人动用沙漏，
   所以法师转动沙漏的那个小时，身边有醒着的大祭司或圣女，他就不敢用。
   ========================================================= */
(function () {
  const HOURS = ['22:00','23:00','00:00','01:00','02:00','03:00'];
  const NAME = { queen:'女王', priest:'大祭司', prince:'王子', mage:'宫廷法师', duke:'公爵', guard:'侍卫长', saint:'圣女' };
  const alive = (c, id) => !c.w.dead[id];
  // 这个人所在的房间里，除了 ids 之外还有没有别人醒着
  const lonely = (c, id, ...ids) => c.awakeIn(c.room(id), id).filter(x => !ids.includes(x)).length === 0;
  const die = (c, id, room, text) => {
    c.w.dead[id] = c.hour;
    c.see(room, `${NAME[id]}死亡`, true);
    if (text) c.see(room, text);
  };
  // 下一个小时某人会在明线的哪一格（和引擎的 advance 一样：分叉按这个小时结束时的世界状态选路）
  const step = (n, w) => !n.next ? n : n.next.node ? n.next.node : n.next.fork.find(b => !b.test || b.test(w)).path[0];
  const nextNode = (c, id) => step(CASE.chars.find(x => x.id === id).order.find(m => c.at(id, m.id)), c.w);
  // 法师转动沙漏的那个小时（也就是下一个小时），身边有没有醒着的大祭司或圣女
  const sensedBy = c => {
    const m = nextNode(c, 'mage');
    return ['priest', 'saint'].filter(id => alive(c, id) && nextNode(c, id).awake && nextNode(c, id).room === m.room);
  };
  // 00:00–02:00，女王身边没有别人醒着（法师本人在场也算有人）。03:00 落单不要紧：沙漏得在下一个小时转动，天一亮就来不及了
  // 守在门口的侍卫长在门外，拦不住凭空出现在屋里的刺客，不算陪着
  const queenAlone = c => c.t >= 2 && c.t < HOURS.length - 1 && !c.w.glass && alive(c, 'queen')
    && c.awakeIn(c.room('queen'), 'queen').filter(x => !(x === 'guard' && c.at('guard', 'qdoor')))
      // 祈祷、散步时女王屏退左右：圣堂里只有大祭司算陪着她，花园里谁都不算
      .filter(x => c.w.charmed || (!c.at('queen', 'stroll') && (!c.at('queen', 'pray') || x === 'priest'))).length === 0;
  // 王子身边有没有能护住他的人：侍卫长和公爵不算；侍卫长醒着在场时，还会把法师、圣女支开
  const princeOpen = c => {
    const near = c.awakeIn(c.room('prince'), 'prince').filter(x => x !== 'guard' && x !== 'duke');
    const guardHere = c.room('guard') === c.room('prince') && c.awake('guard');
    return near.filter(x => !(guardHere && (x === 'mage' || x === 'saint'))).length === 0;
  };
  // 公爵能不能脱身：身边没有别人醒着盯着他。侍卫长醒着在场时会拉住法师、圣女说话替他打掩护；女王、大祭司、王子他拦不住
  const dukeFree = c => {
    const near = c.awakeIn(c.room('duke'), 'duke').filter(x => x !== 'guard');
    const guardHere = c.room('guard') === c.room('duke') && c.awake('guard');
    return near.filter(x => !(guardHere && (x === 'mage' || x === 'saint'))).length === 0;
  };
  // 一次推演里死了谁（结局的 key 是死者 id，用逗号隔开）
  const deaths = r => r.end.ok || !r.end.key ? [] : String(r.end.key).split(',');
  const CASE = {
    id:'crown', tab:'第五案', title:'加冕前夜',
    brief:'老国王已去世。天亮之后，年轻的女王将会加冕。按照原本的安排，新女王死在了加冕前夜。皇宫中还有其他命案在酝酿，无论是谁死在这一夜，都会令加冕礼蒙上血色。女王的明线无法调整。',
    goal:'这一夜谁都不能死',
    achievements:[
      { open:true, id:'plan', name:'原计划', desc:'一处不改，照原本的安排推演一次。', test:x => x.initial },
      { open:true, id:'nohint', name:'无需提示', desc:'一条提示都没看就破了案。', test:x => x.r.end.ok && x.s.hintsOpen <= x.cs.hints.filter(h => h.free).length },
      { open:true, id:'fast', name:'十步之内', desc:'十次推演之内破了案。', test:x => x.r.end.ok && x.s.runs.length <= 10 },
      { open:true, id:'all', name:'天佑女王', desc:'这一夜谁都没有死。', test:x => x.r.end.ok },
      { id:'held', name:'谁在用魔法？', desc:'有人想转动沙漏，却察觉身边有会魔法的人。', test:x => x.fired.has('mage-held') },
      { id:'sand', name:'闹鬼了？', desc:'女王死在了一个“没有人”去过的房间。', test:x => x.fired.has('mage-kill') },
      { id:'backstab', name:'还有卸磨杀驴这回事？', desc:'侍卫长被公爵灭了口。', test:x => x.fired.has('guard-kill') },
      { id:'duo', name:'欺人太甚！', desc:'公爵和侍卫长联手对付醒着的王子。', test:x => x.fired.has('duo-kill') },
      { id:'floor', name:'宴会厅的地板好凉', desc:'醉倒的王子没人管，在宴会厅睡到了天亮。', test:x => x.r.hours.some(h => !h.cut && h.pos.prince.node === 'floor') },
      { id:'prince-all', name:'年轻人睡眠质量就是好', desc:'解锁王子的全部支线。',
        test:x => x.cs.chars.find(c => c.id === 'prince').order.every(n => x.s.revealed.has(n.id)) },
      { id:'bloodbath', name:'血流成河', desc:'能死的人，都在推演里死过一次。',
        test:x => ['queen', 'priest', 'prince', 'guard'].every(id => x.s.runs.some(run => deaths(run.r).includes(id))) },
      { id:'double', name:'双杀！', desc:'一次推演里死了两个人。', test:x => deaths(x.r).length >= 2 },
      { id:'triple', name:'三杀！', desc:'一次推演里死了三个人。', test:x => deaths(x.r).length >= 3 },
      { id:'quad', name:'杀穿了！', desc:'一次推演里，能死的四个人一起死了。', test:x => deaths(x.r).length >= 4 },
      { id:'misplaced', name:'终究是错付了', desc:'侍卫长守在王子寝殿门口，王子却不在寝殿里。',
        test:x => x.r.hours.some(h => !h.cut && h.pos.guard.node === 'pdoor' && h.real.prince.room !== '王子寝殿') },
      { id:'snore', name:'众爱卿为何一言不发？', desc:'有机会睡觉的人从一开始就全体睡觉。',
        // 明线上有睡着格子的人（女王无法调整，不算；公爵、圣女没有睡着的格子，不算），起点全部选在睡着的格子上
        test:x => x.cs.chars.filter(c => !c.fixed && c.order.some(n => !n.awake)).every(c => !c.nodes[x.s.starts[c.id]].awake) },
      { id:'sys', name:'有个人尽皆知的秘密', desc:'推演了 10 次，第一条提示自动揭开了。', test:x => x.s.runs.length >= 10 },
      { id:'addict', name:'彩排还没结束吗？', desc:'推演了 100 次。', test:x => x.s.runs.length >= 100 },
    ],
    hints:[
      { free:true, autoAt:10,
        text:'传说宫里藏着一件时之沙漏，转动它的人会回到一小时前——于是同一个小时里，他会出现在两个地方。它在谁手里，没有人知道。只有会魔法的人（大祭司、圣女和宫廷法师）能感应到近处有人动用了它。（推演满十次后自动揭开；揭开这一条不影响「无需提示」成就。）' },
      '想杀人的不止一个，每个人只盯着自己的目标。可这一夜谁死了都算失败——凶手和同谋也一样。',
      '女王祈祷时只让大祭司陪着，散步时谁都不让跟；守在门外的侍卫，挡不住凭空出现在屋里的人。',
      '公爵只敢对睡着的人下手，而且得脱得开身。侍卫长是他的同谋：同谋的话不能全信，同谋在场时也拦不住他，还会替他把人支开。',
      '侍卫长早就把王子寝殿的钥匙交了出去。东西到手以后，他对公爵就没用了。',
      '圣女起杀心的契机不止一个：被当面驳回、听见别人接任、被人挑拨。她一旦起了杀心，大祭司睡着时就危险了。',
      '让王子醉倒未必是坏事——要紧的是谁把他扶回去，回去以后又有谁在。',
    ],
    hours:HOURS,
    rooms:['女王寝宫','圣堂','宴会厅','王子寝殿','观星塔','花园'],
    scene:['天亮加冕','女王的明线无法调整'],
    world:() => ({ dead:{}, potion:false, tipsy:false, carry:false, rebuked:false, cup:false, drunk:false, poison:null, glass:false, met:false }),
    items:w => [
      { room:'圣堂', text:'圣杯' },
    ],
    chars:[
      { id:'queen', name:'女王', short:'女', fixed:true, start:'envoy', tree:[
        { id:'envoy', label:'接见使节', room:'宴会厅', awake:true },
        { id:'gown', label:'试穿加冕礼服', room:'女王寝宫', awake:true },
        { id:'pray', label:'圣堂祈祷', room:'圣堂', awake:true },
        { id:'stroll', label:'花园散步', room:'花园', awake:true },
        { id:'qsleep', label:'回寝宫睡下', room:'女王寝宫', awake:false },
      ]},
      { id:'priest', name:'大祭司', short:'祭', start:'polish', tree:[
        { id:'polish', label:'擦拭圣器', room:'圣堂', awake:true },
        { id:'crown', label:'为王冠祝圣', room:'圣堂', awake:true },
        { id:'bless', label:'去宴会厅赐福', room:'宴会厅', awake:true },
        { id:'mass', label:'主持圣餐', room:'圣堂', awake:true },
        { id:'omen', label:'去观星塔问吉时', room:'观星塔', awake:true },
        { id:'pblz', label:'为王子祈福', room:'王子寝殿', awake:true },
        { id:'psleep', label:'回房睡下', room:'圣堂', awake:false },
      ]},
      { id:'prince', name:'王子', short:'子', start:'sword', tree:[
        { id:'sword', label:'花园练剑', room:'花园', awake:true },
        { id:'zdrink', label:'宴会厅饮酒', room:'宴会厅', awake:true },
        { fork:[
          { cond:'若公爵陪他喝了酒', test:w => w.tipsy, path:[
            { id:'drunk', label:'醉倒在宴会厅', room:'宴会厅', awake:false },
            { fork:[
              { cond:'若侍卫长在宴会厅', test:w => w.carry, path:[
                { id:'carried', label:'被侍卫长扶回寝殿', room:'王子寝殿', awake:false },
              ]},
              { cond:'否则', path:[
                { id:'floor', label:'在宴会厅睡到天亮', room:'宴会厅', awake:false },
              ]},
            ]},
          ]},
          { cond:'否则', path:[
            { id:'bye', label:'去寝宫向姐姐道别', room:'女王寝宫', awake:true },
            { fork:[
              { cond:'若姐姐醒着在寝宫', test:w => w.met, path:[
                { id:'talk', label:'陪姐姐去午夜圣餐', room:'圣堂', awake:true },
                { id:'zsleep1', label:'在圣堂长椅上睡着了', room:'圣堂', awake:false },
              ]},
              { cond:'否则', path:[
                { id:'wait', label:'在姐姐寝宫等她', room:'女王寝宫', awake:true },
                { id:'wsleep', label:'等着等着睡着了', room:'女王寝宫', awake:false },
              ]},
            ]},
          ]},
        ]},
      ]},
      { id:'mage', name:'宫廷法师', short:'法', start:'chart', tree:[
        { id:'chart', label:'翻阅星图', room:'观星塔', awake:true },
        { id:'stars', label:'观星', room:'观星塔', awake:true },
        { id:'fire', label:'宴会厅表演焰火', room:'宴会厅', awake:true },
        { id:'amulet', label:'给女王送护身符', room:'女王寝宫', awake:true },
        { id:'divine', label:'为王子占卜', room:'王子寝殿', awake:true },
        { id:'brew', label:'回塔调配药剂', room:'观星塔', awake:true },
        { id:'mnap', label:'在塔里小憩', room:'观星塔', awake:false },
        { id:'mwatch', label:'在塔顶观星到天亮', room:'观星塔', awake:true },
      ]},
      { id:'duke', name:'公爵', short:'公', start:'arrive', tree:[
        { id:'arrive', label:'进宫', room:'宴会厅', awake:true },
        { id:'secret', label:'花园密会', room:'花园', awake:true },
        { id:'ddrink', label:'宴会厅饮酒', room:'宴会厅', awake:true },
        { id:'visitm', label:'拜访法师', room:'观星塔', awake:true },
        { id:'confess', label:'去圣堂忏悔', room:'圣堂', awake:true },
        { id:'dwait', label:'宴会厅等候', room:'宴会厅', awake:true },
      ]},
      { id:'guard', name:'侍卫长', short:'卫', start:'gate', tree:[
        { id:'gate', label:'巡视宫门', room:'花园', awake:true },
        { id:'qdoor', label:'守在女王寝宫门口', room:'女王寝宫', awake:true },
        { id:'roll', label:'点卯', room:'宴会厅', awake:true },
        { id:'hall', label:'在宴会厅值守', room:'宴会厅', awake:true },
        { id:'pdoor', label:'守在王子寝殿门口', room:'王子寝殿', awake:true },
        { id:'gnap', label:'靠着门打盹', room:'王子寝殿', awake:false },
      ]},
      { id:'saint', name:'圣女', short:'圣', start:'copy', tree:[
        { id:'copy', label:'在圣堂抄经', room:'圣堂', awake:true },
        { id:'flower', label:'花园采花', room:'花园', awake:true },
        { id:'comb', label:'为女王梳头', room:'女王寝宫', awake:true },
        { id:'hymn', label:'圣堂唱诗', room:'圣堂', awake:true },
        { id:'petition', label:'递交候选文书', room:'圣堂', awake:true },
        { fork:[
          { cond:'若她起了杀心（文书被驳回，或者听说接任的另有其人）', test:w => w.rebuked, path:[
            { id:'cup', label:'擦拭圣杯', room:'圣堂', awake:true },
            { id:'svigil', label:'在圣堂守夜', room:'圣堂', awake:true },
          ]},
          { cond:'否则', path:[
            { id:'starmap', label:'去观星塔借星图', room:'观星塔', awake:true },
            { id:'help', label:'去宴会厅帮忙收拾', room:'宴会厅', awake:true },
          ]},
        ]},
      ]},
    ],
    rules:[
      { id:'drink-duke', who:'公爵', public:true, hideTruth:true, truth:'',
        when:c => c.at('prince', 'zdrink') && c.room('duke') === '宴会厅' && c.awake('duke'),
        act:c => { c.w.tipsy = true; } },
      { id:'carry', who:'侍卫长', public:true, hideTruth:true, truth:'',
        when:c => c.at('prince', 'drunk') && c.room('guard') === '宴会厅' && c.awake('guard'),
        act:c => { c.w.carry = true; } },
      { id:'potion', who:'宫廷法师 / 公爵',
        truth:'公爵去观星塔拜访时，法师要是醒着在塔里，会卖给他一瓶安神药水——法师并不知道他要拿去做什么。',
        clue:{ room:'观星塔', text:'法师的药架上空了一格，标签写着「安神」。' },
        when:c => !c.w.potion && c.at('duke', 'visitm') && c.room('mage') === '观星塔' && c.awake('mage'),
        act:c => { c.w.potion = true; } },
      { id:'dose', who:'公爵',
        truth:'买到安神药的公爵，身边要是只有一个人醒着盯着他（侍卫长不算），他会往那人杯里倒药，那人当场就睡过去。',
        clue:c => ({ room:c.room('duke'), text:`${c.room('duke')}的桌上有一只杯子，杯底沉着白色的药渣。` }),
        when:c => c.w.potion && alive(c, 'duke') && c.awake('duke') && c.awakeIn(c.room('duke'), 'duke').filter(x => x !== 'guard').length === 1,
        act:c => { const x = c.awakeIn(c.room('duke'), 'duke').filter(x => x !== 'guard')[0]; c.doze(x, `${NAME[x]}喝了公爵递来的酒，趴在桌上睡着了`);
          c.see(c.room('duke'), `${c.room('duke')}里有人歪在椅子上，手边的酒杯打翻了也没察觉`); } },
      { id:'amulet', who:'宫廷法师',
        truth:'法师送给女王的护身符里藏着安眠香。女王亲手收下，下一个小时起就会犯困，提前回寝宫睡下。',
        clue:{ room:'女王寝宫', text:'女王的护身符里飘出一股甜腻的香气。' },
        when:c => c.w.charm == null && c.at('mage', 'amulet') && alive(c, 'queen') && c.room('queen') === '女王寝宫' && c.awake('queen'),
        act:c => { c.w.charm = c.t; } },
      { id:'charm-sleep', who:'女王', public:true, hideTruth:true, truth:'',
        when:c => c.w.charm != null && !c.w.charmed && c.t > c.w.charm && alive(c, 'queen'),
        act:c => { c.w.charmed = true; if (c.room('queen') !== '女王寝宫') c.sneak('queen', '女王寝宫', '女王犯困，提前回寝宫睡下了'); c.doze('queen', '女王闻着护身符的香气睡着了');
          c.see('女王寝宫', '女王寝宫的帐幔早早放了下来，飘出一缕甜腻的香气'); } },
      { id:'charm-stay', who:'女王', public:true, hideTruth:true, truth:'',
        when:c => c.w.charmed && alive(c, 'queen') && (c.awake('queen') || c.room('queen') !== '女王寝宫'),
        act:c => { if (c.room('queen') !== '女王寝宫') c.sneak('queen', '女王寝宫', '', true); c.doze('queen');
          c.see('女王寝宫', '女王寝宫的帐幔一直低垂着，里面的呼吸声又轻又匀'); } },
      { id:'met', who:'王子', public:true, hideTruth:true, truth:'',
        when:c => c.at('prince', 'bye') && c.room('queen') === '女王寝宫' && c.awake('queen'),
        act:c => { c.w.met = true; } },
      { id:'announce', who:'大祭司',
        truth:'大祭司在宴会厅赐福时，会当众宣布由别人接任。圣女要是在场，也会因此起了杀心。',
        clue:{ room:'宴会厅', text:'宴会厅里，圣女的座位上有一块被攥皱的手帕。' },
        when:c => !c.w.rebuked && c.at('priest', 'bless') && c.room('saint') === '宴会厅' && c.awake('saint'),
        act:c => { c.w.rebuked = true; } },
      { id:'incite', who:'公爵',
        truth:'公爵唯恐宫里不乱。他在圣堂撞见圣女递交候选文书，会冷笑着告诉她：大祭司早就内定了别人。圣女同样会起杀心。',
        clue:{ room:'圣堂', text:'候选文书的背面，有人用公爵惯用的紫墨水写了一个名字。' },
        when:c => !c.w.rebuked && c.at('saint', 'petition') && c.room('duke') === '圣堂' && c.awake('duke') && alive(c, 'duke'),
        act:c => { c.w.rebuked = true; } },
      { id:'rebuke', who:'大祭司',
        truth:'圣女想接任大祭司。她递交候选文书时，大祭司要是醒着在圣堂，会当场驳回。圣女从此起了杀心。',
        clue:{ room:'圣堂', text:'圣堂的地上，有一份被撕成两半的候选文书。' },
        when:c => c.at('saint', 'petition') && c.room('priest') === '圣堂' && c.awake('priest'),
        act:c => { c.w.rebuked = true; } },
      { id:'saint-poison', who:'圣女',
        truth:'起了杀心的圣女擦拭圣杯时，圣堂里要是没有别人醒着，就往杯里下毒。大祭司要是已经喝过圣餐酒，就晚了。',
        clue:{ room:'圣堂', text:'圣杯的边缘有一圈淡紫色的痕迹。' },
        when:c => c.w.rebuked && !c.w.cup && !c.w.drunk && c.at('saint', 'cup') && lonely(c, 'saint'),
        act:c => { c.w.cup = true; } },
      { id:'drink', who:'大祭司', public:true, hideTruth:true, truth:'',
        when:c => c.at('priest', 'mass') && !c.w.drunk,
        act:c => { c.w.drunk = true; if (c.w.cup) c.w.poison = c.t; } },
      { id:'priest-poisoned', who:'圣女', bad:true,
        truth:'圣杯里的毒，喝下去的下一个小时发作。',
        when:c => c.w.poison != null && c.t > c.w.poison && alive(c, 'priest'),
        act:c => die(c, 'priest', c.room('priest'), '大祭司毒发身亡') },
      { id:'saint-smother', who:'圣女', bad:true,
        truth:'起了杀心的圣女还有第二个办法：大祭司睡着时，身边要是没有别人醒着，她自己也没被人盯着，就会摸过去用圣带勒死他。',
        clue:{ room:'圣堂', text:'大祭司的颈上有一道白色圣带勒出的红痕。' },
        when:c => c.w.rebuked && alive(c, 'priest') && alive(c, 'saint') && c.awake('saint') && !c.awake('priest')
          && lonely(c, 'priest', 'saint') && (c.room('saint') === c.room('priest') || lonely(c, 'saint')),
        act:c => { const rm = c.room('priest'); if (c.room('saint') !== rm) c.sneak('saint', rm, `圣女来到${rm}`, true); die(c, 'priest', rm); } },
      { id:'duke-kill', who:'公爵', bad:true,
        truth:'公爵要让王子死。王子剑术了得，公爵只敢对睡着的王子下手，而且自己得脱得开身：身边没有别人醒着盯着他。侍卫长是同谋：他在公爵身边时，会拉住法师、圣女说话替公爵打掩护；他醒着守在王子身边时不但不拦，还会借口女王召见，把法师、圣女支开。女王、大祭司和王子本人，他都支不走。王子寝殿的钥匙，侍卫长开席前就交给了公爵，闩门也没用。',
        clue:c => c.room('duke') !== c.room('prince') && c.room('guard') === c.room('duke') && c.awake('guard')
          ? { room:c.room('duke'), text:`侍卫长说：公爵整晚都和我在${c.room('duke')}，没离开过半步；倒是看见宫廷法师往${c.room('prince')}那边去过。` }
          : { room:c.room('prince'), text:`侍卫长说：${c.hour} 前后，他看见宫廷法师往${c.room('prince')}那边去过。` },
        when:c => alive(c, 'duke') && c.awake('duke') && alive(c, 'prince') && !c.awake('prince') && princeOpen(c)
          && (c.room('duke') === c.room('prince') || dukeFree(c)),
        act:c => {
          const rm = c.room('prince');
          if (c.room('guard') === rm && c.awake('guard'))
            c.awakeIn(rm, 'prince').filter(x => x === 'mage' || x === 'saint').forEach(x => c.see(rm, `侍卫长说女王召见，把${NAME[x]}打发走了`));
          if (c.room('duke') !== rm) c.sneak('duke', rm, `公爵来到${rm}`, true);
          die(c, 'prince', rm);
        } },
      { id:'guard-kill', who:'公爵', bad:true,
        truth:'钥匙到手，侍卫长对公爵就没用了，还知道得太多。侍卫长睡着时，身边要是没有别人醒着，公爵又脱得开身，就会去灭口。',
        clue:c => ({ room:c.room('guard'), text:`侍卫长的佩剑还插在鞘里，人却倒在${c.room('guard')}。` }),
        when:c => alive(c, 'guard') && alive(c, 'duke') && c.awake('duke') && !c.awake('guard')
          && lonely(c, 'guard', 'duke') && (c.room('duke') === c.room('guard') || dukeFree(c)),
        act:c => { const rm = c.room('guard'); if (c.room('duke') !== rm) c.sneak('duke', rm, `公爵来到${rm}`, true); die(c, 'guard', rm); } },
      { id:'duo-kill', who:'公爵 / 侍卫长', bad:true,
        truth:'醒着的王子身边要是只有公爵和侍卫长，两人会联手对付他——王子剑术再好，也敌不过两个人。',
        clue:c => ({ room:c.room('prince'), text:`${c.room('prince')}的地上有两种不同的靴印。` }),
        when:c => alive(c, 'prince') && c.awake('prince') && alive(c, 'duke') && alive(c, 'guard') && c.awake('duke') && c.awake('guard')
          && c.room('duke') === c.room('prince') && c.room('guard') === c.room('prince') && lonely(c, 'prince', 'duke', 'guard'),
        act:c => die(c, 'prince', c.room('prince')) },
      // 放在最后：要用这个小时结束时的世界状态，推算法师下一个小时在哪
      { id:'mage-held', who:'宫廷法师',
        truth:'会魔法的人能感应到近处有人动用时之沙漏。法师要转动沙漏的那个小时（女王落单的下一个小时），身边要是有醒着的大祭司或圣女，他就不敢用，只能等下一次机会。睡着的人感应不到；法师自己那个小时睡着了，也转不了沙漏。',
        when:c => queenAlone(c) && nextNode(c, 'mage').awake && sensedBy(c).length > 0,
        act:c => { c.note(c.room('mage'), `女王落单了；可${HOURS[c.t + 1] || '天亮'}宫廷法师身边有${sensedBy(c).map(x => NAME[x]).join('、')}，他没敢转动沙漏`); c.w.held = (c.w.held || 0) + 1; } },
      { id:'mage-kill', who:'宫廷法师', bad:true,
        truth:'宫廷法师握着时之沙漏。00:00 到 02:00 之间，女王身边一旦没有别人醒着（他本人在场也不行；守在门外的侍卫长拦不住凭空出现在屋里的人，不算；女王祈祷时屏退左右，只有大祭司算陪着她，在花园散步时谁都不让跟着），他就会在下一个小时转动沙漏，回到这一个小时去刺杀她——明线上他那一个小时仍在原地，旁人也不会觉得他离开过。',
        clue:c => {
          const felt = ['priest', 'saint'].filter(id => alive(c, id) && nextNode(c, id).awake).map(id => NAME[id]);
          return { room:c.room('queen'), text:`${c.room('queen')}的地毯上，落着几粒金色的细沙。` + (felt.length ? `${felt.join('、')}说：${HOURS[c.t + 1] || '天亮时'}前后，察觉到宫里有人动用了时之沙漏，离得太远，分不清是谁。` : '') };
        },
        when:c => queenAlone(c) && nextNode(c, 'mage').awake && sensedBy(c).length === 0,
        act:c => {
          const rm = c.room('queen'), nh = HOURS[c.t + 1] || '天亮时';
          c.w.glass = true;
          die(c, 'queen', rm);
          c.note(rm, `宫廷法师在 ${nh} 转动时之沙漏，回到 ${c.hour}，出现在${rm}`);
        } },
    ],
    ending:w => {
      const d = Object.keys(w.dead);
      return d.length ? { ok:false, key:d.join(','), text:'天亮前，' + d.map(x => NAME[x]).join('、') + '死了。加冕礼蒙上了血色。' }
        : { ok:true, text:'天亮了。女王在圣堂戴上了王冠，这一夜谁都没有死。' };
    },
  };
  registerCase(CASE);
})();
