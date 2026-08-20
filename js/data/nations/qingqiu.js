/* ===========================================================
 * 问道山海 · 青丘国 完整剧情链
 * 对应策划案第9章 NAT_01 青丘国
 * 包含：Q01_01~03 主线 + Q01_B1 支线 + Q01_H1 隐藏
 * =========================================================== */
(function (global) {
  'use strict';

  /* ---------- 公共路径引用（相对URL） ---------- */
  const BG = {
    taolin:        'assets/img/nations/qing-taolin.jpg',
    jieyin:        'assets/img/nations/qing-jieyin-envoy.jpg',
    xuyue_curse:   'assets/img/nations/qing-xuyue-curse.jpg',
    fog_abyss:     'assets/img/nations/qing-fog-abyss.jpg',
    shadow_altar:  'assets/img/nations/qing-shadow-altar.jpg',
    fying_boss:    'assets/img/nations/qing-fying-boss.jpg',
    lingpu:        'assets/img/nations/lingpu-home.jpg'
  };

  /* ---------- 0. 开篇（玩家在桃林醒来） ---------- */
  const SCENE_OPENING = {
    id: 'opening',
    title: '【序章】桃林迷踪',
    bg: BG.taolin,
    text:
`[img]assets/img/npc/npc_baishan.jpg[/img]\n\n山巅云海之上，千年桃林盛开如粉色云海，漫天飞舞的花瓣如雪。

你缓缓睁开眼睛，发现自己躺在厚厚的落花之中。四周弥漫着清幽的桃花香，远处悬空木阁漂浮在山崖之间。一枚残破的玉佩——你的【[highlight]问道玉[/highlight]】——在掌心微微发热，仿佛在警示着什么。

你记不清自己是谁，只依稀记得——家乡被魔气吞噬，你一路流亡至此。胸口的[curse]咒印[/curse]隐隐作痛，那是魔气侵蚀的痕迹。

正在此时，一位身着白衣的[highlight]狐族接引使[/highlight]踏花而来。她眉目如画，背后九尾若隐若现，对你微微颔首。

"旅人，你终于到了。我是青丘国接引使——[highlight]白浅[/highlight]。青丘乃《山海》第一境，凡踏入者，皆为有缘人。请随我入城吧。"`,
    options: [
      { label: '起身行礼，随她前往（开始新手引导）', tag: '正礼', next: 'tutorial' },
      { label: '先问她：青丘为何收留流亡者？', tag: '谨慎', evilDelta: 0, reply: '白浅停下脚步，回身道：「青丘从不无故收留外客。只是长老推演天机，算出将有「命外之人」踏足青丘，而那人的命格……或许正是解开青丘之劫的钥匙。如今看来，便是你。」', next: 'jieyin_q01_01' },
      { label: '沉默跟上，保持警觉（跳过引导，直接入城）', tag: '内敛', next: 'jieyin_q01_01' }
    ]
  };

  /* ---------- 0.5 新手引导（入城前，白浅教你求生之道） ---------- */
  const SCENE_TUTORIAL = {
    id: 'tutorial',
    title: '【序章·引导】问道之路',
    bg: BG.jieyin,
    text:
`白浅引你缓行于桃林间，忽而放慢脚步，回眸道：

"旅人，你既流亡至此，往后修行之路凶险。在入城之前，有几件事，你需牢记于心。"

她抬袖指向天际，一轮[highlight]若隐若现的灵光[/highlight]浮现在你视野[highlight]左上角[/highlight]：

"那是【[highlight]问道指引[/highlight]】。它会时时提醒你——此刻该做什么。或修持、或突破、或培育灵宠、或推进剧情，皆会于此处显现，[highlight]点按指引即可直达[/highlight]。若觉碍眼，可随时收起。"

她顿了一顿，指尖掠过你的掌心，那枚[highlight]问道玉[/highlight]微微发烫：

"你手中的问道玉，是你安身立命的根本。进城之后，会有一处【[highlight]家园·洞天福地[/highlight]】归你所有。你可于其中——"

"[highlight]修炼[/highlight]以积修为，修为满则[highlight]突破境界[/highlight]；"
"[highlight]结契灵宠[/highlight]，喂养培育，助你战斗；"
"[highlight]外出探险[/highlight]，寻获灵材、灵香，或偶遇魔物；"
"[highlight]供奉神明[/highlight]，得神力加持与神赐之技。"

"而每当遇到强敌，[highlight]右上角可随时返回家园[/highlight]休整——切莫恋战，留得青山在。"

"至于命格与因果……"她目光幽深，"你命格先天已定，因果却在你一念之间。[highlight]一念成神，一念成魔[/highlight]，皆是你的选择。"`,
    options: [
      { label: '（了然于心）我已明白，请带我入城', tag: '受教', next: 'jieyin_q01_01' }
    ]
  };

  /* ---------- Q01_01 桃林迷踪（主线首段） ---------- */
  const SCENE_Q01_01 = {
    id: 'jieyin_q01_01',
    title: '【主线 Q01_01】桃林迷踪',
    bg: BG.jieyin,
    text:
`白浅引你穿过重重桃林，路上花瓣纷飞如雨。你注意到桃林深处隐隐有[curse]迷障紫雾[/curse]飘荡，而远处——一轮惨白弯月悬在天际，月面有裂纹散发诡异紫光。

"那是【[highlight]虚月[/highlight]】。"白浅察觉你的目光，声音略沉，"虚月乃青丘禁地的核心。百年来一直安静，但近月忽有异动。长老们忧心忡忡。"

你们来到一处悬空木阁前，匾额上书【青丘·迎客阁】。白浅转身告退：

"旅人，你先去梳洗休息，明日[highlight]圣女[/highlight]会亲自接见你。青丘虽大，但请记住——切莫独闯桃林深处，那是影狐的地盘。"

她顿了顿，仿佛想起什么："另外……你手中的【问道玉】，莫要轻示他人。问道玉可感知因果灵材，引来觊觎。"`,
    options: [
      { label: '道谢后进入迎客阁休息', tag: '安分', next: 'q01_02_intro' },
      { label: '问她："圣女是何人？为何要见我？"', tag: '好奇', log: '询问圣女信息', next: 'q01_01_a' },
      { label: '独自前往桃林深处探查虚月', tag: '冒险', require: 'lv_gte', requireValue: 2, evilDelta: 5, log: '不顾警告独闯桃林深处', next: 'q01_01_b_danger' }
    ]
  };

  const SCENE_Q01_01_A = {
    id: 'q01_01_a',
    title: '【主线 Q01_01】圣女之谜',
    bg: BG.jieyin,
    text:
`白浅闻言，轻叹一声："圣女乃我青丘之主，[highlight]青丘九尾狐一脉[/highlight]唯一传人。她已闭关三十载，本不应再出。但昨日长老们推演天机，算出将有【命外之人】踏入青丘——指的便是你。"

"圣女欲亲见你，是想借你手中的问道玉，窥探命运之线。"

你点点头，进入迎客阁安歇。`,
    options: [
      { label: '翌日清晨，前往圣女殿', next: 'q01_02_intro' }
    ]
  };

  /* ---------- 支线：独闯危险场景（恶念+5示例） ---------- */
  const SCENE_Q01_01_B_DANGER = {
    id: 'q01_01_b_danger',
    title: '【支线 Q01_01·危险】独闯迷障',
    bg: BG.fog_abyss,
    text:
`你不顾警告，独自踏入桃林深处。

越往深处，雾气越浓——视野渐缩至脚前三尺，[curse]迷障紫雾[/curse]侵蚀入体，每一步都如踩在云上。突然，一只巨大的[highlight]影狐[/highlight]从树后窜出，红眼如血！

"尔凡人，竟敢闯本座禁地？留下你的魂吧！"

你本能后退——然而迷障的幻象已让你无法分辨方向。危急时刻，远处传来一声清叱：

"大胆！"

一道金色剑光破雾而至，将影狐逼退。白浅踏空而至，将你一把拽出。她目光冷冽：

"我说过切莫独闯——你若执意如此，下次我不会再救。"`,
    options: [
      { label: '低头认错', evilDelta: -5, log: '反思独闯之过', next: 'q01_02_intro' },
      { label: '反问她：为何影狐要杀凡人？', log: '追问影狐动机', next: 'q01_01_c_motive' }
    ]
  };

  const SCENE_Q01_01_C = {
    id: 'q01_01_c_motive',
    title: '【支线 Q01_01·动机】影狐之恨',
    bg: BG.fog_abyss,
    text:
`白浅沉默良久，目光望向远处那轮虚月：

"百年前，曾有一支[highlight]人类猎户[/highlight]队伍闯入桃林，捕杀我们的同族。影狐一族几乎灭绝——其怨念被[curse]混沌气息[/curse]污染，遂成今日之祸。"

"所以它们恨凡人，见之必杀。你若再遇，定要远离。"

此事让你心中暗暗记下——或许，日后解开青丘之祸的钥匙，就在这一支【猎户后人】身上。`,
    options: [
      { label: '回到迎客阁，翌日见圣女', evilDelta: -5, log: '习得影狐之恨的历史', next: 'q01_02_intro' }
    ]
  };

  /* ---------- Q01_02 虚月之咒 ---------- */
  const SCENE_Q01_02_INTRO = {
    id: 'q01_02_intro',
    title: '【主线 Q01_02】圣女接见',
    bg: BG.xuyue_curse,
    text:
`翌日清晨，你随白浅前往圣女殿。

圣女殿建在山巅最高处，云雾缭绕。殿中央有一位[highlight]白发女子[/highlight]端坐于莲台——她面容清丽却透出岁月沧桑，一双狐眼洞察人心。她便是[highlight]青丘圣女·青瑶[/highlight]。

"命外之人，你终于到了。"

青瑶抬手，你胸口的问道玉竟凌空飞起，落在她掌心。她端详良久，眉头渐紧：

"问道玉中，你命格的纹路已现——这是天机所指。然而，玉上还残留着[curse]魔气咒印[/curse]。你家乡的毁灭，并非天灾。"

"有人故意为之。"

青瑶将玉佩还你："我需要你协助调查【虚月之咒】。虚月异动、桃林迷障、影狐异变——皆与此有关。你若愿助，我可赐你[highlight]灵圃[/highlight]与基础功法，让你暂居青丘。"`,
    options: [
      { label: '应承协助调查', tag: '承命', completed: 'Q01_02_ACCEPT', next: 'q01_02_accept' },
      { label: '先问报酬', tag: '务实', reply: '青瑶似笑非笑：「报酬？青丘的灵圃、功法、以及……解开你家乡灭门之祸的线索。这些，够不够？」', next: 'q01_02_accept' },
      { label: '拒绝，不想卷入', tag: '回避', evilDelta: 10, log: '拒绝圣女', next: 'q01_02_refuse' }
    ]
  };

  const SCENE_Q01_02_ACCEPT = {
    id: 'q01_02_accept',
    title: '【主线 Q01_02】暂居青丘',
    bg: BG.jieyin,
    text:
`青瑶微微颔首："善。"

她抬手，指尖金光一点——你体内突然涌出一股暖流。你感到丹田之中，似有什么东西在萌动。

"你已入[highlight]炼气期[/highlight]。这是青丘的入门功法，从今日起你是[highlight]青丘客卿[/highlight]。"

白浅领你来到半山腰的【灵圃】——你将拥有20格灵田，可种植灵材。远处，桃林在晨光中静默。

"接下来，你将面对三件事——"

白浅缓缓道：
"一、[highlight]虚月之咒[/highlight]：桃林深处的影狐似乎在守护某物；
二、[highlight]猎户后人[/highlight]：当年那支猎户队伍，竟有一支后人至今留在青丘；
三、[highlight]圣女之选[/highlight]：青瑶圣女欲退位，新圣女将在三月后的仪式中诞生——影狐派系似乎在图谋此事。"

她递给你一枚【青丘令牌】："客卿，你在青丘需自食其力。灵圃、桃林、集市皆为你开。这青丘虽小，却有无限机遇——[highlight]如何修炼、如何抉择，全在你自己[/highlight]。"

临别时，白浅从袖中捧出一只毛茸茸的[highlight]小兔灵[/highlight]："这是我青丘的【绒绒兔】，性情温顺，懂灵药性。让它随你修行，也好做个伴。"`,
    options: [
      {
        label: '接下绒绒兔，开始自由修行',
        tag: '自由',
        onChoose: (p) => {
          if (p.pets.length === 0) {
            STATE.addPet(p, 'rongrong', 'equal');
            Engine.log('获得灵宠：绒绒兔（平等契约）', 'good');
          }
        },
        next: 'home'
      },
      { label: '先去灵圃安顿（接下绒绒兔）', onChoose: (p) => { if (p.pets.length === 0) { STATE.addPet(p, 'rongrong', 'equal'); Engine.log('获得灵宠：绒绒兔', 'good'); } }, next: 'q01_03_intro' },
      { label: '直奔桃林深处调查影狐', onChoose: (p) => { if (p.pets.length === 0) { STATE.addPet(p, 'rongrong', 'equal'); Engine.log('获得灵宠：绒绒兔', 'good'); } }, next: 'q01_03_intro' },
      { label: '寻找猎户后人', onChoose: (p) => { if (p.pets.length === 0) { STATE.addPet(p, 'rongrong', 'equal'); Engine.log('获得灵宠：绒绒兔', 'good'); } }, next: 'q01_b1_hunter' }
    ]
  };

  const SCENE_Q01_02_REFUSE = {
    id: 'q01_02_refuse',
    title: '【主线 Q01_02·回避】离开青丘',
    bg: BG.xuyue_curse,
    text:
`青瑶深深看你一眼，未怒，只是轻叹：

"也罢。你既不愿卷入，便[highlight]离开青丘[/highlight]吧。然而你身上的咒印——它不会自行消散。"

你被白浅送出青丘，踏入荒野。胸口的咒印隐隐作痛……`,
    options: [
      { label: '尝试压制咒印', evilDelta: 5, log: '尝试压制咒印失败', next: 'q01_03_intro' },
      { label: '返回青丘求助', evilDelta: -10, log: '放下傲气返青丘求助', next: 'q01_02_accept' }
    ]
  };

  /* ---------- Q01_03 影狐之怨 ---------- */
  const SCENE_Q01_03_INTRO = {
    id: 'q01_03_intro',
    title: '【主线 Q01_03】影狐之怨',
    bg: BG.shadow_altar,
    text:
`数日后，你听闻桃林深处有异动——影狐一族似乎在举行某种仪式。

你与白浅、圣女弟子[highlight]墨羽[/highlight]一同前往调查。

穿过迷障紫雾，来到一处地下洞窟——洞窟中央有一座[highlight]古朴祭坛[/highlight]，祭坛上方悬浮着一颗散发紫黑色光芒的[highlight]虚月碎片[/highlight]。数只影狐环绕祭坛，喃喃低语。

最年长的影狐——[highlight]影狐长老·墨姬[/highlight]——缓缓转身看向你们：

"凡人……你们又来了。可还记得百年前的[highlight]猎户[/highlight]？"

她的声音充满怨毒："他们杀了我们的同族，剥了我们的皮毛做裘衣。我们每一只影狐，都背负着同族的亡魂。"

"若不是魔气侵蚀，我们又何至于此？若不是凡人贪婪，我们又何至于堕落？"

墨姬的身形开始变化，九条尾巴如瀑布展开，她化形为一只巨大的九尾白狐，眼神血红——`,
    options: [
      { label: '尝试与之对话，寻找化解之法', tag: '调和', evilDelta: -10, log: '尝试调和路线', next: 'q01_03_dialogue' },
      { label: '直接开战斗', tag: '镇压', evilDelta: 30, log: '选择镇压路线', next: 'battle_fying_elder' },
      { label: '取走虚月碎片离开', tag: '放任', evilDelta: 50, log: '放任路线·取走虚月碎片', completed: 'Q01_03_LEAVE', next: 'q01_03_leave' }
    ]
  };

  /* ---------- 调和路线（最佳·恶念-10） ---------- */
  const SCENE_Q01_03_DIALOGUE = {
    id: 'q01_03_dialogue',
    title: '【主线 Q01_03】寻找猎户后人',
    bg: BG.fog_abyss,
    text:
`你按捺下战斗的冲动，沉声道：

"长老，我知道你们的恨。但百年前的猎户早已身死——他们的后人却至今背负祖先的罪孽。"

"不如这样——让我去寻猎户后人，让他们当面道歉。若诚意足够，可化解怨念。"

墨姬冷冷盯着你："你一介凡人，凭什么让他们低头？" 

白浅在旁插话："长老，我们愿为他作保——若他寻不得后人，我们任你处置。"

墨姬沉默良久："三日。给你三日。寻得后人，让他们来此向我同族灵位磕头——若诚意不足，我必取你魂魄。"

白浅悄悄告诉你：当年那支猎户有一后人流落在[highlight]青丘边缘的"墨家遗迹"[/highlight]——那里曾有一批机关术士试图阻止猎户的恶行。`,
    options: [
      { label: '前往墨家遗迹寻找猎户后人', next: 'q01_b1_hunter' }
    ]
  };

  /* ---------- 支线 Q01_B1 猎户后人 ---------- */
  const SCENE_Q01_B1 = {
    id: 'q01_b1_hunter',
    title: '【支线 Q01_B1】猎户后人',
    bg: BG.fog_abyss,
    text:
`你来到青丘边缘的【墨家遗迹】——一座废弃的机关工坊。

一位[highlight]白发老者[/highlight]坐在工坊门口，面前摆放着一堆小型机关木鸟。他抬头看你，目光中闪过复杂神色：

"你……是青丘派来的吧？"

他自称[highlight]墨老[/highlight]——正是百年前那支猎户队伍中唯一未参与屠杀的成员。当日，他试图阻止同乡的恶行，却寡不敌众，被打断双腿。如今他独居此处，制造小机关度日。

"我知道你要什么。"墨老苦笑，"让我去向影狐磕头？也好。这百年的债，是该还了。"

他颤巍巍起身："但请容我三日收拾——我还有一些机关术要传给后学。三日后，我随你前往。"`,
    options: [
      { label: '等他三日', evilDelta: -20, log: '获得猎户后人信任', completed: 'Q01_B1_DONE', next: 'q01_03_peaceful' },
      { label: '强行带他走', evilDelta: 10, log: '强行带走猎户后人', next: 'q01_03_forced' }
    ]
  };

  /* ---------- 调和结局 ---------- */
  const SCENE_Q01_03_PEACEFUL = {
    id: 'q01_03_peaceful',
    title: '【主线 Q01_03】百年恩怨一朝解',
    bg: BG.shadow_altar,
    text:
`三日后，你携墨老来到影狐祭坛。

墨老颤抖着跪下，向影狐灵位磕了三个响头。他的额头磕出血来，泪水纵横：

"百年前，我的同乡犯了滔天大罪。我无力阻止，是为懦夫。今日，我代他们向影狐一族赔罪。"

影狐们围绕墨老，发出低沉的悲鸣。墨姬沉默良久，九尾慢慢垂落——她眼中的血红渐退，化为一丝哀色：

"罢了。百年恩怨，今日一朝化解。"

她转身向你点头："命外之人，你做到了我等百年来不敢奢望之事。自今日起，[highlight]你可签约影狐[/highlight]——凡我影狐一族，皆愿与你为友。"

一道金光从祭坛射入你胸口，你的命格再度更新——新增标签【[highlight]狐灵[/highlight]】。同时，狐族赠你[highlight]狐族隐藏商店[/highlight]的凭证。

【青丘国·调和路线·完成】
- 恶念值 -20
- 解锁：影狐签约权
- 解锁：狐族隐藏商店
- 习得：墨老的【机关术基础】`,
    options: [
      { label: '前往羽民国继续求道', completed: 'Q01_MAIN_DONE', evilDelta: -0, next: 'qingqiu_end' }
    ]
  };

  /* ---------- 强制结局（强行带走墨老，未化解怨念） ---------- */
  const SCENE_Q01_03_FORCED = {
    id: 'q01_03_forced',
    title: '【主线 Q01_03】执念未解 · 强走猎人',
    bg: BG.fog_abyss,
    text:
`墨老哀叹一声，却无法反抗。你强行将他带往影狐祭坛。

面对影狐，墨老满脸羞愧与恐惧，半天说不出话。影狐们围拢过来，眼中的期望渐渐化作失望与怨毒。

墨姬冷冷开口，声音如寒冰：

"看来，你终究和那些凡人一样——只想着让我们低头，从不解我等百年之苦。"

"既然你无意化解，那便[highlight]不必再谈[/highlight]。"

她一挥袖，祭坛上虚月碎片光芒大盛，化作一道屏障将你们隔绝在外。影狐一族尽数退入迷障深处，再也不见。

你带着满身寒意的墨老离开祭坛。桃林的风，似乎也冷了几分。

【青丘国·强制路线·完成】
- 恶念值 +10
- 影狐一族对你关闭心门
- 无法签约影狐`,
    options: [
      { label: '踏上新途，前往羽民国', completed: 'Q01_MAIN_DONE', evilDelta: 10, next: 'qingqiu_end' }
    ]
  };

  /* ---------- 放任结局（取走虚月碎片，青丘陷入永夜） ---------- */
  const SCENE_Q01_03_LEAVE = {
    id: 'q01_03_leave',
    title: '【主线 Q01_03】虚月破碎 · 放任而去',
    bg: BG.xuyue_curse,
    text:
`你无视墨姬的凝视，径直走向祭坛，将虚月碎片取走。

[highlight]咔嚓[/highlight]——

一声脆响，虚月碎片离坛的刹那，迷障紫雾骤然翻涌！影狐们发出凄厉的嘶吼，眼中红光更盛。

墨姬厉喝："命外之人！你可知虚月碎片镇压着迷障的根源？你取走它，整个青丘将陷入永夜！"

你头也不回，大步离去。

身后，青丘国的桃花在一瞬间尽数凋零，落入无边的黑暗之中。那些终年飘洒的花瓣，仿佛在为青丘的陨落而哭泣。

你握紧虚月碎片，感受着其中冰冷的邪力——你的道心，在那一刻蒙上了一层阴影。

【青丘国·放任路线·完成】
- 恶念值 +50
- 青丘国桃林陷入永夜
- 你获得了虚月碎片（邪力之源）`,
    options: [
      { label: '带着邪力碎片离开', completed: 'Q01_MAIN_DONE', evilDelta: 50, next: 'qingqiu_end' }
    ]
  };

  /* ---------- 战斗场景（影狐长老·堕影狐王） ---------- */
  const SCENE_BATTLE_FYING = {
    id: 'battle_fying_elder',
    title: '【战斗】堕影狐王',
    bg: BG.fying_boss,
    text:
`墨姬化形完毕，九尾狂舞，咆哮而至——

"凡人！你要为你的祖先偿命！"

战斗一触即发！`,
    options: [],  // 战斗界面接管
    // 战斗配置（供 app.js 统一调度，参数与回调集中于此，便于调整）
    battle: {
      enemy: { name: '堕影狐王·墨姬', hp: 680, atk: 52, def: 40, lv: 5, element: '邪', bg: BG.fying_boss },
      onWin: (p) => {
        if (global.Engine) Engine.log('镇压成功：堕影狐王', 'good');
        STATE.completeQuest(p, 'Q01_03_WIN');
      },
      onLose: (p) => { if (global.Engine) Engine.log('镇压失败：重伤逃离', 'evil'); p.hp = 1; },
      after: 'qingqiu_end'
    }
  };

  /* ---------- 结局：青丘·完 ---------- */
  const SCENE_QINGQIU_END = {
    id: 'qingqiu_end',
    title: '【青丘国·终】踏上新途',
    bg: BG.taolin,
    text:
`离开青丘时，白浅送你至桃林边缘。

"命外之人——你已走完青丘之路。山海广袤，二十国各有机缘，接下来的路，[highlight]该由你自己选[/highlight]了。"

"切记——莫被虚月所迷，莫被恶念所困。你的道，在你自己脚下。"

她抬袖指向你视野[highlight]右上角[/highlight]，那里悬着一处小小的[highlight]家园印记[/highlight]：

"无论身在何处，点按右上角的家园印记，都能随时返回洞天福地休整。你走多远，家就在那里。只是——[highlight]战斗中脱身不得[/highlight]，须先了结眼前的敌手。"

你拱手作别，踏上了新的旅程。

【恭喜完成青丘国主线·第一境·完】`,
    options: [
      {
        label: '【山海舆图】打开地图，自行选择下一国', tag: '探索',
        onChoose: (p) => { STATE.enterNation(p, 'qingqiu'); Engine.log('你展开山海舆图，二十国尽收眼底。', 'info'); },
        next: 'home_explore'
      },
      {
        label: '【休息】暂归家园洞府，休整后再行', tag: '休息',
        onChoose: (p) => { STATE.reviveAtHome(p); Engine.log('你暂归家园，休整身心。', 'good'); },
        next: 'home'
      }
    ]
  };

  /* ===========================================================
   * 自由行动系统（青丘国）
   * 引导结束后，玩家可在【修炼/探索/采集/休息】间自由选择
   * =========================================================== */

  /** 心魔试炼场景（动态）：突破时的镜像战斗 */
  function buildHeartDemonScene() {
    const p = global.App && global.App.player;
    const realmInfo = STATE.getRealmInfo();
    const curIdx = realmInfo.findIndex(r => r.name === p.realm.name);
    const next = realmInfo[curIdx + 1];

    return {
      id: 'battle_heart_demon',
      title: '【心魔试炼】' + (next ? next.name : '境界'),
      bg: BG.shadow_altar,
      text:
`你盘膝而坐，心神沉入识海。周遭景色骤变——雾气翻涌，一个与你一模一样的身影缓缓浮现。

那[highlight]心魔[/highlight]开口，声线与你无异：

"我即是你。你所有的不甘、执念、恐惧，都凝于我身。今日，你须战胜自己，方可突破${next ? next.name : '下一境界'}！"

心魔拔剑相向，眼中燃着与你相同的火。这是一场与自己的对决——`,
      options: []
    };
  }

  /* ---------- 支线 Q01_H1 墨家遗迹（隐藏任务，需机关命格触发） ---------- */
  const SCENE_Q01_H1 = {
    id: 'q01_h1_moji',
    title: '【隐藏 Q01_H1】墨家遗迹',
    bg: BG.fog_abyss,
    text:
`你注意到自己身上有【机关】相关的命格（如【文昌】或【勤俭】），竟能感知到墨家遗迹底层有微弱的机关声响。深入调查后，你发现了[highlight]墨家失传的【机关心法】[/highlight]——

这是百年前墨老祖父所留，记载了以机关之力驱动灵宠的方法。习得此法，你可解锁[highlight]机关师[/highlight]隐藏职业前置。`,
    options: [
      { label: '习得机关心法', log: '习得【机关心法】', completed: 'Q01_H1_DONE', next: 'qingqiu_end' },
      { label: '原路返回', next: 'q01_02_accept' }
    ]
  };

  /* ---------- 石小满专属隐藏剧情（人民史观暗线·第7日触发） ---------- */
  const SCENE_SHIMAN_HIDDEN = {
    id: 'qingqiu_shiman_hidden',
    title: '【梦】桃核的低语',
    bg: BG.lingpu,
    text:
`夜深了。你蜷在灵圃的草铺上，胸口的旧伤又隐隐作痛，咳得直不起腰。

半睡半醒间，你忽然摸到枕边多了一粒温热的物事——是那枚一直贴身收着的桃核。此刻它竟在掌心泛起柔柔的光，像谁点了一盏小灯。

光影里，你看见了自己。那年桃林被魔气吞没，你折返回去，把一个一个走散的孩子背出雾海，最后连自己的半条命也留在了那片雾里。

一个苍老的声音自桃核中响起，轻得像是从很远很远的地方飘来：

「孩子，你这一生，救了很多人。可你总说，你这条命是村里人给的——你错了。」

「不是你欠他们的。是这天地欠每一个像你这样的人，欠得太多了。」

「记住，[highlight]龙不在天上。龙在每一个愿意为别人低头的人脊梁里[/highlight]。」

你猛地睁眼，天已蒙蒙亮。枕边桃核的微光渐渐暗了下去，可你的心口，却像是有什么东西，重新热了起来。

（你隐约觉得，这粒桃核里，藏着一个关于「众」字的秘密。未来的路，或会因今夜而不同。）`,
    options: [
      { label: '将桃核贴身收好', log: '你收好了那粒刻着「众」字的桃核，心口滚烫。', fn: (p) => { if (p) p._shimanHiddenDone = true; if (p && global.META && META.unlockChar) { const got = META.unlockChar('c_tian_zhongxin'); if (got) Engine.log('桃核深处传来一声轻响——隐藏角色【众薪】已被唤醒，可在封面选择了！', 'gold'); } }, next: 'home' },
      { label: '望着天边出神', log: '你望着天边，久久不语。', fn: (p) => { if (p) p._shimanHiddenDone = true; if (p && global.META && META.unlockChar) { const got = META.unlockChar('c_tian_zhongxin'); if (got) Engine.log('桃核深处传来一声轻响——隐藏角色【众薪】已被唤醒，可在封面选择了！', 'gold'); } }, next: 'home' }
    ]
  };


  /* ---------- 暴露所有场景（支持函数形式的动态场景） ---------- */
  global.QINGQIU_SCENES = {
    opening: SCENE_OPENING,
    tutorial: SCENE_TUTORIAL,
    jieyin_q01_01: SCENE_Q01_01,
    q01_01_a: SCENE_Q01_01_A,
    q01_01_b_danger: SCENE_Q01_01_B_DANGER,
    q01_01_c_motive: SCENE_Q01_01_C,
    q01_02_intro: SCENE_Q01_02_INTRO,
    q01_02_accept: SCENE_Q01_02_ACCEPT,
    q01_02_refuse: SCENE_Q01_02_REFUSE,
    q01_03_intro: SCENE_Q01_03_INTRO,
    q01_03_dialogue: SCENE_Q01_03_DIALOGUE,
    q01_b1_hunter: SCENE_Q01_B1,
    q01_03_peaceful: SCENE_Q01_03_PEACEFUL,
    q01_03_forced: SCENE_Q01_03_FORCED,
    q01_03_leave: SCENE_Q01_03_LEAVE,
    battle_fying_elder: SCENE_BATTLE_FYING,
    qingqiu_end: SCENE_QINGQIU_END,
    q01_h1_moji: SCENE_Q01_H1,
    qingqiu_shiman_hidden: SCENE_SHIMAN_HIDDEN,
    // 入口别名：青丘国统一入口（其余19国均为 '{国家拼音}_entry'，青丘补此别名消除命名不一致隐患）
    qingqiu_entry: SCENE_Q01_02_ACCEPT,


    // 心魔试炼（动态战斗场景）
    battle_heart_demon: buildHeartDemonScene
  };
})(window);
