/* =========================================================
   第三案 · 冬日列车
   这个文件只描述一个案子。改它不会影响其他案子。
   车厢排成一条线：去别的车厢要穿过中间的车厢，路过时有人醒着就会被看见。
   ========================================================= */
(function () {
  const ROOMS = ['行李车', '二等车', '餐车', '头等·甲', '头等·乙', '观景车'];
  const NAME = { he:'贺老板', su:'苏小姐', tang:'小唐', zhao:'赵先生', wife:'贺太太', fu:'阿福', lu:'乘警老陆' };
  // 两节车厢之间要穿过的车厢（不含两头）
  const between = (a, b) => {
    const i = ROOMS.indexOf(a), j = ROOMS.indexOf(b);
    return ROOMS.slice(Math.min(i, j) + 1, Math.max(i, j));
  };
  // 停站（站台能绕）和过隧道（一片漆黑）时，路上谁也看不见
  const openHour = c => c.hour === '23:00' || c.hour === '02:00';
  // 路上挡住的人：中间车厢里醒着的人
  const blockers = (c, who, to) => openHour(c) ? []
    : between(c.room(who), to).flatMap(r => c.awakeIn(r, who).map(x => ({ x, r })));
  const alive = (c, id) => !c.w.dead[id];
  const STAFF = ['lu', 'tang', 'fu'];
  const guests = ids => ids.filter(x => !STAFF.includes(x));   // 贺老板只在乎客人，不怕下人看见
  const kill = (c, victim, by, room, text) => {
    c.w.dead[victim] = { by, room, hour:c.hour };
    if (c.room(by) !== room) c.sneak(by, room, text || `${NAME[by]}偷偷来到${room}`);
    c.see(room, `${NAME[victim]}遇害`, true);
  };

  registerCase({
    id:'train', tab:'第三案', title:'冬日列车',
    brief:'冬夜，一列夜车向北驶去。车上不止一个人起了杀心，目标各不相同，只要有一个人得手，这一夜就失败了。按原本的安排，列车清晨抵达终点站时，车上已经出了人命。乘警老陆的明线无法调整。',
    goal:'所有人活着抵达终点站',
    achievements:[
      { open:true, id:'plan', name:'原计划', desc:'一处不改，照原本的安排推演一次。', test:x => x.initial },
      { open:true, id:'nohint', name:'无需提示', desc:'一条提示都没看就破了案。', test:x => x.r.end.ok && x.s.hintsOpen <= x.cs.hints.filter(h => h.free).length },
      { open:true, id:'fast', name:'十步之内', desc:'十次推演之内破了案。', test:x => x.r.end.ok && x.s.runs.length <= 10 },
      { open:true, id:'safe', name:'全员抵达', desc:'让车上所有人活着抵达终点站。', test:x => x.r.end.ok },
      { id:'key', name:'没收！', desc:'小唐打盹被乘警逮了个正着。', test:x => x.fired.has('tang-caught') },
      { id:'nocup', name:'谁点的咖啡？', desc:'阿福端着一杯没人点过的咖啡来到了包厢。',
        test:x => x.r.hours.some(h => !h.cut && h.events.some(e => e.text.includes('谁也没点过'))) },
      { id:'wait', name:'以德报怨', desc:'苏小姐守在熟睡的贺老板身边。',
        test:x => x.r.hours.some(h => !h.cut && h.events.some(e => e.text.includes('等他醒来'))) },
      { id:'two', name:'一车两命', desc:'同一个钟点里，车上有两个人遇害。',
        test:x => x.r.truth.filter(t => (x.cs.rules.find(y => y.id === t.rule) || {}).bad).length >= 2 },
      { id:'early', name:'阎王叫你三更死，侦探让你早上路', desc:'22:00 就有人遇害了。', test:x => x.r.badAt === '22:00' },
      { id:'dark', name:'隧道尽头', desc:'有人在漆黑的隧道里遇害。', test:x => x.r.badAt === '02:00' },
      { id:'none', name:'无人生还', desc:'贺老板、苏小姐和乘警老陆都在推演里遇过害。',
        test:x => x.s.fired['tang-kill'] && (x.s.fired['he-kill'] || x.s.fired['zhao-su']) && x.s.fired['zhao-cop'] },
      { id:'berth', name:'高质量卧铺', desc:'明线上能休息的人，都让他们从休息开始。',
        // 明线里有「睡下 / 吃药睡下 / 打盹」的人，起点都选在这些格子上
        test:x => Object.entries({ he:['hsleep'], wife:['wpill'], su:['ssleep1', 'ssleep2'], tang:['tnap'], zhao:['zsleep'], fu:['fnap1', 'fnap2'] })
          .every(([id, ids]) => ids.includes(x.s.starts[id])) },
      { id:'paths', name:'全线贯通', desc:'在推演中走遍每一条岔路。', test:x => x.cs.chars.every(ch => ch.order.every(n => x.s.revealed.has(n.id))) },
      { id:'forgot', name:'各位旅客请注意', desc:'推演了 10 次，第一条提示自动揭开了。', test:x => x.s.runs.length >= 10 },
      { id:'hundred', name:'这是列车还是房车？', desc:'推演了 100 次。', test:x => x.s.runs.length >= 100 },
    ],
    hints:[
      { free:true, autoAt:10,
        text:'停站时可以下车从站台绕过去，过隧道时车厢之间一片漆黑：这两个钟点，路上谁也拦不住谁。（推演满十次后自动揭开；揭开这一条不影响「无需提示」成就。）' },
      '想杀人的不止一个，目标各不相同。有人既是凶手，也是别人的目标。',
      '贺老板只顾忌客人，不把列车员和侍应放在眼里。',
      '乘警查票时会撞见不少事：被他盘问过的人从此睡不着，被他训斥的人会丢掉一样要紧的东西。',
      '贺太太要整夜醒着，得靠一杯咖啡；可她和丈夫独处时，杯子里可能被加了别的东西。',
      '有个人认得苏小姐，不用见面也认得出。',
      '苏小姐守在一个人身边就能护住他；可要是她当面亮出了把柄，对方就再也不会罢手。',
    ],
    hours:['22:00','23:00','00:00','01:00','02:00','03:00','04:00'],
    rooms:ROOMS,
    scene:['车厢从车头到车尾：行李车、二等车、餐车、头等车两节、观景车','23:00 停靠中途站','02:00 穿过长隧道'],
    world:() => ({ dead:{}, copSus:false, recog:false, heHome:false, ordered:false, coffee:false, wifeDrugged:false }),
    items:w => [
      ...(w.hourNow === '23:00' ? [{ room:'二等车', text:'停靠中途站' }] : []),
      ...(w.hourNow === '02:00' ? [{ room:'餐车', text:'隧道' }] : []),
    ],
    chars:[
      { id:'lu', name:'乘警老陆', short:'陆', fixed:true, start:'meal', tree:[
        { id:'meal', label:'吃夜宵', room:'餐车', awake:true },
        { id:'load', label:'看着装货', room:'行李车', awake:true },
        { id:'ticket', label:'查票', room:'二等车', awake:true },
        { id:'log', label:'写值班日志', room:'餐车', awake:true },
        { id:'lnap', label:'打盹', room:'餐车', awake:false },
        { id:'check', label:'巡查行李车', room:'行李车', awake:true },
        { id:'call', label:'叫醒到站旅客', room:'二等车', awake:true },
      ]},
      { id:'he', name:'贺老板', short:'贺', start:'cards', tree:[
        { id:'cards', label:'打牌', room:'餐车', awake:true },
        { id:'cigar', label:'抽雪茄', room:'观景车', awake:true },
        { id:'books', label:'看账本', room:'头等·甲', awake:true },
        { id:'hsleep', label:'睡下', room:'头等·甲', awake:false },
      ]},
      { id:'wife', name:'贺太太', short:'太', start:'makeup', tree:[
        { id:'milk', label:'喝牛奶', room:'餐车', awake:true },
        { id:'makeup', label:'卸妆', room:'头等·甲', awake:true },
        { id:'stroll', label:'去车尾透气', room:'观景车', awake:true },
        { id:'wpill', label:'吃药睡下', room:'头等·甲', awake:false },
      ]},
      { id:'su', name:'苏小姐', short:'苏', start:'photo', tree:[
        { id:'photo', label:'拍夜景', room:'观景车', awake:true },
        { id:'write', label:'写稿', room:'餐车', awake:true },
        { fork:[
          { cond:'若贺老板正在包厢里醒着', test:w => w.heHome, path:[
            { id:'ask', label:'采访贺老板', room:'头等·甲', awake:true,
              does:(w, t, pos) => pos.he.room !== '头等·甲' ? { label:'等贺老板回来', text:'贺老板不在包厢，苏小姐坐下来等他' }
                : !pos.he.awake ? { label:'等贺老板醒来', text:'贺老板睡着了，苏小姐坐在包厢里等他醒来' } : false },
            { id:'ssleep1', label:'睡下', room:'头等·乙', awake:false },
          ]},
          { cond:'否则', path:[
            { id:'develop', label:'冲洗照片', room:'头等·乙', awake:true },
            { id:'ssleep2', label:'睡下', room:'头等·乙', awake:false },
          ]},
        ]},
      ]},
      { id:'tang', name:'小唐', short:'唐', start:'boiler', tree:[
        { id:'boiler', label:'烧锅炉', room:'行李车', awake:true },
        { id:'water', label:'送热水', room:'头等·乙', awake:true },
        { id:'sweep', label:'扫餐车', room:'餐车', awake:true },
        { id:'tnap', label:'打盹', room:'二等车', awake:false },
        { id:'duty', label:'值夜班', room:'二等车', awake:true },
      ]},
      { id:'zhao', name:'赵先生', short:'赵', start:'paper', tree:[
        { id:'paper', label:'看报', room:'二等车', awake:true },
        { id:'zcards', label:'打牌', room:'餐车', awake:true },
        { id:'zdrink', label:'喝闷酒', room:'餐车', awake:true },
        { id:'zwalk', label:'去车尾透气', room:'观景车', awake:true },
        { id:'zsleep', label:'睡下', room:'二等车', awake:false },
      ]},
      { id:'fu', name:'阿福', short:'福', start:'clean', tree:[
        { id:'clean', label:'收拾餐桌', room:'餐车', awake:true },
        { id:'cups', label:'洗杯子', room:'餐车', awake:true },
        { fork:[
          { cond:'若贺太太在餐车点了咖啡', test:w => w.ordered, path:[
            { id:'coffee', label:'送咖啡', room:'头等·甲', awake:true,
              does:(w, t, pos) => {
                if (!w.ordered) return { label:'送咖啡，没人点', text:'阿福端着咖啡来到头等·甲，可谁也没点过' };
                if (pos.wife.room !== '头等·甲') return { label:'送咖啡，人不在', text:'贺太太不在包厢，阿福把咖啡端了回去' };
                w.coffee = true; return '贺太太接过了咖啡';
              } },
            { id:'fnap1', label:'打盹', room:'餐车', awake:false },
          ]},
          { cond:'否则', path:[
            { id:'fnap2', label:'打盹', room:'餐车', awake:false },
          ]},
        ]},
      ]},
    ],
    rules:[
      { id:'clock', who:'列车', public:true, hideTruth:true, truth:'',
        when:() => true, act:c => { c.w.hourNow = c.hour; } },
      { id:'order', who:'贺太太', public:true, truth:'贺太太在餐车喝牛奶时，阿福醒着的话，她会点一杯咖啡送到包厢。',
        when:c => !c.w.ordered && c.at('wife', 'milk') && c.room('fu') === '餐车' && c.awake('fu'),
        act:c => { c.w.ordered = true; } },
      { id:'he-drug', who:'贺老板',
        truth:'贺老板和太太醒着待在一起、身边没有别的客人时（列车员和侍应不算），会趁她不注意往她的杯子里加安眠药。太太回到包厢就会睡着，喝了咖啡也撑不住。',
        clue:c => ({ room:c.room('wife'), text:'贺太太的杯底有一层没化开的白色粉末。' }),
        when:c => !c.w.wifeDrugged && c.awake('wife') && c.awake('he') && c.room('he') === c.room('wife')
          && guests(c.awakeIn(c.room('he'), 'he')).length === 1,
        act:c => { c.w.wifeDrugged = true; } },
      { id:'wife-doze', who:'贺太太',
        truth:'牛奶里被下了药的贺太太，一回到包厢就睡着了。',
        when:c => c.w.wifeDrugged && c.room('wife') === '头等·甲' && c.awake('wife'),
        act:c => c.doze('wife', '贺太太靠在床头睡着了') },
      { id:'wife-coffee', who:'贺太太',
        truth:'喝了阿福送来的咖啡，贺太太吃了药也睡不着，一直醒着坐在床头。',
        when:c => c.w.coffee && !c.w.wifeDrugged && c.at('wife', 'wpill'),
        act:c => c.wake('wife', '贺太太喝了咖啡睡不着，坐起来织毛衣') },
      { id:'he-up', who:'贺老板',
        truth:'贺老板有起夜的毛病，03:00 会醒过来。',
        when:c => c.hour === '03:00' && alive(c, 'he') && !c.awake('he'),
        act:c => c.wake('he', '贺老板醒了过来') },
      { id:'tang-caught', who:'乘警', public:true,
        truth:'乘警查票时撞见打盹的列车员，把他叫起来训了一顿，顺手收走了他的通用钥匙。没了钥匙，小唐打不开头等车的包厢。',
        when:c => c.hour === '00:00' && c.at('tang', 'tnap'),
        act:c => { c.wake('tang'); c.w.keyTaken = true; c.see('二等车', '乘警把打盹的小唐叫了起来，收走了他的通用钥匙'); } },
      { id:'zhao-ticket', who:'乘警',
        truth:'乘警查票时，赵先生要是在二等车（睡着了也会被叫醒），乘警会多看他的证件两眼。赵先生从此认定乘警起了疑心，一夜都不敢睡。',
        clue:{ room:'二等车', text:'赵先生的车票上被乘警用铅笔画了个记号。' },
        when:c => c.hour === '00:00' && c.room('zhao') === '二等车',
        act:c => { if (!c.awake('zhao')) { c.wake('zhao'); c.see('二等车', '乘警叫醒赵先生查票'); } c.w.copSus = true; } },
      { id:'recog', who:'苏小姐',
        truth:'苏小姐和赵先生醒着待在同一节车厢时，她会认出赵先生是报上通缉的逃犯。赵先生察觉到了，一夜都不敢睡。',
        clue:{ room:'头等·乙', text:'苏小姐的笔记本里夹着一张通缉令的剪报。' },
        when:c => !c.w.recog && c.awake('su') && c.awake('zhao') && c.room('su') === c.room('zhao'),
        act:c => { c.w.recog = true; } },
      { id:'zhao-paper', who:'赵先生',
        truth:'赵先生看报时，读到了苏小姐写的逃犯报道，认出了报上她的照片。从此他一心要找到她灭口，一夜都不敢睡。',
        clue:{ room:'二等车', text:'赵先生的铺位上留着一张报纸，苏小姐署名的那篇报道被撕走了。' },
        when:c => !c.w.recog && c.at('zhao', 'paper'),
        act:c => { c.w.recog = true; } },
      { id:'zhao-drunk', who:'赵先生', public:true,
        truth:'赵先生酒量差，喝闷酒喝着喝着就趴在桌上睡着了（心里有鬼、睡不着的时候除外）。',
        when:c => c.at('zhao', 'zdrink') && !c.w.copSus && !c.w.recog,
        act:c => c.doze('zhao', '赵先生喝多了，趴在桌上睡着了') },
      { id:'zhao-up', who:'赵先生', public:true, hideTruth:true, truth:'',
        when:c => (c.w.copSus || c.w.recog) && !c.awake('zhao'), act:c => c.wake('zhao', '赵先生睁着眼躺着，一点睡意也没有') },
      { id:'tang-turn', who:'小唐',
        truth:'小唐想去头等·甲时，路过的车厢里有人醒着，他只好折回来。',
        clue:c => { const b = blockers(c, 'tang', '头等·甲')[0]; return { room:b.r, text:`${c.hour} ${NAME[b.x]}说：小唐往头等车走了几步，又折了回去。` }; },
        when:c => !c.w.keyTaken && alive(c, 'he') && c.awake('tang') && c.room('he') === '头等·甲' && !c.awake('he')
          && c.awakeIn('头等·甲', 'tang').length === 0 && c.room('tang') !== '头等·甲' && blockers(c, 'tang', '头等·甲').length > 0,
        act:() => {} },
      { id:'tang-kill', who:'小唐', bad:true,
        truth:'小唐的父亲被贺老板逼得跳了河。只要贺老板在头等·甲睡着、包厢里没有别人醒着，小唐就会摸过去。路过的车厢里有人醒着他就不敢，但停站时他能从站台绕过去，过隧道时谁也看不见他。',
        clue:{ room:'头等·甲', text:'头等·甲的门锁上插着一把列车员的通用钥匙。' },
        when:c => !c.w.keyTaken && alive(c, 'he') && c.awake('tang') && c.room('he') === '头等·甲' && !c.awake('he')
          && c.awakeIn('头等·甲', 'tang').length === 0 && (c.room('tang') === '头等·甲' || blockers(c, 'tang', '头等·甲').length === 0),
        act:c => kill(c, 'he', 'tang', '头等·甲', '小唐用通用钥匙打开了头等·甲') },
      { id:'he-know', who:'贺老板',
        truth:'苏小姐采访醒着的贺老板时，亮出了他的照片。贺老板从此铁了心，太太在旁边也拦不住他。',
        clue:{ room:'头等·甲', text:'贺老板的账本里夹着一张被撕掉一角的照片。' },
        when:c => !c.w.heKnows && c.room('su') === '头等·甲' && c.awake('su') && c.room('he') === '头等·甲' && c.awake('he'),
        act:c => { c.w.heKnows = true; } },
      { id:'he-kill', who:'贺老板', bad:true,
        truth:'苏小姐手里有贺老板的把柄。贺老板醒着、身边没有别的客人醒着时（列车员和侍应他不放在眼里），会去找落单的苏小姐（她身边没有别的客人醒着）。他不会在自己的包厢里动手；路过的车厢里有客人醒着他也不去，除非是停站或过隧道。',
        clue:c => ({ room:c.room('su'), text:`${c.room('su')}的地上掉着一截雪茄灰。` }),
        when:c => alive(c, 'su') && c.awake('he') && c.room('su') !== '头等·甲'
          && (c.w.heKnows || guests(c.awakeIn(c.room('he'), 'he')).filter(x => x !== 'su').length === 0)
          && guests(c.awakeIn(c.room('su'), 'su')).filter(x => x !== 'he').length === 0
          && (c.room('he') === c.room('su') || openHour(c) || between(c.room('he'), c.room('su')).every(r => guests(c.awakeIn(r, 'he')).length === 0)),
        act:c => kill(c, 'su', 'he', c.room('su'), '贺老板悄悄去找苏小姐') },
      { id:'zhao-su', who:'赵先生', bad:true,
        truth:'认出自己的苏小姐落单时（身边没有别人醒着），醒着的赵先生会去灭口。路过的车厢里有人醒着他就不去，除非是停站或过隧道。',
        clue:c => ({ room:c.room('su'), text:`${c.room('su')}的门把手上沾着二等车的煤灰。` }),
        when:c => c.w.recog && alive(c, 'su') && c.awake('zhao')
          && c.awakeIn(c.room('su'), 'su').filter(x => x !== 'zhao').length === 0
          && (c.room('zhao') === c.room('su') || blockers(c, 'zhao', c.room('su')).length === 0),
        act:c => kill(c, 'su', 'zhao', c.room('su'), '赵先生去找苏小姐') },
      { id:'zhao-cop', who:'赵先生', bad:true,
        truth:'认定乘警起了疑心后，醒着的赵先生会趁乘警落单（身边没有别人醒着）下手。路过的车厢里有人醒着他就不去，除非是停站或过隧道。',
        clue:c => ({ room:c.room('lu'), text:`${c.room('lu')}里，乘警的哨子掉在了地上。` }),
        when:c => c.w.copSus && alive(c, 'lu') && c.awake('zhao')
          && c.awakeIn(c.room('lu'), 'lu').filter(x => x !== 'zhao').length === 0
          && (c.room('zhao') === c.room('lu') || blockers(c, 'zhao', c.room('lu')).length === 0),
        act:c => kill(c, 'lu', 'zhao', c.room('lu'), '赵先生跟上了乘警') },
      { id:'snap', who:'列车', public:true, hideTruth:true, truth:'',
        when:() => true,
        act:c => { c.w.heHome = c.room('he') === '头等·甲' && c.awake('he'); } },
    ],
    ending:w => {
      const d = Object.keys(w.dead);
      return d.length ? { ok:false, text:'列车抵达终点站时，' + d.map(x => NAME[x]).join('、') + '已经没了呼吸。' }
        : { ok:true, text:'清晨，列车抵达终点站。车上的人都活着走下了站台。' };
    },
  });
})();
