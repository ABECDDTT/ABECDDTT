/* ===========================================================
 * 问道山海 · 羽民国 完整剧情链
 * 对应策划案第二卷 羽民国 · 风灵之殇（Q02）
 * 包含：序章（风灵之邀）+ 主线Q02_01/02/03 + 隐藏Q02_H1
 *      + 支线Q02_S1/S2/S3 + 羽民国自由行动
 * 背景图：assets/img/nations/yum-*.jpg
 * 好感度：STATE.addFavor / STATE.getFavor（云瑶yunYao等）
 * =========================================================== */
(function (global) {
  'use strict';

  /* ---------- 公共路径引用（相对URL） ---------- */
  const BG = {
    tianyu:      'assets/img/nations/yum-tianyu-city.jpg',   // 天羽城·全貌
    channel:     'assets/img/nations/yum-channel.jpg',       // 风灵通道
    qiongding:   'assets/img/nations/yum-qiongding.jpg',     // 穹顶·风眼
    zhuixinggu:  'assets/img/nations/yum-zhuixinggu.jpg',    // 坠星谷
    jitan:       'assets/img/nations/yum-jitan.jpg',         // 风灵祭坛
    banyucun:    'assets/img/nations/yum-banyucun.jpg',      // 半羽村/地居区
    cloud:       'assets/img/nations/qing-fog-abyss.jpg',    // 云海迷雾（复用青丘迷障）
    altar:       'assets/img/nations/qing-shadow-altar.jpg', // 影狐祭坛（复用，供四象/记忆幻境）
    taolin:      'assets/img/nations/qing-taolin.jpg'        // 桃林（复用，供青丘回望）
  };

  /* ===========================================================
   * 序章 · 风灵之邀
   * 玩家沿大荒古道东行，抵达云海断崖，遇云瑶与风隼苍穹
   * =========================================================== */

  /** 入境入口（青丘结局「前往羽民国」跳转至此） */
  const SCENE_ENTRY = {
    id: 'yumin_entry',
    title: '【羽民国·序】大荒古道·东段',
    bg: BG.cloud,
    text:
`你辞别青丘，沿【[highlight]大荒古道[/highlight]】一路东行。地势渐高，空气愈发清冽，风里开始带上一种若有若无的、天空的腥甜。

大荒古道的尽头，是一道断崖。断崖之外，不是地面——是[highlight]云海[/highlight]。白色的、绵延无尽的云海，在朝阳下泛着金色的光泽。云海中，偶尔有巨大的黑影掠过——那是风灵浮岛的底部，投下的阴影足以覆盖整片森林。

你站在断崖边，正思索如何跨越这万丈深渊，一阵强风忽然自背后卷来。风中夹杂着羽毛，还有——[curse]歌声[/curse]？

那是一首高亢的、用羽族语言吟唱的颂歌，旋律中带着风的呼啸。一只巨大的[highlight]风隼[/highlight]从云层中冲出，双翼展开足有三丈。风隼背上有人——一位穿着青色风织羽衣的少女，她身后一对小巧的翅膀在风中微微颤动，显然无法自主飞行，只能依靠风隼代步。`,
    options: [
      { label: '抱拳上前，静待风隼降落', tag: '谨慎', next: 'yumin_01_arrive' },
      { label: '高声招呼：「请问阁下是……」', tag: '正礼', next: 'yumin_01_arrive' },
      { label: '沉默观察这奇异的空中来客', tag: '内敛', next: 'yumin_01_arrive' }
    ]
  };

  const SCENE_ARRIVE = {
    id: 'yumin_01_arrive',
    title: '【羽民国·序】云海之上',
    bg: BG.cloud,
    text:
`[img]assets/img/npc/npc_yunyao.jpg[/img]\n\n风隼在你面前三丈处稳稳降落，气流卷起你衣袍猎猎。那少女跳下风隼背，小翅膀在风中紧张地颤动。

她看清你，明显愣了一下，随即警惕地后退半步：
"啊！你、你是……[highlight]地面来的人[/highlight]？不对，你身上有……[curse]虚月的气息[/curse]？（警惕）你是青丘来的使者？还是……虚月的眷属？"`,
    options: [
      { label: '「我从青丘来，但不是虚月眷属。我在调查虚月污染的扩散。」', tag: '解释', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 15); Engine.log('云瑶好感 +15：解锁调查员身份', 'good'); }, next: 'yumin_01_intro' },
      { label: '「你呢？一个半羽族，为什么独自在边境飞行？」', tag: '反问', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 5); Engine.log('云瑶好感 +5', 'good'); }, next: 'yumin_01_question' },
      { label: '（沉默观察风隼）', tag: '观察', reply: '你注意到风隼的羽翼上有腐蚀的伤痕，边缘泛着淡淡的紫黑色。', replyTitle: '观察', next: 'yumin_01_observe' },
      { label: '「让开，我有急事。」', tag: '威胁', onChoose: (p) => { STATE.addFavor(p, 'yunYao', -10); Engine.log('云瑶好感 -10，风隼进入警戒', 'evil'); }, next: 'yumin_01_intro' }
    ]
  };

  /** 反问分支：触发自卑剧情 */
  const SCENE_QUESTION = {
    id: 'yumin_01_question',
    title: '【羽民国·序】半羽之问',
    bg: BG.cloud,
    text:
`少女被你的反问噎住，脸颊微红，低下头：
"……你说得对，我一个半羽族，本不该独自在这边境飞行。但……我是天羽城风灵大祭司之女，[highlight]云瑶[/highlight]。母亲是地居族，所以我……生来就只有这对未长全的翅膀。"

她苦笑一下，指尖轻轻拂过自己那对小巧的翅膀：
"天羽族嘲笑我「血不纯」，地居族也嫌我「不是自己人」。我……在两边都是异类。只有苍穹——（她拍了拍风隼）——从不嫌弃我。"`,
    options: [
      { label: '「血统不是原罪。你在做对的事。」', tag: '宽慰', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 5); Engine.log('云瑶好感 +5', 'good'); }, next: 'yumin_01_intro' },
      { label: '「你独自查探边境，是为了什么？」', tag: '追问', reply: '云瑶抿了抿唇：「因为没人信我。他们说风灵通道只是「自然老化」，可我亲眼看见……紫色的东西在啃食风。我只能一个人来，用苍穹的眼睛替我看清真相。」', next: 'yumin_01_intro' }
    ]
  };

  /** 观察分支：发现风隼伤痕 */
  const SCENE_OBSERVE = {
    id: 'yumin_01_observe',
    title: '【羽民国·序】风隼之伤',
    bg: BG.cloud,
    text:
`你一言不发，目光落在那只巨大的风隼身上。

它的翎羽虽仍青黑如铁，但靠近翼根处，赫然有几道[curse]紫黑色的腐蚀痕迹[/curse]——像被某种东西啃噬过，羽毛焦枯，露出底下泛黑的皮肤。它见你注视，发出一声低沉的悲鸣。

少女连忙抚了抚它："苍穹也感觉到了。它是[highlight]风灵之眼[/highlight]，与风灵通道共鸣。它说……通道里有「不属于风的东西」。紫色的……像影子一样的东西……（压低声音）我查过古籍，那和三百年前青丘的「虚月」描述一模一样。"`,
    options: [
      { label: '「你怎么知道这些？」', tag: '追问', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 5); Engine.log('云瑶好感 +5', 'good'); }, next: 'yumin_01_intro' },
      { label: '（继续听她说下去）', next: 'yumin_01_intro' }
    ]
  };

  /** 序章主线交汇：云瑶求助 */
  const SCENE_INTRO = {
    id: 'yumin_01_intro',
    title: '【羽民国·序】风灵将死',
    bg: BG.cloud,
    text:
`无论先前如何交谈，云瑶最终降落风隼，与你面对面站定。她的眼眶红了，却强忍着没有哭。

"不管你是谁……你能帮我吗？[highlight]风灵通道……正在死去[/highlight]。我是唯一发现真相的人，但没有人相信我。天羽族说这只是「自然老化」，地居族说「反正我们也不会飞，坠不坠落无所谓」……但他们都会死的！所有人都会死的！"

那只风隼——苍穹——低下头，轻轻蹭了蹭她的肩膀，像是在安慰她。

"苍穹说，通道里有「不属于风的东西」，紫色的影子。我翻遍古籍，三百年前青丘封印影狐时逸散的虚月之力，有一部分飘向了高空——污染了风灵通道的核心。"

她看向你，眼神里有绝望的、最后一线希望的光芒：
"你身上有虚月的气息，但你也有对抗它的力量。请帮我……[highlight]救救羽民国[/highlight]。"`
    ,
    options: [
      { label: '「我答应你。告诉我从哪里开始。」', tag: '应承', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 20); p.unlocked.add('fengluan_ride'); Engine.log('云瑶好感 +20，获得风隼骑行权限', 'good'); }, next: 'yumin_01_channel' },
      { label: '「我可以帮你，但我要知道风灵石矿脉的位置。」', tag: '条件', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 5); p.unlocked.add('fenglingshi_info'); Engine.log('云瑶好感 +5，获得风灵石情报', 'good'); }, next: 'yumin_01_channel' },
      { label: '「这听起来很危险……我需要考虑一下。」', tag: '犹豫', next: 'yumin_01_channel' },
      { label: '「这是你们羽民自己的事。」', tag: '拒绝', onChoose: (p) => { STATE.addFavor(p, 'yunYao', -10); p.favor = p.favor || {}; }, next: 'yumin_01_refuse' }
    ]
  };

  /** 拒绝分支：云瑶独自离开，序章结束（可在天羽城重触发） */
  const SCENE_REFUSE = {
    id: 'yumin_01_refuse',
    title: '【羽民国·序】独行',
    bg: BG.cloud,
    text:
`云瑶的眼神黯淡下去，她张了张嘴，终是没再强求。她翻身跃上风隼背，声音被风吹散：

"……也好。羽民国的命运，本不该强加给外人。但我还是会去救它，哪怕没人信我。"

她驾驭苍穹腾空而起，消失在云海之间。你站在原地，望着那道青色的身影远去——不知为何，心里沉沉的。

风灵通道若是死去，整个羽民国都将坠落云海。你若真的撒手不管，日后回想，怕是道心难安。`,
    options: [
      { label: '追上她：改变主意，决定相助', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 10); Engine.log('你折返相助，云瑶好感 +10', 'good'); }, next: 'yumin_01_channel' },
      { label: '独自循着风灵通道的方向前往天羽城', next: 'yumin_01_channel' }
    ]
  };

  /** 风灵通道初探 */
  const SCENE_CHANNEL = {
    id: 'yumin_01_channel',
    title: '【羽民国·序】风灵通道初探',
    bg: BG.channel,
    text:
`云瑶带你来到最近的一座风灵通道入口。通道本身是一条宽约三丈的气流桥梁，正常状态下，通道内的风灵粒子会发出淡青色的微光，踩上去有轻微的弹性，像踩在果冻上。

但这条通道的中段……出现了异常。大约十丈长的区域，风灵粒子变成了[highlight]紫黑色[/highlight]，气流不再是单向流动，而是形成了无数小型旋风，发出尖锐的、像是婴儿啼哭的啸声。

"就是这里。"云瑶的声音发紧，"三天前，一支地居族的维修队进入这段通道，然后……（颤抖）然后他们的尸体被风吹了出来。全身没有伤口，但……表情极度恐惧，像是……看到了什么不该看的东西。"

她递给你一枚青色的石头——[highlight]风灵护符[/highlight]。

"这个可以保护你在强风中不被撕裂。但……如果看到紫色的影子，不要犹豫，立刻退回来。答应我。"`,
    options: [
      { label: '「放心。我进去看看。」踏入堵塞区域', tag: '探索', next: 'yumin_01_channel_deep' },
      { label: '「你先退后，护好苍穹。」', tag: '担当', next: 'yumin_01_channel_deep' }
    ]
  };

  /** 踏入堵塞区域 · 遭遇混沌风魔幼体 */
  const SCENE_CHANNEL_DEEP = {
    id: 'yumin_01_channel_deep',
    title: '【羽民国·序】蚀风之影',
    bg: BG.channel,
    text:
`你踏入堵塞区域。瞬间，世界变得嘈杂——不是声音的嘈杂，是「[curse]气流[/curse]」的嘈杂。你能感觉到无数股气流在你耳边低语，说着你听不懂的语言。紫黑色的风灵粒子附着在你皮肤上，带来冰冷的刺痛感。

然后，你看到了「它」。

那是一团……风？不，是[highlight]风中的影子[/highlight]。它没有固定形态，时而像是一只巨大的鸟，时而像是一张扭曲的人脸，时而是……你自己。它在通道中盘旋，吞噬着遇到的一切风灵粒子。

【混沌风魔·幼体】的声音，是千万道风同时呼啸——
"饿……好饿……风……好吃……但不够……还要……更多……"

它发现了你。紫黑色的气流向你汇聚，形成了一只爪子的形状，当头抓下！`,
    options: [],
    battle: {
      enemy: { name: '混沌风魔·幼体', hp: 600, atk: 55, def: 30, lv: 10, element: '邪', bg: BG.channel },
      onWin: (p) => {
        if (global.Engine) Engine.log('击败混沌风魔·幼体', 'good');
        STATE.completeQuest(p, 'YUMIN_PUP_DEFEATED');
        // 序章奖励
        p.realm.exp = (p.realm.exp || 0) + 300;
        STATE.addMaterial(p, 'MAT-FS01', 2);
        p.unlocked.add('tianyu_map');
        p.unlocked.add('channel_fast');
        if (global.Engine) Engine.toast('序章奖励：经验+300，风灵石×2', 'gold');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌幼体，重伤退却', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.2));
      },
      after: 'yumin_01_channel_after'
    }
  };

  /** 击退幼体之后 */
  const SCENE_CHANNEL_AFTER = {
    id: 'yumin_01_channel_after',
    title: '【羽民国·序】触角与本体',
    bg: BG.channel,
    text:
`战斗结束。幼体发出一声尖啸，化作紫黑色烟雾消散。但通道的堵塞没有缓解——这只是「它」的一小部分。

你退出堵塞区域，云瑶冲上来抓住你的手：
"你没事！太好了……太好了……（然后意识到自己的失态，松开手，脸红）对、对不起……我只是……"

苍穹突然发出一声尖锐的鸣叫，看向通道深处。

云瑶脸色一变："苍穹说……刚才那只是「[highlight]触角[/highlight]」。真正的本体……在「穹顶」……风灵通道的源头。"

她看向你，眼神坚定：
"我要去穹顶。不管父亲……不管大祭司怎么反对。如果你愿意……请和我一起。"

【序章完成】
- 经验 +300
- 获得【风灵护符】×1、【风灵石】×2
- 云瑶好感度：视选择而定
- 解锁「天羽城」地图、「风灵通道」快速移动`,
    options: [
      { label: '「好，我随你同往天羽城。」', tag: '同行', next: 'yumin_q02_01_enter' },
      { label: '「先在天羽城落脚，再图长远。」', tag: '沉稳', next: 'yumin_q02_01_enter' }
    ]
  };

  /* ===========================================================
   * 主线 Q02_01 · 风灵之竭
   * 天羽城·阶层之壁 → 三方调查 → 坠星谷 → 净化之法三路线
   * =========================================================== */

  /** Q02_01 天羽城：地居区入口 */
  const SCENE_Q02_01_ENTER = {
    id: 'yumin_q02_01_enter',
    title: '【主线 Q02_01】天羽城 · 阶层之壁',
    bg: BG.banyucun,
    text:
`「随我来吧。」云瑶轻声道。风隼一声长鸣，载着你与云瑶掠向云海深处——那座悬于云上的[highlight]天羽城[/highlight]，在你眼前徐徐展开。

风隼降落在天羽城的外层平台——「[highlight]地居区入口[/highlight]」。这里的空气浑浊，充满了机油和腐烂云锦的气味。平台下方是密密麻麻的棚屋，用浮岛碎片、废弃风织羽衣、甚至兽骨搭建。地居们抬头看你，眼神里没有好奇，只有[highlight]麻木[/highlight]。

云瑶带你穿过地居区，走向内层。一道巨大的、由风灵石构成的门分隔了两个世界。门这边，是阴暗、拥挤、肮脏的底层；门那边，是明亮、开阔、芬芳的天羽区。

一个[highlight]地居族老人[/highlight]忽然拉住你的衣角，颤巍巍道：
"外乡人……你身上有风灵石的味道……能不能……给我一小块？我的孙子……病了……需要风灵石粉末做药引……"`,
    options: [
      { label: '「给你。」（给予风灵石×1）', tag: '慷慨', onChoose: (p) => {
          if (STATE.hasMaterial(p, 'MAT-FS01', 1)) {
            STATE.removeMaterial(p, 'MAT-FS01', 1);
            STATE.addFavor(p, 'diJu', 10);
            p.unlocked.add('yiLao_pos');
            Engine.log('地居族好感 +10，获得情报「翼老的位置」', 'good');
          } else {
            Engine.log('你没有风灵石，老人失望地松开手', 'evil');
          }
        }, next: 'yumin_q02_01_tianyu' },
      { label: '「我自己也不够用。」', tag: '婉拒', onChoose: (p) => { STATE.addFavor(p, 'diJu', -5); }, next: 'yumin_q02_01_tianyu' },
      { label: '「为什么地居族没有风灵石？这不是你们的国家吗？」', tag: '追问', next: 'yumin_q02_01_class' }
    ]
  };

  /** 阶层矛盾剧情 */
  const SCENE_Q02_01_CLASS = {
    id: 'yumin_q02_01_class',
    title: '【主线 Q02_01】地居之痛',
    bg: BG.banyucun,
    text:
`老人闻言，露出一个比哭还难看的苦笑：

"我们的国家？哈哈……外乡人，你以为羽民国是「我们的」？[highlight]天羽族[/highlight]才拥有这个国家。我们地居……不过是「累赘」，是「锚」，是防止浮岛飘太远的[highlight]配重[/highlight]罢了。"

"天羽族背生双翼，翱翔九天；我们连翅膀都没有，只能住在浮岛最底层，终年不见阳光。风灵石是浮岛的心脏，可我们连给孙子治病的粉末都求不到。这……就是羽民国的「秩序」。"

他松开你的衣角，佝偻着背退回棚屋阴影里。`,
    options: [
      { label: '（沉默，心中记下这番话）', tag: '深思', next: 'yumin_q02_01_tianyu' },
      { label: '「……会改变的。风灵通道出了问题，人人自危之时，恰是打破樊笼之机。」', tag: '志向', onChoose: (p) => { STATE.addFavor(p, 'diJu', 5); }, next: 'yumin_q02_01_tianyu' }
    ]
  };

  /** 穿过风灵石门 · 天羽区 · 遇风烈 */
  const SCENE_Q02_01_TIANYU = {
    id: 'yumin_q02_01_tianyu',
    title: '【主线 Q02_01】天羽之区',
    bg: BG.tianyu,
    text:
`穿过风灵石门，天羽区的景象豁然开朗。羽塔高耸入云，塔身由半透明的风灵石构成，在阳光下折射出彩虹般的光芒。天羽族们在空中自由飞翔，翅膀展开时，在地面投下美丽的阴影。空中花园种植着「云锦花」，花瓣如丝绸般柔软，散发着清甜的香气。

云瑶低下头，声音变小："……对不起。我每次穿过这扇门，都觉得……自己很脏。"

她的小翅膀在天羽区显得格外可笑——天羽族的翅膀展开足有丈余，而她的只有三尺。

忽然，一道银白色的身影从空中降下。是一位面容英俊但眼神冰冷的青年，他背上的翅膀罕见地泛着银光：
"[highlight]风烈[/highlight]。天羽族禁卫统领。"

"云瑶。你去了哪里？我找你很久了。（他看向你，眼神一沉）这是谁？地居区的……朋友？"

「朋友」二字，满是嘲讽。`,
    options: [
      { label: '「我受云瑶所托，来查风灵通道之变。」', tag: '陈述', next: 'yumin_q02_01_fenglie' },
      { label: '「风灵通道在死去，你却只在意一个「外乡人」？」', tag: '反问', next: 'yumin_q02_01_fenglie' },
      { label: '（抱拳行礼，不卑不亢）', tag: '内敛', next: 'yumin_q02_01_fenglie' }
    ]
  };

  /** 风烈的敌意 */
  const SCENE_Q02_01_FENGLIE = {
    id: 'yumin_q02_01_fenglie',
    title: '【主线 Q02_01】风烈之锋',
    bg: BG.tianyu,
    text:
`风烈冷冷扫了你一眼，转向云瑶：

"够了。又是这套说辞？云瑶，你是个好女孩，但有时候……太天真了。风灵通道的问题，大祭司和长老会已经在处理了。不需要一个……外乡人……来插手。"

他逼近一步，威压逼人：
"我不管你是谁，来自哪里。羽民国的事，羽民自己解决。如果你识相，明天一早，坐风隼离开。否则……"

他没说完，但威胁之意溢于言表。他展开银翅，腾空而起，消失在羽塔之间。

云瑶咬着嘴唇："……对不起。风烈他……其实不坏。只是……天羽族的教育让他……觉得只有「纯净」才是正确的。"`,
    options: [
      { label: '「这不是你的错。偏见比虚月更难驱除。」', tag: '安慰', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 15); Engine.log('云瑶好感 +15', 'good'); }, next: 'yumin_q02_01_investigate' },
      { label: '「这家伙让我想揍他。」', tag: '怒', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 5); Engine.log('云瑶好感 +5', 'good'); }, next: 'yumin_q02_01_investigate' },
      { label: '「我们需要更多信息。大祭司……你的父亲，他知道多少？」', tag: '冷静', reply: '云瑶眼神复杂：「父亲……他知道风灵通道在衰亡，却对外宣称只是「自然老化」。他不信「虚月」之说——或者说，他不愿信。」', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 三方调查自由入口 */
  const SCENE_Q02_01_INVESTIGATE = {
    id: 'yumin_q02_01_investigate',
    title: '【主线 Q02_01】三方的真相',
    bg: BG.tianyu,
    text:
`云瑶带你暂居天羽城一座偏院。她郑重道：

"要解开风灵之竭，须得拼凑三方的真相——天羽族长老说的、地居族翼老说的、半羽族小翎说的。你愿意，就分头去打探吧。"

她递给你一枚玉佩：「这是大祭司府的信物，凭此可出入地居区与半羽村。」

【调查目标】
一、天羽族长老·云霆（大祭司之弟）
二、地居族领袖·翼老（地居区地下酒馆）
三、半羽族少女·小翎（半羽村）

四处打听，或能拼出真相。`,
    options: [
      { label: '拜访天羽族长老·云霆', tag: '调查', next: 'yumin_q02_01_yunting' },
      { label: '前往地居区地下酒馆·翼老', tag: '调查', next: 'yumin_q02_01_yilao' },
      { label: '前往半羽村·小翎', tag: '调查', next: 'yumin_q02_01_xiaoling' },
      { label: '（三处均已探明，前往坠星谷）', tag: '汇合', requireAll: [['quest_done','Q02_INV_YUNTING'],['quest_done','Q02_INV_YILAO'],['quest_done','Q02_INV_XIAOLING']], next: 'yumin_q02_01_zhuixinggu' }
    ]
  };

  /** 天羽族长老 · 云霆 */
  const SCENE_Q02_01_YUNTING = {
    id: 'yumin_q02_01_yunting',
    title: '【主线 Q02_01】长老·云霆',
    bg: BG.tianyu,
    text:
`你找到天羽族长老[highlight]云霆[/highlight]——大祭司之弟，云瑶的叔叔。他正在羽塔高阁中品茗，见你持信物而来，倒也不意外。

"风灵通道的问题？哼，不过是「[highlight]风灵衰退周期[/highlight]」。每千年一次，正常现象。大祭司已经在祭坛进行了「羽风仪式」，再过三个月，通道自然会恢复。"

他压低声音：
"不过……如果你真想知道什么……去问问[highlight]翼老[/highlight]那个老东西。他知道的……比我们都多。他被剥了翅膀，心里记着仇呢，说话未必好听，但……是实话。"`,
    options: [
      { label: '「多谢长老指点。」（得到线索：翼老知道更多）', tag: '线索', completed: 'Q02_INV_YUNTING', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 地居族 · 翼老 */
  const SCENE_Q02_01_YILAO = {
    id: 'yumin_q02_01_yilao',
    title: '【主线 Q02_01】翼老 · 被剥翅之人',
    bg: BG.banyucun,
    text:
`你在地居区地下酒馆找到[highlight]翼老[/highlight]——一个没有翅膀、背脊上有两道可怕疤痕的老者。他正灌着酒，见你坐下，冷哼一声。

"哈！天羽族说「自然老化」？放屁！（拍桌子）三百年前，我当大祭司的时候，风灵通道强得能托起一座山！现在呢？连只肥风隼都托不稳！（指着自己的背）看到这两道疤了吗？我的翅膀被剥夺时留下的。为什么？因为我发现了真相——风灵通道的源头，「风眼」里，有东西。不是风灵，是……「[curse]别的东西[/curse]」。紫色的，像影子，像雾，像……（颤抖）像有意识的「饥饿」。"

他灌下一杯酒，继续道：
"风烈那小子，知道真相。大祭司……也知道。但他们不敢面对。因为面对真相，意味着承认羽民国建立在谎言之上——我们不是什么风灵的后裔，我们只是……[highlight]窃居者[/highlight]。风灵通道是上古风灵族建造的，我们羽民……是后来者。而那个「东西」……它才是风灵族真正的遗产。我们只是……偷了人家的家，现在正主回来讨债了。"`,
    options: [
      { label: '「那个「东西」到底是什么？」', tag: '追问', completed: 'Q02_INV_YILAO', next: 'yumin_q02_01_yilao2' },
      { label: '「你为什么告诉我这些？」', tag: '质疑', completed: 'Q02_INV_YILAO', next: 'yumin_q02_01_yilao3' },
      { label: '（沉默观察酒馆壁画）', tag: '观察', completed: 'Q02_INV_YILAO', next: 'yumin_q02_01_yilao4' }
    ]
  };

  /** 翼老·混沌风魔真相 */
  const SCENE_Q02_01_YILAO2 = {
    id: 'yumin_q02_01_yilao2',
    title: '【主线 Q02_01】混沌风魔',
    bg: BG.banyucun,
    text:
`翼老的目光变得深邃：

"那个东西，叫[highlight]混沌风魔[/highlight]。是虚月污染与风灵通道守护者融合的产物。三百年前青丘封印影狐时，逸散的虚月之力飘上高空，侵染了风眼核心。守护者拼命抵抗，却被污染吞没——它现在既是守护者，也是……风魔。"

"它的本能只有「吞噬风灵」。若不阻止，整个羽民国的浮岛都会失去风灵之力，坠落云海，尸骨无存。"`,
    options: [
      { label: '「多谢相告。」（线索：混沌风魔的由来）', tag: '线索', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 翼老·为何相告 */
  const SCENE_Q02_01_YILAO3 = {
    id: 'yumin_q02_01_yilao3',
    title: '【主线 Q02_01】将死之言',
    bg: BG.banyucun,
    text:
`翼老放下酒杯，浑浊的眼中闪过一丝悲凉：

"因为我快死了。地居族的寿命很短，没有风灵滋养，我们活不过五十年。而我……是个例外——当年风灵尚盛时，我承蒙风灵之力滋养，才侥幸活到了三百多岁，全靠那点残存的灵力吊着。如今风灵一竭，我撑不了多久了。"

"我想在死前……看到真相大白。让那些自诩高贵的天羽族知道，他们引以为傲的风灵遗产，本就是偷来的。也让……后人不要再被瞒在鼓里。"`,
    options: [
      { label: '「你的话，我记下了。」（线索：翼老的遗愿）', tag: '线索', completed: 'Q02_INV_YILAO', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 翼老·观察壁画 */
  const SCENE_Q02_01_YILAO4 = {
    id: 'yumin_q02_01_yilao4',
    title: '【主线 Q02_01】风灵族壁画',
    bg: BG.banyucun,
    text:
`你没有追问，而是将目光落在酒馆墙壁上——那里绘着古老的壁画，已被岁月与烟熏得斑驳。

你仔细辨认，壁画描绘的是上古风灵族与羽民先祖的一场战争。风灵族人身生巨大羽翼，驾驭气流；而羽民先祖……手持长矛，正在围攻一只垂死的风灵。

壁画的角落刻着寥寥数字：「[curse]吾族……渐亡……窃者……承其位……[/curse]」

翼老见你盯着壁画，嗤笑一声："看到了吧？这就是真相。羽民与风灵族，从来不是同源。我们……是踩着人家的尸骨上位的。"`,
    options: [
      { label: '（线索：风灵族与羽民之争的壁画）', tag: '线索', completed: 'Q02_INV_YILAO', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 半羽族 · 小翎 */
  const SCENE_Q02_01_XIAOLING = {
    id: 'yumin_q02_01_xiaoling',
    title: '【主线 Q02_01】半羽村 · 小翎',
    bg: BG.banyucun,
    text:
`你在半羽村找到[highlight]小翎[/highlight]——云瑶的朋友，一个活泼的半羽族少女。她看到你，眼睛一亮：

"云瑶姐姐带你来的？那她一定信任你。（随即担忧起来）最近半羽村出现了很多「[highlight]风蚀症[/highlight]」患者——身体逐渐透明，最后……变成风，消散。天羽族说这是「血统不纯的报应」，但我不信。"

她取出一块风灵石——正常的应是淡青色，可这块中心有一丝[highlight]紫黑色的纹路[/highlight]：

"这是从[highlight]坠星谷[/highlight]找到的。那里……有一座已经坠落的浮岛。我偷偷下去过。（恐惧）那里……有东西在动。不是风，是……像影子一样的东西，在残骸中爬行。"

"我查过古籍，风蚀症……是风灵粒子被「污染」后才会出现的症状。通道里的紫黑色风灵……就是污染源。"`,
    options: [
      { label: '「坠星谷在哪里？带我去看看。」', tag: '线索', completed: 'Q02_INV_XIAOLING', next: 'yumin_q02_01_investigate' },
      { label: '「这份情报很重要，谢谢你，小翎。」', tag: '致谢', completed: 'Q02_INV_XIAOLING', onChoose: (p) => { STATE.addFavor(p, 'xiaoLing', 10); Engine.log('小翎好感 +10', 'good'); }, next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 坠星谷 · 云海之下 */
  const SCENE_Q02_01_ZHUIXINGGU = {
    id: 'yumin_q02_01_zhuixinggu',
    title: '【主线 Q02_01】坠星谷 · 被埋葬的历史',
    bg: BG.zhuixinggu,
    text:
`三处线索拼凑，指向同一处——[highlight]坠星谷[/highlight]。

云瑶驾驶苍穹，带你进行一场极其危险的「俯冲飞行」。风隼双翼收紧，如离弦之箭直插云海之下。四周雾气翻涌，气压骤增，你紧抓风隼翎羽，耳边全是呼啸的风声。

终于，坠星谷映入眼帘。那是一座已经坠落的浮岛残骸，呈倒锥形插入地面，周围是方圆十里的冲击坑。坑中生长着奇异的[highlight]坠星藤[/highlight]——藤蔓呈紫黑色，会主动攻击靠近的生物。

残骸内部保存着相对完好的建筑——不是羽民的风格，是更古老、更宏伟的风格。墙壁上刻满你从未见过的文字，但当你靠近时，那些文字发出淡青色的光芒，然后……你莫名能读懂了。`,
    options: [
      { label: '（辨识墙壁文字）', tag: '解读', next: 'yumin_q02_01_zhuixinggu_text' },
      { label: '深入残骸，寻找祭坛', tag: '探索', next: 'yumin_q02_01_zhuixinggu_altar' }
    ]
  };

  /** 坠星谷 · 文字 */
  const SCENE_Q02_01_ZHUIXINGGU_TEXT = {
    id: 'yumin_q02_01_zhuixinggu_text',
    title: '【主线 Q02_01】风灵遗文',
    bg: BG.zhuixinggu,
    text:
`你凝神辨识墙壁上的文字，那淡青色的光芒映在你脸上：

"吾族风灵，生于风眼，归于风眼。以风为躯，以灵为魂。羽族后来者，窃吾居所，夺吾风灵，吾族渐亡。今以最后的纯净风灵，封印「蚀风」于此。后世若有缘者，愿以己身，重净风眼，吾族感激不尽。"

云瑶读完，脸色苍白："所以……翼老说的是真的。羽民……是后来者。我们……窃取了风灵族的家。而「蚀风」……就是混沌风魔？"`,
    options: [
      { label: '「先莫自责。当务之急，是找到净化之法。」', tag: '宽慰', next: 'yumin_q02_01_zhuixinggu_altar' }
    ]
  };

  /** 坠星谷 · 祭坛与混沌风魔碎片 */
  const SCENE_Q02_01_ZHUIXINGGU_ALTAR = {
    id: 'yumin_q02_01_zhuixinggu_altar',
    title: '【主线 Q02_01】风灵之心',
    bg: BG.zhuixinggu,
    text:
`你深入残骸，来到一座祭坛。祭坛中央躺着一具骸骨——不是人类的，是某种有翼生物的，翼展足有五丈。骸骨的胸腔中，镶嵌着一块巨大的、纯净的风灵石——「[highlight]风灵之心[/highlight]」。

但风灵之心已经被污染了一半。一半仍是淡青色，另一半……是[highlight]紫黑色[/highlight]。

忽然，一团黑雾从风灵之心中渗出，化作一张模糊的脸，声音嘶哑如碎风：

"[curse]羽……民……窃贼……还……给……我……[/curse]"

它向云瑶扑去！`,
    options: [],
    battle: {
      enemy: { name: '混沌风魔·碎片', hp: 1000, atk: 72, def: 42, lv: 12, element: '邪', bg: BG.zhuixinggu },
      onWin: (p) => {
        if (global.Engine) Engine.log('击败混沌风魔·碎片', 'good');
        STATE.completeQuest(p, 'YUMIN_SHARD_DEFEATED');
        // Q02_01 奖励
        p.realm.exp = (p.realm.exp || 0) + 1200;
        STATE.addMaterial(p, 'MAT-FS01', 5);
        STATE.addMaterial(p, 'SEED-FS01', 2);
        p.unlocked.add('qiongding_map');
        p.unlocked.add('banyucun_shop');
        if (global.Engine) Engine.toast('经验+1200，风灵石×5，坠星藤种子×2', 'gold');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌碎片，重伤退却', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.15));
      },
      after: 'yumin_q02_01_after'
    }
  };

  /** 坠星谷战后 · 云瑶的决心 */
  const SCENE_Q02_01_AFTER = {
    id: 'yumin_q02_01_after',
    title: '【主线 Q02_01】净化之愿',
    bg: BG.zhuixinggu,
    text:
`战斗结束，风灵之心的污染停止了蔓延，但没有净化。

云瑶跪倒在骸骨前，泪水滚落：
"风灵族……对不起。我……我不知道……我的祖先……做了这样的事……"

她抬起头，看向你，眼神里有一种前所未有的坚定：
"[highlight]我要净化风灵之心[/highlight]。不是作为羽民……而是作为……一个想要纠正错误的人。请帮我……找到净化的方法。"

【任务目标更新】
① 调查天羽城 ✓
② 调查地居区 ✓
③ 调查坠星谷 ✓
④ 寻找净化风灵之心的方法（0/1）`,
    options: [
      { label: '「好。我们一起想办法。」', tag: '应承', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 15); }, next: 'yumin_q02_01_purify' }
    ]
  };

  /** 净化之法 · 三路线分歧 */
  const SCENE_Q02_01_PURIFY = {
    id: 'yumin_q02_01_purify',
    title: '【主线 Q02_01】净化之法 · 三路',
    bg: BG.jitan,
    text:
`回到天羽城，你与云瑶商议净化之法。经多方打听，这净化风灵污染的道路，竟有三条——因你在青丘的抉择与此刻的心念，而各有不同。

【[highlight]路线A·契约[/highlight]】以「净风丹」净化风灵污染——材料：风灵石×5 + 月光草×3 + 净魂池水×2 + 执念结晶×1。此路温和，可保全风灵之心。

【[highlight]路线B·斩杀[/highlight]】直捣穹顶风眼，摧毁混沌风魔核心。风灵通道自然恢复，但风灵之心将彻底碎裂，羽民国失去风灵庇护，浮岛会逐渐坠落。

【[highlight]路线C·窃风[/highlight]】风烈私下提出交易——助他「控制」风魔，换取天羽区安全。将风魔之力引导至地居区，让地居族成为「食粮」。（须恶念深重者方可行此路）`,
    options: [
      { label: '「走契约之路，以净风丹净化。」', tag: '契约', next: 'yumin_q02_02_contract_prep' },
      { label: '「直接斩杀风魔，以绝后患。」', tag: '斩杀', next: 'yumin_q02_02_boss' },
      { label: '「（若恶念≥60）窃风之路，方能保天羽……」', tag: '窃风', require: 'evil_gte', requireValue: 60, next: 'yumin_q02_02_steal' }
    ]
  };

  /* ===========================================================
   * 主线 Q02_02 · 穹顶之战
   * 三路线：契约净化 / 斩杀歼灭 / 窃风契约
   * =========================================================== */

  /** 前往穹顶 */
  const SCENE_Q02_02_QIANGDING = {
    id: 'yumin_q02_02_qiongding',
    title: '【主线 Q02_02】穹顶 · 风眼',
    bg: BG.qiongding,
    text:
`穹顶是羽民国最高浮岛，也是风灵通道的源头。要到达这里，必须穿过最后一段风灵通道——但这通道已被完全堵塞，紫黑色的旋风在其中咆哮，形成了一道「[highlight]风墙[/highlight]」。

"普通风隼无法穿过这段通道。但……苍穹可以。它是风灵之眼，是唯一能在蚀风中飞行的生物。"

苍穹俯下身，示意你们爬上它的背。风隼的羽毛在蚀风中发出金属般的摩擦声，但它依然稳定地起飞，冲入风墙。

穿过风墙的瞬间，世界变成了紫黑色。你感觉无数冰冷的手指在撕扯你的衣服、皮肤、甚至灵魂。云瑶紧紧抱住苍穹的脖子，她的小翅膀在蚀风中痛苦地颤抖。

然后，你们冲出了风墙。穹顶的景象超乎想象——一座直径不足百丈的小型浮岛，岛上没有建筑，只有一个巨大的、深不见底的「洞」——[highlight]风眼[/highlight]。风眼直径约三十丈，边缘由古老的风灵石构成。风眼内部，紫黑色的旋风以恐怖的速度旋转，发出震耳欲聋的轰鸣。

在风眼上空，悬浮着「它」——[highlight]混沌风魔[/highlight]。它比幼体大百倍，身体是一道巨大的龙卷风，龙卷风中闪烁着无数紫黑色的闪电。在龙卷风核心，你隐约看到了一个身影——一只巨大的、有翼的生物，被紫黑色的锁链缠绕，无法挣脱。

云瑶颤抖道："那……那是……风灵族的……[highlight]守护者[/highlight]？它被……囚禁在风魔体内？"`,
    options: [
      { label: '（坚定前行，直面风魔）', tag: '决战', next: 'yumin_q02_02_route' }
    ]
  };

  /** 根据路线跳转 */
  const SCENE_Q02_02_ROUTE = {
    id: 'yumin_q02_02_route',
    title: '【主线 Q02_02】抉择',
    bg: BG.qiongding,
    text:
`站在风眼之畔，风魔在你头顶咆哮。你握紧手中之力，回忆起那日所选的道路——

净化之念若在，便以「净风丹」行契约仪式；杀伐之心若起，便直取风魔本体；若早与风烈暗通款曲，亦可引蚀风入地居区。`,
    options: [
      { label: '【契约之路】净化仪式', tag: '契约', next: 'yumin_q02_02_contract_prep' },
      { label: '【斩杀之路】歼灭风魔', tag: '斩杀', next: 'yumin_q02_02_boss' },
      { label: '【窃风之路】引魔入地居', tag: '窃风', next: 'yumin_q02_02_steal' }
    ]
  };

  /* ===========================================================
   * 路线A：契约净化
   * =========================================================== */
  const SCENE_Q02_02_CONTRACT_PREP = {
    id: 'yumin_q02_02_contract_prep',
    title: '【主线 Q02_02】净风丹 · 炼制',
    bg: BG.jitan,
    text:
`你选择以「净风丹」净化风灵污染。所需材料如下——
· 风灵石 ×5
· 月光草 ×3
· 净魂池水 ×2
· 执念结晶 ×1

云瑶四处筹措，将材料集齐。她在风灵祭坛前盘膝而坐，以灵魂之力为引，将材料凝练成丹。丹成之时，一缕[highlight]净风[/highlight]自丹中溢出，沁人心脾。

"净风丹成了。但要净化风眼，必须将它投入风眼内部，从内而外地触及风魔核心。"云瑶抬眸，"而我……可能被风撕碎。或者……被虚月污染。"

她看向你，微笑：
"但如果我不去……就没有人了。半羽族……地居族……我们已经被忽视太久了。这一次……让我来证明……我们也有价值。"`,
    options: [
      { label: '「太危险了！让我来！」', tag: '替身', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 25); p.mp = Math.max(0, p.mp - 10); Engine.log('云瑶好感 +25；你代替云瑶入风眼，灵力上限-10（风蚀）', 'good'); }, next: 'yumin_q02_02_contract_support' },
      { label: '「我相信你。我会在这里，用尽全力保护你。」', tag: '护法', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 20); }, next: 'yumin_q02_02_contract_support' },
      { label: '「我陪你一起进去。」', tag: '同往', require: 'has_mingshen', requireValue: 'yixian', next: 'yumin_q02_02_contract_support' }
    ]
  };

  /** 契约净化 · 保护战/仪式 */
  const SCENE_Q02_02_CONTRACT_SUPPORT = {
    id: 'yumin_q02_02_contract_support',
    title: '【主线 Q02_02】净化仪式 · 守心',
    bg: BG.qiongding,
    text:
`净风丹投入风眼，云瑶（或你）以灵魂之力引导风灵之心与风眼共鸣。

风魔发出震怒的咆哮，紫黑色的蚀风化作千万道冲击，疯狂攻向仪式者。你必须在外围抵挡——这是对信念与意志的考验。

每挡住一波蚀风，风魔的紫黑色便褪去一分。风眼深处，那被囚禁的风灵守护者，发出微弱的回应。`,
    options: [
      { label: '（以命护法，支撑仪式完成）', tag: '守心', next: 'yumin_q02_02_contract_win' }
    ]
  };

  /** 契约净化成功 */
  const SCENE_Q02_02_CONTRACT_WIN = {
    id: 'yumin_q02_02_contract_win',
    title: '【主线 Q02_02】青鸾之羽',
    bg: BG.jitan,
    text:
`历经艰险，净风丹终于触及风魔核心。风眼爆发出耀眼的青光，紫黑色的部分被剥离、消散。

风灵守护者的身影逐渐清晰——那是一只巨大的、由纯净风灵构成的[highlight]青鸾[/highlight]。它的声音如风的轻语：

"终于……自由了。羽民的后裔……谢谢你。你的勇气……比翅膀……更珍贵。"

青鸾低下头，将一枚羽毛赠予云瑶。那羽毛触碰到云瑶的小翅膀时，奇迹发生了——云瑶的翅膀开始生长，从三尺……到五尺……到八尺……最后，一对完美的、青色的、散发着风灵光芒的翅膀在她背后展开。

云瑶难以置信地看着自己的翅膀："我……我能飞了？我真的……能飞了？"

她尝试扇动翅膀，缓缓升空。泪水在风中飞散，但她在笑，笑得像个终于得到礼物的孩子。

青鸾化作无数风灵粒子，融入风眼。风眼恢复了正常的旋转，淡青色的风灵粒子重新充满了通道。

【契约路线完成】
- 云瑶进化为「[highlight]天羽·云瑶[/highlight]」（翅膀完全觉醒）
- 获得【[highlight]青鸾之羽[/highlight]】（SSR级材料）
- 羽民国进入「契约时代」：天羽族与地居族和解，半羽族获得平等地位
- 风烈被放逐
- 云瑶成为新任风灵大祭司`,
    options: [
      { label: '（归去，见证羽民国的重生）', tag: '结局', onChoose: (p) => { STATE.addMaterial(p, 'MAT-FS06', 1); STATE.addFavor(p, 'yunYao', 30); p.unlocked.add('yunYao_recruit'); }, next: 'yumin_q02_03_guifeng' }
    ]
  };

  /* ===========================================================
   * 路线B：斩杀歼灭
   * =========================================================== */
  const SCENE_Q02_02_BOSS = {
    id: 'yumin_q02_02_boss',
    title: '【主线 Q02_02】风魔歼灭战',
    bg: BG.qiongding,
    text:
`你选择直接斩杀混沌风魔，以绝后患。

风魔察觉到你的杀意，龙卷风骤然暴涨，紫黑色的闪电劈向四面八方。那被囚禁的风灵守护者发出悲鸣——可此刻，你已无暇顾及。

"来！"[highlight]混沌风魔[/highlight]的声音如千万道风同时咆哮，"羽民……窃贼……连同……你的……怜悯……一起……吞掉……！"

战斗一触即发。风眼的风压撕扯着你的护体灵气，每分每秒都在侵蚀你的生命。`,
    options: [],
    battle: {
      enemy: { name: '混沌风魔', hp: 2800, atk: 118, def: 75, lv: 15, element: '邪', bg: BG.qiongding },
      onWin: (p) => {
        if (global.Engine) Engine.log('斩杀混沌风魔', 'good');
        STATE.completeQuest(p, 'YUMIN_BOSS_SLAIN');
        STATE.addMaterial(p, 'MAT-FS07', 1); // 风魔核心
        p.evil = Math.min(100, p.evil + 15);
        if (global.Engine) Engine.toast('获得风魔核心，恶念 +15', 'gold');
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌风魔，重伤退却', 'evil');
        p.hp = Math.max(1, Math.floor(STATE.calcMaxHp(p) * 0.1));
      },
      after: 'yumin_q02_02_boss_after'
    }
  };

  /** 斩杀战后 */
  const SCENE_Q02_02_BOSS_AFTER = {
    id: 'yumin_q02_02_boss_after',
    title: '【主线 Q02_02】坠落之始',
    bg: BG.qiongding,
    text:
`风魔被消灭，庞大的龙卷风轰然崩塌。但风灵守护者（青鸾）也因长期被囚禁而虚弱消散。风灵之心碎裂，羽民国失去了风灵庇护。

风烈在战斗结束后现身，望着碎裂的风灵之心，表情复杂：
"……结束了。但……我们也失去了……飞翔的根基。"

他看向云瑶，第一次没有嘲讽：
"地居族……半羽族……所有人……都会坠落。除非……找到新的风灵石矿脉。或者……接受……成为「[highlight]地面民族[/highlight]」的命运。"

云瑶的翅膀没有觉醒。她看着碎裂的风灵之心，沉默了很久，低声道：
"……也许……这就是……我们的报应。但……我们会活下去。以……羽民的身份……不是风灵的寄生虫……而是……独立的……民族。"

【斩杀路线完成】
- 获得【[highlight]风魔核心[/highlight]】（邪道顶级材料）
- 获得「风烈之誓」（风烈成为队友，性格阴郁）
- 羽民国进入「坠落时代」：浮岛逐渐降低高度，最终与地面融合
- 天羽族失去飞行能力
- 云瑶获得「无翼之誓」`,
    options: [
      { label: '（见证羽民国的坠落与重生）', tag: '结局', onChoose: (p) => { p.unlocked.add('fengLie_recruit'); p.unlocked.add('wuyi_zhi_shi'); }, next: 'yumin_q02_03_fengyun' }
    ]
  };

  /* ===========================================================
   * 路线C：窃风契约
   * =========================================================== */
  const SCENE_Q02_02_STEAL = {
    id: 'yumin_q02_02_steal',
    title: '【主线 Q02_02】窃风之契',
    bg: BG.jitan,
    text:
`你与风烈暗中达成交易。在秘密祭坛中，风烈眼神狂热：

"地居族……半羽族……他们本来就不会飞，坠落对他们来说有什么区别？但天羽族……我们是风的后裔……我们不能失去天空！"

仪式开始。紫黑色的蚀风从风眼涌出，直扑地居区。地居族们在蚀风中挣扎、透明、消散……他们的生命被转化为风灵，维持着天羽区的浮空。

[highlight]翼老[/highlight]突然出现，挡在仪式前，浑身是血：
"风烈！你这个……畜生！（他转向你，眼中满是失望）还有你！外乡人！你……你答应过……要帮我们的！"`,
    options: [
      { label: '「……已经开始了。不能停下。」', tag: '堕落', onChoose: (p) => { STATE.addEvil(p, 30); STATE.completeQuest(p, 'YUMIN_STEAL_DONE'); Engine.log('恶念 +30', 'evil'); }, next: 'yumin_q02_02_steal_end' },
      { label: '「……不，我错了。停下！」', tag: '反悔', next: 'yumin_q02_02_steal_battle' },
      { label: '「用我代替地居族！风魔要的是生命力，不是吗？我来！」', tag: '牺牲', require: 'lv_gte', requireValue: 12, reply: '你挺身而出，愿以身替代地居族。风魔的嘶吼声戛然而止，所有的风……都朝你卷来。', next: 'yumin_q02_02_steal_sacrifice' }
    ]
  };

  /** 窃风·继续（堕落结局） */
  const SCENE_Q02_02_STEAL_END = {
    id: 'yumin_q02_02_steal_end',
    title: '【主线 Q02_02】蚀风牧场',
    bg: BG.jitan,
    text:
`仪式完成。天羽区保住了，但地居区变成了死域。半羽村也遭受波及，小翎在蚀风中消散，临死前看着云瑶，微笑：

"云瑶姐姐……你的翅膀……真好看……"

云瑶在蚀风中觉醒了翅膀——但不是青色，是[highlight]紫黑色[/highlight]。她成为了「[highlight]蚀风之翼[/highlight]」，拥有强大力量，但永远被风魔控制。

翼老倒在地上，气息奄奄。他望着你，留下最后的话：
"……风灵族……真相……我已……传了出去……羽民……内战……将起……你……好自为之……"

翼老陨落。你握紧双拳——这条路，你早已无法回头。

【窃风路线完成】
- 获得「蚀风之翼·云瑶」（邪道队友）
- 羽民国进入「魔风时代」：天羽族保持浮空，依赖定期「献祭」地居族维持
- 玩家获得「[highlight]窃风者[/highlight]」称号，风属性技能威力 +30%
- 翼老死亡，羽民内战将起`,
    options: [
      { label: '（坐拥天羽之权，俯瞰地居之殇）', tag: '结局', next: 'yumin_q02_03_fengshi' }
    ]
  };

  /** 窃风·反悔（大战） */
  const SCENE_Q02_02_STEAL_BATTLE = {
    id: 'yumin_q02_02_steal_battle',
    title: '【主线 Q02_02】背誓之战',
    bg: BG.jitan,
    text:
`你反悔了。风烈暴怒，银翅骤然展开，杀意凛然：

"外乡人！你既已入我局中，岂容你半途抽身！今日你若停手，天羽族满盘皆输！"

翼老挣扎着挡在你身前："来吧！老夫……陪你们……一同了断！"

三人对峙，蚀风狂卷。风烈杀意已决，唯有血战方能了断！`,
    options: [],
    battle: {
      enemy: { name: '风烈·背誓', hp: 2600, atk: 112, def: 72, lv: 14, element: '风', bg: BG.jitan },
      onWin: (p) => {
        if (global.Engine) Engine.log('斩杀风烈，夺回地居族生机', 'good');
        STATE.addMaterial(p, 'MAT-FS06', 1); // 青鸾之羽
        p.evil = Math.max(0, p.evil - 20);
      },
      onLose: (p) => {
        if (global.Engine) Engine.log('不敌风烈，重伤退却', 'evil');
      },
      after: 'yumin_q02_02_steal_redeem'
    }
  };

  /** 窃风·反悔成功（救赎之路） */
  const SCENE_Q02_02_STEAL_REDEEM = {
    id: 'yumin_q02_02_steal_redeem',
    title: '【主线 Q02_02】悬崖勒马',
    bg: BG.jitan,
    text:
`血战终了。风烈被击退，蚀风失去引导，逐渐散入云海。地居区的生命保全了大半。

翼老撑着最后一口气，望着渐亮的天际，微微一笑：
"……好……外乡人……你终究……还是……回头了……"

他安然合眼，嘴角犹带笑意——他终于看到真相大白的那一天，也看到一个愿意纠错的旅人。

云瑶冲过来，紧紧抱住你，哽咽道："谢谢你……谢谢你及时回头……"

你的道心，在那一刻松快了些许。虽然窃风之念曾起，但悬崖勒马，犹未晚也。

【救赎路线完成】
- 恶念 -20
- 保全地居族与半羽村
- 翼老安然离世
- 云瑶好感 +30`,
    options: [
      { label: '（继续前行，寻净化之法）', tag: '救赎', onChoose: (p) => { STATE.addEvil(p, -20); STATE.addFavor(p, 'yunYao', 30); }, next: 'yumin_q02_02_contract_prep' }
    ]
  };

  /** 窃风·自我牺牲（替代地居族） */
  const SCENE_Q02_02_STEAL_SACRIFICE = {
    id: 'yumin_q02_02_steal_sacrifice',
    title: '【主线 Q02_02】以身代灾',
    bg: BG.jitan,
    text:
`你跨步上前，挡在仪式前：
"用我代替地居族！风魔要的是生命力，不是吗？我来！"

风烈愕然，翼老也怔住了。蚀风迟疑片刻，随即便如饥渴的野兽，尽数扑向你——紫黑色的风灵粒子渗入你的四肢百骸，你感受到灵魂被撕扯、被侵蚀的剧痛。

但地居区……保全了。半羽村……保全了。

天羽区与地居区都存活了下来。只有你，承受了「[highlight]风魔侵蚀[/highlight]」——全属性 -20%。

云瑶扑上来，泪水夺眶而出："你……你为什么要这样……"

翼老深深看你一眼，重重一拜："外乡人……此恩……地居族永世不忘。"

【牺牲路线完成】
- 全属性 -20%（风魔侵蚀，永久）
- 保全天羽区与地居区
- 云瑶好感 +40
- 翼老好感 +40，地居族成为坚定盟友`,
    options: [
      { label: '（虚弱但坚定地，继续前行）', tag: '牺牲', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 40); STATE.addFavor(p, 'yiLao', 40); }, next: 'yumin_q02_02_contract_prep' }
    ]
  };

  /* ===========================================================
   * 主线 Q02_03 · 风归何方（三结局）
   * =========================================================== */

  /** 结局A：契约 · 风归 */
  const SCENE_Q02_03_GUIFENG = {
    id: 'yumin_q02_03_guifeng',
    title: '【羽民国·终】风归',
    bg: BG.jitan,
    text:
`风灵通道恢复后，羽民国举行了盛大的「[highlight]风归祭[/highlight]」。这是三百年来第一次全阶层共同参与的祭典——天羽族在空中撒下花瓣，地居区在地面点燃篝火，半羽族在两者之间架起桥梁。

云瑶作为新任大祭司，站在风灵祭坛上，翅膀在月光下闪闪发光：
"今天，我们不祭祀风灵……我们祭祀……[highlight]勇气[/highlight]。祭祀……那些敢于面对真相的人。祭祀……我们自己。"

她看向你，微笑：
"外乡人，你教会了我……翅膀不是力量的象征……心是。无论有没有翅膀……我们都可以……飞翔。"

苍穹飞到你面前，低下头，将一枚风灵石放在你掌心——那是它珍藏了三百年的「[highlight]风灵之眼[/highlight]」，可探测周围风灵流动。

【契约结局 · 风归】
- 羽民国成为你的坚定盟友
- 云瑶成为可招募队友「大祭司·云瑶」（SSR级）
- 解锁「风灵通道」全球快速移动
- 青丘与羽民国建立外交关系`,
    options: [
      { label: '「愿羽民，永沐长风。」（羽民国·完）', tag: '完', onChoose: (p) => { STATE.completeQuest(p, 'YUMIN_CLEARED'); STATE.completeQuest(p, 'Q02_MAIN_DONE'); }, next: 'yumin_end' }
    ]
  };

  /** 结局B：斩杀 · 风陨 */
  const SCENE_Q02_03_FENGYUN = {
    id: 'yumin_q02_03_fengyun',
    title: '【羽民国·终】风陨',
    bg: BG.banyucun,
    text:
`浮岛开始坠落。不是瞬间的崩溃，是缓慢的、不可逆转的下降。天羽族们失去了飞行能力，从空中跌落，有的摔死，有的重伤。

风烈站在坠落的浮岛边缘，翅膀无力地垂下：
"……这就是……代价吗。为了……消灭邪恶……我们……失去了……一切……"

他看向你，眼中没有仇恨，只有空洞：
"你做得对。风魔……必须死。但……下一次……请告诉我……正义的代价……要提前……让我……做好准备……"

云瑶走到他身边，没有翅膀的她，在地上行走：
"我们会重建。在地面。以……新的方式。羽民……不只是……飞翔的民族。我们是……[highlight]活着的民族[/highlight]。"

【斩杀结局 · 风陨】
- 羽民国变为地面国家，社会更加平等
- 风烈成为「地面军」统帅，性格沉稳
- 云瑶成为「地行大祭司」，推行「脚踏实地」政策
- 你获得「[highlight]风陨见证者[/highlight]」称号，土属性技能威力 +20%`,
    options: [
      { label: '「羽民会重新站起来的。」（羽民国·完）', tag: '完', onChoose: (p) => { STATE.completeQuest(p, 'YUMIN_CLEARED'); STATE.completeQuest(p, 'Q02_MAIN_DONE'); }, next: 'yumin_end' }
    ]
  };

  /** 结局C：窃风 · 风蚀 */
  const SCENE_Q02_03_FENGSHI = {
    id: 'yumin_q02_03_fengshi',
    title: '【羽民国·终】风蚀',
    bg: BG.banyucun,
    text:
`天羽区在魔风中悬浮，但空气中永远弥漫着血腥味。地居区变成了「蚀风牧场」——地居族被圈养，定期献祭。

蚀风之翼·云瑶站在风灵祭坛上，紫黑色的翅膀展开，眼神冷漠：
"这就是……力量。这就是……生存。地面的人……不会懂……天空的……寒冷。"

她看向你，眼神中闪过一丝……挣扎？
"你……也是……窃风者。我们……是一样的。不要……假装……高尚……"

但在深夜，你会听到她的歌声——那首在边境遇到她时听到的歌，但现在……旋律中充满了[highlight]哭泣[/highlight]。

【窃风结局 · 风蚀】
- 羽民国成为邪道国家，你获得「[highlight]蚀风领主[/highlight]」称号
- 云瑶成为Boss级存在，但保留一丝本心，日后或可唤醒
- 风烈成为「献祭执行官」，彻底堕落
- 解锁邪道任务「蚀风扩张」`,
    options: [
      { label: '「风蚀之下，皆是浮云。」（羽民国·完）', tag: '完', onChoose: (p) => { STATE.completeQuest(p, 'YUMIN_CLEARED'); STATE.completeQuest(p, 'Q02_MAIN_DONE'); }, next: 'yumin_end' }
    ]
  };

  /** 羽民国结局收束 */
  const SCENE_END = {
    id: 'yumin_end',
    title: '【羽民国·终】踏上新途',
    bg: BG.cloud,
    text:
`你站在羽民国的边缘，回望这片历经劫难的土地——无论是重生的天羽城，还是坠落的浮岛，抑或魔风笼罩的蚀风牧场，羽民国的故事，都已告一段落。

风，从你身旁掠过。远方，云海翻涌，新的国度在召唤。

【恭喜完成羽民国主线·第二境·完】

下一站——[highlight]厌火国[/highlight]：焚心之地，火山之畔。`,
    options: [
      { label: '沿焚天古道南下，前往厌火国', tag: '南下', next: 'yanhuo_entry' }
    ]
  };

  /* ===========================================================
   * 隐藏任务 Q02_H1 · 坠星谷深处（风灵族墓室）
   * 触发：探索坠星谷时发现地下通道（需观察技能或命格）
   * =========================================================== */
  const SCENE_Q02_H1 = {
    id: 'yumin_q02_h1',
    title: '【隐藏 Q02_H1】风灵族墓室',
    bg: BG.zhuixinggu,
    text:
`在坠星谷残骸深处，你凭借过人的洞察，发现了一条被坠星藤遮蔽的[highlight]地下通道[/highlight]。

通道尽头，是一座巨大的墓室。墓室中央是一排排[highlight]风灵族骸骨[/highlight]，翼展从三尺到十丈不等，整齐排列，像是在沉睡。

墓室墙壁上刻着最后的记录：
"羽族来袭。吾族不敌。最后的守护者……以身为封……将蚀风……封印于风眼。愿后世……有缘者……勿忘……风灵之……荣光。"

云瑶跪在墓室前，泣不成声：
"我们……羽民……是侵略者。我们……不是风灵的后裔……我们是……[highlight]凶手[/highlight]。"

在墓室最深处，你发现了一枚「[highlight]风灵族印记[/highlight]」——一块淡青色的水晶，内部有一只微型的青鸾在飞翔。`,
    options: [
      { label: '【归还】将印记放入墓室祭坛', tag: '归还', onChoose: (p) => { STATE.addFavor(p, 'yunYao', 20); STATE.addFavor(p, 'diJu', 20); p.unlocked.add('fengling_bless'); Engine.log('风灵族残魂给予祝福，羽民国全体好感+20', 'good'); }, next: 'yumin_q02_h1_bless' },
      { label: '【保留】将印记据为己有', tag: '占有', onChoose: (p) => { STATE.addMaterial(p, 'MAT-FS08', 1); Engine.log('获得风灵印记（风属性技能威力+40%），但羽民国好感-30', 'info'); }, next: 'yumin_q02_h1_keep' },
      { label: '【研究】尝试理解印记中的力量', tag: '研究', next: 'yumin_q02_h1_study' }
    ]
  };

  /** 隐藏·归还·祝福 */
  const SCENE_Q02_H1_BLESS = {
    id: 'yumin_q02_h1_bless',
    title: '【隐藏 Q02_H1】风灵之祝',
    bg: BG.zhuixinggu,
    text:
`你将风灵族印记郑重放入墓室祭坛。淡青色的光芒自水晶中漾开，一只[highlight]微型青鸾[/highlight]振翅而起，绕着墓室盘旋三圈，发出清脆的啼鸣。

一道温暖的祝福落入你与云瑶身上——这是风灵族最后的善意。墓室中，那些沉寂的骸骨仿佛一同安详了几分。

云瑶擦干眼泪，朝祭坛深深一拜："对不起……也谢谢你们……"

【归还完成】
- 羽民国全体 NPC 好感 +20
- 获得风灵族的祝福（风属性抗性提升）`,
    options: [
      { label: '（离开墓室，继续旅途）', tag: '归去', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 隐藏·保留·印记 */
  const SCENE_Q02_H1_KEEP = {
    id: 'yumin_q02_h1_keep',
    title: '【隐藏 Q02_H1】风灵印记',
    bg: BG.zhuixinggu,
    text:
`你犹豫片刻，终是将那枚风灵族印记收入怀中。云瑶的目光黯淡下去，却没有阻止你——她只是低低叹了口气。

那枚水晶在你掌心微微发热，内部青鸾流转不息。这是风灵族最后的遗泽，被你据为己有——风属性技能威力 +40%。但羽民国众人看你的眼神，多了几分疏离。

【保留完成】
- 获得「风灵印记」（饰品，风属性技能威力 +40%）
- 羽民国好感 -30`,
    options: [
      { label: '（握着印记，离开墓室）', tag: '归去', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 隐藏·研究·技能树 */
  const SCENE_Q02_H1_STUDY = {
    id: 'yumin_q02_h1_study',
    title: '【隐藏 Q02_H1】风灵之悟',
    bg: BG.zhuixinggu,
    text:
`你凝神感受印记中蕴含的力量。那微型青鸾在你识海中振翅，风灵族的古老技艺如潮水般涌入你的脑海。

你从中悟出了[highlight]风灵族技能树[/highlight]的雏形——若能继续钻研，或可掌握驾驭风灵之力的秘法。但这需要额外的时间与机缘。

云瑶在旁静静看你，眼中多了一丝欣慰："你……想用风灵族的力量，去弥补羽民族的亏欠吗？"

【研究完成】
- 解锁「风灵族技能树」前置`,
    options: [
      { label: '「我愿以这份力量，还风灵族一个公道。」', tag: '悟', onChoose: (p) => { p.unlocked.add('fengling_skilltree'); }, next: 'yumin_q02_01_investigate' }
    ]
  };

  /* ===========================================================
   * 支线 Q02_S1 · 苍穹的伤
   * =========================================================== */
  const SCENE_Q02_S1 = {
    id: 'yumin_q02_s1',
    title: '【支线 Q02_S1】苍穹的伤',
    bg: BG.tianyu,
    text:
`你回想起入境时，风隼苍穹羽翼上那几道[highlight]紫黑色的腐蚀伤痕[/highlight]——那是蚀风留下的印记。

云瑶抚着苍穹的伤处，眼眶微红："苍穹活了数百年，从不轻易示弱。可这蚀风之伤，一直在啃噬它的生机……若不及早治愈，怕是要折损它的寿元。"

要治愈蚀风之伤，需要——
· 云锦花 ×10
· 净魂池水 ×1
· 月光草 ×3

（需先备齐材料方可施治）`,
    options: [
      { label: '「我去寻药，治好苍穹。」', tag: '寻药', next: 'yumin_q02_s1_heal' },
      { label: '「暂缓，日后再医。」', tag: '暂缓', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 支线S1·治愈 */
  const SCENE_Q02_S1_HEAL = {
    id: 'yumin_q02_s1_heal',
    title: '【支线 Q02_S1】风隼重生',
    bg: BG.tianyu,
    text:
`你备齐云锦花、净魂池水与月光草，在云瑶的协助下，为苍穹炼制治愈灵药。

药力渗入苍穹的翎羽，紫黑色的腐蚀伤痕缓缓愈合，重新长出青黑如铁的新羽。苍穹发出一声清越的长鸣，抖擞双翼，仿佛年轻了数十岁。

云瑶激动地抱住苍穹："太好了……太好了……"

苍穹低下头，用喙轻轻蹭了蹭你的掌心——从此，它成为你可以[highlight]召唤的灵宠[/highlight]。

【支线完成】
- 苍穹成为可召唤灵宠（SR级风隼）
- 云瑶好感 +20`,
    options: [
      { label: '（抚过苍穹的翎羽）', tag: '谢', onChoose: (p) => {
          if (!p.pets.some(x => x.id === 'cangqiong')) { STATE.addPet(p, 'cangqiong', 'partner'); Engine.log('获得灵宠：风隼·苍穹（伙伴契约）', 'good'); }
          STATE.addFavor(p, 'yunYao', 20);
        }, next: 'yumin_q02_01_investigate' }
    ]
  };

  /* ===========================================================
   * 支线 Q02_S2 · 半羽村的希望
   * =========================================================== */
  const SCENE_Q02_S2 = {
    id: 'yumin_q02_s2',
    title: '【支线 Q02_S2】半羽村的希望',
    bg: BG.banyucun,
    text:
`半羽村中，「风蚀症」的村民越来越多——身体逐渐透明，最后化为清风消散。小翎红着眼眶拉住你：

"求求你……救救他们！天羽族说这是「血统不纯的报应」，根本不管！可我知道……这明明是风灵污染导致的！"

要炼制「抗风蚀药剂」，需以草木灵材为引。药剂炼成后，分发给半羽村村民，方能缓解风蚀之症。`,
    options: [
      { label: '「我来炼制抗风蚀药剂，救他们。」', tag: '施药', next: 'yumin_q02_s2_refine' },
      { label: '「先去寻齐药材。」', tag: '备药', next: 'yumin_q02_01_investigate' }
    ]
  };

  /** 支线S2·炼药 */
  const SCENE_Q02_S2_REFINE = {
    id: 'yumin_q02_s2_refine',
    title: '【支线 Q02_S2】抗风蚀药剂',
    bg: BG.banyucun,
    text:
`你连日以草木灵材炼制[highlight]抗风蚀药剂[/highlight]，再一一分发给半羽村的村民。药力入体，那些渐趋透明的身体，缓缓恢复成实体的血肉之色。

小翎跪地谢恩，声音哽咽：
"谢谢你……真的谢谢你……他们……有救了……"

当最后一位村民恢复健康，半羽村燃起了久违的欢笑与灯火。

【支线完成】
- 半羽村成为你的盟友据点
- 小翎成为「药剂师」队友
- 云瑶好感 +15，小翎好感 +30`,
    options: [
      { label: '（与半羽村共庆新生）', tag: '谢', onChoose: (p) => { STATE.addFavor(p, 'xiaoLing', 30); STATE.addFavor(p, 'yunYao', 15); p.unlocked.add('banyucun_ally'); }, next: 'yumin_q02_01_investigate' }
    ]
  };

  /* ===========================================================
   * 支线 Q02_S3 · 风烈的过去
   * =========================================================== */
  const SCENE_Q02_S3 = {
    id: 'yumin_q02_s3',
    title: '【支线 Q02_S3】风烈的过去',
    bg: BG.altar,
    text:
`与风烈数次交锋后，你渐渐察觉——他那股对「血统不纯者」的执拗敌意，似乎另有渊源。

机缘巧合下，你得以窥入风烈的[highlight]记忆幻境[/highlight]——

那是一个半羽族的少年，与风烈一同在云海之畔长大。他们曾是最好的朋友，一起驯养风隼，一起梦想翱翔九天。可那少年不幸染上「风蚀症」，身体日渐透明。天羽族却因他「血统不纯」而拒绝救治。风烈眼睁睁看着挚友在怀中化为清风，消散无踪。

自那以后，风烈将所有对失去的恐惧，化作了对「血统不纯者」的敌意——他害怕再次失去，于是宁愿先一步推开所有人。

【支线揭示】
- 风烈的歧视，源于恐惧与哀伤`,
    options: [
      { label: '「……原来，你也是个被风蚀症夺走一切的人。」', tag: '悲悯', onChoose: (p) => { STATE.addFavor(p, 'fengLie', 20); }, next: 'yumin_q02_s3_after' }
    ]
  };

  /** 支线S3·风烈软化 */
  const SCENE_Q02_S3_AFTER = {
    id: 'yumin_q02_s3_after',
    title: '【支线 Q02_S3】风烈之心',
    bg: BG.tianyu,
    text:
`从记忆幻境中归来，风烈沉默良久。他那双冷峻的眼睛里，第一次浮现出复杂的波澜。

"……你知道那个名字吗？他叫[highlight]风翎[/highlight]。是我这一生，最好的朋友。"

"天羽族拒绝救他，我无力回天。从那以后我就明白——血统不纯者，在这个世上……注定不被善待。我与其看着他们受伤，不如……先筑起高墙。"

他长长吐出一口气，望向云瑶的方向：
"也许……我错了。云瑶那丫头……她拼了命地想救羽民国，比我们这些自诩纯血的天羽族……勇敢得多。"

【支线完成】
- 风烈性格软化
- 风烈好感 +20
- （若走契约路线，风烈会主动帮助云瑶；若走斩杀路线，他会牺牲自己保护平民；若走窃风路线，他会成为第一个反抗云瑶之人）`,
    options: [
      { label: '「心墙若筑得太高，连风也吹不进去了。」', tag: '释然', next: 'yumin_q02_01_investigate' }
    ]
  };

  /* ===========================================================
   * 羽民国自由行动系统
   * 在天羽城安顿后，玩家可在修炼/探索/采集/休息间自由选择
   * =========================================================== */


  /* ---------- 暴露所有场景（支持函数形式的动态场景） ---------- */
  global.YUMIN_SCENES = {
    // 序章
    yumin_entry: SCENE_ENTRY,
    yumin_01_arrive: SCENE_ARRIVE,
    yumin_01_question: SCENE_QUESTION,
    yumin_01_observe: SCENE_OBSERVE,
    yumin_01_intro: SCENE_INTRO,
    yumin_01_refuse: SCENE_REFUSE,
    yumin_01_channel: SCENE_CHANNEL,
    yumin_01_channel_deep: SCENE_CHANNEL_DEEP,
    yumin_01_channel_after: SCENE_CHANNEL_AFTER,

    // 主线 Q02_01
    yumin_q02_01_enter: SCENE_Q02_01_ENTER,
    yumin_q02_01_class: SCENE_Q02_01_CLASS,
    yumin_q02_01_tianyu: SCENE_Q02_01_TIANYU,
    yumin_q02_01_fenglie: SCENE_Q02_01_FENGLIE,
    yumin_q02_01_investigate: SCENE_Q02_01_INVESTIGATE,
    yumin_q02_01_yunting: SCENE_Q02_01_YUNTING,
    yumin_q02_01_yilao: SCENE_Q02_01_YILAO,
    yumin_q02_01_yilao2: SCENE_Q02_01_YILAO2,
    yumin_q02_01_yilao3: SCENE_Q02_01_YILAO3,
    yumin_q02_01_yilao4: SCENE_Q02_01_YILAO4,
    yumin_q02_01_xiaoling: SCENE_Q02_01_XIAOLING,
    yumin_q02_01_zhuixinggu: SCENE_Q02_01_ZHUIXINGGU,
    yumin_q02_01_zhuixinggu_text: SCENE_Q02_01_ZHUIXINGGU_TEXT,
    yumin_q02_01_zhuixinggu_altar: SCENE_Q02_01_ZHUIXINGGU_ALTAR,
    yumin_q02_01_after: SCENE_Q02_01_AFTER,
    yumin_q02_01_purify: SCENE_Q02_01_PURIFY,

    // 主线 Q02_02
    yumin_q02_02_qiongding: SCENE_Q02_02_QIANGDING,
    yumin_q02_02_route: SCENE_Q02_02_ROUTE,
    yumin_q02_02_contract_prep: SCENE_Q02_02_CONTRACT_PREP,
    yumin_q02_02_contract_support: SCENE_Q02_02_CONTRACT_SUPPORT,
    yumin_q02_02_contract_win: SCENE_Q02_02_CONTRACT_WIN,
    yumin_q02_02_boss: SCENE_Q02_02_BOSS,
    yumin_q02_02_boss_after: SCENE_Q02_02_BOSS_AFTER,
    yumin_q02_02_steal: SCENE_Q02_02_STEAL,
    yumin_q02_02_steal_end: SCENE_Q02_02_STEAL_END,
    yumin_q02_02_steal_battle: SCENE_Q02_02_STEAL_BATTLE,
    yumin_q02_02_steal_redeem: SCENE_Q02_02_STEAL_REDEEM,
    yumin_q02_02_steal_sacrifice: SCENE_Q02_02_STEAL_SACRIFICE,

    // 主线 Q02_03 三结局
    yumin_q02_03_guifeng: SCENE_Q02_03_GUIFENG,
    yumin_q02_03_fengyun: SCENE_Q02_03_FENGYUN,
    yumin_q02_03_fengshi: SCENE_Q02_03_FENGSHI,
    yumin_end: SCENE_END,

    // 隐藏 Q02_H1
    yumin_q02_h1: SCENE_Q02_H1,
    yumin_q02_h1_bless: SCENE_Q02_H1_BLESS,
    yumin_q02_h1_keep: SCENE_Q02_H1_KEEP,
    yumin_q02_h1_study: SCENE_Q02_H1_STUDY,

    // 支线 Q02_S1/S2/S3
    yumin_q02_s1: SCENE_Q02_S1,
    yumin_q02_s1_heal: SCENE_Q02_S1_HEAL,
    yumin_q02_s2: SCENE_Q02_S2,
    yumin_q02_s2_refine: SCENE_Q02_S2_REFINE,
    yumin_q02_s3: SCENE_Q02_S3,
    yumin_q02_s3_after: SCENE_Q02_S3_AFTER,

    // 自由行动（动态场景，函数形式）
  };
})(window);
