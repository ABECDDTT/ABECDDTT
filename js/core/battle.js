/* ===========================================================
 * 问道山海 · 完整回合制战斗引擎
 * 核心机制：
 *   - 每回合玩家选择技能，敌方AI自动行动
 *   - 能量槽（奥义）：普攻/受击积攒，满后释放奥义
 *   - 元素反应：不同属性技能组合触发特效（燃烧/冻结/蒸汽/缠绕）
 *   - BUFF/DEBUFF：灼烧(DOT)/减速/破甲/护盾/吸血/攻速/震伤
 *   - 属性判定：命中/闪避/暴击/暴伤/属性克制
 *   - 敌方智能AI：按血量与状态选择技能
 * =========================================================== */
(function (global) {
  'use strict';

  // ---------- 元素反应配置 ----------
  // V1.3.3 扩充：键支持任意顺序（checkReact 双向查找）；效果字段：
  //   dmgMul 反应追加伤害、trueDmgPct 真实伤害、healPct 吸血/回血、
  //   addBurn 灼烧、dot 中毒类持续伤害、slow 减速、bind 缠绕、armorBreak 破甲
  const ELEMENT_REACTIONS = {
    '火+木': { name: '烈焰焚原', desc: '灼烧翻倍', dmgMul: 1.5, addBurn: true },
    '水+火': { name: '蒸汽爆裂', desc: '真实伤害', trueDmgPct: 0.10 },
    '火+风': { name: '火借风势', desc: '风系威力提升', dmgMul: 1.6 },
    '木+土': { name: '草木疯长', desc: '缠绕+吸血', bind: true, healPct: 0.08 },
    '水+土': { name: '泥沼陷落', desc: '大幅减速', slow: 0.25 },
    '雷+水': { name: '雷暴', desc: '额外雷伤', dmgMul: 1.8 },
    // —— V1.3.3 新增反应 ——
    '金+火': { name: '熔金破甲', desc: '破甲', armorBreak: 0.15 },
    '金+雷': { name: '电磁紊乱', desc: '减速+真实伤害', slow: 0.30, trueDmgPct: 0.06 },
    '木+雷': { name: '雷击引燃', desc: '持续燃烧', dot: 0.15, dotName: '燃烧' },
    '水+冰': { name: '冰封千里', desc: '大幅减速+真实伤害', slow: 0.35, trueDmgPct: 0.04 },
    '火+土': { name: '焦土灼地', desc: '灼烧+持续伤害', addBurn: true, dot: 0.10, dotName: '灼烧' },
    '风+水': { name: '风暴潮', desc: '真实伤害+减速', trueDmgPct: 0.08, slow: 0.20 },
    '影+魂': { name: '摄魂夺魄', desc: '持续诅咒', dot: 0.20, dotName: '诅咒' },
    '毒+木': { name: '毒藤缠身', desc: '剧毒+缠绕', dot: 0.25, dotName: '剧毒', bind: true },
    '道+佛': { name: '佛道共鸣', desc: '佛道相济，回血', healPct: 0.12 },
    '雷+火': { name: '雷火交加', desc: '威势惊人', dmgMul: 2.0 }
  };

  const Battle = {
    state: null,
    ended: false,   // 战斗结束标志（防止残留 setTimeout 回调访问已释放的 state）

    /* ============== 启动战斗 ============== */
    start(player, enemy, onEnd, carry) {
      Battle.ended = false;
      if (typeof Engine.sfx === 'function') Engine.sfx('battle');
      const maxHp = STATE.calcMaxHp(player);
      const maxMp = STATE.calcMaxMp(player);
      // 连战（carry）：继承上一场的玩家战斗状态（hp/mp/能量/冷却/buff/debuff 不重置）
      // carry 为上一场 Battle.state.player 的快照
      // 当前职业信息（兼容隐藏职业）
      const profInfo = STATE.getProfessionSkills(player);
      const profElement = (profInfo && profInfo.prof && profInfo.prof.element) || (PROFESSIONS[player.profession] || {}).element || '道';
      // 好感度战斗加成（当前国家 NPC 好感越高，攻防越强）
      const favorB = STATE.favorBattleBonus(player);
      // 职业进化加成（供奉对应神明圆满）
      const evoB = STATE.evolutionBonus(player);
      // 天级角色专属剧情奖励：战斗属性加成（攻击/防御/暴击/闪避）
      const charBB = (player && player.charBattleBonus) ? player.charBattleBonus : {};
      // 等级成长因子：atk/def 随等级温和成长（0.05），与 hp 的成长(0.1)保持节奏，避免高等级"血牛"打不动怪
      const lvGrow = 1 + 0.05 * ((player.lv || 1) - 1);
      Battle.state = {
        player: {
          ref: player,
          name: player.professionName + '·' + player.name,
          profession: player.profession,
          element: profElement,
          skillLoadout: player.skillLoadout || null,   // 出战配置（读真实玩家对象）
          hp: (carry && carry.hp !== undefined) ? carry.hp : ((player.hp !== undefined && player.hp > 0) ? Math.min(player.hp, maxHp) : maxHp), maxHp,
          mp: (carry && carry.mp !== undefined) ? carry.mp : ((player.mp !== undefined && player.mp > 0) ? Math.min(player.mp, maxMp) : maxMp), maxMp,
          atk: Math.floor(player.baseAtk * player.coeff.atk * (1 + (player._offerAtkBonus || 0) + (charBB.atk || 0) + (player._challengeGearAtk || 0) + (player._towerBuffAtk || 0)) * (1 + favorB.atk) * (1 + evoB) * lvGrow),
          def: Math.floor(player.baseDef * player.coeff.def * (1 + (player._offerDefBonus || 0) + (charBB.def || 0) + (player._challengeGearDef || 0) + (player._towerBuffDef || 0)) * (1 + favorB.def) * (1 + evoB) * lvGrow),
          // V1.3.13：挑战装备附带的续航（吸血/回蓝）与闪避加成，写进战斗单位；V1.3.19：试炼塔 buff 同口径累加
          leech: (player._challengeGearLeech || 0) + (player._towerBuffLeech || 0),
          mpRegen: (player._challengeGearMp || 0) + (player._towerBuffMp || 0),
          dodgeBonus: (player._challengeGearDodge || 0),
          lv: player.lv || 1,
          energy: (carry && carry.energy !== undefined) ? carry.energy : 0, maxEnergy: 100,   // 奥义能量槽
          cds: (carry && carry.cds) ? { ...carry.cds } : {},
          buffs: (carry && carry.buffs) ? carry.buffs.slice() : [],
          debuffs: (carry && carry.debuffs) ? carry.debuffs.slice() : [],
          lastElement: (carry && carry.lastElement) ? carry.lastElement : null,   // 上次使用元素（用于元素反应）
          combo: (carry && carry.combo !== undefined) ? carry.combo : 0,         // 连击数
          passiveEff: null,   // 出战被动的 eff（由 getPassive 解析后填充）
          _stacks: (carry && carry._stacks) ? carry._stacks : {}   // 被动叠加层（剑意/炉温/阵气/灵痕等）
        },
        enemy: {
          ref: enemy,
          name: enemy.name,
          profession: '妖',
          element: enemy.element || '邪',
          hp: enemy.hp, maxHp: enemy.hp,
          mp: enemy.mp || 60, maxMp: enemy.mp || 60,
          atk: Math.floor(enemy.atk * (1 + 0.05 * ((enemy.lv || 1) - 1))),
          def: Math.floor(enemy.def * (1 + 0.05 * ((enemy.lv || 1) - 1))),
          lv: enemy.lv || 1,
          energy: 0, maxEnergy: 100,
          cds: {},
          buffs: [], debuffs: [],
          lastElement: null, combo: 0
        },
        pet: null,
        round: 0,
        onEnd: onEnd || {}
      };
      // 偷袭先手：玩家获得初始能量，敌人附加破绽（首回合减防）
      if (enemy.ambush) {
        Battle.state.ambush = true;
        Battle.state.player.energy = 50;
        Battle.state.enemy.debuffs.push({ name:'破绽', turns: 1, armorBreak: 0.2, good:false });
        Battle.log('你偷袭得手！抢占先机，' + enemy.name + '露出破绽！', 'good');
      }
      // 羽民悟道闪避加成（V1.3.12：意识附着的闪避，以常驻 buff 形式生效）
      if (player.ref && player.ref._challengeAwakenDodge) {
        Battle.state.player.buffs.push({ name: '风之加护', good: true, turns: 999, dodgeMul: player.ref._challengeAwakenDodge });
      }
      // 初始化主力灵宠（协战）
      const mainPet = STATE.mainPet(player);
      if (mainPet) {
        const pst = STATE.petStats(player, mainPet);
        // 羁绊天赋（V1.3.3 羁绊深化）：羁绊越高，协战威力与触发率越强
        const b = mainPet.bond || 0;
        let powerMul = 1, triggerBonus = 0;
        if (b >= 150) { powerMul = 1.30; triggerBonus = 0.15; }     // 神魂相契
        else if (b >= 100) { powerMul = 1.15; triggerBonus = 0.08; } // 心意相通
        else if (b >= 50) { powerMul = 1.08; }                        // 日渐亲近
        Battle.state.pet = {
          ref: mainPet,
          name: mainPet.name,
          element: mainPet.element,
          atk: pst.atk, hp: pst.hp, def: pst.def,
          powerMul, triggerBonus,
          skill: mainPet.skill ? { ...mainPet.skill, power: (mainPet.skill.power || 1) * powerMul } : null,
          skill2: mainPet.skill2 ? { ...mainPet.skill2, power: (mainPet.skill2.power || 1) * powerMul } : null
        };
      }
      // 解析出战被动（__prof__ 职业被动 / 神赐被动），并应用开场型被动
      const passive = Battle.getPassive(Battle.state);
      if (passive && passive.eff) {
        Battle.state.player.passiveEff = passive.eff;
        Battle.state.player._passiveName = passive.name;
        // 威压：开场敌方全属性-5%
        if (passive.eff.type === 'openDebuff') {
          const m = passive.eff.mul || 0.05;
          Battle.state.enemy.atk = Math.floor(Battle.state.enemy.atk * (1 - m));
          Battle.state.enemy.def = Math.floor(Battle.state.enemy.def * (1 - m));
          Battle.log(`<span class="react-tag">【被动·${passive.name}】</span>威压降临，${enemy.name} 全属性下降 ${Math.round(m*100)}%！`, 'react');
        }
      }
      // 进入战斗：切换到幻境紧张曲目
      if (global.AudioMgr) AudioMgr.switch('dramatic');
      Engine.setBg(enemy.bg || 'assets/img/nations/qing-fying-boss.jpg');
      Engine.show('screen-battle');
      const box = document.getElementById('battle-log');
      box.innerHTML = '';
      Battle.log(`<span class="sys">⚔ 战斗开始！${enemy.name} 现身。</span>`, 'system');
      Battle.log(Battle.pickOpening(enemy), 'flavor');
      Battle.refreshUI();
      Battle.renderActions();
    },

    /* ============== 日志 ============== */
    log(html, type) {
      const box = document.getElementById('battle-log');
      if (!box) return;
      const line = document.createElement('div');
      line.className = 'line ' + (type || '');
      line.innerHTML = html;
      box.appendChild(line);
      box.scrollTop = box.scrollHeight;
      // 限制战斗日志行数，避免长战/连战导致 DOM 无限膨胀
      while (box.children.length > 80) box.removeChild(box.firstChild);
    },
    sep(text) {
      const box = document.getElementById('battle-log');
      if (!box) return;
      const div = document.createElement('div');
      div.className = 'turn-sep';
      div.textContent = '— ' + text + ' —';
      box.appendChild(div);
      while (box.children.length > 80) box.removeChild(box.firstChild);
    },

    /* ============== 文案库 ============== */
    pickOpening(enemy) {
      const lines = [
        `${enemy.name}周身魔气翻涌，目光死死锁住你。`,
        `一股凶煞之气扑面而来——${enemy.name}低吼一声，蓄势待发。`,
        `四周空气凝滞，${enemy.name}缓缓逼近，你握紧了手中的武器。`
      ];
      return lines[Battle.state.round % lines.length];
    },
    castLine(unit, skill) {
      const t = skill.type;
      const lines = {
        basic: `${unit.name}催动灵力，施展【${skill.name}】——灵光迸射！`,
        skill: `${unit.name}凝神聚气，祭出【${skill.name}】，法诀成形！`,
        ultimate: `能量槽满溢！${unit.name}仰天长啸，释放奥义【${skill.name}】！！`,
        dodge: `${unit.name}身形一晃，施展【${skill.name}】闪避！`,
        block: `${unit.name}沉腰立马，架起【${skill.name}】！`
      };
      return lines[t] || `${unit.name}施展【${skill.name}】！`;
    },
    hitLine(attacker, defender, skill, dmg, extra) {
      let s = `【${skill.name}】命中 ${defender.name}，`;
      if (dmg.crit) s += `<span class="crit-tag">【暴击】</span>`;
      s += `造成 <b class="dmg-num">${dmg.value}</b> 点${dmg.element || ''}伤害`;
      if (dmg.evadeText) s = dmg.evadeText;
      return s;
    },
    dodgeLine(unit) {
      const lines = [
        `你早有防备，身形微侧，堪堪避开了这一击！`,
        `你脚下灵光一闪，迅捷地闪避了攻击！`,
        `直觉驱使你偏身一让，避开了锋芒！`
      ];
      return lines[Battle.state.round % lines.length];
    },
    enemyHitLine(attacker, defender, skill, dmg) {
      const crit = dmg.crit ? '<span class="crit-tag">【暴击】</span>' : '';
      return `【${skill.name}】击中了你，${crit}造成 <b class="dmg-num">${dmg.value}</b> 点伤害！`;
    },
    /** 战况描述 */
    hpFlavor(side, unit) {
      const pct = unit.hp / unit.maxHp;
      if (pct < 0.25) return unit.name + '摇摇欲坠，浑身是伤，眼中却燃着最后的凶光。';
      if (pct < 0.5) return unit.name + '气息不稳，身上已有数道创口。';
      if (pct < 0.8) return unit.name + '微微喘气，但攻势不减。';
      return unit.name + '气势正盛，未见疲态。';
    },

    /* ============== UI 刷新 ============== */
    refreshUI() {
      const s = Battle.state;
      if (!s) return;
      document.getElementById('bt-name-player').textContent = s.player.name;
      document.getElementById('bt-name-enemy').textContent = s.enemy.name;
      document.getElementById('bt-hp-p').style.width = (s.player.hp / s.player.maxHp * 100) + '%';
      document.getElementById('bt-hp-e').style.width = (s.enemy.hp / s.enemy.maxHp * 100) + '%';
      document.getElementById('bt-mp-p').style.width = (s.player.mp / s.player.maxMp * 100) + '%';
      // 能量槽
      const ep = document.getElementById('bt-energy-p');
      if (ep) ep.style.width = (s.player.energy / s.player.maxEnergy * 100) + '%';
      const ee = document.getElementById('bt-energy-e');
      if (ee) ee.style.width = (s.enemy.energy / s.enemy.maxEnergy * 100) + '%';
      // buffs
      const bp = document.getElementById('bt-buffs-p');
      const be = document.getElementById('bt-buffs-e');
      const fmt = list => list.map(b => {
        let label = b.name;
        if (b.turns !== undefined) label += ` (${b.turns})`;
        return `<span class="${b.good ? 'buff' : 'debuff'}">${label}</span>`;
      }).join('');
      bp.innerHTML = fmt(s.player.buffs) + fmt(s.player.debuffs);
      be.innerHTML = fmt(s.enemy.buffs) + fmt(s.enemy.debuffs);
      // 敌情提示：元素 + 弱点（克制它的元素）—— 让"乱按"变"见招拆招"
      const infoEl = document.getElementById('bt-info-enemy');
      if (infoEl) {
        const el = s.enemy.element || '邪';
        const em = global.ELEMENT_MAP || {};
        const weak = (em[el] && em[el].lose) || [];
        const weakStr = weak.length ? weak.join('、') : '无明显弱点';
        infoEl.innerHTML = `<span class="bi-ele bi-ele-${el}">${el}</span><span class="bi-weak">克：${weakStr}</span>`;
      }
    },

    /* ============== 战斗打击反馈特效 ============== */
    /** 元素 → 光效颜色映射（用于元素反应边框光效） */
    _elemColor(el) {
      const map = { '火':'#d24a1a', '水':'#2a6fb0', '木':'#3a8a4a', '金':'#c9a81a', '土':'#9a6a3a', '风':'#5a8fb0', '雷':'#8a5ac9', '道':'#7a5aa0', '禅':'#d27a2a', '儒':'#2a7a8a', '影':'#4a3a6e', '毒':'#4a7a2a' };
      return map[el] || '#7a3fa2';
    },
    /** 血条受击反馈：side 为 'player' 或 'enemy'，命中闪白+震动 */
    fxHit(side) {
      const hpBar = document.getElementById(side === 'player' ? 'bt-hp-p' : 'bt-hp-e');
      const barWrap = hpBar ? hpBar.parentElement : null;
      if (hpBar) {
        hpBar.classList.remove('hit-flash');
        void hpBar.offsetWidth;   // 强制重排以重触发动画
        hpBar.classList.add('hit-flash');
      }
      if (barWrap) {
        barWrap.classList.remove('hit-shake');
        void barWrap.offsetWidth;
        barWrap.classList.add('hit-shake');
      }
    },
    /** 屏幕震动（暴击/奥义） */
    fxCrit() {
      const frame = document.querySelector('#screen-battle .battle-frame');
      if (!frame) return;
      frame.classList.remove('frame-shake');
      void frame.offsetWidth;
      frame.classList.add('frame-shake');
    },
    /** 元素反应光效：战斗框边框按元素色发光 */
    fxReact(element) {
      const frame = document.querySelector('#screen-battle .battle-frame');
      if (!frame) return;
      frame.style.setProperty('--react-glow', Battle._elemColor(element));
      frame.classList.remove('react-glow');
      void frame.offsetWidth;
      frame.classList.add('react-glow');
    },
    /** 伤害/治疗/闪避飘字：在对应侧血条上方浮现 */
    fxFloat(side, text, cls) {
      const sideEl = document.getElementById(side === 'player' ? 'bt-hp-p' : 'bt-hp-e');
      if (!sideEl || !sideEl.parentElement) return;
      const host = sideEl.closest('.battle-side') || sideEl.parentElement;
      const span = document.createElement('span');
      span.className = 'battle-float ' + (cls || 'dmg');
      span.textContent = text;
      // 随机水平偏移，避免多次飘字重叠
      span.style.left = (30 + Math.floor(Math.random() * 40)) + '%';
      span.style.top = '-6px';
      host.appendChild(span);
      // 动画结束后移除 DOM
      setTimeout(() => { if (span.parentNode) span.parentNode.removeChild(span); }, 950);
    },

    /* ============== 行动选项 ============== */
    renderActions() {
      const s = Battle.state;
      const box = document.getElementById('battle-actions');
      box.innerHTML = '';
      // 获取当前职业技能（兼容隐藏职业）
      const profInfo = STATE.getProfessionSkills(s.player.ref);
      const prof = profInfo ? profInfo.prof : PROFESSIONS[s.player.profession];
      if (!prof || !prof.skills) return;

      // 出战配置：玩家选了4主动+1被动，则只显示已选技能；未配置则显示全部
      // 奥义(ultimate)/普攻(basic)必带，其余主动（skill/位移/格挡）按 loadout 过滤
      const loadout = s.player.skillLoadout;
      // 合并已解锁的神明赐予技能（进入可选技能池）
      const offerInfo = STATE.getOfferUnlockedSkills(s.player.ref);
      const offerActives = (offerInfo && offerInfo.active) || [];
      // 挑战专属技能（V1.3.12：羽民悟道附着的技能，可配置出战）
      const chSkills = (s.player.ref && s.player.ref.challengeSkills) || [];
      const allSkills = prof.skills.concat(offerActives).concat(chSkills);
      let skills;
      if (loadout && loadout.actives && loadout.actives.length) {
        skills = allSkills.filter(sk => loadout.actives.includes(sk.id)
          || sk.type === 'ultimate' || sk.type === 'basic');
      } else {
        skills = allSkills;
      }

      skills.forEach(sk => {
        const btn = document.createElement('button');
        // 奥义按钮：能量满才可用，特殊样式
        const isUlt = sk.type === 'ultimate';
        const canUlt = isUlt && s.player.energy >= s.player.maxEnergy;
        if (isUlt) {
          btn.classList.add('ult-btn');
          btn.innerHTML = `✦ ${sk.name}<span class="cd-info">能量 ${Math.floor(s.player.energy)}/${s.player.maxEnergy}</span>`;
        } else {
          // 元素色标识
          btn.classList.add('elem-' + (sk.element || ''));
          btn.innerHTML = `${sk.name}<span class="cd-info">${sk.element}·${sk.desc}</span>`;
        }
        const onCd = (s.player.cds[sk.id] || 0) > 0;
        // 灵力不足：普通技能按 sk.mp，位移/格挡等按 sk.sta（灵力消耗口径统一，0 灵力不可白嫖位移）
        // 奥义由"能量"驱动，不受灵力不足限制
        const costMp = (isUlt ? 0 : (sk.mp || sk.sta || 0));
        const noMp = costMp > 0 && s.player.mp < costMp;
        let disabled = onCd || noMp;
        if (isUlt) disabled = !canUlt;
        btn.disabled = disabled;
        if (onCd) btn.innerHTML += `<span class="cd-info">CD:${s.player.cds[sk.id]}</span>`;
        if (noMp) btn.innerHTML += `<span class="cd-info">灵力不足</span>`;
        btn.onclick = () => Battle.playerAct(sk);
        box.appendChild(btn);
      });

      const flee = document.createElement('button');
      flee.textContent = '逃 离';
      flee.onclick = () => Battle.end('flee');
      box.appendChild(flee);

      // 丹药按钮（战斗中可用：每回合一次，不消耗战斗回合）
      const pillBtn = document.createElement('button');
      pillBtn.textContent = '💊 丹药';
      pillBtn.onclick = () => Battle.openPillMenu();
      if (s.player._pillUsedThisRound) pillBtn.disabled = true;   // 每回合限一次
      box.appendChild(pillBtn);
    },

    /* ============== 战斗丹药 ============== */
    /** 打开丹药菜单（每回合一次，使用后不消耗回合） */
    openPillMenu() {
      const s = Battle.state;
      if (!s || Battle.ended) return;
      const p = s.player.ref;
      if (s.player._pillUsedThisRound) { Battle.log('本回合已用过丹药了。', 'system'); return; }
      if (!p || !p.pills) { Battle.log('你身上没有丹药。', 'system'); return; }
      // 可用的战斗丹药（回血/回灵力/清负面/临时增益）
      const battlePills = ['xiaohuandan', 'dahuandan', 'xiaohuiling', 'huiling', 'dahuiling', 'shenhuiling', 'qingxin',
        'shenxing', 'zengqi', 'tiebi', 'jifeng', 'lingguang', 'longli', 'niepan',
        'huitian', 'zhanshen', 'zhendan', 'kunwu'];
      const avail = battlePills.filter(id => (p.pills[id] || 0) > 0);
      if (!avail.length) { Battle.log('没有适合战斗中使用的丹药。', 'system'); return; }
      const html = avail.map(id => {
        const r = STATE.getRecipes().find(x => x.id === id);
        return `<div class="pill-opt" data-id="${id}">${r.name}（剩余${p.pills[id]}）· ${r.effect}</div>`;
      }).join('');
      if (typeof Engine.modal === 'function') {
        Engine.modal('使用丹药', `<div class="pill-menu">${html}</div>`, [
          { label: '取消', fn: () => Engine.closeModal() }
        ]);
        setTimeout(() => {
          document.querySelectorAll('.pill-opt').forEach(el => {
            el.onclick = () => {
              const id = el.getAttribute('data-id');
              Engine.closeModal();
              Battle.useBattlePill(id);
            };
          });
        }, 0);
      } else {
        // 无弹窗环境：直接遍历提示
        Battle.log('可用丹药：' + avail.map(id => STATE.getRecipes().find(x => x.id === id).name).join('、'), 'system');
      }
    },

    /** 使用战斗丹药：不消耗回合，每回合一次（以战斗当前血量为基准加算，避免"战斗前血量覆盖"导致一吃就满血） */
    useBattlePill(recipeId) {
      const s = Battle.state;
      if (!s || Battle.ended) return;
      const p = s.player.ref;
      if (s.player._pillUsedThisRound) { Battle.log('本回合已用过丹药了。', 'system'); return; }
      const recipe = STATE.getRecipes().find(x => x.id === recipeId);
      if (!recipe) { Battle.log('丹药不存在。', 'system'); return; }
      if ((p.pills[recipeId] || 0) <= 0) { Battle.log('无此丹药。', 'evil'); return; }
      // 等级限制（与 STATE.usePill 一致）
      if (recipe.lv && (p.lv || 1) < recipe.lv) { Battle.log('需 Lv' + recipe.lv + ' 方可服用「' + recipe.name + '」', 'evil'); return; }
      // 扣丹药
      p.pills[recipeId]--;
      // 回血/回灵力：基于战斗当前值加算（百分比按战斗双方 maxHp/maxMp 上限），并同步 ref 差额
      const healPct = recipeId === 'xiaohuandan' ? 0.3 : recipeId === 'dahuandan' ? 0.6 : recipeId === 'huitian' ? 0.45 : 0;
      const mpPct = recipeId === 'xiaohuiling' ? 0.25 : recipeId === 'huiling' ? 0.5 : recipeId === 'dahuiling' ? 0.8 : recipeId === 'shenhuiling' ? 1.0 : 0;
      if (healPct > 0) {
        const heal = Math.floor(s.player.maxHp * healPct);
        const before = s.player.hp;
        s.player.hp = Math.min(s.player.maxHp, Math.max(1, s.player.hp + heal));
        const gained = s.player.hp - before;
        if (gained > 0) p.hp = Math.min(STATE.calcMaxHp ? STATE.calcMaxHp(p) : s.player.maxHp, (p.hp || 0) + gained);
      }
      if (mpPct > 0) {
        const rec = Math.floor(s.player.maxMp * mpPct);
        const before = s.player.mp;
        s.player.mp = Math.min(s.player.maxMp, Math.max(0, s.player.mp + rec));
        const gained = s.player.mp - before;
        if (gained > 0) p.mp = Math.min(STATE.calcMaxMp ? STATE.calcMaxMp(p) : s.player.maxMp, (p.mp || 0) + gained);
      }
      // 清负面：清心丸清除战斗中的 debuff（战斗内外一致）
      if (recipeId === 'qingxin') {
        s.player.debuffs = [];
        p.debuffs = [];
      }
      // 增益：神行丹全属性+20%持续3回合（战斗内生效）
      if (recipeId === 'shenxing') {
        const turns = 3;
        // 若已有神行buff则刷新持续时间
        const exist = s.player.buffs.find(b => b.name === '神行');
        if (exist) exist.turns = turns;
        else s.player.buffs.push({ name: '神行', good: true, turns, atkMul: 1.2, defMul: 1.2 });
      }
      // 真元丹：奥义能量瞬间 +60（V1.3.3 新增）
      if (recipeId === 'zhendan') {
        const before = s.player.energy;
        s.player.energy = Math.min(s.player.maxEnergy || 100, s.player.energy + 60);
        Battle.log('你服下真元丹，气机奔涌，奥义能量 +' + (s.player.energy - before) + '！', 'gold');
        if (s.player.energy >= (s.player.maxEnergy || 100)) Battle.log('奥义能量已满，可释放奥义！', 'react');
      }
      // 增益丹通用处理（buff 字段：atk/def/dodge/mp/all2/revive/critMul/dmgReduceMul）
      const BUFF_DEFS = {
        'zengqi':    { name:'增气', turns:3, atkMul:1.25, desc:'攻击力提升' },
        'tiebi':     { name:'铁壁', turns:3, defMul:1.30, desc:'防御力提升' },
        'jifeng':    { name:'疾风', turns:3, dodgeMul:0.20, desc:'身形飘忽' },
        'lingguang': { name:'灵光', turns:3, mpCostMul:0.60, desc:'灵力运转如臂使指' },
        'longli':    { name:'龙力', turns:4, atkMul:1.18, defMul:1.18, desc:'龙力加身' },
        'niepan':    { name:'涅槃', turns:999, revive:0.6, desc:'涅槃重生之机' },
        'zhanshen':  { name:'战神', turns:3, critMul:0.25, desc:'战意沸腾，暴击率提升' },
        'kunwu':     { name:'金刚', turns:3, dmgReduceMul:0.25, desc:'金刚护体，受击减伤' }
      };
      if (BUFF_DEFS[recipeId]) {
        const def = BUFF_DEFS[recipeId];
        const exist = s.player.buffs.find(b => b.name === def.name);
        if (exist) {
          exist.turns = def.turns;
          Object.keys(def).forEach(k => { if (k !== 'name' && k !== 'turns') exist[k] = def[k]; });
        } else {
          s.player.buffs.push({ name: def.name, good: true, turns: def.turns, ...def });
        }
        // 涅槃丹：战斗中若已触发过则不可重复服用
        if (recipeId === 'niepan' && s.player._reviveUsed) {
          Battle.log('涅槃之机已耗尽，此丹无法再次生效。', 'system');
        }
      }
      s.player._pillUsedThisRound = true;
      Battle.log(`你服下【${recipe.name}】，${recipe.effect}。`, 'heal');
      Battle.fxFloat('player', '💊', 'heal');
      Battle.refreshUI();
      Battle.renderActions();
    },

    /* ============== 玩家行动 ============== */
    playerAct(skill) {
      const s = Battle.state;
      if (!s || Battle.ended) return;
      const box = document.getElementById('battle-actions');
      Array.from(box.children).forEach(b => b.disabled = true);
      Battle.sep('回合 ' + (s.round + 1));

      // 控制状态（V1.3.6）：眩晕/冻结/缠绕 → 完全无法行动；麻痹 → 50% 无法行动；魅惑 → 行动反噬
      const pDebuff = s.player.debuffs || [];
      const hardCtl = pDebuff.find(d => d.stun || d.freeze || d.bind);
      const para = pDebuff.find(d => d.paralyze);
      const paraBlocked = para && RNG.chance(0.5);
      const charm = pDebuff.find(d => d.charm);
      if (hardCtl || paraBlocked || charm) {
        if (charm && !hardCtl && !paraBlocked) {
          const back = Math.floor(s.enemy.atk * 0.6);
          s.enemy.hp = Math.max(0, s.enemy.hp - back);
          Battle.log(`你心神被【${charm.name}】所惑，招式不由自主地偏转——${s.enemy.name} 反遭 <b class="dmg-num">${back}</b> 点反噬！`, 'miss');
          Battle.fxFloat('enemy', back, 'dmg');
          Battle.checkReact(s.player);
        } else {
          const ctl = hardCtl || para;
          Battle.log(`你被【${ctl ? ctl.name : '麻痹'}】困住，无法行动！`, 'miss');
          Battle.fxFloat('player', ctl ? ctl.name : '麻痹', 'miss');
        }
        Battle.gainEnergy(s.player, 6);
        Battle.tickBuffs(s.player);
        Battle.tickBuffs(s.enemy);
        Battle.tickCDs(s.enemy);
        if (Battle.enemyDead()) { Battle.end('win'); return; }
        setTimeout(() => Battle.enemyAct(), 800);
        return;
      }

      Battle.log(Battle.castLine(s.player, skill), 'flavor');

      // 状态解除：dodge 技能 -> 本回合闪避
      if (skill.type === 'dodge' || skill.type === 'block') {
        s.player.buffs.push({ name: '格挡', good: true, turns: 1, guard: true });
        Battle.log('你进入格挡姿态，若被攻击将格挡反击！', 'react');
        Battle.commitCosts(s.player, skill);
        if (skill.sta) s.player.mp = Math.max(0, s.player.mp - skill.sta);
        Battle.checkReact(s.player);
        setTimeout(() => Battle.enemyAct(), 700);
        return;
      }

      // 奥义：需要能量满
      if (skill.type === 'ultimate' && s.player.energy < s.player.maxEnergy) {
        Battle.log('奥义能量未满，无法释放！', 'miss');
        setTimeout(() => Battle.enemyAct(), 700);
        return;
      }

      // 命中判定
      const hit = Battle.hitRoll(s.player, s.enemy);
      if (!hit.hit) {
        Battle.log(`你施展【${skill.name}】，却被 ${s.enemy.name} 灵巧闪避！连击中断！`, 'miss');
        Battle.fxFloat('enemy', '闪避', 'miss');   // 敌人闪避飘字
        s.player.combo = 0;  // 闪避清零连击
        Battle.gainEnergy(s.player, 10);
        Battle.commitCosts(s.player, skill);
        if (skill.type === 'ultimate') s.player.energy = 0;
        Battle.tickBuffs(s.player);
        Battle.tickBuffs(s.enemy);
        Battle.checkReact(s.player);
        if (Battle.enemyDead()) { Battle.end('win'); return; }
        setTimeout(() => Battle.enemyAct(), 800);
        return;
      }

      // 伤害结算
      const dmg = Battle.calcDamage(s.player, s.enemy, skill);
      s.enemy.hp = Math.max(0, s.enemy.hp - dmg.value);
      Battle.log(Battle.hitLine(s.player, s.enemy, skill, dmg), dmg.crit ? 'crit' : 'dmg');
      // 打击反馈：敌人血条受击 + 伤害飘字（暴击/奥义附加屏幕震动）
      Battle.fxHit('enemy');
      Battle.fxFloat('enemy', (dmg.crit ? '暴击 ' : '') + dmg.value, dmg.crit ? 'crit' : 'dmg');
      if (dmg.crit || skill.type === 'ultimate') Battle.fxCrit();
      if (dmg.burn) Battle.applyDebuff(s.enemy, { name:'灼烧', turns: dmg.burn, dot: Math.floor(s.player.atk * 0.15), good:false });
      if (dmg.poison) Battle.applyDebuff(s.enemy, { name: dmg.poisonName || '中毒', turns: dmg.poison, dot: Math.floor(s.player.atk * 0.1), good:false });
      if (dmg.armorBreak) Battle.applyDebuff(s.enemy, { name:'破甲', turns: 3, armorBreak: dmg.armorBreak, good:false });
      if (dmg.slow) Battle.applyDebuff(s.enemy, { name:'减速', turns: 2, slow: dmg.slow, good:false });
      if (dmg.bind) Battle.applyDebuff(s.enemy, { name:'缠绕', turns: 2, bind: true, good:false });
      // 控制类（V1.3.6）：眩晕 / 麻痹 / 冻结 / 魅惑
      if (dmg.stun) Battle.applyDebuff(s.enemy, { name:'眩晕', turns: dmg.stun, stun: true, good:false });
      if (dmg.paralyze) Battle.applyDebuff(s.enemy, { name:'麻痹', turns: dmg.paralyze, paralyze: true, good:false });
      if (dmg.freeze) Battle.applyDebuff(s.enemy, { name:'冻结', turns: dmg.freeze, freeze: true, good:false });
      if (dmg.charm) Battle.applyDebuff(s.enemy, { name:'魅惑', turns: dmg.charm, charm: true, good:false });
      if (dmg.atkDown) Battle.applyDebuff(s.enemy, { name:'镇岳', turns: 2, atkMul: 1 - dmg.atkDown, good:false });
      if (dmg.leech && dmg.value > 0) {
        const heal = Math.floor(dmg.value * dmg.leech);
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
        Battle.log(`你汲取了 ${heal} 点气血！`, 'heal');
        Battle.fxFloat('player', '+' + heal, 'heal');   // 治疗飘字
      }
      // V1.3.13：装备常驻吸血/回蓝（流转装置），每次造成伤害时结算
      if (s.player.leech && dmg.value > 0) {
        const heal = Math.floor(dmg.value * s.player.leech);
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
        Battle.fxFloat('player', '+' + heal, 'heal');
      }
      if (s.player.mpRegen && dmg.value > 0) {
        const mpGain = Math.floor(s.player.maxMp * s.player.mpRegen);
        s.player.mp = Math.min(s.player.maxMp, s.player.mp + mpGain);
        Battle.fxFloat('player', '+' + mpGain + '灵', 'heal');
      }
      if (dmg.selfDmg) {
        s.player.hp = Math.max(1, s.player.hp - dmg.selfDmg);
        Battle.log(`【${skill.name}】燃烧自身气血 ${dmg.selfDmg} 点。`, 'dmg');
      }
      // 自我增益 / 自愈（V1.3.6：由技能字段驱动，玩家与敌方通用）
      if (dmg.atkSelf) {
        const ex = s.player.buffs.find(b => b.name === dmg.atkSelf.name);
        if (ex) ex.turns = dmg.atkSelf.turns;
        else s.player.buffs.push({ name: dmg.atkSelf.name, good: true, turns: dmg.atkSelf.turns, atkMul: 1 + (dmg.atkSelf.mul || 0) });
        Battle.log(`你进入【${dmg.atkSelf.name}】状态，攻势暴涨！`, 'react');
      }
      if (dmg.defSelf) {
        const ex = s.player.buffs.find(b => b.name === dmg.defSelf.name);
        if (ex) ex.turns = dmg.defSelf.turns;
        else s.player.buffs.push({ name: dmg.defSelf.name, good: true, turns: dmg.defSelf.turns, defMul: 1 + (dmg.defSelf.mul || 0) });
        Battle.log(`【${dmg.defSelf.name}】护体，防御大增！`, 'react');
      }
      if (dmg.dodgeSelf) {
        const ex = s.player.buffs.find(b => b.name === dmg.dodgeSelf.name);
        if (ex) ex.turns = dmg.dodgeSelf.turns;
        else s.player.buffs.push({ name: dmg.dodgeSelf.name, good: true, turns: dmg.dodgeSelf.turns, dodgeMul: dmg.dodgeSelf.mul || 0 });
        Battle.log(`你身法灵动，进入【${dmg.dodgeSelf.name}】状态！`, 'react');
      }
      if (dmg.reduceSelf) {
        const ex = s.player.buffs.find(b => b.name === dmg.reduceSelf.name);
        if (ex) ex.turns = dmg.reduceSelf.turns;
        else s.player.buffs.push({ name: dmg.reduceSelf.name, good: true, turns: dmg.reduceSelf.turns, dmgReduceMul: dmg.reduceSelf.mul || 0 });
        Battle.log(`【${dmg.reduceSelf.name}】护体，所受伤害大减！`, 'react');
      }
      if (dmg.healSelf) {
        const heal = Math.floor(s.player.maxHp * dmg.healSelf);
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
        Battle.log(`【${skill.name}】为你恢复 <b class="heal-num">${heal}</b> 点生命！`, 'heal');
        Battle.fxFloat('player', '+' + heal, 'heal');
      }
      if (dmg.mpSelf) {
        const before = s.player.mp;
        s.player.mp = Math.min(s.player.maxMp || s.player.mpMax || 9999, s.player.mp + dmg.mpSelf);
        Battle.log(`【${skill.name}】灵力恢复 <b class="heal-num">${s.player.mp - before}</b> 点！`, 'heal');
      }

      // 敌方受击回能（让敌方也能攒奥义）
      Battle.gainEnergy(s.enemy, 8);

      // 连击 / 元素反应 / 能量
      s.player.combo++;
      Battle.checkReact(s.player, skill);

      // —— 被动条件标记（符心/狐媚/知音）：命中控制/魅惑/音系技能后置位，下次攻击消费 ——
      if (s.player.passiveEff) {
        const pe = s.player.passiveEff;
        const desc = skill.desc || '';
        if (pe.type === 'dmgCond' && pe.cond === 'afterControl') {
          if (/缠绕|减速|麻痹|冻结|魅惑|控制|定身/.test(desc)) s.player._lastControlHit = true;
        }
        if (pe.type === 'dmgCond' && pe.cond === 'afterCharm') {
          if (/魅惑|迷惑|勾魂/.test(desc)) s.player._lastCharmHit = true;
        }
        if (pe.type === 'dmgCond' && pe.cond === 'afterHitSound') {
          if (skill.element === '音') s.player._lastSoundHit = true;
        }
      }

      // —— 被动叠加层：每次攻击后叠加（剑心/锻心/墨韵等）——
      if (s.player.passiveEff) {
        const e = s.player.passiveEff;
        if (e.type === 'stackAtk') {
          const k = e.label || 'stackAtk';
          const cap = e.cap || 10;
          if (e.cond === 'afterLeech') {
            if (dmg.leech) s.player._stacks[k] = Math.min(cap, (s.player._stacks[k] || 0) + 1);
          } else {
            s.player._stacks[k] = Math.min(cap, (s.player._stacks[k] || 0) + 1);
          }
        } else if (e.type === 'stackFire') {
          s.player._stacks['炉温'] = Math.min(e.cap || 10, (s.player._stacks['炉温'] || 0) + 1);
        } else if (e.type === 'stackDef') {
          s.player._stacks['阵气'] = Math.min(e.cap || 10, (s.player._stacks['阵气'] || 0) + 1);
        } else if (e.type === 'petStack' && skill.type === 'basic') {
          s.player._stacks['灵痕'] = Math.min(e.cap || 5, (s.player._stacks['灵痕'] || 0) + 1);
        } else if (e.type === 'speed') {
          s.player._stacks['行云'] = Math.min(5, (s.player._stacks['行云'] || 0) + 1);
        }
      }
      // 能量积累：普攻+22，技能+32（约3回合可满奥义）
      Battle.gainEnergy(s.player, skill.type === 'ultimate' ? 0 : (skill.type === 'skill' ? 32 : 22));
      if (skill.type === 'ultimate') s.player.energy = 0;

      // CD & MP
      Battle.commitCosts(s.player, skill);   // 设置本次技能 CD（下回合开始生效递减）
      Battle.tickBuffs(s.player);
      Battle.tickBuffs(s.enemy);
      // 敌方 CD 在玩家回合中递减
      Battle.tickCDs(s.enemy);

      // 灵宠协战（若有主力灵宠）
      if (s.pet) {
        Battle.petAssist(s);
        if (Battle.enemyDead()) { Battle.end('win'); return; }
      }

      if (Battle.enemyDead()) { Battle.end('win'); return; }
      setTimeout(() => Battle.enemyAct(), 900);
    },

    /* ============== 灵宠协战 ============== */
    petAssist(s) {
      const pet = s.pet;
      // 灵宠技能：40%用技能2，否则技能1（羁绊天赋可提升触发率，上限85%）
      const useSkill = RNG.chance(Math.min(0.85, 0.4 + (pet.triggerBonus || 0))) && pet.skill2;
      const sk = useSkill ? pet.skill2 : pet.skill;
      const skType = sk.type || 'attack';

      // 治疗型：只治疗，不攻击
      if (skType === 'heal') {
        const healBonus = STATE.mingshenBonus(s.player.ref, 'heal');
        // 治疗量随技能 power 缩放（power 越大治疗越强）
        const healPower = (typeof sk.power === 'number' && sk.power > 0) ? sk.power : 1.0;
        let heal = Math.floor(s.player.maxHp * 0.15 * healPower * (1 + healBonus));
        const hot = STATE.mingshenBonus(s.player.ref, 'hot');
        if (hot) heal += Math.floor(s.player.maxHp * hot);
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
        Battle.log(`${pet.name} 施展【${sk.name}】，为你恢复 <b class="heal-num">${heal}</b> 点生命！`, 'heal');
        Battle.fxFloat('player', '+' + heal, 'heal');
        return;
      }
      // 护盾型：为主人添加减伤护盾
      if (skType === 'shield') {
        s.player.buffs.push({ name:'灵宠护盾', good:true, turns:2, shield: 0.2 });
        Battle.log(`${pet.name} 施展【${sk.name}】，云气护体，为你挡下部分伤害！`, 'react');
        return;
      }
      // 控制型：对敌方施加减速/破甲（无直接伤害或轻微伤害）
      if (skType === 'control') {
        Battle.applyDebuff(s.enemy, { name:'减速', turns: 2, slow: 0.2, good:false });
        Battle.log(`${pet.name} 施展【${sk.name}】，干扰 ${s.enemy.name}，使其行动迟缓！`, 'react');
        return;
      }
      // V1.3.20：闪避型宠物技能此前被降级为攻击伤害，现改为给主人叠加闪避
      if (skType === 'dodge' || skType === 'buff') {
        const ex = s.player.buffs.find(b => b.name === '灵宠疾风');
        if (ex) ex.turns = 2;
        else s.player.buffs.push({ name:'灵宠疾风', good:true, turns:2, dodgeMul:0.25 });
        Battle.log(`${pet.name} 施展【${sk.name}】，为你叠加一层疾风闪避！`, 'react');
        return;
      }
      // 攻击型：正常伤害
      const atkUnit = {
        atk: pet.atk, def: pet.def, name: pet.name,
        profession: null, ref: null, buffs: [], debuffs: [], lv: s.player.lv
      };
      const hit = Battle.hitRoll(atkUnit, s.enemy);
      if (!hit.hit) {
        Battle.log(`${pet.name} 试图协战，却被 ${s.enemy.name} 躲开了。`, 'miss');
        return;
      }
      const dmg = Battle.calcDamage(atkUnit, s.enemy, { id:'pet', name: sk.name, type:'skill', element: pet.element, power: sk.power || 1.0 });
      // —— 被动：墨韵（灵痕层数提升灵宠协击伤害）——
      let petDmg = dmg.value;
      if (s.player.passiveEff && s.player.passiveEff.type === 'petStack') {
        const n = s.player._stacks ? (s.player._stacks['灵痕'] || 0) : 0;
        const mul = 1 + Math.min(s.player.passiveEff.cap || 5, n) * (s.player.passiveEff.per || 0);
        petDmg = Math.floor(dmg.value * mul);
      }
      s.enemy.hp = Math.max(0, s.enemy.hp - petDmg);
      Battle.log(`${pet.name} 使出【${sk.name}】，对 ${s.enemy.name} 造成 <b class="dmg-num">${petDmg}</b> 点${pet.element}伤害！`, dmg.crit ? 'crit' : 'react');
      Battle.fxHit('enemy');
      Battle.fxFloat('enemy', petDmg, dmg.crit ? 'crit' : 'dmg');
      // 灵宠技能元素反应
      Battle.checkReact(s.player, { element: pet.element });
    },

    /* ============== 敌方 AI 行动 ============== */
    enemyAct() {
      const s = Battle.state;
      if (!s || Battle.ended) return;
      // 敌方控制状态（V1.3.6）：眩晕/冻结/缠绕 → 跳过行动；麻痹 → 50% 跳过
      const eDebuff = s.enemy.debuffs || [];
      const eCtl = eDebuff.find(d => d.stun || d.freeze || d.bind);
      const ePara = eDebuff.find(d => d.paralyze);
      if (eCtl || (ePara && RNG.chance(0.5))) {
        const ctl = eCtl || ePara;
        Battle.log(`${s.enemy.name} 被【${ctl.name}】困住，无法行动！`, 'react');
        Battle.fxFloat('enemy', ctl.name, 'miss');
        Battle.applyDots(s.player);
        Battle.applyDots(s.enemy);
        Battle.tickBuffs(s.player);
        Battle.tickBuffs(s.enemy);
        Battle.tickCDs(s.player);
        Battle.tickCDs(s.enemy);
        s.round++;
        s.player._pillUsedThisRound = false;
        Battle.refreshUI();
        Battle.renderActions();
        return;
      }
      // 智能AI：能量满优先奥义，再按血量选择技能
      const enemySkills = Battle.enemySkillSet();
      let chosen;
      if (s.enemy.energy >= s.enemy.maxEnergy) {
        chosen = enemySkills.ult;   // 奥义
        s.enemy.energy = 0;
      } else {
        const hpPct = s.enemy.hp / s.enemy.maxHp;
        if (hpPct < 0.3 && RNG.chance(0.7)) chosen = enemySkills.rage;    // 濒死狂暴
        else if (hpPct < 0.6 && RNG.chance(0.45)) chosen = enemySkills.heavy; // 重击
        else if (RNG.chance(0.35)) chosen = enemySkills.heavy;
        else chosen = enemySkills.atk;
      }

      Battle.log(Battle.enemyCastLine(s.enemy, chosen), 'flavor');

      // 若玩家处于格挡，格挡反击
      const guardIdx = s.player.buffs.findIndex(b => b.guard);
      if (guardIdx >= 0) {
        s.player.buffs.splice(guardIdx, 1);
        const counter = Battle.calcDamage(s.player, s.enemy, { id:'block', name:'弹反', type:'block', element:'金', power:1.0 });
        s.enemy.hp = Math.max(0, s.enemy.hp - counter.value);
        Battle.log(`你精准格挡并弹反！对 ${s.enemy.name} 造成 <b class="dmg-num">${counter.value}</b> 点伤害！`, 'crit');
        if (Battle.enemyDead()) { Battle.end('win'); return; }
        Battle.tickCDs(s.player);   // 玩家 CD 在敌方回合递减
        Battle.tickCDs(s.enemy);
        s.round++;
        s.player._pillUsedThisRound = false;   // 新回合重置丹药次数
        Battle.refreshUI();
        Battle.renderActions();
        return;
      }

      // 命中判定
      const hit = Battle.hitRoll(s.enemy, s.player);
      if (!hit.hit) {
        Battle.log(Battle.dodgeLine() + `（${s.enemy.name}的攻击落空了）`, 'miss');
        Battle.fxFloat('player', '闪避', 'miss');   // 玩家闪避飘字
        // —— 被动：风行（闪避后下次攻击+20%）——
        if (s.player.passiveEff && s.player.passiveEff.type === 'dmgCond' && s.player.passiveEff.cond === 'afterDodge') {
          s.player._lastDodged = true;
        }
        Battle.gainEnergy(s.enemy, 10);
        Battle.tickBuffs(s.player);
        Battle.tickBuffs(s.enemy);
        Battle.tickCDs(s.player);   // 玩家 CD 在敌方回合递减
        Battle.tickCDs(s.enemy);
        s.round++;
        s.player._pillUsedThisRound = false;   // 新回合重置丹药次数
        Battle.refreshUI();
        Battle.renderActions();
        return;
      }

      const dmg = Battle.calcDamage(s.enemy, s.player, chosen);
      // 灵宠护盾减伤
      let finalDmg = dmg.value;
      const shield = s.player.buffs.find(b => b.shield);
      if (shield) {
        const reduced = Math.floor(dmg.value * shield.shield);
        finalDmg = dmg.value - reduced;
        Battle.log(`【灵宠护盾】为你抵消了 ${reduced} 点伤害！`, 'react');
      }
      // —— 被动：阵心（阵气层数减伤）——
      if (s.player.passiveEff && s.player.passiveEff.type === 'stackDef') {
        const n = s.player._stacks ? (s.player._stacks['阵气'] || 0) : 0;
        const reduce = Math.min(s.player.passiveEff.cap || 10, n) * (s.player.passiveEff.per || 0);
        if (reduce > 0) {
          const cut = Math.floor(finalDmg * reduce);
          finalDmg -= cut;
        }
      }
      s.player.hp = Math.max(0, s.player.hp - finalDmg);
      Battle.log(Battle.enemyHitLine(s.enemy, s.player, chosen, dmg), dmg.crit ? 'crit' : 'dmg');
      // 打击反馈：玩家血条受击 + 伤害飘字
      Battle.fxHit('player');
      Battle.fxFloat('player', '-' + finalDmg, dmg.crit ? 'crit' : 'dmg');
      if (dmg.crit) Battle.fxCrit();
      if (dmg.burn) Battle.applyDebuff(s.player, { name:'灼烧', turns: dmg.burn, dot: Math.floor(s.enemy.atk * 0.12), good:false });
      // 敌方技能附带效果（V1.3.6：敌方重击可破甲、狂暴可增攻、奥义可眩晕等）
      if (dmg.poison) Battle.applyDebuff(s.player, { name: dmg.poisonName || '中毒', turns: dmg.poison, dot: Math.floor(s.enemy.atk * 0.1), good:false });
      if (dmg.armorBreak) Battle.applyDebuff(s.player, { name:'破甲', turns: 2, armorBreak: dmg.armorBreak, good:false });
      if (dmg.slow) Battle.applyDebuff(s.player, { name:'减速', turns: 2, slow: dmg.slow, good:false });
      if (dmg.stun) Battle.applyDebuff(s.player, { name:'眩晕', turns: dmg.stun, stun: true, good:false });
      if (dmg.paralyze) Battle.applyDebuff(s.player, { name:'麻痹', turns: dmg.paralyze, paralyze: true, good:false });
      if (dmg.freeze) Battle.applyDebuff(s.player, { name:'冻结', turns: dmg.freeze, freeze: true, good:false });
      if (dmg.atkSelf) {
        const ex = s.enemy.buffs.find(b => b.name === dmg.atkSelf.name);
        if (ex) ex.turns = dmg.atkSelf.turns;
        else s.enemy.buffs.push({ name: dmg.atkSelf.name, good: true, turns: dmg.atkSelf.turns, atkMul: 1 + (dmg.atkSelf.mul || 0) });
        Battle.log(`${s.enemy.name} 进入【${dmg.atkSelf.name}】状态，攻势更猛！`, 'react');
      }
      if (dmg.healSelf) {
        const heal = Math.floor(s.enemy.maxHp * dmg.healSelf);
        s.enemy.hp = Math.min(s.enemy.maxHp, s.enemy.hp + heal);
        Battle.log(`${s.enemy.name} 汲取力量，恢复 <b class="heal-num">${heal}</b> 点生命！`, 'heal');
      }
      // 敌方元素连招触发元素反应
      Battle.checkReact(s.enemy, chosen);
      s.player.combo = 0;  // 受击中断连击

      // —— 被动受击触发：共生（回血）、兽血（低血沸腾）、化蝶（致命闪避）——
      if (s.player.passiveEff && s.player.hp > 0) {
        const e = s.player.passiveEff;
        // 水柔：受击后置位，下次水系伤害+15%
        if (e.type === 'dmgCond' && e.cond === 'afterHitWater') s.player._lastWaterHit = true;
        if (e.type === 'onHitHeal' && RNG.chance(e.chance || 0.2)) {
          const heal = Math.floor(s.player.maxHp * (e.pct || 0.08));
          s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
          Battle.log(`<span class="react-tag">【被动·共生】</span>血脉相连，恢复 <b class="heal-num">${heal}</b> 点生命！`, 'heal');
        }
        if (e.type === 'lowHpBuff') {
          const pct = s.player.hp / s.player.maxHp;
          if (pct <= (e.threshold || 0.3) && !s.player.buffs.some(b => b.name === (e.buff && e.buff.name))) {
            s.player.buffs.push({ ...(e.buff || { name:'兽血沸腾', good:true, turns:3 }) });
            Battle.log(`<span class="react-tag">【被动·兽血】</span>气血将尽，兽血沸腾！攻速激增！`, 'react');
          }
        }
      }

      // —— 被动：化蝶（受致命伤时闪避一次）——
      if (s.player.hp <= 0 && s.player.passiveEff && s.player.passiveEff.type === 'dodgeFatal' && !s.player._dodgeFatalUsed) {
        s.player._dodgeFatalUsed = true;
        s.player.hp = 1;
        Battle.log(`<span class="react-tag">【被动·化蝶】</span>你化作蝶影，躲过了致命一击！`, 'react');
      }
      // 神赐被动：五彩护体（受致命伤保留1点生命，每战1次）
      if (s.player.hp <= 0 && s.player.passiveEff && s.player.passiveEff.type === 'fatalSave' && !s.player._fatalSaveUsed) {
        s.player._fatalSaveUsed = true;
        s.player.hp = 1;
        Battle.log(`<span class="react-tag">【被动·五彩护体】</span>五彩神光护体，你强行保住了 1 点生命！`, 'react');
      }
      // —— 涅槃丹：濒死时恢复60%气血（一次性）——
      if (s.player.hp <= 0 && !s.player._reviveUsed) {
        const reviveBuff = s.player.buffs.find(b => b.revive);
        if (reviveBuff) {
          s.player._reviveUsed = true;
          reviveBuff.turns = 0;   // 消耗涅槃之机
          s.player.hp = Math.max(1, Math.floor(s.player.maxHp * reviveBuff.revive));
          Battle.log(`<span class="react-tag">【涅槃】</span>涅槃之焰燃起，你浴火重生，恢复 <b class="heal-num">${s.player.hp}</b> 点生命！`, 'heal');
          Battle.fxFloat('player', '🔥', 'heal');
        }
      }

      // DOT 结算（回合结束）
      Battle.applyDots(s.player);
      Battle.applyDots(s.enemy);
      Battle.gainEnergy(s.enemy, 18);
      Battle.tickBuffs(s.player);
      Battle.tickBuffs(s.enemy);
      Battle.tickCDs(s.player);   // 玩家 CD 在敌方回合递减
      Battle.tickCDs(s.enemy);

      if (s.player.hp <= 0) { Battle.end('lose'); return; }
      if (Battle.enemyDead()) { Battle.end('win'); return; }
      s.round++;
      s.player._pillUsedThisRound = false;   // 新回合重置丹药次数
      Battle.refreshUI();
      Battle.renderActions();
    },

    /* ============== 敌方技能集（按元素特色生成） ============== */
    enemySkillSet() {
      const s = Battle.state;
      const el = s.enemy.element || '邪';
      // 不同元素的敌方技能命名与特效（丰富战斗表现）
      const elSets = {
        '火': { atkName:'火爪撕咬', heavyName:'烈焰喷吐', rageName:'焚身爆裂', ultName:'炎魔焚天', atkEl:'火', heavyEl:'火', rageEl:'火', ultEl:'火' },
        '水': { atkName:'寒潮噬咬', heavyName:'激流冲击', rageName:'冰渊涌啸', ultName:'深渊吞天', atkEl:'水', heavyEl:'水', rageEl:'水', ultEl:'水' },
        '金': { atkName:'锋刃切击', heavyName:'剑阵斩击', rageName:'万剑归心', ultName:'金芒裂空', atkEl:'金', heavyEl:'金', rageEl:'金', ultEl:'金' },
        '木': { atkName:'藤蔓缠咬', heavyName:'枯木撞击', rageName:'森罗狂潮', ultName:'万木成囚', atkEl:'木', heavyEl:'木', rageEl:'木', ultEl:'木' },
        '土': { atkName:'岩牙冲击', heavyName:'地裂重压', rageName:'山崩地陷', ultName:'万岳镇魂', atkEl:'土', heavyEl:'土', rageEl:'土', ultEl:'土' },
        '风': { atkName:'风刃割击', heavyName:'暴风突袭', rageName:'风卷残云', ultName:'灭世风暴', atkEl:'风', heavyEl:'风', rageEl:'风', ultEl:'风' },
        '雷': { atkName:'雷光扑咬', heavyName:'紫电轰击', rageName:'雷暴倾泻', ultName:'天雷灭世', atkEl:'雷', heavyEl:'雷', rageEl:'雷', ultEl:'雷' },
        '魂': { atkName:'魂影撕咬', heavyName:'魂识冲击', rageName:'魂火反噬', ultName:'魂渊降临', atkEl:'魂', heavyEl:'魂', rageEl:'魂', ultEl:'魂' },
        '音': { atkName:'音波冲撞', heavyName:'震裂强音', rageName:'乱魂魔音', ultName:'万籁俱寂', atkEl:'音', heavyEl:'音', rageEl:'音', ultEl:'音' },
        '邪': { atkName:'魔爪撕咬', heavyName:'凶煞重击', rageName:'濒死暴怒', ultName:'湮灭魔域', atkEl:'邪', heavyEl:'魔', rageEl:'魔', ultEl:'魔' }
      };
      const set = elSets[el] || elSets['邪'];
      // V1.3.6：敌方技能附带效果——重击破甲、狂暴自增攻、奥义可眩晕，战斗更有压迫感
      return {
        atk:   { id:'atk',   name:set.atkName,    type:'basic', element:set.atkEl,    power:1.0, mp:0 },
        heavy: { id:'heavy', name:set.heavyName,  type:'skill', element:set.heavyEl,  power:1.5, mp:0, armorBreak: 0.08, slow: 0.1 },
        rage:  { id:'rage',  name:set.rageName,   type:'skill', element:set.rageEl,   power:2.0, mp:0, atkSelf: { name:'暴怒', turns: 2, mul: 0.25 }, selfDmgPct: 0.04 },
        ult:   { id:'ult',   name:set.ultName,    type:'ultimate', element:set.ultEl, power:2.6, mp:0, stun: 1 }
      };
    },
    enemyCastLine(enemy, skill) {
      const lines = {
        atk:   `${enemy.name}低吼一声，裹挟${skill.element}之力扑来！`,
        heavy: `${enemy.name}蓄力凝聚气劲，挥出势大力沉的【${skill.name}】！`,
        rage:  `${enemy.name}发出一声凄厉嘶吼，浑身气机爆燃——【${skill.name}】！！`,
        ult:   `<span class="crit-tag">【${enemy.name}狂暴！】</span> 气息冲天，释放奥义【${skill.name}】！！`
      };
      return lines[skill.id] || `${enemy.name}发动攻击！`;
    },

    /* ============== 消耗/CD 结算 ============== */
    commitCosts(unit, skill) {
      // 消费命格加成：cdReduce（天机·CD缩减5%）
      let cdReduce = (unit.ref && unit.ref.mingshen) ? STATE.mingshenBonus(unit.ref, 'cdReduce') : 0;
      let mpReduce = 0;
      // 神赐被动：文以载道（CD-10%）、文脉（灵力消耗-15%）
      const s = Battle.state;
      if (s && unit === s.player && s.player.passiveEff) {
        const e = s.player.passiveEff;
        if (e.cdReduce) cdReduce += e.cdReduce;
        if (e.type === 'mpReduce') mpReduce = e.mul || 0;
      }
      if (skill.cd) {
        unit.cds[skill.id] = Math.max(0, Math.round(skill.cd * (1 - cdReduce)));
      }
      if (skill.mp) {
        // 灵光丹等 buff：灵力消耗倍率（mpCostMul < 1 减耗）
        let mpCostMul = 1;
        if (unit.buffs) unit.buffs.forEach(b => { if (b.mpCostMul) mpCostMul *= b.mpCostMul; });
        const cost = Math.max(0, Math.floor(skill.mp * (1 - mpReduce) * mpCostMul));
        unit.mp = Math.max(0, unit.mp - cost);
      }
    },
    tickCDs(unit) {
      for (const k in unit.cds) {
        unit.cds[k]--;
        if (unit.cds[k] <= 0) delete unit.cds[k];
      }
    },
    tickBuffs(unit) {
      unit.buffs.forEach(b => { if (b.turns !== undefined) b.turns--; });
      unit.buffs = unit.buffs.filter(b => b.turns === undefined || b.turns > 0);
      unit.debuffs.forEach(b => { if (b.turns !== undefined) b.turns--; });
      unit.debuffs = unit.debuffs.filter(b => b.turns === undefined || b.turns > 0);
    },
    applyDebuff(unit, debuff) {
      // 神赐被动：恒照不灭（免疫灼烧）
      const s0 = Battle.state;
      if (s0 && unit === s0.player && debuff.name === '灼烧' && s0.player.passiveEff && s0.player.passiveEff.type === 'elementSpecific' && s0.player.passiveEff.immuneBurn) {
        Battle.log(`${unit.name} 恒照不灭，免疫【灼烧】！`, 'react');
        return;
      }
      // 消费 resist/mentalResist 命格加成（阴阳=异常状态抵抗，破欲=精神类debuff抵抗）
      const mingshen = (unit.ref && unit.ref.mingshen) ? unit.ref.mingshen : [];
      const resist = STATE.mingshenBonus(unit.ref, 'resist') + STATE.mingshenBonus(unit.ref, 'mentalResist');
      if (resist > 0 && RNG.chance(Math.min(0.6, resist))) {
        Battle.log(`${unit.name} 凭借[highlight]命格之力[/highlight]抵抗了【${debuff.name}】！`, 'react');
        return;
      }
      // 同类型不叠加，刷新
      const idx = unit.debuffs.findIndex(d => d.name === debuff.name);
      if (idx >= 0) unit.debuffs[idx] = debuff;
      else unit.debuffs.push(debuff);
    },
    applyDots(unit) {
      const dots = unit.debuffs.filter(d => d.dot);
      dots.forEach(d => {
        unit.hp = Math.max(0, unit.hp - d.dot);
        Battle.log(`【${d.name}】持续灼烧，${unit.name}损失 <b class="dmg-num">${d.dot}</b> 点生命。`, 'dmg');
      });
    },

    /* ============== 能量 ============== */
    gainEnergy(unit, amount) {
      unit.energy = Math.min(unit.maxEnergy, unit.energy + amount);
      if (unit.energy >= unit.maxEnergy) {
        Battle.log(`${unit.name}的奥义能量已满！`, 'react');
      }
    },

    /* ============== 元素反应 ============== */
    checkReact(unit, skill) {
      const s = Battle.state;
      if (!skill || !skill.element) return;
      const prev = unit.lastElement;
      if (prev && prev !== skill.element) {
        // 双向查找：键支持任意顺序（不依赖中文排序），正反均能命中
        const key1 = prev + '+' + skill.element;
        const key2 = skill.element + '+' + prev;
        const react = ELEMENT_REACTIONS[key1] || ELEMENT_REACTIONS[key2];
        if (react) {
          const enemy = unit === s.player ? s.enemy : s.player;
          Battle.log(`<span class="react-tag">✦ 触发【${react.name}】！</span> ${react.desc}`, 'react');
          // 元素反应光效 + 反应名飘字
          Battle.fxReact(skill.element);
          Battle.fxFloat(unit === s.player ? 'enemy' : 'player', '✦ ' + react.name, 'react');
          // 真实伤害（立即，按目标最大血量百分比）
          if (react.trueDmgPct) {
            const td = Math.floor(enemy.maxHp * react.trueDmgPct);
            enemy.hp = Math.max(0, enemy.hp - td);
            Battle.log(`${react.name}造成 <b class="dmg-num">${td}</b> 点真实伤害！`, 'dmg');
          }
          // 反应追加伤害（dmgMul：V1.3.3 修复此前定义但未生效的问题）
          if (react.dmgMul && react.dmgMul > 1) {
            const bonus = Math.floor(unit.atk * (react.dmgMul - 1));
            enemy.hp = Math.max(0, enemy.hp - bonus);
            Battle.log(`${react.name}余威席卷，追加 <b class="dmg-num">${bonus}</b> 点伤害！`, 'dmg');
            Battle.fxFloat(unit === s.player ? 'enemy' : 'player', '+' + bonus, 'dmg');
          }
          // 灼烧/中毒类持续伤害
          if (react.addBurn) Battle.applyDebuff(enemy, { name:'灼烧', turns: 2, dot: Math.floor(unit.atk * 0.2), good:false });
          if (react.dot) Battle.applyDebuff(enemy, { name: react.dotName || '中毒', turns: 2, dot: Math.floor(unit.atk * react.dot), good:false });
          // 减速 / 缠绕
          if (react.slow) Battle.applyDebuff(enemy, { name:'减速', turns: 2, slow: react.slow, good:false });
          if (react.bind) Battle.applyDebuff(enemy, { name:'缠绕', turns: 2, bind: true, good:false });
          // 破甲
          if (react.armorBreak) Battle.applyDebuff(enemy, { name:'破甲', turns: 2, armorBreak: react.armorBreak, good:false });
          // 吸血 / 回血（V1.3.20：按触发方显示主语，敌方触发不再误显示"你"）
          if (react.healPct) {
            const h = Math.floor(unit.maxHp * react.healPct);
            unit.hp = Math.min(unit.maxHp, unit.hp + h);
            if (unit === s.player) Battle.log(`你吸收了 <b class="heal-num">${h}</b> 点生命！`, 'heal');
            else Battle.log(`${unit.name}吸收了 <b class="heal-num">${h}</b> 点生命！`, 'heal');
          }
        }
      }
      unit.lastElement = skill.element;
    },

    /* ============== 命中判定 ============== */
    hitRoll(attacker, defender) {
      // 命中命格：加成攻击方命中（此前"命中"只在面板显示、战斗中完全无效——修复）
      let hitBonus = 0;
      if (attacker.ref && attacker.ref.mingshen && STATE.mingshenBonus) {
        try { hitBonus = STATE.mingshenBonus(attacker.ref, 'hit'); } catch (e) { hitBonus = 0; }
      }
      const dodgeBonus = (defender.ref && defender.ref.mingshen
        ? STATE.mingshenBonus(defender.ref, 'dodge') : 0)
        + ((defender.ref && defender.ref.charBattleBonus && defender.ref.charBattleBonus.dodge) || 0)
        + (defender.dodgeBonus || 0);   // V1.3.13：挑战装备/法阵闪避加成
      // 行云被动：玩家每回合速度叠加，转化为闪避加成
      let speedDodge = 0;
      const s = Battle.state;
      if (s && defender === s.player && s.player.passiveEff && s.player.passiveEff.type === 'speed') {
        const n = s.player._stacks ? (s.player._stacks['行云'] || 0) : 0;
        speedDodge = Math.min(0.15, n * (s.player.passiveEff.per || 0.03));
      }
      // 等级差影响命中率：斜率温和（每级±0.8%），并 5 级封顶（±4%），
      // 与伤害压制同口径，避免高等级差下命中也被碾压。
      const lvDelta = Math.max(-5, Math.min(5, (attacker.lv || 1) - (defender.lv || 1)));
      let hitRate = 0.90 + lvDelta * 0.008;
      hitRate += hitBonus;       // 命中命格（面板口径一致）
      hitRate -= dodgeBonus;
      hitRate -= speedDodge;
      // 减速debuff降低闪避
      if (defender.debuffs.some(d => d.slow)) hitRate += 0.08;
      // 控制类 debuff（V1.3.6）：缠绕/冻结/眩晕的目标几乎无法闪避
      if (defender.debuffs.some(d => d.bind || d.freeze || d.stun)) hitRate += 0.20;
      // 疾风丹等 buff：额外闪避（dodgeMul）
      if (defender.buffs) defender.buffs.forEach(b => { if (b.dodgeMul) hitRate -= b.dodgeMul; });
      hitRate = Math.max(0.55, Math.min(0.97, hitRate));
      // 返回 {hit} 对象（调用处统一用 hit.hit 判断）
      return { hit: RNG.chance(hitRate) };
    },

    /* ============== 职业被动解析（出战被动 → 含 eff 的对象） ============== */
    getPassive(s) {
      const p = s.player.ref;
      const loadout = (s.player.skillLoadout) || (p && p.skillLoadout) || null;
      if (!loadout || !loadout.passive) return null;
      // __prof__ 表示职业被动
      const info = STATE.getProfessionSkills(p);
      if (loadout.passive === '__prof__') {
        return (info && info.passive) ? info.passive : null;
      }
      // 否则查神赐被动
      const offer = STATE.getOfferUnlockedSkills(p);
      if (offer && offer.passive && offer.passive.id === loadout.passive) return offer.passive;
      return null;
    },

    /* ============== 被动效果消费（伤害/暴击/破甲类，在 calcDamage 内调用） ============== */
    // 返回 { dmgMul, critRate, critDmg, defBreak, armorBreakChance, petStackMul }
    passiveCombat(s, attacker, defender, skill) {
      const out = { dmgMul: 1.0, critRate: 0, critDmg: 0, defBreak: 0, armorBreakChance: 0, petStackMul: 1.0 };
      const eff = s.player.passiveEff;
      if (!eff) return out;
      const pct = s.player.maxHp > 0 ? s.player.hp / s.player.maxHp : 1;
      switch (eff.type) {
        case 'dmgCond': {
          const enemy = s.enemy;
          let on = false;
          if (eff.cond === 'fullHp') on = enemy.maxHp > 0 && enemy.hp >= enemy.maxHp;
          else if (eff.cond === 'petAlive') on = !!s.pet;
          else if (eff.cond === 'afterControl') on = !!s.player._lastControlHit;
          else if (eff.cond === 'afterCharm') on = !!s.player._lastCharmHit;
          else if (eff.cond === 'afterDodge') on = !!s.player._lastDodged;
          else if (eff.cond === 'afterHitWater') on = !!s.player._lastWaterHit && skill.element === '水';
          else if (eff.cond === 'afterHitSound') on = !!s.player._lastSoundHit;
          if (on) {
            out.dmgMul += (eff.mul || 0);
            // 一次性语义：消费后清除对应标记
            if (eff.cond === 'afterControl') s.player._lastControlHit = false;
            if (eff.cond === 'afterCharm') s.player._lastCharmHit = false;
            if (eff.cond === 'afterHitSound') s.player._lastSoundHit = false;
            if (eff.cond === 'afterHitWater') s.player._lastWaterHit = false;
            if (eff.cond === 'afterDodge') s.player._lastDodged = false;
          }
          break;
        }
        case 'crit':
          out.critRate = eff.rate || 0;
          out.critDmg = eff.dmg || 0;
          break;
        case 'elementSpecific':
          // 指定元素增伤（神赐被动：雷威/炎心/佛法无边/恒照不灭）
          if (skill.element === eff.element) out.dmgMul += (eff.mul || 0);
          if (eff.critDmg) out.critDmg += eff.critDmg;
          break;
        case 'mpReduce':
          out.mpReduce = eff.mul || 0;
          break;
        case 'cdReduce':
          out.cdReduce = eff.mul || 0;
          break;
        case 'fatalSave':
          out.fatalSave = true;
          break;
        case 'immuneBurn':
          out.immuneBurn = true;
          break;
        case 'stackAtk': {
          const k = eff.label || 'stackAtk';
          const n = s.player._stacks ? (s.player._stacks[k] || 0) : 0;
          out.dmgMul += Math.min(eff.cap || 10, n) * (eff.per || 0);
          break;
        }
        case 'stackFire': {
          // 锻心：火伤叠加
          const n = s.player._stacks ? (s.player._stacks['炉温'] || 0) : 0;
          if (skill.element === '火') out.dmgMul += Math.min(eff.cap || 10, n) * (eff.per || 0);
          break;
        }
        case 'stackDef': {
          const n = s.player._stacks ? (s.player._stacks['阵气'] || 0) : 0;
          const reduce = Math.min(eff.cap || 10, n) * (eff.per || 0);
          // 减伤：换算为对敌方伤害的等效降低（攻击不变，敌方伤害由受击侧另行处理）
          out._defReduce = reduce;
          break;
        }
        case 'lowHpDmg':
          out.dmgMul += (1 - pct) * (eff.mul || 0);
          break;
        case 'elementDmg':
          // 元素亲和：全元素伤害+8%
          out.dmgMul += (eff.mul || 0);
          break;
        case 'randomElement': {
          // 万化：每回合随机元素增伤（用回合数做伪随机种子，保证稳定）
          const els = ['火','水','金','木','土','风','雷'];
          const cur = els[(s.round || 0) % els.length];
          if (skill.element === cur) out.dmgMul += (eff.mul || 0);
          break;
        }
        case 'petStack': {
          // 墨韵：普攻叠加灵痕，每层+8%灵宠协击伤害（作用于灵宠协击）
          const n = s.player._stacks ? (s.player._stacks['灵痕'] || 0) : 0;
          out.petStackMul = 1 + Math.min(eff.cap || 5, n) * (eff.per || 0);
          break;
        }
        case 'armorBreak':
          out.armorBreakChance = eff.chance || 0;
          break;
        case 'critDefBreak':
          out.defBreak = eff.def || 0;
          break;
      }
      return out;
    },

    /* ============== 伤害计算（含属性克制） ============== */
    calcDamage(attacker, defender, skill) {
      const prof = attacker.profession ? PROFESSIONS[attacker.profession] : null;
      let skillMul = skill.power || 1.0;
      if (skill.type === 'basic') skillMul = skillMul || 1.0;
      if (skill.type === 'ultimate') skillMul = skillMul || 2.0;

      // —— 命格加成消费 ——
      const mingshen = (attacker.ref && attacker.ref.mingshen) ? attacker.ref.mingshen : [];
      // 攻击/防御加成 = 专属命格加成 + "全属性"(all) 命格加成，让"全属性"名副其实
      const atkBonus = STATE.mingshenBonus(attacker.ref, 'atk') + STATE.mingshenBonus(attacker.ref, 'all');
      const defBonus = STATE.mingshenBonus(defender.ref, 'def') + STATE.mingshenBonus(defender.ref, 'all');
      const elBonusKey = { '火':'fire','水':'water','金':'metal','木':'heal' }[skill.element] || null;
      const elBonus = elBonusKey ? STATE.mingshenBonus(attacker.ref, elBonusKey) : 0;  // 元素伤害
      const armorBonus = STATE.mingshenBonus(attacker.ref, 'armorBreak'); // 破甲效率

      let baseAtk = attacker.atk * skillMul * (1 + atkBonus);
      // 增益 buff：攻防乘区（神行丹等 atkMul/defMul）
      let buffAtkMul = 1, buffDefMul = 1;
      if (attacker.buffs) attacker.buffs.forEach(b => { if (b.atkMul) buffAtkMul *= b.atkMul; });
      // 降攻 debuff（山岳符·镇岳等，V1.3.6）：攻击方 debuff 的 atkMul（<1）也计入
      if (attacker.debuffs) attacker.debuffs.forEach(d => { if (d.atkMul) buffAtkMul *= d.atkMul; });
      if (defender.buffs) defender.buffs.forEach(b => { if (b.defMul) buffDefMul *= b.defMul; });
      baseAtk *= buffAtkMul;
      let def = defender.def * (1 + defBonus) * buffDefMul;   // 命格防御加成 + buff 防御乘区

      // 属性克制
      let elementMul = 1.0;
      const atkEl = skill.element || attacker.element || '道';
      const defEl = defender.element || '邪';
      const map = (global.ELEMENT_MAP || {})[atkEl];
      if (map) {
        if (map.beat && map.beat.includes(defEl)) elementMul = 1.3;       // 克制（增强抉择感）
        else if (map.lose && map.lose.includes(defEl)) elementMul = 0.8;  // 被克
      }
      // 元素伤害命格加成
      elementMul *= (1 + elBonus);

      // 境界/等级压制：攻击方等级高于防守方增伤，反之减伤
      // 温和斜率（每级±1.5%），并 5 级封顶（±7.5%）——超过 5 级的差距不再额外放大，
      // 保证"±5 级内皆有得打"，避免后期一级之差就被碾压。
      let realmMul = 1.0;
      const atkLv = attacker.lv || (attacker.ref && attacker.ref.lv) || 1;
      const defLv = defender.lv || (defender.ref && defender.ref.lv) || 1;
      const lvDiff = atkLv - defLv;
      if (lvDiff > 0) realmMul = 1 + Math.min(0.075, lvDiff * 0.015);
      else if (lvDiff < 0) realmMul = 1 - Math.min(0.075, Math.abs(lvDiff) * 0.015);

      // 破甲debuff
      let defAfter = def;
      const armorBreak = defender.debuffs.filter(d => d.armorBreak).reduce((s, d) => s + d.armorBreak, 0) + armorBonus;
      defAfter = def * (1 - Math.min(0.5, armorBreak));

      // 连击加成：连续命中提升伤害（最多+30%），被闪避会清零
      let comboMul = 1.0;
      if (attacker.combo) comboMul = 1 + Math.min(0.30, attacker.combo * 0.05);

      // 基础伤害公式：atk²/(atk+def) 减伤温和化（atk与def同量级时约减伤50%，atk远超def时接近全额）
      // 相较 100/(80+def) 的旧公式，避免高等级防御过度压制伤害，保证战斗节奏
      let dmg = baseAtk * baseAtk / Math.max(1, baseAtk + defAfter) * elementMul * realmMul * comboMul;

      // —— 职业被动消费（仅玩家攻击方生效）——
      const s = Battle.state;
      const isPlayerAtk = (s && attacker === s.player);
      let pass = null;
      if (isPlayerAtk && s.player.passiveEff) {
        pass = Battle.passiveCombat(s, attacker, defender, skill);
        dmg *= pass.dmgMul;
      }
      // 受击减伤 buff（金刚丹等，V1.3.3 新增）：防守方 buff 的 dmgReduceMul 累乘
      let reduceMul = 1;
      if (defender.buffs) defender.buffs.forEach(b => { if (b.dmgReduceMul) reduceMul *= (1 - b.dmgReduceMul); });
      dmg *= reduceMul;

      // 暴击（含天级角色专属战斗加成 crit；V1.3.19：试炼塔暴击 buff）
      const critBonus = STATE.mingshenBonus(attacker.ref, 'crit') + ((attacker.ref && attacker.ref.charBattleBonus && attacker.ref.charBattleBonus.crit) || 0) + ((attacker.ref && attacker.ref._towerBuffCrit) || 0);
      let critRate = 0.08 + critBonus;
      // 暴击 buff（战神丹等）：攻击方 buff 的 critMul 直接加暴击率
      if (attacker.buffs) attacker.buffs.forEach(b => { if (b.critMul) critRate += b.critMul; });
      let critDmg = 1.6;
      if (pass) { critRate += pass.critRate; critDmg += pass.critDmg; }
      const crit = RNG.chance(Math.min(0.9, critRate));
      if (crit) {
        dmg *= critDmg;
        // 暴击音效（仅玩家暴击时反馈，避免敌方暴击频繁刷音）
        if (isPlayerAtk) Engine.sfx('crit');
      }

      // 攻速buff（略增伤害）
      if (attacker.buffs.some(b => b.name === '兽血沸腾')) dmg *= 1.3;

      dmg = Math.max(1, Math.floor(dmg));
      const result = { value: dmg, crit, element: atkEl };

      // 被动：窥命（暴击破防）、巨力（概率破甲）
      if (pass && crit && pass.defBreak) {
        Battle.applyDebuff(defender, { name:'破甲', turns: 2, armorBreak: pass.defBreak, good:false });
      }
      if (pass && pass.armorBreakChance && RNG.chance(pass.armorBreakChance)) {
        Battle.applyDebuff(defender, { name:'破甲', turns: 2, armorBreak: 0.1, good:false });
        Battle.log(`【${s.player.name}·被动】巨力震伤，${defender.name} 露出破绽！`, 'react');
      }

      // 技能附带效果（V1.3.6 重构：由技能字段统一驱动，玩家与敌方通用，描述与效果严格一致）
      if (skill.burn) result.burn = skill.burn;
      if (skill.poison) result.poison = skill.poison;
      if (skill.poisonName) result.poisonName = skill.poisonName;
      if (skill.armorBreak) result.armorBreak = skill.armorBreak === true ? 0.1 : skill.armorBreak;
      if (skill.slow) result.slow = skill.slow;
      if (skill.atkDown) result.atkDown = skill.atkDown;
      if (skill.bind) result.bind = skill.bind;
      if (skill.leech) result.leech = skill.leech;
      if (skill.selfDmgPct) result.selfDmg = Math.floor(attacker.maxHp * skill.selfDmgPct);
      if (skill.stun) result.stun = skill.stun;
      if (skill.paralyze) result.paralyze = skill.paralyze;
      if (skill.freeze) result.freeze = skill.freeze;
      if (skill.charm) result.charm = skill.charm;
      if (skill.atkSelf) result.atkSelf = skill.atkSelf;
      if (skill.defSelf) result.defSelf = skill.defSelf;
      if (skill.dodgeSelf) result.dodgeSelf = skill.dodgeSelf;
      if (skill.reduceSelf) result.reduceSelf = skill.reduceSelf;
      if (skill.healSelf) result.healSelf = skill.healSelf;
      if (skill.mpSelf) result.mpSelf = skill.mpSelf;

      return result;
    },

    /* ============== 战利品 ============== */
    dropLoot(p) {
      const s = Battle.state;
      if (!p) return;
      const lootLines = [];
      // 经验
      const expGain = Math.floor(20 + s.enemy.lv * 5);
      p.realm.exp = (p.realm.exp || 0) + expGain;   // V1.3.20：缺省保护，避免旧档缺失字段产生 NaN
      lootLines.push(`修为 +${expGain}`);
      // 金币
      const goldGain = Math.floor(10 + s.enemy.lv * 3);
      p.gold = (p.gold || 0) + goldGain;
      lootLines.push(`金币 +${goldGain}`);
      // 灵材：优先掉落当前国家特色灵材，其次是通用草木灵材
      // V1.3.20：修正 natMap 前缀（原为 'MAT-C0' 等带尾零，拼接 '01' 得 3 位无效 ID，掉落幽灵材料）
      const natMap = {
        qingqiu:'MAT-C', yumin:'MAT-FS', yanhuo:'MAT-YH', xuanyuan:'MAT-JG',
        xuangu:'MAT-XG', huantou:'MAT-HT', sanshou:'MAT-SS', nieer:'MAT-NE',
        daren:'MAT-DR', baimin:'MAT-BM', changgu:'MAT-CG', zhurao:'MAT-ZR',
        jiaojing:'MAT-JJ', rouli:'MAT-RL', shenmu:'MAT-SM', wuchang:'MAT-WC',
        yimu:'MAT-YM', jiexiong:'MAT-JX', qizhong:'MAT-QZ', guixu:'MAT-GX'
      };
      const natPrefix = (p && p.nation && natMap[p.nation]) ? natMap[p.nation] : null;
      const natPool = [];
      if (natPrefix) {
        // 各国特色材料：01/02/03/05（跳过 04——青丘 MAT-C04 等无效材料不存在），并补 06（转职稀有材料）
        for (const i of ['01','02','03','05','06']) natPool.push(natPrefix + i);
      }
      const dropPool = natPool.length ? natPool.concat(['MAT-C01','MAT-C02','MAT-C05','MAT-C08']) : ['MAT-C01', 'MAT-C02', 'MAT-C05', 'MAT-C08'];
      // 高等级敌人更大概率掉材，且可能掉复数
      const dropChance = 0.5 + Math.min(0.4, s.enemy.lv * 0.004);
      if (RNG.chance(dropChance)) {
        const mat = RNG.pick(dropPool);
        const n = RNG.chance(0.25) ? 2 : 1;
        STATE.addMaterial(p, mat, n);
        lootLines.push(`${STATE.matName(mat)} ×${n}`);
      }
      // 升级检测
      const lvUp = STATE.checkLevelUp(p);
      if (lvUp) {
        lootLines.push(`境界突破！Lv${lvUp[lvUp.length-1]}`);
        if (global.Engine) global.Engine.toast('境界突破！Lv' + lvUp[lvUp.length-1], 'gold');
      }
      Battle.log(`<span class="sys">战利品：${lootLines.join(' · ')}</span>`, 'system');
      if (global.Engine) Engine.refreshStatus(p);
    },

    /* ============== 结束 ============== */
    enemyDead() { return Battle.state.enemy.hp <= 0; },

    end(result) {
      const s = Battle.state;
      if (!s) return;
      Battle.ended = true;
      // 战斗结束：把战斗中的 hp/mp 写回玩家存档对象（保证家园面板与战斗血量/灵力一致）
      // 胜利时若满血则不覆盖（避免血量上限变化导致的误差）
      const pref = s.player && s.player.ref;
      if (pref) {
        if (s.player.hp !== undefined) pref.hp = Math.max(1, Math.min(s.player.hp, s.player.maxHp));
        if (s.player.mp !== undefined) pref.mp = Math.max(0, Math.min(s.player.mp, s.player.maxMp));
        // 二次 clamp：战斗结束后若玩家 maxHp/maxMp 已变化（转职/牺牲/供奉等），按当前上限收口
        try {
          if (typeof STATE !== 'undefined' && STATE.calcMaxHp) {
            pref.hp = Math.max(1, Math.min(pref.hp, STATE.calcMaxHp(pref)));
            pref.mp = Math.max(0, Math.min(pref.mp, STATE.calcMaxMp(pref)));
          }
        } catch (e) {}
      }
      let continued = false;
      // —— 灵宠羁绊：出战灵宠随战斗成长（胜+3，败+1），羁绊满级提升灵宠全属性 ——
      try { if (pref && typeof STATE !== 'undefined' && STATE.addPetBond) STATE.addPetBond(pref, result === 'win' ? 3 : 1); } catch (e) {}
      if (result === 'win') {
        if (typeof Engine.sfx === 'function') Engine.sfx('win');
        Battle.log(`<span class="sys">✨ 你击败了 ${s.enemy.name}！</span>`, 'system');
        Battle.log(Battle.hpFlavor('enemy', s.enemy), 'flavor');
        // —— 被动：归墟（击杀回血）——
        if (s.player.passiveEff && s.player.passiveEff.type === 'onKillHeal') {
          const heal = Math.floor(s.player.maxHp * (s.player.passiveEff.pct || 0.3));
          s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
          // 同步写回存档对象（战斗结束写回发生在击杀回血之前，这里补一次同步，避免家园面板血量不一致）
          if (pref) pref.hp = Math.max(1, Math.min(s.player.hp, s.player.maxHp));
          Battle.log(`<span class="react-tag">【被动·归墟】</span>击杀汲取生机，恢复 <b class="heal-num">${heal}</b> 点生命！`, 'heal');
        }
        // 战利品掉落
        Battle.dropLoot(s.player.ref);
        // 成就统计：战斗胜利 + 上下文（越级/满血/最大连击）
        const pref = s.player.ref;
        if (pref) {
          pref._battleWins = (pref._battleWins || 0) + 1;
          if (typeof STATE.addDaily === 'function') STATE.addDaily(pref, 'battle', 1);   // 每日目标
          if (typeof STATE.trackWeekly === 'function') STATE.trackWeekly(pref, 'battle');
          try { if (typeof global.META !== 'undefined' && META.trackNovice) META.trackNovice('battle', 1); } catch (e) {}   // 每周任务
          const ctx = {
            weakWin: (s.player.lv + 5) <= (s.enemy.lv || 0),
            flawless: s.player.hp >= s.player.maxHp,
            maxCombo: s.player.combo || 0,
            // V1.3.20：字段名修复 realmId→realm.level（此前该隐藏成就永远无法达成）
            taotian: pref.realm && (pref.realm.level || 0) >= 6 && (s.player.lv + 10) <= (s.enemy.lv || 0)
          };
          if (typeof STATE.checkAchievements === 'function') {
            const newly = STATE.checkAchievements(pref, ctx);
            if (newly.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newly);
          }
        }
        if (s.onEnd.win) {
          try {
            const r = s.onEnd.win(s.player.ref);
            // 连战：win 回调返回 'continue' 表示已启动下一场战斗（状态不重置）
            if (r === 'continue') continued = true;
          } catch (e) { if (typeof console !== 'undefined') console.error('onWin error:', e); }
        }
      } else if (result === 'lose') {
        if (typeof Engine.sfx === 'function') Engine.sfx('lose');
        Battle.log(`<span class="sys">💀 你被 ${s.enemy.name} 击败……</span>`, 'system');
        const pref = s.player.ref;
        if (pref) pref._battleLoses = (pref._battleLoses || 0) + 1;
        try { if (s.onEnd.lose) s.onEnd.lose(s.player.ref); } catch (e) { if (typeof console !== 'undefined') console.error('onLose error:', e); }
      } else if (result === 'flee') {
        if (typeof Engine.sfx === 'function') Engine.sfx('click');
        Battle.log(`你且战且退，脱离了战斗。`, 'system');
        try { if (s.onEnd.flee) s.onEnd.flee(s.player.ref); } catch (e) { if (typeof console !== 'undefined') console.error('onFlee error:', e); }
      }
      setTimeout(() => {
        if (continued) {
          // 连战：新战斗已接管，不清空（新 start 会重建 state）
          Battle.ended = false;
        } else {
          Battle.state = null;
          if (global.AudioMgr) AudioMgr.switch('peaceful');
          if (s.onEnd.after) s.onEnd.after();
        }
      }, 800);
    }
  };

  global.Battle = Battle;
  global.ELEMENT_REACTIONS = ELEMENT_REACTIONS;
})(window);