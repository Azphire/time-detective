/* =========================================================
   第二案 · 雪岭山庄
   这个文件只描述一个案子。改它不会影响其他案子。
   ========================================================= */
registerCase({
  id:'snow', tab:'第二案', title:'雪岭山庄',
  brief:'暴风雪封了山，电话线也断了。晚餐时，山庄主人沈先生说明早要宣布一件事。按原本的安排，搜救队天亮赶到时，沈先生已经死了。沈先生的明线无法调整。',
  goal:'沈先生活到 02:00 之后',
  // 成就：x = { r:本次推演, s:本关状态, cs, fired:Set(本次触发的暗线), initial:是否原本的安排 }
  achievements:[
    { open:true, id:'plan', name:'原计划', desc:'一处不改，照原本的安排推演一次。', test:x => x.initial },
    { open:true, id:'nohint', name:'无需提示', desc:'一条提示都没看就破了案。', test:x => x.r.end.ok && x.s.hintsOpen <= x.cs.hints.filter(h => h.free).length },
    { open:true, id:'fast', name:'十步之内', desc:'十次推演之内破了案。', test:x => x.r.end.ok && x.s.runs.length <= 10 },
    { open:true, id:'safe', name:'平安夜', desc:'让沈先生平安活到天亮。', test:x => x.r.end.ok },
    { id:'tea', name:'哎！不是，你——', desc:'沈先生在 22:00 就遇害了。', test:x => x.r.badAt === '22:00' },
    { id:'double', name:'Double Kill!', desc:'沈先生和韩先生都没能活到天亮。', test:x => x.fired.has('han-freeze') },
    { id:'empty', name:'国王的新药', desc:'林医生没配药就去送药了。',
      test:x => x.r.hours.some(h => !h.cut && h.events.some(e => e.text.includes('林医生空着手来了'))) },
    { id:'slack', name:'带薪摸鱼', desc:'阿梅来铺床时，沈先生已经睡下了。',
      test:x => x.r.hours.some(h => !h.cut && h.events.some(e => e.text.includes('阿梅没法铺床'))) },
    { id:'power', name:'村里通电了', desc:'第一次让发电机撑过了午夜。',
      test:x => x.r.hours.some(h => h.hour === '00:00' && !h.cut) && !x.fired.has('power') },
    { id:'allways', name:'死法大全', desc:'解锁沈先生的四种死法。', test:x => ['shen-insom', 'shen-poison', 'jie-rage', 'jie-kill'].every(id => x.s.fired[id]) },
    { id:'paths', name:'岔路尽头', desc:'在推演中走遍每一条岔路。', test:x => x.cs.chars.every(ch => ch.order.every(n => x.s.revealed.has(n.id))) },
    { id:'forgot', name:'哦对，忘了说了', desc:'推演了 10 次，第一条提示自动揭开了。', test:x => x.s.runs.length >= 10 },
    { id:'hundred', name:'是没有喜欢的颜色吗？', desc:'推演了 100 次。', test:x => x.s.runs.length >= 100 },
  ],
  // 可依次揭开的提示：这一关用到的机制，从弱到强
  hints:[
    { free:true, autoAt:10,      // 推演满 10 次自动揭开；揭开它不算用了提示
      text:'沈先生整理文件时，会把书房里的人都打发出去。去书房有两条路：走廊，或者厨房的后楼梯。（推演满十次后自动揭开；揭开这一条不影响「无需提示」成就。）' },
    '推演表只记录明线：每个人「应该」在哪里、在做什么。一个人是否真的在那儿、是否醒着，要从痕迹和证词里推断。',
    '醒着的人会看住自己所在的房间。大多数坏事只在「没人看着」或「两人独处」时发生。',
    '分叉口看的是上一个钟点结束时的局面。对比走到不同分支的两次推演，看看在那之前谁做了不同的事。',
    '午夜后发电机会停，除非有人及时加满油。黑暗里守在路上的人什么也看不见，也不会留下证词。',
    '沈先生午夜前拿不到安眠药会出事；药送出去以后、他服下之前，放药的房间没人看着的话，药可能被换掉。',
    '守着的人可能被弄得不起作用：被灌醉、喝了下过药的咖啡或茶，或者找不到要用的东西。想想他们之前和谁在同一个房间待过。',
    '有人留下的一样东西，会让凶手不再害怕路上的守卫。那之后，只有守在沈先生身边才有用。',
    '两个心怀不轨的人待在同一个房间时，谁都不会动手。',
  ],
  hours:['22:00','23:00','00:00','01:00'],
  rooms:['大厅','书房','厨房','走廊','主卧','客房'],
  scene:['发电机的油撑不过午夜','医生随身带着药箱','客人们都住在二楼客房'],
  world:() => ({ axe:false, armed:false, alive:true, fueled:false, noFuel:false, spiked:false, sleepy:false, dark:false, drunk:false, pillReady:false, tampered:false, pillIn:null, poison:false, bedMade:false }),
  items:w => [
    ...(w.dark ? [{ room:'大厅', text:'停电' }] : []),
    ...(w.pillIn && !w.taken ? [{ room:w.pillIn, text:'安眠药' }] : []),
  ],
  chars:[
    { id:'shen', name:'沈先生', short:'沈', fixed:true, start:'tea', tree:[
      { id:'tea', label:'和客人喝茶', room:'大厅', awake:true },
      { id:'papers', label:'整理文件', room:'书房', awake:true },
      { fork:[
        { cond:'若午夜前拿到了安眠药', test:w => !!w.pillIn, path:[
          { id:'pill', label:'服药就寝', room:'主卧', awake:false },
          { id:'deep', label:'熟睡', room:'主卧', awake:false },
        ]},
        { cond:'否则', path:[
          { id:'insom', label:'睡不着，回书房', room:'书房', awake:true },
        ]},
      ]},
    ]},
    { id:'zhou', name:'老周', short:'周', start:'clear', tree:[
      { id:'doors', label:'检查门窗', room:'走廊', awake:true },
      { id:'clear', label:'收拾餐桌', room:'大厅', awake:true },
      { id:'fuel', label:'给发电机加油', room:'厨房', awake:true,
        does:w => {
          if (w.noFuel) return '老周找不到油桶';
          if (w.drunk) return '老周醉醺醺的，把油洒了一地';
          w.fueled = true; return '发电机加满了油';
        } },
      { id:'patrol', label:'巡视走廊', room:'走廊', awake:true },
      { id:'zbed', label:'回房休息', room:'客房', awake:false },
    ]},
    { id:'mei', name:'阿梅', short:'梅', start:'dish', tree:[
      { id:'iron', label:'熨衣服', room:'客房', awake:true },
      { id:'dish', label:'洗碗', room:'厨房', awake:true },
      { id:'snack', label:'送夜宵', room:'书房', awake:true,
        does:(w, t, pos) => pos.shen.room === '书房' ? false
          : { label:'送夜宵，书房没人', text:'书房里没人，阿梅把夜宵放在桌上等着' } },
      { id:'bed', label:'铺床', room:'主卧', awake:true,
        does:(w, t, pos) => {
          if (pos.shen.room === '主卧' && !pos.shen.awake)
            return { label:'没法铺床', text:'沈先生已经睡下了，阿梅没法铺床，就在床边守着' };
          w.bedMade = true;
        }, doesText:'主卧的床铺好了' },
      { id:'mbed', label:'回房睡觉', room:'客房', awake:false },
    ]},
    { id:'lin', name:'林医生', short:'林', start:'cards', tree:[
      { id:'cards', label:'打牌', room:'大厅', awake:true },
      { id:'mix', label:'回房配药', room:'客房', awake:true,
        does:w => { w.pillReady = true; }, doesText:'安眠药配好了' },
      { fork:[
        { cond:'若主卧的床已经铺好', test:w => w.bedMade, path:[
          { id:'deliver', label:'送药', room:'主卧', awake:true,
            does:w => { if (!w.pillReady) return '林医生空着手来了：药还没配'; if (w.pillIn) return false; w.pillIn = '主卧'; w.poison = w.tampered; }, doesText:'安眠药放在了床头' },
          { id:'lbed1', label:'睡下', room:'客房', awake:false },
        ]},
        { cond:'否则', path:[
          { id:'leave', label:'送药', room:'书房', awake:true,
            does:w => { if (!w.pillReady) return '林医生空着手来了：药还没配'; if (w.pillIn) return false; w.pillIn = '书房'; w.poison = w.tampered; }, doesText:'安眠药放在了书桌上' },
          { id:'lbed2', label:'睡下', room:'客房', awake:false },
        ]},
      ]},
    ]},
    { id:'xu', name:'许秘书', short:'许', start:'type', tree:[
      { id:'type', label:'打字', room:'书房', awake:true },
      { id:'smoke', label:'喝咖啡', room:'厨房', awake:true },
      { id:'xroom', label:'回房', room:'客房', awake:true },
    ]},
    { id:'jie', name:'阿杰', short:'杰', start:'drink', tree:[
      { id:'drink', label:'喝酒', room:'大厅', awake:true },
      { id:'cig', label:'抽烟', room:'厨房', awake:true },
      { id:'jroom', label:'回房', room:'客房', awake:true },
    ]},
    { id:'han', name:'韩先生', short:'韩', start:'fire', tree:[
      { id:'fire', label:'烤火', room:'大厅', awake:true },
      { id:'gear', label:'检查装备', room:'客房', awake:true },
      { id:'snow', label:'看雪', room:'走廊', awake:true },
    ]},
  ],
  rules:[
    { id:'shen-alone', who:'沈先生',
      truth:'沈先生整理文件时，不许任何人留在书房，在场的人都会被他打发到大厅去。',
      when:c => c.at('shen', 'papers') && c.awakeIn('书房', 'shen').length > 0,
      act:c => c.awakeIn('书房', 'shen').forEach(x => c.sneak(x, '大厅', `${c.name(x)}被沈先生打发到了大厅`, true)) },
    { id:'jie-fuel', who:'阿杰',
      truth:'阿杰独自在厨房抽烟时，会把发电机的油桶藏进柴房。',
      clue:{ room:'厨房', text:'柴房的木柴堆后面露出了油桶的一角。' },
      when:c => !c.w.noFuel && !c.w.fueled && c.at('jie', 'cig') && c.awakeIn('厨房', 'jie').length === 0,
      act:c => { c.w.noFuel = true; } },
    { id:'xu-spike', who:'许秘书',
      truth:'许秘书独自在厨房煮咖啡时，会往咖啡壶里下安眠的药。之后去厨房加油的老周会顺手喝一杯，巡视走廊时就会睡着。',
      clue:{ room:'厨房', text:'咖啡壶底有一层白色的沉淀。' },
      when:c => !c.w.spiked && c.at('xu', 'smoke') && c.awakeIn('厨房', 'xu').length === 0,
      act:c => { c.w.spiked = true; } },
    { id:'zhou-coffee', who:'老周', public:true, truth:'老周去厨房加油时会喝一杯咖啡。',
      when:c => c.at('zhou', 'fuel') && c.w.spiked,
      act:c => { c.w.sleepy = true; } },
    { id:'power', who:'发电机', public:true, truth:'午夜一到，发电机没油就会停。',
      when:c => c.t >= 2 && !c.w.fueled && !c.w.dark,
      act:c => { c.w.dark = true; c.see('大厅', '发电机停了，山庄一片漆黑'); } },
    { id:'jie-smoked', who:'阿杰', public:true, hideTruth:true, truth:'',
      when:c => c.at('jie', 'cig'),
      act:c => { c.w.jieSmoked = true; } },
    { id:'jie-drank', who:'阿杰', public:true, hideTruth:true, truth:'',
      when:c => c.at('jie', 'drink'),
      act:c => { c.w.jieDrank = true; } },
    { id:'jie-pills', who:'阿杰',
      truth:'阿杰在客房碰上林医生配药时，会趁他不注意顺走几片安眠药，放进同在客房的阿梅的茶里。阿梅之后到了主卧就会睡着。',
      clue:{ room:'客房', text:'阿梅的茶杯底有药片化开的残渣。' },
      when:c => !c.w.meiDrugged && c.at('lin', 'mix') && c.room('jie') === '客房' && c.awake('jie')
        && c.room('mei') === '客房' && c.awake('mei'),
      act:c => { c.w.meiDrugged = true; } },
    { id:'mei-doze', who:'阿梅',
      truth:'喝了下过药的茶，阿梅在主卧里会撑不住睡过去。',
      when:c => c.w.meiDrugged && c.room('mei') === '主卧' && c.awake('mei'),
      act:c => c.doze('mei', '阿梅靠着床边睡着了') },
    { id:'jie-drink', who:'阿杰',
      truth:'阿杰和老周在大厅碰上时，会拉着他灌酒。老周醉了以后，加油会把油洒掉，巡视走廊时会靠着墙睡着。',
      clue:{ room:'大厅', text:'大厅的茶几上多了两只空酒杯。' },
      when:c => !c.w.drunk && c.room('jie') === '大厅' && c.room('zhou') === '大厅' && c.awake('jie') && c.awake('zhou'),
      act:c => { c.w.drunk = true; } },
    { id:'zhou-doze', who:'老周',
      truth:'喝醉或是喝了下药咖啡的老周，巡视走廊时会靠着墙睡着。',
      when:c => c.at('zhou', 'patrol') && (c.w.drunk || c.w.sleepy),
      act:c => c.doze('zhou', '老周靠着墙打起了呼噜') },
    { id:'han-busy', who:'韩先生', public:true, hideTruth:true, truth:'',
      when:c => !c.at('han', 'snow') && !c.w.hanBusy,
      act:c => { c.w.hanBusy = true; } },
    { id:'han-cold', who:'韩先生',
      truth:'韩先生之前忙过别的事，停电时还醒着。他察觉到走廊冷得厉害，看完雪就回客房睡了。',
      when:c => c.w.dark && c.w.hanBusy && c.room('han') === '走廊' && c.awake('han'),
      act:c => c.sneak('han', '客房', '韩先生觉得太冷，看完雪回客房睡了', true) },
    { id:'han-tired', who:'韩先生',
      truth:'韩先生白天在雪里走了一整天，过了午夜，他在哪儿都会睡着。',
      when:c => c.t >= 2 && c.awake('han'),
      act:c => c.doze('han', '韩先生累得睡着了') },
    { id:'xu-swap', who:'许秘书',
      truth:'许秘书想要沈先生的命。安眠药送出去以后、沈先生服下之前，只要放药的房间里没人醒着，她就会溜过去把药换成毒药——放在主卧床头的药，她能赶在沈先生回房前换掉；放在书房的药，沈先生会直接带在身上。',
      clue:c => ({ room:c.w.pillIn, text:'安眠药的瓶盖拧得太紧，不像医生的手法。' }),
      when:c => c.w.alive && c.w.pillIn && !c.w.taken && !(c.at('shen', 'pill') && c.w.pillIn === '书房') && !c.w.tampered && c.awake('xu')
        && c.awakeIn(c.w.pillIn, 'xu').length === 0,
      act:c => { if (c.room('xu') !== c.w.pillIn) c.sneak('xu', c.w.pillIn, '许秘书溜过去换掉了安眠药'); c.w.tampered = true; c.w.poison = true; } },
    { id:'han-freeze', who:'韩先生',
      truth:'停电后鼓风机也停了，走廊冷得像冰窖。一整晚都在窗边看雪的韩先生没察觉到冷，就在窗边睡着了，到天亮前被冻死。',
      clue:{ room:'走廊', text:'走廊的窗边结了一层厚厚的霜。' },
      when:c => c.hour === '01:00' && c.w.dark && !c.w.hanBusy && c.room('han') === '走廊' && !c.awake('han') && !c.w.hanDead,
      act:c => { c.w.hanDead = true; c.see('走廊', '韩先生冻僵在了窗边', true); } },
    { id:'shen-insom', who:'沈先生', bad:true,
      truth:'沈先生午夜前拿不到医生的安眠药就会失眠。他会吞下自己私藏的强效药，剂量大得要命。',
      clue:{ room:'书房', text:'书桌抽屉里有一个空了的私人药瓶。' },
      when:c => c.w.alive && c.at('shen', 'insom') && c.t === 3,
      act:c => { c.w.alive = false; c.w.where = '书房'; } },
    { id:'shen-poison', who:'沈先生', bad:true,
      truth:'沈先生服下的安眠药如果被换过，他就再也醒不过来了。',
      clue:{ room:'主卧', text:'床头的水杯里有一股苦杏仁味。' },
      when:c => c.w.alive && c.at('shen', 'pill') && c.w.poison,
      act:c => { c.w.alive = false; c.w.where = '主卧'; } },
    { id:'shen-take', who:'沈先生', public:true, hideTruth:true, truth:'沈先生服下安眠药。',
      when:c => c.at('shen', 'pill') && !c.w.taken,
      act:c => { c.w.taken = true; } },
    { id:'han-axe', who:'韩先生',
      truth:'韩先生检查装备时，把冰镐留在了客房的桌上，之后再没拿走。',
      when:c => c.at('han', 'gear') && !c.w.axe,
      act:c => { c.w.axe = true; } },
    { id:'jie-arm', who:'阿杰',
      truth:'阿杰回房后看见桌上的冰镐，就顺手藏进了外套里。拿着冰镐，他就不怕路上撞见人了。',
      clue:{ room:'客房', text:'韩先生的冰镐不见了。' },
      when:c => c.w.axe && !c.w.armed && c.at('jie', 'jroom'),
      act:c => { c.w.armed = true; } },
    { id:'jie-rage', who:'阿杰', bad:true,
      truth:'阿杰喝过酒，脾气就压不住。他和沈先生单独待在一起（身边没有第三个醒着的人）时，会为了钱跟他吵起来，失手把他推倒。',
      clue:c => ({ room:c.room('shen'), text:`${c.room('shen')}的地毯上有打翻的酒和挣扎的痕迹。` }),
      when:c => c.w.alive && c.w.jieDrank && c.awake('jie') && c.awake('shen') && c.room('jie') === c.room('shen')
        && c.awakeIn(c.room('shen'), 'shen').length === 1,
      act:c => { c.w.alive = false; c.w.where = c.room('shen'); } },
    { id:'jie-kill', who:'阿杰', bad:true,
      truth:'阿杰欠了一大笔债，沈先生明早要宣布的正是剥夺他的继承权。他回房后会偷偷去找沈先生。去主卧要穿过走廊；去书房可以走走廊，也可以绕厨房的后楼梯，他会挑没人的那条。路上有人醒着、又亮着灯，他就不敢；沈先生身边有别人醒着，他也不敢。',
      clue:c => {
        const rm = c.room('shen');
        const text = c.w.armed ? `${rm}的门框上有一道被冰镐撬过的刻痕。`
          : c.w.jieSmoked ? `${rm}的门把手上沾着烟灰。`
          : c.w.jieDrank ? `${rm}的门把手上有一股酒气。`
          : `${rm}门口的地毯上，留下了客房拖鞋的印子。`;
        return { room:rm, text };
      },
      when:c => c.w.alive && c.at('jie', 'jroom')
        && (c.w.armed || !(c.awakeIn('走廊', 'jie').length && !c.w.dark)
            || (c.room('shen') === '书房' && !(c.awakeIn('厨房', 'jie').length && !c.w.dark)))
        && c.awakeIn(c.room('shen'), 'jie').filter(x => x !== 'shen').length === 0,
      act:c => { c.sneak('jie', c.room('shen'), '阿杰穿过走廊，摸进了沈先生的房间'); c.w.alive = false; c.w.where = c.room('shen'); } },
  ],
  badSeen:'沈先生遇害', badRoomFn:w => w.where,
  ending:w => w.alive ? { ok:true, text:'天亮了，搜救队敲开大门，沈先生亲自去迎接。' }
    : { ok:false, text:'搜救队赶到时，沈先生已经没了呼吸。' + (w.hanDead ? '韩先生也冻死在了走廊的窗边。' : '') },
});
