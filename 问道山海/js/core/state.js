/* ===========================================================
 * 问道山海 · 玩家状态管理
 * 管理：基础属性、职业、境界、命格、进度、恶念值
 * =========================================================== */
(function (global) {
  'use strict';

  // 职业数据统一从 professions.js（global.PROFESSIONS）读取，避免双源不一致
  // 若 professions.js 未加载，回退到内置默认值
  const PROFESSION_DATA = {
    tao:        { id:'tao',        name:'道徒', life:0.90, mp:1.20, atk:0.95, def:0.85, mainSkill:'黄庭经' },
    zen:        { id:'zen',        name:'禅人', life:1.15, mp:0.70, atk:1.10, def:1.05, mainSkill:'易筋经' },
    confucian:  { id:'confucian',  name:'儒生', life:0.80, mp:1.30, atk:1.00, def:0.75, mainSkill:'浩然气' }
  };

  /** 从 professions.js 合并系数（professions.js 为唯一权威数据源）；隐藏职业从 getHiddenProfessions() 读取 */
  function resolveProf(profId) {
    const fallback = PROFESSION_DATA[profId] || PROFESSION_DATA.tao;
    let p = (global.PROFESSIONS && global.PROFESSIONS[profId]) || null;
    // 隐藏职业（影刺/剑修/丹道/灵符等）不在 PROFESSIONS 中，需查隐藏职业表
    if (!p && typeof STATE !== 'undefined' && STATE.getHiddenProfessions) {
      p = STATE.getHiddenProfessions()[profId] || null;
    }
    if (!p) p = fallback;
    return {
      id: profId,
      name: p.name || fallback.name,
      life: p.life || fallback.life,
      mp: p.mp || fallback.mp,
      atk: p.atk || fallback.atk,
      def: p.def || fallback.def,
      mainSkill: p.mainSkill || fallback.mainSkill
    };
  }

  const STATE = {
    /** 当前玩家完整状态 */
    player: null,

    /** 默认初始状态工厂（difficulty: 'easy'|'normal'|'hard'） */
    create(profId, difficulty, name) {
      const prof = resolveProf(profId);
      const baseLife = 940;   // 50级基准，按策划附录A：道徒 846 ≈ (10+50*2)*50 * 0.90 / 50
      const baseMp   = 940;
      const baseAtk  = 130;
      const baseDef  = 55;

      // 难度系数（五档，作用于敌方数值）：
      //   easy 闲庭 0.5 / normal 入道 0.8 / hard 修行 1.0 / harder 逆天 1.5 / hell 炼狱 2.0
      const diffMul = (difficulty === 'easy') ? 0.5
        : (difficulty === 'normal') ? 0.8
        : (difficulty === 'hard') ? 1.0
        : (difficulty === 'harder') ? 1.5
        : (difficulty === 'hell') ? 2.0
        : 1.0;
      return {
        // —— 身份 ——
        name: (name && String(name).trim()) || '求道者',
        profession: prof.id,
        professionName: prof.name,
        mainSkill: prof.mainSkill,
        difficulty: difficulty || 'normal',   // 游戏难度
        diffMul: diffMul,                     // 难度系数（用于敌方数值缩放）
        round: 1,                             // 当前周目（多周目继承，新开档从 legacy 读取）

        // —— 五枚命格 ——
        mingshen: [],   // [{pool,name,desc,mod}]
        background: '', // 玩家输入的背景

        // —— 境界（炼气/筑基/金丹/元婴/化神/渡劫/飞升） ——
        realm: { name:'炼气期', level:1, exp:0, expMax:100, round:0 },

        // —— 自由行动资源（时辰=行动点，每日上限） ——
        shichen: 6,        // 今日剩余时辰（行动点）
        shichenMax: 6,
        day: 1,            // 第几日
        cultivateCount: 0, // 本日修炼次数（上限）

        // —— 基础属性 ——
        lv: 1,
        baseLife, baseMp, baseAtk, baseDef,
        hp: Math.floor(baseLife * prof.life),
        mp: Math.floor(baseMp * prof.mp),

        // —— 派生系数 ——
        coeff: { life: prof.life, mp: prof.mp, atk: prof.atk, def: prof.def },

        // —— 进度 ——
        nation: null,           // 当前所在国
        currentScene: null,     // 当前场景ID
        completed: new Set(),   // 已完成任务ID
        unlocked: new Set(),    // 已解锁内容

        // —— 道德 ——
        evil: 0,    // 全局恶念值 0-100
        nationEvil: { qingqiu:0, yumin:0, yanhuo:0, xuanyuan:0, xuangu:0, huantou:0, sanshou:0, nieer:0, daren:0, baimin:0, changgu:0, zhurao:0, jiaojing:0, rouli:0, shenmu:0, wuchang:0, yimu:0, jiexiong:0, qizhong:0, guixu:0 },   // 各国家恶念值

        // —— 好感度（简单版：关键NPC，0-100） ——
        favor: {},              // { npcKey: 0-100 }，如 yunYao / fengLie / yiLao / xiaoLing

        // —— 物品 ——
        materials: {},          // 灵材 {matId: count}
        gold: 0,

        // —— 灵宠 ——
        pets: [],

        // —— 出战技能配置（奥义/普攻必带，其余主动自选4个；未配置前显示全部技能） ——
        skillLoadout: { actives: [], passive: null },

        // —— 供奉（未供奉任何神明） ——
        offerGod: null,
        offerValue: 0,

        // —— 四凶终章进度 ——
        fourFierceStage: 0,

        // —— 成就系统 ——
        achievements: [],
        redeemCodes: [],   // 已兑换的兑换码（按存档隔离，如 'hongri'）
        drawChances: 0,    // 命格抽取机会（成就/任务奖励，用于命格局外成长）
        // —— 每日修行目标 ——
        daily: { date: 1, explore: 0, battle: 0, cultivate: 0, fumo: 0, claimed: [] },
        dailyStreak: 0,   // 连续完成全部每日目标的修行连击天数（成长复利，跨日累计）
        // —— 每周任务统计（跨存档汇总用，键为 ISO 周标识） ——
        weeklyTrack: { weekKey: '', battles: 0, cultivate: 0, explore: 0 },
        // —— 灵宠图鉴 ——
        petDex: [],
        _battleWins: 0,
        _battleLoses: 0,
        _exploreTimes: 0,
        _fumoTimes: 0,
        _nationsCleared: 0,

        // —— 战斗属性（运行时） ——
        debuffs: [],
        buffs: [],

        // —— 时间戳（存档） ——
        createdAt: Date.now(),
        playtime: 0
      };
    },

    /* ============== 多周目继承（局外成长） ============== */
    _legacyKey: 'wenda-shanhai-legacy',
    /** 读取全局继承池（跨存档） */
    getLegacy() {
      try {
        const raw = localStorage.getItem(STATE._legacyKey);
        if (!raw) return { round: 0, petDex: [], drawChances: 0, blueprints: [], endings: [], points: 0, tree: [] };
        const obj = JSON.parse(raw);
        return {
          round: obj.round || 0,
          petDex: obj.petDex || [],
          drawChances: obj.drawChances || 0,
          blueprints: obj.blueprints || [],
          endings: obj.endings || [],
          points: obj.points || 0,     // V1.3.19：传承点（通关一国 +1）
          tree: obj.tree || []         // V1.3.19：已解锁的传承节点
        };
      } catch (e) {
        return { round: 0, petDex: [], drawChances: 0, blueprints: [], endings: [], points: 0, tree: [] };
      }
    },
    /** 保存全局继承池（通关时调用） */
    saveLegacy(legacy) {
      try {
        localStorage.setItem(STATE._legacyKey, JSON.stringify(legacy));
      } catch (e) {}
    },
    /** 通关时更新继承池：吸收当前存档的图鉴/抽命格/图纸/结局 */
    recordLegacyOnClear(p, endingId) {
      const legacy = STATE.getLegacy();
      legacy.round = (legacy.round || 0) + 1;
      // 图鉴合并（曾拥有过的宠物在新周目继承点亮）
      (p.petDex || []).forEach(id => { if (legacy.petDex.indexOf(id) < 0) legacy.petDex.push(id); });
      // 抽命格次数继承（剩余次数转入新周目）
      legacy.drawChances += (p.drawChances || 0);
      // 图纸继承（已解锁的职业传承图纸）
      (Array.from(p.unlocked || [])).forEach(k => {
        if (k.indexOf('BLUE') === 0 || k.indexOf('blue') === 0 || k.indexOf('zhitu') >= 0) {
          if (legacy.blueprints.indexOf(k) < 0) legacy.blueprints.push(k);
        }
      });
      // 结局记录（收集多结局）
      if (endingId && legacy.endings.indexOf(endingId) < 0) legacy.endings.push(endingId);
      // V1.3.19：每通关一次，传承点 +1（跨周目可解锁传承树全局被动）
      legacy.points = (legacy.points || 0) + 1;
      legacy.tree = legacy.tree || [];
      STATE.saveLegacy(legacy);
      return legacy;
    },

    /* ============== V1.3.19 传承树（跨周目全局被动） ============== */
    legacyTreeDefs() {
      return [
        { id:'legacy_atk',  name:'传承·锋锐', desc:'开局攻击 +5%', cost:1, icon:'⚔️' },
        { id:'legacy_gold', name:'传承·福泽', desc:'开局金币 +200', cost:1, icon:'💰' },
        { id:'legacy_seed', name:'传承·药圃', desc:'开局灵种 ×3（天香草/朱果）', cost:1, icon:'🌱' },
        { id:'legacy_mat',  name:'传承·药藏', desc:'开局上品灵材【千年灵木】×1', cost:2, icon:'🧪' },
        { id:'legacy_pet',  name:'传承·御灵', desc:'开局随机点亮 1 只灵宠图鉴', cost:2, icon:'🐾' },
        { id:'legacy_gold2', name:'传承·富可敌国', desc:'开局金币 +300（需先解锁【传承·福泽】）', cost:3, icon:'👑', require:'legacy_gold' }
      ];
    },
    legacyInfo() {
      const legacy = STATE.getLegacy();
      return { pts: legacy.points || 0, ids: legacy.tree || [], defs: STATE.legacyTreeDefs() };
    },
    unlockLegacyNode(nodeId) {
      const legacy = STATE.getLegacy();
      legacy.points = legacy.points || 0;
      legacy.tree = legacy.tree || [];
      if (legacy.tree.indexOf(nodeId) >= 0) return { ok: false, reason: '已解锁' };
      const node = STATE.legacyTreeDefs().find(n => n.id === nodeId);
      if (!node) return { ok: false, reason: '节点不存在' };
      if (node.require && legacy.tree.indexOf(node.require) < 0) return { ok: false, reason: '需先解锁' + (STATE.legacyTreeDefs().find(n => n.id === node.require) || { name: node.require }).name };
      if (legacy.points < node.cost) return { ok: false, reason: '传承点不足（需 ' + node.cost + '）' };
      legacy.points -= node.cost;
      legacy.tree.push(nodeId);
      STATE.saveLegacy(legacy);
      return { ok: true, node };
    },
    /** 通关统计（用于结局展示"这一程你走了多远"） */
    clearStats(p) {
      return {
        day: p.day || 1,
        lv: p.lv || 1,
        realm: (p.realm && p.realm.name) || '炼气期',
        evil: p.evil || 0,
        evilLabel: (p.evil || 0) >= 80 ? '一念成魔' : ((p.evil || 0) >= 50 ? '亦正亦邪' : ((p.evil || 0) <= 5 ? '一念成神' : '道心尚稳')),
        battles: (p._battleWins || 0),
        loses: (p._battleLoses || 0),
        explore: (p._exploreTimes || 0),
        fumo: (p._fumoTimes || 0),
        pets: (p.pets || []).length,
        petDex: (p.petDex || []).length,
        achievements: (p.achievements || []).length
      };
    },

    /** 新开档时应用继承：注入图鉴点亮 + 抽命格次数 + 周目标记 */
    applyLegacy(p) {
      const legacy = STATE.getLegacy();
      p.round = (legacy.round || 0) + 1;
      // 继承图鉴点亮（不继承宠物实例，仅点亮图鉴，供「继承」按钮重新召唤）
      p.petDex = (p.petDex || []).slice();
      (legacy.petDex || []).forEach(id => { if (p.petDex.indexOf(id) < 0) p.petDex.push(id); });
      // 继承抽命格次数
      p.drawChances = (p.drawChances || 0) + (legacy.drawChances || 0);
      // 继承图纸
      (legacy.blueprints || []).forEach(k => { p.unlocked.add(k); });
      // —— 多周目差异化：通关归来，前世积累化作此世助益（周目越高，开局越丰） ——
      if (p.round >= 2) {
        p.gold = (p.gold || 0) + 200;
        STATE.addMaterial(p, 'SEED-G01', 2);   // 天香草种（灵圃开局即可体验稀有灵材种植）
        STATE.addMaterial(p, 'SEED-C01', 3);
      }
      if (p.round >= 3) {
        p.gold = (p.gold || 0) + 300;
        STATE.addMaterial(p, 'SEED-G07', 1);   // 影心草种（SSR 稀有）
        STATE.addMaterial(p, 'MAT-INCENSE1', 2);
      }
      if (p.round >= 4) {
        p.gold = (p.gold || 0) + 500;
        STATE.addMaterial(p, 'SEED-G09', 1);   // 九叶菩提种（UR 传说）
        p.drawChances = (p.drawChances || 0) + 2;
      }
      // —— V1.3.19 传承树：跨周目全局被动，读档/新档均生效 ——
      const tree = legacy.tree || [];
      const has = (id) => tree.indexOf(id) >= 0;
      if (has('legacy_atk')) p.baseAtk = Math.floor(p.baseAtk * 1.05);          // 锋锐：攻击 +5%
      if (has('legacy_gold')) p.gold = (p.gold || 0) + 200;                     // 福泽：金币 +200
      if (has('legacy_gold2')) p.gold = (p.gold || 0) + 300;                    // 富可敌国：金币 +300
      if (has('legacy_seed')) { STATE.addMaterial(p, 'SEED-G01', 1); STATE.addMaterial(p, 'SEED-C01', 2); }  // 药圃：灵种×3
      if (has('legacy_mat')) STATE.addMaterial(p, 'MAT-E17', 1);                // 药藏：千年灵木
      if (has('legacy_pet')) {                                                  // 御灵：随机点亮灵宠图鉴
        try {
          const pool = global.PETS || [];
          if (pool.length) {
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick && pick.id && p.petDex.indexOf(pick.id) < 0) p.petDex.push(pick.id);
          }
        } catch (e) {}
      }
      return legacy;
    },

    /** 计算当前实际生命/灵力上限（含境界、命格、buff） */
    calcMaxHp(p) {
      // 消费命格加成：life（生命上限）、tuling/hunyuan（全属性）
      const lifeBonus = STATE.mingshenBonus(p, 'life');
      const allBonus = STATE.mingshenBonus(p, 'all');
      const offerLife = (p && p._offerLifeBonus) ? p._offerLifeBonus : 0;
      const evoBonus = STATE.evolutionBonus(p);
      // 天级角色专属剧情奖励：战斗属性提升（生命加成）
      const battleLife = (p && p.charBattleBonus && p.charBattleBonus.life) || 0;
      // 挑战锻造装备生命加成（V1.3.9：仅挑战模式玩家带该字段，剧情模式完全不受影响）
      const gearLife = (p && p._challengeGearHp) || 0;
      const awakenLife = (p && p._challengeAwakenHp) || 0;
      const towerLife = (p && p._towerBuffHp) || 0;   // V1.3.19：试炼塔 buff
      const base = p.baseLife * p.coeff.life * (1 + 0.1 * (p.lv - 1));
      return Math.floor(base * (1 + lifeBonus + allBonus + offerLife + evoBonus + battleLife + gearLife + awakenLife + towerLife));
    },
    calcMaxMp(p) {
      const allBonus = STATE.mingshenBonus(p, 'all');
      const offerMp = (p && p._offerMpBonus) ? p._offerMpBonus : 0;
      const evoBonus = STATE.evolutionBonus(p);
      const battleMp = (p && p.charBattleBonus && p.charBattleBonus.mp) || 0;
      const base = p.baseMp * p.coeff.mp * (1 + 0.1 * (p.lv - 1));
      return Math.floor(base * (1 + allBonus + offerMp + evoBonus + battleMp));
    },

    /** 命格加成汇总（p 可能为 null/undefined，需空值保护）。命格等级每级提升效果 */
    mingshenBonus(p, key) {
      if (!p || !Array.isArray(p.mingshen)) return 0;
      let bonus = 0;
      for (const m of p.mingshen) {
        if (m && m.mod && typeof m.mod[key] === 'number') {
          // 命格等级：level 1 为基准，每级 +40% 效果
          const lvMul = 1 + ((m.level || 1) - 1) * 0.4;
          bonus += m.mod[key] * lvMul;
        }
      }
      // 命格共鸣（羁绊）加成：凑齐组合即累加对应属性
      const reso = STATE.resonanceInfo(p);
      for (const r of reso) {
        if (r.mod && typeof r.mod[key] === 'number') bonus += r.mod[key];
      }
      return bonus;
    },

    /** 命格共鸣（羁绊）：返回当前已触发的共鸣组合列表 */
    resonanceInfo(p) {
      if (!p || !Array.isArray(p.mingshen)) return [];
      const owned = p.mingshen.map(m => m.id);
      const list = (global.MINGSHEN_RESONANCE || []);
      return list.filter(r => (r.need || []).every(id => owned.indexOf(id) >= 0));
    },

    /* ============== 命格局外成长（重抽 / 升级） ============== */
    /** 重抽第 index 枚命格（花1次抽取机会），返回新命格或 {error} */
    rerollMingshen(p, index) {
      if (!p || !Array.isArray(p.mingshen)) return { error: '无命格' };
      if (index < 0 || index >= p.mingshen.length) return { error: '索引越界' };
      if (!p.drawChances || p.drawChances < 1) return { error: '命格抽取机会不足' };
      // 收集全库（含通用），排除已拥有的命格 id（保持去重）
      const allTags = [];
      for (const k in POOLS) {
        for (const t of POOLS[k].tags) allTags.push({ ...t, pool: k, poolName: POOLS[k].name });
      }
      const usedIds = p.mingshen.filter((m, i) => i !== index).map(m => m.id);
      let pool = allTags.filter(t => usedIds.indexOf(t.id) < 0);
      if (pool.length === 0) return { error: '无可用命格' };
      // 互斥过滤（与保留的命格不冲突）
      pool = pool.filter(t => !usedIds.some(uid =>
        MUTEX.some(pair => (pair[0] === t.id && pair[1] === uid) || (pair[1] === t.id && pair[0] === uid))));
      if (pool.length === 0) pool = allTags.filter(t => usedIds.indexOf(t.id) < 0);
      const pick = RNG.pick(pool);
      p.drawChances -= 1;
      p.mingshen[index] = { ...pick, level: 1 };
      return p.mingshen[index];
    },
    /** 命格 mod key → 中文标签 */
    mingshenModLabel(key) {
      const map = {
        atk:'攻击', def:'防御', life:'生命', crit:'暴击', dodge:'闪避', heal:'治疗',
        gather:'采集', cultivation:'修炼', all:'全属性', fire:'火伤', water:'水伤',
        metal:'金伤', resist:'异常抵抗', armorBreak:'破甲', cdReduce:'冷却缩减',
        sign:'签约', signCost:'契约消耗', dragonMat:'龙系材料', phoenixMat:'凤系进化',
        foxSkill:'幻术', evoMat:'进化材料', evoBoost:'进化强化', mindBoss:'心魔削弱',
        rare:'稀有遭遇', homecoming:'归乡触发', npcFavor:'好感提升', refine:'炼丹成功率',
        mentalResist:'精神抗性', hot:'持续治疗', price:'价格', woodPet:'草木契合',
        event:'事件触发', darkPet:'暗属契合', hidden:'隐藏选项', evilReduce:'恶念降低',
        npcInit:'NPC初始好感'
      };
      return map[key] || key;
    },

    /** 升级第 index 枚命格（花抽取机会），返回新命格或 {error} */
    upgradeMingshen(p, index) {
      if (!p || !Array.isArray(p.mingshen)) return { error: '无命格' };
      const m = p.mingshen[index];
      if (!m) return { error: '索引越界' };
      if (!p.drawChances || p.drawChances < 1) return { error: '命格抽取机会不足' };
      const lv = (m.level || 1);
      if (lv >= 5) return { error: '命格已至圆满（5级）' };
      p.drawChances -= 1;
      m.level = lv + 1;
      return m;
    },

    /** 切换/进入某国时初始化 */
    enterNation(p, nationId) {
      p.nation = nationId;
      if (!p.nationEvil) p.nationEvil = {};
      if (!p.nationEvil.hasOwnProperty(nationId)) p.nationEvil[nationId] = 0;
      if (!p.favor) p.favor = {};
      // 各国入口场景统一为 <国名>_entry（读档恢复用，_00_intro 并不存在）
      p.currentScene = nationId + '_entry';
      // 新手历程：每进一个新国家 +1（不重复：仅在第一次进入时）
      try { if (typeof META !== 'undefined' && META.trackNovice) META.trackNovice('nation', 1); } catch (e) {}
    },

    /** 恶念值变更 */
    addEvil(p, delta, reason) {
      const old = p.evil;
      p.evil = Math.max(0, Math.min(100, p.evil + delta));
      // 全局 → 国家映射（简化：均摊到当前国家）
      if (!p.nationEvil) p.nationEvil = {};
      if (p.nation && p.nationEvil.hasOwnProperty(p.nation)) {
        p.nationEvil[p.nation] = Math.max(0, Math.min(100, p.nationEvil[p.nation] + delta));
      } else if (p.nation) {
        p.nationEvil[p.nation] = Math.max(0, Math.min(100, delta));
      }
      return { old, new: p.evil, delta, reason };
    },

    /** 写入完成的剧情ID */
    completeQuest(p, questId) {
      p.completed.add(questId);
      // 国家通关（_CLEARED）时，自动记录该国结局到跨周目收集（集中式，无需改动各国剧情文件）
      if (questId && questId.indexOf('_CLEARED') >= 0) {
        const nationId = questId.split('_')[0].toLowerCase();
        if (nationId && STATE.nationName(nationId) !== '未知') {
          STATE.recordNationEnding(p, nationId);
        }
      }
    },

    /** 记录某国结局到跨周目收集池（仅追加 endingId，不动 round/图鉴/图纸等其它字段） */
    recordNationEnding(p, nationId) {
      try {
        const legacy = STATE.getLegacy();
        if (!legacy.endings) legacy.endings = [];
        if (legacy.endings.indexOf(nationId) < 0) legacy.endings.push(nationId);
        STATE.saveLegacy(legacy);
      } catch (e) {}
    },

    /* ============== 好感度系统（简单版） ============== */
    /** 变更某NPC好感度（0-100），返回当前值 */
    addFavor(p, npcKey, delta) {
      if (!p) return 0;
      if (!p.favor) p.favor = {};
      const cur = p.favor[npcKey] || 0;
      const next = Math.max(0, Math.min(100, cur + delta));
      p.favor[npcKey] = next;
      return next;
    },
    /** 读取某NPC好感度 */
    getFavor(p, npcKey) {
      if (!p || !p.favor) return 0;
      return p.favor[npcKey] || 0;
    },

    /** 好感度战斗加成：当前国家 NPC 平均好感越高，攻击/防御加成越高（因果反馈） */
    favorBattleBonus(p) {
      if (!p || !p.nation) return { atk: 0, def: 0 };
      const reg = STATE.getFavorRegistry();
      const natFavors = reg.filter(r => r.nation === STATE.nationName(p.nation));
      if (!natFavors.length) return { atk: 0, def: 0 };
      const sum = natFavors.reduce((s, r) => s + STATE.getFavor(p, r.key), 0);
      const avg = sum / natFavors.length;
      // 平均好感 0~100 → 加成 0~10%
      const bonus = Math.min(0.10, (avg / 100) * 0.10);
      return { atk: bonus, def: bonus };
    },

    /** 国家 id → 中文名（好感度战斗加成用） */
    nationName(nationId) {
      const map = { qingqiu:'青丘', yumin:'羽民', yanhuo:'厌火', xuanyuan:'轩辕', xuangu:'玄股', huantou:'讙头', sanshou:'三首', nieer:'聂耳', daren:'大人', baimin:'白民', changgu:'长股', zhurao:'周饶', jiaojing:'交胫', rouli:'柔利', shenmu:'深目', wuchang:'无肠', yimu:'一目', jiexiong:'结胸', qizhong:'跂踵', guixu:'归墟' };
      return map[nationId] || '未知';
    },

    /* ============== 国家主线/支线 + 前置解锁（玩法驱动·自由探索） ============== */
    /**
     * 主线国家：构成四凶主线，必须推进（青丘开端 → 四凶各部位 → 归墟终局）
     * 支线国家：可选探索，不强制通关也能推进主线
     * 划分依据：四凶身体部位对应的国家为主线，独立故事国家为支线
     */
    getNationType(nationId) {
      const mainline = ['qingqiu', 'baimin', 'changgu', 'wuchang', 'nieer', 'jiaojing', 'daren', 'jiexiong', 'qizhong', 'zhurao', 'rouli', 'yimu', 'shenmu', 'guixu'];
      if (mainline.indexOf(nationId) >= 0) return 'main';
      return 'side';   // 支线：yumin/yanhuo/xuanyuan/xuangu/huantou/sanshou
    },

    /** 主线国家名（用于展示） */
    getNationTypeName(nationId) {
      return STATE.getNationType(nationId) === 'main' ? '主线' : '支线';
    },

    /**
     * 前置解锁：特殊国家需先完成某前置国家的主线才能开启。
     * 归墟（终局）需先通关四凶主线；部分支线国需先完成关联主线。
     */
    getNationPrereq(nationId) {
      const map = {
        // 终局国：需通关四凶核心主线
        'guixu': { req: 'qizhong', name: '跂踵', hint: '需先通关跂踵（梼杌·足）主线' },
        // 四凶部位国：按部位顺序，后者需先完成前者（可选，用于引导推进顺序）
        'changgu': { req: 'baimin', name: '白民', hint: '建议先通关白民（饕餮·口）' },
        'wuchang': { req: 'changgu', name: '长股', hint: '建议先通关长股（饕餮·牙）' },
        'jiaojing': { req: 'nieer', name: '聂耳', hint: '建议先通关聂耳（穷奇·耳）' },
        'jiexiong': { req: 'daren', name: '大人', hint: '建议先通关大人（梼杌·骨）' },
        'qizhong':  { req: 'jiexiong', name: '结胸', hint: '建议先通关结胸（梼杌·胸）' },
        'rouli':    { req: 'zhurao', name: '周饶', hint: '建议先通关周饶（混沌·鳞）' },
        'yimu':     { req: 'rouli', name: '柔利', hint: '建议先通关柔利（混沌·尾）' },
        'shenmu':   { req: 'yimu', name: '一目', hint: '建议先通关一目（混沌·目）' }
      };
      return map[nationId] || null;
    },

    /** 返回某国当前剧情场景应找的主线 NPC 名（用于任务栏精确指引） */
    getNationNextNpc(nationId, storyIdx) {
      try {
        if (typeof EXPLORE === 'undefined' || !EXPLORE[nationId] || !EXPLORE[nationId].story) return '主线剧情人物';
        const stArr = EXPLORE[nationId].story;
        const idx = Math.min(storyIdx || 0, stArr.length - 1);
        const scene = stArr[idx];
        if (!scene) return '主线剧情人物';
        const npcs = (scene.npcs || []).filter(n => n.main || !n.ambience);
        if (!npcs.length) return scene.location || '主线剧情人物';
        return npcs[0].name || '主线剧情人物';
      } catch (e) { return '主线剧情人物'; }
    },

    /** 判断国家是否满足前置条件（返回 {ok, hint}） */
    checkNationPrereq(p, nationId) {
      const pre = STATE.getNationPrereq(nationId);
      if (!pre) return { ok: true };
      // 直接用 p.completed 判断前置国家是否通关（避免调用 unlockedNations 造成递归死循环）
      const completedArr = (p && p.completed && p.completed.forEach) ? Array.from(p.completed) : [];
      const upper = { qingqiu:'QINGQIU', yumin:'YUMIN', yanhuo:'YANHUO', xuanyuan:'XUANYUAN', xuangu:'XUANGU', huantou:'HUANTOU', sanshou:'SANSHOU', nieer:'NIEER', daren:'DAREN', baimin:'BAIMIN', changgu:'CHANGGU', zhurao:'ZHURAO', jiaojing:'JIAOJING', rouli:'ROULI', shenmu:'SHENMU', wuchang:'WUCHANG', yimu:'YIMU', jiexiong:'JIEXIONG', qizhong:'QIZHONG', guixu:'GUIXU' };
      const up = upper[pre.req];
      const preCleared = completedArr.some(c => c === (pre.req + '_cleared') || (up && c.indexOf(up + '_') === 0 && c.indexOf('_CLEARED') > 0));
      if (preCleared || p.nation === pre.req) return { ok: true };
      return { ok: false, hint: pre.hint || ('需先通关' + pre.name) };
    },

    /** 各国线索指引（玩家获取线索后，任务栏显示的实际指引） */
    getNationClueHint(p, nationId) {
      const map = {
        qingqiu:  '桃林深处与影狐祭坛间或有异动，白浅可为你引路',
        yumin:    '风灵通道的风眼在云上，云瑶或知前往之法',
        yanhuo:   '永恒熔炉的封印需要「烬婆婆」的灰烬心法',
        xuanyuan: '机关塔核心在城心，公输月可带路',
        xuangu:   '水神封印需「水神之泪」，归墟深处或有线索',
        huantou:  '渊底的哭声来自渊母，潮音知道潜入之路',
        sanshou:  '魂井需要「三念调和」方能净化，明璃可助',
        nieer:    '鸣石之心的缝隙在峡谷深处，弦歌在等待',
        daren:    '擎天柱断口处有夸父的残念，岳山在柱下',
        baimin:   '英招残魂沉睡在万兽原深处，雪翎可同往',
        changgu:  '裂时渊的时光乱流需「时漏」引路',
        zhurao:   '须弥城的无序之源在城顶，芥璃在核心处',
        jiaojing: '命轮织机被穷奇之爪撕破，缠花在织机旁',
        rouli:    '蜕形之源在海中央，缺月知道方向',
        shenmu:   '瞳渊之下有闭合之眼，瞳渊在等待你',
        wuchang:  '吞天釜底刻有「唯情不化」，饥离在釜下',
        yimu:     '独目原深处的铜镜映着天缝，瞳中在镜前',
        jiexiong: '界塔顶端的连脉连向归墟，贯离在塔上',
        qizhong:  '行原尽头的巨脚印藏着方向，行离在脚印旁',
        guixu:    '归墟之扉需要「四凶残片」才能开启'
      };
      return map[nationId] || null;
    },

    /* ============== 国家推荐等级（玩法驱动·大地图软门槛） ============== */
    /**
     * 各国推荐境界与等级。玩家低于推荐可进入（软门槛），但战斗更难；
     * 高于推荐则轻松。卡关时保留进度，可先去别国提升。
     * 推荐等级按剧情推进逐步递增：新手国 → 中阶国 → 高阶国 → 终局。
     */
    getNationRecommend(nationId) {
      const map = {
        qingqiu:  { lv: 3,   realm: '炼气期' },
        yumin:    { lv: 6,   realm: '炼气期' },
        yanhuo:   { lv: 9,   realm: '炼气期' },
        xuanyuan: { lv: 12,  realm: '筑基期' },
        xuangu:   { lv: 16,  realm: '筑基期' },
        huantou:  { lv: 20,  realm: '金丹期' },
        sanshou:  { lv: 25,  realm: '金丹期' },
        nieer:    { lv: 30,  realm: '元婴期' },
        daren:    { lv: 36,  realm: '元婴期' },
        baimin:   { lv: 42,  realm: '元婴期' },
        changgu:  { lv: 48,  realm: '化神期' },
        zhurao:   { lv: 53,  realm: '化神期' },
        jiaojing: { lv: 58,  realm: '化神期' },
        rouli:    { lv: 63,  realm: '渡劫期' },
        shenmu:   { lv: 68,  realm: '渡劫期' },
        wuchang:  { lv: 74,  realm: '渡劫期' },
        yimu:     { lv: 80,  realm: '渡劫期' },
        jiexiong: { lv: 85,  realm: '飞升' },
        qizhong:  { lv: 88,  realm: '飞升' },
        guixu:    { lv: 90,  realm: '飞升' }
      };
      return map[nationId] || { lv: 1, realm: '炼气期' };
    },

    /** 软门槛判定：返回玩家相对某国的等级差与难度提示 */
    getNationDifficulty(p, nationId) {
      const rec = STATE.getNationRecommend(nationId);
      const diff = p.lv - rec.lv;
      if (diff >= 10) return { level:'easy', name:'轻松', diff, color:'#3e8a5a', hint:'你的境界远超此处，可轻松通过' };
      if (diff >= 0)  return { level:'normal', name:'适中', diff, color:'#c8a050', hint:'境界相当，可从容应对' };
      if (diff >= -9) return { level:'hard', name:'艰难', diff, color:'#c87a2a', hint:'境界略逊，战斗将更加艰难' };
      return { level:'deadly', name:'凶险', diff, color:'#c0392b', hint:'境界差距悬殊，九死一生，建议先提升再战' };
    },

    /** 国家材料前缀映射（各国专属灵材前缀） */
    nationPrefixMap() {
      return { qingqiu:'C', yumin:'FS', yanhuo:'YH', xuanyuan:'JG', xuangu:'XG', huantou:'HT', sanshou:'SS', nieer:'NE', daren:'DR', baimin:'BM', changgu:'CG', zhurao:'ZR', jiaojing:'JJ', rouli:'RL', shenmu:'SM', wuchang:'WC', yimu:'YM', jiexiong:'JX', qizhong:'QZ', guixu:'GX' };
    },

    /** 国家可探索材料备注（该国专属灵材 + 四凶碎片 + 原初之X） */
    nationMaterials(nationId) {
      const prefix = STATE.nationPrefixMap()[nationId];
      if (!prefix) return [];
      // 该国专属特色材料：01/05/06/07（含"之精"、四凶碎片等）
      const ids = ['01','05','06','07'];
      return ids.map(i => 'MAT-' + prefix + i).filter(id => STATE.matName(id) !== id);
    },

    /* ============== 常驻任务指引（智能引导） ============== */
    /** 返回当前最该做的事的指引结构 { title, items:[{text, action, target}], primary } */
    getQuestGuide(p) {
      if (!p) return null;
      const items = [];
      let primary = null;   // 主要目标（高亮）

      // 0. 挑战模式：任务面板显示挑战区域/限时/任务进度（优先于一切）
      if (p.challengeId && typeof App !== 'undefined' && App && typeof App.buildChallengeGuideText === 'function') {
        const goal = (typeof App.challengeGoal === 'function') ? App.challengeGoal(p.challengeId) : null;
        const tasksDone = (typeof App.challengeTasksDone === 'function') ? App.challengeTasksDone(p, goal) : false;
        const cName = p.challengeName || '挑战';
        const guideLines = App.buildChallengeGuideText(p);
        return {
          title: '【挑战·' + cName + '】',
          primary: tasksDone
            ? { text: '所有试炼任务完成！前往营地「决战」击败最终 Boss 通关', action: 'challenge', tag: '通关' }
            : { text: App.challengeNextHint(p, goal), action: 'challenge', tag: '备战' },
          items: guideLines.map(t => ({ text: t }))
        };
      }

      // 1. 血量危险 → 优先回血
      const maxHp = STATE.calcMaxHp(p);
      if (p.hp < maxHp * 0.4 && p.hp > 0) {
        return {
          title: '当前指引',
          primary: { text: '气血告急，回家园休憩调养', action: 'home' },
          items: [{ text: '返回家园休憩，恢复气血', action: 'home' }]
        };
      }

      // 2. 主线推进提示（各国家）+ 点触主线进度 + 线索指引（玩法驱动·按国家显示）
      //    优先级高于"修为未满"：进入国家后任务面板必须显示该国主线指引（用户多次反馈此问题）
      const allNations = ['qingqiu','yumin','yanhuo','xuanyuan','xuangu','huantou','sanshou','nieer','daren','baimin','changgu','zhurao','jiaojing','rouli','shenmu','wuchang','yimu','jiexiong','qizhong','guixu'];
      const curIdx = allNations.indexOf(p.nation);
      // 始终取对象而非布尔：优先 _storyState（含 idx），其次用 _inStory 构造（避免 inStory.idx 退化）
      let inStory = null;
      if (p._storyState && p._storyState.nationId === p.nation) inStory = p._storyState;
      else if (p._inStory && p._inStory.nationId === p.nation) inStory = { nationId: p.nation, idx: p._inStory.idx || 0 };
      // 该国未通关：明确指引"去探索屏找剧情 NPC 推进剧情"
      if (curIdx >= 0 && !inStory) {
        // 用纯通关判断（unlockedNations.cleared 含"当前国家恒通关"特判，会导致任务栏永远不提示该国主线）
        const notCleared = !STATE.isNationCleared(p, p.nation);
        if (notCleared && typeof EXPLORE !== 'undefined' && EXPLORE[p.nation] && EXPLORE[p.nation].story) {
          // 有剧情主线：指引进入该国探索屏与主线 NPC 对话
          const nextNpc = STATE.getNationNextNpc(p.nation, (p._storyState && p._storyState.nationId === p.nation) ? p._storyState.idx : 0);
          primary = { text: '推进主线：前往' + STATE.nationName(p.nation) + '，与「' + nextNpc + '」对话', action: 'continue', tag: '主线' };
          items.unshift({ text: '当前主线：' + STATE.nationName(p.nation) + '篇，进城后找 ' + nextNpc + ' 谈话推进剧情', action: 'continue', tag: '主线' });
        } else {
          primary = { text: '推进主线剧情：' + STATE.nationName(p.nation), action: 'continue', tag: '主线' };
          items.unshift({ text: '当前主线：' + STATE.nationName(p.nation) + '篇，点击「继续探险」推进剧情', action: 'continue', tag: '主线' });
        }
      }

      // 3. 修为已满但未突破 → 提示突破（修炼优先级低于主线推进）
      const br = STATE.canBreakthrough(p);
      if (!primary) {
        if (br && br.can) {
          primary = { text: '境界可突破：' + br.next.name, action: 'home_break', tag: '境界' };
          items.push({ text: '前往【家园·突破】冲击' + br.next.name, action: 'home_break', tag: '境界' });
        } else if (br && !br.can) {
          // 等级不足，提示升级
          primary = { text: '提升至 Lv' + br.need + ' 以突破' + br.next.name, action: 'home_cultivate', tag: '修炼' };
          items.push({ text: '当前 Lv' + p.lv + '，需 Lv' + br.need + ' 方可突破，先去修炼/探索升级', action: 'home_cultivate', tag: '修炼' });
        } else if (!br) {
          // 已达最高境界（飞升）
          if (p.fourFierceStage === undefined || p.fourFierceStage === 0) {
            // 飞升后可挑战四凶（若已通关二十国）
            const { cleared } = STATE.unlockedNations(p);
            if (cleared.length >= 20) {
              primary = { text: '已至飞升，可挑战四凶本体（最终决战）', action: 'home', tag: '决战' };
              items.push({ text: '前往归墟，踏入归墟之扉，迎战四凶', action: 'home', tag: '决战' });
            }
          }
        }
      }

      // 4. 修为未满 → 提示修炼/探索（仅当没有更高优先级的 primary 时）
      if (!primary && p.realm.exp < p.realm.expMax) {
        primary = { text: '修为未满，继续修炼提升', action: 'home_cultivate', tag: '修炼' };
        items.push({ text: '在家园【修炼】获取修为，或外出【探险】历练', action: 'home_cultivate', tag: '修炼' });
      }

      // 5. 点触主线进度 + 线索指引（若正在进行点触主线，优先于突破/修为提示）
      const storyTotal = (typeof EXPLORE !== 'undefined' && EXPLORE[p.nation] && EXPLORE[p.nation].story) ? EXPLORE[p.nation].story.length : 0;
      if (curIdx >= 0 && inStory && storyTotal > 0) {
        const step = Math.min((inStory.idx || 0) + 1, storyTotal);
        // 精确指引：下一步去找谁、去何处
        const nextNpc = STATE.getNationNextNpc(p.nation, inStory.idx || 0);
        let storyLoc = '';
        try {
          const stScene = EXPLORE[p.nation].story[Math.min(inStory.idx || 0, storyTotal - 1)];
          if (stScene && stScene.location) storyLoc = stScene.location;
        } catch (e) {}
        primary = { text: '继续「' + STATE.nationName(p.nation) + '」剧情：前往' + (storyLoc || '该国') + '，与「' + nextNpc + '」对话', action: 'story', tag: '主线' };
        items.unshift({ text: '主线第 ' + step + '/' + storyTotal + ' 幕：前往' + (storyLoc || '该国') + '，找「' + nextNpc + '」谈话推进剧情', action: 'story', tag: '主线' });
        // 线索指引：记录该国已获线索
        const cluesGot = (p._clues && p._clues[p.nation]) ? p._clues[p.nation].length : 0;
        const clueHint = STATE.getNationClueHint(p, p.nation);
        if (clueHint) items.push({ text: '线索：' + clueHint + '（已获 ' + cluesGot + ' 条）', action: 'story', tag: '线索' });
      }
      // 当前国家推荐等级与难度（软门槛提示，进入国家后始终显示）
      if (curIdx >= 0) {
        const rec = STATE.getNationRecommend(p.nation);
        const diff = STATE.getNationDifficulty(p, p.nation);
        items.push({ text: '当前国家推荐 Lv' + rec.lv + '（' + rec.realm + '）· ' + diff.name + '：' + diff.hint, action: 'home_explore', tag: '探索' });
      } else if (!primary) {
        primary = { text: '继续探索山海，推进主线', action: 'continue', tag: '主线' };
      }

      // 6. 宠物未培养 → 提示培养
      const mainPet = STATE.mainPet(p);
      if (mainPet) {
        if ((mainPet.level || 1) < 90 && (mainPet.level || 1) < (30 + p.lv * 2)) {
          items.push({ text: '灵宠「' + mainPet.name + '」可培养（Lv' + mainPet.level + '），喂养提升战力', action: 'home_pet', tag: '宠物' });
        }
        if (mainPet.quality && mainPet.quality !== 'UR') {
          items.push({ text: '灵宠品质为' + mainPet.quality + '，可寻更高品质灵宠，品质影响战力上限', action: 'home_pet', tag: '宠物' });
        }
      } else {
        items.push({ text: '尚无灵宠，前往【家园·灵宠】结契灵宠，助力战斗', action: 'home_pet', tag: '宠物' });
      }

      // 7. 供奉未满 → 提示供奉
      if (p.offerGod && (p.offerValue || 0) < 1000) {
        items.push({ text: '供奉值 ' + (p.offerValue || 0) + '/1000，继续供奉获取加持与神技', action: 'home_offer', tag: '供奉' });
      } else if (!p.offerGod) {
        items.push({ text: '尚未供奉神明，可前往【家园·供奉】择神供奉，获神力加持', action: 'home_offer', tag: '供奉' });
      }

      // 8. 提示可自由前往的国家（玩法驱动：自由探索）
      if (typeof STATE.unlockedNations === 'function') {
        const { cleared } = STATE.unlockedNations(p);
        if (cleared.length < allNations.length) {
          items.push({ text: '可在【山海舆图】自由选择已解锁国家探索，卡关时先去别国提升', action: 'home_explore', tag: '探索' });
        }
      }

      return { title: '当前指引', primary, items: items.slice(0, 6) };
    },

    /** 好感度等级分档（策划案第9章） */
    favorLevel(val) {
      if (val >= 90) return { tier: 5, name: '生死之交', color: '#ffd700' };
      if (val >= 70) return { tier: 4, name: '肝胆相照', color: '#ff9d3d' };
      if (val >= 45) return { tier: 3, name: '知己好友', color: '#6bc9ff' };
      if (val >= 20) return { tier: 2, name: '相识之人', color: '#8fd694' };
      if (val >= 5)  return { tier: 1, name: '初遇之缘', color: '#c9c9c9' };
      return { tier: 0, name: '素昧平生', color: '#888888' };
    },

    /** NPC好感度注册表：按国家列出关键NPC（用于角色面板展示） */
    getFavorRegistry() {
      return [
        { nation: '青丘',    key: 'yunYao',   name: '云瑶' },
        { nation: '青丘',    key: 'fengLie',  name: '风烈' },
        { nation: '青丘',    key: 'yiLao',    name: '遗老' },
        { nation: '青丘',    key: 'xiaoLing', name: '小灵' },
        { nation: '羽民',    key: 'fengZhiYun', name: '风之蕴' },
        { nation: '厌火',    key: 'huoLie',   name: '火烈' },
        { nation: '轩辕',    key: 'moZi',     name: '墨离' },
        { nation: '玄股',    key: 'cangShui', name: '沧水' },
        { nation: '讙头',    key: 'yuanYin',  name: '渊音' },
        { nation: '三首',    key: 'houTu',    name: '后土' },
        { nation: '聂耳',    key: 'tianTing', name: '天听' },
        { nation: '大人',    key: 'yueShan',  name: '岳山' },
        { nation: '大人',    key: 'xiZhen',   name: '细针' },
        { nation: '白民',    key: 'yingZhao', name: '英招' },
        { nation: '长股',    key: 'shiZhu',   name: '时主' },
        { nation: '周饶',    key: 'zhiXu',    name: '秩序' },
        { nation: '交胫',    key: 'mingLun',  name: '命轮' },
        { nation: '柔利',    key: 'tuiXing',  name: '蜕形' },
        { nation: '深目',    key: 'shenMu',   name: '深目' },
        { nation: '无肠',    key: 'taoTie',   name: '饕餮' },
        { nation: '一目',    key: 'tianMu',   name: '天目' },
        { nation: '结胸',    key: 'lianMai',  name: '连脉' },
        { nation: '跂踵',    key: 'xingZhe',  name: '行者' },
        { nation: '归墟',    key: 'fengShou', name: '封兽' }
      ];
    },

    /** 汇总玩家派生属性，供"角色面板"展示（策划案第6章/属性成长） */
    getDerivedStats(p) {
      if (!p) return null;
      const maxHp = STATE.calcMaxHp(p);
      const maxMp = STATE.calcMaxMp(p);
      // 天级角色专属剧情奖励：战斗属性提升（攻击/防御/暴击/闪避）
      const bb = (p.charBattleBonus) ? p.charBattleBonus : {};
      // 与实战口径一致：攻击/防御含命格 atk/def/all 加成（面板显示 = 实际战斗数值）
      const atkBonus = STATE.mingshenBonus(p, 'atk') + STATE.mingshenBonus(p, 'all');
      const defBonus = STATE.mingshenBonus(p, 'def') + STATE.mingshenBonus(p, 'all');
      const atk = Math.floor(p.baseAtk * p.coeff.atk * (1 + (bb.atk || 0)) * (1 + atkBonus));
      const def = Math.floor(p.baseDef * p.coeff.def * (1 + (bb.def || 0)) * (1 + defBonus));
      const crit = 0.08 + STATE.mingshenBonus(p, 'crit') + (bb.crit || 0);
      const dodge = STATE.mingshenBonus(p, 'dodge') + (bb.dodge || 0);
      const hit = 0.90 + STATE.mingshenBonus(p, 'hit');
      const cult = 1 + STATE.mingshenBonus(p, 'cultivation');
      const heal = STATE.mingshenBonus(p, 'heal');
      const realm = STATE.getRealmInfo();
      const curIdx = realm.findIndex(r => r.name === p.realm.name);
      return {
        maxHp, maxMp, atk, def,
        crit: Math.round(crit * 100),
        dodge: Math.round(dodge * 100),
        hit: Math.round(Math.min(1, hit) * 100),
        cult: Math.round(cult * 100),
        heal: Math.round(heal * 100),
        realm: p.realm,
        nextRealm: (curIdx >= 0 && curIdx < realm.length - 1) ? realm[curIdx + 1] : null,
        expPct: Math.round((p.realm.exp / (p.realm.expMax || 1)) * 100),
        expMax: p.realm.expMax,
        exp: p.realm.exp,
        lv: p.lv
      };
    },

    /* ============== 灵宠系统 ============== */
    /** 召唤/签约一只灵宠 */
    addPet(p, petId, contractType) {
      const petData = (global.PETS || []).find(x => x.id === petId);
      if (!petData) return null;
      if (!p.pets) p.pets = [];
      // 防重复添加（同一宠物只收一只；已拥有则直接返回已有对象）
      const owned = p.pets.find(x => x.id === petId);
      if (owned) return owned;
      const race = (global.PET_RACE || {})[petData.race] || { atk:1.0, life:1.0, def:1.0 };
      const contract = (global.CONTRACT || {})[contractType || 'equal'] || global.CONTRACT.equal;
      const pet = {
        id: petData.id,
        name: petData.name,
        quality: petData.quality,
        element: petData.element,
        race: petData.race,
        raceName: race.name,
        skill: petData.skill,
        skill2: petData.skill2,
        evoLine: petData.evoLine,
        nationPrefix: petData.nationPrefix || 'C',   // 来源国材料前缀（进化材料）
        evoStage: 0,               // 进化阶段索引
        contract: contractType || 'equal',
        contractName: contract.name,
        inherits: contract.inherits,
        level: 1,
        desc: petData.desc,
        color: petData.color
      };
      p.pets.push(pet);
      // 图鉴点亮（记录曾拥有过，全局绘卷永久入册）
      if (!p.petDex) p.petDex = [];
      if (p.petDex.indexOf(petData.id) < 0) p.petDex.push(petData.id);
      STATE.recordTome(p, 'PET:' + petData.id);
      // 新手历程：首次获得灵宠
      try { if (typeof global.META !== 'undefined' && META.trackNovice) META.trackNovice('pet', 1); } catch (e) {}
      return pet;
    },

    /** 灵宠品质上限系数：品质决定宠物战力相对90级主角的比例上限（UR最高70%） */
    qualityCap(quality) {
      return { N:0.30, R:0.45, SR:0.58, SSR:0.64, UR:0.70 }[quality] || 0.40;
    },

    /** 灵宠最终属性 = 玩家战斗属性 × 种族 × 契约 × 进化 × 等级，并按品质封顶
     *  品质是核心差异化：UR满配可达90级主角战力的70%，N兽远低于此
     *  V1.3.3 修正：品质上限不再"入手即达"（原实现中高契约/高种族宠物从 1 级就被
     *  硬截断，升级/进化/羁绊的收益几乎全部被吃掉，培养无感）。
     *  现改为"动态上限"：上限随培养进度（等级/进化/契约/羁绊）从 45% 线性升至 100%，
     *  使每条培养线都实打实反映在面板上，与角色 5%/级的成长节奏匹配。 */
    petStats(p, pet) {
      const race = (global.PET_RACE || {})[pet.race] || { atk:1.0, life:1.0, def:1.0 };
      // 进化阶段系数统一从 pets.js 的 EVO_STAGE 读取（顺序：init/first/final/hidden）
      const evoStages = (global.EVO_STAGE && Object.keys(global.EVO_STAGE)) || ['init','first','final','hidden'];
      const evoKey = evoStages[pet.evoStage] || 'init';
      const evo = ((global.EVO_STAGE || {})[evoKey] || { coeff:1.0 }).coeff;
      // 品质满培养上限（封顶比例）
      const cap = STATE.qualityCap(pet.quality);
      // 灵宠等级加成：每级 +3% 三围（90级=3.67），体现"喂养培养"成长
      const lvMul = 1 + ((pet.level || 1) - 1) * 0.03;
      // 培养进度归一化（各因子 0~1，权重：等级30% / 进化35% / 契约15% / 羁绊20%）
      const lvMulMax = 1 + 89 * 0.03;                       // 90级等级系数
      const evoMax = 3.0;                                    // 隐藏阶段系数
      const inheritsMax = 2.0;                               // 本命契约
      const bondMax = 1.35;                                  // 满羁绊（150） +35%
      const lvP = Math.max(0, Math.min(1, (lvMul - 1) / (lvMulMax - 1)));
      const evoP = Math.max(0, Math.min(1, (evo - 1) / (evoMax - 1)));
      const contractP = Math.max(0, Math.min(1, ((pet.inherits || 1) - 0.5) / (inheritsMax - 0.5)));
      const bondMul = 1 + (pet.bond || 0) / 150 * 0.35;
      const bondP = Math.max(0, Math.min(1, (bondMul - 1) / (bondMax - 1)));
      const prog = 0.30 * lvP + 0.35 * evoP + 0.15 * contractP + 0.20 * bondP;
      // 动态上限：入手宠物仅开放 45% 品质上限，满培养（90级/隐藏/本命/满羁绊）才达 100%
      const capNow = cap * (0.45 + 0.55 * prog);
      // 以主角"战斗属性"为基准（含等级成长），使宠物战力与主角同口径对比
      const lvGrow = 1 + 0.05 * ((p.lv || 1) - 1);
      const heroAtk = Math.floor(p.baseAtk * p.coeff.atk * lvGrow);
      const heroHp = STATE.calcMaxHp(p);
      const heroDef = Math.floor(p.baseDef * p.coeff.def * lvGrow);
      // 原始战力（种族+契约+进化+等级+羁绊，培养越满越强），再按动态上限封顶
      const rawAtk = heroAtk * race.atk * pet.inherits * evo * lvMul * bondMul;
      const rawHp = heroHp * race.life * pet.inherits * evo * lvMul * bondMul;
      const rawDef = heroDef * race.def * pet.inherits * evo * lvMul * bondMul;
      return {
        atk: Math.floor(Math.min(rawAtk, heroAtk * capNow)),
        hp: Math.floor(Math.min(rawHp, heroHp * capNow)),
        def: Math.floor(Math.min(rawDef, heroDef * capNow))
      };
    },

    /**
     * 进化灵宠：需消耗对应品质的灵材（策划案第8.4条·品质分级进化）
     * 阶段0(初始) → 1(一阶) → 2(终极) → 3(隐藏)
     *   - 0→1：需通用草木灵材（朱果×3）
     *   - 1→2：需本国精材 MAT-XX05（"之精"）＋ 通用灵材
     *   - 2→3：需珍贵材料 MAT-XX07（"碎片"）＋ 精材
     * 进化材料随宠物品质递增，后期需珍贵材料。
     */
    evolvePet(p, petIdx) {
      const pet = p.pets[petIdx];
      if (!pet) return { error: '灵宠不存在' };
      if (pet.evoStage >= pet.evoLine.length - 1) return { error: '已至最高阶段' };
      // 进化材料需求（按阶段）：需求项可能是 [mat,n] 或 [[mat,n],[mat,n]] 备选组
      const matNeed = STATE.evolveCost(pet);
      if (!matNeed) return { error: '无法确定进化材料' };
      // 需求项描述（备选组用 "或" 连接）
      const desc = matNeed.map(item => {
        const opts = (Array.isArray(item[0])) ? item : [item];
        return opts.map(([m, c]) => STATE.matName(m) + '×' + c).join(' 或 ');
      }).join('、');
      // 预检查：每组需满足其一
      const picks = [];
      for (const item of matNeed) {
        const opts = (Array.isArray(item[0])) ? item : [item];
        const hit = opts.find(([m, n]) => STATE.hasMaterial(p, m, n));
        if (!hit) {
          return { error: '进化材料不足，需要：' + desc };
        }
        picks.push(hit);
      }
      // 扣除（按实际命中项扣除）
      for (const [mat, n] of picks) {
        STATE.removeMaterial(p, mat, n);
      }
      pet.evoStage++;
      return { name: pet.evoLine[pet.evoStage], stage: pet.evoStage, cost: picks };
    },

    /** 计算灵宠进化所需材料（分阶段·分品质）
     *  需求项支持"备选组"：['MAT-XX05',2] 为旧格式（必选），[['MAT-XX05',2],['MAT-G05',2]] 表示任选其一
     *  灵圃特产灵材可替代本国精材（G05地火藤/G06雷音竹代"之精"，G07影心草代"碎片"），
     *  满足"宠物进化材料可通过种植获得"的策划需求。 */
    evolveCost(pet) {
      const stage = pet.evoStage;
      // 国家前缀：根据宠物来源国推断（此处用通用+品质分级，不绑定具体国）
      const prefix = (pet.nationPrefix || 'C');
      if (stage === 0) {
        // 初始→一阶：通用草木（朱果/灵芝均可种植）
        return [['MAT-C01', 3], ['MAT-C02', 1]];
      } else if (stage === 1) {
        // 一阶→终极：需本国"之精"（可种）＋通用灵材
        return [[['MAT-' + prefix + '05', 2], ['MAT-G05', 2], ['MAT-G06', 1]], ['MAT-C01', 5]];
      } else if (stage === 2) {
        // 终极→隐藏：需珍贵"碎片"＋"之精"（均可由灵圃特产替代）
        return [[['MAT-' + prefix + '07', 1], ['MAT-G07', 1]], [['MAT-' + prefix + '05', 3], ['MAT-G05', 3], ['MAT-G06', 2]]];
      }
      return null;
    },

    /** 复活：战败后回到家园，恢复满状态（家园常驻机制） */
    reviveAtHome(p) {
      const maxHp = STATE.calcMaxHp(p);
      const maxMp = STATE.calcMaxMp(p);
      p.hp = maxHp;
      p.mp = maxMp;
      p.shichen = p.shichenMax || 6;   // 复活后恢复行动力
      p.debuffs = [];
      p.buffs = [];
      return { hp: maxHp, mp: maxMp };
    },

    /** 培养：提升灵宠等级，需消耗草木灵材（等级越高消耗越多，可用通用灵材喂养） */
    feedPet(p, petIdx) {
      const pet = p.pets[petIdx];
      if (!pet) return { error: '灵宠不存在' };
      // 消耗灵材：随等级递增（1级需2个朱果，之后每级+1）
      const cost = 1 + pet.level;
      // 宠物等级上限：90级（受主角等级软限制，但硬上限90）
      const softCap = 30 + (p.lv || 1) * 2;
      const maxPetLv = Math.min(90, softCap);
      if (pet.level >= maxPetLv) return { error: '灵宠已达培养上限（Lv' + maxPetLv + '），请先提升自身境界' };
      // 兼容多种草木灵材：朱果/灵芝/月光草 + 灵圃特产（天香草/紫芝兰/血菩提）均可喂养
      const feedable = ['MAT-C01', 'MAT-C02', 'MAT-C05', 'MAT-G01', 'MAT-G02', 'MAT-G03'];
      let total = 0;
      feedable.forEach(m => total += (p.materials[m] || 0));
      if (total < cost) return { error: '灵材不足，需要草木灵材共 ' + cost + ' 份（朱果/灵芝/月光草/天香草/紫芝兰/血菩提）' };
      let spent = 0, usedMat = null;
      for (const m of feedable) {
        const take = Math.min(p.materials[m] || 0, cost - spent);
        if (take > 0) { STATE.removeMaterial(p, m, take); spent += take; usedMat = m; }
        if (spent >= cost) break;
      }
      pet.level++;
      pet.bond = Math.min(150, (pet.bond || 0) + 1);   // 喂养也增羁绊
      return { level: pet.level, cost, usedMat };
    },

    /** 精元丹：为出战灵宠注入修为（可直接升级，同喂养上限逻辑） */
    grantPetExp(p, levels) {
      const pet = STATE.mainPet(p);
      if (!pet) return { error: '尚无灵宠，无法服用精元丹' };
      const softCap = 30 + (p.lv || 1) * 2;
      const maxPetLv = Math.min(90, softCap);
      let ups = 0;
      const n = levels || 1;
      for (let i = 0; i < n; i++) {
        if (pet.level >= maxPetLv) break;
        pet.level++;
        ups++;
      }
      return { pet: pet.name, level: pet.level, ups, max: maxPetLv };
    },

    /** 灵宠羁绊：随出战战斗成长（胜+3败+1），羁绊提升灵宠全属性与协战强度
     *  上限 150，满羁绊全属性 +35%（V1.3.3 羁绊深化：新增神话级「神魂相契」） */
    addPetBond(p, n) {
      const pet = STATE.mainPet(p);
      if (!pet) return;
      pet.bond = Math.min(150, (pet.bond || 0) + (n || 1));
    },
    petBondInfo(pet) {
      const b = Math.max(0, Math.min(150, pet.bond || 0));
      let lv = 0, name = '陌生', pct = 0.0;
      if (b >= 150) { lv = 6; name = '神魂相契'; pct = 0.35; }
      else if (b >= 125) { lv = 5; name = '生死相随'; pct = 0.2917; }
      else if (b >= 100) { lv = 4; name = '心意相通'; pct = 0.2333; }
      else if (b >= 75) { lv = 3; name = '形影不离'; pct = 0.175; }
      else if (b >= 50) { lv = 2; name = '日渐亲近'; pct = 0.1167; }
      else if (b >= 25) { lv = 1; name = '初识'; pct = 0.0583; }
      else if (b > 0) { lv = 0; name = '陌生'; pct = 0.0; }
      return { bond: b, lv, name, pct, max: 150,
        talent: b >= 150 ? '神魂相契（协战威力+30%、触发率+15%）' : (b >= 100 ? '心意相通（协战威力+15%、触发率+8%）' : (b >= 50 ? '日渐亲近（协战威力+8%）' : '')) };
    },

    /** 主力灵宠（第一个） */
    /** 出战宠物：优先 activePet，否则第一只 */
    mainPet(p) {
      if (!p || !p.pets || !p.pets.length) return null;
      if (p.activePet) {
        const found = p.pets.find(pt => (pt.id === p.activePet || pt.race === p.activePet));
        if (found) return found;
      }
      return p.pets[0] || null;
    },

    /* ============== 炼丹 / 种植 系统 ============== */
    /** 灵材库存操作（顺带记录"山海绘卷图鉴"：见过的材料永久记录，花掉也不消失） */
    addMaterial(p, matId, n) {
      p.materials[matId] = (p.materials[matId] || 0) + n;
      STATE.recordTome(p, matId);
    },

    /* ============== 山海绘卷 · 全局收藏（跨存档/跨周目，解锁即永久入册） ============== */
    _tomeDexKey: 'wdsx_tome_dex_v1',
    /** 读取全局绘卷收藏 { seen: [], claimed: [] }（局外 localStorage，不随存档） */
    getTomeDex() {
      try {
        const raw = localStorage.getItem(STATE._tomeDexKey);
        if (!raw) return { seen: [], claimed: [] };
        const obj = JSON.parse(raw);
        return { seen: Array.isArray(obj.seen) ? obj.seen : [], claimed: Array.isArray(obj.claimed) ? obj.claimed : [] };
      } catch (e) { return { seen: [], claimed: [] }; }
    },
    saveTomeDex(dex) {
      try { localStorage.setItem(STATE._tomeDexKey, JSON.stringify({ seen: dex.seen, claimed: dex.claimed })); } catch (e) {}
    },
    /** 全局入册一个收集 token（材料/丹药 id、'PET:'、'CHAR:'、'NAT:'、'PROF:'、'MING:'、'ACH:'） */
    tomeSeenAdd(id) {
      if (!id) return;
      const dex = STATE.getTomeDex();
      if (dex.seen.indexOf(id) < 0) { dex.seen.push(id); STATE.saveTomeDex(dex); }
    },
    tomeSeenList() { return STATE.getTomeDex().seen; },
    tomeSeenSet() { return new Set(STATE.getTomeDex().seen); },
    /** 全局里程碑领取标记 */
    tomeClaimedList() { return STATE.getTomeDex().claimed; },
    tomeClaimedHas(mid) { return STATE.getTomeDex().claimed.indexOf(mid) >= 0; },
    tomeClaimedAdd(mid) {
      const dex = STATE.getTomeDex();
      if (dex.claimed.indexOf(mid) < 0) { dex.claimed.push(mid); STATE.saveTomeDex(dex); }
    },
    /** 老存档迁移：把旧档内图鉴/库存/成就/命格/职业/宠物一次性并入全局绘卷 */
    tomeDexMigrateFrom(p) {
      if (!p) return;
      const dex = STATE.getTomeDex();
      let changed = false;
      const add = (arr, id) => { if (id && arr.indexOf(id) < 0) { arr.push(id); changed = true; } };
      try { (Array.from(p._tomeSeen || [])).forEach(id => add(dex.seen, id)); } catch (e) {}
      Object.keys(p.materials || {}).forEach(k => { if ((p.materials[k] || 0) > 0) add(dex.seen, k); });
      Object.keys(p.pills || {}).forEach(k => { if ((p.pills[k] || 0) > 0) add(dex.seen, k); });
      (p.achievements || []).forEach(a => add(dex.seen, 'ACH:' + a));
      (p.mingshen || []).forEach(m => add(dex.seen, 'MING:' + (typeof m === 'string' ? m : m.id)));
      (p.ownedProfessions || []).forEach(pr => add(dex.seen, 'PROF:' + pr));
      if (p.profession) add(dex.seen, 'PROF:' + p.profession);
      // 通关国家标记形式多样（xxx_cleared / XXX_MAIN_DONE / XXX_..._CLEARED），按国家列表判定后入册
      ['qingqiu','yumin','yanhuo','xuanyuan','xuangu','huantou','sanshou','nieer','daren','baimin','changgu','zhurao','jiaojing','rouli','shenmu','wuchang','yimu','jiexiong','qizhong','guixu'].forEach(n => {
        try { if (STATE.isNationCleared(p, n)) add(dex.seen, 'NAT:' + n); } catch (e) {}
      });
      (p.petDex || []).forEach(petId => add(dex.seen, 'PET:' + petId));
      (p.pets || []).forEach(pt => add(dex.seen, 'PET:' + pt.id));
      if (p.charId) add(dex.seen, 'CHAR:' + p.charId);
      (p._tomeClaimed || []).forEach(mid => { if (dex.claimed.indexOf(mid) < 0) { dex.claimed.push(mid); changed = true; } });
      if (changed) STATE.saveTomeDex(dex);
      return dex;
    },

    /** 山海绘卷图鉴记录：全局入册 + 兼容写入当前存档（解锁即永久存在） */
    recordTome(p, id) {
      if (!id) return;
      STATE.tomeSeenAdd(id);
      if (p) {
        if (!p._tomeSeen) p._tomeSeen = new Set();
        if (!p._tomeSeen.has(id)) p._tomeSeen.add(id);
      }
    },
    tomeSeenList(p) { return STATE.tomeSeenList(); },

    /** 每周任务统计：记录本周战斗/修炼/探索次数（周切换自动清零） */
    trackWeekly(p, type) {
      if (!p) return;
      try {
        const wk = (typeof global.META !== 'undefined' && META.weekKeyOf) ? META.weekKeyOf() : '';
        if (!p.weeklyTrack) p.weeklyTrack = { weekKey: '', battles: 0, cultivate: 0, explore: 0 };
        if (p.weeklyTrack.weekKey !== wk) {
          p.weeklyTrack = { weekKey: wk, battles: 0, cultivate: 0, explore: 0 };
        }
        if (type === 'battle') p.weeklyTrack.battles = (p.weeklyTrack.battles || 0) + 1;
        else if (type === 'cultivate') p.weeklyTrack.cultivate = (p.weeklyTrack.cultivate || 0) + 1;
        else if (type === 'explore') p.weeklyTrack.explore = (p.weeklyTrack.explore || 0) + 1;
      } catch (e) {}
    },
    hasMaterial(p, matId, n) { return (p.materials[matId] || 0) >= n; },
    removeMaterial(p, matId, n) {
      if (!STATE.hasMaterial(p, matId, n)) return false;
      p.materials[matId] -= n;
      if (p.materials[matId] <= 0) delete p.materials[matId];
      return true;
    },

    /** 死亡掉落：随机掉落背包中部分灵材（每类随机扣除 1~30%，保底扣1个），返回掉落清单 */
    dropMaterialsOnDeath(p) {
      if (!p || !p.materials) return [];
      const lost = [];
      const entries = Object.keys(p.materials).filter(k => (p.materials[k] || 0) > 0);
      entries.forEach(k => {
        const have = p.materials[k] || 0;
        // 每种材料 30% 概率掉落，掉 1 ~ ceil(30%) 个，至少 1 个
        if (RNG.chance(0.30)) {
          const dropN = Math.min(have, Math.max(1, Math.ceil(have * 0.30)));
          p.materials[k] = have - dropN;
          if (p.materials[k] <= 0) delete p.materials[k];
          lost.push({ id: k, n: dropN });
        }
      });
      return lost;
    },

    /** 炼丹配方（策划案第11章，简化版） */
    getRecipes() {
      return [
        // —— 恢复类 ——
        { id:'xiaohuandan', name:'小还丹', effect:'恢复生命30%', lv:1, danhuo:1, kind:'heal', req:{ 'MAT-C01':2, 'MAT-C02':1 } },
        { id:'dahuandan',  name:'大还丹', effect:'恢复生命60%', lv:10, danhuo:2, kind:'heal', req:{ 'MAT-C01':5, 'MAT-C02':3, 'MAT-C03':1 } },
        { id:'xiaohuiling',name:'小回灵丹', effect:'恢复灵力25%', lv:1, danhuo:1, kind:'heal', req:{ 'MAT-C01':2, 'MAT-C02':1 } },
        { id:'huiling',    name:'回灵散', effect:'恢复灵力50%', lv:5, danhuo:1, kind:'heal', req:{ 'MAT-C02':3, 'MAT-C05':1 } },
        { id:'dahuiling',  name:'大回灵丹', effect:'恢复灵力80%', lv:15, danhuo:2, kind:'heal', req:{ 'MAT-E01':3, 'MAT-C05':2 }, locked:true },
        { id:'shenhuiling',name:'神回灵丹', effect:'恢复灵力100%', lv:30, danhuo:3, kind:'heal', req:{ 'MAT-E17':3, 'MAT-E09':2, 'MAT-F01':1 }, locked:true },
        { id:'qingxin',    name:'清心丸', effect:'清除负面状态', lv:15, danhuo:2, kind:'heal', req:{ 'MAT-C03':2, 'MAT-C06':1 } },
        // —— 临时增益类（灵圃特产灵材炼制 · 战斗内服用生效） ——
        { id:'shenxing',   name:'神行丹', effect:'全属性+20%持续3回合', lv:15, danhuo:2, kind:'buff', buff:'all', req:{ 'MAT-C07':1, 'MAT-B10':1 } },
        { id:'hanbing',    name:'寒冰丹', effect:'永久免疫厌火国热浪', lv:25, danhuo:3, kind:'perm', req:{ 'MAT-C11':2, 'MAT-SC15':1 } },
        { id:'zengqi',     name:'增气丹', effect:'攻击+25%持续3回合', lv:10, danhuo:1, kind:'buff', buff:'atk', req:{ 'MAT-G01':2, 'MAT-G02':1 } },
        { id:'tiebi',      name:'铁壁丹', effect:'防御+30%持续3回合', lv:15, danhuo:1, kind:'buff', buff:'def', req:{ 'MAT-G03':2, 'MAT-G04':1 } },
        { id:'jifeng',     name:'疾风丹', effect:'闪避+20%持续3回合', lv:15, danhuo:2, kind:'buff', buff:'dodge', req:{ 'MAT-G04':1, 'MAT-G05':2 } },
        { id:'lingguang',  name:'灵光丹', effect:'灵力消耗-40%持续3回合', lv:20, danhuo:2, kind:'buff', buff:'mp', req:{ 'MAT-G06':2, 'MAT-G01':1 } },
        { id:'longli',     name:'龙力丹', effect:'全属性+18%持续4回合', lv:30, danhuo:2, kind:'buff', buff:'all2', req:{ 'MAT-G07':2, 'MAT-G08':1, 'MAT-G03':2 } },
        { id:'niepan',     name:'涅槃丹', effect:'濒死时恢复60%气血（一次性）', lv:40, danhuo:3, kind:'buff', buff:'revive', req:{ 'MAT-G09':1, 'MAT-G07':2, 'MAT-F01':1 } },
        // —— V1.3.3 扩充：战斗丹药池（回天/战神/真元/金刚） ——
        { id:'huitian',    name:'回天丹', effect:'立即恢复45%气血', lv:18, danhuo:2, kind:'buff', buff:'heal', req:{ 'MAT-G02':2, 'MAT-C03':2 } },
        { id:'zhanshen',   name:'战神丹', effect:'暴击+25%持续3回合', lv:25, danhuo:2, kind:'buff', buff:'crit', req:{ 'MAT-G05':2, 'MAT-C01':1 } },
        { id:'zhendan',    name:'真元丹', effect:'奥义能量+60', lv:28, danhuo:2, kind:'buff', buff:'energy', req:{ 'MAT-G06':1, 'MAT-G02':2 } },
        { id:'kunwu',      name:'金刚丹', effect:'受击减伤25%持续3回合', lv:35, danhuo:3, kind:'buff', buff:'reduce', req:{ 'MAT-G07':2, 'MAT-G03':2 } },
        // —— 灵宠培育类 ——
        { id:'jingyuan',   name:'精元丹', effect:'灵宠获得大量修为（+1级）', lv:10, danhuo:1, kind:'petExp', petExp:1, req:{ 'MAT-G02':3, 'MAT-C01':2 } },
        // —— 增修为类（探索获得丹方，需解锁） ——
        { id:'juyuandan',  name:'聚元丹', effect:'修为+500', lv:5, danhuo:1, kind:'exp', exp:500, locked:true, req:{ 'MAT-E01':3, 'MAT-E02':1 } },
        { id:'ningqi',     name:'凝气丹', effect:'修为+1500', lv:15, danhuo:2, kind:'exp', exp:1500, locked:true, req:{ 'MAT-E09':3, 'MAT-E10':2, 'MAT-C01':2 } },
        { id:'jindan',     name:'金丹',   effect:'修为+5000', lv:30, danhuo:3, kind:'exp', exp:5000, locked:true, req:{ 'MAT-E17':3, 'MAT-E18':2, 'MAT-F01':1 } },
        { id:'daoyuan',    name:'道元丹', effect:'修为+15000', lv:45, danhuo:4, kind:'exp', exp:15000, locked:true, req:{ 'MAT-E25':3, 'MAT-F05':2, 'MAT-F07':1 } },
        // —— 永久属性类（探索获得丹方，需解锁，稀有） ——
        { id:'xixue',      name:'洗髓丹', effect:'永久生命上限+5%', lv:20, danhuo:3, kind:'permAttr', attr:'life', val:0.05, locked:true, req:{ 'MAT-E17':2, 'MAT-E19':2, 'MAT-F02':1 } },
        { id:'fagu',       name:'伐骨丹', effect:'永久攻击+5%', lv:25, danhuo:3, kind:'permAttr', attr:'atk', val:0.05, locked:true, req:{ 'MAT-E21':2, 'MAT-E22':2, 'MAT-F03':1 } },
        { id:'jinshen',    name:'金身丹', effect:'永久防御+5%', lv:25, danhuo:3, kind:'permAttr', attr:'def', val:0.05, locked:true, req:{ 'MAT-E27':2, 'MAT-E23':2, 'MAT-F04':1 } },
        { id:'tianji',     name:'天机丹', effect:'永久全属性+3%', lv:40, danhuo:4, kind:'permAttr', attr:'all', val:0.03, locked:true, req:{ 'MAT-F13':1, 'MAT-F15':1, 'MAT-E30':2 } }
      ];
    },

    /** 炼丹：消耗灵材+丹火，产出丹药 */
    refine(p, recipeId) {
      const recipe = STATE.getRecipes().find(r => r.id === recipeId);
      if (!recipe) return { error: '配方不存在' };
      // 高级丹方需探索解锁（locked 丹方）
      if (recipe.locked && !(p.unlockedRecipes || new Set()).has(recipe.id)) {
        return { error: '尚未获得此丹方（需探索参悟）' };
      }
      // 检查材料
      for (const [mat, n] of Object.entries(recipe.req)) {
        if (!STATE.hasMaterial(p, mat, n)) return { error: '材料不足' };
      }
      // 检查等级
      if (p.lv < recipe.lv) return { error: '境界不足，需 Lv' + recipe.lv };
      // 消耗
      for (const [mat, n] of Object.entries(recipe.req)) STATE.removeMaterial(p, mat, n);
      const pills = p.pills || (p.pills = {});
      pills[recipe.id] = (pills[recipe.id] || 0) + 1;
      STATE.recordTome(p, recipe.id);   // 绘卷图鉴：记录炼制过的丹药
      return { ok: true, recipe };
    },

    /** 探索参悟：解锁一个未解锁的高级丹方 */
    learnRandomRecipe(p) {
      const locked = STATE.getRecipes().filter(r => r.locked);
      const unowned = locked.filter(r => !(p.unlockedRecipes || new Set()).has(r.id));
      if (unowned.length === 0) return null;
      const recipe = RNG.pick(unowned);
      if (!p.unlockedRecipes) p.unlockedRecipes = new Set();
      p.unlockedRecipes.add(recipe.id);
      return recipe;
    },

    /** 服用丹药（受使用等级限制：recipe.lv 为丹方/使用所需等级，阶梯式成长） */
    usePill(p, recipeId) {
      const recipe = STATE.getRecipes().find(r => r.id === recipeId);
      if (!recipe) return { error: '丹药不存在' };
      const pills = p.pills || {};
      if ((pills[recipeId] || 0) <= 0) return { error: '无此丹药' };
      // 使用等级限制：低于丹方等级不可服用（高级丹药需相应境界）
      if (recipe.lv && (p.lv || 1) < recipe.lv) {
        return { error: '需 Lv' + recipe.lv + ' 方可服用「' + recipe.name + '」' };
      }
      // 增益类丹药只在战斗中生效（先校验再扣除，避免白耗丹药）
      if (recipe.kind === 'buff') {
        return { error: '「' + recipe.name + '」为战斗增益丹药，请在战斗中服用' };
      }
      // 灵宠丹药：无灵宠时先拦截（避免白耗丹药）
      if (recipe.kind === 'petExp' && !STATE.mainPet(p)) {
        return { error: '尚无灵宠，无法服用精元丹' };
      }
      pills[recipeId]--;
      // 效果（按 kind 分派）
      // 灵宠丹药：为出战灵宠注入修为
      if (recipe.kind === 'petExp') {
        const r = STATE.grantPetExp(p, recipe.petExp || 1);
        if (r.error) { pills[recipeId] = (pills[recipeId] || 0) + 1; return { error: r.error }; }
        return { ok: true, recipe, pet: r };
      }
      if (recipe.kind === 'exp') {
        p.realm.exp = (p.realm.exp || 0) + (recipe.exp || 0);
        // 复用 checkLevelUp：与修炼升级完全一致（境界等级上限封顶、升级回满血蓝、expMax 随级增长）
        const ups = STATE.checkLevelUp(p);
        if (ups && ups.length) return { ok: true, recipe, lvUp: ups };
        return { ok: true, recipe };
      }
      if (recipe.kind === 'permAttr') {
        const v = recipe.val;
        if (recipe.attr === 'all') {
          p.baseLife = Math.floor(p.baseLife * (1 + v));
          p.baseMp = Math.floor(p.baseMp * (1 + v));
          p.baseAtk = Math.floor(p.baseAtk * (1 + v));
          p.baseDef = Math.floor(p.baseDef * (1 + v));
        } else if (recipe.attr === 'life') p.baseLife = Math.floor(p.baseLife * (1 + v));
        else if (recipe.attr === 'atk') p.baseAtk = Math.floor(p.baseAtk * (1 + v));
        else if (recipe.attr === 'def') p.baseDef = Math.floor(p.baseDef * (1 + v));
        p.hp = Math.min(STATE.calcMaxHp(p), p.hp);
        p.mp = Math.min(STATE.calcMaxMp(p), p.mp);
        return { ok: true, recipe };
      }
      if (recipe.id === 'xiaohuandan') p.hp = Math.min(STATE.calcMaxHp(p), p.hp + Math.floor(STATE.calcMaxHp(p) * 0.3));
      if (recipe.id === 'dahuandan') p.hp = Math.min(STATE.calcMaxHp(p), p.hp + Math.floor(STATE.calcMaxHp(p) * 0.6));
      // 多级回灵力丹药（按 id 分派：25%/50%/80%/100%）
      if (recipe.id === 'xiaohuiling') p.mp = Math.min(STATE.calcMaxMp(p), p.mp + Math.floor(STATE.calcMaxMp(p) * 0.25));
      if (recipe.id === 'huiling') p.mp = Math.min(STATE.calcMaxMp(p), p.mp + Math.floor(STATE.calcMaxMp(p) * 0.5));
      if (recipe.id === 'dahuiling') p.mp = Math.min(STATE.calcMaxMp(p), p.mp + Math.floor(STATE.calcMaxMp(p) * 0.8));
      if (recipe.id === 'shenhuiling') p.mp = Math.min(STATE.calcMaxMp(p), p.mp + Math.floor(STATE.calcMaxMp(p) * 1.0));
      if (recipe.id === 'qingxin') { p.buffs = []; p.debuffs = []; }
      // V1.3.20：神行丹为 kind:'buff'，已被上方拦截（仅战斗中可服），此处死代码已移除
      if (recipe.id === 'hanbing') p.unlocked.add('immune_heat');
      return { ok: true, recipe };
    },

    /* ============== 灵材市场（每日随机价格±50%，可买卖） ============== */
    /** 每日委托板（支线补齐·每日3条限时委托，次日刷新） */
    getCommissions(p) {
      const day = p.day || 1;
      if (p._commissionDay !== day) {
        p._commissionDay = day;
        p._commissionDone = [];
      }
      const seed = (day + 7) * 2654435761 % 2147483647;
      const rng = (() => {
        let s = seed;
        return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
      })();
      const templates = [
        { req: ['MAT-C01', 3], gold: 90,  pill: null,          desc: '青丘药铺急需朱果熬药。' },
        { req: ['MAT-C02', 2], gold: 120, pill: 'jingyuan',    desc: '药圣门下求购灵芝，炼丹入药。' },
        { req: ['MAT-C05', 2], gold: 110, pill: null,          desc: '月下商行收购月光草制香。' },
        { req: ['MAT-JG02', 3], gold: 130, pill: 'zengqi',     desc: '轩辕铁匠铺短缺精铁，铸器在即。' },
        { req: ['MAT-FS02', 3], gold: 130, pill: 'tiebi',      desc: '羽民织坊收云锦花染霞衣。' },
        { req: ['MAT-G01', 3], gold: 150, pill: 'jingyuan',    desc: '灵圃商行高价收天香草。' },
        { req: ['MAT-G04', 2], gold: 180, pill: 'jifeng',      desc: '玄冰阁寻玄冰花制寒玉膏。' },
        { req: ['MAT-G05', 2], gold: 200, pill: 'lingguang',   desc: '火工道人求地火藤引地火。' },
        { req: ['MAT-C07', 2], gold: 220, pill: 'zengqi',      desc: '御兽斋收缩形草驯化灵兽。' },
        { req: ['MAT-C08', 2], gold: 260, pill: 'longli',      desc: '织仙阁重金购织梦丝。' },
        { req: ['MAT-INCENSE1', 1], gold: 120, pill: null,     desc: '城隍庙收普通灵香供奉。' }
      ];
      const sh = templates.slice();
      for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
      const done = p._commissionDone || [];
      const list = sh.slice(0, 3).map((t, i) => {
        const [mat, need] = t.req;
        const has = STATE.hasMaterial(p, mat, need);
        return { id: 'c' + i, reqMat: mat, need, gold: t.gold, pill: t.pill, desc: t.desc, has, done: done.indexOf('c' + i) >= 0 };
      });
      return { day, list };
    },

    /** 交付委托：校验并扣除材料，发放奖励 */
    claimCommission(p, idx) {
      const cc = STATE.getCommissions(p);
      const it = cc.list[idx];
      if (!it) return { error: '委托不存在' };
      if (it.done) return { error: '该委托已完成' };
      if (!STATE.hasMaterial(p, it.reqMat, it.need)) return { error: '材料不足：需要' + STATE.matName(it.reqMat) + '×' + it.need };
      STATE.removeMaterial(p, it.reqMat, it.need);
      p.gold = (p.gold || 0) + it.gold;
      const gotPill = it.pill ? { pill: it.pill } : null;
      if (gotPill) { if (!p.pills) p.pills = {}; p.pills[it.pill] = (p.pills[it.pill] || 0) + 1; STATE.recordTome(p, it.pill); }
      if (!p._commissionDone) p._commissionDone = [];
      p._commissionDone.push(it.id);
      return { ok: true, gold: it.gold, pill: it.pill, name: STATE.matName(it.reqMat) };
    },

    /** 今日市场（按天数种子随机，价格±50%浮动，同一日内固定）
     *  - 通用/探险灵材：每日随机 5~7 种
     *  - 灵圃种子：每日随机 3~4 种（种子极易获得，价格低廉）
     *  - 稀有进化材料：每日随机 1~2 种各国"之精/碎片"（宠物进化材料可由商人购得） */
    getMarket(p) {
      const day = p.day || 1;
      // 用天数做随机种子，保证同一天价格一致
      const seed = day * 2654435761 % 2147483647;
      const rng = (() => {
        let s = seed;
        return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
      })();
      const items = [];
      // —— 通用 + 低阶探险灵材 ——
      const catalog = ['MAT-C01','MAT-C02','MAT-C03','MAT-C05','MAT-C06','MAT-C07','MAT-C08',
        'MAT-E01','MAT-E02','MAT-E03','MAT-E04','MAT-E05','MAT-E06','MAT-E09','MAT-E10','MAT-E11','MAT-E13','MAT-E14'];
      const basePrice = { 'MAT-C01':10,'MAT-C02':15,'MAT-C03':20,'MAT-C05':18,'MAT-C06':25,'MAT-C07':30,'MAT-C08':40,
        'MAT-E01':12,'MAT-E02':14,'MAT-E03':16,'MAT-E04':18,'MAT-E05':20,'MAT-E06':22,'MAT-E09':45,'MAT-E10':50,'MAT-E11':55,'MAT-E13':60,'MAT-E14':65 };
      const shuffled = catalog.slice();
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      const count = 5 + Math.floor(rng() * 3);
      const fameDisc = STATE.fameInfo(p).discount || 0;   // 名声联动：通关国家越多，商旅越给面子
      for (let i = 0; i < count; i++) {
        const id = shuffled[i];
        const base = basePrice[id] || 20;
        const mult = 0.5 + rng();
        const buyPrice = Math.max(1, Math.round(base * mult * (1 - fameDisc)));
        items.push({ id, name: STATE.matName(id), buyPrice, sellPrice: Math.max(1, Math.round(buyPrice * 0.6)) });
      }
      // —— 灵圃种子（每日 3~4 种，价格低廉） ——
      const seedCatalog = (global.MATERIALS && global.MATERIALS.allCropSeeds) ? global.MATERIALS.allCropSeeds() : [];
      const sShuf = seedCatalog.slice();
      for (let i = sShuf.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sShuf[i], sShuf[j]] = [sShuf[j], sShuf[i]]; }
      const seedCount = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < seedCount && i < sShuf.length; i++) {
        const id = sShuf[i];
        const crop = global.MATERIALS.cropOf(id);
        const base = (crop && crop.days >= 5) ? 40 : (crop && crop.days >= 4) ? 25 : 12;
        const mult = 0.5 + rng();
        const buyPrice = Math.max(1, Math.round(base * mult * (1 - fameDisc)));
        items.push({ id, name: STATE.matName(id), buyPrice, sellPrice: Math.max(1, Math.round(buyPrice * 0.5)), tag: 'seed' });
      }
      // —— 稀有进化材料（各国之精/碎片，每日 1~2 种，价格昂贵） ——
      const evoCatalog = [
        'MAT-FS05','MAT-YH05','MAT-JG05','MAT-XG05','MAT-HT05','MAT-SS05','MAT-NE05','MAT-DR05',
        'MAT-BM05','MAT-CG05','MAT-ZR05','MAT-JJ05','MAT-RL05','MAT-SM05','MAT-WC05','MAT-YM05','MAT-JX05','MAT-QZ05','MAT-GX05',
        'MAT-FS07','MAT-YH07','MAT-JG07','MAT-XG07','MAT-HT07','MAT-SS07','MAT-NE07','MAT-DR07',
        'MAT-BM07','MAT-CG07','MAT-ZR07','MAT-JJ07','MAT-RL07','MAT-SM07','MAT-WC07','MAT-YM07','MAT-JX07','MAT-QZ07','MAT-GX07'
      ];
      const eShuf = evoCatalog.slice();
      for (let i = eShuf.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [eShuf[i], eShuf[j]] = [eShuf[j], eShuf[i]]; }
      const evoCount = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < evoCount; i++) {
        const id = eShuf[i];
        const isFrag = id.indexOf('07') >= 0;
        const base = isFrag ? 220 : 120;
        const mult = 0.5 + rng();
        const buyPrice = Math.max(1, Math.round(base * mult * (1 - fameDisc)));
        items.push({ id, name: STATE.matName(id), buyPrice, sellPrice: Math.max(1, Math.round(buyPrice * 0.5)), tag: 'evo' });
      }
      // 今日特惠：随机一件商品再减 20%（促进集市活跃度）
      if (items.length > 1) {
        const saleIdx = Math.floor(rng() * items.length);
        const it = items[saleIdx];
        it.sale = true;
        it.buyPrice = Math.max(1, Math.round(it.buyPrice * 0.8));
        it.sellPrice = Math.max(1, Math.round(it.sellPrice * 0.8));
      }
      return { day, items };
    },

    /* ============== 国家状态（影响探索风险/材料/特殊灵材） ============== */
    /** 国家状态：由恶念值决定（0-100） */
    nationState(p, nationId) {
      const evil = (p.nationEvil && p.nationEvil[nationId] != null) ? p.nationEvil[nationId] : 0;
      if (evil >= 70) return { id:'devastated', name:'毁灭', evil };
      if (evil >= 40) return { id:'chaotic', name:'动荡', evil };
      if (evil >= 15) return { id:'unstable', name:'混乱', evil };
      return { id:'good', name:'良好', evil };
    },

    /** 特殊环境灵材（仅特定国家状态产出） */
    envSpecialMaterial(nationId, state) {
      const map = {
        'qingqiu': { good:['MAT-C07'], devastated:['MAT-F05'] },
        'yanhuo':  { good:['MAT-YH05'], devastated:['MAT-F06'] },
        'yumin':   { good:['MAT-FS05'], devastated:['MAT-F07'] },
        'xuangu':  { good:['MAT-XG05'], devastated:['MAT-F08'] },
        'huantou': { good:['MAT-HT05'], devastated:['MAT-F09'] }
      };
      const entry = map[nationId];
      if (!entry) return null;
      if (state === 'devastated') return entry.devastated;
      if (state === 'good') return entry.good;
      return null;
    },

    /* ============== 探索分区（按解锁国家） ============== */
    /** 已解锁国家列表（通过 completed 判定通关） */
    /** 各国前情提要（进入该国时的"此前……"回顾，帮助隔日续玩的玩家快速接回剧情） */
    nationRecap(nationId) {
      const map = {
        qingqiu: '青丘桃林异变，影狐一族因百年前的屠戮怨念成魔。你受托查探，即将在幻与真之间做出抉择。',
        yumin: '天羽、地居、半羽三族因血统壁垒彼此仇视，风灵通道濒死。你踏入天羽城，直面阶层之壁。',
        yanhuo: '厌火国熔炉之火将熄，灰族以身为缓冲承受污染。火无贵贱，还是弱肉强食，将取决于你的选择。',
        xuanyuan: '机关城核心被蚀，机关人开始觉醒。墨守与公输月各执一词，机械与觉醒之争一触即发。',
        xuangu: '水神封印亟待「容器」承载，沧溟被父当作祭品。牺牲一人救苍生，还是另寻他途，你须作出决断。',
        huantou: '鸣海渊母痛苦哀嚎，大渊主以活祭隐瞒真相，潜奴世代受压。倾听，还是随波，将改变这片海域。',
        sanshou: '魂井异动，善念、恶念、执念三魂分离。「镜试」让你直面自身的三个面相。',
        nieer: '穷奇之耳（寂灭之音）苏醒，吞噬声音与存在。倾听还是静默，是这片失语之地的终极命题。',
        daren: '擎天柱（夸父骨骼）被蚀骨唤醒，夸父之渴癌变。巨人与侏儒之间，擎天、补天还是堕天？',
        baimin: '饕餮之口侵蚀契约纽带，兽灵集体疏远人类。契约是桥还是锁，将由你的选择定义。',
        changgu: '饕餮之牙咬碎时间，裂时渊时间错乱。逐时、凝时还是吞时，关乎这片土地的存续。',
        zhurao: '混沌之鳞侵蚀微观世界的绝对秩序。秩序与无序之争，在微尘国度中悄然上演。',
        jiaojing: '穷奇之爪撕碎命线因果，交胫族以命轮织机编织因果。续命、断因还是缠世？',
        rouli: '混沌之尾消化形态，柔利族靠蜕皮维持完整。完形、蜕尽还是混生，是形体与自我的拷问。',
        shenmu: '归墟之隙的「注视」从裂缝看过来，所见之处未来被确定。睁目、闭目，还是与瞳渊对视？',
        wuchang: '饕餮之胃消化存在，无肠族以熔炉为腹永远进食。饱足、空腹还是吞天？',
        yimu: '混沌之目窥视真相，盲者被强迫观看。明视、盲守还是乱瞳，将决定一目国的命运。',
        jiexiong: '梼杌之胸连接存在，结胸族以贯核相连。全连、断连还是贯天？',
        qizhong: '梼杌之足行走存在，跂踵族无踵永远行走。全行、驻足还是行天？',
        guixu: '归墟，四凶的最终巢穴。二十道本体气息在此汇聚，四凶本为一体的真相即将揭晓。'
      };
      return map[nationId] || '';
    },

    /** 纯通关判断（不包含"当前国家恒通关"特判）：只认 CLEARED 标记
     *  用于 enterExplore/getQuestGuide 判断"该国剧情是否未完成"
     *  （unlockedNations.cleared 含 qingqiu/p.nation 特判，仅用于地图显示，不可用于此判断） */
    isNationCleared(p, nationId) {
      const upper = { qingqiu:'QINGQIU', yumin:'YUMIN', yanhuo:'YANHUO', xuanyuan:'XUANYUAN', xuangu:'XUANGU', huantou:'HUANTOU', sanshou:'SANSHOU', nieer:'NIEER', daren:'DAREN', baimin:'BAIMIN', changgu:'CHANGGU', zhurao:'ZHURAO', jiaojing:'JIAOJING', rouli:'ROULI', shenmu:'SHENMU', wuchang:'WUCHANG', yimu:'YIMU', jiexiong:'JIEXIONG', qizhong:'QIZHONG', guixu:'GUIXU' };
      const completedArr = (p.completed && p.completed.forEach) ? Array.from(p.completed) : [];
      if (nationId === 'qingqiu') {
        // 青丘：第1境主线完成标记 Q01_MAIN_DONE（或兼容 qingqiu_cleared）
        return completedArr.some(c => c === 'qingqiu_cleared' || c === 'Q01_MAIN_DONE' || c.indexOf('QINGQIU_MAIN_DONE') >= 0);
      }
      const up = upper[nationId];
      return completedArr.some(c => c === (nationId + '_cleared') || (up && c.indexOf(up + '_') === 0 && c.indexOf('_CLEARED') > 0));
    },

    unlockedNations(p) {
      const all = ['qingqiu','yumin','yanhuo','xuanyuan','xuangu','huantou','sanshou','nieer','daren','baimin','changgu','zhurao','jiaojing','rouli','shenmu','wuchang','yimu','jiexiong','qizhong','guixu'];
      // 国家大写前缀映射（与剧情 completeQuest 的 CLEARED 标记前缀一致）
      const upper = { qingqiu:'QINGQIU', yumin:'YUMIN', yanhuo:'YANHUO', xuanyuan:'XUANYUAN', xuangu:'XUANGU', huantou:'HUANTOU', sanshou:'SANSHOU', nieer:'NIEER', daren:'DAREN', baimin:'BAIMIN', changgu:'CHANGGU', zhurao:'ZHURAO', jiaojing:'JIAOJING', rouli:'ROULI', shenmu:'SHENMU', wuchang:'WUCHANG', yimu:'YIMU', jiexiong:'JIEXIONG', qizhong:'QIZHONG', guixu:'GUIXU' };
      const completedArr = (p.completed && p.completed.forEach) ? Array.from(p.completed) : [];
      const isCleared = (n) => {
        if (n === 'qingqiu' || p.nation === n) return true;
        const up = upper[n];
        // 兼容：'{大写}_..._CLEARED' 或 '{小写}_cleared' 两种标记
        return completedArr.some(c => c === (n + '_cleared') || (up && c.indexOf(up + '_') === 0 && c.indexOf('_CLEARED') > 0));
      };
      const cleared = all.filter(isCleared);
      // 可进入的国家：无前置条件 → 全部默认解锁（自由探索）；有前置条件 → 满足前置才解锁
      const unlocked = all.filter(n => {
        const pre = STATE.getNationPrereq(n);
        if (!pre) return true;                      // 无前置：自由进入
        return STATE.checkNationPrereq(p, n).ok;    // 有前置：须满足前置条件（如归墟需通关跂踵）
      });
      return { all, cleared, unlocked };
    },

    /** 探索某区域（按国家） */
    exploreRegion(p, nationId) {
      if (!STATE.spendShichen(p, 1)) return { noTime: true };
      p._exploreTimes = (p._exploreTimes || 0) + 1;   // 成就统计
      STATE.addDaily(p, 'explore', 1);                // 每日目标
      STATE.trackWeekly(p, 'explore');                // 每周任务
      try { if (typeof global.META !== 'undefined' && META.trackNovice) META.trackNovice('explore', 1); } catch (e) {}
      const state = STATE.nationState(p, nationId);
      // 风险：国家状态越差，遇敌概率越高
      const riskMap = { good:0.20, unstable:0.28, chaotic:0.36, devastated:0.45 };
      const monsterChance = riskMap[state.id] || 0.25;
      const roll = Math.random();
      if (roll < monsterChance) {
        return { event:'monster', enemy: STATE.exploreEnemy(p), nation: nationId, state };
      }
      // 特殊环境灵材（仅特定状态）
      const special = STATE.envSpecialMaterial(nationId, state.id);
      if (special && roll < monsterChance + 0.08) {
        const matId = RNG.pick(special);
        STATE.addMaterial(p, matId, 1);
        return { event:'special', mat: matId, nation: nationId, state };
      }
      // 宠物幼崽/图纸/丹方
      if (roll < monsterChance + 0.12) {
        return { event:'recipe' };
      }
      if (roll < monsterChance + 0.15) {
        return { event:'blueprint' };
      }
      if (roll < monsterChance + 0.19) {
        return { event:'petEgg' };
      }
      // 隐藏剧情（5%概率·珍贵事件，需正确抉择）
      if (roll < monsterChance + 0.24) {
        const ev = STATE.hiddenExplorEvent(p);
        return { event:'hidden', hidden: ev, nation: nationId };
      }
      // 双刃剑事件（4%概率·肉鸽式风险抉择，收益与代价并存）
      if (roll < monsterChance + 0.28) {
        const ev = STATE.rogueGambleEvent(p);
        return { event:'gamble', gamble: ev, nation: nationId };
      }
      // 灵香（供奉材料，三层级概率不同）
      if (roll < monsterChance + 0.31) {
        const r2 = Math.random();
        const incense = r2 < 0.10 ? 'MAT-INCENSE3' : (r2 < 0.35 ? 'MAT-INCENSE2' : 'MAT-INCENSE1');
        STATE.addMaterial(p, incense, 1);
        return { event:'incense', mat: incense, nation: nationId };
      }
      // 传闻线索（3%）：含蓄提示隐藏内容，埋探索钩子
      if (roll < monsterChance + 0.34) {
        const rumors = [
          '你听一位采药人低语：「据说有人凑齐了龙血凤血两枚命格，气运大不相同……」',
          '路过的散修提起：「桃林深处似有墨家遗迹，非寻常人所能窥见。」',
          '茶馆里有人议论：「四凶并非四只，而是……一只。」你正要追问，那人却已起身离去。',
          '你拾到一张残破图纸边角，上面写着「影」「风」二字，指向某种失传的传承。'
        ];
        return { event:'rumor', text: RNG.pick(rumors), nation: nationId };
      }
      // 常规灵材（按国家前缀 + 通用 + 种子，种子有独立概率）
      const natPrefix = { qingqiu:'C', yumin:'FS', yanhuo:'YH', xuanyuan:'JG', xuangu:'XG', huantou:'HT', sanshou:'SS', nieer:'NE', daren:'DR', baimin:'BM', changgu:'CG', zhurao:'ZR', jiaojing:'JJ', rouli:'RL', shenmu:'SM', wuchang:'WC', yimu:'YM', jiexiong:'JX', qizhong:'QZ', guixu:'GX' };
      const pref = natPrefix[nationId] || 'C';
      // 种子掉落：30% 概率额外获得本国种子（SEED-XX01/02）；另有 35% 概率混入灵圃特产种子（稀有灵材的种子并不稀有）
      let seedId = null;
      if (RNG.chance(0.30)) {
        const seedPool = ['SEED-' + pref + '01', 'SEED-' + pref + '02', 'SEED-C01', 'SEED-C05'];
        if (RNG.chance(0.35)) {
          const gSeeds = ['SEED-G01','SEED-G02','SEED-G03','SEED-G04','SEED-G05','SEED-G06','SEED-G07','SEED-G08','SEED-G09'];
          seedPool.push(RNG.pick(gSeeds));
        }
        seedId = RNG.pick(seedPool);
        STATE.addMaterial(p, seedId, 1);
      }
      // 材料池含 01/02/03/05/06（06 为转职必需材料，需可获取）+ 通用灵材
      // 06 相对稀有，用加权：普通池一份 + 专有概率
      const mats = ['MAT-' + pref + '01','MAT-' + pref + '02','MAT-' + pref + '03','MAT-' + pref + '05','MAT-' + pref + '06','MAT-C01','MAT-C02'];
      let matId;
      if (RNG.chance(0.08)) {
        // 8% 概率掉该国 07 四凶碎片（宠物进化到隐藏形态必需；仅部分国家有剧情一次性奖励，
        // 补此产出保证所有宠物的最终进化可达成，避免断链）
        matId = 'MAT-' + pref + '07';
      } else if (RNG.chance(0.25)) {
        // 25% 概率固定掉转职稀有材料 06（保证转职材料可积累）
        matId = 'MAT-' + pref + '06';
      } else {
        matId = RNG.pick(mats);
      }
      const n = RNG.intBetween(1, 3);
      STATE.addMaterial(p, matId, n);
      // 金币
      const gold = RNG.intBetween(5, 30);
      p.gold = (p.gold || 0) + gold;
      return { event:'material', mat: matId, n, gold, seed: seedId, nation: nationId, state };
    },

    /* ============== 隐藏职业图纸（按国家对应，在对应国家探索获得） ============== */
    /** 随机返回一张未获得的隐藏职业图纸（优先当前国家的职业） */
    randomBlueprint(p, nationId) {
      const hidden = STATE.getHiddenProfessions();
      const allBps = Object.keys(hidden).map(k => hidden[k].bp);
      // 当前国家对应的职业图纸（优先）
      const localBps = Object.keys(hidden).filter(k => hidden[k].nation === nationId).map(k => hidden[k].bp);
      const pool = (localBps.length ? localBps : allBps);
      // 只从"未获得"的图纸里选
      const unowned = pool.filter(bp => !(p.unlocked || new Set()).has(bp));
      if (unowned.length === 0) return null;
      // 优先本国，60%概率本国产出，40%随机其他
      if (localBps.length && RNG.chance(0.6)) {
        const localUnowned = localBps.filter(bp => !(p.unlocked || new Set()).has(bp));
        if (localUnowned.length) return RNG.pick(localUnowned);
      }
      return RNG.pick(unowned);
    },

    /* ============== 隐藏剧情（探险珍贵事件·不能选错） ============== */
    hiddenExplorEvent(p) {
      // 珍稀隐藏事件池
      const events = [
        { id:'h_ruins', name:'上古洞府', good:['MAT-F13','MAT-F15'], desc:'一座上古洞府浮现，内藏至宝。' },
        { id:'h_spirit', name:'灵泉', good:['MAT-E32','MAT-F17'], desc:'一口灵泉喷涌，泉水蕴含天地精华。' },
        { id:'h_beast', name:'神兽遗蜕', good:['MAT-E25','MAT-F16'], desc:'一具神兽遗蜕横陈，龙骨犹存。' }
      ];
      return RNG.pick(events);
    },

    /* ============== 双刃剑事件（肉鸽式风险抉择·收益诱人代价明确） ============== */
    /**
     * 返回一个双刃剑事件对象。类型：
     *   type:'blood'  血契换道 —— 永久牺牲生命上限换修为
     *   type:'gamble' 豪赌灵石 —— 押上金币对赌
     *   type:'blood2' 神兽精血 —— 消耗珍贵灵材换命格抽取机会
     * 事件由 UI 渲染成「接受 / 拒绝」二选一，接受后即时结算。
     */
    rogueGambleEvent(p) {
      const pool = ['blood', 'gamble', 'blood2'];
      const type = RNG.pick(pool);
      if (type === 'blood') {
        // 血契换道：牺牲当前 3% 生命上限，换取大量修为（当前满经验的 200%）
        const expMax = (p.realm && p.realm.expMax) || 100;
        const gain = Math.floor(expMax * 2);
        const costLife = Math.max(1, Math.floor(p.baseLife * 0.03));
        return {
          id: 'gamble_blood', type: 'blood', name: '血契换道',
          desc: '一座血色祭坛浮现在你面前，祭文低语：以血肉为祭，可换天地灵气灌顶。',
          offer: `立即获得 ${gain} 点修为`,
          cost: `永久牺牲 ${costLife} 点生命上限（当前生命上限 ${STATE.calcMaxHp(p)}）`,
          gain, costLife
        };
      }
      if (type === 'gamble') {
        // 豪赌灵石：押上 50% 金币，50% 翻倍 / 50% 血本无归
        const stake = Math.floor((p.gold || 0) * 0.5);
        return {
          id: 'gamble_gold', type: 'gamble', name: '豪赌灵石',
          desc: '山道旁，一个盲眼老妪设下赌局，面前的灵石散发着令人目眩的光。',
          offer: `押上 ${stake} 金币，胜则翻倍（+${stake}），负则血本无归`,
          cost: '若败，将失去押上的全部金币',
          stake
        };
      }
      // blood2：神兽精血 —— 消耗 2 份珍贵灵材，换 1 次命格抽取机会
      const priceMats = ['MAT-F13', 'MAT-F15', 'MAT-F16', 'MAT-F17', 'MAT-SC15', 'MAT-B16'];
      const owned = priceMats.filter(m => (p.materials[m] || 0) >= 1);
      return {
        id: 'gamble_blood2', type: 'blood2', name: '神兽精血',
        desc: '一尊神兽残魂盘踞洞中，它的精血可助你凝炼命格，但需以珍稀灵材交换。',
        offer: '获得 1 次命格抽取机会',
        cost: owned.length ? `消耗 2 份珍贵灵材（你拥有：${owned.map(m => STATE.matName(m)).join('、')}）` : '消耗 2 份珍贵灵材（你暂无足够灵材）',
        priceMats, hasMats: owned.length >= 2
      };
    },

    /** 结算双刃剑事件：接受时调用。返回 { ok, text } 或 { error } */
    resolveGamble(p, ev) {
      if (!ev) return { error: '事件不存在' };
      if (ev.type === 'blood') {
        // 血契：牺牲生命上限换修为
        const beforeLife = p.baseLife;
        p.baseLife = Math.max(1, p.baseLife - ev.costLife);
        // 修为直接加上（会触发升级检测）
        p.realm.exp = (p.realm.exp || 0) + ev.gain;
        const lvUp = STATE.checkLevelUp(p);
        // 生命上限变化后，当前 hp 同步收缩
        p.hp = Math.min(STATE.calcMaxHp(p), p.hp);
        let text = `血契生效！生命上限 -${ev.costLife}（${beforeLife}→${p.baseLife}），修为 +${ev.gain}。`;
        if (lvUp) text += ` 境界突破至 Lv${lvUp[lvUp.length - 1]}！`;
        return { ok: true, text };
      }
      if (ev.type === 'gamble') {
        // 豪赌：50% 翻倍 / 50% 血本无归
        const stake = ev.stake;
        if (stake <= 0) return { error: '金币不足，无法入局' };
        if (RNG.chance(0.5)) {
          p.gold = (p.gold || 0) + stake;
          return { ok: true, text: `灵石迸发璀璨光芒——你赢了！金币 +${stake}，现有 ${p.gold} 金币。` };
        } else {
          p.gold = (p.gold || 0) - stake;
          return { ok: true, text: `灵石黯淡下去——你输了。金币 -${stake}，现有 ${p.gold} 金币。` };
        }
      }
      if (ev.type === 'blood2') {
        // 神兽精血：消耗 2 份珍贵灵材换命格抽取机会
        const owned = ev.priceMats.filter(m => (p.materials[m] || 0) >= 1);
        if (owned.length < 2) return { error: '珍贵灵材不足，无法交换' };
        // 消耗前 2 种
        let consumed = 0;
        const used = [];
        for (const m of ev.priceMats) {
          if (consumed >= 2) break;
          if ((p.materials[m] || 0) >= 1) { STATE.removeMaterial(p, m, 1); used.push(STATE.matName(m)); consumed++; }
        }
        p.drawChances = (p.drawChances || 0) + 1;
        return { ok: true, text: `神兽精血融入你体内，命格凝炼之机 +1（消耗：${used.join('、')}）。` };
      }
      return { error: '未知事件' };
    },

    /* ============== 供奉系统（各路神仙·只能供奉一种·不可更改） ============== */
    /** 供奉神仙图鉴：每神给 3 个技能（2主动+1被动），按供奉值 unlock 分段解锁（解锁前不显示具体内容） */
    getGods() {
      return {
        nuwa: { id:'nuwa', name:'女娲', domain:'造化·生命', role:'heal_def', roleDesc:'恢复 · 守护 —— 补天造化，濒死保命', desc:'抟土造人，补天救世。', img:'assets/img/gods/nuwa.jpg',
          master:'圣母女娲', bonus:{ life:0.18, def:0.06, mp:0.06 }, profMatch:null,
          skills:[
            { id:'nw_mend', name:'补天诀', type:'skill', element:'土', power:1.4, cd:3, mp:14, desc:'以五彩石补天，伤害并减伤', unlock:200 },
            { id:'nw_life', name:'造化生', type:'skill', element:'木', power:0, cd:4, mp:16, desc:'造化生机，恢复自身30%生命', unlock:600 },
            { id:'nw_guard', name:'五彩护体', type:'passive', desc:'受致命伤时保留1点生命（每战1次）', eff:{ type:'fatalSave' }, unlock:1000 }
          ] },
        sanqing: { id:'sanqing', name:'三清', domain:'道门·无极', role:'attack', roleDesc:'攻击 · 道法 —— 五行法术，元素压制', desc:'元始天尊、灵宝天尊、道德天尊。', img:'assets/img/gods/sanqing.jpg',
          master:'三清道祖', bonus:{ atk:0.20, mp:0.10 }, profMatch:'tao',
          skills:[
            { id:'sq_wuji', name:'无极真火', type:'skill', element:'火', power:1.6, cd:3, mp:16, desc:'三昧真火，灼烧破甲', unlock:200 },
            { id:'sq_leifa', name:'太上雷法', type:'skill', element:'雷', power:1.5, cd:3, mp:15, desc:'太上引雷，麻痹', unlock:600 },
            { id:'sq_dao', name:'道法自然', type:'passive', desc:'元素伤害+15%', eff:{ type:'elementDmg', mul:0.15 }, unlock:1000 }
          ] },
        leizu: { id:'leizu', name:'雷祖', domain:'天雷·诛邪', role:'attack_crit', roleDesc:'攻击 · 爆发 —— 雷系诛邪，暴击压制', desc:'执掌天雷，诛邪荡魔。', img:'assets/img/gods/leizu.jpg',
          master:'雷祖天尊', bonus:{ atk:0.25, crit:0.10 }, profMatch:null,
          skills:[
            { id:'lz_eye', name:'浩宇神眸', type:'skill', element:'雷', power:1.6, cd:3, mp:16, desc:'开第三只眼，诛邪荡魔伤害大增', unlock:200 },
            { id:'lz_dang', name:'诛邪神雷', type:'skill', element:'雷', power:1.7, cd:3, mp:18, desc:'荡魔之雷，对邪魔伤害+50%', unlock:600 },
            { id:'lz_wei', name:'雷威', type:'passive', desc:'雷系伤害+20%', eff:{ type:'elementSpecific', element:'雷', mul:0.20 }, unlock:1000 }
          ] },
        kongzi: { id:'kongzi', name:'孔子', domain:'儒门·教化', role:'balance', roleDesc:'均衡 · 强化 —— 攻防兼备，全面点化', desc:'至圣先师，万世师表。', img:'assets/img/gods/kongzi.jpg',
          master:'至圣先师', bonus:{ def:0.15, atk:0.10, mp:0.10 }, profMatch:'confucian',
          skills:[
            { id:'kz_haoran', name:'浩然正气', type:'skill', element:'金', power:1.5, cd:3, mp:15, desc:'浩然长存，破甲镇邪', unlock:200 },
            { id:'kz_jiao', name:'有教无类', type:'skill', element:'道', power:0, cd:4, mp:16, desc:'点化自身，全属性+20%', unlock:600 },
            { id:'kz_wen', name:'文以载道', type:'passive', desc:'元素伤害+12%，言灵CD-10%', eff:{ type:'elementDmg', mul:0.12, cdReduce:0.10 }, unlock:1000 }
          ] },
        cangjie: { id:'cangjie', name:'仓颉', domain:'造字·文明', role:'sustain', roleDesc:'续航 · 减耗 —— 字镇山河，灵转如意', desc:'造字圣人，文明之始。', img:'assets/img/gods/cangjie.jpg',
          master:'造字圣人', bonus:{ mp:0.25, atk:0.08 }, profMatch:null,
          skills:[
            { id:'cj_zi', name:'字镇山河', type:'skill', element:'金', power:1.5, cd:3, mp:15, desc:'一字镇山河，破甲', unlock:200 },
            { id:'cj_ling', name:'灵字诀', type:'skill', element:'道', power:1.4, cd:3, mp:14, desc:'灵字攻心，吸血', unlock:600 },
            { id:'cj_wen', name:'文脉', type:'passive', desc:'技能灵力消耗-15%', eff:{ type:'mpReduce', mul:0.15 }, unlock:1000 }
          ] },
        zhurong: { id:'zhurong', name:'祝融', domain:'火神·锻器', role:'attack_fire', roleDesc:'攻击 · 火系 —— 焚天锻神，灼烧压制', desc:'火神，掌天下之火。', img:'assets/img/gods/zhurong.jpg',
          master:'火神祝融', bonus:{ atk:0.15, def:0.05 }, profMatch:null,
          skills:[
            { id:'zr_fire', name:'焚天火', type:'skill', element:'火', power:1.6, cd:3, mp:16, desc:'焚天烈焰，灼烧', unlock:200 },
            { id:'zr_forge', name:'锻神', type:'skill', element:'火', power:1.4, cd:3, mp:14, desc:'以火锻己，攻击+20%', unlock:600 },
            { id:'zr_yan', name:'炎心', type:'passive', desc:'火系伤害+20%', eff:{ type:'elementSpecific', element:'火', mul:0.20 }, unlock:1000 }
          ] },
        rulai: { id:'rulai', name:'如来', domain:'佛门·极乐', role:'defense', roleDesc:'防御 · 守护 —— 金刚护体，格挡减伤', desc:'释迦牟尼，觉悟圆满，普度众生。', img:'assets/img/gods/rulai.jpg',
          master:'如来佛祖', bonus:{ def:0.20, life:0.15 }, profMatch:'zen',
          skills:[
            { id:'rl_zhang', name:'如来神掌', type:'skill', element:'金', power:1.6, cd:3, mp:16, desc:'佛光巨掌，破甲镇邪', unlock:200 },
            { id:'rl_jing', name:'金刚咒', type:'skill', element:'金', power:0, cd:4, mp:15, desc:'金刚护体，减伤30%', unlock:600 },
            { id:'rl_fa', name:'佛法无边', type:'passive', desc:'金系伤害+15%，格挡+10%', eff:{ type:'elementSpecific', element:'金', mul:0.15, blockBonus:0.10 }, unlock:1000 }
          ] },
        hongri: { id:'hongri', name:'红日真君', domain:'大日·朝阳', role:'all', roleDesc:'全能 · 神降 —— 大日普照，攻防一体', desc:'自长夜破晓而出的红日，驱尽世间阴霾，普照山海。', img:'assets/img/gods/hongri.jpg',
          master:'红日真君', bonus:{ atk:0.25, life:0.15, crit:0.15, def:0.10 }, profMatch:null, locked:true,
          lockAchievement:'hidden_xinsheng_taiyang',
          skills:[
            { id:'hr_dawn', name:'日出扶桑', type:'skill', element:'火', power:2.2, cd:3, mp:20, desc:'红日初升，其道大光，高额火伤并灼烧', unlock:200 },
            { id:'hr_chi', name:'赤日凌空', type:'skill', element:'火', power:1.9, cd:3, mp:18, desc:'赤日当空，焚尽邪祟，对邪魔伤害+80%', unlock:400 },
            { id:'hr_yao', name:'耀阳普照', type:'skill', element:'光', power:0, cd:4, mp:20, desc:'大日普照，恢复自身50%生命并全属性+25%', unlock:600 },
            { id:'hr_nu', name:'怒火焚天', type:'skill', element:'火', power:2.4, cd:4, mp:22, desc:'红日怒焰，毁天灭地，无视部分防御', unlock:800 },
            { id:'hr_heng', name:'恒照不灭', type:'passive', desc:'火系伤害+30%，暴击伤害+30%，免疫灼烧', eff:{ type:'elementSpecific', element:'火', mul:0.30, critDmg:0.30, immuneBurn:true }, unlock:1000 }
          ] }
      };
    },

    /** 当前供奉神已解锁的技能列表（按供奉值分段；未解锁的不返回内容） */
    getOfferUnlockedSkills(p) {
      if (!p || !p.offerGod) return { god:null, active:[], passive:null, all:[] };
      const god = STATE.getGods()[p.offerGod];
      if (!god) return { god:null, active:[], passive:null, all:[] };
      const value = p.offerValue || 0;
      const unlocked = god.skills.filter(s => (s.unlock || 0) <= value);
      const active = unlocked.filter(s => s.type !== 'passive');
      const passive = unlocked.find(s => s.type === 'passive') || null;
      return { god, active, passive, all: unlocked };
    },

    /** 供奉材料价值（灵香/灵材皆可，品质越高供奉值越多） */
    offerValue(matId) {
      // 灵香（专供供奉，价值最高）：一炷香 < 上等香 < 极品香
      const incense = { 'MAT-INCENSE1': 30, 'MAT-INCENSE2': 80, 'MAT-INCENSE3': 200 };
      if (incense[matId]) return incense[matId];
      // 灵圃特产稀有灵材（G01-03→12，G04-06→16，G07-08→20，G09→30）
      if (matId.indexOf('MAT-G') === 0) {
        const num = parseInt(matId.slice(5), 10);
        if (num >= 9) return 30;
        if (num >= 7) return 20;
        if (num >= 4) return 16;
        return 12;
      }
      // 伏魔窟珍贵材料（高阶稀有）
      if (matId.indexOf('MAT-F') === 0) return 25;
      // 各国「碎片/神核/至宝」级（编号 07、08 等珍贵产物）
      if (matId.indexOf('-07') > 0 || matId.indexOf('-08') > 0) return 18;
      // 各国「之精/精华」级（编号 05、06 精材）
      if (matId.indexOf('-05') > 0 || matId.indexOf('-06') > 0) return 14;
      // 探险材料（中阶）
      if (matId.indexOf('MAT-E') === 0) return 10;
      // 各国普通特产（编号 01~04 基础灵材）
      if (/^MAT-[A-Z]{2}\d/.test(matId)) return 8;
      // 图纸（博采众长，不可供奉，返回 0）
      if (matId.indexOf('BLUE-') === 0) return 0;
      // 种子（可用于供奉，价值低）
      if (matId.indexOf('SEED-') === 0) return 3;
      // 通用低阶灵材（朱果、灵芝等）
      if (matId.indexOf('MAT-C') === 0) return 5;
      return 5;  // 兜底普通材料
    },

    /** 供奉（只能供奉一种神，不可更改；材料不挑） */
    offer(p, godId, matId) {
      const gods = STATE.getGods();
      const god = gods[godId];
      if (!god) return { error: '神明不存在' };
      // 已供奉其他神则不可改
      if (p.offerGod && p.offerGod !== godId) return { error: '你已供奉' + (gods[p.offerGod] ? gods[p.offerGod].name : '') + '，供奉不可更改' };
      if (!STATE.hasMaterial(p, matId, 1)) return { error: '没有该材料' };
      STATE.removeMaterial(p, matId, 1);
      // 首次供奉：锁定该神（技能按供奉值分段解锁，不在此处一次性赋予）
      if (!p.offerGod) {
        p.offerGod = godId;
        p.offerValue = 0;
      }
      const prevValue = p.offerValue || 0;
      const gain = STATE.offerValue(matId);
      // 圆满溢出（V1.3.3 供奉深化）：供奉值满 1000 后继续供奉不再堆叠，
      // 溢出的香火化作「祖师赐福」命数（每 20 供奉值 = 1 命数）
      if (prevValue >= 1000) {
        const mingGain = Math.floor(gain / 20);
        let added = 0;
        if (mingGain > 0) { try { if (META.addMing) { META.addMing(mingGain); added = mingGain; } } catch (e) {} }
        STATE.applyOfferBonus(p, god);
        return { ok: true, god, value: 1000, full: true, mingGain: added, unlockedNow: [] };
      }
      p.offerValue = Math.min(1000, prevValue + gain);
      // 供奉属性加持（供奉值每 +10 分段提升）
      STATE.applyOfferBonus(p, god);
      // 检测是否有技能新解锁，返回给 UI 提示
      const unlockedNow = god.skills.filter(s => s.unlock && s.unlock > prevValue && s.unlock <= p.offerValue);
      const full = p.offerValue >= 1000;
      return { ok: true, god, value: p.offerValue, unlockedNow, full, mingGain: 0 };
    },

    /** 供奉属性加持：供奉值每 +10 升一段，每段给予固定小幅加持（封顶 100 段=1000 值） */
    applyOfferBonus(p, god) {
      const value = p.offerValue || 0;
      const stage = Math.min(100, Math.floor(value / 10));   // 每10点一段，满1000共100段
      const b = god.bonus || {};
      // 境界成长适配（V1.3.5）：供奉加成随玩家等级水涨船高——
      // 1级=1.0倍，90级≈1.9倍，后期暴涨的属性也能从神恩中获得等比增强
      const lvScale = 1 + ((p.lv || 1) - 1) * 0.01;
      // 每段加持 = 神明的满额 bonus 的 1/100（100段累计到满额），再乘等级缩放
      p._offerAtkBonus = (b.atk || 0) * (stage / 100) * lvScale;
      p._offerLifeBonus = (b.life || 0) * (stage / 100) * lvScale;
      p._offerMpBonus = (b.mp || 0) * (stage / 100) * lvScale;
      p._offerCritBonus = (b.crit || 0) * (stage / 100) * lvScale;
      p._offerDefBonus = (b.def || 0) * (stage / 100) * lvScale;
      p._offerStage = stage;
      p._offerLvScale = lvScale;
    },

    /** 供奉当前段数与每段加持说明（供 UI 展示） */
    offerStageInfo(p) {
      if (!p || !p.offerGod) return null;
      const god = STATE.getGods()[p.offerGod];
      if (!god) return null;
      const value = p.offerValue || 0;
      const stage = Math.min(100, Math.floor(value / 10));
      const b = god.bonus || {};
      const parts = [];
      if (b.atk) parts.push(`攻击+${Math.round(b.atk * 100)}%`);
      if (b.life) parts.push(`生命+${Math.round(b.life * 100)}%`);
      if (b.mp) parts.push(`灵力+${Math.round(b.mp * 100)}%`);
      if (b.def) parts.push(`防御+${Math.round(b.def * 100)}%`);
      if (b.crit) parts.push(`暴击+${Math.round(b.crit * 100)}%`);
      const nextStage = stage + 1;
      const perStage = parts.join('、');
      // 等级缩放说明（V1.3.5）：满额百分比为基准，随等级等比放大
      const lvScale = 1 + ((p.lv || 1) - 1) * 0.01;
      return {
        stage, nextStage,
        value,
        nextValue: nextStage * 10,
        perStageDesc: perStage ? `每升一段(${perStage} 的1%)` : '无属性加持',
        currentBonus: perStage ? `当前 ${Math.round(stage)}% 段位加持` : '',
        lvScaleDesc: perStage ? `满额上限 ${perStage}，随等级等比放大（当前 ${p.lv || 1} 级 ≈ ${Math.round(lvScale * 100)}%）` : ''
      };
    },

    /** 职业进化检测：供奉对应神明（profMatch 匹配）且供奉值圆满，则职业获得神明传承进化 */
    getProfessionEvolution(p) {
      if (!p || !p.offerGod) return { evolved:false };
      const god = STATE.getGods()[p.offerGod];
      if (!god) return { evolved:false };
      // 只有供奉了本职业对应神明才可进化
      if (god.profMatch !== p.profession) return { evolved:false, god, match:false };
      const value = p.offerValue || 0;
      if (value < 1000) return { evolved:false, god, match:true, value, need: 1000 };
      return { evolved:true, god, match:true, value };
    },

    /** 职业进化强化系数（进化后全属性 +8%） */
    evolutionBonus(p) {
      const evo = STATE.getProfessionEvolution(p);
      return evo.evolved ? 0.08 : 0;
    },

    /** 灵圃上限：最多同时在种 9 株（未成熟 + 成熟未收获均计入） */
    GARDEN_MAX_PLOTS: 9,

    /** 跨国家名声：通关国家越多，天下名声越响
     *  - 集市折扣：每级 -2%（联动各国商旅）
     *  - 名声称号：洞府面板展示
     *  - 名声5级：每日洞府奉上贡品（传说灵香） */
    fameInfo(p) {
      // V1.3.20：名声按"严格国家通关数"统计（此前用 completed 集合大小，把旁支任务/剧情标记都算作名声，
      // 导致只通一两国就达到满级名声，集市折扣与贡品失衡）
      const NATION_IDS = ['qingqiu','yumin','yanhuo','xuanyuan','xuangu','huantou','sanshou','nieer','daren','baimin','changgu','zhurao','jiaojing','rouli','shenmu','wuchang','yimu','jiexiong','qizhong','guixu'];
      let cleared = 0;
      try { cleared = NATION_IDS.filter(n => STATE.isNationCleared(p, n)).length; } catch (e) {}
      let lv = 0, name = '无名散修', discount = 0, tribute = null;
      if (cleared >= 18) { lv = 5; name = '山海传奇'; discount = 0.10; tribute = { id: 'MAT-INCENSE3', n: 1 }; }
      else if (cleared >= 14) { lv = 4; name = '威震山海'; discount = 0.08; }
      else if (cleared >= 10) { lv = 3; name = '名动一方'; discount = 0.06; }
      else if (cleared >= 6) { lv = 2; name = '声名鹊起'; discount = 0.04; }
      else if (cleared >= 3) { lv = 1; name = '小有名气'; discount = 0.02; }
      return { lv, name, cleared, discount, tribute };
    },

    /** 灵圃种植（策划案·灵圃系统：稀有材料探索难得，种子极易获得） */
    plantPlot(p, seedId) {
      const CROPS = (global.MATERIALS && global.MATERIALS.CROPS) ? global.MATERIALS.CROPS : {};
      const seed = CROPS[seedId];
      if (!seed) return { error: '种子不存在' };
      if (!STATE.hasMaterial(p, seedId, 1)) return { error: '缺少种子' };
      if (!p.plots) p.plots = [];
      if (p.plots.length >= STATE.GARDEN_MAX_PLOTS) return { error: '灵圃已满（最多同种 ' + STATE.GARDEN_MAX_PLOTS + ' 株）' };
      STATE.removeMaterial(p, seedId, 1);
      const matName = STATE.matName(seed.mat);
      p.plots.push({ seed: seedId, name: matName, mat: seed.mat, yield: seed.yield, days: 0, needsDays: seed.days, plantedDay: p.day || 1 });
      return { ok: true, seed, matName };
    },

    /** 每日结算灵圃：只生长不自动收获（成熟后由玩家手动收获，成熟未收获也占灵圃位） */
    tickPlots(p) {
      if (!p.plots) return { grown: [], ready: [] };
      const grown = [], ready = [];
      p.plots.forEach(plot => {
        plot.days++;
        if (plot.days >= plot.needsDays) {
          plot.ready = true;
          ready.push(plot.name);
        } else {
          grown.push(plot.name);
        }
      });
      return { grown, ready };
    },

    /** 收获指定灵圃位 */
    harvestPlot(p, idx) {
      if (!p.plots || !p.plots[idx]) return { error: '灵圃位不存在' };
      const plot = p.plots[idx];
      if (!plot.ready) return { error: '尚未成熟' };
      STATE.addMaterial(p, plot.mat, plot.yield);
      p.plots.splice(idx, 1);
      return { ok: true, name: plot.name, mat: plot.mat, n: plot.yield };
    },

    /** 收获所有成熟作物 */
    harvestAllPlots(p) {
      if (!p.plots || !p.plots.length) return { got: [] };
      const got = [];
      for (let i = p.plots.length - 1; i >= 0; i--) {
        if (p.plots[i].ready) {
          const r = STATE.harvestPlot(p, i);
          if (r.ok) got.push(r);
        }
      }
      return { got };
    },

    /** 移除未成熟作物（丢弃，不返还种子） */
    removePlot(p, idx) {
      if (!p.plots || !p.plots[idx]) return { error: '灵圃位不存在' };
      if (p.plots[idx].ready) return { error: '已成熟，请先收获' };
      const name = p.plots[idx].name;
      p.plots.splice(idx, 1);
      return { ok: true, name };
    },

    /* ============== 集市场景 ============== */
    /** 灵材名称映射（集中管理，供各场景复用） */
    matName(id) {
      const map = {
        'MAT-C01':'朱果','MAT-C02':'灵芝','MAT-C03':'忘忧草','MAT-C05':'月光草',
        'MAT-C06':'寒潭露','MAT-C07':'缩形草','MAT-C08':'织梦丝','MAT-C11':'冰魄',
        'MAT-S01':'玄铁矿','MAT-S03':'息壤','MAT-B10':'疾风腿骨','MAT-B16':'青龙鳞',
        'MAT-SC01':'执念结晶','MAT-SC15':'净魂池水','SEED-C01':'朱果苗种子','SEED-C02':'灵芝菌种','SEED-C05':'月光草种子',
        // —— 羽民国特有灵材 ——
        'MAT-FS01':'风灵石','MAT-FS02':'云锦花','MAT-FS03':'坠星藤','MAT-FS04':'风隼羽',
        'MAT-FS05':'风灵粒子','MAT-FS06':'青鸾之羽','MAT-FS07':'风魔核心','MAT-FS08':'风灵之心碎片',
        'SEED-FS01':'坠星藤种子','SEED-FS02':'云锦花种',
        // —— 厌火国特有灵材 ——
        'MAT-YH01':'火灵石','MAT-YH02':'火晶花','MAT-YH03':'熔岩精铁','MAT-YH04':'玄火鳞',
        'MAT-YH05':'地火之精','MAT-YH06':'祝融余烬','MAT-YH07':'灰烬之心','MAT-YH08':'圣锻之锤',
        'SEED-YH01':'火晶花种','SEED-YH02':'地火草种',
        // —— 轩辕国特有灵材 ——
        'MAT-JG01':'机核碎片','MAT-JG02':'精铁','MAT-JG03':'灵力导管','MAT-JG04':'机关蛛丝',
        'MAT-JG05':'机关之气','MAT-JG06':'机关神核','MAT-JG07':'非攻之剑','MAT-JG08':'非攻之剑·真',
        'SEED-JG01':'精铁种','SEED-JG02':'机核种',
        // —— 玄股国特有灵材 ——
        'MAT-XG01':'水灵珠','MAT-XG02':'水藻叶','MAT-XG03':'水脉晶','MAT-XG04':'蜃兽鳞',
        'MAT-XG05':'水之精','MAT-XG06':'水神之鳞','MAT-XG07':'水灵护符','MAT-XG08':'水神之泪',
        'SEED-XG01':'水藻种','SEED-XG02':'水脉种',
        // —— 讙头国特有灵材 ——
        'MAT-HT01':'渊息珠','MAT-HT02':'海木叶','MAT-HT03':'深渊珊瑚','MAT-HT04':'渊兽鳞',
        'MAT-HT05':'渊之精','MAT-HT06':'禺强之鳞','MAT-HT07':'禺强心骨','MAT-HT08':'禺强遗骨',
        'SEED-HT01':'海木种','SEED-HT02':'渊藻种',
        // —— 三首国特有灵材 ——
        'MAT-SS01':'魂晶','MAT-SS02':'魂镜叶','MAT-SS03':'魂髓','MAT-SS04':'魂镜兽鳞',
        'MAT-SS05':'魂之精','MAT-SS06':'后土魂晶','MAT-SS07':'三面护符','MAT-SS08':'后土魂晶·古',
        'SEED-SS01':'魂镜种','SEED-SS02':'魂髓种',
        // —— 聂耳国特有灵材 ——
        'MAT-NE01':'鸣石','MAT-NE02':'音叶','MAT-NE03':'音髓','MAT-NE04':'音兽鳞',
        'MAT-NE05':'音之精','MAT-NE06':'天听之核','MAT-NE07':'太古静音','MAT-NE08':'寂音护符',
        'SEED-NE01':'音叶种','SEED-NE02':'音髓种',
        // —— 大人国特有灵材 ——
        'MAT-DR01':'擎石','MAT-DR02':'岩芯叶','MAT-DR03':'地脉髓','MAT-DR04':'岩兽鳞',
        'MAT-DR05':'土之精','MAT-DR06':'夸父之骨','MAT-DR07':'逐日之杖','MAT-DR08':'逐日之心',
        'SEED-DR01':'岩芯种','SEED-DR02':'地脉种',
        // —— 白民国特有灵材 ——
        'MAT-BM01':'灵草','MAT-BM02':'兽灵叶','MAT-BM03':'灵脉髓','MAT-BM04':'兽灵鳞',
        'MAT-BM05':'灵之精','MAT-BM06':'英招之羽','MAT-BM07':'英招心血','MAT-BM08':'兽神祝福',
        'SEED-BM01':'兽灵种','SEED-BM02':'灵脉种',
        // —— 长股国特有灵材 ——
        'MAT-CG01':'时砂','MAT-CG02':'时叶','MAT-CG03':'时髓','MAT-CG04':'时兽鳞',
        'MAT-CG05':'时之精','MAT-CG06':'时之砂','MAT-CG07':'饕餮牙碎片','MAT-CG08':'原初之时',
        'SEED-CG01':'时叶种','SEED-CG02':'时髓种',
        // —— 周饶国特有灵材 ——
        'MAT-ZR01':'微尘','MAT-ZR02':'芥子叶','MAT-ZR03':'序髓','MAT-ZR04':'秩序兽鳞',
        'MAT-ZR05':'序之精','MAT-ZR06':'混沌鳞片','MAT-ZR07':'秩序原典','MAT-ZR08':'绝对秩序',
        'SEED-ZR01':'芥子种','SEED-ZR02':'序髓种',
        // —— 交胫国特有灵材 ——
        'MAT-JJ01':'命砂','MAT-JJ02':'命叶','MAT-JJ03':'因髓','MAT-JJ04':'因果兽鳞',
        'MAT-JJ05':'因之精','MAT-JJ06':'命之砂','MAT-JJ07':'穷奇爪碎片','MAT-JJ08':'原初之丝',
        'SEED-JJ01':'命叶种','SEED-JJ02':'因髓种',
        // —— 柔利国特有灵材 ——
        'MAT-RL01':'蜕砂','MAT-RL02':'蜕叶','MAT-RL03':'形髓','MAT-RL04':'形态兽鳞',
        'MAT-RL05':'形之精','MAT-RL06':'蜕形源核','MAT-RL07':'尾骨碎片','MAT-RL08':'原初之形',
        'SEED-RL01':'蜕叶种','SEED-RL02':'形髓种',
        // —— 深目国特有灵材 ——
        'MAT-SM01':'瞳砂','MAT-SM02':'瞳叶','MAT-SM03':'瞳髓','MAT-SM04':'瞳兽鳞',
        'MAT-SM05':'瞳之精','MAT-SM06':'瞳之砂','MAT-SM07':'归墟倒影','MAT-SM08':'原初之瞳',
        'SEED-SM01':'瞳叶种','SEED-SM02':'瞳髓种',
        // —— 无肠国特有灵材 ——
        'MAT-WC01':'饥砂','MAT-WC02':'饥叶','MAT-WC03':'能量髓','MAT-WC04':'食兽鳞',
        'MAT-WC05':'食之精','MAT-WC06':'饥之砂','MAT-WC07':'饕餮胃囊碎片','MAT-WC08':'原初之食',
        'SEED-WC01':'饥叶种','SEED-WC02':'能量髓种',
        // —— 一目国特有灵材 ——
        'MAT-YM01':'瞳砂','MAT-YM02':'瞳叶','MAT-YM03':'瞳髓','MAT-YM04':'瞳兽鳞',
        'MAT-YM05':'瞳之精','MAT-YM06':'瞳之砂','MAT-YM07':'混沌目碎片','MAT-YM08':'原初之瞳',
        'SEED-YM01':'瞳叶种','SEED-YM02':'瞳髓种',
        // —— 结胸国特有灵材 ——
        'MAT-JX01':'贯砂','MAT-JX02':'贯叶','MAT-JX03':'贯髓','MAT-JX04':'贯兽鳞',
        'MAT-JX05':'贯之精','MAT-JX06':'贯之砂','MAT-JX07':'梼杌胸骨碎片','MAT-JX08':'原初之贯',
        'SEED-JX01':'贯叶种','SEED-JX02':'贯髓种',
        // —— 跂踵国特有灵材 ——
        'MAT-QZ01':'行砂','MAT-QZ02':'行叶','MAT-QZ03':'方向髓','MAT-QZ04':'行兽鳞',
        'MAT-QZ05':'行之精','MAT-QZ06':'行之砂','MAT-QZ07':'梼杌足骨碎片','MAT-QZ08':'原初之行',
        'SEED-QZ01':'行叶种','SEED-QZ02':'方向髓种',
        // —— 归墟国特有灵材 ——
        'MAT-GX01':'封砂','MAT-GX02':'封叶','MAT-GX03':'存在髓','MAT-GX04':'封兽鳞',
        'MAT-GX05':'封之精','MAT-GX06':'封之砂','MAT-GX07':'混沌尾骨碎片','MAT-GX08':'原初之封',
        'SEED-GX01':'封叶种','SEED-GX02':'存在髓种',
        // ===== 探险/伏魔窟通用灵材（按品质·等级分级，共60+种） =====
        // 一阶·凡品（Lv1-10 探险）
        'MAT-E01':'青岩石','MAT-E02':'晨露珠','MAT-E03':'野蜂巢','MAT-E04':'枯藤枝',
        'MAT-E05':'山泉水','MAT-E06':'萤火粉','MAT-E07':'兽皮边角','MAT-E08':'灵米',
        // 二阶·良品（Lv11-20 探险）
        'MAT-E09':'玄铁矿砂','MAT-E10':'灵雾结晶','MAT-E11':'百年松脂','MAT-E12':'兽牙',
        'MAT-E13':'寒潭砂','MAT-E14':'灵蚕丝','MAT-E15':'地火石','MAT-E16':'净心露',
        // 三阶·上品（Lv21-35 探险）
        'MAT-E17':'千年灵木','MAT-E18':'紫雷砂','MAT-E19':'金蚕丝','MAT-E20':'冰晶髓',
        'MAT-E21':'炎阳石','MAT-E22':'风灵羽','MAT-E23':'幽谷兰','MAT-E24':'龙血藤',
        // 四阶·珍品（Lv36-50 探险）
        'MAT-E25':'麒麟角','MAT-E26':'凤凰羽','MAT-E27':'玄龟甲','MAT-E28':'白虎牙',
        'MAT-E29':'天雷珠','MAT-E30':'地心火','MAT-E31':'万载玄冰','MAT-E32':'仙灵露',
        // 五阶·极品（伏魔窟专属·更高概率）
        'MAT-F01':'魔晶核','MAT-F02':'噬魂珠','MAT-F03':'血月石','MAT-F04':'幽冥花',
        'MAT-F05':'煞气精','MAT-F06':'魔龙骨','MAT-F07':'混沌源晶','MAT-F08':'九幽寒铁',
        'MAT-F09':'吞天魔藤','MAT-F10':'黄泉沙','MAT-F11':'修罗血晶','MAT-F12':'魔神心核',
        // 传说·神话级（伏魔窟稀有）
        'MAT-F13':'混沌初芽','MAT-F14':'开天斧残片','MAT-F15':'女娲补天石','MAT-F16':'盘古心髓',
        'MAT-F17':'涅槃真火','MAT-F18':'太初鸿蒙气','MAT-F19':'造化玉碟','MAT-F20':'无极道果',
        // 隐藏职业图纸
        'BLUE-ASSASSIN':'【图纸】影刺传承','BLUE-ARRAY':'【图纸】奇门阵师传承',
        'BLUE-ALCHEMY':'【图纸】丹道宗师传承','BLUE-SUMMON':'【图纸】御灵圣手传承',
        'BLUE-SWORD':'【图纸】剑修传承','BLUE-TALISMAN':'【图纸】符箓大师传承',
        'BLUE-BEAST':'【图纸】兽王传承','BLUE-DREAM':'【图纸】梦蝶仙传承',
        'BLUE-FOX':'【图纸】狐仙传承','BLUE-WIND':'【图纸】风灵传承',
        'BLUE-SMITH':'【图纸】锻师传承','BLUE-WATER':'【图纸】水灵传承',
        'BLUE-MUSIC':'【图纸】乐师传承','BLUE-GIANT':'【图纸】巨灵传承',
        'BLUE-FATE':'【图纸】命师传承','BLUE-SHAPER':'【图纸】塑形师传承',
        'BLUE-PUPIL':'【图纸】瞳师传承','BLUE-DEVOUR':'【图纸】吞天师传承',
        'BLUE-ONEEYE':'【图纸】独目神传承','BLUE-VEIN':'【图纸】连脉师传承',
        'BLUE-WALKER':'【图纸】行者传承','BLUE-VOID':'【图纸】归墟者传承',
        // 灵香（供奉材料，三层级）
        'MAT-INCENSE1':'普通灵香','MAT-INCENSE2':'稀有灵香','MAT-INCENSE3':'传说灵香',
        // 灵圃特产稀有灵材（探索难得·种子易得）
        'MAT-G01':'天香草','MAT-G02':'紫芝兰','MAT-G03':'血菩提','MAT-G04':'玄冰花',
        'MAT-G05':'地火藤','MAT-G06':'雷音竹','MAT-G07':'影心草','MAT-G08':'太清莲','MAT-G09':'九叶菩提',
        // 灵圃种子
        'SEED-G01':'天香草种','SEED-G02':'紫芝兰种','SEED-G03':'血菩提种','SEED-G04':'玄冰花种',
        'SEED-G05':'地火藤种','SEED-G06':'雷音竹种','SEED-G07':'影心草种','SEED-G08':'太清莲种','SEED-G09':'九叶菩提种',
        // 丹药（背包展示用中文名）
        'xiaohuandan':'小还丹','dahuandan':'大还丹','huiling':'回灵散','qingxin':'清心丸',
        'shenxing':'神行丹','hanbing':'寒冰丹','juyuandan':'聚元丹','ningqi':'凝气丹',
        'jindan':'金丹','daoyuan':'道元丹','xixue':'洗髓丹','fagu':'伐骨丹',
        'jinshen':'金身丹','tianji':'天机丹',
        'xiaohuiling':'小回灵丹','dahuiling':'大回灵丹','shenhuiling':'神回灵丹',
        'zengqi':'增气丹','tiebi':'铁壁丹','jifeng':'疾风丹','lingguang':'灵光丹',
        'longli':'龙力丹','niepan':'涅槃丹','jingyuan':'精元丹',
        'huitian':'回天丹','zhanshen':'战神丹','zhendan':'真元丹','kunwu':'金刚丹'
      };
      return map[id] || id;
    },

    /** 集市出售表（玩家可卖材料换金币） */
    getMarketPrices() {
      return {
        'MAT-C01': 8,  'MAT-C02': 12, 'MAT-C03': 15, 'MAT-C05': 18,
        'MAT-C06': 20, 'MAT-C07': 22, 'MAT-C08': 30, 'MAT-C11': 35,
        'MAT-S01': 40, 'MAT-S03': 60, 'MAT-B10': 45, 'MAT-B16': 80,
        'MAT-SC01': 100
      };
    },

    /** 购买灵材（花金币） */
    buyMaterial(p, matId, price) {
      if (p.gold < price) return { error: '金币不足' };
      p.gold -= price;
      STATE.addMaterial(p, matId, 1);
      return { ok: true, price };
    },

    /** 出售灵材（得金币），返回成交信息 */
    sellMaterial(p, matId, price) {
      if (!STATE.hasMaterial(p, matId, 1)) return { error: '没有该材料' };
      STATE.removeMaterial(p, matId, 1);
      p.gold += price;
      return { ok: true, price };
    },

    /* ============== 境界突破系统 ============== */
    /** 境界体系（策划案第6章） */
    getRealmInfo() {
      return [
        { name:'炼气期', needLv:1,   desc:'凡胎初启，感应灵气' },
        { name:'筑基期', needLv:10,  desc:'稳固根基，筑就道基' },
        { name:'金丹期', needLv:20,  desc:'凝结金丹，辟谷长生' },
        { name:'元婴期', needLv:35,  desc:'元婴出窍，神游物外' },
        { name:'化神期', needLv:50,  desc:'炼神还虚，超凡入圣' },
        { name:'渡劫期', needLv:70,  desc:'渡天劫，历心魔' },
        { name:'飞升',   needLv:90,  desc:'道成飞升，超脱凡尘' }
      ];
    },

    /** 获取当前境界对应的属性倍率（策划案6.1属性跃升）
     *  数值膨胀策略：前期温和、后期跃升幅度递增，飞升期达到 6.5 倍，
     *  让"破境"带来的战力跃迁感更强（爽感），同时等级压制另设 5 级封顶，
     *  故境界膨胀不会造成"一级之差打不过"。 */
    realmMultiplier(level) {
      const map = [1.0, 1.4, 1.9, 2.6, 3.5, 4.7, 6.5];
      return map[level - 1] || 1.0;
    },

    /** 检查境界是否可突破（达到对应等级） */
    canBreakthrough(p) {
      const realms = STATE.getRealmInfo();
      const curIdx = realms.findIndex(r => r.name === p.realm.name);
      if (curIdx < 0 || curIdx >= realms.length - 1) return null;
      const next = realms[curIdx + 1];
      if (p.lv < next.needLv) return { can:false, next, need: next.needLv };
      return { can:true, next, idx: curIdx + 1 };
    },

    /** 执行境界突破。返回 { ok, realm, gains }，gains 为四维属性涨幅（供仪式展示） */
    breakthrough(p) {
      const check = STATE.canBreakthrough(p);
      if (!check || !check.can) return { error: check ? `需 Lv${check.need} 方可突破` : '已至最高境界' };
      // 突破前快照（用于计算涨幅）
      const before = { life: p.baseLife, mp: p.baseMp, atk: p.baseAtk, def: p.baseDef };
      // 突破：提升境界、重算属性（基于当前基础值放大，而非重置回固定值）
      p.realm.name = check.next.name;
      p.realm.level = check.idx + 1;
      const mul = STATE.realmMultiplier(check.idx + 1);
      const prevMul = STATE.realmMultiplier(check.idx);
      const ratio = mul / prevMul;   // 相对上一境界的增幅，避免覆盖命格/培养加成
      p.baseLife = Math.floor(p.baseLife * ratio);
      p.baseMp = Math.floor(p.baseMp * ratio);
      p.baseAtk = Math.floor(p.baseAtk * ratio);
      p.baseDef = Math.floor(p.baseDef * ratio);
      // 突破后修为清零：突破前修为必已封顶，若不重置，下次 checkLevelUp 会"白送一级"
      p.realm.exp = 0;
      p.hp = STATE.calcMaxHp(p);
      p.mp = STATE.calcMaxMp(p);
      // 战力涨幅明细
      const gains = {
        life: p.baseLife - before.life,
        mp: p.baseMp - before.mp,
        atk: p.baseAtk - before.atk,
        def: p.baseDef - before.def
      };
      // 成就检测：境界类成就
      if (typeof global.ACHIEVEMENTS !== 'undefined') {
        const newly = STATE.checkAchievements(p, {});
        if (newly.length && typeof global.Engine !== 'undefined' && Engine.notifyAchievements) Engine.notifyAchievements(newly);
      }
      return { ok: true, realm: check.next, gains };
    },

    /* ============== 自由行动 / 修炼系统 ============== */

    /** 消耗时辰（行动点）。返回是否成功 */
    spendShichen(p, n) {
      if (p.shichen < n) return false;
      p.shichen -= n;
      return true;
    },

    /** 新的一天：重置时辰 + 结算灵圃 + 重置每日目标 */
    newDay(p) {
      p.day++;
      p.shichen = p.shichenMax;
      p.cultivateCount = 0;
      STATE.resetDaily(p);
      return STATE.tickPlots(p);
    },

    /* ============== 每日修行目标 ============== */
    /** 每日目标定义（固定 4 项，每天进度重置） */
    dailyGoals() {
      return [
        { id: 'explore',   name: '踏遍山河',   desc: '今日探索 3 次',        need: 3, reward: { gold: 200,  exp: 80 } },
        { id: 'battle',    name: '除魔卫道',   desc: '今日战斗胜利 5 次',    need: 5, reward: { gold: 400,  exp: 150, materials: [{ id: 'MAT-C01', n: 3 }] } },
        { id: 'cultivate', name: '勤修不辍',   desc: '今日修炼 5 次',        need: 5, reward: { gold: 300,  exp: 200 } },
        { id: 'fumo',      name: '降魔伏妖',   desc: '今日踏入伏魔窟 1 次',  need: 1, reward: { gold: 600,  exp: 300, draw: 1 } }
      ];
    },
    /** 重置每日目标进度（跨天调用） */
    resetDaily(p) {
      p.daily = { date: p.day, explore: 0, battle: 0, cultivate: 0, fumo: 0, claimed: [] };
    },
    /** 确保每日目标与当前天数对齐（读档/跨天兜底） */
    ensureDaily(p) {
      if (!p.daily || p.daily.date !== p.day) STATE.resetDaily(p);
    },
    /** 累加每日计数 */
    addDaily(p, key, n) {
      STATE.ensureDaily(p);
      p.daily[key] = (p.daily[key] || 0) + (n || 1);
    },

    /* ============== NPC 每日奖励上限（防无限刷朱果/灵材） ============== */
    /** 确保 npcRewards 记录与当前天数对齐 */
    ensureNpcRewards(p) {
      if (!p.npcRewards || p.npcRewards.date !== p.day) {
        p.npcRewards = { date: p.day, got: {} };
      }
    },
    /** 查询某 NPC 奖励今日已领次数 */
    npcRewardCount(p, key) {
      STATE.ensureNpcRewards(p);
      return p.npcRewards.got[key] || 0;
    },
    /** 是否还能领（未超上限） */
    canNpcReward(p, key, limit) {
      return STATE.npcRewardCount(p, key) < (limit || 3);
    },
    /** 记录领取一次 */
    addNpcReward(p, key) {
      STATE.ensureNpcRewards(p);
      p.npcRewards.got[key] = (p.npcRewards.got[key] || 0) + 1;
    },
    /** 获取每日目标进度（返回目标数组 + 每项进度/可领取状态） */
    getDailyProgress(p) {
      STATE.ensureDaily(p);
      const d = p.daily;
      const claimed = d.claimed || [];
      return STATE.dailyGoals().map(g => {
        const cur = Math.min(d[g.id] || 0, g.need);
        const done = cur >= g.need;
        const got = claimed.indexOf(g.id) >= 0;
        return { ...g, cur, done, got };
      });
    },
    /** 领取每日目标奖励。返回 {ok, desc} 或 {error} */
    claimDaily(p, goalId) {
      STATE.ensureDaily(p);
      const goals = STATE.dailyGoals();
      const g = goals.find(x => x.id === goalId);
      if (!g) return { error: '目标不存在' };
      const d = p.daily;
      if ((d.claimed || []).indexOf(goalId) >= 0) return { error: '已领取' };
      if ((d[goalId] || 0) < g.need) return { error: '尚未完成' };
      d.claimed = d.claimed || [];
      d.claimed.push(goalId);
      // 发放奖励
      const desc = [];
      if (g.reward.gold) { p.gold = (p.gold || 0) + g.reward.gold; desc.push('金币+' + g.reward.gold); }
      if (g.reward.exp) {
        const em = (p.realm && p.realm.expMax) || 100;
        p.realm.exp = Math.min(em, (p.realm.exp || 0) + g.reward.exp);
        desc.push('修为+' + g.reward.exp);
      }
      if (g.reward.materials) g.reward.materials.forEach(m => { STATE.addMaterial(p, m.id, m.n); desc.push(STATE.matName(m.id) + '×' + m.n); });
      if (g.reward.draw) { p.drawChances = (p.drawChances || 0) + g.reward.draw; desc.push('命格抽取机会×' + g.reward.draw); }
      // 领取后检测升级/成就
      STATE.checkLevelUp(p);
      // —— 修行连击：当日 4 项目标全部领取完成时，连击 +1 并发放额外奖励（成长复利）——
      const allClaimed = STATE.dailyGoals().every(x => (d.claimed || []).indexOf(x.id) >= 0);
      if (allClaimed) {
        const streak = (p.dailyStreak || 0) + 1;
        p.dailyStreak = streak;
        // 连击加成：每连击 1 天额外给 100 金币 + 20 修为（连击越高，积累越厚）
        const bonusGold = 100 + streak * 20;
        const bonusExp = 20 + streak * 5;
        p.gold = (p.gold || 0) + bonusGold;
        const em = (p.realm && p.realm.expMax) || 100;
        p.realm.exp = Math.min(em, (p.realm.exp || 0) + bonusExp);
        desc.push(`修行连击 ${streak} 天！额外奖励金币+${bonusGold}、修为+${bonusExp}`);
      }
      return { ok: true, desc };
    },

    /** 判断是否卡在瓶颈：境界等级达到上限、经验已满、尚未突破（此时再修炼会浪费修为） */
    isExpCapped(p) {
      const br = STATE.canBreakthrough(p);
      return !!(br && p.lv >= br.next.needLv && p.realm.exp >= p.realm.expMax);
    },

    /** 修炼：获得经验，消耗1时辰，次数限制。批量修炼时经验封顶会自动停下，避免浪费时辰/修为 */
    cultivate(p, times = 1) {
      const results = [];
      for (let i = 0; i < times; i++) {
        if (!STATE.spendShichen(p, 1)) break;
        p.cultivateCount++;
        STATE.addDaily(p, 'cultivate', 1);   // 每日目标
        STATE.trackWeekly(p, 'cultivate');   // 每周任务
        try { if (typeof global.META !== 'undefined' && META.trackNovice) META.trackNovice('cultivate', 1); } catch (e) {}
        // 悟性加成（悟微命格+修炼速度）
        const cultBonus = 1 + STATE.mingshenBonus(p, 'cultivation');
        const gain = Math.floor((10 + p.lv * 2) * (1 + cultBonus));
        p.realm.exp += gain;
        results.push({ expGain: gain });
        // 升级检测
        let lvUp = STATE.checkLevelUp(p);
        if (lvUp) results.push({ lvUp: lvUp });
        // 经验封顶自动停：境界等级上限且经验满，停止后续修炼（避免浪费时辰）
        if (STATE.isExpCapped(p)) {
          results.push({ expCapped: true, needBreak: STATE.canBreakthrough(p).next.name });
          break;
        }
      }
      // 经验封顶提示（兼容单次修炼时结尾补一条提示）
      if (STATE.isExpCapped(p) && !results.some(r => r.expCapped)) {
        results.push({ expCapped: true, needBreak: STATE.canBreakthrough(p).next.name });
      }
      return results;
    },

    /** 检查是否升级（累计经验到达上限则升级；未突破大境界时经验卡在当前境界上限） */
    checkLevelUp(p) {
      const lvUps = [];
      // 判断是否卡在境界上限（需突破但未突破）
      const br = STATE.canBreakthrough(p);
      const capLv = br ? br.next.needLv : (p.lv + 999);   // 下一境界所需等级，到达后未突破则封顶
      while (p.realm.exp >= p.realm.expMax) {
        // 若下一级将超过境界等级上限且未突破，则经验封顶，不升级
        if (p.lv + 1 > capLv && br) {
          p.realm.exp = p.realm.expMax;   // 经验卡满
          break;
        }
        p.realm.exp -= p.realm.expMax;
        p.lv++;
        p.realm.expMax = Math.floor(p.realm.expMax * 1.4);
        lvUps.push(p.lv);
        // 升级回满
        p.hp = STATE.calcMaxHp(p);
        p.mp = STATE.calcMaxMp(p);
      }
      return lvUps.length > 0 ? lvUps : null;
    },

    /** 探索桃林随机事件（含秘境/宝箱/奇遇/感悟），消耗1时辰 */
    exploreTaolin(p) {
      if (!STATE.spendShichen(p, 1)) return null;   // 时辰不足无法探索
      const events = [
        // —— 草木灵材 ——
        { w: 16, text: '你拨开草丛，发现一株【朱果】。', mat: 'MAT-C01', n: 2, log: '探索桃林：发现朱果' },
        { w: 13, text: '你在溪边拾得【月光草】。', mat: 'MAT-C05', n: 2, log: '探索桃林：拾得月光草' },
        { w: 10, text: '你发现一丛野生【灵芝】，小心采下。', mat: 'MAT-C02', n: 1, log: '探索桃林：采得灵芝' },
        { w: 9,  text: '一只小狐灵怯生生看你一眼，留下一根【织梦丝】。', mat: 'MAT-C08', n: 1, log: '探索桃林：小狐灵赠礼' },
        // —— 稀有材料 ——
        { w: 7,  text: '你发现迷障深处有微弱的【执念结晶】闪光。', mat: 'MAT-SC01', n: 1, log: '探索桃林：发现执念结晶' },
        { w: 5,  text: '你偶遇一株【息壤】，灵田的肥料可期！', mat: 'MAT-S03', n: 1, log: '探索桃林：获得息壤' },
        // —— 种子（提高概率） ——
        { w: 9,  text: '你在枯木下发现几粒饱满的【朱果苗种子】。', mat: 'SEED-C01', n: 2, log: '探索桃林：获得朱果苗种子' },
        { w: 8,  text: '一丛月光草旁散落着【月光草种子】。', mat: 'SEED-C05', n: 2, log: '探索桃林：获得月光草种子' },
        { w: 6,  text: '你发现一株结籽的【灵芝菌种】！', mat: 'SEED-C02', n: 1, log: '探索桃林：获得灵芝菌种' },
        // —— 金币 ——
        { w: 6,  text: '你在一处废弃狐狸洞中找到一枚旧钱袋，内有些许金币。', gold: 25, log: '探索桃林：拾得金币', event: 'gold' },
        // —— 修炼感悟 ——
        { w: 8,  text: '你于桃荫下静坐片刻，悟得一丝天地灵气运转之理。', expBonus: 30, log: '探索桃林：顿悟修为', event: 'insight' },
        // —— 迷障惊险 ——
        { w: 8,  text: '你深入迷障，险些迷路，幸得问道玉指引返回。', log: '探索桃林：迷障中惊险脱身' },
        // —— 情报 ——
        { w: 6,  text: '你撞见两只影狐对峙，悄悄退走，获得情报。', log: '探索桃林：获得影狐情报', info: true },
        // —— 遇敌 ——
        { w: 4,  text: '一头【贪食狐】窜出袭击你，你将它击退，拾得遗落的【灵芝】。', mat: 'MAT-C02', n: 2, log: '探索桃林：击退贪食狐', event: 'battle' },
        // —— 灵宠蛋 ——
        { w: 3,  text: '你竟发现了一枚【神秘灵宠蛋】！', log: '探索桃林：发现灵宠蛋', event: 'petEgg' },
        // —— 秘境宝箱 ——
        { w: 2,  text: '你发现一处隐秘【秘境入口】，内藏一只宝箱！', log: '探索桃林：发现秘境宝箱', event: 'treasure' },
        // —— 远古奇遇 ——
        { w: 1,  text: '桃林深处传来远古低吟，你循声拾得一片【青龙鳞】！', mat: 'MAT-B16', n: 1, log: '探索桃林：拾得青龙鳞', info: true }
      ];
      const ev = RNG.weightedPick(events);
      // 恶念值影响：恶念高时，更多概率触发"凶煞机缘"（大收益但恶念+）
      if (p && p.evil >= 30 && RNG.chance(0.25)) {
        return {
          text: '煞气吸引来一道【凶煞机缘】——一只重伤的【玄火蛇】幼崽蜷在血泊中，你若救它，它愿认你为主。',
          log: '探索桃林：凶煞机缘·玄火蛇幼崽', event: 'petEgg_pinned', petId: 'xuanhuo', evil: 5
        };
      }
      return ev;
    },

    /** 采集：随机获得草木类灵材，消耗1时辰 */
    gather(p) {
      if (!STATE.spendShichen(p, 1)) return null;
      const gatherBonus = STATE.mingshenBonus(p, 'gather');
      const pool = [
        { id:'MAT-C01', name:'朱果' },
        { id:'MAT-C02', name:'灵芝' },
        { id:'MAT-C05', name:'月光草' },
        { id:'MAT-C03', name:'忘忧草' },
        { id:'MAT-C07', name:'缩形草' },
        { id:'SEED-C01', name:'朱果苗种子' },
        { id:'SEED-C05', name:'月光草种子' },
        { id:'SEED-C02', name:'灵芝菌种' }
      ];
      const pick = RNG.pick(pool);
      const base = 2 + Math.floor(Math.random() * 2);
      const n = Math.floor(base * (1 + gatherBonus));
      p.materials[pick.id] = (p.materials[pick.id] || 0) + n;
      return { mat: pick.id, n, name: pick.name };
    },

    /** 休息：恢复气血灵力，消耗1时辰 */
    rest(p) {
      if (!STATE.spendShichen(p, 1)) return null;
      const maxHp = STATE.calcMaxHp(p);
      const maxMp = STATE.calcMaxMp(p);
      p.hp = maxHp;
      p.mp = maxMp;
      return { hp: maxHp, mp: maxMp };
    },

    /* ============== 伏魔窟系统（每6天开启一次，开启当天可反复深入） ============== */
    /** 伏魔窟开启状态：每6天（游戏内天数）循环开启一次，即第6/12/18/24...天 */
    fumoStatus(p) {
      const day = p.day || 1;
      // 每6天开启一次：day % 6 === 0 时开启（第6、12、18、24...天）
      const open = (day % 6 === 0);
      // 下一个开启日（当天开启则 nextDay 为下一个周期）
      const nextDay = open ? (day + 6) : (day + (6 - (day % 6)));
      return { open, nextDay, day };
    },

    /** 敌人状态表（影响属性与警觉度/行为） */
    enemyStates() {
      return [
        { id:'normal',    name:'常态',   mul: 1.0,  aware: 'aware',   awareDesc: '已发现你，正在逼近' },
        { id:'hungry',    name:'饥饿',   mul: 1.2,  aware: 'aware',   awareDesc: '饥肠辘辘，主动搜寻猎物' },
        { id:'wounded',   name:'重伤',   mul: 0.35, aware: 'unaware', awareDesc: '身负重伤，尚未察觉你的存在' },
        { id:'enraged',   name:'狂暴',   mul: 1.4,  aware: 'hostile', awareDesc: '煞气冲天，见人即杀' },
        { id:'frail',     name:'虚弱',   mul: 0.6,  aware: 'unaware', awareDesc: '气息微弱，似在休憩' },
        { id:'possessed', name:'入魔',   mul: 1.3,  aware: 'aware',   awareDesc: '魔气缠身，警觉异常' }
      ];
    },

    /** 玩家战斗实力基准（供敌人按相对强度生成，保证数值平衡） */
    combatPower(p) {
      const atk = Math.floor(p.baseAtk * p.coeff.atk);
      const def = Math.floor(p.baseDef * p.coeff.def);
      const hp = STATE.calcMaxHp(p);
      return { atk, def, hp, lv: p.lv || 1 };
    },

    /** 通用敌人生成：基于玩家攻击力生成数值平衡的敌人（保证击杀节奏与威胁度合理） */
    makeEnemy(p, opts) {
      const cp = STATE.combatPower(p);
      // 敌人等级上限（opts.lvCap 控制，默认不超玩家等级+浮动）
      let lv = Math.max(1, (opts.lv !== undefined ? opts.lv : cp.lv));
      if (opts.lvCap !== undefined) lv = Math.min(lv, opts.lvCap);
      const diffMul = (p.diffMul !== undefined ? p.diffMul : 1.0);
      const state = opts.state || { id:'normal', name:'常态', mul:1.0, aware:'aware' };
      const stMul = state.mul || 1.0;
      // 强度参数（相对玩家攻击力）：
      //   defMul 控制敌人防御（决定减伤比例，越小越脆）
      //   hpMul  控制敌人血量（= 玩家攻击 × 期望回合数的量级）
      //   atkMul 控制敌人攻击（相对玩家防御，保证有威胁但不秒杀）
      const defMul = (opts.defMul !== undefined ? opts.defMul : 0.45);
      const hpMul = (opts.hpMul !== undefined ? opts.hpMul : 5.0);
      const atkMul = (opts.atkMul !== undefined ? opts.atkMul : 0.9);
      // 敌人防御 = 玩家攻击 × defMul（保证减伤温和，玩家 4~8 回合可击杀）
      const def = Math.max(2, Math.floor(cp.atk * defMul * stMul * diffMul));
      // 敌人血量 = 玩家攻击 × hpMul（配合 def 的减伤，实际约 6~12 回合击杀）
      const hp = Math.max(10, Math.floor(cp.atk * hpMul * stMul * diffMul));
      // 敌人攻击 = 玩家攻击 × atkMul（玩家 def 通常低于 atk，此值保证敌我攻防相当、有来有回）
      const atk = Math.max(5, Math.floor(cp.atk * atkMul * stMul * diffMul));
      return {
        name: (opts.namePrefix || '魔物') + '·' + (opts.name || RNG.pick(['噬灵兽','黑煞妖','血影魔','幽冥鬼','吞魂怪'])),
        hp, atk, def, lv,
        element: opts.element || RNG.pick(['邪','魔','魂','暗']),
        state, bg: opts.bg || 'assets/img/nations/qing-fog-abyss.jpg',
        aware: state.aware || 'aware'
      };
    },

    /** 伏魔窟怪物：比日常探索怪更强（中高强度），带随机状态与警觉度；深入越多越强，可超玩家20级 */
    fumoEnemy(p) {
      const states = STATE.enemyStates();
      const st = RNG.pick(states);
      const baseLv = p.lv || 1;
      // 伏魔窟怪物等级：默认 ±8 级浮动，但"深入次数越多，怪越强"，最高可超玩家 20 级（用户要求的高风险高收益）
      const depthBoost = Math.min(20, (p._fumoTimes || 0) * 3);
      const lv = Math.min(110, Math.max(1, baseLv + RNG.intBetween(-5, 5) + depthBoost));
      // 伏魔窟怪：血厚攻高，略强于日常怪（hpMul 4 / atkMul 0.95 / defMul 0.45）
      const en = STATE.makeEnemy(p, {
        lv, state: st, namePrefix: st.name,
        name: RNG.pick(['噬灵兽','黑煞妖','血影魔','幽冥鬼','吞魂怪']),
        hpMul: 4, atkMul: 0.95, defMul: 0.45,
        element: RNG.pick(['邪','魔','魂','暗']),
        bg: 'assets/img/scenes/fumo-cave.jpg'
      });
      return en;
    },

    /** 日常探索怪：较弱（方便日常刷材料，3~6回合可击杀），等级上限80 */
    exploreEnemy(p) {
      const states = STATE.enemyStates();
      const st = RNG.pick(states);
      const baseLv = p.lv || 1;
      const lv = Math.min(80, Math.max(1, baseLv + RNG.intBetween(-6, 6)));
      const en = STATE.makeEnemy(p, {
        lv, state: st, namePrefix: st.name,
        name: RNG.pick(['山魈','野妖','地精','魍魉','豺精']),
        hpMul: 2.5, atkMul: 0.75, defMul: 0.35,
        element: RNG.pick(['邪','魔','魂','暗']),
        bg: 'assets/img/scenes/battlefield.jpg'
      });
      return en;
    },

    /** 伏魔窟/探险 灵材池（品质随国家进度/等级提升） */
    exploreMaterialPool(p, inFumo) {
      const lv = p.lv || 1;
      // 按等级区间选材品阶
      const tier = lv <= 10 ? 1 : lv <= 20 ? 2 : lv <= 35 ? 3 : lv <= 50 ? 4 : 5;
      // 通用探险灵材池（按品阶）
      const pools = {
        1: ['MAT-E01','MAT-E02','MAT-E03','MAT-E04','MAT-E05','MAT-E06','MAT-E07','MAT-E08'],
        2: ['MAT-E09','MAT-E10','MAT-E11','MAT-E12','MAT-E13','MAT-E14','MAT-E15','MAT-E16'],
        3: ['MAT-E17','MAT-E18','MAT-E19','MAT-E20','MAT-E21','MAT-E22','MAT-E23','MAT-E24'],
        4: ['MAT-E25','MAT-E26','MAT-E27','MAT-E28','MAT-E29','MAT-E30','MAT-E31','MAT-E32'],
        5: ['MAT-E25','MAT-E26','MAT-E27','MAT-E28','MAT-E29','MAT-E30','MAT-E31','MAT-E32']
      };
      // 伏魔窟专属灵材池（更高品质）
      const fumoPools = {
        1: ['MAT-E09','MAT-E10','MAT-F01','MAT-F02'],
        2: ['MAT-E17','MAT-E18','MAT-F03','MAT-F04'],
        3: ['MAT-E25','MAT-E26','MAT-F05','MAT-F06','MAT-F07'],
        4: ['MAT-F08','MAT-F09','MAT-F10','MAT-F11','MAT-F12'],
        5: ['MAT-F13','MAT-F14','MAT-F15','MAT-F16','MAT-F17','MAT-F18','MAT-F19','MAT-F20']
      };
      const src = inFumo ? fumoPools[tier] : pools[tier];
      return src;
    },

    /* ============== 隐藏职业与转职 ============== */
    /** 隐藏职业数据（图纸解锁） */
    getHiddenProfessions() {
      const professions = {
        assassin: { id:'assassin', name:'影刺', bp:'BLUE-ASSASSIN', role:'attack', roleDesc:'攻击 · 爆发 —— 暗影先手，一击必杀', tag:'近身爆发·致命一击', element:'影', nation:'changgu', master:'影主', origin:'长股国曾有刺客「夜不闭户，影不留痕」——影主出身乱世，幼年被屠村后活在影子里，以仇恨为刃习得「影遁」真传。传说他从不与人对面而立，只在对方转身时留一刀。影刺一脉信条：暗处不是怯懦，是夜给的战场。',
          life:0.80, mp:0.75, atk:1.40, def:0.65, mainSkill:'无影刃', mainSkillDesc:'暴击率+15%，背刺伤害+30%',
          skills:[
            { id:'a_punch', name:'影刃连击', type:'basic', element:'影', power:1.2, cd:0, mp:0, desc:'三段影刃，凌厉无比' },
            { id:'a_back', name:'背刺', type:'skill', element:'影', power:1.8, cd:3, mp:12, desc:'绕后一击，【眩晕】1回合', stun: 1 },
            { id:'a_poison', name:'淬毒', type:'skill', element:'毒', power:1.2, cd:3, mp:10, desc:'淬上剧毒，【中毒】3回合', poison: 3, poisonName:'剧毒' },
            { id:'a_shadow', name:'影分身', type:'skill', element:'影', power:1.2, cd:4, mp:15, desc:'召唤分身，闪避+30%持续2回合', dodgeSelf: { name:'影分身', turns:2, mul:0.3 } },
            { id:'a_gou', name:'暗钩', type:'skill', element:'影', power:1.3, cd:3, mp:12, desc:'暗影钩锁，破甲12%', armorBreak: 0.12 },
            { id:'a_xie', name:'邪影斩', type:'skill', element:'邪', power:1.6, cd:3, mp:16, desc:'释放邪影，吸血20%', leech: 0.2 },
            { id:'a_lei', name:'惊雷刺', type:'skill', element:'雷', power:1.5, cd:3, mp:14, desc:'暗杀如雷，【麻痹】1回合', paralyze: 1 },
            { id:'a_ult', name:'万影归一', type:'ultimate', element:'影', power:2.6, cd:0, mp:45, require:'fullBar', desc:'化作万千残影齐击，并【眩晕】1回合', stun: 1 },
            { id:'a_dash', name:'影遁', type:'dodge', element:'影', power:0.5, cd:3, sta:20, desc:'遁入阴影，闪避攻击' }
          ], passive:{ name:'暗杀', desc:'对满血敌人伤害+20%', eff:{ type:'dmgCond', cond:'fullHp', mul:0.20 } },
          skillIntro:'影刺不入明战，只认一击。刀锋淬毒、暗钩破甲、影分身飘忽、惊雷刺定身——毒与影交织成网，敌未及反应已身中剧毒。奥义「万影归一」化作万千残影，一击封喉，绝不留活口。' },
        sword: { id:'sword', name:'剑修', bp:'BLUE-SWORD', role:'attack', roleDesc:'攻击 · 连击 —— 剑意连绵，攻伐凌厉', tag:'一剑破万法·凌厉', element:'金', nation:'xuanyuan', master:'剑仙', origin:'轩辕城外有座剑冢，插着十万柄剑，皆是无主之剑。传说三千年前，轩辕氏铸第一柄剑时，铁匠打铁三日，剑成而人亡——剑仙便是第一个捡起那柄剑的人。他一生只悟一件事：剑不是兵器，是伸出去的那截骨头。剑修一脉以「御剑诀」立派，入门第一课不是挥剑，而是问：你为何握剑？',
          life:0.85, mp:0.85, atk:1.30, def:0.80, mainSkill:'御剑诀', mainSkillDesc:'攻击+10%，剑气穿透',
          skills:[
            { id:'s_punch', name:'剑斩', type:'basic', element:'金', power:1.2, cd:0, mp:0, desc:'凌厉一剑' },
            { id:'s_qijian', name:'剑气纵横', type:'skill', element:'金', power:1.5, cd:3, mp:12, desc:'剑气破甲10%', armorBreak: 0.1 },
            { id:'s_feng', name:'风雷剑', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'剑引风雷，【麻痹】1回合', paralyze: 1 },
            { id:'s_bing', name:'寒冰剑域', type:'skill', element:'水', power:1.4, cd:3, mp:12, desc:'【冻结】1回合', freeze: 1 },
            { id:'s_huo', name:'焚天剑', type:'skill', element:'火', power:1.5, cd:3, mp:14, desc:'剑火燎原，【灼烧】2回合', burn: 2 },
            { id:'s_mu', name:'青莲剑', type:'skill', element:'木', power:1.2, cd:3, mp:12, desc:'青莲绽放，【缠绕】并吸血15%', bind: true, leech: 0.15 },
            { id:'s_tu', name:'重岳剑', type:'skill', element:'土', power:1.4, cd:4, mp:16, desc:'厚重如山，【减速】15%', slow: 0.15 },
            { id:'s_ult', name:'万剑归宗', type:'ultimate', element:'金', power:2.5, cd:0, mp:50, require:'fullBar', desc:'万剑齐发，剑意凛然' },
            { id:'s_dash', name:'御剑飞行', type:'dodge', element:'风', power:0.6, cd:3, sta:20, desc:'御剑闪避' }
          ], passive:{ name:'剑心', desc:'每次攻击叠加剑意，+5%伤害', eff:{ type:'stackAtk', per:0.05, cap:10, label:'剑意' } },
          skillIntro:'剑修以剑问道，五行皆可为剑。剑气纵横破甲、焚天剑燎原、寒冰剑域冻结、风雷剑定身、青莲剑吸血——一套剑法走过金木水火土，攻伐凌厉，剑意连绵。奥义「万剑归宗」万剑齐发，剑意如潮。' },
        alchemy: { id:'alchemy', name:'丹道宗师', bp:'BLUE-ALCHEMY', role:'heal', roleDesc:'恢复 · 增益 —— 丹济天下，起死回生', tag:'炼丹制药·辅助', element:'木', nation:'baimin', master:'药圣', origin:'白民国有位采药人，尝遍百草，一日误食毒草而倒地，恰逢神农氏残魂入梦，赐他「神农本草」真解。他醒后不仅解毒，还救活了全村染疫之人——这便是丹道一脉的开端。药圣临终留下一句：「丹者，天地与人讲和。」丹道宗师炼的不是药，是让万物各归其位的道理。',
          life:1.05, mp:1.25, atk:0.80, def:0.80, mainSkill:'神农本草', mainSkillDesc:'炼丹效果+30%，治疗+20%',
          skills:[
            { id:'al_punch', name:'药杵', type:'basic', element:'木', power:0.9, cd:0, mp:0, desc:'挥动药杵' },
            { id:'al_heal', name:'回春术', type:'skill', element:'木', power:0, cd:3, mp:12, desc:'恢复自身30%生命', healSelf: 0.3 },
            { id:'al_poison', name:'施毒', type:'skill', element:'毒', power:1.2, cd:3, mp:10, desc:'附加【剧毒】2回合', poison: 2, poisonName:'剧毒' },
            { id:'al_buff', name:'增益丹', type:'skill', element:'木', power:0, cd:4, mp:15, desc:'全属性+15%持续3回合', atkSelf: { name:'增益', turns:3, mul:0.15 }, defSelf: { name:'增益', turns:3, mul:0.15 } },
            { id:'al_hui', name:'回灵丹', type:'skill', element:'木', power:0, cd:3, mp:12, desc:'恢复自身50%灵力', mpSelf: 30 },
            { id:'al_du', name:'噬魂毒', type:'skill', element:'毒', power:1.4, cd:3, mp:14, desc:'剧毒入体，【中毒】3回合', poison: 3, poisonName:'噬魂毒' },
            { id:'al_lei', name:'雷火丹', type:'skill', element:'雷', power:1.3, cd:3, mp:14, desc:'投掷雷火丹，爆破【麻痹】1回合', paralyze: 1 },
            { id:'al_ult', name:'九转还魂', type:'ultimate', element:'木', power:2.0, cd:0, mp:45, require:'fullBar', desc:'巨量治疗，恢复50%生命并驱散疲惫', healSelf: 0.5 },
            { id:'al_dash', name:'轻身术', type:'dodge', element:'风', power:0.5, cd:3, sta:20, desc:'轻身闪避' }
          ], passive:{ name:'药王', desc:'丹药持续时间+50%', eff:{ type:'potionDur', mul:0.5 } },
          skillIntro:'丹道宗师不与敌正面为敌——回春术续命、增益丹提攻、噬魂毒蚀骨、回灵丹续航。丹药是兵法，炉火是韬略，把一场硬仗打成此消彼长的消耗战。奥义「九转还魂」起死回生，一丹定胜负。' },
        summoner: { id:'summoner', name:'御灵圣手', bp:'BLUE-SUMMON', role:'pet', roleDesc:'灵宠 · 协战 —— 御灵无双，万兽听令', tag:'驭兽召唤·群战', element:'道', nation:'huantou', master:'御灵老祖', origin:'讙头国海边有位渔夫，常救搁浅的海兽。一日风暴中，一头巨鲸为他挡下灭顶之浪，他趴在鲸背上，第一次听懂万灵的声音——御灵老祖由此悟出「以心驭灵」之道。御灵一脉不签血契、不用枷锁，只凭一念真心，山海万兽皆可同行。',
          life:1.00, mp:1.15, atk:0.90, def:0.85, mainSkill:'御灵真经', mainSkillDesc:'灵宠协战伤害+25%',
          skills:[
            { id:'su_punch', name:'灵宠令', type:'basic', element:'道', power:1.0, cd:0, mp:0, desc:'令灵宠出击' },
            { id:'su_summon', name:'召灵', type:'skill', element:'道', power:1.3, cd:3, mp:12, desc:'召唤灵宠虚影助战，【减速】10%', slow: 0.1 },
            { id:'su_buff', name:'兽血共鸣', type:'skill', element:'道', power:0, cd:4, mp:15, desc:'人兽共鸣，攻击+20%持续3回合', atkSelf: { name:'兽血共鸣', turns:3, mul:0.2 } },
            { id:'su_heal', name:'灵愈', type:'skill', element:'木', power:0, cd:3, mp:12, desc:'治疗自身，恢复20%生命', healSelf: 0.2 },
            { id:'su_hou', name:'兽吼', type:'skill', element:'道', power:1.2, cd:3, mp:12, desc:'兽吼震慑，【减速】20%', slow: 0.2 },
            { id:'su_lei', name:'雷兽令', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'唤雷兽，【麻痹】1回合', paralyze: 1 },
            { id:'su_feng', name:'风鹏令', type:'skill', element:'风', power:1.3, cd:3, mp:12, desc:'唤风鹏，闪避+25%持续2回合', dodgeSelf: { name:'风鹏', turns:2, mul:0.25 } },
            { id:'su_ult', name:'万兽朝宗', type:'ultimate', element:'道', power:2.4, cd:0, mp:48, require:'fullBar', desc:'百兽齐攻，威震八方并【眩晕】1回合', stun: 1 },
            { id:'su_dash', name:'灵遁', type:'dodge', element:'风', power:0.5, cd:3, sta:20, desc:'借灵宠闪避' }
          ], passive:{ name:'御灵', desc:'灵宠在场时自身+10%伤害', eff:{ type:'dmgCond', cond:'petAlive', mul:0.10 } },
          skillIntro:'御灵圣手以心驭灵，万兽皆可同行。召灵助战、兽吼震慑、雷兽令麻痹、风鹏令提速、兽血共鸣提攻——自身只是阵眼，真正的杀招都在灵宠爪下。奥义「万兽朝宗」百兽齐攻，威震八方。' },
        talisman: { id:'talisman', name:'符箓大师', bp:'BLUE-TALISMAN', role:'control', roleDesc:'控制 · 封印 —— 符封定身，困敌于阵', tag:'符箓万千·控制', element:'雷', nation:'sanshou', master:'天师', origin:'三首国大雾遮天之日，有位书生用朱砂在雾中写了一个「敕」字，雾气应声而散——书生便是初代天师。他悟出：天地有则，可以符「请」之；鬼神有职，可以符「令」之。符箓大师一脉自此而兴，符上的一笔一划都是与天地立约的笔迹。',
          life:0.85, mp:1.20, atk:1.00, def:0.75, mainSkill:'天师符法', mainSkillDesc:'符箓效果+25%，控制命中+15%',
          skills:[
            { id:'t_punch', name:'符弹', type:'basic', element:'雷', power:1.0, cd:0, mp:0, desc:'掷出符弹' },
            { id:'t_lei', name:'五雷符', type:'skill', element:'雷', power:1.5, cd:3, mp:14, desc:'五雷轰顶，【麻痹】1回合', paralyze: 1 },
            { id:'t_huo', name:'火符', type:'skill', element:'火', power:1.3, cd:2, mp:10, desc:'火符【灼烧】2回合', burn: 2 },
            { id:'t_shui', name:'冰符', type:'skill', element:'水', power:1.2, cd:3, mp:12, desc:'冰符【冻结】1回合', freeze: 1 },
            { id:'t_ding', name:'定身符', type:'skill', element:'雷', power:0, cd:4, mp:15, desc:'定住敌方1回合', bind: true },
            { id:'t_zhao', name:'护身符', type:'skill', element:'雷', power:0, cd:4, mp:14, desc:'自身减伤25%持续3回合', reduceSelf: { name:'护身', turns:3, mul:0.25 } },
            { id:'t_feng', name:'风符', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'风符加速，闪避+25%', dodgeSelf: { name:'风符', turns:2, mul:0.25 } },
            { id:'t_ult', name:'万符朝宗', type:'ultimate', element:'雷', power:2.5, cd:0, mp:48, require:'fullBar', desc:'万符齐爆，雷威震慑并【眩晕】1回合', stun: 1 },
            { id:'t_dash', name:'符遁', type:'dodge', element:'雷', power:0.5, cd:3, sta:20, desc:'符光一闪，闪避' }
          ], passive:{ name:'符心', desc:'控制类符箓命中后，下次伤害+15%', eff:{ type:'dmgCond', cond:'afterControl', mul:0.15 } },
          skillIntro:'符箓大师以符为牢，困敌于弹指之间。定身符锁身、冰符成冻、五雷符麻痹、护身符减伤、风符脱身——控、封、护一体，让敌人有力无处使。奥义「万符朝宗」万符齐爆，天雷降世。' },
        beast: { id:'beast', name:'兽王', bp:'BLUE-BEAST', role:'pet_def', roleDesc:'灵宠 · 坦克 —— 驭兽为盾，宠在我在', tag:'兽魂附体·刚猛', element:'禅', nation:'rouli', master:'兽神', origin:'柔利国的软玉大地上，曾有牧童被狼群围攻，千钧一发之际他发出一声不像人发出的嘶吼，狼群竟伏地不敢动——他体内觉醒的兽魂救了命。牧童穷尽一生驯服万兽之魂，将自己活成「半兽」，由此立下兽王一道：人身兽魂，天地皆可作肉身。',
          life:1.20, mp:0.80, atk:1.10, def:1.10, mainSkill:'兽王经', mainSkillDesc:'生命+15%，兽化时攻击+20%',
          skills:[
            { id:'b_punch', name:'兽爪', type:'basic', element:'禅', power:1.2, cd:0, mp:0, desc:'兽爪撕裂' },
            { id:'b_bao', name:'狂暴', type:'skill', element:'禅', power:1.5, cd:3, mp:10, desc:'狂暴化，攻击+30%持续2回合', atkSelf: { name:'狂暴', turns:2, mul:0.3 } },
            { id:'b_si', name:'撕裂', type:'skill', element:'禅', power:1.4, cd:3, mp:12, desc:'撕裂伤口，持续【流血】3回合', poison: 3, poisonName:'流血' },
            { id:'b_hou', name:'兽吼', type:'skill', element:'禅', power:1.2, cd:3, mp:12, desc:'兽吼震慑，【减速】15%并破甲8%', slow: 0.15, armorBreak: 0.08 },
            { id:'b_tun', name:'吞噬', type:'skill', element:'禅', power:1.3, cd:3, mp:12, desc:'吞噬敌方气血，吸血25%', leech: 0.25 },
            { id:'b_lei', name:'雷兽爪', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'雷爪【麻痹】1回合', paralyze: 1 },
            { id:'b_feng', name:'风兽行', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'兽行如风，闪避+25%', dodgeSelf: { name:'风兽行', turns:2, mul:0.25 } },
            { id:'b_ult', name:'兽王降临', type:'ultimate', element:'禅', power:2.6, cd:0, mp:50, require:'fullBar', desc:'化身兽王，攻击+20%并毁灭一击', atkSelf: { name:'兽王', turns:2, mul:0.2 } },
            { id:'b_dash', name:'兽跃', type:'dodge', element:'风', power:0.6, cd:3, sta:20, desc:'兽跃闪避' }
          ], passive:{ name:'兽魂', desc:'生命越低，攻击越高（最多+30%）', eff:{ type:'lowHpDmg', mul:0.30 } },
          skillIntro:'兽王半人半兽，兽魂附体。狂暴化攻防激增、撕裂流血不止、吞噬回血续命、兽吼减速破甲、雷兽爪定身——以一己之身扛住万军，为灵宠撕开战场。奥义「兽王降临」化身兽王，毁灭一击。' },
        dream: { id:'dream', name:'梦蝶仙', bp:'BLUE-DREAM', role:'control', roleDesc:'控制 · 幻术 —— 入梦缚敌，虚实难辨', tag:'幻梦迷离·控制', element:'魂', nation:'yimu', master:'蝶仙', origin:'一目国有一梦，梦见自己是一只蝴蝶，醒来不知是蝶梦人、还是人梦蝶——梦蝶仙便是那个勘破此梦的人。他悟出：万物皆可为「梦」，梦亦皆为「物」。梦蝶一脉自此以幻术行走山海，真假之间，自有大道。',
          life:0.85, mp:1.25, atk:0.95, def:0.70, mainSkill:'庄周梦蝶', mainSkillDesc:'幻术效果+30%，受击闪避+10%',
          skills:[
            { id:'d_punch', name:'蝶舞', type:'basic', element:'魂', power:1.0, cd:0, mp:0, desc:'蝶影飞舞' },
            { id:'d_meng', name:'入梦', type:'skill', element:'魂', power:0, cd:4, mp:16, desc:'令敌方【入梦】1回合', stun: 1 },
            { id:'d_huan', name:'幻蝶', type:'skill', element:'魂', power:1.3, cd:3, mp:12, desc:'幻蝶纷飞，【魅惑】1回合', charm: 1 },
            { id:'d_mi', name:'迷魂', type:'skill', element:'魂', power:1.2, cd:3, mp:12, desc:'迷魂夺魄，敌方攻击-15%', atkDown: 0.15 },
            { id:'d_yin', name:'梦影', type:'skill', element:'魂', power:1.1, cd:3, mp:12, desc:'梦影分身，闪避+30%', dodgeSelf: { name:'梦影', turns:2, mul:0.3 } },
            { id:'d_xi', name:'噬梦', type:'skill', element:'魂', power:1.4, cd:3, mp:14, desc:'吞噬梦境，吸血20%', leech: 0.2 },
            { id:'d_feng', name:'蝶风', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'蝶翼生风，闪避+25%', dodgeSelf: { name:'蝶风', turns:2, mul:0.25 } },
            { id:'d_ult', name:'庄周梦', type:'ultimate', element:'魂', power:2.4, cd:0, mp:46, require:'fullBar', desc:'梦蝶化千，幻灭一击并【魅惑】1回合', charm: 1 },
            { id:'d_dash', name:'蝶遁', type:'dodge', element:'魂', power:0.5, cd:3, sta:20, desc:'化蝶闪避' }
          ], passive:{ name:'化蝶', desc:'受致命伤时化作蝶影，闪避一次', eff:{ type:'dodgeFatal' } },
          skillIntro:'梦蝶仙于虚实之间行走。入梦催眠、幻蝶惑心、迷魂降攻、梦影分身、噬梦吸血——敌人永远分不清眼前是梦境还是现实。奥义「庄周梦」蝶化千影，幻灭之间，胜负已定。' },
        array: { id:'array', name:'奇门阵师', bp:'BLUE-ARRAY', role:'def_support', roleDesc:'防御 · 增益 —— 布阵守御，困敌四方', tag:'阵法玄妙·阵地', element:'土', nation:'zhurao', master:'阵祖', origin:'周饶国微尘般精巧的都城里，有位匠人把星辰运转刻进石板，发现万物的位置藏着天地之力——他按星图布石，竟困住了一头闯城的妖兽。阵祖由此创出奇门阵法：天地是棋盘，万物是棋子，阵师只做那个「摆棋的人」。',
          life:1.00, mp:1.10, atk:0.85, def:1.15, mainSkill:'奇门遁甲', mainSkillDesc:'阵法效果+30%，受击减伤+10%',
          skills:[
            { id:'ar_punch', name:'阵引', type:'basic', element:'土', power:1.0, cd:0, mp:0, desc:'引动阵气' },
            { id:'ar_kun', name:'困阵', type:'skill', element:'土', power:0, cd:4, mp:16, desc:'困住敌方1回合', bind: true },
            { id:'ar_sha', name:'杀阵', type:'skill', element:'土', power:1.5, cd:3, mp:14, desc:'杀阵绞杀，破甲12%', armorBreak: 0.12 },
            { id:'ar_mi', name:'迷阵', type:'skill', element:'土', power:1.2, cd:3, mp:12, desc:'迷阵惑敌，【减速】20%', slow: 0.2 },
            { id:'ar_shou', name:'守阵', type:'skill', element:'土', power:0, cd:4, mp:15, desc:'守阵护体，减伤30%持续3回合', reduceSelf: { name:'守阵', turns:3, mul:0.3 } },
            { id:'ar_lei', name:'雷阵', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'雷阵轰击，【麻痹】1回合', paralyze: 1 },
            { id:'ar_feng', name:'风阵', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'风阵提速，闪避+25%', dodgeSelf: { name:'风阵', turns:2, mul:0.25 } },
            { id:'ar_ult', name:'八门金锁', type:'ultimate', element:'土', power:2.5, cd:0, mp:48, require:'fullBar', desc:'八门齐开，绝杀大阵并【缠绕】1回合', bind: true },
            { id:'ar_dash', name:'遁甲', type:'dodge', element:'土', power:0.5, cd:3, sta:20, desc:'奇门遁甲，闪避' }
          ], passive:{ name:'阵心', desc:'在场每回合为自身叠加1层【阵气】，减伤+2%（上限10层）', eff:{ type:'stackDef', per:0.02, cap:10, label:'阵气' } },
          skillIntro:'奇门阵师以天地为棋盘，万物为棋子。困阵锁敌、杀阵绞杀、迷阵减速、守阵护体、雷阵定身——阵气层层叠加，越战越稳。奥义「八门金锁」八门齐开，绝杀大阵，困敌于无形。' },
        fox: { id:'fox', name:'狐仙', bp:'BLUE-FOX', role:'control', roleDesc:'控制 · 魅惑 —— 九尾惑心，乱敌心神', tag:'魅惑幻术·灵动', element:'影', nation:'qingqiu', master:'天狐老祖', origin:'青丘的九尾天狐修满九条尾巴后，将第八条尾巴分给了山下的狐群——天狐老祖自此以「众生皆我」立道。狐仙一脉不靠蛮力，而靠「看透人心」：一个眼神、一句软语，比刀剑更快。相传老祖从不显露真身，你见到的每一只青丘白狐，都可能是他。',
          life:0.85, mp:1.20, atk:1.05, def:0.75, mainSkill:'天狐心法', mainSkillDesc:'闪避+15%，魅惑命中+20%',
          skills:[
            { id:'f_punch', name:'狐爪', type:'basic', element:'影', power:1.1, cd:0, mp:0, desc:'灵狐利爪' },
            { id:'f_mei', name:'魅惑', type:'skill', element:'影', power:0, cd:4, mp:15, desc:'【魅惑】敌方1回合', charm: 1 },
            { id:'f_huo', name:'狐火', type:'skill', element:'火', power:1.4, cd:3, mp:12, desc:'幽蓝狐火，【灼烧】2回合', burn: 2 },
            { id:'f_ying', name:'狐影步', type:'skill', element:'影', power:1.2, cd:3, mp:12, desc:'狐影飘忽，闪避+30%', dodgeSelf: { name:'狐影', turns:2, mul:0.3 } },
            { id:'f_huan', name:'幻境', type:'skill', element:'魂', power:1.2, cd:3, mp:14, desc:'织幻境，【魅惑】1回合', charm: 1 },
            { id:'f_xi', name:'摄魂', type:'skill', element:'魂', power:1.3, cd:3, mp:12, desc:'摄人心魄，吸血20%', leech: 0.2 },
            { id:'f_feng', name:'御风', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'乘风提速，闪避+25%', dodgeSelf: { name:'御风', turns:2, mul:0.25 } },
            { id:'f_ult', name:'九尾天狐', type:'ultimate', element:'影', power:2.5, cd:0, mp:46, require:'fullBar', desc:'九尾齐出，幻灭一击并【魅惑】1回合', charm: 1 },
            { id:'f_dash', name:'狐遁', type:'dodge', element:'影', power:0.5, cd:3, sta:20, desc:'化作狐影闪避' }
          ], passive:{ name:'狐媚', desc:'魅惑成功后，自身+15%伤害', eff:{ type:'dmgCond', cond:'afterCharm', mul:0.15 } },
          skillIntro:'狐仙以心为刃，一颦一笑皆是术。魅惑惑心、幻境乱神、狐火灼烧、摄魂吸血、狐影步飘忽——敌人往往在失神的一瞬已经败了。奥义「九尾天狐」九尾齐出，幻灭一击。' },
        windspirit: { id:'windspirit', name:'风灵', bp:'BLUE-WIND', role:'attack', roleDesc:'攻击 · 极速 —— 风驰电掣，先手制敌', tag:'御风飞行·迅捷', element:'风', nation:'yumin', master:'风神', origin:'天羽国曾有少女被族人所弃，坠下云端。她没有摔死——因为风接住了她。她在风中醒来，第一次知道自己本该御风而行——这便是风神一脉的来历。风灵不靠羽翼，靠的是与风「同频」：风往哪里去，风灵就活在哪里。',
          life:0.85, mp:0.95, atk:1.25, def:0.70, mainSkill:'驭风诀', mainSkillDesc:'速度+20%，风系伤害+15%',
          skills:[
            { id:'w_punch', name:'风刃', type:'basic', element:'风', power:1.1, cd:0, mp:0, desc:'锐利风刃' },
            { id:'w_feng', name:'疾风斩', type:'skill', element:'风', power:1.4, cd:3, mp:12, desc:'疾风连斩，【减速】15%', slow: 0.15 },
            { id:'w_bao', name:'暴风', type:'skill', element:'风', power:1.5, cd:3, mp:14, desc:'暴风席卷，破甲10%', armorBreak: 0.1 },
            { id:'w_xing', name:'风行术', type:'skill', element:'风', power:0, cd:3, mp:12, desc:'自身闪避+40%持续2回合', dodgeSelf: { name:'风行', turns:2, mul:0.4 } },
            { id:'w_lei', name:'风雷', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'风雷交加，【麻痹】1回合', paralyze: 1 },
            { id:'w_shui', name:'风雨', type:'skill', element:'水', power:1.2, cd:3, mp:12, desc:'风雨如晦，【冻结】1回合', freeze: 1 },
            { id:'w_hui', name:'回风', type:'skill', element:'风', power:1.1, cd:3, mp:12, desc:'回风反噬，吸血15%', leech: 0.15 },
            { id:'w_ult', name:'天风绝刃', type:'ultimate', element:'风', power:2.4, cd:0, mp:46, require:'fullBar', desc:'天风凝刃，攻击+15%并毁灭一击', atkSelf: { name:'天风', turns:2, mul:0.15 } },
            { id:'w_dash', name:'风遁', type:'dodge', element:'风', power:0.6, cd:3, sta:20, desc:'化风闪避' }
          ], passive:{ name:'风行', desc:'闪避成功后，下次攻击+20%', eff:{ type:'dmgCond', cond:'afterDodge', mul:0.20 } },
          skillIntro:'风灵御风而行，先手制敌。疾风斩连斩、暴风破甲、风雷麻痹、风雨冻结、回风吸血、风行术脱身——风驰电掣，一击不中，飘然远遁。奥义「天风绝刃」天风凝刃，毁灭一击。' },
        smith: { id:'smith', name:'锻师', bp:'BLUE-SMITH', role:'def_sustain', roleDesc:'攻击 · 续航 —— 锻火为甲，炉温叠伤', tag:'锻器淬火·刚猛', element:'火', nation:'yanhuo', master:'火神祝融', origin:'厌火国立国那日，祝融降下一炉神火，教会第一批厌火人「锻」字——锻铁、锻刀、锻命。火神一脉自此以炉为家，以锤为笔。锻师相信：万物皆可在火中重来，包括自己的那颗凡心。相传神火至今未熄，仍在炉底烧着。',
          life:1.05, mp:0.85, atk:1.30, def:1.10, mainSkill:'锻神诀', mainSkillDesc:'攻击+15%，火系伤害+20%',
          skills:[
            { id:'sm_punch', name:'锤击', type:'basic', element:'火', power:1.2, cd:0, mp:0, desc:'烈焰重锤' },
            { id:'sm_huo', name:'淬火', type:'skill', element:'火', power:1.5, cd:3, mp:12, desc:'淬火一击，【灼烧】2回合', burn: 2 },
            { id:'sm_yan', name:'熔岩', type:'skill', element:'火', power:1.4, cd:3, mp:14, desc:'熔岩喷发，破甲12%', armorBreak: 0.12 },
            { id:'sm_tie', name:'铁壁', type:'skill', element:'土', power:0, cd:4, mp:14, desc:'自身减伤25%持续3回合', reduceSelf: { name:'铁壁', turns:3, mul:0.25 } },
            { id:'sm_jin', name:'锻金', type:'skill', element:'金', power:1.4, cd:3, mp:12, desc:'金铁交鸣，破甲10%', armorBreak: 0.1 },
            { id:'sm_lei', name:'雷锤', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'雷火锤，【麻痹】1回合', paralyze: 1 },
            { id:'sm_feng', name:'鼓风', type:'skill', element:'风', power:1.1, cd:3, mp:12, desc:'鼓风助火，攻击+15%持续2回合', atkSelf: { name:'鼓风', turns:2, mul:0.15 } },
            { id:'sm_ult', name:'焚天锻炉', type:'ultimate', element:'火', power:2.6, cd:0, mp:50, require:'fullBar', desc:'锻炉倾覆，焚天一击并【灼烧】2回合', burn: 2 },
            { id:'sm_dash', name:'火遁', type:'dodge', element:'火', power:0.5, cd:3, sta:20, desc:'化火闪避' }
          ], passive:{ name:'锻心', desc:'每次攻击叠加【炉温】，火伤+2%（上限10层）', eff:{ type:'stackFire', per:0.02, cap:10, label:'炉温' } },
          skillIntro:'锻师以锤代剑，炉火为伴。淬火灼烧、熔岩破甲、铁壁减伤、雷锤麻痹、锻金裂防、鼓风助火——每一锤都淬入火意，炉温越高，攻势越猛。奥义「焚天锻炉」炉倾火漫，焚天一击。' },
        water: { id:'water', name:'水灵', bp:'BLUE-WATER', role:'heal', roleDesc:'恢复 · 治愈 —— 润物无声，活血续命', tag:'御水千变·柔韧', element:'水', nation:'xuangu', master:'水神', origin:'玄股国大泽深处，有位潜水者在水底发现一座古城，城中的水保存了万年前的一场雨——水神由此悟出：水记得一切。水灵一脉自此以「承」为道：不争而利万物，不进而无所不至。水神留下遗训：遇山开山的是斧，磨平万山的，是水。',
          life:1.05, mp:1.25, atk:0.85, def:0.85, mainSkill:'御水诀', mainSkillDesc:'灵力+15%，水系伤害+15%',
          skills:[
            { id:'wa_punch', name:'水弹', type:'basic', element:'水', power:1.0, cd:0, mp:0, desc:'凝水成弹' },
            { id:'wa_bing', name:'寒冰', type:'skill', element:'水', power:1.4, cd:3, mp:12, desc:'【冻结】1回合', freeze: 1 },
            { id:'wa_liu', name:'激流', type:'skill', element:'水', power:1.4, cd:3, mp:12, desc:'激流冲击，破甲10%', armorBreak: 0.1 },
            { id:'wa_zhi', name:'治愈', type:'skill', element:'水', power:0, cd:3, mp:12, desc:'恢复自身25%生命', healSelf: 0.25 },
            { id:'wa_xuan', name:'漩涡', type:'skill', element:'水', power:1.3, cd:4, mp:14, desc:'漩涡绞杀，【减速】25%', slow: 0.25 },
            { id:'wa_lei', name:'雷雨', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'雷雨倾泻，【麻痹】1回合', paralyze: 1 },
            { id:'wa_feng', name:'水风', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'水风相济，闪避+20%', dodgeSelf: { name:'水风', turns:2, mul:0.2 } },
            { id:'wa_ult', name:'海啸', type:'ultimate', element:'水', power:2.4, cd:0, mp:46, require:'fullBar', desc:'惊涛骇浪，灭世一击并【冻结】1回合', freeze: 1 },
            { id:'wa_dash', name:'水遁', type:'dodge', element:'水', power:0.5, cd:3, sta:20, desc:'化水闪避' }
          ], passive:{ name:'水柔', desc:'受击后下次水系伤害+15%', eff:{ type:'dmgCond', cond:'afterHitWater', mul:0.15 } },
          skillIntro:'水灵润物无声，御水千变。寒冰冻结、激流破甲、治愈续命、漩涡绞杀、雷雨定身——以柔克刚，不争而利战局。奥义「海啸」惊涛骇浪，灭世一击。' },
        musician: { id:'musician', name:'乐师', bp:'BLUE-MUSIC', role:'support_control', roleDesc:'辅助 · 控制 —— 音律安魂，乱音惑敌', tag:'音律攻心·辅助', element:'音', nation:'nieer', master:'乐神', origin:'聂耳峡谷本无声，直到一位哑巴琴师弹起无弦琴——琴虽无弦，谷中万兽却齐声相和，声音震开了聒噪的穷奇之耳。乐神由此立道：音不在弦，而在心。乐师一脉以音律为器，一弦可安魂，一调可破阵，山海之声皆可入乐。',
          life:0.90, mp:1.20, atk:1.00, def:0.80, mainSkill:'天音诀', mainSkillDesc:'音系效果+20%，灵力+15%',
          skills:[
            { id:'mu_punch', name:'音波', type:'basic', element:'音', power:1.0, cd:0, mp:0, desc:'音波攻击' },
            { id:'mu_zhen', name:'震音', type:'skill', element:'音', power:1.4, cd:3, mp:12, desc:'震音破甲10%并【减速】10%', armorBreak: 0.1, slow: 0.1 },
            { id:'mu_luan', name:'乱音', type:'skill', element:'音', power:0, cd:4, mp:15, desc:'乱音惑敌，【魅惑】1回合', charm: 1 },
            { id:'mu_an', name:'安魂曲', type:'skill', element:'音', power:0, cd:3, mp:12, desc:'安魂治疗，恢复25%生命', healSelf: 0.25 },
            { id:'mu_gong', name:'攻心音', type:'skill', element:'音', power:1.3, cd:3, mp:12, desc:'攻心夺魄，吸血20%', leech: 0.2 },
            { id:'mu_lei', name:'雷鸣', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'乐引天雷，【麻痹】1回合', paralyze: 1 },
            { id:'mu_feng', name:'风吟', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'风吟提速，闪避+25%', dodgeSelf: { name:'风吟', turns:2, mul:0.25 } },
            { id:'mu_ult', name:'万籁朝宗', type:'ultimate', element:'音', power:2.4, cd:0, mp:46, require:'fullBar', desc:'万籁齐鸣，灭世一击并【魅惑】1回合', charm: 1 },
            { id:'mu_dash', name:'音遁', type:'dodge', element:'音', power:0.5, cd:3, sta:20, desc:'随音闪避' }
          ], passive:{ name:'知音', desc:'音系技能命中后，下次伤害+15%', eff:{ type:'dmgCond', cond:'afterHitSound', mul:0.15 } },
          skillIntro:'乐师以音为器，一弦安魂、一调乱神。安魂曲续命、乱音惑心、震音破甲、攻心音吸血、雷鸣定身——战场如乐谱，乐师是唯一的指挥。奥义「万籁朝宗」万籁齐鸣，天地同奏。' },
        giant: { id:'giant', name:'巨灵', bp:'BLUE-GIANT', role:'defense', roleDesc:'防御 · 壁垒 —— 巨身护主，满血威压', tag:'擎天撼地·巨力', element:'土', nation:'daren', master:'巨灵神', origin:'大人国曾有巨人撑天而立，力竭而亡，身躯化作擎天柱——后人拾其遗骨，得「举重若轻」四字真意，这便是巨灵一脉的开端。巨灵不修巧劲，只修一口气：扛得住山，才托得起命。传说初代巨灵曾只手接住饕餮坠落的一颗星辰。',
          life:1.30, mp:0.70, atk:1.15, def:1.20, mainSkill:'擎天诀', mainSkillDesc:'生命+20%，土系伤害+15%',
          skills:[
            { id:'g_punch', name:'巨拳', type:'basic', element:'土', power:1.3, cd:0, mp:0, desc:'擎天巨拳' },
            { id:'g_zhen', name:'撼地', type:'skill', element:'土', power:1.5, cd:3, mp:12, desc:'撼地震伤，【减速】15%', slow: 0.15 },
            { id:'g_yan', name:'岩崩', type:'skill', element:'土', power:1.4, cd:3, mp:14, desc:'岩崩破甲12%', armorBreak: 0.12 },
            { id:'g_shou', name:'巨灵护体', type:'skill', element:'土', power:0, cd:4, mp:14, desc:'自身减伤30%持续3回合', reduceSelf: { name:'巨灵护体', turns:3, mul:0.3 } },
            { id:'g_huo', name:'开山', type:'skill', element:'火', power:1.5, cd:3, mp:14, desc:'开山裂石，【灼烧】2回合', burn: 2 },
            { id:'g_lei', name:'雷擎', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'擎天引雷，【麻痹】1回合', paralyze: 1 },
            { id:'g_feng', name:'罡风', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'罡风护体，闪避+20%', dodgeSelf: { name:'罡风', turns:2, mul:0.2 } },
            { id:'g_ult', name:'开天辟地', type:'ultimate', element:'土', power:2.6, cd:0, mp:50, require:'fullBar', desc:'一斧开天，毁灭一击并【眩晕】1回合', stun: 1 },
            { id:'g_dash', name:'土遁', type:'dodge', element:'土', power:0.5, cd:3, sta:20, desc:'遁地闪避' }
          ], passive:{ name:'巨力', desc:'攻击有概率造成【震伤】破甲', eff:{ type:'armorBreak', chance:0.20 } },
          skillIntro:'巨灵以肉身擎天，一力降十会。撼地减速、岩崩破甲、巨灵护体减伤、开山灼烧、雷擎定身——扛得住山，才托得起命。奥义「开天辟地」一斧开天，毁灭一击。' },
        fate: { id:'fate', name:'命师', bp:'BLUE-FATE', role:'support', roleDesc:'策应 · 增益 —— 窥命判势，攻防皆宜', tag:'占卜命运·玄妙', element:'道', nation:'jiaojing', master:'命祖', origin:'交胫国命轮织机上，曾有织女织断一根命线，万物的命运随之乱了——她苦修三百年，终于学会「织回」而不是「剪断」，此即命师一脉。命祖遗言：命运不是既定的布，而是正在织的绸；命师不逆命，只帮着把线头归位。',
          life:0.90, mp:1.25, atk:0.95, def:0.85, mainSkill:'推命诀', mainSkillDesc:'暴击+15%，命中+15%',
          skills:[
            { id:'fa_punch', name:'命丝', type:'basic', element:'道', power:1.0, cd:0, mp:0, desc:'命运之丝缠绕' },
            { id:'fa_kan', name:'窥命', type:'skill', element:'道', power:0, cd:4, mp:15, desc:'窥见破绽，敌方防御-20%', armorBreak: 0.2 },
            { id:'fa_jin', name:'命断', type:'skill', element:'金', power:1.5, cd:3, mp:14, desc:'斩断命线，破甲10%', armorBreak: 0.1 },
            { id:'fa_chan', name:'命缠', type:'skill', element:'道', power:1.2, cd:3, mp:12, desc:'命线【缠绕】并吸血15%', bind: true, leech: 0.15 },
            { id:'fa_lei', name:'命雷', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'天雷断命，【麻痹】1回合', paralyze: 1 },
            { id:'fa_shui', name:'命水', type:'skill', element:'水', power:1.2, cd:3, mp:12, desc:'命运之河，【冻结】1回合', freeze: 1 },
            { id:'fa_feng', name:'命风', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'命运之风，闪避+25%', dodgeSelf: { name:'命风', turns:2, mul:0.25 } },
            { id:'fa_ult', name:'逆天改命', type:'ultimate', element:'道', power:2.5, cd:0, mp:48, require:'fullBar', desc:'逆天改命，攻击+15%并绝杀一击', atkSelf: { name:'逆命', turns:2, mul:0.15 } },
            { id:'fa_dash', name:'命遁', type:'dodge', element:'道', power:0.5, cd:3, sta:20, desc:'遁入命河闪避' }
          ], passive:{ name:'窥命', desc:'暴击时敌方防御-5%（可叠加）', eff:{ type:'critDefBreak', def:0.05 } },
          skillIntro:'命师窥命断势，把胜负握在棋盘之外。窥命破防、命断斩线、命缠吸血、命雷麻痹、命水冻结——敌人打的是架，命师下的是棋。奥义「逆天改命」逆天一击，改写战局。' },
        shaper: { id:'shaper', name:'塑形师', bp:'BLUE-SHAPER', role:'control', roleDesc:'控制 · 异形 —— 变形控场，虚实互换', tag:'千变万化·诡变', element:'水', nation:'rouli', master:'化形老祖', origin:'柔利国的软玉大地万物无定形，有位少年每天醒来都不知道自己长什么模样——他索性不找了，把「无常形」炼成「万能形」，这便是塑形师一脉。化形老祖立誓：山中有形者皆为囚徒，无形者方得自在。',
          life:0.88, mp:1.15, atk:1.00, def:0.80, mainSkill:'化形诀', mainSkillDesc:'闪避+15%，变形增伤+15%',
          skills:[
            { id:'sh_punch', name:'变形击', type:'basic', element:'水', power:1.1, cd:0, mp:0, desc:'变幻之击' },
            { id:'sh_ni', name:'泥沼', type:'skill', element:'水', power:1.2, cd:3, mp:12, desc:'泥沼缠绕，【减速】25%', slow: 0.25 },
            { id:'sh_bing', name:'冰塑', type:'skill', element:'水', power:1.4, cd:3, mp:12, desc:'【冻结】1回合', freeze: 1 },
            { id:'sh_fang', name:'仿形', type:'skill', element:'水', power:1.3, cd:3, mp:14, desc:'仿敌之形，破甲12%', armorBreak: 0.12 },
            { id:'sh_hui', name:'回形', type:'skill', element:'木', power:0, cd:3, mp:12, desc:'恢复自身25%生命', healSelf: 0.25 },
            { id:'sh_lei', name:'雷形', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'化作雷形，【麻痹】1回合', paralyze: 1 },
            { id:'sh_feng', name:'风形', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'化作风形，闪避+25%', dodgeSelf: { name:'风形', turns:2, mul:0.25 } },
            { id:'sh_ult', name:'千形万象', type:'ultimate', element:'水', power:2.4, cd:0, mp:46, require:'fullBar', desc:'千形齐出，灭世一击并【眩晕】1回合', stun: 1 },
            { id:'sh_dash', name:'化遁', type:'dodge', element:'水', power:0.6, cd:3, sta:20, desc:'变形闪避' }
          ], passive:{ name:'万化', desc:'每回合随机获得一种元素增伤', eff:{ type:'randomElement', mul:0.10 } },
          skillIntro:'塑形师无常形，千变万化。泥沼减速、冰塑冻结、仿形破甲、回形续命、雷形定身——敌人永远猜不透你下一步变成什么。奥义「千形万象」千形齐出，灭世一击。' },
        pupil: { id:'pupil', name:'瞳师', bp:'BLUE-PUPIL', role:'attack', roleDesc:'攻击 · 精准 —— 洞破虚妄，弱点击破', tag:'洞悉破绽·锐利', element:'金', nation:'shenmu', master:'天目神', origin:'深目国裂隙中的巨瞳日夜注视万物，有位盲女却在黑暗中「看」见了未来的一角——她睁开眉心之目，自此能见人所不能见，此即瞳师一脉。天目神传下三视：视微、视远、视心。瞳师不看表面，只看破绽所在的那一瞬。',
          life:0.82, mp:1.00, atk:1.30, def:0.70, mainSkill:'天目诀', mainSkillDesc:'暴击+20%，破甲+15%',
          skills:[
            { id:'pu_punch', name:'瞳光', type:'basic', element:'金', power:1.1, cd:0, mp:0, desc:'锐利瞳光' },
            { id:'pu_shi', name:'洞悉', type:'skill', element:'金', power:0, cd:4, mp:15, desc:'洞悉破绽，敌方防御-25%', armorBreak: 0.25 },
            { id:'pu_jin', name:'金瞳', type:'skill', element:'金', power:1.5, cd:3, mp:12, desc:'金瞳破甲10%', armorBreak: 0.1 },
            { id:'pu_huo', name:'火瞳', type:'skill', element:'火', power:1.4, cd:3, mp:12, desc:'火瞳【灼烧】2回合', burn: 2 },
            { id:'pu_bing', name:'冰瞳', type:'skill', element:'水', power:1.4, cd:3, mp:12, desc:'【冻结】1回合', freeze: 1 },
            { id:'pu_lei', name:'雷瞳', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'雷瞳【麻痹】1回合', paralyze: 1 },
            { id:'pu_she', name:'摄瞳', type:'skill', element:'魂', power:1.2, cd:3, mp:12, desc:'摄魂之瞳，吸血15%', leech: 0.15 },
            { id:'pu_ult', name:'天目开', type:'ultimate', element:'金', power:2.5, cd:0, mp:48, require:'fullBar', desc:'天目洞开，绝杀一击并【眩晕】1回合', stun: 1 },
            { id:'pu_dash', name:'瞳遁', type:'dodge', element:'金', power:0.5, cd:3, sta:20, desc:'凝瞳闪避' }
          ], passive:{ name:'天目', desc:'暴击率+10%，暴击伤害+20%', eff:{ type:'crit', rate:0.10, dmg:0.20 } },
          skillIntro:'瞳师以目为刃，一眼看穿破绽。洞悉破防、金瞳破甲、火瞳灼烧、冰瞳冻结、雷瞳麻痹、摄瞳吸血——看破的瞬间，胜负已定。奥义「天目开」天目洞开，绝杀一击。' },
        devour: { id:'devour', name:'吞天师', bp:'BLUE-DEVOUR', role:'attack_sustain', roleDesc:'攻击 · 续航 —— 噬食为生，越战越勇', tag:'吞噬万物·贪婪', element:'邪', nation:'wuchang', master:'饕餮老祖', origin:'无肠国熔炉巨口日夜吞食，有位厨子跟着「吃」悟出了吞噬之道——不是吃人，是吞下天地灵气、化敌为养。饕餮老祖以身试法，吞过火、咽过雷，最终把「贪」炼成了「纳」。吞天师一脉以此为戒：贪而无厌者死，纳而有度者生。',
          life:1.15, mp:0.85, atk:1.30, def:0.90, mainSkill:'吞天诀', mainSkillDesc:'吸血+25%，攻击+15%',
          skills:[
            { id:'de_punch', name:'噬咬', type:'basic', element:'邪', power:1.2, cd:0, mp:0, desc:'吞噬之咬' },
            { id:'de_tun', name:'吞噬', type:'skill', element:'邪', power:1.4, cd:3, mp:12, desc:'吞噬气血，吸血30%', leech: 0.3 },
            { id:'de_shi', name:'噬魂', type:'skill', element:'魂', power:1.4, cd:3, mp:14, desc:'噬魂夺魄，【中毒】2回合', poison: 2, poisonName:'噬魂' },
            { id:'de_jing', name:'净化', type:'skill', element:'邪', power:0, cd:3, mp:12, desc:'吞敌之力，攻击+20%持续3回合', atkSelf: { name:'净化', turns:3, mul:0.2 } },
            { id:'de_huo', name:'吞火', type:'skill', element:'火', power:1.3, cd:3, mp:12, desc:'吞火反吐，【灼烧】2回合', burn: 2 },
            { id:'de_lei', name:'吞雷', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'吞雷反吐，【麻痹】1回合', paralyze: 1 },
            { id:'de_feng', name:'吞风', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'吞风加速，闪避+25%', dodgeSelf: { name:'吞风', turns:2, mul:0.25 } },
            { id:'de_ult', name:'吞天噬地', type:'ultimate', element:'邪', power:2.6, cd:0, mp:50, require:'fullBar', desc:'吞天噬地，灭世一击并吸血30%', leech: 0.3 },
            { id:'de_dash', name:'吞遁', type:'dodge', element:'邪', power:0.5, cd:3, sta:20, desc:'吞噬闪避' }
          ], passive:{ name:'贪食', desc:'每次吸血后攻击+2%（可叠加）', eff:{ type:'stackAtk', cond:'afterLeech', per:0.02, cap:10, label:'贪食' } },
          skillIntro:'吞天师以吞为道，化敌为养。吞噬吸血、噬魂蚀骨、净化增攻、吞火灼烧、吞雷麻痹——越战越强，敌人的力量终将成为你的养料。奥义「吞天噬地」吞尽万物，灭世一击。' },
        oneeye: { id:'oneeye', name:'独目神', bp:'BLUE-ONEEYE', role:'attack', roleDesc:'攻击 · 爆发 —— 独目观天，一击破军', tag:'独目洞察·威压', element:'魂', nation:'yimu', master:'目神', origin:'一目国人人额中一目，唯独初代目神生来双目紧闭——不是盲，是不敢看。某日他睁眼，一眼看穿了混沌之目布下的千年迷障，也付出了双目俱焚的代价。独目神一脉自此只留一目，把「看见真相」炼成威压：真言所致，幻象皆碎。',
          life:0.85, mp:1.00, atk:1.25, def:0.80, mainSkill:'独目诀', mainSkillDesc:'命中+20%，威压敌方',
          skills:[
            { id:'oe_punch', name:'目击', type:'basic', element:'魂', power:1.1, cd:0, mp:0, desc:'独目凝视' },
            { id:'oe_wei', name:'威压', type:'skill', element:'魂', power:0, cd:4, mp:15, desc:'威压敌方，攻击-15%并破甲10%', atkDown: 0.15, armorBreak: 0.1 },
            { id:'oe_she', name:'摄魂', type:'skill', element:'魂', power:1.4, cd:3, mp:14, desc:'摄魂夺魄，【中毒】2回合', poison: 2, poisonName:'魂蚀' },
            { id:'oe_ming', name:'明察', type:'skill', element:'魂', power:1.3, cd:3, mp:12, desc:'明察秋毫，破甲15%', armorBreak: 0.15 },
            { id:'oe_huo', name:'火目', type:'skill', element:'火', power:1.4, cd:3, mp:12, desc:'火目【灼烧】2回合', burn: 2 },
            { id:'oe_lei', name:'雷目', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'雷目【麻痹】1回合', paralyze: 1 },
            { id:'oe_feng', name:'风目', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'风目加速，闪避+25%', dodgeSelf: { name:'风目', turns:2, mul:0.25 } },
            { id:'oe_ult', name:'独目开天', type:'ultimate', element:'魂', power:2.5, cd:0, mp:48, require:'fullBar', desc:'独目开天，绝杀一击并【眩晕】1回合', stun: 1 },
            { id:'oe_dash', name:'目遁', type:'dodge', element:'魂', power:0.5, cd:3, sta:20, desc:'凝目闪避' }
          ], passive:{ name:'威压', desc:'开场敌方全属性-5%', eff:{ type:'openDebuff', mul:0.05 } },
          skillIntro:'独目神一眼观天，威压自生。威压降攻、明察破甲、摄魂蚀骨、火目灼烧、雷目定身——真言所致，幻象皆碎。奥义「独目开天」独目开天，绝杀一击。' },
        vein: { id:'vein', name:'连脉师', bp:'BLUE-VEIN', role:'heal_def', roleDesc:'恢复 · 防御 —— 连脉共生，分伤续命', tag:'血脉相连·共生', element:'木', nation:'jiexiong', master:'脉祖', origin:'结胸国人以核共鸣，同悲同喜——初代脉祖本是个无法与任何人共鸣的异类，直到他把自己的一根血管接上巨树的根脉，听见了整片森林的心跳。连脉师一脉自此以「同频」为道：万物血脉相连，你痛，我亦知。',
          life:1.10, mp:1.10, atk:0.85, def:1.05, mainSkill:'连脉诀', mainSkillDesc:'生命+15%，治疗+15%',
          skills:[
            { id:'ve_punch', name:'脉击', type:'basic', element:'木', power:1.1, cd:0, mp:0, desc:'血脉之力' },
            { id:'ve_lian', name:'连脉', type:'skill', element:'木', power:0, cd:4, mp:15, desc:'血脉相连，【缠绕】1回合', bind: true },
            { id:'ve_chan', name:'缠脉', type:'skill', element:'木', power:1.3, cd:3, mp:12, desc:'血脉缠绕，吸血20%', leech: 0.2 },
            { id:'ve_zhi', name:'续脉', type:'skill', element:'木', power:0, cd:3, mp:12, desc:'续脉治疗，恢复30%生命', healSelf: 0.3 },
            { id:'ve_lei', name:'脉雷', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'血脉引雷，【麻痹】1回合', paralyze: 1 },
            { id:'ve_huo', name:'脉火', type:'skill', element:'火', power:1.3, cd:3, mp:12, desc:'血脉燃火，【灼烧】2回合', burn: 2 },
            { id:'ve_feng', name:'脉风', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'血脉御风，闪避+25%', dodgeSelf: { name:'脉风', turns:2, mul:0.25 } },
            { id:'ve_ult', name:'万脉归宗', type:'ultimate', element:'木', power:2.4, cd:0, mp:46, require:'fullBar', desc:'万脉合一，绝杀一击并恢复25%生命', healSelf: 0.25 },
            { id:'ve_dash', name:'脉遁', type:'dodge', element:'木', power:0.5, cd:3, sta:20, desc:'随脉闪避' }
          ], passive:{ name:'共生', desc:'受击时概率恢复少量生命', eff:{ type:'onHitHeal', chance:0.20, pct:0.08 } },
          skillIntro:'连脉师万物同频，血脉相连。连脉缚敌、缠脉吸血、续脉治疗、脉雷麻痹、脉火灼烧——你痛，敌亦痛；你伤，脉自愈。奥义「万脉归宗」万脉合一，绝杀并回春。' },
        walker: { id:'walker', name:'行者', bp:'BLUE-WALKER', role:'attack', roleDesc:'攻击 · 机动 —— 步生莲花，游走制敌', tag:'行遍天下·迅捷', element:'风', nation:'qizhong', master:'行神', origin:'跂踵人无踵，永不停步——初代行神被梼杌之足追赶了一百年，脚步却越走越快，最终把「逃亡」走成了「大道」。行者一脉以脚印为经、以风尘为纬，行走即修行。行神遗训：山海没有终点，行者永远在路上。',
          life:0.85, mp:0.95, atk:1.20, def:0.75, mainSkill:'行路诀', mainSkillDesc:'速度+25%，闪避+15%',
          skills:[
            { id:'wa_punch2', name:'行步击', type:'basic', element:'风', power:1.1, cd:0, mp:0, desc:'疾行一击' },
            { id:'wa_xing2', name:'疾行', type:'skill', element:'风', power:0, cd:3, mp:12, desc:'疾行加速，闪避+40%', dodgeSelf: { name:'疾行', turns:2, mul:0.4 } },
            { id:'wa_feng2', name:'行风', type:'skill', element:'风', power:1.4, cd:3, mp:12, desc:'行风破甲10%', armorBreak: 0.1 },
            { id:'wa_lei2', name:'行雷', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'行引天雷，【麻痹】1回合', paralyze: 1 },
            { id:'wa_hui2', name:'回行', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'回行反噬，吸血20%', leech: 0.2 },
            { id:'wa_shui2', name:'行云', type:'skill', element:'水', power:1.2, cd:3, mp:12, desc:'行云布雨，【冻结】1回合', freeze: 1 },
            { id:'wa_tu2', name:'行岳', type:'skill', element:'土', power:1.3, cd:3, mp:14, desc:'行如岳峙，【减速】20%', slow: 0.2 },
            { id:'wa_ult2', name:'千里之行', type:'ultimate', element:'风', power:2.4, cd:0, mp:46, require:'fullBar', desc:'千里之行，攻击+15%并绝杀一击', atkSelf: { name:'千里', turns:2, mul:0.15 } },
            { id:'wa_dash2', name:'行遁', type:'dodge', element:'风', power:0.6, cd:3, sta:20, desc:'疾行闪避' }
          ], passive:{ name:'行云', desc:'每回合速度+3%（可叠加）', eff:{ type:'speed', per:0.03 } },
          skillIntro:'行者行走即修行，步生莲花。疾行脱身、行风破甲、行雷麻痹、行云冻结、回行吸血、行岳减速——永远在敌人够不着的地方出刀。奥义「千里之行」千里一击，绝杀于无形。' },
        void: { id:'void', name:'归墟者', bp:'BLUE-VOID', role:'defense', roleDesc:'防御 · 终极 —— 归墟虚无，吞尽万法', tag:'归于虚无·寂灭', element:'暗', nation:'guixu', master:'墟祖', origin:'归墟是无底之谷，万物归处。初代墟祖本是坠入归墟的罪人，却在万劫寂灭中悟出「归于虚无亦是道」——从虚空来，往虚空去，方能容万物。归墟者一脉自此立下：不争不抢，只因万物终将归来；不惧不怖，只因黑暗亦是家园。',
          life:1.10, mp:0.85, atk:1.00, def:1.15, mainSkill:'归墟诀', mainSkillDesc:'暗系伤害+20%，暴击+15%',
          skills:[
            { id:'vo_punch', name:'墟击', type:'basic', element:'暗', power:1.2, cd:0, mp:0, desc:'归墟之力' },
            { id:'vo_xi', name:'吸灵', type:'skill', element:'暗', power:1.3, cd:3, mp:12, desc:'吸取灵气，吸血20%', leech: 0.2 },
            { id:'vo_mo', name:'寂灭', type:'skill', element:'暗', power:1.5, cd:3, mp:14, desc:'寂灭一击，破甲15%', armorBreak: 0.15 },
            { id:'vo_an', name:'虚无', type:'skill', element:'暗', power:0, cd:4, mp:15, desc:'化虚无，闪避+50%持续2回合', dodgeSelf: { name:'虚无', turns:2, mul:0.5 } },
            { id:'vo_lei', name:'墟雷', type:'skill', element:'雷', power:1.4, cd:3, mp:14, desc:'墟雷【麻痹】1回合', paralyze: 1 },
            { id:'vo_bing', name:'墟冰', type:'skill', element:'水', power:1.3, cd:3, mp:12, desc:'墟冰【冻结】1回合', freeze: 1 },
            { id:'vo_feng', name:'墟风', type:'skill', element:'风', power:1.2, cd:3, mp:12, desc:'墟风加速，闪避+25%', dodgeSelf: { name:'墟风', turns:2, mul:0.25 } },
            { id:'vo_ult', name:'万物归墟', type:'ultimate', element:'暗', power:2.6, cd:0, mp:50, require:'fullBar', desc:'万物归墟，灭世一击并【眩晕】1回合', stun: 1 },
            { id:'vo_dash', name:'墟遁', type:'dodge', element:'暗', power:0.5, cd:3, sta:20, desc:'归墟闪避' }
          ], passive:{ name:'归墟', desc:'击杀后恢复大量生命', eff:{ type:'onKillHeal', pct:0.30 } },
          skillIntro:'归墟者立于黑暗，吞尽万法。吸灵吸血、寂灭破甲、虚无闪避、墟雷麻痹、墟冰冻结——不争不抢，只因万物终将归来。奥义「万物归墟」万物归墟，灭世一击。' }
      };
      // 统一注入职业立绘路径（美术素材）
      const PROF_IMG_MAP = {
        assassin:'prof-assassin', sword:'prof-sword', alchemy:'prof-alchemy', summoner:'prof-summoner',
        talisman:'prof-talisman', beast:'prof-beast', dream:'prof-dream', array:'prof-array',
        fox:'prof-fox', windspirit:'prof-windspirit', smith:'prof-smith', water:'prof-water',
        musician:'prof-musician', giant:'prof-giant', fate:'prof-fate', shaper:'prof-shaper',
        pupil:'prof-pupil', devour:'prof-devour', oneeye:'prof-oneeye', vein:'prof-vein',
        walker:'prof-walker', void:'prof-void'
      };
      for (const k in PROF_IMG_MAP) {
        if (professions[k]) professions[k].img = 'assets/img/professions/' + PROF_IMG_MAP[k] + '.jpg';
      }
      return professions;
    },

    /** 转职材料需求（可读列表，供 UI 展示与转职校验共用） */
    professionCost(prof) {
      const natPrefix = { qingqiu:'C', yumin:'FS', yanhuo:'YH', xuanyuan:'JG', xuangu:'XG', huantou:'HT', sanshou:'SS', nieer:'NE', daren:'DR', baimin:'BM', changgu:'CG', zhurao:'ZR', jiaojing:'JJ', rouli:'RL', shenmu:'SM', wuchang:'WC', yimu:'YM', jiexiong:'JX', qizhong:'QZ', guixu:'GX' };
      const nationName = { qingqiu:'青丘', yumin:'羽民', yanhuo:'厌火', xuanyuan:'轩辕', xuangu:'玄股', huantou:'讙头', sanshou:'三首', nieer:'聂耳', daren:'大人', baimin:'白民', changgu:'长股', zhurao:'周饶', jiaojing:'交胫', rouli:'柔利', shenmu:'深目', wuchang:'无肠', yimu:'一目', jiexiong:'结胸', qizhong:'跂踵', guixu:'归墟' };
      const pref = natPrefix[prof.nation] || 'C';
      // 转职材料：该国专属灵材（05/06）+ 通用千年灵木
      const need = [['MAT-' + pref + '05', 3], ['MAT-' + pref + '06', 2], ['MAT-E17', 2]];
      return {
        nation: prof.nation || '',
        nationName: nationName[prof.nation] || (prof.nation || '对应国家'),
        need: need.map(([m, c]) => ({ id: m, name: STATE.matName(m), count: c })),
        needText: need.map(([m, c]) => STATE.matName(m) + '×' + c).join('、')
      };
    },

    /** 转职：需图纸+等级+灵材；返回结果 */
    changeProfession(p, profId) {
      const hidden = STATE.getHiddenProfessions();
      const prof = hidden[profId];
      if (!prof) return { error: '职业不存在' };
      // 已解锁过该职业则可自由切换
      const owned = (p.ownedProfessions || (p.ownedProfessions = []));
      if (owned.includes(profId)) {
        STATE.applyProfession(p, prof);
        return { ok: true, prof, switched: true };
      }
      // 首次转职需图纸 + 等级 + 对应国家专属灵材（该国家探索可获取）
      if (!(p.unlocked || new Set()).has(prof.bp)) return { error: '缺少职业图纸【' + STATE.matName(prof.bp) + '】' };
      if (p.lv < 30) return { error: '等级不足30，无法转职' };
      const cost = STATE.professionCost(prof);
      for (const item of cost.need) {
        if (!STATE.hasMaterial(p, item.id, item.count)) return { error: '灵材不足（需在' + cost.nationName + '探索获取）：' + cost.needText };
      }
      for (const item of cost.need) STATE.removeMaterial(p, item.id, item.count);
      owned.push(profId);
      STATE.applyProfession(p, prof);
      STATE.recordTome(p, 'PROF:' + profId);   // 绘卷全局入册：习得即永久收录
      // 首次解锁隐藏职业 → 自动解锁对应皮肤（局外全局）
      STATE.unlockProfSkin(profId);
      return { ok: true, prof, switched: false };
    },

    /** 隐藏职业 → 皮肤自动解锁（局外全局，跨存档） */
    unlockProfSkin(profId) {
      try {
        if (typeof global.META === 'undefined' || !META.unlockSkin) return;
        const skinMap = {
          assassin: 'skin_prof_yingci',    // 影刺
          sword:    'skin_prof_xuanyuan',  // 剑修（机关之心占位）
          alchemy:  'skin_prof_danxia',    // 丹道宗师
          fox:      'skin_prof_hujiu'      // 狐仙
        };
        const skinId = skinMap[profId];
        if (skinId) META.unlockSkin(skinId);
      // 新手历程：解锁隐藏职业 +1
      try { if (typeof META !== 'undefined' && META.trackNovice) META.trackNovice('hidden', 1); } catch (e) {}
      } catch (e) {}
    },

    /** 获取当前职业全部技能（含隐藏职业） */
    getProfessionSkills(p) {
      const profId = p.profession;
      const base = (global.PROFESSIONS || {})[profId];
      if (base) return { prof: base, skills: base.skills, passive: base.passive, hidden: false };
      const hidden = STATE.getHiddenProfessions();
      const h = hidden[profId];
      if (h) return { prof: h, skills: h.skills, passive: h.passive, hidden: true };
      return null;
    },

    /** 道心试炼作答：记录答案（0/1/2），道心坚定与否影响后续心魔强度 */
    answerDaoxin(p, answerIdx) {
      p._daoxinAnswer = answerIdx;
      // 正确答案为 1（中道/本心/明心见性）；答对道心坚定，答错道心蒙尘
      p._daoxinStable = (answerIdx === 1);
      return { ok: true, stable: p._daoxinStable };
    },

    /** 清除道心试炼状态（突破结束后调用，避免残留到下次突破） */
    clearDaoxin(p) {
      p._daoxinAnswer = undefined;
      p._daoxinStable = undefined;
      p._daoxinBuff = undefined;
    },

    /** 应用职业（切换主职业，保留旧职业于 ownedProfessions 可随时切回） */
    applyProfession(p, prof) {
      p.profession = prof.id;
      p.professionName = prof.name;
      p.mainSkill = prof.mainSkill;
      p.coeff = { life: prof.life, mp: prof.mp, atk: prof.atk, def: prof.def };
      // 切换职业时自动适配出战配置：奥义/普攻必带（不计入4个），其余主动（skill/位移/格挡）取前4个
      const skills = prof.skills || [];
      const selectable = skills.filter(sk => sk.type !== 'ultimate' && sk.type !== 'basic');
      const autoActives = selectable.slice(0, 4).map(sk => sk.id);
      // 切换职业时默认启用新职业的被动（'__prof__' 表示职业被动），避免被动丢失
      p.skillLoadout = { actives: autoActives, passive: (prof.passive ? '__prof__' : null) };
      // 不重置 base 属性，保留成长
    },

    /* ============== 成就系统 ============== */
    /** 检测并解锁成就；ctx 为触发上下文（如 {weakWin:true, maxCombo:5}）。返回本次新解锁的成就列表（已附加 reward 发放结果） */
    checkAchievements(p, ctx) {
      if (!p) return [];
      const list = (typeof global.ACHIEVEMENTS !== 'undefined') ? global.ACHIEVEMENTS : [];
      const unlocked = (p.achievements || (p.achievements = []));
      const newly = [];
      for (const a of list) {
        if (unlocked.indexOf(a.id) >= 0) continue;   // 已解锁跳过
        let ok = false;
        try { ok = !!a.check(p, ctx || {}); } catch (e) { ok = false; }
        if (ok) {
          unlocked.push(a.id);
          newly.push(a);
        }
      }
      // 新手历程：达成成就计数
      if (newly.length && typeof global.META !== 'undefined' && META.trackNovice) {
        try { META.trackNovice('ach', newly.length); } catch (e) {}
      }
      // 成就改为「全局成就」（不分存档）：解锁时同步到局外全局记录，并永久入册绘卷
      newly.forEach(a => {
        try {
          if (typeof global.META !== 'undefined' && META.unlockGlobalAch) {
            META.unlockGlobalAch(a.id);
          }
        } catch (e) {}
        STATE.recordTome(p, 'ACH:' + a.id);
        // 局内奖励已取消，改为局外命数奖励（在封面「全局成就」面板领取）
        // 弹窗提示玩家去封面领取命数
        let ming = 30;
        if (a.id.indexOf('hidden') === 0) ming = 100;
        else if (a.id.indexOf('realm') === 0 || a.id.indexOf('nation') === 0) ming = 50;
        else if (a.id.indexOf('battle') === 0) ming = 40;
        a.reward = ['命数 +' + ming + '（封面·全局成就领取）'];
      });
      // 联动：解锁「新生太阳」→ 自动供奉红日真君并满供奉值（神降）
      if (unlocked.indexOf('hidden_xinsheng_taiyang') >= 0) {
        if (!p.offerGod) {
          p.offerGod = 'hongri';
          p.offerValue = 1000;
          const god = STATE.getGods().hongri;
          if (god) STATE.applyOfferBonus(p, god);
        }
      }
      return newly;
    },

    /** 是否已解锁某成就 */
    hasAchievement(p, id) {
      return p && p.achievements && p.achievements.indexOf(id) >= 0;
    },

    /** 序列化（用于存档） */
    serialize(p) {
      // 过滤临时状态（下划线开头）。
      // 白名单：下列下划线字段承载跨会话的关键持久数据，必须存档：
      //   _clues(任务栏线索) _storyState/_inStory(点触主线断点) _battleBackStory(战斗回退)
      //   _quizAnswered(答题记录) _easters(彩蛋标记) _questDone(委托完成)
      //   _battleWins/_battleLoses/_exploreTimes/_fumoTimes(成就累计计数)
      //   _fumoEnteredDay(伏魔窟每日限进)
      //   _challenge*系列（V1.3.18：挑战装备/法阵聚合加成与营地引语，跨会话持久，读档后恢复战力）
      const PERSIST_UNDERSCORE = ['_clues','_storyState','_inStory','_battleBackStory','_quizAnswered','_easters','_questDone','_battleWins','_battleLoses','_exploreTimes','_fumoTimes','_fumoEnteredDay','_tomeSeen','_tomeClaimed','_commissionDay','_commissionDone','_gardenEggClaimed','_profPortrait',
        '_challengeIntro','_challengeGearAtk','_challengeGearDef','_challengeGearHp','_challengeGearLeech','_challengeGearMp','_challengeGearDodge','_challengeGearSkills','_challengeGearSummary',
        '_tutorial','_tutorialSave'];
      const out = {};
      for (const k in p) {
        if (k.indexOf('_') === 0) {
          if (PERSIST_UNDERSCORE.indexOf(k) >= 0 && p[k] !== undefined && p[k] !== null) {
            out[k] = (k === '_tomeSeen' && p[k] instanceof Set) ? Array.from(p[k]) : p[k];
          }
          continue;                                     // 其余临时字段不存档
        }
        out[k] = p[k];
      }
      out.completed = Array.from(p.completed);
      out.unlocked = Array.from(p.unlocked);
      out.unlockedRecipes = Array.from(p.unlockedRecipes || []);
      return out;
    },

    /** 反序列化（重建缺失的集合/容器，保证旧存档兼容） */
    deserialize(obj) {
      obj.completed = new Set(obj.completed || []);
      obj.unlocked = new Set(obj.unlocked || []);
      obj.materials = obj.materials || {};
      obj.pills = obj.pills || {};
      obj.plots = obj.plots || [];
      obj.pets = obj.pets || [];
      obj.mingshen = obj.mingshen || [];
      obj.buffs = obj.buffs || [];
      obj.debuffs = obj.debuffs || [];
      obj.favor = obj.favor || {};
      obj.nationEvil = obj.nationEvil || {};
      obj.ownedProfessions = obj.ownedProfessions || [];
      obj.activePet = obj.activePet || null;
      obj.unlockedRecipes = new Set(obj.unlockedRecipes || []);
      obj.achievements = obj.achievements || [];
      obj.redeemCodes = obj.redeemCodes || [];
      obj.drawChances = obj.drawChances || 0;
      obj.petDex = obj.petDex || [];
      obj.daily = obj.daily || { date: obj.day || 1, explore: 0, battle: 0, cultivate: 0, fumo: 0, claimed: [] };
      obj.dailyStreak = obj.dailyStreak || 0;   // 修行连击（旧存档缺省补 0）
      obj.charQuests = obj.charQuests || {};    // 角色专属任务完成标记（旧存档缺省补空）
      obj.charGood = obj.charGood || 0;         // 角色行善计数（旧存档缺省补 0）
      // 角色专属剧情：阶段索引 + 各阶段子进度 + 天级战斗属性加成（旧存档缺省补空）
      if (!obj.charQuestStage || typeof obj.charQuestStage !== 'object') obj.charQuestStage = {};
      if (!obj.charQuestData || typeof obj.charQuestData !== 'object') obj.charQuestData = {};
      if (!obj.charBattleBonus || typeof obj.charBattleBonus !== 'object') obj.charBattleBonus = {};
      obj.npcRewards = obj.npcRewards || { date: obj.day || 1, got: {} };  // NPC 每日奖励上限（旧存档缺省补空）
      obj.weeklyTrack = obj.weeklyTrack || { weekKey: '', battles: 0, cultivate: 0, explore: 0 };  // 每周任务统计
      obj.tower = obj.tower || null;   // V1.3.19：试炼塔进度（旧档缺省补 null）
      // 技能配置兼容（旧存档缺省补空结构）
      if (!obj.skillLoadout || typeof obj.skillLoadout !== 'object') obj.skillLoadout = { actives: [], passive: null };
      // 国家/场景默认（旧存档缺失时补青丘）
      if (!obj.nation) obj.nation = 'qingqiu';
      if (!obj.currentScene) obj.currentScene = 'qingqiu_entry';
      // 持久化下划线字段兜底（旧存档缺省补空容器，避免读档后 undefined 崩溃）
      obj._clues = obj._clues || {};
      obj._quizAnswered = obj._quizAnswered || {};
      obj._easters = obj._easters || {};
      obj._questDone = obj._questDone || {};
      obj._storyState = obj._storyState || null;
      obj._inStory = obj._inStory || null;
      obj._battleBackStory = obj._battleBackStory || null;
      obj._battleWins = obj._battleWins || 0;
      obj._battleLoses = obj._battleLoses || 0;
      obj._exploreTimes = obj._exploreTimes || 0;
      obj._fumoTimes = obj._fumoTimes || 0;
      obj._fumoEnteredDay = obj._fumoEnteredDay || 0;   // 兜底：伏魔窟"当日限进"判断
      obj._tomeSeen = (obj._tomeSeen instanceof Set) ? obj._tomeSeen : new Set(obj._tomeSeen || []);
      obj._tomeClaimed = obj._tomeClaimed || [];
      // 山海绘卷图鉴兜底：老存档把"当前库存中已有"的材料视为已记录（见过即入册），并一次性并入全局收藏
      try {
        if (!obj._tomeSeen.size && obj.materials) {
          Object.keys(obj.materials).forEach(k => { if (obj.materials[k] > 0) obj._tomeSeen.add(k); });
        }
        if (!obj._tomeSeen.size && obj.pills) {
          Object.keys(obj.pills).forEach(k => { if (obj.pills[k] > 0) obj._tomeSeen.add(k); });
        }
        STATE.tomeDexMigrateFrom(obj);   // 全局入册：解锁即永久存在，不随存档丢失
      } catch (e) {}
      obj.challengePrep = obj.challengePrep || { materials:0, adventures:0, wins:0, practiced:0, chapter:0 };  // 挑战营地进度兜底
      // realm 结构补全（旧存档可能缺字段）
      if (!obj.realm) obj.realm = { name:'炼气期', level:1, exp:0, expMax:100, round:0 };
      if (typeof obj.realm.expMax !== 'number') obj.realm.expMax = 100;
      if (typeof obj.evil !== 'number') obj.evil = 0;
      if (typeof obj.shichen !== 'number') { obj.shichen = 6; obj.shichenMax = 6; }
      if (typeof obj.day !== 'number') obj.day = 1;
      // coeff 补全（旧存档可能缺失派生系数）
      if (!obj.coeff) {
        const prof = resolveProf(obj.profession);
        obj.coeff = { life: prof.life, mp: prof.mp, atk: prof.atk, def: prof.def };
      }
      // 供奉加成重算（临时字段 _offer*Bonus 不持久化，读档后按供奉值重算）
      if (obj.offerGod && obj.offerValue) {
        const god = STATE.getGods()[obj.offerGod];
        if (god) STATE.applyOfferBonus(obj, god);
      }
      // 技能配置兼容：basic/ultimate 现为必带（不计入4个），清理旧存档 actives 里的必带类型残留
      if (obj.skillLoadout && Array.isArray(obj.skillLoadout.actives)) {
        const prof = resolveProf(obj.profession);
        const profSkills = prof ? (prof.skills || []) : [];
        const mandatoryIds = profSkills.filter(sk => sk.type === 'basic' || sk.type === 'ultimate').map(sk => sk.id);
        obj.skillLoadout.actives = obj.skillLoadout.actives.filter(id => mandatoryIds.indexOf(id) < 0);
        // 旧存档 passive 存的是名字，新逻辑存 id（__prof__ 或神赐技能 id）
        if (obj.skillLoadout.passive && typeof obj.skillLoadout.passive === 'string' && obj.skillLoadout.passive !== '__prof__') {
          const profPassive = prof && prof.passive;
          if (profPassive && obj.skillLoadout.passive === profPassive.name) obj.skillLoadout.passive = '__prof__';
        }
      }
      // 临时字段兜底清空（避免旧存档残留）
      obj._pendingEnemy = undefined;
      obj._exploreNation = undefined;
      obj._hiddenEvent = undefined;
      obj._daoxinQ = undefined;
      obj._daoxinBuff = undefined;
      obj._daoxinStable = undefined;
      obj._daoxinAnswer = undefined;
      // 点触主线断点有效性校验：指向的国家若无点触主线数据（数据被改动/删减），清除断点避免读档后越界
      try {
        const validStoryNations = (typeof global.EXPLORE !== 'undefined' && global.EXPLORE)
          ? Object.keys(global.EXPLORE).filter(n => global.EXPLORE[n] && global.EXPLORE[n].story && global.EXPLORE[n].story.length)
          : [];
        ['_storyState', '_inStory', '_battleBackStory'].forEach(k => {
          if (obj[k] && validStoryNations.length && validStoryNations.indexOf(obj[k].nationId) < 0) {
            obj[k] = null;
          }
        });
      } catch (e) {}
      return obj;
    }
  };

  global.STATE = STATE;
  global.PROFESSION_DATA = PROFESSION_DATA;
})(window);