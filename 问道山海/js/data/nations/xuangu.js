/* ===========================================================
 * 问道山海 · 玄股国 完整剧情链
 * 对应策划案第五卷 玄股国 · 大泽之渊（Q05）
 * 包含：序章（大泽之雾）+ 主线Q05_01/02/03 + 隐藏Q05_H1（沉没之城）
 *      + 支线Q05_S1/S2/S3 + 玄股国自由行动 + 四象试炼
 * 背景图：复用 assets/img/nations/ 现有资源（qing 系 / yum 系）
 * 好感度：STATE.addFavor / STATE.getFavor（沧溟cangming等）
 * 三结局：净魂 / 水魂 / 归一
 * =========================================================== */
(function (global) {
  'use strict';

  /* ---------- 公共路径引用（复用现有背景，避免引用不存在的图片） ---------- */
  const BG = {
    sig:     'assets/img/nations/xuangu-lake.jpg',       // 玄股国·专属主题（水底龙宫）
    lake:    'assets/img/nations/yum-tianyu-city.jpg',   // 大泽 / 浮岛城·天渊
    temple:  'assets/img/nations/yum-jitan.jpg',         // 水神殿 / 祭坛
    abyss:   'assets/img/nations/yum-zhuixinggu.jpg',    // 深渊 / 归墟入口
    mist:    'assets/img/nations/qing-fog-abyss.jpg',    // 迷雾区 / 蜃景幻境
    river:   'assets/img/nations/yum-channel.jpg',       // 水面 / 水脉 / 渡口
    trial:   'assets/img/nations/qing-shadow-altar.jpg', // 四象试炼 / 归墟幻境
    village: 'assets/img/nations/qing-taolin.jpg',       // 沉没之城 / 旧日幻境
    boss:    'assets/img/nations/qing-fying-boss.jpg'    // 混沌水神 Boss 战
  };

  /* ===========================================================
   * 序章 · 大泽之雾
   * =========================================================== */

  /** 入境入口（轩辕国结局「前往玄股国」跳转至此） */
  const SCENE_ENTRY = {
    id: 'xuangu_entry',
    title: '【玄股国·序】大泽渡口',
    bg: BG.sig,
    text:
`你辞别轩辕国的机关城，沿北境一路北上。空气逐渐变得潮湿，水汽中带着一丝清甜的气息。

大泽渡口没有陆地，只有一片延伸到视野尽头的湖面。湖水不是清澈的，是灰绿色的，水面上漂浮着厚厚的水藻和睡莲。空气中弥漫着潮湿的、略带腥甜的气味，像是雨后的森林，又像是……某种生物的呼吸。

[img]assets/img/npc/npc_cangming.jpg[/img]\n\n一艘小船从迷雾中缓缓驶出。船头站着一位少女，她手持一根水晶法杖，法杖顶端的水灵珠发出微弱的蓝光，驱散了周围的迷雾。她的长发是淡青色的，垂到腰际，发梢浸在水中，随着船的行进而轻轻摆动。

【沧溟】"外乡人。我……等你很久了。（微笑，但笑容中有一丝疲惫）水神殿的预言……说……当「四象之乱」平息后……会有一位「行者」……从大泽之南而来。你……解决了青丘的影狐……羽民的风魔……厌火的炎龙……轩辕的剑灵……对吗？"

她的眼睛是海蓝色的，深邃得像是你能从中看到自己的倒影。但那个倒影……比你苍老？比你年轻？还是……根本不是你？

【沧溟】"我是沧溟，水神殿祭司。也是……（停顿）……也是……「容器」的……预备者。"`,
    options: [
      { label: '「你看起来很累。这种负担……不该由你一个人承担。」', tag: '同情', onChoose: (p) => { STATE.addFavor(p, 'cangming', 20); }, next: 'xuangu_01_kuixu' },
      { label: '「「容器」是什么意思？」', tag: '询问', reply: '沧溟沉默良久：「水神封印……需要一个「生灵」作为「锚」，将污染锁在深渊里。我的母亲……是上一任容器。她三年前消失了。不是死了……是变成了水的一部分……」', next: 'xuangu_01_kuixu' },
      { label: '（注意水下的巨大黑影）', tag: '观察', reply: '你发现水下有巨大的黑影在跟随船只——不是鱼，太大了。是……玄龟？', replyTitle: '观察', next: 'xuangu_01_kuixu' }
    ]
  };

  /** 玄龟 · 水灵护符 */
  const SCENE_KUIXU = {
    id: 'xuangu_01_kuixu',
    title: '【玄股国·序】玄龟出',
    bg: BG.lake,
    text:
`水面突然破开，一只巨大的[highlight]玄龟[/highlight]浮出水面。它的壳直径足有三丈，壳上布满了古老的纹路——不是自然生长的，是……文字？是……历史？

【玄龟】（开口说话，声音像是水底的回响，低沉而缓慢）"……行……者……三百年……了……终于……有人……集齐了……四象之……印……（看向你）你……身上……有……青丘的……月……羽民的……风……厌火的……火……轩辕的……金……四象……已聚……「归墟」……将开……"

沧溟震惊地看着玄龟：

【沧溟】"玄龟大人！您……您说话了！三百年了……您……终于……"

【玄龟】（缓缓眨眼）"因为……「它」……也在……等待。等待……四象……归一。等待……「门」……打开。行者……你……不是……来解决……问题的。你……是……来……「完成」……某种……宿命的。"

它低下头，将一枚「[highlight]水灵护符[/highlight]」吐在你掌心。那是一枚由玄龟壳碎片打磨而成的护符，触手冰凉，但很快与你的体温融合。

【玄龟】"这……可以……让你……下潜至……深渊……底层。但……记住……在……最深处……不要……相信……你……看到的……任何……东西。因为……在……归墟……「真实」……与……「虚幻」……是……同一种……东西。"`,
    options: [
      { label: '（郑重收下水灵护符）', tag: '受符', onChoose: (p) => { STATE.addMaterial(p, 'MAT-XG07', 1); p.unlocked.add('shuiling_hufu'); Engine.log('获得水灵护符×1（可潜入深渊底层）', 'good'); }, next: 'xuangu_01_arrive' }
    ]
  };

  /** 抵达天渊城 */
  const SCENE_ARRIVE = {
    id: 'xuangu_01_arrive',
    title: '【玄股国·序】浮岛城 · 天渊',
    bg: BG.lake,
    text:
`沧溟带你驶入[highlight]浮岛城·天渊[/highlight]——玄股国最大的浮岛，政治与宗教中心。城市由巨大的浮木与水晶构成，建筑半沉于水中，街道是水面上的木板桥。空气中弥漫着水藻与莲花的气息。

沧溟带你来到[highlight]水神殿[/highlight]——一座半沉于水中的宏伟建筑。殿内没有烛火，照明来自墙壁上的「水灵珠」。殿底连接着水脉，通往深渊。

【大祭司】（沧溟的父亲，一个高大但佝偻的中年男子，皮肤苍白得近乎透明，眼睛是浑浊的灰白色）"沧溟。你带来了……外乡人。（看向你）预言……说……行者……可以……「净化」……深渊。但……预言……也……说……行者……可能……「打开」……归墟。"

他看向沧溟，眼神中有一种……病态的执着？

【大祭司】"沧溟……是……下一任……容器。她……已经……准备好了。对吗……我的……女儿？"

【沧溟】（身体僵硬，但声音平静）"……是的。父亲。我……准备好了。"

但她的手指……在颤抖。`,
    options: [
      { label: '「她不愿意！你在把自己的女儿变成祭品！」', tag: '反对', onChoose: (p) => { STATE.addFavor(p, 'cangming', 15); STATE.addEvil(p, -5); }, next: 'xuangu_01_secret' },
      { label: '「没有别的办法了吗？之前的国家……都有替代方案。」', tag: '询问', reply: '大祭司摇头：「水……不一样。水是「包容」的。它不会拒绝任何东西……所以也无法「驱逐」任何东西……只能「承载」。」', next: 'xuangu_01_secret' },
      { label: '（悄悄示意沧溟，午夜老渔头的船见）', tag: '私下', next: 'xuangu_01_secret' }
    ]
  };

  /** 老渔头之船 */
  const SCENE_SECRET = {
    id: 'xuangu_01_secret',
    title: '【玄股国·序】老渔头的船',
    bg: BG.river,
    text:
`午夜，大泽深处的一艘破旧渔船上。老渔头的船身刻满了避水符，船上弥漫着鱼腥味和烟草味。沧溟已经换下了祭司袍，穿着渔族的粗布衣裳，看起来……更像一个普通的少女。

【老渔头】（吐出一口烟）"外乡人。沧溟丫头……跟我说了……你的事。我……在大泽……打了一辈子鱼。我见过……水神……发怒。见过……深渊……翻涌。但……这次……不一样。"

【渊姬】（突然从水中浮出，她的半边身体已经透明化，可以看到下面的鱼骨和船板）"……所以……需要……「替代」。（看向你）外乡人。你……集齐了……四象之印。你……是……唯一……可以……进入……「归墟」……而不被……吞噬的……人。在……归墟……最深处……有……「水神之泪」……上古……水神……共工……留下的……最后……一滴……纯净……之水。它……可以……净化……一切。包括……虚月……之蚀。"

她透明的手指触碰你的额头，你感觉到一股冰凉的水流涌入脑海……然后，你看到了「归墟」的景象——一个倒悬的世界，中央有一滴巨大的、悬浮的水滴——「[highlight]水神之泪[/highlight]」。

【渊姬】"但……要拿到……水神之泪……你必须……通过……「[highlight]四象试炼[/highlight]」。青丘的……「月」……羽民的……「风」……厌火的……「火」……轩辕的……「金」……在……归墟……它们会……以……「心魔」……的……形态……重现。"`,
    options: [
      { label: '「我去。告诉我怎么进入归墟。」', tag: '接受', onChoose: (p) => { STATE.addFavor(p, 'yuanji', 20); STATE.addFavor(p, 'cangming', 25); }, next: 'xuangu_q05_01_trial_moon' },
      { label: '「四象试炼……如果我失败了会怎样？」', tag: '询问', reply: '渊姬：「你会……成为……归墟……的一部分。和……我的母亲……一样……永远……游荡……」', next: 'xuangu_q05_01_trial_moon' },
      { label: '「如果我去归墟，沧溟就不用当容器了吗？」', tag: '担忧', onChoose: (p) => { STATE.addFavor(p, 'cangming', 25); }, reply: '渊姬深深看你一眼：「若你愿承此责，沧溟……便不必再成为容器。但你要想清楚，这一步踏出，便再无回头之路。」', next: 'xuangu_q05_01_trial_moon' }
    ]
  };

  /* ===========================================================
   * 主线 Q05_01 · 深渊之影（四象试炼）
   * =========================================================== */

  /** 四象试炼战斗 · 月之倒影 */
  const SCENE_Q05_01_TRIAL_MOON_FIGHT = {
    id: 'xuangu_q05_01_trial_moon_fight',
    title: '【四象试炼·战斗】月之倒影',
    bg: BG.trial,
    text:
`你的倒影狰狞一笑，与你一般无二的招式席卷而来——这是你内心最不愿面对的自我。

【倒影】"击败我？你连自己都战胜不了！"

战斗一触即发！`,
    options: [],
    battle: {
      enemy: { name: '月之倒影', hp: 2200, atk: 120, def: 80, lv: 22, element: '水', bg: BG.trial },
      onWin: (p) => { if (global.Engine) Engine.log('与倒影一战，终将其击溃', 'good'); },
      onLose: (p) => { if (global.Engine) Engine.log('倒影更胜一筹，你被击退，回到月之试炼', 'evil'); },
      after: 'xuangu_q05_01_trial_wind'
    }
  };

  /** 四象试炼战斗 · 风魔残影 */
  const SCENE_Q05_01_TRIAL_WIND_FIGHT = {
    id: 'xuangu_q05_01_trial_wind_fight',
    title: '【四象试炼·战斗】风魔残影',
    bg: BG.trial,
    text:
`云瑶的残影暴怒，紫黑双翼展开，化为风魔幼体扑杀而来——

战斗一触即发！`,
    options: [],
    battle: {
      enemy: { name: '风魔残影', hp: 2500, atk: 130, def: 82, lv: 24, element: '风', bg: BG.trial },
      onWin: (p) => { if (global.Engine) Engine.log('残影暴怒，化为风魔幼体，你将其击溃', 'good'); },
      onLose: (p) => { if (global.Engine) Engine.log('不敌风魔残影，你被击退，回到风之试炼', 'evil'); },
      after: 'xuangu_q05_01_trial_fire'
    }
  };

  /** 四象试炼战斗 · 火海幻象 */
  const SCENE_Q05_01_TRIAL_FIRE_FIGHT = {
    id: 'xuangu_q05_01_trial_fire_fight',
    title: '【四象试炼·战斗】火海幻象',
    bg: BG.trial,
    text:
`炎龙残影催动紫黑火焰，化作滔天火海将你吞没——你只能强行杀出重围！

战斗一触即发！`,
    options: [],
    battle: {
      enemy: { name: '火海幻象·炎龙', hp: 2600, atk: 138, def: 85, lv: 25, element: '火', bg: BG.trial },
      onWin: (p) => { if (global.Engine) Engine.log('你杀出火海幻境，火势渐熄', 'good'); },
      onLose: (p) => { if (global.Engine) Engine.log('火海难敌，你被击退，回到火之试炼', 'evil'); },
      after: 'xuangu_q05_01_trial_metal'
    }
  };

  /** 四象试炼战斗 · 机关兽军团 */
  const SCENE_Q05_01_TRIAL_METAL_FIGHT = {
    id: 'xuangu_q05_01_trial_metal_fight',
    title: '【四象试炼·战斗】机关兽军团',
    bg: BG.trial,
    text:
`公输月的残影暴怒，挥手唤出机关兽军团，铺天盖地压来——

战斗一触即发！`,
    options: [],
    battle: {
      enemy: { name: '机关兽军团', hp: 3000, atk: 148, def: 95, lv: 28, element: '金', bg: BG.trial },
      onWin: (p) => { if (global.Engine) Engine.log('残影暴怒，化为机关兽军团，你将其尽数击溃', 'good'); },
      onLose: (p) => { if (global.Engine) Engine.log('机关军团势不可挡，你被击退，回到金之试炼', 'evil'); },
      after: 'xuangu_q05_01_guixu'
    }
  };

  /** 四象试炼 · 月之试炼 */
  const SCENE_Q05_01_TRIAL_MOON = {
    id: 'xuangu_q05_01_trial_moon',
    title: '【主线 Q05_01】四象试炼 · 月',
    bg: BG.trial,
    text:
`持有水灵护符，你潜入深渊。水压随着深度增加而增大，但护符在你周围形成了一层透明的气泡，将压力分散。

深度约五百丈，你来到了「[highlight]归墟入口[/highlight]」——一个巨大的、倒悬的水下洞穴。一股温和而不可抗拒的吸力，将你拉入其中。然后，世界颠倒了。

你站在一片水面上——不是站在船上，是站在水面上，水面像镜子一样承受着你的重量。天空中是两轮月亮：一轮银白色的，一轮紫黑色的。

紫黑色的月亮中，走出了……你的倒影？你的倒影从水面下升起，与你面对面。

【倒影】"你……以为……你……拯救了……青丘？你……以为……你……做出了……「正确」……的……选择？（笑）不。你……只是……把……痛苦……转移了。墨姬……自由了……但……虚月……还在。它……只是……去了……别的……地方。你……没有……解决……问题。你……只是……拖延了……它。"`,
    options: [
      { label: '「……也许你说得对。但我尽力了。」', tag: '承认', onChoose: (p) => { p.unlocked.add('yue_renke'); Engine.log('倒影消散，获得「月之认可」', 'good'); }, next: 'xuangu_q05_01_trial_wind' },
      { label: '「至少我尝试了。你呢？你只会说风凉话。」', tag: '反驳', next: 'xuangu_q05_01_trial_moon_fight' }
    ]
  };

  /** 四象试炼 · 风之试炼 */
  const SCENE_Q05_01_TRIAL_WIND = {
    id: 'xuangu_q05_01_trial_wind',
    title: '【主线 Q05_01】四象试炼 · 风',
    bg: BG.trial,
    text:
`世界再次颠倒。你站在万丈高空的风灵浮岛上，但浮岛正在坠落。一个长着紫黑色翅膀的身影——云瑶的残影——站在岛边。

【云瑶残影】"你……给了我……翅膀……但……也……给了我……「诅咒」。羽民……飞翔……是因为……风灵。但……风灵……来源于……虚月。我们……从来……没有……真正……自由过。你……只是……让我们……从……一个……牢笼……飞到了……另一个……"`,
    options: [
      { label: '「自由不是状态，是选择。你选择飞翔，这就是自由。」', tag: '安慰', onChoose: (p) => { p.unlocked.add('feng_renke'); Engine.log('残影微笑，获得「风之认可」', 'good'); }, next: 'xuangu_q05_01_trial_fire' },
      { label: '「你不是云瑶。云瑶不会说这种话。」', tag: '战斗', next: 'xuangu_q05_01_trial_wind_fight' }
    ]
  };

  /** 四象试炼 · 火之试炼 */
  const SCENE_Q05_01_TRIAL_FIRE = {
    id: 'xuangu_q05_01_trial_fire',
    title: '【主线 Q05_01】四象试炼 · 火',
    bg: BG.trial,
    text:
`世界再次翻转。你站在焚天火山口，一个被紫黑火焰环绕的身影——炎龙的残影——在火海中看着你。

【炎辰残影】"火……净化……一切。包括……「错误」的选择。你……在……厌火国……的……选择……是……「妥协」。你……没有……彻底……消灭……邪恶。你……只是……和……它……「谈判」。这……不是……正义。这……是……软弱。"`,
    options: [
      { label: '「正义不是消灭，是理解。炎辰教我的。」', tag: '坚持', onChoose: (p) => { p.unlocked.add('huo_renke'); Engine.log('残影愣住，然后微笑消散，获得「火之认可」', 'good'); }, next: 'xuangu_q05_01_trial_metal' },
      { label: '「……也许……我应该更坚决……」', tag: '动摇', next: 'xuangu_q05_01_trial_fire_fight' }
    ]
  };

  /** 四象试炼 · 金之试炼 */
  const SCENE_Q05_01_TRIAL_METAL = {
    id: 'xuangu_q05_01_trial_metal',
    title: '【主线 Q05_01】四象试炼 · 金',
    bg: BG.trial,
    text:
`世界再次翻转。你站在机关塔废墟中，一个戴着眼罩、眼中带着仇恨的身影——公输月的残影——怒视着你。

【公输月残影】"你……背叛了……「信任」。我……以为……你是……「朋友」。但……你……只是……利用……我……获取……权力。七号……死了。因为……你。你……有什么……资格……自称……「行者」？"`,
    options: [
      { label: '「……对不起。如果我能重来……」', tag: '承担', onChoose: (p) => { p.unlocked.add('jin_renke'); Engine.log('残影冷笑：「重来？没有重来。只有……「偿还」。」然后消散，获得「金之认可」', 'good'); }, next: 'xuangu_q05_01_guixu' },
      { label: '「那是你的选择，不是我的。」', tag: '否认', next: 'xuangu_q05_01_trial_metal_fight' }
    ]
  };

  /** 归墟 · 水神之泪 */
  const SCENE_Q05_01_GUIXU = {
    id: 'xuangu_q05_01_guixu',
    title: '【主线 Q05_01】归墟 · 水神之泪',
    bg: BG.abyss,
    text:
`四象试炼完成后，你来到了归墟最深处。

那里，悬浮着「[highlight]水神之泪[/highlight]」。它比你想象中更大——直径约三丈的巨大水滴，散发着柔和的蓝光。但蓝光周围，紫黑色的雾气已经侵蚀了约一半的空间。

在水神之泪下方，跪着一个身影。那是沧溟的母亲？不，那是……更古老的存在。

【共工残魂】（从水神之泪中浮现，是一个由水流构成的巨大人形，面容模糊但威严）"……行者……你……通过了……试炼。但……「水神之泪」……不是……「礼物」。是……「责任」。拿起它……意味着……你……要成为……新的……「守护者」。不是……容器……是……「伙伴」。与……大泽……共生……而非……统治……你……愿意……吗？"`,
    options: [
      { label: '「我愿意。不是作为容器，是作为守护者。」', tag: '愿意', onChoose: (p) => { STATE.addMaterial(p, 'MAT-XG08', 1); p.unlocked.add('shuishen_lei'); Engine.log('获得「水神之泪」：你成为大泽的守护者', 'good'); }, next: 'xuangu_q05_01_routes' },
      { label: '「我不想被绑定。有别的方法吗？」', tag: '拒绝', reply: '共工残魂叹息：「那么……只能「牺牲」一个「容器」……来暂时稳定封印……」', next: 'xuangu_q05_01_routes' }
    ]
  };

  /** 三路线分歧 */
  const SCENE_Q05_01_ROUTES = {
    id: 'xuangu_q05_01_routes',
    title: '【主线 Q05_01】三路抉择',
    bg: BG.abyss,
    text:
`从归墟归来，你带着水神之泪（或空着的手）。面对大泽的污染与沧溟的命运，三条道路摆在面前——

【[highlight]路线A·净魂[/highlight]】以水神之泪净化大祭司与大泽的虚月污染，拯救沧溟于容器之厄。

【[highlight]路线B·水魂[/highlight]】若未获水神之泪，或选择让沧溟自愿成为容器，以「陪伴」维系她的意识，使容器成为「融合」。

【[highlight]路线C·归一[/highlight]】（须恶念深重）释放虚月，让大泽吞噬一切，化作「水体」，你成为「空壳」。`,
    options: [
      { label: '「走净化之路，以水神之泪救大泽。」', tag: '净魂', onChoose: (p) => { p.q05_route = 'jinghua'; }, next: 'xuangu_q05_02_main' },
      { label: '「（若未持水神之泪）让沧溟成为容器，我陪她到底。」', tag: '水魂', onChoose: (p) => { p.q05_route = 'shuihun'; }, next: 'xuangu_q05_02_main' },
      { label: '「（若恶念≥55）归一路线，让一切归一。」', tag: '归一', require: 'evil_gte', requireValue: 55, onChoose: (p) => { p.q05_route = 'guixu'; }, next: 'xuangu_q05_02_main' }
    ]
  };

  /* ===========================================================
   * 主线 Q05_02 · 大泽之战
   * =========================================================== */

  /** 返回天渊 · 大祭司阻挠 */
  const SCENE_Q05_02_MAIN = {
    id: 'xuangu_q05_02_main',
    title: '【主线 Q05_02】水神殿前',
    bg: BG.temple,
    text:
`当你带着水神之泪（或空着手）返回天渊时，发现城市……变了。水面上的迷雾完全变成了紫黑色，水中的鱼群全部消失，取而代之的是漂浮的、透明的人形——「[highlight]水蚀者[/highlight]」。

水神殿前，大祭司站在台阶上，身后是全部水神殿的祭司。他们的眼睛……也变成了紫黑色？

【大祭司】（声音不再是人类的，是某种液体流动的声音）"……你……回来了。但……太迟了。虚月……已经……与……大泽……融合。水神封印……不再是……「封印」……是……「门」。而……我……是……「守门人」。"

他的身体开始透明化。他抬起手，水面开始翻涌，无数水蚀者从水中升起，形成了包围圈。

【沧溟】（挡在你面前，法杖横在胸前）"父亲……你已经……不是……你了。虚月……吞噬了……你的……理智。我……不会……让你……打开……归墟。"`,
    options: [
      { label: '（依先前抉择，走向所选之路）', tag: '抉择', next: null, onChoose: (p) => {
        const r = p.q05_route || 'jinghua';
        if (r === 'guixu') App.goto('xuangu_q05_02_guixu');
        else if (r === 'shuihun') App.goto('xuangu_q05_02_shuihun');
        else App.goto('xuangu_q05_02_jinghua');
      } }
    ]
  };

  /** 净化路线 · 大祭司战 */
  const SCENE_Q05_02_JINGHUA = {
    id: 'xuangu_q05_02_jinghua',
    title: '【主线 Q05_02】大祭司 · 虚月化身',
    bg: BG.boss,
    text:
`你选择净化之路。突破水蚀者军团，你逼近大祭司，将「水神之泪」的力量导入他体内。

紫黑色的迷雾中，大祭司·虚月化身发出震耳欲聋的咆哮，水蚀者军团从四面八方涌来。`,
    options: [],
    battle: {
      enemy: { name: '大祭司·虚月化身', hp: 5000, atk: 165, def: 108, lv: 32, element: '水', bg: BG.boss },
      onWin: (p) => {
        if (global.Engine) Engine.log('击败大祭司·虚月化身', 'good');
        STATE.completeQuest(p, 'XUANGU_DAJISI_SLAIN');
        p.realm.exp = (p.realm.exp || 0) + 2200;
        STATE.addMaterial(p, 'MAT-XG06', 1);
        if (global.Engine) Engine.toast('经验+2200，获得水神之鳞', 'gold');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌大祭司，重伤退却', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.1));
      },
      after: 'xuangu_q05_02_jinghua_after'
    }
  };

  /** 净化 · 成功 */
  const SCENE_Q05_02_JINGHUA_AFTER = {
    id: 'xuangu_q05_02_jinghua_after',
    title: '【主线 Q05_02】净化成功',
    bg: BG.lake,
    text:
`净化成功的瞬间，水神之泪爆发出耀眼的蓝光，紫黑色的迷雾被驱逐、净化。大祭司的身体从透明恢复为实体，他倒在地上，眼神恢复了清明。

【大祭司】（虚弱地）"沧溟……我……对不起……你……和你的……母亲……我……只是……害怕……失去……权力……害怕……失去……「控制」……但……「控制」……从来……不是……守护……的……方法……"

他看向沧溟，微笑：

【大祭司】"你……比我……勇敢。去……成为……真正的……守护者……吧……不是……容器……是……「希望」……"

他的手垂下，生命气息消散。但不是被杀死……是……解脱？

【沧溟】（跪在水中，抱着父亲的遗体，泪水融入大泽）"父亲……我……原谅你……"

水神之泪融入大泽，水面恢复了清澈的蓝绿色。水蚀者们……微笑消散，化为无数光点，回归大泽。`,
    options: [
      { label: '（见证大泽重归清澈）', tag: '净魂', onChoose: (p) => { STATE.completeQuest(p, 'XUANGU_CLEARED'); STATE.completeQuest(p, 'Q05_MAIN_DONE'); STATE.addFavor(p, 'cangming', 30); }, next: 'xuangu_q05_03_jinghun' }
    ]
  };

  /** 水魂路线 · 陪伴 */
  const SCENE_Q05_02_SHUHUN = {
    id: 'xuangu_q05_02_shuihun',
    title: '【主线 Q05_02】水魂 · 容器',
    bg: BG.abyss,
    text:
`你选择水魂之路。没有水神之泪，或选择不使用，沧溟会自愿成为容器。

【沧溟】"……没有……别的……办法了。（微笑，那笑容悲伤而美丽）我……早就……知道……会有……这一天。从……母亲……消失……的……那天……起……我……就……知道……"

她走向水神殿，走向深渊入口。

你选择[highlight]陪伴[/highlight]到底。沧溟走入深渊，你握住她的手，一同下沉。在深渊最深处，她将自己融入水神封印，但你的存在……让封印发生了微妙的变化。

封印不再是一个「牢笼」，而是一个「花园」。沧溟的意识没有消散，而是成为了花园的「园丁」。她可以在大泽的任何地方以「水形」显现，与你对话。

【沧溟】（从水中浮现，身体由水流构成，但面容清晰）"……原来……「容器」……不是……「囚禁」……是……「融合」。我……感觉……到了……大泽的……每一滴水……每一条鱼……每一个……生灵……我……不是……孤独……的……"`,
    options: [
      { label: '（握紧她如水的指尖）', tag: '陪伴', onChoose: (p) => { STATE.completeQuest(p, 'XUANGU_CLEARED'); STATE.completeQuest(p, 'Q05_MAIN_DONE'); STATE.addFavor(p, 'cangming', 30); p.unlocked.add('linghun_lianjie'); Engine.log('你与沧溟建立「灵魂链接」', 'good'); }, next: 'xuangu_q05_03_shuihun' }
    ]
  };

  /** 归一路线 · 归墟开启 */
  const SCENE_Q05_02_GUIXU = {
    id: 'xuangu_q05_02_guixu',
    title: '【主线 Q05_02】归墟 · 归一',
    bg: BG.boss,
    text:
`你选择归一路线。放任虚月与大泽融合，大祭司成功打开归墟。

【大祭司】"……门……开了……归墟……将……吞噬……一切……然后……重生……"

水面裂开，深渊扩大，归墟的吸力将天渊城拉入水中。不是毁灭……是……「回归」。所有生灵……融入大泽……成为……「一体」……

【混沌水神】（从归墟中完全浮现，身躯由大泽的全部水流构成，紫黑色的眼睛俯瞰着世界）"……终于……完整了……虚月……与水……融合……我……是……「新神」……"

沧溟在最后一刻看向你，眼神中没有仇恨，只有……怜悯？

【沧溟】"……你……以为……你……获得了……力量。但……你……只是……成为了……「空壳」……一个……让……「它」……居住……的……房子……"`,
    options: [
      { label: '（成为空壳，拥抱混沌水神之力）', tag: '归一', onChoose: (p) => { STATE.completeQuest(p, 'XUANGU_CLEARED'); STATE.completeQuest(p, 'Q05_MAIN_DONE'); STATE.addEvil(p, 30); p.unlocked.add('shuishen_huashen'); Engine.log('获得「水神化身」形态', 'evil'); }, next: 'xuangu_q05_03_guiyi' }
    ]
  };

  /* ===========================================================
   * 主线 Q05_03 · 三结局
   * =========================================================== */

  /** 净魂结局 */
  const SCENE_Q05_03_JINGHUN = {
    id: 'xuangu_q05_03_jinghun',
    title: '【玄股国·终】净魂',
    bg: BG.lake,
    text:
`大泽恢复了清澈，迷雾变回了白色，水生物重新繁衍。沧溟成为了新任大祭司，但她废除了「容器」制度，建立了「守护者议会」——由水祭司、渔族、渊民共同决策。

【沧溟】（站在水神殿前，面向大泽）"今天……我们不祭祀……「牺牲」。我们祭祀……「选择」。每一个……选择……守护……而非……控制……的……人……都是……「水神」。"

玄龟浮出水面，背上的壳纹发出了三千年来最亮的光芒。

【玄龟】"……大泽……平静了。但……「它」……没有……消失。只是……沉睡。在……其他……地方……等待。行者……你的……旅程……还没有……结束。五国……之外……还有……「归墟」……还有……「山海」……的……尽头……"

【净魂结局】
- 玄股国进入「净魂时代」，大泽成为圣地
- 沧溟成为可招募队友「大祭司·沧溟」（SSR级）
- 玄龟成为可召唤灵宠「归墟玄龟」（UR级）`,
    options: [
      { label: '「愿大泽永宁，水天同澈。」（玄股国·完）', tag: '完', onChoose: (p) => { STATE.addFavor(p, 'cangming', 30); p.unlocked.add('cangming_recruit'); }, next: 'xuangu_end' }
    ]
  };

  /** 水魂结局 */
  const SCENE_Q05_03_SHUHUN = {
    id: 'xuangu_q05_03_shuihun',
    title: '【玄股国·终】水魂',
    bg: BG.lake,
    text:
`沧溟成为了大泽的一部分，但她的意识还在。你可以在任何时候、任何水域与她对话。

【沧溟】（从一杯茶的水面中浮现，微笑）"……这样……也……不错。我……可以……看到……很多……风景。你……喝茶……的……样子……很……有趣……"

老渔头成为了你的「向导」，带你探索大泽的每一个角落。渊姬成为了新任大祭司，推行「渊民解放」政策。

【水魂结局】
- 沧溟以「水魂」形态存在，可在任何水域提供辅助
- 渊姬成为新任大祭司
- 解锁「灵魂链接」系统`,
    options: [
      { label: '「江湖再见，水魂常在。」（玄股国·完）', tag: '完', onChoose: (p) => { STATE.addFavor(p, 'yuanji', 20); p.unlocked.add('linghun_lianjie'); }, next: 'xuangu_end' }
    ]
  };

  /** 归一结局 */
  const SCENE_Q05_03_GUIYI = {
    id: 'xuangu_q05_03_guiyi',
    title: '【玄股国·终】归一',
    bg: BG.abyss,
    text:
`大泽吞噬了一切，但……不是毁灭。是……「融合」。所有生灵的意识在大泽中共存，形成了一个巨大的、统一的「水体意识」。

【混沌水神】（声音从每一滴水中传来）"……没有……痛苦……没有……孤独……没有……选择……只有……「存在」……永恒……的……「存在」……你……想要……什么？这里……有……一切……"

你成为了「空壳」——混沌水神在人间的化身。你可以使用水神的力量，但你的自我意识……正在逐渐被稀释。

【归一结局】
- 获得「水神化身」形态（限时变身，全属性+100%）
- 玄股国成为「水体」，所有NPC融入大泽`,
    options: [
      { label: '（与水体合一，感受无尽的「存在」）', tag: '归一', onChoose: (p) => { STATE.addEvil(p, 10); }, next: 'xuangu_end' }
    ]
  };

  /** 玄股国结局收束 */
  const SCENE_END = {
    id: 'xuangu_end',
    title: '【玄股国·终】归墟之始',
    bg: BG.lake,
    text:
`你立于大泽之畔，望着恢复了澄澈（或已归一的）水面。五国——青丘、羽民、厌火、轩辕、玄股——的故事，都已走过。

玄龟低沉的声音在你心中回响：
"四象……已聚……五方……已平……但……「归墟」……的……大门……只是……初启。行者……真正的……旅程……才刚刚……开始……"

远方，山海大陆的尽头，传来一阵若有若无的……「门」开启的……轰鸣。

【恭喜完成玄股国主线·第五境·完】

前五国剧情线全部完成。你已集齐「四象之印」，真正的考验——[highlight]归墟[/highlight]——正在等待。

大泽以东，鸣海的方向传来若有若无的鲸歌——那是[highlight]讙头国[/highlight]在呼唤新的行者。`,
options: [
  { label: '东渡鸣海，前往讙头国', tag: '东渡', next: 'huantou_entry' }
]
};

  /* ===========================================================
   * 隐藏任务 Q05_H1 · 沉没之城
   * =========================================================== */

  const SCENE_Q05_H1 = {
    id: 'xuangu_q05_h1',
    title: '【隐藏 Q05_H1】沉没之城',
    bg: BG.village,
    text:
`在深渊中层，你发现了一座完全沉没的古代城市。建筑风格与玄股国完全不同——不是浮木与水晶，而是……青石与白玉？像是……另一个文明？

你潜入城中，发现街道上……有「居民」。不是人类，是……透明的、由水构成的「虚影」。它们像生前一样生活——有的在街边摆摊，有的在河边洗衣，有的在庭院中追逐嬉戏。它们没有注意到你。

【渊姬】（不知何时出现在你身边，声音低沉）"这是……「沉没之城」。三千年前……虚月第一次……侵蚀……大泽……时……被……沉入……水中的……城市。这里的……人……没有……逃走。他们……选择……与……城市……一同……沉入……深渊……（停顿）……守护……更深处的……封印。"

她指向城中心一座坍塌的宫殿：

【渊姬】"那里……曾是……「共工」……的……神殿。也是……大泽……最初的……「锚」。"`,

    options: [
      { label: '（走向共工神殿的废墟）', tag: '探秘', next: 'xuangu_q05_h1_palace' }
    ]
  };

  /** 隐藏 · 共工神殿 */
  const SCENE_Q05_H1_PALACE = {
    id: 'xuangu_q05_h1_palace',
    title: '【隐藏 Q05_H1】共工神殿',
    bg: BG.trial,
    text:
`你走进共工神殿的废墟。中央是一座祭坛，祭坛上放着一块残破的石碑。石碑上刻着古老的文字：

「吾共工，治水千载，以身为锚，镇归墟于深渊之下。后世若有人，见此碑而心有所感，愿承吾志，当以一滴真泪，滴于碑上。吾之残魂，将予其「水心」，以御天下万水。」

你望向石碑，心中忽然涌起一种莫名的触动。你用指尖，轻轻在石碑上划下一道……湿润的痕迹。

石碑微微发光。一滴晶莹的水滴从碑中升起，缓缓落入你的眉心。

【共工残魂】（声音温和）"……原来……你……真的……愿意……承……这份……责任。好……「水心」……予你……愿……大泽……永宁……"`,
    options: [
      { label: '（感受「水心」融入灵魂的清凉）', tag: '受水心', onChoose: (p) => { p.unlocked.add('shuixin'); STATE.addFavor(p, 'xuangui', 30); Engine.log('获得「水心」：水系威力+30%，可潜入任何水域', 'good'); }, next: 'xuangu_q05_h1_after' }
    ]
  };

  /** 隐藏 · 后续 */
  const SCENE_Q05_H1_AFTER = {
    id: 'xuangu_q05_h1_after',
    title: '【隐藏 Q05_H1】沉没之城的秘密',
    bg: BG.village,
    text:
`渊姬在殿外等你。她看着你眉心泛起的水光，眼中有一丝欣慰：

【渊姬】"沉没之城……的人……终于……等到了……一个……愿意……继承……「共工」……遗志的……人。（她透明的手轻触你的肩）我们……渊民……世代……在……深渊……边缘……打捞……遗物……为的……就是……等待……这样一个……人。你……是……第一个……让我……觉得……等待……值得的……人。"

【隐藏任务完成】
- 获得「水心」：水系威力+30%，可潜入任何水域
- 渊姬好感 +30
- 玄龟好感 +30`,
    options: [
      { label: '（向沉没之城的先民们深深一拜）', tag: '致敬', onChoose: (p) => { STATE.addFavor(p, 'yuanji', 30); }, next: 'xuangu_q05_01_routes' }
    ]
  };

  /* ===========================================================
   * 支线 Q05_S1 · 玄龟的纹章
   * =========================================================== */

  const SCENE_Q05_S1 = {
    id: 'xuangu_q05_s1',
    title: '【支线 Q05_S1】玄龟的纹章',
    bg: BG.lake,
    text:
`玄龟缓缓浮出水面，将巨大的头颅转向你，背上的壳纹微微发光。

【玄龟】"行者……我……背上的……纹章……记载着……大泽……三千年……的……历史。但……中间……有一段……被……「水蚀」……侵蚀……模糊了。（停顿）那……是……三千年前……虚月……第一次……降临……时……发生……的……事。你……愿意……帮我……补全……这段……历史……吗？"

你需要找到大泽各处散落的[highlight]水蚀石碑[/highlight]，将上面的铭文拓印下来，为玄龟补全那段被遗忘的历史。`,
    options: [
      { label: '「我去寻找那些石碑。」', tag: '寻碑', onChoose: (p) => { p.unlocked.add('xuangui_stele'); }, next: 'xuangu_q05_s1_stele' },
      { label: '「（暂缓）日后再说。」', tag: '暂缓', next: 'xuangu_q05_01_routes' }
    ]
  };

  /** 支线S1·补全 */
  const SCENE_Q05_S1_STELE = {
    id: 'xuangu_q05_s1_stele',
    title: '【支线 Q05_S1】补全纹章',
    bg: BG.lake,
    text:
`你在迷雾区、沉没之城边缘、以及深渊入口，找到了三块水蚀石碑。将铭文拓印完毕后，玄龟闭目良久。

当它再次睁眼时，眼中泛起深邃的光芒：

【玄龟】"……原来……如此。三千年前……虚月……第一次……降临……是……共工……以……一己之身……承受……了……「侵蚀」……才……保住了……大泽。它……不是……战败……是……「守护」……"

玄龟的壳纹重新亮起，完整的三千年历史，终于补全。

【支线完成】
- 玄龟好感 +30
- 获得「归墟玄龟」的认可（可乘载全队水下行动）`,
    options: [
      { label: '（轻抚玄龟布满历史的龟壳）', tag: '受赠', onChoose: (p) => { STATE.addFavor(p, 'xuangui', 30); p.unlocked.add('xuangui_mount'); }, next: 'xuangu_q05_01_routes' }
    ]
  };

  /* ===========================================================
   * 支线 Q05_S2 · 渊民之痛
   * =========================================================== */

  const SCENE_Q05_S2 = {
    id: 'xuangu_q05_s2',
    title: '【支线 Q05_S2】渊民之痛',
    bg: BG.mist,
    text:
`你在深渊边缘，遇到一群[highlight]渊民[/highlight]——他们世代居住在深渊附近，靠打捞深渊遗物为生，最易受水毒侵蚀。许多渊民的身体已经出现了透明化的迹象。

一个年幼的渊民女孩怯生生地拉住你的衣角，她的半条手臂已经透明：

【渊民女孩】"哥哥……姐姐……听说……你……能……救……大泽……那……你能不能……救救……我们……渊民……？我们……不想……变成……水蚀者……"`,
    options: [
      { label: '「我会想办法，让渊民不再受水毒侵蚀。」', tag: '承诺', onChoose: (p) => { STATE.addFavor(p, 'yuanji', 20); }, next: 'xuangu_q05_s2_help' },
      { label: '「（握紧她透明的小手，沉默片刻）」', tag: '沉默', onChoose: (p) => { STATE.addFavor(p, 'yuanji', 15); }, next: 'xuangu_q05_s2_help' }
    ]
  };

  /** 支线S2·帮助 */
  const SCENE_Q05_S2_HELP = {
    id: 'xuangu_q05_s2_help',
    title: '【支线 Q05_S2】渊民解放',
    bg: BG.village,
    text:
`在你的推动下，渊民们的处境得到了改善。渊姬号召水祭司议会正视渊民受水毒侵蚀的问题，并联合沧溟制定了「渊民防护」方案——用净化的水灵珠为渊民建立防护结界，不再让他们用身体去过滤深渊的毒素。

渊民女孩的手臂上，透明化的痕迹渐渐褪去，恢复了正常的肤色。她开心地抱住你：

【渊民女孩】"谢谢……哥哥……姐姐！我……可以……长大……了！"

渊姬望着这一幕，眼中泛起水光：

【渊姬】"……三千年……了……渊民……终于……等到了……被……「看见」……的……一天。"

【支线完成】
- 渊民获得「渊民防护」结界，不再受水毒侵蚀
- 渊姬好感 +20`,
    options: [
      { label: '（望着女孩重归健康的笑容）', tag: '欣慰', onChoose: (p) => { STATE.addFavor(p, 'yuanji', 20); }, next: 'xuangu_q05_01_routes' }
    ]
  };

  /* ===========================================================
   * 支线 Q05_S3 · 沧溟的心结
   * =========================================================== */

  const SCENE_Q05_S3 = {
    id: 'xuangu_q05_s3',
    title: '【支线 Q05_S3】沧溟的心结',
    bg: BG.temple,
    text:
`你发现沧溟独自站在水神殿的水灵珠前，望着自己映在水中的倒影出神。她看起来心事重重。

【沧溟】（没有回头，仿佛知道是你）"……外乡人。你说……一个……「容器」……真的……没有……别的……价值……吗？我……从小……被……教导……我是……为了……成为……「容器」……而生。我……的……母亲……是这样……我的……祖母……也是……这样。我……一直……以为……这就是……我的……命运。"

她的声音里带着一种……长久的迷茫。`,
    options: [
      { label: '「你不是容器。你是沧溟——独一无二的沧溟。」', tag: '开解', onChoose: (p) => { STATE.addFavor(p, 'cangming', 20); }, next: 'xuangu_q05_s3_answer' },
      { label: '「命运是可以改变的。你已经走在了改变的路上。」', tag: '鼓励', onChoose: (p) => { STATE.addFavor(p, 'cangming', 20); }, next: 'xuangu_q05_s3_answer' }
    ]
  };

  /** 支线S3·后续 */
  const SCENE_Q05_S3_ANSWER = {
    id: 'xuangu_q05_s3_answer',
    title: '【支线 Q05_S3】沧溟的心结',
    bg: BG.temple,
    text:
`沧溟怔怔地看着你，良久，她的眼中泛起了久违的光。

【沧溟】"……从来……没有人……告诉过我……我……可以是……「沧溟」……而不是……「容器」。（她擦去眼角的泪，露出一个释然的微笑）谢谢你……外乡人。你……让我……第一次……觉得……「活着」……是一件……值得……期待……的……事。"

【支线完成】
- 沧溟好感 +20
- 沧溟解开「容器」的心结，重拾自我`,
    options: [
      { label: '（望着她眼中重新亮起的光）', tag: '释然', onChoose: (p) => { STATE.addFavor(p, 'cangming', 20); }, next: 'xuangu_q05_01_routes' }
    ]
  };

  /* ===========================================================
   * 玄股国自由行动系统
   * =========================================================== */


  /* ---------- 暴露所有场景（支持函数形式的动态场景） ---------- */
  global.XUANGU_SCENES = {
    // 序章
    xuangu_entry: SCENE_ENTRY,
    xuangu_01_kuixu: SCENE_KUIXU,
    xuangu_01_arrive: SCENE_ARRIVE,
    xuangu_01_secret: SCENE_SECRET,

    // 主线 Q05_01
    xuangu_q05_01_trial_moon: SCENE_Q05_01_TRIAL_MOON,
    xuangu_q05_01_trial_moon_fight: SCENE_Q05_01_TRIAL_MOON_FIGHT,
    xuangu_q05_01_trial_wind: SCENE_Q05_01_TRIAL_WIND,
    xuangu_q05_01_trial_wind_fight: SCENE_Q05_01_TRIAL_WIND_FIGHT,
    xuangu_q05_01_trial_fire: SCENE_Q05_01_TRIAL_FIRE,
    xuangu_q05_01_trial_fire_fight: SCENE_Q05_01_TRIAL_FIRE_FIGHT,
    xuangu_q05_01_trial_metal: SCENE_Q05_01_TRIAL_METAL,
    xuangu_q05_01_trial_metal_fight: SCENE_Q05_01_TRIAL_METAL_FIGHT,
    xuangu_q05_01_guixu: SCENE_Q05_01_GUIXU,
    xuangu_q05_01_routes: SCENE_Q05_01_ROUTES,

    // 主线 Q05_02
    xuangu_q05_02_main: SCENE_Q05_02_MAIN,
    xuangu_q05_02_jinghua: SCENE_Q05_02_JINGHUA,
    xuangu_q05_02_jinghua_after: SCENE_Q05_02_JINGHUA_AFTER,
    xuangu_q05_02_shuihun: SCENE_Q05_02_SHUHUN,
    xuangu_q05_02_guixu: SCENE_Q05_02_GUIXU,

    // 主线 Q05_03 三结局
    xuangu_q05_03_jinghun: SCENE_Q05_03_JINGHUN,
    xuangu_q05_03_shuihun: SCENE_Q05_03_SHUHUN,
    xuangu_q05_03_guiyi: SCENE_Q05_03_GUIYI,
    xuangu_end: SCENE_END,

    // 隐藏 Q05_H1
    xuangu_q05_h1: SCENE_Q05_H1,
    xuangu_q05_h1_palace: SCENE_Q05_H1_PALACE,
    xuangu_q05_h1_after: SCENE_Q05_H1_AFTER,

    // 支线 Q05_S1/S2/S3
    xuangu_q05_s1: SCENE_Q05_S1,
    xuangu_q05_s1_stele: SCENE_Q05_S1_STELE,
    xuangu_q05_s2: SCENE_Q05_S2,
    xuangu_q05_s2_help: SCENE_Q05_S2_HELP,
    xuangu_q05_s3: SCENE_Q05_S3,
    xuangu_q05_s3_answer: SCENE_Q05_S3_ANSWER,

    // 自由行动（动态场景，函数形式）
  };
})(window);
