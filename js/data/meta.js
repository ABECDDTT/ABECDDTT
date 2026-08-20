/* ===========================================================
 * 问道山海 · 局外全局系统（跨存档 · 跨周目）
 * 管理：命数（局外货币）、每日签到、每周任务、限免角色、
 *       皮肤图鉴、挑战模式奖励、角色图鉴、命签抽卡（卡包）
 *
 * 设计原则（人民史观）：
 *   - 命数是「众生愿力所凝」，非天选之资，人人可得
 *   - 签到/周常/挑战/成就，皆以「凡人之力，亦可参天」立意
 *   - 角色图鉴收录的都是「普通人」，在平凡中迸发龙象之力
 *
 * 持久化键：wenda-shanhai-meta（JSON）
 * =========================================================== */
(function (global) {
  'use strict';

  const META_KEY = 'wenda-shanhai-meta';

  /* ===========================================================
   * 0. 底层存储
   * =========================================================== */
  function defaultMeta() {
    return {
      // —— 命数（局外货币） ——
      ming: 0,                    // 命数余额
      // —— 每日签到 ——
      signin: {
        lastDate: '',             // 上次签到日期 'YYYY-MM-DD'
        streak: 0,                // 连续签到天数（用于奖励递增）
        total: 0                  // 累计签到次数
      },
      // —— 每周任务 ——
      weekly: {
        weekKey: '',              // 当前周标识 'YYYY-Www'
        claimed: [],              // 已领取的任务 id
        // 部分周任务需要「在本周内进行过游玩的存档」才能领取
        // 由 playmarks 记录各存档最近游玩时间戳
      },
      // 各存档游玩标记（用于「本周游玩过的存档」判定）
      playmarks: {},              // { slotIndex: timestamp }
      // —— 限免角色 ——
      freeplay: {
        weekKey: '',              // 限免轮换周
        charIds: []               // 本周限免角色 id 列表
      },
      // —— 挑战模式 ——
      challenge: {
        cleared: [],              // 已通关的挑战 id
        clearedAt: {},            // 通关时间戳 { id: timestamp }
        claimed: []               // 已领取奖励的挑战 id
      },
      // —— 皮肤图鉴（已解锁皮肤 id） ——
      skins: [],
      // —— 当前装备的皮肤（{ type: 'char'|'prof'|'pet', id }，跨存档生效） ——
      equippedSkin: null,
      // —— 当前封面皮肤 id（封面背景皮肤，跨存档生效） ——
      coverSkin: 'cover_riyue',   // 默认封面：日月同辉
      // —— 选项框美术风格（option-box 样式风格，跨存档生效） ——
      optionStyle: 'classic',
      // —— 角色图鉴（已拥有/解锁的角色 id） ——
      charDex: [],
      // —— 全局成就（跨存档，成就 id → 已达成） ——
      globalAch: [],
      // —— 全局成就奖励已领取（成就 id → 已领命数） ——
      globalAchClaimed: [],
      // —— 命签抽卡图鉴（已拥有的图鉴条目 id：命格/皮肤/角色） ——
      novice: { progress: 0, lastDay: '', claimed: [] },   // 新手历程（跨存档）
      mingsignDex: []             // { kind: 'mingshen'|'skin'|'char', id }
    };
  }

  let _cache = null;
  function load() {
    if (_cache) return _cache;
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) { _cache = defaultMeta(); return _cache; }
      const obj = JSON.parse(raw);
      _cache = Object.assign(defaultMeta(), obj);
      // 子对象兜底
      _cache.signin = Object.assign(defaultMeta().signin, obj.signin || {});
      _cache.weekly = Object.assign(defaultMeta().weekly, obj.weekly || {});
      _cache.freeplay = Object.assign(defaultMeta().freeplay, obj.freeplay || {});
      _cache.challenge = Object.assign(defaultMeta().challenge, obj.challenge || {});
      return _cache;
    } catch (e) {
      _cache = defaultMeta();
      return _cache;
    }
  }
  function save() {
    try { localStorage.setItem(META_KEY, JSON.stringify(_cache)); } catch (e) {}
  }

  /* ===========================================================
   * 1. 工具：日期/周
   * =========================================================== */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  /** 周标识：ISO 周（周一为一周之始） */
  function weekKeyOf(d) {
    d = d || new Date();
    const dt = new Date(d.getTime());
    const day = (dt.getDay() + 6) % 7;   // 周一=0
    dt.setDate(dt.getDate() - day + 3);   // 回到该周四
    const thursday = new Date(dt.getFullYear(), 0, 4);
    const week = Math.round(((dt - thursday) / 86400000 - 3 + ((thursday.getDay() + 6) % 7)) / 7) + 1;
    return d.getFullYear() + '-W' + pad(week);
  }

  /* ===========================================================
   * 1.1 大荒历（签到系统专用显示：避免暴露真实日期，强调世界观）
   *  「大荒历」以世间开辟之日为纪元元年正月初一。
   *  计算方式：相对真实日期固定偏移（2026-01-01 = 甲子元年正月初一）
   *  显示 ：甲子纪元 · X年X月X日（甲子为天干地支幻化）
   *  决断：每日 UI 仅显示「纪元·干支」，6 日循环跳转的奖励更显世界感
   * =========================================================== */
  const HUANG_ERA_START = new Date(2026, 0, 1);   // 大荒历纪元起点
  const HUANG_MONTHS = ['孟春','仲春','季春','孟夏','仲夏','季夏','孟秋','仲秋','季秋','孟冬','仲冬','季冬'];
  const HUANG_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const HUANG_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  function huangDate(d) {
    d = d || new Date();
    const diff = Math.floor((d - HUANG_ERA_START) / 86400000);
    if (diff < 0) return { year: 1, month: 1, day: 1, stem: '甲', branch: '子', label: '甲子纪元·元年' };
    // 按 24 节气粗略固定：每月 30 天 → 12 月 360 天一年
    const year = Math.floor(diff / 360) + 1;
    const dayOfYear = diff % 360;
    const month = Math.floor(dayOfYear / 30) + 1;
    const day = (dayOfYear % 30) + 1;
    const idx = (diff) % 60;   // 60 甲子循环
    const stem = HUANG_STEMS[idx % 10];
    const branch = HUANG_BRANCHES[idx % 12];
    return { year, month, day, stem, branch, label: `${stem}${branch}纪元·${year}年` };
  }
  function huangDayLabel(d) {
    const h = huangDate(d);
    return `${h.stem}${h.branch}日`;
  }
  /** 签到系统的"今日"key（用大荒历干支日代替真实日期，避免暴露真实日期） */
  function huangDayKey(d) {
    d = d || new Date();
    const diff = Math.floor((d - HUANG_ERA_START) / 86400000);
    const idx = diff % 60;
    const stem = HUANG_STEMS[idx % 10];
    const branch = HUANG_BRANCHES[idx % 12];
    const year = Math.floor(diff / 360) + 1;
    const dayOfYear = diff % 360;
    const month = Math.floor(dayOfYear / 30) + 1;
    const day = (dayOfYear % 30) + 1;
    return `${year}-${pad(month)}-${pad(day)}`;  // 内部仍然用大荒历日期作 key（足以唯一标识）
  }

  /* ===========================================================
   * 2. 命数（局外货币）
   * =========================================================== */
  function getMing() { return load().ming || 0; }
  function addMing(n, reason) {
    const m = load();
    m.ming = Math.max(0, (m.ming || 0) + n);
    save();
    return m.ming;
  }

  /* ===========================================================
   * 3. 每日签到
   * 奖励命数，连续签到递增。每日零点后刷新。
   *  显示采用「大荒历」：甲子/乙丑日··12 雅月，不显示真实日期。
   * =========================================================== */
  const SIGNIN_REWARD_BASE = 10;   // 每日签到基础命数
  const SIGNIN_STREAK_STEP = 2;    // 每连续一天 +2，封顶 +30
  function signinInfo() {
    const m = load();
    const today = huangDayKey();   // 用大荒历日期作 key（不暴露真实日期）
    const done = (m.signin.lastDate === today);
    // 连续天数：已签到显示当前 streak；未签到则预判「若今日签」的 streak
    let streak = m.signin.streak || 0;
    if (!done) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const isConsecutive = (m.signin.lastDate === huangDayKey(y));
      streak = isConsecutive ? streak : 0;
    }
    const nextStreak = done ? streak : (streak + 1);
    const nextReward = SIGNIN_REWARD_BASE + Math.min(Math.max(nextStreak - 1, 0) * SIGNIN_STREAK_STEP, 30);
    // 大荒历展示
    const hb = huangDate();
    const hd = huangDayLabel();
    // 连续天数按 70 天一循环展示（第71天回到第1天，累计更高）
    const base = Math.max(streak - 1, 0);
    const displayStreak = (base % 70) + 1;
    const cycle = Math.floor(base / 70) + 1;
    return {
      today, done, streak, displayStreak, cycle, total: m.signin.total || 0, nextReward,
      huang: { label: hd, year: hb.year, monthName: HUANG_MONTHS[hb.month - 1], day: hb.day, full: `${hd}·${hb.year}年${HUANG_MONTHS[hb.month - 1]}${hb.day}日` }
    };
  }
  /** 执行签到。返回 { ok, reward, streak } */
  function doSignin() {
    const m = load();
    const today = huangDayKey();
    if (m.signin.lastDate === today) return { ok: false, reason: '今日已签到' };
    // 连续判定：昨天签到过则 streak+1，否则重置为 1
    const y = new Date(); y.setDate(y.getDate() - 1);
    const isConsecutive = (m.signin.lastDate === huangDayKey(y));
    m.signin.streak = isConsecutive ? (m.signin.streak + 1) : 1;
    m.signin.lastDate = today;
    m.signin.lastTs = Date.now();   // V1.3.20：记录真实时间戳，供"本周签到"周任务用真实周判定
    m.signin.total = (m.signin.total || 0) + 1;
    const reward = SIGNIN_REWARD_BASE + Math.min((m.signin.streak - 1) * SIGNIN_STREAK_STEP, 30);
    m.ming = (m.ming || 0) + reward;
    save();
    return { ok: true, reward, streak: m.signin.streak, total: m.signin.total };
  }

  /* ===========================================================
   * 4. 每周任务（全局）
   * 每周刷新。任务完成判定依赖「本周游玩过的存档」的数据汇总。
   * 完成后在封面领取命数奖励。
   * =========================================================== */
  const WEEKLY_TASKS = [
    { id: 'w_login',     name: '本周签到 1 次',   reward: 15, desc: '凡心向道，一签为始。' },
    { id: 'w_play1',     name: '本周游玩任意存档', reward: 20, desc: '山高水长，不辍前行。' },
    { id: 'w_battle5',   name: '本周累计战斗胜利 5 场', reward: 30, desc: '以凡躯撼妖邪，五战开锋。' },
    { id: 'w_cultivate10', name: '本周累计修炼 10 次', reward: 30, desc: '水滴石穿，勤能补拙。' },
    { id: 'w_explore8',  name: '本周累计探索 8 次', reward: 30, desc: '读万卷书，行万里路。' },
    { id: 'w_challenge1', name: '本周通关 1 个挑战', reward: 40, desc: '以凡人视角，证不凡之道。' }
  ];
  function weeklyInfo(stats) {
    const m = load();
    const wk = weekKeyOf();
    // 周切换则重置领取记录
    if (m.weekly.weekKey !== wk) {
      m.weekly.weekKey = wk;
      m.weekly.claimed = [];
      save();
    }
    const stat = stats || {};
    const done = (id) => {
      switch (id) {
        // V1.3.20：签到用真实时间戳 lastTs 判定（此前把大荒历日期当真实日期解析，w_login 永远无法完成）
        case 'w_login': return (m.signin.lastTs && weekKeyOf(new Date(m.signin.lastTs)) === wk) || (m.signin.lastDate && weekKeyOf(new Date()) === wk && m.signin.lastDate === huangDayKey());
        case 'w_play1': return stat.playedThisWeek === true;
        case 'w_battle5': return (stat.battles || 0) >= 5;
        case 'w_cultivate10': return (stat.cultivate || 0) >= 10;
        case 'w_explore8': return (stat.explore || 0) >= 8;
        case 'w_challenge1': return stat.challengeThisWeek === true;
        default: return false;
      }
    };
    return WEEKLY_TASKS.map(t => ({
      ...t,
      done: done(t.id),
      claimed: m.weekly.claimed.indexOf(t.id) >= 0
    }));
  }
  function claimWeekly(id, stats) {
    const m = load();
    const wk = weekKeyOf();
    if (m.weekly.weekKey !== wk) { m.weekly.weekKey = wk; m.weekly.claimed = []; }
    if (m.weekly.claimed.indexOf(id) >= 0) return { ok: false, reason: '已领取' };
    const t = WEEKLY_TASKS.find(x => x.id === id);
    if (!t) return { ok: false, reason: '任务不存在' };
    // V1.3.20：领取前必须校验任务确实完成（此前可绕过完成度直接白嫖命数）
    const stat = stats || weeklyStats();
    const doneNow = weeklyInfo(stat).find(x => x.id === id);
    if (!doneNow || !doneNow.done) return { ok: false, reason: '任务尚未完成' };
    m.weekly.claimed.push(id);
    m.ming = (m.ming || 0) + t.reward;
    save();
    return { ok: true, reward: t.reward };
  }

  /* ===========================================================
   * 5. 存档游玩标记（记录本周游玩过的存档）
   * =========================================================== */
  function markPlayed(slotIndex) {
    const m = load();
    m.playmarks[slotIndex] = Date.now();
    save();
  }
  function playedThisWeek() {
    const m = load();
    const wk = weekKeyOf();
    // 检查任一存档的最近游玩时间落在本周
    for (const k in m.playmarks) {
      if (weekKeyOf(new Date(m.playmarks[k])) === wk) return true;
    }
    return false;
  }

  /* ===========================================================
   * 6. 限免角色（每周随机限免，可玩对应角色）
   * =========================================================== */
  function freeplayInfo() {
    const m = load();
    const wk = weekKeyOf();
    const chars = (global.CHARACTERS || []);
    // 周切换则重新随机 3 个限免角色
    if (m.freeplay.weekKey !== wk) {
      m.freeplay.weekKey = wk;
      const pool = chars.filter(c => c.freeable !== false);
      const picks = [];
      const copy = pool.slice();
      while (picks.length < 3 && copy.length) {
        picks.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0].id);
      }
      m.freeplay.charIds = picks;
      save();
    }
    // 限免到期时间：本周日午夜（玩家能看到还有多久）
    const expire = new Date();
    expire.setHours(23, 59, 59, 999);
    expire.setDate(expire.getDate() + ((7 - expire.getDay()) % 7));
    return {
      weekKey: wk,
      charIds: m.freeplay.charIds || [],
      expireTime: expire.getTime(),
      expireLabel: (expire.getMonth() + 1) + '月' + expire.getDate() + '日' + ' 23:59'
    };
  }
  /* ===========================================================
   * 7. 挑战模式奖励（一次性领取）
   * =========================================================== */
  const CHALLENGES = [
    // 以轩辕国等「普通人」视角展开的挑战
    { id: 'ch_xuanyuan_commoner', name: '机关城·凡尘试炼', icon: '⚙️',
      desc: '以素人村一位无名铁匠之子的视角，在机关巨城下求生问道。',
      intro: '你是轩辕国素人村一位无名铁匠之子。没有机窍，没有天赋，只有一双能抡锤的手，和一颗不愿看人受苦的心。\n\n机关城大乱那夜，虚月之蚀渗透核心，觉醒机关人们四散奔逃。你本可以躲在素人村的地下，却听见了呼救声——是几个在废弃区迷了路的孩子。\n\n你抄起父亲留下的铁锤，走进那片连机师都不敢深入的废铁迷宫。\n\n[highlight]这是一场凡人的成长试炼。[/highlight]',
      reward: { type: 'prof', id: 'sword', bp: 'BLUE-SWORD', label: '剑修传承图纸（新开档解锁剑修职业）' }, ming: 60,
      condition: '通关挑战' },
    { id: 'ch_xuanyuan_awaken', name: '觉醒·七号之问', icon: '🤖',
      desc: '以觉醒机关人七号的视角，追问「我是谁」。',
      intro: '你是觉醒机关人「七号」。你的核心里没有程序，只有一个问题，反复地、温柔地叩问着：\n\n「我是谁？」\n\n是工具？是武器？是「错误」？还是……一个会思考、会痛苦、会想画太阳的「存在」？\n\n你握紧那支捡来的、沾着机油的笔。在直面虚月侵蚀之前，你需要先找回自己的「力量」。',
      reward: { type: 'skin', id: 'skin_prof_xuanyuan', label: '皮肤·剑心机关' }, ming: 80,
      condition: '通关挑战' },
    { id: 'ch_yumin_commoner', name: '羽民·无翼之民', icon: '🪶',
      desc: '以羽民国一个天生无翼的孩子的视角，逆风而起。',
      intro: '你是羽民国一个天生无翼的孩子。所有人都在天上飞，而你只能在地上走。\n\n风魔来袭那天，会飞的都逃了，只剩老弱和你一样飞不起来的，被困在城里。你攥紧拳头，逆着风，走向了城头。\n\n[highlight]没有翅膀，就用这双脚，走出自己的道。[/highlight]',
      reward: { type: 'char', id: 'c_huang_axiu', label: '角色·阿秀（黄）' }, ming: 100,
      condition: '通关挑战' }
  ];
  function challengeInfo() {
    const m = load();
    return CHALLENGES.map(c => ({
      ...c,
      cleared: m.challenge.cleared.indexOf(c.id) >= 0,
      claimed: m.challenge.claimed.indexOf(c.id) >= 0
    }));
  }
  function markChallengeCleared(id) {
    const m = load();
    if (m.challenge.cleared.indexOf(id) < 0) m.challenge.cleared.push(id);
    if (!m.challenge.clearedAt) m.challenge.clearedAt = {};
    m.challenge.clearedAt[id] = Date.now();
    save();
  }
  function claimChallenge(id) {
    const m = load();
    const c = CHALLENGES.find(x => x.id === id);
    if (!c) return { ok: false, reason: '挑战不存在' };
    if (m.challenge.cleared.indexOf(id) < 0) return { ok: false, reason: '尚未通关' };
    if (m.challenge.claimed.indexOf(id) >= 0) return { ok: false, reason: '已领取' };
    m.challenge.claimed.push(id);
    m.ming = (m.ming || 0) + (c.ming || 0);
    // 发放奖励（职业/皮肤/角色）
    if (c.reward) {
      if (c.reward.type === 'skin') { if (m.skins.indexOf(c.reward.id) < 0) m.skins.push(c.reward.id); }
      else if (c.reward.type === 'char') { if (m.charDex.indexOf(c.reward.id) < 0) m.charDex.push(c.reward.id); }
      else if (c.reward.type === 'prof' && c.reward.bp) {
        // 隐藏职业：把传承图纸写入局外继承池（legacy.blueprints），新开档自动解锁该职业
        try {
          const LEGACY_KEY = 'wenda-shanhai-legacy';
          const raw = localStorage.getItem(LEGACY_KEY);
          const legacy = raw ? JSON.parse(raw) : {};
          legacy.blueprints = legacy.blueprints || [];
          if (legacy.blueprints.indexOf(c.reward.bp) < 0) legacy.blueprints.push(c.reward.bp);
          localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
        } catch (e) {}
      }
    }
    save();
    return { ok: true, reward: c.reward, ming: c.ming };
  }

  /* ===========================================================
   * 8. 皮肤系统
   * =========================================================== */
  function unlockSkin(skinId) {
    const m = load();
    if (m.skins.indexOf(skinId) < 0) m.skins.push(skinId);
    save();
  }
  function hasSkin(skinId) { return load().skins.indexOf(skinId) >= 0; }
  function getSkins() { return load().skins.slice(); }
  function equipSkin(skin) { load().equippedSkin = skin; save(); }
  function getEquippedSkin() { return load().equippedSkin; }
  function getMingsignDex() { return load().mingsignDex.slice(); }
  function hasMingsignDex(kind, id) {
    return (load().mingsignDex || []).some(d => d.kind === kind && d.id === id);
  }
  // 封面皮肤
  function getCoverSkin() { return load().coverSkin || ''; }
  function setCoverSkin(id) { load().coverSkin = id || ''; save(); }
  // 选项框美术风格
  function getOptionStyle() { return load().optionStyle || 'classic'; }
  function setOptionStyle(style) { load().optionStyle = style || 'classic'; save(); }
  /* ===========================================================
   * 11. 新手历程（跨存档，多进度任务；部分奖励为随机限免 + 天级卡）
   *  7-8 个任务合计引导玩家完成首周达成；按完成进度奖励。
   * =========================================================== */
  const NOVICE_TASKS = [
    { id: "nv_visit",      name: "踏入山海",      desc: "进入游戏任一国家",      target: 1,  reward: { ming: 30, freeRole: 1 } },
    { id: "nv_battle3",    name: "初试锋芒",      desc: "累计战斗 3 场胜利",     target: 3,  reward: { ming: 25, freeRole: 0 } },
    { id: "nv_pet1",       name: "收得伙伴",      desc: "首次获得灵宠",          target: 1,  reward: { ming: 20, freeRole: 0 } },
    { id: "nv_cultivate5", name: "修行不辍",      desc: "累计修炼 5 次",          target: 5,  reward: { ming: 25, freeRole: 0 } },
    { id: "nv_nation3",    name: "初识山海",      desc: "进入 3 个国家",          target: 3,  reward: { ming: 30, freeRole: 1 } },
    { id: "nv_explore5",   name: "隐秘的角落",    desc: "探索 5 次",              target: 5,  reward: { ming: 25, freeRole: 0 } },
    { id: "nv_hidden1",    name: "露出锋芒",      desc: "解锁 1 个隐藏职业",      target: 1,  reward: { ming: 50, freeRole: 1 } },
    { id: "nv_ach3",       name: "略有小成",      desc: "达成 3 项成就",          target: 3,  reward: { ming: 40, freeRole: 1, skyCard: 1 } }
  ];
  function noviceInfo() {
    const m = load();
    return {
      tasks: NOVICE_TASKS,
      progress: m.novice,
      stats: m.novice && m.novice.stats ? m.novice.stats : { battle: 0, cultivate: 0, explore: 0, nation: 0, pet: 0, hidden: 0, ach: 0 }
    };
  }
  function trackNovice(type, n) {
    const m = load();
    if (!m.novice) m.novice = { progress: 0, lastDay: '', claimed: [], stats: { battle: 0, cultivate: 0, explore: 0, nation: 0, pet: 0, hidden: 0, ach: 0 } };
    if (!m.novice.stats) m.novice.stats = { battle: 0, cultivate: 0, explore: 0, nation: 0, pet: 0, hidden: 0, ach: 0 };
    m.novice.stats[type] = (m.novice.stats[type] || 0) + (n || 1);
    save();
  }
  function claimNovice(taskId) {
    const m = load();
    if (!m.novice) return { ok: false };
    if (m.novice.claimed.indexOf(taskId) >= 0) return { ok: false, reason: "已领取" };
    const task = NOVICE_TASKS.find(t => t.id === taskId);
    if (!task) return { ok: false, reason: "未知任务" };
    const cur = (m.novice.stats && m.novice.stats[taskIdToKey(taskId)]) || 0;
    if (cur < task.target) return { ok: false, reason: "未达成" };
    m.novice.claimed.push(taskId);
    if (task.reward.ming) m.ming = (m.ming || 0) + task.reward.ming;
    // 随机解锁一位角色（永久拥有；可选卡包里有但未拥有的）
    if (task.reward.freeRole) {
      if (!m.novice.unlocked) m.novice.unlocked = [];
      m.novice.unlocked.push({ rewardType: "freeRole", at: Date.now() });
      const pool = (global.CHARACTERS || []).filter(c => !c.locked && c.quality !== '仙');
      const unowned = pool.filter(c => (m.charDex || []).indexOf(c.id) < 0);
      const pick = (unowned.length ? unowned : pool)[Math.floor(Math.random() * (unowned.length ? unowned.length : pool.length))];
      if (pick) { if (m.charDex.indexOf(pick.id) < 0) m.charDex.push(pick.id); }
    }
    if (task.reward.skyCard) {
      if (!m.novice.unlocked) m.novice.unlocked = [];
      m.novice.unlocked.push({ rewardType: "skyCard", at: Date.now() });
      // 天级卡：随机解锁一位天阶角色
      const tian = (global.CHARACTERS || []).filter(c => !c.locked && c.quality === '天');
      const unownedT = tian.filter(c => (m.charDex || []).indexOf(c.id) < 0);
      const pick = (unownedT.length ? unownedT : tian)[Math.floor(Math.random() * (unownedT.length ? unownedT.length : tian.length))];
      if (pick) { if (m.charDex.indexOf(pick.id) < 0) m.charDex.push(pick.id); }
    }
    save();
    return { ok: true, reward: task.reward };
  }
  function taskIdToKey(taskId) {
    return ({ nv_battle3: "battle", nv_cultivate5: "cultivate", nv_explore5: "explore", nv_nation3: "nation", nv_pet1: "pet", nv_hidden1: "hidden", nv_ach3: "ach", nv_visit: "nation" })[taskId] || taskId;
  }


  /* ===========================================================
   * 9. 角色图鉴
   * =========================================================== */
  function hasChar(charId) { return load().charDex.indexOf(charId) >= 0; }
  function getCharDex() { return (load().charDex || []).slice(); }
  /** 解锁一个角色到图鉴（隐藏角色剧情解锁用，幂等） */
  function unlockChar(charId) {
    const m = load();
    if (m.charDex.indexOf(charId) < 0) { m.charDex.push(charId); save(); return true; }
    return false;
  }


  /* ===========================================================
   * 10. 全局成就（跨存档）
   * =========================================================== */
  function unlockGlobalAch(id) {
    const m = load();
    if (m.globalAch.indexOf(id) < 0) { m.globalAch.push(id); save(); return true; }
    return false;
  }
  function claimGlobalAch(id, reward) {
    const m = load();
    if (m.globalAchClaimed.indexOf(id) >= 0) return { ok: false, reason: '已领取' };
    m.globalAchClaimed.push(id);
    m.ming = (m.ming || 0) + (reward || 0);
    save();
    return { ok: true, reward: reward || 0 };
  }
  function getGlobalAch() { return load().globalAch.slice(); }
  function getGlobalAchClaimed() { return load().globalAchClaimed.slice(); }

  /* ===========================================================
   * 11. 命签抽卡（卡包）
   * 命数抽取图鉴条目（命格/皮肤/角色）。
   * 重复给予少量命数返还（品质越高返还越多）。
   * =========================================================== */
  const MINGSIGN_COST_SINGLE = 30;   // 单抽 30 命数
  const MINGSIGN_COST_TEN = 270;     // 十连 270 命数（9折）

  /** 抽卡奖池：由命格库 + 皮肤 + 角色组成，带品质 */
  function buildPool() {
    const pool = [];
    // 命格（来自 pools.js 的 POOLS）
    const po = global.POOLS || {};
    for (const pk in po) {
      const poolDef = po[pk];
      (poolDef.tags || []).forEach(t => {
        pool.push({ kind: 'mingshen', id: t.id, name: t.name, quality: mingshenQuality(t), desc: t.desc });
      });
    }
    // 皮肤（从 SKINS 数据）
    (global.SKINS || []).forEach(s => {
      pool.push({ kind: 'skin', id: s.id, name: s.name, quality: s.quality || '地', desc: s.desc || '' });
    });
    // 角色（从 CHARACTERS 数据；locked 角色不进入抽卡池，仅能通过专属剧情/隐藏条件解锁）
    (global.CHARACTERS || []).forEach(c => {
      if (c.locked) return;
      pool.push({ kind: 'char', id: c.id, name: c.name, quality: c.quality, desc: c.story || '' });
    });
    return pool;
  }

  /** 命格品质判定（基于其 mod 强度分级，天/地/玄/黄）
   *  归一化：百分比项（0.01~0.2）视为 1~20 点，整数项（如 evilReduce:5）视为 5 点，
   *  特殊功能项（hidden/lunhui 等剧情向）不计强度，归入「玄」。 */
  function mingshenQuality(tag) {
    let score = 0;
    if (tag.mod) {
      for (const k in tag.mod) {
        const v = Math.abs(tag.mod[k]);
        if (v <= 1) score += v * 100;      // 百分比项 0.05 → 5 点
        else score += v;                    // 整数项 5 → 5 点
      }
    }
    if (score >= 15) return '天';
    if (score >= 9) return '地';
    if (score >= 5) return '玄';
    return '黄';
  }

  /** 品质排序与返还倍率 */
  const QUALITY_ORDER = { 黄: 0, 玄: 1, 地: 2, 天: 3, 仙: 4 };
  const QUALITY_REFUND = { 黄: 5, 玄: 10, 地: 20, 天: 40, 仙: 80 };   // 重复返还命数

  /** 抽一次（可指定是否计入十连），返回抽到的条目 + 是否重复 + 返还命数 */
  function drawOnce() {
    const pool = buildPool();
    if (!pool.length) return { error: '奖池为空' };
    const m = load();
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const dup = m.mingsignDex.some(d => d.kind === pick.kind && d.id === pick.id);
    if (!dup) m.mingsignDex.push({ kind: pick.kind, id: pick.id });
    const refund = dup ? (QUALITY_REFUND[pick.quality] || 5) : 0;
    if (refund) m.ming = (m.ming || 0) + refund;
    // 抽到角色/皮肤时同步解锁
    if (!dup) {
      if (pick.kind === 'char') { if (m.charDex.indexOf(pick.id) < 0) m.charDex.push(pick.id); }
      if (pick.kind === 'skin') { if (m.skins.indexOf(pick.id) < 0) m.skins.push(pick.id); }
    }
    save();
    return { pick, dup, refund };
  }

  /** 抽卡：count 为 1 或 10。返回结果数组。 */
  function draw(count) {
    count = count || 1;
    const m = load();
    const cost = count === 10 ? MINGSIGN_COST_TEN : MINGSIGN_COST_SINGLE;
    if ((m.ming || 0) < cost) return { error: '命数不足' };
    m.ming -= cost;
    save();
    const results = [];
    for (let i = 0; i < count; i++) results.push(drawOnce());
    return { ok: true, results };
  }

  /** 命签典藏直购（图鉴直接购买，花费高） */
  function purchaseDex(kind, id, cost) {
    const m = load();
    if ((m.ming || 0) < cost) return { ok: false, reason: '命数不足' };
    m.ming -= cost;
    const dup = m.mingsignDex.some(d => d.kind === kind && d.id === id);
    if (!dup) m.mingsignDex.push({ kind, id });
    if (kind === 'char') { if (m.charDex.indexOf(id) < 0) m.charDex.push(id); }
    if (kind === 'skin') { if (m.skins.indexOf(id) < 0) m.skins.push(id); }
    save();
    return { ok: true };
  }

  /** 命签典藏价格（直购远贵于抽卡） */
  function dexPrice(kind, id) {
    const po = buildPool();
    const item = po.find(x => x.kind === kind && x.id === id);
    const base = { 黄: 120, 玄: 200, 地: 400, 天: 800, 仙: 1600 };
    return base[(item && item.quality) || '黄'] || 200;
  }

  /* ===========================================================
   * 12. 每周统计聚合（从所有存档读取本周游玩数据）
   * 用于每周任务判定。读取各槽位存档的「本周」累计值。
   * =========================================================== */
  function weeklyStats() {
    const wk = weekKeyOf();
    const stat = { battles: 0, cultivate: 0, explore: 0, playedThisWeek: false, challengeThisWeek: false };
    // 直接读各槽位原始 JSON 的 weeklyTrack（避免 deserialize 副作用）
    try {
      for (let i = 0; i < 3; i++) {
        const raw = localStorage.getItem('wenda-shanhai-save-slot-' + i);
        if (!raw) continue;
        const obj = JSON.parse(raw);
        const w = obj.weeklyTrack || {};
        if (w.weekKey === wk) {
          stat.battles += w.battles || 0;
          stat.cultivate += w.cultivate || 0;
          stat.explore += w.explore || 0;
        }
      }
    } catch (e) {}
    // 本周游玩标记（任一存档最近游玩时间落在本周）
    stat.playedThisWeek = playedThisWeek();
    // 挑战通关标记（本周是否有挑战通关）
    const m = load();
    const at = (m.challenge && m.challenge.clearedAt) || {};
    for (const id in at) {
      if (weekKeyOf(new Date(at[id])) === wk) { stat.challengeThisWeek = true; break; }
    }
    return stat;
  }

  /* ===========================================================
   * 暴露接口
   * =========================================================== */
  const META = {
    // 命数
    getMing, addMing,
    // 签到
    signinInfo, doSignin,
    // 每周
    weeklyInfo, claimWeekly, weeklyStats,
    markPlayed, playedThisWeek,
    // 限免
    freeplayInfo,
    // 挑战
    challengeInfo, markChallengeCleared, claimChallenge,
    CHALLENGES,
    // 皮肤
    unlockSkin, hasSkin, getSkins, equipSkin, getEquippedSkin, getMingsignDex,
    hasMingsignDex,
    getCoverSkin, setCoverSkin,
    getOptionStyle, setOptionStyle,
    // 角色
    hasChar, unlockChar,
    noviceInfo, trackNovice, claimNovice,
    getCharDex,
    // 全局成就
    unlockGlobalAch, claimGlobalAch, getGlobalAch, getGlobalAchClaimed,
    // 抽卡
    draw, purchaseDex, dexPrice, buildPool,
    QUALITY_ORDER, QUALITY_REFUND,
    MINGSIGN_COST_SINGLE, MINGSIGN_COST_TEN,
    // 工具
    weekKeyOf
  };

  global.META = META;
})(window);
