/* ===========================================================
 * 问道山海 · 灵宠数据
 * 来源：策划案第8章
 * 品质：N凡兽/R灵兽/SR珍兽/SSR神兽/UR上古异兽
 * =========================================================== */
(function (global) {
  'use strict';

  // 灵宠种族系数（策划案附录B）
  const PET_RACE = {
    tank:   { name:'肉盾型', life:1.20, atk:0.60, def:1.20 },
    dps:    { name:'输出型', life:0.70, atk:1.00, def:0.55 },
    burst:  { name:'爆发型', life:0.60, atk:1.15, def:0.50 },
    support:{ name:'辅助型', life:0.85, atk:0.50, def:0.80 },
    control:{ name:'控制型', life:0.80, atk:0.75, def:0.70 },
    func:   { name:'功能型', life:0.65, atk:0.45, def:0.55 },
    mobile: { name:'机动型', life:0.75, atk:0.85, def:0.60 }
  };

  // 契约继承系数（策划案第8.3条）
  const CONTRACT = {
    temp:   { name:'临时契约',  inherits: 0.50 },
    equal:  { name:'平等契约',  inherits: 1.00 },
    partner:{ name:'伙伴契约',  inherits: 1.50 },
    benming:{ name:'本命契约',  inherits: 2.00 }
  };

  // 进化阶段系数（策划案第8.4条·品质分级进化，回报更明显）
  const EVO_STAGE = {
    init:    { name:'初始', coeff: 1.0  },
    first:   { name:'一阶', coeff: 1.5  },
    final:   { name:'终极', coeff: 2.4  },
    hidden:  { name:'隐藏', coeff: 3.0  }
  };

  // 灵宠图鉴（核心几只，示范数据）
  const PETS = [
    {
      id: 'rongrong', name: '绒绒兔', quality: 'N', race: 'support',
      element: '冰', color: '#c9d8e8', nationPrefix: 'C',
      img: 'assets/img/pets/pet-rongrong.jpg',
      desc: '青丘桃林野生的小兔灵，温顺治愈。',
      skill: { name: '月辉', power: 0.8, type: 'heal', desc: '为主人恢复生命', element: '冰' },
      skill2: { name: '绒绒冲撞', power: 1.1, type: 'attack', desc: '冰属性冲撞并减速', element: '冰' },
      evoLine: ['绒绒兔', '月影灵兔', '太阴玉兔', '混沌月兔'],
      matPerStage: 1
    },
    {
      id: 'xuanhuo', name: '玄火蛇', quality: 'N', race: 'burst',
      element: '火', color: '#e8a13d', nationPrefix: 'YH',
      img: 'assets/img/pets/pet-xuanhuo.jpg',
      desc: '厌火国火山口的小蛇灵，爆发凶猛。',
      skill: { name: '火牙', power: 1.3, type: 'attack', desc: '火属性咬噬并灼烧', element: '火' },
      skill2: { name: '熔岩遁', power: 0.9, type: 'dodge', desc: '位移并附带火伤', element: '火' },
      evoLine: ['玄火蛇', '赤焰蛟', '九霄烛龙', '混沌烛龙'],
      matPerStage: 1
    },
    {
      id: 'yinyin', name: '阴阳鱼', quality: 'R', race: 'support',
      element: '水', color: '#5a8fb0', nationPrefix: 'XG',
      img: 'assets/img/pets/pet-yinyin.jpg',
      desc: '玄股国水神的遗泽，阴阳相济。',
      skill: { name: '净水', power: 0.9, type: 'heal', desc: '恢复并净化负面状态', element: '水' },
      skill2: { name: '逆鳞潮', power: 1.2, type: 'attack', desc: '水系冲击', element: '水' },
      evoLine: ['阴阳鱼', '双生灵鱼', '阴阳真龙', '两仪圣兽'],
      matPerStage: 1
    },
    {
      id: 'huangdi', name: '黄帝剑灵', quality: 'SR', race: 'dps',
      element: '金', color: '#d8c24a', nationPrefix: 'JG',
      img: 'assets/img/pets/pet-huangdi.jpg',
      desc: '轩辕国隐藏的人形兵器，剑气凛然。',
      skill: { name: '剑气', power: 1.4, type: 'attack', desc: '穿透高暴击', element: '金' },
      skill2: { name: '御剑', power: 1.1, type: 'dodge', desc: '飞行位移', element: '金' },
      evoLine: ['黄帝剑灵', '剑灵使', '人形兵器', '轩辕圣剑'],
      matPerStage: 1
    },
    {
      id: 'cangqiong', name: '风隼·苍穹', quality: 'SR', race: 'mobile',
      element: '风', color: '#7cc4d8', nationPrefix: 'FS',
      img: 'assets/img/pets/pet-cangqiong.jpg',
      desc: '羽民国的「风灵之眼」，见证风灵通道建造的老风隼。',
      skill: { name: '风刃', power: 1.3, type: 'attack', desc: '风属性撕裂攻击', element: '风' },
      skill2: { name: '蚀风遁', power: 0.9, type: 'dodge', desc: '在蚀风中灵活穿梭', element: '风' },
      evoLine: ['风隼·苍穹', '灵羽风隼', '风灵之眼', '御风神隼'],
      matPerStage: 1
    },
    {
      id: 'fengling', name: '风灵雏鸟', quality: 'R', race: 'support',
      element: '风', color: '#a8d8e8', nationPrefix: 'FS',
      img: 'assets/img/pets/pet-fengling.jpg',
      desc: '净化后的风眼孕育的初生风灵，温顺机敏。',
      skill: { name: '风息', power: 0.8, type: 'heal', desc: '以清风抚平伤口', element: '风' },
      skill2: { name: '气流弹', power: 1.1, type: 'attack', desc: '压缩气流冲击', element: '风' },
      evoLine: ['风灵雏鸟', '风灵使', '风灵祭司', '风灵神祇'],
      matPerStage: 1
    },
    {
      id: 'baigi', name: '渊鸣鲸·白鳍', quality: 'SR', race: 'tank',
      element: '水', color: '#5a9fd0', nationPrefix: 'HT',
      img: 'assets/img/pets/pet-baigi.jpg',
      desc: '讙头国鸣海的「活灯塔」，五百年未开口的年迈渊鸣鲸。',
      skill: { name: '渊鸣', power: 0.9, type: 'heal', desc: '以低频声波安抚主人', element: '水' },
      skill2: { name: '潮涌', power: 1.3, type: 'attack', desc: '掀起巨浪冲击敌人', element: '水' },
      evoLine: ['渊鸣鲸·白鳍', '渊灵鲸', '北海鲸王', '禺强鲸神'],
      matPerStage: 1
    },
    {
      id: 'jingling', name: '魂镜之灵·镜虚', quality: 'SR', race: 'control',
      element: '魂', color: '#9a8fc0', nationPrefix: 'SS',
      img: 'assets/img/pets/pet-jingling.jpg',
      desc: '三首国最伟大的魂师镜虚，以自身为镜镇魂井后化作的灵体。',
      skill: { name: '魂镜', power: 0.9, type: 'control', desc: '反射敌人技能并减速', element: '魂' },
      skill2: { name: '魂识冲击', power: 1.2, type: 'attack', desc: '魂属性精神冲击', element: '魂' },
      evoLine: ['魂镜之灵·镜虚', '魂镜灵使', '魂镜祭司', '三首魂神'],
      matPerStage: 1
    },
    {
      id: 'jinqi', name: '振翅蝶·金铃', quality: 'SR', race: 'support',
      element: '音', color: '#e0c06a', nationPrefix: 'NE',
      img: 'assets/img/pets/pet-zhenchi.jpg',
      desc: '聂耳国峡谷孕育的精灵，振翅声如金铃，可抚平杂音。',
      skill: { name: '金铃', power: 0.9, type: 'heal', desc: '以清音抚平创伤', element: '音' },
      skill2: { name: '振翅音刃', power: 1.2, type: 'attack', desc: '高速振翅发出音刃', element: '音' },
      evoLine: ['振翅蝶·金铃', '鸣蝶', '天听蝶灵', '万籁蝶神'],
      matPerStage: 1
    },
    {
      id: 'yunku', name: '云鲲·云浮', quality: 'UR', race: 'tank',
      element: '云', color: '#c8d8e8', nationPrefix: 'DR',
      img: 'assets/img/pets/pet-yunku.jpg',
      desc: '大人国云海孕育的巨型大气生物，身由云气构成，可承载重物飞行。',
      skill: { name: '云御', power: 0.9, type: 'shield', desc: '以云气护体减伤', element: '云' },
      skill2: { name: '云啸', power: 1.3, type: 'attack', desc: '卷起云气冲击敌人', element: '云' },
      evoLine: ['云鲲·云浮', '云灵鲲', '云海鲲王', '九天鲲神'],
      matPerStage: 1
    },
    {
      id: 'wenyao', name: '文鳐', quality: 'SR', race: 'support',
      element: '水', color: '#7ac0d8', nationPrefix: 'BM',
      img: 'assets/img/pets/pet-wenyao.jpg',
      desc: '白民国万兽原觉醒的灵兽，鱼身鸟翼，其声如鸾鸣，可唤风雨。',
      skill: { name: '灵雨', power: 0.9, type: 'heal', desc: '以灵雨滋润主人', element: '水' },
      skill2: { name: '翼风', power: 1.2, type: 'attack', desc: '振翼卷起水风冲击', element: '水' },
      evoLine: ['文鳐', '灵文鳐', '文鳐神', '万灵文鳐'],
      matPerStage: 1
    }
  ];

  global.PETS = PETS;
  global.PET_RACE = PET_RACE;
  global.CONTRACT = CONTRACT;
  global.EVO_STAGE = EVO_STAGE;
})(window);