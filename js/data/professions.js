/* ===========================================================
 * 问道山海 · 三教职业详细数据
 * 来源：策划案第4章 + 附录A
 * 每个职业：普攻 + 3主动技 + 奥义 + 位移/格挡 + 被动
 * 技能带 element(属性) 用于元素反应，effect(效果) 用于状态
 * =========================================================== */
(function (global) {
  'use strict';

  const PROFESSIONS = {

    /* ============== 道徒：符箓通灵，借法天地 ============== */
    tao: {
      id: 'tao',
      name: '道徒',
      role: 'pet_control',
      roleDesc: '灵宠 · 控制 —— 灵痕强宠，符咒定敌',
      img: 'assets/img/nations/prof-tao.jpg',
      tag: '中距离控场 · 符箓召唤',
      story: '你从青丘桃源旁的无名道观走出，师父在羽化前将一卷泛黄的《黄庭经》塞进你掌心——"符箓是道之形，灵气是道之血，画符即画天地。"你以朱砂黄纸为媒，借阴阳二气为笔，敕令六甲，召遣万灵。山海在你笔下是一张未写完的符，而你是那个执笔的人。',
      origin: '太古之时，首山之巅有黄冠老者以指画符，雷雨立至，百兽俯首——此谓「符箓一道，始于画符人」。老者传下三卷：一曰符，二曰咒，三曰诀，世间道徒皆出其门。首山道统衰微后，门人星散四方，有人遁入青丘结庐授徒，有人藏身荒庙传道。道徒不问出身贵贱，只问一句：笔锋所指，可曾心正？相传第一位道徒赤脚行遍二十国，一路以符开山、以咒渡人，临终将黄庭经传给路边哭泣的孤儿，那孤儿后来成了青丘第一代药婆之师。',
      evoImg: 'assets/img/professions/prof-tao-evo.jpg',
      evoName: '道长',
      evoStory: '当你将三清道祖供奉至圆满，那一卷《黄庭经》骤然化作三道紫金清气——元始、灵宝、道德，三清法相在你身后显化。你不再是画符的道徒，而是「代天行道」的道长：笔落则雷霆随行，墨起则山河倒悬。紫金光华护体，万邪辟易；一符可敕山神，一令可召天兵。',
      element: '道',
      life: 0.85, mp: 1.25, atk: 0.95, def: 0.75,
      mainSkill: '黄庭经',
      mainSkillDesc: '灵力上限+20%，灵宠继承系数+5%',
      skills: [
        { id:'punch',          name:'点灵',   type:'basic', element:'道', power:1.0,  cd:0, mp:0,  desc:'三道符箓连击，命中后为灵宠叠1层【灵痕】' },
        { id:'tao_zhen',       name:'镇魂符', type:'skill', element:'金', power:1.4,  cd:3, mp:12, desc:'敕令镇魂，破甲8%持续3回合', armorBreak: 0.08 },
        { id:'tao_lie',        name:'烈焰符', type:'skill', element:'火', power:1.3,  cd:2, mp:10, desc:'烈焰焚烧，【灼烧】2回合', burn: 2 },
        { id:'tao_feng',       name:'风遁符', type:'skill', element:'风', power:1.2,  cd:3, mp:14, desc:'召唤罡风，敌方【减速】20%，自身闪避+20%', slow: 0.2, dodgeSelf: { name:'风遁', turns:2, mul:0.2 } },
        { id:'tao_lei',        name:'雷光符', type:'skill', element:'雷', power:1.5,  cd:3, mp:16, desc:'引雷轰击，【麻痹】1回合', paralyze: 1 },
        { id:'tao_shui',       name:'寒潭符', type:'skill', element:'水', power:1.2,  cd:3, mp:12, desc:'凝水成冰，【冻结】1回合', freeze: 1 },
        { id:'tao_mu',         name:'青木符', type:'skill', element:'木', power:1.1,  cd:3, mp:12, desc:'藤蔓【缠绕】2回合并吸血15%', bind: true, leech: 0.15 },
        { id:'tao_tu',         name:'山岳符', type:'skill', element:'土', power:1.3,  cd:4, mp:15, desc:'镇山岳之重，敌方攻击-15%持续2回合', atkDown: 0.15 },
        { id:'tao_hun',        name:'万灵归宗', type:'ultimate', element:'道', power:2.2, cd:0, mp:40, require:'fullBar', desc:'召唤所有灵宠幻影齐攻，奥义能量满时释放' },
        { id:'tao_blink',      name:'灵兽瞬闪', type:'dodge', element:'风', power:0.6, cd:3, sta:20, desc:'瞬移到安全处，闪避下一次攻击' }
      ],
      passive: { name:'墨韵', desc:'普攻叠加灵痕，每层+8%灵宠协击伤害', eff: { type:'petStack', per:0.08, cap:5 } },
      skillIntro: '道徒以符箓应敌，朱砂为笔、灵气为墨，一笔一划皆是天地法则。灵宠与符阵相辅相成——普攻「点灵」为灵宠叠加【灵痕】，灵痕越深，协战越猛；符法千变：烈焰符焚敌、雷光符定身、寒潭符成冰、青木符缠人、山岳符镇势、风遁符脱身。奥义「万灵归宗」将一生符缘融于一击，召灵宠幻影齐攻，是道徒"借法天地"的极致。',
      evoSkills: [
        { name:'三清道印', type:'skill', element:'道', power:2.8, cd:0, mp:45, stun: 1, desc:'三清法相凝于一印，威力 280% 并【眩晕】1回合' },
        { name:'紫金护身', type:'skill', element:'道', power:0, cd:4, mp:20, reduceSelf: { name:'紫金', turns:3, mul:0.3 }, desc:'三清紫气护体，减伤 30% 持续 3 回合' },
        { name:'天罡敕令', type:'skill', element:'雷', power:2.2, cd:3, mp:25, paralyze: 2, desc:'以敕令召天雷，威力 220% 并【麻痹】2回合' }
      ]
    },

    /* ============== 禅人：肉身成佛，以战养战 ============== */
    zen: {
      id: 'zen',
      name: '禅人',
      role: 'defense',
      roleDesc: '防御 · 续航 —— 兽血护身，低血反攻',
      img: 'assets/img/nations/prof-zen.jpg',
      tag: '近身肉搏 · 肉身成圣',
      story: '你在战火焦土中被一位云游僧人拾回少林一脉。师父只教你一件事——「以身饲虎」。你便以骨肉为鼎，以拳风为火，把每一次跌倒都炼成不动明王，把每一道伤口都刻成金刚伏魔印。山河破碎处，你是那尊不退的怒目金刚。',
      origin: '久远劫前，有一位王子舍弃王位，入山见一饿虎将食其子，便以身饲虎，白骨饲虎、血肉饲鸦，独剩一张皮囊亦以天火烧化。虎饱而伏，其骨竟凝成舍利——这便是「禅人」一脉的来历：肉身是鼎，苦难是火，把能舍的都舍尽，剩下的便是佛。后世禅人不修经文，只修一口气：挨过多少拳，就立得住多少桩；渡得过自己，才谈得上渡众生。相传开派祖师「燃灯僧」曾以肉身挡下穷奇一爪，血染三山，那一爪之痕至今仍刻在少室山壁，凡禅人入门，必先观此痕。',
      evoImg: 'assets/img/professions/prof-zen-evo.jpg',
      evoName: '禅师',
      evoStory: '当你将如来佛祖供奉至圆满，你体内的兽血与佛性刹那交融——你即是佛，佛即是你。金身不坏，万法不侵；一掌落则群邪碎，一念起则众生渡。你不再是苦行的禅人，而是「佛门传法」的禅师：怒目降魔，低眉渡世，一动一静皆是普度。',
      element: '禅',
      life: 1.20, mp: 0.65, atk: 1.10, def: 1.15,
      mainSkill: '易筋经',
      mainSkillDesc: '生命上限+15%，格挡判定窗口+0.05秒',
      skills: [
        { id:'claw',           name:'裂空爪', type:'basic', element:'金', power:1.15, cd:0, mp:0,  desc:'三段近战，第三段破甲5%', armorBreak: 0.05 },
        { id:'zen_fire',       name:'金刚焚身', type:'skill', element:'火', power:1.5, cd:3, mp:8,  desc:'燃烧气血换取爆发，自损5%并进入【焚身】增伤', burn: 1, selfDmgPct: 0.05, atkSelf: { name:'焚身', turns:1, mul:0.15 } },
        { id:'zen_iron',       name:'铁壁震击', type:'skill', element:'土', power:1.3, cd:3, mp:12, desc:'重锤震地，【震伤】破甲10%', armorBreak: 0.1 },
        { id:'zen_blood',      name:'兽血沸腾', type:'skill', element:'禅', power:1.0, cd:4, mp:15, desc:'激发兽血，攻速+30%、吸血25%，持续3回合', leech: 0.25, atkSelf: { name:'兽血沸腾', turns:3, mul:0.15 } },
        { id:'zen_lei',        name:'金刚怒雷', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'怒目一吼，引动天雷，【麻痹】1回合', paralyze: 1 },
        { id:'zen_feng',       name:'疾风步', type:'skill', element:'风', power:1.1, cd:3, mp:10, desc:'身如疾风，闪避+30%持续2回合', dodgeSelf: { name:'疾风步', turns:2, mul:0.3 } },
        { id:'zen_shui',       name:'流水拳', type:'skill', element:'水', power:1.2, cd:2, mp:10, desc:'拳势连绵如水，吸血15%', leech: 0.15 },
        { id:'zen_mu',         name:'枯木缠', type:'skill', element:'木', power:1.2, cd:3, mp:12, desc:'以木缚敌，【缠绕】2回合', bind: true },
        { id:'zen_merge',      name:'人兽同契', type:'ultimate', element:'禅', power:2.5, cd:0, mp:45, require:'fullBar', desc:'化作战灵形态，攻击+25%、防御+25%持续2回合', atkSelf: { name:'战灵', turns:2, mul:0.25 }, defSelf: { name:'战灵', turns:2, mul:0.25 } },
        { id:'zen_block',      name:'铁壁格挡', type:'block', element:'土', power:0.5, cd:2, desc:'精准格挡，弹反敌方攻击' }
      ],
      passive: { name:'兽血', desc:'生命低于30%自动触发【兽血沸腾】，内置CD', eff: { type:'lowHpBuff', threshold:0.3, buff:{ name:'兽血沸腾', good:true, turns:3 } } },
      skillIntro: '禅人不修经文，只修一口气。以肉身作鼎，以拳风为火，越战越勇——「金刚焚身」燃血换爆发、「兽血沸腾」越伤越狂、「铁壁震击」震裂金身、「流水拳」绵里藏针。生死之间，禅人始终立得住那一桩；奥义「人兽同契」化作战灵形态，攻防暴涨，是"肉身成圣"四个字的极致。',
      evoSkills: [
        { name:'万佛朝宗', type:'skill', element:'禅', power:2.8, cd:0, mp:45, stun: 1, desc:'万佛金身齐诵，威力 280% 并【眩晕】1回合' },
        { name:'金身不坏', type:'skill', element:'土', power:0, cd:4, mp:20, reduceSelf: { name:'金身', turns:3, mul:0.35 }, desc:'罗汉金身护体，减伤 35% 持续 3 回合' },
        { name:'一苇渡江', type:'skill', element:'风', power:2.0, cd:3, mp:22, dodgeSelf: { name:'一苇', turns:2, mul:0.3 }, desc:'身若苇叶随风渡，威力 200% 并闪避+30%' }
      ]
    },

    /* ============== 儒生：浩然正气，言出法随 ============== */
    confucian: {
      id: 'confucian',
      name: '儒生',
      role: 'attack',
      roleDesc: '攻击 · 元素 —— 亲和万法，元素克制',
      img: 'assets/img/nations/prof-confucian.jpg',
      tag: '远程AOE · 言灵镇邪',
      story: '你出身齐鲁书香门第，幼承庭训，七岁能诗，十二岁通六经。笔下的每一个字都带着文曲星光，开口便如春风化雨，落笔即是天地文章。你不信神佛不信命，只信那一句"为天地立心，为生民立命"——山海纵有千妖万邪，也抵不过你胸中一口浩然气。',
      origin: '三千年前，杏坛之上一位布衣老者对三千弟子说：「志士仁人，无求生以害仁，有杀身以成仁。」言罢，天地间一缕浩然气自他胸中腾起，化作金色文字列于长空，妖邪望之而退——这便是儒生一脉的起源：言出法随，字可镇邪。老者周游列国时，将「仁」字写进荒庙、将「义」字刻进碑林，身后弟子散作七十二家。儒生不拜神佛，拜的是心中那个「理」；不信天命，信的是「为生民立命」六个字。相传第一位儒生是个守夜更夫，目不识丁，却用一声「天地有正气」喝退过整支阴兵。',
      evoImg: 'assets/img/professions/prof-confucian-evo.jpg',
      evoName: '大儒',
      evoStory: '当你将至圣先师供奉至圆满，杏坛之上浮现出孔圣真身——他将竹简递到你手中："文以载道，字可镇山河。"你不再是提笔的书生，而是「代圣立言」的大儒：每一个字都化作金色飞剑，每一句教化皆为天地法则。文脉所及，万邪退避；落笔之处，秩序重立。',
      element: '儒',
      life: 0.75, mp: 1.30, atk: 1.10, def: 0.70,
      mainSkill: '浩然气',
      mainSkillDesc: '元素伤害+12%，言灵技能CD-10%',
      skills: [
        { id:'bullet',         name:'灵弹',   type:'basic', element:'金', power:1.0, cd:0, mp:0,  desc:'三段元素飞弹，溅射30%' },
        { id:'ru_shui',        name:'砚海凝冰', type:'skill', element:'水', power:1.3, cd:2, mp:10, desc:'以墨凝冰，【冻结】1回合', freeze: 1 },
        { id:'ru_lei',         name:'风雷言', type:'skill', element:'风', power:1.5, cd:3, mp:14, desc:'言出法随，风雷连击并【减速】10%', slow: 0.1 },
        { id:'ru_mu',          name:'文木生辉', type:'skill', element:'木', power:1.2, cd:3, mp:12, desc:'浩然正气化作藤蔓，【缠绕】并吸血15%', bind: true, leech: 0.15 },
        { id:'ru_jin',         name:'金口玉言', type:'skill', element:'金', power:1.5, cd:3, mp:14, desc:'一字镇邪，破甲15%', armorBreak: 0.15 },
        { id:'ru_huo',         name:'怒火书', type:'skill', element:'火', power:1.3, cd:2, mp:12, desc:'以文载火，【灼烧】2回合', burn: 2 },
        { id:'ru_tu',          name:'厚土赋', type:'skill', element:'土', power:1.2, cd:4, mp:14, desc:'颂厚土之德，自身减伤20%持续2回合', reduceSelf: { name:'厚土', turns:2, mul:0.2 } },
        { id:'ru_tianfa',      name:'天罚·兽临', type:'ultimate', element:'雷', power:2.4, cd:0, mp:50, require:'fullBar', desc:'召唤巨型灵宠虚影降下陨石雨，并【眩晕】1回合', stun: 1 },
        { id:'ru_dash',        name:'元素遁', type:'dodge', element:'水', power:0.5, cd:3, sta:20, desc:'化为元素位移，闪避攻击并留下元素效果' }
      ],
      passive: { name:'元素亲和', desc:'元素伤害+8%，释放不同元素技能后叠加【元素共鸣】', eff: { type:'elementDmg', mul:0.08 } },
      skillIntro: '儒生以言入道、以字为剑，笔下千字皆可化形——「砚海凝冰」以墨成冰、「风雷言」言出风雷、「文木生辉」字化藤蔓、「金口玉言」一字镇邪、「怒火书」文以载火。浩然正气盈于胸，亲和万法元素；奥义「天罚·兽临」召灵兽虚影降下陨石雨，一字落定山河。',
      evoSkills: [
        { name:'圣言镇世', type:'skill', element:'儒', power:2.6, cd:0, mp:45, charm: 1, desc:'言出法随，威力 260% 并【魅惑】1回合' },
        { name:'文载山河', type:'skill', element:'土', power:0, cd:4, mp:20, reduceSelf: { name:'文载', turns:3, mul:0.3 }, desc:'以文章为盾，减伤 30% 持续 3 回合' },
        { name:'杏坛授业', type:'skill', element:'道', power:2.2, cd:3, mp:24, healSelf: 0.2, desc:'杏坛法相展开，威力 220% 并恢复 20% 生命' }
      ]
    }
  };

  /* ---------- 五行元素克制表（策划案第7.1条） ---------- */
  const ELEMENT_MAP = {
    // 属性: {克制, 被克}
    '火': { beat: ['金', '木', '冰'], lose: ['水', '土'] },
    '水': { beat: ['火', '土'],       lose: ['木', '雷'] },
    '金': { beat: ['木', '冰'],       lose: ['火'] },
    '木': { beat: ['土', '水'],       lose: ['金', '风'] },
    '土': { beat: ['水', '雷'],       lose: ['木'] },
    '风': { beat: ['木', '云'],       lose: ['火'] },
    '雷': { beat: ['水', '音'],       lose: ['土'] },
    '冰': { beat: ['火', '土'],       lose: ['金', '风'] },
    '魂': { beat: ['音', '云'],       lose: ['道', '禅'] },
    '音': { beat: ['风', '魂'],       lose: ['雷', '土'] },
    '云': { beat: ['土', '水'],       lose: ['风', '雷'] },
    '道': { beat: ['邪', '魔', '魂'], lose: ['邪', '魔'] },
    '禅': { beat: ['魔', '暗', '魂'], lose: ['邪', '暗'] },
    '儒': { beat: ['邪', '暗'],       lose: ['魔', '邪'] },
    '邪': { beat: ['道', '儒'],       lose: ['道', '儒', '禅'] },
    '魔': { beat: ['儒', '音'],       lose: ['禅', '道'] },
    '暗': { beat: ['魂', '音'],       lose: ['禅', '儒', '雷'] },
    // 隐藏职业专属元素（影刺/狐仙的暗影系、丹道/影刺的毒系）
    '影': { beat: ['魂', '音'],       lose: ['禅', '雷', '道'] },
    '毒': { beat: ['木', '水'],       lose: ['火', '金'] },
    // 四凶专属元素（饕餮/梼杌/混沌），正道（道/禅/儒）克制，形成"问道"主题克制链
    '吞': { beat: ['行', '木'],       lose: ['道', '禅'] },
    '行': { beat: ['土', '云'],       lose: ['封', '雷'] },
    '封': { beat: ['行', '音'],       lose: ['道', '儒'] }
  };

  global.PROFESSIONS = PROFESSIONS;
  global.ELEMENT_MAP = ELEMENT_MAP;
})(window);