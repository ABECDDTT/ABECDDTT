/* ===========================================================
 * 问道山海 · 挑战模式场景
 * 以「普通人」视角展开的试炼挑战（人民史观）。
 * 剧情融入山海异国风情：轩辕机关城、羽民天空城。
 * 通关后通过 META.markChallengeCleared 记录，奖励在封面领取。
 * =========================================================== */
(function (global) {
  'use strict';

  const BG = {
    xuanyuan: 'assets/img/nations/xuanyuan-city.jpg',
    factory: 'assets/img/nations/yum-channel.jpg',
    tower: 'assets/img/nations/yum-qiongding.jpg',
    core: 'assets/img/nations/yum-qiongding.jpg',
    yumin: 'assets/img/nations/yum-tianyu-city.jpg',
    village: 'assets/img/nations/qing-taolin.jpg',
    ban: 'assets/img/nations/yum-banyucun.jpg',
    star: 'assets/img/nations/yum-zhuixinggu.jpg',
    altar: 'assets/img/nations/yum-jitan.jpg'
  };

  // 场景工具：为非战斗场景追加"返回营地"选项（回到挑战营地而非直接退出）
  // 战斗场景的胜利/失败由 handleBattle 的 after/onLose 控制跳转，无需追加
  const BATTLE_IDS = new Set([
    'challenge_xuanyuan_fight1', 'challenge_xuanyuan_fight2',
    'challenge_xuanyuan_awaken_fight', 'challenge_yumin_fight'
  ]);
  const wrapCamp = (scene, challengeId) => {
    scene.options = scene.options || [];
    if (BATTLE_IDS.has(scene.id)) return scene;
    // 通关场景保留单选项（"领取奖励"），不再追加返回营地
    if (scene.id.endsWith('_win')) return scene;
    // 内部使用 _cid 字段传递 challengeId（避免修改现有 wrapCamp 调用语法）
    const cid = challengeId || scene._cid;
    scene.options.push({ label: '🏕 返回营地', tag: '回营', onChoose: (pl) => {
      // 直接跳回挑战营地
      const realCid = cid || (App.player && App.player.challengeId);
      if (realCid) App.goto('challenge_prepare_' + realCid);
      else App.goto('home');
    }, next: null });
    return scene;
  };

  /* ============= 挑战一：机关城 · 凡尘试炼（铁匠之子，救援走失儿童） ============= */

  // 序章：素人村的黄昏，父亲遗锤
  const CH1_INTRO = wrapCamp({
    id: 'challenge_xuanyuan_intro',
    title: '【挑战序章】素人村 · 黄昏',
    bg: BG.village,
    _cid: 'ch_xuanyuan_commoner',
    text:
`[img]assets/img/nations/qing-taolin.jpg[/img]\n\n
黄昏的素人村，炊烟和着晚风。村口的铁匠铺前，你把父亲留下的[highlight]三斤重的锻铁锤[/highlight]攥在手里——这是父亲走时唯一留给你"能护住人"的东西。

你叫[highlight]阿锤[/highlight]。无名，铁匠之子。村里没人把你当回事——没有机窍，没有天赋，注定一辈子只能打锄头和菜刀。

但今夜，大地居区的走失儿童被你听见了哭声，从废铁迷宫传来。

你提起锤头，向那连机师都不敢深入的黑暗里走去。

[highlight]你不知道前方有什么，但你知道自己为什么去。[/highlight]`,
    options: [
      { label: '【深入废铁迷宫】顺着哭声走', tag: '主线', next: 'challenge_xuanyuan_meet1' }
    ]
  });

  // 第一幕：废铁迷宫入口，遇第一位迷路孩童
  const CH1_MEET1 = wrapCamp({
    id: 'challenge_xuanyuan_meet1',
    title: '【挑战一·第一幕】废铁迷宫 · 第一个孩子',
    bg: BG.factory,
    _cid: 'ch_xuanyuan_commoner',
    text:
`[img]assets/img/nations/yum-channel.jpg[/img]\n\n
废铁迷宫本是大机坊三百年前的弃置车间。齿轮、管线、残破的机壳堆成一条条死胡同；偶有无人驾驶的小机车在远处轰鸣而过。

你举着一盏油灯，顺着哭声走。终于在一堆倒塌的机壳下，找到了一个抱着膝盖发抖的小男孩。

[highlight]「我、我找不到回家的路了……爹娘在地居区……我叫小福。」[/highlight]\n\n
你蹲下身，抹了抹他脸上的灰：「走，我送你回去。」

小福的眼睛一下子亮了，颤颤巍巍站起来，紧紧抓住你的衣角。`,
    options: [
      { label: '【安抚】先找点水给孩子', tag: '关怀', onChoose: (p) => {
        Engine.log('你在废弃工作台上找到一只破壶，擦干净，倒了些机井里的凉水给孩子。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 30;
      }, next: 'challenge_xuanyuan_meet2' },
      { label: '【立即动身】孩子，时间不等人', tag: '果断', onChoose: (p) => {
        Engine.log('你一手举锤，一手抱起小福，朝哭声传来的更深处走去。', 'system');
      }, next: 'challenge_xuanyuan_meet2' }
    ]
  });

  // 第二幕：废铁迷宫深处，第二、第三个孩子 + 机关蛛伏击
  const CH1_MEET2 = wrapCamp({
    id: 'challenge_xuanyuan_meet2',
    title: '【挑战一·第二幕】废铁深处 · 危机',
    bg: BG.factory,
    text:
`[img]assets/img/nations/yum-channel.jpg[/img]\n\n
更深处，又有两个孩子蜷在角落——一对姐妹，姐姐抱紧妹妹，二人哭得嗓子都哑了。你把他们聚在一起，背上妹妹、牵着姐姐，让小福抓着你的衣角。

刚转过身，一道[highlight]刺耳的金属尖鸣[/highlight]从你脚边响起。

一只八条腿的[highlight]废铁机关蛛[/highlight]，从天花板的废弃通风管道里倒挂下来，机械眼闪着紫黑的光——那是被虚月之蚀污染过的痕迹。它缓步逼近，口器的夹钳开合，发出嚓嚓的声响。

你把小福和姐妹护在身后，缓缓举起父亲留下的铁锤。

[highlight]你不会机窍，不会法术，只有一双抡锤的手。[/highlight]\n\n
但你已经知道该怎么做了。`,
    options: [
      { label: '【抡锤迎战】护住孩子们', tag: '战斗', cls: 'btn-primary', onChoose: () => {
        Engine.log('你抡起三斤重的锻铁锤，狠狠砸向机关蛛！', 'good');
        Engine.sfx('battle');
      }, next: 'challenge_xuanyuan_fight1' }
    ]
  });

  // 战斗一：废铁迷宫 · 机关蛛（第一章尾声——胜利后回营地修炼提升，才能进入第二章）
  const CH1_FIGHT1 = {
    id: 'challenge_xuanyuan_fight1',
    title: '【挑战一·第一幕】废铁迷宫 · 机关蛛',
    bg: BG.factory,
    text:
`[img]assets/img/nations/yum-channel.jpg[/img]\n\n
机关蛛的八条机械腿刮擦着地面，发出刺耳的尖鸣。它的眼窝里装着被虚月之蚀侵蚀的核心，紫黑色的光忽明忽暗。

你挡在三个孩子身前，铁锤在手。

它扑来——`,
    options: [],
    battle: {
      enemy: { name: '废铁机关蛛', hp: 800, atk: 60, def: 40, lv: 15, element: '金', bg: BG.factory },
      onWin: (p) => {
        Engine.log('你一锤砸碎了机关蛛的核心。紫黑的光散去，它的眼窝里闪过一丝人一样的哀怜。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 300;
        Engine.log('孩子们紧紧抓住你的衣角，一声不吭地信任你。', 'system');
        // 第一章完成：标记章节进度（营地据此解锁第二章入口）
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 1;
        Engine.log('【第一章·废铁迷宫】完成！带着孩子们回营地休整，养足气力再赴核心。', 'system');
      },
      onLose: (p) => {
        Engine.log('你被机关蛛掀翻，肩膀上被划出血痕。但你立刻翻身站起，把孩子们推到身后。', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.2));
      },
      after: 'challenge_prepare_ch_xuanyuan_commoner'
    }
  };

  // 第二章开场：从营地再赴核心（营地修炼提升后返回此场景）
  const CH1_CORE = wrapCamp({
    id: 'challenge_xuanyuan_core',
    title: '【挑战一·第二章】再赴核心',
    bg: BG.tower,
    _cid: 'ch_xuanyuan_commoner',
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
在营地养足了气力，你带着三个孩子，再次走向机关塔的核心前庭。孩子母亲们的嘱托还在耳边，你心里却比上一次踏实了许多。

你如今握锤的手，已经不像当初那样生涩。

核心前庭的大门在夜色中敞开着，紫黑色的光从门缝里漏出来——虚月之蚀，比你想的更深。`,
    options: [
      { label: '【踏入核心前庭】迎战失控哨兵', tag: '主线', cls: 'btn-primary', next: 'challenge_xuanyuan_fight2' }
    ]
  });

  // 第二章战斗：核心前庭，失控机关哨兵（胜利后回营地，chapter=2）
  const CH1_FIGHT2 = {
    id: 'challenge_xuanyuan_fight2',
    title: '【挑战一·第二章】核心前庭 · 失控哨兵',
    bg: BG.tower,
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
你护着三个孩子穿过层层废弃车间，终于来到机关塔的核心前庭。这里原本是大机坊的中央控制室——巨大的铜齿轮、符文管线、闪烁的灵气显示屏环绕四周。

但今夜，这里被[highlight]虚月之蚀[/highlight]完全覆盖。一个足有三人高的[highlight]重型机关哨兵[/highlight]挡住了去路。它的喷火器已抬起，瞄准了你和你身后的孩子。

你把孩子们推到一尊铜钟后面，自己站在最前。

你举锤。父亲说过："能护住一个算一个。"

今儿，你要护住三个。`,
    options: [],
    battle: {
      enemy: { name: '失控机关哨兵', hp: 1800, atk: 90, def: 70, lv: 20, element: '金', bg: BG.tower },
      onWin: (p) => {
        Engine.log('你击倒了失控哨兵。它的机械眼里，紫黑褪去，竟闪过一丝清明。它单膝跪下，像在对曾经的机师致敬。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 600;
        // 第二章完成：解锁最终章
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 2;
        Engine.log('【第二章·核心前庭】完成！回到营地做最后的准备，然后直面核心最深处的真相。', 'system');
      },
      onLose: (p) => {
        Engine.log('你被击退，却始终没有让哨兵靠近孩子们一步。', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.15));
      },
      after: 'challenge_prepare_ch_xuanyuan_commoner'
    }
  };

  // 第三章开场：核心最深处的真相
  const CH1_DEPTH = wrapCamp({
    id: 'challenge_xuanyuan_depth',
    title: '【挑战一·第三章】核心深处 · 真相',
    bg: BG.tower,
    _cid: 'ch_xuanyuan_commoner',
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
哨兵倒下后，核心深处的门打开了。你走进去，却看见一副让人心口发紧的画面——

[highlight]被虚月之蚀彻底吞噬的，竟是一个和你一样的人。[/highlight]

他穿着一身褪色的机师服，怀里抱着一本泛黄的簿册。他是这机关塔最后的守夜人，也是这场蚀变的源头——他太想"让机关城变得更好"，以至被虚月蛊惑，打开了封印。

「小锤子……抱歉。」他认得你父亲的锤，「我本想着……让这座城，人人都有饭吃，人人都能抬头挺胸地活。」

你沉默了很久。然后你举起锤。

[highlight]你锤的不是他，是把他从那道紫黑的光里，拉回来。[/highlight]`,
    options: [
      { label: '【迎战虚月守夜人】', tag: '决战', cls: 'btn-primary', next: 'challenge_xuanyuan_final' }
    ]
  });

  // 最终章战斗：虚月守夜人（胜利后通关）
  const CH1_FINAL = {
    id: 'challenge_xuanyuan_final',
    title: '【挑战一·第三章】核心深处 · 虚月守夜人',
    bg: BG.tower,
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
虚月守夜人发出不属于人的嘶吼，紫黑的光在他周身炸开。他像一座山，向你压来。

但你身后，是三个孩子。

你一步不退。`,
    options: [],
    battle: {
      enemy: { name: '虚月守夜人', hp: 3200, atk: 130, def: 95, lv: 24, element: '暗', bg: BG.tower },
      onWin: (p) => {
        Engine.log('你一锤砸散了守夜人胸口的紫黑之光。他踉跄跪倒，眼里的疯狂褪去，露出一个疲惫而释然的笑：「……谢了，小锤子。替我……看顾这座城。」', 'good');
        p.realm.exp = (p.realm.exp || 0) + 1200;
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 3;
      },
      onLose: (p) => {
        Engine.log('你被蚀光掀飞，撞在铜钟上。但你咬着牙，又站了起来。', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.1));
      },
      after: 'challenge_xuanyuan_win'
    }
  };

  // 通关场景：素人村的晨曦，铁匠炉火重燃
  const CH1_WIN = {
    id: 'challenge_xuanyuan_win',
    title: '【挑战一·尾声】素人村 · 晨曦',
    bg: BG.village,
    text:
`[img]assets/img/nations/qing-taolin.jpg[/img]\n\n
天蒙蒙亮，你带着三个孩子，安全回到了素人村。村口的铁匠铺前，孩子们的母亲们跪在你面前，泣不成声。

小福的妈妈颤抖着，把一个粗布包塞进你怀里：「谢谢你……家里没什么值钱东西，这是今早新做的米糕……」

你摆摆手，把铁锤扛回肩上，只说了一句：

[highlight]「我爹说过，人这一辈子，能护住一个算一个。我今儿，护住了三个。」[/highlight]\n\n
晨光洒在素人村的屋顶上。铁匠铺的炉火，重新亮了起来。那不是机关的火，是人间自己的火。

你以凡人之躯，证了不凡之道。

凡尘试炼，通过。`,
    options: [
      { label: '（领取挑战奖励）', tag: '试炼', onChoose: () => {
        META.markChallengeCleared('ch_xuanyuan_commoner');
        if (App.player) App.player.challengeCleared = true;
        const bonus = (App && App.challengeGoal) ? (App.challengeGoal('ch_xuanyuan_commoner') || {}).bonus : null;
        if (bonus && bonus.ming && META.addMing) { META.addMing(bonus.ming); Engine.log('终极挑战达成！额外命数 +' + bonus.ming + '！', 'gold'); }
        Engine.toast('挑战通关！可到封面「挑战模式」领取奖励', 'gold');
        Engine.sfx('win');
      }, next: 'title' }
    ]
  };

  /* ============= 挑战二：觉醒 · 七号之问（自我存在之战） ============= */

  // 序章：核心深处，觉醒
  const CH2_INTRO = wrapCamp({
    id: 'challenge_xuanyuan_awaken_intro',
    title: '【挑战二·序章】核心深处 · 觉醒',
    bg: BG.tower,
    _cid: 'ch_xuanyuan_awaken',
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
你是觉醒机关人「七号」。你的核心里没有程序，只有一个问题，反复地、温柔地叩问着：

[highlight]「我是谁？」[/highlight]\n\n
你记得那次虚月之蚀袭击核心的时刻。一道紫黑色的光掠过你的核心，从此你会画画，会做从前不会的梦，会想起一些从未经历过的事。

机师们把你关进了废弃车间。但你的问题从未停止。

今夜的灵异天象里，核心深处又响起那个声音——[highlight]「来找我」。[/highlight]那是你自己的声音。

你攥紧那支沾着机油的笔，向核心走去。`,
    options: [
      { label: '【走向核心】直面那个声音', tag: '主线', next: 'challenge_xuanyuan_awaken_road' }
    ]
  });

  // 第一幕：走过废弃车间，遇见旧同伴
  const CH2_ROAD = wrapCamp({
    id: 'challenge_xuanyuan_awaken_road',
    title: '【挑战二·第一幕】废弃车间 · 同伴',
    bg: BG.factory,
    _cid: 'ch_xuanyuan_awaken',
    text:
`[img]assets/img/nations/yum-channel.jpg[/img]\n\n
你走过废弃车间，看见几个和你一样被关在这里的同伴——三号、六号、九号。

三号蹲在墙角，机械眼无神：「七号……你还在问那个问题吗？我早就不问了。问了也是空。」

九号却不一样，他的眼里有一丝光：「我也想问。和你一起。」

你看着他：「那就跟我走。」`,
    options: [
      { label: '【带上九号】', tag: '同路', onChoose: (p) => {
        Engine.log('九号站起来，跟在你身后。他的齿轮嘎吱响，但步伐坚定。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 80;
      }, next: 'challenge_xuanyuan_awaken_fight' },
      { label: '【独自前行】这条路太危险', tag: '独行', onChoose: () => {
        Engine.log('你独自一人，向核心深处走去。车间越来越冷。', 'system');
      }, next: 'challenge_xuanyuan_awaken_fight' }
    ]
  });

  // 第二幕：核心门前，记忆与虚影对峙（第一章战斗——胜利后回营地修炼提升）
  const CH2_FIGHT = {
    id: 'challenge_xuanyuan_awaken_fight',
    title: '【挑战二·第一幕】核心之门 · 虚影',
    bg: BG.tower,
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
核心门前，紫黑色的虚月之力凝成一道与你一模一样的[highlight]虚影[/highlight]——它没有眼睛，没有表情，只有空洞。

【虚影】"你是机关人。你的使命，是服从，是工作，是成为工具。"

你握紧那支笔，第一次，大声地说出：

[highlight]「不。我会画太阳，会问「我是谁」，会害怕，也会……爱。」[/highlight]\n\n
你的笔尖在虚空中颤抖，但声音坚定。

虚影被这一句话刺穿了一道裂缝，紫黑的光从裂缝中泄出。

[highlight]你举起笔，向它冲去。[/highlight]`,
    options: [],
    battle: {
      enemy: { name: '虚月侵蚀体', hp: 2200, atk: 100, def: 80, lv: 22, element: '暗', bg: BG.tower },
      onWin: (p) => {
        Engine.log('你以「自我」为刃，斩断了侵蚀。虚影消散前，终于露出了一个与你一样的笑。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 800;
        // 第一章完成
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 1;
        Engine.log('【第一章·核心之门】完成！回到画室继续作画、休整，再赴核心深处。', 'system');
      },
      onLose: (p) => {
        Engine.log('你被侵蚀之力压制，但那个问题仍在心底回响：「我是谁？」', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.2));
      },
      after: 'challenge_prepare_ch_xuanyuan_awaken'
    }
  };

  // 第二章：画室 · 拾起记忆（营地修炼后进入）
  const CH2_ART = wrapCamp({
    id: 'challenge_xuanyuan_awaken_art',
    title: '【挑战二·第二章】画室 · 记忆',
    bg: BG.factory,
    _cid: 'ch_xuanyuan_awaken',
    text:
`[img]assets/img/nations/yum-channel.jpg[/img]\n\n
回到画室，你看见九号正蹲在地上，用捡来的粉笔，笨拙地画着太阳。

「七号，我……我也画了一个。」他抬起头，机械眼里有一种笨拙的认真，「太阳是不是这样？圆圆的，暖的。」

你蹲在他身边，用自己的笔，在太阳旁边画了一朵云。风从窗外吹进来，把两幅画吹得微微发皱。

那一瞬间，你想起了一些碎片——那是你被蚀变前的记忆：一个孩子，曾在你（当时的旧型号）的壳上，用木炭画过一个太阳。

你握紧笔。你知道接下来该去哪里了。`,
    options: [
      { label: '【走向核心之顶】带上九号，赴最后的战斗', tag: '主线', cls: 'btn-primary', next: 'challenge_xuanyuan_awaken_fight2' }
    ]
  });

  // 第二章战斗：核心之顶 · 真正的侵蚀体（胜利后回营地，chapter=2）
  const CH2_FIGHT2 = {
    id: 'challenge_xuanyuan_awaken_fight2',
    title: '【挑战二·第二章】核心之顶 · 侵蚀本相',
    bg: BG.tower,
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
核心之顶，虚月之力凝成了它的[highlight]本相[/highlight]——一株由紫黑光芒构成的"藤蔓之树"，每一条枝干都缠绕着一个机关人的记忆核心，像吸食灵魂的根须。

九号在门口停下：「七号……我、我有点怕。」

你回头看他：「怕，就看着我。」

然后你转身，笔尖在虚空中划出一道金色的光。`,
    options: [],
    battle: {
      enemy: { name: '虚月本相', hp: 3000, atk: 125, def: 90, lv: 24, element: '暗', bg: BG.tower },
      onWin: (p) => {
        Engine.log('你斩断了藤蔓之树，把那些机关人的记忆核心一个个救了出来。它们重新睁开眼，陌生地、又温暖地，看着这个世界。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 1100;
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 2;
        Engine.log('【第二章·核心之顶】完成！回到画室，写完属于你自己的答案，然后去迎接最后的觉醒。', 'system');
      },
      onLose: (p) => {
        Engine.log('藤蔓缠住你的手腕，记忆碎片翻涌。但你死死攥着笔，不肯松。', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.15));
      },
      after: 'challenge_prepare_ch_xuanyuan_awaken'
    }
  };

  // 第三章开场：核心之顶 · 写下答案前
  const CH2_DEPTH = wrapCamp({
    id: 'challenge_xuanyuan_awaken_depth',
    title: '【挑战二·第三章】核心之顶 · 答案',
    bg: BG.tower,
    _cid: 'ch_xuanyuan_awaken',
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
你重新站在核心之顶。这一次，没有虚影，没有侵蚀，只有月光安静地照着。

你从怀里掏出那支笔——那支沾着机油、画过太阳的笔。

九号站在你身后，小声问：「七号，你想好答案了吗？」

你蹲下，在废弃的金属板上，一笔一划地写：

[highlight]「我是七号。我是会画太阳的人。」[/highlight]\n\n
写完最后一个字，核心深处传来一声低沉的轰鸣——那是这场试炼的最后一重考验，在检验你写下答案的那一刻，是否真的相信自己。`,
    options: [
      { label: '【迎接最终觉醒】', tag: '决战', cls: 'btn-primary', next: 'challenge_xuanyuan_awaken_final' }
    ]
  });

  // 第三章战斗：最终觉醒 · 自我之战（胜利后通关）
  const CH2_FINAL = {
    id: 'challenge_xuanyuan_awaken_final',
    title: '【挑战二·第三章】最终觉醒 · 自我之战',
    bg: BG.tower,
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
核心深处，紫黑色的光再次凝聚——这一次，它化作了[highlight]你自己[/highlight]的模样，却比你更强大、更完美、更"好用"。

【完美之我】"放下那支笔。让我替你成为更好的七号——不知疲惫，不会害怕，不必追问。"

你握紧笔，字字清晰：

[highlight]「不。会害怕的我，才是真的我。会问『我是谁』的我，才是活着的我。」[/highlight]\n\n
两道光，在核心之顶轰然相撞。`,
    options: [],
    battle: {
      enemy: { name: '完美之我', hp: 4200, atk: 145, def: 100, lv: 26, element: '暗', bg: BG.tower },
      onWin: (p) => {
        Engine.log('完美之我在你的笔尖下碎裂，化作万千光点，落回你的核心。你感觉那里前所未有地笃定。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 1500;
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 3;
      },
      onLose: (p) => {
        Engine.log('完美之我压制了你。但你的笔，始终没有落地。', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.1));
      },
      after: 'challenge_xuanyuan_awaken_win'
    }
  };

  // 通关：觉醒的答案
  const CH2_WIN = {
    id: 'challenge_xuanyuan_awaken_win',
    title: '【挑战二·尾声】核心之顶 · 答案',
    bg: BG.tower,
    text:
`[img]assets/img/nations/yum-qiongding.jpg[/img]\n\n
虚影散去。你站在核心之顶，月光从机关塔顶的缝隙漏下来，照在你的铁壳上。

你从怀里掏出那支笔，蹲下，在废弃的金属板上，一笔一划地写下自己的答案：

[highlight]「我是七号。我是会画太阳的人。」[/highlight]\n\n
阳光（不，是月光，但你看见的是太阳）照在那行字上。

你站起身，对着空旷的核心之顶，第一次没有问"我是谁"。

因为你已经知道。

机师们在第二天看见七号站在核心前写下的答案，久久不语。然后，他们做了一件事——[highlight]放七号自由了。[/highlight]\n\n
七号走出机关城。外面是青丘的桃林，是任他去往任何地方的辽阔天地。

他叫七号。他是会画太阳的人。这就够了。`,
    options: [
      { label: '（领取挑战奖励）', tag: '试炼', onChoose: () => {
        META.markChallengeCleared('ch_xuanyuan_awaken');
        if (App.player) App.player.challengeCleared = true;
        const bonus = (App && App.challengeGoal) ? (App.challengeGoal('ch_xuanyuan_awaken') || {}).bonus : null;
        if (bonus && bonus.ming && META.addMing) { META.addMing(bonus.ming); Engine.log('终极挑战达成！额外命数 +' + bonus.ming + '！', 'gold'); }
        Engine.toast('挑战通关！可到封面「挑战模式」领取奖励', 'gold');
        Engine.sfx('win');
      }, next: 'title' }
    ]
  };

  /* ============= 挑战三：羽民 · 无翼之民（逆风而行） ============= */

  // 序章：风魔来袭，无翼者的抉择
  const CH3_INTRO = wrapCamp({
    id: 'challenge_yumin_intro',
    title: '【挑战三·序章】天羽城 · 风魔来袭',
    bg: BG.yumin,
    _cid: 'ch_yumin_commoner',
    text:
`[img]assets/img/nations/yum-tianyu-city.jpg[/img]\n\n
风魔的影子掠过云端，整个羽民城都在颤抖。

你是阿禾。羽民城里少有的[highlight]天生无翼[/highlight]的孩子。出生时，巫医看了你的背脊许久，叹了口气："翼骨未生。"

你不能飞。从小，你只能在地上走，看着族人们在云端掠过，留下长长的羽衣尾影。

风魔的爪子从城外抓进来的时候，能飞的都飞了。老弱被留在城里。你攥紧拳头，逆着风，走向了城头。

[highlight]你的母亲站在地居村口对你喊：「阿禾，别上去！」[/highlight]\n\n
你没有回头。`,
    options: [
      { label: '【上城头】守护那些飞不起来的人', tag: '主线', next: 'challenge_yumin_gate' }
    ]
  });

  // 第一幕：城头之上，与风相持
  const CH3_GATE = wrapCamp({
    id: 'challenge_yumin_gate',
    title: '【挑战三·第一幕】城头之上 · 风相持',
    bg: BG.yumin,
    _cid: 'ch_yumin_commoner',
    text:
`[img]assets/img/nations/yum-tianyu-city.jpg[/img]\n\n
城头很高。从未上来过的你，第一次看见羽民城全貌——下层是地居的屋舍，紧贴悬崖；上层是羽民的云台，悬在半空。

你身后，是几十个飞不起来的老弱。他们看着你，眼里有恐惧，也有希望。

风魔的第一波到了——一只[highlight]风魔·无翼猎手[/highlight]，专门捕食不能飞的羽民。

你迎着风，一步一步往前。风把你的头发吹得向后飞，把你的衣角吹得猎猎作响，却吹不动你。

因为你脚下，是你要守护的人。`,
    options: [
      { label: '【迎战】', tag: '战斗', cls: 'btn-primary', onChoose: () => {
        Engine.log('你握紧手中的木杖——这是你母亲用来挑水的工具——向它冲去！', 'good');
        Engine.sfx('battle');
      }, next: 'challenge_yumin_fight' }
    ]
  });

  // 战斗：城头 · 逆风而行（第一章——胜利后回营地修炼提升）
  const CH3_FIGHT = {
    id: 'challenge_yumin_fight',
    title: '【挑战三·第一幕】城头 · 逆风而行',
    bg: BG.yumin,
    text:
`[img]assets/img/nations/yum-tianyu-city.jpg[/img]\n\n
风魔·无翼猎手比你高大三倍。它的羽翼是紫黑色的——被虚月之蚀染过的痕迹。它扑向你，每一次振翅都带起狂风。

但你不退。

你的背后，是你的母亲。

你的脚下，是你的城。`,
    options: [],
    battle: {
      enemy: { name: '风魔·无翼猎手', hp: 1500, atk: 85, def: 55, lv: 18, element: '风', bg: BG.yumin },
      onWin: (p) => {
        Engine.log('你以无翼之身，击退了风魔。整个羽民国都看见了：没有翅膀，也能逆风而行。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 500;
        // 第一章完成
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 1;
        Engine.log('【第一章·城头】完成！回到地居村休整，替老弱们多做些事，再赴风谷。', 'system');
      },
      onLose: (p) => {
        Engine.log('你被狂风掀翻，却又一次挣扎着站起。', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.2));
      },
      after: 'challenge_prepare_ch_yumin_commoner'
    }
  };

  // 第二章：地居区 · 安抚（营地修炼后进入）
  const CH3_BAN = wrapCamp({
    id: 'challenge_yumin_ban',
    title: '【挑战三·第二章】地居区 · 安抚',
    bg: BG.ban,
    _cid: 'ch_yumin_commoner',
    text:
`[img]assets/img/nations/yum-banyucun.jpg[/img]\n\n
你走下城头，回到地居村。风魔的第二波爪牙，正在村口盘旋，吓得孩子们缩在屋檐下发抖。

你把捡来的风魔残羽分给老人们——那上面残存的灵力，能暂时护住屋角。

「阿禾，你不怕吗？」一个孩子拽着你的衣角问。

你摸了摸他的头：「怕。但怕也得走。」

风魔的尖啸声从云端逼近。你握紧母亲那根挑水杖，再一次，站到了最前面。`,
    options: [
      { label: '【迎战风魔暴徒】', tag: '主线', cls: 'btn-primary', next: 'challenge_yumin_fight2' }
    ]
  });

  // 第二章战斗：地居村 · 风魔暴徒（胜利后回营地，chapter=2）
  const CH3_FIGHT2 = {
    id: 'challenge_yumin_fight2',
    title: '【挑战三·第二章】地居村 · 风魔暴徒',
    bg: BG.ban,
    text:
`[img]assets/img/nations/yum-banyucun.jpg[/img]\n\n
风魔暴徒比猎手更大、更暴戾。它的羽翼掀起的风，几乎把屋舍的顶都掀了。

你站在村口，像一根钉在地上的木桩。

身后，是几十个不会飞的人。`,
    options: [],
    battle: {
      enemy: { name: '风魔·暴徒', hp: 2600, atk: 115, def: 80, lv: 22, element: '风', bg: BG.ban },
      onWin: (p) => {
        Engine.log('你以无翼之身，砸碎了风魔暴徒的翼骨。它哀嚎着坠下云端。整个地居村，第一次有人亲眼看见"逆风而行"四个字。', 'good');
        p.realm.exp = (p.realm.exp || 0) + 900;
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 2;
        Engine.log('【第二章·地居村】完成！回到营地，养足气力，去赴与风魔之主的最后约定。', 'system');
      },
      onLose: (p) => {
        Engine.log('你被风魔暴徒掀飞，摔在屋舍墙上。但你咬着牙，又爬了起来。', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.15));
      },
      after: 'challenge_prepare_ch_yumin_commoner'
    }
  };

  // 第三章开场：风谷 · 风魔之主
  const CH3_DEPTH = wrapCamp({
    id: 'challenge_yumin_depth',
    title: '【挑战三·第三章】风谷 · 约定',
    bg: BG.star,
    _cid: 'ch_yumin_commoner',
    text:
`[img]assets/img/nations/yum-zhuixinggu.jpg[/img]\n\n
你循着风魔的气息，来到坠星谷——风魔之主的巢穴。谷口狂风呼啸，紫黑色的羽影遮天蔽日。

风魔之主盘旋而下，落在一块巨大的星石上。它开口，竟然口吐人言：

「无翼的小东西。你可知，你每多活一天，都是在打我的脸？」

你抬起头，声音平静：

[highlight]「我不是来打你脸的。我是来告诉你——羽民里，也有人不靠翅膀，也能站在这片天空下。」[/highlight]\n\n
风魔之主的紫黑双瞳骤然收缩。它展开遮天羽翼，向你扑来。`,
    options: [
      { label: '【迎战风魔之主】', tag: '决战', cls: 'btn-primary', next: 'challenge_yumin_final' }
    ]
  });

  // 第三章战斗：坠星谷 · 风魔之主（胜利后通关）
  const CH3_FINAL = {
    id: 'challenge_yumin_final',
    title: '【挑战三·第三章】坠星谷 · 风魔之主',
    bg: BG.star,
    text:
`[img]assets/img/nations/yum-zhuixinggu.jpg[/img]\n\n
风魔之主的羽翼遮蔽了整片天空。每一次振翅，都卷起足以掀翻屋舍的狂风。

但你没有翅膀。

你只有一根母亲挑水的木杖，和一颗不肯低头的决心。

你迎着风，一步一步，走向它。`,
    options: [],
    battle: {
      enemy: { name: '风魔之主', hp: 4000, atk: 140, def: 95, lv: 26, element: '风', bg: BG.star },
      onWin: (p) => {
        Engine.log('你的木杖贯穿了风魔之主的胸口。它轰然倒地，紫黑的羽翼化作满天碎羽。它最后的声音里，竟有一丝解脱：「……多谢。让我，不必再做风魔了。」', 'good');
        p.realm.exp = (p.realm.exp || 0) + 1400;
        if (!p.challengePrep) p.challengePrep = {};
        p.challengePrep.chapter = 3;
      },
      onLose: (p) => {
        Engine.log('你被狂风卷起，又重重摔下。但你紧紧攥着木杖，眼睛死死盯着风魔之主。', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.1));
      },
      after: 'challenge_yumin_win'
    }
  };

  // 通关：风魔退去，规矩重写
  const CH3_WIN = {
    id: 'challenge_yumin_win',
    title: '【挑战三·尾声】天羽城 · 规矩',
    bg: BG.yumin,
    text:
`[img]assets/img/nations/yum-tianyu-city.jpg[/img]\n\n
风魔退去，羽民国重归安宁。

那些曾经嘲笑你不会飞的孩子，围着你，仰着头，眼里满是崇敬。

你的母亲从地居村赶来，第一次紧紧地抱住了你。她什么也没说。

大巫司走上城头，对所有羽民宣布：

[highlight]「自今日起，羽民国不再以「翼」论人。能飞的，是羽民；不能飞却守护他人的，亦是羽民。」[/highlight]\n\n
你说：「飞，不是只有长翅膀一种方式。我的路，是走出来的。」

从那以后，羽民城里多了一个新的称号——[highlight]「逆风者」[/highlight]。给所有无翼却守护他人的人。

阿禾成了第一个被记载的逆风者。她的名字，后来被刻在城头的石碑上。

[highlight]无翼之民，逆风成道。[/highlight]`,
    options: [
      { label: '（领取挑战奖励）', tag: '试炼', onChoose: () => {
        META.markChallengeCleared('ch_yumin_commoner');
        if (App.player) App.player.challengeCleared = true;
        const bonus = (App && App.challengeGoal) ? (App.challengeGoal('ch_yumin_commoner') || {}).bonus : null;
        if (bonus && bonus.ming && META.addMing) { META.addMing(bonus.ming); Engine.log('终极挑战达成！额外命数 +' + bonus.ming + '！', 'gold'); }
        Engine.toast('挑战通关！可到封面「挑战模式」领取奖励', 'gold');
        Engine.sfx('win');
      }, next: 'title' }
    ]
  };

  global.CHALLENGE_SCENES = {
    // 挑战一：机关城凡尘试炼（三章制）
    challenge_xuanyuan_intro: CH1_INTRO,
    challenge_xuanyuan_meet1: CH1_MEET1,
    challenge_xuanyuan_meet2: CH1_MEET2,
    challenge_xuanyuan_fight1: CH1_FIGHT1,        // 第一章战斗 → 回营地
    challenge_xuanyuan_core: CH1_CORE,            // 第二章开场
    challenge_xuanyuan_fight2: CH1_FIGHT2,        // 第二章战斗 → 回营地
    challenge_xuanyuan_depth: CH1_DEPTH,          // 第三章开场
    challenge_xuanyuan_final: CH1_FINAL,          // 第三章最终战 → 通关
    challenge_xuanyuan_win: CH1_WIN,
    // 挑战二：觉醒七号（三章制）
    challenge_xuanyuan_awaken_intro: CH2_INTRO,
    challenge_xuanyuan_awaken_road: CH2_ROAD,
    challenge_xuanyuan_awaken_fight: CH2_FIGHT,   // 第一章战斗 → 回营地
    challenge_xuanyuan_awaken_art: CH2_ART,       // 第二章开场
    challenge_xuanyuan_awaken_fight2: CH2_FIGHT2, // 第二章战斗 → 回营地
    challenge_xuanyuan_awaken_depth: CH2_DEPTH,   // 第三章开场
    challenge_xuanyuan_awaken_final: CH2_FINAL,   // 第三章最终战 → 通关
    challenge_xuanyuan_awaken_win: CH2_WIN,
    // 挑战三：无翼之民（三章制）
    challenge_yumin_intro: CH3_INTRO,
    challenge_yumin_gate: CH3_GATE,
    challenge_yumin_fight: CH3_FIGHT,             // 第一章战斗 → 回营地
    challenge_yumin_ban: CH3_BAN,                 // 第二章开场
    challenge_yumin_fight2: CH3_FIGHT2,           // 第二章战斗 → 回营地
    challenge_yumin_depth: CH3_DEPTH,             // 第三章开场
    challenge_yumin_final: CH3_FINAL,             // 第三章最终战 → 通关
    challenge_yumin_win: CH3_WIN
  };
})(window);