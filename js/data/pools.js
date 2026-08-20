/* ===========================================================
 * 问道山海 · 六大命格池
 * 来源：策划案第5章
 * 标签：58个（星宿11+五行10+血脉10+因果9+道心10+通用8=58）
 * =========================================================== */
(function (global) {
  'use strict';

  const POOLS = {
    star: {
      id: 'star', name: '命格星宿', weight: 1,
      desc: '战斗风格与灵宠性格',
      tags: [
        { id:'guxing',  name:'孤星', desc:'契合独行类灵宠。单人作战时主角攻击+5%。', mod:{ atk:0.05 } },
        { id:'pojun',   name:'破军', desc:'契合战斗型灵宠。破甲效率+10%。', mod:{ armorBreak:0.10 } },
        { id:'ziwei',   name:'紫微', desc:'契合瑞兽/神兽。签约成功率+5%。', mod:{ sign:0.05 } },
        { id:'tianji',  name:'天机', desc:'契合谋略型灵宠。技能冷却缩减+5%。', mod:{ cdReduce:0.05 } },
        { id:'tianliang', name:'天梁', desc:'契合守护型灵宠。受击减伤+5%。', mod:{ def:0.05 } },
        { id:'wenchang',name:'文昌', desc:'契合才艺型灵宠。灵材采集+5%。', mod:{ gather:0.05 } },
        { id:'lianzhen',name:'廉贞', desc:'契合凶猛型灵宠。暴击率+5%。', mod:{ crit:0.05 } },
        { id:'tanshu',  name:'天枢', desc:'契合迅捷型灵宠。攻击+4%，暴击率+4%。', mod:{ atk:0.04, crit:0.04 } },
        { id:'wuxu',    name:'开阳', desc:'契合刚猛型灵宠。攻击+6%。', mod:{ atk:0.06 } },
        { id:'zuofu',   name:'左辅', desc:'契合多宠作战。全属性+1%。', mod:{ all:0.01 } },
        { id:'youbi',   name:'右弼', desc:'契合灵巧型灵宠。闪避率+4%。', mod:{ dodge:0.04 } }
      ]
    },
    wuxing: {
      id: 'wuxing', name: '五行灵根', weight: 1,
      desc: '元素亲和与属性专精',
      tags: [
        { id:'huoling', name:'火灵', desc:'契合火属性灵宠。火系技能伤害+10%。', mod:{ fire:0.10 } },
        { id:'shuiling',name:'水灵', desc:'契合水属性灵宠。水系技能伤害+10%。', mod:{ water:0.10 } },
        { id:'jinling', name:'金灵', desc:'契合金属性灵宠。金系技能伤害+10%。', mod:{ metal:0.10 } },
        { id:'muling',  name:'木灵', desc:'契合木属性灵宠。生命回复+10%。', mod:{ heal:0.10 } },
        { id:'tuling',  name:'土灵', desc:'契合土属性灵宠。防御+5%。', mod:{ def:0.05 } },
        { id:'hunyuan', name:'混元', desc:'契合全属性灵宠（双属性及以上）。全属性+2%。', mod:{ all:0.02 } },
        { id:'yinyang', name:'阴阳', desc:'契合光/暗灵宠。异常状态抵抗+10%。', mod:{ resist:0.10 } },
        { id:'fengling',name:'风灵', desc:'契合风属性灵宠。闪避率+8%。', mod:{ dodge:0.08 } },
        { id:'leiling', name:'雷灵', desc:'契合雷属性灵宠。暴击率+6%。', mod:{ crit:0.06 } },
        { id:'bingling',name:'冰灵', desc:'契合冰属性灵宠。受击减伤（防御）+6%。', mod:{ def:0.06 } }
      ]
    },
    xuetai: {
      id: 'xuetai', name: '血脉体质', weight: 1,
      desc: '种族签约权限与体质特性',
      tags: [
        { id:'longxue', name:'龙血', desc:'契合龙裔/蛇类灵宠。龙系进化材料-10%。', mod:{ dragonMat:0.10 } },
        { id:'fengxue', name:'凤血', desc:'契合凤裔/鸟类灵宠。火系进化速度+10%。', mod:{ phoenixMat:0.10 } },
        { id:'huli',    name:'狐灵', desc:'契合狐族灵宠。幻术类技能+10%。', mod:{ foxSkill:0.10 } },
        { id:'juren',   name:'巨人', desc:'契合泰坦型灵宠。生命上限+5%。', mod:{ life:0.05 } },
        { id:'weishi',  name:'微视', desc:'契合微小灵宠。闪避率+5%。', mod:{ dodge:0.05 } },
        { id:'fanti',   name:'凡体', desc:'全系灵宠契合度+0%，但进化材料-20%，进化后全属性+5%。', mod:{ evoMat:0.20, evoBoost:0.05 } },
        { id:'shenzhou',name:'神胄', desc:'契合神兽。契约消耗-10%。', mod:{ signCost:0.10 } },
        { id:'kunpeng', name:'鲲鹏', desc:'契合巨兽类灵宠。生命上限+8%。', mod:{ life:0.08 } },
        { id:'qilin',   name:'麒麟', desc:'契合瑞兽。防御+5%，生命+3%。', mod:{ def:0.05, life:0.03 } },
        { id:'baize',   name:'白泽', desc:'契合灵智类灵宠。修炼速度+8%。', mod:{ cultivation:0.08 } }
      ]
    },
    yinguo: {
      id: 'yinguo', name: '因果经历', weight: 1,
      desc: '剧情选项与隐藏路线',
      tags: [
        { id:'wanggong', name:'亡国遗孤', desc:'曾目睹故乡毁灭。恶念判定-5。', mod:{ evilReduce:5 } },
        { id:'beishizhe',name:'背誓者',  desc:'曾违背誓言。心魔BOSS血量-20%。', mod:{ mindBoss:0.20 } },
        { id:'lunhui',   name:'轮回者',  desc:'保有前世记忆。隐藏选项可见。', mod:{ hidden:0.10 } },
        { id:'qiyuan',   name:'奇缘',    desc:'命中有奇遇。稀有遭遇率+5%。', mod:{ rare:0.05 } },
        { id:'sharen',   name:'杀仁',    desc:'曾为义杀人。攻击+5%，但NPC初始好感-10。', mod:{ atk:0.05, npcInit:-10 } },
        { id:'guichou',  name:'归愁',  desc:'心怀故土。归乡相关剧情触发率+15%。', mod:{ homecoming:0.15 } },
        { id:'wendao',   name:'问道者',  desc:'毕生求道。修炼速度+10%。', mod:{ cultivation:0.10 } },
        { id:'dujie',    name:'渡劫者',  desc:'历劫重生。心魔BOSS血量-10%。', mod:{ mindBoss:0.10 } },
        { id:'huanyuan', name:'还愿',    desc:'有恩必报。NPC好感提升+10%。', mod:{ npcFavor:0.10 } }
      ]
    },
    daoxin: {
      id: 'daoxin', name: '道心倾向', weight: 1,
      desc: '职业技能适配与流派',
      tags: [
        { id:'yixian',  name:'医仙', desc:'契合辅助型灵宠。治疗效果+15%。', mod:{ heal:0.15 } },
        { id:'kuangzhan',name:'狂战', desc:'契合战斗型灵宠。攻击+10%，防御-5%。', mod:{ atk:0.10, def:-0.05 } },
        { id:'qinjian', name:'勤俭', desc:'所有灵材采集效率+10%。', mod:{ gather:0.10 } },
        { id:'baoren',  name:'报恩', desc:'NPC好感度提升速度+15%。', mod:{ npcFavor:0.15 } },
        { id:'choumie', name:'绸缪', desc:'炼丹成功率+10%。', mod:{ refine:0.10 } },
        { id:'poyu',    name:'破欲', desc:'抵抗精神类debuff+10%。', mod:{ mentalResist:0.10 } },
        { id:'juren2',  name:'居仁', desc:'每回合受治疗+5%。', mod:{ hot:0.05 } },
        { id:'jianchi', name:'剑痴', desc:'一生痴剑。攻击+8%。', mod:{ atk:0.08 } },
        { id:'yushou',  name:'御兽', desc:'天生亲和灵宠。签约成功率+8%。', mod:{ sign:0.08 } },
        { id:'kuxing',  name:'苦行', desc:'苦修不辍。生命+5%，防御+5%。', mod:{ life:0.05, def:0.05 } }
      ]
    },
    common: {
      id: 'common', name: '通用', weight: 1,
      desc: '生活玩法与特殊机制',
      tags: [
        { id:'shanshi', name:'善识', desc:'商人初始好感+10，价格-5%。', mod:{ price:-0.05 } },
        { id:'wuwei',   name:'悟微', desc:'悟性+5%，修炼速度+5%。', mod:{ cultivation:0.05 } },
        { id:'lvpeng',  name:'绿朋', desc:'草木系灵宠初始好感+10。', mod:{ woodPet:10 } },
        { id:'tianming',name:'天命', desc:'全随机事件触发率+5%。', mod:{ event:0.05 } },
        { id:'youming', name:'幽冥', desc:'暗属性灵宠契合度+5%。', mod:{ darkPet:0.05 } },
        { id:'huiyan',  name:'慧眼', desc:'识物辨材。灵材采集效率+8%。', mod:{ gather:0.08 } },
        { id:'tiemian', name:'铁面', desc:'铁面无私。恶念判定-3。', mod:{ evilReduce:3 } },
        { id:'yunyou',  name:'云游', desc:'四海云游。稀有遭遇率+3%。', mod:{ rare:0.03 } }
      ]
    }
  };

  // 互斥关系（简单版）
  const MUTEX = [
    ['guxing', 'kuangzhan'],   // 孤星与狂战略有冲突
    ['huoling', 'shuiling']    // 火灵水灵不可同取
  ];

  /* ===========================================================
   * 命格典故（山海绘卷·命格图鉴用）：每个命格的由来与寓意
   * =========================================================== */
  const MING_LORE = {
    // —— 星宿池（紫微斗数十二主星） ——
    guxing:   '紫微斗数谓之「孤辰」。天孤地煞，命带孤星者注定独行于世；然孤星亦有孤傲之锐——独行之人，方能心无旁骛，越战越勇。',
    pojun:    '「破军星动，天下皆惊。」破军主杀伐决断，所过之处旧秩序崩解，唯以战破局者，方见破而后立之机。',
    ziwei:    '「紫微临位，万星拱卫。」帝星入命者天生领袖气象，虎豹为之让路，百兽听其号令。',
    tianji:   '「善谋者寿，天机不可泄。」执天机者算无遗策，能于万步之前预演结局，然机关算尽，亦须知命不可强求。',
    tianliang: '南斗第一星，化气为荫。天梁入命者福泽深厚，逢凶化吉，如巨伞张于风雨之中，庇护同袍。',
    wenchang: '文曲司才，主科举文运。文昌照命者聪慧过人，读书万卷，采山识物皆有过目不忘之能。',
    lianzhen: '五行属火，化气为囚。廉贞主烈性孤高，锋芒如刀，然其人心热——宁为玉碎，不为瓦全。',
    tanshu:   '北斗第一星，枢机之始。天枢入命者主掌机变，攻守兼备，星之所指，即为破局之钥。',
    wuxu:     '北斗第六星，武曲之余。开阳照命者刚猛无俦，一力降十会，重剑无锋，大巧不工。',
    zuofu:    '「左辅入命，得众星之助。」主贵人扶持，左右逢源，纵孤军深入，亦有暗星相随。',
    youbi:    '右弼与左辅相对，主暗中助力。身法灵动，如影随形，攻守之间，自有妙手。',
    // —— 五行灵根池 ——
    huoling:  '祝融遗火，炎上之物。火灵者性烈如焚，心念一动，赤焰随行，万物皆可燃成灰烬，亦可炼成真丹。',
    shuiling: '共工之泽，润下为德。水灵者柔韧绵长，水滴石穿，水系神通绵绵不绝，似江河之不息。',
    jinling:  '蓐收之锋，金性肃杀。金灵者锐利果决，金石为心，金系技法锋芒毕露，遇坚则断。',
    muling:   '句芒之春，木性生发。木灵者生生不息，伤愈自复，如老树逢春，枯木再荣。',
    tuling:   '后土之厚，土性承载。土灵者稳如泰山，万法难撼，大地之德，厚而能载。',
    hunyuan:  '一气混元，未分阴阳。混元者先天圆满，五行尽在其身，诸系通吃，返璞归真。',
    yinyang:  '太极两仪，负阴抱阳。阴阳者明暗兼通，昼可为阳，夜可为阴，诸邪不侵，正邪难缚。',
    fengling: '巽为风，动而不居。风灵者身法飘逸，来去无踪，攻时如龙卷，走时似轻烟。',
    leiling:  '震为雷，其势万钧。雷灵者刚猛迅烈，一击必中，雷霆之怒，可涤荡世间一切阴邪。',
    bingling: '玄冥之水，凝而为冰。冰灵者寒气森然，坚不可摧，冰封三尺，非一日之寒。',
    // —— 血脉体质池 ——
    longxue:  '「龙生九子，血承祖脉。」龙血者身负上古真龙之息，与龙裔天然亲和，进龙途事半功倍。',
    fengxue:  '凤栖梧桐，火德之裔。凤血者浴火而生，焚身愈烈，其魂愈清，火系之路一马平川。',
    huli:     '青丘之裔，魅影天成。狐灵者通晓幻术，一颦一笑可乱心志，千面之间，真假难辨。',
    juren:    '夸父遗族，身如山岳。巨人者气血磅礴，一拳可碎山，其生命力之坚韧，仿若大地。',
    weishi:   '周饶之民，眇小善视。微视者洞若观火，身形小巧，草木之中来去自如，寻常攻击难沾其身。',
    fanti:    '天地之精归于平凡，凡体者无奇却百无禁忌。万物皆可为师，进化之路反而获益更丰。',
    shenzhou: '上古神裔，血脉尊贵。神胄者与神兽之约如契刻于骨，契约消耗远低旁人。',
    kunpeng:  '「北冥有鱼，其名为鲲，化而为鹏，怒而飞，翼若垂天之云。」鲲鹏者志在四海，体魄宏大无朋。',
    qilin:    '「麟凤龟龙，谓之四灵。」麒麟出，天下平。麒麟者祥瑞护体，攻守兼备，福泽所至。',
    baize:    '白泽通晓万物，达于天文地理。白泽者慧根深种，博闻强识，修行一日千里。',
    // —— 因果经历池 ——
    wanggong: '故国成烬，血泪浸透残垣。你背负着亡魂的嘱托与未竟的国愿，在流亡中拾起长剑。',
    beishizhe: '你曾立下重誓，却因种种未能兑现。心魔由此而生——然敢直面心魔者，终将百炼成钢。',
    lunhui:   '前尘未忘，今生重续。你总在某个瞬间恍惚，仿佛记得某个不该记得的名字与承诺。',
    qiyuan:   '命盘偶逢奇星，机缘自来。福至心灵时，连路边的一块顽石都可能藏着造化。',
    sharen:   '为义而杀，以杀止杀。你手上沾过血，眼底却还留着仁——这条路，你比谁都清楚代价。',
    guichou:  '乡愁入骨，梦回故里。凡归乡之路，你总能循着炊烟找到答案，那是山海最温柔的方向。',
    wendao:   '「朝闻道，夕死可矣。」你此生只为一件事而来——问清大道，纵使以身殉道亦无怨。',
    dujie:    '历九死而一生，劫灰淬炼道心。心魔于你如旧友重逢——上一次，是你赢了。',
    huanyuan: '一诺千金，有恩必偿。你修行路上所积的愿力，终将在某一刻化作山海替你作答。',
    // —— 道心倾向池 ——
    yixian:   '悬壶济世，医者仁心。你手中的药，从来不只是药——那是你与天地缔结的契约。',
    kuangzhan: '狂者不羁，战意如火。你信奉的真理写在每一道伤口上：向死而生，方得大道。',
    qinjian:  '一粥一饭，来之不易。你深谙天地馈赠之珍贵，故而草木金石在你眼中皆有其价。',
    baoren:   '滴水之恩，涌泉相报。你种下的善意，会在山海之间不断回响，最终化为福缘。',
    choumie:  '「凡事预则立，不预则废。」你总是多做一手准备，火候、时辰、灵材——分毫不差。',
    poyu:     '斩断心猿意马，一念清明。欲念如浮云，来去不由心，精神侵蚀于你如过眼云烟。',
    juren2:   '「仁者安仁，知者利仁。」你心怀悲悯，居仁不移，受天地之养，亦不忘回馈天地。',
    jianchi:  '「剑即是道，道即是剑。」你一生痴剑，剑心通明——剑未出鞘，剑意已先至。',
    yushou:   '百兽闻之，俯首帖耳。你天生能与灵兽心意相通，一念既起，万灵归心。',
    kuxing:   '苦其心志，劳其筋骨，饿其体肤。苦行者的每一步都算数——山河为证，岁月为凭。',
    // —— 通用池 ——
    shanshi:  '阅人无数，一眼识真。商旅见你如见故友，总愿给你一个实在价——识人者，人恒识之。',
    wuwei:    '见微知著，睹始知终。你悟性极高，常从一滴露水中窥见天地之道，修炼事半而功倍。',
    lvpeng:   '草木有灵，与尔为友。你路过时，山间的藤萝会轻轻侧身，为你让出一条路。',
    tianming: '「天命之谓性。」你的命盘多了一线变数——祸福相依，连天意也对你留了几分余地。',
    youming:  '幽冥之气，暗夜之契。你与暗系灵宠之间，有一种说不清道不明的缘分，如月下孤影。',
    huiyan:   '一眼识得真与假。你采的材，总比旁人的更纯粹——慧眼所及，草木皆话。',
    tiemian:  '铁面无私，明镜高悬。你心中自有秤，善恶分毫不爽，邪念如溪水过石，不染其身。',
    yunyou:   '「读万卷书，行万里路。」你的脚印，比山海图的注记还要多——四海为家，处处是道。'
  };

  /* ===========================================================
   * 命格共鸣（羁绊）：凑齐组内全部命格即触发额外加成，
   * 让"抽命格"升级为"组 Build"。加成在 mingshenBonus 中自动累计。
   * =========================================================== */
  const MINGSHEN_RESONANCE = [
    { id:'star_align', name:'星宿归位', need:['guxing','ziwei'], mod:{ all:0.02 },
      desc:'孤星与紫微同现，星轨交汇，全属性+2%。' },
    { id:'dragon_phoenix', name:'龙凤呈祥', need:['longxue','fengxue'], mod:{ life:0.05 },
      desc:'龙血凤血同脉，生机勃发，生命+5%。' },
    { id:'five_elements', name:'五行归一', need:['huoling','shuiling','muling'], mod:{ all:0.03 },
      desc:'火水木三行汇聚，五行相生，全属性+3%。' },
    { id:'dao_heart', name:'问道之心', need:['wendao','jianchi'], mod:{ atk:0.06 },
      desc:'问道者与剑痴同途，道心澄澈，攻击+6%。' },
    { id:'healer', name:'医道双修', need:['yixian','choumie'], mod:{ heal:0.08 },
      desc:'医仙与绸缪兼修，妙手仁心，治疗+8%。' },
    { id:'reincarnation', name:'轮回宿命', need:['lunhui','guichou'], mod:{ rare:0.05, hidden:0.05 },
      desc:'轮回者与归愁相映，窥见命数，稀有遭遇与隐藏选项+5%。' },
    { id:'beast_master', name:'御兽宗师', need:['yushou','baoren'], mod:{ sign:0.08, npcFavor:0.08 },
      desc:'御兽与报恩并修，万灵归心，签约成功率与好感提升+8%。' },
    { id:'swift_sword', name:'剑走偏锋', need:['jianchi','leiling'], mod:{ crit:0.06 },
      desc:'剑痴与雷灵相激，锋芒毕露，暴击率+6%。' }
  ];

  global.POOLS = POOLS;
  global.MUTEX = MUTEX;
  global.MINGSHEN_RESONANCE = MINGSHEN_RESONANCE;
  global.MING_LORE = MING_LORE;
})(window);