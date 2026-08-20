/* ===========================================================
 * 问道山海 · 归墟国 完整剧情链
 * 对应策划案第二十国 归墟国 · 封界之墟（Q20）
 * 包含：序章（封流入境）+ 主线Q20_01/02/03 + 隐藏Q20_H1（原初之封）
 *      + 支线Q20_S1/S2/S3 + 归墟国自由行动
 * 背景图：复用 assets/img/nations/ 现有资源（qing 系 / yum 系）
 * 好感度：STATE.addFavor / STATE.getFavor（墟离xuli等）
 * 三结局：全封 / 解封 / 墟天
 * 关键：四凶之「尾」——归墟之扉（第二十国·收官）
 * =========================================================== */
(function (global) {
  'use strict';

  /* ---------- 公共路径引用（复用现有背景，避免引用不存在的图片） ---------- */
  const BG = {
    sig:   'assets/img/nations/guixu-void.jpg',        // 归墟国·专属主题（万物归墟）
    plain: 'assets/img/nations/qing-taolin.jpg',       // 封原 / 封塔高原
    tower: 'assets/img/nations/yum-qiongding.jpg',     // 墟塔 / 最深封塔
    city:  'assets/img/nations/yum-tianyu-city.jpg',   // 全封城 / 封印阵国都
    valley:'assets/img/nations/qing-shadow-altar.jpg', // 解封谷 / 自由避难所
    origin:'assets/img/nations/qing-fog-abyss.jpg',    // 原初之封 / 第一缕封印
    core:  'assets/img/nations/yum-jitan.jpg',         // 封核祭坛 / 中央封
    high:  'assets/img/nations/yum-channel.jpg',       // 封原之巅
    boss:  'assets/img/nations/qing-fying-boss.jpg'    // 混沌封兽 Boss 战
  };

  /* ===========================================================
   * 序章 · 封流入境
   * =========================================================== */

  /** 入境入口（跂踵国结局「前往归墟国」跳转至此） */
  const SCENE_ENTRY = {
    id: 'guixu_entry',
    title: '【归墟国·序】封流入境',
    bg: BG.sig,
    text:
`你辞别跂踵国的行原，沿封骨古道一路南行，最终抵达归墟国的边缘——封原。

封骨古道的尽头，空气突然变得……「封」？不，是过于「封」，像是千万种封印同时燃烧的声响。你的胸口——如果你有的话——开始紧缩，不是因为呼吸，是因为空气中弥漫的「封流粒子」正在刺激你的封印感。

你踏出古道的第一步，脚下的地面突然凝固——不是陷阱，是「封陷区」，地面由无数层压缩的封印残渣与灰烬构成，坚硬如铁。你下沉了约三尺，然后被什么东西托住。

那是一个由肋骨构成的人形。他没有胸口，或者说胸口是一个开放的、旋转着金色火焰的封印。他把你拉上来，动作意外地轻柔。

【老封】"外乡人。小心……你……踏进……「封火区」了。（声音沙哑，像是封印摩擦石块）不要……深呼吸……等……封流……退潮……"

他指向远处。金色的封流正在退去，露出地面——地面不是泥土，是……「封印化石」？无数层压缩的、已经石化的封印、结界、节点，偶尔还有……牙齿？骨骼？

【老封】"我是老封，退役封者。三十年前，我在墟塔边缘被封流卷走封印感。但我看到了……「它」。（压低声音）不是虚月。是更古老的东西。一枚尾骨。一枚……比山还大的尾。它埋在塔底，封印的……不是存在。是「世界」……"`,

    options: [
      { label: '「封印「世界」的尾？那是四凶的尾？」', tag: '震惊', reply: '老封：「……不……知道。但……那尾……在……「封」……世界。被……封印……的……世界……失去……了……「存在」……」', next: 'guixu_01_city' },
      { label: '「带我去墟塔。」', tag: '直接', onChoose: (p) => { STATE.addFavor(p, 'laofeng', 10); Engine.log('老封：「……不行。没有……「封铠」……和……满墟……的……指引……你……会……在……封流……中……迷失。」', 'info'); }, next: 'guixu_01_city' },
      { label: '（注意老封假印上的符文）', tag: '观察', reply: '你发现老封的假印上刻满了细密的符文，那是解封者的文字。', replyTitle: '观察', next: 'guixu_01_city' }
    ]
  };

  /** 全封城 · 遇墟离 */
  const SCENE_CITY = {
    id: 'guixu_01_city',
    title: '【归墟国·序】全封城',
    bg: BG.city,
    text:
`[img]assets/img/npc/npc_xuli.jpg[/img]\n\n远处，一个少女站在封塔边。她的胸口透明，内部的封印是淡金色的，但此刻……封印中漂浮着紫黑色的残渣，像是无法封印的油污。

【墟离】（看到你，疲惫地微笑）"外乡人。你……身上的……「能量」……很……「杂」。青丘的月华、羽民的风息、厌火的炎髓、轩辕的机芯、玄股的水精、讙头的渊脂、三首的魂焰、聂耳的震波、大人的擎血、白民的灵肉、长股的时砂、周饶的微尘、交胫的命丝、柔利的蜕液、深目的瞳光、无肠的饥火、一目的视光、结胸的贯流、跂踵的行流。你……是「能量的拼凑物」。"

她透明的胸口封印中，封印微微旋转，将那些紫黑色残渣搅碎，但残渣越来越多。

【墟离】"我是墟离，归墟主之女。我的封印……已经「反噬」七天了。不是普通的反噬……是「世界」……在……我的……胸口……「尖叫」。我……在「现在」封印……但我的「归墟」……正在……「吞噬」我……"`,

    options: [
      { label: '「我能感觉到。虚月的污染……在侵蚀封印的结构。」', tag: '共情', onChoose: (p) => { STATE.addFavor(p, 'xuli', 15); Engine.log('墟离好感 +15', 'good'); }, next: 'guixu_01_manxu' },
      { label: '「封核是什么？它不能稳定封印吗？」', tag: '询问', reply: '墟离：「封核……是……「锚」。但……锚……本身……也在……「生锈」……」', next: 'guixu_01_manxu' },
      { label: '（注意墟离的封印）', tag: '观察', reply: '你发现她的封印中，有一丝紫黑色的火焰，连接着墟塔的方向。', replyTitle: '观察', next: 'guixu_01_manxu' },
      { label: '「带我去墟塔。我要看看那枚尾骨。」', tag: '直接', reply: '墟离摇头：「……那里……是……「禁区」。进去的人……有的……「封」了……自己……有的……「被封」……有的……永远……困在……「封印」……中……」', next: 'guixu_01_manxu' }
    ]
  };

  /** 解封谷 · 遇满墟 */
  const SCENE_MANXU = {
    id: 'guixu_01_manxu',
    title: '【归墟国·序】解封谷',
    bg: BG.valley,
    text:
`墟离带你来到解封谷。这里的人拒绝封印，胸口完整，眼神清醒。谷中央，一个青年正站在那里——他的胸口……是完整的。有骨，有肉，无印。在归墟国，这反而是一种「畸形」。

【满墟】"……外乡人。你……身上的……能量……很……「满」。你没有……封印……的……感觉？你……是……「自由的」？"

他的声音低沉而坚定，带着某种被禁止的平静。

【满墟】"我是满墟，解封者领袖。三十年前，我天生无印，被放逐。但我看到了……「它」的真实。（压低声音）那枚尾骨……不是惩罚。是「进化」的陷阱。归墟族以为……没有……印……可以……永远封印。但……那枚尾骨……在……「收集」……所有……被封印……的……能量。它在……「重组」……一个……「东西」……"`,

    options: [
      { label: '「重组一个东西？四凶的本体？」', tag: '震惊', reply: '满墟：「……不……确定。但……当……二十国……的……封印……全部……松动……它……就……会……「重组」……完成……」', next: 'guixu_01_fengliong' },
      { label: '「带我去墟塔。」', tag: '直接', onChoose: (p) => { STATE.addFavor(p, 'manxu', 15); Engine.log('满墟：「……可以。但……需要……封灵……的……指引。」', 'info'); }, next: 'guixu_01_fengliong' },
      { label: '（注意满墟的胸口）', tag: '观察', reply: '你发现他的胸口上有……无数细小的、封印的痕迹？他在隐藏什么？', replyTitle: '观察', next: 'guixu_01_fengliong' }
    ]
  };

  /** 封灵 · 预言 */
  const SCENE_FENGLIONG = {
    id: 'guixu_01_fengliong',
    title: '【归墟国·序】封灵预言',
    bg: BG.valley,
    text:
`解封谷中央有一座由封塔石搭建的帐篷，帐篷中趴着一条巨大的封塔龙——封灵。它正在「封印」，但新展开的结界是紫黑色的，带着瓦解性，蚀穿了地面。

【封灵】（开口说话，声音如同封印燃烧）"……你……来了。我「等」你很久了。从……三天前……的……「封流」……中……我……就……「封」到……你……"

它的体表映出你的倒影——但那个倒影有十九种能量叠加，正在被某种东西封印。

【封灵】"墟塔……不是……「塔」。是……「门」。某个……「东西」……试图……封印……「世界」……到达……「现在」……它……很……想……封……已经……想……了……三千年……那枚尾骨……只是……它……「关门」……时……掉落的……碎片……"`,

    options: [
      { label: '「「它」是谁？四凶之一的混沌？」', tag: '追问', reply: '封灵：「……混沌……不是……「兽」……是……「封印」……本身。那枚尾骨……是……四凶……的……第五道……本体气息……也是……「归墟之扉」……的……钥匙……」', next: 'guixu_01_altar' },
      { label: '「有阻止的方法吗？」', tag: '询问', reply: '封灵：「……三种。「全封」……让……它……封够……永远……「解封」……解除……所有……封印……「墟天」……主动……拥抱……「它」……」', next: 'guixu_01_altar' },
      { label: '（注意封灵封印的紫黑）', tag: '观察', reply: '你发现封灵封印的紫黑色中，有细小的、无法封印的「记忆碎片」在挣扎。', replyTitle: '观察', next: 'guixu_01_altar' },
      { label: '「带我去墟塔。现在。」', tag: '直接', onChoose: (p) => { STATE.addFavor(p, 'fengliong', 15); }, next: 'guixu_01_altar' }
    ]
  };

  /** 序章收束 · 封核 */
  const SCENE_ALTAR = {
    id: 'guixu_01_altar',
    title: '【归墟国·序】序章 · 完',
    bg: BG.core,
    text:
`封灵的预言，让墟离与满墟都沉默了。你望向封原中央那座若隐若现的最深之塔——那是「墟塔」，也是归墟国命运的伤口。

【墟离】"……如果……混沌封兽……真的……会……「重组」……我们……必须……在……它……苏醒……前……阻止……它。"

她望向墟塔的方向，眼神坚定：

【墟离】"原初之封……「原初之印」……那是……唯一的……希望。"

【序章完成】
- 经验 +2000
- 获得「封铠」（试用版，可抵御封流侵蚀）
- 墟离好感：视选择而定
- 解锁「封原」地图、「封印视界」`,
    options: [
      { label: '「带我去墟塔。」', tag: '同行', next: 'guixu_q20_01_tower' },
      { label: '「先去封核祭坛，见归墟主。」', tag: '沉稳', next: 'guixu_q20_01_tower' }
    ]
  };

  /* ===========================================================
   * 主线 Q20_01 · 封界之墟
   * =========================================================== */

  /** 墟塔 · 封流残片 */
  const SCENE_Q20_01_TOWER = {
    id: 'guixu_q20_01_tower',
    title: '【主线 Q20_01】墟塔',
    bg: BG.tower,
    text:
`墟塔位于封原中央，塔底连接着「归墟之扉」。塔中的封流永不停歇，但流动的颜色……不是正常的金色，是紫黑色的，夹杂着金色的波纹。

满墟带你来到塔底。这里的封流最盛，你感觉自己的存在正在被撕扯，一部分被拉向塔底，一部分被推向外围。

【满墟】"……不要……看……塔底……那些……「封印」……会……「封」……你的……存在……跟着……我的……胸……走……"

深入塔底约百丈，你们来到了「尾骨」所在。那是一枚巨大的、嵌入塔底的尾骨碎片，宽约十丈，深不见底。尾骨的内壁不是骨质，是「凝固的封流」——你看到无数封印在其中纠缠、封闭、重组。

尾骨底部，有一块……尾骨碎片，足有一人高，呈紫黑色，表面布满了细密的纹路——那些纹路是「被封印的世界」留下的痕迹。

【墟离】（在尾骨前跪下，她的胸口封印剧烈颤抖）"……这就是……「混沌封兽」……的……碎片。它……在……「封」……世界……不是……比喻……是……字面……意义……"

突然，尾骨中涌出了「它们」。不是生物，是「封流残片」——被封印后吐出的、扭曲的封印实体。它们有的呈现出远古巨兽的形态，有的呈现出未来机械的形态，有的……是你自己的存在，但来自不同的封印方向。`,
    options: [],
    battle: {
      enemy: { name: '封流残片 ×6', hp: 4200, atk: 248, def: 152, lv: 93, element: '封', bg: BG.tower },
      onWin: (p) => {
        if (global.Engine) Engine.log('击败封流残片', 'good');
        STATE.completeQuest(p, 'GUIXU_FENGLIU_CLEARED');
        p.realm.exp = (p.realm.exp || 0) + 6500;
        STATE.addMaterial(p, 'MAT-GX01', 3);
        if (global.Engine) Engine.toast('经验+6500，封砂×3', 'gold');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌封流残片，重伤退却', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.15));
      },
      after: 'guixu_q20_01_weigu'
    }
  };

  /** 尾骨 · 混沌封兽 */
  const SCENE_Q20_01_WEIGU = {
    id: 'guixu_q20_01_weigu',
    title: '【主线 Q20_01】混沌封兽',
    bg: BG.tower,
    text:
`战斗后，封灵的封印缠住了尾骨中的紫黑碎片。

【封灵】"……我……可以……「封印」……它的……「记忆」……（颤抖）……它……在……「梦」中……「封」了……十九个……时代……全部……被……它……「封印」了……"`,

    options: [
      { label: '「十九个时代？历史被它封印了？」', tag: '震惊', reply: '封灵：「……不是……「历史」……是……「存在」……那些……时代……本来……可以……存在……但……被……它……「封」掉……了……所以……现在……只剩……「被封成一片」……」', next: 'guixu_q20_01_core' },
      { label: '【取走尾骨】', tag: '取骨', onChoose: (p) => { STATE.addMaterial(p, 'MAT-GX07', 1); p.unlocked.add('hundun_weigu2'); Engine.log('获得「混沌尾骨碎片」（可探测四凶本体位置）', 'good'); }, next: 'guixu_q20_01_core' },
      { label: '（注意尾骨深处的微光）', tag: '观察', onChoose: (p) => { p.unlocked.add('yuanchu_feng'); Engine.log('你发现尾骨底部有微弱的光芒——那是「原初之封」，混沌没有封印的「希望」', 'good'); }, next: 'guixu_q20_01_core' }
    ]
  };

  /** 封核 · 归墟主的秘密 */
  const SCENE_Q20_01_CORE = {
    id: 'guixu_q20_01_core',
    title: '【主线 Q20_01】封核祭坛',
    bg: BG.core,
    text:
`回到封核祭坛，归墟主——一个胸口封印几乎完全紫黑化的老者——正站在封核前。封核的表面出现了裂痕，裂痕中渗出紫黑色的封流。

【归墟主】"……外乡人。你……去了……墟塔。（声音如同封印燃烧）我……知道……你会去。封灵……「封」到了。我也……「印」到了。"

他指向封核。封核开始「反噬」——吐出紫黑色的、无法封印的封流。

【归墟主】"封核……不是……「稳定」……封印……的。是……「喂养」……封印……的。它……每……百年……需要……一次……「时代之封」……作为……燃料。但……混沌封兽……在……「偷封」……燃料……"

他看向你，眼神中有一种可怕的疲惫。

【归墟主】"我……一直……在……用……「解封者」……的……「自由」……作为……替代……燃料。他们……「耐封」……所以……「耐印」……但……解封者……快……用完……了……"`,

    options: [
      { label: '「你在用解封者的自由喂养封核？这和奴役有什么区别！」', tag: '愤怒', onChoose: (p) => { STATE.addFavor(p, 'manxu', 10); }, next: 'guixu_q20_01_routes' },
      { label: '「有彻底解决的方法吗？」', tag: '冷静', reply: '归墟主：「……有。找到……「原初之印」……在……原初之封……那是……世界……诞生……前……的……「第一缕封印」……它……是……混沌……无法……封印……的……因为……它……「还没封印」……」', next: 'guixu_q20_01_routes' },
      { label: '「这是第二十国了。归墟之扉要打开了吗？」', tag: '质问', reply: '归墟主沉重地点头：「……二十国……的……封印……是……「二十把锁」……当……最后……一把……也……松动……「归墟之扉」……就……会……完全……打开……」', next: 'guixu_q20_01_routes' }
    ]
  };

  /** 三路线分歧 */
  const SCENE_Q20_01_ROUTES = {
    id: 'guixu_q20_01_routes',
    title: '【主线 Q20_01】三路抉择',
    bg: BG.core,
    text:
`面对混沌封兽与归墟国的命运，三条道路摆在面前——

【[highlight]路线A·全封[/highlight]】墟离主导的「全封方案」——利用归墟族最精密的封印术，在原初之印完全封完前，将「原初之封」从原初之封取下，注入封核，修复封印线。需要有人以超越极限的封印力承载原初之封，而那个人……可能会「封散」。

【[highlight]路线B·解封[/highlight]】满墟主导的「解封方案」——利用封核的最后能量，解除墟塔周围百里内的所有封印，将混沌封兽永远封在「自由」中。代价是归墟国失去「封印」之力。

【[highlight]路线C·墟天[/highlight]】（须恶念深重）主动献祭一个「时代」的存在，喂饱混沌，让它继续沉睡。`,
    options: [
      { label: '「走全封之路，以原初之封修复封印。」', tag: '全封', onChoose: (p) => { p.q20_route = 'quanfeng'; }, next: 'guixu_q20_02_boss' },
      { label: '「走解封之路，解除所有封印。」', tag: '解封', onChoose: (p) => { p.q20_route = 'jiefeng'; }, next: 'guixu_q20_02_boss' },
      { label: '「（若恶念≥55）墟天之路，喂饱混沌。」', tag: '墟天', require: 'evil_gte', requireValue: 55, onChoose: (p) => { p.q20_route = 'xutian'; }, next: 'guixu_q20_02_boss' }
    ]
  };

  /* ===========================================================
   * 主线 Q20_02 · 封印之战
   * =========================================================== */

  /** 混沌封兽 Boss 战 */
  const SCENE_Q20_02_BOSS = {
    id: 'guixu_q20_02_boss',
    title: '【主线 Q20_02】混沌封兽',
    bg: BG.boss,
    text:
`封核剧烈震颤，混沌封兽从墟塔的封流中完全挣脱，化作一头巨大的、不断收缩的封印结界巨兽——混沌封兽。它的身躯由无数层压缩的「封印」构成，仿佛一座由被封印者堆砌而成的活体监狱。

【混沌封兽】（声音如同万封同时崩塌）"……封……还要……更多……「过去」……「现在」……「未来」……全部……都要……被……「封印」……"

墟离、满墟、老封站在你身边，共同直面这由「封印」本身构成的庞然大物。它的核心处，封印着四凶的第五道本体气息——那是「归墟之扉」的钥匙。`,
    options: [],
    battle: {
      enemy: { name: '混沌封兽', hp: 11000, atk: 298, def: 178, lv: 98, element: '封', bg: BG.boss },
      onWin: (p) => {
        if (global.Engine) Engine.log('击败混沌封兽', 'good');
        STATE.completeQuest(p, 'GUIXU_FENGSHOU_SLAIN');
        p.realm.exp = (p.realm.exp || 0) + 8500;
        STATE.addMaterial(p, 'MAT-GX06', 1);
        if (global.Engine) Engine.toast('经验+8500，获得封之砂', 'gold');
        return 'guixu_q20_02_' + (p.q20_route || 'quanfeng');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌混沌封兽，重伤退却', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.1));
      },
      after: 'guixu_q20_02_quanfeng'
    }
  };

  /** 全封路线 · 超越封印之承 */
  const SCENE_Q20_02_QUANFENG = {
    id: 'guixu_q20_02_quanfeng',
    title: '【主线 Q20_02】全封之路 · 超越封印之承',
    bg: BG.origin,
    text:
`你选择全封路线。墟离站在原初之印前，深吸一口气。

【墟离】"……外乡人。如果……我……「封散」了……请……记住……我……曾经……「存在」过……"

她开始承受。原初之封融入她的胸口——她的封印开始「过载」，金色的封流从透明空洞喷涌而出，但她的眼神无比坚定。

【墟离】（声音带着决绝）"……原来……「全封」……的……尽头……不是……「封印一切」……是……「理解存在」……"

她控制住了。原初之封在她体内稳定下来，她的封印定格在一种「封印一切但保持存在」的状态。

【墟离】（身体变得不稳定，偶尔封散三息）"……带着……原初之封……的……力量……去……修复……封核……"`,

    options: [
      { label: '（接住封之砂，奔回封核祭坛）', tag: '行动', onChoose: (p) => { STATE.addMaterial(p, 'MAT-GX08', 1); STATE.completeQuest(p, 'Q20_MAIN_DONE'); STATE.addFavor(p, 'xuli', 30); }, next: 'guixu_q20_03_fengquan' }
    ]
  };

  /** 解封路线 · 自由之解 */
  const SCENE_Q20_02_JIEFENG = {
    id: 'guixu_q20_02_jiefeng',
    title: '【主线 Q20_02】解封之路 · 自由之解',
    bg: BG.valley,
    text:
`你选择解封路线。满墟站在墟塔口，将封核碎片插入自己的胸口。

【满墟】"……我……已经……「自由」……了……三十年。再……「自由」……三千年……也……无所谓。但……你们……还……「年轻」……去……「封印」……活着……"

他跃入墟塔。封核碎片爆发，金色的光芒解除了塔口百里内的所有封印——包括满墟自己，包括混沌封兽，包括飘落的封印、燃烧的封流、甚至……光线本身。

墟塔变成了一片「自由」。一片永远解封的、美丽的、悲伤的自由。

【后续】
- 归墟国进入「解封时代」，国土一半自由，一半封印
- 满墟成为「解封守护者」，被困在自由中，但意识清醒`,
    options: [
      { label: '（望着那片自由的塔，默然良久）', tag: '解封', onChoose: (p) => { STATE.completeQuest(p, 'Q20_MAIN_DONE'); STATE.addFavor(p, 'manxu', 30); }, next: 'guixu_q20_03_fengwu' }
    ]
  };

  /** 墟天路线 · 封印的契约 */
  const SCENE_Q20_02_XUTIAN = {
    id: 'guixu_q20_02_xutian',
    title: '【主线 Q20_02】墟天之路 · 封印的契约',
    bg: BG.tower,
    text:
`你选择墟天路线。归墟主献祭「解封者时代」，主动释放混沌封兽的力量。

【归墟主】"……对不起。但……「整体」……比……「部分」……重要……"

解封者们在无声中消失。不是死亡，是「从未存在过」。满墟看着自己的身体——他的胸口正在一根根消失。

【满墟】"……我……「自由」……不……了……了……因为……「存在」……被……「封」……掉……了……"

混沌封兽满足了，缩回墟塔深处。但归墟主的封印……开始「超前」——他的身体还在「现在」，存在却已经到了「明天」。

【后续】
- 归墟国恢复「正常」，但失去了「过去」的一部分存在
- 归墟主成为「墟天者」，每十年封印一岁，存在永远超前`,
    options: [
      { label: '（立于存在的伤痕之上，俯瞰一切）', tag: '墟天', onChoose: (p) => { STATE.completeQuest(p, 'Q20_MAIN_DONE'); STATE.addEvil(p, 35); p.unlocked.add('xutianzhe'); Engine.log('获得「墟天者」称号，恶念+35', 'evil'); }, next: 'guixu_q20_03_fengshi' }
    ]
  };

  /* ===========================================================
   * 主线 Q20_03 · 三结局
   * =========================================================== */

  /** 全封结局 · 封全 */
  const SCENE_Q20_03_FENGQUAN = {
    id: 'guixu_q20_03_fengquan',
    title: '【归墟国·终】封全',
    bg: BG.core,
    text:
`封核修复，封印线稳定。墟离站在全封城上，身体偶尔闪烁。

【墟离】"……我……可以……「封印」……所有……的……「存在」……但……我……选择……「存在」……因为……「存在」……有……你……"

她微笑，透明的胸口封印中，金色的封流温暖而明亮。

【全封结局 · 封全】
- 墟离成为可招募队友「封全·墟离」（UR级，封属性，可操控封印与解封）
- 解锁「全封行者」技能树
- 混沌尾骨碎片被净化，化为「封之砂」（可重置任意封印一次）`,
    options: [
      { label: '「愿封印永固，存在长存。」（归墟国·完）', tag: '完', onChoose: (p) => { STATE.addFavor(p, 'xuli', 30); p.unlocked.add('xuli_recruit'); }, next: 'guixu_end' }
    ]
  };

  /** 解封结局 · 封无 */
  const SCENE_Q20_03_FENGWU = {
    id: 'guixu_q20_03_fengwu',
    title: '【归墟国·终】封无',
    bg: BG.valley,
    text:
`墟塔的「自由」前，人们献花。

【墟离】（对着自由中的满墟说话）"……我……会……经常……来看你。每……「一秒」……都……来……"

自由中，仿佛有一团微弱的封流，轻轻动了动，像是满墟在点头。

【解封结局 · 封无】
- 满墟成为「解封守护者」，可在特定时刻与玩家对话
- 解锁「解封」技能（解除局部封印3回合）
- 混沌封兽被解除封印，但仍在缓慢重组`,
    options: [
      { label: '「解封以护，自由永驻。」（归墟国·完）', tag: '完', onChoose: (p) => { STATE.addFavor(p, 'manxu', 25); p.unlocked.add('jiefeng'); }, next: 'guixu_end' }
    ]
  };

  /** 墟天结局 · 封噬 */
  const SCENE_Q20_03_FENGSHI = {
    id: 'guixu_q20_03_fengshi',
    title: '【归墟国·终】封噬',
    bg: BG.tower,
    text:
`归墟主的封印超前得越来越远，他的身体开始追赶影子。

【归墟主】"……快……「明天」……在……召唤……我……"

归墟国的历史被抹去了一部分，但混沌暂时满足，继续沉睡。

【墟天结局 · 封噬】
- 玩家获得「墟天者」称号，可消耗经验值封印任意事件
- 解锁邪道任务「封天」`,
    options: [
      { label: '「封之饥渴，永无止境。」（归墟国·完）', tag: '完', onChoose: (p) => { STATE.addEvil(p, 10); }, next: 'guixu_end' }
    ]
  };

  /** 归墟国结局收束 · 第二十境 · 归墟之扉 */
  const SCENE_END = {
    id: 'guixu_end',
    title: '【归墟国·终】第二十境 · 归墟之扉',
    bg: BG.high,
    text:
`你立于墟塔之巅，回望这片封印与存在交织的国土——无论是封印永固的全封，还是自由永驻的解封，抑或拥抱封印的墟天，归墟国的故事，都已告一段落。

封流渐息。山海大陆的尽头，那道深紫色的巨大裂缝——「归墟之扉」——在天空中缓缓睁开。

二十国的封印，已经全部松动。四凶的「眼、鼻、舌、手、身、触、意、耳、骨、口、牙、鳞、爪、尾、视、胃、目、胸、足、封」，二十道本体气息，已在「归墟」中完全汇聚。

你，集齐了「二十国之印」的行者，站在了归墟之扉前。真正的终章——[highlight]归墟篇·四凶本体[/highlight]——等待着你的抉择。

【恭喜完成归墟国主线·第二十境·完】

二十国剧情线全部完成。归墟之扉，即将开启。`,
    options: [
      { label: '【踏入归墟之扉】直面四凶本体（终章·最终决战）', tag: '决战', onChoose: (p) => {
          p.fourFierceStage = 0;   // 重置四凶连战进度
          p._fourFierceBlessSkills = [];  // 祖师赐福额外技能
        }, next: 'fourfierce_intro' },
      { label: '（暂缓，先回返准备）', tag: '暂缓', next: 'home' }
    ]
  };

  /* ===========================================================
   * 归墟篇 · 四凶本体（最终决战·四连战）
   * 饕餮 → 梼杌 → 穷奇 → 混沌，连续作战，状态不重置
   * =========================================================== */

  /** 四凶数据（100级，供奉1000神灵力降为90级） */
  function getFourFierce(p) {
    const downgrade = (p.offerValue || 0) >= 1000;   // 神灵力：供奉圆满降级
    const lv = downgrade ? 90 : 100;
    const lvGrow = 1 + 0.05 * (lv - 1);   // 与战斗一致的等级成长
    return [
      { id:'taotie', name:'饕餮', title:'四凶·口', element:'吞', desc:'吞噬万物的饥饿化身', lv,
        hp: Math.floor(9800 * lvGrow), atk: Math.floor(185 * lvGrow), def: Math.floor(120 * lvGrow) },
      { id:'taowu',  name:'梼杌', title:'四凶·足', element:'行', desc:'永不停歇的暴走化身', lv,
        hp: Math.floor(9000 * lvGrow), atk: Math.floor(175 * lvGrow), def: Math.floor(150 * lvGrow) },
      { id:'qiongqi',name:'穷奇', title:'四凶·耳', element:'音', desc:'蛊惑众生的魔音化身', lv,
        hp: Math.floor(10500 * lvGrow), atk: Math.floor(195 * lvGrow), def: Math.floor(130 * lvGrow) },
      { id:'hundun', name:'混沌', title:'四凶·本体', element:'封', desc:'四凶本体的最终形态', lv,
        hp: Math.floor(12500 * lvGrow), atk: Math.floor(215 * lvGrow), def: Math.floor(160 * lvGrow) }
    ];
  }

  /** 隐藏 BOSS「混沌本相」数据（120级，比四凶更强；触发需供奉红日真君圆满 + 屠尽四凶成就） */
  function getChaosBoss(p) {
    const lv = 120;
    const lvGrow = 1 + 0.05 * (lv - 1);   // 与战斗一致的等级成长
    return {
      id: 'chaos_true', name: '混沌本相', title: '四凶·本相', element: '封',
      desc: '四凶陨落，其本源却不灭，于墟渊深处凝聚成最终本相——万物归墟的终结形态',
      lv,
      hp: Math.floor(18000 * lvGrow),
      atk: Math.floor(280 * lvGrow),
      def: Math.floor(210 * lvGrow)
    };
  }
  /** 隐藏 BOSS 触发条件：供奉红日真君圆满 + 已通关四凶 + 达成「屠尽四凶」隐藏成就 */
  function canChallengeChaosBoss(p) {
    const offerOk = (p.offerGod === 'hongri') && ((p.offerValue || 0) >= 1000);
    const cleared = (p.completed || new Set()).has('FINAL_FOUR_FIERCE_DONE');
    const ach = (p.achievements || []).indexOf('hidden_four') >= 0;
    return offerOk && cleared && ach;
  }

  /** 终章入口：四凶降临 */
  const SCENE_FOUR_INTRO = {
    id: 'fourfierce_intro',
    title: '【归墟篇】四凶本体·降临',
    bg: 'assets/img/scenes/four-fierce.jpg',
    text:
`归墟之扉轰然洞开。二十国封印尽数崩解，四道遮天蔽日的身影自墟渊深处升起——

[highlight]饕餮[/highlight]（四凶·口）——吞噬万物的饥饿化身。
[highlight]梼杌[/highlight]（四凶·足）——永不停歇的暴走化身。
[highlight]穷奇[/highlight]（四凶·耳）——蛊惑众生的魔音化身。
[highlight]混沌[/highlight]（四凶·本体）——四凶最终的真身。

它们将[highlight]依次[/highlight]与你作战，一场接一场，你的状态将在战斗中延续，无法喘息休整。

这是山海大陆的终局。集齐二十国之印的你，唯有破釜沉舟，正面迎战。`,
    options: [
      { label: '【迎战】踏入归墟之扉（开始四连战）', tag: '决战', next: 'fourfierce_bless_check' },
      { label: '（退后一步，再做准备）', tag: '暂缓', next: 'home' }
    ]
  };

  /** 祖师赐福检查（供奉1000时可选额外技能） */
  const SCENE_FOUR_BLESS_CHECK = {
    id: 'fourfierce_bless_check',
    title: '【归墟篇】祖师赐福',
    bg: BG.origin,
    text: '',
    options: []
  };

  /** 四凶阶段：饕餮 */
  const SCENE_FOUR_TAOTIE = {
    id: 'fourfierce_taotie',
    title: '【四凶战·一】饕餮',
    bg: BG.boss,
    text:`[highlight]饕餮[/highlight]张开吞天巨口，饥饿的漩涡撕扯着四周的一切——这是四凶之「口」，吞噬万物的饥饿化身。`,
    options: [],
    battle: null
  };
  /** 四凶阶段：梼杌 */
  const SCENE_FOUR_TAOWU = {
    id: 'fourfierce_taowu',
    title: '【四凶战·二】梼杌',
    bg: BG.boss,
    text:`[highlight]梼杌[/highlight]踏碎虚空而来，永不停歇的脚步碾过你方才的战场——这是四凶之「足」，暴走的化身。`,
    options: [],
    battle: null
  };
  /** 四凶阶段：穷奇 */
  const SCENE_FOUR_QIONGQI = {
    id: 'fourfierce_qiongqi',
    title: '【四凶战·三】穷奇',
    bg: BG.boss,
    text:`[highlight]穷奇[/highlight]的魔音贯脑，蛊惑的声浪搅乱你的心神——这是四凶之「耳」，魔音化身。`,
    options: [],
    battle: null
  };
  /** 四凶阶段：混沌 */
  const SCENE_FOUR_HUNDUN = {
    id: 'fourfierce_hundun',
    title: '【四凶战·四】混沌',
    bg: BG.boss,
    text:`四凶的「口、足、耳」之力尽数归于[highlight]混沌[/highlight]。它的身躯由无尽的封印构成，遮天蔽日——这是四凶的最终本体。`,
    options: [],
    battle: null
  };
  /** 终局·胜利 */
  const SCENE_FOUR_WIN = function (p) {
    const st = (typeof STATE !== 'undefined' && STATE.clearStats) ? STATE.clearStats(p) : null;
    let statText = '';
    if (st) {
      statText = `
━━━━ 这一程山海 ━━━━
· 修行 ${st.day} 日 · ${st.realm} Lv${st.lv}
· 战胜 ${st.battles} 场 · 落败 ${st.loses} 场
· 探索 ${st.explore} 次 · 伏魔 ${st.fumo} 次
· 灵宠 ${st.pets} 只 · 图鉴点亮 ${st.petDex} 种
· 成就 ${st.achievements} 项 · 恶念 ${st.evil}（${st.evilLabel}）`;
    }
    return {
      id: 'fourfierce_win',
      title: '【归墟篇】四凶陨落',
      bg: 'assets/img/scenes/guixu-final.jpg',
      text:
`四凶之影在墟渊中寸寸崩解，化作漫天星屑，坠入山海大陆的每一寸土地。

你以一人之力，连破四凶，结束了这场延续二十国的浩劫。归墟之扉缓缓合拢，山海重归清明。

【恭喜通关《问道山海》】

你，是这片山海真正的守护者。${statText}`,
    options: [
      { label: '【登峰造极】铭记此刻（返回主界面）', tag: '完', onChoose: (p) => {
          STATE.completeQuest(p, 'FINAL_FOUR_FIERCE_DONE');
          p.unlocked.add('shanhai_guardian');
          // 记录周目继承：吸收图鉴/抽命格/图纸，标记通关
          if (typeof STATE.recordLegacyOnClear === 'function') {
            const legacy = STATE.recordLegacyOnClear(p, 'fourfierce');
            if (legacy && typeof Engine.log === 'function') {
              Engine.log(`山河铭记你的功绩。下一周目将继承：灵宠图鉴 ${legacy.petDex.length} 种、命格抽取机会 ${legacy.drawChances} 次。`, 'gold');
            }
          }
          // 触发四凶终章相关成就
          if (typeof STATE.checkAchievements === 'function') {
            const newly = STATE.checkAchievements(p, { fourFierceDone: true });
            if (newly.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newly);
          }
          // 战报卡片
          if (typeof Engine.showBattleReport === 'function') {
            Engine.showBattleReport({ player: p, ending: '四凶陨落 · 通关' });
          }
        }, next: 'title' },
      { label: '【周而复始】开启新周目（继承图鉴与命格机会）', tag: '新周目', onChoose: (p) => {
          STATE.completeQuest(p, 'FINAL_FOUR_FIERCE_DONE');
          p.unlocked.add('shanhai_guardian');
          if (typeof STATE.recordLegacyOnClear === 'function') STATE.recordLegacyOnClear(p, 'fourfierce');
          if (typeof STATE.checkAchievements === 'function') {
            const newly = STATE.checkAchievements(p, { fourFierceDone: true });
            if (newly.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newly);
          }
          // 跳回封面，玩家可重新开档（继承自动生效）
          if (typeof App.goto === 'function') App.goto('title');
        } },
      { label: '【本相】挑战「混沌本相」（隐藏 · 需红日真君圆满）', tag: '隐藏', showIf: (p) => canChallengeChaosBoss(p), next: 'fourfierce_hidden_boss' }
    ]
    };
  };

  /** 隐藏 BOSS 战（混沌本相） */
  const SCENE_HIDDEN_BOSS = {
    id: 'fourfierce_hidden_boss',
    title: '【隐藏】混沌本相',
    bg: 'assets/img/scenes/guixu-final.jpg',
    text:
`四凶虽陨，墟渊深处却有一缕本源不灭，缓缓凝聚成一座遮天蔽日的巨大虚影——那是「混沌本相」，四凶真正的终结形态。

红日真君的神力在你体内流转，似在低语：这一战，方是真正的「问道」之终。`,
    options: [
      { label: '【决战】直面混沌本相（终极隐藏 BOSS）', tag: '决战', next: 'fourfierce_hidden_boss_start' }
    ]
  };

  /** 真结局（击败混沌本相后） */
  const SCENE_TRUE_END = {
    id: 'fourfierce_true_end',
    title: '【真结局】山海永恒',
    bg: 'assets/img/scenes/guixu-final.jpg',
    text:
`混沌本相在你的剑下寸寸崩解，化作漫天金雨，洒遍二十国山河。

红日真君的身影在你身后显化，轻轻颔首——那轮破晓而出的红日，终于真正照亮了整片山海。

【真结局 · 山海永恒】

你不仅斩灭了四凶，更抹去了它们卷土重来的本源。从此，山海再无归墟之危，万物生生不息。`,
    options: [
      { label: '【功成】铭记此刻', tag: '完', onChoose: (p) => {
          p.unlocked.add('shanhai_eternal');
          STATE.completeQuest(p, 'FINAL_CHAOS_BOSS_DONE');
          if (typeof STATE.recordLegacyOnClear === 'function') STATE.recordLegacyOnClear(p, 'true_end');
          if (typeof STATE.checkAchievements === 'function') {
            const newly = STATE.checkAchievements(p, { chaosBossDone: true });
            if (newly.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newly);
          }
          if (typeof Engine.showBattleReport === 'function') {
            Engine.showBattleReport({ player: p, ending: '真结局 · 山海永恒' });
          }
        }, next: 'title' },
      { label: '【周而复始】开启新周目', tag: '新周目', onChoose: (p) => {
          p.unlocked.add('shanhai_eternal');
          STATE.completeQuest(p, 'FINAL_CHAOS_BOSS_DONE');
          if (typeof STATE.recordLegacyOnClear === 'function') STATE.recordLegacyOnClear(p, 'true_end');
          if (typeof STATE.checkAchievements === 'function') {
            const newly = STATE.checkAchievements(p, { chaosBossDone: true });
            if (newly.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newly);
          }
          if (typeof App.goto === 'function') App.goto('title');
        } }
    ]
  };

  /* ===========================================================
   * 隐藏任务 Q20_H1 · 原初之封全文
   * =========================================================== */

  const SCENE_Q20_H1 = {
    id: 'guixu_q20_h1',
    title: '【隐藏 Q20_H1】原初之封全文',
    bg: BG.origin,
    text:
`在原初之封最深处，你以「封铠」和「满墟的血」的许可，接触了「原初之印」隐藏的层面。

那是一段被混沌封兽封印、但尚未完全封掉的「远古封印」。当你触碰它时，眼前浮现出古老的纹路：

「吾为混沌所噬，然吾愿以「原初之印」为盾，护此「现在」不被封印。后之来者，若见此印，当知：封印非罪，乃守；存在非贵，乃择。混沌非敌，乃「封」之化身。若欲胜之，勿以力抗，当以「封」守之，或以「解」放之，或以「合」化之。四凶封印的完整历史——四凶不是被「打败」的，是被「理解」后自愿成为「反面」的。第二十国之后，归墟之扉将开，四凶的本体气息已在最后一国汇聚——「归墟篇」就此开启。」

【墟离】（读完，若有所思）"……以「封」守之……以「解」放之……以「合」化之……外乡人……你……觉得……这……是……什么意思？"`,

    options: [
      { label: '「也许……对抗封印最好的方法，是让存在足够清晰。」', tag: '顿悟', onChoose: (p) => { p.unlocked.add('yuanchu_feng_true'); STATE.addFavor(p, 'xuli', 20); Engine.log('获得关键情报「原初之印真解」', 'good'); }, next: 'guixu_q20_h1_after' }
    ]
  };

  /** 隐藏 · 后续 */
  const SCENE_Q20_H1_AFTER = {
    id: 'guixu_q20_h1_after',
    title: '【隐藏 Q20_H1】原初之印',
    bg: BG.origin,
    text:
`原初之印中渗出一缕金色的光——那是「原初之封」的「剩余」，混沌没有封印的「希望」。

【墟离】（用胸口封印接住）"……这缕……原初之封……可以……复活……一次……被……封印……的……存在。也许……是……一个……人……的生命。也许……是……一段……被……封掉……的……历史……"

她郑重地将光交给你。

【隐藏任务完成】
- 获得「原初之封」（可复活任意死亡NPC一次）
- 获得「原初之封全文」（剧情道具，开启「归墟篇」终章情报）
- 墟离好感 +40`,
    options: [
      { label: '（郑重收下这缕承载着存在的希望）', tag: '受恩', onChoose: (p) => { STATE.addMaterial(p, 'MAT-GX08', 1); STATE.addFavor(p, 'xuli', 40); }, next: 'guixu_q20_01_routes' }
    ]
  };

  /* ===========================================================
   * 支线 Q20_S1 · 封灵的封印
   * =========================================================== */

  const SCENE_Q20_S1 = {
    id: 'guixu_q20_s1',
    title: '【支线 Q20_S1】封灵的封印',
    bg: BG.valley,
    text:
`（须与封灵好感≥50方可触发）

封灵的体内寄生了「封虫」——由过度封印实体化的寄生虫。它们啃噬封灵的封印腺，让它的封印变质。

【封灵】（痛苦地蠕动）"……我……的……封流……越……来……越……「脏」……了……因为……封虫……在……封……我……的……「清洁」……"`,

    options: [
      { label: '「我来帮你清理这些封虫。」', tag: '帮助', onChoose: (p) => { STATE.addFavor(p, 'fengliong', 15); }, next: 'guixu_q20_s1_after' }
    ]
  };

  /** 支线S1·后续 */
  const SCENE_Q20_S1_AFTER = {
    id: 'guixu_q20_s1_after',
    title: '【支线 Q20_S1】封灵新生',
    bg: BG.valley,
    text:
`你以「原初之封」的力量，清理了封灵体内的封虫。封灵展开清澈的、金色的结界——那是「未来封印」，可以预示敌人将被封印的存在。

【封灵】（发出满足的龙吟）"……谢谢你……外乡人……我……重新……能……「封」……「可能」……了……",

【支线完成】
- 封灵重获净化，成为「封灵」伙伴（可释放「存在封印」使敌人随机失去一项存在）
- 墟离好感 +25`,
    options: [
      { label: '（轻抚封灵重新清澈的结界）', tag: '见证', onChoose: (p) => { STATE.addFavor(p, 'xuli', 25); p.unlocked.add('fengliong_zhufu'); Engine.log('获得「封灵祝福」（可释放存在封印，使敌人随机失去一项能力）', 'good'); }, next: 'guixu_q20_01_routes' }
    ]
  };

  /* ===========================================================
   * 支线 Q20_S2 · 解封者的封
   * =========================================================== */

  const SCENE_Q20_S2 = {
    id: 'guixu_q20_s2',
    title: '【支线 Q20_S2】解封者的封',
    bg: BG.valley,
    text:
`（须与满墟好感≥40方可触发）

你在解封谷遇到一对存在错位的恋人。他们是解封者，但混沌封兽的侵蚀让他们的存在「错位」了——一个失去了「封」的能力，一个失去了「解」的能力，他们永远无法以完整的存在形态相拥。

【解封者恋人】"……我们……想……「结婚」。但……我们……的……存在……错开……了……我……们……无法……在……同一……存在……里……相拥……"`,

    options: [
      { label: '「我来想办法，让你们的存在暂时重叠。」', tag: '帮助', onChoose: (p) => { STATE.addFavor(p, 'manxu', 15); }, next: 'guixu_q20_s2_wedding' }
    ]
  };

  /** 支线S2·婚礼 */
  const SCENE_Q20_S2_WEDDING = {
    id: 'guixu_q20_s2_wedding',
    title: '【支线 Q20_S2】同一封',
    bg: BG.valley,
    text:
`你利用封核碎片，为这对恋人创造了一刻「共同的存在」——婚礼的那一刻。错位的存在在这一刻重叠，两人的存在在光中合而为一，却又彼此独立。

【解封者恋人】（在光中相拥，泪流满面）"……原来……「同一封」……这么……美……",

【支线完成】
- 解封者恋人完成婚礼
- 满墟好感 +25
- 获得「封之誓约」（饰品，与队友同时行动时存在恢复+20%）`,
    options: [
      { label: '（见证这一刻的存在与幸福）', tag: '见证', onChoose: (p) => { STATE.addFavor(p, 'manxu', 25); p.unlocked.add('fengzhi_shiyue'); }, next: 'guixu_q20_01_routes' }
    ]
  };

  /* ===========================================================
   * 支线 Q20_S3 · 满墟的存在
   * =========================================================== */

  const SCENE_Q20_S3 = {
    id: 'guixu_q20_s3',
    title: '【支线 Q20_S3】满墟的存在',
    bg: BG.valley,
    text:
`（须与满墟好感≥60方可触发）

满墟一直渴望「封」到自己的完整存在——他是天生无印的怪物，他想知道自己是否真的有「自由」的权利。

【满墟】"……我的……胸口……是……「畸形」的。有骨……有肉……无印。但……我……从……来……没有……真正……「自由」……过。因为……在……归墟国……「自由」……是……「罪」……我……想……知道……我……如果……能……「自由」……我……会……是……什么……样子……"`,

    options: [
      { label: '「你的自由不是罪。让我帮你看到那个答案。」', tag: '帮助', onChoose: (p) => { STATE.addFavor(p, 'manxu', 20); }, next: 'guixu_q20_s3_after' }
    ]
  };

  /** 支线S3·后续 */
  const SCENE_Q20_S3_AFTER = {
    id: 'guixu_q20_s3_after',
    title: '【支线 Q20_S3】满墟之印',
    bg: BG.valley,
    text:
`你以「原初之封」的力量，帮满墟看到了他的「完整存在」。那是一团温暖的金光——他的胸口在光中运转，第一次感受到了「自由」的安宁。

【满墟】（睁开眼，眼中带着震撼与释然）"……原来……「自由」……是……一种……「选择」。我……选择……「自由」……不是……因为……我……无印……而是……因为……我……愿意……「接纳」……自己……",

【支线完成】
- 满墟好感 +30
- 获得「满墟之印」（被动，可免疫封印效果）`,
    options: [
      { label: '（见证满墟找到自己的自由）', tag: '见证', onChoose: (p) => { STATE.addFavor(p, 'manxu', 30); p.unlocked.add('manxu_zhiYin'); Engine.log('获得「满墟之印」（免疫封印）', 'good'); }, next: 'guixu_q20_01_routes' }
    ]
  };

  /* ===========================================================
   * 归墟国自由行动系统
   * =========================================================== */


  /* ---------- 暴露所有场景（支持函数形式的动态场景） ---------- */
  // 暴露四凶数据生成函数，供 app.js 四凶连战调度使用
  global.getFourFierce = getFourFierce;
  global.getChaosBoss = getChaosBoss;
  global.canChallengeChaosBoss = canChallengeChaosBoss;

  global.GUIXU_SCENES = {
    // 序章
    guixu_entry: SCENE_ENTRY,
    guixu_01_city: SCENE_CITY,
    guixu_01_manxu: SCENE_MANXU,
    guixu_01_fengliong: SCENE_FENGLIONG,
    guixu_01_altar: SCENE_ALTAR,

    // 主线 Q20_01
    guixu_q20_01_tower: SCENE_Q20_01_TOWER,
    guixu_q20_01_weigu: SCENE_Q20_01_WEIGU,
    guixu_q20_01_core: SCENE_Q20_01_CORE,
    guixu_q20_01_routes: SCENE_Q20_01_ROUTES,

    // 主线 Q20_02
    guixu_q20_02_boss: SCENE_Q20_02_BOSS,
    guixu_q20_02_quanfeng: SCENE_Q20_02_QUANFENG,
    guixu_q20_02_jiefeng: SCENE_Q20_02_JIEFENG,
    guixu_q20_02_xutian: SCENE_Q20_02_XUTIAN,

    // 主线 Q20_03 三结局
    guixu_q20_03_fengquan: SCENE_Q20_03_FENGQUAN,
    guixu_q20_03_fengwu: SCENE_Q20_03_FENGWU,
    guixu_q20_03_fengshi: SCENE_Q20_03_FENGSHI,
    guixu_end: SCENE_END,

    // 归墟篇 · 四凶本体（最终决战）
    fourfierce_intro: SCENE_FOUR_INTRO,
    fourfierce_bless_check: SCENE_FOUR_BLESS_CHECK,
    fourfierce_taotie: SCENE_FOUR_TAOTIE,
    fourfierce_taowu: SCENE_FOUR_TAOWU,
    fourfierce_qiongqi: SCENE_FOUR_QIONGQI,
    fourfierce_hundun: SCENE_FOUR_HUNDUN,
    fourfierce_win: SCENE_FOUR_WIN,
    fourfierce_hidden_boss: SCENE_HIDDEN_BOSS,
    fourfierce_true_end: SCENE_TRUE_END,

    // 隐藏 Q20_H1
    guixu_q20_h1: SCENE_Q20_H1,
    guixu_q20_h1_after: SCENE_Q20_H1_AFTER,

    // 支线 Q20_S1/S2/S3
    guixu_q20_s1: SCENE_Q20_S1,
    guixu_q20_s1_after: SCENE_Q20_S1_AFTER,
    guixu_q20_s2: SCENE_Q20_S2,
    guixu_q20_s2_wedding: SCENE_Q20_S2_WEDDING,
    guixu_q20_s3: SCENE_Q20_S3,
    guixu_q20_s3_after: SCENE_Q20_S3_AFTER,

    // 自由行动（动态场景，函数形式）
  };
})(window);
