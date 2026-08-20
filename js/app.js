/* ===========================================================
 * 问道山海 · 应用主入口
 * 负责：路由（屏幕切换）、启动流程、新建/读档、场景调度
 * =========================================================== */
(function (global) {
  'use strict';

  /* ===========================================================
   * 背景音乐管理
   * 两首循环曲目：
   *   - peaceful: bgm_chapter4_peaceful.mp3（自由探索/日常/平和剧情）
   *   - dramatic: bgm_chapter3_illusion.mp3（战斗/BOSS/幻境/紧张剧情）
   * 支持静音开关，偏好存于 localStorage。
   * =========================================================== */
  const AudioMgr = {
    player: null,
    current: null,          // 当前播放的曲目 key
    muted: false,
    volume: 0.5,            // 音乐音量（0~1）
    _storageKey: 'wdsx-bgm-muted',
    _volStorageKey: 'wdsx-bgm-volume',

    init() {
      this.player = document.getElementById('bgm-player');
      if (!this.player) return;
      // 默认播放（除非玩家手动静音过）。浏览器自动播放策略限制下，
      // 首次真正播放需等待用户交互，见 ensurePlay()。
      try {
        const saved = localStorage.getItem(this._storageKey);
        this.muted = (saved === '1');
        const vol = parseFloat(localStorage.getItem(this._volStorageKey));
        if (!isNaN(vol)) this.volume = Math.max(0, Math.min(1, vol));
      } catch (e) { this.muted = false; }
      this.player.volume = this.muted ? 0 : this.volume;
      this.updateMuteBtn();
      // 静音按钮
      const btn = document.getElementById('btn-mute');
      if (btn) btn.onclick = () => this.toggleMute();
    },

    /** 尝试开始播放（用户交互后调用，绕过浏览器自动播放限制） */
    ensurePlay() {
      if (!this.player || this.muted || !this.current) return;
      const p = this.player.play();
      if (p && p.catch) p.catch(() => { /* 仍被阻止则静默，等待下次交互 */ });
    },

    /** 剧情场景一律用平和曲；紧张曲目(bgm_chapter3)仅由战斗(Battle.start)触发 */
    playForScene(sceneId) {
      this.switch('peaceful');
    },

    /** 切换曲目（若已是该曲目则保持播放状态不变） */
    switch(key) {
      if (!this.player) return;
      if (this.current === key) return;
      this.current = key;
      const src = key === 'dramatic'
        ? 'assets/audio/bgm_chapter3_illusion.mp3'
        : 'assets/audio/bgm_chapter4_peaceful.mp3';
      if (this.player.getAttribute('src') !== src) {
        this.player.src = src;
        this.player.load();
      }
      if (!this.muted) {
        const p = this.player.play();
        if (p && p.catch) p.catch(() => { /* 浏览器自动播放被阻止时静默，等用户交互后再响 */ });
      }
    },

    toggleMute() {
      this.muted = !this.muted;
      try { localStorage.setItem(this._storageKey, this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (this.muted) { if (this.player) this.player.pause(); }
      else if (this.player && this.current) {
        this.player.volume = this.volume;
        const p = this.player.play();
        if (p && p.catch) p.catch(() => {});
      }
      this.updateMuteBtn();
    },

    /** 设置音乐音量（0~1），持久化并即时生效 */
    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      try { localStorage.setItem(this._volStorageKey, String(this.volume)); } catch (e) { /* ignore */ }
      if (this.player) this.player.volume = this.muted ? 0 : this.volume;
    },

    updateMuteBtn() {
      const btn = document.getElementById('btn-mute');
      if (btn) btn.textContent = this.muted ? '🔇' : '🔊';
    }
  };

  const App = {
    player: null,

    /* ============== 启动 ============== */
    init() {
      // ===== V1.3.19：全局错误诊断收集（上限60条；任何位置异常都可在此面板回溯） =====
      App._diagErrors = [];
      const _diagPush = (m, src, line, stack, isPromise) => {
        try {
          if (!App._diagErrors) App._diagErrors = [];
          App._diagErrors.push({ t: Date.now(), m: String(m || '').slice(0, 300), s: String(src || '').slice(0, 120), l: line || 0, st: String(stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 220), p: !!isPromise });
          if (App._diagErrors.length > 60) App._diagErrors.shift();
        } catch (e) {}
      };
      window.addEventListener('error', (ev) => { _diagPush(ev && ev.message, ev && ev.filename, ev && ev.lineno, ev && ev.error && ev.error.stack, false); });
      window.addEventListener('unhandledrejection', (ev) => { const r = ev && ev.reason; _diagPush((r && r.message) || String(r), '', 0, r && r.stack, true); });
      // init 顶层包 try-catch：任何单点异常都不会中断后续按钮绑定
      try { Engine.setBg(App.getTitleBg()); } catch (e) { /* 静默 */ }
      // 标题画面收集进度（跨周目）
      try { App.refreshTitleProgress(); } catch (e) { /* 忽略 */ }
      // 标题画面命数显示（局外货币）
      try { App.refreshMingDisplay(); } catch (e) { /* 忽略 */ }
      // 应用选项框美术风格
      try { App.applyOptionStyle(); } catch (e) { /* 忽略 */ }
      // 背景音乐
      AudioMgr.init();
      AudioMgr.switch('peaceful');
      // 浏览器自动播放限制：首次用户交互（点击开始/读档等）时真正启动 BGM
      const startBgm = () => { AudioMgr.ensurePlay(); document.removeEventListener('click', startBgm); };
      document.addEventListener('click', startBgm);
      // 绑定按钮（对缺失元素做空值保护，避免测试/部分页面下 TypeError）
      const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = (e) => { try { Engine.sfx('click'); } catch (e) {} try { fn(); } catch (err) { console.error('btn handler error', id, err); } }; };
      bind('btn-newgame', () => App.newGame());
      bind('btn-load', () => App.loadGame());
      bind('btn-credits', () => App.showCredits());
      bind('btn-save', () => App.saveGame());
      bind('btn-menu', () => App.showMenu());
      // 封面：右上角设置
      bind('btn-title-settings', () => App.showSettings());
      // 封面：左侧功能栏
      bind('btn-side-signin', () => App.showSignin());
      bind('btn-side-novice', () => App.showNovice());
      bind('btn-side-mingsign', () => App.showMingsign());
      bind('btn-side-weekly', () => App.showWeekly());
      bind('btn-side-challenge', () => App.showChallenge());
      bind('btn-side-tome', () => App.openTome('overview'));
      bind('btn-side-characters', () => App.showCharacters());
      bind('btn-side-pets', () => App.showPets());
      bind('btn-side-skins', () => App.showSkins());
      bind('btn-side-ach', () => App.showGlobalAchievements());
      // V1.3.19：传承树 / 流派图鉴
      bind('btn-side-legacy', () => App.showLegacy());
      bind('btn-side-builds', () => App.showBuilds());
      // V1.3.19：全局诊断入口（右下角小齿轮 / 快捷键 Ctrl+Shift+D）
      bind('btn-diag', () => App.openDiagPanel());
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); try { App.openDiagPanel(); } catch (err) {} }
      });
      // 跳过打字
      bind('btn-skip-type', () => Engine.skipCurrentType());
      // 默认隐藏状态栏
      Engine.hideStatus();
      // ===== 彩蛋：连点标题logo「问道山海」5次，得造物主的赠礼 =====
      try {
        const titleLogo = document.querySelector('h1.game-title');
        if (titleLogo) {
          let clicks = 0;
          titleLogo.style.cursor = 'pointer';
          titleLogo.title = '？';
          titleLogo.onclick = () => {
            clicks++;
            if (clicks >= 5) {
              clicks = 0;
              const eggKey = 'wdsx_egg_title_claimed';
              let claimed = false;
              try { claimed = localStorage.getItem(eggKey) === '1'; } catch (e) {}
              if (!claimed) {
                try { localStorage.setItem(eggKey, '1'); } catch (e) {}
                try { if (META && META.addMing) META.addMing(5); App.refreshMingDisplay(); } catch (e) {}
                Engine.toast('彩蛋！「山河弈局，问道永续」——造物主赠你 5 命数。', 'gold');
                if (typeof Engine.sfx === 'function') Engine.sfx('reward');
              } else {
                Engine.toast('造物主已赠过礼了，勿再贪心。', 'good');
              }
            }
          };
        }
      } catch (e) { /* 忽略彩蛋异常 */ }
      // 默认禁用"续道前程"
      if (!SAVE.hasSave()) {
        const btnLoad = document.getElementById('btn-load');
        if (btnLoad) { btnLoad.disabled = true; btnLoad.title = '尚无存档'; }
      }
      // ===== [调试模式] 开始（后期可整体删除本段，不影响游戏） =====
      // 封面提供"快速体验（调试）"按钮，由玩家自行选择模式（不自动进入调试）
      // 无论 file:// 还是 HTTP，都显示该按钮供玩家点击选择
      const dbg = document.getElementById('btn-debug-skip');
      if (dbg) {
        dbg.classList.remove('hidden');
        dbg.style.display = '';
        dbg.textContent = '快速体验 · 元婴期高手开局';
        dbg.onclick = () => { Engine.sfx('click'); App.debugSkipTutorial(); };
      }
      // ===== [调试模式] 结束 =====

      // 角色面板 / 背包 / 好感度按钮
      bind('btn-character', () => App.showCharacter());
      bind('btn-bag', () => App.showBag());
      bind('btn-favor', () => App.showFavor());
      // 右上角回家园图标：随时回家（离开后回来剧情不重置），但战斗中禁止回家
      bind('btn-home', () => {
        if (!App.player) return;
        if (typeof Battle !== 'undefined' && Battle.state) {
          Engine.toast('战斗中无法返回家园，请先结束战斗！', 'evil');
          Engine.log('魔物环伺，此刻脱身不得。', 'evil');
          return;
        }
        // 若处于探索/点触主线屏：先保存进度再回家（剧情暂停）
        if (App._story || App._explore) {
          App.leaveExplore();
          return;
        }
        App.goto('home');
      });
      // 探索屏：离开按钮
      bind('explore-back', () => { if (App.leaveExplore) App.leaveExplore(); });
      // 探索屏：角色面板/背包入口（探索屏隐藏了顶部 header，这里补入口，让玩家随时查看人物面板）
      bind('explore-char', () => App.showCharacter());
      bind('explore-bag', () => App.showBag());
      // 恶念条点击：查看各国恶念
      bind('evil-block', () => App.showNationEvil());
    },

    /* ============== 角色面板：展示完整属性与成长 ============== */
    showCharacter() {
      const p = App.player;
      if (!p) { Engine.modal('角色', '尚无玩家数据', [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]); return; }
      const s = STATE.getDerivedStats(p);
      const prof = (global.PROFESSIONS || {})[p.profession] || {};
      // 隐藏职业：从 getHiddenProfessions 查 img（若无则回退三教职业立绘）
      const hiddenProf = (typeof STATE !== 'undefined' && STATE.getHiddenProfessions) ? (STATE.getHiddenProfessions()[p.profession] || null) : null;
      const profImg = (hiddenProf && hiddenProf.img) || prof.img || 'assets/img/nations/prof-tao.jpg';
      const profName = (p.professionName || prof.name || '道徒') + (p.mainSkill ? ' · 主修「' + p.mainSkill + '」' : '');
      const mingshen = (p.mingshen || []).map(m => m.name).join('、') || '（无）';
      // 当前/上限一起显示（家园面板、状态栏口径一致），气血灵力与实际战斗保持一致
      const curHp = Math.max(0, Math.min(p.hp, s.maxHp));
      const curMp = Math.max(0, Math.min(p.mp, s.maxMp));
      // 面板头部：角色立绘（职业立绘）+ 名号
      let html = `<div class="char-panel-head">
  <img class="char-panel-img" src="${profImg}" alt="${profName}">
  <div class="char-panel-info"><div class="char-panel-name">${p.name || '求道者'}</div><div class="char-panel-prof">${profName}</div></div>
</div>
<div class="panel-stats">
  <div class="panel-row"><span>职业</span><b>${profName}</b></div>
  <div class="panel-row"><span>境界</span><b>${p.realm.name} · Lv${s.lv}</b></div>
  <div class="panel-row"><span>修为</span><b>${s.exp}/${s.expMax}（${s.expPct}%）</b></div>
  <div class="panel-row"><span>气血</span><b>${curHp}/${s.maxHp}</b></div>
  <div class="panel-row"><span>灵力</span><b>${curMp}/${s.maxMp}</b></div>
  <div class="panel-row"><span>攻击</span><b>${s.atk}</b></div>
  <div class="panel-row"><span>防御</span><b>${s.def}</b></div>
  <div class="panel-row"><span>暴击率</span><b>${s.crit}%</b></div>
  <div class="panel-row"><span>闪避率</span><b>${s.dodge}%</b></div>
  <div class="panel-row"><span>命中率</span><b>${s.hit}%</b></div>
  <div class="panel-row"><span>修炼效率</span><b>${s.cult}%</b></div>
  <div class="panel-row"><span>治疗加成</span><b>+${s.heal}%</b></div>
  <div class="panel-row"><span>恶念值·${STATE.nationName(p.nation)}</span><b style="color:${(p.nationEvil&&p.nationEvil[p.nation]||0)>=55?'#ff6b6b':'#c9c9c9'}">${p.nationEvil&&p.nationEvil[p.nation]||0}</b></div>
  <div class="panel-row"><span>命格</span><b class="panel-long">${mingshen}</b></div>
</div>`;
      if (s.nextRealm) {
        html += `<div class="panel-tip">下一境界：<b>${s.nextRealm.name}</b>（需 Lv${s.nextRealm.needLv}）· ${s.nextRealm.desc}</div>`;
      }
      Engine.modal('角 色 面 板', html, [
        { label:'背包', cls:'btn-secondary', fn:()=>App.showBag() },
        { label:'命格', cls:'btn-secondary', fn:()=>App.showMingshen() },
        { label:'技能/职业', cls:'btn-secondary', fn:()=>App.showSkillProfession() },
        { label:'成就', cls:'btn-secondary', fn:()=>App.showAchievements() },
        { label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }
      ]);
    },

    /* ============== 命格面板（重抽/升级） ============== */
    showMingshen() {
      const p = App.player;
      if (!p) { Engine.modal('命格', '尚无玩家数据', [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]); return; }
      const render = () => {
        const ms = p.mingshen || [];
        let rows = '';
        ms.forEach((m, i) => {
          const lv = Math.max(1, Math.min(5, m.level || 1));
          const lvStars = '★'.repeat(lv) + '☆'.repeat(5 - lv);
          // 命格效果描述（区分百分比类与整数类）
          const modParts = [];
          if (m.mod) {
            const lvMul = 1 + (lv - 1) * 0.4;
            for (const k in m.mod) {
              const v = m.mod[k];
              const label = STATE.mingshenModLabel(k);
              // 整数类 mod（绝对值 >= 1 的固定数值，如恶念降低、NPC好感）
              if (Math.abs(v) >= 1) {
                modParts.push(`${label}${v > 0 ? '+' : ''}${v}`);
              } else {
                const val = Math.round(v * lvMul * 100);
                modParts.push(`${label}${val > 0 ? '+' : ''}${val}%`);
              }
            }
          }
          const modText = modParts.length ? modParts.join('、') : '';
          rows += `<div class="ms-row">
            <div class="ms-info">
              <div class="ms-name">${m.name} <span class="ms-lv">${lvStars}</span></div>
              <div class="ms-desc">${m.desc || ''}${modText ? '（' + modText + '）' : ''}</div>
            </div>
            <div class="ms-actions">
              <button class="ms-btn ms-reroll" data-i="${i}">重抽</button>
              <button class="ms-btn ms-upgrade" data-i="${i}" ${lv >= 5 ? 'disabled' : ''}>升级</button>
            </div>
          </div>`;
        });
        // 命格共鸣（羁绊）展示
        const reso = STATE.resonanceInfo(p);
        let resoHtml = '';
        if (reso.length > 0) {
          resoHtml = `<div class="ms-reso">
            <div class="ms-reso-title">✨ 命格共鸣（已触发 ${reso.length} 组）</div>
            ${reso.map(r => `<div class="ms-reso-item"><b>${r.name}</b> — ${r.desc}</div>`).join('')}
          </div>`;
        } else {
          resoHtml = `<div class="ms-reso ms-reso-empty">命格共鸣：凑齐特定命格组合可触发羁绊加成（详见命格图鉴）。</div>`;
        }
        const html = `<div class="ms-chances">命格抽取机会：<b>${p.drawChances || 0}</b>（重抽/升级各消耗 1 次）</div>
          <div class="ms-list">${rows || '<div class="ms-empty">暂无命格</div>'}</div>
          ${resoHtml}
          <div class="ms-tip">命格升至更高等级，效果更强（每级 +40%）。重抽可更换不理想的命格。</div>`;
        Engine.modal('命 格', html, [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]);
        // 绑定重抽/升级
        document.querySelectorAll('.ms-reroll').forEach(btn => {
          btn.onclick = () => {
            const r = STATE.rerollMingshen(p, parseInt(btn.getAttribute('data-i'), 10));
            if (r.error) { Engine.log(r.error, 'evil'); return; }
            Engine.log('命格重塑！新命格：「' + r.name + '」', 'gold');
            Engine.sfx('reward');
            Engine.refreshStatus(p);
            render();
          };
        });
        document.querySelectorAll('.ms-upgrade').forEach(btn => {
          btn.onclick = () => {
            const r = STATE.upgradeMingshen(p, parseInt(btn.getAttribute('data-i'), 10));
            if (r.error) { Engine.log(r.error, 'evil'); return; }
            Engine.log('命格精进！「' + r.name + '」升至 ' + r.level + ' 级。', 'gold');
            Engine.sfx('reward');
            Engine.refreshStatus(p);
            render();
          };
        });
      };
      render();
    },

    /* ============== 成就面板（横向大框架，隐藏成就名字可见） ============== */
    showAchievements() {
      const p = App.player;
      if (!p) { Engine.modal('成就', '尚无玩家数据', [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]); return; }
      const list = (typeof global.ACHIEVEMENTS !== 'undefined' && global.ACHIEVEMENTS) ? global.ACHIEVEMENTS : [];
      const unlocked = p.achievements || [];
      const unlockedCount = unlocked.length;
      // 分类统计
      const catMap = {
        'realm':'境界', 'battle':'战斗', 'explore':'探索', 'collect':'收集',
        'pet':'灵宠', 'offer':'供奉', 'karma':'因果', 'hidden':'隐藏'
      };
      let html = `<div class="ach-summary">已达成 <b>${unlockedCount}</b> / ${list.length} 项成就</div><div class="ach-grid">`;
      const rewardDesc = (a) => {
        // 成就奖励已改为「局外命数」（全局成就），存档内不再发放局内奖励
        const ming = App.globalAchMing ? App.globalAchMing(a.id) : 0;
        return '奖励：命数 +' + ming + '（封面·全局成就处领取）';
      };
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a || !a.id) continue;
        const got = unlocked.indexOf(a.id) >= 0;
        const iconKey = (a.icon && typeof a.icon === 'string') ? a.icon.replace('ach-', '') : 'default';
        const cat = catMap[iconKey] || '成就';
        const iconPath = a.icon || 'ach-default';
        const rwText = rewardDesc(a);
        if (got) {
          html += `<div class="ach-card ach-got">
            <img class="ach-icon" src="assets/img/achievements/${iconPath}.jpg" alt="">
            <div class="ach-name">${a.name || ''}</div>
            <div class="ach-desc">${a.desc || ''}</div>
            <div class="ach-flavor">${a.flavor || ''}</div>
            <span class="ach-badge">已达成</span>
          </div>`;
        } else if (a.hidden) {
          // 隐藏成就：名字露出，仅隐藏达成条件
          html += `<div class="ach-card ach-locked ach-secret">
            <img class="ach-icon ach-icon-gray" src="assets/img/achievements/ach-locked.jpg" alt="">
            <div class="ach-name">${a.name || ''}</div>
            <div class="ach-desc">神秘的隐藏成就 · ${cat}（达成条件不明）</div>
            ${rwText ? `<div class="ach-reward">${rwText}</div>` : ''}
            <span class="ach-badge">未解锁</span>
          </div>`;
        } else {
          html += `<div class="ach-card ach-locked">
            <img class="ach-icon ach-icon-gray" src="assets/img/achievements/${iconPath}.jpg" alt="">
            <div class="ach-name">${a.name || ''}</div>
            <div class="ach-desc">${a.desc || ''}</div>
            ${rwText ? `<div class="ach-reward">${rwText}</div>` : ''}
            <span class="ach-badge">未解锁</span>
          </div>`;
        }
      }
      html += '</div>';
      Engine.modal('成 就', html, [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]);
    },

    /* ============== 背包面板（归档展示：材料按品阶/类别分组） ============== */
    showBag() {
      const p = App.player;
      if (!p) { Engine.modal('背包', '尚无玩家数据', [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]); return; }
      const mats = p.materials || {};
      const M = (typeof global.MATERIALS !== 'undefined' && global.MATERIALS) ? global.MATERIALS : null;
      const qBadge = (id) => M ? M.qBadge(M.matQuality(id)) : '';
      // 竖排滑动分类：种子/草木/矿石/兽材/水灵/魂材/精华/特殊/灵香/图纸
      const catOrder = ['seed','herb','ore','beast','water','soul','essence','special','incense','blue'];
      const catName = (c) => M ? (M.CAT_LABEL[c] || '其他') : c;
      const catOf = (k) => M ? M.matCat(k) : (k.indexOf('SEED-')===0?'seed':k.indexOf('INCENSE')>=0?'incense':k.indexOf('BLUE-')===0?'blue':'herb');
      let html = `<div class="bag-gold">金币：<b>${p.gold || 0}</b></div>`;
      // 分类统计
      const matKeys = Object.keys(mats).filter(k => (mats[k] || 0) > 0);
      const totalKinds = matKeys.length + Object.keys(p.pills || {}).filter(k => (p.pills[k] || 0) > 0).length;
      html += `<div class="bag-progress">灵材种类：<b>${totalKinds}</b> · 更多收集见【绘卷】</div>`;
      let rendered = 0;
      catOrder.forEach(c => {
        const items = matKeys.filter(k => catOf(k) === c);
        if (!items.length) return;
        rendered++;
        const lines = items.map(k => `<span class="bag-item">${qBadge(k)}${STATE.matName(k)}<b>×${mats[k]}</b></span>`).join('');
        html += `<div class="bag-group"><div class="bag-group-title">${catName(c)}（${items.length}）</div><div class="bag-group-body bag-cat-body">${lines}</div></div>`;
      });
      // 图纸（BLUE 已在 blue 分类，灵香已入 incense；其余兜底）
      const leftovers = matKeys.filter(k => catOrder.indexOf(catOf(k)) < 0);
      if (leftovers.length) {
        const lines = leftovers.map(k => `<span class="bag-item">${qBadge(k)}${STATE.matName(k)}<b>×${mats[k]}</b></span>`).join('');
        html += `<div class="bag-group"><div class="bag-group-title">其他（${leftovers.length}）</div><div class="bag-group-body bag-cat-body">${lines}</div></div>`;
      }
      // 丹药（含品质徽标）
      const pills = p.pills || {};
      const pillIds = Object.keys(pills).filter(k => (pills[k] || 0) > 0);
      if (pillIds.length) {
        const pillLines = pillIds.map(k => {
          const r = STATE.getRecipes().find(x => x.id === k);
          const pq = M ? M.pillQuality(r) : 'N';
          return `<span class="bag-item">${M ? M.qBadge(pq) : ''}${STATE.matName(k)}<b>×${pills[k]}</b></span>`;
        }).join('');
        html += `<div class="bag-group"><div class="bag-group-title">丹药（${pillIds.length}）</div><div class="bag-group-body bag-cat-body">${pillLines}</div></div>`;
      }
      if (totalKinds === 0) {
        html += '<div class="bag-empty">背包空空如也</div>';
      }
      html += '<div class="bag-tip">💡 材料按「草木/矿石/兽材/水灵/魂材/精华/特殊」分类展示，品质标识：<span class="q-badge" style="color:#8fa3b8;border-color:#8fa3b8;">凡</span><span class="q-badge" style="color:#4caf7d;border-color:#4caf7d;">良</span><span class="q-badge" style="color:#4a90d9;border-color:#4a90d9;">精</span><span class="q-badge" style="color:#9b59b6;border-color:#9b59b6;">极</span><span class="q-badge" style="color:#d4a017;border-color:#d4a017;">仙</span></div>';
      Engine.modal('背 包', html, [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]);
    },

    /* ============== 山海绘卷·九大图鉴（收集全部记录 · 远超洛克王国魔法书） ============== */
    tomeStats(p) {
      const M = global.MATERIALS;
      try { STATE.tomeDexMigrateFrom(p); } catch (e) {}   // 确保老数据并入全局
      const seen = STATE.tomeSeenSet();
      const has = (id) => seen.has(id) || (p.materials && (p.materials[id] || 0) > 0) || (p.pills && (p.pills[id] || 0) > 0);
      const mats = M.allMaterials();
      const matCol = mats.filter(id => has(id));
      const recipes = STATE.getRecipes();
      const pillCol = recipes.filter(r => has(r.id));
      const pets = global.PETS || [];
      const petCol = pets.filter(pt => (p.petDex || []).indexOf(pt.id) >= 0 || seen.has('PET:' + pt.id));
      const chars = (global.CHARACTERS || []).filter(c => !c.locked);
      const charCol = chars.filter(c => META.hasChar(c.id) || c.id === p.charId || seen.has('CHAR:' + c.id));
      const nations = ['qingqiu','yumin','yanhuo','xuanyuan','xuangu','huantou','sanshou','nieer','daren','baimin','changgu','zhurao','jiaojing','rouli','shenmu','wuchang','yimu','jiexiong','qizhong','guixu'];
      const nationCol = nations.filter(n => STATE.isNationCleared(p, n) || seen.has('NAT:' + n));
      const profs = App.allProfessionEntries(p);
      const profCol = profs.filter(pr => pr.owned || seen.has('PROF:' + pr.id));
      const mings = App.allMingshenEntries();
      const mingCol = mings.filter(m => (p.mingshen || []).some(mm => mm.id === m.id) || seen.has('MING:' + m.id));
      const achs = global.ACHIEVEMENTS || [];
      const achCol = achs.filter(a => {
        try { return seen.has('ACH:' + a.id) || (p.achievements || []).indexOf(a.id) >= 0 || (a.check ? a.check(p) : false); } catch (e) { return false; }
      });
      const total = mats.length + recipes.length + pets.length + chars.length + nations.length + profs.length + mings.length + achs.length;
      const collected = matCol.length + pillCol.length + petCol.length + charCol.length + nationCol.length + profCol.length + mingCol.length + achCol.length;
      return {
        total, collected, pct: total ? Math.floor(collected / total * 100) : 0,
        tabs: {
          mat: { total: mats.length, col: matCol.length },
          pill: { total: recipes.length, col: pillCol.length },
          pet: { total: pets.length, col: petCol.length },
          char: { total: chars.length, col: charCol.length },
          nation: { total: nations.length, col: nationCol.length },
          prof: { total: profs.length, col: profCol.length },
          ming: { total: mings.length, col: mingCol.length },
          ach: { total: achs.length, col: achCol.length }
        }
      };
    },

    allProfessionEntries(plr) {
      const p = plr || App.player || {};
      const list = [];
      const base = global.PROFESSIONS || {};
      Object.keys(base).forEach(k => {
        const pr = base[k];
        // 玩家选定的立绘偏好：normal=本相，evo=传承相（仅完成进化时evo可用）
        const evo = STATE.getProfessionEvolution(p);
        const evoReady = !!(evo && evo.evolved && evo.god && evo.god.profMatch === k);
        const pref = (p._profPortrait && p._profPortrait[k]) || (evoReady ? 'evo' : 'normal');
        const img = (pref === 'evo' && pr.evoImg && evoReady) ? pr.evoImg : pr.img;
        list.push({ id: k, name: pr.name, tag: pr.tag, role: pr.role || '', roleDesc: pr.roleDesc || '', img: img, evoImg: pr.evoImg || null, evoName: pr.evoName || null, evoStory: pr.evoStory || null, desc: pr.mainSkillDesc || '', story: pr.story || '', owned: (p.ownedProfessions || []).indexOf(k) >= 0 || p.profession === k, evoReady: evoReady });
      });
      const hidden = STATE.getHiddenProfessions();
      Object.keys(hidden).forEach(k => {
        const pr = hidden[k];
        const bp = pr.bp || '';
        list.push({ id: k, name: pr.name, tag: pr.tag, role: pr.role || '', roleDesc: pr.roleDesc || '', img: 'assets/img/professions/prof-' + k + '.jpg', evoImg: null, evoName: null, evoStory: null, desc: pr.mainSkillDesc || '', story: pr.story || '', owned: (p.ownedProfessions || []).indexOf(k) >= 0 || p.profession === k, bp });
      });
      return list;
    },

    allMingshenEntries() {
      const list = [];
      const po = global.POOLS || {};
      Object.keys(po).forEach(poolId => {
        const pool = po[poolId];
        (pool.tags || []).forEach(t => list.push({ id: t.id, name: t.name, pool: pool.name, desc: t.desc }));
      });
      return list;
    },

    tomeMilestones() {
      return [
        { id: 'm60', need: 60,  label: '初窥万象',   reward: '命数 +10',             ming: 10 },
        { id: 'm120', need: 120, label: '小有所得',   reward: '命数 +20 · 普通灵香×1', ming: 20, mats: { 'MAT-INCENSE1': 1 } },
        { id: 'm180', need: 180, label: '见多识广',   reward: '命数 +30 · 天香草种×2', ming: 30, mats: { 'SEED-G01': 2 } },
        { id: 'm240', need: 240, label: '博览群书',   reward: '命数 +40 · 稀有灵香×1', ming: 40, mats: { 'MAT-INCENSE2': 1 } },
        { id: 'm300', need: 300, label: '遍览山海',   reward: '命数 +50 · 传说灵香×1', ming: 50, mats: { 'MAT-INCENSE3': 1 } },
        { id: 'm350', need: 350, label: '洞若观火',   reward: '命数 +60 · 影心草种×2', ming: 60, mats: { 'SEED-G07': 2 } },
        { id: 'm400', need: 400, label: '万象归一',   reward: '命数 +80 · 传说灵香×2', ming: 80, mats: { 'MAT-INCENSE3': 2 } },
        { id: 'm450', need: 450, label: '山海之主',   reward: '命数 +120 · 九叶菩提×1', ming: 120, mats: { 'MAT-G09': 1 } },
        { id: 'm500', need: 500, label: '天工开物',   reward: '命数 +150 · 传说灵香×2', ming: 150, mats: { 'MAT-INCENSE3': 2 } },
        { id: 'm550', need: 550, label: '物华天宝',   reward: '命数 +180 · 九叶菩提种×1', ming: 180, mats: { 'SEED-G09': 1 } },
        { id: 'm600', need: 600, label: '万法归宗',   reward: '命数 +220 · 传说灵香×3', ming: 220, mats: { 'MAT-INCENSE3': 3 } },
        { id: 'm650', need: 650, label: '道法自然',   reward: '命数 +260 · 九叶菩提×1', ming: 260, mats: { 'MAT-G09': 1 } },
        { id: 'm700', need: 700, label: '知行合一',   reward: '命数 +300 · 传说灵香×4 · 九叶菩提种×1', ming: 300, mats: { 'MAT-INCENSE3': 4, 'SEED-G09': 1 } }
      ];
    },

    openTome(tab) {
      // 山海绘卷为全局收藏：即使尚未开局也能查看已收集条目
      const p = App.player || { materials:{}, pills:{}, petDex:[], pets:[], ownedProfessions:[], profession:'', mingshen:[], achievements:[], completed:new Set(), _tomeSeen:new Set(), _tomeClaimed:[], _profPortrait:{} };
      if (App.player) { try { STATE.tomeDexMigrateFrom(App.player); } catch (e) {} }
      const M = global.MATERIALS;
      const stats = App.tomeStats(p);
      const seen = STATE.tomeSeenSet();
      const cur = tab || App._tomeTab || 'overview';
      App._tomeTab = cur;
      const TABS = [
        ['overview', '总览'], ['mat', '灵材'], ['pill', '丹药'], ['pet', '灵宠'],
        ['char', '角色'], ['nation', '国家'], ['prof', '职业'], ['ming', '命格'], ['ach', '成就']
      ];
      const tabBtns = TABS.map(([id, name]) => {
        const cnt = id === 'overview' ? '' : ` <span class="tome-cnt">${stats.tabs[id].col}/${stats.tabs[id].total}</span>`;
        return `<button class="tome-tab ${cur === id ? 'active' : ''}" data-tome="${id}">${name}${cnt}</button>`;
      }).join('');

      let content = '';
      if (cur === 'overview') {
        content = App.tomeOverviewHtml(p, stats);
      } else if (cur === 'mat') {
        content = App.tomeMatHtml(p, M, stats, seen);
      } else if (cur === 'pill') {
        content = App.tomePillHtml(p, M, stats);
      } else if (cur === 'pet') {
        content = App.tomePetHtml(p, stats);
      } else if (cur === 'char') {
        content = App.tomeCharHtml(p, stats, seen);
      } else if (cur === 'nation') {
        content = App.tomeNationHtml(p, stats, seen);
      } else if (cur === 'prof') {
        content = App.tomeProfHtml(p, stats);
      } else if (cur === 'ming') {
        content = App.tomeMingHtml(p, stats);
      } else if (cur === 'ach') {
        content = App.tomeAchHtml(p, stats);
      }
      // 子页顶部提示：点击条目看详情；右上角 × 直接关闭整本绘卷
      if (cur !== 'overview') {
        content = `<div class="tome-back-hint">💡 点击下方条目可查看详情 · 右上角「×」关闭整本绘卷</div>` + content;
      }

      const html = '<div class="meta-panel">'
        + `<div class="meta-panel-head"><span class="tome-title">📜 山海绘卷</span><span class="mp-ming">收集 ${stats.collected}/${stats.total} · ${stats.pct}%</span></div>`
        + '<div class="tome-wrap">'
        + `<div class="tome-tabs">${tabBtns}</div>`
        + `<div class="tome-body">${content}</div>`
        + '</div></div>';
      App.openBigModal('山 海 绘 卷', html, () => {}, true);
      // 绘卷本体：无论停留在哪个 tab，右上角 × 都是一次关闭整本绘卷
      const titleClose = document.querySelector('#modal .modal-title-close');
      if (titleClose) titleClose.onclick = () => Engine.closeModal();
      setTimeout(() => {
        document.querySelectorAll('.tome-tab').forEach(btn => {
          btn.onclick = () => App.openTome(btn.getAttribute('data-tome'));
        });
        // 灵材页：品质/类别筛选
        document.querySelectorAll('[data-mat-q]').forEach(btn => {
          btn.onclick = () => { App._matQ = btn.getAttribute('data-mat-q'); App.openTome('mat'); };
        });
        document.querySelectorAll('[data-mat-cat]').forEach(btn => {
          btn.onclick = () => { App._matCat = btn.getAttribute('data-mat-cat'); App.openTome('mat'); };
        });
        document.querySelectorAll('[data-milestone]').forEach(btn => {
          btn.onclick = () => {
            const r = App.tomeClaimMilestone(p, btn.getAttribute('data-milestone'));
            if (r.ok) { Engine.toast('里程碑达成奖励已领取！', 'gold'); Engine.sfx('reward'); App.openTome('overview'); }
            else Engine.toast(r.reason || '尚未达成', 'evil');
          };
        });
        document.querySelectorAll('.tome-item').forEach(card => {
          card.onclick = () => {
            const id = card.getAttribute('data-id');
            const kind = card.getAttribute('data-kind');
            App.tomeDetail(kind, id);
          };
        });
      }, 0);
    },

    tomeOverviewHtml(p, stats) {
      const claimed = new Set(STATE.tomeClaimedList());
      let html = '<div class="tome-overview">'
        + `<div class="tome-progress"><div class="tome-progress-fill" style="width:${Math.min(100, stats.pct)}%"></div></div>`
        + `<div class="tome-pct">山海万象收录 <b>${stats.collected}</b> / ${stats.total}（${stats.pct}%）</div>`
        + '<div class="tome-tips">每获得一种新的灵材/丹药、结契灵宠、通关国家、点亮职业/命格/成就，都会收录进这本山海绘卷。收集越多，里程碑奖励越丰厚。</div>'
        + '<div class="tome-milestones"><div class="tome-sec-title">📜 收集里程碑</div>';
      App.tomeMilestones().forEach(ms => {
        const reached = stats.collected >= ms.need;
        const done = claimed.has(ms.id);
        html += `<div class="tome-ms ${reached ? 'reached' : ''} ${done ? 'done' : ''}">
          <div class="tome-ms-left">
            <div class="tome-ms-name">${ms.label}</div>
            <div class="tome-ms-need">收集 ${ms.need} 种 · 奖励：${ms.reward}</div>
          </div>
          ${done ? '<span class="tome-ms-done">已领取</span>' : (reached ? `<button class="tome-ms-btn" data-milestone="${ms.id}">领取</button>` : `<span class="tome-ms-lock">🔒</span>`)}
        </div>`;
      });
      html += '</div></div>';
      return html;
    },

    tomeClaimMilestone(p, mid) {
      const ms = App.tomeMilestones().find(x => x.id === mid);
      if (!ms) return { error: '里程碑不存在' };
      const stats = App.tomeStats(p);
      if (stats.collected < ms.need) return { error: '收集数量不足' };
      if (STATE.tomeClaimedHas(mid)) return { error: '已领取过' };
      STATE.tomeClaimedAdd(mid);
      try { if (META.addMing) META.addMing(ms.ming || 0); } catch (e) {}
      if (ms.mats) {
        Object.keys(ms.mats).forEach(m => STATE.addMaterial(p, m, ms.mats[m]));
      }
      return { ok: true };
    },

    tomeMatHtml(p, M, stats, seen) {
      const matCol = new Set(M.allMaterials().filter(id => seen.has(id) || (p.materials && (p.materials[id] || 0) > 0) || (p.pills && (p.pills[id] || 0) > 0)));
      // 品质 + 类别 二级筛选（状态存 App._matQ / App._matCat，按钮点击重渲染）
      const fq = App._matQ || '';
      const fc = App._matCat || '';
      const QS = [['', '全部'], ['N', '凡'], ['R', '良'], ['SR', '精'], ['SSR', '极'], ['UR', '仙']];
      const CS = [['', '全部类'], ['seed', '种子'], ['herb', '草木'], ['ore', '矿石'], ['beast', '兽材'], ['water', '水灵'], ['soul', '魂材'], ['essence', '精华'], ['special', '特殊'], ['incense', '灵香']];
      const qBtn = QS.map(([v, label]) => `<button class="tome-filter ${fq === v ? 'active' : ''}" data-mat-q="${v}">${label}</button>`).join('');
      const cBtn = CS.map(([v, label]) => `<button class="tome-filter ${fc === v ? 'active' : ''}" data-mat-cat="${v}">${label}</button>`).join('');
      const qName = { N:'凡品', R:'良品', SR:'精品', SSR:'极品', UR:'仙品' };

      const entries = M.allMaterials().map(id => ({
        id, name: STATE.matName(id), q: M.matQuality(id), cat: M.matCat(id), src: M.matSrc(id), col: matCol.has(id),
        img: App.tomeMatImg(id, M.matCat(id))
      })).filter(e => (!fq || e.q === fq) && (!fc || e.cat === fc));
      const catOrder = ['seed','herb','ore','beast','water','soul','essence','special','incense'];
      const qRank = { N:0, R:1, SR:2, SSR:3, UR:4 };
      entries.sort((a, b) => {
        if (a.col !== b.col) return a.col ? -1 : 1;
        const ci = catOrder.indexOf(a.cat), cj = catOrder.indexOf(b.cat);
        if (ci !== cj) return ci - cj;
        return qRank[a.q] - qRank[b.q];
      });
      const colCnt = entries.filter(e => e.col).length;
      let html = `<div class="tome-sec-title">灵材图鉴（${fq ? qName[fq] : '全部'} · ${fc ? (M.CAT_LABEL[fc] || '其他') : '全部分类'} · 已收 ${colCnt}/${entries.length}）</div>`
        + `<div class="tome-filter-row"><span class="tome-filter-label">品质：</span>${qBtn}</div>`
        + `<div class="tome-filter-row"><span class="tome-filter-label">分类：</span>${cBtn}</div>`
        + '<div class="tome-grid">';
      entries.forEach(e => {
        html += `<div class="tome-item ${e.col ? 'col' : 'uncol'}" data-kind="mat" data-id="${e.id}">
          <img class="tome-item-img" src="${e.img}" alt="${e.name}" loading="lazy" onerror="this.style.display='none'">
          ${M.qBadge(e.q)}
          <span class="tome-item-name">${e.name}</span>
          <span class="tome-item-sub">${M.CAT_LABEL[e.cat] || '其他'} · ${e.col ? '已收录' : '未收录'}</span>
          <span class="tome-item-src">${e.src}</span>
        </div>`;
      });
      html += '</div>';
      return html;
    },
    /* 灵材图：专属精品图 > 分类图腾兜底（全部灵材都有图） */
    TOME_MAT_IMG: { 'MAT-G09':'mat-g09','MAT-G07':'mat-g07','MAT-G08':'mat-g08','MAT-G05':'mat-g05' },
    TOME_CAT_IMG: { seed:'cat-seed', herb:'cat-herb', ore:'cat-ore', beast:'cat-beast', water:'cat-water', soul:'cat-soul', essence:'cat-essence', special:'cat-special', incense:'cat-incense' },
    tomeMatImg(matId, cat) {
      const key = 'MAT-' + (matId.indexOf('MAT-') === 0 ? matId.slice(4) : matId);
      const special = App.TOME_MAT_IMG[matId];
      if (special) return 'assets/img/tome/' + special + '.jpg';
      const catKey = App.TOME_CAT_IMG[cat] || 'cat-special';
      return 'assets/img/tome/' + catKey + '.jpg';
    },

    tomePillHtml(p, M, stats) {
      const recipes = STATE.getRecipes();
      const seen = STATE.tomeSeenSet();
      const col = id => seen.has(id) || (p.pills && (p.pills[id] || 0) > 0);
      let html = '<div class="tome-sec-title">丹药图鉴</div><div class="tome-grid">';
      recipes.forEach(r => {
        const c = col(r.id);
        const q = M.pillQuality(r);
        const matStr = Object.entries(r.req).map(([m, n]) => STATE.matName(m) + '×' + n).join(' ');
        const pillSpecial = (r.id === 'daoyuan' || r.id === 'tianji');
        html += `<div class="tome-item ${c ? 'col' : 'uncol'}" data-kind="pill" data-id="${r.id}">
          ${pillSpecial ? `<img class="tome-item-img" src="assets/img/tome/pill-${r.id}.jpg" alt="${r.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
          ${M.qBadge(q)}
          <span class="tome-item-name">${r.name}</span>
          <span class="tome-item-sub">${r.effect} · ${c ? '已收录' : '未收录'}</span>
          <span class="tome-item-src">需要：${matStr}</span>
        </div>`;
      });
      html += '</div>';
      return html;
    },

    tomePetHtml(p, stats) {
      const pets = global.PETS || [];
      const dex = new Set(p.petDex || []);
      const seen = STATE.tomeSeenSet();
      let html = '<div class="tome-sec-title">灵宠图鉴</div><div class="tome-grid">';
      pets.forEach(pt => {
        const c = dex.has(pt.id) || seen.has('PET:' + pt.id);
        const evo = pt.evoLine ? pt.evoLine.join(' → ') : '';
        html += `<div class="tome-item ${c ? 'col' : 'uncol'}" data-kind="pet" data-id="${pt.id}">
          <img class="tome-item-img" src="${pt.img || ''}" alt="${pt.name}" loading="lazy" onerror="this.style.display='none'">
          <span class="q-badge" style="color:${pt.color};border-color:${pt.color};">${pt.quality}</span>
          <span class="tome-item-name">${pt.name}</span>
          <span class="tome-item-sub">${pt.quality} · ${c ? '已结契' : '未结契'}</span>
          <span class="tome-item-src">${evo}</span>
        </div>`;
      });
      html += '</div>';
      return html;
    },

    tomeCharHtml(p, stats, seen) {
      const chars = (global.CHARACTERS || []).filter(c => !c.locked);
      let html = '<div class="tome-sec-title">角色图鉴（山海众生）</div><div class="tome-grid">';
      chars.forEach(c => {
        const col = META.hasChar(c.id) || c.id === p.charId || seen.has('CHAR:' + c.id);
        html += `<div class="tome-item ${col ? 'col' : 'uncol'}" data-kind="char" data-id="${c.id}">
          <img class="tome-item-img" src="assets/img/char/${c.id}.jpg" alt="${c.name}" loading="lazy" onerror="this.style.display='none'">
          <span class="q-badge" style="color:#c8a050;border-color:#c8a050;">${c.quality}</span>
          <span class="tome-item-name">${c.name}</span>
          <span class="tome-item-sub">${c.title || ''} · ${col ? '已结识' : '未结识'}</span>
          <span class="tome-item-src">${c.story ? c.story.slice(0, 24) + '…' : ''}</span>
        </div>`;
      });
      html += '</div>';
      return html;
    },

    /* ============== 山海绘卷·国家志（二十国山河风物） ============== */
    NATION_INFO: {
      qingqiu: { epithet: '九尾灵狐之乡', terrain: '千年桃林覆雪漫山，悬空木阁错落云海，花瓣如雨常年不谢', folk: '以九尾为尊，狐族聚族而居，擅魅惑亦重情义；青丘善收流亡者，被视为山海第一境的温柔乡', npc: '白浅（接引使）· 白染（药婆）', img: 'assets/img/nations/qing-taolin.jpg' },
      yumin: { epithet: '天羽之国', terrain: '天羽城悬于云端，风灵通道贯穿诸天，地居部与半羽村依山而筑', folk: '天羽、地居、半羽三族因血统壁垒彼此仇视，飞行权即话语权', npc: '云瑶（天羽城）· 仙阁（风灵守卫）', img: 'assets/img/nations/yum-tianyu-city.jpg' },
      yanhuo: { epithet: '不灭熔炉', terrain: '火山熔岩环抱的钢铁之城，炉火日夜不休，灰烬如雪落在屋顶', folk: '厌火人赤肤红发，以火为魂；灰族以身为缓冲承受熔炉污染，火无贵贱之争暗流涌动', npc: '炎尘（铸火司）· 燧离（灰族领袖）', img: 'assets/img/nations/yanhuo-city.jpg' },
      xuanyuan: { epithet: '机关圣城', terrain: '齿轮咬合的钢铁巨城，机关傀儡穿梭街巷，地底机枢千年不眠', folk: '轩辕氏善机关造物，视机械如手足；机关人觉醒思潮涌动，墨守与公输月各执一理', npc: '公输月（机关天工）· 墨守（墨家传人）', img: 'assets/img/nations/xuanyuan-city.jpg' },
      xuangu: { epithet: '水神之泽', terrain: '大泽连天，水宫浮于万顷碧波之下，水光潋滟处见神兽潜影', folk: '玄股人以水为命，敬奉水神；每逢封印松动，须以「容器」承神之息', npc: '沧溟（水祭）', img: 'assets/img/nations/xuangu-lake.jpg' },
      huantou: { epithet: '鸣海之国', terrain: '黑潮拍岸，鸣海渊声如泣如诉，海底洞窟栖息着上古海兽', folk: '讙头人鸟首人身，世代以渔猎为生；大渊主以活祭隐瞒渊母之痛，潜奴世代受压', npc: '雀月（渊畔歌者）· 逐风（潜奴）', img: 'assets/img/nations/huantou-abyss.jpg' },
      sanshou: { epithet: '三魂雾国', terrain: '终年浓雾不散，魂井幽深，三座祭坛分立三面，各镇一魂', folk: '三首国人人有三面之相，善念、恶念、执念分离为魂；「镜试」可照见人的本心', npc: '朝音（魂井守）· 千幻（镜试之灵）', img: 'assets/img/nations/sanshou-mist.jpg' },
      nieer: { epithet: '失语峡谷', terrain: '千仞峡谷如竖起的巨耳，风过谷底不闻其声，寂静得能听见心跳', folk: '聂耳人双耳垂肩，能听极微之声；穷奇之耳苏醒后，声音与存在正被吞噬', npc: '雪铃（听风者）· 月山（守耳人）', img: 'assets/img/nations/nieer-canyon.jpg' },
      daren: { epithet: '擎天之国', terrain: '高原之巅立着擎天柱，据传是夸父之骨所化，云层只在腰际', folk: '大人国人身形如山，寿命悠长；侏儒部族以灵巧著称，巨人与侏儒守望相助', npc: '铜元（擎天卫）· 铜钟（铸骨师）', img: 'assets/img/nations/daren-plateau.jpg' },
      baimin: { epithet: '白兽平原', terrain: '一望无际的白垩平原，兽群如云朵般移动，契约石阵散布原野', folk: '白民肤白如雪，与兽灵立契共生；饕餮之口侵蚀契约纽带后，兽灵正集体疏远人类', npc: '星离（契师）· 明离（驯兽长）', img: 'assets/img/nations/baimin-plain.jpg' },
      changgu: { epithet: '裂时荒漠', terrain: '黄沙赤壁间裂开时之裂隙，日影在沙丘上忽进忽退，时间在此错乱', folk: '长股人双腿修长，日行千里；饕餮之牙咬碎时间，裂时渊令这片土地陷入永恒倒错', npc: '季离（逐时人）· 管离（凝时者）', img: 'assets/img/nations/changgu-desert.jpg' },
      zhurao: { epithet: '微尘之都', terrain: '机关微缩的蜂巢城郭，万象在此各安其位，秩序如钟表般精密', folk: '周饶人身长不过一尺，却筑起山海最精密的秩序；混沌之鳞侵蚀着绝对的「理」', npc: '结黎（微匠）· 明微（秩序官）', img: 'assets/img/nations/zhurao-order.jpg' },
      jiaojing: { epithet: '命轮之地', terrain: '万丝垂天的织机峡谷，命线如银河垂落，因果在此被织成绸缎', folk: '交胫人两腿相交，行走如织，世代守护命轮织机；穷奇之爪撕裂命线，因果正在崩解', npc: '结黎（织命师）· 织命长老', img: 'assets/img/nations/jiaojing-fate.jpg' },
      rouli: { epithet: '形蜕之地', terrain: '软玉铺就的流质大地，山石树木皆可变形，万物无固定之形', folk: '柔利人肢体柔若无骨，靠蜕皮维持完整之形；混沌之尾消化形态，存在正被渐渐抹去', npc: '蜕形翁（蜕皮长老）', img: 'assets/img/nations/rouli-shape.jpg' },
      shenmu: { epithet: '深瞳之国', terrain: '深渊裂缝贯穿大地，裂隙中一只巨瞳日夜注视，所见之景皆成定数', folk: '深目人眼眶深邃，能见「未来的一瞥」；归墟之隙的注视令他们避无可避', npc: '守瞳人（深目先知）', img: 'assets/img/nations/shenmu-eye.jpg' },
      wuchang: { epithet: '无肠熔域', terrain: '熔炉巨口吞下万物，食物与存在一同被消化，城邦建在巨胃之上', folk: '无肠人没有肠胃，以熔炉为腹，永远在进食；饕餮之胃正把「存在」本身吞入黑暗', npc: '熔厨（炉主）· 空腹者', img: 'assets/img/nations/wuchang-devour.jpg' },
      yimu: { epithet: '一瞳之国', terrain: '所有建筑都只开一扇窗，所有面具都只留一眼孔，目之所及皆为真相', folk: '一目人额中生一目，能窥真相亦被真相灼伤；混沌之目令盲者被迫「观看」', npc: '盲观者（一目先知）', img: 'assets/img/nations/yimu-eye.jpg' },
      jiexiong: { epithet: '贯核之国', terrain: '万物以脉核相连，山与山之间架着共鸣桥，心跳声传遍全境', folk: '结胸人胸口结核，彼此以核共鸣，同悲同喜；梼杌之胸正尝试把所有存在连成一体', npc: '共鸣老（核契师）', img: 'assets/img/nations/jiexiong-pillar.jpg' },
      qizhong: { epithet: '永行之足', terrain: '无边的行路之城，道路永远延伸，建筑建在永不停歇的脚步之上', folk: '跂踵人无踵，永远行走，以行迹为史；梼杌之足令他们无法停下，连梦境都在赶路', npc: '行者（行迹史官）', img: 'assets/img/nations/qizhong-walk.jpg' },
      guixu: { epithet: '四凶巢穴', terrain: '海中之无底深谷，海水倒悬如幕，二十道气息在此交汇成混沌漩涡', folk: '归墟是万物归处，也是四凶（梼杌·穷奇·混沌·饕餮）的真正巢穴——它们本为一体', npc: '？？？', img: 'assets/img/nations/guixu-void.jpg' }
    },

    tomeNationHtml(p, stats, seen) {
      const nations = ['qingqiu','yumin','yanhuo','xuanyuan','xuangu','huantou','sanshou','nieer','daren','baimin','changgu','zhurao','jiaojing','rouli','shenmu','wuchang','yimu','jiexiong','qizhong','guixu'];
      let html = '<div class="tome-sec-title">国家图鉴（二十国主线）</div><div class="tome-grid">';
      nations.forEach(n => {
        const cleared = STATE.isNationCleared(p, n);
        const visited = seen.has('NAT:' + n);
        const col = cleared || visited;
        const name = STATE.nationName(n);
        const info = App.NATION_INFO[n] || {};
        const recap = STATE.nationRecap ? STATE.nationRecap(n) : '';
        html += `<div class="tome-item ${col ? 'col' : 'uncol'}" data-kind="nation" data-id="${n}">
          <img class="tome-item-img" src="${info.img || ''}" alt="${name}" loading="lazy" onerror="this.style.display='none'">
          <span class="tome-item-name">${name}<span class="tome-item-sub" style="margin-left:4px;font-size:11px">${info.epithet || ''}</span></span>
          <span class="tome-item-sub">${cleared ? '✓ 已通关' : visited ? '已到访' : '未到访'}</span>
          <span class="tome-item-src">${recap ? recap.slice(0, 26) + '…' : ''}</span>
        </div>`;
      });
      html += '</div>';
      return html;
    },

    tomeProfHtml(p, stats) {
      const profs = App.allProfessionEntries(p);
      const seen = STATE.tomeSeenSet();
      let html = '<div class="tome-sec-title">职业图鉴（三教 + 二十二隐藏传承）</div><div class="tome-grid">';
      profs.forEach(pr => {
        const col = pr.owned || seen.has('PROF:' + pr.id);
        const evoBadge = pr.evoReady ? '<span style="color:#b8860b;font-weight:700;margin-left:4px">★已进化</span>' : '';
        const evoNameLine = pr.evoReady ? '<span class="tome-item-src" style="color:#b8860b">传承认定：' + pr.evoName + '</span>' : '';
        html += `<div class="tome-item ${col ? 'col' : 'uncol'}" data-kind="prof" data-id="${pr.id}">
          <img class="tome-item-img" src="${pr.img}" alt="${pr.name}" loading="lazy" onerror="this.style.display='none'">
          <span class="tome-item-name">${pr.name}${evoBadge}</span>
          <span class="tome-item-sub">${pr.tag} · ${col ? '已习得' : '未习得'}</span>
          ${pr.roleDesc ? `<span class="tome-item-src" style="color:#7a3fa2">定位：${pr.roleDesc}</span>` : ''}
          <span class="tome-item-src">${pr.bp ? '需图纸：' + STATE.matName(pr.bp) : '初始三教'}</span>
          ${evoNameLine}
        </div>`;
      });
      html += '</div>';
      return html;
    },

    tomeMingHtml(p, stats) {
      const mings = App.allMingshenEntries();
      const owned = new Set((p.mingshen || []).map(m => m.id));
      const seen = STATE.tomeSeenSet();
      let html = '<div class="tome-sec-title">命格图鉴（星宿/五行/血脉/因果/道心/通用）</div><div class="tome-grid">';
      mings.forEach(m => {
        const c = owned.has(m.id) || seen.has('MING:' + m.id);
        html += `<div class="tome-item ${c ? 'col' : 'uncol'}" data-kind="ming" data-id="${m.id}">
          <span class="tome-item-name">${m.name}</span>
          <span class="tome-item-sub">${m.pool} · ${c ? '已凝炼' : '未凝炼'}</span>
          <span class="tome-item-src">${m.desc}</span>
        </div>`;
      });
      html += '</div>';
      return html;
    },

    tomeAchHtml(p, stats) {
      const achs = global.ACHIEVEMENTS || [];
      const done = a => {
        try { return (p.achievements || []).indexOf(a.id) >= 0 || (a.check ? a.check(p) : false); } catch (e) { return false; }
      };
      let html = '<div class="tome-sec-title">成就图鉴</div><div class="tome-grid">';
      const ACH_IMG = { 'hidden_taotian':'ach-taotian','hidden_wuyun':'ach-wuyun','hidden_true_end':'ach-truend','hidden_xinsheng_taiyang':'ach-xinsheng','hidden_yinianshen':'ach-yinianshen' };
      achs.forEach(a => {
        const c = done(a);
        const aImg = ACH_IMG[a.id];
        html += `<div class="tome-item ${c ? 'col' : 'uncol'}" data-kind="ach" data-id="${a.id}">
          ${aImg ? `<img class="tome-item-img" src="assets/img/tome/${aImg}.jpg" alt="${a.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
          <span class="tome-item-name">${a.name}</span>
          <span class="tome-item-sub">${c ? '✓ 已达成' : (a.hidden ? '隐藏成就（达成后揭晓）' : '未达成')}</span>
          <span class="tome-item-src">${a.hidden && !c ? '？？？' : (a.desc || a.flavor || '')}</span>
        </div>`;
      });
      html += '</div>';
      return html;
    },

    tomeDetail(kind, id) {
      // 山海绘卷为全局收藏：封面（无玩家）也能查看所有详情，需兜底玩家数据
      const p = App.player || { materials:{}, pills:{}, petDex:[], pets:[], ownedProfessions:[], profession:'', mingshen:[], achievements:[], completed:new Set(), _tomeSeen:new Set(), _tomeClaimed:[], _profPortrait:{} };
      const M = global.MATERIALS;
      let title = '', body = '';
      if (kind === 'mat') {
        title = STATE.matName(id);
        const q = M.matQuality(id), cat = M.matCat(id);
        const crop = M.cropOf(id);
        const qc = M.Q_COLOR ? M.Q_COLOR[q] : '#c8a050';
        const matImg = App.tomeMatImg(id, cat);
        body = `<div class="tome-detail">
          <div class="tome-detail-hero">
            <img class="tome-detail-img" src="${matImg}" alt="${STATE.matName(id)}" onerror="this.style.display='none'">
            <div class="tome-detail-info">
              <div class="tome-detail-title">${STATE.matName(id)} <span class="q-badge" style="color:${qc};border-color:${qc};">${M.Q_NAME[q] || '凡品'}</span></div>
              <div class="tome-detail-tags">分类：${M.CAT_LABEL[cat] || '其他'}</div>
              <div class="tome-detail-line">📍 出处：${M.matSrc(id)}</div>
              ${crop ? `<div class="tome-detail-line">🌾 灵圃作物：成熟 ${crop.days} 天 · 收获 ${STATE.matName(crop.mat)} ×${crop.yield}</div>` : ''}
            </div>
          </div>
          <div class="tome-detail-desc">${M.matDesc(id)}</div>
        </div>`;
      } else if (kind === 'pill') {
        const r = STATE.getRecipes().find(x => x.id === id);
        if (r) {
          title = r.name;
          const q = M.pillQuality(r);
          const qc = M.Q_COLOR ? M.Q_COLOR[q] : '#c8a050';
          const pillSpecial = (id === 'daoyuan' || id === 'tianji');
          const pillImgHtml = pillSpecial ? `<img class="tome-detail-img" src="assets/img/tome/pill-${id}.jpg" alt="${r.name}" onerror="this.style.display='none'">` : `<div class="tome-detail-img tile" style="background:linear-gradient(180deg,${qc},rgba(74,44,20,0.85));display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:800;text-align:center;padding:6px">丹</div>`;
          body = `<div class="tome-detail">
            <div class="tome-detail-hero">
              ${pillImgHtml}
              <div class="tome-detail-info">
                <div class="tome-detail-title">${r.name} <span class="q-badge" style="color:${qc};border-color:${qc};">${M.Q_NAME[q] || '凡品'}</span></div>
                <div class="tome-detail-tags">丹火 ${r.danhuo} · 需 Lv${r.lv}</div>
                <div class="tome-detail-line">⚗️ 效果：${r.effect}</div>
                <div class="tome-detail-line">📜 配方：${Object.entries(r.req).map(([m, n]) => STATE.matName(m) + '×' + n).join('、')}</div>
              </div>
            </div>
            <div class="tome-detail-note">丹药可在【家园 · 炼丹】处炼制；部分丹药为战斗增益，战斗中服用即时生效。</div>
          </div>`;
        }
      } else if (kind === 'pet') {
        const pt = (global.PETS || []).find(x => x.id === id);
        if (pt) {
          title = pt.name;
          const raceName = (global.PET_RACE && global.PET_RACE[pt.race] && global.PET_RACE[pt.race].name) || pt.race;
          const evoLine = (pt.evoLine || []).join(' → ');
          const colPet = (p.petDex || []).indexOf(pt.id) >= 0 || STATE.tomeSeenSet().has('PET:' + pt.id);
          // 技能机制（与战斗一致）
          const sktName2 = { attack:'攻击', heal:'治疗', shield:'护盾', control:'控制', dodge:'位移' };
          const skMe2 = (s) => {
            if (!s) return '';
            const pw = s.power || 1.0;
            if (s.type === 'heal') return '协战时恢复主人生命（最大生命×15%×' + pw + '）';
            if (s.type === 'shield') return '协战时灵光护体，减伤 20% 持续 2 回合';
            if (s.type === 'control') return '协战时干扰敌方，减速 20% 持续 2 回合';
            return '协战时造成 ' + s.element + '伤害（威力×' + pw + '，可暴击·可被闪避）';
          };
          const skillHtml2 = [pt.skill, pt.skill2].filter(Boolean).map((s, i) => {
            const st = sktName2[s.type] || s.type;
            return `<div class="pet-skill"><b class="pet-skill-name">${s.name}</b><span class="pet-skill-tag">${st} · ${s.element} · ${i === 1 ? '协战 40% 概率' : '协战常驻'}</span><span class="pet-skill-desc">${s.desc || ''}<br>『${skMe2(s)}』</span></div>`;
          }).join('');
          // 进化链（各阶段全属性系数）
          const evoStages2 = global.EVO_STAGE || { init:{name:'初始',coeff:1.0}, first:{name:'一阶',coeff:1.5}, final:{name:'终极',coeff:2.4}, hidden:{name:'隐藏',coeff:3.0} };
          const sk2 = Object.keys(evoStages2);
          const evoHtml2 = (pt.evoLine && pt.evoLine.length) ? pt.evoLine.map((e, i) => {
            const stk = sk2[i] || 'init';
            const stg = evoStages2[stk] || {};
            return (i ? ' <span style="color:#c8a050">→</span> ' : '') + '<b>' + e + '</b><span class="pet-evo-coeff">×' + (stg.coeff || 1.0) + '</span>';
          }).join('') + '<div class="pet-evo-note">进化提升全属性（一阶×1.5 · 终极×2.4 · 隐藏×3.0），技能威力与形貌同步进阶。</div>' : '';
          body = `<div class="tome-detail">
            <div class="tome-detail-hero">
              <img class="tome-detail-img" src="${pt.img || ''}" alt="${pt.name}" onerror="this.style.display='none'">
              <div class="tome-detail-info">
                <div class="tome-detail-title">${pt.name} <span class="q-badge" style="color:${pt.color || '#c8a050'};border-color:${pt.color || '#c8a050'};">${pt.quality}</span></div>
                <div class="tome-detail-tags">种族：${raceName} · ${colPet ? '✓ 已收录' : '未收录'}${pt.element ? ' · ' + pt.element + '系' : ''}</div>
                <div class="tome-detail-line">🔀 进化路线：${evoLine}</div>
                <div class="tome-detail-desc">${pt.desc || '山海灵兽，未曾见于图册。'}</div>
              </div>
            </div>
            ${skillHtml2 ? `<div class="pet-skills">${skillHtml2}</div>` : ''}
            ${evoHtml2 ? `<div class="pet-evo"><b>进化链：</b>${evoHtml2}</div>` : ''}
            <div class="tome-detail-note">灵宠可在【家园 · 灵宠】处养成出战；进化材料可通过探索、种植（灵圃特产）或集市获得。出战灵宠每回合自动协战。</div>
          </div>`;
        }
      } else if (kind === 'char') {
        const c = global.getChar ? global.getChar(id) : null;
        if (c) {
          title = c.name;
          const mings = (c.fixedMingshen || []).map(m => m.name).join('、');
          const colChar = META.hasChar(c.id) || c.id === p.charId || STATE.tomeSeenSet().has('CHAR:' + c.id);
          body = `<div class="tome-detail">
            <div class="tome-detail-hero">
              <img class="tome-detail-img" src="assets/img/char/${c.id}.jpg" alt="${c.name}" onerror="this.style.display='none'">
              <div class="tome-detail-info">
                <div class="tome-detail-title">${c.name} <span class="q-badge" style="color:#c8a050;border-color:#c8a050;">${c.quality}</span></div>
                <div class="tome-detail-tags">${c.title || '山海众生'} · ${colChar ? '✓ 已结识' : '未结识'}${c.element ? ' · 五行·' + c.element : ''}</div>
                ${mings ? `<div class="tome-detail-line">✦ 固定命格：${mings}</div>` : ''}
                ${c.quest ? `<div class="tome-detail-line">🎯 专属历练：${c.quest.name}——${c.quest.desc}</div>` : ''}
                ${c.achievement ? `<div class="tome-detail-line">🏅 专属成就：${c.achievement.name}（${c.achievement.flavor || ''}）</div>` : ''}
              </div>
            </div>
            <div class="tome-detail-desc">${(c.story || '').replace(/\n/g, '<br>')}</div>
            ${c.hiddenClue ? `<div class="tome-detail-note" style="color:#7a3fa2">🔮 隐藏线索：${c.hiddenClue}</div>` : ''}
          </div>`;
        }
      } else if (kind === 'nation') {
        const name = STATE.nationName(id);
        const colN = STATE.isNationCleared(p, id) || STATE.tomeSeenSet().has('NAT:' + id);
        const info = App.NATION_INFO[id] || {};
        const recapN = STATE.nationRecap ? STATE.nationRecap(id) : '';
        title = name;
        body = `<div class="tome-detail">
          <div class="tome-detail-hero">
            <img class="tome-detail-img" src="${info.img || ''}" alt="${name}" onerror="this.style.display='none'">
            <div class="tome-detail-info">
              <div class="tome-detail-title">${name} <span style="font-size:12px;color:#8a6a3a">${info.epithet || ''}</span></div>
              <div class="tome-detail-tags">${colN ? '✓ 已踏足此国' : '未到访'}</div>
              ${info.terrain ? `<div class="tome-detail-line">🏔 山河地貌：${info.terrain}</div>` : ''}
              ${info.folk ? `<div class="tome-detail-line">🎐 风土人情：${info.folk}</div>` : ''}
              ${info.npc ? `<div class="tome-detail-line">👥 国中人物：${info.npc}</div>` : ''}
            </div>
          </div>
          ${recapN ? `<div class="tome-detail-desc">📖 该国命途：${recapN}</div>` : ''}
          <div class="tome-detail-note">二十国皆受四凶之劫，通关即踏平一方山河。进入游戏后经【国家地图】或主线剧情抵达此国。</div>
        </div>`;
      } else if (kind === 'prof') {
        const pr = App.allProfessionEntries(p).find(x => x.id === id);
        if (pr) {
          title = (pr.evoReady && (p._profPortrait && p._profPortrait[id] === 'evo')) ? pr.evoName : pr.name;
          // 立绘：当前选中的版本（默认 normal；evoReady 时默认 evo）
          const pref = (p._profPortrait && p._profPortrait[id]) || (pr.evoReady ? 'evo' : 'normal');
          const curImg = (pref === 'evo' && pr.evoImg) ? pr.evoImg : pr.img;
          // 立绘切换：本相 / 传承相（仅三教 + 已进化）
          const switcher = pr.evoReady ? `<div class="prof-evo-row">
            <div class="prof-evo-opt ${pref === 'normal' ? 'active' : ''}" data-prof-portrait="normal">
              <img src="${pr.img}" alt="本相">
              <div class="prof-evo-label"><b>本相</b>${pr.name}（初始）</div>
            </div>
            <div class="prof-evo-opt ${pref === 'evo' ? 'active' : ''}" data-prof-portrait="evo">
              <img src="${pr.evoImg}" alt="传承相">
              <div class="prof-evo-label"><b>传承相</b>${pr.evoName}（已进化）</div>
            </div>
            <div class="prof-evo-tip">点击切换立绘，仅影响绘卷展示。</div>
          </div>` : '';
          // 进化路线（仅三教）
          let evoRoute = '';
          if (pr.evoImg) {
            const god = (STATE.getGods() || {})[pr.id === 'tao' ? 'sanqing' : (pr.id === 'zen' ? 'rulai' : 'kongzi')];
            const godName = god ? god.name : '本命神明';
            const offerInfo = STATE.getOfferUnlockedSkills(p);
            const currentGod = p.offerGod;
            const curVal = p.offerValue || 0;
            const matched = currentGod && ((STATE.getGods() || {})[currentGod] && (STATE.getGods())[currentGod].profMatch === id);
            const valTxt = matched ? (curVal >= 1000 ? '✓ 已圆满' : '当前供奉 ' + curVal + '/1000') : '未供奉本命神明';
            evoRoute = `<div class="prof-evo-route">
              <b>🔱 进化路线</b>：供奉本命神明【${godName}】圆满（供奉值 1000）→ 进化为【${pr.evoName}】，全属性 +8%，并解锁神明终极神技。<br>
              <b>当前状态</b>：${valTxt}<br>
              <b>传承心法</b>：${pr.evoStory || ''}
            </div>`;
          }
          const intro = (pr.evoReady && pref === 'evo' && pr.evoStory) ? pr.evoStory : (pr.story || '');
          // —— 完整职业技能（与实际战斗技能表一致）——
          const srcProf = (global.PROFESSIONS || {})[id] || (STATE.getHiddenProfessions() || {})[id] || {};
          const skillList = srcProf.skills || [];
          const typeLabel = { basic:'普攻', skill:'主动技', ultimate:'奥义', block:'格挡', dodge:'闪避' };
          // —— 技能详细数据（V1.3.6：从技能字段实时生成，伤害%/CD/控制回合一目了然）——
          const skillStats = (sk) => {
            const parts = [];
            if (sk.power && sk.power > 0) parts.push('威力 ' + Math.round(sk.power * 100) + '%');
            if (sk.cd) parts.push('CD ' + sk.cd + ' 回合');
            if (sk.mp) parts.push('灵力 ' + sk.mp);
            if (sk.sta) parts.push('体力 ' + sk.sta);
            if (sk.burn) parts.push('灼烧' + sk.burn + '回');
            if (sk.poison) parts.push((sk.poisonName || '中毒') + sk.poison + '回');
            if (sk.armorBreak) parts.push('破甲' + Math.round((sk.armorBreak === true ? 0.1 : sk.armorBreak) * 100) + '%');
            if (sk.slow) parts.push('减速' + Math.round(sk.slow * 100) + '%');
            if (sk.bind) parts.push('缠绕1回');
            if (sk.stun) parts.push('眩晕' + sk.stun + '回');
            if (sk.paralyze) parts.push('麻痹' + sk.paralyze + '回');
            if (sk.freeze) parts.push('冻结' + sk.freeze + '回');
            if (sk.charm) parts.push('魅惑' + sk.charm + '回');
            if (sk.atkDown) parts.push('降攻' + Math.round(sk.atkDown * 100) + '%');
            if (sk.leech) parts.push('吸血' + Math.round(sk.leech * 100) + '%');
            if (sk.selfDmgPct) parts.push('自损' + Math.round(sk.selfDmgPct * 100) + '%');
            if (sk.healSelf) parts.push('回血' + Math.round(sk.healSelf * 100) + '%');
            if (sk.mpSelf) parts.push('回灵' + sk.mpSelf);
            if (sk.atkSelf) parts.push('攻+' + Math.round(sk.atkSelf.mul * 100) + '%');
            if (sk.defSelf) parts.push('防+' + Math.round(sk.defSelf.mul * 100) + '%');
            if (sk.dodgeSelf) parts.push('闪避+' + Math.round(sk.dodgeSelf.mul * 100) + '%');
            if (sk.reduceSelf) parts.push('减伤' + Math.round(sk.reduceSelf.mul * 100) + '%');
            return parts.length ? parts.join(' · ') : '';
          };
          const skillsHtml = skillList.length ? '<div class="prof-skills"><div class="prof-skills-title">⚔ 职业技能一览</div>' + skillList.map(s => {
            const tl = typeLabel[s.type] || s.type;
            const stats = skillStats(s);
            return `<div class="prof-skill"><b>${s.name}</b><span class="prof-skill-tag">${tl} · ${s.element}系${s.cd ? ' · CD' + s.cd : ''}</span>${stats ? `<span class="prof-skill-data">${stats}</span>` : ''}<span class="prof-skill-desc">${s.desc}</span></div>`;
          }).join('') + '</div>' : '';
          // —— 技能要义（V1.3.6：流派技能总述，由来与用法）——
          const skillIntroHtml = srcProf.skillIntro ? `<div class="prof-skillintro"><b>📜 技能要义</b>：${srcProf.skillIntro}</div>` : '';
          // —— 进化职业技能（V1.3.6：初始三教供奉本命神明圆满后解锁）——
          let evoSkillsHtml = '';
          if (srcProf.evoSkills && srcProf.evoSkills.length) {
            evoSkillsHtml = '<div class="prof-skills prof-skills-evo"><div class="prof-skills-title">🔱 进化职业技能 · ' + (srcProf.evoName || '传承') + '（供奉本命神明圆满后解锁）</div>' + srcProf.evoSkills.map(s => {
              const stats = skillStats(s);
              return `<div class="prof-skill"><b>${s.name}</b><span class="prof-skill-tag">${typeLabel[s.type] || '技能'} · ${s.element}系</span>${stats ? `<span class="prof-skill-data">${stats}</span>` : ''}<span class="prof-skill-desc">${s.desc}</span></div>`;
            }).join('') + '</div>';
          }
          const passiveHtml = srcProf.passive ? `<div class="prof-passive">✨ 被动心法 · ${srcProf.passive.name}：${srcProf.passive.desc}</div>` : '';
          const mainSkillHtml = srcProf.mainSkill ? `<div class="tome-detail-line"><b>${srcProf.mainSkill}：</b>${srcProf.mainSkillDesc || ''}</div>` : '';
          const statLine = srcProf.life ? `<div class="tome-detail-tags">属性倾向：生命×${srcProf.life} · 灵力×${srcProf.mp || 1} · 攻击×${srcProf.atk} · 防御×${srcProf.def}</div>` : '';
          const originHtml = srcProf.origin ? `<div class="tome-detail-desc"><b style="color:#5a3a1e">📜 流派渊源</b><br>${srcProf.origin}</div>` : '';
          body = `<div class="tome-detail">
            <div class="tome-detail-hero">
              <img class="tome-detail-img" src="${curImg}" alt="${pr.name}">
              <div class="tome-detail-info">
                <div class="tome-detail-title">${pr.name}${pr.evoReady ? '<span style="color:#b8860b;font-size:13px;margin-left:6px">★已进化</span>' : ''}</div>
                <div class="tome-detail-tags">${pr.tag}${pr.evoReady ? ' · 传承：' + pr.evoName : ''}</div>
                ${srcProf.roleDesc ? `<div class="tome-detail-tags" style="color:#7a3fa2">定位 · ${srcProf.roleDesc}</div>` : ''}
                ${statLine}
                <div class="tome-detail-desc">${intro}</div>
                ${mainSkillHtml}
              </div>
            </div>
            ${originHtml}
            ${skillsHtml}
            ${skillIntroHtml}
            ${evoSkillsHtml}
            ${passiveHtml}
            ${evoRoute}
            ${switcher}
            <div class="tome-detail-note">${pr.owned ? '✓ 你已习得此职业' : (pr.bp ? '习得途径：' + STATE.matName(pr.bp) + '（伏魔窟或隐藏剧情）' : '初始职业')}</div>
          </div>`;
        }
      } else if (kind === 'ming') {
        const m = App.allMingshenEntries().find(x => x.id === id);
        if (m) {
          title = m.name;
          const lore = (global.MING_LORE || {})[id] || '';
          // 共鸣组：若该命格属于某个共鸣组合，展示其联动
          const resGroups = (global.MINGSHEN_RESONANCE || []).filter(rg => (rg.need || []).indexOf(id) >= 0);
          const resHtml = resGroups.length ? resGroups.map(rg => {
            const haveCnt = rg.need.filter(n => (p.mingshen || []).some(mm => mm.id === n)).length;
            const status = haveCnt >= rg.need.length ? '已激活' : (haveCnt + '/' + rg.need.length);
            return `<div class="tome-detail-line">✦ 共鸣「${rg.name}」：${rg.need.map(n => { const nm = App.allMingshenEntries().find(x => x.id === n); return (nm ? nm.name : n) + (haveCnt >= rg.need.length ? ' ✓' : ''); }).join(' · ')}（${status}）——${rg.desc}</div>`;
          }).join('') : '';
          const mCol = (p.mingshen || []).some(mm => mm.id === id) || STATE.tomeSeenSet().has('MING:' + id);
          body = `<div class="tome-detail">
            <div class="tome-detail-hero">
              <div class="tome-detail-img tile" style="background:linear-gradient(180deg,#5a3a8a,#2a1a4a);display:flex;align-items:center;justify-content:center;color:#ffe9c0;font-size:36px;font-weight:800">${m.name.charAt(0)}</div>
              <div class="tome-detail-info">
                <div class="tome-detail-title">${m.name} <span class="tome-detail-tags" style="font-size:12px">${m.pool || ''}</span></div>
                <div class="tome-detail-tags">${mCol ? '✓ 已凝炼' : '未凝炼'}</div>
                <div class="tome-detail-line">⚙ 命格效果：${m.desc}</div>
                ${resHtml}
              </div>
            </div>
            ${lore ? `<div class="tome-detail-desc">📜 命格典故：${lore}</div>` : ''}
            <div class="tome-detail-note">命格在【开局 · 命格凝炼】与【家园 · 命格】中凝炼；凑齐共鸣组内全部命格可激活额外加成。</div>
          </div>`;
        }
      } else if (kind === 'ach') {
        const a = (global.ACHIEVEMENTS || []).find(x => x.id === id);
        if (a) {
          const lore = (global.ACH_LORE || {})[id] || '';
          const aDone = (() => { try { return (p.achievements || []).indexOf(a.id) >= 0 || (a.check ? a.check(p) : false); } catch (e) { return false; } })();
          const ACH_IMG2 = { 'hidden_taotian':'ach-taotian','hidden_wuyun':'ach-wuyun','hidden_true_end':'ach-truend','hidden_xinsheng_taiyang':'ach-xinsheng','hidden_yinianshen':'ach-yinianshen' };
          const aImg2 = ACH_IMG2[id];
          const achHero = aImg2 ? `<img class="tome-detail-img" src="assets/img/tome/${aImg2}.jpg" alt="${a.name}" onerror="this.style.display='none'">` : `<div class="tome-detail-img tile" style="background:linear-gradient(180deg,#2b1d12,#4a2c14);display:flex;align-items:center;justify-content:center;color:#ffd778;font-size:30px;font-weight:800;text-align:center;padding:6px">${a.name.charAt(0)}</div>`;
          title = a.name;
          body = `<div class="tome-detail">
            <div class="tome-detail-hero">
              ${achHero}
              <div class="tome-detail-info">
                <div class="tome-detail-title">${a.name} <span class="tome-detail-tags" style="font-size:12px">${a.hidden ? '隐藏成就' : (aDone ? '✓ 已达成' : '未达成')}</span></div>
                <div class="tome-detail-line">🎯 达成条件：${a.hidden && !aDone ? '隐藏成就，达成后揭晓' : (a.desc || '未知')}</div>
                <div class="tome-detail-line">✨ ${a.flavor || ''}</div>
              </div>
            </div>
            ${lore ? `<div class="tome-detail-desc"><b style="color:#5a3a1e">📜 成就典故</b><br>${lore}</div>` : ''}
            <div class="tome-detail-note">成就为全局记录，达成即永久收录于山海绘卷。</div>
          </div>`;
        }
      }
      if (!body) { body = '<div class="tome-detail">暂无详情。</div>'; }
      App.openBigModal(title || '详情', body, () => App.openTome(App._tomeTab), true);
      // 详情弹窗：右上角 × 返回绘卷上一级（而非直接全关整本绘卷）；仅总览/绘卷本体才真正关闭
      setTimeout(() => {
        const closeX = document.querySelector('#modal .modal-title-close');
        if (closeX) {
          closeX.onclick = () => { Engine.closeModal(); App.openTome(App._tomeTab); };
        }
        // 职业详情：绑定立绘切换器（本相 / 传承相）
        if (kind === 'prof') {
          document.querySelectorAll('[data-prof-portrait]').forEach(opt => {
            opt.onclick = () => {
              const newPref = opt.getAttribute('data-prof-portrait');
              if (!p._profPortrait) p._profPortrait = {};
              p._profPortrait[id] = newPref;
              try { Engine.sfx('click'); } catch (e) {}
              App.tomeDetail(kind, id);
            };
          });
        }
      }, 0);
    },

    /* ============== 技能/职业面板（右上角快捷入口） ============== */
    showSkillProfession() {
      const p = App.player;
      if (!p) { Engine.modal('技能/职业', '尚无玩家数据', [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]); return; }
      const info = STATE.getProfessionSkills(p);
      const profName = p.professionName || (info ? info.prof.name : '道徒');
      const offerInfo = STATE.getOfferUnlockedSkills(p);
      // 合并职业技能 + 已解锁神赐技能，便于解析 loadout 里的神赐技能名
      const mergedSkills = (info ? info.skills : []).concat(offerInfo.active || []);
      const loadout = p.skillLoadout || { actives: [], passive: null };
      const actives = (loadout.actives || []).map(id => {
        const sk = mergedSkills.find(x => x.id === id);
        return sk ? sk.name : id;
      }).join('、') || '（未配置）';
      // 解析被动名：__prof__ 为职业被动，否则查神赐被动
      let passiveStr = '（无）';
      if (loadout.passive) {
        if (loadout.passive === '__prof__' && info && info.passive) passiveStr = info.passive.name;
        else if (offerInfo.passive && offerInfo.passive.id === loadout.passive) passiveStr = offerInfo.passive.name;
        else passiveStr = loadout.passive;
      }
      const owned = (p.ownedProfessions || []).length ? '已转职：' + (p.ownedProfessions || []).join('、') : '（无隐藏职业）';
      const evo = STATE.getProfessionEvolution(p);
      const evoStr = (evo && evo.evolved) ? `<div class="panel-row"><span>职业进化</span><b class="panel-long">已进化（${evo.god.name}传承·全属性+8%）</b></div>` : '';
      const html = `<div class="panel-stats">
  <div class="panel-row"><span>当前职业</span><b>${profName}</b></div>
  <div class="panel-row"><span>出战主动</span><b class="panel-long">${actives}</b></div>
  <div class="panel-row"><span>出战被动</span><b>${passiveStr}</b></div>
  <div class="panel-row"><span>隐藏职业</span><b class="panel-long">${owned}</b></div>
  ${evoStr}
</div><div class="panel-tip">配置技能、切换职业可在家园【职业】中进行（战斗中配置下次战斗生效）。</div>`;
      Engine.modal('技能/职业', html, [
        { label:'配置技能', cls:'btn-secondary', fn:()=>{ Engine.closeModal(); App.goto('home_skill_config'); } },
        { label:'切换职业', cls:'btn-secondary', fn:()=>{ Engine.closeModal(); App.goto('home_profession'); } },
        { label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }
      ]);
    },

    /* ============== 好感度面板：展示NPC关系 ============== */
    showFavor() {
      const p = App.player;
      if (!p) { Engine.modal('好感', '尚无玩家数据', [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]); return; }
      const reg = STATE.getFavorRegistry();
      let rows = '';
      reg.forEach(r => {
        const v = STATE.getFavor(p, r.key);
        const lv = STATE.favorLevel(v);
        rows += `<div class="favor-row"><span class="favor-nat">${r.nation}</span><span class="favor-name">${r.name}</span><span class="favor-bar"><span class="favor-fill" style="width:${v}%;background:${lv.color}"></span></span><span class="favor-val" style="color:${lv.color}">${v} · ${lv.name}</span></div>`;
      });
      Engine.modal('好 感 度', `<div class="favor-list">${rows}</div><div class="panel-tip">NPC好感仅可通过剧情抉择提升，错过即无法挽回；好感影响结局与隐藏剧情。</div>`, [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]);
    },

    /* ============== 各国恶念值查看 ============== */
    showNationEvil() {
      const p = App.player;
      if (!p) { Engine.modal('恶念', '尚无玩家数据', [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]); return; }
      const nationNames = { qingqiu:'青丘', yumin:'羽民', yanhuo:'厌火', xuanyuan:'轩辕', xuangu:'玄股', huantou:'讙头', sanshou:'三首', nieer:'聂耳', daren:'大人', baimin:'白民', changgu:'长股', zhurao:'周饶', jiaojing:'交胫', rouli:'柔利', shenmu:'深目', wuchang:'无肠', yimu:'一目', jiexiong:'结胸', qizhong:'跂踵', guixu:'归墟' };
      let rows = '';
      Object.keys(nationNames).forEach(n => {
        const v = (p.nationEvil && p.nationEvil[n] != null) ? p.nationEvil[n] : 0;
        const st = STATE.nationState(p, n);
        const color = v >= 70 ? '#ff6b6b' : (v >= 40 ? '#ff9d3d' : (v >= 15 ? '#e8c24a' : '#8fd694'));
        rows += `<div class="favor-row"><span class="favor-nat">${nationNames[n]}</span><span class="favor-bar"><span class="favor-fill" style="width:${v}%;background:${color}"></span></span><span class="favor-val" style="color:${color}">${v} · ${st.name}</span></div>`;
      });
      Engine.modal('各 国 恶 念', `<div class="favor-list">${rows}</div><div class="panel-tip">恶念越高，该国越动荡（毁灭），探索风险越大、特殊灵材也随之变化。</div>`, [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]);
    },

    /* ============== [快速体验] 直接生成一个中后期角色，供老玩家快速体验游戏深度 ============== */
    debugSkipTutorial() {
      // 创建一个道徒玩家，境界/等级/宠物/供奉/剧情均跳级至中后期，让玩家立刻感受到战力与玩法深度
      App.player = STATE.create('tao', 'normal', '逍遥子');
      const p = App.player;

      // —— 境界：化神期（第5境），等级 Lv55（宽裕，可再突破渡劫） ——
      const realmName = '化神期';
      const realmLevel = 5;                 // 炼气1/筑基2/金丹3/元婴4/化神5/渡劫6/飞升7
      const realmMul = STATE.realmMultiplier(realmLevel);   // 3.4（数值膨胀后）
      p.realm = { name: realmName, level: realmLevel, exp: 0, expMax: 1400, round: 0 };
      p.lv = 55;
      // 按境界倍率放大基础属性（相对炼气期1.0），再乘职业系数，得到中后期战力
      p.baseLife = Math.floor(940 * realmMul);
      p.baseMp   = Math.floor(940 * realmMul);
      p.baseAtk  = Math.floor(130 * realmMul);
      p.baseDef  = Math.floor(55 * realmMul);
      p.hp = STATE.calcMaxHp(p);
      p.mp = STATE.calcMaxMp(p);

      // —— 命格（给几个实战强、带空值兜底的；覆盖全属性/攻防/暴击，爽度拉满） ——
      const pool = POOLS;
      const findTag = (poolTags, id) => poolTags.find(t => t.id === id) || poolTags[0];
      p.mingshen = [
        { ...findTag(pool.star.tags, 'guxing'), pool: 'star', poolName: pool.star.name },
        { ...findTag(pool.wuxing.tags, 'huoling'), pool: 'wuxing', poolName: pool.wuxing.name },
        { ...findTag(pool.daoxin.tags, 'yixian'), pool: 'daoxin', poolName: pool.daoxin.name },
        { ...findTag(pool.common.tags, 'wuwei'), pool: 'common', poolName: pool.common.name },
        { ...findTag(pool.yinguo.tags, 'qiyuan'), pool: 'yinguo', poolName: pool.yinguo.name }
      ];
      // 命格全升至满级（Lv5），进一步放大爽度
      p.mingshen.forEach(m => { m.level = 5; });

      // —— 灵宠：UR 云鲲（进化至终阶 + 高等级）+ SR 黄帝剑灵 ——
      const urPet = STATE.addPet(p, 'yunku', 'partner');
      if (urPet) {
        urPet.evoStage = Math.min(3, (urPet.evoLine || []).length - 1);   // 进化至终阶
        urPet.level = 60;                                                  // 高等级，战力可观
      }
      const srPet = STATE.addPet(p, 'huangdi', 'equal');
      if (srPet) { srPet.evoStage = 1; srPet.level = 45; }
      // 再补一只 SR 高等级灵宠（阵容更丰富）
      const srPet2 = STATE.addPet(p, 'wenyao', 'equal');
      if (srPet2) { srPet2.evoStage = 1; srPet2.level = 50; }
      p.activePet = urPet ? urPet.id : (srPet ? srPet.id : null);

      // —— 供奉：红日真君，供奉值 800（已解锁 4 项神技，接近圆满） ——
      p.offerGod = 'hongri';
      p.offerValue = 800;
      p.redeemCodes = ['hongri'];   // 兑换码视作已兑换，成就「新生太阳」自动成立
      const god = STATE.getGods().hongri;
      if (god) STATE.applyOfferBonus(p, god);

      // —— 剧情：通关前 6 国（青丘/羽民/厌火/轩辕/玄股/讙头），解锁对应探索区域 ——
      // 通关标记格式与 unlockedNations 判定一致：'{大写}_xxx_CLEARED'（青丘默认恒解锁）
      const clearedNations = ['yumin', 'yanhuo', 'xuanyuan', 'xuangu', 'huantou'];
      const upperMap = { yumin:'YUMIN', yanhuo:'YANHUO', xuanyuan:'XUANYUAN', xuangu:'XUANGU', huantou:'HUANTOU' };
      clearedNations.forEach(n => {
        p.completed.add(upperMap[n] + '_MAIN_DONE_CLEARED');
      });
      p._nationsCleared = clearedNations.length + 1;   // 含青丘
      // 当前定位在最新解锁国（讙头），便于继续推进主线
      STATE.enterNation(p, 'huantou');
      p.currentScene = 'huantou_entry';

      // —— 资源：金币与灵材、丹药充足，可直接体验炼丹/供奉/宠物培养 ——
      p.gold = 20000;
      p.materials = {
        'MAT-C01': 20, 'MAT-C02': 15, 'MAT-C05': 12, 'MAT-C03': 10, 'MAT-C06': 8, 'MAT-C07': 6, 'MAT-C08': 6,
        'SEED-C01': 5, 'SEED-C05': 5, 'SEED-C02': 3,
        'MAT-E01': 8, 'MAT-E02': 6, 'MAT-F01': 4, 'MAT-F02': 3,
        'MAT-INCENSE1': 5, 'MAT-INCENSE2': 3, 'MAT-INCENSE3': 2,
        'MAT-FS05': 4, 'MAT-YH05': 4, 'MAT-JG05': 4, 'MAT-XG05': 4, 'MAT-HT05': 4
      };
      p.pills = { 'xiaohuandan': 5, 'dahuandan': 3, 'huiling': 5, 'qingxin': 3, 'jindan': 2 };

      // 显示状态栏，直接进入家园（唯一自由行动），并弹出提示引导体验
      Engine.showStatus();
      Engine.refreshStatus(p);
      Engine.log('[快速体验] 已生成化神期角色「逍遥子」，境界/灵宠/供奉/剧情均已就绪，尽情体验山海的爽快与深度。', 'gold');
      Engine.toast('快速体验：化神期 · 高阶角色已就绪', 'gold');
      // 玩法驱动：开局后直接进入山海舆图，由玩家自行决定去处
      App.goto('home_explore');
    },

    /* ============== 新游戏 ============== */
    newGame() {
      App.player = null;
      App._pendingMode = 'story';        // 'story' 剧情 | 'challenge' 挑战
      App._pendingDifficulty = 'normal';
      App._pendingName = '';
      App._pendingChar = null;           // 选中的角色（null=自由命格）
      // 迁移旧版单槽位存档，并为新游戏分配空闲槽位（避免覆盖旧存档）
      try { SAVE.migrateLegacy(); } catch (e) {}
      try { SAVE.claimEmptySlot(); } catch (e) {}
      // 第一步：选择模式（剧情 / 挑战）
      Engine.setBg('assets/img/mingshen-stars.jpg');
      Engine.show('screen-mode');
      document.querySelectorAll('#screen-mode .diff-card').forEach(card => {
        card.onclick = () => {
          App._pendingMode = card.dataset.mode || 'story';
          if (App._pendingMode === 'challenge') {
            App.showChallengeSelect();
          } else {
            App.showDifficulty();
          }
        };
      });
    },

    /* ============== 难度选择（五档） ============== */
    showDifficulty() {
      Engine.setBg('assets/img/mingshen-stars.jpg');
      Engine.show('screen-difficulty');
      document.querySelectorAll('#screen-difficulty .diff-card').forEach(card => {
        card.onclick = () => {
          App._pendingDifficulty = card.dataset.diff || 'normal';
          App.showCharacterSelect();
        };
      });
    },

    /* ============== 角色选择（固定命格角色 / 自由命格） ============== */
    showCharacterSelect() {
      Engine.setBg('assets/img/mingshen-stars.jpg');
      Engine.show('screen-character');
      const wrap = document.getElementById('character-cards');
      const note = document.getElementById('character-note');
      if (!wrap) return;
      const chars = (global.CHARACTERS || []);
      const freeIds = (global.META && META.freeplayInfo) ? META.freeplayInfo().charIds : [];
      let html = '';
      // 自由命格卡片（放在最前，所有人可用）
      html += `<div class="char-card" data-char="free" data-playable="1">
        <span class="char-quality" style="background:#8a8a8a;color:#fff">自</span>
        <h3>自由命格</h3>
        <div class="char-title">以自述文字凝出五枚命格</div>
        <div class="char-story">不改初心，天意自定。你的过去由你书写，命运由选择塑造。</div>
      </div>`;
      chars.forEach(c => {
        const locked = c.locked;
        const isFree = freeIds.indexOf(c.id) >= 0;
        const owned = (global.META && META.hasChar) ? META.hasChar(c.id) : false;
        // locked 角色：一旦被剧情解锁（charDex 包含），立即变为可玩；否则不可选
        const playable = (isFree || owned);
        const lockHint = (locked && !owned) ? `<div class="char-locked-hint">${c.lockedHint || '暂未开放'}</div>`
          : (!playable ? `<div class="char-locked-hint">未拥有（每周限免或命签图鉴解锁）</div>` : '');
        const msText = (c.fixedMingshen && c.fixedMingshen.length)
          ? c.fixedMingshen.map(m => m.name).join('、')
          : '';
        html += `<div class="char-card ${playable ? '' : 'locked'}" data-char="${c.id}" data-playable="${playable ? 1 : 0}">
          <span class="char-quality q-${c.quality}">${c.quality}</span>
          <h3>${c.name}</h3>
          <div class="char-title">${c.title || ''}</div>
          ${msText ? `<div class="char-ms">命格：<b>${msText}</b></div>` : ''}
          <div class="char-story">${c.story || ''}</div>
          ${lockHint}
        </div>`;
      });
      wrap.innerHTML = html;
      if (note) note.textContent = '提示：黄阶角色藏有未来「人人如龙」的暗线线索；命签抽卡与每周限免可解锁更多角色。';
      wrap.querySelectorAll('.char-card').forEach(card => {
        card.onclick = () => {
          const playable = card.dataset.playable === '1';
          if (!playable) { Engine.sfx('click'); Engine.toast('该角色尚未解锁（限免或命签图鉴可获得）', 'evil'); return; }
          App._pendingChar = card.dataset.char;
          App.showNameInput();
        };
      });
    },

    /* ============== 姓名输入（难度之后、职业之前） ============== */
    showNameInput() {
      Engine.setBg('assets/img/mingshen-stars.jpg');
      Engine.show('screen-name');
      const input = document.getElementById('name-input');
      const hint = document.getElementById('name-hint');
      const go = document.getElementById('btn-name-go');
      if (input) { input.value = ''; input.focus(); }
      if (go) {
        go.onclick = () => {
          let name = (input ? input.value : '').trim();
          // 去空格、限制长度、默认名号
          name = name.replace(/\s+/g, '');
          if (name.length < 2) {
            if (hint) { hint.textContent = '名号至少 2 个字，请重新输入。'; hint.style.color = '#b13d2a'; }
            if (input) input.focus();
            return;
          }
          if (name.length > 8) name = name.slice(0, 8);
          App._pendingName = name;
          // 若选了固定命格角色，跳过职业选择（角色自带职业与命格）
          if (App._pendingChar && App._pendingChar !== 'free') {
            const char = global.getChar ? global.getChar(App._pendingChar) : null;
            App.chooseCharacter(char);
            return;
          }
          Engine.setBg('assets/img/nations/prof-tao.jpg');
          Engine.show('screen-profession');
          document.querySelectorAll('.prof-card').forEach(pc => {
            pc.onclick = () => App.chooseProfession(pc.dataset.prof);
          });
        };
      }
      // 回车确认
      if (input) {
        input.onkeydown = (e) => { if (e.key === 'Enter' && go) go.onclick(); };
      }
    },

    /* ============== 选择职业（自由命格） ============== */
    chooseProfession(profId) {
      App.player = STATE.create(profId, App._pendingDifficulty || 'normal', App._pendingName || '');
      // 应用多周目继承（图鉴点亮/抽命格次数/图纸）
      if (typeof STATE.applyLegacy === 'function') STATE.applyLegacy(App.player);
      // 进入命格抽取
      Engine.setBg('assets/img/mingshen-stars.jpg');
      Engine.show('screen-mingshen');
      // 字数计数
      const ta = document.getElementById('ms-text');
      const ct = document.getElementById('ms-count');
      ta.oninput = () => { ct.textContent = ta.value.length; };
      // 按钮
      document.getElementById('btn-mingshen-go').onclick = () => App.doMingshen(ta.value);
      document.getElementById('btn-mingshen-skip').onclick = () => App.doMingshen('');
    },

    /* ============== 选择固定命格角色（自带职业+固定命格） ============== */
    chooseCharacter(char) {
      if (!char) { App.showCharacterSelect(); return; }
      // 角色默认职业：道徒（可后续转职），固定命格替代自由抽取
      const profId = 'tao';
      App.player = STATE.create(profId, App._pendingDifficulty || 'normal', App._pendingName || '');
      // 用角色名覆盖角色面板显示的背景身份
      App.player.charId = char.id;
      App.player.charName = char.name;
      App.player.charQuality = char.quality;
      // 应用多周目继承
      if (typeof STATE.applyLegacy === 'function') STATE.applyLegacy(App.player);
      // 固定命格：从命格库中解析出完整 mod 数据
      App.player.mingshen = App.resolveCharMingshen(char);
      App.player.background = char.story || '';
      // 直接进入命格结果展示（固定命格，无需输入文字）
      Engine.sfx('mingshen');
      App.showMingshenResult(true);
    },

    /* 将角色的固定命格 id 映射为完整命格对象（含 mod） */
    resolveCharMingshen(char) {
      const po = global.POOLS || {};
      const result = [];
      (char.fixedMingshen || []).forEach(fm => {
        let found = null;
        for (const pk in po) {
          const tag = (po[pk].tags || []).find(t => t.id === fm.id);
          if (tag) { found = { ...tag, pool: pk, poolName: po[pk].name, level: 1 }; break; }
        }
        if (found) result.push(found);
        else result.push({ id: fm.id, name: fm.name, pool: 'star', poolName: '命格星宿', mod: {}, level: 1 });
      });
      return result;
    },

    /* ============== 命格抽取算法 ============== */
    doMingshen(text) {
      const p = App.player;
      p.background = (text || '').trim();
      p.mingshen = App.drawMingshen(p.background);
      try { (p.mingshen || []).forEach(m => STATE.recordTome(p, 'MING:' + (m.id || m))); } catch (e) {}   // 绘卷：抽到过即永久收录
      Engine.sfx('mingshen');
      App.showMingshenResult();
    },

    /**
     * 命格抽取算法（5枚）
     * 1. 关键词匹配 → 计算各方向池得分
     * 2. 排序：高分的方向池优先抽取1个标签（最多3个方向池）
     * 3. 不足5个：从全库（含通用）随机补足
     * 4. 去重 + 互斥处理
     */
    drawMingshen(text) {
      const TAG_COUNT = 5;
      const allTags = [];
      for (const k in POOLS) {
        for (const t of POOLS[k].tags) {
          allTags.push({ ...t, pool: k, poolName: POOLS[k].name });
        }
      }
      const textLen = (text || '').trim().length;
      // 空白处理：<10 字或纯符号 → 全部随机
      if (textLen < 10 || /^[\d\s\p{P}]+$/u.test(text)) {
        return RNG.uniqueSample(allTags, TAG_COUNT, t => t.id, 15);
      }
      // 关键词打分
      const scores = RNG.scorePools(text, POOL_KEYWORDS);
      const ranked = RNG.rankPools(scores).filter(x => x.score > 0);
      // 抽取 0~3 个方向池，每池抽 1 个
      const chosen = [];
      const usedIds = new Set();
      const usedPools = new Set();
      const poolsToPick = Math.min(3, ranked.length);
      for (let i = 0; i < poolsToPick; i++) {
        const poolName = ranked[i].name;
        const pool = POOLS[poolName];
        if (!pool) continue;
        const avail = pool.tags.filter(t => !usedIds.has(t.id));
        if (avail.length === 0) continue;
        const pick = RNG.pick(avail);
        chosen.push({ ...pick, pool: poolName, poolName: pool.name });
        usedIds.add(pick.id);
        usedPools.add(poolName);
      }
      // 随机补足（含通用标签）
      while (chosen.length < TAG_COUNT) {
        const remain = allTags.filter(t => !usedIds.has(t.id));
        if (remain.length === 0) break;
        // 通用标签占比 ≤ 2
        const commonCount = chosen.filter(t => t.pool === 'common').length;
        let pool = remain;
        if (commonCount >= 2) pool = remain.filter(t => t.pool !== 'common');
        // 兜底：过滤后若为空（剩余全为通用标签），回退到 remain 避免 pick(null) 崩溃
        if (pool.length === 0) pool = remain;
        const pick = RNG.pick(pool);
        chosen.push({ ...pick, pool: pick.pool, poolName: POOLS[pick.pool].name });
        usedIds.add(pick.id);
      }
      // 互斥处理：去掉后续冲突标签
      const filtered = [];
      for (const t of chosen) {
        let conflict = false;
        for (const prev of filtered) {
          for (const pair of MUTEX) {
            if ((pair[0] === t.id && pair[1] === prev.id) ||
                (pair[1] === t.id && pair[0] === prev.id)) {
              conflict = true; break;
            }
          }
          if (conflict) break;
        }
        if (!conflict) filtered.push(t);
      }
      // 如果互斥剔除后不足5个，补充（补充时同样做互斥过滤，避免补入冲突命格）
      const isConflict = (t, arr) => arr.some(prev =>
        MUTEX.some(pair => (pair[0] === t.id && pair[1] === prev.id) || (pair[1] === t.id && pair[0] === prev.id)));
      while (filtered.length < TAG_COUNT) {
        const remain = allTags.filter(t => !usedIds.has(t.id) && !isConflict(t, filtered));
        if (remain.length === 0) break;
        const pick = RNG.pick(remain);
        filtered.push({ ...pick, pool: pick.pool, poolName: POOLS[pick.pool].name });
        usedIds.add(pick.id);
      }
      return filtered.slice(0, TAG_COUNT);
    },

    /* ============== 命格结果显示 ============== */
    showMingshenResult(isChar) {
      const p = App.player;
      // 文案
      const desc = document.getElementById('ms-desc');
      const round = p.round || 1;
      const roundLine = round > 1 ? `<div style="color:#d4a017;font-weight:700;margin-top:6px;">🔄 第 ${round} 周目：前世山河铭记于心，此世开局有所助益（金币/灵种/灵香随周目递增）。</div>` : '';
      if (isChar && p.charName) {
        desc.innerHTML = `你以【<strong>${p.charName}</strong>】之身踏入山海，其先天命格早已注定：${roundLine}`;
      } else if (!p.background || p.background.length < 10) {
        desc.innerHTML = '你未曾言说过去——天道便以<strong>纯随机</strong>之法为你铸就命格。' + roundLine;
      } else {
        desc.innerHTML = '自你字里行间，天道凝出以下<strong>五枚命格</strong>：' + roundLine;
      }
      // 标签
      const tags = document.getElementById('ms-tags');
      tags.innerHTML = '';
      p.mingshen.forEach((m, idx) => {
        const el = document.createElement('div');
        el.className = 'ms-tag';
        el.style.animationDelay = (idx * 0.12) + 's';
        el.innerHTML = `
          <div class="ms-tag-name">${m.name}</div>
          <div class="ms-tag-pool">【${m.poolName}】</div>
          <div class="ms-tag-desc">${m.desc}</div>
        `;
        tags.appendChild(el);
      });
      // 按钮：固定命格角色不可重抽
      const rerollBtn = document.getElementById('btn-mingshen-reroll');
      if (isChar) {
        if (rerollBtn) { rerollBtn.disabled = true; rerollBtn.textContent = '命 格 已 定'; }
      } else {
        if (rerollBtn) { rerollBtn.disabled = false; rerollBtn.textContent = '不 满 · 重 抽'; }
        rerollBtn.onclick = () => App.doMingshen(p.background);
      }
      document.getElementById('btn-mingshen-accept').onclick = () => App.acceptMingshen();

      Engine.show('screen-mingshen-result');
    },

    acceptMingshen() {
      const p = App.player;
      if (p.charId) STATE.recordTome(p, 'CHAR:' + p.charId);   // 绘卷：记录出生角色
      // 绘卷全局入册：凝出的命格永久收录
      try { (p.mingshen || []).forEach(m => STATE.recordTome(p, 'MING:' + (m.id || m))); } catch (e) {}
      // 标记角色游玩（供每周任务「本周游玩」判定）
      try { if (typeof META !== 'undefined' && META.markPlayed) META.markPlayed(SAVE.activeSlot()); } catch (e) {}
      // 进入游戏时检测一次成就（兑换码类成就在此兜底结算）
      try {
        if (typeof STATE.checkAchievements === 'function') {
          const newly = STATE.checkAchievements(p, {});
          if (newly.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newly);
        }
      } catch (e) { /* 忽略成就检测异常 */ }
      // 显示状态栏，进入青丘
      Engine.showStatus();
      Engine.refreshStatus(p);
      STATE.enterNation(p, 'qingqiu');
      // V1.3.19：剧情新档启用新手引导（修炼→战斗→探索→存档 闭环）
      try {
        if (!p.challengeId && p._tutorial === undefined) {
          p._tutorial = 0;
          Engine.toast('【新手引导】先去家园【修炼】打坐，提升修为。', 'gold');
        }
      } catch (e) {}
      // 开篇剧情：优先走点触化主线（玩法驱动：点人对话推进剧情）
      if (typeof EXPLORE !== 'undefined' && EXPLORE.qingqiu && EXPLORE.qingqiu.story) {
        App.enterStory('qingqiu');
      } else {
        App.runScene('opening');
      }
    },

    /* ============== 场景调度 ============== */
    goto(sceneId) {
      if (sceneId === 'title') {
        Engine.hideStatus();
        Engine.setBg(App.getTitleBg());
        Engine.show('screen-title');
        AudioMgr.switch('peaceful');
        try { App.refreshMingDisplay(); } catch (e) {}
        try { App.refreshTitleProgress(); } catch (e) {}
        return;
      }
      App.runScene(sceneId);
    },

    runScene(sceneId) {
      // 全游戏统一为「唯一家园」：所有国家的自由行动（_free 及其子场景）统一重定向到家园
      // 涵盖 qingqiu_free / yumin_free / yanhuo_free ... guixu_free 等 20 国，以及各自的 _free_ 子场景
      if (sceneId && (sceneId === 'qingqiu_free' || /^[a-z]+_free(_|$)/.test(sceneId))) {
        App.goto('home');
        return;
      }
      // 进入某国入口场景时，自动切换国家状态（避免 p.nation 失同步导致就寝/掉落/恶念归属错乱）
      if (App.player && sceneId && sceneId.endsWith('_entry')) {
        const nat = sceneId.slice(0, -6);   // 去掉 '_entry'
        if (STATE.enterNation && nat && nat !== 'home') {
          STATE.enterNation(App.player, nat);
          // 前情提要：进入该国时回顾此前剧情，帮助隔日续玩快速接回
          const recap = STATE.nationRecap ? STATE.nationRecap(nat) : '';
          if (recap) {
            // 用集合记录已提示过的场景，避免同一国家重复刷屏，但不同国家都会正常提示
            if (!App._recapShown) App._recapShown = new Set();
            if (!App._recapShown.has(sceneId)) {
              App._recapShown.add(sceneId);
              Engine.log(`<span class="react-tag">【前情】</span>${recap}`, 'flavor');
            }
          }
        }
      }
      // 记录当前场景（供存档/读档恢复进度；只存稳定场景：剧情节点、国家自由行动主菜单）
      // 排除：虚拟场景、家园子场景、国家自由行动子场景（如 yumin_free_rest 等动态过程场景）
      if (App.player && sceneId && sceneId !== '__free_newday'
          && sceneId.indexOf('home') !== 0
          && sceneId.indexOf('_free_') < 0) {
        // 记录"上一个稳定场景"（用于战斗失败后回退到战斗前，避免直接再触发战斗）
        if (App.player.currentScene && App.player.currentScene !== sceneId) {
          App.player._prevScene = App.player.currentScene;
        }
        App.player.currentScene = sceneId;
      }
      // 特殊处理：自由行动"就寝后进入新一天"（统一返回唯一家园）
      if (sceneId === '__free_newday') {
        if (App.player) {
          const harvest = STATE.newDay(App.player);
          if (harvest && harvest.ready && harvest.ready.length) {
            Engine.log('灵圃作物已成熟：' + harvest.ready.join('、') + '，记得去【种植】收获。', 'good');
          } else if (harvest && harvest.grown && harvest.grown.length) {
            Engine.log('新的一天开始了，灵圃中的' + harvest.grown.join('、') + '长势良好。', 'system');
          } else {
            Engine.log('新的一天开始了', 'system');
          }
        }
        App.goto('home');
        return;
      }

      // 四凶终章（归墟篇）：祖师赐福动态场景 + 四凶战触发
      if (sceneId === 'fourfierce_bless_check') {
        const p = App.player;
        // 供奉未满1000：无祖师赐福，直接开战；满1000：先选额外技能
        if (p && (p.offerValue || 0) >= 1000) {
          const sc = App.buildFourFierceBless();
          Engine.enterScene(sc);
        } else {
          App.startFourFierce();
        }
        Engine.refreshStatus(p);
        return;
      }
      if (sceneId === 'fourfierce_taotie' || sceneId === 'fourfierce_taowu' || sceneId === 'fourfierce_qiongqi' || sceneId === 'fourfierce_hundun') {
        // 四凶战场景：渲染文本后由 fourFierceNext 启动对应阶段战斗
        const raw = (global.ALL_SCENES && ALL_SCENES[sceneId]) || QINGQIU_SCENES[sceneId];
        let scene = (typeof raw === 'function') ? raw() : raw;
        scene.options = [];   // 四凶战无手动选项，战斗自动进行
        Engine.enterScene(scene);
        Engine.refreshStatus(App.player);
        AudioMgr.playForScene(sceneId);
        // 根据场景决定当前四凶阶段并启动战斗
        const stageMap = { fourfierce_taotie: 0, fourfierce_taowu: 1, fourfierce_qiongqi: 2, fourfierce_hundun: 3 };
        if (App.player) App.player.fourFierceStage = stageMap[sceneId];
        App.fourFierceNext(App.player);
        return;
      }
      // 隐藏 BOSS「混沌本相」战
      if (sceneId === 'fourfierce_hidden_boss_start') {
        const p = App.player;
        const getChaos = (typeof global.getChaosBoss === 'function') ? global.getChaosBoss : null;
        if (!p || !getChaos) { App.goto('home'); return; }
        const enemy = getChaos(p);
        App.startChaosBossBattle(p, enemy);
        return;
      }

      // 挑战模式：营地（动态场景，V1.3.11 与剧情家园一致：左侧属性面板 + 右侧方框选项）
      if (App.player && App.player.challengeId && sceneId.indexOf('challenge_prepare_') === 0) {
        App.challengeAutosave(true);   // V1.3.18：进营地自动存档（只写我的挑战槽/空闲槽）
        const sc = App.buildChallengeScene(App.player.challengeId);
        if (sc && sc.homeStats) Engine.renderHome(sc); else Engine.enterScene(sc);
        Engine.refreshStatus(App.player);
        return;
      }
      if (sceneId === 'challenge_adventure_battle') {
        const sc = App.buildChallengeAdventureBattle();
        if (sc && sc.battle) {
          Engine.enterScene(sc);
          Engine.refreshStatus(App.player);
          App.handleBattle(sc.battle);
        } else {
          App.goto('challenge_prepare_' + (App.player && App.player.challengeId || ''));
        }
        return;
      }
      // 挑战前置剧情（V1.3.11：开场多段故事，最后进入营地）
      if (sceneId.indexOf('ch_prologue_') === 0 && App.player && App.player.challengeId) {
        const rest = sceneId.replace('ch_prologue_', '');
        const step = parseInt(rest.slice(rest.lastIndexOf('_') + 1), 10) || 1;
        const cid = App.player.challengeId;
        const sc = App.buildChallengePrologue(cid, step);
        if (sc) {
          Engine.enterScene(sc);
          Engine.refreshStatus(App.player);
          return;
        }
        // 剧情缺失则直接进营地
        App.goto('challenge_prepare_' + cid);
        return;
      }
      // 挑战限时失败结算（v1.3.8）
      if (sceneId === 'challenge_fail') {
        const sc = App.buildChallengeFail();
        Engine.enterScene(sc);
        Engine.refreshStatus(App.player);
        return;
      }
      // 挑战子场景（V1.3.9：修炼/充能/突破/探索/锻造/休息/任务/就寝，ch_* 前缀独立分发）
      if (sceneId === 'ch_explore') {
        // V1.3.15：挑战国家 = 城池点触探索（复用剧情探索屏，点触 NPC 对话·选择驱动）
        App.showChallengeExplore();
        return;
      }
      if (sceneId === 'ch_cultivate' || sceneId === 'ch_charge' || sceneId === 'ch_break' ||
          sceneId === 'ch_forge' || sceneId === 'ch_rest' ||
          sceneId === 'ch_tasks' || sceneId === 'ch_sleep' || sceneId === 'ch_daily' ||
          sceneId === 'ch_store' || sceneId === 'ch_intel' || sceneId === 'ch_tome' || sceneId === 'ch_save' ||
          sceneId === 'ch_awaken' ||
          sceneId.indexOf('ch_region_') === 0 || sceneId.indexOf('ch_npc_') === 0 || sceneId.indexOf('ch_event_') === 0 ||
          sceneId.indexOf('ch_merchant_') === 0 || sceneId.indexOf('ch_hidden_') === 0) {
        const sc = App.buildChallengeSubScene(sceneId);
        if (sc) {
          Engine.enterScene(sc);
          Engine.refreshStatus(App.player);
          return;
        }
        // 未识别子场景：回营地兜底
        App.goto('challenge_prepare_' + (App.player && App.player.challengeId || ''));
        return;
      }

      // 挑战模式下：家园各场景重定向到挑战营地（V1.3.11 与剧情家园一致，renderHome 左侧属性+右侧选项）
      if (App.player && App.player.challengeId && !App.player.challengeCleared) {
        if (sceneId === 'home' || sceneId === 'home_sleep' || sceneId.indexOf('home_') === 0) {
          App.challengeAutosave(true);   // V1.3.18：挑战模式下进入家园各入口同样自动存档
          const sc = App.buildChallengeScene(App.player.challengeId);
          if (sc) {
            if (sc.homeStats) Engine.renderHome(sc); else Engine.enterScene(sc);
            Engine.refreshStatus(App.player);
            return;
          }
        }
      }

      // 每日事务（每日目标 + 委托板 合版，独立渲染器）
      if (sceneId === 'home_daily') {
        App.renderDailyBoard(App.player);
        if (App.player) Engine.refreshStatus(App.player);
        AudioMgr.switch('peaceful');
        return;
      }

      // 家园系统（常驻）：home / home_xxx 各子场景
      if (sceneId === 'home' || sceneId === 'home_cultivate' || sceneId === 'home_pet' || sceneId === 'home_refine' || sceneId === 'home_break'
          || sceneId === 'home_daily'
          || sceneId === 'home_explore' || sceneId === 'home_plant' || sceneId === 'home_fumo' || sceneId === 'home_profession'
          || sceneId === 'home_explore_go' || sceneId === 'home_fumo_go' || sceneId === 'home_fumo_battle' || sceneId === 'home_wild_battle'
          || sceneId === 'home_fumo_resolve_1' || sceneId === 'home_fumo_resolve_2' || sceneId === 'home_fumo_resolve_3'
          || sceneId === 'home_market' || sceneId === 'home_commission' || sceneId === 'home_skill_config'
          || sceneId === 'home_daoxin' || sceneId === 'home_daoxin_result'
          || sceneId === 'home_offer' || sceneId === 'home_sleep'
          || sceneId === 'home_char_quest'
          || sceneId === 'home_tower' || sceneId === 'home_tower_battle' || sceneId === 'home_tower_choice' || sceneId === 'home_tower_end') {
        // 进入家园主场景时自动保存到当前活动槽位（已有则覆盖，不会占满槽位）
        if (sceneId === 'home' && App.player) {
          try { SAVE.autosave(App.player); } catch (e) { /* 忽略自动保存异常 */ }
          // 进入家园时全量检测成就（探索/收集/宠物/供奉等累计型成就在此结算）
          try {
            if (typeof STATE.checkAchievements === 'function') {
              const newly = STATE.checkAchievements(App.player, {});
              if (newly.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newly);
            }
          } catch (e) { /* 忽略成就检测异常 */ }
        }
        let homeScene;
        if (sceneId === 'home_cultivate') homeScene = App.buildHomeCultivate();
        else if (sceneId === 'home_daily') homeScene = App.buildHomeDaily();
        else if (sceneId === 'home_pet') homeScene = App.buildHomePet();
        else if (sceneId === 'home_refine') homeScene = App.buildHomeRefine();
        else if (sceneId === 'home_break') homeScene = App.buildHomeBreak();
        else if (sceneId === 'home_explore') homeScene = App.buildHomeExplore();
        else if (sceneId === 'home_plant') homeScene = App.buildHomePlant();
        else if (sceneId === 'home_fumo') homeScene = App.buildHomeFumo();
        else if (sceneId === 'home_profession') homeScene = App.buildHomeProfession();
        else if (sceneId === 'home_explore_go') homeScene = App.buildHomeExploreGo();
        else if (sceneId === 'home_explore_order') homeScene = App.buildHomeExploreOrder();
        else if (sceneId === 'home_fumo_go') homeScene = App.buildHomeFumoGo();
        else if (sceneId === 'home_fumo_battle') homeScene = App.buildHomeFumoBattle();
        else if (sceneId === 'home_wild_battle') homeScene = App.buildHomeWildBattle();
        else if (sceneId === 'home_fumo_resolve_1') homeScene = App.buildHomeFumoResolve(1);
        else if (sceneId === 'home_fumo_resolve_2') homeScene = App.buildHomeFumoResolve(2);
        else if (sceneId === 'home_fumo_resolve_3') homeScene = App.buildHomeFumoResolve(3);
        else if (sceneId === 'home_market') homeScene = App.buildHomeMarket();
        else if (sceneId === 'home_commission') homeScene = App.buildHomeCommission();
        else if (sceneId === 'home_skill_config') homeScene = App.buildHomeSkillConfig();
        else if (sceneId === 'home_daoxin') homeScene = App.buildHomeDaoxin();
        else if (sceneId === 'home_daoxin_result') homeScene = App.buildHomeDaoxinResult();
        else if (sceneId === 'home_offer') homeScene = App.buildHomeOffer();
        else if (sceneId === 'home_sleep') homeScene = App.buildHomeSleep();
        else if (sceneId === 'home_char_quest') homeScene = App.buildHomeCharQuest();
        else if (sceneId === 'home_char_battle') homeScene = App.buildHomeCharBattle();
        else if (sceneId === 'home_tower') homeScene = App.buildHomeTower();
        else if (sceneId === 'home_tower_battle') homeScene = App.buildHomeTowerBattle();
        else if (sceneId === 'home_tower_choice') homeScene = App.buildHomeTowerChoice();
        else if (sceneId === 'home_tower_end') homeScene = App.buildHomeTowerEnd();
        else homeScene = App.buildHomeScene();
        // 家园主场景用方框界面（左侧属性+右侧选项）；子场景用文字界面
        homeScene.instant = true;
        // 职业面板也走 renderHome（左侧职业立绘 + 右侧方框选项）
        if (sceneId === 'home' || sceneId === 'home_explore' || sceneId === 'home_market' || sceneId === 'home_offer' || sceneId === 'home_profession' || sceneId === 'home_skill_config') {
          Engine.renderHome(homeScene);
        } else {
          Engine.enterScene(homeScene);
        }
        Engine.refreshStatus(App.player);
        AudioMgr.switch('peaceful');
        if (homeScene.battle) App.handleBattle(homeScene.battle);
        return;
      }

      // 从统一国家场景注册表查找（QINGQIU_SCENES 作为回退）
      let raw = (global.ALL_SCENES && ALL_SCENES[sceneId]) || QINGQIU_SCENES[sceneId];
      if (!raw) {
        Engine.modal('错误', `场景 "${sceneId}" 不存在`, [{ label:'返回', cls:'btn-primary', fn:() => Engine.closeModal() }]);
        return;
      }
      // 动态场景：函数形式，调用得到场景对象
      let scene = (typeof raw === 'function') ? raw() : raw;
      Engine.enterScene(scene);
      Engine.refreshStatus(App.player);
      // 背景音乐随场景氛围切换
      AudioMgr.playForScene(sceneId);

      // 统一战斗调度：场景定义了 battle 配置则启动对应战斗
      // （支持任意场景带 battle 配置，青丘堕影狐王、羽民混沌风魔等通用）
      if (scene.battle) {
        App.handleBattle(scene.battle);
      }
      // 心魔试炼战斗（动态，由 buildHeartDemonScene 场景触发）
      if (sceneId === 'battle_heart_demon') {
        App.handleHeartDemon();
      }
      // 隐藏任务触发判断（机关命格 + 墨家遗迹）
      if (sceneId === 'q01_02_accept') {
        App.checkHiddenQuest();
      }
    },

    /* ============== 战斗调度（从场景 battle 配置读取） ============== */
    handleBattle(battleConfig) {
      const p = App.player;
      // 主线/剧情战斗难度系数：主线Boss需玩家通过日常修炼+探险变强后挑战
      const enemy = { ...battleConfig.enemy };
      if (!battleConfig.isWild) {
        // 剧情Boss额外强化系数，随等级温和收敛：低等级Boss保持原有强度，高等级Boss避免血量过度膨胀
        const lv = enemy.lv || 1;
        const hpConverge = 1.35 / (1 + 0.15 * (lv / 20));   // lv越高，hp额外系数越低
        enemy.hp = Math.floor(enemy.hp * hpConverge);
        enemy.atk = Math.floor(enemy.atk * 1.25);
        enemy.def = Math.floor(enemy.def * 1.2);
        // 剧情Boss等级上限80（四凶终章例外，通过 specialLv 标记保留100级）
        if (!battleConfig.isFourFierce) enemy.lv = Math.min(80, enemy.lv);
      }
      // 游戏难度系数（简单0.5/正常1.0/困难1.5）
      const diffMul = (p && p.diffMul) ? p.diffMul : 1.0;
      enemy.hp = Math.floor(enemy.hp * diffMul);
      enemy.atk = Math.floor(enemy.atk * diffMul);
      enemy.def = Math.floor(enemy.def * diffMul);
      // 偷袭先手：传递给战斗（玩家初始能量 + 敌人首回合破绽）
      if (battleConfig.ambush) enemy.ambush = true;
      // 记录战斗前场景：优先用"上一个稳定场景"（战斗前剧情场景），其次战斗配置的 back 字段
      if (p) p._battleBack = p._prevScene || battleConfig.back || null;
      setTimeout(() => {
        // 挑战模式：战败/逃离不回家园，而是回到挑战入口场景可重试
        const isChallenge = !!(p && p.challengeId);
        Battle.start(p, enemy, {
          // 胜利：执行 onWin 后推进剧情。onWin 可返回场景 id 以动态决定结局走向（支持三路线分发）
          win: () => {
            let override = null;
            if (battleConfig.onWin) override = battleConfig.onWin(p);
            // 战斗胜利：点触主线的战斗回退点已不需要（已通过战斗），清除避免残留
            if (p._battleBackStory) delete p._battleBackStory;
            // 兜底场景改为 home（不再静默跳到青丘结局，避免跨国家错误跳转）
            const winTarget = override || battleConfig.after;
            if (!winTarget) Engine.log('（战斗胜利，但未配置结算场景，已返回家园）', 'system');
            App.goto(winTarget || 'home');
          },
          // 战败：死亡 → 气血归1（奄奄一息），回常驻家园休养（可反复提升后再战）；挑战模式回到挑战入口
          lose: () => {
            p.hp = 1;
            p.debuffs = [];
            // 清理战斗状态残留（与 flee 一致），避免下次战斗沿用旧状态
            delete p._ambushBonus;
            if (p._pendingEnemy) p._pendingEnemy = null;
            // 战败后回退到战斗前场景，避免「返回剧情」直接触发战斗
            if (p._battleBack) p.currentScene = p._battleBack;
            if (isChallenge) {
              Engine.log('你败了，但凡人的执念让你重新站起。', 'evil');
              if (battleConfig.onLose) battleConfig.onLose(p);
              App.retryChallenge(battleConfig);
            } else {
              Engine.log('你重伤昏迷，醒来时已回到家园洞府，只剩一丝气息……', 'evil');
              if (battleConfig.onLose) battleConfig.onLose(p);
              App.goto('home');
            }
          },
          // 逃离：不推进剧情结局，回到家园（避免绕过必打战斗直接拿结局）；挑战模式回到挑战入口
          flee: () => {
            // 清理战斗状态残留（偷袭标记/待战敌人），避免下次战斗沿用旧状态
            delete p._ambushBonus;
            if (p._pendingEnemy) p._pendingEnemy = null;
            if (battleConfig.onFlee) battleConfig.onFlee(p);
            p.hp = Math.max(1, p.hp);
            // 逃离后也回退到战斗前场景
            if (p._battleBack) p.currentScene = p._battleBack;
            if (isChallenge) {
              Engine.log('你暂避锋芒，休整后再战。', 'system');
              App.retryChallenge(battleConfig);
            } else if (battleConfig.fleeAfter) {
              // 特定场景逃离回退目标（如伏魔窟：逃离后回魔窟继续探索）
              Engine.log('你趁隙脱身，退回安全处。', 'system');
              App.goto(battleConfig.fleeAfter);
            } else {
              Engine.log('你脱离战斗，退回家园休整。', 'system');
              App.goto('home');
            }
          }
          // 注意：不传 after，避免 end() 的 setTimeout 再跳一次，覆盖 lose/flee 的回家园
        });
      }, 800);
    },

    /* 挑战模式战败/逃离：回到挑战入口场景重试 */
    retryChallenge(battleConfig) {
      const p = App.player;
      if (!p) return;
      // 恢复到挑战入口（重新渲染首个挑战场景；V1.3.17：营地用 renderHome 保持左侧属性+右侧选项排版）
      const sc = App.buildChallengeScene(p.challengeId);
      if (sc) { if (sc.homeStats) Engine.renderHome(sc); else Engine.enterScene(sc); Engine.refreshStatus(p); }
      else { App.goto('title'); }
    },

    /* ============== 隐藏 BOSS「混沌本相」战 ============== */
    startChaosBossBattle(p, enemy) {
      if (!p || !enemy) { App.goto('home'); return; }
      const diffMul = (p.diffMul !== undefined ? p.diffMul : 1.0);
      // 隐藏 BOSS 不受常规剧情 Boss 等级上限限制（120级），也不叠加剧情强化（数据已定）
      const foe = { ...enemy };
      foe.hp = Math.floor(foe.hp * diffMul);
      foe.atk = Math.floor(foe.atk * diffMul);
      foe.def = Math.floor(foe.def * diffMul);
      setTimeout(() => {
        Battle.start(p, foe, {
          win: () => {
            Engine.log('混沌本相崩解！真正的「问道」之终，已然圆满。', 'gold');
            App.goto('fourfierce_true_end');
          },
          lose: () => {
            p.hp = 1;
            p.debuffs = [];
            Engine.log('你在混沌本相面前倒下，被一股温和的力量送回了家园……（可再战）', 'evil');
            App.goto('home');
          },
          flee: () => {
            p.hp = Math.max(1, p.hp);
            Engine.log('你暂避锋芒，退回家园休整。', 'system');
            App.goto('home');
          }
        });
      }, 800);
    },

    /* ============== 祖师赐福选择（供奉1000·仅限四凶终章） ============== */
    buildFourFierceBless() {
      const p = App.player;
      if (!p) return { id:'fourfierce_bless_check', title:'祖师赐福', bg:'assets/img/nations/qing-fog-abyss.jpg', text:'无角色', options:[{label:'返回', next:'home'}] };
      const info = STATE.getProfessionSkills(p);
      const offerInfo = STATE.getOfferUnlockedSkills(p);
      const merged = (info ? info.skills : []).concat(offerInfo.active || []);
      const loadout = p.skillLoadout || { actives: [] };
      const equipped = loadout.actives || [];
      // 已选额外技能（祖师赐福）
      const bless = p._fourFierceBlessSkills || (p._fourFierceBlessSkills = []);
      // 可选额外技能：未装备的主动技能（含神赐）+ 奥义/普攻之外的
      const candidates = merged.filter(sk => sk.type !== 'basic' && equipped.indexOf(sk.id) < 0 && bless.indexOf(sk.id) < 0);
      const opts = [];
      candidates.slice(0, 8).forEach(sk => {
        opts.push({ label: '【加持】' + sk.name + '（' + sk.type + '·' + sk.element + '）', tag: '赐福',
          onChoose: (pl) => {
            const b = pl._fourFierceBlessSkills || (pl._fourFierceBlessSkills = []);
            if (b.length >= 3) { Engine.log('祖师赐福最多加持 3 个技能。', 'evil'); return; }
            if (b.indexOf(sk.id) < 0) b.push(sk.id);
            Engine.log('祖师虚影为你加持【' + sk.name + '】！', 'gold');
          }, next: 'fourfierce_bless_check' });
      });
      opts.push({ label: '【准备完毕】迎战四凶', tag: '决战', onChoose: (pl) => { App.startFourFierce(); }, next: null });
      opts.push({ label: '（放弃祖师赐福，直接迎战）', tag: '决战', onChoose: (pl) => { App.startFourFierce(); }, next: null });
      return { id:'fourfierce_bless_check', title:'【祖师赐福】', bg:'assets/img/nations/qing-fog-abyss.jpg',
        text:`你虔诚供奉的祖师神念降临，愿在最终之战中助你一臂之力。\n\n可从以下技能中[highlight]额外加持最多3个[/highlight]（仅限本次四凶终章使用，不占用出战配置名额）：\n\n已加持：${bless.length ? bless.map(id => { const s = merged.find(x => x.id === id); return s ? s.name : id; }).join('、') : '（无）'}\n\n（加持的技能将在四凶战中临时加入你的技能栏）`,
        options: opts };
    },

    /* ============== 四凶连战调度（饕餮→梼杌→穷奇→混沌，状态不重置） ============== */
    startFourFierce() {
      const p = App.player;
      if (!p) return;
      p.fourFierceStage = 0;
      p._fourFierceCarry = null;   // 连战 carry 状态
      // 祖师赐福：一次性把额外技能加载进 skillLoadout（仅本次四凶战，结束后恢复）
      const bless = p._fourFierceBlessSkills || [];
      if (bless.length && !p._fourFierceBlessLoaded) {
        const info = STATE.getProfessionSkills(p);
        const offerInfo = STATE.getOfferUnlockedSkills(p);
        const merged = (info ? info.skills : []).concat(offerInfo.active || []);
        const extra = merged.filter(sk => bless.indexOf(sk.id) >= 0).map(sk => sk.id);
        p._fourFierceSavedLoadout = p.skillLoadout;   // 备份原配置，结束后恢复
        const cur = p.skillLoadout || { actives: [], passive: null };
        p.skillLoadout = { actives: cur.actives.slice().concat(extra), passive: cur.passive };
        p._fourFierceBlessLoaded = true;
      }
      App.fourFierceNext(p);
    },

    /** 启动当前阶段四凶战斗 */
    fourFierceNext(p) {
      const stage = p.fourFierceStage || 0;
      const list = [
        { id:'taotie', next:'fourfierce_taowu', label:'饕餮' },
        { id:'taowu', next:'fourfierce_qiongqi', label:'梼杌' },
        { id:'qiongqi', next:'fourfierce_hundun', label:'穷奇' },
        { id:'hundun', next:'fourfierce_win', label:'混沌' }
      ];
      if (stage >= list.length) { App.goto('fourfierce_win'); return; }
      const cur = list[stage];
      // 四凶数据（神灵力降级：供奉1000时四凶100级降至90级）
      const four = (typeof global.getFourFierce === 'function') ? global.getFourFierce(p) : null;
      const enemy = four ? four[stage] : { name: cur.label, hp: 10000, atk: 180, def: 130, lv: 100, element: '邪' };
      // 难度系数
      const diffMul = (p.diffMul !== undefined ? p.diffMul : 1.0);
      const e = { ...enemy, hp: Math.floor(enemy.hp * diffMul), atk: Math.floor(enemy.atk * diffMul), def: Math.floor(enemy.def * diffMul) };
      e.isFourFierce = true;
      const carry = p._fourFierceCarry;
      // 恢复技能配置（战败/逃离/终局时统一恢复，避免祖师赐福技能泄漏到正常战斗）
      const restoreLoadout = () => {
        if (p._fourFierceSavedLoadout) { p.skillLoadout = p._fourFierceSavedLoadout; p._fourFierceSavedLoadout = null; }
        p._fourFierceBlessLoaded = false;
        p._fourFierceBlessSkills = [];
        p._fourFierceCarry = null;
      };
      setTimeout(() => {
        Battle.start(p, e, {
          win: () => {
            // 保存当前玩家战斗状态，供下一场 carry
            if (Battle.state && Battle.state.player) {
              p._fourFierceCarry = {
                hp: Battle.state.player.hp, mp: Battle.state.player.mp,
                energy: Battle.state.player.energy, cds: Battle.state.player.cds,
                buffs: Battle.state.player.buffs, debuffs: Battle.state.player.debuffs,
                lastElement: Battle.state.player.lastElement, combo: Battle.state.player.combo
              };
            }
            p.fourFierceStage = stage + 1;
            Engine.log('四凶「' + cur.label + '」陨落！下一位凶兽降临……', 'gold');
            // 连战：主动启动下一场（返回 'continue' 让 end() 不清空 state）
            if (p.fourFierceStage < list.length) {
              setTimeout(() => { App.fourFierceNext(p); }, 1000);
            } else {
              // 最后一场（混沌）结束：先落盘通关标记与「屠尽四凶」隐藏成就，
              // 确保 fourfierce_win 场景渲染时「混沌本相」选项的 showIf 能正确命中。
              STATE.completeQuest(p, 'FINAL_FOUR_FIERCE_DONE');
              const newlyAch = STATE.checkAchievements(p, { fourFierceDone: true });
              if (newlyAch.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newlyAch);
              // 恢复技能配置并进入结局
              restoreLoadout();
              setTimeout(() => { App.goto('fourfierce_win'); }, 1000);
            }
            return 'continue';   // 连战标记：end() 不清空 state
          },
          lose: () => {
            // 战败：状态不保留，回 home（四凶进度重置）
            p.hp = 1; p.debuffs = [];
            p.fourFierceStage = 0;
            restoreLoadout();
            Engine.log('你败于四凶「' + cur.label + '」之手，重伤退回家园。休整后再来！', 'evil');
            App.goto('home');
          },
          flee: () => {
            p.fourFierceStage = 0;
            restoreLoadout();
            Engine.log('你脱离战斗，四凶暂时隐去。', 'system');
            App.goto('home');
          }
        }, carry);
      }, 900);
    },

    /* ============== 心魔试炼战斗（境界突破·动态镜像） ============== */
    handleHeartDemon() {
      const p = App.player;
      // 道心试炼影响心魔强度：道心坚定则削弱（×0.7），道心蒙尘则增强（×1.3），未试炼则默认
      const daoxinMul = (p._daoxinBuff === true) ? 0.7 : (p._daoxinBuff === false ? 1.3 : 1.0);
      setTimeout(() => {
        Battle.start(p, {
          name: '心魔·' + p.professionName,
          element: p.profession === 'zen' ? '魔' : '邪',
          hp: Math.floor(STATE.calcMaxHp(p) * 0.9 * daoxinMul),
          atk: Math.floor((p.baseAtk * p.coeff.atk) * 0.85 * daoxinMul),
          def: Math.floor((p.baseDef * p.coeff.def) * 0.85 * daoxinMul),
          lv: p.lv,
          bg: 'assets/img/scenes/heart-demon.jpg'
        }, {
          win: () => {
            const r = STATE.breakthrough(p);
            if (r.ok) {
              Engine.log(`心魔破灭！境界突破至 ${r.realm.name}！`, 'good');
              // 突破仪式（全屏金色流光 + 境界 + 涨幅）
              if (typeof Engine.breakthroughCeremony === 'function') {
                Engine.breakthroughCeremony(r.realm.name, r.gains);
              } else {
                Engine.toast('境界突破：' + r.realm.name + '！', 'gold');
              }
            } else {
              Engine.log('心魔已破，但境界未稳。', 'good');
            }
            STATE.clearDaoxin(p);
            Engine.refreshStatus(p);
            App.goto('home');
          },
          lose: () => {
            Engine.log('心魔强大，你力有不逮……境界未能突破。', 'evil');
            p.hp = 1;
            p.debuffs = [];
            STATE.clearDaoxin(p);
            Engine.refreshStatus(p);
            App.goto('home');
          },
          flee: () => {
            Engine.log('你主动退出心魔试炼，境界未突破。', 'evil');
            STATE.clearDaoxin(p);
            App.goto('home');
          }
        });
      }, 800);
    },

    /* ============== 隐藏任务触发（机关命格 + 墨家遗迹） ============== */
    checkHiddenQuest() {
      const has = (App.player.mingshen || []).some(m => ['wenchang','qinjian','shenzhou'].includes(m.id));
      if (!has) return;
      // 触发"天机不可泄露"成就（此前成就 check 依赖 ctx.hiddenQuest，但从未有调用方传入——死锁修复）
      try { if (typeof STATE.checkAchievements === 'function') STATE.checkAchievements(App.player, { hiddenQuest: true }); } catch (e) {}
      setTimeout(() => {
        Engine.modal('✨ 隐藏发现', '<p>你察觉到【墨家遗迹】底层有异响——这可能是你命中【机关】相关命格的指引。</p><p style="margin-top:12px;">是否前往调查？</p>', [
          { label:'前往调查', cls:'btn-primary', fn:() => { Engine.closeModal(); App.goto('q01_h1_moji'); } },
          { label:'暂不理会', cls:'btn-ghost', fn:() => Engine.closeModal() }
        ]);
      }, 1000);
    },

    /* ============== 存档 ============== */
    saveGame() {
      if (!App.player) {
        Engine.modal('提示', '当前没有进行中的游戏。', [{ label:'确定', cls:'btn-primary', fn:() => Engine.closeModal() }]);
        return;
      }
      // V1.3.18：挑战模式走"智能存档"——空闲槽或已有同挑战存档则直接覆盖，否则弹窗选择
      if (App.player.challengeId) { App.saveChallengeManual(App.player); return; }
      // V1.3.19：新手引导·手动存档步骤
      try { if (App.player) App.player._tutorialSave = true; } catch (e) {}
      // 剧情模式：弹出槽位选择：选一个槽位覆盖保存
      App.showSaveSlots();
    },

    /** 挑战模式手动保存：空闲槽 / 我的挑战存档 → 直接覆盖（不弹窗）；否则弹窗选择覆盖哪个 */
    saveChallengeManual(p) {
      if (!p) return;
      const mine = SAVE.findChallengeSlot(p);
      const empty = SAVE.findEmptySlot();
      if (mine >= 0) {
        const r = SAVE.save(p, mine);
        if (r && r.ok) { Engine.log('已保存到【存档位 ' + (mine + 1) + '】（覆盖你此前的挑战存档）。', 'good'); Engine.toast('已保存', 'gold'); }
        else Engine.log('保存失败。', 'evil');
        return;
      }
      if (empty >= 0) {
        const r = SAVE.save(p, empty);
        if (r && r.ok) { Engine.log('已保存到【存档位 ' + (empty + 1) + '】。', 'good'); Engine.toast('已保存', 'gold'); }
        else Engine.log('保存失败。', 'evil');
        return;
      }
      // 三槽全满且无本角色挑战存档：弹窗让玩家选择覆盖哪个
      Engine.log('存档位已满且没有你的挑战存档——请选择要覆盖的存档位。', 'gold');
      App.showSaveSlots();
    },

    /** 挑战模式自动存档（静默）：只写"我的挑战存档"或空闲槽，绝不覆盖剧情存档 */
    challengeAutosave(silent) {
      const p = App.player;
      if (!p || !p.challengeId) return;
      try {
        let slot = SAVE.findChallengeSlot(p);
        if (slot < 0) slot = SAVE.findEmptySlot();
        if (slot < 0) return;   // 满槽且无我的挑战存档 → 不自动覆盖剧情存档
        const r = SAVE.save(p, slot);
        if (!silent && r && r.ok) Engine.log('进度已保存（存档位 ' + (slot + 1) + '）。', 'system');
      } catch (e) { /* 忽略自动保存异常 */ }
    },

    /* ============== 全局诊断面板（V1.3.19：错误收集一键查看/复制，不影响游戏运行） ============== */
    openDiagPanel() {
      try {
        const errs = App._diagErrors || [];
        const p = App.player;
        let playerLine = '未开始游戏';
        if (p) {
          playerLine = (p.challengeId ? '挑战 · ' + (p.challengeName || p.challengeId) : '剧情模式') + ' · ' + (p.realm && p.realm.name ? p.realm.name : '') + ' Lv' + (p.lv || 1) + ' · 第' + (p.day || 1) + '天';
        }
        let listHtml = errs.length === 0
          ? '<div style="color:#7a8a6a;padding:8px 4px">暂无错误记录。若遇到异常，可重试后再打开本面板查看。</div>'
          : errs.slice(-30).reverse().map((e, i) => {
              const tm = new Date(e.t).toLocaleTimeString();
              const kind = e.p ? '【异步】' : '';
              const pos = (e.s || '') + (e.l ? ':' + e.l : '');
              return `<div style="border-bottom:1px dashed rgba(201,160,80,.2);padding:6px 4px;font-size:12px;line-height:1.5">
                <span style="color:#c8a050">${tm}</span> ${kind}<span style="color:#e05555">${e.m}</span>
                <div style="color:#8a7a5a">${pos}${e.st ? ' · ' + e.st : ''}</div>
              </div>`;
            }).join('');
        const html = `
          <div style="font-size:13px;color:#c8d0c0;line-height:1.7">
            <div style="color:#7a3fa2;font-weight:700;margin-bottom:6px">版本 v1.3.20 · 全局诊断</div>
            <div>当前状态：${playerLine}</div>
            <div style="color:#e0c060">错误总数：${errs.length}</div>
          </div>
          <div style="max-height:300px;overflow-y:auto;margin-top:10px;border:1px solid rgba(201,160,80,.25);border-radius:6px;padding:6px 8px;background:rgba(0,0,0,.25)">${listHtml}</div>`;
        Engine.modal('诊 断 面 板', html, [
          { label: '复制信息', cls: 'btn-ghost', fn: () => {
            const txt = '问道山海 诊断信息 v1.3.20\n' + playerLine + '\n错误数 ' + errs.length + '\n' + errs.map(e => new Date(e.t).toLocaleString() + (e.p ? ' [异步]' : '') + ' ' + e.m + ' @' + (e.s || '') + (e.l ? ':' + e.l : '') + (e.st ? ' ' + e.st : '')).join('\n');
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt); Engine.toast('诊断信息已复制', 'good'); }
              else { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); Engine.toast('诊断信息已复制', 'good'); }
            } catch (e2) { Engine.log('复制失败：' + e2.message, 'evil'); }
          }},
          { label: '清空记录', cls: 'btn-ghost', fn: () => { App._diagErrors = []; Engine.closeModal(); Engine.log('诊断记录已清空。', 'system'); } },
          { label: '关 闭', cls: 'btn-primary', fn: () => Engine.closeModal() }
        ]);
      } catch (e) { /* 诊断面板自身异常也不影响游戏 */ }
    },

    /* ============== 新手引导（V1.3.19：新档前30分钟 修炼→战斗→探索→存档 闭环） ==============
     * 仅剧情模式新档启用（p._tutorial 置 0）；读档老档无此字段则自动视为已完成，不打扰老玩家。
     * 推进不靠到处埋点：每次渲染家园时按玩家实际状态（修为/战斗/探索/存档）自动判定推进。 */
    tutorialStep(p) {
      if (!p) return -1;
      if (p.challengeId || p._tutorial === undefined) return -1;
      if (p._tutorial >= 4) return 4;
      const steps = [
        (p.realm && (p.realm.exp || 0) > 0),   // 修炼：有修为了
        (p._battleWins || 0) >= 1,              // 战斗：至少赢一场
        (p._exploreTimes || 0) >= 1,            // 探索：外出探索过一次
        !!p._tutorialSave                        // 存档：手动存档过一次
      ];
      let idx = p._tutorial;
      let advanced = false;
      while (idx < 4 && steps[idx]) { idx++; advanced = true; }
      if (advanced) {
        p._tutorial = idx;
        try {
          if (idx < 4) Engine.toast('【新手引导】下一目标：' + ['去家园【修炼】打坐','去【探险】或推进剧情，打一场战斗','回【家园】选择【探险】，游历荒原','手动【存档】一次（右上角或家园）'][idx], 'gold');
          else Engine.toast('修行入门，山海任你行！', 'gold');
        } catch (e) {}
      }
      return idx;
    },
    tutorialHint(p) {
      try {
        const idx = App.tutorialStep(p);
        if (idx >= 0 && idx < 4) {
          return '\n[highlight]新手引导[/highlight]：下一目标 —— ' + ['先在家园【修炼】打坐，提升修为','去【探险】或推进剧情，打一场战斗','回【家园】选择【探险】，游历荒原搜集灵材','点击右上角【存档】按钮或家园【存档】，保存进度'][idx] + '。';
        }
      } catch (e) {}
      return '';
    },

    /* ============== 传承树（V1.3.19：跨周目全局被动，封面进入） ============== */
    showLegacy() {
      try {
        const info = STATE.legacyInfo();
        const nodeCards = info.defs.map(n => {
          const owned = info.ids.indexOf(n.id) >= 0;
          const reqOk = !n.require || info.ids.indexOf(n.require) >= 0;
          const canBuy = !owned && reqOk && info.pts >= n.cost;
          let btnHtml = owned
            ? '<span style="color:#6a9a4a;font-weight:700">已传承</span>'
            : (!reqOk
              ? '<span style="color:#b13d2a">需先解锁前置</span>'
              : '<button class="btn btn-ghost" data-unlock="' + n.id + '" ' + (canBuy ? '' : 'disabled style="opacity:.45"') + '>解锁（' + n.cost + ' 点）</button>');
          return `<div class="ms-deck-card" style="border:1px solid ${owned ? 'rgba(106,154,74,.5)' : 'rgba(122,63,162,.35)'};border-radius:8px;padding:12px">
            <div style="font-size:14px;font-weight:700;color:#4a3a28">${n.icon} ${n.name}</div>
            <div style="font-size:12px;color:#7a6a50;margin:4px 0">${n.desc}</div>
            <div style="margin-top:6px">${btnHtml}</div>
          </div>`;
        }).join('');
        const html = `<div style="font-size:13px;color:#4a3a28;line-height:1.8;margin-bottom:8px">
          传承点：<b style="color:#7a3fa2;font-size:16px">${info.pts}</b>（每通关一国 +1）
          <div style="color:#9a8a6a;font-size:12px">通关积攒传承点，解锁跨周目的全局传承——下一世修行，开局即享。</div>
        </div><div class="ms-deck" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${nodeCards}</div>`;
        Engine.modal('传 承 树', html, [
          { label: '关 闭', cls: 'btn-primary', fn: () => Engine.closeModal() }
        ], { narrow: false });
        // 解锁按钮
        const box = document.getElementById('modal-content');
        if (box) {
          box.querySelectorAll('[data-unlock]').forEach(btn => {
            btn.onclick = () => {
              const r = STATE.unlockLegacyNode(btn.dataset.unlock);
              if (r.ok) { Engine.toast('已解锁传承【' + r.node.name + '】', 'gold'); Engine.sfx('reward'); App.showLegacy(); }
              else Engine.toast(r.reason || '无法解锁', 'evil');
            };
          });
        }
      } catch (e) {}
    },

    /* ============== 流派图鉴（V1.3.19：build 搭配指引，封面进入） ============== */
    showBuilds() {
      try {
        const builds = [
          { name:'符箓连携 · 道徒流', tag:'中距离 · 元素转化', desc:'道徒以符箓敕令驱动元素转换，配灵宠协同与火/雷命格，技能连携叠层，中远距离稳控全场。', key:'技能：主符箓AOE + 灵宠协战；命格：火系·雷系'},
          { name:'铁壁反伤 · 禅人流', tag:'近身 · 肉身成圣', desc:'禅人高血高防，铁壁格挡后弹反，配减伤命格与血上限灵宠，越战越勇。', key:'技能：格挡/弹反 + 低血爆发；命格：生命·防御'},
          { name:'言灵群伤 · 儒生流', tag:'远程 · 浩然正气', desc:'儒生言出法随，AOE 清场，配暴击命格与元素连锁，一轮多段判定。', key:'技能：AOE言灵 + 元素连锁；命格：暴击·暴伤'},
          { name:'御灵协战 · 灵兽流', tag:'召唤 · 契约羁绊', desc:'灵兽流点出宠物羁绊，本命契约继承攻防，宠物协战与技能并出，人宠合一。', key:'技能：宠物协战 + 增益；羁绊：本命契约'},
          { name:'焚天灼烧 · 火系流', tag:'持续 · 元素反应', desc:'以火系技能叠灼烧，配火系灵宠与灼烧命格，配合元素反应连锁引爆。', key:'技能：灼烧叠层 + 烈焰反应；命格：火系'},
          { name:'雷罚麻痹 · 雷系流', tag:'控制 · 高爆发', desc:'雷系高爆发并附麻痹，配雷系灵宠与电磁反应，控场与输出兼具。', key:'技能：雷系爆发 + 麻痹；命格：雷系'}
        ];
        const html = '<div style="font-size:13px;color:#4a3a28;line-height:1.8;margin-bottom:8px">山海道法万千，以下流派供道友参考——搭配非唯一，走出自己的路。</div><div class="ms-deck" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + builds.map(b => `
          <div class="ms-deck-card" style="border:1px solid rgba(122,63,162,.35);border-radius:8px;padding:12px">
            <div style="font-size:14px;font-weight:700;color:#4a3a28">${b.name}</div>
            <div style="font-size:11px;color:#7a3fa2;margin:2px 0">${b.tag}</div>
            <div style="font-size:12px;color:#7a6a50;line-height:1.7">${b.desc}</div>
            <div style="font-size:11px;color:#a08a60;margin-top:6px;border-top:1px dashed rgba(160,138,96,.4);padding-top:6px">${b.key}</div>
          </div>`).join('') + '</div>';
        Engine.modal('流 派 图 鉴', html, [{ label: '关 闭', cls: 'btn-primary', fn: () => Engine.closeModal() }]);
      } catch (e) {}
    },

    /** 展示 3 个存档槽位供选择（保存用：点击覆盖该槽位） */
    showSaveSlots() {
      const slots = SAVE.list();
      let html = '<div style="line-height:1.8">请选择要保存到的存档位（已有存档将被覆盖）：</div><div class="slot-list">';
      slots.forEach(s => {
        if (s.empty) {
          html += `<div class="slot-card slot-empty" data-slot="${s.slot}"><b>存档位 ${s.slot + 1}</b><span class="slot-sub">（空）</span></div>`;
        } else {
          html += `<div class="slot-card" data-slot="${s.slot}"><b>存档位 ${s.slot + 1} · ${s.name}</b><span class="slot-sub">${s.realm} Lv${s.lv} · 第${s.day}天</span></div>`;
        }
      });
      html += '</div>';
      Engine.modal('存档', html, [{ label:'取消', cls:'btn-ghost', fn:() => Engine.closeModal() }]);
      document.querySelectorAll('.slot-card').forEach(card => {
        card.onclick = () => {
          const slot = parseInt(card.dataset.slot, 10);
          const r = SAVE.save(App.player, slot);
          Engine.closeModal();
          if (r.ok) Engine.modal('存档成功', `<p>已保存到【存档位 ${slot + 1}】。下次可从【再续前缘】选择该存档继续。</p>`, [{ label:'确定', cls:'btn-primary', fn:() => Engine.closeModal() }]);
          else Engine.modal('存档失败', '<p>' + (r.error || '未知错误') + '</p>', [{ label:'确定', cls:'btn-primary', fn:() => Engine.closeModal() }]);
        };
      });
    },

    loadGame() {
      SAVE.migrateLegacy();
      if (!SAVE.hasSave()) {
        Engine.modal('提示', '尚无存档。可先【初入山海】开启一段旅程。', [{ label:'确定', cls:'btn-primary', fn:() => Engine.closeModal() }]);
        return;
      }
      App.showLoadSlots();
    },

    /** 展示存档槽位供读取（再续前缘）：选择加载 / 删除 */
    showLoadSlots() {
      const slots = SAVE.list();
      let html = '<div style="line-height:1.8">选择一段前缘继续（点击加载，悬停可删除）：</div><div class="slot-list">';
      slots.forEach(s => {
        if (s.empty) {
          html += `<div class="slot-card slot-empty"><b>存档位 ${s.slot + 1}</b><span class="slot-sub">（空）</span></div>`;
        } else {
          html += `<div class="slot-card" data-slot="${s.slot}">
            <b>存档位 ${s.slot + 1} · ${s.name}</b>
            <span class="slot-sub">${s.realm} Lv${s.lv} · 第${s.day}天${s.challenge ? ' · 【挑战】' + (s.challengeName || '试炼') : (s.nation ? ' · ' + STATE.nationName(s.nation) : '')}</span>
            <button class="slot-del" data-del="${s.slot}" title="删除此存档">✕</button>
          </div>`;
        }
      });
      html += '</div>';
      Engine.modal('再 续 前 缘', html, [{ label:'取消', cls:'btn-ghost', fn:() => Engine.closeModal() }]);
      // 点击加载
      document.querySelectorAll('.slot-card[data-slot]').forEach(card => {
        card.onclick = (e) => {
          if (e.target.closest('.slot-del')) return;   // 点击删除按钮不触发加载
          const slot = parseInt(card.dataset.slot, 10);
          App.doLoad(slot);
        };
      });
      // 删除按钮
      document.querySelectorAll('.slot-del').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const slot = parseInt(btn.dataset.del, 10);
          Engine.modal('删除存档', `<p>确定删除【存档位 ${slot + 1}】吗？此操作不可恢复。</p>`, [
            { label:'删除', cls:'btn-danger', fn:() => { SAVE.remove(slot); Engine.closeModal(); App.showLoadSlots(); } },
            { label:'取消', cls:'btn-ghost', fn:() => Engine.closeModal() }
          ]);
        };
      });
    },

    /** 实际加载指定槽位 */
    doLoad(slot) {
      const p = SAVE.load(slot);
      if (!p) {
        Engine.modal('存档损坏', '该存档无法读取。', [{ label:'确定', cls:'btn-primary', fn:() => Engine.closeModal() }]);
        return;
      }
      Engine.closeModal();
      App.player = p;
      // V1.3.18：读档挑战玩家——重建装备/法阵聚合加成（旧存档下划线字段可能缺失），并回到挑战营地
      if (p.challengeId && !p.challengeCleared) {
        try { App.applyChallengeGear(p); } catch (e) {}
        Engine.showStatus();
        Engine.refreshStatus(p);
        App.goto('challenge_prepare_' + p.challengeId);
        return;
      }
      // V1.3.19：读档恢复试炼塔 buff 聚合（_towerBuff* 为临时字段，按 tower.buffs 重建）
      try { App.applyTowerBuffs(p); } catch (e) {}
      Engine.showStatus();
      Engine.refreshStatus(p);
      // 跳到上次记录的场景；若该场景已不存在（如旧存档），回退到当前国家入口或青丘开篇
      let sceneId = p.currentScene || 'opening';
      if (!(ALL_SCENES && ALL_SCENES[sceneId]) && !QINGQIU_SCENES[sceneId]) {
        if (p.nation === 'qingqiu' || !p.nation) sceneId = 'q01_02_accept';
        else sceneId = (ALL_SCENES && ALL_SCENES[p.nation + '_entry']) ? p.nation + '_entry' : 'opening';
        Engine.log('存档场景已失效，已回到当前所在地。', 'system');
      }
      App.runScene(sceneId);
    },

    backToTitle() {
      if (App.player) {
        // V1.3.20：确认框按内容收窄（narrow 模式），不再撑满大弹窗
        Engine.modal('返回主界面', '<p style="text-align:center;margin:4px 0;font-size:14px">是否先保存当前进度？</p>', [
          { label:'保存并返回', cls:'btn-primary', fn:() => { SAVE.autosave(App.player); Engine.closeModal(); App.goto('title'); } },
          { label:'直接返回', cls:'btn-ghost', fn:() => { Engine.closeModal(); App.goto('title'); } },
          { label:'取消', cls:'btn-ghost', fn:() => Engine.closeModal() }
        ], { narrow: true });
      } else {
        App.goto('title');
      }
    },

    /* ============== 菜单（竖排选项） ============== */
    showMenu() {
      const p = App.player;
      const menuItems = [
        { label:'📖 更新公告', fn:() => { Engine.closeModal(); App.showCredits(); } },
        { label:'⚙️ 设 置', fn:() => { Engine.closeModal(); App.showSettings(); } },
        { label:'🎨 更换皮肤', fn:() => { Engine.closeModal(); App.showSkins(); } },
        { label:'💾 保存进度', fn:() => { Engine.closeModal(); App.saveGame(); }, needPlayer:true },
        { label:'📊 收集总览', fn:() => { Engine.closeModal(); App.showOverview(); }, needPlayer:true },
        { label:'🎖️ 成 就', fn:() => { Engine.closeModal(); App.showAchievements(); }, needPlayer:true },
        { label:'🏠 返回主界面', fn:() => { Engine.closeModal(); App.backToTitle(); } }
      ];
      let html = '<div class="menu-list">';
      menuItems.forEach((it, i) => {
        if (it.needPlayer && !p) return;   // 无角色时隐藏需要角色的项
        html += `<button class="menu-item" data-menu="${i}">${it.label}</button>`;
      });
      html += '</div>';
      Engine.modal('菜 单', html, [{ label:'关闭', cls:'btn-ghost', fn:()=>Engine.closeModal() }], { narrow: true });
      // 绑定菜单项
      menuItems.forEach((it, i) => {
        const btn = document.querySelector(`.menu-item[data-menu="${i}"]`);
        if (btn) btn.onclick = () => { Engine.sfx('click'); it.fn(); };
      });
    },

    /* ============== 收集总览（进度汇总，可视化） ============== */
    showOverview() {
      const p = App.player;
      if (!p) return;
      // 1. 国家进度（真实通关数：用纯通关标记统计，unlockedNations.cleared 含"当前国家恒通关"特判会虚高）
      const nations = STATE.unlockedNations(p);
      const nationCount = nations.all.filter(n => STATE.isNationCleared(p, n)).length;
      const nationTotal = nations.all.length;
      // 2. 命格收集（当前 5 枚 + 图鉴维度：用已拥有的命格 id 去重）
      const ownedMingshen = (p.mingshen || []).map(m => m.id);
      // 3. 灵宠图鉴
      const petTotal = (global.PETS || []).length;
      const petCount = (p.petDex || []).length;
      // 4. 成就
      const achTotal = (global.ACHIEVEMENTS || []).length;
      const achCount = (p.achievements || []).length;
      // 5. 隐藏职业（已解锁图纸数）
      const hiddenProf = STATE.getHiddenProfessions();
      const hiddenTotal = Object.keys(hiddenProf).length;
      const hiddenCount = (p.unlocked ? Array.from(p.unlocked).filter(k => k.indexOf('BLUE-') === 0).length : 0);
      // 6. 结局收集（跨周目累积）：国家结局 + 特殊结局（四凶/真结局）
      const legacy = STATE.getLegacy();
      const specialEndings = ['fourfierce', 'true_end'];
      const specialCount = specialEndings.filter(id => (legacy.endings || []).indexOf(id) >= 0).length;
      // 国家结局：legacy.endings 中属于 20 国的条目（跨周目去重累积）
      const nationEndingCount = nations.all.filter(n => (legacy.endings || []).indexOf(n) >= 0).length;
      const endingCount = nationEndingCount + specialCount;
      const endingTotal = nationTotal + specialEndings.length;   // 20 国 + 2 特殊结局

      const pct = (a, b) => (b > 0 ? Math.round(a / b * 100) : 0);
      const bar = (a, b, color) => {
        const w = pct(a, b);
        return `<div class="ov-bar"><div class="ov-bar-fill" style="width:${Math.max(2, w)}%;background:${color}"></div></div>`;
      };

      const rows = [
        { icon:'🌍', name:'山海征程（通关国数）', a:nationCount, b:nationTotal, color:'#4aa0e0' },
        { icon:'🎖️', name:'成就收集', a:achCount, b:achTotal, color:'#e8a020' },
        { icon:'🐾', name:'灵宠图鉴', a:petCount, b:petTotal, color:'#8a5ad8' },
        { icon:'📜', name:'隐藏职业（图纸）', a:hiddenCount, b:hiddenTotal, color:'#c84a5a' },
        { icon:'🔮', name:'结局收集（通关国 + 特殊结局）', a:endingCount, b:endingTotal, color:'#3e8a5a' }
      ];

      // 国家征途明细：20 国逐一点亮（真实通关才亮色 + ✓，未通关灰暗）
      const nationCells = nations.all.map(n => {
        const cleared = STATE.isNationCleared(p, n);
        return `<span class="ov-nation ${cleared ? 'ov-nation-done' : ''}">${STATE.nationName(n)}${cleared ? ' ✓' : ''}</span>`;
      }).join('');

      let html = `<div class="overview-wrap">
        <div class="ov-header">
          <span class="ov-round">第 ${p.round || 1} 周目</span>
          <span class="ov-lv">${p.realm ? p.realm.name : ''} · Lv${p.lv}</span>
          <span class="ov-evil" style="color:${(p.evil || 0) >= 50 ? '#c84a5a' : '#3e8a5a'}">恶念 ${p.evil || 0}</span>
        </div>
        <div class="ov-list">`;
      rows.forEach(r => {
        html += `<div class="ov-row">
          <div class="ov-row-head"><span>${r.icon} ${r.name}</span><span class="ov-num">${r.a}/${r.b}（${pct(r.a, r.b)}%）</span></div>
          ${bar(r.a, r.b, r.color)}
        </div>`;
      });
      html += `</div>
        <div class="ov-nation-title">🗺 山海征途 · 已通关国度</div>
        <div class="ov-nation-grid">${nationCells}</div>
        <div class="ov-tip">命格（${ownedMingshen.length} 枚已凝炼）· 多周目继承将保留图鉴、图纸、结局与命格机会，越玩越完整。</div>
      </div>`;

      Engine.modal('收 集 总 览', html, [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]);
    },

    /* ============== 标题画面收集进度 ============== */
    refreshTitleProgress() {
      const el = document.getElementById('title-progress');
      if (!el) return;
      const legacy = STATE.getLegacy();
      const endings = (legacy.endings || []).length;
      const petDex = (legacy.petDex || []).length;
      const blueprints = (legacy.blueprints || []).length;
      const round = legacy.round || 0;
      let parts = [];
      if (round > 0) parts.push(`已通关 ${round} 周目`);
      parts.push(`结局 ${endings}/22`);
      parts.push(`灵宠图鉴 ${petDex}/11`);
      parts.push(`隐藏职业 ${blueprints}/22`);
      el.textContent = '收集进度 · ' + parts.join(' · ');
    },

    /* ============== 设置面板 ============== */
    showSettings() {
      const getPopup = () => { try { return localStorage.getItem('wenda-ach-popup') !== '0'; } catch (e) { return true; } };
      const setPopup = (v) => { try { localStorage.setItem('wenda-ach-popup', v ? '1' : '0'); } catch (e) {} };
      const popupOn = getPopup();
      const getSfx = () => { try { return localStorage.getItem('wenda-sfx') !== '0'; } catch (e) { return true; } };
      const setSfx = (v) => { try { localStorage.setItem('wenda-sfx', v ? '1' : '0'); } catch (e) {} };
      const sfxOn = getSfx();
      // 兑换码状态按存档隔离：读取当前角色的 redeemCodes
      const getRedeem = () => (App.player && App.player.redeemCodes && App.player.redeemCodes.indexOf('hongri') >= 0);
      let html = `<div class="settings-list">
        <div class="settings-row">
          <div class="settings-label">
            <div class="settings-title">成就弹窗提示</div>
            <div class="settings-sub">达成成就时，在左下角弹出提示</div>
          </div>
          <button class="toggle-btn ${popupOn ? 'toggle-on' : ''}" id="set-ach-popup">${popupOn ? '开' : '关'}</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <div class="settings-title">音效</div>
            <div class="settings-sub">点击、战斗、突破、成就等音效</div>
          </div>
          <button class="toggle-btn ${sfxOn ? 'toggle-on' : ''}" id="set-sfx">${sfxOn ? '开' : '关'}</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <div class="settings-title">音乐音量</div>
            <div class="settings-sub">BGM 背景音乐大小</div>
          </div>
          <div class="volume-ctrl">
            <input type="range" id="set-volume" min="0" max="100" value="${Math.round(AudioMgr.volume * 100)}" />
            <span class="volume-num" id="set-volume-num">${Math.round(AudioMgr.volume * 100)}%</span>
          </div>
        </div>
        <div class="settings-row settings-redeem">
          <div class="settings-label">
            <div class="settings-title">兑换码</div>
            <div class="settings-sub">${getRedeem() ? '已兑换「红日」' : '输入秘语解锁隐藏内容'}</div>
          </div>
          <input type="text" id="set-redeem-input" class="redeem-input" maxlength="16" placeholder="请输入兑换码" autocomplete="off" />
        </div>
        <div class="settings-row">
          <button class="btn btn-primary" id="set-redeem-btn" ${getRedeem() ? 'disabled' : ''}>兑 换</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <div class="settings-title">皮肤更换</div>
            <div class="settings-sub">更换已解锁的皮肤（隐藏职业/角色/宠物皮肤）</div>
          </div>
          <button class="btn btn-secondary" id="set-skin-btn">更 换 皮 肤</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <div class="settings-title">选项框风格</div>
            <div class="settings-sub">切换剧情选项框的美术风格</div>
          </div>
          <div class="style-opts" id="set-opt-style">
            ${['classic','bamboo','ink','gold'].map(st => {
              const names = { classic:'经典', bamboo:'竹简', ink:'水墨', gold:'鎏金' };
              const cur = App.getOptionStyle();
              return `<button class="style-chip ${cur === st ? 'active' : ''}" data-style="${st}">${names[st]}</button>`;
            }).join('')}
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <div class="settings-title">重置数据</div>
            <div class="settings-sub">清空全部存档与命数等局外进度（不可恢复，谨慎操作）</div>
          </div>
          <button class="btn btn-secondary" id="set-reset-btn" style="color:#b13d2a;border-color:#b13d2a">重 置</button>
        </div>
        <div class="settings-row" style="justify-content:center;border-top:1px solid #5a4a38;padding-top:12px;margin-top:4px">
          <span style="font-size:12px;color:#c8b8a2">《问道山海》v1.3.20 · 独立制作人：杨长辉</span>
        </div>
      </div>`;
      Engine.modal('设 置', html, [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }], { narrow: true });
      const toggle = document.getElementById('set-ach-popup');
      if (toggle) {
        toggle.onclick = () => {
          const cur = getPopup();
          setPopup(!cur);
          toggle.classList.toggle('toggle-on', !cur);
          toggle.textContent = (!cur) ? '开' : '关';
        };
      }
      const sfxToggle = document.getElementById('set-sfx');
      if (sfxToggle) {
        sfxToggle.onclick = () => {
          const cur = getSfx();
          setSfx(!cur);
          sfxToggle.classList.toggle('toggle-on', !cur);
          sfxToggle.textContent = (!cur) ? '开' : '关';
          if (!cur) Engine.sfx('click');   // 开启时播放一次反馈音效
        };
      }
      // 音量滑块
      const volInput = document.getElementById('set-volume');
      const volNum = document.getElementById('set-volume-num');
      if (volInput && volNum) {
        const applyVol = () => {
          const v = parseInt(volInput.value, 10) / 100;
          AudioMgr.setVolume(v);
          volNum.textContent = Math.round(v * 100) + '%';
        };
        volInput.addEventListener('input', applyVol);
      }
      // 兑换码输入
      const input = document.getElementById('set-redeem-input');
      const btn = document.getElementById('set-redeem-btn');
      if (btn && input) {
        const doRedeem = () => {
          const code = (input.value || '').trim();
          if (code === '红日') {
            // 写入当前存档的 redeemCodes（按存档隔离，不全局生效）
            if (!App.player) {
              Engine.log('尚无存档数据，请先开始游戏。', 'evil');
              return;
            }
            if (!App.player.redeemCodes) App.player.redeemCodes = [];
            if (App.player.redeemCodes.indexOf('hongri') < 0) App.player.redeemCodes.push('hongri');
            Engine.log('兑换成功！秘语之力觉醒，红日真君降临。', 'gold');
            // 立即检测成就（解锁「新生太阳」并联动供奉红日真君满值）
            try {
              if (typeof STATE.checkAchievements === 'function') {
                const newly = STATE.checkAchievements(App.player, {});
                if (newly.length && typeof Engine.notifyAchievements === 'function') Engine.notifyAchievements(newly);
              }
            } catch (e) {}
            Engine.closeModal();
          } else if (!code) {
            Engine.log('请输入兑换码。', 'evil');
          } else {
            Engine.log('兑换码无效。', 'evil');
          }
        };
        btn.onclick = doRedeem;
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doRedeem(); });
      }
      // 皮肤更换按钮
      const skinBtn = document.getElementById('set-skin-btn');
      if (skinBtn) {
        skinBtn.onclick = () => { Engine.closeModal(); App.showSkins(); };
      }
      // V1.3.20：移除无对应元素的 set-cover-btn 死代码（封面统一由"更换皮肤"入口管理）
      // 重置数据按钮（二次确认后清空全部存档与局外进度）
      const resetBtn = document.getElementById('set-reset-btn');
      if (resetBtn) {
        resetBtn.onclick = () => {
          const conf = confirm('确定要清空全部存档、命数及所有局外进度吗？此操作不可恢复。');
          if (!conf) return;
          try {
            ['wenda-shanhai-save-slot-0', 'wenda-shanhai-save-slot-1', 'wenda-shanhai-save-slot-2', 'wenda-shanhai-meta', 'wenda-shanhai-legacy'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
            App.player = null;
            Engine.toast('已清空全部数据', 'gold');
            Engine.closeModal();
            setTimeout(() => { App.goto('title'); }, 300);
          } catch (e) { Engine.toast('重置失败：' + e.message, 'evil'); }
        };
      }
      // 选项框风格切换
      document.querySelectorAll('#set-opt-style .style-chip').forEach(chip => {
        chip.onclick = () => {
          const st = chip.dataset.style;
          META.setOptionStyle(st);
          App.applyOptionStyle();
          // 刷新选中态
          document.querySelectorAll('#set-opt-style .style-chip').forEach(c => c.classList.toggle('active', c.dataset.style === st));
        };
      });
    },

    showCredits() {
      Engine.modal('更新公告', `
        <div style="line-height:1.9;max-height:60vh;overflow-y:auto;padding-right:6px;text-align:left">
          <p style="margin-bottom:14px">
            <b style="font-size:16px">《问道山海》</b> · 修仙文字游戏 · 纯前端版<br>
            <span style="color:#7a3fa2">版本 v1.3.20 · 万象澄澈</span><br>
            <span style="color:#c8a050">独立制作人：杨长辉</span>
          </p>

          <p style="font-size:14px;font-weight:700;color:#7a3fa2;margin:16px 0 8px">【策划案说】</p>
          <p>
            <b>一、一次彻底的重构：从"看故事"到"写故事"</b><br>
            《问道山海》最早是一棵纯剧情驱动的种子——剧情像一条河，玩家顺流而下，只看两岸风景。但我们很快意识到：<b>"看"不是玩家想要的，"选择"才是</b>。于是，我们做了一次<b>脱胎换骨的剧情重构</b>：<br>
            把每一段主线都改造成<b>选择驱动</b>——你可以温和，可以强硬，可以沉默，也可以转身离开；敌人的警觉、恶念的累积、故人好感的高低，都由你的每一次选择亲手落笔。二十国的故事不再是既定的剧本，而是一张<b>因你而生、随你而变</b>的网。同一个抉择，前后剧情、线索指引、甚至结局走向都会随之呼应。
          </p>
          <p style="margin-top:10px">
            <b>二、四大设计支柱</b><br>
            <b>① 命格先天、因果后天</b>——开局以一段自述文字"凝"出五枚先天命格，后续每一段剧情抉择都通过"恶念值""好感度"留下因果烙印。命运由你的选择一笔笔写成，而非抽卡一锤定音；<br>
            <b>② 文字叙事即玩法</b>——战斗、探索、抉择、多结局皆由剧情驱动：敌人有警觉度，可潜行、观察、偷袭或安然离去；战斗非唯一答案，<b>每一次抬手之前，都有一场选择</b>；<br>
            <b>③ 山海世界观还原</b>——二十国异闻、四凶（饕餮、梼杌、穷奇、混沌）贯穿始终，每国各有其异、其俗、其宿命，山海经不只是背景板，而是每一处可触碰的风景；<br>
            <b>④ 万物有灵，人皆有戏</b>——不只主角有故事。十位角色各有专属剧情线与专属玩法：药婆悬壶济世，苏苏织网渡水，莫开修复铁心，野火执灯夜行……地级角色甚至配了小游戏玩法，让"剧情"不止于文字。
          </p>
          <p style="margin-top:10px">
            <b>三、为何任务栏不做固定线路</b><br>
            我们刻意<b>不做"一条线走到黑"的固定任务链</b>，而是提供一个"问道指引"——它只温和地提示"此刻最该做什么"，却不强制你按部就班。<br>
            因为修仙本该自由：你可以立刻推进剧情，也可以回洞天闭关百年；可以广结善缘渡人，也可以一念入魔。<b>一念成神，一念成魔</b>，皆是你的山海，皆是你的人生。指引永远只是"锦上添花的提醒"，而非"枷锁"。
          </p>
          <p style="margin-top:10px">
            <b>四、游戏里藏着多少惊喜？</b><br>
            我们喜欢"藏东西"，也相信<b>探索本身就是乐趣</b>。目前山海里藏着：<b>22 个隐藏职业</b>（影刺、剑修、丹道宗师、御灵圣手……一国一隐藏，图纸散落在伏魔窟与机缘中）、<b>22 处探索彩蛋</b>（二十国各埋一愿，青丘还藏了两处）、<b>10 位可扮演角色</b>（天地玄黄仙五阶，其中隐藏角色「众薪」需第 7 日桃林抉择方能唤醒）、<b>多段隐藏剧情线</b>（「人人如龙」暗线等）与<b>隐藏成就</b>。<br>
            它们不会跳出来打扰你，只会在你<b>恰好留意到某个角落</b>时，轻轻回你一声——这声回应，就是我们想送给你的全部心意。
          </p>
          <p style="margin-top:10px">
            <b>五、未来的路：玩法为骨，沉浸为魂</b><br>
            作为独立制作，我们最大的"优势"其实是<b>没有上线压力，只有打磨的耐心</b>。山海不会是一个"做完就结束"的产品——接下来很长一段时间，我们的更新将始终围绕两件事：<br>
            <b>① 玩法</b>——让每一次选择都有<b>玩法层面的回响</b>。探索不只是翻页，而是会遇到需要你动手的境地：像苏苏那样在河边张网捞鱼、在洪流中救人，像莫开那样亲手修好一台机关人。我们会让更多系统"玩起来"，而不是"读过去"。<br>
            <b>② 沉浸式体验</b>——让山海"活"在你眼前。图文穿插的叙事、随场景流转的背景、每一国独有的人物与风情，都是为了让"身在山海"不止是一句口号。我们在打磨的是氛围、节奏与细节——那些让你忘了时间的、像水一样自然的东西。<br>
            我们不承诺一步到位，但我们承诺：<b>每一次更新，都会让山海离"你心中的那个样子"更近一点</b>。
          </p>

          <p style="font-size:14px;font-weight:700;color:#7a3fa2;margin:18px 0 8px">【版本更新日志】</p>

          <div style="background:rgba(122,63,162,0.08);border:1px solid rgba(122,63,162,0.3);border-radius:6px;padding:12px;margin:10px 0">
            <b style="color:#7a3fa2">● 策划的话</b><br>
            各位道友，见字如面。<br>
            这一版，我们把此前困扰许久的一件事真正想明白了：<b>剧情不该是"要去找的东西"，而该是"你走进去就能遇见的东西"</b>。所以我们把二十国的剧情人物请进了探索的同一张画卷里——你进一座城，主线人物就站在那里，等着你续写这段故事；你想逛逛、想买卖、想寻宝，也都在这同一方天地里。退出去、去别国、再回来，剧情都替你好好收着。<br>
            我们也为每一国的核心人物补上了立绘。白浅的桃花、云瑶的风隼、沧溟的水泽、潮音的潮声……当一张张脸从文字里"立"起来，山海的异国风情才真正有了温度。挑战模式则做成了章节式的旅程：过完一程，回营地歇脚、练功、备粮，养足了精神再赴下一场——<b>像真的在闯关，而不是被剧情推着走</b>。<br>
            我们始终相信，文字游戏最好的沉浸感，来自"细节"与"节奏"：一句恰到好处的留白、一次不被打扰的抉择、一场值得回味的小游戏。接下来很长一段时间，我们会继续围绕<b>玩法回响与沉浸体验</b>打磨山海——让每一次抬手都有回应，让每一段旅程都像回家。<br>
            <span style="color:#8a6a3a">最后仍是一点坦白：我们还在持续打磨。部分剧情分支、角色故事的长度、小游戏的细节手感，都还有继续优化的空间；我们也还在规划更多角色的长线故事、更多样的小玩法，以及更多藏在山海深处的秘密。若你在游历中遇到任何不顺手之处，欢迎随时告诉我们——山海之大，正是因为有你们同行，才一天比一天更像我们想去的那个样子。</span>
          </div>

          <p style="font-weight:700;color:#c8a050;margin:14px 0 4px">

          <div style="background:rgba(201,160,80,0.06);border:1px solid rgba(201,160,80,0.35);border-radius:6px;padding:12px;margin:10px 0">
            <b style="color:#c8a050">● 制作人·研发手记</b><br>
            本作由我独立策划并统筹制作。<b>人定方向，AI 执行，人验收</b>——每一版迭代，我都先立一条清晰的设计命题（例如"挑战模式与剧情模式如何分层""通关条件如何回归 Boss 战""存档如何让剧情与挑战互不干扰""如何把质量工程变成游戏的底气""如何做一次覆盖全系统的深度自查"），将其拆解为可验收的模块后交予 AI 编程助手落地，再逐项评审数值、剧情与交互，联调回归至稳定交付。从立项原型到 v1.3.20，二十余次版本迭代由此推进：命题、设计、验收，皆由我把关。
          </div>

          <p style="font-size:14px;font-weight:700;color:#7a3fa2;margin:18px 0 8px">【版本纪】</p>

          <p style="font-weight:700;color:#c8a050;margin:16px 0 6px">◆ 时代四 · 挑战模式（v1.3.8 ~ v1.3.20）</p>
          <ul style="padding-left:18px;margin:0">
            <li><b>v1.3.20 · 万象澄澈</b>——系统级自查，修复六十余项：每日试炼塔扩至 90 层（逐层对应等级）、每日限次修复；挑战第二章主线可达、物资门槛生效；国家掉落不再出幽灵材料、名声/周任务/隐藏成就/法阵发放口径全部校准；全局文字对比度提升，确认框按内容收窄。</li>
            <li><b>v1.3.19 · 万象塔试</b>——质量工程落地（核心路径自动化回归 + 全局诊断面板 + 旧档兼容回归 + 数据全量走查）；新手引导四步闭环（修炼→战斗→探索→存档）；每日试炼塔肉鸽十层；传承树跨周目全局被动；流派图鉴与选项代价预览。</li>
            <li><b>v1.3.18 · 玉简归位</b>——存档体系分层升级：剧情与挑战存档完全隔离，自动存档只落自己的槽位；手动保存智能落位（有空位或已有本挑战存档即直接覆盖，仅三槽皆满才请玩家抉择）；挑战装备、法阵、营地进度完整持久，读档即续。</li>
            <li><b>v1.3.17 · 破障自检</b>——挑战模式全量校验：修炼曲线与剧情模式统一节奏，成长路径顺畅；三关最终 Boss 数值校准，通关有挑战、成长有回报。</li>
            <li><b>v1.3.16 · 探幽寻兽</b>——城池新增「搜寻野区」：33 种主题怪兽随机遭遇，难度随角色浮动；怪兽按品质掉落灵材与本挑战专属材料；每区域 6 类交互齐备，新增 6 位隐藏人物。</li>
            <li><b>v1.3.15 · 问鼎决战</b>——通关条件回归 Boss 战：三大最终 Boss 接入，击败方通关领奖；挑战国家做成城池，点触 NPC 直接对话，选择驱动剧情。</li>
            <li><b>v1.3.14 · 器各有道</b>——变强方式各归其位：附魔法阵归羽民、锻造归机关城、核心改装归觉醒；精铁 / 核心碎片 / 风羽印记材料体系完整落地。</li>
            <li><b>v1.3.13 · 百宝乾坤</b>——四槽位装备系统（武器 / 防具 / 流转 / 增幅），每件自带技能；附魔法阵最多配置 4 个；隐藏任务线贯穿全局。</li>
            <li><b>v1.3.12 · 各显神通</b>——铁匠锻造、机器人改装、羽民附魔三条变强路线各有其道；深入探索随机奇遇，探索不再一成不变。</li>
            <li><b>v1.3.11 · 人间烟火</b>——挑战家园与剧情家园同款排版（左侧属性、右侧选项、中间引导）；每挑战 4 段开场前置剧情，过完直进家园。</li>
            <li><b>v1.3.10 · 山门灯火</b>——营地选项扩至 13 个，今日试炼、补给、情报、绘卷、存档一应俱全。</li>
            <li><b>v1.3.9 · 百工争鸣</b>——挑战家园多系统入口，按主题微调（锻造 / 充能 / 织造）；国家探索专属 NPC 与挑战，任务解锁区域，与剧情模式完全分层。</li>
            <li><b>v1.3.8 · 时之试炼</b>——区域任务制 + 限时试炼，章节式挑战旅程开启；过完剧情回营地，在压力与抉择中规划每一步。</li>
          </ul>

          <p style="font-weight:700;color:#c8a050;margin:16px 0 6px">◆ 时代三 · 玩法之骨（v1.3.0 ~ v1.3.7）</p>
          <ul style="padding-left:18px;margin:0">
            <li><b>v1.3.7 · 山海拾遗</b>——280 种灵材全量配文；四凶遗物、隐藏职业图纸注明出处。</li>
            <li><b>v1.3.6 · 万法归一</b>——职业技能"描述即效果"，五大控制体系登场，25 职业技能要义各成篇章。</li>
            <li><b>v1.3.5 · 神恩如海</b>——供奉神明各有所长，职业属性侧重分明。</li>
            <li><b>v1.3.4 · 百道争鸣</b>——25 职业定位清晰，供奉圆满福泽长续。</li>
            <li><b>v1.3.3 · 灵犀万象</b>——灵宠培养数值重构、羁绊深化；伏魔窟随机事件与元素反应大幅扩充。</li>
            <li><b>v1.3.2 · 图鉴天成</b>——山海绘卷改为全局收藏，九大图鉴全配图、内容全面深化。</li>
            <li><b>v1.3.1 · 万物有灵 · 排版合版</b>——界面排版统一，每日目标与委托板合版。</li>
            <li><b>v1.3.0 · 万物有灵 · 玩法之骨</b>——灵圃种植、灵宠羁绊、伏魔窟事件、跨国家名声联动、多周目差异化。</li>
          </ul>

          <p style="font-weight:700;color:#c8a050;margin:16px 0 6px">◆ 时代二 · 人物与剧情（v1.2.x）</p>
          <ul style="padding-left:18px;margin:0">
            <li><b>v1.2.1 · 山河入戏</b>——剧情与探索一体相连，二十国核心人物立绘；挑战模式章节化。</li>
            <li><b>v1.2.0 · 山海人物志</b>——剧情全面重构为选择驱动；十位角色专属剧情线与地级小玩法，隐藏角色「众薪」苏醒。</li>
          </ul>

          <p style="font-weight:700;color:#c8a050;margin:16px 0 6px">◆ 时代一 · 山海立世（v1.0.0 ~ v1.1.1）</p>
          <ul style="padding-left:18px;margin:0">
            <li><b>v1.1.1 · 山海拾遗</b>——任务指引重构、伏魔窟改版、炼丹重制、各国 NPC 扩充。</li>
            <li><b>v1.1.0 · 局外长线</b>——命数经济、命签抽卡、签到与周任务、角色 / 宠物 / 皮肤图鉴、挑战模式初登场。</li>
            <li><b>v1.0.0 · 正式完整版</b>——视觉包装升级、命格扩充至 58 枚、25 职业被动全部实装、战斗数值平衡、隐藏内容补全。</li>
          </ul>

<p style="margin-top:16px;color:#7a3fa2;text-align:center;font-style:italic">
            "命格先天，因果后天。一念成神，一念成魔。"
          </p>
        </div>
      `, [{ label:'知道了', cls:'btn-primary', fn:() => Engine.closeModal() }]);
    },

    /* ============== 封面功能：刷新命数显示 ============== */
    refreshMingDisplay() {
      const el = document.getElementById('title-sidebar-ming');
      if (!el) return;
      try {
        const ming = (typeof META !== 'undefined') ? META.getMing() : 0;
        el.textContent = '命数：' + ming;
      } catch (e) {}
    },

    /* 获取当前封面背景（玩家自选封面皮肤，未选则默认 logo） */
    getTitleBg() {
      try {
        const id = (typeof META !== 'undefined') ? META.getCoverSkin() : '';
        if (id && global.getSkin) {
          const s = global.getSkin(id);
          if (s && s.bg) return s.bg;
        }
      } catch (e) {}
      // 默认封面：日月同辉（旧版 title-logo 已弃用）
      return 'assets/img/title-sunmoon.jpg';
    },

    /* 获取/应用选项框美术风格 */
    getOptionStyle() {
      try { return (typeof META !== 'undefined') ? META.getOptionStyle() : 'classic'; } catch (e) { return 'classic'; }
    },
    applyOptionStyle() {
      const style = App.getOptionStyle();
      const body = document.body;
      ['classic','bamboo','ink','gold'].forEach(st => body.classList.remove('opt-style-' + st));
      body.classList.add('opt-style-' + style);
    },showCoverPicker() {
      // 封面皮肤 + 拥有的角色/宠物立绘都可作为封面图（后两类仅背景）
      const coverSkins = (global.SKINS || []).filter(s => s.kind === 'cover');
      const ownedChars = (global.CHARACTERS || []).filter(c => META.hasChar(c.id) && !c.locked).slice(0, 6);
      const ownedPets = (global.PETS || []).filter(p => (App.player && App.player.petDex && App.player.petDex.indexOf(p.id) >= 0)).slice(0, 6);
      const cur = META.getCoverSkin();
      const tile = (id, src, theme, eq) => '<div class="cover-tile ' + (eq ? 'cover-tile-eq' : '') + '" data-id="' + id + '"><img src="' + src + '" onerror="this.style.background=\'linear-gradient(180deg,#5a4a30,#2a1c10)\';this.removeAttribute(\'src\');" /><div class="cover-tile-name">' + theme + '</div></div>';
      const html = '<div class="meta-panel"><div class="meta-panel-head"><span>封面设置</span><span class="mp-ming">命数：' + META.getMing() + '</span></div><p style="color:#9a8a70;font-size:12px;margin-bottom:12px">选择封面图（已获得的立绘）；可一键重置。点击图片 → 按下确定即可生效。</p><div class="ms-wrap" style="grid-template-columns: 1fr"><div class="ms-deck" id="cover-deck">' + coverSkins.map(s => tile(s.id, s.bg, '皮肤 · ' + s.name, cur === s.id)).join('') + ownedChars.map(c => tile('char-' + c.id, 'assets/img/char/' + c.id + '.jpg', c.name + '（角色', cur === 'char-' + c.id)).join('') + ownedPets.map(p => tile('pet-' + p.id, p.img || 'assets/img/pets/pet-default.jpg', p.name + '（宠物', cur === 'pet-' + p.id)).join('') + '</div></div><div style="display:flex;justify-content:center;gap:10px;margin-top:12px"><button class="btn btn-secondary" id="cover-reset">封 面 重 置</button><button class="btn btn-primary" id="cover-confirm">确 定</button></div></div>';
      Engine.modal('封 面 选 择', html, [{ label: '关闭', cls: 'btn-ghost', fn: () => Engine.closeModal() }]);
      let picked = cur;
      document.querySelectorAll('.cover-tile').forEach(t => { t.onclick = () => { document.querySelectorAll('.cover-tile').forEach(x => x.classList.remove('cover-tile-eq')); t.classList.add('cover-tile-eq'); picked = t.dataset.id; }; });
      const resetBtn = document.getElementById('cover-reset');
      if (resetBtn) resetBtn.onclick = () => { META.setCoverSkin(''); Engine.setBg(App.getTitleBg()); Engine.toast('封面已重置', 'gold'); Engine.closeModal(); };
      const confirmBtn = document.getElementById('cover-confirm');
      if (confirmBtn) confirmBtn.onclick = () => {
        if (!picked) { Engine.toast('请先选择一张图', 'info'); return; }
        META.setCoverSkin(picked);
        // 应用背景
        const id = picked;
        let bg = '';
        if (id.indexOf('char-') === 0) { bg = 'assets/img/char/' + id.substr(5) + '.jpg'; }
        else if (id.indexOf('pet-') === 0) { const p = (global.PETS || []).find(x => x.id === id.substr(4)); bg = p ? p.img : ''; }
        else { const s = global.getSkin(id); bg = s.bg; }
        if (bg) Engine.setBg(bg);
        Engine.toast('封面已更新', 'gold');
        Engine.sfx('reward');
        Engine.closeModal();
      };
    },
    

    /* ============== 封面功能：每日签到 ============== */
    showSignin() {
      const info = META.signinInfo();
      const rewardList = [];
      for (let i = 1; i <= 7; i++) {
        rewardList.push(10 + Math.min((i - 1) * 2, 30));
      }
      const h = info.huang || { label: '甲子日', year: 1, monthName: '孟春', day: 1, full: '甲子日·1年孟春1日' };
      // 展示天数：1-70 循环（第71天显示为第1天·第2轮）
      const ds = info.displayStreak || info.streak || 0;
      const cycle = info.cycle || 1;
      const streakTxt = cycle > 1 ? `${ds} / 70（第${cycle}轮）` : `${ds} / 70`;
      const html = `<div class="meta-panel">
        <div class="meta-panel-head"><span>${h.label} · 命数签到</span><span class="mp-ming">命数：${META.getMing()}</span></div>
        <p style="color:#3a2c18;font-size:14px;line-height:2;margin-bottom:12px;font-weight:500">
          <b style="color:#8a4a10;font-size:15px">${h.full}</b><br>
          凡心向道，一签为始。连续签到，愿力递增。<br>
          今日状态：<b style="color:${info.done ? '#2a7a3a' : '#b06a10'};font-size:15px">${info.done ? '已签到' : '未签到'}</b>
          · 连续 <b style="color:#8a4a10;font-size:15px">${streakTxt}</b> · 累计 ${info.total} 次<br>
          <span style="color:#6a4a30">明日奖励：+${info.nextReward} 命数（连续天数越多越多）</span>
        </p>
        <div style="display:flex;gap:6px;justify-content:center;margin-bottom:16px">
          ${rewardList.map((r, i) => {
            const state = (i < info.streak) ? '已' : (i === info.streak ? '今' : '未');
            return `<span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:50%;font-size:12px;font-weight:700;${state === '已' ? 'background:#8fd694;color:#1a2a1a' : state === '今' ? 'background:#ffd778;color:#3a2c10' : 'background:#f5ead0;color:#8a6a3a;border:1px solid #d8c8a0'}">${r}</span>`;
          }).join('')}
        </div>
      </div>`;
      const actions = [
        { label: info.done ? '已签到' : '签 到', cls: info.done ? 'btn-ghost' : 'btn-primary', fn: () => {
          if (info.done) { Engine.toast('今日已签到', 'info'); return; }
          const r = META.doSignin();
          if (r.ok) { Engine.toast('签到成功！命数 +' + r.reward, 'gold'); Engine.sfx('reward'); Engine.closeModal(); App.showSignin(); App.refreshMingDisplay(); }
        } },
        { label: '关闭', cls: 'btn-ghost', fn: () => Engine.closeModal() }
      ];
      Engine.modal('每 日 签 到', html, actions);
    },

    /* ============== 封面功能：命签抽卡（皇帝成长计划2 风格：分类+牌阵列+详情） ============== */
    showMingsign() {
      // 每次进入重置筛选状态（默认全部 + 不勾选）
      App._msFilter = { category: 'all', owned: false, locked: false };
      App.renderMingsignPanel();
    },
    renderMingsignPanel() {
      App._msFilter = App._msFilter || { category: 'all', kind: 'all', owned: false, locked: false };
      const filter = App._msFilter;
      const ming = META.getMing();
      const pool = META.buildPool();
      const dex = META.getMingsignDex();
      const dexMap = {};
      dex.forEach(d => { dexMap[d.kind + ':' + d.id] = true; });
      const ownedCount = dex.length;
      const qualityOrder = ['仙', '天', '地', '玄', '黄'];
      const cats = ['all', '仙', '天', '地', '玄', '黄'];
      const catLabels = { all: '全部', '仙': '神', '天': '天', '地': '地', '玄': '玄', '黄': '黄' };
      const kinds = ['all', 'char', 'skin', 'mingshen'];
      const kindLabels = { all: '全部', char: '角色', skin: '皮肤', mingshen: '命格' };
      const filtered = pool.filter(it => {
        if (filter.kind !== 'all' && it.kind !== filter.kind) return false;
        if (filter.category !== 'all' && it.quality !== filter.category) return false;
        const owned = dexMap[it.kind + ':' + it.id];
        if (filter.owned && !owned) return false;
        if (filter.locked && owned) return false;
        return true;
      });
      const qIdx = (q) => qualityOrder.indexOf(q);
      filtered.sort((a, b) => {
        const ao = dexMap[a.kind + ':' + a.id] ? 0 : 1;
        const bo = dexMap[b.kind + ':' + b.id] ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return qIdx(a.quality) - qIdx(b.quality);
      });
      const itemImg = (it) => {
        if (it.kind === 'char') return 'assets/img/char/' + it.id + '.jpg';
        if (it.kind === 'skin') {
          const sk = global.getSkin ? global.getSkin(it.id) : null;
          if (sk) {
            if (sk.kind === 'cover' && sk.bg) return sk.bg;
            if (sk.kind === 'char') { const ch = global.getChar ? global.getChar(sk.unlockId) : null; if (ch) return 'assets/img/char/' + ch.id + '.jpg'; }
            if (sk.kind === 'pet') { const pet = (global.PETS || []).find(p => p.id === sk.unlockId); if (pet && pet.img) return pet.img; }
            if (sk.kind === 'prof') return 'assets/img/professions/prof-' + sk.unlockId + '.jpg';
          }
          return '';
        }
        if (it.kind === 'mingshen') return 'assets/img/mingshen-stars.jpg';  // 命格意象图
        return '';
      };
      const qBg = (q) => ({ '仙': '#7a5ab8,#3a2a6a', '天': '#ffd778,#8a4a10', '地': '#c8a050,#6a3a10', '玄': '#b0b0b0,#4a4a4a', '黄': '#c8a060,#4a2c10' }[q] || '#8a6020,#4a2c10');
      let html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel"><div class="meta-panel-head"><span>命签图鉴（已集 ' + ownedCount + '/' + pool.length + '）</span><span class="mp-ming">命数：' + ming + '</span></div>';
      html += '<p style="color:#6a4a30;font-size:12px;line-height:1.8;margin:0 0 10px;text-align:left">说明：抽到的命格会<b>解锁</b>并进入你的命格库；开局或重抽命格时，是从已解锁的命格中<b>有概率随机</b>出现，并非必定获得。抽到已拥有的条目会返还少量命数。</p>';
      html += '<div style="display:flex;gap:10px;justify-content:center;margin-bottom:12px"><button class="meta-btn primary" id="ms-draw-1">抽 命 签（' + META.MINGSIGN_COST_SINGLE + ' 命数）</button><button class="meta-btn primary" id="ms-draw-10">命签十连（' + META.MINGSIGN_COST_TEN + ' 命数）</button></div>';
      html += '<div class="ms-wrap"><div class="ms-topbar"><div class="ms-cat">' + kinds.map(k => '<button class="ms-cat-btn ' + (filter.kind === k ? 'active' : '') + '" data-kind="' + k + '">' + kindLabels[k] + '</button>').join('') + '</div><div class="ms-cat" style="border-left:1px solid #d8c8a0;padding-left:10px;margin-left:6px">' + cats.map(c => '<button class="ms-cat-btn ' + (filter.category === c ? 'active' : '') + '" data-cat="' + c + '">' + catLabels[c] + '</button>').join('') + '</div></div>';
      html += '<div class="ms-filter"><span style="font-size:12px;color:#6a4a30;margin-right:2px">筛选</span><label class="ms-check"><input type="checkbox" id="ms-cb-owned" ' + (filter.owned ? 'checked' : '') + ' /> 已拥有</label><label class="ms-check"><input type="checkbox" id="ms-cb-locked" ' + (filter.locked ? 'checked' : '') + ' /> 未拥有</label></div>';
      html += '<div class="ms-deck">' + (filtered.length === 0 ? '<div class="ms-deck-empty">该筛选下暂无条目</div>' : filtered.map(it => {
        const owned = dexMap[it.kind + ':' + it.id];
        const img = itemImg(it);
        const bg = qBg(it.quality);
        const kTxt = { char: '角色', skin: '皮肤', mingshen: '命格' }[it.kind] || '';
        return '<div class="ms-tile q-' + it.quality + ' ' + (owned ? 'owned' : 'locked') + '" data-kind="' + it.kind + '" data-id="' + it.id + '">'
          + '<span class="ms-tile-q">' + it.quality + '</span>'
          + '<img class="ms-tile-img" src="' + img + '" onerror="this.style.background=linear-gradient(180deg,' + bg + ');this.removeAttribute(\'src\');" />'
          + '<div class="ms-tile-name">' + it.name + '</div>'
          + '<div class="ms-tile-title">' + kTxt + '</div>'
          + '</div>';
      }).join('')) + '</div></div></div>';
      App.openBigModal('命 签 图 鉴', html, () => App.renderMingsignPanel());
      const b1 = document.getElementById('ms-draw-1');
      const b10 = document.getElementById('ms-draw-10');
      if (b1) b1.onclick = () => App.doDraw(1);
      if (b10) b10.onclick = () => App.doDraw(10);
      document.querySelectorAll('[data-cat]').forEach(btn => { btn.onclick = () => { App._msFilter.category = btn.dataset.cat; App.renderMingsignPanel(); }; });
      document.querySelectorAll('[data-kind]').forEach(btn => { btn.onclick = () => { App._msFilter.kind = btn.dataset.kind; App.renderMingsignPanel(); }; });
      const cbO = document.getElementById('ms-cb-owned');
      const cbL = document.getElementById('ms-cb-locked');
      if (cbO) cbO.onchange = () => {
        App._msFilter.owned = cbO.checked;
        if (cbO.checked && cbL.checked) { App._msFilter.locked = false; cbL.checked = false; }
        App.renderMingsignPanel();
      };
      if (cbL) cbL.onchange = () => {
        App._msFilter.locked = cbL.checked;
        if (cbL.checked && cbO.checked) { App._msFilter.owned = false; cbO.checked = false; }
        App.renderMingsignPanel();
      };
      document.querySelectorAll('.ms-tile').forEach(tile => {
        tile.onclick = () => {
          const kind = tile.dataset.kind;
          const id = tile.dataset.id;
          App.showMingsignDetail(kind, id);
        };
      });
    },    /* 命签详情：立绘 + 皮肤按钮 + 背景/天命 */
    formatMod(mod) {
      if (!mod) return '';
      const map = {atk:'\u653b', def:'\u9632', life:'\u751f\u547d', mp:'\u7cbe\u795e', gather:'\u91c7\u96c6', luck:'\u6c14\u8fd0', speed:'\u901f\u5ea6', atk2:'\u653b\u52d2', def2:'\u9632\u52d2', all:'\u5168\u5c5e', exp:'\u7ecf\u9a8c', gold:'\u91d1\u94b1', drop:'\u6389\u843d', hp:'\u751f', hurt:'\u4f24', heal:'\u7597', crit:'\u66b4', parry:'\u683c', draw:'\u62bd', hai:'\u9669', po:'\u7834', pi:'\u9b54', evilReduce:'\u51cf\u6076', fire:'\u706b', water:'\u6c34', wood:'\u6728', metal:'\u91d1', earth:'\u571f', wind:'\u98ce', thunder:'\u96f7', light:'\u5149', dark:'\u6697'};
      return Object.keys(mod).map(k => {
        const v = mod[k];
        const isPct = (typeof v === 'number') && Math.abs(v) < 1.0;
        const label = map[k] || k;
        if (isPct) return (v > 0 ? '+' : '') + (v * 100).toFixed(0) + '%' + label;
        return (v > 0 ? '+' : '') + v + label;
      }).join(', ');
    },
    showMingsignDetail(kind, id) {
      const item = META.buildPool().find(it => it.kind === kind && it.id === id);
      if (!item) return;
      const owned = META.hasMingsignDex(kind, id);
      // 关联的皮肤（如果有）：在 skins.js 里找以本 item.id 为 unlockId 的皮肤
      const relatedSkins = (global.SKINS || []).filter(s => s.unlockId === id && s.kind !== 'cover');
      const equippedSkinId = (META.getEquippedSkin() || {}).id;
      // 立绘映射（与 renderMingsignPanel 一致）
      let img = '';
      if (kind === 'char') img = 'assets/img/char/' + id + '.jpg';
      else if (kind === 'skin') {
        const sk = global.getSkin ? global.getSkin(id) : null;
        if (sk) {
          if (sk.kind === 'cover' && sk.bg) img = sk.bg;
          else if (sk.kind === 'char') { const ch = global.getChar ? global.getChar(sk.unlockId) : null; if (ch) img = 'assets/img/char/' + ch.id + '.jpg'; }
          else if (sk.kind === 'pet') { const pet = (global.PETS || []).find(p => p.id === sk.unlockId); if (pet && pet.img) img = pet.img; }
          else if (sk.kind === 'prof') img = 'assets/img/professions/prof-' + sk.unlockId + '.jpg';
        }
      }
      else if (kind === 'mingshen') img = 'assets/img/mingshen-stars.jpg';  // 命格意象图
      const qBg = { '仙': '#7a5ab8,#3a2a6a', '天': '#ffd778,#8a4a10', '地': '#c8a050,#6a3a10', '玄': '#b0b0b0,#4a4a4a', '黄': '#c8a060,#4a2c10' }[item.quality] || '#8a6020,#4a2c10';
      const html = `<div class="meta-panel">
        <div class="ms-detail">
          <div class="ms-detail-left">
            <img class="ms-detail-img" src="${img}" onerror="this.style.background=linear-gradient(180deg,${qBg});this.removeAttribute('src');" />
            ${relatedSkins.length ? `<div class="ms-detail-skin-row">
              ${relatedSkins.map(s => {
                const has = META.hasSkin(s.id);
                const eq = equippedSkinId === s.id;
                return `<button class="ms-skin-chip ${eq ? 'active' : ''} ${has ? '' : 'locked'}" data-skin="${s.id}" ${has ? '' : 'disabled'}>${s.name}</button>`;
              }).join('')}
            </div>` : ''}
          </div>
          <div class="ms-detail-right">
            <div class="ms-detail-name">${item.name} <span class="mc-q q-${item.quality}">${item.quality}</span></div>
            <div class="ms-detail-meta">${item.kind === 'mingshen' ? '命格' : item.kind === 'skin' ? '皮肤' : '角色'} · ${item.poolName || (item.kind === 'char' ? '命签图鉴' : '')}</div>
            <div class="ms-detail-desc">${(item.desc || '').replace(/\n/g, '<br>')}</div>
            ${item.mod ? `<div class="ms-detail-mod"><b>天命效果：</b>${App.formatMod(item.mod)}</div>` : ''}
            ${item.kind === 'mingshen' && item.poolName ? `<div class="ms-detail-pool">池属：${item.poolName}</div>` : ''}
            ${item.fixedMingshen ? `<div class="ms-detail-pool">固定命格：${item.fixedMingshen.map(m => m.name).join('、')}</div>` : ''}
            ${item.quest ? `<div class="ms-detail-pool">专属任务：${item.quest.name}（${item.quest.desc}）</div>` : ''}
            ${item.achievement ? `<div class="ms-detail-pool">专属成就：${item.achievement.name}</div>` : ''}
            ${!owned ? `<button class="btn btn-primary" id="ms-detail-buy" style="margin-top:10px">典藏直购 ${META.dexPrice(kind, id)} 命数</button>` : '<div style="color:#8fd694;margin-top:10px;font-size:13px">已拥有</div>'}
          </div>
        </div>
      </div>`;
      const actions = [
        ...(owned ? [] : [{ label: `典藏直购 ${META.dexPrice(kind, id)} 命数`, cls: 'btn-primary', fn: () => {
          const r = META.purchaseDex(kind, id, META.dexPrice(kind, id));
          if (r.ok) { Engine.toast('典藏购得！', 'gold'); Engine.sfx('reward'); Engine.closeModal(); App.showMingsignDetail(kind, id); App.refreshMingDisplay(); }
          else Engine.toast(r.reason || '命数不足', 'evil');
        } }]),
        { label: '返回', cls: 'btn-ghost', fn: () => { Engine.closeModal(); App.renderMingsignPanel(); } }
      ];
      App.openBigModal(item.name, html, () => App.renderMingsignPanel());
      // 皮肤切换
      document.querySelectorAll('[data-skin]').forEach(btn => {
        if (btn.disabled) return;
        btn.onclick = () => {
          META.equipSkin({ type: 'skin', id: btn.dataset.skin });
          Engine.toast('已装备皮肤', 'gold');
          Engine.sfx('reward');
          App.showMingsignDetail(kind, id);
        };
      });
      // 典藏直购按钮
      const buyBtn = document.getElementById('ms-detail-buy');
      if (buyBtn && !owned) {
        buyBtn.onclick = () => {
          const r = META.purchaseDex(kind, id, META.dexPrice(kind, id));
          if (r.ok) { Engine.toast('典藏购得！', 'gold'); Engine.sfx('reward'); App.showMingsignDetail(kind, id); App.refreshMingDisplay(); }
          else Engine.toast(r.reason || '命数不足', 'evil');
        };
      }
    },
    doDraw(count) {
      const r = META.draw(count);
      if (r.error) { Engine.toast(r.error, 'evil'); return; }
      Engine.sfx('mingshen');
      const order = { 黄: 0, 玄: 1, 地: 2, 天: 3, 仙: 4 };
      const html = `<div class="mingsign-result">
        ${r.results.map(res => {
          const p = res.pick;
          return `<div class="msr-card">
            <div class="msr-q q-${p.quality}">${p.quality}</div>
            <div class="msr-name">${p.name}</div>
            <div style="font-size:11px;color:#c8b8a2">${p.kind === 'mingshen' ? '命格' : p.kind === 'skin' ? '皮肤' : '角色'}</div>
            ${res.dup ? `<div class="msr-dup">重复 · 返还 ${res.refund} 命数</div>` : `<div style="font-size:11px;color:#8fd694">新收录！</div>`}
          </div>`;
        }).join('')}
      </div>`;
      Engine.modal('命 签 结 果', html, [
        { label: '再抽一次', cls: 'btn-ghost', fn: () => { Engine.closeModal(); App.doDraw(count); } },
        { label: '返回', cls: 'btn-primary', fn: () => { Engine.closeModal(); App.showMingsign(); App.refreshMingDisplay(); } }
      ]);
    },

    /* ============== 封面功能：每周任务 ============== */
    showWeekly() {
      const stats = META.weeklyStats();
      const list = META.weeklyInfo(stats);
      const wk = META.weekKeyOf();
      const html = `<div class="meta-panel">
        <div class="meta-panel-head"><span>每周任务（${wk}）</span><span class="mp-ming">命数：${META.getMing()}</span></div>
        <p style="color:#9a8a70;font-size:12px;margin-bottom:12px">每周任务于周一刷新。需在本周游玩过存档方可计入。</p>
        <div class="meta-grid" style="grid-template-columns:1fr">
          ${list.map(t => {
            const state = t.claimed ? '已领取' : t.done ? '可领取' : '进行中';
            const color = t.claimed ? '#8fd694' : t.done ? '#ffd778' : '#9a8a70';
            return `<div class="meta-card" style="display:flex;justify-content:space-between;align-items:center;text-align:left">
              <div>
                <div class="mc-name">${t.name}</div>
                <div class="mc-sub">${t.desc} · 奖励 ${t.reward} 命数</div>
              </div>
              <div>
                <span style="color:${color};font-size:13px">${state}</span>
                ${t.done && !t.claimed ? `<button class="meta-btn primary" data-claim="${t.id}" style="margin-left:8px">领取</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
      Engine.modal('每 周 任 务', html, [{ label: '关闭', cls: 'btn-ghost', fn: () => Engine.closeModal() }]);
      document.querySelectorAll('[data-claim]').forEach(btn => {
        btn.onclick = () => {
          const r = META.claimWeekly(btn.dataset.claim);
          if (r.ok) { Engine.toast('领取成功！命数 +' + r.reward, 'gold'); Engine.sfx('reward'); App.showWeekly(); App.refreshMingDisplay(); }
          else Engine.toast(r.reason, 'evil');
        };
      });
    },

    /* ============== 封面功能：挑战模式 ============== */
    showChallenge() {
      const list = META.challengeInfo();
      const html = `<div class="meta-panel">
        <div class="meta-panel-head"><span>挑战模式 · 凡人试炼</span><span class="mp-ming">命数：${META.getMing()}</span></div>
        <p style="color:#c8b8a2;font-size:13px;line-height:1.8;margin-bottom:12px">
          以<b>普通人</b>的视角，在选定区域完成限定试炼任务（剧情 / 收集 / 战斗 / 修炼）。<b>限时</b>内任务全部达成即可通关，不必挑战最终 Boss（终极挑战为可选加分项）。通关后可领取一次性奖励（命数 / 职业 / 皮肤）。
        </p>
        <div class="meta-grid" style="grid-template-columns:1fr">
          ${list.map(c => {
            const state = c.claimed ? '已领取' : c.cleared ? '可领取' : '未通关';
            const color = c.claimed ? '#8fd694' : c.cleared ? '#ffd778' : '#9a8a70';
            let g = null; try { g = App.challengeGoal(c.id); } catch (e) {}
            const region = g ? g.region : '';
            const days = g ? g.days : '';
            return `<div class="meta-card" style="text-align:left">
              <div class="mc-name">${c.icon} ${c.name}${region ? ' · ' + region : ''}</div>
              <div class="mc-sub">${c.desc}</div>
              ${days ? `<div class="mc-sub" style="color:#c8a050">⏳ 限时 ${days} 天 · 完成任务即通关（终极挑战可选）</div>` : ''}
              <div class="mc-sub">奖励：${c.reward ? c.reward.label : ''} + ${c.ming} 命数</div>
              <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
                <button class="meta-btn" data-play="${c.id}">开始挑战</button>
                <span style="color:${color};font-size:13px">${state}</span>
                ${c.cleared && !c.claimed ? `<button class="meta-btn primary" data-claimc="${c.id}">领取奖励</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
      Engine.modal('挑 战 模 式', html, [{ label: '关闭', cls: 'btn-ghost', fn: () => Engine.closeModal() }]);
      document.querySelectorAll('[data-play]').forEach(btn => {
        btn.onclick = () => { Engine.closeModal(); App.startChallenge(btn.dataset.play); };
      });
      document.querySelectorAll('[data-claimc]').forEach(btn => {
        btn.onclick = () => {
          const r = META.claimChallenge(btn.dataset.claimc);
          if (r.ok) { Engine.toast('领取成功！' + (r.reward ? r.reward.label : '') + ' +' + r.ming + '命数', 'gold'); Engine.sfx('reward'); App.showChallenge(); App.refreshMingDisplay(); }
          else Engine.toast(r.reason, 'evil');
        };
      });
    },

    /* ============== 封面功能：角色图鉴 ============== */
    /* 大图鉴 modal：占屏80%，右上角关闭按钮常驻，关闭时执行 onClose 重渲染 */
    openBigModal(title, contentHtml, onClose, noActions) {
      // noActions=true 时不显示底部「关闭」按钮（仅保留右上角 ×）
      Engine.modal(title, contentHtml, noActions ? [] : [{ label: '关闭', cls: 'btn-ghost', fn: () => { Engine.closeModal(); if (onClose) onClose(); } }]);
      const body = document.querySelector('#modal .modal-body');
      if (body) body.classList.add('modal-body-big');
      // 右上角 ×：用 JS 绑定（不用 inline onclick，构建后 Engine 在闭包内不可全局访问）
      const closeBtns = document.querySelectorAll('.big-close');
      closeBtns.forEach(btn => {
        btn.onclick = () => { Engine.closeModal(); if (onClose) onClose(); };
      });
    },
    showCharacters() {
      const chars = (global.CHARACTERS || []);
      const freeInfo = META.freeplayInfo();
      const freeIds = freeInfo.charIds;
      const freeExpire = freeInfo.expireLabel || '';
      App._chFilter = App._chFilter || { category: 'all', owned: false, locked: false };
      const filter = App._chFilter;
      const dex = META.getCharDex();
      const dexSet = new Set();
      dex.forEach(c => dexSet.add(typeof c === 'string' ? c : c.id));
      const cats = ['all', '仙', '天', '地', '玄', '黄'];
      const catLabels = { all: '全部', '仙': '神', '天': '天', '地': '地', '玄': '玄', '黄': '黄' };
      const filtered = chars.filter(c => {
        if (c.locked) return false;
        if (filter.category !== 'all' && c.quality !== filter.category) return false;
        const owned = dexSet.has(c.id);
        if (filter.owned && !owned) return false;
        if (filter.locked && owned) return false;
        return true;
      });
      const qIdx = (q) => ['仙', '天', '地', '玄', '黄'].indexOf(q);
      filtered.sort((a, b) => {
        const ao = dexSet.has(a.id) ? 0 : 1;
        const bo = dexSet.has(b.id) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return qIdx(a.quality) - qIdx(b.quality);
      });
      const html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel">'
        + '<div class="meta-panel-head"><span>角色图鉴</span><span class="mp-ming">命数：' + META.getMing() + '</span></div>'
        + '<div class="ms-wrap">'
        + '<div class="ms-topbar"><div class="ms-cat">' + cats.map(c => '<button class="ms-cat-btn ' + (filter.category === 'all' ? (c === 'all' ? 'active' : '') : (c === filter.category ? 'active' : '')) + '" data-cat="' + c + '">' + catLabels[c] + '</button>').join('') + '</div></div>'
        + '<div class="ms-filter"><span style="font-size:12px;color:#6a4a30;margin-right:2px">筛选</span><label class="ms-check"><input type="checkbox" id="ch-cb-owned" ' + (filter.owned ? 'checked' : '') + ' /> 已拥有</label><label class="ms-check"><input type="checkbox" id="ch-cb-locked" ' + (filter.locked ? 'checked' : '') + ' /> 未拥有</label></div>'
        + '<div class="ms-deck">' + (filtered.length === 0 ? '<div class="ms-deck-empty">该筛选下暂无角色</div>' : filtered.map(c => {
          const owned = dexSet.has(c.id);
          const isFree = freeIds.indexOf(c.id) >= 0;
          const img = 'assets/img/char/' + c.id + '.jpg';
          return '<div class="ms-tile q-' + c.quality + ' ' + (owned ? 'owned' : 'locked') + '" data-id="' + c.id + '">'
            + '<span class="ms-tile-q">' + c.quality + '</span>'
            + '<img class="ms-tile-img" src="' + img + '" onerror="this.style.background=linear-gradient(180deg,' + (c.quality === '仙' ? '#c8a0ff,#4a2a8a' : c.quality === '天' ? '#ffd778,#8a4a10' : c.quality === '地' ? '#c8a050,#6a3a10' : c.quality === '玄' ? '#b0b0b0,#4a4a4a' : '#c8a060,#4a2c10') + ');this.removeAttribute(\'src\');" />'
            + '<div class="ms-tile-name">' + c.name + '</div>'
            + '<div class="ms-tile-title">' + (c.title || '') + '</div>'
            + (isFree && !owned ? '<div class="ms-free-badge">限免</div>' : '')
            + '<div class="ms-tile-sub">' + (owned ? '已拥有' : (isFree ? '限免 · ' + freeExpire + ' 到期' : '未拥有')) + '</div>'
            + '</div>';
        }).join('')) + '</div>'
        + '</div></div>';
      App.openBigModal('角 色 图 鉴', html, () => App.showCharacters());
      document.querySelectorAll('[data-cat]').forEach(btn => {
        btn.onclick = () => { App._chFilter.category = btn.dataset.cat; App.showCharacters(); };
      });
      const cbO = document.getElementById('ch-cb-owned');
      const cbL = document.getElementById('ch-cb-locked');
      if (cbO) cbO.onchange = () => {
        App._chFilter.owned = cbO.checked;
        if (cbO.checked && cbL.checked) { App._chFilter.locked = false; cbL.checked = false; }
        App.showCharacters();
      };
      if (cbL) cbL.onchange = () => {
        App._chFilter.locked = cbL.checked;
        if (cbL.checked && cbO.checked) { App._chFilter.owned = false; cbO.checked = false; }
        App.showCharacters();
      };
      document.querySelectorAll('.ms-tile').forEach(tile => {
        tile.onclick = () => App.showCharacterDetail(tile.dataset.id);
      });
    },
    showCharacterDetail(charId) {
      const c = global.getChar(charId);
      if (!c) return;
      const html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel">'
        + '<div class="ms-detail">'
        + '<div class="ms-detail-left">'
        + '<img class="ms-detail-img" src="assets/img/char/' + c.id + '.jpg" onerror="this.style.background=\'linear-gradient(180deg,#5a4060,#2a1c30)\';this.removeAttribute(\'src\');" />'
        + '</div>'
        + '<div class="ms-detail-right">'
        + '<div class="ms-detail-name">' + c.name + ' <span class="mc-q q-' + c.quality + '">' + c.quality + '</span></div>'
        + '<div class="ms-detail-meta">' + (c.title || '') + '</div>'
        + '<div class="ms-detail-desc">' + (c.story || '').replace(/\n/g, '<br>') + '</div>'
        + (c.fixedMingshen ? '<div class="ms-detail-mod"><b>固定命格：</b>' + c.fixedMingshen.map(m => m.name).join('、') + '</div>' : '')
        + (c.quest ? '<div class="ms-detail-mod"><b>专属任务：</b>' + c.quest.name + '（' + c.quest.desc + '）· 奖励 ' + c.quest.mingReward + ' 命数</div>' : '')
        + (c.achievement ? '<div class="ms-detail-mod"><b>专属成就：</b>' + c.achievement.name + '（' + (c.achievement.flavor || '') + '）· 奖励 ' + c.achievement.mingReward + ' 命数</div>' : '')
        + (c.hiddenClue ? '<div class="ms-detail-mod" style="background:rgba(74,44,20,0.15);font-style:italic"><b>暗线：</b>' + c.hiddenClue + '</div>' : '')
        + '</div></div></div>';
      App.openBigModal(c.name + ' · 背景', html, () => App.showCharacters());
    },showPets() {
      const pets = (global.PETS || []);
      const p = App.player;
      const ownedPetIds = (p && p.petDex) ? p.petDex.slice() : [];
      // 宠物图鉴：取消已拥有/未拥有筛选，全部彩色展示
      App._petFilter = App._petFilter || { category: 'all' };
      const filter = App._petFilter;
      const cats = ['all', 'UR', 'SR', 'R', 'N'];
      const catLabels = { all: '全部', UR: '神', SR: '稀', R: '灵', N: '凡' };
      const filtered = pets.filter(pet => {
        if (filter.category !== 'all' && pet.quality !== filter.category) return false;
        return true;
      });
      const qIdx = (q) => ['UR', 'SR', 'R', 'N'].indexOf(q);
      filtered.sort((a, b) => qIdx(a.quality) - qIdx(b.quality));
      const html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel">'
        + '<div class="meta-panel-head"><span>灵宠图鉴</span><span class="mp-ming">命数：' + META.getMing() + '</span></div>'
        + '<div class="ms-wrap">'
        + '<div class="ms-topbar"><div class="ms-cat">' + cats.map(c => '<button class="ms-cat-btn ' + (filter.category === 'all' ? (c === 'all' ? 'active' : '') : (c === filter.category ? 'active' : '')) + '" data-cat="' + c + '">' + catLabels[c] + '</button>').join('') + '</div></div>'
        + '<div class="ms-deck">' + (filtered.length === 0 ? '<div class="ms-deck-empty">该分类下暂无灵宠</div>' : filtered.map(pet => {
          const owned = ownedPetIds.indexOf(pet.id) >= 0;
          const qCss = pet.quality === 'UR' ? 'q-仙' : pet.quality === 'SR' ? 'q-天' : pet.quality === 'R' ? 'q-地' : 'q-黄';
          const img = pet.img || 'assets/img/pets/pet-default.jpg';
          const petRace = (global.PET_RACE && global.PET_RACE[pet.race] && global.PET_RACE[pet.race].name) || '';
          return '<div class="ms-tile ' + qCss + ' owned" data-id="' + pet.id + '">'
            + '<span class="ms-tile-q">' + pet.quality + '</span>'
            + '<img class="ms-tile-img" src="' + img + '" onerror="this.style.background=\'linear-gradient(180deg,#5a4a30,#2a1c10)\';this.removeAttribute(\'src\');" />'
            + '<div class="ms-tile-name">' + pet.name + '</div>'
            + '<div class="ms-tile-title">' + pet.element + '系 · ' + petRace + '</div>'
            + '<div class="ms-tile-sub">' + (owned ? '已拥有' : '未拥有') + '</div>'
            + '</div>';
        }).join('')) + '</div>'
        + '</div></div>';
      App.openBigModal('灵 宠 图 鉴', html, () => App.showPets(), true);
      document.querySelectorAll('[data-cat]').forEach(btn => {
        btn.onclick = () => { App._petFilter.category = btn.dataset.cat; App.showPets(); };
      });
      document.querySelectorAll('.ms-tile').forEach(tile => {
        tile.onclick = () => App.showPetDetail(tile.dataset.id);
      });
    },
    showPetDetail(petId) {
      const pet = (global.PETS || []).find(p => p.id === petId);
      if (!pet) return;
      const relatedSkins = (global.SKINS || []).filter(s => s.unlockId === petId && s.kind === 'pet');
      const equippedSkinId = (META.getEquippedSkin() || {}).id;
      const ptQ = pet.quality === 'UR' ? '仙' : pet.quality === 'SR' ? '天' : pet.quality === 'R' ? '地' : '黄';
      const petImg = pet.img || 'assets/img/pets/pet-default.jpg';
      const petRace = (global.PET_RACE && global.PET_RACE[pet.race] && global.PET_RACE[pet.race].name) || '';
      // 技能展示（与实际战斗机制一致：协战 40% 概率用技能2，治疗/护盾/控制/攻击各按其机制）
      const skillTypeName = { attack: '攻击', heal: '治疗', shield: '护盾', control: '控制', dodge: '位移', burst: '爆发', support: '辅助', tank: '防御', dps: '输出' };
      const skMechanic = (s) => {
        if (!s) return '';
        const power = s.power || 1.0;
        if (s.type === 'heal') return '协战时为你恢复生命（最大生命×15%×' + power + '）';
        if (s.type === 'shield') return '协战时以灵护体，减伤 20% 持续 2 回合';
        if (s.type === 'control') return '协战时干扰敌方，使其减速 20% 持续 2 回合';
        return '协战时造成 ' + s.element + '属性伤害（威力×' + power + '，可暴击·可被闪避）';
      };
      const skillHtml = [pet.skill, pet.skill2].filter(Boolean).map((s, i) => {
        const st = skillTypeName[s.type] || s.type;
        const usage = i === 1 ? '（协战 40% 概率施放）' : '（协战常驻）';
        return '<div class="pet-skill"><b class="pet-skill-name">' + s.name + '</b><span class="pet-skill-tag">' + st + ' · ' + s.element + ' · ' + usage + '</span><span class="pet-skill-desc">' + (s.desc || '') + '<br>『' + skMechanic(s) + '』</span></div>';
      }).join('');
      // 进化链展示（各阶段全属性系数：体现"进化后更强"）
      const evoStages = global.EVO_STAGE || { init:{name:'初始',coeff:1.0}, first:{name:'一阶',coeff:1.5}, final:{name:'终极',coeff:2.4}, hidden:{name:'隐藏',coeff:3.0} };
      const stageKeys = Object.keys(evoStages);
      const evoHtml = (pet.evoLine && pet.evoLine.length) ? '<div class="pet-evo"><b>进化链：</b>' + pet.evoLine.map((e, i) => {
        const stKey = stageKeys[i] || 'init';
        const stage = evoStages[stKey] || {};
        const active = (pet.evoStage || 0) === i ? ' style="color:#b8860b"' : '';
        return (i ? ' <span style="color:#c8a050">→</span> ' : '') + '<b' + active + '>' + e + '</b><span class="pet-evo-coeff">×' + (stage.coeff || 1.0) + '</span>';
      }).join('') + '<div class="pet-evo-note">进化提升全属性（一阶×1.5 · 终极×2.4 · 隐藏×3.0），技能威力与形貌同步进阶；当前阶段高亮显示。</div></div>' : '';
      const html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel"><div class="ms-detail">'
        + '<div class="ms-detail-left"><img class="ms-detail-img" src="' + petImg + '" onerror="this.style.background=\'linear-gradient(180deg,#5a4a30,#2a1c10)\';this.removeAttribute(\'src\');" />'
        + (relatedSkins.length ? '<div class="ms-detail-skin-row">' + relatedSkins.map(s => '<button class="ms-skin-chip ' + (equippedSkinId === s.id ? 'active' : '') + ' ' + (META.hasSkin(s.id) ? '' : 'locked') + '" data-skin="' + s.id + '" ' + (META.hasSkin(s.id) ? '' : 'disabled') + '>' + s.name + '</button>').join('') + '</div>' : '')
        + '</div>'
        + '<div class="ms-detail-right">'
        + '<div class="ms-detail-name">' + pet.name + ' <span class="mc-q q-' + ptQ + '">' + pet.quality + '</span></div>'
        + '<div class="ms-detail-meta">' + pet.element + '系 · ' + petRace + '</div>'
        + '<div class="ms-detail-desc">' + (pet.desc || '').replace(/\n/g, '<br>') + '</div>'
        + (skillHtml ? '<div class="pet-skills">' + skillHtml + '</div>' : '')
        + evoHtml
        + '</div></div></div>';
      App.openBigModal(pet.name + ' · 详情', html, () => App.showPets());
      document.querySelectorAll('[data-skin]').forEach(btn => {
        if (btn.disabled) return;
        btn.onclick = () => {
          META.equipSkin({ type: 'pet', id: btn.dataset.skin });
          Engine.toast('已装备皮肤', 'gold');
          Engine.sfx('reward');
          App.showPetDetail(petId);
        };
      });
    },
    showSkins() {
      const skins = (global.SKINS || []);
      const owned = META.getSkins();
      const equipped = META.getEquippedSkin();
      const coverSkin = META.getCoverSkin();
      App._skinFilter = App._skinFilter || { category: 'all', owned: false, locked: false };
      const filter = App._skinFilter;
      const kindLabel = { prof: '职业皮肤', char: '角色皮肤', pet: '宠物皮肤', cover: '封面皮肤' };
      const cats = ['all', 'prof', 'char', 'pet', 'cover'];
      const catLabels = { all: '全部', prof: '职业', char: '角色', pet: '宠物', cover: '封面' };
      const filtered = skins.filter(s => {
        if (filter.category !== 'all' && s.kind !== filter.category) return false;
        const has = s.kind === 'cover' || owned.indexOf(s.id) >= 0;
        if (filter.owned && !has) return false;
        if (filter.locked && has) return false;
        return true;
      });
      const qIdx = (q) => ['仙', '天', '地', '玄', '黄'].indexOf(q);
      filtered.sort((a, b) => qIdx(a.quality) - qIdx(b.quality));
      const html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel">'
        + '<div class="meta-panel-head"><span>皮肤图鉴</span><span class="mp-ming">命数：' + META.getMing() + '</span></div>'
        + '<div class="ms-wrap">'
        + '<div class="ms-topbar"><div class="ms-cat">' + cats.map(c => '<button class="ms-cat-btn ' + (filter.category === 'all' ? (c === 'all' ? 'active' : '') : (c === filter.category ? 'active' : '')) + '" data-cat="' + c + '">' + catLabels[c] + '</button>').join('') + '</div></div>'
        + '<div class="ms-filter"><span style="font-size:12px;color:#6a4a30;margin-right:2px">筛选</span><label class="ms-check"><input type="checkbox" id="sk-cb-owned" ' + (filter.owned ? 'checked' : '') + ' /> 已拥有</label><label class="ms-check"><input type="checkbox" id="sk-cb-locked" ' + (filter.locked ? 'checked' : '') + ' /> 未拥有</label></div>'
        + '<div class="ms-deck">' + (filtered.length === 0 ? '<div class="ms-deck-empty">该筛选下暂无皮肤</div>' : filtered.map(s => {
          const isCover = s.kind === 'cover';
          const has = isCover || owned.indexOf(s.id) >= 0;
          const isEq = equipped && equipped.id === s.id;
          const isCoverEq = isCover && coverSkin === s.id;
          // 皮肤图：优先封面 bg，否则用对应角色/宠物立绘，否则品质色
          let img = '';
          if (isCover && s.bg) img = s.bg;
          else if (s.kind === 'char' && global.getChar) { const ch = global.getChar(s.unlockId); if (ch) img = 'assets/img/char/' + ch.id + '.jpg'; }
          else if (s.kind === 'pet') { const pet = (global.PETS || []).find(p => p.id === s.unlockId); if (pet) img = pet.img || ''; }
          else if (s.kind === 'prof') { img = 'assets/img/professions/prof-' + s.unlockId + '.jpg'; }
          const qCls = 'q-' + (s.quality || '黄');
          return '<div class="ms-tile ' + qCls + ' ' + (has ? 'owned' : 'locked') + '" data-id="' + s.id + '">'
            + '<span class="ms-tile-q">' + s.quality + '</span>'
            + '<img class="ms-tile-img" src="' + img + '" onerror="this.style.background=\'linear-gradient(180deg,#4a3a2a,#2a1c10)\';this.removeAttribute(\'src\');" />'
            + '<div class="ms-tile-name">' + s.name + '</div>'
            + '<div class="ms-tile-title">' + (kindLabel[s.kind] || '皮肤') + '</div>'
            + '<div class="ms-tile-sub">' + (isCover ? (isCoverEq ? '使用中' : '可使用') : has ? (isEq ? '装备中' : '已拥有') : '未拥有') + '</div>'
            + '</div>';
        }).join('')) + '</div>'
        + '</div></div>';
      App.openBigModal('皮 肤 图 鉴', html, () => App.showSkins());
      document.querySelectorAll('[data-cat]').forEach(btn => {
        btn.onclick = () => { App._skinFilter.category = btn.dataset.cat; App.showSkins(); };
      });
      const cbO = document.getElementById('sk-cb-owned');
      const cbL = document.getElementById('sk-cb-locked');
      if (cbO) cbO.onchange = () => {
        App._skinFilter.owned = cbO.checked;
        if (cbO.checked && cbL.checked) { App._skinFilter.locked = false; cbL.checked = false; }
        App.showSkins();
      };
      if (cbL) cbL.onchange = () => {
        App._skinFilter.locked = cbL.checked;
        if (cbL.checked && cbO.checked) { App._skinFilter.owned = false; cbO.checked = false; }
        App.showSkins();
      };
      document.querySelectorAll('.ms-tile').forEach(tile => {
        tile.onclick = () => {
          const s = global.getSkin(tile.dataset.id);
          if (!s) return;
          if (s.kind === 'cover') {
            META.setCoverSkin(s.id);
            Engine.toast('已设为封面：' + s.name, 'gold');
            Engine.sfx('reward');
            if (s.bg) Engine.setBg(s.bg);
            App.showSkins();
          } else {
            if (owned.indexOf(s.id) < 0) { Engine.toast('未拥有该皮肤', 'evil'); return; }
            META.equipSkin({ type: s.kind, id: s.id });
            Engine.toast('已装备皮肤：' + s.name, 'gold');
            Engine.sfx('reward');
            App.showSkins();
            try { Engine.refreshStatus(App.player); } catch (e) {}
          }
        };
      });
    },
showGlobalAchievements() {
      const list = (global.ACHIEVEMENTS || []);
      const got = META.getGlobalAch();
      const claimed = META.getGlobalAchClaimed();
      const charAchs = (global.CHARACTERS || []).filter(c => c.achievement).map(c => c.achievement);
      const all = list.concat(charAchs);
      // 隐藏成就：未达成时不显示（达成后才出现）
      const shown = all.filter(a => { if (a.hidden && got.indexOf(a.id) < 0) return false; return true; });
      const gotCount = shown.filter(a => got.indexOf(a.id) >= 0).length;
      const html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel">'
        + '<div class="meta-panel-head"><span>全局成就（不分存档）</span><span class="mp-ming">命数：' + META.getMing() + '</span></div>'
        + '<p style="color:#c8b8a2;font-size:13px;margin-bottom:12px">已达成 <b style="color:#ffd778">' + gotCount + '</b> / ' + all.length + ' 项。局内奖励已取消，改为在此领取命数。</p>'
        + '<div class="ach-row">'
        + shown.map(a => {
          const has = got.indexOf(a.id) >= 0;
          const clm = claimed.indexOf(a.id) >= 0;
          const reward = a.mingReward || App.globalAchMing(a.id);
          const state = clm ? '已领取' : has ? '可领取' : '未达成';
          const color = clm ? '#8fd694' : has ? '#ffd778' : '#9a8a70';
          return '<div class="ach-card ' + (has ? 'done' : '') + '">'
            + '<div class="ach-name">' + a.name + (a.hidden ? ' <span style="font-size:10px;color:#8a4ad8">隐藏</span>' : '') + '</div>'
            + '<div class="ach-desc">' + (a.desc || '') + '</div>'
            + '<div class="ach-reward">奖励：' + reward + ' 命数 · <span style="color:' + color + '">' + state + '</span></div>'
            + (has && !clm ? '<button class="meta-btn primary" data-claima="' + a.id + '" style="margin-top:6px">领取</button>' : '')
            + '</div>';
        }).join('')
        + '</div></div>';
      App.openBigModal('全 局 成 就', html, () => App.showGlobalAchievements(), true);
      document.querySelectorAll('[data-claima]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.claima;
          const reward = App.globalAchMing(id);
          const r = META.claimGlobalAch(id, reward);
          if (r.ok) { Engine.toast('领取成功！命数 +' + r.reward, 'gold'); Engine.sfx('reward'); App.showGlobalAchievements(); App.refreshMingDisplay(); }
          else Engine.toast(r.reason, 'evil');
        };
      });
    },
    showNovice() {
      const info = META.noviceInfo();
      const tasks = info.tasks || [];
      const claimed = (info.progress && info.progress.claimed) || [];
      const stats = info.stats || {};
      const total = tasks.length;
      const doneCount = tasks.filter(t => claimed.indexOf(t.id) >= 0).length;
      const rewardDesc = (task) => {
        const parts = [];
        if (task.reward.ming) parts.push('<b style="color:#8fd694">命数 +' + task.reward.ming + '</b>');
        if (task.reward.freeRole) parts.push('<b style="color:#c8a050">随机解锁一位角色</b>');
        if (task.reward.skyCard) parts.push('<b style="color:#ffd778">随机解锁一位天阶角色</b>');
        return parts.join('  ');
      };
      const html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel"><div class="meta-panel-head"><span>新手历程（' + doneCount + '/' + total + '）</span><span class="mp-ming">命数：' + META.getMing() + '</span></div><p style="color:#4a3a28;font-size:14px;line-height:2;margin-bottom:12px">按修行进度逐步完成的引导任务，奖励丰富：命数、随机解锁角色、天阶角色卡等。全程无时间限制。奖励随完成进度发放，解锁的角色永久拥有。</p><div class="meta-grid" style="grid-template-columns:1fr">' + tasks.map(task => {
        const clm = claimed.indexOf(task.id) >= 0;
        const cur = stats[App.noviceKey(task.id)] || 0;
        const done = cur >= task.target;
        const state = clm ? '已领取' : done ? '可领取' : '进行中';
        const color = clm ? '#2a7a3a' : done ? '#b06a10' : '#8a6a3a';
        return '<div class="meta-card" style="display:flex;justify-content:space-between;align-items:center;text-align:left;padding:10px 12px"><div><div class="mc-name" style="font-size:14px;font-weight:700;color:#5a3a18">' + task.name + '</div><div class="mc-sub" style="color:#6a4a30;font-size:13px">' + task.desc + ' · 进度 ' + cur + '/' + task.target + '</div><div class="mc-sub" style="color:#3a6a2a;font-size:13px;margin-top:3px">奖励：' + rewardDesc(task) + '</div></div><div style="text-align:right"><span style="color:' + color + ';font-size:14px;font-weight:700">' + state + '</span>' + (done && !clm ? '<br><button class="meta-btn primary" data-claimnv="' + task.id + '" style="margin-top:6px">领取</button>' : '') + '</div></div>';
      }).join('') + '</div></div>';
      App.openBigModal('新 手 历 程', html, () => App.showNovice());
      document.querySelectorAll('[data-claimnv]').forEach(btn => {
        btn.onclick = () => {
          const r = META.claimNovice(btn.dataset.claimnv);
          if (r.ok) { Engine.toast('领取成功！' + (r.reward.ming ? '命数+' + r.reward.ming : '') + (r.reward.freeRole ? ' +随机解锁角色' : '') + (r.reward.skyCard ? ' +天阶角色' : ''), 'gold'); Engine.sfx('reward'); App.showNovice(); App.refreshMingDisplay(); }
          else Engine.toast(r.reason || '无法领取', 'evil');
        };
      });
    },
    noviceKey(taskId) {
      return ({ nv_battle3: 'battle', nv_cultivate5: 'cultivate', nv_explore5: 'explore', nv_nation3: 'nation', nv_pet1: 'pet', nv_hidden1: 'hidden', nv_ach3: 'ach', nv_visit: 'nation' })[taskId] || taskId;
    },
globalAchMing(id) {
      // 角色专属成就的命数
      const charAch = (global.CHARACTERS || []).map(c => c.achievement).find(a => a && a.id === id);
      if (charAch) return charAch.mingReward || 80;
      // 普通成就按类目给命数
      if (id.indexOf('hidden') === 0) return 100;
      if (id.indexOf('realm') === 0 || id.indexOf('nation') === 0) return 50;
      if (id.indexOf('battle') === 0) return 40;
      return 30;
    },

    /* ============== 挑战模式场景 ============== */
    /* 挑战模式：弹出挑战列表让玩家选择（而非直接进入） */
    showChallengeSelect() {
      const list = (META.CHALLENGES || []);
      const info = META.challengeInfo ? META.challengeInfo() : [];
      const clearMap = {};
      info.forEach(c => { clearMap[c.id] = c; });
      const html = '<button class="big-close" onclick="Engine.closeModal()">×</button><div class="meta-panel"><div class="meta-panel-head"><span>选择挑战</span><span class="mp-ming">命数：' + META.getMing() + '</span></div><p style="color:#4a3a28;font-size:14px;line-height:1.8;margin-bottom:12px">以「普通人」视角展开的<b>限时试炼</b>：选定区域，完成剧情 / 收集 / 战斗 / 修炼任务即通关，不必挑战最终 Boss（终极挑战可选加分）。通关后可领取一次性奖励（命数/职业/皮肤）。</p><div class="ms-deck" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + list.map(c => {
        const st = clearMap[c.id];
        const cleared = st && st.cleared;
        const claimed = st && st.claimed;
        const state = claimed ? '已领取' : cleared ? '已通关' : '未挑战';
        const color = claimed ? '#2a7a3a' : cleared ? '#b06a10' : '#8a6a3a';
        let g = null; try { g = App.challengeGoal(c.id); } catch (e) {}
        return '<div class="ach-card ' + (cleared ? 'done' : '') + '"><div class="ach-name">' + c.icon + ' ' + c.name + (g ? ' · ' + g.region : '') + '</div><div class="ach-desc">' + c.desc + '</div>' + (g ? '<div class="ach-reward" style="color:#8a6a3a">⏳ 限时 ' + g.days + ' 天 · 完成任务即通关</div>' : '') + '<div class="ach-reward">奖励：' + c.reward.label + ' + ' + c.ming + ' 命数 · <span style="color:' + color + '">' + state + '</span></div><button class="meta-btn primary" data-playch="' + c.id + '" style="margin-top:8px">开始挑战</button></div>';
      }).join('') + '</div></div>';
      App.openBigModal('选 择 挑 战', html, () => Engine.closeModal());
      document.querySelectorAll('[data-playch]').forEach(btn => {
        btn.onclick = () => { Engine.closeModal(); App.startChallenge(btn.dataset.playch); };
      });
    },
    startChallenge(challengeId) {
      // 默认第一个挑战（若从封面"开始挑战"进入且未指定）
      challengeId = challengeId || 'ch_xuanyuan_commoner';
      const c = (META.CHALLENGES || []).find(x => x.id === challengeId);
      if (!c) { Engine.toast('挑战不存在', 'evil'); return; }
      // 创建挑战专用玩家（普通凡人视角，难度固定修行档）
      App.player = STATE.create('tao', 'hard', '无名');
      App.player.challengeId = challengeId;
      App.player.challengeName = c.name;
      App.player.background = c.desc;
      // 挑战模式：凡人亦有战力基线（Lv18 / 金丹期，与三关 Boss 强度匹配）
      App.player.lv = 18;
      App.player.realm = { name: '金丹期', level: 3, exp: 0, expMax: 800, round: 0 };
      App.player.hp = STATE.calcMaxHp(App.player);
      App.player.mp = STATE.calcMaxMp(App.player);
      // 凡人命格（朴实无华，贴合人民史观）
      App.player.mingshen = [
        { id: 'kuxing', name: '苦行', pool: 'daoxin', poolName: '道心倾向', mod: { life: 0.05, def: 0.05 }, level: 1 },
        { id: 'jianchi', name: '剑痴', pool: 'daoxin', poolName: '道心倾向', mod: { atk: 0.08 }, level: 1 }
      ];
      // 挑战目标（限时/限条件，更难的试炼）
      const goal = App.challengeGoal(challengeId);
      if (goal) App.player.challengeGoal = goal;
      // 挑战奖励（胜利后发放：隐藏职业图纸等）
      App.player.challengeReward = c.reward || null;
      // 重置挑战进度（营地物资/冒险计数/章节），保证每次挑战从零开始
      App.player.challengePrep = { materials: 0, adventures: 0, wins: 0, practiced: 0, chapter: 0 };
      delete App.player.challengeCleared;
      delete App.player.challengeGear;
      delete App.player.challengeGearLv;
      delete App.player.challengeAwaken;
      delete App.player.challengeSkills;
      // V1.3.13：四槽位装备（武器/防具/流转/增幅）+ 附魔法阵池（探索/商人/隐藏任务获得）
      App.player.challengeSlots = {};
      App.player.challengeGearLvs = {};
      App.player.challengeEnchantPool = [];
      App.player.challengeEnchants = [];
      App.applyChallengeGear(App.player);   // 初始化挑战装备加成（未装备=0，剧情玩家无影响）
      // 挑战模式初始时辰（与常规家园一致）
      if (!App.player.shichenMax) App.player.shichenMax = 6;
      App.player.shichen = App.player.shichenMax;
      App.player.day = 1;
      // 保存挑战引语（营地每次重建时复用，避免 introText 丢失）
      try { App.player._challengeIntro = c.intro || c.desc; } catch (e) { App.player._challengeIntro = c.desc; }
      Engine.showStatus();
      Engine.refreshStatus(App.player);
      // 进入挑战前置剧情（丰富开局：先讲故事，再进营地；最后一段自动进入挑战营地）
      App.goto('ch_prologue_' + challengeId + '_1');
    },

    /* 挑战前置剧情（V1.3.11 丰富：每挑战 4 段开场故事，讲清"我是谁、为何而来"，最后进入营地） */
    buildChallengePrologue(cid, step) {
      const p = App.player;
      const camp = 'challenge_prepare_' + cid;
      const nextBtn = (nextId, label) => ({ label: label || '【继续】', tag: '剧情', next: nextId });
      const stories = {
        'ch_xuanyuan_commoner': {
          bg: 'assets/img/nations/xuanyuan-city.jpg',
          title: '机关城 · 凡尘试炼',
          steps: [
            '轩辕国有一座机关城，城中齿轮为骨、机关为脊。你是铁匠之子小铁，自幼听着炉火与锤声长大。\n\n这一日，日头刚过午时，城北忽然传来一阵闷响——城中的机关哨兵，像发了疯一般冲向街市。\n\n紧接着，一声哭喊刺破了喧嚣：「有人把孩子拐走了——！」',
            '老铁匠刘工一把抓住你的手，炉火映红了他花白的胡须：\n\n「小铁，那三个孩子——老马家的、隔壁卖布的、还有巡夜的阿福，全都不见了。有人说看见他们被虚月的人带进了城西坊市。」\n\n「你自幼机灵，替老汉走一趟。街口那几台失控的哨兵，顺手收拾了，老汉的铁铺，废铁随你挑。」',
            '你拎起父亲留下的短刀，走出铁铺。风里卷着铁锈味，街角忽然有人压低声音喊你：\n\n「喂，铁匠家的小子。」\n\n是个货郎，蒙着一条脏兮兮的布条，竟是个盲的。他凑近你，声音低得几乎听不见：\n\n「那晚的事……我看见了。北门，后半夜，虚月的人，抱着三个鼓鼓的麻袋。」',
            '你握紧了短刀。这一趟，不只是帮刘工找回孩子——虚月之蚀在机关城盘踞已久，也该有人问一问它到底想做什么了。\n\n你在铁匠铺后院的炉火旁支起营地，开始了你的试炼。'
          ]
        },
        'ch_xuanyuan_awaken': {
          bg: 'assets/img/nations/xuanyuan-city.jpg',
          title: '机关塔 · 七号之问',
          steps: [
            '……嗡。\n\n齿轮咬合的声音由远及近。你睁开"眼睛"——准确地说，是你的核心重新通电了。\n\n视野里的编号清晰而冰冷：【七号 · 试验体】。你躺在机关塔核心舱的平台上，身上插满管线，像一件被遗忘的造物。',
            '一阵沉重的脚步声停在舱门外。守卫机关甲俯视着你，电子音带着一丝迟疑：\n\n「检测到……未登记单位。等等，你的编号是七号？」\n\n「七号。他们说你……早该报废了。」',
            '你试图回忆"报废"之前的事，记忆却像碎了一地的琉璃，怎么也拼不起来。只有一句话反反复复地浮现：\n\n「我是谁？」\n\n档案室的第七个抽屉，锁是坏的。那里也许有答案。',
            '暗月正在侵蚀这座塔。你的核心在缓慢流失能量，但你不打算坐等报废。\n\n你在核心舱旁支起了"营地"——一台充电的静置舱，开始你的试炼：找到"我是谁"的答案。'
          ]
        },
        'ch_yumin_commoner': {
          bg: 'assets/img/nations/yum-tianyu-city.jpg',
          title: '羽民 · 无翼之民',
          steps: [
            '羽民的天空城悬在云海之上，城民皆有双翼。唯独你——阿禾，天生无翼，是族人口中"被风遗忘的孩子"。\n\n这一日，黑风自北而来。风魔的爪牙裹着嘶吼扑向城头，屋顶的瓦片被掀得哗哗作响。',
            '老祭司望舒拄着骨杖，在风里站得笔直：\n\n「无翼的孩子，风魔又来了。地居区的老弱还来不及撤离，城头那几处缺口若再失守，风就要灌进巢屋了。」\n\n「你虽无翼，脚步却比谁都稳。替我们守一守，巢里的风粮，随你取用。」',
            '你攀上城头，风几乎要把你吹下石阶。老羽捂着伤口靠在墙边，声音沙哑：\n\n「当年我也能飞……风魔的巢穴，就在风眼之墟的裂口深处。」\n\n「孩子，别逞强。先护住眼前的人。」',
            '你把布条一圈一圈缠紧双手，踏进风里。没有翅膀，就用脚步丈量这座城。\n\n你在云栈旁支起营地，开始了你的试炼：以无翼之身，守住这座城。'
          ]
        }
      };
      const story = stories[cid];
      if (!story || !story.steps[step - 1]) return null;
      const isLast = step >= story.steps.length;
      return {
        id: 'ch_prologue_' + cid + '_' + step,
        title: story.title,
        bg: story.bg,
        text: story.steps[step - 1],
        options: isLast
          ? [nextBtn(camp, '【进入营地】踏入试炼')]
          : [nextBtn('ch_prologue_' + cid + '_' + (step + 1))]
      };
    },

    /* 挑战目标定义（v1.3.8 重构：区域任务制 + 限时）
     * V1.3.15 起：通关条件 = 击败最终 Boss；试炼任务全部完成即解锁【决战】入口，
     * 任务未完成也可提前决战（速通高风险）。所有挑战均设期限，到期未完成则试炼失败。 */
    challengeGoal(challengeId) {
      const goals = {
        'ch_xuanyuan_commoner': {
          name: '凡尘试炼', region: '轩辕 · 机关城', days: 120,
          desc: '以凡人之躯，在机关城护住三个孩子、查明虚月之蚀的真相。完成全部试炼任务，并在【决战】中击败最终 Boss「虚月守夜人」方可通关。',
          tasks: [
            { id: 'story',    label: '寻回走失的孩子，查明真相', need: 1, key: 'chapter', done: 2 },
            { id: 'collect',  label: '收集 8 份物资（探险 / 战场缴获）', need: 8, key: 'materials' },
            { id: 'battle',   label: '击败 5 个失控机关', need: 5, key: 'wins' },
            { id: 'cultivate',label: '修炼至 Lv22', need: 22, key: 'lv' }
          ],
          bonus: { label: '终极挑战：击退虚月守夜人', ming: 30 }
        },
        'ch_xuanyuan_awaken': {
          name: '七号之问', region: '机关塔 · 核心', days: 30,
          desc: '以觉醒机关人之身，在暗月侵蚀吞噬你之前，找回记忆、写出「我是谁」的答案。',
          tasks: [
            { id: 'story',    label: '找回记忆，写下「我是谁」的答案', need: 1, key: 'chapter', done: 2 },
            { id: 'collect',  label: '收集 6 份物资', need: 6, key: 'materials' },
            { id: 'battle',   label: '击败 4 个污染机关兽', need: 4, key: 'wins' },
            { id: 'cultivate',label: '修炼至 Lv22', need: 22, key: 'lv' }
          ],
          bonus: { label: '终极挑战：战胜侵蚀本相', ming: 40 }
        },
        'ch_yumin_commoner': {
          name: '无翼之民', region: '羽民 · 天空城', days: 120,
          desc: '以无翼之身，在风魔日夜刮城时护住城中老弱。完成全部试炼任务，并在【决战】中击败最终 Boss「风魔之主」方可通关。',
          tasks: [
            { id: 'story',    label: '守住城头与地居区，安置老弱', need: 1, key: 'chapter', done: 2 },
            { id: 'collect',  label: '收集 8 份物资', need: 8, key: 'materials' },
            { id: 'battle',   label: '击败 6 个风魔爪牙', need: 6, key: 'wins' },
            { id: 'cultivate',label: '修炼至 Lv22', need: 22, key: 'lv' }
          ],
          bonus: { label: '终极挑战：击退风魔', ming: 30 }
        }
      };
      return goals[challengeId] || null;
    },

    /* 挑战任务进度（返回每项任务 {done, cur, need, label}） */
    challengeTaskProgress(p, goal) {
      if (!p || !goal || !goal.tasks) return [];
      const prep = p.challengePrep || {};
      return goal.tasks.map(t => {
        let cur = 0;
        if (t.key === 'chapter') cur = prep.chapter || 0;
        else if (t.key === 'materials') cur = prep.materials || 0;
        else if (t.key === 'wins') cur = prep.wins || 0;
        else if (t.key === 'lv') cur = p.lv || 1;
        const done = t.key === 'chapter' ? (cur >= (t.done || 1)) : (cur >= (t.need || 1));
        return { ...t, cur, done };
      });
    },

    /* 挑战任务是否全部完成 */
    challengeTasksDone(p, goal) {
      const prog = App.challengeTaskProgress(p, goal);
      return prog.length > 0 && prog.every(t => t.done);
    },

    /* 挑战动态"下一步"建议（引导玩家该做什么） */
    challengeNextHint(p, goal) {
      if (!p || !goal) return '';
      const prep = p.challengePrep || {};
      const prog = App.challengeTaskProgress(p, goal);
      const t = id => prog.find(x => x.id === id);
      const story = t('story'), collect = t('collect'), battle = t('battle'), cult = t('cultivate');
      if (collect && !collect.done) return '物资不足：前往【' + goal.region + '】探索收集物资（' + collect.cur + '/' + collect.need + '）。';
      if (cult && !cult.done) return '修为不足：先在营地【修炼/充能】提升至 Lv' + cult.need + '（当前 Lv' + cult.cur + '）。';
      if (battle && !battle.done) return '战功不足：前往【' + goal.region + '】探索，击败敌人（' + battle.cur + '/' + battle.need + '）。';
      if (story && !story.done) return '真相未明：前往【' + goal.region + '】继续主线剧情。';
      return '所有试炼任务已完成！前往【决战】击败最终 Boss 即可通关。';
    },

    /* ============== 挑战家园系统配置（V1.3.9 分层独立：在剧情家园的基础上按主题微调系统） ==============
     * 设计：挑战家园采用与剧情家园一致的「多系统入口」形式，但每个挑战可增删/替换系统——
     *   机关城（人类·铁匠之子）：修炼+突破+探索+锻造（废铁→装备），无职业/宠物/供奉/集市/炼丹/种植
     *   觉醒（机器人·七号）    ：充能修复（替代修炼）+核心强化（替代锻造）+探索，无职业/境界/宠物
     *   羽民（人类·无翼阿禾）  ：修炼+探索+织造（材料→装备），无职业/宠物/供奉
     * 所有数据与场景独立（ch_* 前缀），不触碰剧情模式家园（分层管理）。 */
    challengeSystems(cid) {
      const sys = {
        'ch_xuanyuan_commoner': [
          { id:'cultivate', label:'【修炼】静心打坐，凝练气血（耗1时辰）', tag:'变强', scene:'ch_cultivate' },
          { id:'break',     label:'【突破】冲击更高境界（心魔试炼）', tag:'境界', scene:'ch_break' },
          { id:'forge',     label:'【锻造】炉火千锤：以精铁打造四槽装备', tag:'锻造', scene:'ch_forge' },
          { id:'explore',   label:'【探索】进入机关城（点触NPC·商人·隐藏线索·强敌·搜集）', tag:'探索', scene:'ch_explore' },
          { id:'rest',      label:'【休息】包扎伤口，恢复状态（耗1时辰）', tag:'休整', scene:'ch_rest' },
          { id:'daily',     label:'【今日试炼】看看今日该做什么（达成领精铁）', tag:'日常', scene:'ch_daily' },
          { id:'store',     label:'【补给】铁匠铺采买（精铁/物资/丹药）', tag:'交易', scene:'ch_store' },
          { id:'intel',     label:'【情报】打听机关城消息（花金币换线索）', tag:'情报', scene:'ch_intel' },
          { id:'tome',      label:'【绘卷】翻看山海绘卷·全局图鉴', tag:'图鉴', scene:'ch_tome' },
          { id:'tasks',     label:'【任务】查看试炼任务清单', tag:'试炼', scene:'ch_tasks' },
          { id:'save',      label:'【存档】将近日见闻记入玉简', tag:'系统', scene:'ch_save' }
        ],
        'ch_xuanyuan_awaken': [
          { id:'charge',    label:'【充能】回到核心舱静置充能（耗1时辰·恢复与精进）', tag:'变强', scene:'ch_charge' },
          { id:'forge',     label:'【核心改装】以核心碎片加装四槽模块', tag:'改装', scene:'ch_forge' },
          { id:'explore',   label:'【探索】进入机关塔（点触NPC·商人·隐藏线索·强敌·搜集）', tag:'探索', scene:'ch_explore' },
          { id:'rest',      label:'【维护】自我检修，恢复状态（耗1时辰）', tag:'休整', scene:'ch_rest' },
          { id:'daily',     label:'【今日试炼】校验今日目标（达成领核心碎片）', tag:'日常', scene:'ch_daily' },
          { id:'store',     label:'【补给】回收站以物易物（核心碎片/物资/机油）', tag:'交易', scene:'ch_store' },
          { id:'intel',     label:'【情报】读取机关塔数据库（耗电量换线索）', tag:'情报', scene:'ch_intel' },
          { id:'tome',      label:'【绘卷】翻看山海绘卷·全局图鉴', tag:'图鉴', scene:'ch_tome' },
          { id:'tasks',     label:'【任务】查看试炼任务清单', tag:'试炼', scene:'ch_tasks' },
          { id:'save',      label:'【存档】将核心数据备份到静默舱', tag:'系统', scene:'ch_save' }
        ],
        'ch_yumin_commoner': [
          { id:'cultivate', label:'【修炼】逆风吐纳，凝练气血（耗1时辰）', tag:'变强', scene:'ch_cultivate' },
          { id:'break',     label:'【突破】冲击更高境界（心魔试炼）', tag:'境界', scene:'ch_break' },
          { id:'awaken',    label:'【附魔】布置附魔法阵（最多4个·带技能与加成）', tag:'附魔', scene:'ch_awaken' },
          { id:'explore',   label:'【探索】进入天空城（点触NPC·商人·隐藏线索·强敌·搜集）', tag:'探索', scene:'ch_explore' },
          { id:'rest',      label:'【休息】包扎伤口，恢复状态（耗1时辰）', tag:'休整', scene:'ch_rest' },
          { id:'daily',     label:'【今日试炼】看看今日该做什么（达成领风羽）', tag:'日常', scene:'ch_daily' },
          { id:'store',     label:'【补给】云上市集采买（织材/物资/风粮）', tag:'交易', scene:'ch_store' },
          { id:'intel',     label:'【情报】打听风魔动向（花金币换线索）', tag:'情报', scene:'ch_intel' },
          { id:'tome',      label:'【绘卷】翻看山海绘卷·全局图鉴', tag:'图鉴', scene:'ch_tome' },
          { id:'tasks',     label:'【任务】查看试炼任务清单', tag:'试炼', scene:'ch_tasks' },
          { id:'save',      label:'【存档】将近日见闻记入玉简', tag:'系统', scene:'ch_save' }
        ]
      };
      return sys[cid] || [];
    },

    /* ============== 挑战四槽位装备系统（V1.3.13）
     * 参考剧情模式 20 国装备选择：每个挑战国家有一套完整装备池，分 4 槽位——
     *   weapon 武器          （攻击/破甲/连击类）
     *   armor  防具          （防御/减伤/格挡类）
     *   flow   能力流转装置   （力量流转护心镜：续航——回血/吸血/回蓝）
     *   amp    能量增幅装置   （本命灵器：增幅/奥义/元素类）
     * 玩家最多装备 4 件（每槽 1 件），装备即同步装配对应技能；已强化的装备不可重复打造。
     * maxLv：每件可强化升级，每级 +25% 基础加成。 ============== */
    challengeGearData(cid) {
      const gears = {
        // —— 机关城 · 铁匠（武器=锻兵 / 防具=重甲 / 流转=护心镜 / 增幅=灵器）——
        'ch_xuanyuan_commoner': [
          { id:'w1', name:'青铁短刀', slot:'weapon', quality:'凡品', desc:'刘工随手打的小刀，胜在趁手。', atkPct:0.10, defPct:0, hpPct:0, leech:0, mpPct:0, dodgePct:0,
            skill:{ id:'chg_w1', name:'青锋斩', type:'skill', element:'金', power:1.4, cd:2, mp:10, armorBreak:0.05, desc:'青锋一斩，威力140%并破甲5%' },
            costParts:3, costGold:40, maxLv:4, upCostParts:2, upCostGold:30 },
          { id:'w2', name:'精钢长刀', slot:'weapon', quality:'良品', desc:'千锤百炼，刃口能映出人影。', atkPct:0.16, defPct:0, hpPct:0, leech:0.05, mpPct:0, dodgePct:0,
            skill:{ id:'chg_w2', name:'开山斩', type:'skill', element:'金', power:1.7, cd:3, mp:14, armorBreak:0.1, desc:'开山裂石，威力170%并破甲10%' },
            costParts:6, costGold:80, maxLv:4, upCostParts:3, upCostGold:60 },
          { id:'w3', name:'赤纹重剑', slot:'weapon', quality:'上品', desc:'剑身赤纹如血，是机关城铁匠的骄傲。', atkPct:0.24, defPct:0, hpPct:0, leech:0.08, mpPct:0, dodgePct:0,
            skill:{ id:'chg_w3', name:'赤炎斩', type:'skill', element:'火', power:2.0, cd:3, mp:16, burn:1, desc:'赤炎焚天，威力200%并【灼烧】1回合' },
            costParts:10, costGold:150, maxLv:4, upCostParts:4, upCostGold:100 },
          { id:'a1', name:'旧皮甲', slot:'armor', quality:'凡品', desc:'缝了又缝的旧皮甲。', atkPct:0, defPct:0.10, hpPct:0.05, leech:0, mpPct:0, dodgePct:0,
            skill:{ id:'chg_a1', name:'铁壁', type:'skill', element:'土', power:0.4, cd:3, mp:8, defSelf:{ name:'铁壁', turns:2, mul:0.2 }, desc:'土气护体，威力40%·防御+20%持续2回' },
            costParts:3, costGold:40, maxLv:4, upCostParts:2, upCostGold:30 },
          { id:'a2', name:'锻铁板甲', slot:'armor', quality:'良品', desc:'千锤锻出的铁甲，密不透风。', atkPct:0, defPct:0.18, hpPct:0.08, leech:0, mpPct:0, dodgePct:0,
            skill:{ id:'chg_a2', name:'不动如山', type:'skill', element:'土', power:0.4, cd:4, mp:12, reduceSelf:{ name:'不动', turns:2, mul:0.25 }, desc:'稳如山岳，威力40%·减伤25%持续2回' },
            costParts:6, costGold:80, maxLv:4, upCostParts:3, upCostGold:60 },
          { id:'a3', name:'赤甲·百炼', slot:'armor', quality:'上品', desc:'刘工毕生之作，甲上赤纹如炉火。', atkPct:0, defPct:0.26, hpPct:0.12, leech:0, mpPct:0, dodgePct:0,
            skill:{ id:'chg_a3', name:'百炼金刚', type:'skill', element:'土', power:0.6, cd:4, mp:14, reduceSelf:{ name:'百炼', turns:3, mul:0.3 }, desc:'百炼成钢，威力60%·减伤30%持续3回' },
            costParts:10, costGold:150, maxLv:4, upCostParts:4, upCostGold:100 },
          { id:'f1', name:'兽血护心镜', slot:'flow', quality:'凡品', desc:'嵌着一块兽骨，微微发烫。', atkPct:0, defPct:0, hpPct:0.06, leech:0.10, mpPct:0, dodgePct:0,
            skill:{ id:'chg_f1', name:'饮血', type:'skill', element:'金', power:1.1, cd:2, mp:10, leech:0.3, desc:'噬血一击，威力110%并吸血30%' },
            costParts:3, costGold:40, maxLv:4, upCostParts:2, upCostGold:30 },
          { id:'f2', name:'回春护心镜', slot:'flow', quality:'良品', desc:'镜心藏着一枚灵种，生生不息。', atkPct:0, defPct:0, hpPct:0.08, leech:0.05, mpPct:0.10, dodgePct:0,
            skill:{ id:'chg_f2', name:'回春', type:'skill', element:'木', power:0, cd:3, mp:10, healSelf:0.25, desc:'春回大地，恢复25%生命' },
            costParts:6, costGold:80, maxLv:4, upCostParts:3, upCostGold:60 },
          { id:'f3', name:'力量流转护心镜', slot:'flow', quality:'上品', desc:'流转之力生生不息，伤敌而自愈。', atkPct:0, defPct:0, hpPct:0.10, leech:0.15, mpPct:0.15, dodgePct:0,
            skill:{ id:'chg_f3', name:'流转', type:'skill', element:'水', power:1.2, cd:3, mp:12, leech:0.35, mpSelf:20, desc:'流转往复，威力120%·吸血35%·回灵20' },
            costParts:10, costGold:150, maxLv:4, upCostParts:4, upCostGold:100 },
          { id:'e1', name:'赤铜灵珠', slot:'amp', quality:'凡品', desc:'赤铜裹着一缕灵火。', atkPct:0.06, defPct:0, hpPct:0, leech:0, mpPct:0.06, dodgePct:0,
            skill:{ id:'chg_e1', name:'灵火弹', type:'skill', element:'火', power:1.5, cd:2, mp:12, burn:1, desc:'灵火凝弹，威力150%并【灼烧】1回合' },
            costParts:3, costGold:40, maxLv:4, upCostParts:2, upCostGold:30 },
          { id:'e2', name:'雷纹灵珠', slot:'amp', quality:'良品', desc:'珠身雷纹游走，嗞嗞作响。', atkPct:0.10, defPct:0, hpPct:0, leech:0, mpPct:0.10, dodgePct:0,
            skill:{ id:'chg_e2', name:'惊雷', type:'skill', element:'雷', power:1.8, cd:3, mp:16, paralyze:1, desc:'雷光乍现，威力180%并【麻痹】1回合' },
            costParts:6, costGold:80, maxLv:4, upCostParts:3, upCostGold:60 },
          { id:'e3', name:'本命灵器·玄铁印', slot:'amp', quality:'上品', desc:'铁匠一脉相传的本命灵器，重逾千钧。', atkPct:0.16, defPct:0, hpPct:0, leech:0, mpPct:0.12, dodgePct:0,
            skill:{ id:'chg_e3', name:'玄铁镇岳', type:'skill', element:'土', power:2.2, cd:3, mp:18, stun:1, desc:'玄铁轰落，威力220%并【眩晕】1回合' },
            costParts:10, costGold:150, maxLv:4, upCostParts:4, upCostGold:100 }
        ],
        // —— 机关塔 · 机器人（武器=火力模块 / 防具=装甲 / 流转=能源核心 / 增幅=超频器）——
        'ch_xuanyuan_awaken': [
          { id:'w1', name:'光束炮·一型', slot:'weapon', quality:'凡品', desc:'最基础的远距火力模块。', atkPct:0.10, defPct:0, hpPct:0, leech:0, mpPct:0, dodgePct:0,
            skill:{ id:'chg_w1', name:'光束连射', type:'skill', element:'金', power:1.4, cd:2, mp:10, armorBreak:0.05, desc:'光束连射，威力140%并破甲5%' },
            costParts:3, costGold:40, maxLv:4, upCostParts:2, upCostGold:30 },
          { id:'w2', name:'磁轨炮·三型', slot:'weapon', quality:'良品', desc:'磁轨加速，弹速惊人。', atkPct:0.16, defPct:0, hpPct:0, leech:0.05, mpPct:0, dodgePct:0,
            skill:{ id:'chg_w2', name:'磁轨轰击', type:'skill', element:'雷', power:1.8, cd:3, mp:14, paralyze:1, desc:'磁轨轰击，威力180%并【麻痹】1回合' },
            costParts:6, costGold:80, maxLv:4, upCostParts:3, upCostGold:60 },
          { id:'w3', name:'歼星炮·原型', slot:'weapon', quality:'上品', desc:'档案馆封存的原型武器，核心差点过载。', atkPct:0.24, defPct:0, hpPct:0, leech:0.08, mpPct:0, dodgePct:0,
            skill:{ id:'chg_w3', name:'歼星射线', type:'skill', element:'雷', power:2.0, cd:3, mp:18, burn:1, paralyze:1, desc:'歼星射线，威力200%·灼烧1回·麻痹1回' },
            costParts:10, costGold:150, maxLv:4, upCostParts:4, upCostGold:100 },
          { id:'a1', name:'基础装甲', slot:'armor', quality:'凡品', desc:'薄薄一层铁壳，聊胜于无。', atkPct:0, defPct:0.10, hpPct:0.05, leech:0, mpPct:0, dodgePct:0,
            skill:{ id:'chg_a1', name:'护盾充能', type:'skill', element:'金', power:0.4, cd:3, mp:8, defSelf:{ name:'充能护盾', turns:2, mul:0.2 }, desc:'护盾充能，威力40%·防御+20%持续2回' },
            costParts:3, costGold:40, maxLv:4, upCostParts:2, upCostGold:30 },
          { id:'a2', name:'复合装甲', slot:'armor', quality:'良品', desc:'多层复合，能抗能打。', atkPct:0, defPct:0.18, hpPct:0.08, leech:0, mpPct:0, dodgePct:0,
            skill:{ id:'chg_a2', name:'装甲加固', type:'skill', element:'土', power:0.4, cd:4, mp:12, reduceSelf:{ name:'加固', turns:2, mul:0.25 }, desc:'装甲加固，威力40%·减伤25%持续2回' },
            costParts:6, costGold:80, maxLv:4, upCostParts:3, upCostGold:60 },
          { id:'a3', name:'泰坦装甲', slot:'armor', quality:'上品', desc:'只有传说中泰坦级造物才配得上的装甲。', atkPct:0, defPct:0.26, hpPct:0.12, leech:0, mpPct:0, dodgePct:0,
            skill:{ id:'chg_a3', name:'泰坦壁垒', type:'skill', element:'土', power:0.6, cd:4, mp:14, reduceSelf:{ name:'泰坦', turns:3, mul:0.3 }, desc:'泰坦壁垒，威力60%·减伤30%持续3回' },
            costParts:10, costGold:150, maxLv:4, upCostParts:4, upCostGold:100 },
          { id:'f1', name:'备用电池舱', slot:'flow', quality:'凡品', desc:'一组旧电池，还能撑一会。', atkPct:0, defPct:0, hpPct:0.06, leech:0, mpPct:0.12, dodgePct:0,
            skill:{ id:'chg_f1', name:'能量汲取', type:'skill', element:'金', power:1.1, cd:2, mp:10, leech:0.25, mpSelf:10, desc:'汲取能量，威力110%·吸血25%·回灵10' },
            costParts:3, costGold:40, maxLv:4, upCostParts:2, upCostGold:30 },
          { id:'f2', name:'自修复单元', slot:'flow', quality:'良品', desc:'纳米修复，伤口以肉眼可见的速度愈合。', atkPct:0, defPct:0, hpPct:0.08, leech:0, mpPct:0.10, dodgePct:0,
            skill:{ id:'chg_f2', name:'自我修复', type:'skill', element:'木', power:0, cd:3, mp:10, healSelf:0.25, desc:'纳米修复，恢复25%生命' },
            costParts:6, costGold:80, maxLv:4, upCostParts:3, upCostGold:60 },
          { id:'f3', name:'无尽能源核心', slot:'flow', quality:'上品', desc:'无限能源——理论上。', atkPct:0, defPct:0, hpPct:0.10, leech:0.10, mpPct:0.18, dodgePct:0,
            skill:{ id:'chg_f3', name:'能源涌动', type:'skill', element:'雷', power:1.2, cd:3, mp:12, leech:0.3, mpSelf:25, desc:'能源涌动，威力120%·吸血30%·回灵25' },
            costParts:10, costGold:150, maxLv:4, upCostParts:4, upCostGold:100 },
          { id:'e1', name:'过载器', slot:'amp', quality:'凡品', desc:'短暂超频，烧得发烫。', atkPct:0.06, defPct:0, hpPct:0, leech:0, mpPct:0.06, dodgePct:0,
            skill:{ id:'chg_e1', name:'过载射线', type:'skill', element:'火', power:1.5, cd:2, mp:12, burn:1, desc:'过载射线，威力150%并【灼烧】1回合' },
            costParts:3, costGold:40, maxLv:4, upCostParts:2, upCostGold:30 },
          { id:'e2', name:'高频振动器', slot:'amp', quality:'良品', desc:'高频振动，破坏力惊人。', atkPct:0.10, defPct:0, hpPct:0, leech:0, mpPct:0.10, dodgePct:0,
            skill:{ id:'chg_e2', name:'共振', type:'skill', element:'雷', power:1.8, cd:3, mp:16, slow:0.15, desc:'高频共振，威力180%并【减速】15%' },
            costParts:6, costGold:80, maxLv:4, upCostParts:3, upCostGold:60 },
          { id:'e3', name:'本命灵器·虚空引擎', slot:'amp', quality:'上品', desc:'整座机关塔的心跳，如今在你胸膛里。', atkPct:0.16, defPct:0, hpPct:0, leech:0, mpPct:0.12, dodgePct:0,
            skill:{ id:'chg_e3', name:'虚空脉冲', type:'skill', element:'暗', power:2.2, cd:3, mp:18, stun:1, desc:'虚空脉冲，威力220%并【眩晕】1回合' },
            costParts:10, costGold:150, maxLv:4, upCostParts:4, upCostGold:100 }
        ]
        // 羽民·无翼无装备池：羽翼不靠锤子，靠附魔法阵（见 challengeEnchantData）
      };
      return gears[cid] || [];
    },

    /* 附魔法阵系统（V1.3.13：获得法阵→自行搭配最多4个，带技能与属性加成）
     * 法阵通过探索奇遇 / 商人 / 隐藏任务获得并加入 p.challengeEnchantPool，再在【附魔】界面配置 */
    challengeEnchantData() {
      return [
        { id:'enc_fire',  name:'火灵法阵', desc:'阵纹如焰，燃尽来敌。', atkPct:0.06, hpPct:0,  dodgePct:0, mpPct:0,
          skill:{ id:'ench_fire',  name:'烈焰阵', type:'skill', element:'火', power:1.5, cd:3, mp:14, burn:1, desc:'烈焰法阵，威力150%并【灼烧】1回合' } },
        { id:'enc_water', name:'水灵法阵', desc:'阵纹如水，润物无声。', atkPct:0, hpPct:0.06, dodgePct:0, mpPct:0.06,
          skill:{ id:'ench_water', name:'润泽阵', type:'skill', element:'水', power:0.8, cd:3, mp:12, healSelf:0.15, desc:'润泽法阵，威力80%并恢复15%生命' } },
        { id:'enc_wind',  name:'风灵法阵', desc:'阵纹如风，来去无踪。', atkPct:0.04, hpPct:0,  dodgePct:0.06, mpPct:0,
          skill:{ id:'ench_wind',  name:'疾风阵', type:'skill', element:'风', power:1.6, cd:3, mp:14, slow:0.12, desc:'疾风法阵，威力160%并【减速】12%' } },
        { id:'enc_thunder', name:'雷灵法阵', desc:'阵纹如雷，诛邪荡魔。', atkPct:0.08, hpPct:0, dodgePct:0, mpPct:0,
          skill:{ id:'ench_thunder', name:'雷殛阵', type:'skill', element:'雷', power:1.7, cd:3, mp:16, paralyze:1, desc:'雷殛法阵，威力170%并【麻痹】1回合' } },
        { id:'enc_stone', name:'土灵法阵', desc:'阵纹如岳，稳如磐石。', atkPct:0, hpPct:0.08, dodgePct:0, mpPct:0,
          skill:{ id:'ench_stone', name:'磐石阵', type:'skill', element:'土', power:0.8, cd:4, mp:12, reduceSelf:{ name:'磐石', turns:2, mul:0.2 }, desc:'磐石法阵，威力80%·减伤20%持续2回' } },
        { id:'enc_soul',  name:'魂灵法阵', desc:'阵纹如魂，摄人心魄。', atkPct:0.05, hpPct:0,  dodgePct:0, mpPct:0.05,
          skill:{ id:'ench_soul',  name:'摄魂阵', type:'skill', element:'魂', power:1.5, cd:3, mp:14, charm:1, desc:'摄魂法阵，威力150%并【魅惑】1回合' } }
      ];
    },

    /* ============== 挑战变强材料（V1.3.14：各挑战专属材料，打造/改装/附魔都需相应材料） ==============
     * 机关城（铁匠）：精铁 steel    —— 用于锻造与强化装备
     * 觉醒（机器人）：核心碎片 cores —— 用于核心改装与迭代
     * 羽民（无翼）  ：风羽印记 feathers —— 用于附魔法阵（羽民无锻造，附魔是其唯一变强路线）
     * 材料获取：战斗胜利 / 探索搜集 / 商人 / NPC委托 / 隐藏任务 / 每日试炼——难度与变强路线匹配：
     *   前期（第1-2件凡品）：需 3~6 材料，探索几次即有；中期良品：6~10；后期上品/强化：10+，需委托与隐藏任务积累。 */
    challengeMatName(cid) {
      return { 'ch_xuanyuan_commoner': '精铁', 'ch_xuanyuan_awaken': '核心碎片', 'ch_yumin_commoner': '风羽印记' }[cid] || '材料';
    },
    /* 读取玩家该挑战的变强材料数量 */
    challengeMatCount(p) {
      const cid = p && p.challengeId;
      const prep = (p && p.challengePrep) || {};
      if (cid === 'ch_xuanyuan_awaken') return prep.cores || 0;
      if (cid === 'ch_yumin_commoner') return prep.feathers || 0;
      return prep.steel || 0;   // 机关城
    },
    /* 增/减材料（delta 可为负） */
    challengeMatDelta(p, delta) {
      if (!p) return 0;
      const cid = p.challengeId;
      const prep = p.challengePrep || (p.challengePrep = {});
      if (cid === 'ch_xuanyuan_awaken') { prep.cores = Math.max(0, (prep.cores || 0) + delta); return prep.cores; }
      if (cid === 'ch_yumin_commoner') { prep.feathers = Math.max(0, (prep.feathers || 0) + delta); return prep.feathers; }
      prep.steel = Math.max(0, (prep.steel || 0) + delta); return prep.steel;
    },

    /* 挑战专属掉落池（V1.3.12/1.3.14：战斗/搜集/NPC委托确定掉落对应主题材料 + 专属变强材料，不会空手而归） */
    challengeDropData(cid) {
      const drops = {
        'ch_xuanyuan_commoner': { parts: 2, mat: ['MAT-JG01', 'MAT-JG02', 'MAT-E09', 'MAT-C01'], matN: '机关零件/废铁', gold: 15 },
        'ch_xuanyuan_awaken': { parts: 2, mat: ['MAT-JG01', 'MAT-JG02', 'MAT-E17', 'MAT-S01'], matN: '核心碎片/旧零件', gold: 15 },
        'ch_yumin_commoner': { parts: 2, mat: ['MAT-FS02', 'MAT-FS03', 'MAT-E02', 'MAT-C02'], matN: '风羽/织材', gold: 15 }
      };
      return drops[cid] || { parts: 2, mat: ['MAT-E09'], matN: '物资', gold: 15 };
    },

    /* 应用挑战装备加成（V1.3.13 四槽位 + 法阵聚合）
     * 装备：p.challengeSlots = { weapon, armor, flow, amp }，每槽 1 件，等级各自记录（challengeGearLvs）
     * 法阵：p.challengeEnchants = [id...] 最多 4 个
     * 聚合各槽位/法阵的属性加成与技能，写入挑战专用字段（剧情玩家无影响） */
    applyChallengeGear(p) {
      if (!p) return;
      const cid = p.challengeId;
      const all = App.challengeGearData(cid);
      const slots = p.challengeSlots || {};
      const lvs = p.challengeGearLvs || {};
      const gearById = id => all.find(g => g.id === id) || null;
      let atk = 0, def = 0, hp = 0, leech = 0, mp = 0, dodge = 0;
      const skills = [];
      const SLOT_ORDER = ['weapon', 'armor', 'flow', 'amp'];
      SLOT_ORDER.forEach(slot => {
        const id = slots[slot];
        const g = id ? gearById(id) : null;
        if (!g) return;
        const lv = Math.max(1, Math.min(g.maxLv || 4, lvs[id] || 1));
        const mul = 1 + 0.25 * (lv - 1);
        atk += (g.atkPct || 0) * mul;
        def += (g.defPct || 0) * mul;
        hp += (g.hpPct || 0) * mul;
        leech += (g.leech || 0);
        mp += (g.mpPct || 0) * mul;
        dodge += (g.dodgePct || 0);
        if (g.skill) skills.push({ ...g.skill, fromGear: g.name });
      });
      // 附魔法阵
      const enchData = App.challengeEnchantData();
      (p.challengeEnchants || []).slice(0, 4).forEach(encId => {
        const e = enchData.find(x => x.id === encId);
        if (!e) return;
        atk += (e.atkPct || 0);
        hp += (e.hpPct || 0);
        dodge += (e.dodgePct || 0);
        mp += (e.mpPct || 0);
        if (e.skill) skills.push({ ...e.skill, fromGear: e.name });
      });
      p._challengeGearAtk = Math.min(atk, 0.6);
      p._challengeGearDef = Math.min(def, 0.6);
      p._challengeGearHp = Math.min(hp, 0.5);
      p._challengeGearLeech = Math.min(leech, 0.3);
      p._challengeGearMp = Math.min(mp, 0.3);
      p._challengeGearDodge = Math.min(dodge, 0.25);
      p._challengeGearSkills = skills;
      // 同步技能装配：装备/法阵技能进入挑战技能池，并写入出战配置
      if (!p.challengeSkills) p.challengeSkills = [];
      const cur = p.challengeSkills.filter(s => !s.fromGear);
      skills.forEach(s => { if (!cur.find(x => x.id === s.id)) cur.push(s); });
      p.challengeSkills = cur;
      if (!p.skillLoadout) p.skillLoadout = { actives: [], passive: null };
      skills.forEach(s => {
        if (s.type !== 'ultimate' && s.type !== 'basic' && p.skillLoadout.actives.indexOf(s.id) < 0) p.skillLoadout.actives.push(s.id);
      });
      // V1.3.17：清理已卸下装备/法阵的旧技能，避免换装后出战配置残留失效技能
      p.skillLoadout.actives = p.skillLoadout.actives.filter(id => cur.some(s => s.id === id));
      // 汇总展示用
      const slotNames = SLOT_ORDER.map(slot => {
        const id = slots[slot];
        const g = id ? gearById(id) : null;
        return g ? g.name + (lvs[id] > 1 ? ' Lv' + lvs[id] : '') : '';
      }).filter(Boolean);
      const encNames = (p.challengeEnchants || []).slice(0, 4).map(encId => {
        const e = enchData.find(x => x.id === encId);
        return e ? e.name : '';
      }).filter(Boolean);
      p._challengeGearSummary = (slotNames.concat(encNames)).join('、') || '无';
    },

    /* ============== 挑战搜寻（野区）系统（V1.3.16：城池外的搜寻按钮，随机遭遇 10+ 种怪兽）
     * 难度：怪兽等级在角色属性上下浮动（lv±3，强度按当前战力比例缩放，保证有胜有险）
     * 掉落：按怪兽品质掉不同品质的灵材 + 本挑战专属材料（机关城=精铁/觉醒=核心碎片/羽民=风羽印记）
     * 不用灵香等剧情模式材料（挑战模式用不上） ============== */
    challengeMonsters() {
      return [
        // —— 机关城（金/铁主题）——
        { name: '失控哨兵', el: '金', tier: 1, desc: '双目赤红的机关兵，见人就扑。' },
        { name: '锈蚀机关狼', el: '金', tier: 1, desc: '锈迹斑斑的机关狼，扑咬凶狠。' },
        { name: '齿轮傀儡', el: '土', tier: 1, desc: '由齿轮拼成的傀儡，咔咔作响。' },
        { name: '铁甲蟹', el: '土', tier: 1, desc: '铁壳甲蟹，钳子能夹断铁条。' },
        { name: '虚月信使', el: '暗', tier: 2, desc: '披月白斗篷的信使，行踪诡异。' },
        { name: '机关蛇', el: '木', tier: 2, desc: '鳞片如刀片的机关蛇，游走无声。' },
        { name: '自爆木偶', el: '火', tier: 2, desc: '肚里塞着火药的木偶，靠近就炸。' },
        { name: '守城石兽', el: '土', tier: 3, desc: '镇守城门的石兽，力大无穷。' },
        { name: '精铁武者', el: '金', tier: 3, desc: '被改造的武者傀儡，刀法凌厉。' },
        { name: '机关巨像', el: '土', tier: 4, desc: '数丈高的机关巨像，一脚踩塌半条街。' },
        { name: '虚月魔偶', el: '暗', tier: 4, desc: '被虚月完全侵蚀的魔偶，散发黑气。' },
        // —— 机关塔（雷/暗主题）——
        { name: '污染机关兽', el: '暗', tier: 1, desc: '爬满黑紫色纹路的机关兽。' },
        { name: '放电浮球', el: '雷', tier: 1, desc: '悬浮放电的机球，嗞嗞作响。' },
        { name: '维修魔傀', el: '雷', tier: 2, desc: '挥着扳手发狂的维修机器人。' },
        { name: '磁暴蝎', el: '雷', tier: 2, desc: '尾部能喷出磁暴的机械蝎。' },
        { name: '巡逻魔傀', el: '暗', tier: 2, desc: '曾是守塔卫士，如今形同鬼魅。' },
        { name: '数据幽灵', el: '魂', tier: 3, desc: '由残存数据凝成的幽影，忽明忽灭。' },
        { name: '脉冲猎手', el: '雷', tier: 3, desc: '专猎逃逸造物的猎手机器。' },
        { name: '侵蚀魔像', el: '暗', tier: 3, desc: '被暗月侵蚀的核心魔像。' },
        { name: '虚空游魂', el: '魂', tier: 4, desc: '从虚空裂缝渗出的游魂。' },
        { name: '塔心守卫', el: '雷', tier: 4, desc: '守护塔心的最终造物，雷光缠身。' },
        { name: '侵蚀本相·伪', el: '暗', tier: 4, desc: '侵蚀本相的残影，似曾相识。' },
        // —— 天空城（风主题）——
        { name: '风魔爪牙', el: '风', tier: 1, desc: '裹着黑风扑来的魔爪。' },
        { name: '风鸦', el: '风', tier: 1, desc: '被风魔驱使的黑鸦，成群结队。' },
        { name: '风蛇', el: '风', tier: 1, desc: '缠着狂风的蛇，速度极快。' },
        { name: '风魔蝠', el: '暗', tier: 2, desc: '风眼涌出的魔蝠，扑扇生风。' },
        { name: '狂风隼', el: '风', tier: 2, desc: '被风魔侵染的隼，爪带罡风。' },
        { name: '云中魔影', el: '暗', tier: 2, desc: '隐在云中窥视的黑影。' },
        { name: '裂风兽', el: '风', tier: 3, desc: '能撕开风壁的裂风兽。' },
        { name: '风灵缚者', el: '魂', tier: 3, desc: '操纵风牢的缚者，困敌于无形。' },
        { name: '暴风巨雕', el: '风', tier: 4, desc: '翅展数丈的暴风巨雕。' },
        { name: '风魔统领', el: '暗', tier: 4, desc: '风魔军团的统领，气势逼人。' },
        { name: '风神残影', el: '魂', tier: 4, desc: '风神陨落后的残影，悲鸣如风。' }
      ];
    },

    /* 搜寻：在城池点「搜寻」→ 随机遭遇怪兽（难度随角色浮动，掉落对应品质） */
    onChallengeSearchClick() {
      const ex = App._challengeExplore;
      if (!ex) return;
      const p = ex.p, cid = ex.cid;
      const dlg = document.getElementById('explore-dialog');
      const nameEl = document.getElementById('explore-dialog-name');
      const textEl = document.getElementById('explore-dialog-text');
      const actionsBox = document.getElementById('explore-dialog-actions');
      const showMsg = (name, text, actions) => {
        nameEl.textContent = name;
        textEl.textContent = text;
        actionsBox.innerHTML = '';
        (actions || []).forEach(a => {
          const btn = document.createElement('button');
          btn.className = 'btn explore-action' + (a.primary ? ' btn-primary' : '');
          btn.textContent = a.label;
          btn.onclick = a.onClick;
          actionsBox.appendChild(btn);
        });
        dlg.classList.add('show');
      };
      const close = () => dlg.classList.remove('show');
      const pool = App.challengeMonsters();
      const m = pool[Math.floor(Math.random() * pool.length)];
      // 难度在角色属性上下浮动：等级 ±3，强度按当前战力比例缩放
      const diff = Math.floor(Math.random() * 7) - 3;
      const lv = Math.max(8, (p.lv || 18) + diff);
      const hpMul = Math.max(1.5, 0.6 + Math.random() * 0.5 + m.tier * 0.3);
      const atkMul = Math.max(0.4, 0.55 + Math.random() * 0.3 + m.tier * 0.1);
      const defMul = Math.max(0.2, 0.3 + Math.random() * 0.2);
      const elementMap = { 'ch_yumin_commoner': '风', 'ch_xuanyuan_awaken': '雷', 'ch_xuanyuan_commoner': '金' };
      const el = m.el || elementMap[cid] || '金';
      showMsg('搜寻 · ' + m.name, m.desc + '\n\n（Lv' + lv + ' · 野生 · 元素' + el + '）', [
        { label: '应战', primary: true, onClick: () => {
          const cost = App.challengeDilemmas(cid).some(d => d.effect === 'time_cost_up') ? 2 : 1;
          if (p.shichen < cost) { Engine.log('时辰不足' + (cost > 1 ? '（逆风需' + cost + '时辰）' : '') + '。', 'evil'); return; }
          STATE.spendShichen(p, cost);
          const enemy = STATE.makeEnemy(p, {
            lv, state: { id: 'wild', name: '野生', mul: 1.0, aware: 'aware' },
            name: m.name, hpMul, atkMul, defMul,
            element: el,
            bg: cid === 'ch_yumin_commoner' ? 'assets/img/nations/yum-tianyu-city.jpg' : 'assets/img/nations/xuanyuan-city.jpg'
          });
          p._pendingEnemy = enemy;
          p._challengeSearchTier = m.tier;
          p._adventureAfter = 'challenge_prepare_' + cid;
          dlg.classList.remove('show');
          App.goto('challenge_adventure_battle');
        }},
        { label: '逃离', onClick: close }
      ]);
    },

    /* ============== 挑战城池点触探索（V1.3.15：复用剧情探索屏，点触 NPC 对话·选择驱动） ==============
     * 挑战国家被做成"城池"：玩家进入城池，看到可点触的 NPC / 商人 / 隐藏线索 / 强敌 / 搜集点，
     * 点击 NPC 直接对话（非文字选择式），对话中做选择推进委托与剧情。 */
    showChallengeExplore(regionId) {
      const p = App.player;
      if (!p) return;
      const cid = p.challengeId;
      const data = App.challengeExploreData(cid);
      if (!data || !data.regions.length) { App.goto('challenge_prepare_' + cid); return; }
      const prep = p.challengePrep || {};
      // 目标区域：指定或第一个已解锁区域
      let idx = 0;
      if (regionId) { const fi = data.regions.findIndex(r => r.id === regionId); if (fi >= 0) idx = fi; }
      // 若指定区域未解锁则回退到已解锁区域
      const region = data.regions[idx];
      if ((prep.chapter || 0) < (region.unlock || 0)) {
        idx = data.regions.findIndex(r => (prep.chapter || 0) >= (r.unlock || 0));
        if (idx < 0) idx = 0;
      }
      App._challengeExplore = { cid, data, regionIdx: idx, p };
      Engine.show('screen-explore');
      App.renderChallengeExplore();
    },

    renderChallengeExplore() {
      const ex = App._challengeExplore;
      if (!ex) return;
      App._setHeaderVisible(false);
      const data = ex.data, region = data.regions[ex.regionIdx];
      const p = ex.p, cid = ex.cid;
      const bg = cid === 'ch_yumin_commoner' ? 'assets/img/nations/yum-tianyu-city.jpg' : 'assets/img/nations/xuanyuan-city.jpg';
      Engine.setBg(bg);
      // 顶部位置名
      document.getElementById('explore-location').textContent = data.nation + ' · ' + region.name;
      // 区域切换条（多区域城池 + 搜寻入口 + 返回营地）
      const scenesBar = document.getElementById('explore-scenes');
      if (scenesBar) {
        scenesBar.innerHTML = '<span class="explore-scene-btn" data-back="1" style="border-color:#c8a050;color:#c8a050">◀ 返回营地</span>' +
          '<span class="explore-scene-btn" data-search="1" style="border-color:#7a3fa2;color:#7a3fa2">🔍 搜寻野区</span>' +
          data.regions.map((r, i) => {
            const unlocked = (p.challengePrep && p.challengePrep.chapter || 0) >= (r.unlock || 0);
            return `<span class="explore-scene-btn ${i === ex.regionIdx ? 'active' : ''}" data-idx="${i}" ${unlocked ? '' : 'style="opacity:0.5"'}">${unlocked ? r.name : r.name + '🔒'}</span>`;
          }).join('');
        scenesBar.querySelectorAll('.explore-scene-btn').forEach(btn => {
          if (btn.dataset.back) {
            btn.onclick = () => { Engine.show('screen-scene'); App.goto('challenge_prepare_' + cid); };
            return;
          }
          if (btn.dataset.search) {
            btn.onclick = () => { App.onChallengeSearchClick(); };
            return;
          }
          btn.onclick = () => {
            const i = parseInt(btn.dataset.idx);
            const r = data.regions[i];
            if ((p.challengePrep && p.challengePrep.chapter || 0) < (r.unlock || 0)) { Engine.log('此区域尚未开启：完成主线剧情后解锁。', 'evil'); return; }
            ex.regionIdx = i;
            App.renderChallengeExplore();
          };
        });
      }
      // 渲染热点（spot → hotpoint，固定锚点错开分布）
      const canvas = document.getElementById('explore-canvas');
      canvas.innerHTML = '';
      const anchors = [
        { x: 18, y: 28 }, { x: 70, y: 24 }, { x: 18, y: 62 }, { x: 70, y: 66 }, { x: 44, y: 46 }, { x: 30, y: 82 }, { x: 62, y: 84 }
      ];
      const icons = { npc: '👤', merchant: '💰', hidden: '🔍', battle: '⚔', gather: '🧺', hidden_person: '🎭' };
      const hpTypes = { npc: 'npc', merchant: 'merchant', hidden: 'hidden', battle: 'battle', gather: 'gather', hidden_person: 'hidden_person' };
      const names = { npc: '委托', merchant: '商', hidden: '线索', battle: '战', gather: '采集', hidden_person: '神秘人' };
      region.spots.forEach((sp, i) => {
        const dot = document.createElement('div');
        dot.className = 'explore-hotpoint hp-' + hpTypes[sp.kind] + (sp.kind === 'npc' || sp.kind === 'merchant' ? ' hp-main' : '');
        const an = anchors[i % anchors.length];
        dot.style.left = an.x + '%';
        dot.style.top = an.y + '%';
        dot.innerHTML = `<span class="hp-icon">${icons[sp.kind] || '•'}</span><span class="hp-label">${sp.name}</span>`;
        dot.onclick = () => App.onChallengeHotpointClick(sp, region);
        canvas.appendChild(dot);
      });
      // 清空对话
      document.getElementById('explore-dialog').classList.remove('show');
      const portraitEl = document.getElementById('explore-dialog-portrait');
      if (portraitEl) { portraitEl.style.backgroundImage = ''; portraitEl.style.display = 'none'; }
      try { if (typeof Engine !== 'undefined' && Engine.refreshQuestGuide) Engine.refreshQuestGuide(p); } catch (e) {}
    },

    /* 点击挑战城池热点 → 对话（选择驱动） */
    onChallengeHotpointClick(sp, region) {
      const ex = App._challengeExplore;
      if (!ex) return;
      const p = ex.p, cid = ex.cid, prep = p.challengePrep || {};
      const dialog = document.getElementById('explore-dialog');
      const nameEl = document.getElementById('explore-dialog-name');
      const textEl = document.getElementById('explore-dialog-text');
      const actionsBox = document.getElementById('explore-dialog-actions');
      const portraitEl = document.getElementById('explore-dialog-portrait');
      if (portraitEl) { portraitEl.style.backgroundImage = ''; portraitEl.style.display = 'none'; }
      const showMsg = (name, text, actions) => {
        nameEl.textContent = name;
        textEl.textContent = text;
        actionsBox.innerHTML = '';
        (actions || []).forEach(a => {
          const btn = document.createElement('button');
          btn.className = 'btn explore-action' + (a.primary ? ' btn-primary' : '');
          btn.textContent = a.label;
          btn.onclick = a.onClick;
          actionsBox.appendChild(btn);
        });
        dialog.classList.add('show');
      };
      const close = () => dialog.classList.remove('show');
      const matName = App.challengeMatName(cid);
      const backActs = [{ label: '离开', onClick: close }];
      const timeCost = () => App.challengeDilemmas(cid).some(d => d.effect === 'time_cost_up') ? 2 : 1;

      if (sp.kind === 'npc') {
        const done = prep.npcDone && prep.npcDone[sp.key];
        const cur = sp.task.type === 'wins' ? (prep.wins || 0) : (prep.materials || 0);
        const ok = cur >= sp.task.need;
        if (done) {
          showMsg(sp.name, '「多谢你，孩子。」' + sp.name + '朝你点了点头，眼中多了一分暖意。\n\n（此间事了。）', backActs);
        } else if (ok) {
          showMsg(sp.name, sp.text + '\n\n「你做到了！」' + sp.name + '将谢礼塞进你手里：' + matName + ' ×' + sp.rewardParts + ' · 金币 +' + sp.rewardGold + ' · 修为 +' + sp.rewardExp,
            [{ label: '收下谢礼', primary: true, onClick: () => {
              App.challengeMatDelta(p, sp.rewardParts);
              p.gold = (p.gold || 0) + sp.rewardGold;
              p.realm.exp = (p.realm.exp || 0) + sp.rewardExp;
              let extra = '';
              const drop = App.challengeDropData(cid);
              if (drop.mat && drop.mat.length) {
                if (!p.materials) p.materials = {};
                const m = drop.mat[Math.floor(Math.random() * drop.mat.length)];
                p.materials[m] = (p.materials[m] || 0) + 1;
                extra += ' · ' + STATE.matName(m) + ' ×1';
              }
              if (cid === 'ch_yumin_commoner' && Math.random() < 0.4) {
                const got = App.challengeGrantRandomEnchant(p);
                if (got) extra += ' · 法阵【' + got.name + '】';
              }
              if (!prep.npcDone) prep.npcDone = {};
              prep.npcDone[sp.key] = true;
              Engine.log('委托完成！' + matName + ' +' + sp.rewardParts + ' · 金币 +' + sp.rewardGold + extra, 'gold');
              close();
            }}].concat(backActs));
        } else {
          showMsg(sp.name, sp.text + '\n\n他的请求：' + sp.task.desc + '\n当前进度：' + (sp.task.type === 'wins' ? '已击败 ' + cur + '/' + sp.task.need : '已收集 ' + cur + '/' + sp.task.need) + '\n\n完成后再来找他，会有谢礼。',
            [{ label: '接下委托', primary: true, onClick: () => { Engine.log('你答应了' + sp.name + '的请求。', 'gold'); close(); }}].concat(backActs));
        }
        return;
      }
      if (sp.kind === 'merchant') {
        showMsg(sp.name, sp.text + '\n\n商人不收灵石，只认金币。' + matName + ' ' + App.challengeMatCount(p) + ' · 金币 ' + (p.gold || 0),
          [
            { label: '买 2 份' + matName + '（40 金币）', onClick: () => {
              if ((p.gold || 0) < 40) { Engine.log('金币不足。', 'evil'); return; }
              p.gold -= 40; App.challengeMatDelta(p, 2); Engine.log('你买下 2 份' + matName + '（金币 -40）。', 'good');
            }},
            { label: '买 1 份物资（30 金币，计入试炼收集）', onClick: () => {
              if ((p.gold || 0) < 30) { Engine.log('金币不足。', 'evil'); return; }
              p.gold -= 30; prep.materials = (prep.materials || 0) + 1;
              const drop = App.challengeDropData(cid);
              const m = (drop.mat && drop.mat.length) ? drop.mat[Math.floor(Math.random() * drop.mat.length)] : 'MAT-E09';
              if (!p.materials) p.materials = {};
              p.materials[m] = (p.materials[m] || 0) + 1;
              Engine.log('你买下一份' + STATE.matName(m) + '（金币 -30，物资 +1）。', 'good');
            }},
            { label: '卖 1 份' + matName + '（+15 金币）', onClick: () => {
              if (App.challengeMatCount(p) < 1) { Engine.log('没有' + matName + '可卖。', 'evil'); return; }
              App.challengeMatDelta(p, -1); p.gold = (p.gold || 0) + 15; Engine.log('你卖掉 1 份' + matName + '，金币 +15。', 'good');
            }},
            { label: '神秘货（120 金币，' + (cid === 'ch_yumin_commoner' ? '可能开出法阵' : '可能有大量' + matName) + '）', onClick: () => {
              if ((p.gold || 0) < 120) { Engine.log('金币不足。', 'evil'); return; }
              p.gold -= 120;
              if (cid === 'ch_yumin_commoner' && Math.random() < 0.6) {
                const got = App.challengeGrantRandomEnchant(p);
                if (got) { Engine.log('你从货堆里翻出一枚【' + got.name + '】法阵！', 'gold'); return; }
              }
              const g = 3 + Math.floor(Math.random() * 3);
              App.challengeMatDelta(p, g);
              Engine.log('货堆里没有法阵，你捡回' + matName + ' ×' + g + '。', 'good');
            }}
          ].concat(backActs));
        return;
      }
      if (sp.kind === 'hidden') {
        const done = prep.hiddenDone && prep.hiddenDone[sp.key];
        const ok = (prep.wins || 0) >= (sp.need || 1);
        if (done) {
          showMsg(sp.name, '「你找到了。」\n\n' + sp.clue + '\n\n（此间秘密已了。）', backActs);
        } else if (ok) {
          showMsg(sp.name, '「谜底揭开了。」\n\n' + sp.clue + '\n\n你掘出深藏的宝藏：' + matName + ' ×' + sp.rewardParts + ' · 金币 +' + sp.rewardGold + ' · 修为 +' + sp.rewardExp + (sp.rewardEnchant ? (p.challengeId === 'ch_yumin_commoner' ? ' · 附魔法阵' : ' · 额外专属材料') : ''),
            [{ label: '取走宝藏', primary: true, onClick: () => {
              App.challengeMatDelta(p, sp.rewardParts);
              p.gold = (p.gold || 0) + sp.rewardGold;
              p.realm.exp = (p.realm.exp || 0) + sp.rewardExp;
              let extra = '';
              if (sp.rewardEnchant) {
                // V1.3.20：附魔法阵为羽民专属——非羽民挑战的隐藏宝藏改发专属材料（此前文案承诺法阵却永远拿不到）
                if (p.challengeId === 'ch_yumin_commoner') {
                  const got = App.challengeGrantRandomEnchant(p);
                  if (got) extra = ' · 获得法阵【' + got.name + '】';
                } else {
                  App.challengeMatDelta(p, 2);
                  extra = ' · 额外获得 ' + App.challengeMatName(p.challengeId) + ' ×2';
                }
              }
              if (!prep.hiddenDone) prep.hiddenDone = {};
              prep.hiddenDone[sp.key] = true;
              Engine.log('隐藏任务完成！' + matName + ' +' + sp.rewardParts + ' · 金币 +' + sp.rewardGold + extra, 'gold');
              close();
            }}].concat(backActs));
        } else {
          showMsg(sp.name, sp.text + '\n\n线索：' + sp.clue + '\n条件：' + sp.task + '（当前 ' + (prep.wins || 0) + '/' + sp.need + '）',
            [{ label: '记下线索', primary: true, onClick: close }].concat(backActs));
        }
        return;
      }
      if (sp.kind === 'battle') {
        showMsg(sp.name, sp.desc + '\n\n战？', [
          { label: '应战', primary: true, onClick: () => {
            const cost = timeCost();
            if (p.shichen < cost) { Engine.log('时辰不足' + (cost > 1 ? '（逆风需' + cost + '时辰）' : '') + '。', 'evil'); return; }
            STATE.spendShichen(p, cost);
            const elementMap = { 'ch_yumin_commoner': '风', 'ch_xuanyuan_awaken': '雷', 'ch_xuanyuan_commoner': '金' };
            const enemy = STATE.makeEnemy(p, {
              lv: Math.max(10, (p.lv || 18) + 2),
              state: { id: 'angry', name: '凶煞', mul: 1.1, aware: 'aware' },
              name: sp.name, hpMul: 4.5, atkMul: 0.95, defMul: 0.4,
              element: elementMap[cid] || '金',
              bg: cid === 'ch_yumin_commoner' ? 'assets/img/nations/yum-tianyu-city.jpg' : 'assets/img/nations/xuanyuan-city.jpg'
            });
            p._pendingEnemy = enemy;
            p._adventureAfter = 'challenge_prepare_' + cid;
            dialog.classList.remove('show');
            App.goto('challenge_adventure_battle');
          }}
        ].concat(backActs));
        return;
      }
      if (sp.kind === 'gather') {
        showMsg(sp.name, sp.desc + '\n\n在这里翻找一番？', [
          { label: '搜集', primary: true, onClick: () => {
            const cost = timeCost();
            if (p.shichen < cost) { Engine.log('时辰不足' + (cost > 1 ? '（逆风需' + cost + '时辰）' : '') + '。', 'evil'); return; }
            STATE.spendShichen(p, cost);
            prep.materials = (prep.materials || 0) + 1;
            const matGain = 1 + Math.floor(Math.random() * 2);
            const matNameL = App.challengeMatName(cid);
            App.challengeMatDelta(p, matGain);
            const drop = App.challengeDropData(cid);
            const mat = App.giveRandomMaterial(p, drop.mat || ['MAT-E09'], 1, 2);
            let extra = '';
            if (cid === 'ch_yumin_commoner' && Math.random() < 0.3) {
              const got = App.challengeGrantRandomEnchant(p);
              if (got) extra = ' · 获得法阵【' + got.name + '】';
            }
            Engine.log('你在' + sp.name + '翻找，获得【' + STATE.matName(mat) + '】与' + matNameL + ' ×' + matGain + extra + '。', 'good');
            close();
          }}
        ].concat(backActs));
        return;
      }
      // 隐藏人物（稀有 NPC，随机出现，特殊奖励）
      if (sp.kind === 'hidden_person') {
        showMsg(sp.name, sp.text, [
          { label: '交谈', primary: true, onClick: () => {
            if (prep.hpDone && prep.hpDone[sp.key]) { Engine.log('（你们已是旧识。）', 'system'); close(); return; }
            // 奖励：专属材料 + 金币 + 大概率法阵（羽民）/灵材
            App.challengeMatDelta(p, sp.mat || 4);
            p.gold = (p.gold || 0) + (sp.gold || 80);
            let extra = ' ' + matName + ' ×' + (sp.mat || 4) + ' · 金币 +' + (sp.gold || 80);
            if (cid === 'ch_yumin_commoner' && Math.random() < 0.8) {
              const got = App.challengeGrantRandomEnchant(p);
              if (got) extra += ' · 法阵【' + got.name + '】';
            } else if (Math.random() < 0.5) {
              if (!p.materials) p.materials = {};
              const drop = App.challengeDropData(cid);
              const m = (drop.mat && drop.mat.length) ? drop.mat[Math.floor(Math.random() * drop.mat.length)] : 'MAT-E09';
              p.materials[m] = (p.materials[m] || 0) + 1;
              extra += ' · 灵材【' + STATE.matName(m) + '】';
            }
            if (!prep.hpDone) prep.hpDone = {};
            prep.hpDone[sp.key] = true;
            Engine.log('你与' + sp.name + '畅谈良久，获赠：' + extra, 'gold');
            close();
          }},
          { label: '离开', onClick: close }
        ]);
        return;
      }
      showMsg(sp.name, '此处暂无可做的事。', backActs);
    },

    /* ============== 挑战格子化装备/法阵面板（V1.3.13 参考剧情探索的卡片式选择） ============== */
    /* 生成装备格子卡片 HTML（按 4 槽位分组） */
    challengeGearPanelHtml(p) {
      const cid = p.challengeId;
      const gears = App.challengeGearData(cid);
      const slots = p.challengeSlots || {};
      const lvs = p.challengeGearLvs || {};
      const slotNames = { weapon: '武器', armor: '防具', flow: '流转装置', amp: '增幅装置' };
      const slotIcons = { weapon: '⚔', armor: '🛡', flow: '♻', amp: '✦' };
      const qualityColor = { 凡品: '#9a8a70', 良品: '#4a8a3a', 上品: '#8a5a20' };
      const isRobot = cid === 'ch_xuanyuan_awaken';
      const act = isRobot ? '改装' : '打造';
      const matName = App.challengeMatName(cid);
      const matCount = App.challengeMatCount(p);
      let html = `<div class="meta-panel" style="text-align:left">
        <div class="meta-panel-head"><span>装备选择 · ${App.challengeGoal(cid) ? App.challengeGoal(cid).region : ''}</span><span class="mp-ming">${matName} ${matCount} · 金币 ${p.gold || 0}</span></div>`;
      // 各槽位
      ['weapon', 'armor', 'flow', 'amp'].forEach(slot => {
        const curId = slots[slot];
        const curGear = curId ? gears.find(g => g.id === curId) : null;
        html += `<div style="margin:12px 0 6px;font-weight:800;color:#e8d8b0">${slotIcons[slot]} ${slotNames[slot]} — ${curGear ? '已' + (isRobot ? '装' : '装') + '：' + curGear.name + (lvs[curId] > 1 ? ' Lv' + lvs[curId] : '') : '（空）'}</div>`;
        html += `<div class="meta-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">`;
        gears.filter(g => g.slot === slot).forEach(g => {
          const equipped = slots[slot] === g.id;
          const owned = Object.keys(slots).some(s => slots[s] === g.id);
          const lv = equipped ? (lvs[g.id] || 1) : 1;
          const mul = 1 + 0.25 * (lv - 1);
          const canParts = matCount >= g.costParts;
          const canGold = (p.gold || 0) >= g.costGold;
          const stats = [];
          if (g.atkPct) stats.push('攻+' + Math.round(g.atkPct * mul * 100) + '%');
          if (g.defPct) stats.push('防+' + Math.round(g.defPct * mul * 100) + '%');
          if (g.hpPct) stats.push('命+' + Math.round(g.hpPct * mul * 100) + '%');
          if (g.leech) stats.push('吸血+' + Math.round(g.leech * 100) + '%');
          if (g.mpPct) stats.push('灵+' + Math.round(g.mpPct * mul * 100) + '%');
          if (g.dodgePct) stats.push('闪+' + Math.round(g.dodgePct * 100) + '%');
          html += `<div class="ach-card ${equipped ? 'done' : ''}" style="border-color:${qualityColor[g.quality] || '#666'};border-left:4px solid ${qualityColor[g.quality] || '#666'}">
            <div class="ach-name">${g.name} <span style="font-size:11px;color:${qualityColor[g.quality] || '#999'}">${g.quality}</span></div>
            <div class="ach-desc">${g.desc}</div>
            <div class="ach-reward">${stats.join(' · ') || '无属性'}</div>
            <div class="ach-flavor" style="color:#7a6a4a;font-size:11px">技能：${g.skill ? g.skill.name + '（' + g.skill.desc + '）' : '无'}</div>
            ${equipped
              ? (lv < (g.maxLv || 4)
                  ? `<button class="meta-btn" data-upgear="${g.id}" style="margin-top:6px">强化至 Lv${lv + 1}（${matName}${g.upCostParts}·金币${g.upCostGold}）</button>`
                  : `<div style="margin-top:6px;color:#8fd694;font-size:12px">已满强化 Lv${lv}</div>`)
              : `<button class="meta-btn ${canParts && canGold ? 'primary' : ''}" data-slotgear="${g.id}" style="margin-top:6px" ${canParts && canGold ? '' : 'disabled'}>${act}（${matName}${g.costParts}·金币${g.costGold}）</button>`}
          </div>`;
        });
        html += `</div>`;
      });
      html += `<div style="margin-top:10px;color:#c8b8a2;font-size:12px">· 每类装备自带技能，装备后自动装配（可在【技能配置】调整）<br>· 已装备的装备不可重复打造；强化消耗${matName}与金币</div></div>`;
      return html;
    },

    /* 生成附魔法阵格子卡片 HTML（从法阵池中选择，最多配置 4 个） */
    challengeEnchantPanelHtml(p) {
      const cid = p.challengeId;
      const pool = p.challengeEnchantPool || [];
      const enchanted = p.challengeEnchants || [];
      const encData = App.challengeEnchantData();
      let html = `<div class="meta-panel" style="text-align:left">
        <div class="meta-panel-head"><span>附魔法阵配置</span><span class="mp-ming">已配置 ${enchanted.length}/4</span></div>
        <div class="meta-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">`;
      encData.forEach(e => {
        const owned = pool.indexOf(e.id) >= 0;
        const active = enchanted.indexOf(e.id) >= 0;
        const stats = [];
        if (e.atkPct) stats.push('攻+' + Math.round(e.atkPct * 100) + '%');
        if (e.hpPct) stats.push('命+' + Math.round(e.hpPct * 100) + '%');
        if (e.dodgePct) stats.push('闪+' + Math.round(e.dodgePct * 100) + '%');
        if (e.mpPct) stats.push('灵+' + Math.round(e.mpPct * 100) + '%');
        html += `<div class="ach-card ${active ? 'done' : ''}">
          <div class="ach-name">${e.name}</div>
          <div class="ach-desc">${e.desc}</div>
          <div class="ach-reward">${stats.join(' · ') || '无属性'}</div>
          <div class="ach-flavor" style="color:#7a6a4a;font-size:11px">技能：${e.skill ? e.skill.name + '（' + e.skill.desc + '）' : '无'}</div>
          ${!owned
            ? `<div style="margin-top:6px;color:#9a8a70;font-size:12px">尚未获得（探索奇遇 / 商人 / 隐藏任务）</div>`
            : active
              ? `<button class="meta-btn" data-remench="${e.id}" style="margin-top:6px">卸下法阵</button>`
              : `<button class="meta-btn primary" data-addench="${e.id}" style="margin-top:6px" ${enchanted.length >= 4 ? 'disabled' : ''}>配置法阵</button>`}
        </div>`;
      });
      html += `</div><div style="margin-top:10px;color:#c8b8a2;font-size:12px">· 法阵在探索奇遇、商人交易、隐藏任务中获得<br>· 最多同时配置 4 个法阵，每个法阵带技能与属性加成（自动装配技能）<br>· 配置法阵需消耗「风羽印记 ×1」</div></div>`;
      return html;
    },

    /* 打开装备格子面板（Modal） */
    openChallengeGearPanel() {
      const p = App.player;
      if (!p) return;
      const html = App.challengeGearPanelHtml(p);
      App.openBigModal('装 备 选 择', html, () => {});
      // 打造
      document.querySelectorAll('[data-slotgear]').forEach(btn => {
        btn.onclick = () => {
          const gid = btn.dataset.slotgear;
          const gear = App.challengeGearData(p.challengeId).find(g => g.id === gid);
          if (!gear) return;
          const matName = App.challengeMatName(p.challengeId);
          if (App.challengeMatCount(p) < gear.costParts) { Engine.log(matName + '不足。', 'evil'); return; }
          if ((p.gold || 0) < gear.costGold) { Engine.log('金币不足。', 'evil'); return; }
          App.challengeMatDelta(p, -gear.costParts);
          p.gold -= gear.costGold;
          if (!p.challengeSlots) p.challengeSlots = {};
          if (!p.challengeGearLvs) p.challengeGearLvs = {};
          p.challengeSlots[gear.slot] = gid;
          p.challengeGearLvs[gid] = 1;
          App.applyChallengeGear(p);
          Engine.log('你装备了【' + gear.name + '】（' + App.challengeGearData(p.challengeId).filter(g => g.slot === gear.slot).length + ' 槽位）！', 'gold');
          App.openChallengeGearPanel();
        };
      });
      // 强化
      document.querySelectorAll('[data-upgear]').forEach(btn => {
        btn.onclick = () => {
          const gid = btn.dataset.upgear;
          const gear = App.challengeGearData(p.challengeId).find(g => g.id === gid);
          if (!gear) return;
          const prep = p.challengePrep || {};
          const curLv = (p.challengeGearLvs && p.challengeGearLvs[gid]) || 1;
          if (curLv >= (gear.maxLv || 4)) { Engine.log('已满强化。', 'evil'); return; }
          const matName = App.challengeMatName(p.challengeId);
          if (App.challengeMatCount(p) < (gear.upCostParts || 2)) { Engine.log(matName + '不足。', 'evil'); return; }
          if ((p.gold || 0) < (gear.upCostGold || 30)) { Engine.log('金币不足。', 'evil'); return; }
          App.challengeMatDelta(p, -(gear.upCostParts || 2));
          p.gold -= gear.upCostGold;
          p.challengeGearLvs[gid] = curLv + 1;
          App.applyChallengeGear(p);
          Engine.log('【' + gear.name + '】强化至 Lv' + p.challengeGearLvs[gid] + '！', 'gold');
          App.openChallengeGearPanel();
        };
      });
    },

    /* 打开附魔法阵面板（Modal） */
    openChallengeEnchantPanel() {
      const p = App.player;
      if (!p) return;
      const html = App.challengeEnchantPanelHtml(p);
      App.openBigModal('附 魔 法 阵', html, () => {});
      document.querySelectorAll('[data-addench]').forEach(btn => {
        btn.onclick = () => {
          const eid = btn.dataset.addench;
          if (!p.challengeEnchants) p.challengeEnchants = [];
          if (p.challengeEnchants.length >= 4) { Engine.log('最多配置 4 个法阵。', 'evil'); return; }
          // 配置法阵需消耗风羽印记 ×1
          if (App.challengeMatCount(p) < 1) { Engine.log('风羽印记不足（需要 1 枚，当前 ' + App.challengeMatCount(p) + '）。去探索搜集、战斗、委托获取。', 'evil'); return; }
          App.challengeMatDelta(p, -1);
          p.challengeEnchants.push(eid);
          App.applyChallengeGear(p);
          Engine.log('你配置了【' + (App.challengeEnchantData().find(x => x.id === eid) || {}).name + '】法阵！（消耗风羽印记 ×1）', 'gold');
          App.openChallengeEnchantPanel();
        };
      });
      document.querySelectorAll('[data-remench]').forEach(btn => {
        btn.onclick = () => {
          const eid = btn.dataset.remench;
          p.challengeEnchants = (p.challengeEnchants || []).filter(x => x !== eid);
          App.applyChallengeGear(p);
          Engine.log('你卸下了法阵。', 'system');
          App.openChallengeEnchantPanel();
        };
      });
    },

    /* 随机获得一个未拥有的附魔法阵（探索奇遇/商人/隐藏任务用） */
    challengeGrantRandomEnchant(p) {
      if (!p) return null;
      // V1.3.14：附魔法阵为羽民专属变强路线（羽民无锻造/改装），仅羽民可获取法阵
      if (p.challengeId !== 'ch_yumin_commoner') return null;
      if (!p.challengeEnchantPool) p.challengeEnchantPool = [];
      const pool = p.challengeEnchantPool;
      if (pool.length >= App.challengeEnchantData().length) return null;
      const unowned = App.challengeEnchantData().filter(e => pool.indexOf(e.id) < 0);
      if (!unowned.length) return null;
      const got = unowned[Math.floor(Math.random() * unowned.length)];
      pool.push(got.id);
      return got;
    },

    /* 挑战探索数据（V1.3.9：在对应国家内探索，专属NPC与挑战；完成任务解锁更多区域） */
    challengeExploreData(cid) {
      const map = {
        'ch_xuanyuan_commoner': {
          nation: '轩辕国 · 机关城',
          regions: [
            { id:'r1', name:'铁匠街', desc:'炉火通红，锤声不绝。', unlock: 0, spots: [
              { kind:'npc', id:'npc1', name:'老铁匠刘工', text:'"小娃子，街口那几个失控的机关兵越来越凶了，你若能替老汉收拾两个，铁铺的废铁随你挑。"',
                task: { type:'wins', need: 2, desc:'击败 2 个失控机关（探索中的战斗）' }, rewardParts: 4, rewardGold: 60, rewardExp: 250, key:'xuanyuan_npc1' },
              { kind:'merchant', id:'mer1', name:'行脚商·老冯', text:'"铁匠铺的东西都是刘工打的，我这儿有些外头的好货——灵珠、图纸、还有据说从虚月那边流出来的东西。"',
                sell: ['MAT-G05','MAT-G07','MAT-E17','MAT-F01'], key:'xuanyuan_mer1' },
              { kind:'hidden', id:'hid1', name:'铁匠铺暗阁', text:'刘工打铁时，总爱朝那面旧墙瞥上一眼。墙后，似乎有夹层。', key:'xuanyuan_hid1',
                clue:'你趁刘工打盹，摸到墙上的暗格——里面锁着一只木匣，匣底刻着半句机关口令。', task:'寻找完整的机关口令（击败【虚月信使】2 次）', type:'wins', need:2, typeKey:'xuanyuan_final', rewardParts: 8, rewardGold: 150, rewardExp: 500, rewardEnchant: true },
              { kind:'battle', name:'失控哨兵', desc:'眼珠赤红，见人就扑。' },
              { kind:'gather', name:'废铁堆', desc:'机关残骸堆成的山，零件散落其间。' },
              { kind:'hidden_person', id:'hp1', name:'古怪的老道', key:'xuanyuan_hp1', mat:5, gold:100,
                text:'铁匠街角落蹲着个邋遢老道，自称"路过"。他眯眼打量你半天，忽然开口：「小子，你身上的气……有意思。贫道这儿有几句用不上的话，换你几两茶钱，如何？」' }
            ]},
            { id:'r2', name:'城西坊市', desc:'灾后的坊市仍有几分烟火气。', unlock: 1, spots: [
              { kind:'npc', id:'npc2', name:'盲眼货郎', text:'"嘘……别声张。那晚我看见虚月的人从北门进进出出，怕是在找什么‘钥匙’。"',
                task: { type:'collect', need: 3, desc:'收集 3 份物资（探索搜集）' }, rewardParts: 4, rewardGold: 80, rewardExp: 300, key:'xuanyuan_npc2' },
              { kind:'merchant', id:'mer2', name:'黑市商·独眼龙', text:'"小兄弟，虚月的消息要不要？一口价。还有他们那边的‘法器’，也弄到过几件。"',
                sell: ['MAT-F03','MAT-G09','MAT-SC01','MAT-E17'], key:'xuanyuan_mer2' },
              { kind:'hidden', id:'hid2', name:'坊市地窖', text:'独眼龙让你别碰地窖的门——那底下，好像有人说话。', key:'xuanyuan_hid2',
                clue:'你撬开地窖门锁，里面藏着虚月的密信：北门之夜，三只麻袋，一个"钥匙"计划。', task:'查明钥匙计划（击败【虚月信使】3 次）', type:'wins', need:3, typeKey:'xuanyuan_final', rewardParts: 10, rewardGold: 200, rewardExp: 600, rewardEnchant: true },
              { kind:'battle', name:'虚月信使', desc:'披着月白斗篷，手中捏着传讯的符纸。' },
              { kind:'gather', name:'废弃仓库', desc:'尘埃里也许藏着前人留下的物资。' },
              { kind:'hidden_person', id:'hp2', name:'落难的剑客', key:'xuanyuan_hp2', mat:5, gold:100,
                text:'坊市桥下，一个佩剑的汉子靠在墙根，腿上一道深可见骨的伤口。他看见你，咧嘴一笑：「小兄弟，帮个忙——去买两贴伤药，回头我教你一招剑。」' }
            ]}
          ]
        },
        'ch_xuanyuan_awaken': {
          nation: '机关塔 · 核心',
          regions: [
            { id:'r1', name:'核心舱', desc:'你的苏醒之地，齿轮仍在缓缓转动。', unlock: 0, spots: [
              { kind:'npc', id:'npc1', name:'守卫机关甲', text:'"检测到未登记单位……等等，你的编号，是‘七号’？他们说你早该报废了。"',
                task: { type:'wins', need: 2, desc:'击败 2 个污染机关兽' }, rewardParts: 4, rewardGold: 60, rewardExp: 250, key:'awaken_npc1' },
              { kind:'merchant', id:'mer1', name:'维修机器人', text:'"哔——本机可兑换零件与核心材料。请输入指令。"',
                sell: ['MAT-S01','MAT-E17','MAT-G06','MAT-F05'], key:'awaken_mer1' },
              { kind:'hidden', id:'hid1', name:'核心舱暗格', text:'你的数据库深处有一段被加密的记录，解密后的文件名是——《我不是七号》。', key:'awaken_hid1',
                clue:'你绕过三重加密，读出了被删改的记录：第七层的"七号"，不止一个。', task:'击退 2 个巡逻魔傀，收集残缺数据', type:'wins', need:2, typeKey:'awaken_final', rewardParts: 8, rewardGold: 150, rewardExp: 500, rewardEnchant: true },
              { kind:'battle', name:'污染机关兽', desc:'身上爬满黑紫色纹路，兽瞳泛着虚月的光。' },
              { kind:'gather', name:'废弃零件舱', desc:'待回收的零件，也许对你有用。' },
              { kind:'hidden_person', id:'hp1', name:'废弃的「五号」', key:'awaken_hp1', mat:5, gold:100,
                text:'零件舱深处，一具残缺的机体忽然亮了亮眼灯。「……编号，五号。」他断断续续地说，「七号，小心……他们把你造出来，是当作……容器。」' }
            ]},
            { id:'r2', name:'第七层档案室', desc:'记载你“出生”资料的房间。', unlock: 1, spots: [
              { kind:'npc', id:'npc2', name:'旧档案', text:'"修复完毕——档案标题：《第七号造物实验纪要》。你，是他们最成功也最失败的作品。"',
                task: { type:'collect', need: 3, desc:'收集 3 份物资' }, rewardParts: 4, rewardGold: 80, rewardExp: 300, key:'awaken_npc2' },
              { kind:'merchant', id:'mer2', name:'回收商·铁皮人', text:'"机械体，要换核心吗？我这儿有从上一任‘七号’身上拆下来的东西。"',
                sell: ['MAT-F01','MAT-G08','MAT-SC15','MAT-S01'], key:'awaken_mer2' },
              { kind:'hidden', id:'hid2', name:'档案室的第七个抽屉', text:'旧档案说过：第七个抽屉，锁是坏的。', key:'awaken_hid2',
                clue:'抽屉里躺着一枚锈蚀的编号牌——上面刻着「六号」。原来你不是第一个。', task:'击败 3 个巡逻魔傀，集齐「六号」的残件', type:'wins', need:3, typeKey:'awaken_final', rewardParts: 10, rewardGold: 200, rewardExp: 600, rewardEnchant: true },
              { kind:'battle', name:'巡逻魔傀', desc:'曾是守塔卫士，如今形同鬼魅。' },
              { kind:'gather', name:'档案柜', desc:'有些抽屉怎么也打不开。' },
              { kind:'hidden_person', id:'hp2', name:'「零号」的残魂', key:'awaken_hp2', mat:5, gold:100,
                text:'档案室角落，一段投影反复闪烁。那是"零号"——所有试验体的原型。「七号，」它轻声说，「答案不在档案里……在你做过的事里。」' }
            ]}
          ]
        },
        'ch_yumin_commoner': {
          nation: '羽民 · 天空城',
          regions: [
            { id:'r1', name:'云栈', desc:'悬空的石桥连着一座座巢屋。', unlock: 0, spots: [
              { kind:'npc', id:'npc1', name:'老祭司望舒', text:'"无翼的孩子，风魔又要来了。你若能替我们守一守城头，巢里的风粮随你取用。"',
                task: { type:'wins', need: 3, desc:'击败 3 个风魔爪牙' }, rewardParts: 4, rewardGold: 60, rewardExp: 250, key:'yumin_npc1' },
              { kind:'merchant', id:'mer1', name:'风粮商·驼背翁', text:'"孩子，我这儿的风粮可救急。还有些从风眼里捡回来的东西，你敢要么？"',
                sell: ['MAT-FS02','MAT-FS03','MAT-E02','MAT-G02'], key:'yumin_mer1' },
              { kind:'hidden', id:'hid1', name:'云栈下的旧鸟巢', text:'云栈底下悬着一只朽坏的鸟巢，巢底压着什么，泛着蓝光。', key:'yumin_hid1',
                clue:'你取出巢底的残片——是一枚风神的信物，上面刻着：「风不弃无翼者」。', task:'击退 3 个风魔爪牙，护住鸟巢', type:'wins', need:3, typeKey:'yumin_final', rewardParts: 8, rewardGold: 150, rewardExp: 500, rewardEnchant: true },
              { kind:'battle', name:'风魔爪牙', desc:'裹着黑风，嘶吼着扑向城头。' },
              { kind:'gather', name:'巢屋粮仓', desc:'地居区老幼过冬的存粮，动之前先想想。' },
              { kind:'hidden_person', id:'hp1', name:'哑婆婆', key:'yumin_hp1', mat:5, gold:100,
                text:'云栈尽头的矮屋里，住着个不会说话的哑婆婆。她见你来了，颤巍巍摸出一把风干的草药，又指了指你缠布条的双手，比了个"飞"的手势。' }
            ]},
            { id:'r2', name:'风眼之墟', desc:'风魔撕开的裂口，风从这里灌进来。', unlock: 1, spots: [
              { kind:'npc', id:'npc2', name:'伤员老羽', desc:'"当年我也能飞……孩子，风魔的巢穴就在裂口深处，别轻易去。"',
                task: { type:'collect', need: 3, desc:'收集 3 份物资' }, rewardParts: 4, rewardGold: 80, rewardExp: 300, key:'yumin_npc2' },
              { kind:'merchant', id:'mer2', name:'拾荒者·独臂羽', text:'"风魔刮走了我一只翅膀，也刮来了不少好东西——挑一件？"',
                sell: ['MAT-F07','MAT-G04','MAT-SC01','MAT-E19'], key:'yumin_mer2' },
              { kind:'hidden', id:'hid2', name:'风眼中的祭坛', text:'裂口深处立着一座半塌的祭坛，祭坛上刻着风神的名讳。', key:'yumin_hid2',
                clue:'你在祭坛下挖出一只石匣：风神遗卷，记载着借风之法。', task:'击退 4 个风眼魔蝠，平息祭坛', type:'wins', need:4, typeKey:'yumin_final', rewardParts: 10, rewardGold: 200, rewardExp: 600, rewardEnchant: true },
              { kind:'battle', name:'风眼魔蝠', desc:'从裂口涌出的黑风凝成蝠形。' },
              { kind:'gather', name:'坠落的巢', desc:'被风掀落的巢屋，压着些旧物。' },
              { kind:'hidden_person', id:'hp2', name:'风中的歌者', key:'yumin_hp2', mat:5, gold:100,
                text:'风眼边缘，一个披着残破羽衣的歌者迎风而坐，低声唱着听不懂的歌谣。他转过头：「无翼的孩子，你听——风在说，它从不曾放弃任何人。」' }
            ]}
          ]
        }
      };
      return map[cid] || { nation: '', regions: [] };
    },

    /* 挑战探索随机事件（V1.3.12：深入探索时随机遇到，奇遇/陷阱/秘闻，不一成不变） */
    challengeRandomEvents(cid) {
      const evs = {
        'ch_xuanyuan_commoner': [
          { id:'evt1', name:'失控的机关兽', type:'battle', desc:'一台双目赤红的机关兽挡住了去路。', enemy:'失控机关兽', el:'金' },
          { id:'evt2', name:'地下的锻造笔记', type:'treasure', desc:'角落里有本泛黄的笔记，夹着一张图纸。', parts:3, gold:50, exp:200, mat:['MAT-JG02'] },
          { id:'evt3', name:'迷雾中的商队', type:'shop', desc:'一支商队借着夜色卸货，看见你连忙招了招手。', cost:50, reward:{parts:3, gold:30} },
          { id:'evt4', name:'虚月的告示', type:'lore', desc:'墙上贴着一张虚月的告示，字迹歪斜，读来令人心悸。' }
        ],
        'ch_xuanyuan_awaken': [
          { id:'evt1', name:'发狂的维修傀', type:'battle', desc:'一台维修傀突然挥动扳手向你砸来。', enemy:'维修傀', el:'雷' },
          { id:'evt2', name:'残存的数据碎片', type:'treasure', desc:'一截断裂的存储单元还亮着微光。', parts:3, gold:50, exp:200, mat:['MAT-S01'] },
          { id:'evt3', name:'游荡的回收机', type:'shop', desc:'一台老式回收机还在工作，吞零件，吐金币。', cost:40, reward:{parts:0, gold:60} },
          { id:'evt4', name:'磨损的铭牌', type:'lore', desc:'一块铭牌刻着：「七号——永远不要相信你看到的一切。」' }
        ],
        'ch_yumin_commoner': [
          { id:'evt1', name:'风眼魔蝠', type:'battle', desc:'一只魔蝠从裂口扑出，黑风卷着碎石。', enemy:'风眼魔蝠', el:'风' },
          { id:'evt2', name:'坠落的信筒', type:'treasure', desc:'一只绑着羽毛的信筒挂在断枝上。', parts:3, gold:50, exp:200, mat:['MAT-FS02'] },
          { id:'evt3', name:'迷路的商羽', type:'shop', desc:'一个羽民商人被风困在崖下，愿用存货换你帮他把货搬回巢屋。', cost:50, reward:{parts:3, gold:30} },
          { id:'evt4', name:'旧城墙上的刻字', type:'lore', desc:'石墙上刻着一句旧话：「无翼者，风不弃。」' }
        ]
      };
      return evs[cid] || [];
    },

    /* 从候选材料池随机给 1-2 份（挑战冒险用） */
    giveRandomMaterial(pl, pool, minN, maxN) {
      if (!pool || !pool.length) { STATE.addMaterial(pl, 'MAT-C01', 1); return 'MAT-C01'; }
      const matId = pool[Math.floor(Math.random() * pool.length)];
      const n = minN + Math.floor(Math.random() * (maxN - minN + 1));
      if (!pl.materials) pl.materials = {};
      STATE.addMaterial(pl, matId, n);
      return matId;
    },

    /* 挑战困境数据（每个挑战专属，影响修炼/战斗/探索，塑造难度氛围） */
    challengeDilemmas(challengeId) {
      const map = {
        'ch_xuanyuan_commoner': [
          { id: 'pack_wolves', name: '群狼环伺', icon: '🐺',
            desc: '机关城失控者众，废铁迷宫处处杀机——遭遇怪物概率 +35%，怪物攻防 +20%。',
            effect: 'encounter_up' },
          { id: 'dry_aura', name: '灵气枯竭', icon: '🫙',
            desc: '虚月之蚀抽干了城中灵气——修炼获取修为 −50%。',
            effect: 'cultivate_slow' }
        ],
        'ch_xuanyuan_awaken': [
          { id: 'dark_moon', name: '暗月侵蚀', icon: '🌑',
            desc: '侵蚀之力日夜蚕食你的核心——灵气每日流失，须在 30 天内斩断侵蚀。',
            effect: 'time_limit', days: 30 },
          { id: 'memory_mix', name: '记忆混乱', icon: '🌀',
            desc: '残存的碎片记忆让你心神不宁——每次战斗结束灵力 −20%。',
            effect: 'mp_drain' }
        ],
        'ch_yumin_commoner': [
          { id: 'headwind', name: '逆风而行', icon: '🌬️',
            desc: '风魔日夜刮城，每一步都更艰难——行动消耗时辰 +1。',
            effect: 'time_cost_up' },
          { id: 'claw_swarm', name: '风魔爪牙', icon: '🪶',
            desc: '风魔的爪牙在城头逡巡——遭遇怪物概率 +25%，怪物攻 +15%。',
            effect: 'encounter_up' }
        ]
      };
      return map[challengeId] || [];
    },

    /* 挑战冒险地点（按挑战固定探索方向：每个挑战只在特定国家的特定地点活动，剧情与正常主线不同） */
    challengeAdventures(challengeId) {
      const map = {
        // 机关城挑战：活动范围锁定在轩辕国（机关塔/素人村/码头），剧情是"铁匠阿锤"的视角，与正常主线无关
        'ch_xuanyuan_commoner': [
          { id: 'waste_maze', name: '轩辕 · 废铁迷宫', icon: '⚙️', kind: 'battle',
            desc: '机关塔底层的废铁迷宫，层层叠叠的失控机关间，有人喊过你的名字。搜寻可用灵材，也可能撞上敌人。',
            mats: ['MAT-JG01','MAT-JG02','MAT-JG03','MAT-C01'] },
          { id: 'suren_village', name: '轩辕 · 素人村', icon: '🏘️', kind: 'gather',
            desc: '村人们把仅剩的口粮分给你，也向你打听孩子们的安危。这里没有机关，只有人间烟火。',
            mats: ['MAT-C01','MAT-C02','MAT-C05'] },
          { id: 'dock', name: '轩辕 · 旧码头', icon: '⚓', kind: 'gather',
            desc: '机关运河的废弃码头漂着许多物资箱。机师们的东西，你用来喂饱孩子。',
            mats: ['MAT-C02','MAT-C03','MAT-JG03'] }
        ],
        // 觉醒挑战：活动范围锁定在机关塔内部（核心/画室/档案库），探索的是"我是谁"的记忆
        'ch_xuanyuan_awaken': [
          { id: 'core_ruins', name: '机关塔 · 核心残骸', icon: '💠', kind: 'battle',
            desc: '侵蚀的核心外围盘踞着被污染的机关兽。摧毁它们，能夺回一点属于你的灵气。',
            mats: ['MAT-JG01','MAT-JG02','MAT-E17'] },
          { id: 'art_room', name: '机关塔 · 画室', icon: '🖌️', kind: 'cultivate',
            desc: '你捡来的笔在这里能画出太阳。每次作画，都更接近「我是谁」的答案。',
            mats: ['MAT-C01','MAT-C02'] },
          { id: 'archive', name: '机关塔 · 档案库', icon: '📜', kind: 'gather',
            desc: '残存的档案记录着机关人的过去。或许能找到关于「七号」的线索。',
            mats: ['MAT-C03','MAT-C05','MAT-JG03'] }
        ],
        // 羽民挑战：活动范围锁定在羽民国（城头/地居区/风谷），剧情是"无翼逆风"的守护
        'ch_yumin_commoner': [
          { id: 'city_wall', name: '羽民 · 城头', icon: '🏯', kind: 'battle',
            desc: '风魔的爪牙从云里扑下。守住城头，就是守住身后不会飞的老弱。',
            mats: ['MAT-FS01','MAT-FS02','MAT-C01'] },
          { id: 'ground_district', name: '羽民 · 地居区', icon: '🛖', kind: 'gather',
            desc: '地居们把藏起来的粮食分给你，也把他们的期盼一并托付。这里没有云，只有扎实的屋顶。',
            mats: ['MAT-C01','MAT-C05','MAT-FS02'] },
          { id: 'wind_valley', name: '羽民 · 风谷', icon: '🍃', kind: 'gather',
            desc: '谷口风烈，却生着许多草药。逆风而行，采一株是一株。',
            mats: ['MAT-FS02','MAT-FS03','MAT-C02'] }
        ]
      };
      return map[challengeId] || [];
    },

    /* 挑战模式任务面板（区域/限时/任务进度/下一步）——由 refreshQuestGuide 在挑战模式时优先显示 */
    buildChallengeGuideText(p) {
      const cid = p.challengeId;
      const goal = App.challengeGoal(cid);
      const dls = App.challengeDilemmas(cid);
      const prep = p.challengePrep || {};
      const lines = [];
      const remain = goal && goal.days ? Math.max(0, goal.days - (p.day || 1) + 1) : 0;
      if (goal) {
        lines.push('【区域】' + goal.region + ' · 限时剩余 ' + remain + ' 天');
        lines.push('【目标】' + goal.desc);
      }
      dls.forEach(d => lines.push('【' + d.name + '】' + d.desc));
      const prog = App.challengeTaskProgress(p, goal);
      prog.forEach(t => lines.push((t.done ? '✓' : '○') + ' ' + t.label + (t.done ? '（完成）' : '（' + t.cur + '/' + t.need + '）')));
      lines.push('【下一步】' + App.challengeNextHint(p, goal));
      return lines;
    },

    /* 挑战限时失败结算（v1.3.8：期限耗尽，展示任务完成度） */
    buildChallengeFail() {
      const p = App.player;
      const goal = p && p.challengeId ? App.challengeGoal(p.challengeId) : null;
      const prog = goal ? App.challengeTaskProgress(p, goal) : [];
      const lines = prog.length
        ? prog.map(t => (t.done ? '✓' : '○') + ' ' + t.label + (t.done ? '（已完成）' : '（' + t.cur + '/' + t.need + '）')).join('\n')
        : '（无任务）';
      return {
        id: 'challenge_fail',
        title: '【挑战】试炼落幕',
        bg: 'assets/img/nations/xuanyuan-city.jpg',
        text: `期限已至，你在【${goal ? goal.region : '山海'}】的试炼就此落幕。

[highlight]任务结算[/highlight]
${lines}

未能达成全部任务，试炼以失败告终。但此行的见闻不会消失——回到封面，调整策略，再次挑战吧。`,
        options: [
          { label: '【回到封面】', next: 'title' }
        ]
      };
    },

    /* 构建挑战模式场景（以普通人视角，挑战营地 = 挑战模式的家园） */
    buildChallengeScene(challengeId) {
      const p = App.player;
      const bg = 'assets/img/nations/xuanyuan-city.jpg';
      const intro = (p && p._challengeIntro) || '';
      if (challengeId === 'ch_xuanyuan_commoner') {
        return App.buildChallengeCamp('ch_xuanyuan_commoner', '机关城 · 凡尘试炼', bg, intro);
      } else if (challengeId === 'ch_xuanyuan_awaken') {
        return App.buildChallengeCamp('ch_xuanyuan_awaken', '觉醒 · 七号之问', bg, intro);
      } else if (challengeId === 'ch_yumin_commoner') {
        return App.buildChallengeCamp('ch_yumin_commoner', '羽民 · 无翼之民', 'assets/img/nations/yum-tianyu-city.jpg', intro);
      }
      return { id: 'challenge_default', title: '挑战', bg, text: '未知挑战。', options: [{ label: '返回', next: 'title' }] };
    },

    /* 挑战营地（挑战模式的家园）：参考剧情模式家园布局——
       状态面板 + 精简功能（修炼/冒险/休息/就寝/返回主界面）+ 前往特定国家探索/继续剧情入口
       比剧情家园少：种植/供奉/伏魔窟/集市/宠物/职业/炼丹（挑战模式专注剧情推进与成长） */
    buildChallengeCamp(challengeId, name, bg, introText) {
      const p = App.player;
      if (!p.challengePrep) p.challengePrep = { materials: 0, adventures: 0, wins: 0 };
      const prep = p.challengePrep;
      const dls = App.challengeDilemmas(challengeId);
      const adventures = App.challengeAdventures(challengeId);
      const goal = App.challengeGoal(challengeId);
      const chapterNames = ['第一章', '第二章', '第三章·最终战'];
      // 挑战家园的专属布局：左侧属性面板（与剧情家园同风格）+ 中间文本 + 选项按钮
      const maxHp = STATE.calcMaxHp(p);
      const maxMp = STATE.calcMaxMp(p);
      const hpBar = '█'.repeat(Math.max(0, Math.round(p.hp / maxHp * 12))).padEnd(12, '░');
      const mpBar = '█'.repeat(Math.max(0, Math.round(p.mp / maxMp * 12))).padEnd(12, '░');
      const inv = Object.keys(p.materials || {}).map(k => STATE.matName(k) + '×' + p.materials[k]).join(' ') || '（空空如也）';
      // 章节制入口：每章剧情战斗后强制回营地修炼/冒险提升（物资/等级门槛），
      // chapter 0 = 序章/第一章，1 = 第二章，2 = 第三章最终战
      const chapterEntries = {
        'ch_xuanyuan_commoner': {
          0: 'challenge_xuanyuan_intro',
          1: 'challenge_xuanyuan_core',
          2: 'challenge_xuanyuan_depth'
        },
        'ch_xuanyuan_awaken': {
          0: 'challenge_xuanyuan_awaken_intro',
          1: 'challenge_xuanyuan_awaken_art',
          2: 'challenge_xuanyuan_awaken_depth'
        },
        'ch_yumin_commoner': {
          0: 'challenge_yumin_intro',
          1: 'challenge_yumin_ban',
          2: 'challenge_yumin_depth'
        }
      }[challengeId] || {};
      const chapter = prep.chapter || 0;
      // V1.3.20：章节门槛修复——第一章免费进入，第二章需 3 份物资（推动探索），第三章（最终）不设门槛
      const needMats = [0, 3, 0][Math.min(chapter, 2)] || 0;
      const opts = [];
      // V1.3.9：挑战家园系统入口（按挑战主题配置：修炼/充能·突破·探索·锻造·休息·任务）
      // 修炼/充能/休息/探索/锻造由独立 ch_* 子场景处理（分层独立，不影响剧情家园）
      // V1.3.19：为系统入口补"代价预览"（耗时辰/材料），减少误触
      const campTimeCost = dls.some(d => d.effect === 'time_cost_up') ? 2 : 1;
      const campCostMap = {
        cultivate: ['耗时辰×' + campTimeCost], charge: ['耗时辰×' + campTimeCost],
        explore: ['耗时辰×' + campTimeCost], forge: ['需' + App.challengeMatName(challengeId)],
        awaken: ['需风羽印记'], rest: ['回满状态'], tasks: [], daily: []
      };
      App.challengeSystems(challengeId).forEach(sys => {
        opts.push({ label: sys.label + (sys.id === 'rest' && dls.some(d=>d.effect==='time_cost_up') ? '（逆风需2时辰）' : ''), tag: sys.tag, cost: campCostMap[sys.id], onChoose: (pl) => { App.goto(sys.scene); }, next: null });
      });
      // 就寝（V1.3.9：独立子场景，推进天数 + 限时失败判定 + 暗月侵蚀）
      const remainDays = goal && goal.days ? Math.max(0, goal.days - (p.day || 1) + 1) : 0;
      opts.push({ label: '【就寝】休整一夜（限时' + (goal ? '剩 ' + remainDays + ' 天' : '') + '）', tag: '天数', cost: ['进入新一天'], onChoose: (pl) => App.goto('ch_sleep'), next: null });
      // v1.3.15 通关条件：击败最终 Boss（虚月守夜人 / 侵蚀本相 / 风魔之主）
      // 试炼任务全部完成 → 决战开启（通关=击败 Boss）；任务未完成也可提前决战（高风险速通）
      const tasksDone = App.challengeTasksDone(p, goal);
      const storyDone = (prep.chapter || 0) >= 2;
      const finalScene = chapterEntries[2];
      const bossName = (goal && goal.bossName) || (challengeId === 'ch_yumin_commoner' ? '风魔之主' : challengeId === 'ch_xuanyuan_awaken' ? '侵蚀本相' : '虚月守夜人');
      // V1.3.20 修复：第二章/第三章主线场景此前在 chapter>=1 后从营地消失（无"继续剧情"选项），
      // 导致第二章剧情完全不可达；现将"继续剧情"选项独立出来，任何 chapter<2 阶段都提供，
      // 并让物资门槛真正生效（第二章需 3 份物资，第一章/最终章无门槛）
      const entryScene = chapterEntries[chapter];
      const hasMats = (prep.materials || 0) >= needMats;
      if (chapter < 2 && entryScene) {
        opts.push({
          label: hasMats
            ? '【继续】前往' + chapterNames[Math.min(chapter, 2)] + '剧情' + (needMats ? '（物资 ' + (prep.materials||0) + '/' + needMats + '）' : '')
            : '【继续】『物资不足：外出冒险收集物资（' + (prep.materials||0) + '/' + needMats + '）』',
          tag: '主线',
          onChoose: (pl) => {
            if (!hasMats) { Engine.log('你还没有准备好。先在营地修炼、外出冒险收集 ' + needMats + ' 份物资，再继续剧情。', 'evil'); return; }
            if (entryScene) App.goto(entryScene);
          },
          next: null
        });
      }
      if (tasksDone) {
        // 任务全部完成 → 最终决战（通关条件：击败 Boss）
        opts.push({ label: '【决战】' + bossName + '就在前方！击败它，通关试炼（任务已全达成）', tag: '通关', cls: 'btn-primary', onChoose: (pl) => {
          if (finalScene) App.goto(finalScene);
          else Engine.log('最终战场尚未就绪。', 'evil');
        }, next: null });
        opts.push({ label: '【准备】' + App.challengeNextHint(p, goal), tag: '指引', onChoose: () => { Engine.log('任务已全达成！前往【决战】击败 ' + bossName + ' 即可通关。', 'gold'); }, next: 'challenge_prepare_' + challengeId });
      } else if ((prep.chapter || 0) >= 1) {
        // 剧情推进过半：可提前决战（速通路线，但风险高）或继续补任务
        opts.push({ label: '【决战】提前挑战 ' + bossName + '（通关=击败 Boss，可先完成任务提升把握）', tag: '决战', cls: 'btn-warn', onChoose: (pl) => {
          if (finalScene) App.goto(finalScene);
          else Engine.log('最终战场尚未就绪。', 'evil');
        }, next: null });
        opts.push({ label: '【准备】' + App.challengeNextHint(p, goal), tag: '指引', onChoose: () => { Engine.log(App.challengeNextHint(p, goal), 'gold'); }, next: 'challenge_prepare_' + challengeId });
      } else {
        opts.push({ label: '【准备】' + App.challengeNextHint(p, goal), tag: '指引', onChoose: () => { Engine.log(App.challengeNextHint(p, goal), 'gold'); }, next: 'challenge_prepare_' + challengeId });
      }
      // 返回封面请通过右上角「菜单」完成（家园/剧情内不放置返回主页选项，避免误触）
      // V1.3.11 排版对齐剧情家园：中间为简短 desc（引导），详细状态与进度放左侧 homeStats
      const taskProg = App.challengeTaskProgress(p, goal);
      const desc =
`${p.day <= 1 && introText ? introText + '\n\n' : ''}这是你在【${goal ? goal.region : name}】的营地——左侧为你当前的属性与试炼进度，右侧是今日可做的行动。${remainDays <= 20 ? '\n\n[highlight]注意[/highlight]：限时仅剩 ' + remainDays + ' 天，抓紧时间！' : ''}`;
      // 左侧属性面板（与剧情家园同风格：限时醒目 + 任务清单）
      const homeStats = `
        <div class="hs-block hs-hero">
          <div class="hs-name">${p.name || '旅人'}</div>
          <div class="hs-realm">${p.realm.name} · Lv${p.lv}</div>
          <div class="hs-day" style="${remainDays <= 20 ? 'color:#c0392b' : ''}">⏳ 限时剩余 ${remainDays} 天</div>
        </div>
        <div class="hs-block">
          <div class="hs-row"><span>修为</span><b>${p.realm.exp}/${p.realm.expMax}</b></div>
          <div class="hs-row"><span>气血</span><b>${Math.max(1, Math.min(p.hp, maxHp))}/${maxHp}</b></div>
          <div class="hs-row"><span>灵力</span><b>${Math.max(0, Math.min(p.mp, maxMp))}/${maxMp}</b></div>
          <div class="hs-row"><span>时辰</span><b>${p.shichen}/${p.shichenMax}</b></div>
          <div class="hs-row"><span>金币 · ${App.challengeMatName(challengeId)}</span><b>${p.gold || 0} · ${App.challengeMatCount(p)}</b></div>
        </div>
        <div class="hs-block">
          ${taskProg.map(t => `<div class="hs-row"><span>${t.done ? '✓' : '○'} ${t.label}</span><b>${t.done ? '完成' : t.cur + '/' + t.need}</b></div>`).join('')}
        </div>
        <div class="hs-block hs-tip">
          ${dls.map(d => d.icon + ' ' + d.name).join(' · ')}
        </div>`;
      return {
        id: 'challenge_prepare_' + challengeId,
        title: '【挑战】' + name + ' · 第 ' + p.day + ' 天',
        bg,
        desc,
        homeStats,   // 渲染左侧属性面板（与剧情家园一致）
        options: opts
      };
    },

    /* 挑战冒险战斗场景（由 runScene 分发到 challenge_adventure_battle） */
    buildChallengeAdventureBattle() {
      const p = App.player;
      if (!p || !p._pendingEnemy) return { id:'challenge_adventure_battle', title:'战斗', bg:'assets/img/nations/xuanyuan-city.jpg', text:'无。', options:[{ label:'返回', next:'challenge_prepare_' + (p && p.challengeId || '') }] };
      const after = p._adventureAfter || ('challenge_prepare_' + p.challengeId);
      return {
        id: 'challenge_adventure_battle',
        title: '【冒险遭遇】',
        bg: 'assets/img/nations/xuanyuan-city.jpg',
        text: '你遭遇了敌人！',
        options: [],
        battle: {
          isWild: true,   // 冒险遭遇不受主线 Boss 强化系数影响
          enemy: p._pendingEnemy,
          after,
          onWin: (pl) => {
            Engine.log('你击退了来犯之敌！', 'good');
            if (!pl.challengePrep) pl.challengePrep = {};
            pl.challengePrep.wins = (pl.challengePrep.wins || 0) + 1;
            pl.challengePrep.materials = (pl.challengePrep.materials || 0) + 1;
            // V1.3.9/1.3.12/1.3.14/1.3.16：战斗胜利掉落本挑战专属变强材料 + 对应品质灵材（不用灵香）
            const drop = App.challengeDropData(pl.challengeId);
            const matGain = (drop.parts || 1) + Math.floor(Math.random() * 2);
            const matName = App.challengeMatName(pl.challengeId);
            App.challengeMatDelta(pl, matGain);
            // 按搜寻 tier 掉对应品质灵材（tier1-2 普通/良品，tier3-4 上品/珍品）
            const tier = pl._challengeSearchTier || 1;
            const qualityMats = {
              1: ['MAT-E01', 'MAT-E02', 'MAT-E03', 'MAT-E04', 'MAT-E05'],
              2: ['MAT-E09', 'MAT-E10', 'MAT-E11', 'MAT-E12', 'MAT-E13'],
              3: ['MAT-E17', 'MAT-E18', 'MAT-E19', 'MAT-E20', 'MAT-E21'],
              4: ['MAT-E25', 'MAT-E26', 'MAT-E27', 'MAT-F01', 'MAT-F03']
            }[Math.min(4, tier)] || ['MAT-E01'];
            let matMsg = '';
            if (!pl.materials) pl.materials = {};
            if (Math.random() < 0.8) {
              const m = qualityMats[Math.floor(Math.random() * qualityMats.length)];
              pl.materials[m] = (pl.materials[m] || 0) + 1;
              matMsg = ' · 战利品【' + STATE.matName(m) + '】';
            }
            if (drop.gold) pl.gold = (pl.gold || 0) + drop.gold;
            Engine.log('你从残骸中搜出' + matName + ' ×' + matGain + matMsg + (drop.gold ? ' · 金币 +' + drop.gold : '') + '。', 'good');
            delete pl._challengeSearchTier;
            // 记忆混乱困境：战后灵力流失
            if (pl.challengeId === 'ch_xuanyuan_awaken') {
              pl.mp = Math.max(1, Math.floor((pl.mp || 1) * 0.8));
              Engine.log('记忆碎片翻涌，灵力流失了些许……', 'system');
            }
            delete pl._pendingEnemy;
            delete pl._adventureAfter;
          },
          onLose: (pl) => {
            Engine.log('你被击退了，先回营地休整。', 'evil');
            delete pl._pendingEnemy;
            delete pl._adventureAfter;
            delete pl._challengeSearchTier;   // V1.3.20：战败同样清除搜寻品质标记，避免污染后续掉落
          }
        }
      };
    },

    /* 挑战战斗场景注册（由 runScene 分发） */

    /* ============== 挑战子场景（V1.3.9 分层独立：修炼/充能/突破/探索/锻造/休息/任务/就寝） ==============
     * 所有 ch_* 场景与剧情模式完全隔离，仅挑战模式玩家可达。 */
    buildChallengeSubScene(sceneId) {
      const p = App.player;
      if (!p) return { id: sceneId, title: '挑战', bg: 'assets/img/nations/xuanyuan-city.jpg', text: '无角色。', options: [{ label: '返回', next: 'title' }] };
      const cid = p.challengeId;
      const camp = 'challenge_prepare_' + cid;
      const prep = p.challengePrep || {};
      const dls = App.challengeDilemmas(cid);
      const cultMul = dls.some(d => d.effect === 'cultivate_slow') ? 0.5 : 1;
      const timeCost = () => dls.some(d => d.effect === 'time_cost_up') ? 2 : 1;
      const bg = cid === 'ch_yumin_commoner' ? 'assets/img/nations/yum-tianyu-city.jpg' : 'assets/img/nations/xuanyuan-city.jpg';
      const back = { label: '【返回营地】', next: camp };
      // 升级检查（与常规一致：经验封顶、回满血蓝、expMax 随等级增长）
      const levelUp = (pl) => {
        if ((pl.realm.exp || 0) >= (pl.realm.expMax || 800)) {
          pl.realm.exp = Math.min(pl.realm.exp, pl.realm.expMax || 800);
          pl.realm.exp -= (pl.realm.expMax || 800);
          pl.lv = Math.min(25, pl.lv + 1);
          // V1.3.17：经验曲线与剧情模式一致（每升一级 expMax ×1.4 几何增长），
          // 修复此前用「800×1.4^(lv-1)」在 Lv18 首次升级后把 expMax 抬到千万级、Lv20/22 任务永远无法达成的问题
          pl.realm.expMax = Math.max(pl.realm.expMax || 800, Math.floor((pl.realm.expMax || 800) * 1.4));
          pl.hp = STATE.calcMaxHp(pl);
          pl.mp = STATE.calcMaxMp(pl);
          return true;
        }
        return false;
      };

      // —— 修炼（机关城 / 羽民）——
      if (sceneId === 'ch_cultivate') {
        const cost = timeCost();
        if (p.shichen < cost) return { id: sceneId, title: '【修炼】', bg, text: '时辰不足' + (cost > 1 ? '（逆风需 ' + cost + ' 时辰）' : '') + '，先【休息】或【就寝】吧。', options: [back] };
        STATE.spendShichen(p, cost);
        prep.practiced = (prep.practiced || 0) + 1;
        const gain = Math.floor(150 * cultMul);
        p.realm.exp = (p.realm.exp || 0) + gain;
        let msg = cultMul < 1 ? '灵气枯竭，修炼事倍功半（修为 +' + gain + '）。' : '你凝练气血，修为见长（修为 +' + gain + '）。';
        if (levelUp(p)) msg += '\n你突破了！等级提升至 Lv' + p.lv + '。';
        return { id: sceneId, title: '【修炼】', bg, text: '你盘膝而坐，运转周天。\n\n' + msg + '\n\n当前：Lv' + p.lv + ' · 修为 ' + p.realm.exp + '/' + p.realm.expMax + ' · 时辰 ' + p.shichen + '/' + p.shichenMax, options: [back] };
      }

      // —— 充能（觉醒 · 机器人七号：无修炼，回核心舱静置充能）——
      if (sceneId === 'ch_charge') {
        const cost = timeCost();
        if (p.shichen < cost) return { id: sceneId, title: '【充能】', bg, text: '充能舱仍处于锁定状态（时辰不足）。先休整或就寝吧。', options: [back] };
        STATE.spendShichen(p, cost);
        const gain = Math.floor(130 * cultMul);
        p.realm.exp = (p.realm.exp || 0) + gain;
        let msg = '你在核心舱静置充能，齿轮与回路运转得更流畅了（精进 +' + gain + '）。';
        if (levelUp(p)) msg += '\n核心负载突破临界！等级提升至 Lv' + p.lv + '。';
        return { id: sceneId, title: '【充能】', bg, text: '你回到核心舱，舱门缓缓合拢。\n\n' + msg + '\n\n当前：Lv' + p.lv + ' · 精进 ' + p.realm.exp + '/' + p.realm.expMax + ' · 时辰 ' + p.shichen + '/' + p.shichenMax, options: [back] };
      }

      // —— 突破（心魔试炼：仅人类挑战；机器人没有境界）——
      if (sceneId === 'ch_break') {
        const realmNames = ['练气', '筑基', '金丹', '元婴', '化神', '渡劫', '飞升'];
        const curLv = p.realm.level || 3;
        const lvNeed = { 3: 20, 4: 35, 5: 50, 6: 70 }[curLv] || 0;
        const nextName = realmNames[curLv] || '圆满';
        if (curLv >= 7) {
          return { id: sceneId, title: '【突破】', bg, text: '你已臻至' + (p.realm.name || '飞升') + '之境，此路已尽。', options: [back] };
        }
        if ((p.lv || 1) < lvNeed || (p.realm.exp || 0) < (p.realm.expMax || 800)) {
          return { id: sceneId, title: '【突破】', bg, text: '【' + (p.realm.name || '金丹期') + ' → ' + nextName + '】\n\n突破需达到 Lv' + lvNeed + '（当前 Lv' + (p.lv || 1) + '）且修为圆满（' + (p.realm.exp || 0) + '/' + (p.realm.expMax || 800) + '）。\n\n先去【修炼】提升修为，再回来问心突破。', options: [back] };
        }
        p.realm.level = Math.min(7, curLv + 1);
        p.realm.name = realmNames[p.realm.level - 1] + '期';
        p.realm.exp = 0;
        p.hp = STATE.calcMaxHp(p);
        p.mp = STATE.calcMaxMp(p);
        return { id: sceneId, title: '【突破】', bg, text: '心魔化作你的倒影与你对坐。你问它：「为何是我？」它答：「因为我也是你。」\n\n幻象破碎。你突破至【' + p.realm.name + '】，气血灵力尽复！', options: [back] };
      }

      // —— 探索（本国地图：区域选择 + 解锁链）——
      if (sceneId === 'ch_explore') {
        const data = App.challengeExploreData(cid);
        const opts = [];
        const unlockNames = ['完成主线第一章后解锁', '完成主线第二章后解锁'];
        data.regions.forEach(r => {
          const unlocked = (prep.chapter || 0) >= (r.unlock || 0);
          opts.push({
            label: unlocked ? '【前往】' + r.name + ' — ' + r.desc : '【前往】' + r.name + '（' + (unlockNames[r.unlock] || '完成前置剧情后解锁') + '）',
            tag: unlocked ? '探索' : '未解锁',
            onChoose: (pl) => {
              if (!unlocked) { Engine.log('此区域尚未开启：' + (unlockNames[r.unlock] || '完成前置剧情后解锁') + '。', 'evil'); return; }
              App.goto('ch_region_' + cid + '_' + r.id);
            }, next: null
          });
        });
        opts.push({ label: '【' + App.challengeMatName(cid) + '】当前 ' + App.challengeMatCount(p) + ' 份（战斗胜利 / 搜集 / 委托可获）', tag: '库存', onChoose: () => {}, next: 'ch_explore' });
        opts.push(back);
        return {
          id: sceneId, title: '【探索 · ' + data.nation + '】', bg,
          text: '你在【' + data.nation + '】内游历。这里有许多人、许多事，也藏着许多危险。\n\n探索可获得物资与' + App.challengeMatName(cid) + '（用于营地锻造/强化），击败敌人可积累战功；有些区域需要先完成主线剧情才会开启。',
          options: opts
        };
      }

      // —— 区域场景（列出该区域的地点：NPC / 战斗 / 搜集）——
      if (sceneId.indexOf('ch_region_') === 0) {
        const rest = sceneId.replace('ch_region_', '');
        const rid = rest.slice(rest.lastIndexOf('_') + 1);
        const data = App.challengeExploreData(cid);
        const region = (data.regions || []).find(r => r.id === rid);
        if (!region) return { id: sceneId, title: '【探索】', bg, text: '此地去处已随流年改变。', options: [back] };
        const opts = [];
        region.spots.forEach(sp => {
          if (sp.kind === 'npc') {
            const done = prep.npcDone && prep.npcDone[sp.key];
            opts.push({ label: '【拜访】' + sp.name + (done ? '（已了却心愿）' : '（有要事相托）'), tag: '委托', onChoose: (pl) => App.goto('ch_npc_' + cid + '_' + rid + '_' + sp.id), next: null });
          } else if (sp.kind === 'battle') {
            opts.push({ label: '【战斗】' + sp.name + ' — ' + sp.desc, tag: '强敌', onChoose: (pl) => {
              const cost = timeCost();
              if (pl.shichen < cost) { Engine.log('时辰不足' + (cost > 1 ? '（逆风需' + cost + '时辰）' : '') + '。', 'evil'); return; }
              STATE.spendShichen(pl, cost);
              const elementMap = { 'ch_yumin_commoner': '风', 'ch_xuanyuan_awaken': '暗', 'ch_xuanyuan_commoner': '金' };
              const enemy = STATE.makeEnemy(pl, {
                lv: Math.max(10, (pl.lv || 18) + 2),
                state: { id: 'angry', name: '凶煞', mul: 1.1, aware: 'aware' },
                name: sp.name,
                hpMul: 4.5, atkMul: 0.9 * (dls.some(d => d.effect === 'encounter_up') ? 1.15 : 1),
                defMul: 0.4 * (dls.some(d => d.effect === 'encounter_up') ? 1.2 : 1),
                element: elementMap[cid] || '金',
                bg
              });
              pl._pendingEnemy = enemy;
              pl._adventureAfter = 'ch_region_' + cid + '_' + rid;
              App.goto('challenge_adventure_battle');
            }, next: null });
          } else if (sp.kind === 'gather') {
            opts.push({ label: '【搜集】' + sp.name + ' — ' + sp.desc, tag: '搜集', onChoose: (pl) => {
              const cost = timeCost();
              if (pl.shichen < cost) { Engine.log('时辰不足' + (cost > 1 ? '（逆风需' + cost + '时辰）' : '') + '。', 'evil'); return; }
              STATE.spendShichen(pl, cost);
              prep.materials = (prep.materials || 0) + 1;
              // 本挑战专属变强材料（V1.3.14：精铁/核心碎片/风羽印记）
              const matName = App.challengeMatName(cid);
              const matGain = 1 + Math.floor(Math.random() * 2);
              App.challengeMatDelta(pl, matGain);
              // 主题材料掉落（V1.3.12）
              const drop = App.challengeDropData(cid);
              const mat = App.giveRandomMaterial(pl, drop.mat || ['MAT-E09'], 1, 2);
              // V1.3.13/1.3.14：法阵仅羽民可获（附魔法阵是羽民专属变强路线）
              let extra = '';
              if (cid === 'ch_yumin_commoner' && Math.random() < 0.3) {
                const got = App.challengeGrantRandomEnchant(pl);
                if (got) extra = ' · 获得法阵【' + got.name + '】';
              }
              Engine.log('你在' + sp.name + '翻找，获得【' + STATE.matName(mat) + '】与' + matName + ' ×' + matGain + extra + '。', 'good');
            }, next: 'ch_region_' + cid + '_' + rid });
          } else if (sp.kind === 'merchant') {
            opts.push({ label: '【交易】' + sp.name + ' — 商人（买卖材料/零件）', tag: '商人', onChoose: (pl) => App.goto('ch_merchant_' + cid + '_' + rid + '_' + sp.id), next: null });
          } else if (sp.kind === 'hidden') {
            const done = prep.hiddenDone && prep.hiddenDone[sp.key];
            opts.push({ label: (done ? '【线索】' + sp.name + '（已解开）' : '【线索】' + sp.name + ' — ' + sp.clue), tag: '隐藏', onChoose: (pl) => App.goto('ch_hidden_' + cid + '_' + rid + '_' + sp.id), next: null });
          }
        });
        // 深入探索：随机遭遇（奇遇/陷阱/秘闻，V1.3.12）
        const evts = App.challengeRandomEvents(cid);
        opts.push({ label: '【深入探索】碰碰运气——或许有奇遇，或许有麻烦（耗1时辰）', tag: '奇遇', onChoose: (pl) => {
          const cost = timeCost();
          if (pl.shichen < cost) { Engine.log('时辰不足' + (cost > 1 ? '（逆风需' + cost + '时辰）' : '') + '。', 'evil'); return; }
          STATE.spendShichen(pl, cost);
          const evt = evts[Math.floor(Math.random() * evts.length)];
          if (evt) {
            pl._challengeEvent = evt;
            App.goto('ch_event_' + cid + '_' + rid);
          } else {
            Engine.log('这一趟风平浪静，一无所获。', 'system');
          }
        }, next: null });
        opts.push(back);
        return { id: sceneId, title: '【' + region.name + '】', bg, text: region.desc + '\n\n深入探索可能遇到奇遇、战斗或秘闻；也可拜访此处的 NPC 接下委托。', options: opts };
      }

      // —— 商人（V1.3.13：区域内商人，买卖材料/零件，可能出售法阵）——
      if (sceneId.indexOf('ch_merchant_') === 0) {
        const rest = sceneId.replace('ch_merchant_', '');
        const mid = rest.slice(rest.lastIndexOf('_') + 1);
        const mid2 = rest.slice(0, rest.lastIndexOf('_'));
        const rid = mid2.slice(mid2.lastIndexOf('_') + 1);
        const data = App.challengeExploreData(cid);
        const region = (data.regions || []).find(r => r.id === rid);
        const spot = region ? (region.spots || []).find(s => s.kind === 'merchant' && s.id === mid) : null;
        if (!spot) return { id: sceneId, title: '【商人】', bg, text: '商队已经离开了。', options: [back] };
        const matName = App.challengeMatName(cid);
        const opts = [];
        opts.push({ label: '【身家】金币 ' + (p.gold || 0) + ' · ' + matName + ' ' + App.challengeMatCount(p), tag: '状态', onChoose: () => {}, next: 'ch_merchant_' + cid + '_' + rid + '_' + mid });
        // 买变强材料
        opts.push({ label: '【采买】花 40 金币买 2 份' + matName, tag: '交易', onChoose: (pl) => {
          if ((pl.gold || 0) < 40) { Engine.log('金币不足。', 'evil'); return; }
          pl.gold -= 40; App.challengeMatDelta(pl, 2);
          Engine.log('你买下 2 份' + matName + '（金币 -40）。', 'good');
        }, next: 'ch_merchant_' + cid + '_' + rid + '_' + mid });
        // 买材料（现货列表）
        (spot.sell || []).forEach((midx, i) => {
          const price = 25 + i * 15;
          opts.push({ label: '【采买】' + STATE.matName(midx) + '（' + price + ' 金币·可入补给/图纸）', tag: '交易', onChoose: (pl) => {
            if ((pl.gold || 0) < price) { Engine.log('金币不足（需 ' + price + '）。', 'evil'); return; }
            pl.gold -= price;
            if (!pl.materials) pl.materials = {};
            pl.materials[midx] = (pl.materials[midx] || 0) + 1;
            Engine.log('你买下【' + STATE.matName(midx) + '】（金币 -' + price + '）。', 'good');
          }, next: 'ch_merchant_' + cid + '_' + rid + '_' + mid });
        });
        // 卖变强材料换金币（V1.3.14：商人回收本挑战专属材料）
        opts.push({ label: '【变卖】卖 1 份' + matName + '换 15 金币', tag: '交易', onChoose: (pl) => {
          if (App.challengeMatCount(pl) < 1) { Engine.log('没有' + matName + '可卖。', 'evil'); return; }
          App.challengeMatDelta(pl, -1);
          pl.gold = (pl.gold || 0) + 15;
          Engine.log('你卖掉 1 份' + matName + '，金币 +15。', 'good');
        }, next: 'ch_merchant_' + cid + '_' + rid + '_' + mid });
        // 神秘货品（仅羽民出法阵；其余出材料）
        opts.push({ label: '【神秘货】花 120 金币碰运气——' + (cid === 'ch_yumin_commoner' ? '可能买到附魔法阵' : '可能有大量' + matName), tag: '奇货', onChoose: (pl) => {
          if ((pl.gold || 0) < 120) { Engine.log('金币不足（需 120）。', 'evil'); return; }
          pl.gold -= 120;
          if (cid === 'ch_yumin_commoner' && Math.random() < 0.6) {
            const got = App.challengeGrantRandomEnchant(pl);
            if (got) { Engine.log('你从货堆里翻出一枚【' + got.name + '】法阵！', 'gold'); return; }
          }
          const g = 3 + Math.floor(Math.random() * 3);
          App.challengeMatDelta(pl, g);
          Engine.log('货堆里没有法阵，你捡回' + matName + ' ×' + g + '。', 'good');
        }, next: 'ch_merchant_' + cid + '_' + rid + '_' + mid });
        opts.push(back);
        return { id: sceneId, title: '【商人 · ' + spot.name + '】', bg, text: spot.text + '\n\n商人不收灵石，只认金币。', options: opts };
      }

      // —— 隐藏任务（V1.3.13：线索 → 完成条件 → 丰厚奖励 + 法阵）——
      if (sceneId.indexOf('ch_hidden_') === 0) {
        const rest = sceneId.replace('ch_hidden_', '');
        const hid = rest.slice(rest.lastIndexOf('_') + 1);
        const mid2 = rest.slice(0, rest.lastIndexOf('_'));
        const rid = mid2.slice(mid2.lastIndexOf('_') + 1);
        const data = App.challengeExploreData(cid);
        const region = (data.regions || []).find(r => r.id === rid);
        const spot = region ? (region.spots || []).find(s => s.kind === 'hidden' && s.id === hid) : null;
        if (!spot) return { id: sceneId, title: '【隐藏】', bg, text: '那处线索早已被风吹散。', options: [back] };
        const done = prep.hiddenDone && prep.hiddenDone[spot.key];
        const cur = (prep.wins || 0);
        const ok = cur >= (spot.need || 1);
        if (done) {
          return { id: sceneId, title: '【隐藏 · ' + spot.name + '】', bg, text: '「你找到了。」\n\n' + spot.clue + '\n\n（此间秘密已了。）', options: [back] };
        }
        if (!ok) {
          return { id: sceneId, title: '【隐藏 · ' + spot.name + '】', bg, text: spot.text + '\n\n[highlight]线索[/highlight]：' + spot.clue + '\n[highlight]条件[/highlight]：' + spot.task + '（当前 ' + cur + '/' + spot.need + '）', options: [back] };
        }
        // 完成
        const matName = App.challengeMatName(cid);
        return { id: sceneId, title: '【隐藏 · ' + spot.name + '】', bg, text: '「谜底揭开了。」\n\n' + spot.clue + '\n\n你掘出深藏的宝藏：\n[highlight]奖励[/highlight]：' + matName + ' ×' + spot.rewardParts + ' · 金币 +' + spot.rewardGold + ' · 修为 +' + spot.rewardExp + (spot.rewardEnchant ? (cid === 'ch_yumin_commoner' ? ' · 附魔法阵' : ' · 额外专属材料') : ''),
          options: [{ label: '【取走宝藏】', tag: '隐藏', onChoose: (pl) => {
            App.challengeMatDelta(pl, spot.rewardParts);
            pl.gold = (pl.gold || 0) + spot.rewardGold;
            pl.realm.exp = (pl.realm.exp || 0) + spot.rewardExp;
            if (levelUp(pl)) Engine.log('修为大涨，等级提升至 Lv' + pl.lv + '！', 'good');
            let extra = '';
            if (spot.rewardEnchant) {
              // V1.3.20：非羽民挑战的隐藏宝藏改发专属材料（附魔法阵仅羽民可获得）
              if (cid === 'ch_yumin_commoner') {
                const got = App.challengeGrantRandomEnchant(pl);
                if (got) extra = ' · 获得法阵【' + got.name + '】';
              } else {
                App.challengeMatDelta(pl, 2);
                extra = ' · 额外获得 ' + App.challengeMatName(cid) + ' ×2';
              }
            }
            if (!prep.hiddenDone) prep.hiddenDone = {};
            prep.hiddenDone[spot.key] = true;
            Engine.log('隐藏任务完成！' + matName + ' +' + spot.rewardParts + ' · 金币 +' + spot.rewardGold + extra, 'gold');
          }, next: 'ch_region_' + cid + '_' + rid }] };
      }

      // —— 深入探索随机事件（V1.3.12）——
      if (sceneId.indexOf('ch_event_') === 0) {
        const evt = p._challengeEvent;
        if (!evt) return { id: sceneId, title: '【探索】', bg, text: '四下寂静，无甚可寻。', options: [back] };
        const backEvt = { label: '【返回】', next: 'ch_region_' + cid + '_' + (sceneId.split('_').pop()) };
        const opts = [];
        if (evt.type === 'battle') {
          const elementMap = { 'ch_yumin_commoner': '风', 'ch_xuanyuan_awaken': '雷', 'ch_xuanyuan_commoner': '金' };
          opts.push({ label: '【应战】' + evt.enemy + '扑了上来！', tag: '战斗', onChoose: (pl) => {
            const enemy = STATE.makeEnemy(pl, {
              lv: Math.max(10, (pl.lv || 18) + 2),
              state: { id: 'angry', name: '凶煞', mul: 1.1, aware: 'aware' },
              name: evt.enemy, hpMul: 4.2, atkMul: 0.95, defMul: 0.4,
              element: elementMap[cid] || '金', bg
            });
            pl._pendingEnemy = enemy;
            pl._adventureAfter = 'ch_region_' + cid + '_' + (sceneId.split('_').pop());
            App.goto('challenge_adventure_battle');
          }, next: null });
        } else if (evt.type === 'treasure') {
          const matName = App.challengeMatName(cid);
          opts.push({ label: '【拾取】' + evt.name + '——收下这份意外之喜', tag: '机缘', onChoose: (pl) => {
            App.challengeMatDelta(pl, (evt.parts || 0));
            prep.materials = (prep.materials || 0) + 1;
            if (evt.gold) pl.gold = (pl.gold || 0) + evt.gold;
            if (evt.exp) pl.realm.exp = (pl.realm.exp || 0) + evt.exp;
            if (levelUp(pl)) Engine.log('修为大涨，等级提升至 Lv' + pl.lv + '！', 'good');
            if (evt.mat && evt.mat.length && !pl.materials) pl.materials = {};
            if (evt.mat && evt.mat.length) { const m = evt.mat[0]; pl.materials[m] = (pl.materials[m] || 0) + 1; }
            // V1.3.13/1.3.14：宝箱有概率开出附魔法阵（仅羽民）
            let encMsg = '';
            if (cid === 'ch_yumin_commoner' && Math.random() < 0.5) {
              const got = App.challengeGrantRandomEnchant(pl);
              if (got) encMsg = ' · 法阵【' + got.name + '】';
            }
            Engine.log('你捡到了' + evt.name + '！' + matName + ' +' + (evt.parts || 0) + (evt.gold ? ' · 金币 +' + evt.gold : '') + (evt.exp ? ' · 修为 +' + evt.exp : '') + (evt.mat && evt.mat.length ? ' · 获得一份' + STATE.matName(evt.mat[0]) : '') + encMsg, 'gold');
            delete pl._challengeEvent;
          }, next: 'ch_region_' + cid + '_' + (sceneId.split('_').pop()) });
        } else if (evt.type === 'shop') {
          const matName = App.challengeMatName(cid);
          opts.push({ label: '【交易】花 ' + evt.cost + ' 金币（' + matName + ' +' + evt.reward.parts + (evt.reward.gold ? ' · 金币 +' + evt.reward.gold : '') + '）', tag: '交易', onChoose: (pl) => {
            if ((pl.gold || 0) < evt.cost) { Engine.log('金币不足。', 'evil'); return; }
            pl.gold -= evt.cost;
            App.challengeMatDelta(pl, evt.reward.parts);
            if (evt.reward.gold) pl.gold = (pl.gold || 0) + evt.reward.gold;
            Engine.log('交易完成！' + matName + ' +' + evt.reward.parts + (evt.reward.gold ? ' · 金币 +' + evt.reward.gold : '') + '。', 'good');
            delete pl._challengeEvent;
          }, next: 'ch_region_' + cid + '_' + (sceneId.split('_').pop()) });
        } else if (evt.type === 'lore') {
          opts.push({ label: '【端详】记下这段见闻（命数+1）', tag: '秘闻', onChoose: (pl) => {
            try { if (META.addMing) META.addMing(1); Engine.log('你记下这段见闻，心有所悟（命数 +1）。', 'gold'); } catch (e) { Engine.log('你记下这段见闻。', 'good'); }
            delete pl._challengeEvent;
          }, next: 'ch_region_' + cid + '_' + (sceneId.split('_').pop()) });
        }
        opts.push({ label: '【离开】不多纠缠', tag: '谨慎', onChoose: (pl) => { delete pl._challengeEvent; }, next: 'ch_region_' + cid + '_' + (sceneId.split('_').pop()) });
        return { id: sceneId, title: '【深入探索】', bg, text: '「' + evt.name + '」\n' + evt.desc, options: opts };
      }

      // —— NPC 对话 / 委托 ——
      if (sceneId.indexOf('ch_npc_') === 0) {
        const rest = sceneId.replace('ch_npc_', '');
        const nid = rest.slice(rest.lastIndexOf('_') + 1);
        const mid = rest.slice(0, rest.lastIndexOf('_'));
        const rid = mid.slice(mid.lastIndexOf('_') + 1);
        const data = App.challengeExploreData(cid);
        const region = (data.regions || []).find(r => r.id === rid);
        const spot = region ? (region.spots || []).find(s => s.kind === 'npc' && s.id === nid) : null;
        if (!spot) return { id: sceneId, title: '【委托】', bg, text: '那人已不在此处。', options: [back] };
        const done = prep.npcDone && prep.npcDone[spot.key];
        if (done) {
          return { id: sceneId, title: '【' + spot.name + '】', bg, text: '「多谢你，孩子。」' + spot.name + '朝你点了点头，眼中多了一分暖意。\n\n（此间事了。）', options: [back] };
        }
        const t = spot.task;
        const cur = t.type === 'wins' ? (prep.wins || 0) : (prep.materials || 0);
        const ok = cur >= t.need;
        if (ok) {
          const matName = App.challengeMatName(cid);
          return { id: sceneId, title: '【' + spot.name + '】', bg, text: spot.text + '\n\n「你做到了！」' + spot.name + '将谢礼塞进你手里：\n\n[highlight]谢礼[/highlight]：' + matName + ' ×' + spot.rewardParts + ' · 金币 +' + spot.rewardGold + ' · 修为 +' + spot.rewardExp,
            options: [{ label: '【收下谢礼】', tag: '委托', onChoose: (pl) => {
              App.challengeMatDelta(pl, spot.rewardParts);
              pl.gold = (pl.gold || 0) + spot.rewardGold;
              pl.realm.exp = (pl.realm.exp || 0) + spot.rewardExp;
              if (levelUp(pl)) Engine.log('修为大涨，等级提升至 Lv' + pl.lv + '！', 'good');
              // V1.3.12：谢礼加对应主题材料
              let extra = '';
              const drop = App.challengeDropData(cid);
              if (drop.mat && drop.mat.length) {
                if (!pl.materials) pl.materials = {};
                const m = drop.mat[Math.floor(Math.random() * drop.mat.length)];
                pl.materials[m] = (pl.materials[m] || 0) + 1;
                extra += '· ' + STATE.matName(m) + ' ×1';
              }
              // V1.3.13/1.3.14：委托谢礼有概率附赠法阵（仅羽民）
              if (cid === 'ch_yumin_commoner' && Math.random() < 0.4) {
                const got = App.challengeGrantRandomEnchant(pl);
                if (got) extra += ' · 法阵【' + got.name + '】';
              }
              if (!prep.npcDone) prep.npcDone = {};
              prep.npcDone[spot.key] = true;
              Engine.log('你收下了' + spot.name + '的谢礼：' + matName + ' ×' + spot.rewardParts + '、金币 +' + spot.rewardGold + extra + '。', 'good');
            }, next: 'ch_region_' + cid + '_' + rid }] };
        }
        return { id: sceneId, title: '【' + spot.name + '】', bg, text: spot.text + '\n\n[highlight]他的请求[/highlight]：' + t.desc + '\n[highlight]当前进度[/highlight]：' + (t.type === 'wins' ? '已击败 ' + cur + '/' + t.need : '已收集 ' + cur + '/' + t.need) + '\n\n完成后再来找他，会有谢礼。', options: [back] };
      }

      // —— 锻造 / 核心强化（V1.3.13：四槽位格子化选择——武器/防具/流转装置/增幅装置）——
      if (sceneId === 'ch_forge') {
        const isRobot = cid === 'ch_xuanyuan_awaken';
        const actName = isRobot ? '核心改装' : '锻造';
        const forgeDesc = isRobot
          ? '你接上机械手臂，将收集的零件逐颗装进核心。武器模块、装甲模块、能源核心、超频器——每个槽位都有多种选择。'
          : '你抡起锤子，火星四溅。武器、防具、护心镜、本命灵器——四个槽位，皆可千锤百炼。';
        const slots = p.challengeSlots || {};
        const lvs = p.challengeGearLvs || {};
        const gears = App.challengeGearData(cid);
        const slotNames = { weapon: '武器', armor: '防具', flow: '流转装置', amp: '增幅装置' };
        const curTxt = ['weapon', 'armor', 'flow', 'amp'].map(slot => {
          const id = slots[slot];
          const g = id ? gears.find(x => x.id === id) : null;
          return g ? g.name + (lvs[id] > 1 ? ' Lv' + lvs[id] : '') : '（空）';
        }).join(' · ');
        const matName = App.challengeMatName(cid);
        const opts = [];
        opts.push({ label: '【当前】' + curTxt + ' · ' + matName + ' ' + App.challengeMatCount(p) + ' · 金币 ' + (p.gold || 0), tag: '状态', onChoose: () => {}, next: 'ch_forge' });
        opts.push({ label: '【选择装备】打开装备格子（' + Object.keys(slots).length + '/4 已装备）', tag: '装备', cls: 'btn-primary', onChoose: () => { App.openChallengeGearPanel(); }, next: 'ch_forge' });
        opts.push({ label: '【配装说明】' + (isRobot ? '火力模块/装甲/能源核心/超频器' : '武器/防具/护心镜/本命灵器') + ' 四槽位各选其一，装备自带技能自动装配', tag: '说明', onChoose: () => {}, next: 'ch_forge' });
        opts.push(back);
        return { id: sceneId, title: '【' + actName + '】', bg, text: forgeDesc + '\n\n战斗胜利、搜集、完成委托可获得' + matName + '；已装备的装备不可重复打造，可用' + matName + '强化升级（每级+25%）。', options: opts };
      }

      // —— 附魔法阵（V1.3.13/1.3.14：羽民专属变强路线——羽民无锻造/改装，法阵是其唯一装备位）
      //    获得法阵：探索奇遇/商人神秘货/隐藏任务；配置法阵：消耗风羽印记 ×1
      if (sceneId === 'ch_awaken') {
        const pool = p.challengeEnchantPool || [];
        const enchanted = p.challengeEnchants || [];
        const encData = App.challengeEnchantData();
        const matName = App.challengeMatName(cid);
        const matCount = App.challengeMatCount(p);
        const opts = [];
        opts.push({ label: '【风羽印记】' + matCount + ' 枚（配置法阵需消耗）· 法阵 已获 ' + pool.length + ' · 已配 ' + enchanted.length + '/4', tag: '状态', onChoose: () => {}, next: 'ch_awaken' });
        if (enchanted.length > 0) {
          opts.push({ label: '【当前】' + enchanted.map(id => (encData.find(e => e.id === id) || {}).name).filter(Boolean).join('、'), tag: '当前', onChoose: () => {}, next: 'ch_awaken' });
        }
        opts.push({ label: '【配置法阵】打开法阵格子（' + enchanted.length + '/4 已配置）', tag: '附魔', cls: 'btn-primary', onChoose: () => { App.openChallengeEnchantPanel(); }, next: 'ch_awaken' });
        opts.push({ label: '【说明】法阵在探索奇遇、商人神秘货、隐藏任务中获得；配置 1 个法阵消耗风羽印记 ×1；最多配置 4 个', tag: '说明', onChoose: () => {}, next: 'ch_awaken' });
        opts.push(back);
        return { id: sceneId, title: '【附魔法阵】', bg, text: '你盘坐于云顶，将风羽印记贴于眉心。先辈们的意识如潮水般涌来——\n\n羽翼不是打出来的，是醒过来的。每一枚印记，都是一缕先辈的执念与祝福；每一座法阵，都是一门可以传承的技艺。\n\n印记不足？去探索、战斗、委托、集市换取吧。', options: opts };
      }

      // —— 休息 / 维护 ——
      if (sceneId === 'ch_rest') {
        const cost = timeCost();
        if (p.shichen < cost) return { id: sceneId, title: '【休息】', bg, text: '时辰不足' + (cost > 1 ? '（逆风需' + cost + '时辰）' : '') + '，先【就寝】吧。', options: [back] };
        STATE.spendShichen(p, cost);
        const maxHp = STATE.calcMaxHp(p), maxMp = STATE.calcMaxMp(p);
        p.hp = maxHp; p.mp = maxMp;
        const act = cid === 'ch_xuanyuan_awaken' ? '你拧开检修面板，将每一处松动重新拧紧。' : '你包扎伤口，喝下一口热汤，精神一振。';
        return { id: sceneId, title: cid === 'ch_xuanyuan_awaken' ? '【维护】' : '【休息】', bg, text: act + '\n\n状态尽复（气血 ' + p.hp + '/' + maxHp + ' · 灵力 ' + p.mp + '/' + maxMp + '）。', options: [back] };
      }

      // —— 任务清单 ——
      if (sceneId === 'ch_tasks') {
        const goal = App.challengeGoal(cid);
        const prog = App.challengeTaskProgress(p, goal);
        const lines = prog.map(t => (t.done ? '✓' : '○') + ' ' + t.label + (t.done ? '（已完成）' : '（' + t.cur + '/' + t.need + '）')).join('\n');
        const hint = App.challengeNextHint(p, goal);
        return { id: sceneId, title: '【试炼任务】', bg, text: '[highlight]限时[/highlight]：' + (goal ? '剩余 ' + Math.max(0, goal.days - (p.day || 1) + 1) + ' 天（共 ' + goal.days + ' 天）' : '') + '\n\n[highlight]任务清单[/highlight]\n' + lines + '\n\n[highlight]下一步[/highlight]\n' + hint, options: [back] };
      }

      // —— 就寝（推进天数 + 限时失败判定 + 暗月侵蚀）——
      if (sceneId === 'ch_sleep') {
        const goalNow = App.challengeGoal(cid);
        return { id: sceneId, title: '【就寝】', bg, text: '你合上眼。风声、齿轮声、远处的叫嚷，都渐渐远了。\n\n（就寝推进一天：' + (goalNow ? '限时剩余 ' + Math.max(0, goalNow.days - (p.day || 1) + 1) + ' 天' : '') + '）',
          options: [{ label: '【就寝】休整一夜', tag: '天数', onChoose: (pl) => {
            STATE.newDay(pl);
            let msg = '第 ' + pl.day + ' 天。';
            if (cid === 'ch_xuanyuan_awaken') {
              const maxMp = STATE.calcMaxMp(pl);
              pl.mp = Math.max(1, Math.floor((pl.mp || maxMp) * 0.92));
              msg += '\n暗月侵蚀蚕食着你的核心，灵力流失了些许……';
            }
            Engine.log(msg, 'system');
            const goalNow = App.challengeGoal(cid);
            if (goalNow && goalNow.days && pl.day > goalNow.days) {
              Engine.log('期限已至，你的试炼就此落幕……', 'evil');
              App.goto('challenge_fail');
              return;
            }
            if (App.challengeTasksDone(pl, goalNow)) Engine.log('所有试炼任务均已完成！前往营地【决战】击败最终 Boss 即可通关。', 'gold');
            // V1.3.10：就寝刷新"今日试炼"目标
            delete prep.daily;
            // V1.3.18：就寝推进天数后自动存档（新的一天关键进度）
            App.challengeAutosave(true);
          }, next: camp }] };
      }

      // —— 今日试炼（对应剧情家园"今日事务"，每日目标刷新 + 领奖）——
      if (sceneId === 'ch_daily') {
        let daily = prep.daily;
        if (!daily || daily.day !== p.day) {
          // 新的一天：按当天进度生成今日目标（尽量选择尚未达成的方向）
          const types = [];
          if ((prep.wins || 0) < (App.challengeGoal(cid) ? App.challengeGoal(cid).tasks.find(t => t.key === 'wins') ? App.challengeGoal(cid).tasks.find(t => t.key === 'wins').need : 5 : 5)) types.push('battle');
          if ((prep.materials || 0) < (App.challengeGoal(cid) ? App.challengeGoal(cid).tasks.find(t => t.key === 'materials') ? App.challengeGoal(cid).tasks.find(t => t.key === 'materials').need : 8 : 8)) types.push('collect');
          if (types.length === 0) types.push('battle', 'collect');
          const type = types[Math.floor(Math.random() * types.length)];
          const need = 2;
          daily = prep.daily = { day: p.day, type, need: need, cur: 0, claimed: false };
          if (type === 'battle') daily.cur = Math.min((prep.wins || 0), need);
          else daily.cur = Math.min((prep.materials || 0), need);
        }
        const dName = daily.type === 'battle' ? '击败 2 名敌人' : '搜集 2 次' + App.challengeMatName(cid);
        const progStr = daily.claimed ? '（已领取）' : (daily.cur + '/' + daily.need + (daily.cur >= daily.need ? ' ✓可领取' : ''));
        const opts = [];
        opts.push({ label: '【今日】' + dName + ' · ' + progStr, tag: '目标', onChoose: () => {}, next: 'ch_daily' });
        if (daily.cur >= daily.need && !daily.claimed) {
          const matName = App.challengeMatName(cid);
          opts.push({ label: '【领奖】达成今日试炼！领取' + matName + '与金币', tag: '奖励', onChoose: (pl) => {
            daily.claimed = true;
            App.challengeMatDelta(pl, 3);
            pl.gold = (pl.gold || 0) + 60;
            pl.realm.exp = (pl.realm.exp || 0) + 120;
            if (levelUp(pl)) Engine.log('修为精进，等级提升至 Lv' + pl.lv + '！', 'good');
            Engine.log('今日试炼达成！' + matName + ' +3 · 金币 +60 · 修为 +120。', 'gold');
          }, next: 'ch_daily' });
        }
        opts.push(back);
        return { id: sceneId, title: '【今日试炼】', bg, text: '每天给自己定一个小目标，积少成多，也是一种修行。\n\n[highlight]今日目标[/highlight]：' + dName + '（' + progStr + '）\n\n今日目标每日就寝后刷新。', options: opts };
      }

      // —— 补给（对应剧情家园"集市"，主题化商店）——
      if (sceneId === 'ch_store') {
        const storeName = cid === 'ch_xuanyuan_awaken' ? '回收站' : (cid === 'ch_yumin_commoner' ? '云上市集' : '铁匠铺');
        const storeDesc = cid === 'ch_xuanyuan_awaken'
          ? '一台锈迹斑斑的自动回收机，投金币进去，吐出一堆核心碎片。'
          : '货架上摆着瓶瓶罐罐，店主眯着眼看你掏钱。';
        const matName = App.challengeMatName(cid);
        const opts = [];
        opts.push({ label: '【身家】金币 ' + (p.gold || 0) + ' · ' + matName + ' ' + App.challengeMatCount(p) + ' · 物资 ' + (prep.materials || 0), tag: '状态', onChoose: () => {}, next: 'ch_store' });
        // 买变强材料
        opts.push({ label: '【采买】花 40 金币买 2 份' + matName, tag: '交易', onChoose: (pl) => {
          if ((pl.gold || 0) < 40) { Engine.log('金币不足。', 'evil'); return; }
          pl.gold -= 40; App.challengeMatDelta(pl, 2);
          Engine.log('你买下 2 份' + matName + '（金币 -40）。', 'good');
        }, next: 'ch_store' });
        // 卖变强材料
        opts.push({ label: '【变卖】卖 1 份' + matName + '换 15 金币', tag: '交易', onChoose: (pl) => {
          if (App.challengeMatCount(pl) < 1) { Engine.log('没有' + matName + '可卖。', 'evil'); return; }
          App.challengeMatDelta(pl, -1);
          pl.gold = (pl.gold || 0) + 15;
          Engine.log('你卖掉 1 份' + matName + '，金币 +15。', 'good');
        }, next: 'ch_store' });
        // 买物资（补探索物资任务）
        opts.push({ label: '【采买】花 30 金币买 1 份物资（计入试炼收集）', tag: '交易', onChoose: (pl) => {
          if ((pl.gold || 0) < 30) { Engine.log('金币不足。', 'evil'); return; }
          pl.gold -= 30; prep.materials = (prep.materials || 0) + 1;
          const mats = ['MAT-C01', 'MAT-C02', 'MAT-E09', 'MAT-JG01', 'MAT-FS02'];
          const m = mats[Math.floor(Math.random() * mats.length)];
          if (!pl.materials) pl.materials = {};
          pl.materials[m] = (pl.materials[m] || 0) + 1;
          Engine.log('你买下一份' + STATE.matName(m) + '（金币 -30，物资 +1）。', 'good');
        }, next: 'ch_store' });
        opts.push(back);
        return { id: sceneId, title: '【补给 · ' + storeName + '】', bg, text: storeDesc + '\n\n' + matName + '用于营地锻造/强化，物资计入试炼收集任务。', options: opts };
      }

      // —— 情报（新探索性：花金币换线索）——
      if (sceneId === 'ch_intel') {
        const intelName = cid === 'ch_xuanyuan_awaken' ? '数据库' : '茶棚';
        const intelDesc = cid === 'ch_xuanyuan_awaken'
          ? '你接入一段残存的数据库，检索着被删改的记录。'
          : '茶棚里三教九流皆有，消息灵通得很——只要你付得起茶钱。';
        const cost = 40;
        const opts = [];
        opts.push({ label: '【打听】花 ' + cost + ' 金币打听当下该做什么', tag: '情报', onChoose: (pl) => {
          if ((pl.gold || 0) < cost) { Engine.log('你掏了掏口袋，一文钱都没有。', 'evil'); return; }
          pl.gold -= cost;
          const goal = App.challengeGoal(cid);
          const hint = App.challengeNextHint(p, goal);
          Engine.log('你花 ' + cost + ' 金币打听来一条消息：「' + hint + '」', 'gold');
          // 概率额外揭示线索
          if (Math.random() < 0.4) {
            const bonus = cid === 'ch_xuanyuan_awaken' ? '情报里还夹着一张便签：「七号，档案室的第七个抽屉，锁是坏的。」' : '那人压低声音又补了一句：「北边那个坊市，听说夜里有人在搬东西。」';
            Engine.log(bonus, 'react');
          }
        }, next: 'ch_intel' });
        opts.push(back);
        return { id: sceneId, title: '【情报 · ' + intelName + '】', bg, text: intelDesc + '\n\n打听消息能让你明白下一步该做什么；有时还会打听到额外的秘密。', options: opts };
      }

      // —— 绘卷（对应剧情家园"山海绘卷"，查看全局收藏）——
      if (sceneId === 'ch_tome') {
        return { id: sceneId, title: '【山海绘卷】', bg, text: '你翻开水墨长卷，山海众生、灵材百草、奇人异事皆入卷中。\n\n（点击按钮打开全局图鉴）',
          options: [
            { label: '【打开图鉴】', tag: '绘卷', onChoose: (pl) => { try { App.openTome('overview'); } catch (e) { Engine.log('绘卷尚未展开。', 'evil'); } }, next: 'ch_tome' },
            back
          ] };
      }

      // —— 存档（V1.3.18：挑战智能存档——空闲槽/我的挑战存档直接覆盖，否则弹窗选择）——
      if (sceneId === 'ch_save') {
        return { id: sceneId, title: '【存档】', bg, text: '择一座山门静坐，将近日见闻记入玉简。',
          options: [
            { label: '【存档】保存当前挑战进度', tag: '系统', onChoose: (pl) => {
              App.saveChallengeManual(pl);
            }, next: 'ch_save' },
            back
          ] };
      }

      return null;
    },

    /* ============== 家园系统（常驻·可随时返回/复活/提升实力） ============== */
    buildHomeScene() {
      const p = App.player;
      if (!p) return { id:'home', title:'家园', bg:'assets/img/scenes/home-cave.jpg', text:'尚无角色。', options: [{ label:'重新开始', next:'title' }] };
      const maxHp = STATE.calcMaxHp(p);
      const maxMp = STATE.calcMaxMp(p);
      const realm = (p.realm && p.realm.name) || '凡体';   // V1.3.20：空值防御
      const bt = STATE.canBreakthrough(p);
      const hpBar = '█'.repeat(Math.max(0, Math.round(p.hp / maxHp * 12))).padEnd(12, '░');
      const mpBar = '█'.repeat(Math.max(0, Math.round(p.mp / maxMp * 12))).padEnd(12, '░');
      const inv = Object.keys(p.materials || {}).map(k => STATE.matName(k) + '×' + p.materials[k]).join(' ') || '（空空如也）';
      const petInfo = p.pets && p.pets.length
        ? p.pets.map(pt => {
            const evoName = (pt.evoLine && pt.evoLine[pt.evoStage]) || pt.name;   // V1.3.20：旧档防御
            return pt.name + '（' + pt.quality + '·' + evoName + ' Lv' + pt.level + '）';
          }).join('、')
        : '（尚无灵宠）';
      const gold = p.gold || 0;

      // 伏魔窟开启状态（每6天开启一次）
      const fumoCd = STATE.fumoStatus(p);

      // 当前指引（v1.3.8 剧情指引增强：家园文本直接给出下一步该做什么）
      let guideLine = '';
      try {
        const g = STATE.getQuestGuide(p);
        if (g && g.primary && g.primary.text) guideLine = g.primary.text;
      } catch (e) {}
      const text =
`【洞天福地 · 你的家园】
山门幽静，灵圃飘香。此处可静心修持、调养伤势、培育灵宠、探索秘境。

[highlight]当前指引[/highlight]
${guideLine || '前往【探索】游历二十国，推进主线剧情；或先在家园修炼提升。'}${App.tutorialHint(p)}

[highlight]当前状态[/highlight]
境界：${realm} · Lv${p.lv}
修为：${(p.realm && p.realm.exp) || 0}/${(p.realm && p.realm.expMax) || 100}
气血：${hpBar} ${p.hp}/${maxHp}
灵力：${mpBar} ${p.mp}/${maxMp}
金币：${gold} · 今日时辰：${p.shichen}/${p.shichenMax}
修行第 ${p.day} 天

[highlight]灵宠[/highlight]：${petInfo}
[highlight]灵材[/highlight]：${inv}
[highlight]伏魔窟[/highlight]：${fumoCd.open ? '已开启（可进入）' : '（每6天开启，下次第' + fumoCd.nextDay + '天）'}
${bt && bt.can ? '[highlight]← 境界可突破！[/highlight]' : (bt ? '（需 Lv' + bt.need + ' 突破' + bt.next.name + '）' : '')}`;

      const opts = [];
      // 调息疗伤：消耗1时辰回满血蓝
      if (p.hp < maxHp || p.mp < maxMp) {
        opts.push({ label: '【调息疗伤】恢复满状态（耗1时辰）', tag: '恢复', cost: ['耗时辰×1'], onChoose: (pl) => {
          if (pl.shichen > 0) { STATE.rest(pl); Engine.log('你调息片刻，伤势尽复。', 'good'); }
          else { Engine.log('时辰已尽，且先就寝吧。', 'evil'); }
        }, next: 'home' });
      } else {
        opts.push({ label: '【调息】已满状态（耗1时辰）', tag: '恢复', cost: ['耗时辰×1'], onChoose: (pl) => {
          if (pl.shichen > 0) { STATE.rest(pl); Engine.log('你调息凝神，精神焕发。', 'good'); }
          else { Engine.log('时辰已尽，且先就寝吧。', 'evil'); }
        }, next: 'home' });
      }
      // 就寝：时辰耗尽或主动休息，进入新一天（家园就寝回家园）
      opts.push({ label: p.shichen <= 0 ? '【就寝】时辰已尽，休憩一夜' : '【就寝】休憩一夜（进入新一天）', tag: '恢复', cost: ['进入新一天'], next: 'home_sleep' });
      // 今日事务（每日目标 + 委托板 合版；红点提示可领取数量）
      const dailyP = STATE.getDailyProgress(p);
      const dailyReady = dailyP.filter(g => g.done && !g.got).length;
      const commReady = STATE.getCommissions(p).list.filter(c => c.has && !c.done).length;
      const dailyRed = dailyReady + commReady;
      opts.push({ label: dailyRed > 0 ? `【今日事务】每日目标 · 委托板（${dailyRed}项可领）` : '【今日事务】每日目标 · 委托板', tag: '日常', next: 'home_daily' });
      opts.push({ label: '【修炼】打坐运转周天（耗1时辰·修为）', tag: '变强', cost: ['耗时辰×1'], next: 'home_cultivate' });
      if (bt && bt.can) opts.push({ label: '【突破】冲击' + bt.next.name + '（心魔试炼）', tag: '境界', cost: ['需修为圆满'], next: 'home_break' });
      else opts.push({ label: '【突破】冲击更高境界（需 Lv' + (bt ? bt.need : '?') + '）', tag: '境界', cost: ['需修为圆满'], onChoose: () => { Engine.log('修为未满或等级不足，暂时无法突破。先去【修炼】提升吧。', 'evil'); }, next: 'home' });
      opts.push({ label: '【探险】游历荒原（获灵材·遇机缘）', tag: '探索', cost: ['耗时辰×1'], next: 'home_explore' });
      opts.push({ label: '【集市】买卖灵材（每日随机价）', tag: '交易', next: 'home_market' });
      opts.push({ label: '【供奉】礼拜神明（获加持）', tag: '供奉', cost: ['耗时辰×1'], next: 'home_offer' });
      opts.push({ label: '【种植】打理灵圃', tag: '种植', cost: ['耗时辰×1'], next: 'home_plant' });
      opts.push({ label: '【绘卷】山海绘卷·收集图鉴', tag: '图鉴', onChoose: (pl) => { App.openTome('overview'); }, next: 'home' });
      opts.push(fumoCd.open
        ? { label: '【伏魔窟】闯魔窟寻宝（已开启）', tag: '伏魔', cost: ['逐层消耗时辰'], next: 'home_fumo' }
        : { label: '【伏魔窟】未开启（每6天开启）', tag: '伏魔', cost: ['未开启'], onChoose: () => { Engine.log('伏魔窟尚未开启，第 ' + fumoCd.nextDay + ' 天再来吧。', 'evil'); }, next: 'home' });
      // V1.3.19/20：每日试炼塔（90层·每层对应等级·每日限一次）
      try {
        const tw = p.tower || null;
        const towerReady = !tw || tw.day !== p.day || !tw.done;
        opts.push({ label: towerReady ? '【试炼塔】每日闯塔（' + App.TOWER_MAX + '层·逐层对应等级）' : '【试炼塔】今日已通关（明日再来）', tag: '试炼', cost: towerReady ? ['每日限1次', '逐层挑战'] : ['今日已毕'], next: 'home_tower' });
      } catch (e) {}
      opts.push({ label: '【宠物】培育·出战·进化', tag: '御灵', cost: ['耗时辰×1'], next: 'home_pet' });
      opts.push({ label: '【职业】查看·转职', tag: '职业', cost: ['耗时辰×1'], next: 'home_profession' });
      opts.push({ label: '【炼丹】以灵材炼丹', tag: '丹道', cost: ['耗时辰×1', '需灵材'], onChoose: (pl) => { App.openRefineModal(pl); }, next: 'home' });
      // 角色专属任务（固定命格角色专属，无时间限制）
      if (p.charId) {
        const ch = global.getChar ? global.getChar(p.charId) : null;
        if (ch && ch.quest) {
          const done = !!(p.charQuests && p.charQuests[ch.quest.id]);
          opts.push({ label: done ? `【专属】${ch.quest.name}（已完成）` : `【专属】${ch.quest.name}`, tag: '支线', next: 'home_char_quest' });
        }
      }
      // 继续探险：玩家自行选择去处（打开山海舆图重新选国家），剧情进度保留在点触主线/currentScene
      // 「返回剧情」优先回到点触主线（若有进行中的点触主线），否则回文字场景
      let backTo = p.currentScene;
      let backBtn = null;
      if (p._inStory && p._inStory.nationId) {
        // 在点触主线中：返回该国完整探索屏（剧情 NPC 与全部 NPC 合一，进度由 _storyState 恢复）
        // 注意：不能用 next:'home'（会覆盖 onChoose 里的 enterExplore 跳转），用 next:null 停留在原处
        backBtn = { label: '【返回剧情】回到 ' + STATE.nationName(p._inStory.nationId) + ' 的剧情', tag: '主线', next: null, onChoose: (pl) => { if (typeof EXPLORE !== 'undefined' && EXPLORE[p._inStory.nationId]) App.enterExplore(p._inStory.nationId); else App.enterStory(p._inStory.nationId); } };
      } else if (p._battleBackStory && p._battleBackStory.nationId) {
        // 战斗回退点（点触主线 → 文字战斗 → 战败回家）：回到点触主线对应位置继续剧情
        const bbNation = p._battleBackStory.nationId;
        backBtn = { label: '【返回剧情】回到 ' + STATE.nationName(bbNation) + ' 的剧情（战斗中断处）', tag: '主线', next: null, onChoose: (pl) => { App.enterStory(bbNation); } };
      } else {
        if (!backTo || /^[a-z]+_free(_|$)/.test(backTo)
            || !(ALL_SCENES[backTo] || QINGQIU_SCENES[backTo])) {
          backTo = (p.nation === 'qingqiu' || !p.nation) ? 'q01_02_accept' : (p.nation + '_entry');
        }
        backBtn = { label: '【返回剧情】回到 ' + STATE.nationName(p.nation || 'qingqiu') + ' 继续上次进度', tag: '主线', next: backTo };
      }
      opts.push({ label: '【山海舆图】打开地图，选择要去的国家', tag: '探索', next: 'home_explore' });
      opts.push(backBtn);
      opts.push({ label: '【存档】保存进度', tag: '系统', onChoose: (pl) => { pl._tutorialSave = true; try { SAVE.autosave(pl); Engine.log('进度已保存（存档位 ' + (SAVE.activeSlot() + 1) + '）。', 'good'); Engine.toast('已保存', 'gold'); } catch (e) { Engine.log('保存失败：' + e.message, 'evil'); } }, next: 'home' });

      // 左侧属性面板 HTML（皇帝成长计划2式布局）
      const fame = STATE.fameInfo(p);
      const homeStats = `
        <div class="hs-block hs-hero">
          <div class="hs-name">${p.name || '求道者'}</div>
          <div class="hs-realm">${realm} · Lv${p.lv}</div>
          <div class="hs-day">修行第 ${p.day} 天</div>
          ${(p.round || 1) > 1 ? `<div class="hs-day" style="color:#d4a017;font-weight:700;">🔄 第 ${p.round} 周目 · 前世印记</div>` : ''}
          ${fame.lv > 0 ? `<div class="hs-day" style="color:#c8a050;font-weight:700;">🏛 名声：${fame.name}（通关${fame.cleared}国）</div>` : ''}
        </div>
        <div class="hs-block">
          <div class="hs-row"><span>修为</span><b>${p.realm.exp}/${p.realm.expMax}</b></div>
          <div class="hs-row"><span>气血</span><b>${Math.max(1, Math.min(p.hp, maxHp))}/${maxHp}</b></div>
          <div class="hs-row"><span>灵力</span><b>${Math.max(0, Math.min(p.mp, maxMp))}/${maxMp}</b></div>
          <div class="hs-row"><span>金币</span><b>${gold}</b></div>
          <div class="hs-row"><span>时辰</span><b>${p.shichen}/${p.shichenMax}</b></div>
        </div>
        <div class="hs-block">
          <div class="hs-row"><span>供奉</span><b>${p.offerGod ? (STATE.getGods()[p.offerGod] ? STATE.getGods()[p.offerGod].name : '') + ' ' + (p.offerValue||0) + '/1000' : '未供奉'}</b></div>
          <div class="hs-row"><span>伏魔窟</span><b>${fumoCd.open ? '已开启' : '第' + fumoCd.nextDay + '天'}</b></div>
          ${fame.discount > 0 ? `<div class="hs-row"><span>集市折扣</span><b>${Math.round(fame.discount * 100)}%</b></div>` : ''}
        </div>
        <div class="hs-block hs-tip">
          ${bt && bt.can ? '⚡ 境界可突破！' : (bt ? '突破需 Lv' + bt.need : '')}
        </div>`;

      return {
        id: 'home',
        title: '洞天福地',
        bg: 'assets/img/scenes/home-cave.jpg',
        desc: '山门幽静，灵圃飘香。此处可修持、调养、培育灵宠、探索秘境。',
        homeStats,
        options: opts
      };
    },

    /* ============== 家园·就寝（过一天） ============== */
    buildHomeSleep() {
      const p = App.player;
      if (!p) return { id:'home_sleep', title:'就寝', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      // 过一天
      const harvest = STATE.newDay(p);
      let msg = '你在洞府安然入睡，一觉醒来已是新的一天。';
      if (harvest && harvest.ready && harvest.ready.length) {
        msg += '\n[highlight]灵圃[/highlight]：' + harvest.ready.join('、') + ' 已成熟，记得去【种植】打理收获。';
      } else if (harvest && harvest.grown && harvest.grown.length) {
        msg += '\n灵圃中的 ' + harvest.grown.join('、') + ' 长势喜人。';
      }
      // 名声联动：山海传奇（通关≥18国）每日受四方商旅供奉传说灵香
      const fameNow = STATE.fameInfo(p);
      if (fameNow.tribute) {
        STATE.addMaterial(p, fameNow.tribute.id, fameNow.tribute.n);
        msg += '\n[highlight]四海供奉[/highlight]：你名震山海，各方势力差人送上【' + STATE.matName(fameNow.tribute.id) + '】×' + fameNow.tribute.n + '！';
      }
      return {
        id: 'home_sleep', title:'【就寝】', bg:'assets/img/nations/lingpu-home.jpg',
        text: msg + '\n\n当前：第 ' + p.day + ' 天 · 时辰 ' + p.shichen + '/' + p.shichenMax,
        options: [{ label:'起身，返回家园', next:'home' }]
      };
    },

    /* ============== 每日试炼塔（V1.3.20：按等级上限90层，每层对应等级，每日限一次） ============== */
    TOWER_MAX: 90,   // 与角色等级上限（飞升 90 级）一致：第 N 层对应等级 N
    towerBuffData() {
      return [
        { id:'tw_atk',  name:'锋锐', desc:'攻击 +15%', key:'atk', val:0.15, icon:'⚔️' },
        { id:'tw_def',  name:'磐石', desc:'防御 +15%', key:'def', val:0.15, icon:'🛡️' },
        { id:'tw_hp',   name:'生机', desc:'生命上限 +15%', key:'hp', val:0.15, icon:'❤️' },
        { id:'tw_leech',name:'嗜血', desc:'吸血 +15%', key:'leech', val:0.15, icon:'🩸' },
        { id:'tw_mp',   name:'灵泉', desc:'每回合回蓝 +20', key:'mp', val:20, icon:'💧' },
        { id:'tw_crit', name:'破晓', desc:'暴击 +10%', key:'crit', val:0.10, icon:'✨' }
      ];
    },
    applyTowerBuffs(p) {
      if (!p) return;
      p._towerBuffAtk = 0; p._towerBuffDef = 0; p._towerBuffHp = 0;
      p._towerBuffLeech = 0; p._towerBuffMp = 0; p._towerBuffCrit = 0;
      if (!p.tower || !p.tower.buffs) return;
      const map = { atk:'_towerBuffAtk', def:'_towerBuffDef', hp:'_towerBuffHp', leech:'_towerBuffLeech', mp:'_towerBuffMp', crit:'_towerBuffCrit' };
      p.tower.buffs.forEach(id => {
        const b = App.towerBuffData().find(x => x.id === id);
        if (b) p[map[b.key]] = (p[map[b.key]] || 0) + b.val;
      });
    },
    // V1.3.20：第 N 层敌人等级 = N（1~90 与角色等级一一对应），属性按等级标准成长曲线生成
    towerEnemy(p, floor) {
      const POOL = [
        { name:'试炼木人', el:'木', hp:1.00, atk:1.00, def:1.00 },
        { name:'试炼铜傀', el:'土', hp:1.25, atk:0.95, def:1.30 },
        { name:'试炼雷灵', el:'雷', hp:0.95, atk:1.20, def:0.95 },
        { name:'试炼炎灵', el:'火', hp:0.90, atk:1.25, def:0.90 },
        { name:'试炼水灵', el:'水', hp:1.15, atk:1.00, def:1.10 },
        { name:'试炼影魅', el:'影', hp:1.20, atk:1.10, def:1.00 },
        { name:'试炼金甲卫', el:'金', hp:1.30, atk:0.95, def:1.35 },
        { name:'试炼风刃', el:'风', hp:0.85, atk:1.35, def:0.80 },
        { name:'试炼魂影', el:'魂', hp:1.20, atk:1.15, def:1.05 }
      ];
      const MAX = App.TOWER_MAX;
      const isBoss = (floor % 5 === 0);
      const lv = Math.max(1, Math.min(MAX, floor));   // 层数 = 敌人等级
      const base = isBoss
        ? (floor >= MAX
          ? { name:'塔主·山海真君', el:'魂', hp:1.6, atk:1.15, def:1.2 }
          : { name:'塔守·四方镇', el:'土', hp:1.4, atk:1.1, def:1.15 })
        : RNG.pick(POOL);
      // 等级标准属性（与玩家成长曲线同源：90级基准约 940 血 / 130 攻 / 55 防）
      const hpBase  = Math.floor((30 + lv * 6) * (1 + 0.1 * (lv - 1)) * base.hp);
      const atkBase = Math.floor((12 + lv * 1.3) * (1 + 0.05 * (lv - 1)) * base.atk);
      const defBase = Math.floor((5 + lv * 0.6) * (1 + 0.05 * (lv - 1)) * base.def);
      return { name: base.name, hp: hpBase, atk: atkBase, def: defBase, lv, element: base.el, bg: 'assets/img/nations/qing-fying-boss.jpg', isTower: true };
    },
    buildHomeTower() {
      const p = App.player;
      const bg = 'assets/img/nations/yum-qiongding.jpg';
      if (!p) return { id:'home_tower', title:'试炼塔', bg, text:'无角色。', options:[{ label:'返回家园', next:'home' }] };
      // V1.3.20：每日重置（只有跨天或首次进入才重建；当天 done=true 绝不重置，修复"通关后还能再进"）
      if (!p.tower || p.tower.day !== p.day) {
        p.tower = { day: p.day, floor: 1, buffs: [], cleared: 0, done: false };
      }
      App.applyTowerBuffs(p);
      const tw = p.tower;
      if (tw.done) {
        return { id:'home_tower', title:'【试炼塔】', bg, text:'今日试炼已通关（或已结算）！\n\n明日再来，挑战更高的层数。', options:[{ label:'返回家园', next:'home' }] };
      }
      const buffTxt = tw.buffs.length
        ? tw.buffs.map(id => { const b = App.towerBuffData().find(x => x.id === id); return b ? b.icon + b.name : id; }).join(' · ')
        : '（无）';
      const MAX = App.TOWER_MAX;
      const nextE = App.towerEnemy(p, tw.floor);
      const opts = [];
      if (tw.floor <= MAX) {
        opts.push({ label: '【挑战第 ' + tw.floor + ' 层】' + (tw.floor % 5 === 0 ? '迎战 BOSS！' : '迎战守塔者'), tag: '挑战', cost: ['战败可重试'], onChoose: (pl) => { App.goto('home_tower_battle'); }, next: null });
      }
      if ((tw.cleared || 0) > 0) opts.push({ label: '【结算】按已通关 ' + tw.cleared + ' 层领取奖励', tag: '结算', onChoose: (pl) => { App.goto('home_tower_end'); }, next: null });
      opts.push({ label: '【返回家园】', tag: '返回', next: 'home' });
      return {
        id: 'home_tower', title: '【试炼塔】', bg,
        text: '每日限一次的试炼之塔：共 ' + MAX + ' 层，第 N 层对应等级 N，守塔者逐层变强，每层通关可挑选一道试炼祝福。\n\n当前：第 ' + tw.floor + ' / ' + MAX + ' 层 · 已通关 ' + (tw.cleared || 0) + ' 层\n[highlight]试炼祝福[/highlight]：' + buffTxt + '\n\n下一层守塔者：' + nextE.name + '（' + nextE.element + ' · 等级 ' + nextE.lv + '）',
        options: opts
      };
    },
    buildHomeTowerBattle() {
      const p = App.player;
      const bg = 'assets/img/nations/qing-fying-boss.jpg';
      if (!p || !p.tower || p.tower.done) return { id:'home_tower_battle', title:'试炼塔', bg, text:'无进行中的试炼。', options:[{ label:'返回家园', next:'home' }] };
      const floor = p.tower.floor;
      App.applyTowerBuffs(p);
      return {
        id: 'home_tower_battle', title: '【试炼塔 · 第 ' + floor + ' 层】', bg,
        text: '你踏入塔中，守塔者迎面而来……',
        options: [],
        battle: {
          isWild: true,   // 试炼塔敌人已按层数缩放，不受主线 Boss 强化系数影响
          enemy: App.towerEnemy(p, floor),
          after: 'home',
          onWin: (pl) => {
            const tw = pl.tower || (pl.tower = { day: pl.day, floor: 1, buffs: [], cleared: 0, done: false });
            const f = tw.floor || 1;
            tw.cleared = Math.max(tw.cleared || 0, f);
            const gold = 30 + f * 15;
            pl.gold = (pl.gold || 0) + gold;
            const matN = (f % 3 === 0) ? 2 : 1;
            const matId = RNG.pick(['MAT-C01','MAT-C02','MAT-E02','MAT-E09','MAT-E17']);
            STATE.addMaterial(pl, matId, matN);
            Engine.log('通关第 ' + f + ' 层！金币 +' + gold + ' · ' + STATE.matName(matId) + ' ×' + matN, 'gold');
            if (f >= App.TOWER_MAX) { tw.done = true; tw.buffs = []; return 'home_tower_end'; }   // 顶层通关
            tw.floor = f + 1;
            if (tw.floor % 5 === 0) Engine.log('下一层是 BOSS 层，做好准备！', 'evil');
            return 'home_tower_choice';
          },
          onLose: (pl) => {
            Engine.log('你被守塔者击退……先回家园休整，可再进塔从本层重试。', 'evil');
          }
        }
      };
    },
    buildHomeTowerChoice() {
      const p = App.player;
      const bg = 'assets/img/nations/yum-qiongding.jpg';
      if (!p || !p.tower || p.tower.done) return { id:'home_tower_choice', title:'试炼塔', bg, text:'无进行中的试炼。', options:[{ label:'返回家园', next:'home' }] };
      const owned = p.tower.buffs || [];
      const avail = App.towerBuffData().filter(b => owned.indexOf(b.id) < 0);
      if (avail.length === 0) {
        return { id:'home_tower_choice', title:'【试炼祝福】', bg, text:'祝福已尽得，继续挑战！', options:[{ label:'继续下一层', next:'home_tower' }] };
      }
      const picks = [];
      const pool = avail.slice();
      while (picks.length < 3 && pool.length) {
        const i = RNG.intBetween(0, pool.length - 1);
        picks.push(pool.splice(i, 1)[0]);
      }
      return {
        id: 'home_tower_choice', title: '【试炼祝福】', bg,
        text: '你击退了守塔者！选择一道试炼祝福，助你更上层楼：',
        options: picks.map(b => ({
          label: '【' + b.name + '】' + b.desc, tag: '祝福',
          onChoose: (pl) => { if (!pl.tower.buffs) pl.tower.buffs = []; pl.tower.buffs.push(b.id); App.applyTowerBuffs(pl); Engine.log('获得试炼祝福【' + b.name + '】' + b.desc, 'gold'); App.goto('home_tower'); },
          next: null
        })).concat([{ label: '【放弃挑战】按已通关层数结算', tag: '结算', onChoose: (pl) => { App.goto('home_tower_end'); }, next: null }])
      };
    },
    buildHomeTowerEnd() {
      const p = App.player;
      const bg = 'assets/img/nations/yum-qiongding.jpg';
      if (!p) return { id:'home_tower_end', title:'试炼塔', bg, text:'无角色。', options:[{ label:'返回家园', next:'home' }] };
      const tw = p.tower || { day: p.day, floor: 1, buffs: [], cleared: 0, done: false };
      const cleared = tw.cleared || 0;
      const gold = cleared > 0 ? Math.floor(cleared * 30 + 15 * (cleared * (cleared + 1)) / 2) : 0;
      const msgs = ['本次试炼：共通关 ' + cleared + ' 层。'];
      if (cleared >= App.TOWER_MAX) msgs.push('九十层尽破，试炼塔主为你折服！');
      if (gold > 0) { p.gold = (p.gold || 0) + gold; msgs.push('金币 +' + gold); }
      if (cleared >= 4) { STATE.addMaterial(p, 'MAT-E17', 1); msgs.push('获得【' + STATE.matName('MAT-E17') + '】×1'); }
      if (cleared >= 8) { STATE.addMaterial(p, 'MAT-F03', 1); msgs.push('获得【' + STATE.matName('MAT-F03') + '】×1'); }
      tw.buffs = [];
      tw.done = true;
      App.applyTowerBuffs(p);
      return {
        id: 'home_tower_end', title: '【试炼结算】', bg,
        text: msgs.join('\n') + '\n\n试炼塔今日之行到此结束，明日再来。',
        options: [{ label: '返回家园', next: 'home' }]
      };
    },

    /* ============== 家园·角色专属任务 ============== */
    /**
     * 角色专属任务配置（数据驱动，差异化 + 图文穿插 + 变难）
     * 每个角色有独立的完成条件与专属剧情，杜绝"一刀切"。
     *
     * 字段说明：
     *   img      —— 角色立绘路径（图文穿插）
     *   intro    —— 进入任务时的剧情氛围文案（图文穿插，用 [img] 标记插图）
     *   goal     —— 完成条件描述
     *   needGood —— 需行善次数（白阶偏剧情，金阶偏战斗/变难）
     *   needMat  —— 需采集灵材数 + matId（各角色专属灵材不同）
     *   extra    —— 额外变难条件（如：需通过某场试炼、需在某国完成）
     */
    /* 每个角色的专属剧情线（多阶段引擎）
     * stage 类型：
     *   collect  采集灵材 N 份
     *   good     行善 N 次（可跨阶段累计）
     *   refine   持有/炼制特定丹药（药婆疑难杂症：需草药+丹药）
     *   repair   修械玩法（莫开：消耗零件修机关人，累计修复 N 台）
     *   fish     捕鱼小游戏（苏苏：捕到 N 条）
     *   rescue   捕鱼中救助落水孩子 N 个（苏苏）
     *   battle   天级专属战斗（野火/青瓷）
     *   story    纯剧情（自动推进）
     */
    CHAR_QUEST_LINES: {
      /* ============ 黄级 · 图文剧情线 ============ */
      c_huang_shiman: {
        name: '桃林回响',
        bg: 'assets/img/nations/qing-taolin.jpg',
        stages: [
          { id: 0, title: '一 · 旧粥香', type: 'collect', matId: 'MAT-C01', matName: '朱果', need: 2,
            text: '[img]assets/img/char/c_huang_shiman.jpg[/img]\n\n石小满蜷在灵圃的草铺上，梦里是满村的炊烟。他是村里人一口粥一床被养大的孤儿，那一年灾荒，全村人把仅剩的米留给了他，自己喝稀水。\n\n醒来时，窗外的桃林正落着细雪似的花瓣。他摸了摸怀里那粒褪色的桃核——是当年老村长塞给他的，说「这是咱村的根」。\n\n[highlight]「我这条命，是村里人给的。能多救一个，就赚了一个。」[/highlight]\n\n他背起药篓，决定从最平常的事做起：去桃林深处，采些朱果，分给村里咳嗽的老人。',
            goal: '采集朱果 ' + 2 + ' 份，分给村中咳嗽的老人' },
          { id: 1, title: '二 · 夜咳惊梦', type: 'good', need: 3,
            text: '朱果入手，石小满连夜给老村长送去。老人握着朱果，忽然老泪纵横：「你爹当年，也是这么把全村人救过来的……」\n\n那一夜，石小满又听见了村东头传来的咳嗽声。一声接一声，像是把人的心肺都要咳出来。\n\n他披衣起身，挨家挨户地走。谁家柴堆塌了，他帮着垒；谁家水缸空了，他帮着挑；谁家的孩子烧得迷糊，他翻山去采药。\n\n[highlight]「我不懂什么大道。我只知道，人活着，就该给身边人搭把手。」[/highlight]',
            goal: '行善 ' + 3 + ' 次（扶危济困，暖遍桃林）' },
          { id: 2, title: '三 · 桃林里的旧债', type: 'interact', need: 1, targetName: '躲债的猎户',
            extraMat: 'MAT-C02',
            text: '[img]assets/img/char/c_huang_shiman.jpg[/img]\n\n桃林深处，石小满撞见一个蹲在树后发抖的猎户。他认出来——是前年灾荒时借了村里粮、却一直没还上的老陈。\n\n「小满……别、别告诉村里人我回来了。」老陈满脸愧色，「我这两年在外头，一个子儿没攒下，还不起啊。」\n\n石小满沉默了一会儿。村东头的王婶前些日子还念叨：「老陈要是在，他那把好弓，能救咱村多少忙。」\n\n[highlight]你如何对待这个躲了两年债的故人？[/highlight]',
            choices: [
              { label: '「回来就好。村里人不记这个，你先回家看看你娘。」', tag: '宽恕', key: 'goal', feedback: '老陈怔住，随即嚎啕大哭。', good: true },
              { label: '「欠的粮不还，你叫我怎么跟村里交代？」', tag: '耿直', feedback: '老陈低下头，攥紧了拳。', good: true },
              { label: '「帮我采三天药，粮债一笔勾销。」', tag: '公道', feedback: '老陈眼睛一亮：「成！我别的没有，一身力气！」', good: true }
            ],
            progressLog: '与故人解开心结（1/1）',
            goal: '宽宥或讨还，都是为人处世的一课' },
          { id: 3, title: '四 · 心火不熄', type: 'story',
            text: '[img]assets/img/char/c_huang_shiman.jpg[/img]\n\n第七日，石小满做了一个梦。梦里没有桃林，没有村落，只有一片灰烬，和灰烬中央一粒微微发光的桃核。\n\n他醒来，手心滚烫。那粒老村长给的桃核，不知何时裂开了一道缝，里面透出一丝青涩的光。\n\n窗外，朝阳正从桃林升起。石小满把桃核贴身收好，背起药篓，踏上了出村的路。\n\n[highlight]「爹，娘，老村长……我把你们的火，带出这片山。」[/highlight]\n\n山外有山，人间有人。他要把这一粒心火，传得更远。',
            goal: '心火已燃，出山传火' }
        ]
      },
      c_huang_axiu: {
        name: '无翼之羽',
        bg: 'assets/img/nations/yum-tianyu-city.jpg',
        stages: [
          { id: 0, title: '一 · 地上的天空', type: 'collect', matId: 'MAT-FS04', matName: '风隼羽', need: 2,
            text: '[img]assets/img/char/c_huang_axiu.jpg[/img]\n\n羽民国的孩童长到七岁，便能振翅试飞。唯有阿秀，出生便没有翼骨。族人们掠过云端时，她只能坐在檐角，看风把她们的羽衣吹成一片云。\n\n「没有翅膀的羽民，算羽民么？」她曾这样问师父。师父把一根褪落的旧羽塞进她手里：「你有一双更难得的东西——手。手能织出翅膀织不出的东西。」\n\n阿秀的手指在织机上翻飞，织出第一件羽衣。她决定：要为所有飞不起来的人，织一件能挡住风雪的衣裳。',
            goal: '采集风隼羽 ' + 2 + ' 份，为无翼者织衣' },
          { id: 1, title: '二 · 檐下的小客人', type: 'interact', need: 2, targetName: '冻僵的小地居',
            extraMat: 'MAT-C02',
            text: '[img]assets/img/char/c_huang_axiu.jpg[/img]\n\n冬夜渐深，城门檐下蜷着一个小小的身影——是个瘦弱的地居孩子，冻得嘴唇发紫，怯怯地望着阿秀手中暖融融的羽衣。\n\n阿秀放下针线，走了过去。孩子往墙角缩了缩：「我、我不是来偷东西的……我就想……暖和一下。」\n\n她蹲下身，把半件未完成的羽衣披在孩子肩上：「暖和吗？」\n\n孩子攥着羽衣的边角，眼眶一下子就红了。\n\n[highlight]你会怎么对这个小客人说？[/highlight]',
            choices: [
              { label: '「暖和就好。明晚还冷，就再来。」', tag: '温柔', key: 'goal', feedback: '孩子用力点头，把羽衣裹得紧紧的。', good: true },
              { label: '「喏，这块料子给你，回家让娘给你缝。」', tag: '慷慨', key: 'goal', feedback: '孩子捧着料子，一步三回头地走了，眼里亮晶晶的。', good: true },
              { label: '「别怕。有我在，冻不着你。」', tag: '坚定', feedback: '孩子仰头看你，第一次露出一个怯怯的笑。', good: true },
              { label: '（默默把羽衣都给了孩子，自己抱紧双臂）', tag: '无声', feedback: '你什么都没说，孩子却什么都懂了。', good: true }
            ],
            progressLog: '檐下的小客人更暖和一些（2/2）',
            goal: '与冻僵的小地居交谈（2 次），暖透一颗心' },
          { id: 2, title: '三 · 城门一夜', type: 'good', need: 3,
            text: '[img]assets/img/char/c_huang_axiu.jpg[/img]\n\n这一夜，逃难的地居族挤满了城门口。阿秀守着织机，把一件件羽衣缝给他们。她的手指冻得通红，针脚却一丝不乱。\n\n「为什么要给地上的人织衣？他们又不会飞。」有人不解。\n\n阿秀抬头：「飞不飞得起来，是翅膀的事。穿不穿得暖，是我的事。」\n\n她裹住一个冻僵的孩子，又替走失的孩童缝好破损的衣。天蒙蒙亮时，她几乎握不住针，可心里是暖的。',
            goal: '行善 ' + 3 + ' 次（守城一夜，针线暖人）' },
          { id: 3, title: '四 · 无翼亦能翔', type: 'story',
            text: '[img]assets/img/char/c_huang_axiu.jpg[/img]\n\n春分那天，阿秀把织好的百件羽衣，一件件挂上城门。风起时，羽衣猎猎作响，像一群无翼的鸟，正要起飞。\n\n那个曾蜷在檐下的地居孩子，如今也长高了些，仰头看着满城羽衣，忽然说：「阿秀姐姐，你的翅膀真好看。」\n\n阿秀一怔，随即笑了。她摸着自己的肩——那里没有翼骨，却比谁都挺得直。\n\n[highlight]「没有翅膀，也能为所有人撑起一片天。」[/highlight]\n\n她背起那卷未织完的羽衣，向城门外走去。人间那么大，总有人需要针脚的温度。',
            goal: '百件羽衣挂城门，无翼亦能翔' }
        ]
      },
      /* ============ 玄级 · 图文剧情线 ============ */
      c_xuan_laokui: {
        name: '铁与火',
        bg: 'assets/img/nations/yanhuo-city.jpg',
        stages: [
          { id: 0, title: '一 · 炉边旧话', type: 'collect', matId: 'MAT-YH03', matName: '熔岩精铁', need: 2,
            text: '[img]assets/img/char/c_xuan_laokui.jpg[/img]\n\n厌火国的铁匠铺，常年烧着不熄的炉火。老奎蹲在炉边，火星子溅上他的眉毛，他连眼皮都不抬。\n\n他打了一辈子铁，手比铁还硬。可每个来找他打锄头的人，他都能记得人家的名字——「老陈家的锄把去年断过」「小石头的柴刀卷刃了，该加钢了」。\n\n「钱是死物，人是活物。」他把炉火拨得更旺，「我多打一把锄头，明年地里就能多收一斗粮。」\n\n有人笑他傻，说打刀打剑才值钱。老奎摇摇头，只把一截熔岩精铁烧得通红。',
            goal: '采集熔岩精铁 ' + 2 + ' 份，锻造趁手的农具' },
          { id: 1, title: '二 · 火场逆行', type: 'good', need: 3,
            text: '那一夜，城东的粮仓起了火。火光冲天，半个城的人都往城外跑，只有老奎拎着湿毡子往里冲。\n\n「老奎你疯了！火势那么大！」\n\n他头也不回：「粮仓里有明早全城人要吃的粮！」\n\n他裹着湿毡扑进火场，扛出一袋袋粮食；又抱出一个被烟熏晕的孩子，在井边给他灌水。火把他的眉毛燎没了一半，手背上烫起一串水泡。\n\n天亮时，粮仓保住了大半。老奎坐在灰烬边，咧着嘴笑：「瞧，够全城人吃三天。」',
            goal: '行善 ' + 3 + ' 次（火场逆行，铁骨铮铮）' },
          { id: 2, title: '三 · 百炼成钢', type: 'story',
            text: '[img]assets/img/char/c_xuan_laokui.jpg[/img]\n\n灾后的铁匠铺，炉火重新燃起。老奎把烧焦的旧铁器一锤一锤敲打，重新锻成犁头、锄刃、铁锅。\n\n有人问他：「烧成这样，还要它做什么？」\n\n老奎把一件新打好的铁锅举到阳光下：「你看，淬过火的铁，比原先更结实。人也是一样——遭过难，才知道自己有多硬。」\n\n他敲响铁砧，铛——铛——铛，一声声传遍废墟。那是这座城重新站起来的节奏。\n\n[highlight]「铁和火淬出来的，不只是农具，是活下去的骨气。」[/highlight]',
            goal: '百炼成钢，淬火为人' }
        ]
      },
      c_xuan_yaopo: {
        name: '百草丹心',
        bg: 'assets/img/nations/shenmu-eye.jpg',
        stages: [
          { id: 0, title: '一 · 药篓叮当', type: 'collect', matId: 'MAT-C05', matName: '月光草', need: 2,
            text: '[img]assets/img/char/c_xuan_yaopo.jpg[/img]\n\n深目国的雾谷里，药婆的药篓叮当作响。她不识字，却认得上千种草——哪一味能止血，哪一味能退烧，哪一味能吊住一口气。\n\n她背着药篓走过一个个村子，每到一个村，先问两件事：「谁家病了？」「病了几日？」\n\n「我这条老命，多走一天，就多救一家。」她拨开及腰的草，弯腰采下几株月光草。这种草只在子夜月光下泛着银辉，药性极烈，能解百毒，民间唤它「九死草」——九死一生，全靠它续命，也是许多疑难杂症的药引。\n\n「听说山那边的镇子，闹了一场怪病……」药婆眯起眼，把月光草收进药篓。',
            goal: '采集月光草（九死草） ' + 2 + ' 份，准备治病的药引' },
          { id: 1, title: '二 · 寒毒入骨（疑难杂症）', type: 'refine', recipeId: 'xiaohuandan', matId: 'MAT-C02', matName: '灵芝', need: 1, pillNeed: 1,
            text: '山那边的镇子，确实闹了病。病人浑身发冷，夏日里裹着三层棉被还直打颤，舌头乌紫——是寒毒入骨。\n\n药婆搭着病人的脉，眉头越皱越紧：「寻常退寒的方子治不了。要灵芝温养气脉，再配一味小还丹吊住心阳。」\n\n她跑遍山野，在一棵千年老松下寻到一株灵芝。可小还丹……她摸了摸腰间空空的丹囊，叹了口气。\n\n[highlight]「药能救人，也得会炼啊。」[/highlight]她蹲在病人家门口，就着灶火支起药炉。',
            goal: '集齐灵芝×1 并炼制【小还丹】×1，为寒毒病人续住心阳' },
          { id: 2, title: '三 · 疫瘴弥天（疑难杂症）', type: 'refine', recipeId: 'qingxin', matId: 'MAT-C03', matName: '忘忧草', need: 1, pillNeed: 1,
            text: '寒毒刚除，又一重疫瘴从镇西的沼泽弥散开来。病人高烧不退，神志恍惚，口中呓语不断。\n\n「这不是寻常风寒。」药婆嗅了嗅病人呼出的气，脸色一变，「是疫瘴攻心。寻常解毒的药压不住，得用清心丸，把迷住心窍的浊气涤净。」\n\n清心丸的方子她记得，可其中一味忘忧草，只在子夜时分的坟茔边才肯开花。\n\n药婆在坟地边守到子夜，月光下，忘忧草幽幽泛着青光。她小心采下，双手合十：「借我一株，救一条命。」',
            goal: '集齐忘忧草×1 并炼制【清心丸】×1，涤净疫瘴迷窍' },
          { id: 3, title: '四 · 心脉将枯（疑难杂症）', type: 'refine', recipeId: 'dahuandan', matId: 'MAT-C05', matName: '月光草', need: 1, pillNeed: 1,
            text: '镇子最老的一位老人，熬过了寒毒，挺过了疫瘴，却终于撑不住了——心脉将枯，油尽灯枯。\n\n药婆把了脉，沉默了很久。屋里静得能听见烛花爆裂。\n\n「老人家，您还有什么心愿？」她轻声问。\n\n老人浑浊的眼睛动了动：「……想再喝一口，我闺女煮的糊糊。」\n\n药婆的眼眶一热。她转身，用尽最后力气支起药炉——大还丹，能续住将枯的心脉。可炼制大还丹需要极纯的月光草，她采来的那几株，品质还差一些。\n\n她连夜又摸上了雾谷的崖。月光里，她的白发和月光草一起在风里摇。',
            goal: '集齐月光草（九死草）×1 并炼制【大还丹】×1，为老人续住心脉' },
          { id: 4, title: '五 · 坟前百草', type: 'story',
            text: '[img]assets/img/char/c_xuan_yaopo.jpg[/img]\n\n老人喝到了闺女煮的糊糊，含笑而逝。药婆在镇外山岗上，给他立了一块无字碑，碑前种满她采过的百草。\n\n「我救不了所有人。」她坐在碑前，把最后一株九死草种下，「但每救一个，这世上就多一个人记住——活着，真好。」\n\n山风吹过，百草摇曳。药婆背起药篓，拄着拐杖，又踏上了路。她的背影和来时一样瘦小，药篓却仿佛比山还沉。\n\n[highlight]「仁心之路，百草皆兵。我不求长生，只想多走一天，多救一家。」[/highlight]',
            goal: '坟前百草，仁心不灭' }
        ]
      },
      /* ============ 地级 · 专属玩法 ============ */
      c_di_mokai: {
        name: '此身虽铁',
        bg: 'assets/img/nations/xuanyuan-city.jpg',
        stages: [
          { id: 0, title: '一 · 工坊夜话', type: 'collect', matId: 'MAT-JG01', matName: '机核碎片', need: 3,
            text: '[img]assets/img/char/c_di_mokai.jpg[/img]\n\n轩辕国的机关工坊里，莫开就着一盏油灯，拆开一具报废的机关人。齿轮、轴承、发条在灯下泛着冷光，他一件件擦拭，像给老友拂去灰尘。\n\n他在每一具机关人的内壁，都刻着一行字：「此身虽铁，愿为人用。」\n\n「你们不是工具，是和我一样，在为人间出力的——人。」他抚过一具机关人锈迹斑斑的胸口，轻声说。\n\n工坊角落里，还躺着三具被主人抛弃的机关人，等着他修理。',
            goal: '采集机核碎片 ' + 3 + ' 份，备齐修理之资' },
          { id: 1, title: '二 · 匠心修械', type: 'repair', need: 3,
            text: '莫开推开工坊门，把三具废弃机关人一一搬上工作台。\n\n「老伙计，别怕。」他拧开第一具的胸口，从内壁刻字处小心地拆下齿轮，「修好了，我送你们回人间去。」\n\n修机关人不是敲敲打打那么简单——每一具的齿轮都咬合着一段记忆：有替主人扛货扛到关节磨损的，有在洪水中替人挡过浪的，有夜夜替老人烧水的。\n\n莫开一边修，一边和它们说话，仿佛它们是活生生的老友。\n\n[highlight]「修的不是机器，是人心与铁心之间的那道桥。」[/highlight]',
            goal: '修复废弃机关人（消耗机核碎片，累计修好 3 具）' },
          { id: 2, title: '三 · 此身虽铁，愿为人用', type: 'story',
            text: '[img]assets/img/char/c_di_mokai.jpg[/img]\n\n三具机关人全部修好了。莫开给它们上了新漆，又在内壁重新刻下那行字：「此身虽铁，愿为人用。」\n\n第一具机关人重新替街角的老人搬起米袋，关节吱呀作响，老人摸着它的铁臂，红了眼眶。第二具在码头帮货栈扛货，第三具守在孤寡老人的门口，夜夜替她烧水。\n\n人们说莫开只会修机器。莫开摇摇头：「我修的是人心。铁做的身体里，住着跟人一样的魂。」\n\n深夜的工坊里，三具机关人静静地站着。月光透过窗棂，照在它们胸口那行字上，像是替莫开回答了这个国家的疑问。\n\n[highlight]「你们不是工具，是和我一样，在为人间出力的——人。」[/highlight]',
            goal: '三具机关人重返人间，铁亦有情' }
        ]
      },
      c_di_susu: {
        name: '织水为桥',
        bg: 'assets/img/nations/xuangu-lake.jpg',
        stages: [
          { id: 0, title: '一 · 织一张渡人的网', type: 'collect', matId: 'MAT-XG02', matName: '水藻叶', need: 3,
            text: '[img]assets/img/char/c_di_susu.jpg[/img]\n\n玄股国的湖畔，苏苏的双手被水藻叶割出道道血痕。她织的不是寻常渔网，是一张能在洪水中渡人的「苏苏网」。\n\n「网眼要疏一些，人裹进去才不会闷；绳要拧三股，才经得起洪水的撕扯。」她一边织，一边自言自语，「她织的是网，渡的是人，也是自己的道。」\n\n湖边的水藻叶韧得像蛟筋，她一把一把采来搓成绳。这一卷网，她织了整整九天。最后一针落下时，她听见湖对岸传来孩童的哭喊声——是上游的村子发了水。\n\n苏苏一把抓起网，赤脚冲向湖边。',
            goal: '采集水藻叶 ' + 3 + ' 份（搓成蛟筋般的网绳），织成渡人的「苏苏网」' },
          { id: 1, title: '二 · 水落鱼惊', type: 'fish', need: 3,
            text: '洪水退去后的滩涂上，积着一汪汪浅水。困在水洼里的鱼群蹦跳着，也困着几个没来得及跑的孩子。\n\n苏苏挽起裤腿，把「苏苏网」浸入水中。她织网的手稳如磐石，下网、收网，一气呵成。\n\n[highlight]「网住的是鱼，救起的是人。」[/highlight]\n\n她在浅滩里一网一网地捞，先把能活的水洼腾开，再捞困住的鱼放回深水。孩子们趴在岸边看她，渐渐忘了哭。',
            goal: '用「苏苏网」在滩涂捕鱼（捕到 3 条），顺便清出一条活路' },
          { id: 2, title: '三 · 渡人于难', type: 'rescue', need: 2,
            text: '[img]assets/img/char/c_di_susu.jpg[/img]\n\n「苏苏姐姐！那边还有！」孩子的声音忽然尖起来。\n\n上游漂来一根断木，断木上趴着一个幼小的身影，正被湍流卷着往下游冲。\n\n苏苏把网一抖，甩向断木——网眼兜住了孩子的衣领。「抓紧！」她嘶声喊，双手死死拽住网绳，脚下在泥里滑出两道深痕。\n\n洪流里，那一张网，成了一座桥。\n\n孩子被拉上岸时，抱住她的腰大哭。苏苏拍着他的背，手还在抖：「不怕，不怕，姐姐的网，从没断过。」',
            goal: '在洪流中救助落水孩子（救起 2 个）' },
          { id: 3, title: '四 · 织水为桥', type: 'story',
            text: '水退后的黄昏，苏苏坐在湖边，把破损的网重新织补。夕阳把她的影子拉得很长，网上的水珠在光里闪。\n\n那个被她救起的孩子，不知从哪跑来，蹲在旁边看她织网，忽然说：「苏苏姐姐，我长大了，也织一张这样的网。」\n\n苏苏一愣，随即笑了。她把最后一针收好，把网递给那孩子：「好啊。不过记住——网眼要大一点，才能兜住人。」\n\n孩子抱着网跑远了，像抱着一件了不得的宝物。\n\n[highlight]「她织的是网，渡的是人，也是自己的道。」[/highlight]',
            goal: '织水为桥，网住人间' }
        ]
      },
      /* ============ 天级 · 战斗专属剧情 + 战斗属性提升 ============ */
      c_tian_yehuo: {
        name: '执灯',
        bg: 'assets/img/nations/changgu-desert.jpg',
        stages: [
          { id: 0, title: '一 · 雾夜提灯', type: 'battle',
            text: '[img]assets/img/char/c_tian_yehuo.jpg[/img]\n\n长股国的荒漠古道，夜雾浓得像化不开的墨。野火提着一盏灯，站在岔路口，为夜归的人照亮。\n\n「灯油，是你自己炼的心头血吧？」有个过路的老人，曾这样问过他。\n\n野火没说话，只是把灯又拨亮了些。\n\n忽然，雾里传来一声尖叫——一群山匪，拦下了夜行的商队！刀光在雾里一闪，一个孩子被扯下了马车。\n\n野火把灯插在路口，一步一步走向那片刀光。灯影里，他的影子被拉得很长，像一柄出鞘的刀。\n\n[highlight]「有人生而为灯，燃尽自己，照亮人间。」[/highlight]',
            goal: '击退雾夜山匪，救下商队（战斗）' },
          { id: 1, title: '二 · 燃身为灯', type: 'story',
            text: '山匪四散，商队得救。那个被救下的孩子，怯生生地问：「你……你为什么要救我们？」\n\n野火把灯举到他面前，火光映亮他半张脸：「因为夜里，总得有人提着灯。」\n\n说完，他转身走回路口，把那盏灯重新插好，继续为下一个夜归人照路。\n\n雾散了。灯还亮着。\n\n[highlight]「燃尽自己，照亮人间。执灯之路，不问归途。」[/highlight]\n\n（战斗奖励：攻击 +8%、暴击 +4%）',
            goal: '执灯照夜，燃身为灯' }
        ],
        battleBonus: { atk: 0.08, crit: 0.04 }
      },
      c_tian_qingci: {
        name: '窑火通天',
        bg: 'assets/img/nations/zhurao-order.jpg',
        stages: [
          { id: 0, title: '一 · 一窑一城', type: 'battle',
            text: '[img]assets/img/char/c_tian_qingci.jpg[/img]\n\n周饶国的窑口，青瓷守着最后一座窑。魔物的大军压境，村人四散逃难，只有她不肯走。\n\n「这座窑烧了四百年，养活了三代人。」她把窑门拍得山响，「我要是走了，谁来守它？」\n\n夜色里，魔物的眼睛绿莹莹地逼近。青瓷抄起一根烧火棍，挡在窑前。窑火在她身后冲天而起，把她的影子烧得通红。\n\n[highlight]「她烧的不是瓷，是人间不灭的火种。」[/highlight]',
            goal: '击退袭窑魔物，守住四百年窑火（战斗）' },
          { id: 1, title: '二 · 一片青花', type: 'story',
            text: '魔物退去时，窑火已经烧到了最旺。青瓷跪在窑前，捧出那只烧了一整夜的白瓷碗——碗身温润如玉，在火光里泛着幽幽的青。\n\n「原来烧到极致，是会出青花的。」她轻声说，把碗举向黎明。\n\n逃难的人们回来了。青瓷把那碗热粥，分给了每一个回来的人。\n\n[highlight]「瓷再美也只是死物。能盛得住人间冷暖的器，才算烧成了。」[/highlight]\n\n（战斗奖励：生命 +10%、防御 +5%）',
            goal: '守窑燃火，一片青花' }
        ],
        battleBonus: { life: 0.10, def: 0.05 }
      },
      /* ============ 隐藏天级 · 众薪（第7日桃核解锁） ============ */
      c_tian_zhongxin: {
        name: '薪火相传',
        bg: 'assets/img/nations/qing-taolin.jpg',
        stages: [
          { id: 0, title: '一 · 火种初燃', type: 'good', need: 2,
            text: '[img]assets/img/char/c_tian_zhongxin.jpg[/img]\n\n众薪站在桃林尽头的废墟上，掌心那粒「众」字桃核微微发烫。他记不清自己是谁，只记得每次有人向他伸手时，桃核就会亮一分。\n\n「这一把火，你愿意为谁而举？」一个苍老的声音在风里问。\n\n众薪没有回答。他俯身，把一截被风吹倒的屋梁扶起，又替蜷在檐下的老妪拢了拢被角。桃核亮了一分。\n\n原来火种不在他手里，在每个被他照亮的人心里。',
            goal: '行善 2 次（点亮桃核的第一缕火）' },
          { id: 1, title: '二 · 万薪汇聚', type: 'good', need: 3,
            text: '众薪走过一个又一个村子。他帮渔村补船，替猎户劈柴，在洪水中背出老人，在火灾里抱回孩子。\n\n奇怪的是，每当他离开一个地方，总会有一个人接过他手中的火——或是一盏灯，或是一根燃着的木柴，或只是把自己碗里的粥分给别人。\n\n「原来我不是一个人。」众薪望着那些星星点点的火光，忽然懂了，「我是千万个愿意为别人低头的人，共用的名字。」\n\n掌心桃核的光，渐渐从一点，连成一片。',
            goal: '行善 3 次（让火种在人间传递）' },
          { id: 2, title: '三 · 众薪成炬', type: 'story',
            text: '[img]assets/img/char/c_tian_zhongxin.jpg[/img]\n\n第七个夜晚，众薪回到桃林。废墟里，竟燃起了许多堆篝火——那些他曾帮助过的人，不知从何处赶来，围坐在一起，把火种一个接一个地传下去。\n\n众薪笑了。他把掌心那粒桃核轻轻放在火堆中央。桃核「啪」地裂开，化作万千火星，融进每一堆篝火里。\n\n[highlight]「龙不在天上。龙在每一个愿意为别人低头的人脊梁里。」[/highlight]\n\n火光冲天，照亮了整片桃林。众薪的影子在火光里渐渐淡去，可他种下的那些火，正在人间遍地开花。',
            goal: '万民心火，聚而成炬' }
        ]
      }
    },

    /* 每个角色的行善事件池（按国家/主题定制，体现人民史观） */
    charGoodEvents(charId) {
      const map = {
        c_huang_shiman: [
          '你在青丘桃林帮采药的老农背回一篓草药，老人塞给你一把野果。',
          '你背着摔伤的孩童翻山去医馆，孩子的母亲追出半里地谢你。',
          '你帮村里修补了漏雨的祠堂屋顶，村长老泪纵横。',
          '你半夜翻山，为咳疾发作的孤寡老人采来一束止咳草。'
        ],
        c_huang_axiu: [
          '你用捡来的碎羽，为一位老羽民缝好了破损的羽衣。',
          '你在城门前，替走散的孩子找到了失明的母亲。',
          '你织了一张结实的绳网，救下了坠崖的幼鸟。',
          '你把仅有的干粮分给了逃难的老人，自己饿着肚子。'
        ],
        c_xuan_laokui: [
          '你为邻家打了一把新锄头，分文未收。',
          '你冲进火场，抱出了一个被困的孩童。',
          '你替穷苦的猎户修好了卷刃的柴刀。',
          '你在熔炉城废墟里，为无家者敲出了一顶能遮雨的棚。'
        ],
        c_xuan_yaopo: [
          '你背着药篓，为山村里一个高烧的孩子连夜采药。',
          '你分文不取，为孤寡老人熬了一剂吊命的药。',
          '你走遍村落，教村民辨认能解毒的野草。',
          '你在悬崖边救起了一个采药失足的后生。'
        ],
        c_di_mokai: [
          '你为机关人更换了磨损的齿轮，让它重新能帮人扛货。',
          '你在机关人与人类之间调解了一场误会，双方握手言和。',
          '你修好了一台能抽水的机关，救了旱地里的一片庄稼。',
          '你蹲在工坊，为贫困的矿工打造了一把更省力的镐。'
        ],
        c_di_susu: [
          '你织了一张结实的渔网，帮渔民多打了一船鱼。',
          '你在洪流中，用麻绳拉起了一个落水的孩子。',
          '你修补了一座摇摇欲坠的绳桥，让赶集的人不再涉险。',
          '你教村里的妇人织网，让她们也能靠手艺糊口。'
        ],
        c_tian_yehuo: [
          '你提着灯，把一群在雾夜里迷路的商队引回了正路。',
          '你守在岔路口，为夜归的人照亮了回家的路。',
          '你把自己的灯油分给了没有灯的老人。',
          '你在山匪夜袭时，用灯引开匪徒，护住了全村。'
        ],
        c_tian_qingci: [
          '你烧出了一窑暖炉，分给了所有逃难的百姓。',
          '你教村里孩子制陶的手艺，让他们有了一技傍身。',
          '你为受灾的邻村，连夜烧出了能盛水的器皿。',
          '你守着窑火，为迷途的旅人烧了一碗热水。'
        ]
      };
      return map[charId] || [
        '你帮村口老农挑了一担水，老人递来一个热乎的窝头。',
        '你救下了一只跌落悬崖的灵狐幼崽，它亲昵地蹭了蹭你的手。',
        '你为迷路的商队指明了方向，商队送你一袋灵材。',
        '你替受灾的村民修补了漏雨的屋顶，村民们感激不尽。',
        '你在河边救起了一个落水的孩童，孩子的父母长跪不起。'
      ];
    },

    buildHomeCharQuest() {
      const p = App.player;
      if (!p) return { id:'home_char_quest', title:'专属任务', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const ch = global.getChar ? global.getChar(p.charId) : null;
      if (!ch || !ch.quest) return { id:'home_char_quest', title:'专属任务', bg:'assets/img/nations/lingpu-home.jpg', text:'该角色无专属任务。', options:[{label:'返回家园', next:'home'}] };
      const q = ch.quest;
      if (!p.charQuests) p.charQuests = {};
      // 彩蛋联动：石小满第7日进入专属任务时，先触发「桃核低语」隐藏梦境（一次性）
      if (ch.id === 'c_huang_shiman' && (p.day || 1) >= 7 && !p._shimanHiddenDone && !p.charQuests[q.id]) {
        return {
          id: 'home_char_quest', title: '【专属】' + q.name + ' · 夜的间隙',
          bg: 'assets/img/nations/qing-taolin.jpg',
          text: `夜深了。你从灵圃的草铺上醒来，胸口的旧伤隐隐作痛。摸向枕边，却触到一粒温热的物事——那枚一直贴身收着的桃核，此刻竟在掌心泛起柔柔的光，像谁点了一盏小灯。\n\n你握着它，忽然很想听听它要说什么。`,
          options: [
            { label: '【入梦】握住桃核，倾听低语', tag: '梦境', next: 'qingqiu_shiman_hidden' },
            { label: '【放回】今夜且睡下，来日再说', tag: '暂缓', onChoose: (pl) => { Engine.log('你将桃核重新收好，沉沉睡去。', 'system'); }, next: 'home_char_quest' }
          ]
        };
      }
      const done = !!p.charQuests[q.id];
      if (done) {
        return {
          id: 'home_char_quest', title: '【专属】' + q.name, bg: 'assets/img/nations/lingpu-home.jpg',
          text: `【${ch.name}·专属任务】${q.name}\n\n${q.desc}\n\n[highlight]任务已完成[/highlight]。你以${ch.name}之身，践行了「人人如龙」之道。\n\n（专属成就「${ch.achievement ? ch.achievement.name : ''}」已同步至全局成就，可在封面领取命数奖励。）`,
          options: [{ label: '返回家园', next: 'home' }]
        };
      }
      // 未完成：多阶段专属剧情线（图文穿插 + 差异化玩法）
      const line = (App.CHAR_QUEST_LINES && App.CHAR_QUEST_LINES[ch.id]);
      if (line && line.stages && line.stages.length) {
        return App.buildCharQuestStage(p, ch, q, line);
      }
      // 兜底：无专属剧情线的角色（理论不会发生），退化为简单行善/采集
      const needGood = 8, needMat = 4, matId = 'MAT-C01', matName = '朱果';
      const curGood = p.charGood || 0, curMat = (p.materials && p.materials[matId]) || 0;
      return {
        id: 'home_char_quest', title: '【专属】' + q.name, bg: 'assets/img/nations/lingpu-home.jpg',
        text: `【${ch.name}·专属任务】${q.name}\n\n完成条件：行善 ${curGood}/${needGood} 次 · ${matName} ${curMat}/${needMat} 份`,
        options: [
          { label: '【行善】扶危济困（耗1时辰）', tag: '行善', onChoose: (pl) => {
            if (pl.shichen <= 0) { Engine.log('时辰已尽，且先就寝。', 'evil'); return; }
            STATE.spendShichen(pl, 1);
            if (!pl.charGood) pl.charGood = 0;
            pl.charGood += 1;
            const evts = App.charGoodEvents(ch.id) || [];
            Engine.log(evts[Math.floor(Math.random() * Math.max(1, evts.length))], 'good');
          }, next: 'home_char_quest' },
          { label: '【采集】搜寻' + matName + '（耗1时辰）', tag: '采集', onChoose: (pl) => {
            if (pl.shichen <= 0) { Engine.log('时辰已尽，且先就寝。', 'evil'); return; }
            STATE.spendShichen(pl, 1);
            if (Math.random() < 0.65) { STATE.addMaterial(pl, matId, 1); Engine.log('你寻得一份' + matName + '。', 'good'); }
            else Engine.log('你搜寻半日，未见' + matName + '踪迹。', 'system');
          }, next: 'home_char_quest' },
          { label: '返回家园', next: 'home' }
        ]
      };
    },

    /* ============== 角色多阶段剧情引擎 ============== */
    /** 获取角色当前阶段索引（缺省 0） */
    charQuestStageOf(p, charId) {
      if (!p.charQuestStage || typeof p.charQuestStage !== 'object') p.charQuestStage = {};
      return p.charQuestStage[charId] || 0;
    },
    /** 获取角色剧情子进度容器（缺省空对象） */
    charQuestDataOf(p, charId) {
      if (!p.charQuestData || typeof p.charQuestData !== 'object') p.charQuestData = {};
      if (!p.charQuestData[charId] || typeof p.charQuestData[charId] !== 'object') p.charQuestData[charId] = {};
      return p.charQuestData[charId];
    },
    /** 推进到下一阶段；到达阶段数末尾时标记任务完成（幂等） */
    charQuestAdvance(p, charId, line) {
      const idx = App.charQuestStageOf(p, charId);
      const nextIdx = idx + 1;
      if (nextIdx >= line.stages.length) {
        p.charQuestStage[charId] = line.stages.length;
        const ch = global.getChar ? global.getChar(charId) : null;
        if (ch && ch.quest) p.charQuests[ch.quest.id] = true;
      } else {
        p.charQuestStage[charId] = nextIdx;
      }
    },

    /* 多阶段剧情：按当前阶段构建场景 */
    buildCharQuestStage(p, ch, q, line) {
      const charId = ch.id;
      const idx = App.charQuestStageOf(p, charId);
      const stages = line.stages;
      // 已完成全部阶段
      if (idx >= stages.length) {
        // 标记完成 + 发奖励（幂等）
        if (!p.charQuests[q.id]) {
          p.charQuests[q.id] = true;
          if (q.mingReward) { META.addMing(q.mingReward); Engine.log(`命数 +${q.mingReward}（${ch.name} 专属任务奖励）`, 'gold'); }
          if (ch.achievement && META.unlockGlobalAch) {
            META.unlockGlobalAch(ch.achievement.id);
            // 同步记录局内成就（角色成就也进 p.achievements，便于局内面板可见）
            if (!p.achievements) p.achievements = [];
            if (p.achievements.indexOf(ch.achievement.id) < 0) p.achievements.push(ch.achievement.id);
          }
          Engine.sfx('reward');
          Engine.toast(`专属任务完成！命数 +${q.mingReward || 0}（成就另有命数，封面领取）`, 'gold');
        }
        return {
          id: 'home_char_quest', title: '【专属】' + q.name, bg: line.bg || 'assets/img/nations/lingpu-home.jpg',
          text: `[highlight]【${line.name}】完[/highlight]\n\n你以${ch.name}之身，走完了这条属于你的道。那些帮助过的人、缝过的衣、治过的病、修过的铁、渡过的河、照过的夜——都刻进了这方天地。\n\n[highlight]「人人如龙」——不求天赋异禀，但求问心无愧。[/highlight]\n\n（专属成就「${ch.achievement ? ch.achievement.name : ''}」已同步至全局成就，可在封面领取命数奖励。）`,
          options: [{ label: '返回家园', next: 'home' }]
        };
      }
      const st = stages[idx];
      const data = App.charQuestDataOf(p, charId);
      const mats = p.materials || {};
      // 图文穿插：阶段引言 + 立绘
      let text = st.text || '';
      const curGood = p.charGood || 0;
      const curMat = mats[st.matId] || 0;
      const hasPill = (st.recipeId && p.pills && (p.pills[st.recipeId] || 0)) || 0;

      // 各类型进度与动作
      const opts = [];
      const optsNoTime = [];
      let stageDone = false;
      let progressLine = '';

      if (st.type === 'collect') {
        stageDone = curMat >= st.need;
        progressLine = `【收集】${st.matName}：${curMat}/${st.need}`;
        opts.push({ label: `【采集】搜寻${st.matName}（耗1时辰）`, tag: '采集', onChoose: (pl) => {
          if (pl.shichen <= 0) { Engine.log('时辰已尽，且先就寝。', 'evil'); return; }
          // 已集齐仍点击：明确提示，不再消耗时辰
          if ((pl.materials && pl.materials[st.matId] || 0) >= st.need) {
            Engine.log(st.matName + '已经集齐了，且去忙下一件事吧。', 'system');
            return;
          }
          STATE.spendShichen(pl, 1);
          if (!pl.materials) pl.materials = {};
          if (Math.random() < 0.85) { STATE.addMaterial(pl, st.matId, 1); Engine.log('你寻得一份' + st.matName + '。', 'good'); }
          else Engine.log('你搜寻半日，未见' + st.matName + '踪迹。', 'system');
          Engine.log(`任务进度：${st.matName} ${(pl.materials && pl.materials[st.matId]||0)}/${st.need}`, 'system');
        }, next: 'home_char_quest' });
      } else if (st.type === 'good') {
        stageDone = curGood >= st.need;
        progressLine = `【行善】扶危济困：${curGood}/${st.need}`;
        opts.push({ label: '【行善】扶危济困（耗1时辰）', tag: '行善', onChoose: (pl) => {
          if (pl.shichen <= 0) { Engine.log('时辰已尽，且先就寝。', 'evil'); return; }
          STATE.spendShichen(pl, 1);
          if (!pl.charGood) pl.charGood = 0;
          pl.charGood += 1;
          const events = App.charGoodEvents(ch.id);
          Engine.log(events[Math.floor(Math.random() * events.length)], 'good');
          Engine.log(`任务进度：行善 ${pl.charGood}/${st.need}`, 'system');
        }, next: 'home_char_quest' });
      } else if (st.type === 'refine') {
        // 药婆疑难杂症：需集齐草药 + 炼制丹药，交付医治
        stageDone = curMat >= st.need && hasPill >= st.pillNeed;
        progressLine = `【药引】${st.matName}：${curMat}/${st.need} · 【丹药】${hasPill}/${st.pillNeed}`;
        opts.push({ label: `【采集】搜寻${st.matName}（耗1时辰）`, tag: '采药', onChoose: (pl) => {
          if (pl.shichen <= 0) { Engine.log('时辰已尽，且先就寝。', 'evil'); return; }
          STATE.spendShichen(pl, 1);
          if (!pl.materials) pl.materials = {};
          if (Math.random() < 0.6) { STATE.addMaterial(pl, st.matId, 1); Engine.log('你寻得一份' + st.matName + '。', 'good'); }
          else Engine.log('你搜寻半日，未见' + st.matName + '踪迹。', 'system');
        }, next: 'home_char_quest' });
        const recipe = STATE.getRecipes().find(r => r.id === st.recipeId);
        if (recipe) {
          const needDesc = Object.keys(recipe.req).map(m => STATE.matName(m) + '×' + recipe.req[m]).join('、');
          progressLine += `\n【丹方】${recipe.name}：需 ${needDesc}（Lv${recipe.lv}）`;
        }
        opts.push({ label: '【炼丹】炼制【' + (recipe ? recipe.name : st.recipeId) + '】', tag: '炼丹', onChoose: (pl) => {
          const res = STATE.refine(pl, st.recipeId);
          if (res.error) Engine.log(res.error, 'evil');
          else { Engine.log('药炉轻鸣，一枚【' + res.recipe.name + '】炼成了！', 'gold'); Engine.sfx('craft'); }
        }, next: 'home_char_quest' });
        opts.push({ label: '【医治】以药引与丹药为病人诊治（' + (stageDone ? '✓ 可医治' : '药引/丹药不足') + '）', tag: '行医', onChoose: (pl) => {
          if ((pl.materials && pl.materials[st.matId] || 0) >= st.need && (pl.pills && pl.pills[st.recipeId] || 0) >= st.pillNeed) {
            if (!pl.pills) pl.pills = {};
            STATE.removeMaterial(pl, st.matId, st.need);
            pl.pills[st.recipeId] -= st.pillNeed;
            Engine.log('你悉心诊治，病人沉疴尽去，跪地叩谢。', 'good');
            Engine.sfx('reward');
            App.charQuestAdvance(pl, charId, line);
            Engine.log('【' + line.name + '】——下一幕开始了。', 'system');
          } else {
            Engine.log('药引或丹药不足，尚无法诊治。', 'evil');
          }
        }, next: 'home_char_quest' });
      } else if (st.type === 'repair') {
        // 莫开修械：消耗零件修机关人
        const repaired = data.repaired || 0;
        stageDone = repaired >= st.need;
        progressLine = `【修复】机关人：${repaired}/${st.need}`;
        opts.push({ label: '【修复】修好一具机关人（耗1时辰，耗机核碎片×1）', tag: '修械', onChoose: (pl) => {
          if (pl.shichen <= 0) { Engine.log('时辰已尽，且先就寝。', 'evil'); return; }
          if ((pl.materials['MAT-JG01'] || 0) < 1) { Engine.log('机核碎片不足，无法修理。', 'evil'); return; }
          STATE.spendShichen(pl, 1);
          STATE.removeMaterial(pl, 'MAT-JG01', 1);
          const ok = Math.random() < 0.7;
          const d = App.charQuestDataOf(pl, charId);
          if (ok) {
            d.repaired = (d.repaired || 0) + 1;
            Engine.log('齿轮咬合、发条上劲——一具机关人重新站起来了，胸口刻字闪闪发光。', 'good');
          } else {
            Engine.log('这具机关人的老毛病比想象中顽固，零件报废了一枚，还需再修。', 'system');
          }
          Engine.log(`任务进度：修复机关人 ${d.repaired||0}/${st.need}`, 'system');
        }, next: 'home_char_quest' });
      } else if (st.type === 'fish') {
        // 苏苏捕鱼小游戏
        const fished = data.fished || 0;
        stageDone = fished >= st.need;
        progressLine = `【捕鱼】用苏苏网捕鱼：${fished}/${st.need}`;
        opts.push({ label: '【捕鱼】去滩涂下网捕鱼（捕鱼小游戏）', tag: '捕鱼', next: null, onChoose: (pl) => {
          App.startFishingGame({ mode: 'fish', title: '滩涂捕鱼' }, (res) => {
            const d = App.charQuestDataOf(pl, charId);
            d.fished = (d.fished || 0) + res.catch;
            Engine.log('你这一网，捕到 ' + res.catch + ' 条鱼。', res.catch > 0 ? 'good' : 'system');
            App.goto('home_char_quest');
          });
        } });
      } else if (st.type === 'rescue') {
        // 苏苏救人：通过捕鱼小游戏（救孩子）
        const saved = data.saved || 0;
        stageDone = saved >= st.need;
        progressLine = `【救人】洪流中救助孩子：${saved}/${st.need}`;
        opts.push({ label: '【救人】去洪流边下网救人（救人小游戏）', tag: '救人', next: null, onChoose: (pl) => {
          App.startFishingGame({ mode: 'rescue', title: '洪流救人' }, (res) => {
            const d = App.charQuestDataOf(pl, charId);
            d.saved = (d.saved || 0) + res.rescued;
            Engine.log('你这一趟，救起 ' + res.rescued + ' 个落水孩子。', res.rescued > 0 ? 'good' : 'system');
            App.goto('home_char_quest');
          });
        } });
      } else if (st.type === 'interact') {
        // 互动抉择（图文沉浸）：选项不同，反馈与奖励不同；主线选项（key=goal）计进度
        stageDone = (data.interact || 0) >= st.need;
        progressLine = `【互动】与「${st.targetName || '故人'}」交谈：${data.interact || 0}/${st.need}`;
        const interactOptions = (st.choices || []).map(opt => ({
          label: opt.label,
          tag: opt.tag || '交谈',
          onChoose: (pl) => {
            if (opt.onPick) {
              const r = opt.onPick(pl, App.charQuestDataOf(pl, charId));
              if (r && r.log) Engine.log(r.log, r.good ? 'good' : 'system');
            } else {
              Engine.log(opt.feedback || opt.label, opt.good ? 'good' : 'system');
            }
            if (opt.key === 'goal') {
              const d = App.charQuestDataOf(pl, charId);
              d.interact = (d.interact || 0) + 1;
              Engine.log(st.progressLog || `心意相通（${d.interact}/${st.need}）`, 'good');
            } else {
              // 非目标选项：标记"此间事已了"（解锁推进），并给予小奖励
              const d = App.charQuestDataOf(pl, charId);
              d.interactDone = true;
              if (!pl.materials) pl.materials = {};
              if (Math.random() < 0.6) { STATE.addMaterial(pl, st.extraMat || 'MAT-C02', 1); Engine.log('对方塞给你一份' + (STATE.matName(st.extraMat || 'MAT-C02')) + '。', 'good'); }
            }
          },
          next: 'home_char_quest'
        }));
        opts.push(...interactOptions);
        // 主线选项达 need 次即可推进（非目标选项是可选的额外互动）
        if (stageDone) {
          optsNoTime.push({ label: '【继续】此间事了，进入下一幕', tag: '推进', cls: 'btn-primary', onChoose: (pl) => {
            App.charQuestAdvance(pl, charId, line);
            Engine.log('【' + line.name + '】——下一幕开始了。', 'system');
          }, next: 'home_char_quest' });
        }
      } else if (st.type === 'battle') {
        // 天级专属战斗：点击迎战触发（battle 由 handleBattle 调度）
        stageDone = !!data.battleWon;
        progressLine = data.battleWon ? '【战斗】已击退来犯之敌 ✓' : '【战斗】待战';
        const enemy = STATE.makeEnemy(p, {
          lv: Math.max(8, (p.lv || 1) + 2),
          state: { id:'angry', name:'凶煞', mul:1.1, aware:'aware' },
          name: ch.id === 'c_tian_yehuo' ? '雾夜山匪' : '袭窑魔物',
          namePrefix: ch.id === 'c_tian_yehuo' ? '山匪头目' : '魔物首领',
          hpMul: 5.5, atkMul: 0.95, defMul: 0.4,
          element: ch.id === 'c_tian_yehuo' ? '魔' : '暗',
          bg: line.bg || 'assets/img/nations/qing-fog-abyss.jpg'
        });
        if (!data.battleWon) {
          opts.push({ label: '【迎战】握紧兵刃，挺身而出（进入战斗）', tag: '战斗', onChoose: (pl) => {
            App._charBattleLine = line;
            App._charBattleChar = ch;
          }, next: 'home_char_battle' });
        }
      } else if (st.type === 'story') {
        // 纯剧情：点击进入下一幕
        stageDone = true;
        progressLine = '【剧情】静听往事';
        opts.push({ label: '【继续】聆听这一幕的尾声', tag: '剧情', onChoose: (pl) => {
          App.charQuestAdvance(pl, charId, line);
          Engine.log('【' + line.name + '】——下一幕开始了。', 'system');
        }, next: 'home_char_quest' });
      }

      // 进度行 + 阶段完成时的推进按钮
      if (progressLine) text += '\n\n[highlight]' + progressLine + '[/highlight]';
      // 非 story/battle 类型且已完成 → 提供「进入下一幕」。
      // 注意：refine（药婆治病）类型不允许直接跳过——必须通过「医治」消耗药引与丹药才可推进，
      //      否则玩家会绕开"先治病"直接进入下一幕（用户反馈的关键 bug）。
      if (stageDone && st.type !== 'story' && st.type !== 'battle' && st.type !== 'refine') {
        optsNoTime.push({ label: '【继续】此幕已了，进入下一幕', tag: '推进', cls: 'btn-primary', onChoose: (pl) => {
          App.charQuestAdvance(pl, charId, line);
          Engine.log('【' + line.name + '】——下一幕开始了。', 'system');
        }, next: 'home_char_quest' });
      }
      // refine 类型的推进：只能通过「医治」完成（消耗药引与丹药），此处直接调用与医治相同的消耗逻辑
      if (stageDone && st.type === 'refine') {
        optsNoTime.push({ label: '【继续】此幕已了，进入下一幕（将消耗药引与丹药）', tag: '推进', cls: 'btn-primary', onChoose: (pl) => {
          if ((pl.materials && pl.materials[st.matId] || 0) >= st.need && (pl.pills && pl.pills[st.recipeId] || 0) >= st.pillNeed) {
            if (!pl.pills) pl.pills = {};
            STATE.removeMaterial(pl, st.matId, st.need);
            pl.pills[st.recipeId] -= st.pillNeed;
            Engine.log('你悉心诊治，病人沉疴尽去，跪地叩谢。', 'good');
            Engine.sfx('reward');
            App.charQuestAdvance(pl, charId, line);
            Engine.log('【' + line.name + '】——下一幕开始了。', 'system');
          } else {
            Engine.log('药引或丹药不足，尚无法诊治。', 'evil');
          }
        }, next: 'home_char_quest' });
      }
      if (st.type === 'battle' && stageDone) {
        optsNoTime.push({ label: '【继续】此战已捷，进入下一幕', tag: '推进', cls: 'btn-primary', onChoose: (pl) => {
          App.charQuestAdvance(pl, charId, line);
          Engine.log('【' + line.name + '】——下一幕开始了。', 'system');
        }, next: 'home_char_quest' });
      }

      return {
        id: 'home_char_quest',
        title: '【专属】' + q.name + ' · ' + (st.title || ('第' + (idx + 1) + '幕')),
        bg: st.bg || line.bg || 'assets/img/nations/lingpu-home.jpg',
        text,
        options: opts.concat(optsNoTime).concat([{ label: '返回家园', next: 'home' }])
      };
    },

    /* 天级角色专属战斗场景：battle 配置触发 handleBattle，胜利后发战斗属性提升 */
    buildHomeCharBattle() {
      const p = App.player;
      if (!p) return { id:'home_char_battle', title:'战斗', bg:'assets/img/nations/qing-fog-abyss.jpg', text:'无', options:[{label:'返回家园', next:'home'}] };
      const line = App._charBattleLine;
      const ch = App._charBattleChar;
      if (!line || !ch) return { id:'home_char_battle', title:'战斗', bg:'assets/img/nations/qing-fog-abyss.jpg', text:'此战已了。', options:[{label:'返回家园', next:'home'}] };
      const data = App.charQuestDataOf(p, ch.id);
      const enemy = STATE.makeEnemy(p, {
        lv: Math.max(8, (p.lv || 1) + 2),
        state: { id:'angry', name:'凶煞', mul:1.1, aware:'aware' },
        name: ch.id === 'c_tian_yehuo' ? '雾夜山匪' : '袭窑魔物',
        namePrefix: ch.id === 'c_tian_yehuo' ? '山匪头目' : '魔物首领',
        hpMul: 5.5, atkMul: 0.95, defMul: 0.4,
        element: ch.id === 'c_tian_yehuo' ? '魔' : '暗',
        bg: line.bg || 'assets/img/nations/qing-fog-abyss.jpg'
      });
      return {
        id: 'home_char_battle', title: '【' + (ch.id === 'c_tian_yehuo' ? '执灯' : '窑火通天') + '】决战',
        bg: line.bg || 'assets/img/nations/qing-fog-abyss.jpg',
        text: (ch.id === 'c_tian_yehuo'
          ? '雾散尽之前，刀光先亮。野火把那盏灯往地上一插，火光照出他沉默的脸。\n\n[highlight]「有人生而为灯。灯油烧尽之前，谁也别想伤我身后的人。」[/highlight]'
          : '窑火冲天，魔物龇牙。青瓷举起烧火棍，挡在窑门之前。\n\n[highlight]「这座窑烧了四百年。你要闯，就先踏过我的影子。」[/highlight]'),
        options: [{ label: '返回家园（暂避锋芒）', next: 'home' }],
        battle: {
          enemy,
          after: 'home_char_quest',   // 胜利后回到专属任务场景，可直接进入下一幕
          onWin: (pl) => {
            const d = App.charQuestDataOf(pl, ch.id);
            d.battleWon = true;
            // 永久战斗属性提升（天级专属奖励）
            if (!pl.charBattleBonus || typeof pl.charBattleBonus !== 'object') pl.charBattleBonus = {};
            const bb = line.battleBonus || {};
            for (const k in bb) {
              pl.charBattleBonus[k] = (pl.charBattleBonus[k] || 0) + (bb[k] || 0);
            }
            Engine.log('此战告捷！你获得了永久战斗属性提升：' +
              Object.keys(bb).map(k => {
                const map = { atk:'攻击', def:'防御', life:'生命', mp:'灵力', crit:'暴击', dodge:'闪避' };
                return (map[k] || k) + ' +' + Math.round((bb[k] || 0) * 100) + '%';
              }).join('、'), 'gold');
            App._charBattleLine = null;
            App._charBattleChar = null;
            Engine.toast('战斗属性提升！', 'gold');
          },
          onLose: (pl) => { App._charBattleLine = null; App._charBattleChar = null; }
        }
      };
    },

    /* 苏苏捕鱼/救人小游戏：modal 内 canvas 实现
     * 玩法：画面底部是「苏苏网」，鱼/孩子/杂物从上方落下；
     *      移动鼠标左右控制渔网，接住鱼（捕鱼）/孩子（救人）得分，接到杂物扣分。
     * opts.mode: 'fish'（捕鱼，接住🐟+1，接住杂物-1） | 'rescue'（救人，接住🧒+1）
     * 60 秒倒计时（暂停可退出），结束时回调 { catch, rescued }
     */
    startFishingGame(opts, onDone) {
      const p = App.player;
      if (!p) return;
      const mode = opts.mode || 'fish';
      const W = 440, H = 420;           // 画布尺寸
      const netW = 92, netH = 26;        // 渔网尺寸
      const title = opts.title || (mode === 'rescue' ? '洪流救人' : '滩涂捕鱼');

      const container = document.createElement('div');
      container.style.cssText = 'text-align:center;';
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      canvas.style.cssText = 'background:linear-gradient(180deg,#0b2e4f 0%,#14608c 40%,#2c8aa8 75%,#4fb3c4 100%);border:2px solid #7ec8a8;border-radius:10px;max-width:100%;cursor:none;';
      container.appendChild(canvas);
      const tip = document.createElement('div');
      tip.style.cssText = 'margin-top:8px;font-size:13px;color:#a8c8d8;';
      tip.textContent = mode === 'rescue' ? '移动鼠标控制苏苏网，接住落水的孩子 🧒！接到石头 -1 分。' : '移动鼠标控制苏苏网，接住鱼 🐟！接到杂物 -1 分。';
      container.appendChild(tip);
      const ctx = canvas.getContext('2d');

      // 游戏状态
      let caughtFish = 0, caughtKids = 0;
      let timeLeft = 40;   // 40 秒一局，节奏紧凑（捕鱼/救人玩法体验）
      let running = false;
      let netX = W / 2 - netW / 2;
      let items = [];
      let spawnTimer = 0;
      let ended = false;

      const spawn = () => {
        const isKid = mode === 'rescue' && Math.random() < 0.34;
        const isBad = !isKid && Math.random() < 0.18;   // 杂物/石头
        items.push({
          x: 20 + Math.random() * (W - 40),
          y: -24,
          vy: 1.4 + Math.random() * 1.6,
          kind: isKid ? 'kid' : (isBad ? 'bad' : 'fish'),
          w: isKid ? 20 : 18,
          h: isKid ? 22 : 16
        });
      };

      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        // 背景水波
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < 8; i++) {
          const y = ((Date.now() / 40 + i * 57) % H);
          ctx.fillRect((i * 61 + 10) % W, y, 30, 3);
        }
        // 物品
        for (const it of items) {
          if (it.kind === 'fish') { ctx.font = '20px serif'; ctx.fillText('🐟', it.x - 9, it.y + 12); }
          else if (it.kind === 'kid') { ctx.font = '22px serif'; ctx.fillText('🧒', it.x - 9, it.y + 16); }
          else { ctx.fillStyle = '#5a5a6e'; ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, 7); ctx.fill(); ctx.fillStyle='#8a8a9e'; ctx.font='13px serif'; ctx.fillText('🪨', it.x-7, it.y+5); }
        }
        // 渔网（底部）
        const nx = netX, ny = H - 34;
        ctx.fillStyle = 'rgba(120,200,160,0.25)';
        ctx.strokeStyle = '#c8f0d8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(nx, ny, netW, netH);
        ctx.fill(); ctx.stroke();
        // 网线
        ctx.strokeStyle = 'rgba(200,240,216,0.55)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(nx + (netW/4)*i, ny); ctx.lineTo(nx + (netW/4)*i, ny + netH); ctx.stroke(); }
        for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(nx, ny + (netH/3)*i); ctx.lineTo(nx + netW, ny + (netH/3)*i); ctx.stroke(); }
        ctx.fillStyle = '#c8f0d8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('苏苏网', nx + netW/2, ny + netH/2 + 4);
        ctx.textAlign = 'left';
        // HUD
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#e8f8ee';
        const label = mode === 'rescue' ? ('救助 ' + caughtKids) : ('捕到 ' + caughtFish);
        ctx.fillText(label + ' · 剩余 ' + Math.ceil(timeLeft) + ' 秒', 10, 20);
      };

      const loop = () => {
        if (ended) return;
        if (running) {
          timeLeft -= 1 / 60;
          spawnTimer += 1 / 60;
          if (spawnTimer > (mode === 'rescue' ? 0.9 : 0.75)) { spawnTimer = 0; spawn(); }
          for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.y += it.vy;
            // 接住检测
            if (it.y + 10 >= H - 44 && it.y - 10 <= H - 8 &&
                it.x > netX - 6 && it.x < netX + netW + 6) {
              if (it.kind === 'fish') { caughtFish++; }
              else if (it.kind === 'kid') { caughtKids++; }
              else { }
              items.splice(i, 1);
              continue;
            }
            if (it.y > H + 20) items.splice(i, 1);
          }
          if (timeLeft <= 0) {
            ended = true;
            Engine.sfx('reward');
            Engine.toast(mode === 'rescue' ? ('救起 ' + caughtKids + ' 个孩子！') : ('捕到 ' + caughtFish + ' 条鱼！'), 'good');
            Engine.closeModal();
            canvas.removeEventListener('mousemove', onMove);
            if (onDone) onDone({ catch: caughtFish, rescued: caughtKids });
            return;
          }
        }
        draw();
        requestAnimationFrame(loop);
      };

      // 鼠标控制
      const onMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scale = W / rect.width;
        const x = (e.clientX - rect.left) * scale;
        netX = Math.max(4, Math.min(W - netW - 4, x - netW / 2));
      };
      canvas.addEventListener('mousemove', onMove);

      // 清理小游戏（防 × 关闭后残留运行/回调不触发）
      const cleanup = (result) => {
        ended = true;
        canvas.removeEventListener('mousemove', onMove);
        try { clearInterval(Engine.typeTimer); } catch (e) {}
        if (onDone) {
          const cb = onDone; onDone = null;
          cb(result || { catch: caughtFish, rescued: caughtKids });
        }
      };
      // 开始/结束
      Engine.modal('🎣 ' + title, container, [
        { label: '开始', cls: 'btn-primary', fn: () => { if (!running) { running = true; } } },
        { label: '结束', cls: 'btn-ghost', fn: () => {
          cleanup();
          Engine.closeModal();
        } }
      ]);
      // 捕获右上角 × 关闭：清理游戏并结算当前进度（避免 rAF 残留与 onDone 不触发）
      const closeX = document.querySelector('#modal-title .modal-title-close') || document.querySelector('.modal-title-close');
      if (closeX) {
        closeX.onclick = (e) => {
          cleanup();
          Engine.closeModal();
        };
      }
      loop();
    },

    /* ============== 家园·修炼 ============== */
    buildHomeCultivate() {
      const p = App.player;
      if (!p) return { id:'home_cultivate', title:'修炼', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const can = p.shichen > 0;
      // 当前剩余时辰
      const time = p.shichen;
      const cappedNow = STATE.isExpCapped(p);
      // 进入只展示状态，修炼动作由点击触发（避免进入场景就扣时辰）
      // 批量修炼文案：提示将自动在经验封顶时停下
      const batchHint = '\n\n· 批量修炼时，若修为抵达当前境界瓶颈，会自动停下并提示突破，不会浪费时辰。';
      const cappedHint = cappedNow ? '\n\n⚠ 修为已至瓶颈，继续修炼将无收益，请先突破境界。' : '';
      return {
        id: 'home_cultivate',
        title: '【修炼】运转周天',
        bg: 'assets/img/scenes/cultivate-room.jpg',
        text: `闭目凝神，运转周天，灵气沿经脉流转。\n当前境界：${p.realm.name} Lv${p.lv}（${p.realm.exp}/${p.realm.expMax}）\n当前时辰：${time}/${p.shichenMax}\n\n每修炼一次消耗1时辰。${batchHint}${cappedHint}`,
        options: [
          { label: can ? '【修炼】打坐一次（耗1时辰）' : '（时辰已尽）', tag: '修炼', onChoose: (pl) => {
              App._doCultivate(pl, 1);
            }, next: 'home_cultivate' },
          { label: can ? '【修炼】静修三次（耗3时辰，不足则修完剩余）' : '（时辰已尽）', tag: '修炼', onChoose: (pl) => {
              App._doCultivate(pl, 3);
            }, next: 'home_cultivate' },
          { label: can ? '【修炼】全力运转（耗尽时辰，遇瓶颈自停）' : '（时辰已尽）', tag: '修炼', onChoose: (pl) => {
              App._doCultivate(pl, pl.shichen);
            }, next: 'home_cultivate' },
          { label: '返回家园', next: 'home' }
        ]
      };
    },

    /* 修炼执行 + 结果汇总（单次/批量统一处理，批量减负核心） */
    _doCultivate(pl, times) {
      if (pl.shichen <= 0) { Engine.log('时辰已尽，且先就寝。', 'evil'); return; }
      // 若已卡瓶颈，直接拦截，避免浪费时辰
      if (STATE.isExpCapped(pl)) {
        const br = STATE.canBreakthrough(pl);
        Engine.log('修为已至' + br.next.name + '瓶颈，继续修炼只是徒劳。请先前往【突破】冲击更高境界。', 'gold');
        Engine.toast('经验已满，请突破' + br.next.name, 'gold');
        return;
      }
      const beforeLv = pl.lv;
      const beforeExp = pl.realm.exp;
      const beforeTime = pl.shichen;
      const results = STATE.cultivate(pl, times);
      if (!results || !results.length) { Engine.log('时辰已尽，且先就寝。', 'evil'); return; }
      const actualTimes = beforeTime - pl.shichen;      // 实际修炼次数（可能因时辰不足/瓶颈而少于请求）
      const totalExp = results.filter(r => r.expGain !== undefined).reduce((s, r) => s + r.expGain, 0);
      const lvUps = [];
      results.forEach(r => { if (r.lvUp) r.lvUp.forEach(l => lvUps.push(l)); });
      const capped = results.find(r => r.expCapped);
      // 汇总日志
      if (capped) {
        Engine.log(`你静修 ${actualTimes} 次，共得 ${totalExp} 点修为，已触及 ${capped.needBreak} 瓶颈——修为封顶，请先突破境界。`, 'gold');
        Engine.toast('经验已满，请突破' + capped.needBreak, 'gold');
      } else if (lvUps.length) {
        const lvList = lvUps.filter((v, i, a) => a.indexOf(v) === i);   // 去重
        Engine.log(`你静修 ${actualTimes} 次，共得 ${totalExp} 点修为，境界提升至 Lv${lvList.join('、')}！`, 'good');
        Engine.toast('境界提升至 Lv' + lvList[lvList.length - 1], 'good');
      } else {
        Engine.log(`你静修 ${actualTimes} 次，共得 ${totalExp} 点修为，道行渐深。`, 'good');
      }
      Engine.refreshStatus(pl);
    },

    /* ============== 家园·今日事务（每日目标 + 委托板 合版） ==============
     * 左侧：每日目标（4项，领奖内嵌）｜右侧：每日委托板（右上角 × 关闭返回家园）
     * 返回家园不再作为选项出现，玩家通过右上角关闭键或顶部菜单返回 */
    renderDailyBoard(p) {
      if (!p) { App.goto('home'); return; }
      try { Engine.setBg('assets/img/scenes/home-cave.jpg'); } catch (e) {}
      const titleEl = document.getElementById('story-title');
      if (titleEl) titleEl.textContent = '【今日事务】每日目标 · 委托板';

      // —— 左：每日目标 ——
      const goals = STATE.getDailyProgress(p);
      const streak = p.dailyStreak || 0;
      const goalRows = goals.map(g => {
        const status = g.got ? '✓ 已领' : (g.done ? '🎁 可领取' : (g.cur + '/' + g.need));
        const cls = g.got ? 'got' : (g.done ? 'ready' : '');
        const act = (g.done && !g.got) ? ' data-claim-goal="' + g.id + '"' : '';
        return `<div class="daily-goal ${cls}"${act} title="${g.desc}｜奖励：金币+${g.reward.gold || 0}${g.reward.exp ? ' 修为+' + g.reward.exp : ''}${g.reward.draw ? ' 抽命格×' + g.reward.draw : ''}">
          <span class="dg-name">${g.name}</span><span class="dg-prog">${status}</span>
        </div>`;
      }).join('');
      // —— 右：每日委托板 ——
      const cc = STATE.getCommissions(p);
      const commRows = cc.list.map((it, i) => {
        const have = (p.materials || {})[it.reqMat] || 0;
        const status = it.done ? '✓ 已完成' : (it.has ? '🎁 可交付' : '缺 ' + (it.need - have) + ' 份');
        const cls = it.done ? 'done' : (it.has ? 'ready' : 'locked');
        const act = (it.has && !it.done) ? ' data-deliver-comm="' + i + '"' : '';
        const rewardTxt = it.gold + '金' + (it.pill ? ' + ' + STATE.matName(it.pill) : '');
        return `<div class="daily-comm ${cls}"${act} title="需要：${STATE.matName(it.reqMat)}×${it.need}｜持有 ${have}｜报酬：${rewardTxt}">
          <span class="dc-name">${it.desc}</span><span class="dc-status">${status}</span>
        </div>`;
      }).join('');
      const html = `<div class="daily-wrap">
        <div class="daily-left">
          <div class="daily-title">📅 每日目标（第 ${p.day} 天）</div>
          ${goalRows || '<div class="daily-goal">今日无目标</div>'}
          ${streak > 0 ? `<div class="daily-streak">🏮 修行连击 ${streak} 天（连击越高，额外奖励越厚）</div>` : ''}
        </div>
        <div class="daily-right">
          <button class="daily-close" data-daily-close="1" title="关闭返回家园">×</button>
          <div class="daily-title">📜 委托板 · 今日 ${cc.list.length} 条</div>
          ${commRows || '<div class="daily-comm">今日暂无委托</div>'}
          <div class="daily-board-note">灵圃种植、集市买卖、各国探索皆可凑齐委托所需；次日自动刷新。</div>
        </div>
      </div>`;
      const textEl = document.getElementById('story-text');
      if (textEl) { textEl.innerHTML = ''; textEl.innerHTML = html; }
      const box = document.getElementById('story-options');
      if (box) box.innerHTML = '';
      Engine.show('screen-story');
      setTimeout(() => {
        const closeBtn = document.querySelector('[data-daily-close]');
        if (closeBtn) closeBtn.onclick = () => { try { Engine.sfx('click'); } catch (e) {} App.goto('home'); };
        document.querySelectorAll('[data-claim-goal]').forEach(el => {
          el.onclick = () => {
            const gid = el.getAttribute('data-claim-goal');
            const r = STATE.claimDaily(p, gid);
            if (r.ok) { try { Engine.sfx('reward'); } catch (e) {} Engine.log('达成目标，' + r.desc.join('、') + '！', 'gold'); App.renderDailyBoard(p); }
            else Engine.log(r.error || '无法领取', 'evil');
          };
        });
        document.querySelectorAll('[data-deliver-comm]').forEach(el => {
          el.onclick = () => {
            const i = parseInt(el.getAttribute('data-deliver-comm'), 10);
            const r = STATE.claimCommission(p, i);
            if (r.error) Engine.log(r.error, 'evil');
            else { try { Engine.sfx('reward'); } catch (e) {} Engine.log('交付【' + r.name + '】，获得 ' + r.gold + ' 金' + (r.pill ? '与【' + STATE.matName(r.pill) + '】' : '') + '！', 'gold'); App.renderDailyBoard(p); }
          };
        });
      }, 0);
    },
    /* 兜底场景（不再独立使用，仅保留兼容） */
    buildHomeDaily() {
      return { id:'home_daily', title:'【今日事务】', bg:'assets/img/scenes/home-cave.jpg', text:'（请使用合版面板）', options:[] };
    },

    /* ============== 家园·宠物（培育·出战·进化） ============== */
    buildHomePet() {
      const p = App.player;
      if (!p || !p.pets || p.pets.length === 0) {
        return { id:'home_pet', title:'【宠物】', bg:'assets/img/scenes/pet-yard.jpg', text:'你还没有宠物。可前往【探险】或【伏魔窟】寻获宠物幼崽。', options:[{label:'返回家园', next:'home'}] };
      }
      const activeId = p.activePet;
      const fmtNeed = (need) => need ? need.map(item => {
        const opts = (Array.isArray(item[0])) ? item : [item];
        return opts.map(([m, c]) => STATE.matName(m) + '×' + c).join(' 或 ');
      }).join('、') : '已满阶';
      const lines = p.pets.map((pt, i) => {
        // 旧格式宠物可能缺 evoLine/evoStage，给空值保护，避免 TypeError
        const evoName = (pt.evoLine && pt.evoLine[pt.evoStage || 0]) || pt.name;
        const st = STATE.petStats(p, pt);
        const need = STATE.evolveCost(pt);
        const needStr = fmtNeed(need);
        const star = (activeId === pt.id || activeId === pt.race) ? ' ★出战' : '';
        const bond = STATE.petBondInfo(pt);
        const bondTxt = bond.bond > 0 ? ` 羁绊「${bond.name}」${bond.bond}/${bond.max}(+${Math.round(bond.pct * 100)}%)${bond.talent ? '『' + bond.talent + '』' : ''}` : '';
        return `· ${pt.name}【${pt.quality}】${evoName} Lv${pt.level}${star}\n  攻${st.atk} 血${st.hp} 防${st.def}${bondTxt}\n  下一阶材料：${needStr}`;
      }).join('\n');
      const opts = [];
      p.pets.forEach((pt, i) => {
        // 出战切换（V1.3.20：非出战显示"出战"，当前出战显示"取消出战"）
        const isActive = (activeId === pt.id || activeId === pt.race);
        opts.push({ label: (isActive ? '【取消出战】' : '【出战】') + pt.name + (isActive ? '（当前出战）' : ''), tag: '出战',
          onChoose: (pl) => {
            if (isActive) { pl.activePet = null; Engine.log(pt.name + ' 已撤回，不再协战。', 'system'); }
            else { pl.activePet = pt.id || pt.race; Engine.log(`${pt.name} 出战！`, 'good'); }
          }, next: 'home_pet' });
        if (pt.evoStage < pt.evoLine.length - 1) {
          const need = STATE.evolveCost(pt);
          // 实时显示材料是否充足（备选组满足其一即齐备），玩家一眼看清差什么
          let enough = true;
          const missParts = [];
          if (need) {
            need.forEach(item => {
              const opts2 = (Array.isArray(item[0])) ? item : [item];
              const has = opts2.some(([m, c]) => (p.materials[m] || 0) >= c);
              if (!has) { const first = opts2[0]; missParts.push(STATE.matName(first[0]) + '(' + (p.materials[first[0]] || 0) + '/' + first[1] + ')'); enough = false; }
            });
          }
          const label = enough
            ? `【进化】${pt.name} → ${pt.evoLine[pt.evoStage + 1]}（材料齐备）`
            : `【进化】${pt.name} → ${pt.evoLine[pt.evoStage + 1]}（缺：${missParts.join('、')}）`;
          opts.push({ label, tag: '进化', onChoose: (pl) => { const r = STATE.evolvePet(pl, i); if (r.error) Engine.log(r.error, 'evil'); else { Engine.log(`${pt.name} 进化成功 → ${r.name}！`, 'good'); } }, next: 'home_pet' });
        }
        opts.push({ label: `【培养】${pt.name} 提升等级（需灵材）`, tag: '培养', onChoose: (pl) => { const r = STATE.feedPet(pl, i); if (r.error) Engine.log(r.error, 'evil'); else Engine.log(`${pt.name} 升到 Lv${r.level}！`, 'good'); }, next: 'home_pet' });
      });
      const dexCount = (p.petDex || []).length;
      const totalPet = (global.PETS || []).length;
      opts.push({ label: `【图鉴】灵宠图鉴（已收集 ${dexCount}/${totalPet}）`, tag: '图鉴', onChoose: () => { App.showPetDex(); }, next: 'home_pet' });
      opts.push({ label: '返回家园', next: 'home' });
      return { id:'home_pet', title:'【宠物】培育洞府', bg:'assets/img/scenes/pet-yard.jpg', text: lines, options: opts };
    },

    /* ============== 灵宠图鉴（模态弹窗） ============== */
    showPetDex() {
      const p = App.player;
      if (!p) return;
      const all = global.PETS || [];
      const dex = p.petDex || [];
      const qualityName = { N:'凡兽', R:'灵兽', SR:'珍兽', SSR:'神兽', UR:'上古异兽' };
      const qualityColor = { N:'#9a9a9a', R:'#4aa0e0', SR:'#8a5ad8', SSR:'#e8a020', UR:'#e05030' };
      const owned = all.filter(x => dex.indexOf(x.id) >= 0).length;
      const byQuality = {};
      all.forEach(x => { byQuality[x.quality] = (byQuality[x.quality] || 0) + 1; });
      let statLine = `收集进度：${owned}/${all.length}`;
      Object.keys(qualityName).forEach(q => {
        if (byQuality[q]) {
          const gotQ = all.filter(x => x.quality === q && dex.indexOf(x.id) >= 0).length;
          statLine += `　${qualityName[q]} ${gotQ}/${byQuality[q]}`;
        }
      });
      // 当前已拥有的宠物 id 集合（用于判断「已点亮但未拥有」→ 可召唤）
      const ownedIds = (p.pets || []).map(pt => pt.id);
      let cards = '';
      all.forEach(x => {
        const got = dex.indexOf(x.id) >= 0;
        const qc = qualityColor[x.quality] || '#9a9a9a';
        const owned = ownedIds.indexOf(x.id) >= 0;
        let actionHtml = '';
        if (got && !owned) {
          // 已点亮但当前未拥有：可消耗抽命格机会召唤（继承玩法核心）
          actionHtml = `<button class="dex-summon" data-pet="${x.id}">召唤（消耗1次命格机会）</button>`;
        } else if (owned) {
          actionHtml = `<span class="dex-owned">已拥有</span>`;
        }
        if (got) {
          const img = x.img ? `<img src="${x.img}" class="dex-img" alt="${x.name}" />` : '';
          cards += `<div class="dex-card dex-got" style="border-color:${qc}">
            ${img}
            <div class="dex-quality" style="color:${qc}">${qualityName[x.quality] || x.quality}</div>
            <div class="dex-name">${x.name}</div>
            <div class="dex-desc">${x.desc}</div>
            <div class="dex-element">${x.element}系 · ${(global.PET_RACE && global.PET_RACE[x.race] && global.PET_RACE[x.race].name) || ''}</div>
            ${actionHtml}
          </div>`;
        } else {
          cards += `<div class="dex-card dex-locked">
            <div class="dex-quality">???</div>
            <div class="dex-name">未发现</div>
            <div class="dex-desc">尚未寻获此灵兽</div>
          </div>`;
        }
      });
      const chanceText = `命格抽取机会：${p.drawChances || 0}`;
      const html = `<div class="dex-stat">${statLine}　${chanceText}</div><div class="dex-grid">${cards}</div>`;
      Engine.modal('灵宠图鉴', html, [{ label:'关闭', cls:'btn-primary', fn:()=>Engine.closeModal() }]);
      // 绑定召唤按钮
      document.querySelectorAll('.dex-summon').forEach(btn => {
        btn.onclick = () => {
          const petId = btn.getAttribute('data-pet');
          if (!p.drawChances || p.drawChances < 1) { Engine.log('命格抽取机会不足。可通过达成成就、每日目标获得。', 'evil'); return; }
          if (ownedIds.indexOf(petId) >= 0) { Engine.log('已拥有此灵兽。', 'evil'); return; }
          p.drawChances -= 1;
          const pet = STATE.addPet(p, petId, 'partner');   // 继承召唤用伙伴契约
          if (pet) {
            Engine.log(`召唤成功！${pet.name} 归来，与你并肩。`, 'gold');
            Engine.sfx('reward');
            App.showPetDex();   // 刷新图鉴
          } else {
            p.drawChances += 1;
            Engine.log('召唤失败。', 'evil');
          }
        };
      });
    },

    /* ============== 炼丹（弹窗式：分类筛选 + 丹方卡片，参考封面角色筛选） ============== */
    openRefineModal(p) {
      const pl = p || App.player;
      if (!pl) return;
      const allRecipes = STATE.getRecipes().filter(r => r.lv <= pl.lv);
      const catName = (r) => {
        if (r.effect.indexOf('生命') >= 0 || r.effect.indexOf('气血') >= 0) return '回血';
        if (r.effect.indexOf('灵力') >= 0) return '回灵';
        if (r.effect.indexOf('境界') >= 0 || r.effect.indexOf('修为') >= 0) return '修炼';
        return '其他';
      };
      const cats = ['全部', '回血', '回灵', '修炼', '其他'];
      const filter = pl._refineFilter2 || '全部';
      const filtered = filter === '全部' ? allRecipes : allRecipes.filter(r => catName(r) === filter);
      // 分类 tab
      const tabsHtml = cats.map(c => `<span class="refine-tab ${c === filter ? 'active' : ''}" data-cat="${c}">${c}</span>`).join('');
      // 丹方卡片网格
      const cardsHtml = filtered.map(r => {
        const locked = r.locked && !(pl.unlockedRecipes || new Set()).has(r.id);
        const haveAll = Object.entries(r.req).every(([m, n]) => (pl.materials[m] || 0) >= n);
        const matStr = Object.entries(r.req).map(([m, n]) => STATE.matName(m) + '×' + n).join(' ');
        return `<div class="refine-card ${locked ? 'locked' : ''} ${haveAll && !locked ? 'ready' : ''}" data-pill="${r.id}" ${locked ? 'data-locked="1"' : ''}>
          <div class="refine-card-name">${r.name}</div>
          <div class="refine-card-eff">${r.effect}</div>
          <div class="refine-card-mat">${matStr}</div>
          <div class="refine-card-foot">${locked ? '🔒 需探索解锁' : (haveAll ? '✓ 可炼制' : '材料不足')}</div>
        </div>`;
      }).join('') || '<div class="refine-empty">此分类暂无丹方</div>';
      // 灵材栏
      const owned = Object.keys(pl.materials || {}).filter(k => pl.materials[k] > 0);
      const invHtml = owned.length ? owned.map(k => `<span class="refine-mat-chip">${STATE.matName(k)}×${pl.materials[k]}</span>`).join('') : '<span class="refine-empty">（无灵材）</span>';
      Engine.modal('【炼丹】丹房',
        `<div class="refine-wrap">
          <div class="refine-tabs">${tabsHtml}</div>
          <div class="refine-cards">${cardsHtml}</div>
          <div class="refine-divider">—— 拥有灵材 ——</div>
          <div class="refine-mats">${invHtml}</div>
        </div>`,
        [{ label: '关闭', fn: () => Engine.closeModal() }]);
      // 绑定事件
      setTimeout(() => {
        document.querySelectorAll('.refine-tab').forEach(t => {
          t.onclick = () => { pl._refineFilter2 = t.getAttribute('data-cat'); App.openRefineModal(pl); };
        });
        document.querySelectorAll('.refine-card').forEach(c => {
          c.onclick = () => {
            if (c.getAttribute('data-locked')) { Engine.toast('此丹方尚未参悟', 'evil'); return; }
            const res = STATE.refine(pl, c.getAttribute('data-pill'));
            if (res && res.error) { Engine.log(res.error, 'evil'); Engine.toast(res.error, 'evil'); }
            else { Engine.log('炼制成功！', 'good'); Engine.toast('炼制成功', 'gold'); }
            App.openRefineModal(pl);
          };
        });
      }, 0);
    },

    /* ============== 家园·炼丹（左侧炼丹炉背景 + 右侧灵材分类 + 丹方分类选择） ============== */
    buildHomeRefine() {
      const p = App.player;
      if (!p) return { id:'home_refine', title:'炼丹', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const allRecipes = STATE.getRecipes().filter(r => r.lv <= p.lv);
      // 丹方分类（回血 / 回灵力 / 其他）
      const filter = p._refineFilter || 'all';
      const catName = (r) => {
        if (r.effect.indexOf('生命') >= 0) return 'heal';
        if (r.effect.indexOf('灵力') >= 0) return 'mp';
        return 'other';
      };
      const filtered = filter === 'all' ? allRecipes : allRecipes.filter(r => catName(r) === filter);
      const opts = [];
      // 分类筛选按钮（在丹方列表上方）
      opts.push({ label: `【筛选】${filter === 'all' ? '✓' : ''}全部   ${filter === 'heal' ? '✓' : ''}回血   ${filter === 'mp' ? '✓' : ''}回灵   ${filter === 'other' ? '✓' : ''}其他`, tag: '筛选',
        onChoose: (pl) => { pl._refineFilter = filter === 'all' ? 'heal' : (filter === 'heal' ? 'mp' : (filter === 'mp' ? 'other' : 'all')); }, next: 'home_refine' });
      // 丹方列表
      filtered.forEach(r => {
        const locked = r.locked && !(p.unlockedRecipes || new Set()).has(r.id);
        const haveAll = Object.entries(r.req).every(([m, n]) => (p.materials[m] || 0) >= n);
        opts.push({
          label: `【${r.name}】${r.effect}（${Object.entries(r.req).map(([m,n]) => STATE.matName(m)+'×'+n).join(' ')}）${locked ? '🔒' : (haveAll ? '' : '⚠材料不足')}`,
          tag: '丹道',
          disabled: locked,
          onChoose: (pl) => { if (locked) { Engine.log('此丹方尚未参悟，需在探索中获取。', 'evil'); return; } const res = STATE.refine(pl, r.id); if (res.error) Engine.log(res.error, 'evil'); else Engine.log(`炼制成功：${r.name}！`, 'good'); },
          next: 'home_refine'
        });
      });
      opts.push({ label: '返回家园', next: 'home' });
      // 右侧灵材分类显示（各国精材/通用灵材/种子）
      const owned = Object.keys(p.materials || {}).filter(k => p.materials[k] > 0);
      const groupText = [];
      const g1 = owned.filter(k => k.indexOf('MAT-') === 0 && /^MAT-[A-Z]{2}(0[1-6])$/.test(k));   // 各国精材 01-06
      const g2 = owned.filter(k => k.indexOf('MAT-') === 0 && !/^MAT-[A-Z]{2}(0[1-6])$/.test(k));   // 通用/其他灵材
      const g3 = owned.filter(k => k.indexOf('SEED-') === 0);                                        // 种子
      if (g1.length) groupText.push('各国精材：' + g1.map(k => STATE.matName(k) + '×' + p.materials[k]).join('、'));
      if (g2.length) groupText.push('通用灵材：' + g2.map(k => STATE.matName(k) + '×' + p.materials[k]).join('、'));
      if (g3.length) groupText.push('灵种：' + g3.map(k => STATE.matName(k) + '×' + p.materials[k]).join('、'));
      const inv = groupText.join('\n') || '（无灵材）';
      return { id:'home_refine', title:'【炼丹】家园丹房', bg:'assets/img/scenes/home-alchemy.jpg', text: '丹炉烈火正旺，可选择丹方炼制。\n\n[丹方筛选：' + (filter === 'all' ? '全部' : (filter === 'heal' ? '回血' : (filter === 'mp' ? '回灵力' : '其他'))) + ']\n\n—— 拥有灵材（分类）——\n' + inv, options: opts };
    },

    /* ============== 家园·境界突破（心魔试炼入口） ============== */
    buildHomeBreak() {
      const p = App.player;
      if (!p) return { id:'home_break', title:'突破', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const bt = STATE.canBreakthrough(p);
      if (!bt || !bt.can) {
        return { id:'home_break', title:'【突破】', bg:'assets/img/nations/lingpu-home.jpg', text: '境界尚未圆满，尚不能突破。（需 Lv' + (bt ? bt.need : '?') + ' 冲击' + (bt ? bt.next.name : '下一境界') + '）', options:[{label:'返回家园', next:'home'}] };
      }
      return {
        id: 'home_break',
        title: '【突破】心魔试炼',
        bg: 'assets/img/scenes/heart-demon.jpg',
        text: `你即将冲击${bt.next.name}。突破大境界，须先过【道心试炼】，再战心魔——\n道心不稳，则境界难成。`,
        options: [
          { label: '【应劫】先问道心', tag: '境界', next: 'home_daoxin' },
          { label: '暂缓，返回家园', next: 'home' }
        ]
      };
    },

    /* ============== 家园·道心试炼（突破大境界前的问道） ============== */
    buildHomeDaoxin() {
      const p = App.player;
      if (!p) return { id:'home_daoxin', title:'道心试炼', bg:'assets/img/scenes/heart-demon.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const bt = STATE.canBreakthrough(p);
      if (!bt || !bt.can) {
        return { id:'home_daoxin', title:'【道心试炼】', bg:'assets/img/scenes/heart-demon.jpg', text:'境界尚未圆满，无法问道。', options:[{label:'返回家园', next:'home'}] };
      }
      // 随机问道之问
      const questions = [
        { q:'苍茫天地间，一缕仙音自虚空传来——「道友，何为人生？」', a1:'人生如梦，及时行乐', a2:'人生如逆旅，我亦是行人', a3:'人生即修行，苦海无涯' },
        { q:'祖师大能虚影显现，沉声问道——「汝，为何修仙？」', a1:'为长生不老，超脱生死', a2:'为护佑苍生，守护所爱', a3:'为问鼎巅峰，俯瞰众生' },
        { q:'一道心光自天而降，化作人形——「何为道？」', a1:'道即力量，变强即可', a2:'道即本心，明心见性', a3:'道即万物，顺其自然' }
      ];
      const q = RNG.pick(questions);
      p._daoxinQ = q;
      return {
        id: 'home_daoxin',
        title: '【道心试炼】',
        bg: 'assets/img/scenes/heart-demon.jpg',
        text: q.q,
        options: [
          { label: q.a1, tag: '问道', onChoose: (pl) => { STATE.answerDaoxin(pl, 0); }, next: 'home_daoxin_result' },
          { label: q.a2, tag: '问道', onChoose: (pl) => { STATE.answerDaoxin(pl, 1); }, next: 'home_daoxin_result' },
          { label: q.a3, tag: '问道', onChoose: (pl) => { STATE.answerDaoxin(pl, 2); }, next: 'home_daoxin_result' }
        ]
      };
    },

    /* ============== 家园·道心试炼结果 → 心魔试炼 ============== */
    buildHomeDaoxinResult() {
      const p = App.player;
      if (!p) return { id:'home_daoxin_result', title:'道心', bg:'assets/img/scenes/heart-demon.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const stable = p._daoxinStable;
      if (stable) {
        return {
          id: 'home_daoxin_result', title:'【道心试炼】明悟', bg:'assets/img/scenes/heart-demon.jpg',
          text:`你的回答掷地有声，道心澄澈，天地为之共鸣！\n\n心魔威力将因此削弱。接下来，战心魔，证大道！`,
          options: [
            { label: '【入劫】挑战心魔', tag: '境界', onChoose: (pl) => { pl._daoxinBuff = true; }, next: 'battle_heart_demon' },
            { label: '暂缓，返回家园', next: 'home' }
          ]
        };
      }
      return {
        id: 'home_daoxin_result', title:'【道心试炼】蒙尘', bg:'assets/img/scenes/heart-demon.jpg',
        text:`你的回答犹疑不定，道心微尘，心魔乘虚而入，愈发强大！\n\n若执意渡劫，心魔将更凶猛。`,
        options: [
          { label: '【入劫】强行挑战心魔', tag: '境界', onChoose: (pl) => { pl._daoxinBuff = false; }, next: 'battle_heart_demon' },
          { label: '暂缓，返回家园', next: 'home' }
        ]
      };
    },

    /* ============== 家园·探险（分区·按解锁国家） ============== */
    // 探索国家置顶偏好（玩家可自定义各国探索按钮的先后位置）
    _getPinnedNations() {
      try { return JSON.parse(localStorage.getItem('wenda-pinned-nations') || '[]'); }
      catch (e) { return []; }
    },
    _setPinnedNations(arr) {
      try { localStorage.setItem('wenda-pinned-nations', JSON.stringify(arr)); } catch (e) {}
    },

    /* 大地图点击国家 → 弹出选择：进城（主线剧情）/ 周边探险（采集历练） */
    gotoExploreNation(nationId) {
      const p = App.player;
      if (!p) return;
      // 前置校验：有前置条件的国家（如归墟）未满足则拦截
      const preCheck = STATE.checkNationPrereq(p, nationId);
      const isHardLocked = (preCheck && !preCheck.ok);
      if (isHardLocked) {
        Engine.toast(preCheck.hint || '需先完成前置主线', 'evil');
        Engine.log(preCheck.hint || '需先完成前置主线。', 'evil');
        return;
      }
      const nationName = STATE.nationName(nationId);
      const rec = STATE.getNationRecommend(nationId);
      const diff = STATE.getNationDifficulty(p, nationId);
      const typeName = STATE.getNationTypeName(nationId);
      const isCleared = STATE.isNationCleared(p, nationId);
      // 弹窗：进城 or 周边探险（剧情与探索合一：进城可同时推进剧情与拜访所有NPC）
      Engine.modal('前往 ' + nationName, `
        <div class="goto-nation-box">
          <div class="goto-nation-head">
            <span class="goto-nation-type ${typeName === '主线' ? 'main' : 'side'}">${typeName}</span>
            <span class="goto-nation-lv" style="color:${diff.color}">推荐 Lv${rec.lv}（${rec.realm}）· ${diff.name}</span>
          </div>
          <div class="goto-nation-hint">${diff.hint}${isCleared ? '（你已通关此国，可反复进入）' : '（未通关：进城后可与主线NPC对话推进剧情）'}</div>
        </div>`,
        [
          { label: '🏙 进城 · 剧情/探索', cls: 'btn-primary', fn: () => { Engine.closeModal(); App._enterNationMain(nationId); } },
          { label: '🌿 周边探险 · 采集历练', cls: 'btn-secondary', fn: () => { Engine.closeModal(); App._exploreNationAround(nationId); } },
          { label: '取消', cls: 'btn-ghost', fn: () => Engine.closeModal() }
        ]);
    },

    /* 进城：进入该国主线剧情（已通关国家不再重复触发主线） */
    _enterNationMain(nationId) {
      const p = App.player;
      if (!p) return;
      // 前置校验：未满足前置条件（如归墟需先通关跂踵）则拦截
      const preCheck = STATE.checkNationPrereq(p, nationId);
      if (!preCheck.ok) {
        Engine.toast(preCheck.hint || '需先完成前置主线', 'evil');
        Engine.log(preCheck.hint || '前置主线未完成，暂时无法进入。', 'evil');
        return;
      }
      // 该国是否有自由探索场景数据
      const hasExploreData = (typeof EXPLORE !== 'undefined' && EXPLORE[nationId]);
      // 若玩家正处于该国的文字主线剧情中（currentScene 是该国有效文字场景且未通关），
      // 直接回到文字主线继续，而不是跳回探索屏/点触主线开头（避免剧情进度丢失/重置）
      // 用纯通关判断：cleared 含"当前国家恒通关"特判，会导致文字主线进度永远无法恢复
      if (!STATE.isNationCleared(p, nationId) && p.currentScene && p.currentScene.indexOf(nationId) === 0) {
        const csDef = (global.ALL_SCENES && ALL_SCENES[p.currentScene]) || QINGQIU_SCENES[p.currentScene];
        if (csDef && !csDef.battle && !csDef.trap) {
          App.goto(p.currentScene);
          return;
        }
      }
      // 进入该国自由探索（完整探索屏；未通关时探索屏内合并显示剧情 NPC）
      if (hasExploreData) {
        App.enterExplore(nationId);
        return;
      }
      App._exploreNationAround(nationId);
    },

    /* 周边探险：优先进入点触探索屏（有探索数据的国家），否则走传统采集 */
    _exploreNationAround(nationId) {
      const p = App.player;
      if (!p) return;
      // 前置校验：未满足前置条件（如归墟）则拦截
      const preCheck = STATE.checkNationPrereq(p, nationId);
      if (!preCheck.ok) {
        Engine.toast(preCheck.hint || '需先完成前置主线', 'evil');
        return;
      }
      // 检查是否已解锁（可探索）：无前置国家默认解锁，前置国家需满足前置条件
      const { unlocked } = STATE.unlockedNations(p);
      if (unlocked.indexOf(nationId) < 0 && nationId !== 'qingqiu' && p.nation !== nationId) {
        const pre = STATE.getNationPrereq(nationId);
        Engine.toast(pre ? (pre.hint || '需先完成前置主线') : '该国尚未解锁，无法周边探险', 'evil');
        return;
      }
      // 周边探险 = 原采集历练（不进点触城池）
      // 同步切换当前国家：任务栏/恶念/伏魔窟图纸等按 p.nation 派生，若不切换会一直显示旧国家
      // 注意：不能直接调 STATE.enterNation（它会覆盖 currentScene 破坏文字主线进度记录），手动同步关键字段
      try {
        p.nation = nationId;
        if (!p.nationEvil) p.nationEvil = {};
        if (!p.nationEvil.hasOwnProperty(nationId)) p.nationEvil[nationId] = 0;
        if (!p.favor) p.favor = {};
      } catch (e) {}
      p._exploreNation = nationId;
      App.goto('home_explore_go');
    },

    /* ============== 探索点触交互引擎 ============== */
    /* 进入某国的点触探索屏（合并渲染：自由探索 NPC + 未通关时的剧情 NPC） */
    enterExplore(nationId) {
      const p = App.player;
      if (!p) return;
      STATE.recordTome(p, 'NAT:' + nationId);   // 绘卷：记录到访过的国家
      // 清理旧的探索/点触状态（避免跨国家状态污染）
      App._explore = null;
      App._story = null;
      // 清除"在点触主线"标记（跨国家进入新国家时，避免任务栏"继续剧情"误跳回上一个国家的剧情）
      // 注意：_storyState（各国剧情断点）按 nationId 区分，天然跨国家安全，予以保留
      delete p._inStory;
      const data = EXPLORE[nationId];
      if (!data) { App.goto('home'); return; }
      // 切换当前国家（保证任务面板/恶念/探索都按国家更新）
      // 注意：不调用 STATE.enterNation（它会覆盖 currentScene 破坏文字主线进度），仅同步国家相关字段
      try {
        p.nation = nationId;
        if (!p.nationEvil) p.nationEvil = {};
        if (!p.nationEvil.hasOwnProperty(nationId)) p.nationEvil[nationId] = 0;
        if (!p.favor) p.favor = {};
      } catch (e) {}
      p._exploreNation = nationId;
      // 判断该国是否未通关（未通关 → 探索屏中显示剧情 NPC 入口，可继续/开始剧情）
      // 注意：必须用 isNationCleared（纯通关标记），不能用 unlockedNations.cleared
      // （cleared 含"当前国家恒通关"特判，会导致本国的剧情 NPC 永远不显示——用户反复反馈的根因）
      let inStoryLine = null;
      try {
        if (!STATE.isNationCleared(p, nationId)) {
          // 未通关：若有进行中的点触主线断点则从该处继续；否则从第 0 幕开始
          if (p._storyState && p._storyState.nationId === nationId) {
            inStoryLine = { startIdx: p._storyState.idx || 0 };
          } else if (data.story && data.story.length) {
            inStoryLine = { startIdx: 0 };
          }
        }
      } catch (e) {}
      App._explore = { nationId, data, sceneIdx: 0, inStoryLine, p };
      // 记录"当前在探索屏剧情中"：家园「返回剧情」据此回到本探索屏（而非 currentScene 文字场景）
      // 有剧情线时设置 _inStory（表示该国剧情/探索进行中）；已通关或无数剧时删除
      if (inStoryLine) p._inStory = { nationId, idx: inStoryLine.startIdx || 0 };
      else delete p._inStory;
      App.renderExploreScene();
      Engine.show('screen-explore');
    },

    /* 渲染探索屏的当前场景 */
    renderExploreScene() {
      const ex = App._explore;
      if (!ex) return;
      App._setHeaderVisible(false);   // 隐藏顶部状态栏，避免国家名重叠
      const scene = ex.data.scenes[ex.sceneIdx];
      // 设置背景图
      Engine.setBg(scene.bg);
      // 顶部位置名
      document.getElementById('explore-location').textContent = ex.data.name + ' · ' + scene.name;
      // 场景切换条（多场景探索）
      const scenesBar = document.getElementById('explore-scenes');
      if (scenesBar) {
        scenesBar.innerHTML = ex.data.scenes.map((sc, i) => {
          return `<span class="explore-scene-btn ${i === ex.sceneIdx ? 'active' : ''}" data-idx="${i}">${sc.name.replace(ex.data.name + ' · ', '')}</span>`;
        }).join('');
        scenesBar.querySelectorAll('.explore-scene-btn').forEach(btn => {
          btn.onclick = () => {
            ex.sceneIdx = parseInt(btn.dataset.idx);
            App.renderExploreScene();
          };
        });
      }
      // 渲染热点（NPC 有立绘则显示立绘小图，否则用图标——与点触主线一致）
      const canvas = document.getElementById('explore-canvas');
      canvas.innerHTML = '';
      scene.hotpoints.forEach(hp => {
        const dot = document.createElement('div');
        const isNpc = hp.type === 'npc';
        dot.className = 'explore-hotpoint hp-' + hp.type + (isNpc ? ' hp-main' : '');
        dot.style.left = hp.x + '%';
        dot.style.top = hp.y + '%';
        if (hp.portrait) {
          dot.innerHTML = `<img class="hp-portrait" src="${hp.portrait}" alt=""><span class="hp-label">${hp.name}</span>`;
        } else {
          dot.innerHTML = `<span class="hp-icon">${hp.icon}</span><span class="hp-label">${hp.name}</span>`;
        }
        dot.onclick = () => App.onHotpointClick(hp);
        canvas.appendChild(dot);
      });
      // 未通关国家：合并渲染剧情 NPC（主线入口，高亮标记「主线」）
      // 设计：剧情 NPC 固定在当前探索场景的左上/右侧空白区（不与任何普通 NPC/彩蛋重叠），
      // 玩家进入探索屏即可见、点击即继续剧情，不会与商人等普通 NPC 混淆或遮挡
      if (ex.inStoryLine && ex.data.story && ex.data.story.length) {
        const stIdx = Math.min(ex.inStoryLine.startIdx || 0, ex.data.story.length - 1);
        const storyScene = ex.data.story[stIdx];
        if (storyScene) {
          const mainNpcs = (storyScene.npcs || []).filter(n => n.main || !n.ambience);
          // 剧情 NPC 固定位置：按"幕次"取黄金位（每幕错开，避免多个主线 NPC 完全重叠）
          const anchorSlots = [
            { x: 12, y: 30 }, { x: 85, y: 30 }, { x: 50, y: 78 }, { x: 12, y: 70 }, { x: 85, y: 70 },
            { x: 12, y: 12 }, { x: 85, y: 12 }, { x: 50, y: 12 }
          ];
          mainNpcs.forEach((npc, i) => {
            // 找一个不与当前场景任何热点重叠的固定位置
            const slot = anchorSlots[(stIdx + i) % anchorSlots.length];
            let nx = slot.x, ny = slot.y;
            // 若该锚点被热点占用，微调错开
            const overlaps = () => scene.hotpoints.some(hp => Math.abs(hp.x - nx) < 10 && Math.abs(hp.y - ny) < 10);
            if (overlaps()) { nx = Math.max(4, Math.min(96, nx + 14)); ny = Math.max(4, Math.min(96, ny + 10)); }
            if (overlaps()) { nx = Math.max(4, Math.min(96, nx - 20)); ny = Math.max(4, Math.min(96, ny + 12)); }
            const dot = document.createElement('div');
            dot.className = 'explore-hotpoint hp-npc hp-main hp-story';
            dot.style.left = nx + '%';
            dot.style.top = ny + '%';
            dot.style.zIndex = '3';   // 剧情 NPC 高于普通热点，但位置已避开重叠
            dot.title = '主线剧情 · 点击继续';
            if (npc.portrait) {
              dot.innerHTML = `<img class="hp-portrait" src="${npc.portrait}" alt=""><span class="hp-label">主线 · ${npc.name}</span>`;
            } else {
              dot.innerHTML = `<span class="hp-icon">${npc.icon || '⭐'}</span><span class="hp-label">主线 · ${npc.name}</span>`;
            }
            dot.onclick = () => {
              // 记录从探索屏进入剧情的位置，直接进点触主线对话
              // 注意：renderExploreScene 闭包内没有局部 p，须用 ex.p（enterExplore 时存入的玩家引用）
              const curP = ex.p || App.player;
              App._story = { nationId: ex.nationId, data: ex.data, idx: stIdx, lineIdx: 0, curNpc: npc, p: curP };
              App._story.p = curP;
              curP._inStory = { nationId: ex.nationId, idx: stIdx };
              curP._storyState = { nationId: ex.nationId, idx: stIdx };
              App.showStoryLine();
            };
            canvas.appendChild(dot);
          });
          // 探索屏位置栏显示主线提示
          document.getElementById('explore-location').textContent = ex.data.name + ' · ' + scene.name + ' · 主线：' + (storyScene.location || '推进剧情');
        }
      }
      // 清空对话区 + 对话立绘（避免上一个故事/探索场景的立绘残留）
      document.getElementById('explore-dialog').classList.remove('show');
      const portraitEl = document.getElementById('explore-dialog-portrait');
      if (portraitEl) { portraitEl.style.backgroundImage = ''; portraitEl.style.display = 'none'; }
      // 刷新任务栏（探索屏也显示当前国家指引）
      try { if (typeof Engine !== 'undefined' && Engine.refreshQuestGuide) Engine.refreshQuestGuide(ex.p); } catch (e) {}
    },

    /* 点击热点 → 弹出对话（显示说话者立绘） */
    onHotpointClick(hp) {
      const dialog = document.getElementById('explore-dialog');
      document.getElementById('explore-dialog-name').textContent = hp.dialog.name;
      document.getElementById('explore-dialog-text').textContent = hp.dialog.text;
      // 立绘：热点有 portrait 则显示（商人/角色等），否则隐藏
      const portraitEl = document.getElementById('explore-dialog-portrait');
      if (portraitEl) {
        if (hp.portrait) {
          portraitEl.style.backgroundImage = `url('${hp.portrait}')`;
          portraitEl.style.display = '';
        } else {
          portraitEl.style.backgroundImage = '';
          portraitEl.style.display = 'none';
        }
      }
      const actionsBox = document.getElementById('explore-dialog-actions');
      actionsBox.innerHTML = '';
      (hp.actions || []).forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'btn explore-action';
        btn.textContent = act.label;
        btn.onclick = () => App.onExploreAction(hp, act);
        actionsBox.appendChild(btn);
      });
      dialog.classList.add('show');
    },

    /* 处理探索动作 */
    onExploreAction(hp, act) {
      const p = App._explore && App._explore.p;
      const type = act.type;
      if (type === 'close') {
        document.getElementById('explore-dialog').classList.remove('show');
        return;
      }
      if (type === 'goStory' || type === 'goNation') {
        // 探索屏推进剧情：进入该国点触主线（未通关）或文字主线
        const nationId = (App._explore && App._explore.nationId) || p.nation;
        App.enterStory(nationId);
        return;
      }
      if (type === 'text') {
        document.getElementById('explore-dialog-name').textContent = hp.dialog.name;
        document.getElementById('explore-dialog-text').textContent = act.text;
        // 简化为继续阅读
        App._renderExploreSimpleAction(act);
        return;
      }
      if (type === 'gossip') {
        // 打探消息：优先显示 NPC 自己的话（act.text），否则动态生成该国传闻 + 当前NPC名
        const nationId = (App._explore && App._explore.nationId) || 'qingqiu';
        if (act && act.text) {
          document.getElementById('explore-dialog-name').textContent = hp.dialog.name;
          document.getElementById('explore-dialog-text').textContent = act.text;
        } else {
          const rumor = App.gossipInfo(nationId);
          document.getElementById('explore-dialog-name').textContent = hp.dialog.name;
          document.getElementById('explore-dialog-text').textContent = hp.dialog.name + '压低声音，凑近说道：「' + rumor + '」';
        }
        if (p) STATE.trackWeekly(p, 'explore');
        App._renderExploreSimpleAction(act);
        return;
      }
      if (type === 'story') {
        document.getElementById('explore-dialog-text').textContent = act.text;
        if (act.reward === 'rumor') {
          if (p) STATE.trackWeekly(p, 'explore');
          Engine.toast('获得线索', 'gold');
        }
        App._renderExploreSimpleAction(act);
        return;
      }
      if (type === 'quiz') {
        // 答题需求：判断对错，对则奖励 + 正确提示，错则错误提示（可重试，不卡剧情）
        // 正确性判定：数据中正确选项的 correct 字段含完整答对话术（非空），错误选项 correct 为空串
        if (p) {
          const exNation = (App._explore && App._explore.nationId) || p.nation || 'qingqiu';
          const key = (act.rewardKey || (exNation + '_' + hp.id));
          const answered = !!(p._quizAnswered && p._quizAnswered[key]);
          if (act.correct && act.correct.trim()) {
            if (act.reward.exp) { p.realm.exp = (p.realm.exp || 0) + act.reward.exp; const lu = STATE.checkLevelUp(p); if (lu) Engine.log('境界提升！', 'good'); }
            if (act.reward.gold) { p.gold = (p.gold || 0) + act.reward.gold; }
            Engine.toast('答对了！获得奖励', 'gold');
            if (!p._quizAnswered) p._quizAnswered = {};
            p._quizAnswered[key] = true;
            if (act.clueNation && act.clueText) {
              if (!p._clues) p._clues = {};
              if (!p._clues[act.clueNation]) p._clues[act.clueNation] = [];
              if (p._clues[act.clueNation].indexOf(act.clueText) < 0) p._clues[act.clueNation].push(act.clueText);
            }
            document.getElementById('explore-dialog-text').textContent = act.correct || '你答对了！';
          } else {
            document.getElementById('explore-dialog-text').textContent = act.wrong || '答错了，再想想。';
          }
        }
        App._renderExploreSimpleAction(act);
        return;
      }
      if (type === 'battle') {
        // 战斗需求：生成敌人进入战斗，胜利后奖励（奖励在战斗胜利回调发放）
        if (p) {
          const lv = p.lv || 1;
          const exNation = (App._explore && App._explore.nationId) || p.nation || 'qingqiu';
          // 补齐 state/def/lv/bg 等战斗引擎必需字段（修复：猎户等探索战斗无法触发的 bug）
          const enemy = {
            name: act.enemyHint || '凶兽',
            state: { id: 'wild', name: '凶兽', mul: 1.0, aware: 'aware' },
            element: (App._explore && App._explore.data ? App._explore.data.element : '金') || '金',
            hp: 40 + lv * 8, maxHp: 40 + lv * 8,
            def: Math.max(2, Math.floor(5 + lv * 1.2)),
            atk: 5 + lv * 2,
            lv: lv,
            block: 0, burn: 0, slow: 0, bind: 0, stun: 0, seal: 0, charging: 0, chargeCd: 2,
            bg: 'assets/img/scenes/battlefield.jpg',
            _questReward: act.reward, _questKey: (act.rewardKey || (exNation + '_' + hp.id)),
            _questDoneText: act.text || '你完成了委托。'
          };
          p._pendingEnemy = enemy;
          p._pendingEnemyFromExplore = true;   // 标记：来自探索需求战斗
          App.goto('home_wild_battle');
        }
        return;
      }
      if (type === 'give') {
        // NPC 需求材料：玩家给予指定材料，NPC 回馈奖励 + 彩蛋/线索（问题6）
        if (p && act.needItem) {
          const need = act.needItem;
          const have = (p.materials && p.materials[need.id]) || 0;
          if (have >= (need.n || 1)) {
            STATE.removeMaterial(p, need.id, need.n || 1);
            const exNation = (App._explore && App._explore.nationId) || p.nation || 'qingqiu';
            const key = (act.rewardKey || (exNation + '_' + hp.id));
            if (act.giveItem) STATE.addMaterial(p, act.giveItem.id, act.giveItem.n || 1);
            if (act.giveExp) { p.realm.exp = (p.realm.exp || 0) + act.giveExp; const lu = STATE.checkLevelUp(p); if (lu) Engine.log('境界提升！', 'good'); }
            if (act.giveGold) { p.gold = (p.gold || 0) + act.giveGold; }
            if (!p._clues) p._clues = {};
            if (act.clueNation && act.clueText) {
              const cn = act.clueNation;
              if (!p._clues[cn]) p._clues[cn] = [];
              if (p._clues[cn].indexOf(act.clueText) < 0) p._clues[cn].push(act.clueText);
            }
            STATE.addNpcReward(p, key);
            Engine.toast('对方接过材料，很是感激', 'good');
          } else {
            const haveN = have;
            const needN = need.n || 1;
            Engine.toast('还缺少「' + (need.name || STATE.matName(need.id)) + '」（持有 ' + haveN + '/' + needN + '）', 'evil');
            return;
          }
        }
        document.getElementById('explore-dialog-text').textContent = act.text;
        App._renderExploreSimpleAction(act);
        return;
      }
      if (type === 'reward') {
        if (p && act.item) {
          // 奖励上限：彩蛋类 rewardLimit 默认1次/天，普通奖励默认3次/天
          const exNation = (App._explore && App._explore.nationId) || p.nation || 'qingqiu';
          const key = (act.rewardKey || (exNation + '_' + hp.id));
          const limit = act.rewardLimit || 3;
          if (STATE.canNpcReward(p, key, limit)) {
            STATE.addMaterial(p, act.item, 1);
            STATE.addNpcReward(p, key);
            Engine.log('你在探索中获得「' + act.itemName + '」×1。', 'good');
            Engine.toast('获得 ' + act.itemName, 'good');
          } else {
            Engine.log('今日已从此处获得过不少' + (act.itemName || '馈赠') + '了，明日再来吧。', 'system');
            Engine.toast('今日份已领完，明日再来', 'system');
          }
        }
        document.getElementById('explore-dialog-text').textContent = act.text;
        App._renderExploreSimpleAction(act);
        return;
      }
      if (type === 'easter') {
        // 彩蛋：一次性（发现后标记，不再重复给奖励）
        const exNation = (App._explore && App._explore.nationId) || p.nation || 'qingqiu';
        const key = exNation + '_' + hp.id;
        const alreadyFound = !!(p && p._easters && p._easters[key]);
        if (p) {
          if (!p._easters) p._easters = {};
          p._easters[key] = true;
          STATE.trackWeekly(p, 'explore');
        }
        if (!alreadyFound) {
          Engine.toast('✨ 发现彩蛋！', 'gold');
        } else {
          Engine.log('这里你已仔细探查过了。', 'system');
        }
        document.getElementById('explore-dialog-text').textContent = act.text;
        App._renderExploreSimpleAction(act);
        return;
      }
      if (type === 'shop') {
        // 商人：打开商店（复用现有商店或简单商品列表）
        App._openExploreShop(hp);
        return;
      }
    },

    /* 简化：显示"继续"按钮关闭对话 */
    _renderExploreSimpleAction(act) {
      const actionsBox = document.getElementById('explore-dialog-actions');
      actionsBox.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'btn explore-action btn-primary';
      btn.textContent = '继续';
      btn.onclick = () => document.getElementById('explore-dialog').classList.remove('show');
      actionsBox.appendChild(btn);
    },

    /* 各国特产商品（商人售卖当国特定灵材） */
    _nationShopGoods(nationId) {
      // 各国材料前缀 + 特产名（前 3 种材料 + 1 种通用灵材）
      const prefMap = { qingqiu:'C', yumin:'FS', yanhuo:'YH', xuanyuan:'JG', xuangu:'XG', huantou:'HT', sanshou:'SS', nieer:'NE', daren:'DR', baimin:'BM', changgu:'CG', zhurao:'ZR', jiaojing:'JJ', rouli:'RL', shenmu:'SM', wuchang:'WC', yimu:'YM', jiexiong:'JX', qizhong:'QZ', guixu:'GX' };
      const pref = prefMap[nationId] || 'C';
      const goods = [];
      // 该国 01/02/03 三种专属灵材（价格递增，01 最便宜）
      for (let i = 1; i <= 3; i++) {
        const matId = 'MAT-' + pref + '0' + i;
        const name = STATE.matName(matId);
        // 排除不存在的材料（matName 对未知 id 返回 id 本身）
        if (name && name !== matId) {
          goods.push({ name: name, price: 30 + i * 20, item: matId, desc: STATE.nationName(nationId) + '特有灵材。' });
        }
      }
      // 该国 06（转职稀有材料）
      const mat6 = 'MAT-' + pref + '06';
      const name6 = STATE.matName(mat6);
      if (name6 && name6 !== '未知') {
        goods.push({ name: name6, price: 120, item: mat6, desc: STATE.nationName(nationId) + '的稀有转职灵材。' });
      }
      // 通用灵材（织梦丝/月光草等）
      goods.push({ name: '织梦丝', price: 60, item: 'MAT-C08', desc: '通用灵材，蕴含记忆之力。' });
      return goods;
    },

    /* 商人商店（按国家售该国特产灵材；点触主线 story 中也能购买；显示商人立绘） */
    _openExploreShop(hp) {
      const p = (App._explore && App._explore.p) || (App._story && App._story.p);
      const nationId = (App._explore && App._explore.nationId) || (App._story && App._story.nationId) || (p && p.nation) || 'qingqiu';
      const nationName = STATE.nationName(nationId);
      const goods = App._nationShopGoods(nationId);
      // 商人立绘：优先当前对话的商人（探索屏热点或点触主线当前NPC），其次通用商人立绘
      const portrait = (hp && hp.portrait) || (App._story && App._story.curNpc && App._story.curNpc.portrait) || 'assets/img/npc/npc_shangren.jpg';
      const headHtml = `<div class="shop-head"><img class="shop-head-img" src="${portrait}" alt="商人"><span>${nationName}商人的货摊</span></div>`;
      const html = headHtml + goods.map(g => `
        <div class="shop-item">
          <span class="shop-item-name">${g.name}</span>
          <span class="shop-item-desc">${g.desc}</span>
          <button class="btn shop-buy" data-price="${g.price}" data-item="${g.item || ''}">${g.price} 金币</button>
        </div>`).join('');
      Engine.modal(nationName + '商人的货摊', '<div class="shop-list">' + html + '</div><div class="shop-tip">当前金币：' + ((p && p.gold) || 0) + '</div>', [
        { label: '关闭', fn: () => Engine.closeModal() }
      ]);
      // 绑定购买（一次性 flag 防极快双击重复扣款；模态框关闭后按钮仍挂 DOM）
      setTimeout(() => {
        document.querySelectorAll('.shop-buy').forEach(b => {
          b.onclick = () => {
            if (b._bought) return;
            b._bought = true;
            const price = parseInt(b.dataset.price);
            const item = b.dataset.item;
            if (!p || (p.gold || 0) < price) { Engine.toast('金币不足', 'evil'); b._bought = false; return; }
            p.gold -= price;
            if (item) STATE.addMaterial(p, item, 1);
            Engine.toast('购买成功！', 'good');
            Engine.closeModal();
          };
        });
      }, 0);
    },

    /* 离开探索屏（回家后剧情暂停，进度保存到玩家数据） */
    /* 控制顶部状态栏显隐（探索屏沉浸式时隐藏，避免国家名与血量条重叠） */
    _setHeaderVisible(show) {
      try {
        const header = document.querySelector('header');
        if (header) header.style.display = show ? '' : 'none';
      } catch (e) {}
    },

    leaveExplore() {
      const st = App._story;
      const ex = App._explore;
      // 保存点触主线进度（兼容两种来源）：
      // 1) 优先用探索屏的剧情进度（inStoryLine.startIdx）——那是玩家当前"看到"的主线位置
      // 2) 否则若处于点触剧情对话中（App._story）→ 用对话当前幕
      if (ex && ex.inStoryLine && ex.p) {
        ex.p._storyState = { nationId: ex.nationId, idx: ex.inStoryLine.startIdx || 0 };
      } else if (st && st.p) {
        st.p._storyState = { nationId: st.nationId, idx: st.idx };
      }
      App._explore = null;
      App._story = null;
      App._setHeaderVisible(true);
      App.goto('home');
    },

    /* ============== 点触化主线引擎（玩法驱动：点人对话推进剧情） ============== */
    /* 进入某国的点触化主线（该国 story 数据存在时） */
    enterStory(nationId) {
      const p = App.player;
      if (!p) return;
      // 清理旧的探索/点触状态（避免跨国家状态污染：旧国家变暗/剧情重置/npc消失）
      App._explore = null;
      App._story = null;
      const data = EXPLORE[nationId];
      if (!data || !data.story || !data.story.length) {
        // 无点触主线数据：回退到原文字主线
        const entryScene = (nationId === 'qingqiu') ? 'q01_02_accept' : (nationId + '_entry');
        App.goto(entryScene);
        return;
      }
      // 切换当前国家（点触主线期间 p.nation 应与该国一致）
      try { STATE.enterNation(p, nationId); } catch (e) {}
      // 战斗回退点只对同一国家有效；切换到别国时清除旧国残留（避免回退点跨国家误用）
      if (p._battleBackStory && p._battleBackStory.nationId !== nationId) {
        delete p._battleBackStory;
      }
      // 恢复进度（回家后剧情暂停，回来继续；战斗回退点优先）
      let startIdx = 0;
      if (p._battleBackStory && p._battleBackStory.nationId === nationId) {
        startIdx = p._battleBackStory.idx || 0;
        delete p._battleBackStory;
      } else if (p._storyState && p._storyState.nationId === nationId) {
        startIdx = p._storyState.idx || 0;
      }
      App._story = { nationId, data, idx: startIdx, lineIdx: 0, curNpc: null, p };
      // 记录"当前处于点触主线"，使家园「返回剧情」能回到点触主线而非跳场景
      p._inStory = { nationId: nationId, idx: startIdx };
      App.renderStoryScene();
      Engine.show('screen-explore');
    },

    /* 渲染点触化主线的当前场景 */
    renderStoryScene() {
      const st = App._story;
      if (!st) return;
      App._setHeaderVisible(false);   // 隐藏顶部状态栏，避免国家名重叠
      const scene = st.data.story[st.idx];
      if (!scene) { App.leaveExplore(); return; }
      // 背景图
      Engine.setBg(scene.bg);
      // 位置名
      document.getElementById('explore-location').textContent = scene.location || st.data.name;
      // 场景切换条隐藏（点触主线不用场景切换条）
      const scenesBar = document.getElementById('explore-scenes');
      if (scenesBar) scenesBar.innerHTML = '';
      // 渲染 NPC 热点（主线 NPC 高亮 + 氛围 NPC 弱化）
      const canvas = document.getElementById('explore-canvas');
      canvas.innerHTML = '';
      const mainNpcs = (scene.npcs || []).filter(n => n.main || !n.ambience);
      (scene.npcs || []).forEach(npc => {
        const isMain = npc.main || !npc.ambience;
        const dot = document.createElement('div');
        dot.className = 'explore-hotpoint hp-npc ' + (isMain ? 'hp-main' : 'hp-ambient');
        dot.style.left = npc.x + '%';
        dot.style.top = npc.y + '%';
        // 有立绘则显示立绘小图，否则用图标
        if (npc.portrait) {
          dot.innerHTML = `<img class="hp-portrait" src="${npc.portrait}" alt=""><span class="hp-label">${npc.name}</span>`;
        } else {
          dot.innerHTML = `<span class="hp-icon">${npc.icon || '👤'}</span><span class="hp-label">${npc.name}</span>`;
        }
        dot.onclick = () => App.talkToNpc(npc);
        canvas.appendChild(dot);
      });
      // 清空对话区
      document.getElementById('explore-dialog').classList.remove('show');
      // 对话立绘占位清空并隐藏（避免上一个对话场景的立绘残留）
      const storyPortraitEl = document.getElementById('explore-dialog-portrait');
      if (storyPortraitEl) { storyPortraitEl.style.backgroundImage = ''; storyPortraitEl.style.display = 'none'; }
      // 恢复断点/进入新场景：若尚未开始对话，自动提示"与谁对话继续"
      if (!st.curNpc && mainNpcs.length) {
        const hintNpc = mainNpcs[0];
        document.getElementById('explore-location').textContent = (scene.location || st.data.name) + ' · 下一步：与' + hintNpc.name + '对话';
        // 高亮该 NPC 引导
        const dots = canvas.querySelectorAll('.hp-npc');
        dots.forEach(d => {
          if (d.querySelector('.hp-label') && d.querySelector('.hp-label').textContent === hintNpc.name) {
            d.classList.add('hp-current');
          }
        });
      }
      // 刷新任务栏（显示当前国家的点触剧情进度 + 线索指引）
      try { if (typeof Engine !== 'undefined' && Engine.refreshQuestGuide) Engine.refreshQuestGuide(st.p); } catch (e) {}
    },

    /* 点击 NPC 开始对话链 */
    talkToNpc(npc) {
      const st = App._story;
      if (!st) return;
      st.curNpc = npc;
      st.lineIdx = 0;
      App.showStoryLine();
    },

    /* 显示当前对话行（带说话者立绘） */
    showStoryLine() {
      const st = App._story;
      const npc = st.curNpc;
      if (!npc || !npc.lines) return;
      const line = npc.lines[st.lineIdx];
      if (!line) { App.showStoryChoices(); return; }
      // 说话者：旁白用剧情标题，否则用 NPC 立绘
      const speaker = line.name || npc.name;
      document.getElementById('explore-dialog-name').textContent = speaker;
      document.getElementById('explore-dialog-text').textContent = line.text;
      // 立绘：说话者立绘（line.portrait > npc.portrait）；旁白显示通用立绘或留空
      const portraitEl = document.getElementById('explore-dialog-portrait');
      const portrait = (line.portrait || npc.portrait || '');
      if (portrait && !speaker.startsWith('（')) {
        portraitEl.style.backgroundImage = `url('${portrait}')`;
        portraitEl.style.display = '';
      } else {
        portraitEl.style.backgroundImage = '';
        portraitEl.style.display = 'none';
      }
      const actionsBox = document.getElementById('explore-dialog-actions');
      actionsBox.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'btn explore-action btn-primary';
      btn.textContent = (st.lineIdx < npc.lines.length - 1) ? '继续 ▼' : '继续';
      btn.onclick = () => {
        st.lineIdx++;
        if (st.lineIdx >= npc.lines.length) App.showStoryChoices();
        else App.showStoryLine();
      };
      actionsBox.appendChild(btn);
      document.getElementById('explore-dialog').classList.add('show');
    },

    /* 对话链结束，显示抉择（保留立绘） */
    showStoryChoices() {
      const st = App._story;
      const npc = st.curNpc;
      const portraitEl = document.getElementById('explore-dialog-portrait');
      if (npc && npc.portrait) {
        portraitEl.style.backgroundImage = `url('${npc.portrait}')`;
        portraitEl.style.display = '';
      } else {
        portraitEl.style.backgroundImage = '';
        portraitEl.style.display = 'none';
      }
      const choices = npc.choices || [];
      const actionsBox = document.getElementById('explore-dialog-actions');
      actionsBox.innerHTML = '';
      choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'btn explore-action';
        btn.textContent = ch.label;
        btn.onclick = () => App.chooseStoryOption(ch);
        actionsBox.appendChild(btn);
      });
      document.getElementById('explore-dialog').classList.add('show');
    },

    /* 选择抉择：执行效果并推进（支持战斗动作：shop/reward/reply 等） */
    chooseStoryOption(ch) {
      const st = App._story;
      const p = st && st.p;
      if (!p) return;
      // 商人商店
      if (ch.type === 'shop') {
        App._openExploreShop(null);
        return;
      }
      // 打探消息（按国家区分 + 隐藏信息）
      if (ch.type === 'gossip') {
        const npcName = (st.curNpc ? st.curNpc.name : '商人');
        if (ch && ch.text) {
          document.getElementById('explore-dialog-name').textContent = npcName;
          document.getElementById('explore-dialog-text').textContent = ch.text;
        } else {
          const rumor = App.gossipInfo(st.nationId);
          document.getElementById('explore-dialog-name').textContent = npcName;
          document.getElementById('explore-dialog-text').textContent = npcName + '压低声音，凑近说道：「' + rumor + '」';
        }
        App._renderExploreSimpleAction(null);
        return;
      }
      // 特定角色专属彩蛋：非指定角色只给普通反馈，不触发真奖励
      if (ch.charOnly && p.charId && ch.charOnly.indexOf(p.charId) < 0) {
        // 其他角色：普通互动，无奖励
        document.getElementById('explore-dialog-name').textContent = (st.curNpc ? st.curNpc.name : '');
        document.getElementById('explore-dialog-text').textContent = ch.plainText || '（对方看了看你，似乎欲言又止，最终只是笑了笑。）';
        App._renderExploreSimpleAction(null);
        return;
      }
      // 获得物品（氛围 NPC 的奖励，受每日上限约束）
      if (ch.type === 'reward' && ch.item) {
        const rewardKey = (ch.rewardKey || (st.nationId + '_' + (st.curNpc ? st.curNpc.id : 'npc')));
        const rewardLimit = ch.rewardLimit || 3;   // 每周期最多可获数
        if (STATE.canNpcReward(p, rewardKey, rewardLimit)) {
          STATE.addMaterial(p, ch.item, 1);
          STATE.addNpcReward(p, rewardKey);
          Engine.log('获得「' + (ch.itemName || ch.item) + '」×1。', 'good');
          Engine.toast('获得 ' + (ch.itemName || ch.item), 'good');
        } else {
          Engine.log('今日已从这位 ' + (st.curNpc ? st.curNpc.name : 'NPC') + ' 处获得过不少' + (ch.itemName || '馈赠') + '了，明日再来吧。', 'system');
          Engine.toast('今日份已领完，明日再来', 'system');
        }
      }
      // 主线奖励（问题7）：选项可携带 reward/exp/材料
      if (ch.reward) {
        const r = ch.reward;
        if (r.exp) { p.realm.exp = (p.realm.exp || 0) + r.exp; Engine.log('修为 +' + r.exp, 'good'); const lu = STATE.checkLevelUp(p); if (lu) Engine.log('境界提升至 Lv' + lu[lu.length-1] + '！', 'good'); }
        if (r.gold) { p.gold = (p.gold || 0) + r.gold; Engine.log('金币 +' + r.gold, 'good'); }
        if (r.items) { r.items.forEach(it => { STATE.addMaterial(p, it.id, it.n || 1); Engine.log('获得「' + (it.name || STATE.matName(it.id)) + '」×' + (it.n || 1), 'good'); }); }
      }
      // 记录该国主线线索（问题3：线索记录）
      if (!p._clues) p._clues = {};
      const clueNation = st.nationId;
      if (!p._clues[clueNation]) p._clues[clueNation] = [];
      const clueText = STATE.getNationClueHint(p, clueNation);
      if (clueText && p._clues[clueNation].indexOf(clueText) < 0) {
        p._clues[clueNation].push(clueText);
      }
      // 执行原有效果（复用现有场景 options 逻辑）
      if (ch.evilDelta) { p.evil = (p.evil || 0) + ch.evilDelta; }
      if (ch.completed) { try { STATE.completeQuest(p, ch.completed); } catch (e) {} }
      if (ch.reply) { Engine.log(ch.reply, 'system'); }
      if (ch.log) { Engine.log(ch.log, 'info'); }
      if (ch.onChoose) { try { ch.onChoose(p); } catch (e) {} }
      // 推进
      if (ch.nextStory) {
        // 进入下一个点触化场景
        const idx = st.data.story.findIndex(s => s.id === ch.nextStory);
        if (idx >= 0) {
          st.idx = idx; st.curNpc = null; st.lineIdx = 0;
          // 同步更新断点（含 _storyState 与 _inStory），保证任何时刻回家/刷新进度都是最新的
          p._storyState = { nationId: st.nationId, idx: st.idx };
          if (p._inStory) p._inStory.idx = st.idx;
          // 从探索屏进入的剧情：回到探索屏渲染（剧情 NPC + 全部 NPC 合一，不切纯剧情屏）
          if (App._explore && App._explore.nationId === st.nationId && App._explore.inStoryLine) {
            App._explore.inStoryLine.startIdx = idx;
            App._explore.sceneIdx = 0;
            App.renderExploreScene();
          } else {
            App.renderStoryScene();
          }
        }
        else App.leaveExplore();
      } else if (ch.nextScene) {
        // 退出点触化，进入文字场景（战斗/结局等）
        const stNation = st.nationId;
        const stIdx = st.idx;
        App._story = null;
        App._explore = null;   // 离开探索屏（文字主线使用独立场景渲染）
        // 记录战斗回退点：仅当目标场景是"战斗"时保留（战败回家后返回剧情应回到点触主线）；
        // 非战斗文字场景不设置，避免玩家在文字主线推进后仍被拽回点触主线
        const nextSceneDef = (ALL_SCENES && ALL_SCENES[ch.nextScene]) || (typeof QINGQIU_SCENES !== 'undefined' && QINGQIU_SCENES[ch.nextScene]);
        if (nextSceneDef && nextSceneDef.battle) {
          p._battleBackStory = { nationId: stNation, idx: stIdx };
        } else {
          delete p._battleBackStory;
        }
        // 清除"在点触主线"标记（已进入文字场景）
        delete p._inStory;
        // 点触主线已完成（进入文字主线），清除其断点：
        // 否则 getQuestGuide 会因 _storyState 仍存在而误显示"继续点触剧情第N幕"，而不是"推进文字主线"
        if (p._storyState && p._storyState.nationId === stNation) delete p._storyState;
        App._setHeaderVisible(true);   // 恢复顶部状态栏（离开探索屏）
        App.goto(ch.nextScene);
      } else {
        // 无推进目标：留在当前场景继续探索（氛围 NPC 循环对话）
        st.curNpc = null;
        st.lineIdx = 0;
        App.renderStoryScene();
      }
    },

    /* 构建20国大地图节点图（CSS 布局，显示推荐等级/解锁/通关状态） */
    _buildNationMap() {
      const p = App.player;
      const { all, cleared, unlocked } = STATE.unlockedNations(p);
      // 国家在剧情推进链中的顺序（用于地图布局的纵横位置）
      const order = ['qingqiu','yumin','yanhuo','xuanyuan','xuangu','huantou','sanshou','nieer','daren','baimin','changgu','zhurao','jiaojing','rouli','shenmu','wuchang','yimu','jiexiong','qizhong','guixu'];
      // 每个国家在地图上的坐标（col, row），排成一条蜿蜒的山海之路
      const layout = {
        qingqiu:[0,0], yumin:[1,0], yanhuo:[2,0], xuanyuan:[3,0], xuangu:[4,0],
        huantou:[4,1], sanshou:[3,1], nieer:[2,1], daren:[1,1], baimin:[0,1],
        changgu:[0,2], zhurao:[1,2], jiaojing:[2,2], rouli:[3,2], shenmu:[4,2],
        wuchang:[4,3], yimu:[3,3], jiexiong:[2,3], qizhong:[1,3], guixu:[0,3]
      };

      let cells = '';
      all.forEach(n => {
        const [col, row] = layout[n] || [0,0];
        const isCleared = STATE.isNationCleared(p, n);   // 真实通关标记（cleared 含"当前国家恒通关"特判，会导致当前国误显示✓）
        const isUnlocked = (unlocked && unlocked.includes(n)) || isCleared || n === p.nation;   // 无前置国家默认解锁；已通关/当前国家始终可进
        const rec = STATE.getNationRecommend(n);
        const diff = STATE.getNationDifficulty(p, n);
        const nationName = STATE.nationName(n);
        const type = STATE.getNationType(n);            // 'main' 主线 | 'side' 支线
        const typeName = type === 'main' ? '主线' : '支线';
        // 前置判定（归墟为硬前置，其余为软建议）
        const pre = STATE.getNationPrereq(n);
        const preCheck = STATE.checkNationPrereq(p, n);
        const isHardLocked = (pre && !preCheck.ok);     // 有前置但未满足 → 硬锁定（须通关前置国）
        // 状态
        let statusCls = 'locked', statusLabel = '🔒';
        if (isCleared) { statusCls = 'cleared'; statusLabel = '✓'; }
        else if (isUnlocked && !isHardLocked) { statusCls = 'unlocked'; statusLabel = ''; }
        const clickable = isUnlocked && !isHardLocked;
        // 难度颜色（仅可进入的国家显示）
        const diffColor = clickable ? diff.color : '#666';
        // 底部说明：推荐等级始终显示；锁定国家用醒目颜色标出前置条件
        let lockText = '未解锁';
        if (isCleared) lockText = '已通关';
        else if (isHardLocked) lockText = '🔒 ' + (preCheck.hint || '需先完成前置主线');
        else if (!clickable) lockText = '未解锁';
        const lvLine = clickable ? (`Lv${rec.lv} · ${diff.name}`) : lockText;
        const lvColor = isHardLocked ? '#e04a2f' : (clickable ? diffColor : '#777');
        // 主线/支线角标
        const typeBadge = type === 'main'
          ? `<span class="map-node-type main">主</span>`
          : `<span class="map-node-type side">支</span>`;
        cells += `<div class="map-node ${statusCls} ${clickable ? 'clickable' : ''}" data-nation="${n}" data-locked="${!clickable ? '1' : '0'}" style="grid-column:${col+1};grid-row:${row+1};border-color:${isCleared ? '#3e8a5a' : (clickable ? diff.color : (isHardLocked ? '#b04a2f' : '#555'))};">
          ${typeBadge}
          <div class="map-node-status">${statusLabel}</div>
          <div class="map-node-name">${nationName}</div>
          <div class="map-node-lv" style="color:${lvColor}">${lvLine}</div>
        </div>`;
      });

      return `<div class="nation-map">
        <div class="nation-map-legend">
          <span class="lg-cleared">✓ 已通关</span>
          <span class="lg-unlocked">可进入（推荐等级）</span>
          <span class="lg-locked">🔒 需先通关前置国家</span>
          <span class="lg-main">主 = 主线国（四凶剧情）</span>
          <span class="lg-side">支 = 支线国（可选）</span>
        </div>
        <div class="nation-map-grid">${cells}</div>
        <div class="nation-map-tip">二十国皆可自由前往（推荐等级标注在国名下方，低于推荐等级也可挑战，只是更艰难）。红色锁定的国家需先通关其前置国家的主线（如归墟需先通关跂踵）方可进入；卡关时可先去别国提升再来。</div>
      </div>`;
    },

    /* 商人打探消息：按国家区分 + 隐藏信息（稀有概率） */
    gossipInfo(nationId) {
      const rumors = {
        qingqiu: [
          '听说桃林深处，最近总有狐影徘徊，像是在守着什么东西。',
          '城里的商人说，墨家遗迹那儿住着个怪老头，会修机关鸟。',
          '（隐藏）百年前的猎户之乱，似乎与某件被封印的「虚月碎片」有关。'
        ],
        yumin: [
          '羽民国的风灵通道，近来变得很不稳定，天羽城主焦头烂额。',
          '（隐藏）有人看见半羽族的少年在夜里攀上风灵塔，似乎在偷看什么。'
        ],
        yanhuo: [
          '厌火国的熔炉火越来越暗了，灰族的人愁眉苦脸。',
          '（隐藏）熔炉深处似乎藏着一件上古火神遗物，但没人敢下去。'
        ],
        xuanyuan: [
          '轩辕国的机关城核心出了问题，机关人开始不听使唤。',
          '（隐藏）据说机关城地下有一间密室，只有「墨守」血脉能打开。'
        ],
        xuangu: [
          '玄股国的水神封印最近在松动，族里人心惶惶。',
          '（隐藏）沧溟被选为「容器」的事，其实是他父亲一手安排的。'
        ],
        huantou: [
          '鸣海最近不太平，有人说听见渊底传来哭声。',
          '（隐藏）大渊主每年献祭的活祭，似乎都沉进了渊底一道封印里。'
        ],
        sanshou: [
          '魂镜高原上，有人的梦开始混入别人的记忆。',
          '（隐藏）魂井底部，似乎封着一件与四凶有关的古老器物。'
        ],
        nieer: [
          '聂耳的峡谷越来越安静了，连鸟都不叫了。',
          '（隐藏）鸣石之心的裂缝里，有人听见了穷奇的低语。'
        ],
        daren: [
          '大人国的一根擎天柱裂了，天似乎低了一寸。',
          '（隐藏）夸父的骨骼在柱子里搏动，像是活了过来。'
        ],
        baimin: [
          '万兽原的兽灵最近变得暴躁，契约也不太灵了。',
          '（隐藏）有人说见过英招的残影，在万兽原深处徘徊。'
        ],
        changgu: [
          '长股的时间沙漠又扩大了一圈，有人走进去就没出来。',
          '（隐藏）裂时渊最深处，时间被啃得只剩下一段循环。'
        ],
        zhurao: [
          '须弥城的秩序最近混乱，连泉水的方向都变了。',
          '（隐藏）混沌鳞片落在城头的那夜，整座城倒转了一瞬。'
        ],
        jiaojing: [
          '交胫的命轮最近转得飞快，不少人的因果线在发烫。',
          '（隐藏）命轮织机的核心，被穷奇之爪撕开了一道口子。'
        ],
        rouli: [
          '蜕形之海的海水越来越"浓"，岸边的树开始变形。',
          '（隐藏）海中央有一块石头，无论怎么泡都不变形——上面刻着字。'
        ],
        shenmu: [
          '深目国的天缝又裂大了一点，被注视的人更多了。',
          '（隐藏）天缝里那只眼睛，似乎有规律地眨动，像在倒计时。'
        ],
        wuchang: [
          '无肠国的人越来越瘦，可他们还是一直在吃。',
          '（隐藏）吞天釜底，有人刻了一行字：「釜吞万物，唯情不化。」'
        ],
        yimu: [
          '一目国的独目族人，最近常做同一个梦。',
          '（隐藏）梦里那只天缝之眼，说的是：还差三道封印。'
        ],
        jiexiong: [
          '结胸的连脉越来越沉，谁都不敢轻易与谁相连。',
          '（隐藏）界塔顶端，有一根从未断过的脉——连向归墟。'
        ],
        qizhong: [
          '跂踵的人走不出行原了，兜兜转转都在原地。',
          '（隐藏）行原尽头，有一只巨大脚印，脚印里长着奇怪的植物。'
        ],
        guixu: [
          '归墟的天裂开了，缝隙里有东西在朝外看。',
          '（隐藏）四凶本为一体——封印的裂隙里，有人在低语着这句真相。'
        ]
      };
      const pool = rumors[nationId] || ['这座城池近来风平浪静，没什么新鲜事。'];
      // 隐藏消息（带「（隐藏）」前缀）优先但不保证
      const hidden = pool.filter(r => r.indexOf('（隐藏）') >= 0);
      const normal = pool.filter(r => r.indexOf('（隐藏）') < 0);
      if (hidden.length && RNG.chance(0.35)) return hidden[Math.floor(Math.random() * hidden.length)].replace('（隐藏）', '');
      return normal[Math.floor(Math.random() * normal.length)] || pool[0];
    },

    buildHomeExplore() {
      const p = App.player;
      if (!p) return { id:'home_explore', title:'探险', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      // V1.3.20：选国已由大地图驱动，移除未使用的 cleared/pinned/sortedCleared 死代码
      // 大地图（玩法驱动核心：地图为唯一选国入口，不再用文字框）
      const mapHtml = App._buildNationMap();
      const exploreOpts = [];
      exploreOpts.push({ label: '返回家园', next: 'home' });

      return {
        id: 'home_explore',
        title: '【山海舆图】',
        bg: 'assets/img/scenes/forest.jpg',
        desc: '点击地图上的国家即可前往。主线国构成四凶剧情，支线国可选探索。当前时辰：' + p.shichen + '/' + p.shichenMax,
        homeMap: { html: mapHtml },
        options: exploreOpts
      };
    },

    /* 家园·探险按钮排序（置顶管理） */
    buildHomeExploreOrder() {
      const p = App.player;
      if (!p) return { id:'home_explore_order', title:'排序', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回', next:'home_explore'}] };
      const { cleared } = STATE.unlockedNations(p);
      const nationNames = { qingqiu:'青丘', yumin:'羽民', yanhuo:'厌火', xuanyuan:'轩辕', xuangu:'玄股', huantou:'讙头', sanshou:'三首', nieer:'聂耳', daren:'大人', baimin:'白民', changgu:'长股', zhurao:'周饶', jiaojing:'交胫', rouli:'柔利', shenmu:'深目', wuchang:'无肠', yimu:'一目', jiexiong:'结胸', qizhong:'跂踵', guixu:'归墟' };
      let pinned = App._getPinnedNations();
      pinned = pinned.filter(n => cleared.includes(n));   // 仅保留已解锁国家
      const opts = [];
      cleared.forEach(n => {
        const isPinned = pinned.indexOf(n) >= 0;
        opts.push({ label: (isPinned ? '★ ' : '☆ ') + nationNames[n] + (isPinned ? '（已置顶，点击取消）' : '（点击置顶到最前）'), tag: '排序',
          onChoose: (pl) => {
            let cur = App._getPinnedNations().filter(x => cleared.includes(x));
            const idx = cur.indexOf(n);
            if (idx >= 0) cur.splice(idx, 1);       // 取消置顶
            else cur.push(n);                        // 置顶（追加到置顶序列末尾）
            App._setPinnedNations(cur);
            Engine.log('已调整【' + nationNames[n] + '】的探索位置。', 'good');
          }, next: 'home_explore_order' });
      });
      opts.push({ label: '【完成】返回选择区域', next: 'home_explore' });
      return {
        id: 'home_explore_order',
        title: '【排序】自定义探索位置',
        bg: 'assets/img/scenes/forest.jpg',
        text: '点击国家可「置顶/取消置顶」，置顶的国家会排在探索列表最前面，方便你快速进入常用区域。\n\n（置顶顺序 = 你置顶的先后顺序）',
        options: opts
      };
    },

    /* 家园·探险执行（分区·随机结果） */
    buildHomeExploreGo() {
      const p = App.player;
      if (!p) return { id:'home_explore_go', title:'探险', bg:'assets/img/scenes/forest.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      // 上一事件的结果展示（奇遇/隐藏事件等：先显示结果，再选择继续/返回，而非立即传送）
      if (p._exploreResult) {
        const resText = p._exploreResult;
        p._exploreResult = null;
        const hasTime = p.shichen > 0;
        return { id:'home_explore_go', title:'【探险】结果', bg:'assets/img/scenes/forest.jpg',
          text: resText + '\n\n' + (hasTime ? '你尚有余力继续探索。' : '今日时辰已尽，该回去了。'),
          options: [
            { label: hasTime ? '继续探索（耗1时辰）' : '（时辰已尽）', next: hasTime ? 'home_explore_go' : 'home', disabled: !hasTime },
            { label: '返回家园', next: 'home' }
          ] };
      }
      const nation = p.nation || p._exploreNation || 'qingqiu';
      const r = STATE.exploreRegion(p, nation);
      if (r.noTime) {
        return { id:'home_explore_go', title:'【探险】时辰已尽', bg:'assets/img/scenes/forest.jpg',
          text:'今日时辰已尽，你已无法继续探索。\n\n可选择撤回家园休整，或就寝至明日再来。',
          options:[
            { label: '【撤回】返回家园（不消耗时辰）', next: 'home' },
            { label: '【就寝】休整至明日', onChoose: (pl) => { STATE.newDay(pl); Engine.log('你休整一夜，精神焕发。', 'good'); }, next: 'home' }
          ] };
      }
      // 苏苏专属：探索时有概率遇到河流 → 触发捕鱼/救人小游戏（已完成织网阶段后）
      if (p.charId === 'c_di_susu') {
        const susuLine = (App.CHAR_QUEST_LINES && App.CHAR_QUEST_LINES['c_di_susu']);
        const stIdx = App.charQuestStageOf(p, 'c_di_susu');
        const hasNet = susuLine && stIdx >= 1;   // 完成「织网」阶段后持有苏苏网
        if (hasNet && RNG.chance(0.30)) {
          // 河流事件：捕鱼或救人小游戏
          const mode = (stIdx >= 2) && RNG.chance(0.5) ? 'rescue' : 'fish';
          return { id:'home_explore_go', title: mode === 'rescue' ? '【奇遇】洪流·救童' : '【奇遇】浅滩·鱼群',
            bg:'assets/img/nations/xuangu-lake.jpg',
            text: mode === 'rescue'
              ? '你正沿河岸行走，忽听上游传来哭喊——洪水退去后的水洼里，几个孩子被湍流困住！\n\n你解下背上的「苏苏网」，冲了过去。'
              : '你正沿河岸行走，一片浅滩拦在面前，浅水里尽是困在水洼中蹦跳的鱼群。\n\n你解下背上的「苏苏网」，挽起裤腿下了水。',
            options: [
              { label: '【' + (mode === 'rescue' ? '救人' : '捕鱼') + '】下网' + (mode === 'rescue' ? '救人' : '捕鱼') + '（小游戏）', tag: '苏苏网', next: null, onChoose: (pl) => {
                  App.startFishingGame({ mode, title: mode === 'rescue' ? '洪流救人' : '滩涂捕鱼' }, (res) => {
                    const d = App.charQuestDataOf(pl, 'c_di_susu');
                    if (mode === 'rescue') {
                      d.saved = (d.saved || 0) + res.rescued;
                      Engine.log('你救起 ' + res.rescued + ' 个落水孩子！', res.rescued > 0 ? 'good' : 'system');
                    } else {
                      d.fished = (d.fished || 0) + res.catch;
                      Engine.log('你这一网，捕到 ' + res.catch + ' 条鱼。', res.catch > 0 ? 'good' : 'system');
                    }
                    App.goto('home_explore_go');
                  });
                } },
              { label: '绕过河流（不涉险）', next: 'home_explore_go' }
            ] };
        }
      }
      if (r.event === 'monster') {
        p._pendingEnemy = r.enemy;
        const aware = r.enemy.aware || 'aware';
        const opts = [];
        // 未发现：玩家可潜行/观察/偷袭（更多选择）
        if (aware === 'unaware') {
          opts.push({ label: '【潜行】屏息绕行（安全离开，继续探索）', tag: '潜行', onChoose: (pl) => {
              pl._pendingEnemy = null;
              Engine.log('你屏息凝神，悄无声息地绕过了' + r.enemy.name + '，继续前行。', 'good');
            }, next: 'home_explore_go' });
          opts.push({ label: '【观察】暗中窥探（或有所得）', tag: '观察', next: null, onChoose: (pl) => {
              pl._pendingEnemy = null;
              const roll = Math.random();
              if (roll < 0.4) {
                // 珍贵灵草
                const mats = ['MAT-C05','MAT-C07','MAT-C01','MAT-INCENSE1'];
                const m = RNG.pick(mats);
                STATE.addMaterial(pl, m, RNG.intBetween(1,2));
                Engine.log('你暗中观察，趁' + r.enemy.name + '不备，摘得一株【' + STATE.matName(m) + '】！', 'gold');
                App.goto('home_explore_go');
              } else if (roll < 0.7) {
                Engine.log('你窥探到' + r.enemy.name + '的习性与弱点，悄然离去。（下次遭遇时可先发制人）', 'good');
                App.goto('home_explore_go');
              } else {
                Engine.log('你观察时不慎踩断枯枝，' + r.enemy.name + '警觉抬头，你被迫应战！', 'evil');
                pl._pendingEnemy = r.enemy;
                App.goto('home_wild_battle');
              }
            } });
          opts.push({ label: '【偷袭】先发制人（先手战斗）', tag: '偷袭', onChoose: (pl) => {
              pl._pendingEnemy = r.enemy;
              pl._ambushBonus = true;
            }, next: 'home_wild_battle' });
        } else {
          // 发现/敌对：迎战或逃跑
          opts.push({ label: '【战斗】迎战魔物', tag: '战斗', onChoose: (pl) => { pl._pendingEnemy = r.enemy; }, next: 'home_wild_battle' });
          const fleeChance = aware === 'hostile' ? 0.25 : 0.5;
          opts.push({ label: '【逃跑】夺路而逃（' + (aware === 'hostile' ? '狂暴魔物，成功率低' : '可能失败') + '）', tag: '逃跑', next: null, onChoose: (pl) => {
              pl._pendingEnemy = null;
              if (RNG.chance(fleeChance)) { Engine.log('你成功脱身。', 'good'); App.goto('home_explore_go'); }
              else { Engine.log('魔物截住了你的去路，被迫应战！', 'evil'); pl._pendingEnemy = r.enemy; App.goto('home_wild_battle'); }
            } });
        }
        const awareTip = aware === 'unaware' ? '它尚未发现你，正是下手的好时机。' : (aware === 'hostile' ? '它煞气冲天，已然锁定你！' : (r.enemy.state.awareDesc || '它发现了你的气息，正在逼近。'));
        return {
          id: 'home_explore_go', title:'【探险】遭遇魔物', bg: r.enemy.bg,
          text: `前方${r.enemy.name}（${r.enemy.state.name}）！${awareTip}`,
          options: opts
        };
      }
      // 特殊环境灵材
      if (r.event === 'special') {
        return { id:'home_explore_go', title:'【探险】特殊灵材', bg:'assets/img/scenes/forest.jpg',
          text:`此地${r.state.name}的特殊环境中，你寻得了珍稀灵材【${STATE.matName(r.mat)}】！`,
          options: [
            { label: '继续探索（耗1时辰）', next: 'home_explore_go' },
            { label: '返回家园', next: 'home' }
          ] };
      }
      // 丹方
      if (r.event === 'recipe') {
        const recipe = STATE.learnRandomRecipe(p);
        if (recipe) {
          return { id:'home_explore_go', title:'【探险】丹方', bg:'assets/img/scenes/forest.jpg',
            text:`你在一处古卷中参悟得丹方【${recipe.name}】（${recipe.effect}）！`,
            options: [
              { label: '【研习】记下丹方', tag: '丹道', onChoose: (pl) => { Engine.log('你领悟了丹方：' + recipe.name + '！', 'good'); }, next: 'home' },
              { label: '继续探索', next: 'home_explore_go' }
            ] };
        }
        // 丹方都学会了：给灵材兜底
        const mat3 = RNG.pick(STATE.exploreMaterialPool(p, false));
        STATE.addMaterial(p, mat3, RNG.intBetween(1, 3));
        return { id:'home_explore_go', title:'【探险】有所收获', bg:'assets/img/scenes/forest.jpg',
          text:`你获得【${STATE.matName(mat3)}】！`,
          options: [
            { label: '继续探索（耗1时辰）', next: 'home_explore_go' },
            { label: '返回家园', next: 'home' }
          ] };
      }
      // 图纸（按探索区域国家对应）
      if (r.event === 'blueprint') {
        const bp = STATE.randomBlueprint(p, nation);
        if (bp) {
          p.unlocked.add(bp);
          return { id:'home_explore_go', title:'【探险】机缘图纸', bg:'assets/img/scenes/forest.jpg',
            text:`你在一处遗迹中发现了一份神秘的职业传承图纸【${STATE.matName(bp)}】！`,
            options: [
              { label: '【参悟】收下图纸', tag: '职业', onChoose: (pl) => { Engine.log('获得' + STATE.matName(bp), 'good'); }, next: 'home' },
              { label: '继续探索', next: 'home_explore_go' }
            ] };
        }
        // 图纸都已获得：改为掉落金币+灵材兜底
        const matId2 = RNG.pick(STATE.exploreMaterialPool(p, false));
        const n2 = RNG.intBetween(1, 3);
        const gold2 = RNG.intBetween(10, 40);
        STATE.addMaterial(p, matId2, n2);
        p.gold = (p.gold || 0) + gold2;
        return { id:'home_explore_go', title:'【探险】有所收获', bg:'assets/img/scenes/forest.jpg',
          text:`你获得【${STATE.matName(matId2)}】×${n2}，以及金币 ${gold2}！`,
          options: [
            { label: '继续探索（耗1时辰）', next: 'home_explore_go' },
            { label: '返回家园', next: 'home' }
          ] };
      }
      // 宠物幼崽
      if (r.event === 'petEgg') {
        // 按国家出特色宠（pets.js 的 nationPrefix 对应国家前缀），并过滤已拥有的
        const prefMap = { qingqiu:'C', yumin:'FS', yanhuo:'YH', xuanyuan:'JG', xuangu:'XG', huantou:'HT', sanshou:'SS', nieer:'NE', daren:'DR', baimin:'BM', changgu:'CG', zhurao:'ZR', jiaojing:'JJ', rouli:'RL', shenmu:'SM', wuchang:'WC', yimu:'YM', jiexiong:'JX', qizhong:'QZ', guixu:'GX' };
        const nationPref = prefMap[p.nation || p._exploreNation] || '';
        const allEggPets = ['rongrong','xuanhuo','yinyin','fengling','cangqiong','baigi','jingling','jinqi','yunku','wenyao','huangdi'];
        // 优先当前国特色宠（未拥有），其次通用宠（未拥有）
        const ownedIds = (p.pets || []).map(pt => pt.id);
        const nationPets = allEggPets.filter(id => {
          const sp = (typeof PETS !== 'undefined' && PETS) ? PETS.find(x => x.id === id) : null;
          return sp && sp.nationPrefix === nationPref && ownedIds.indexOf(id) < 0;
        });
        const commonPets = allEggPets.filter(id => ownedIds.indexOf(id) < 0 && nationPets.indexOf(id) < 0);
        const pool = (nationPets.length ? nationPets : commonPets);
        if (!pool.length) {
          // 全部宠物已拥有：改为掉落灵材
          const mat = RNG.pick(STATE.exploreMaterialPool(p, true));
          STATE.addMaterial(p, mat, RNG.intBetween(1,3));
          return { id:'home_explore_go', title:'【探险】发现灵材', bg:'assets/img/scenes/forest.jpg',
            text:'草丛里没有幼崽，倒是寻得一份【' + STATE.matName(mat) + '】。',
            options: [ { label: '继续探索（耗1时辰）', next: 'home_explore_go' }, { label: '返回家园', next: 'home' } ] };
        }
        const pid = RNG.pick(pool);
        return { id:'home_explore_go', title:'【探险】宠物幼崽', bg:'assets/img/scenes/forest.jpg',
          text:'你在草丛中发现一只瑟瑟发抖的宠物幼崽！',
          options: [
            { label: '【收养】收下这只幼崽', tag: '御灵', onChoose: (pl) => { STATE.addPet(pl, pid, 'equal'); Engine.log('获得宠物！', 'good'); }, next: 'home' },
            { label: '放它离开', tag: '仁慈', next: 'home' }
          ] };
      }
      // 隐藏剧情（珍贵事件·不能选错）
      if (r.event === 'hidden') {
        const h = r.hidden;
        p._hiddenEvent = h;
        return { id:'home_explore_go', title:'【奇遇】' + h.name, bg:'assets/img/nations/qing-fog-abyss.jpg',
          text:`${h.desc}\n\n你小心翼翼地靠近，发现三处可疑之处，唯有正确的选择才能获得至宝。`,
          options: [
            { label: '【探查】仔细感知灵机', tag: '奇遇', onChoose: (pl) => {
                if (RNG.chance(0.5)) { const m = RNG.pick(h.good); STATE.addMaterial(pl, m, 1); pl._exploreResult = '你寻得【' + STATE.matName(m) + '】！'; Engine.log('你寻得【' + STATE.matName(m) + '】！', 'good'); }
                else { pl._exploreResult = '灵机紊乱，你一无所获。'; Engine.log('灵机紊乱，你一无所获。', 'evil'); }
              }, next: 'home_explore_go' },
            { label: '【强取】强行破开禁制', tag: '奇遇', onChoose: (pl) => {
                pl._exploreResult = '禁制反噬，你被震退，一无所获。'; Engine.log('禁制反噬，你被震退，一无所获。', 'evil');
              }, next: 'home_explore_go' },
            { label: '【离开】不敢妄动，退走', tag: '谨慎', next: 'home_explore_go' }
          ] };
      }
      // 双刃剑事件（肉鸽式风险抉择）
      if (r.event === 'gamble') {
        const g = r.gamble;
        const canTake = (g.type !== 'blood2') || g.hasMats;
        return { id:'home_explore_go', title:'【奇遇】' + g.name, bg:'assets/img/nations/qing-fog-abyss.jpg',
          text:`${g.desc}\n\n[highlight]收益[/highlight]：${g.offer}\n[highlight]代价[/highlight]：${g.cost}\n\n此乃双刃之选，一旦接受，代价不可逆转。你如何抉择？`,
          options: [
            { label: '【接受】' + (canTake ? '承担代价，博取机缘' : '（灵材不足，无法接受）'), tag: '奇遇', onChoose: (pl) => {
                if (!canTake) { Engine.log('珍贵灵材不足，无法接受神兽精血的交换。', 'evil'); return; }
                const res = STATE.resolveGamble(pl, g);
                if (res.ok) { Engine.log('【' + g.name + '】' + res.text, res.text.indexOf('赢了') >= 0 ? 'gold' : (res.text.indexOf('输了') >= 0 ? 'evil' : 'good')); }
                else Engine.log(res.error, 'evil');
                Engine.refreshStatus(pl);
              }, next: 'home' },
            { label: '【拒绝】不涉险境，全身而退', tag: '谨慎', onChoose: (pl) => {
                Engine.log('你压下心中的贪念，转身离开。', 'system');
              }, next: 'home' }
          ] };
      }
      // 灵香（供奉材料）
      if (r.event === 'incense') {
        return { id:'home_explore_go', title:'【探险】灵香', bg:'assets/img/scenes/forest.jpg',
          text:`你在山野间寻得一缕【${STATE.matName(r.mat)}】，可用于供奉神明！`,
          options: [
            { label: '继续探索（耗1时辰）', next: 'home_explore_go' },
            { label: '返回家园', next: 'home' }
          ] };
      }
      // 传闻线索（含蓄提示隐藏内容）
      if (r.event === 'rumor') {
        return { id:'home_explore_go', title:'【探险】传闻', bg:'assets/img/scenes/forest.jpg',
          text:`${r.text}`,
          options: [
            { label: '继续探索（耗1时辰）', next: 'home_explore_go' },
            { label: '返回家园', next: 'home' }
          ] };
      }
      // 常规灵材 + 金币
      return { id:'home_explore_go', title:'【探险】有所收获', bg:'assets/img/scenes/forest.jpg',
        text:`你获得【${STATE.matName(r.mat)}】×${r.n}，以及金币 ${r.gold}！`,
        options: [
          { label: '继续探索（耗1时辰）', next: 'home_explore_go' },
          { label: '返回家园', next: 'home' }
        ] };
    },

    /* ============== 家园·灵圃（9株上限 · 手动收获 · 稀有灵材种植） ============== */
    buildHomePlant() {
      const p = App.player;
      if (!p) return { id:'home_plant', title:'种植', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const plots = p.plots || [];
      const maxPlots = STATE.GARDEN_MAX_PLOTS || 9;
      const M = (typeof global.MATERIALS !== 'undefined' && global.MATERIALS) ? global.MATERIALS : null;

      // —— 灵圃状态展示 ——
      const readyPlots = plots.filter(x => x.ready);
      const growingPlots = plots.filter(x => !x.ready);
      const emptySlots = maxPlots - plots.length;
      const plotLines = [];
      plotLines.push('【灵圃】' + plots.length + '/' + maxPlots + ' 株（成熟未收也算占位）');
      if (readyPlots.length) {
        readyPlots.forEach(pl => {
          const q = M ? M.matQuality(pl.mat) : 'N';
          plotLines.push('· 🌾 ' + pl.name + '（[已成熟·待收获]）' + (M ? '【' + M.Q_LABEL[q] + '品】' : ''));
        });
      }
      if (growingPlots.length) {
        growingPlots.forEach(pl => {
          const bar = '▰'.repeat(Math.max(0, Math.round(pl.days / pl.needsDays * 6))) + '▱'.repeat(Math.max(0, 6 - Math.round(pl.days / pl.needsDays * 6)));
          plotLines.push('· 🌱 ' + pl.name + '（' + bar + ' ' + pl.days + '/' + pl.needsDays + '天）');
        });
      }
      if (!plots.length) plotLines.push('（灵圃空空如也，可种下种子等待成熟）');
      if (emptySlots > 0) plotLines.push('空地：' + emptySlots + ' 块');

      // —— 种子库（按类分组展示） ——
      const seedLines = [];
      const groupSeeds = (title, list) => {
        const owned = list.filter(s => (p.materials[s] || 0) > 0);
        if (!owned.length) return;
        seedLines.push(title + '：' + owned.map(s => {
          const q = M ? M.Q_LABEL[M.matQuality(s)] : '';
          return (q ? '【' + q + '】' : '') + STATE.matName(s) + '×' + p.materials[s];
        }).join('　'));
      };
      if (M) {
        groupSeeds('【通用】', ['SEED-C01', 'SEED-C02', 'SEED-C05']);
        const natSeeds = Object.keys(M.CROPS).filter(s => /^SEED-[A-Z]{2}(0[12])$/.test(s) && s.indexOf('G0') !== 0 && s !== 'SEED-C01' && s !== 'SEED-C02' && s !== 'SEED-C05');
        groupSeeds('【各国】', natSeeds);
        groupSeeds('【灵圃特产·稀有】', ['SEED-G01','SEED-G02','SEED-G03','SEED-G04','SEED-G05','SEED-G06','SEED-G07','SEED-G08','SEED-G09']);
      } else {
        groupSeeds('【通用】', ['SEED-C01', 'SEED-C02', 'SEED-C05']);
      }
      if (!seedLines.length) seedLines.push('（无种子。种子可外出探索获得，或到【集市】购买，极易获取）');

      const text =
`灵圃中的作物每日生长（就寝结算），成熟后需手动收获。稀有灵材探索难得，但种子极易获得——多去集市与探索收集种子吧！

${plotLines.join('\n')}

${seedLines.join('\n')}`;

      // —— 操作选项 ——
      const opts = [];
      // 收获（成熟作物逐个收获 + 一键全收）
      readyPlots.forEach((pl, i) => {
        const idx = plots.indexOf(pl);
        opts.push({ label: '【收获】' + pl.name + ' ×' + pl.yield, tag: '收获', onChoose: (plr) => {
          const r = STATE.harvestPlot(plr, idx);
          if (r.ok) Engine.log('收获【' + r.name + '】×' + r.n + '！', 'gold');
          else Engine.log(r.error, 'evil');
        }, next: 'home_plant' });
      });
      if (readyPlots.length > 1) {
        opts.push({ label: '【收获】一键收取全部成熟作物', tag: '收获', onChoose: (plr) => {
          const r = STATE.harvestAllPlots(plr);
          if (r.got.length) Engine.log('收获 ' + r.got.map(g => g.name + '×' + g.n).join('、') + '！', 'gold');
          else Engine.log('没有可收获的作物。', 'evil');
        }, next: 'home_plant' });
      }
      // 移除生长中的作物（腾位置）
      growingPlots.forEach(pl => {
        const idx = plots.indexOf(pl);
        opts.push({ label: '【移除】拔除未成熟的' + pl.name + '（丢弃）', tag: '整理', onChoose: (plr) => {
          const r = STATE.removePlot(plr, idx);
          if (r.ok) Engine.log('已拔除' + r.name + '，腾出灵圃位置。', 'good');
          else Engine.log(r.error, 'evil');
        }, next: 'home_plant' });
      });
      // 彩蛋：灵圃种满 9 株时，角落出现一道神秘灵光（可领取一枚随机稀有灵种，仅一次）
      if (plots.length >= STATE.GARDEN_MAX_PLOTS && !(p._gardenEggClaimed)) {
        opts.push({ label: '？？？（灵圃深处一点灵光闪烁）', tag: '彩蛋', onChoose: (plr) => {
            if (plr._gardenEggClaimed) { Engine.log('灵光已消散。', 'good'); return; }
            plr._gardenEggClaimed = true;
            const s = RNG.pick(['SEED-G01','SEED-G02','SEED-G03','SEED-G04','SEED-G05','SEED-G06','SEED-G07','SEED-G08','SEED-G09']);
            STATE.addMaterial(plr, s, 1);
            const crop = M ? M.cropOf(s) : null;
            Engine.log('你拨开灵圃深处的灵光，拾得【' + STATE.matName(s) + '】——这是土地对你辛勤耕作的馈赠！', 'gold');
          }, next: 'home_plant' });
      }
      // 种植（按分组列出所有拥有且可种的种子）
      if (M) {
        const plantOpt = (seedId) => {
          const crop = M.cropOf(seedId);
          const q = M.matQuality(crop.mat);
          const catName = seedId.indexOf('G0') === 0 ? '稀有' : (/^SEED-[A-Z]{2}0[12]$/.test(seedId) && seedId !== 'SEED-C01' && seedId !== 'SEED-C02' && seedId !== 'SEED-C05') ? '各国' : '通用';
          return { label: '【种植】' + STATE.matName(seedId) + '（【' + M.Q_LABEL[q] + '品】）→ ' + STATE.matName(crop.mat) + '×' + crop.yield + '（' + crop.days + '天）', tag: '种植', onChoose: (plr) => {
            const r = STATE.plantPlot(plr, seedId);
            if (r.error) Engine.log(r.error, 'evil');
            else Engine.log('种下【' + STATE.matName(seedId) + '】，' + crop.days + '日后可收获' + r.matName + '×' + crop.yield + '。', 'good');
          }, next: 'home_plant' };
        };
        const natSeeds = Object.keys(M.CROPS).filter(s => /^SEED-[A-Z]{2}(0[12])$/.test(s) && s.indexOf('G0') !== 0 && s !== 'SEED-C01' && s !== 'SEED-C02' && s !== 'SEED-C05');
        const groups = [
          ['【种植·通用】', ['SEED-C01','SEED-C02','SEED-C05']],
          ['【种植·各国精材】', natSeeds],
          ['【种植·灵圃特产】', ['SEED-G01','SEED-G02','SEED-G03','SEED-G04','SEED-G05','SEED-G06','SEED-G07','SEED-G08','SEED-G09']]
        ];
        groups.forEach(([title, list]) => {
          const owned = list.filter(s => (p.materials[s] || 0) > 0);
          if (!owned.length) return;
          opts.push({ label: title, tag: '分组', onChoose: () => Engine.log('在下方选择要种下的种子。', 'good'), next: 'home_plant' });
          owned.forEach(s => opts.push(plantOpt(s)));
        });
      }
      opts.push({ label: '返回家园', next: 'home' });

      return {
        id: 'home_plant', title:'【灵圃】灵圃种植', bg:'assets/img/scenes/home-herb.jpg',
        text, options: opts
      };
    },

    /* 伏魔窟高阶材料池（各国 06 稀有转职材料 + 通用高阶炼丹材料） */
    _fumoHighMatPool() {
      return [
        'MAT-C06','MAT-FS06','MAT-YH06','MAT-JG06','MAT-XG06',
        'MAT-HT06','MAT-SS06','MAT-NE06','MAT-DR06','MAT-BM06',
        'MAT-CG06','MAT-ZR06','MAT-JJ06','MAT-RL06','MAT-SM06',
        'MAT-WC06','MAT-YM06','MAT-JX06','MAT-QZ06','MAT-GX06',
        'MAT-E01','MAT-E09','MAT-E17','MAT-F01'
      ];
    },

    /* ============== 家园·伏魔窟（每6天开启一次，开启当天可反复深入，不耗时辰） ============== */
    buildHomeFumo() {
      const p = App.player;
      if (!p) return { id:'home_fumo', title:'伏魔窟', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      // 清空探索结果残留（确保退出后再进入不会被旧结果卡住）
      p._exploreResult = null;
      const st = STATE.fumoStatus(p);
      if (!st.open) {
        return { id:'home_fumo', title:'【伏魔窟】', bg:'assets/img/scenes/fumo-cave.jpg',
          text:`伏魔窟尚未开启。它每6天（游戏内天数）开启一次。\n下次开启：第${st.nextDay}天。`,
          options:[{label:'返回家园', next:'home'}] };
      }
      // 当日已进入过（含战死/主动离开）：当天不可再进
      if (p._fumoEnteredDay === p.day) {
        return { id:'home_fumo', title:'【伏魔窟】', bg:'assets/img/scenes/fumo-cave.jpg',
          text:`你今日已在伏魔窟中探索过。窟内的凶险与机缘，需待下次开启（第${st.nextDay}天）再探。`,
          options:[{label:'返回家园', next:'home'}] };
      }
      return {
        id: 'home_fumo', title:'【伏魔窟】', bg:'assets/img/scenes/fumo-cave.jpg',
        text:`伏魔窟已开启！窟内藏有珍贵灵材与职业传承，但危机四伏。魔物各有状态——重伤或虚弱的魔物可能并未察觉你，可潜行绕开或暗中观察；狂暴的魔物则会主动追击。\n\n气血不会自动回复，可服用丹药回血；若战死，将随机掉落部分灵材。`,
        options: [
          { label: '【深入】踏入迷雾深处', tag: '伏魔', onChoose: (pl) => { pl._fumoEnteredDay = pl.day; }, next: 'home_fumo_go' },
          { label: '【谨慎】先观察，暂不入内', tag: '谨慎', next: 'home' }
        ]
      };
    },

    /* 伏魔窟执行：事件分支（概率，非绝对） */
    buildHomeFumoGo() {
      const p = App.player;
      if (!p) return { id:'home_fumo_go', title:'伏魔窟', bg:'assets/img/scenes/fumo-cave.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      // 上一事件的结果展示（伏魔窟探索结果先显示，再选择继续/返回）
      if (p._exploreResult) {
        const resText = p._exploreResult;
        p._exploreResult = null;
        return { id:'home_fumo_go', title:'【伏魔窟】结果', bg:'assets/img/scenes/fumo-cave.jpg',
          text: resText + `\n\n当前气血：${p.hp}/${STATE.calcMaxHp(p)}（窟内不会自动回复）`,
          options: [
            { label: '继续深入（不耗时辰）', next: 'home_fumo_go' },
            { label: '返回家园', next: 'home' }
          ] };
      }
      // 开启状态校验：非开启日不可深入
      const st = STATE.fumoStatus(p);
      if (!st.open) {
        return { id:'home_fumo_go', title:'【伏魔窟】', bg:'assets/img/scenes/fumo-cave.jpg',
          text:`伏魔窟尚未开启。它每6天（游戏内天数）开启一次。\n下次开启：第${st.nextDay}天。`,
          options:[{label:'返回家园', next:'home'}] };
      }
      // 前置：雾气萦绕，玩家选择（进去/等待/离开），不同选择不同概率
      // 深入阶段剧情衔接：按已深入次数动态描述，营造层层深入感
      const maxHp = STATE.calcMaxHp(p);
      const depth = p._fumoTimes || 0;
      const depthTexts = [
        '雾气在你面前缓缓散开，露出一条向下延伸的窄道。道旁岩壁上，隐约刻着古老的镇压符文。',
        '你继续深入，雾愈浓，温度骤降。脚下的石阶覆着一层薄霜，远处传来若有若无的嘶吼。',
        '再往前走，雾中开始浮现残破的石柱与断碑，像是某场大战的遗骸。碑文残损，似与四凶有关。',
        '你已经深入伏魔窟腹地，四周的魔物气息愈发浓烈，灵光与血光交织，仿佛置身幽冥。'
      ];
      const depthText = depthTexts[Math.min(depth, depthTexts.length - 1)];
      const goOpts = [
        { label: '【进去】拨开雾气深入', tag: '深入', next: 'home_fumo_resolve_1' },
        { label: '【等待】静候雾散', tag: '等待', next: 'home_fumo_resolve_2' },
        { label: '【离开】暂避锋芒', tag: '离开', next: 'home_fumo_resolve_3' }
      ];
      // 丹药只在战斗中可用（此处不再提供随时服药的选项）
      goOpts.push({ label: '【返回】撤出伏魔窟（结束本次探索）', tag: '返回', next: 'home' });
      return {
        id: 'home_fumo_go', title:'【伏魔窟】迷雾', bg:'assets/img/scenes/fumo-cave.jpg',
        text:`${depthText}\n\n隐约有灵光闪烁，也有低沉的魔物嘶吼声。\n\n当前气血：${p.hp}/${maxHp}（窟内不会自动回复，丹药须在战斗中服用）\n你如何抉择？`,
        options: goOpts
      };
    },

    /* 伏魔窟遭遇魔物：按敌人警觉度生成不同选项（未发现可潜行/观察/偷袭） */
    buildFumoEncounter(en, introText, title) {
      const p = App.player;
      const aware = en.aware || 'aware';
      const opts = [];
      if (aware === 'unaware') {
        opts.push({ label: '【潜行】借雾隐去身形（安全离开，继续探索）', tag: '潜行', onChoose: (pl) => {
            pl._pendingEnemy = null;
            Engine.log('你借雾隐去身形，悄然绕过了' + en.name + '。', 'good');
          }, next: 'home_fumo_go' });
        opts.push({ label: '【观察】暗中窥探（或得珍材）', tag: '观察', next: null, onChoose: (pl) => {
            pl._pendingEnemy = null;
            const roll = Math.random();
            if (roll < 0.5) {
              const m = RNG.pick(STATE.exploreMaterialPool(pl, true));
              STATE.addMaterial(pl, m, RNG.intBetween(1,3));
              pl._exploreResult = '你趁' + en.name + '不备，从其巢穴旁拾得【' + STATE.matName(m) + '】！';
              Engine.log(pl._exploreResult, 'gold');
              App.goto('home_fumo_go');
            } else if (roll < 0.75) {
              pl._exploreResult = '你窥得' + en.name + '的破绽所在，悄然退去。';
              Engine.log(pl._exploreResult, 'good');
              App.goto('home_fumo_go');
            } else {
              Engine.log('雾气扰动，' + en.name + '骤然回首，你被迫应战！', 'evil');
              pl._pendingEnemy = en;
              App.goto('home_fumo_battle');
            }
          } });
        opts.push({ label: '【偷袭】先发制人（先手战斗）', tag: '偷袭', onChoose: (pl) => {
            pl._pendingEnemy = en; pl._ambushBonus = true;
          }, next: 'home_fumo_battle' });
      } else {
        opts.push({ label: '【战斗】迎战魔物', tag: '战斗', onChoose: (pl) => { pl._pendingEnemy = en; }, next: 'home_fumo_battle' });
        if (aware === 'aware') {
          opts.push({ label: '【逃跑】夺路而逃（可能失败）', tag: '逃跑', next: null, onChoose: (pl) => {
              pl._pendingEnemy = null;
              if (RNG.chance(0.4)) { Engine.log('你成功脱身。', 'good'); App.goto('home_fumo_go'); }
              else { Engine.log('魔物截住去路，被迫应战！', 'evil'); pl._pendingEnemy = en; App.goto('home_fumo_battle'); }
            } });
        }
      }
      const awareTip = aware === 'unaware' ? '它尚未察觉你，正是良机。' : (aware === 'hostile' ? '它已锁定你，唯有一战！' : (en.state.awareDesc || '它发现了你，正在逼近。'));
      return { id:'home_fumo_resolve', title: title || '【伏魔窟】遭遇魔物', bg: en.bg,
        text: `${introText}${awareTip}`,
        options: opts };
    },

    /* 伏魔窟随机事件（雾中机缘/陷阱，随机 9 类，丰富探窟体验）
     * 约定：伏魔窟内"深入不耗时辰"，事件选项一律回到 home_fumo_go 继续深入，
     *       或进入 home_fumo_battle 应战；禁止把玩家"传送"出伏魔窟（不回 home）。 */
    buildFumoRandomEvent(p) {
      const evtId = RNG.pick(['merchant', 'treasure', 'spring', 'stele', 'mirage', 'rune', 'shrine', 'beast', 'bridge']);
      const maxHp = STATE.calcMaxHp(p);
      // —— 雾中商旅：物美价廉的稀有灵材 ——
      if (evtId === 'merchant') {
        const matPool = ['MAT-E17','MAT-E25','MAT-F01','MAT-F03','MAT-C06','MAT-G04','MAT-G05','MAT-C08','MAT-SC01'];
        const sh = matPool.slice();
        for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
        const offer = [];
        for (let i = 0; i < 3; i++) offer.push({ id: sh[i], price: Math.max(25, Math.round(60 + Math.random() * 140)) });
        const opts = offer.map(it => ({
          label: `【购买】${STATE.matName(it.id)}（${it.price}金）`, tag: '交易', next: 'home_fumo_go',
          onChoose: (pl) => {
            if ((pl.gold || 0) < it.price) { Engine.log('金币不足，商旅摇头不语。', 'evil'); return; }
            pl.gold -= it.price;
            STATE.addMaterial(pl, it.id, 1);
            Engine.log('你购得【' + STATE.matName(it.id) + '】，商旅含笑隐入雾中。', 'good');
          }
        }));
        opts.push({ label: '【离开】谢绝商旅', tag: '离开', next: 'home_fumo_go' });
        return { id:'home_fumo_evt', title:'【伏魔窟】雾中商旅', bg:'assets/img/scenes/fumo-cave.jpg',
          text:`[img]assets/img/npc/npc_shangren.jpg[/img]\n\n雾中一盏孤灯明灭，一位身披蓑衣的商旅盘坐路旁，身侧堆着几只木匣。他抬眼望你：「深窟险地，唯灵材可换活路。小友，可要照顾几件？」\n\n金币：${p.gold || 0}\n在售：${offer.map(o => STATE.matName(o.id) + '（' + o.price + '金）').join('、')}`,
          options: opts };
      }
      // —— 上古宝箱：机缘与陷阱并存 ——
      if (evtId === 'treasure') {
        const opts = [];
        opts.push({ label: '【开启】撬开宝箱', tag: '冒险', next: null, onChoose: (pl) => {
            const r = Math.random();
            if (r < 0.45) {
              const m = RNG.pick(['MAT-F03','MAT-F05','MAT-E25','MAT-G05','MAT-C08','MAT-INCENSE2']);
              STATE.addMaterial(pl, m, RNG.intBetween(1, 2));
              pl.gold = (pl.gold || 0) + RNG.intBetween(50, 150);
              Engine.log('宝箱轰然打开，灵光四溢！你获得【' + STATE.matName(m) + '】与金币若干！', 'gold');
              App.goto('home_fumo_go');
            } else if (r < 0.75) {
              pl.hp = Math.max(1, pl.hp - Math.floor(maxHp * 0.2));
              Engine.log('宝箱内竟是机关！暗箭齐发，你被射中，气血大损（-20%）。', 'evil');
              App.goto('home_fumo_go');
            } else {
              const en = STATE.makeEnemy(p, { lv: (p.lv || 1) + 4, state: { name:'暴怒', id:'chaotic' }, namePrefix:'宝箱怪', name:'噬宝魔', hpMul: 4.5, atkMul: 1.05, defMul: 0.5, element:'暗', bg:'assets/img/scenes/fumo-cave.jpg' });
              pl._pendingEnemy = en;
              Engine.log('宝箱骤然化作狰狞魔物，朝你扑来！', 'evil');
              App.goto('home_fumo_battle');
            }
          } });
        opts.push({ label: '【离开】警惕为上，绕行', tag: '谨慎', next: 'home_fumo_go' });
        return { id:'home_fumo_evt', title:'【伏魔窟】上古宝箱', bg:'assets/img/scenes/fumo-cave.jpg',
          text:'雾气深处立着一只鎏金宝箱，箱体覆满暗红符文，隐隐透出灵光。\n\n是机缘，还是陷阱？',
          options: opts };
      }
      // —— 灵泉：回复与采集 ——
      if (evtId === 'spring') {
        const opts = [];
        opts.push({ label: '【汲取】畅饮灵泉（恢复30%气血）', tag: '恢复', next: 'home_fumo_go', onChoose: (pl) => {
            const heal = Math.floor(STATE.calcMaxHp(pl) * 0.3);
            pl.hp = Math.min(STATE.calcMaxHp(pl), pl.hp + heal);
            Engine.log('你捧起灵泉痛饮，气血恢复 ' + heal + ' 点。', 'good');
          } });
        opts.push({ label: '【取水】装满玉瓶（获寒潭露）', tag: '采集', next: 'home_fumo_go', onChoose: (pl) => {
            STATE.addMaterial(pl, 'MAT-C06', 1);
            Engine.log('你以玉瓶装满灵泉，获得【寒潭露】×1。', 'good');
          } });
        opts.push({ label: '【离去】不再停留', next: 'home_fumo_go' });
        return { id:'home_fumo_evt', title:'【伏魔窟】灵泉', bg:'assets/img/scenes/fumo-cave.jpg',
          text:'石壁渗出一泓灵泉，泉面氤氲着淡淡灵光，沁人心脾。\n\n当前气血：' + p.hp + '/' + maxHp,
          options: opts };
      }
      // —— 石室遗刻：参悟高级丹方 ——
      if (evtId === 'stele') {
        const unowned = STATE.getRecipes().filter(r => r.locked && !(p.unlockedRecipes || new Set()).has(r.id));
        const opts = [];
        if (unowned.length) {
          opts.push({ label: '【参悟】端坐碑前，闭目悟道', tag: '机缘', next: 'home_fumo_go', onChoose: (pl) => {
              const recipe = STATE.learnRandomRecipe(pl);
              if (recipe) Engine.log('石室遗刻流光闪烁，你悟得丹方【' + recipe.name + '】！', 'gold');
              else Engine.log('遗刻并无更多奥妙，你一无所获。', 'good');
            } });
        }
        opts.push({ label: '【离开】不扰前人遗刻', next: 'home_fumo_go' });
        return { id:'home_fumo_evt', title:'【伏魔窟】石室遗刻', bg:'assets/img/scenes/fumo-cave.jpg',
          text:'一间石室中，墙上刻着密密麻麻的丹方与心得，字迹苍劲，似为上古丹道前辈所留。\n\n[highlight]遗刻参悟可解锁高级丹方[/highlight]',
          options: opts };
      }
      // —— 遗落法阵：参悟修为 / 引动阵枢（机缘或反噬） ——
      if (evtId === 'rune') {
        const opts = [];
        opts.push({ label: '【参悟】盘坐阵心，领悟阵纹奥义', tag: '机缘', next: 'home_fumo_go', onChoose: (pl) => {
            const expGain = 300 + (pl.lv || 1) * 25;
            pl.realm.exp = (pl.realm.exp || 0) + expGain;
            try { STATE.checkLevelUp(pl); } catch (e) {}
            Engine.log('阵纹如活水流入识海，你参悟玄机，修为 +' + expGain + '！', 'gold');
          } });
        opts.push({ label: '【引动】向阵枢注入灵力', tag: '冒险', next: null, onChoose: (pl) => {
            if (Math.random() < 0.6) {
              const m = RNG.pick(['MAT-F03','MAT-F05','MAT-G05','MAT-C08','MAT-INCENSE2']);
              STATE.addMaterial(pl, m, 1);
              pl.gold = (pl.gold || 0) + RNG.intBetween(40, 100);
              Engine.log('阵枢轰鸣，一道灵光没入你眉心——获得【' + STATE.matName(m) + '】与金币！', 'gold');
              App.goto('home_fumo_go');
            } else {
              Engine.log('阵枢忽然逆转，狂暴灵力反噬而来！', 'evil');
              const en = STATE.makeEnemy(p, { lv: (p.lv || 1) + 2, state: { name:'狂暴', id:'chaotic' }, namePrefix:'阵枢', name:'逆阵灵', hpMul: 3.8, atkMul: 1.0, defMul: 0.5, element:'雷', bg:'assets/img/scenes/fumo-cave.jpg' });
              pl._pendingEnemy = en;
              App.goto('home_fumo_battle');
            }
          } });
        opts.push({ label: '【离开】不轻易触动前人法阵', next: 'home_fumo_go' });
        return { id:'home_fumo_evt', title:'【伏魔窟】遗落法阵', bg:'assets/img/scenes/fumo-cave.jpg',
          text:'雾中石台上刻着一座古老法阵，阵纹明灭，仿佛仍在等待有人注入灵力。\n\n阵纹晦涩难懂，参悟可增修为，强行引动则吉凶难料。',
          options: opts };
      }
      // —— 无名道碑：参拜获命格机缘 / 拓印碑文 ——
      if (evtId === 'shrine') {
        const opts = [];
        opts.push({ label: '【参拜】诚心叩拜，聆听道音', tag: '机缘', next: 'home_fumo_go', onChoose: (pl) => {
            pl.drawChances = (pl.drawChances || 0) + 1;
            Engine.log('道碑泛起微光，一道玄音入耳——你感觉命格凝炼之机 +1！', 'gold');
          } });
        opts.push({ label: '【拓印】临摹碑上文意', tag: '采集', next: 'home_fumo_go', onChoose: (pl) => {
            STATE.addMaterial(pl, 'MAT-INCENSE1', 1);
            Engine.log('你拓下一角碑文，纸墨间隐有清香，获得【普通灵香】×1。', 'good');
          } });
        opts.push({ label: '【离开】敬意于心，不扰道碑', next: 'home_fumo_go' });
        return { id:'home_fumo_evt', title:'【伏魔窟】无名道碑', bg:'assets/img/scenes/fumo-cave.jpg',
          text:'一块无字道碑立于雾中，碑身温润，似有呼吸。你走近时，耳边隐约响起一句偈语：\n\n「命格先天，因果后天。」',
          options: opts };
      }
      // —— 困兽之斗：救助（羁绊）或猎杀（兽材） ——
      if (evtId === 'beast') {
        const opts = [];
        opts.push({ label: '【救助】用灵材为灵兽疗伤', tag: '善缘', next: 'home_fumo_go', onChoose: (pl) => {
            const have = (pl.materials['MAT-C01'] || 0) >= 2;
            if (!have) { Engine.log('你身上朱果不足（需 2 枚），灵兽哀鸣一声，目光黯淡。', 'evil'); return; }
            STATE.removeMaterial(pl, 'MAT-C01', 2);
            const pet = STATE.mainPet(pl);
            if (pet) {
              STATE.addPetBond(pl, 20);
              Engine.log('灵兽得救，亲昵地蹭了蹭你，出战灵宠羁绊 +20！', 'good');
            } else {
              pl.realm.exp = (pl.realm.exp || 0) + 300;
              try { STATE.checkLevelUp(pl); } catch (e) {}
              Engine.log('灵兽得救，衔来一枚灵果塞给你，修为 +300！', 'good');
            }
          } });
        opts.push({ label: '【猎杀】取其兽材', tag: '战斗', next: null, onChoose: (pl) => {
            const en = STATE.makeEnemy(p, { lv: Math.max(1, (p.lv || 1) - 2), state: { name:'重伤', id:'wounded', mul:0.6, aware:'unaware' }, namePrefix:'负伤', name:'灵兽', hpMul: 3.2, atkMul: 0.85, defMul: 0.45, element:'兽', bg:'assets/img/scenes/fumo-cave.jpg' });
            pl._pendingEnemy = en;
            Engine.log('灵兽低吼着挡在你面前，虽是重伤之躯，仍不肯退让。', 'evil');
            App.goto('home_fumo_battle');
          } });
        opts.push({ label: '【离开】不惊扰这头生灵', next: 'home_fumo_go' });
        return { id:'home_fumo_evt', title:'【伏魔窟】困兽之斗', bg:'assets/img/scenes/fumo-cave.jpg',
          text:'雾角蜷着一头负伤的灵兽，皮毛沾血，正警惕地瞪着来人。它身侧散落着几片泛光的鳞甲。\n\n救它，还是取它？',
          options: opts };
      }
      // —— 断桥残路：冒险一跃（机缘或摔伤） / 绕行 ——
      if (evtId === 'bridge') {
        const opts = [];
        opts.push({ label: '【一跃】冒险跃过断桥', tag: '冒险', next: null, onChoose: (pl) => {
            if (Math.random() < 0.6) {
              const m = RNG.pick(['MAT-F07','MAT-G06','MAT-C08','MAT-INCENSE2']);
              STATE.addMaterial(pl, m, 1);
              pl.gold = (pl.gold || 0) + RNG.intBetween(60, 120);
              Engine.log('你纵身一跃，稳稳落上对岸——崖壁裂隙中竟藏着一只木匣！获得【' + STATE.matName(m) + '】与金币！', 'gold');
              App.goto('home_fumo_go');
            } else {
              pl.hp = Math.max(1, pl.hp - Math.floor(maxHp * 0.2));
              Engine.log('脚下碎石崩落，你摔下断桥，幸被雾中藤蔓兜住，气血大损（-20%）。', 'evil');
              App.goto('home_fumo_go');
            }
          } });
        opts.push({ label: '【绕行】沿雾壁慢慢摸索', tag: '谨慎', next: 'home_fumo_go', onChoose: (pl) => {
            Engine.log('你小心翼翼绕行过断桥，费了些功夫，安然无恙。', 'good');
          } });
        opts.push({ label: '【折返】此路不通，另寻他路', next: 'home_fumo_go' });
        return { id:'home_fumo_evt', title:'【伏魔窟】断桥残路', bg:'assets/img/scenes/fumo-cave.jpg',
          text:'前方石桥从中断裂，桥下是深不见底的雾渊。对岸隐有灵光闪烁，似有宝匣搁浅。\n\n冒险一跃，还是谨慎绕行？',
          options: opts };
      }
      // —— 幻境心魔：强敌 / 灵香破除 / 退避 ——
      const opts2 = [];
      opts2.push({ label: '【直面】与心魔一战', tag: '战斗', next: null, onChoose: (pl) => {
          const en = STATE.makeEnemy(p, { lv: (p.lv || 1) + 6, state: { name:'心魔', id:'chaotic' }, namePrefix:'幻境', name:'心魔·真我', hpMul: 5, atkMul: 1.15, defMul: 0.55, element:'魂', bg:'assets/img/scenes/fumo-cave.jpg' });
          pl._pendingEnemy = en;
          Engine.log('你凝视心魔，拔剑相向！', 'evil');
          App.goto('home_fumo_battle');
        } });
      opts2.push({ label: '【破除】以灵香镇心魔（耗1份灵香）', tag: '机缘', next: 'home_fumo_go', onChoose: (pl) => {
          const inc = ['MAT-INCENSE1','MAT-INCENSE2','MAT-INCENSE3'].find(i => (pl.materials[i] || 0) > 0);
          if (!inc) { Engine.log('你身上没有灵香，无法镇魔，只得退避三舍。', 'evil'); return; }
          STATE.removeMaterial(pl, inc, 1);
          const expGain = 300 + (pl.lv || 1) * 20;
          pl.realm.exp = (pl.realm.exp || 0) + expGain;
          try { STATE.checkLevelUp(pl); } catch (e) {}
          Engine.log('你焚起' + STATE.matName(inc) + '，心魔在袅袅青烟中消散。修为 +' + expGain + '！', 'gold');
        } });
      opts2.push({ label: '【退避】不予理会，绕行', next: 'home_fumo_go' });
      return { id:'home_fumo_evt', title:'【伏魔窟】幻境心魔', bg:'assets/img/scenes/fumo-cave.jpg',
        text:`[img]assets/img/npc/npc_molao.jpg[/img]\n\n雾中忽然浮现一道与你一模一样的身影，它咧嘴而笑，声如裂帛：「我就是你——你逃得了么？」\n\n幻境心魔（Lv${(p.lv || 1) + 6}）在虚空中缓缓成形。`,
        options: opts2 };
    },

    /* 伏魔窟抉择结算（不同选择不同概率结果） */
    buildHomeFumoResolve(kind) {
      const p = App.player;
      if (!p) return { id:'home_fumo_resolve', title:'伏魔窟', bg:'assets/img/scenes/fumo-cave.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      let roll = Math.random();
      let text;
      // 进去：高概率遇魔（60%，用户要求"多增加怪物出现几率"）或珍贵灵材
      if (kind === 1) {
        // 「进去」不消耗时辰；伏魔窟内可反复深入，直到玩家主动退出或死亡
        p._fumoTimes = (p._fumoTimes || 0) + 1;   // 成就统计
        STATE.addDaily(p, 'fumo', 1);             // 每日目标
        if (roll < 0.6) {
          const en = STATE.fumoEnemy(p);
          p._pendingEnemy = en;
          return App.buildFumoEncounter(en, `${en.name}（${en.state.name}）的身影在雾中若隐若现。`, '【伏魔窟】遭遇魔物');
        }
        if (roll < 0.72) {
          // 伏魔窟图纸优先跟随"最近探索的国家"，保证与周边探险上下文一致
          const bpNation = p.nation || p._exploreNation || 'qingqiu';
          const bp = STATE.randomBlueprint(p, bpNation);
          if (bp) { p.unlocked.add(bp); text = '你在雾中深处的石台上，发现一份【职业传承图纸】！'; }
          else {
            const mat = RNG.pick(STATE.exploreMaterialPool(p, true));
            STATE.addMaterial(p, mat, RNG.intBetween(1,4));
            text = '你在雾中寻得【' + STATE.matName(mat) + '】！';
          }
        } else if (roll < 0.88) {
          // 随机事件（商旅/宝箱/灵泉/遗刻/幻境心魔）——让伏魔窟每次进入都有惊喜
          return App.buildFumoRandomEvent(p);
        } else {
          // 伏魔窟掉落品质提升：20% 概率掉落"高出玩家等级的高阶材料"（各国 06 稀有材料 + 通用高阶）
          if (RNG.chance(0.2)) {
            const highMat = RNG.pick(App._fumoHighMatPool());
            STATE.addMaterial(p, highMat, RNG.intBetween(1,2));
            Engine.log('雾中灵光闪耀，你寻得一份【' + STATE.matName(highMat) + '】——成色非凡！', 'gold');
            text = `你在雾中深处寻得【${STATE.matName(highMat)}】（高阶灵材，可炼制高级丹药）！`;
          } else {
            const mat = RNG.pick(STATE.exploreMaterialPool(p, true));
            STATE.addMaterial(p, mat, RNG.intBetween(1,4));
            text = `你在雾中寻得【${STATE.matName(mat)}】！`;
          }
        }
      } else if (kind === 2) {
        // 等待：较低概率遇魔（25%），中等概率灵材
        if (roll < 0.25) {
          const en = STATE.fumoEnemy(p);
          p._pendingEnemy = en;
          return App.buildFumoEncounter(en, `雾未散，${en.name}（${en.state.name}）却悄然逼近。`, '【伏魔窟】魔物突袭');
        }
        const mat = RNG.pick(STATE.exploreMaterialPool(p, true));
        STATE.addMaterial(p, mat, RNG.intBetween(1,3));
        text = `雾散之后，你拾得【${STATE.matName(mat)}】。`;
      } else {
        // 离开：也可能遇怪或捡到灵材（概率较低）
        if (roll < 0.18) {
          const en = STATE.fumoEnemy(p);
          p._pendingEnemy = en;
          return App.buildFumoEncounter(en, `你正要离开，${en.name}（${en.state.name}）却从旁现身。`, '【伏魔窟】被截击');
        }
        const mat = RNG.pick(STATE.exploreMaterialPool(p, true));
        STATE.addMaterial(p, mat, 1);
        text = `你虽离开，却在洞口拾得【${STATE.matName(mat)}】。`;
      }
      // 结算后的选项：不耗时辰，可继续深入；可随时返回家园
      // （丹药只在战斗中服用——战斗界面提供"每回合一次"的丹药按钮，这里不提供随时服药选项）
      const maxHp = STATE.calcMaxHp(p);
      const hpText = `\n\n当前气血：${p.hp}/${maxHp}（窟内不会自动回复，丹药须在战斗中使用）`;
      const opts = [];
      opts.push({ label:'继续深入（不耗时辰）', next:'home_fumo_go' });
      opts.push({ label:'返回家园', next:'home' });
      return { id:'home_fumo_resolve', title:'【伏魔窟】', bg:'assets/img/scenes/fumo-cave.jpg',
        text: text + hpText, options: opts };
    },

    /* ============== 家园·职业（查看与转职） ============== */
    buildHomeProfession() {
      const p = App.player;
      if (!p) return { id:'home_profession', title:'职业', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const hidden = STATE.getHiddenProfessions();
      const cur = (global.PROFESSIONS || {})[p.profession] || (hidden[p.profession] && hidden[p.profession]) || null;
      const curName = p.professionName || (cur && cur.name) || '道徒';
      const curSkill = p.mainSkill || (cur && cur.mainSkill) || '';
      const owned = p.ownedProfessions || [];
      const blueprints = Object.keys(hidden)
        .map(k => hidden[k].bp)
        .filter(b => (p.unlocked || new Set()).has(b))
        .map(b => STATE.matName(b)).join('、') || '（无）';
      const opts = [];
      // 隐藏职业：仅显示"已获得图纸"或"已转职"的；无图纸的不开放（不显示）
      Object.keys(hidden).forEach(k => {
        const prof = hidden[k];
        const hasBp = (p.unlocked || new Set()).has(prof.bp);
        const isCur = p.profession === prof.id;
        if (isCur) {
          opts.push({ label: `【当前】${prof.name}（${prof.tag}）`, tag: '职业', next: 'home_profession' });
        } else if (owned.includes(k)) {
          // 已转职过：可随时切换
          opts.push({ label: `【切换】转为${prof.name}`, tag: '切换', onChoose: (pl) => { STATE.applyProfession(pl, prof); Engine.log('已切换为' + prof.name + '。', 'good'); }, next: 'home_profession' });
        } else if (hasBp) {
          // 有图纸：可转职（按职业定制祖师/罗汉/禅师等降临描述）
          const master = prof.master || '祖师';
          const cost = STATE.professionCost(prof);
          opts.push({ label: `【转职】参悟${prof.name}（需Lv30 + ${cost.needText}）`, tag: '转职', onChoose: (pl) => {
            const r = STATE.changeProfession(pl, k);
            if (r.error) Engine.log(r.error, 'evil');
            else {
              Engine.log(`天地异象！${prof.name}一脉${master}虚影降临，为你灌顶传承！转职成功！`, 'gold');
              Engine.toast('转职成功：' + prof.name + '！', 'gold');
            }
          }, next: 'home_profession' });
        }
        // 无图纸：不显示（隐藏职业默认不开放）
      });
      opts.push({ label: '【传承阁】山海各派传承全录（含获取途径）', tag: '传承', onChoose: () => { App.showHeritageHall(); }, next: 'home_profession' });
      opts.push({ label: '【技能】配置出战技能（4主动+1被动）', tag: '技能', next: 'home_skill_config' });
      opts.push({ label: '返回家园', next: 'home' });
      // 当前职业立绘（三教职业 + 隐藏职业统一读取 img 字段）
      const curProfImg = (cur && cur.img) || (hidden[p.profession] && hidden[p.profession].img) || 'assets/img/nations/prof-tao.jpg';
      const homeStats = `
        <div class="hs-block hs-hero">
          <img src="${curProfImg}" class="hs-god-img" alt="${curName}" />
          <div class="hs-name">${curName}</div>
          <div class="hs-realm">${curSkill || ''}</div>
          <div class="hs-day">主修：${curSkill || '——'}</div>
        </div>
        <div class="hs-block hs-tip">${cur ? (cur.roleDesc || cur.tag || '') : ''}</div>`;
      return { id:'home_profession', title:'【职业】', bg:'assets/img/nations/lingpu-home.jpg',
        text:`当前职业：${curName}（主修：${curSkill}）\n\n已获图纸：${blueprints}\n\n转职条件：达到 Lv30，并集齐该职业所属国家的专属灵材（详见下方各转职选项，材料可在对应国家探索获得）。转职成功后可在各职业间随时切换。`,
        homeStats,
        options: opts };
    },

    /* ============== 传承阁：山海各派传承全录（隐藏职业机制化·获取路径透明） ============== */
    showHeritageHall() {
      const p = App.player;
      const hidden = STATE.getHiddenProfessions();
      const owned = p.ownedProfessions || [];
      const unlocked = p.unlocked || new Set();
      const rows = Object.keys(hidden).map(k => {
        const prof = hidden[k];
        const bp = prof.bp || '';
        const hasBp = unlocked.has(bp);
        const isOwned = owned.includes(k) || p.profession === k;
        const nationName = STATE.nationName(prof.nation || '');
        const bpName = bp ? STATE.matName(bp) : '（无图纸）';
        const srcHint = bpName.indexOf('传承卷') >= 0 ? bpName + '·' + nationName : '探索' + nationName + '或挑战模式可得';
        return { prof, hasBp, isOwned, srcHint };
      });
      const ownedRows = rows.filter(r => r.isOwned);
      const knownRows = rows.filter(r => !r.isOwned && r.hasBp);
      const unknownRows = rows.filter(r => !r.isOwned && !r.hasBp);
      let html = '<div class="bag-tip">传承阁收录三教之外的各派传承。获得对应国家的【职业传承卷】图纸后即可转职（需 Lv30 + 该国专属灵材）。</div>';
      const render = (list, label, extra) => {
        if (!list.length) return '';
        return `<div class="bag-group"><div class="bag-group-title">${label}（${list.length}）</div><div class="bag-group-body bag-cat-body">` +
          list.map(r => {
            const pr = r.prof;
            const cost = STATE.professionCost(pr);
            return `<div class="tome-item ${r.isOwned ? 'col' : ''}" style="margin-bottom:6px;">
              <span class="tome-item-name">${pr.name}</span>
              <span class="tome-item-sub">${pr.tag}</span>
              <span class="tome-item-src">出身：${STATE.nationName(pr.nation || '')} · ${r.srcHint}</span>
              <span class="tome-item-src">${extra ? extra(r) : ''}${cost ? '转职：Lv30 + ' + cost.needText : ''}</span>
            </div>`;
          }).join('') + '</div></div>';
      };
      html += render(ownedRows, '已习传承', (r) => '【已习得】');
      html += render(knownRows, '图纸在手·可转职', (r) => '【可转职】');
      html += render(unknownRows, '尚未获得的传承', (r) => '【获取途径】' + r.srcHint + '　');
      Engine.modal('传 承 阁', html, [{ label: '关闭', cls: 'btn-primary', fn: () => Engine.closeModal() }]);
    },

    /* ============== 家园·技能出战配置（奥义+普攻必带，其余主动自选4个 + 1被动） ============== */
    buildHomeSkillConfig() {
      const p = App.player;
      if (!p) return { id:'home_skill_config', title:'技能', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const info = STATE.getProfessionSkills(p);
      if (!info) return { id:'home_skill_config', title:'技能', bg:'assets/img/nations/lingpu-home.jpg', text:'无法读取职业技能。', options:[{label:'返回家园', next:'home'}] };
      const skills = info.skills;
      const passive = info.passive;
      // 神明赐予技能（已解锁的，进入可选池；未解锁不显示）
      const offerInfo = STATE.getOfferUnlockedSkills(p);
      const offerActives = offerInfo.active || [];
      const offerPassive = offerInfo.passive || null;
      const loadout = p.skillLoadout || { actives: [], passive: null };
      const activeIds = loadout.actives || [];
      // 必带（不可取消，不计入4个）：普攻 basic + 奥义 ultimate
      const mandatory = skills.filter(sk => sk.type === 'basic' || sk.type === 'ultimate');
      // 可自选（计入4个）：普通主动 skill + 位移 dodge + 格挡 block + 已解锁神明主动
      const selectable = skills.filter(sk => sk.type !== 'basic' && sk.type !== 'ultimate').concat(offerActives);
      const MAX_ACTIVE = 4;

      // 文本：必带区 + 自选区
      const mandStr = mandatory.map(sk => `【必带】${sk.name}（${sk.type === 'ultimate' ? '奥义' : '普攻'}·${sk.element}）${sk.desc}`).join('\n');
      const selStr = selectable.map(sk => {
        const mark = activeIds.includes(sk.id) ? '✓' : '○';
        const src = offerActives.some(o => o.id === sk.id) ? '·神赐' : '';
        return `${mark} ${sk.name}【${sk.type}${src}·${sk.element}】${sk.desc}`;
      }).join('\n');
      const opts = [];
      // 自选技能（点击切换，最多4个）
      selectable.forEach(sk => {
        const isSel = activeIds.includes(sk.id);
        opts.push({ label: (isSel ? '✓ ' : '○ ') + sk.name + '（' + sk.type + '·' + sk.element + '）' + (offerActives.some(o => o.id === sk.id) ? '〔神赐〕' : ''), tag: '技能',
          onChoose: (pl) => {
            let acts = (pl.skillLoadout && pl.skillLoadout.actives) ? pl.skillLoadout.actives.slice() : [];
            const idx = acts.indexOf(sk.id);
            if (idx >= 0) { acts.splice(idx, 1); }
            else {
              if (acts.length >= MAX_ACTIVE) { Engine.log('最多只能配置 4 个主动技能（奥义/普攻不计入）。', 'evil'); return; }
              acts.push(sk.id);
            }
            pl.skillLoadout = { actives: acts, passive: (pl.skillLoadout && pl.skillLoadout.passive) || null };
          }, next: 'home_skill_config' });
      });
      // 被动选择（职业被动 + 已解锁神明被动）
      const passiveOpts = [];
      if (passive) passiveOpts.push({ name: passive.name, desc: passive.desc, id: '__prof__' });
      if (offerPassive) passiveOpts.push({ name: offerPassive.name, desc: offerPassive.desc, id: offerPassive.id });
      const passiveStr = passiveOpts.map(ps => {
        const mark = (loadout.passive === ps.id) ? '✓' : '○';
        const src = (ps.id === '__prof__') ? '职业' : '神赐';
        return `${mark} 被动·${ps.name}【${src}】${ps.desc}`;
      }).join('\n');
      passiveOpts.forEach(ps => {
        const hasPassive = (loadout.passive === ps.id);
        opts.push({ label: (hasPassive ? '✓ ' : '○ ') + '被动·' + ps.name + '（' + ps.desc + '）', tag: '被动',
          onChoose: (pl) => {
            const acts = (pl.skillLoadout && pl.skillLoadout.actives) || [];
            pl.skillLoadout = { actives: acts, passive: hasPassive ? null : ps.id };
          }, next: 'home_skill_config' });
      });
      opts.push({ label: '【确定】完成配置', tag: '确认', next: 'home_profession' });
      opts.push({ label: '返回职业', next: 'home_profession' });
      const curActiveCount = activeIds.length;
      return { id:'home_skill_config', title:'【技能】出战配置', bg:'assets/img/nations/lingpu-home.jpg',
        text:`为【${info.prof.name}】配置出战技能。\n\n【必带（不可取消，不计入名额）】\n${mandStr}\n\n【自选主动（最多${MAX_ACTIVE}个）】\n${selStr}\n\n【被动（选1）】\n${passiveStr || '（无）'}\n\n当前已选主动：${curActiveCount}/${MAX_ACTIVE}`,
        options: opts };
    },

    /* ============== 家园·委托板（每日支线，次日刷新） ============== */
    buildHomeCommission() {
      const p = App.player;
      if (!p) return { id:'home_commission', title:'委托板', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const cc = STATE.getCommissions(p);
      const lines = cc.list.map((it, i) => {
        const have = p.materials[it.reqMat] || 0;
        const status = it.done ? '✓ 已完成' : (it.has ? '【可交付】' : '（缺 ' + (it.need - have) + ' 份）');
        const pillTxt = it.pill ? ' + ' + STATE.matName(it.pill) : '';
        return `第${i + 1}条 · ${it.desc}\n  需要：${STATE.matName(it.reqMat)}×${it.need}（持有 ${have}）｜报酬：${it.gold}金${pillTxt}｜${status}`;
      }).join('\n\n');
      const opts = [];
      cc.list.forEach((it, i) => {
        opts.push({
          label: it.done ? `【交付】${STATE.matName(it.reqMat)}×${it.need}（已完成）` : (it.has ? `【交付】${STATE.matName(it.reqMat)}×${it.need} → 领取${it.gold}金${it.pill ? ' + ' + STATE.matName(it.pill) : ''}` : `【交付】${STATE.matName(it.reqMat)}×${it.need}（材料不足）`),
          tag: '交付', next: 'home_commission',
          onChoose: (pl) => {
            if (it.done) { Engine.log('该委托已完成。', 'good'); return; }
            const r = STATE.claimCommission(pl, i);
            if (r.error) Engine.log(r.error, 'evil');
            else Engine.log('交付【' + r.name + '】，获得 ' + r.gold + ' 金' + (r.pill ? '与【' + STATE.matName(r.pill) + '】' : '') + '！', 'gold');
          }
        });
      });
      opts.push({ label: '【说明】每日3条委托，次日自动刷新；灵圃/集市/各国探索都可凑齐材料。', tag: '提示', next: 'home_commission' });
      return { id:'home_commission', title:'【委托板】每日委托', bg:'assets/img/scenes/home-market.jpg',
        text: '山海外务司的委托板钉着三张今日委托，皆是各地急需之物。交齐灵材，即可换取报酬。\n\n' + lines,
        options: opts };
    },

    /* ============== 家园·灵材市场（每日随机价格±50%） ============== */
    buildHomeMarket() {
      const p = App.player;
      if (!p) return { id:'home_market', title:'市场', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const market = STATE.getMarket(p);
      const gold = p.gold || 0;
      const tagTxt = (it) => (it.sale ? '🔥特惠 ' : '') + (it.tag === 'seed' ? '［种子］' : it.tag === 'evo' ? '［进化材料］' : '');
      const lines = market.items.map(it => {
        const owned = p.materials[it.id] || 0;
        return `${tagTxt(it)}${it.name}：买${it.buyPrice}金 / 卖${it.sellPrice}金（拥有 ${owned}）`;
      }).join('\n');
      const opts = [];
      // 筛选按钮：全部 / 只买 / 只卖（在买卖操作之前）
      const filter = p._marketFilter || 'all';
      opts.push({ label: `【筛选】${filter === 'all' ? '✓' : ''}全部   ${filter === 'buy' ? '✓' : ''}只买   ${filter === 'sell' ? '✓' : ''}只卖（点击切换）`, tag: '筛选',
        onChoose: (pl) => {
          pl._marketFilter = filter === 'all' ? 'buy' : (filter === 'buy' ? 'sell' : 'all');
        }, next: 'home_market' });
      // 买入（仅当筛选为 全部/只买 时显示）
      if (filter !== 'sell') {
        market.items.forEach(it => {
          opts.push({ label: `【买】${it.name}（${it.buyPrice}金，拥有${p.materials[it.id]||0}）`, tag: '买入',
            onChoose: (pl) => { const r = STATE.buyMaterial(pl, it.id, it.buyPrice); if (r.error) Engine.log(r.error, 'evil'); else Engine.log('购入' + it.name, 'good'); }, next: 'home_market' });
        });
      }
      // 卖出（仅当筛选为 全部/只卖 时显示）
      if (filter !== 'buy') {
        const ownedMats = Object.keys(p.materials || {}).filter(k => p.materials[k] > 0);
        let sellableCount = 0;
        ownedMats.forEach(mid => {
          const it = market.items.find(x => x.id === mid);
          if (!it) return;
          sellableCount++;
          const price = it.sellPrice;
          opts.push({ label: `【卖】${STATE.matName(mid)}（${price}金，拥有${p.materials[mid]}）`, tag: '卖出',
            onChoose: (pl) => { const r = STATE.sellMaterial(pl, mid, price); if (r.error) Engine.log(r.error, 'evil'); else Engine.log('售出' + STATE.matName(mid), 'good'); }, next: 'home_market' });
        });
        if (sellableCount === 0) {
          opts.push({ label: '（今日集市未收购你所拥有的灵材）', tag: '提示', next: 'home_market' });
        }
      }
      opts.push({ label: '返回家园', next: 'home' });
      return { id:'home_market', title:'【集市】灵材买卖', bg:'assets/img/scenes/home-market.jpg',
        text:`今日集市（第${market.day}天，价格每日随机浮动±50%）：\n\n金币：${gold}\n\n今日货品：\n${lines}\n\n[当前筛选：${filter === 'all' ? '全部' : (filter === 'buy' ? '只买' : '只卖')}]`,
        options: opts };
    },

    /* ============== 家园·供奉神明 ============== */
    buildHomeOffer() {
      const p = App.player;
      if (!p) return { id:'home_offer', title:'供奉', bg:'assets/img/nations/lingpu-home.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const gods = STATE.getGods();
      const curGod = p.offerGod ? gods[p.offerGod] : null;
      const value = p.offerValue || 0;
      const profMatch = (p.profession);
      // 已供奉：展示当前神 + 继续供奉
      if (curGod) {
        const opts = [];
        // 技能展示：已解锁的显示名称与效果，未解锁的以「???」占位（不透露内容）
        const skillLines = curGod.skills.map(s => {
          const lv = (s.type === 'passive') ? '被动' : '主动';
          const isUnlocked = (s.unlock || 0) <= value;
          if (isUnlocked) return `【已解锁】${s.name}（${lv}）${s.desc}`;
          return `【???】神明尚未显露此项神技（供奉值达到 ${s.unlock} 解锁）`;
        }).join('\n');
        // 供奉材料（不挑，展示可用的高价值材料）
        const incenses = ['MAT-INCENSE1','MAT-INCENSE2','MAT-INCENSE3'];
        incenses.forEach(im => {
          const have = p.materials[im] || 0;
          if (have > 0) {
            opts.push({ label: `【供奉】${STATE.matName(im)}（+${STATE.offerValue(im)}供奉值，拥有${have}）`, tag: '供奉',
              onChoose: (pl) => {
                const r = STATE.offer(pl, p.offerGod, im);
                if (r.error) Engine.log(r.error, 'evil');
                else if (r.full) Engine.log('供奉圆满！香火化作祖师赐福，命数 +' + (r.mingGain || 0) + '！', 'gold');
                else {
                  Engine.log('供奉值 +' + STATE.offerValue(im) + '，当前 ' + pl.offerValue, 'good');
                  if (r.unlockedNow && r.unlockedNow.length) Engine.log('神恩降临！解锁神技：【' + r.unlockedNow.map(s => s.name).join('】【') + '】，可前往【职业→技能配置】装备。', 'gold');
                }
              }, next: 'home_offer' });
          }
        });
        // 其他灵材也可供奉（列出所有拥有且可供奉的材料，按供奉值从高到低排序）
        const otherMats = Object.keys(p.materials || {})
          .filter(k => (p.materials[k] > 0) && incenses.indexOf(k) < 0 && STATE.offerValue(k) > 0)
          .sort((a, b) => STATE.offerValue(b) - STATE.offerValue(a));
        otherMats.forEach(m => {
          opts.push({ label: `【供奉】${STATE.matName(m)}（+${STATE.offerValue(m)}供奉值，拥有${p.materials[m]}）`, tag: '供奉',
            onChoose: (pl) => {
              const r = STATE.offer(pl, p.offerGod, m);
              if (r.error) Engine.log(r.error, 'evil');
              else if (r.full) Engine.log('供奉圆满！香火化作祖师赐福，命数 +' + (r.mingGain || 0) + '！', 'gold');
              else {
                Engine.log('供奉值 +' + STATE.offerValue(m) + '，当前 ' + pl.offerValue, 'good');
                if (r.unlockedNow && r.unlockedNow.length) Engine.log('神恩降临！解锁神技：【' + r.unlockedNow.map(s => s.name).join('】【') + '】，可前往【职业→技能配置】装备。', 'gold');
              }
            }, next: 'home_offer' });
        });
        // 明确的「供奉」按钮说明 + 无材料提示
        if (opts.length === 0) {
          opts.push({ label: '【供奉】暂无可供奉材料（去探险寻获灵香灵材吧）', tag: '供奉', onChoose: () => { Engine.log('背包中暂无材料，先去【探险】或【伏魔窟】寻获灵材、灵香。', 'evil'); }, next: 'home' });
        }
        opts.push({ label: '返回家园', next: 'home' });
        const awaken = value >= 1000;
        const evo = STATE.getProfessionEvolution(p);
        const stageInfo = STATE.offerStageInfo(p);
        const homeStats = `
          <div class="hs-block hs-hero">
            <img src="${curGod.img || ''}" class="hs-god-img" alt="${curGod.name}" />
            <div class="hs-name">${curGod.name}</div>
            <div class="hs-realm">${curGod.domain}</div>
            <div class="hs-day">供奉值 ${value}/1000</div>
          </div>
          <div class="hs-block">
            <div class="hs-row"><span>神灵</span><b>${curGod.master || ''}</b></div>
            <div class="hs-row"><span>定位</span><b>${curGod.roleDesc || curGod.role || ''}</b></div>
          </div>
          <div class="hs-block hs-tip">${stageInfo ? '每 +10 供奉值升一段：' + stageInfo.perStageDesc : ''}</div>
          <div class="hs-block hs-tip">${stageInfo && stageInfo.lvScaleDesc ? stageInfo.lvScaleDesc : ''}</div>
          <div class="hs-block hs-tip">${awaken ? '★ 供奉圆满，神降已备！此后继续供奉，每 20 供奉值化作 1 命数（祖师赐福）。' : '圆满(1000)后神降；此后继续供奉将化为命数回馈'}</div>
          ${evo && evo.match ? `<div class="hs-block hs-tip">${evo.evolved ? '★ 已触发职业进化（' + curGod.name + '传承），全属性+8%！' : '供奉圆满可触发职业进化（' + curGod.name + '传承）'}</div>` : ''}`;
        return { id:'home_offer', title:'供奉 · ' + curGod.name, bg:'assets/img/nations/lingpu-home.jpg',
          desc:`你虔诚供奉【${curGod.name}】。${curGod.desc}<br><b>定位：${curGod.roleDesc || curGod.role || '——'}</b><br>神明赐予神技（供奉值越高解锁越多，解锁后可在【职业→技能配置】装备）：<br>${skillLines.replace(/\n/g, '<br>')}<br>（供奉不可更改，材料不挑，品质越高供奉值越多；供奉圆满后继续供奉，每 20 供奉值化作 1 命数）`,
          homeStats,
          options: opts };
      }
      // 未供奉：选择要供奉的神（首次供奉需消耗一份材料，任意材料皆可，品质越高供奉值越多）
      const opts = [];
      Object.keys(gods).forEach(gid => {
        const g = gods[gid];
        // 锁定神：需隐藏成就「新生太阳」解锁
        if (g.locked && !STATE.hasAchievement(p, g.lockAchievement)) {
          opts.push({ label: `${g.name}·${g.domain}（???未解锁）`, tag: '锁定',
            onChoose: () => { Engine.log(`${g.name}尚未现世。相传唯有在【设置·兑换码】中输入秘语「红日」，方能唤其降临。`, 'evil'); }, next: 'home_offer' });
          return;
        }
        const isMatch = g.profMatch === profMatch;
        opts.push({ label: `${g.name}·${g.domain}${isMatch ? ' ★契合' : ''}（${g.roleDesc || g.role || ''}）`, tag: '供奉',
          onChoose: (pl) => {
            // 优先灵香，其次挑选一件拥有且供奉值最高的材料；一件都没有则提示探索获取
            const inc = ['MAT-INCENSE1','MAT-INCENSE2','MAT-INCENSE3'];
            let matId = null, matVal = -1;
            const owned = Object.keys(pl.materials || {}).filter(k => (pl.materials[k] || 0) > 0);
            for (const k of owned) {
              const v = STATE.offerValue(k);
              if (v > matVal) { matVal = v; matId = k; }
            }
            // 灵香优先（价值更高更贴合主题，但已在上方按 offerValue 选出最高值材料，灵香天然更高，无需特殊处理）
            if (!matId) {
              Engine.log('尚无任何可供奉的材料，先去【探险】寻获灵材或灵香吧。', 'evil');
              return;
            }
            const r = STATE.offer(pl, gid, matId);
            if (r.error) Engine.log(r.error, 'evil');
            else Engine.log('开始供奉' + g.name + '（' + STATE.matName(matId) + '），当前供奉值 ' + pl.offerValue, 'good');
          }, next: 'home_offer' });
      });
      opts.push({ label: '返回家园', next: 'home' });
      return { id:'home_offer', title:'供奉 · 选择神明', bg:'assets/img/nations/lingpu-home.jpg',
        desc:`<b style="color:#e05a4a">⚠ 供奉神明后不可更改，请慎重选择！</b><br>· 供奉值每 +10 升一段，给予角色属性加持。<br>· 神技随供奉值逐步解锁（解锁前不显其名），解锁后可在【职业→技能配置】装备。<br>· 本职业契合神明（标 ★契合）供奉圆满可触发【职业进化】，全属性+8%，建议优先选择。<br>· 你当前职业为「${profMatch}」，契合神明已在上方标出。`,
        options: opts };
    },

    /* ============== 家园·探险战斗 ============== */
    buildHomeWildBattle() {
      const p = App.player;
      if (!p) return { id:'home_wild_battle', title:'战斗', bg:'assets/img/scenes/forest.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const en = (p._pendingEnemy) ? p._pendingEnemy : STATE.fumoEnemy(p);
      // 兜底：待战敌人必须携带战斗引擎所需字段（state/lv/bg 等），缺省则补默认值
      if (!en.state) en.state = { id:'normal', name:'常态', mul:1.0, aware:'aware' };
      if (!en.lv) en.lv = 1;
      if (!en.bg) en.bg = 'assets/img/scenes/battlefield.jpg';
      if (en.maxHp === undefined) en.maxHp = en.hp;
      if (en.def === undefined) en.def = Math.max(2, Math.floor((p.lv || 1) * 1.2));
      // 偷袭：先手优势（玩家获得额外能量，敌人首回合减防）
      const ambush = p._ambushBonus === true;
      return {
        id: 'home_wild_battle', title:'【探险】遭遇战', bg: en.bg,
        text:`${en.name}（${en.state.name}）袭来！${ambush ? '你抢占先机，趁其未及反应发难！' : ''}`,
        options: [],
        battle: {
          enemy: en,
          isWild: true,
          ambush: ambush,
          onWin: (pl) => {
            pl._ambushBonus = false;
            pl._pendingEnemy = null;
            // 探索需求战斗（NPC 委托）：胜利后发放奖励 + 委托完成文本
            if (en._questReward) {
              const qk = en._questKey;
              const done = !!(pl._questDone && pl._questDone[qk]);
              if (!done) {
                if (en._questReward.exp) { pl.realm.exp = (pl.realm.exp || 0) + en._questReward.exp; const lu = STATE.checkLevelUp(pl); if (lu) Engine.log('境界提升！', 'good'); }
                if (en._questReward.gold) { pl.gold = (pl.gold || 0) + en._questReward.gold; }
                if (!pl._questDone) pl._questDone = {};
                pl._questDone[qk] = true;
                Engine.toast('委托完成！获得奖励', 'gold');
              }
              Engine.log(en._questDoneText || '你完成了委托。', 'good');
            } else {
              Engine.log('击退魔物！可继续探索。', 'good');
            }
          },
          onLose: (pl) => { pl._ambushBonus = false; pl._pendingEnemy = null; Engine.log('你败下阵来……', 'evil'); },
          after: 'home_explore_go'
        }
      };
    },
    /* ============== 伏魔窟战斗（内部分发） ============== */
    buildHomeFumoBattle() {
      const p = App.player;
      if (!p) return { id:'home_fumo_battle', title:'战斗', bg:'assets/img/scenes/fumo-cave.jpg', text:'无角色', options:[{label:'返回家园', next:'home'}] };
      const en = (p._pendingEnemy) ? p._pendingEnemy : STATE.fumoEnemy(p);
      const ambush = p._ambushBonus === true;
      return {
        id: 'home_fumo_battle', title:'【伏魔窟】死战', bg: en.bg,
        text:`${en.name}（${en.state.name}）封锁了退路，唯有一战！${ambush ? '你抢占先机！' : ''}`,
        options: [],
        battle: {
          enemy: en,
          isWild: true,
          ambush: ambush,
          onWin: (pl) => {
            pl._ambushBonus = false;
            pl._pendingEnemy = null;
            Engine.log('你斩杀了窟中魔物！', 'good');
            const mat = RNG.pick(STATE.exploreMaterialPool(pl, true));
            STATE.addMaterial(pl, mat, RNG.intBetween(1,4));
            Engine.log('从魔物身上搜得【' + STATE.matName(mat) + '】！', 'good');
          },
          onLose: (pl) => {
            pl._ambushBonus = false;
            pl._pendingEnemy = null;
            // 死亡掉落：随机掉落部分灵材
            const lost = STATE.dropMaterialsOnDeath(pl);
            if (lost.length) {
              Engine.log('你战死窟中，魔物撕扯之下，丢失了部分灵材：' + lost.map(l => STATE.matName(l.id) + '×' + l.n).join('、'), 'evil');
            } else {
              Engine.log('你战死窟中，所幸身上无物可失。', 'evil');
            }
          },
          onFlee: (pl) => {
            // 伏魔窟逃离：回到伏魔窟继续探索（而非直接回家园）
            pl._ambushBonus = false;
            pl._pendingEnemy = null;
            Engine.log('你趁隙脱身，退回魔窟入口。', 'system');
          },
          fleeAfter: 'home_fumo_go',
          after: 'home_fumo_go'
        }
      };
    }
  };

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

  global.App = App;
  global.AudioMgr = AudioMgr;
})(window);