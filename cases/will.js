/* =========================================================
   第一案 · 烧不掉的遗嘱
   这个文件只描述一个案子。改它不会影响其他案子。
   ========================================================= */
registerCase({
  id:'will', tab:'第一案', title:'烧不掉的遗嘱',
  brief:'老爷的遗嘱今晚 22:00 由律师当众宣读，宣读后放回书房，明早送去公证。按原本的安排，到 01:00 遗嘱就会被烧成灰。律师的明线无法调整。',
  goal:'遗嘱留到 01:00 之后',
  hours:['22:00','23:00','00:00','01:00'],
  rooms:['书房','大厅','厨房','卧室'],
  scene:['遗嘱：书房的书桌上','书房壁炉：没生火','22:00 律师宣读遗嘱：财产归小女儿'],
  world:() => ({ will:true, fire:false, announced:false, litAt:99, scared:false, noWood:false }),
  items:w => [
    { room:'书房', text: w.will ? '遗嘱' : '遗嘱 ✕', bad:!w.will },
    { room:'书房', text: w.fire ? '炉火·燃' : '炉火·冷' },
  ],
  chars:[
    { id:'lawyer', name:'律师', short:'律', fixed:true, start:'read', tree:[
      { id:'read', label:'宣读遗嘱', room:'大厅', awake:true,
        does:(w, t, pos) => { w.announced = true; if (pos.son.room === '大厅') w.sonHeard = true; }, doesText:'律师宣读了遗嘱' },
      { id:'guard', label:'守着遗嘱', room:'书房', awake:true },
    ]},
    { id:'keeper', name:'女管家', short:'管', start:'wash', tree:[
      { id:'wash', label:'洗碗', room:'厨房', awake:true },
      { id:'soup', label:'煮汤', room:'厨房', awake:true },
      { id:'fire', label:'给书房生火', room:'书房', awake:true,
        does:(w, t) => {
          if (w.noWood) return '干柴都没了，书房的火生不起来';
          w.fire = true; w.litAt = t;
        }, doesText:'书房壁炉生上了火' },
      { id:'bed', label:'就寝', room:'卧室', awake:false },
    ]},
    { id:'son', name:'长子', short:'长', start:'hunt', tree:[
      { id:'game', label:'在厨房卸猎物', room:'厨房', awake:true },
      { id:'hunt', label:'打猎归来', room:'大厅', awake:true },
      { fork:[
        { cond:'若宣读遗嘱时他在大厅', test:w => w.sonHeard, path:[
          { id:'slam', label:'摔门回房', room:'卧室', awake:true },
          { id:'down', label:'半夜下楼', room:'大厅', awake:true },
        ]},
        { cond:'否则', path:[
          { id:'wine', label:'去厨房喝酒', room:'厨房', awake:true },
          { id:'roam', label:'醉醺醺地游荡', room:'大厅', awake:true },
        ]},
      ]},
    ]},
    { id:'girl', name:'小女儿', short:'女', start:'piano', tree:[
      { id:'write', label:'练字', room:'卧室', awake:true },
      { id:'piano', label:'弹琴', room:'大厅', awake:true },
      { fork:[
        { cond:'若书房生着火，而且她没被吓到', test:w => w.fire && !w.scared, path:[
          { id:'readw', label:'去书房看遗嘱', room:'书房', awake:true },
          { id:'copy', label:'抄写遗嘱', room:'书房', awake:true },
          { id:'sleepd', label:'伏在书桌上睡着', room:'书房', awake:false },
        ]},
        { cond:'否则', path:[
          { id:'bedg', label:'回房睡觉', room:'卧室', awake:false },
        ]},
      ]},
    ]},
  ],
  rules:[
    { id:'fire-out', who:'壁炉', public:true, truth:'壁炉里的柴只够烧三个钟点。',
      when:c => c.w.fire && c.t >= c.w.litAt + 3,
      act:c => { c.w.fire = false; c.w.burnedOut = true; c.see('书房', '壁炉里的火熄了'); } },
    { id:'scare', who:'长子',
      truth:'长子摔门回房时，要是小女儿也在卧室，会被吓得不轻。她之后就不敢一个人去书房了。',
      clue:{ room:'卧室', text:'小女儿说，她今晚不想一个人待着。' },
      when:c => !c.w.scared && c.at('son', 'slam') && c.room('girl') === '卧室' && c.awake('girl'),
      act:c => { c.w.scared = true; } },
    { id:'wood', who:'女管家',
      truth:'长子在厨房喝闷酒时，女管家心疼他，会把干柴都抱去给他烤火。之后书房的火就生不起来了。',
      clue:{ room:'厨房', text:'柴房里的干柴少了一大半，厨房的灶膛却烧得通红。' },
      when:c => !c.w.noWood && c.at('son', 'wine') && c.room('keeper') === '厨房' && c.awake('keeper'),
      act:c => { c.w.noWood = true; } },
    { id:'girl-cold', who:'小女儿',
      truth:'炉火熄了以后书房冷得厉害，待在书房的小女儿撑不住，会回房睡觉。',
      when:c => c.w.burnedOut && c.room('girl') === '书房' && c.awake('girl'),
      act:c => { c.sneak('girl', '卧室', '小女儿冷得受不了，回房睡了', true); c.doze('girl', '小女儿睡下了');
        c.see('卧室', '卧室的门关着，门缝底下透不出一点光'); } },
    { id:'lawyer-cold', who:'律师',
      truth:'书房没有炉火时，律师受不了冷，会偷偷溜去厨房烤火。',
      when:c => c.at('lawyer', 'guard') && !c.w.fire,
      act:c => c.sneak('lawyer', '厨房', '律师嫌书房太冷，溜去厨房烤火') },
    { id:'lawyer-doze', who:'律师',
      truth:'炉火生起的那个钟点律师还精神；之后书房暖烘烘的，他就会打起瞌睡。',
      when:c => c.at('lawyer', 'guard') && c.w.fire && c.t > c.w.litAt,
      act:c => { c.doze('lawyer', '律师在炉边打起了瞌睡');
        c.see('书房', c.t % 2 ? '书房里的翻页声停了好一阵，只剩炉火噼啪作响' : '书房里有人轻轻打着呼噜'); } },
    { id:'son-burn', who:'长子', bad:true,
      truth:'长子听到遗嘱后怀恨在心。半夜下楼时，只要书房里没人醒着，他就会溜进去把遗嘱烧掉。',
      clue:{ room:'书房', text:'壁炉边有猎靴留下的泥印。' },
      when:c => c.w.will && c.at('son', 'down') && c.awakeIn('书房', 'son').length === 0,
      act:c => { c.sneak('son', '书房', '长子溜进书房，烧掉了遗嘱'); c.w.will = false; } },
    { id:'son-accident', who:'长子', bad:true,
      truth:'长子喝醉后会四处游荡。书房里没有大人醒着时（小女儿拦不住醉汉），他会晃进去找老爷的白兰地，打翻的酒和烛台把遗嘱烧着了。',
      clue:{ room:'书房', text:'书桌下有一只打翻的酒杯，地毯湿了一片。' },
      when:c => c.w.will && c.at('son', 'roam') && c.awakeIn('书房', 'son').filter(x => x !== 'girl').length === 0,
      act:c => { c.sneak('son', '书房', '醉醺醺的长子晃进书房，打翻了酒杯'); c.w.will = false; } },
  ],
  hints:[
    '律师的明线无法调整。「守着遗嘱」不代表他一直醒着，也不代表他一直在书房。',
    '书房太冷，有人待不住；书房太暖，有人会犯困。',
    '壁炉里的火烧不了一整夜。',
    '两个人在同一个房间碰面，可能会改变第三个人之后的去向：有人会被吓到，有人会把东西送掉。',
    '长子在哪个钟点下楼，取决于他从自己明线的哪一格开始。',
  ],
  achievements:[
    { open:true, id:'kept', name:'完璧归赵', desc:'让遗嘱完好地留到天亮。', test:x => x.r.end.ok },
    { id:'ash', name:'柴尽火灭', desc:'书房的炉火在夜里熄灭了。', test:x => x.fired.has('fire-out') },
    { id:'bang', name:'砰！', desc:'有人摔门的时候，隔壁正好有人。', test:x => x.fired.has('scare') },
  ],
  badSeen:'遗嘱被烧了', badRoom:'书房',
  ending:w => w.will ? { ok:true, text:'01:00 过后，遗嘱还好好地放在书桌上。' } : { ok:false, text:'到了 01:00，书房里只剩一撮纸灰。' },
});
