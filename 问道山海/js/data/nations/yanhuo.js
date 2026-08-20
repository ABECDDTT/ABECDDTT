/* ===========================================================
 * 问道山海 · 厌火国 完整剧情链
 * 对应策划案第三卷 厌火国 · 焚心之地（Q03）
 * 包含：序章（熔炉之心）+ 主线Q03_01/02/03 + 隐藏Q03_H1（旱魃之忆）
 *      + 支线Q03_S1/S2/S3 + 厌火国自由行动
 * 背景图：复用 assets/img/nations/ 现有资源（qing 系 / yum 系）
 * 好感度：STATE.addFavor / STATE.getFavor（炎辰yanChen等）
 * 三结局：共生·灵火 / 夺心·余烬 / 火灵·焚土
 * =========================================================== */
(function (global) {
  'use strict';

  /* ---------- 公共路径引用（复用现有背景，避免引用不存在的图片） ---------- */
  const BG = {
    sig:         'assets/img/nations/yanhuo-city.jpg',       // 厌火国·专属主题（焚天火山城）
    city:        'assets/img/nations/yum-tianyu-city.jpg',   // 熔炉城·黑曜石巨城
    crater:      'assets/img/nations/yum-qiongding.jpg',     // 焚天火山口 / 永恒熔炉
    mine:        'assets/img/nations/yum-channel.jpg',       // 西火矿道 / 岩浆河
    temple:      'assets/img/nations/qing-shadow-altar.jpg', // 火灵神殿 / 永恒熔炉核心
    grave:       'assets/img/nations/yum-zhuixinggu.jpg',    // 灰烬墓地 / 地下遗迹
    jitan:       'assets/img/nations/yum-jitan.jpg',         // 火灵祭坛 / 焚天祭
    haze:        'assets/img/nations/qing-fog-abyss.jpg',    // 火山黑烟 / 迷障
    taolin:      'assets/img/nations/qing-taolin.jpg',       // 火晶树 / 旧日幻境
    boss:        'assets/img/nations/qing-fying-boss.jpg'    // 混沌炎龙 Boss 战
  };

  /* ===========================================================
   * 序章 · 熔炉之心
   * 玩家沿焚天古道南下，抵达厌火国，遇炎辰与小火
   * =========================================================== */

  /** 入境入口（羽民国结局「前往厌火国」跳转至此） */
  const SCENE_ENTRY = {
    id: 'yanhuo_entry',
    title: '【厌火国·序】焚天古道',
    bg: BG.sig,
    text:
`你辞别羽民国的浮岛，沿[highlight]焚天古道[/highlight]一路南下。地势渐低，空气却愈发灼热——像是被一只无形的手，缓缓探入一座巨大的熔炉。

焚天古道的尽头，空气骤然沸腾。不是普通的热，是像被扔进熔炉般的热。你的皮肤瞬间被汗水浸透，呼吸变得困难——每一口空气都像是在吸入火焰。

前方，是一座[highlight]黑色的城市[/highlight]。不是颜色上的黑，是材质上的黑——整座城市由黑曜石建造，在火光的映照下泛着暗红色的光泽。城市中央，一道巨大的火柱直冲天际，将云层烧出了一个洞。

城市之外，环绕着一座[highlight]活火山[/highlight]——「焚天」。山口常年冒着黑烟，山腰的岩浆河静静流淌。你心中微凛：这座工业之城，正建立在一头沉睡的巨兽背上。`,
    options: [
      { label: '抬步走向城门，谨慎探察', tag: '谨慎', next: 'yanhuo_01_arrive' },
      { label: '凝望那道冲天火柱，感受其威压', tag: '观察', next: 'yanhuo_01_arrive' },
      { label: '戒备着，向城门靠近', tag: '警觉', next: 'yanhuo_01_arrive' }
    ]
  };

  /** 城门 · 遇炎辰 */
  const SCENE_ARRIVE = {
    id: 'yanhuo_01_arrive',
    title: '【厌火国·序】熔炉城 · 城门',
    bg: BG.city,
    text:
`[img]assets/img/npc/npc_yanchen.jpg[/img]\n\n你走到城门口，一个[highlight]年轻人[/highlight]正站在城门边，似乎在等待什么。他的皮肤是深褐色的，短发是赤红色的，像是一团燃烧的火焰。

他看到你，眼睛一亮——那双眼睛真的在发光，瞳孔中仿佛有火苗在跳动：

"你就是那个……解决了羽民国风灵问题的人？（兴奋地冲上来）太好了！我终于等到你了！我是[highlight]炎辰[/highlight]，火灵大长老的儿子。我……我需要你的帮助！"

他抓住你的手，你感觉到他的体温比正常人高得多——像是握着一块刚出炉的炭。

"焚天……火山……它醒了。不是正常的喷发，是……有什么东西……在火山深处……搅动岩浆。我父亲……大长老……他说这只是「地火周期」，让我不要管。但我看到了！在岩浆河里……有……有[curse]紫色的东西[/curse]！和虚月一样的紫色！"`,
    options: [
      { label: '「我是来帮忙的。带我去见大长老。」', tag: '陈述', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 15); Engine.log('炎辰好感 +15', 'good'); }, next: 'yanhuo_01_guard' },
      { label: '「那紫色的东西，你是在哪里看到的？」', tag: '追问', reply: '炎辰：「在……火口西侧的岩浆河里。那里本不该有路，却有一条被熔岩半掩的暗口，紫光就是从那儿渗出来的。」', next: 'yanhuo_01_guard' },
      { label: '「炎辰，我们私下谈。今夜，灰烬墓地见。」', tag: '私下', next: 'yanhuo_01_guard' }
    ]
  };

  /** 城门守卫阻拦 */
  const SCENE_GUARD = {
    id: 'yanhuo_01_guard',
    title: '【厌火国·序】锻族守卫',
    bg: BG.city,
    text:
`炎辰的声音越来越大，引来了城门守卫的注意。一个穿着厚重铠甲的中年锻族走了过来，铠甲上隐隐泛着暗红：

"[highlight]炎辰[/highlight]少爷。大长老吩咐过，您应该待在熔炉区，不要……（他看向你，目光一沉）……不要和「外乡人」接触。"

炎辰怒视守卫："我是火灵大长老的儿子，不是囚犯！"

守卫不为所动，显然已经习惯了他的反抗。你注意到——守卫铠甲的表面，有几道细微的[highlight]紫黑色纹路[/highlight]，像是被某种力量腐蚀过。`,
    options: [
      { label: '「让我见大长老。我有羽民国与虚月的消息，事关厌火安危。」', tag: '恳切', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 10); Engine.log('炎辰好感 +10', 'good'); }, next: 'yanhuo_01_intro' },
      { label: '（悄悄指了指守卫铠甲上的紫黑纹路）', tag: '观察', reply: '你注意到守卫铠甲上的紫黑色腐蚀纹路，与虚月的颜色如出一辙。', replyTitle: '观察', next: 'yanhuo_01_intro' },
      { label: '「看来你们内部有问题。不过我今日倦了，先寻个落脚处。」', tag: '暂避', next: 'yanhuo_01_intro' }
    ]
  };

  /** 序章主线交汇：炎辰求助与烬婆婆的预示 */
  const SCENE_INTRO = {
    id: 'yanhuo_01_intro',
    title: '【厌火国·序】熔炉之心',
    bg: BG.grave,
    text:
`最终，你与炎辰寻得一处无人角落。夜色渐沉，灰烬墓地的硫磺气息随风飘来。

炎辰压低声音，认真道：
"[highlight]焚天[/highlight]……火山……它醒了。不是正常的喷发，是……有什么东西……在火山深处……搅动岩浆。我父亲……大长老……他说这只是「地火周期」，让我不要管。但我看到了！在岩浆河里……有……有紫色的东西！和虚月一样的紫色！"

他顿了顿，目光悲戚：
"三年前，我第一次在火山口发现[highlight]小火[/highlight]——一条被火毒侵蚀的玄火蛇幼崽。我用灵力吊着它的命，可它还是越来越虚弱。而我……也越来越弱了。我不是为了自己。我是为了小火，为了灰族……为了所有会被火山吞噬的人。"

"如果你愿意帮我……我可以给你任何东西。锻造的秘法、火灵石、甚至……（压低声音）……永恒熔炉的设计图。"

忽然，一个苍老沙哑的声音从墓碑后传来：
"[highlight]年轻人[/highlight]……你们……太吵了。"`,
    options: [
      { label: '「我答应你。但我要知道全部真相。」', tag: '应承', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 25); p.unlocked.add('yongheng_design'); Engine.log('炎辰好感 +25，获得永恒熔炉设计图（残篇）', 'good'); }, next: 'yanhuo_01_jinpopo' },
      { label: '「我要进真正的火口，亲眼看看那东西。」', tag: '条件', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 10); }, next: 'yanhuo_01_jinpopo' },
      { label: '「小火的毒……和火山里的「东西」有关？」', tag: '追问', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 5); p.unlocked.add('xiaohuo_clue'); }, reply: '炎辰压低声音：「小火是在火口西侧被侵蚀的，那里有一处被封印的洞口。」', next: 'yanhuo_01_jinpopo' }
    ]
  };

  /** 烬婆婆揭示真相 */
  const SCENE_JINPOPO = {
    id: 'yanhuo_01_jinpopo',
    title: '【厌火国·序】烬婆婆 · 灰烬之言',
    bg: BG.grave,
    text:
`从墓碑后走出一个[highlight]老妇人[/highlight]。她的半边脸被烧伤覆盖，露出下面狰狞的疤痕，但剩下的那只眼睛……清澈得不像凡人。

"外乡人……你身上有……很多味道。青丘的桃花、羽民的风、还有……[curse]虚月的腐臭[/curse]。你……是来解决……那个「东西」的……对吗？"

她缓缓开口：
"永恒熔炉……不是熔炉。是「[highlight]棺材[/highlight]」。三百年前……青丘封印影狐时……逸散的虚月之力……有一部分……飘到了这里。我们的祖先……用永恒熔炉……把它……封在了火山深处。但封印……正在崩溃。而火灵大长老……他知道。他一直……都知道。"

炎辰震惊："什么？父亲……知道？"

烬婆婆苦笑："你以为……为什么……灰族……住在岩浆河边？因为……我们需要……用身体……过滤火毒。每一代灰族……都是……封印的……「[highlight]缓冲垫[/highlight]」。你的小火……只是……不小心……碰到了……真正的……污染源。"

她指向火山方向：
"火口西侧……有一个……被封闭的洞口。那里……通往……「[highlight]火灵神殿[/highlight]」。真正的……控制中枢。也是……「它」……沉睡的……地方。如果你……真的……想解决……就去那里。但……带上……这个。"

她递给你一块黑色的石头——「[highlight]灰烬之心[/highlight]」，灰族世代相传的圣物。`,
    options: [
      { label: '（郑重收下灰烬之心）', tag: '受赠', onChoose: (p) => { STATE.addMaterial(p, 'MAT-YH07', 1); p.unlocked.add('huoling_ruins'); Engine.log('获得灰烬之心×1（可抵御一次虚月侵蚀）', 'good'); }, next: 'yanhuo_01_final' }
    ]
  };

  /** 序章收束 */
  const SCENE_FINAL = {
    id: 'yanhuo_01_final',
    title: '【厌火国·序】序章 · 完',
    bg: BG.city,
    text:
`烬婆婆的话，如重锤敲在炎辰心头。他望向焚天火山的方向，那冲天火柱在夜色中格外狰狞。

"火灵神殿……那里，才是这一切的源头。"炎辰握紧双拳，"父亲……你到底在瞒着我们什么？"

他转向你，郑重道：
"外乡人，你愿随我一同揭开真相吗？若真有虚月之力封在火山深处，我绝不会让它毁了我的国，毁了我的民。"

【序章完成】
- 经验 +400
- 获得【灰烬之心】×1
- 炎辰好感度：视选择而定
- 烬婆婆好感 +20
- 解锁「熔炉城」地图、「灰烬墓地」安全区`,
    options: [
      { label: '「好，我随你前往火口西侧。」', tag: '同行', next: 'yanhuo_q03_01_mine' },
      { label: '「先探探熔炉城与灰烬墓地，再图长远。」', tag: '沉稳', next: 'yanhuo_q03_01_mine' }
    ]
  };

  /* ===========================================================
   * 主线 Q03_01 · 火口之谜
   * 西火矿道 → 火灵神殿 → 岩浆湖底 → 三路线分歧
   * =========================================================== */

  /** Q03_01 西火矿道入口 */
  const SCENE_Q03_01_MINE = {
    id: 'yanhuo_q03_01_mine',
    title: '【主线 Q03_01】西火矿道',
    bg: BG.mine,
    text:
`火口西侧是一条废弃的矿道。矿道入口被巨石封住，巨石上刻着锻族的文字：「[curse]禁地。擅入者，焚身灭魂。[/curse]」

炎辰抡起锻造锤，重重砸在封石上。石块崩裂，露出黑黢黢的矿道。矿道内部弥漫着灼热的气流，墙壁上渗出的不是水，是[highlight]岩浆[/highlight]。地面上散落着矿工的工具——镐头、背篓、甚至……骸骨。

炎辰面色凝重："这是三十年前封闭的「[highlight]西火矿道[/highlight]」。当时……发生了一次小规模喷发，死了几十个矿族。（他压低声音）但烬婆婆说……那不是喷发。是……「它」……醒了。"

深入矿道约百丈，你们来到一个巨大的地下空洞。空洞中央是[highlight]岩浆湖[/highlight]，湖心有一座小岛，岛上是一座残破的神殿——[highlight]火灵神殿[/highlight]。

神殿入口处，跪着一具骸骨。骸骨穿着锻族服饰，手中握着一封未寄出的信。`,
    options: [
      { label: '（拾起那封未寄出的信，查看）', tag: '探索', next: 'yanhuo_q03_01_letter' },
      { label: '（径直走向火灵神殿入口）', tag: '前行', next: 'yanhuo_q03_01_temple' }
    ]
  };

  /** 骸骨遗书 */
  const SCENE_Q03_01_LETTER = {
    id: 'yanhuo_q03_01_letter',
    title: '【主线 Q03_01】锻族遗书',
    bg: BG.mine,
    text:
`你捡起那封被火气熏得焦黄的信。信纸边缘已经碳化，但字迹尚可辨认：

「吾儿[highlight]铁心[/highlight]：为父即将进入火灵神殿，修复永恒熔炉的核心。若三日不归，勿寻。记住，永恒熔炉不是工具，是[highlight]枷锁[/highlight]。枷锁一旦打开，焚天将灭世。但若枷锁一直紧闭……被囚禁者……终将疯狂。为父选择……面对。」

炎辰读完，脸色骤变：
"这是……[highlight]铁心[/highlight]师父的父亲？三十年前失踪的首席锻造师？他……他留下的这些话，是什么意思？"

"枷锁……打开则灭世，紧闭则疯狂……"你喃喃自语，隐隐感到，这火灵神殿里的秘密，远比想象中沉重。`,
    options: [
      { label: '（收起遗书，走进火灵神殿）', tag: '前行', next: 'yanhuo_q03_01_temple' }
    ]
  };

  /** 火灵神殿 · 遇铁心 */
  const SCENE_Q03_01_TEMPLE = {
    id: 'yanhuo_q03_01_temple',
    title: '【主线 Q03_01】火灵神殿',
    bg: BG.temple,
    text:
`火灵神殿内部保存得相对完好。墙壁上刻满了[highlight]火灵族[/highlight]的壁画——与羽民国的风灵族类似，火灵族也是上古种族，掌控地火之力。壁画描绘了火灵族与「蚀火」的战争，最终，火灵族以全族之力，将蚀火封印于焚天火山深处。

而永恒熔炉……就是封印的「外壳」。

一个低沉的声音忽然从神殿入口响起：
"你们……不该来这里。"

你转头，看见一个面容刚毅的中年锻族男子站在门口。他的表情复杂——有愤怒，有悲伤，有……解脱？

"[highlight]铁心[/highlight]。锻族首席锻造师，炎辰的师父。"他缓缓走进来，"三十年前，我父亲发现了真相。永恒熔炉……不是我们的造物。是[highlight]火灵族[/highlight]留下的封印装置。我们锻族……只是……看守者。但大长老……想要利用封印的力量。他想要……控制蚀火……为厌火国……夺取……更多的……领土。"

他望向岩浆湖：
"岩浆湖里……有东西。不是岩浆生物……是「它」的……触角。我父亲的骸骨……就在湖底。他试图……加固封印……但失败了。"`,
    options: [
      { label: '「我去湖底看看。也许能找到加固封印的方法。」', tag: '潜入', next: 'yanhuo_q03_01_lake' },
      { label: '「先清理湖里的「触角」。」', tag: '战斗', next: 'yanhuo_q03_01_tentacle' },
      { label: '「铁心，你呢？你想怎么做？」', tag: '询问', onChoose: (p) => { STATE.addFavor(p, 'tieXin', 10); }, reply: '铁心沉默片刻，敲了敲自己的铁臂：「我？我守在外围。若你在下面撑不住，我就把整片湖炸开，把你捞出来。」', next: 'yanhuo_q03_01_lake' }
    ]
  };

  /** 岩浆触角战 */
  const SCENE_Q03_01_TENTACLE = {
    id: 'yanhuo_q03_01_tentacle',
    title: '【主线 Q03_01】岩浆触手',
    bg: BG.mine,
    text:
`你选择先清理岩浆湖中的「触角」。那紫黑色的触手从岩浆中翻涌而出，带着焦灼的气息，向你们袭来！

铁心拔出锻造锤，炎辰也凝出地火——一场战斗在熔岩湖畔展开。`,
    options: [],
    battle: {
      enemy: { name: '岩浆触手 ×4', hp: 900, atk: 62, def: 38, lv: 14, element: '邪', bg: BG.mine },
      onWin: (p) => {
        if (global.Engine) Engine.log('击败岩浆触手', 'good');
        STATE.completeQuest(p, 'YANHUO_TENTACLE_CLEARED');
        p.realm.exp = (p.realm.exp || 0) + 400;
        STATE.addMaterial(p, 'MAT-YH03', 2);
        if (global.Engine) Engine.toast('经验+400，熔岩精铁×2', 'gold');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌触角，重伤退却', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.2));
      },
      after: 'yanhuo_q03_01_lake'
    }
  };

  /** 潜入岩浆湖底 */
  const SCENE_Q03_01_LAKE = {
    id: 'yanhuo_q03_01_lake',
    title: '【主线 Q03_01】岩浆湖底 · 封印真相',
    bg: BG.mine,
    text:
`你服用避火丹，纵身潜入岩浆湖。避火丹的力量让你暂时免疫岩浆伤害，但视野极其模糊，四下皆是翻滚的火红。

湖底，你看到了「它」。

那是一团……火焰？不，是[highlight]火焰中的影子[/highlight]。紫黑色的火焰，在岩浆中静静燃烧。火焰的核心，是一条……龙？不是真正的龙，是火焰构成的龙形，但它的眼睛……是虚月的[highlight]紫黑色[/highlight]。

在紫黑炎龙的下方，你看到一具骸骨——穿着锻族服饰，手中握着一把断裂的锻造锤。那是铁心的父亲。

骸骨旁边，有一块石碑。石碑上刻着：

「吾以火灵之血，封蚀火于此。后世若有缘者，愿承吾之责，请以「[highlight]纯净之火[/highlight]」重燃封印。若不愿……请以「毁灭之火」，焚尽一切。勿令蚀火……扩散……勿令虚月……再临……」

你凝神观察那紫黑炎龙的核心——其中，有一缕[highlight]金色的火焰[/highlight]在挣扎，那仿佛是……上古火灵「祝融」的一缕残魂。`,
    options: [
      { label: '【取回骸骨】将铁心父亲的骸骨带回', tag: '厚义', onChoose: (p) => { STATE.addFavor(p, 'tieXin', 30); STATE.addMaterial(p, 'MAT-YH08', 1); Engine.log('铁心好感 +30，获得断裂的锻造锤（可修复为SSR武器）', 'good'); }, next: 'yanhuo_q03_02_core' },
      { label: '【尝试加固】以灵力注入石碑，稳定封印', tag: '固印', require: 'lv_gte', requireValue: 12, onChoose: (p) => { STATE.addFavor(p, 'yanChen', 10); p.unlocked.add('seal_stabilized'); Engine.log('封印暂时稳定（需火属性造诣或灵炎命格）', 'good'); }, next: 'yanhuo_q03_02_core' },
      { label: '【观察炎龙】不触碰任何东西，只静静观察', tag: '观察', onChoose: (p) => { p.unlocked.add('zhurong_clue'); Engine.log('你发现炎龙核心中有一缕挣扎的金色火焰——那是祝融残魂', 'info'); }, next: 'yanhuo_q03_02_core' }
    ]
  };

  /** 三路线分歧 */
  const SCENE_Q03_01_ROUTES = {
    id: 'yanhuo_q03_01_routes',
    title: '【主线 Q03_01】三路抉择',
    bg: BG.temple,
    text:
`从岩浆湖底归来，你将所见所闻告知炎辰与铁心。封印的真相，渐渐清晰。

面对蚀火，有三条道路——

【[highlight]路线A·共生[/highlight]】与祝融残魂合作，用「纯净之火」净化虚月污染，让蚀火与地火共存，化为「灵火」。此路最是艰难，也最是慈悲。

【[highlight]路线B·夺心[/highlight]】以灰族之血为引，将蚀火引入「灰烬之心」，由你亲自封印携带，将其带离厌火国。

【[highlight]路线C·火灵[/highlight]】直面蚀火的渴望，释放它、或与之融合。焚天将化为「焚土」，弱者化为灰烬，强者在火中永生。（须恶念深重或心志极端者方可行此路）`,
    options: [
      { label: '「走共生之路，以纯净之火净化。」', tag: '共生', next: 'yanhuo_q03_02_gongsheng' },
      { label: '「走夺心之路，以灰烬之心封印。」', tag: '夺心', next: 'yanhuo_q03_02_duoxin' },
      { label: '「（若恶念≥55）火灵之路，焚尽一切。」', tag: '火灵', require: 'evil_gte', requireValue: 55, next: 'yanhuo_q03_02_huoling' }
    ]
  };

  /* ===========================================================
   * 主线 Q03_02 · 焚天之战
   * 永恒熔炉核心 → 大长老抉择 → 三路线展开
   * =========================================================== */

  /** 永恒熔炉核心 */
  const SCENE_Q03_02_CORE = {
    id: 'yanhuo_q03_02_core',
    title: '【主线 Q03_02】永恒熔炉 · 核心',
    bg: BG.crater,
    text:
`你们来到永恒熔炉的核心——一个直径十丈的球形空间，墙壁由黑曜石与火灵石构成，散发着暗红色的光芒。空间中央是一个悬浮的「[highlight]火核[/highlight]」——一团不断旋转的、金色的火焰。但火核的边缘，已经被紫黑色的纹路侵蚀了约三分之一。

火灵大长老站在火核前，背对着你们。他的身影比想象中苍老，深褐色的皮肤已经干裂，像是被火烤了太久的树皮。

"炎辰。你带来了……外乡人。（他长长叹息）我……不是不想告诉你真相。我是……不想让你……承担……这份重量。"

他缓缓转身。你看到了他的眼睛——那双眼睛已经完全变成了[highlight]紫黑色[/highlight]，和影狐一样。

"三十年前……我进入火灵神殿……试图……控制蚀火。我以为……我可以……利用它……让厌火国……强大。但……我……被……反噬了。（他苦笑）现在……我……既是……封印者……也是……被囚禁者……"

他的身体开始扭曲，紫黑色的火焰从皮肤下渗出。`,
    options: [
      { label: '（冷静审视大长老的异变）', tag: '警惕', next: 'yanhuo_q03_02_choice' },
      { label: '「大长老，你已深陷其中。放手吧。」', tag: '劝解', next: 'yanhuo_q03_02_choice' }
    ]
  };

  /** 大长老抉择 */
  const SCENE_Q03_02_CHOICE = {
    id: 'yanhuo_q03_02_choice',
    title: '【主线 Q03_02】大长老 · 抉择',
    bg: BG.crater,
    text:
`火灵大长老痛苦地抱住头，紫黑色的火焰在他身上明灭：

"杀了我……可以……暂时……削弱……蚀火。但……封印……会……崩溃……更快。不杀我……我……终将……完全……被……控制……（他猛然看向你）外乡人……你……来……选择……"

他的目光，既有悔恨，也有恳求——他已不堪承受这份被蚀火啃噬的痛苦。`,
    options: [
      { label: '「……对不起。」（与火灵大长老战斗）', tag: '战斗', onChoose: (p) => { STATE.addEvil(p, 10); }, next: 'yanhuo_q03_02_combat' },
      { label: '「还有救。炎辰，帮我进行共生仪式！」', tag: '救赎', require: 'lv_gte', requireValue: 13, onChoose: (p) => { STATE.addFavor(p, 'yanChen', 15); }, next: 'yanhuo_q03_02_gongsheng' },
      { label: '「……我做不到。」（退缩，封印加速崩坏）', tag: '退缩', onChoose: (p) => { STATE.addFavor(p, 'yanChen', -10); STATE.addEvil(p, 5); Engine.log('你选择了退缩。大长老彻底失控，蚀火苏醒在即……', 'evil'); }, next: 'yanhuo_q03_02_sealcrash' }
    ]
  };

  /** 与火灵大长老战斗 */
  const SCENE_Q03_02_COMBAT = {
    id: 'yanhuo_q03_02_combat',
    title: '【主线 Q03_02】大长老之战',
    bg: BG.crater,
    text:
`火灵大长老发出一声不像人声的嘶吼，紫黑色的火焰爆涌而出。他的身影在蚀火中扭曲、膨胀——他已半只脚踏入蚀火之中。

你必须了结他，也必须阻止蚀火的完全苏醒。`,
    options: [],
    battle: {
      enemy: { name: '火灵大长老·蚀火', hp: 2000, atk: 96, def: 60, lv: 18, element: '邪', bg: BG.crater },
      onWin: (p) => {
        if (global.Engine) Engine.log('击败火灵大长老（蚀火）', 'good');
        STATE.completeQuest(p, 'YANHUO_DACHANGLAO_SLAIN');
        p.realm.exp = (p.realm.exp || 0) + 900;
        STATE.addEvil(p, 10);
        if (global.Engine) Engine.toast('经验+900，恶念+10', 'gold');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌大长老，重伤退却', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.12));
      },
      after: 'yanhuo_q03_02_sealcrash'
    }
  };

  /** 大长老陨落 · 封印加速崩溃 */
  const SCENE_Q03_02_SEALCRASH = {
    id: 'yanhuo_q03_02_sealcrash',
    title: '【主线 Q03_02】封印将崩',
    bg: BG.crater,
    text:
`战斗结束。火灵大长老倒地，身体中的紫黑色火焰渐渐熄灭。他望着你，眼神终于恢复了一丝清明：

"……谢……谢谢……你……（他艰难地看向炎辰）炎辰……我……对不起……你……和……你的……母亲……我……只想……让……厌火……强大……却……亲手……打开了……潘多拉……"

他咽下最后一口气。但与此同时——火核剧烈震颤，紫黑色的纹路疯狂蔓延。没有了镇压者，封印正在加速崩溃！

"封印要崩了！"铁心大喊，"必须立刻决断！我们怎么办？"`,
    options: [
      { label: '「来不及了！全力阻止蚀火！」', tag: '紧急', next: 'yanhuo_q03_02_final_combat' }
    ]
  };

  /** 封印崩溃 · 混沌炎龙最终战 */
  const SCENE_Q03_02_FINAL_COMBAT = {
    id: 'yanhuo_q03_02_final_combat',
    title: '【主线 Q03_02】混沌炎龙',
    bg: BG.boss,
    text:
`永恒熔炉轰然炸裂。岩浆从地底喷涌而出，紫黑色的蚀火化作一道巨大的龙形冲天而起——[highlight]混沌炎龙[/highlight]！

它不是真正的龙，是虚月污染与地火融合后诞生的「火魔意识」。它的身躯由岩浆与紫黑火焰构成，翼展遮天蔽日，双眼是两团燃烧的紫黑虚空。

"自由……终于……自由……"混沌炎龙的声音如万火齐鸣，"焚天……将……净化……一切……"

面对这灭世之威，你握紧手中之力。真正的决战，开始了。`,
    options: [],
    battle: {
      enemy: { name: '混沌炎龙', hp: 3200, atk: 128, def: 82, lv: 20, element: '邪', bg: BG.boss },
      onWin: (p) => {
        if (global.Engine) Engine.log('击败混沌炎龙', 'good');
        STATE.completeQuest(p, 'YANHUO_DRAGON_SLAIN');
        p.realm.exp = (p.realm.exp || 0) + 1500;
        STATE.addMaterial(p, 'MAT-YH06', 1);
        if (global.Engine) Engine.toast('经验+1500，获得祝融余烬', 'gold');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌炎龙，重伤垂死', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.08));
      },
      after: 'yanhuo_q03_02_final_after'
    }
  };

  /** 炎龙战后 */
  const SCENE_Q03_02_FINAL_AFTER = {
    id: 'yanhuo_q03_02_final_after',
    title: '【主线 Q03_02】炎龙既灭',
    bg: BG.crater,
    text:
`混沌炎龙发出最后的咆哮，庞大身躯轰然崩塌，化作漫天火雨洒落。但蚀火的根源仍未彻底清除——它化作一缕缕紫黑火苗，重新缩回火核之中，等待下一次苏醒。

铁心跪在父亲的骸骨旁，久久不语。炎辰则望着破碎的永恒熔炉，神情复杂。

"炎龙虽灭，蚀火未绝。"铁心低声道，"若不彻底净化火核，焚天终会再次喷发。……必须做出最终的选择了。"

火核中的紫黑纹路，仍在缓缓脉动。你与炎辰、铁心面面相觑——到了该抉择的时候。`,
    options: [
      { label: '（面对火核，做出最后的抉择）', tag: '抉择', next: 'yanhuo_q03_01_routes' }
    ]
  };

  /* ===========================================================
   * 路线A：共生 · 灵火
   * =========================================================== */

  /** 共生 · 净化仪式 */
  const SCENE_Q03_02_GONGSHENG = {
    id: 'yanhuo_q03_02_gongsheng',
    title: '【主线 Q03_02】共生之路 · 灵火仪式',
    bg: BG.jitan,
    text:
`你选择与祝融残魂合作，走共生之路。

炎辰站在火核一侧，你站在另一侧，共同以灵力注入火核。金色的火焰与紫黑色的蚀火在火核中交锋、撕扯。

炎辰高声呼唤：
"以吾之名，炎辰，火灵大长老之子，请求[highlight]祝融残魂[/highlight]——回应吾之呼唤！"

火核中的金色火焰剧烈跳动，与紫黑色的蚀火交锋。一个威严的声音如万火齐鸣：
"后来者……你的……心……很……纯净。但……虚月……的污染……太深……需要……「[highlight]容器[/highlight]」……来……承载……净化后的……「余烬」……"`,
    options: [
      { label: '「我来。」（自愿承载余烬，成为灵火之体）', tag: '自承', onChoose: (p) => { p.unlocked.add('linghuo_body'); STATE.addEvil(p, -15); Engine.log('你成为「余烬容器」，获得灵火之体（火系威力+30%，水抗-50%）', 'good'); }, next: 'yanhuo_q03_02_gongsheng_win' },
      { label: '「炎辰，你是火灵后裔，你来。」', tag: '付托', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 30); p.unlocked.add('yanChen_linghuo'); Engine.log('炎辰成为「灵火使者」，进化为SSR队友', 'good'); }, next: 'yanhuo_q03_02_gongsheng_win' },
      { label: '「小火……你愿意吗？」', tag: '托付', onChoose: (p) => { if (!p.pets.some(x => x.id === 'xuanhuo')) { STATE.addPet(p, 'xuanhuo', 'partner'); } p.unlocked.add('xiaohuo_linghuo'); Engine.log('小火蜕变为「玄火蛇」（凡兽灵宠），与你缔结契约', 'good'); }, next: 'yanhuo_q03_02_gongsheng_win' }
    ]
  };

  /** 共生 · 成功 */
  const SCENE_Q03_02_GONGSHENG_WIN = {
    id: 'yanhuo_q03_02_gongsheng_win',
    title: '【主线 Q03_02】灵火新生',
    bg: BG.jitan,
    text:
`随着容器就位，火核中的紫黑色蚀火被一点点剥离、净化。金色的灵火渐渐取代了紫黑——永恒熔炉从「封印」转变为「圣地」。

祝融残魂的声音渐次柔和，最终化作一道温暖的火光，融入火核。焚天火山的地火，从此被[highlight]净化[/highlight]。

炎辰长舒一口气，望着焕然一新的火核："灵火……真的成了。厌火国……有救了。"

铁心站起身，握紧那把断裂的锻造锤，郑重道："我父亲没能完成的事……我替他完成。从今往后，我会用这把锤，锻造出配得上灵火的圣器。"

【共生路线完成】
- 火核净化，永恒熔炉化为「圣地」
- 厌火国进入「[highlight]灵火时代[/highlight]」：地火被净化，灰族不再受火毒侵蚀
- 炎辰成为新任火灵大长老，推行「火无贵贱」政策`,
    options: [
      { label: '（见证厌火国的浴火重生）', tag: '结局', onChoose: (p) => { STATE.completeQuest(p, 'Q03_MAIN_DONE'); }, next: 'yanhuo_q03_03_linghuo' }
    ]
  };

  /* ===========================================================
   * 路线B：夺心 · 余烬
   * =========================================================== */

  /** 夺心 · 灰烬仪式 */
  const SCENE_Q03_02_DUOXIN = {
    id: 'yanhuo_q03_02_duoxin',
    title: '【主线 Q03_02】夺心之路 · 灰烬仪式',
    bg: BG.grave,
    text:
`你选择以灰族之血为引，将蚀火引入「灰烬之心」。

烬婆婆颤巍巍地召集了十名灰族志愿者。他们站在永恒熔炉前，脸上没有恐惧，只有解脱的微笑。

烬婆婆声音沙哑："我们……灰族……世代……承受火毒。我们的……身体……已经……习惯了……火焰。让我们……成为……封印……是……最好的……归宿。"

十名灰族志愿者走入永恒熔炉，他们的身体在火焰中燃烧，但没有痛苦——只有解脱。他们的灰烬凝聚成一颗[highlight]灰烬之核[/highlight]，将蚀火吸入其中。`,
    options: [
      { label: '【带走灰烬之核】将蚀火封印在自己体内', tag: '自承', onChoose: (p) => { STATE.addEvil(p, 5); p.unlocked.add('huijin_core'); Engine.log('你背负灰烬之核，全属性+15%，但每日需承受火毒侵蚀', 'info'); }, next: 'yanhuo_q03_02_duoxin_win' },
      { label: '【交给炎辰】让炎辰作为火灵后裔承担', tag: '付托', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 25); Engine.log('炎辰成为「灰烬守护者」，厌火国获得长久和平', 'good'); }, next: 'yanhuo_q03_02_duoxin_win' },
      { label: '【封印于火山深处】将其投入火口最深处', tag: '封存', reply: '蚀火之心沉入火口最深处，炽热的岩浆缓缓将其吞没。你望着翻涌的熔岩，心头却掠过一丝隐忧——数十年后，它恐将再度苏醒……', next: 'yanhuo_q03_02_duoxin_win' }
    ]
  };

  /** 夺心 · 成功 */
  const SCENE_Q03_02_DUOXIN_WIN = {
    id: 'yanhuo_q03_02_duoxin_win',
    title: '【主线 Q03_02】灰烬之核',
    bg: BG.grave,
    text:
`灰烬之核缓缓成形，紫黑色的蚀火被封入其中。焚天火山停止了异常的躁动，地火回归平稳。

烬婆婆靠在熔炉边，望着燃烧的余烬，露出久违的微笑：
"灰烬……不是……结束。是……开始。每一粒……灰烬……都曾是……火焰。也……将……再次……成为……火焰……"

她缓缓闭上眼，安然离世。灰族世代背负的使命，终于在这一刻完成。

炎辰与铁心默立良久，向着那堆温暖的余烬，深深一拜。

【夺心路线完成】
- 蚀火被封入灰烬之核，厌火国获得暂时和平
- 灰族志愿者的牺牲，换来灰族不再受火毒侵蚀
- 烬婆婆安然离世，完成了灰族的宿命`,
    options: [
      { label: '（为灰烬中的亡者，献上一炷心香）', tag: '结局', onChoose: (p) => { STATE.completeQuest(p, 'Q03_MAIN_DONE'); }, next: 'yanhuo_q03_03_yujin' }
    ]
  };

  /* ===========================================================
   * 路线C：火灵 · 焚土
   * =========================================================== */

  /** 火灵 · 释放 */
  const SCENE_Q03_02_HUOLING = {
    id: 'yanhuo_q03_02_huoling',
    title: '【主线 Q03_02】火灵之路 · 释放',
    bg: BG.crater,
    text:
`你选择直面蚀火的渴望，释放它。

混沌炎龙从火核中完全苏醒，庞大的身躯冲破永恒熔炉，翼展遮天蔽日。它喷出紫黑色的龙焰，熔炉城瞬间陷入火海。

炎辰在火海中，抱着小火的遗体，疯狂地笑：
"这就是……你想要的吗？外乡人？这就是……力量？哈哈……哈哈哈……"

他站起身，深褐色的皮肤开始龟裂，露出下面的火焰——他以自身为引，与炎龙融合，成为了「[highlight]炎龙使者[/highlight]」。

"弱者……化为……灰烬。强者……在火中……永生。"混沌炎龙的声音里，多了一丝人类的情感，"你……是……强者……欢迎……加入……「[highlight]焚土[/highlight]」……"`,
    options: [
      { label: '（拥抱这焚尽一切的力量）', tag: '沉沦', onChoose: (p) => { STATE.addEvil(p, 30); p.unlocked.add('fentu_power'); Engine.log('获得焚天之力（火系威力+50%，但无法进入水域地图），恶念+30', 'evil'); }, next: 'yanhuo_q03_02_huoling_win' }
    ]
  };

  /** 火灵 · 成功 */
  const SCENE_Q03_02_HUOLING_WIN = {
    id: 'yanhuo_q03_02_huoling_win',
    title: '【主线 Q03_02】焚土',
    bg: BG.boss,
    text:
`焚天火山彻底爆发。熔炉城在燃烧——不是毁灭的燃烧，是……重生的燃烧。紫黑色的火焰中，新的生命在诞生——火元素生物、炎晶植物、甚至……火灵族的后裔。

厌火国化为了「焚土」，只有火属性生物能生存。灰族、矿族、锻族……那些不愿臣服于火焰的生灵，皆在火中化作了灰烬。

炎龙使者·炎辰立于火海中央，目光灼灼地望向你的方向——他既是炎龙，也是那个一心想救国的青年。只是如今，他的心中只剩火焰。

你获得了焚天的力量，却再难回头。

【火灵路线完成】
- 厌火国成为「焚土」
- 炎辰成为Boss「炎龙使者」，但保留一丝理智
- 你获得「[highlight]焚天之力[/highlight]」（火系威力+50%，无法进入水域地图）`,
    options: [
      { label: '（立于焚土之巅，俯瞰万火）', tag: '结局', onChoose: (p) => { STATE.completeQuest(p, 'Q03_MAIN_DONE'); }, next: 'yanhuo_q03_03_fentu' }
    ]
  };

  /* ===========================================================
   * 主线 Q03_03 · 火归何处（三结局）
   * =========================================================== */

  /** 结局A：共生 · 灵火 */
  const SCENE_Q03_03_LINGHUO = {
    id: 'yanhuo_q03_03_linghuo',
    title: '【厌火国·终】灵火',
    bg: BG.jitan,
    text:
`永恒熔炉的火核变成了淡金色，不再喷出黑烟，而是散发出温暖的光芒。灰族们第一次感受到火焰的温暖而不带痛苦。

炎辰作为新任大长老，站在熔炉前，面向全城：
"今天……我们不再……祭祀……焚天。我们祭祀……「[highlight]灵火[/highlight]」。祭祀……那些……用生命……换取……理解的人。"

他看向你，微笑：
"火……不是……毁灭。是……转化。是……生命。谢谢你……教会了我……这一点。"

你望着那团温暖的灵火，心中澄澈——你为这片焦土，带来了真正的「火」。

【共生结局 · 灵火】
- 厌火国进入「[highlight]灵火时代[/highlight]」，成为坚定盟友
- 炎辰成为可招募队友「灵火使者·炎辰」（SSR级）
- 铁心成为「圣锻师」，修复圣器
- 灰族获得平等地位，不再受火毒侵蚀`,
    options: [
      { label: '「愿厌火，永浴灵火。」（厌火国·完）', tag: '完', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 30); p.unlocked.add('yanChen_recruit'); }, next: 'yanhuo_end' }
    ]
  };

  /** 结局B：夺心 · 余烬 */
  const SCENE_Q03_03_YUJIN = {
    id: 'yanhuo_q03_03_yujin',
    title: '【厌火国·终】余烬',
    bg: BG.grave,
    text:
`永恒熔炉熄灭了。不是崩溃，是……完成了使命。灰族的灰烬铺满了熔炉底部，形成了一层白色的、温暖的垫子。

烬婆婆在临终前的话，仍在耳边回响：
"灰烬……不是……结束。是……开始。"

炎辰守在炉前，低声道：
"灰族用生命换来了厌火的安宁。这份恩情，我永世不忘。从今往后，厌火国再不设「灰族」——所有人，皆为「火之子民」。"

铁心握紧新锻的圣锤，望向远方：
"这把锤，会为灰烬中的亡灵，锻造出安息的铭文。"

你望着那层温暖的灰烬，心中复杂难言。牺牲与救赎，在这一刻交织成厌火国新的宿命。

【夺心结局 · 余烬】
- 厌火国获得和平，灰族解放
- 炎辰成为「灰烬守护者」，推行平等
- 铁心成为「圣锻师」
- 你获得「[highlight]余烬见证者[/highlight]」称号`,
    options: [
      { label: '「灰烬之处，亦有新火。」（厌火国·完）', tag: '完', onChoose: (p) => { STATE.addFavor(p, 'yanChen', 20); }, next: 'yanhuo_end' }
    ]
  };

  /** 结局C：火灵 · 焚土 */
  const SCENE_Q03_03_FENTU = {
    id: 'yanhuo_q03_03_fentu',
    title: '【厌火国·终】焚土',
    bg: BG.boss,
    text:
`熔炉城在燃烧。紫黑色的火焰中，火元素生物在孕育，炎晶植物在生长。

炎龙使者·炎辰站在火海中央，望向你的方向，声音里带着一丝挣扎与解脱：
"这就是……进化。弱者……化为……灰烬。强者……在火中……永生。你……是……强者……"

他顿了顿，声音忽然低了下去：
"……但……若有一天……你能……让我……记起……我是……炎辰……那个……想救……小火……救……厌火……的……炎辰……"

他闭上眼，再睁开时，又只剩下燃烧的火焰。

你站在焚土之巅，感受着体内汹涌的焚天之力。这条路的代价，深重而绵长。

【火灵结局 · 焚土】
- 厌火国成为「焚土」，邪道领地
- 你获得「[highlight]焚天之力[/highlight]」（火系威力+50%）
- 炎辰成为Boss「炎龙使者」，保留一丝本心
- 解锁邪道任务「焚土扩张」`,
    options: [
      { label: '「焚尽虚妄，唯余真火。」（厌火国·完）', tag: '完', onChoose: (p) => { STATE.addEvil(p, 10); }, next: 'yanhuo_end' }
    ]
  };

  /** 厌火国结局收束 */
  const SCENE_END = {
    id: 'yanhuo_end',
    title: '【厌火国·终】踏上新途',
    bg: BG.city,
    text:
`你站在厌火国的边境，回望这片历经火劫的土地——无论是重生的灵火熔炉，还是沉静的灰烬圣炉，抑或燃烧的焚土，厌火国的故事，都已告一段落。

风，从你身旁掠过。远方，一条通往山海腹地的道路在召唤。

【恭喜完成厌火国主线·第三境·完】

下一站——[highlight]轩辕国[/highlight]：机关之乱，黄帝遗都。`,
options: [
  { label: '沿中央大道东进，前往轩辕国', tag: '东进', next: 'xuanyuan_entry' }
]
};

  /* ===========================================================
   * 隐藏任务 Q03_H1 · 旱魃之忆（火灵神殿地下·风灵族墓室）
   * 触发：探索火灵神殿时，命格【火/炎/灵炎】或观察敏锐
   * =========================================================== */

  const SCENE_Q03_H1 = {
    id: 'yanhuo_q03_h1',
    title: '【隐藏 Q03_H1】火灵神墓',
    bg: BG.temple,
    text:
`在火灵神殿深处，你凭借过人的感知，发现了一条被岩浆苔藓遮蔽的[highlight]地下通道[/highlight]。

通道尽头，是一座巨大的[highlight]火灵族墓室[/highlight]。墓室中央是一具石棺——棺身由通体漆黑的火晶石打造，表面刻满古老的火灵族符文。

你推开棺盖的瞬间，没有闻到腐臭，只闻到一股陈年的[highlight]粟米粥香[/highlight]。

眼前的世界如浸水的画卷般晕染开来。你站在一间简陋却温暖的石屋里，窗外是百年前的厌火国——那时的土地尚有绿意，火晶树开得如同满天繁星。一个穿着粗布衣裳的女人正坐在灶台前，用骨勺轻轻搅动陶罐里的粟米粥。她的背影宽厚，肩胛处有一道狰狞的伤疤，形状像是一只蜷缩的兽。

"心儿，粥要凉了。"女人回头，露出一张被灼烧伤痕覆盖却温柔至极的脸。那是[highlight]旱魃[/highlight]，或者说，是她还被称为"阿灼"时的模样。

襁褓中的婴儿发出咿呀声。阿灼将粥碗搁在窗台上，忽然望向远方——天际裂开一道紫黑色的缝隙，四凶兽的咆哮如实质般碾压而来。

"来了……"她轻声说，却没有恐惧。她低头亲吻婴儿的额头，将一支骨簪插入婴儿的发髻，"心儿乖，娘去把怪兽赶走。等火晶蝶再次开翅的时候，娘就回来给你煮粥。"

画面陡然扭曲。你看见阿灼跪在火山口，以血肉为引，将那缕逃逸的凶兽残魂硬生生拽入自己的脊椎。她的皮肤开始龟裂，瞳孔化作熔岩，每一声嘶吼都带着血肉烧焦的噼啪声。但她始终望着石屋的方向，嘴唇翕动，反复说着同一句话：

"粥……要凉了……"`,
    options: [
      { label: '（静静看完了这一幕，心中震撼）', tag: '见证', next: 'yanhuo_q03_h1_truth' }
    ]
  };

  /** 旱魃之忆 · 真相 */
  const SCENE_Q03_H1_TRUTH = {
    id: 'yanhuo_q03_h1_truth',
    title: '【隐藏 Q03_H1】旱魃的真相',
    bg: BG.taolin,
    text:
`幻境破碎。你回到现实。石棺中只剩一具蜷缩的枯骨，骨殖的指节还保持着搅拌的姿势。枯骨怀中，紧紧抱着一只焦黑的陶罐——罐底沉着一层早已[highlight]碳化的粟米粒[/highlight]。

你这才明白——所谓的「旱魃」，这个被厌火国人世代恐惧、诅咒的名字，曾是一个拼尽全力护住孩子的母亲。

她不是在封印凶兽时走火入魔。她是以血肉为引，将那缕逃逸的凶兽残魂硬生生拽入自己的脊椎，用自己的生命，换回了厌火国的安宁。也正因如此，她化作了被后人误解为「旱魃」的存在。

她的儿子——正是那位曾试图加固封印、最终陨落的首席锻造师。这层层因果，缠绕成厌火国百年的悲剧。

【隐藏揭示】
- 旱魃并非邪魔，而是以身为封的守护者
- 火灵族残魂苏醒，愿助你净化蚀火
- 获得「[highlight]火晶蝶[/highlight]」的祝福（火系抗性提升）`,
    options: [
      { label: '「以身为炉，炼尽邪祟……她的牺牲，不该被遗忘。」', tag: '悟', onChoose: (p) => { STATE.addFavor(p, 'tieXin', 30); p.unlocked.add('hanba_bless'); Engine.log('铁心好感 +30，获得火晶蝶祝福', 'good'); }, next: 'yanhuo_q03_h1_after' }
    ]
  };

  /** 隐藏 · 后续 */
  const SCENE_Q03_H1_AFTER = {
    id: 'yanhuo_q03_h1_after',
    title: '【隐藏 Q03_H1】火晶蝶',
    bg: BG.taolin,
    text:
`你从火灵神墓中退出，将所见所闻告知铁心。铁心跪在墓前，久久不能言语。

"原来……我父亲拼命想加固的封印，是他的母亲……我的祖母，用性命换来的。"铁心的声音沙哑，"我们锻族，世代以为「旱魃」是邪魔……原来，我们一直在敬仰一位英雄，却不知她的名字。"

你轻轻将一枚火晶蝶的残翅放在墓前。风过处，火晶树的花瓣纷飞，仿佛那位母亲温柔的笑脸。

【隐藏任务完成】
- 铁心好感 +30
- 获得火晶蝶的祝福（火系抗性提升）
- 揭示旱魃真相，厌火国的历史得以拨云见日`,
    options: [
      { label: '（离开墓室，继续旅途）', tag: '归去', next: 'yanhuo_q03_01_routes' }
    ]
  };

  /* ===========================================================
   * 支线 Q03_S1 · 小火的病
   * =========================================================== */

  const SCENE_Q03_S1 = {
    id: 'yanhuo_q03_s1',
    title: '【支线 Q03_S1】小火的病',
    bg: BG.city,
    text:
`你想起炎辰的宠物[highlight]小火[/highlight]——那条被火毒侵蚀的玄火蛇幼崽。它鳞片脱落了一半，露出的皮肤上有紫黑色的斑纹，眼睛浑浊无神。

炎辰抚着小火，眼眶微红：
"小火是我十岁时在火山口发现的。三年前火山第一次异常，它被火毒侵蚀了。我用灵力吊着它的命，可……它越来越虚弱了。"

要治好小火的火毒，需要——
· 火晶花 ×5
· 净魂池水 ×1
· 月光草 ×3

（需先备齐材料，方可为小火施治）`,
    options: [
      { label: '「我去寻药，治好小火。」', tag: '寻药', next: 'yanhuo_q03_s1_heal' },
      { label: '「暂缓，日后再医。」', tag: '暂缓', next: 'yanhuo_q03_01_routes' }
    ]
  };

  /** 支线S1·治愈 */
  const SCENE_Q03_S1_HEAL = {
    id: 'yanhuo_q03_s1_heal',
    title: '【支线 Q03_S1】玄火新生',
    bg: BG.city,
    text:
`你备齐火晶花、净魂池水与月光草，在炎辰的协助下，为小火炼制治愈灵药。

药力渗入小火的鳞片，紫黑色的斑纹缓缓褪去，重新长出光亮的赤红色鳞片。小火发出一声清越的嘶鸣，蛇目重现生机。

炎辰激动地抱住小火："太好了……太好了……小火，你终于好了！"

小火转过头，用脑袋轻轻蹭了蹭你的掌心——从此，它成为你可以[highlight]召唤的灵宠[/highlight]。

【支线完成】
- 小火成为可召唤灵宠（玄火蛇，伙伴契约）
- 炎辰好感 +20`,
    options: [
      { label: '（轻抚小火的鳞片）', tag: '谢', onChoose: (p) => {
          if (!p.pets.some(x => x.id === 'xuanhuo')) { STATE.addPet(p, 'xuanhuo', 'partner'); Engine.log('获得灵宠：玄火蛇·小火（伙伴契约）', 'good'); }
          STATE.addFavor(p, 'yanChen', 20);
        }, next: 'yanhuo_q03_01_routes' }
    ]
  };

  /* ===========================================================
   * 支线 Q03_S2 · 灰族的抗争
   * =========================================================== */

  const SCENE_Q03_S2 = {
    id: 'yanhuo_q03_s2',
    title: '【支线 Q03_S2】灰族的抗争',
    bg: BG.grave,
    text:
`灰族世代生活在岩浆河边，用身体过滤火毒。烬婆婆告诉你，灰族中一些年轻子弟，正策划一场「[highlight]抗争[/highlight]」——他们不愿再世世代代充当「缓冲垫」，想要奋起改变灰族的命运。

烬婆婆叹息："他们……是对的。灰族……不该……永远……被当作……封印的……牺牲品。但……若贸然反抗……只怕……会引来……锻族的……镇压。"

她望向你："外乡人……你……能……帮帮……他们……吗？"
`,
    options: [
      { label: '「我来居中调停，为灰族争取平等的地位。」', tag: '调停', next: 'yanhuo_q03_s2_mediate' },
      { label: '「带我去见那些抗争的年轻子弟。」', tag: '探访', next: 'yanhuo_q03_s2_visit' }
    ]
  };

  /** 支线S2·调停 */
  const SCENE_Q03_S2_MEDIATE = {
    id: 'yanhuo_q03_s2_mediate',
    title: '【支线 Q03_S2】火无贵贱',
    bg: BG.city,
    text:
`你借由在厌火国的声望，召集了锻族长老与灰族代表，居中调停。

你陈明利害：灰族并非「累赘」，而是厌火国得以存续的支柱。若继续压榨灰族，终将寒了民心，也断送厌火的未来。

最终，在你的斡旋下，锻族与灰族达成协议——灰族获得平等的地位与资源，不再被迫充当封印的「缓冲垫」。烬婆婆望着这一幕，眼中泛起泪光：

"……三百……年了……灰族……终于……等到了……这一天……"

【支线完成】
- 灰族获得平等地位
- 烬婆婆好感 +30
- 厌火国上下同心，士气大振`,
    options: [
      { label: '（与灰族共庆新生）', tag: '谢', onChoose: (p) => { STATE.addFavor(p, 'jinPoPo', 30); STATE.addFavor(p, 'yanChen', 15); p.unlocked.add('huizu_ally'); }, next: 'yanhuo_q03_01_routes' }
    ]
  };

  /** 支线S2·探访 */
  const SCENE_Q03_S2_VISIT = {
    id: 'yanhuo_q03_s2_visit',
    title: '【支线 Q03_S2】灰族少年',
    bg: BG.grave,
    text:
`你随烬婆婆来到灰族聚居区，见到那些抗争的年轻子弟。为首的是一个叫[highlight]灰烬[/highlight]的少年，他双目赤红，激动道：

"外乡人，我们灰族不是牲畜！凭什么锻族能住高楼，我们却要世世代代住在岩浆河边，用命去过滤火毒？！"

烬婆婆沉声道："灰烬……安静。这位……外乡人……是……来……帮……我们……的。"

你看着这群被压迫了三百年的灰族少年，心中动容。他们不是在闹事，是在为生存而呐喊。

【支线提示】
- 需在厌火国建立一定声望，方能有效调停
- 灰族的抗争，是厌火国深层矛盾的缩影`,
    options: [
      { label: '「你们的诉求，我会代为传达。但也请给我时间，以和平的方式改变。」', tag: '承诺', onChoose: (p) => { STATE.addFavor(p, 'jinPoPo', 10); p.unlocked.add('huizu_dialogue'); Engine.log('你承诺为灰族争取平等', 'good'); }, next: 'yanhuo_q03_s2_mediate' }
    ]
  };

  /* ===========================================================
   * 支线 Q03_S3 · 铁心的执念
   * =========================================================== */

  const SCENE_Q03_S3 = {
    id: 'yanhuo_q03_s3',
    title: '【支线 Q03_S3】铁心的执念',
    bg: BG.temple,
    text:
`铁心的父亲陨落于火灵神殿后，铁心始终无法释怀。他日复一日地锻打着那把[highlight]断裂的锻造锤[/highlight]，仿佛要将所有的悔恨都敲进锤中。

"我父亲……他明知会死，还是去了火灵神殿。"铁心低声道，"他留的信里说，永恒熔炉是「枷锁」。可他却选择去守这枷锁。为什么？为什么要把自己活活困死？"

你看着那把锤，想起在岩浆湖底看到的那具骸骨——铁心的父亲，至死都握着这把锤，试图加固封印。

【支线提示】
- 铁心需要明白，他父亲不是被困死，而是选择了守护
- 修复这把断裂的锻造锤，或许能解开铁心的心结`,
    options: [
      { label: '「铁心，你父亲的锤，从未断过。它一直在守护厌火。」', tag: '开解', onChoose: (p) => { STATE.addFavor(p, 'tieXin', 15); }, next: 'yanhuo_q03_s3_forge' },
      { label: '「我们一起，把这把锤重新锻好。」', tag: '共锻', next: 'yanhuo_q03_s3_forge' }
    ]
  };

  /** 支线S3·重锻 */
  const SCENE_Q03_S3_FORGE = {
    id: 'yanhuo_q03_s3_forge',
    title: '【支线 Q03_S3】圣锤重铸',
    bg: BG.crater,
    text:
`在你的陪伴下，铁心重新点燃熔炉，将那把断裂的锻造锤回炉重铸。火核的灵火（或地火）包裹着锤身，铁心的眼神逐渐清明。

"我父亲……他没有被困死。"铁心忽然道，"他选择了守护。就像我祖母，就像灰族。他们不是被厌火困住了……是他们选择了守护厌火。"

锤身重现锋芒，泛起一层温润的灵光——[highlight]圣锤[/highlight]重铸而成。

铁心握紧新锤，长长吐出一口气："从今往后，我用这把锤，守护厌火，也守护每一个选择守护他人的人。"

【支线完成】
- 铁心重铸圣锤，解开父亲的心结
- 铁心好感 +25
- 获得「[highlight]圣锻之锤[/highlight]」（可锻造强力法器）`,
    options: [
      { label: '（看着焕然一新的圣锤，会心一笑）', tag: '谢', onChoose: (p) => { STATE.addFavor(p, 'tieXin', 25); p.unlocked.add('shengchui'); STATE.addMaterial(p, 'MAT-YH08', 1); }, next: 'yanhuo_q03_01_routes' }
    ]
  };

  /* ===========================================================
   * 厌火国自由行动系统
   * 在熔炉城安顿后，玩家可在修炼/探索/采集/炼丹/集市/灵宠/突破间自由选择
   * =========================================================== */


  /* ---------- 暴露所有场景（支持函数形式的动态场景） ---------- */
  global.YANHUO_SCENES = {
    // 序章
    yanhuo_entry: SCENE_ENTRY,
    yanhuo_01_arrive: SCENE_ARRIVE,
    yanhuo_01_guard: SCENE_GUARD,
    yanhuo_01_intro: SCENE_INTRO,
    yanhuo_01_jinpopo: SCENE_JINPOPO,
    yanhuo_01_final: SCENE_FINAL,

    // 主线 Q03_01
    yanhuo_q03_01_mine: SCENE_Q03_01_MINE,
    yanhuo_q03_01_letter: SCENE_Q03_01_LETTER,
    yanhuo_q03_01_temple: SCENE_Q03_01_TEMPLE,
    yanhuo_q03_01_tentacle: SCENE_Q03_01_TENTACLE,
    yanhuo_q03_01_lake: SCENE_Q03_01_LAKE,
    yanhuo_q03_01_routes: SCENE_Q03_01_ROUTES,

    // 主线 Q03_02
    yanhuo_q03_02_core: SCENE_Q03_02_CORE,
    yanhuo_q03_02_choice: SCENE_Q03_02_CHOICE,
    yanhuo_q03_02_combat: SCENE_Q03_02_COMBAT,
    yanhuo_q03_02_sealcrash: SCENE_Q03_02_SEALCRASH,
    yanhuo_q03_02_final_combat: SCENE_Q03_02_FINAL_COMBAT,
    yanhuo_q03_02_final_after: SCENE_Q03_02_FINAL_AFTER,
    yanhuo_q03_02_gongsheng: SCENE_Q03_02_GONGSHENG,
    yanhuo_q03_02_gongsheng_win: SCENE_Q03_02_GONGSHENG_WIN,
    yanhuo_q03_02_duoxin: SCENE_Q03_02_DUOXIN,
    yanhuo_q03_02_duoxin_win: SCENE_Q03_02_DUOXIN_WIN,
    yanhuo_q03_02_huoling: SCENE_Q03_02_HUOLING,
    yanhuo_q03_02_huoling_win: SCENE_Q03_02_HUOLING_WIN,

    // 主线 Q03_03 三结局
    yanhuo_q03_03_linghuo: SCENE_Q03_03_LINGHUO,
    yanhuo_q03_03_yujin: SCENE_Q03_03_YUJIN,
    yanhuo_q03_03_fentu: SCENE_Q03_03_FENTU,
    yanhuo_end: SCENE_END,

    // 隐藏 Q03_H1
    yanhuo_q03_h1: SCENE_Q03_H1,
    yanhuo_q03_h1_truth: SCENE_Q03_H1_TRUTH,
    yanhuo_q03_h1_after: SCENE_Q03_H1_AFTER,

    // 支线 Q03_S1/S2/S3
    yanhuo_q03_s1: SCENE_Q03_S1,
    yanhuo_q03_s1_heal: SCENE_Q03_S1_HEAL,
    yanhuo_q03_s2: SCENE_Q03_S2,
    yanhuo_q03_s2_mediate: SCENE_Q03_S2_MEDIATE,
    yanhuo_q03_s2_visit: SCENE_Q03_S2_VISIT,
    yanhuo_q03_s3: SCENE_Q03_S3,
    yanhuo_q03_s3_forge: SCENE_Q03_S3_FORGE,

    // 自由行动（动态场景，函数形式）
  };
})(window);
