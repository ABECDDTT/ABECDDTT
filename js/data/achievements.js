/* ===========================================================
 * 问道山海 · 成就系统数据
 * 成就分类：境界 / 战斗 / 探索 / 收集 / 供奉 / 因果 / 隐藏
 * hidden: true 表示「隐藏成就」——未达成时仅显示名称占位，不显示具体达成条件
 * =========================================================== */
(function (global) {
  'use strict';

  /**
   * 成就结构：
   *   id         唯一标识
   *   name       成就名
   *   icon       图标（图片路径）
   *   desc       达成条件描述（hidden 成就未达成时不显示）
   *   hidden     是否隐藏成就（未达成不显示条件）
   *   flavor     达成后的意境文案
   *   check(p, ctx)  检测函数：返回 true 表示已达成；ctx 为触发上下文（可选）
   */
  const ACHIEVEMENTS = [
    /* ============ 境界类 ============ */
    { id:'realm_base', name:'初窥门径', icon:'ach-realm', desc:'首次突破至筑基期', hidden:false,
      flavor:'道门初启，一入凡尘渐修仙。', check:(p)=> (p.realm && p.realm.level >= 2) },
    { id:'realm_jindan', name:'三花聚顶', icon:'ach-realm', desc:'突破至金丹期', hidden:false,
      flavor:'精炁神凝，三花聚于顶门。', check:(p)=> (p.realm && p.realm.level >= 3) },
    { id:'realm_yuanying', name:'五气朝元', icon:'ach-realm', desc:'突破至元婴期', hidden:false,
      flavor:'五气朝元，元婴坐镇紫府。', check:(p)=> (p.realm && p.realm.level >= 4) },
    { id:'realm_huashen', name:'天人合一', icon:'ach-realm', desc:'突破至化神期', hidden:false,
      flavor:'神游太虚，与道合真。', check:(p)=> (p.realm && p.realm.level >= 5) },
    { id:'realm_dujie', name:'逆天而行', icon:'ach-realm', desc:'突破至渡劫期', hidden:false,
      flavor:'天劫加身，我自岿然不动。', check:(p)=> (p.realm && p.realm.level >= 6) },
    { id:'realm_feisheng', name:'羽化登仙', icon:'ach-realm', desc:'突破至飞升期', hidden:false,
      flavor:'羽化而登仙，逍遥天地间。', check:(p)=> (p.realm && p.realm.level >= 7) },

    /* ============ 战斗类 ============ */
    { id:'battle_first', name:'初战告捷', icon:'ach-battle', desc:'取得第一场战斗胜利', hidden:false,
      flavor:'第一滴血，道途自此始。', check:(p, ctx)=> (p._battleWins || 0) >= 1 },
    { id:'battle_ten', name:'初露锋芒', icon:'ach-battle', desc:'累计取得 10 场战斗胜利', hidden:false,
      flavor:'十战十胜，锋芒初现。', check:(p, ctx)=> (p._battleWins || 0) >= 10 },
    { id:'battle_hundred', name:'百战不殆', icon:'ach-battle', desc:'累计取得 100 场战斗胜利', hidden:false,
      flavor:'百战之身，万法不侵。', check:(p, ctx)=> (p._battleWins || 0) >= 100 },
    { id:'battle_weak_win', name:'以弱胜强', icon:'ach-battle', desc:'以低于敌人等级 5 级以上击败敌人', hidden:false,
      flavor:'蚍蜉撼树，亦可参天。', check:(p, ctx)=> ctx && ctx.weakWin },
    { id:'battle_flawless', name:'毫发无损', icon:'ach-battle', desc:'满血状态取得战斗胜利', hidden:false,
      flavor:'片叶不沾身，来去自无踪。', check:(p, ctx)=> ctx && ctx.flawless },
    { id:'battle_combo', name:'连击如潮', icon:'ach-battle', desc:'单场战斗达成 5 连击', hidden:false,
      flavor:'绵绵不绝，如潮水之攻。', check:(p, ctx)=> ctx && ctx.maxCombo >= 5 },

    /* ============ 探索类 ============ */
    { id:'explore_first', name:'初入秘境', icon:'ach-explore', desc:'首次外出探险', hidden:false,
      flavor:'世界之大，自此踏出第一步。', check:(p, ctx)=> (p._exploreTimes || 0) >= 1 },
    { id:'explore_hundred', name:'行万里路', icon:'ach-explore', desc:'累计探险 100 次', hidden:false,
      flavor:'读万卷书，行万里路。', check:(p, ctx)=> (p._exploreTimes || 0) >= 100 },
    { id:'fumo_ten', name:'伏魔勇士', icon:'ach-explore', desc:'累计闯伏魔窟 10 次', hidden:false,
      flavor:'妖邪辟易，正道昭彰。', check:(p, ctx)=> (p._fumoTimes || 0) >= 10 },

    /* ============ 收集类 ============ */
    { id:'collect_material', name:'灵材收藏家', icon:'ach-collect', desc:'收集 20 种不同灵材', hidden:false,
      flavor:'天地灵材，尽入我彀中。', check:(p)=> Object.keys(p.materials || {}).filter(k => (p.materials[k] || 0) > 0).length >= 20 },
    { id:'collect_rich', name:'富甲一方', icon:'ach-collect', desc:'金币达到 10000', hidden:false,
      flavor:'千金散尽还复来。', check:(p)=> (p.gold || 0) >= 10000 },
    { id:'collect_blueprint', name:'博采众长', icon:'ach-collect', desc:'收集 5 张职业图纸', hidden:false,
      flavor:'他山之石，可以攻玉。', check:(p)=> (p.unlocked ? Array.from(p.unlocked).filter(k => k.indexOf('BLUE-') === 0).length : 0) >= 5 },

    /* ============ 宠物类 ============ */
    { id:'pet_first', name:'结契灵宠', icon:'ach-pet', desc:'结契第一只灵宠', hidden:false,
      flavor:'从此道途，有灵为伴。', check:(p)=> (p.pets || []).length >= 1 },
    { id:'pet_evolve', name:'灵宠化形', icon:'ach-pet', desc:'灵宠进化至最终形态', hidden:false,
      flavor:'破茧成蝶，返本归元。', check:(p)=> (p.pets || []).some(pet => pet.evoStage >= 3) },
    { id:'pet_ur', name:'神宠天降', icon:'ach-pet', desc:'拥有 UR 品质灵宠', hidden:false,
      flavor:'神兽归位，气运加身。', check:(p)=> (p.pets || []).some(pet => pet.quality === 'UR') },

    /* ============ 供奉类 ============ */
    { id:'offer_first', name:'虔诚问道', icon:'ach-offer', desc:'首次供奉神明', hidden:false,
      flavor:'一炷心香，上达天听。', check:(p)=> !!(p.offerGod) },
    { id:'offer_awaken', name:'神恩圆满', icon:'ach-offer', desc:'供奉值达到 1000 圆满', hidden:false,
      flavor:'神降已备，天人感应。', check:(p)=> (p.offerValue || 0) >= 1000 },
    { id:'offer_evolve', name:'道心传承', icon:'ach-offer', desc:'触发职业进化', hidden:false,
      flavor:'承前启后，道统不绝。', check:(p)=> { const evo = STATE.getProfessionEvolution(p); return evo && evo.evolved; } },

    /* ============ 因果类 ============ */
    { id:'nation_clear', name:'定国安邦', icon:'ach-karma', desc:'通关一个国家主线', hidden:false,
      flavor:'一方水土，重归清平。', check:(p, ctx)=> { const c = STATE.unlockedNations(p).cleared; return c.length >= 1; } },
    { id:'nation_all', name:'二十国归一', icon:'ach-karma', desc:'通关全部二十国主线', hidden:false,
      flavor:'山海二十国，尽归太平。', check:(p, ctx)=> { const c = STATE.unlockedNations(p).cleared; return c.length >= 20; } },

    /* ============ 隐藏成就（未达成不显示条件） ============ */
    { id:'hidden_taotian', name:'欲与天公试比高', icon:'ach-hidden', desc:'在渡劫期越级战胜高于自身 10 级的强敌', hidden:true,
      flavor:'我欲与天公试比高，何惧道途多险阻！', check:(p, ctx)=> ctx && ctx.taotian },
    { id:'hidden_wuyun', name:'五蕴皆空', icon:'ach-hidden', desc:'禅人将恶念值降为 0 且不破戒', hidden:true,
      flavor:'色受想行识，五蕴皆空。', check:(p)=> p.profession === 'zen' && (p.evil || 0) <= 0 },
    { id:'hidden_yinianmo', name:'一念成魔', icon:'ach-hidden', desc:'恶念值达到 100', hidden:true,
      flavor:'一念之差，万劫不复，然我心自明。', check:(p)=> (p.evil || 0) >= 100 },
    { id:'hidden_yinianshen', name:'一念成神', icon:'ach-hidden', desc:'恶念值保持 0 通关二十国', hidden:true,
      flavor:'心如止水，善念长存，一念成神。', check:(p)=> (p.evil || 0) <= 0 && STATE.unlockedNations(p).cleared.length >= 20 },
    { id:'hidden_swift', name:'百日飞升', icon:'ach-hidden', desc:'100 天之内突破至飞升期', hidden:true,
      flavor:'朝闻道，夕死可矣。', check:(p)=> (p.realm && p.realm.level >= 7) && (p.day || 0) <= 100 },
    { id:'hidden_undefeated', name:'未尝一败', icon:'ach-hidden', desc:'全程未战败通关（战败次数为 0）', hidden:true,
      flavor:'一往无前，所向披靡。', check:(p)=> (p._battleLoses || 0) === 0 && STATE.unlockedNations(p).cleared.length >= 20 },
    { id:'hidden_hidden', name:'天机不可泄露', icon:'ach-hidden', desc:'触发一个隐藏剧情任务', hidden:true,
      flavor:'冥冥之中，自有天意。', check:(p, ctx)=> ctx && ctx.hiddenQuest },
    { id:'hidden_four', name:'屠尽四凶', icon:'ach-hidden', desc:'通关四凶终章', hidden:true,
      flavor:'四凶陨落，山海重光。', check:(p, ctx)=> ctx && ctx.fourFierceDone },
    { id:'hidden_xinsheng_taiyang', name:'新生太阳', icon:'ach-hidden', desc:'在【设置·兑换码】中输入「红日」', hidden:true,
      flavor:'长夜将尽，一轮红日破晓而出，从此人间有光。', check:(p)=> (p.redeemCodes || []).indexOf('hongri') >= 0 },
    { id:'hidden_true_end', name:'山海永恒', icon:'ach-hidden', desc:'击败隐藏 BOSS「混沌本相」，达成真结局', hidden:true,
      flavor:'斩其本相，方证真道。山海永恒，万世无虞。', check:(p, ctx)=> ctx && ctx.chaosBossDone }
  ];

  /* ===========================================================
   * 成就典故（山海绘卷·成就图鉴用）：在简单版 desc/flavor 之外
   * 补充一段「故事的厚度」——或引古籍，或述山海经历。
   * =========================================================== */
  const ACH_LORE = {
    // —— 境界类 ——
    realm_base:   '清人张鼎思《琅邪代醉编》卷三十云："三花聚顶，五气朝元，道家修养之法也。三花落则死矣。三花未落，乘兴来过，言有生之年，未死之日，犹有再会之期也。"你从引气入体到筑基成功，不过百日——可这百日，是你此生第一次听懂天地的心跳。',
    realm_jindan: '金丹一成，三花聚顶。你闭关七日七夜，丹田中那枚金丹转动如日月。张鼎思说"三花未落，乘兴来过"——你握着这份"未落"，从此再不怕世间再见无期。',
    realm_yuanying: '元婴坐镇紫府，五气朝元。元婴初生时朝你睁眼，竟长得和你一模一样——那一刻你终于明白，修行不是变强，是重新认识自己。',
    realm_huashen: '化神之躯，神游太虚。你第一次魂魄出窍，看见自己肉身端坐洞中，而元神已行至万里外的雪山之巅。天人合一，说的就是此刻。',
    realm_dujie: '天劫九重，逆天而行。你于雷海中岿然不动，劫雷落下的刹那，你看见天道深处有一双眼——它在看你，也在等你。',
    realm_feisheng: '羽化而登仙。飞升那日，故人送的每一颗石子都化作点点星光，围着你绕了最后一圈。从此山海是你的过往，而你是山海的传说。',
    // —— 战斗类 ——
    battle_first: '你斩下的第一个敌人倒在地上时，剑还在抖。你第一次知道，胜利不是战利品，是责任。',
    battle_ten:   '十战十胜，锋芒初现。你不再数自己赢了多少场，因为你开始数对手教会了你什么。',
    battle_hundred:'百战之身，万法不侵。第一百场胜利时，你忽然不想打了——不是厌战，是你已经能"不战而屈人之兵"。',
    battle_weak_win:'蚍蜉撼树，亦可参天。你以弱胜强那一战，全场无人看见你的招式，只看见一个少年逆着风往前走。',
    battle_flawless:'片叶不沾身。毫发无损的那一战，你把剑还鞘时说了一句：不是我强，是它还不够强。',
    battle_combo:  '五连击如潮，绵绵不绝。连招的最后一式落下时，你听见风都在替你鼓掌。',
    // —— 探索类 ——
    explore_first: '你第一次踏出家门时，晨雾未散。后来你才懂，所谓"世界"，就是从这一步开始变大的。',
    explore_hundred:'读万卷书，行万里路。第一百次探索归来，你从行囊里倒出的不是灵材，是一百个故事。',
    fumo_ten:     '伏魔窟第十次，你终于不用屏着呼吸走进去。妖邪辟易，是因为你心里那盏灯越来越亮。',
    // —— 收集类 ——
    collect_material:'你打开图鉴，二十种灵材的名字整整齐齐。每一味都是你亲手摘的——有的在峭壁上，有的在别人不敢去的深涧里。',
    collect_rich: '「千金散尽还复来。」你富甲一方那天，第一件事不是数钱，是把当年欠老药婆的药钱还了。',
    collect_blueprint:'五张职业图纸摊开在桌上，像五条岔路。你从中看见的不是职业，是五个前人的一生。',
    // —— 宠物类 ——
    pet_first:   '结契那日，灵宠蹭了蹭你的手心。从此道途多长，陪伴就有多长。',
    pet_evolve:  '破茧成蝶那夜，你的灵宠第一次开口说话——喊的是你的名字。它记得每一个喂它的日夜。',
    pet_ur:      'UR神宠降临之时，整座山都静了。神兽归位，不是因为你的运气，是因为它选了那个值得的人。',
    // —— 供奉类 ——
    offer_first: '你点燃第一炷香时，香灰落进香炉的声音，像神明轻叹了一声。',
    offer_awaken:'供奉圆满那日，神像忽然睁眼——不是神显灵，是你终于信了：人有所愿，天有所应。',
    offer_evolve:'职业进化的瞬间，你听见血脉里传来历代传人的低语：道统不绝，薪火相传。',
    // —— 因果类 ——
    nation_clear:'你通关的第一个国家，百姓用你的名字给孩子起名。你说不敢当——可那天你偷偷笑了很久。',
    nation_all:  '二十国归一，山海重光。你在归墟之顶回望，二十国的灯火连成一条线，像你走过的大道。',
    // —— 隐藏成就 ——
    hidden_taotian:  '渡劫期越级而战，你赌的是天道不敢杀你——你赢了。那一战后你才明白：天规也是人写的。',
    hidden_wuyun:   '「色受想行识，五蕴皆空。」你将恶念归零的那一刻，不是成佛，是终于能与自己和解。',
    hidden_yinianmo:'一念成魔。魔由心生，你看着那道黑影——它其实是你最不肯原谅的那部分自己。',
    hidden_yinianshen:'一念成神。二十国走完，你手上没沾一滴不该沾的血。善念长存，不是软弱，是另一种强大。',
    hidden_swift:  '百日飞升。世人说你天资纵横，只有你知道：你只是把别人犹豫的时间，都用去走了路。',
    hidden_undefeated:'未尝一败通关山海。不是没有败过——是你每次跌倒，都在原地站得更直。',
    hidden_hidden: '你触发的那个隐藏任务，是有人在暗处等了你整整三百年。有些剧情，只有心软的人才走得进去。',
    hidden_four:  '屠尽四凶。四凶陨落那夜，二十国的钟声同时响起，像天地在说：谢了。',
    hidden_xinsheng_taiyang:'你输入兑换码「红日」——长夜将尽，一轮红日破晓。从此人间有光，是你的名字。',
    hidden_true_end:'你击败了混沌本相，却没有杀它——你只是让它看见，这世间值得守护。真结局不是胜利，是放下。'
  };

  global.ACHIEVEMENTS = ACHIEVEMENTS;
  global.ACH_LORE = ACH_LORE;
})(window);
