/* =========================================================
   教学 · 生日蛋糕
   这个文件只描述一个案子。改它不会影响其他案子。
   ========================================================= */
registerCase({
  id:'tutorial', tab:'教学', title:'生日蛋糕',
  brief:'今晚是爸爸的生日，蛋糕放在厨房的餐桌上，要等他 20:00 下班回家。按原本的安排，蛋糕撑不到那时候。',
  goal:'蛋糕留到 20:00',
  hours:['18:00','19:00','20:00'],
  rooms:['卧室','客厅','厨房'],
  scene:['蛋糕：厨房的餐桌上'],
  // 教学步骤：done(s) 为真时打勾
  guide:[
    { text:'每一列是一个人，从上往下是他的时间点。点一个时间点，他这一夜就从那里开始。先点一下妈妈的时间轴。',
      done:s => !!s.touched.mom },
    { text:'点「推演这一夜」。每过一个钟点，每个人往下走一格，走到最后一格就停住。',
      done:s => s.runs.length > 0 },
    { text:'推演表只显示明线。妹妹明面上一直在客厅，厨房却留下了奶油脚印：她偷偷溜过去了，这就是暗线。痕迹和证词都记在下方的「推演记录」里。',
      done:s => s.runs.some(x => !x.r.end.ok) },
    { text:'妹妹在「写作业」之后分了叉，没走过的路显示为「？」，走哪条路的条件要靠自己推断。把她的起点改到「写作业」，再推演一次。',
      done:s => s.runs.some(x => x.starts.sis === 'hw') },
    { text:'让蛋糕留到 20:00。破案后可以查看「真实经过」和所有暗线。',
      done:s => s.solved },
  ],
  world:() => ({ cake:true, stored:false }),
  items:w => [{ room:'厨房', text: !w.cake ? '蛋糕 ✕' : w.stored ? '蛋糕（柜子里）' : '蛋糕', bad:!w.cake }],
  chars:[
    { id:'mom', name:'妈妈', short:'妈', start:'fold', tree:[
      { id:'fold', label:'叠衣服', room:'卧室', awake:true },
      { id:'store', label:'把蛋糕收进柜子', room:'厨房', awake:true,
        does:w => { if (!w.cake) return false; w.stored = true; }, doesText:'蛋糕被收进了柜子' },
      { id:'read', label:'看书', room:'客厅', awake:true },
    ]},
    { id:'sis', name:'妹妹', short:'妹', start:'tv2', tree:[
      { id:'hw', label:'写作业', room:'卧室', awake:true },
      { fork:[
        { cond:'若蛋糕已经收进柜子', test:w => w.stored, path:[
          { id:'tv1', label:'看电视', room:'客厅', awake:true },
        ]},
        { cond:'否则', path:[
          { id:'tv2', label:'看电视，惦记着蛋糕', room:'客厅', awake:true },
        ]},
      ]},
    ]},
  ],
  rules:[
    { id:'sis-eat', who:'妹妹', bad:true,
      truth:'妹妹惦记着蛋糕时，只要厨房里没人醒着，就会偷偷溜进厨房，把蛋糕吃掉。',
      clue:{ room:'厨房', text:'餐桌边有一串小小的奶油脚印。' },
      when:c => c.w.cake && !c.w.stored && c.at('sis', 'tv2') && c.awakeIn('厨房', 'sis').length === 0,
      act:c => { c.sneak('sis', '厨房', '妹妹溜进厨房，吃掉了蛋糕'); c.w.cake = false; } },
  ],
  achievements:[
    { open:true, id:'rookie', name:'新手侦探', desc:'完成教学，让蛋糕留到了 20:00。', test:x => x.r.end.ok },
  ],
  badSeen:'蛋糕不见了', badRoom:'厨房',
  ending:w => w.cake ? { ok:true, text:'20:00，爸爸回家时，蛋糕完好无损。' } : { ok:false, text:'爸爸回家时，蛋糕已经没了。' },
});
