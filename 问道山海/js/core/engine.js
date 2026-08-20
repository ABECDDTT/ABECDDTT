/* ===========================================================
 * 问道山海 · 核心场景/分支引擎
 * 负责：打字机、选项渲染、场景跳转、选中标记、键盘控制
 * =========================================================== */
(function (global) {
  'use strict';

  const Engine = {
    /** 当前场景 */
    current: null,
    /** 当前选项焦点索引（键盘） */
    focusIndex: 0,
    /** 打字机是否在跑 */
    typing: false,
    /** 类型队列 */
    typeTimer: null,
    /** 跳过标记 */
    skipType: false,

    /* ============== 1. 屏幕切换 ============== */
    show(id) {
      document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
      });
      const target = document.getElementById(id);
      if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
      }
      // 任务指引：战斗/封面/选职/命格界面隐藏，剧情与家园显示
      const guide = document.getElementById('quest-guide');
      if (guide) {
        const hideScreens = ['screen-battle', 'screen-title', 'screen-difficulty', 'screen-profession', 'screen-mingshen', 'screen-mingshen-result'];
        if (hideScreens.indexOf(id) >= 0) guide.classList.add('hidden');
      }
    },

    /* ============== 2. 背景图切换 ============== */
    setBg(url) {
      const img = document.getElementById('bg-image');
      if (!img) { if (typeof console !== 'undefined') console.error('setBg: no #bg-image element'); return; }
      if (!url) {
        img.style.backgroundImage = '';
        img.classList.remove('show');
        img.style.opacity = '0';
        return;
      }
      try {
        img.style.backgroundImage = `url('${url}')`;
        img.style.opacity = '1';
        img.classList.add('show');
        requestAnimationFrame(() => img.classList.add('show'));
        try { setTimeout(() => { if (img) { img.style.opacity = '1'; img.classList.add('show'); } }, 80); } catch (e) {}
      } catch (e) {
        if (typeof console !== 'undefined') console.error('setBg failed:', e, 'url:', url);
      }
    },

    /* ============== 3. 状态栏 ============== */
    showStatus() {
      document.getElementById('status-bar').classList.remove('hidden');
      document.getElementById('log-rail').classList.remove('hidden');
    },
    hideStatus() {
      document.getElementById('status-bar').classList.add('hidden');
      document.getElementById('log-rail').classList.add('hidden');
    },
    refreshQuestGuide(p) {
      const guide = document.getElementById('quest-guide');
      if (!guide) return;
      const titleEl = document.getElementById('qg-title');
      const primaryEl = document.getElementById('qg-primary');
      const itemsEl = document.getElementById('qg-items');
      if (!titleEl || !primaryEl || !itemsEl) return;
      // 无角色或封面隐藏
      if (!p || !p.name) { guide.classList.add('hidden'); return; }
      const data = (typeof STATE.getQuestGuide === 'function') ? STATE.getQuestGuide(p) : null;
      if (!data || !data.primary) { guide.classList.add('hidden'); return; }
      guide.classList.remove('hidden');
      // 标题（保留折叠按钮，仅更新文字部分）
      const titleText = titleEl.querySelector('span');
      if (titleText) titleText.textContent = '当前指引';
      // 折叠按钮（只在首次绑定时注册）
      const toggle = document.getElementById('qg-toggle');
      if (toggle && !toggle._bound) {
        toggle._bound = true;
        toggle.onclick = () => {
          const collapsed = guide.classList.toggle('collapsed');
          toggle.textContent = collapsed ? '+' : '−';
          toggle.title = collapsed ? '展开' : '折叠';
          try { localStorage.setItem('wenda-guide-collapsed', collapsed ? '1' : '0'); } catch (e) {}
        };
        // 恢复上次折叠状态
        try {
          if (localStorage.getItem('wenda-guide-collapsed') === '1') {
            guide.classList.add('collapsed');
            toggle.textContent = '+';
            toggle.title = '展开';
          }
        } catch (e) {}
      }
      // 主要目标（可点击跳转）
      primaryEl.innerHTML = '';
      const primarySpan = document.createElement('span');
      primarySpan.textContent = data.primary.text;
      primaryEl.appendChild(primarySpan);
      primaryEl.onclick = () => Engine.gotoGuide(data.primary.action, data.primary.tag);
      // 次级指引
      itemsEl.innerHTML = '';
      (data.items || []).forEach(it => {
        const li = document.createElement('li');
        if (it.tag) {
          const tag = document.createElement('span');
          tag.className = 'qg-tag';
          tag.textContent = it.tag;
          li.appendChild(tag);
        }
        li.appendChild(document.createTextNode(it.text));
        li.onclick = () => Engine.gotoGuide(it.action, it.tag);
        itemsEl.appendChild(li);
      });
    },

    /** 指引点击跳转：根据 action 类型跳转到对应场景 */
    gotoGuide(action, tag) {
      const p = (typeof App !== 'undefined' && App.player) ? App.player : null;
      if (!p) return;
      if (action === 'home') { App.goto('home'); return; }
      if (action === 'challenge') {
        // 回到挑战营地（挑战模式任务指引点击跳转）
        const cid = p.challengeId;
        if (cid && typeof App.buildChallengeScene === 'function') {
          const sc = App.buildChallengeScene(cid);
          // V1.3.20：营地含 homeStats 用 renderHome，避免文字式排版
          if (sc) { if (sc.homeStats) Engine.renderHome(sc); else Engine.enterScene(sc); Engine.refreshStatus(p); return; }
        }
        return;
      }
      if (action === 'story') {
        // 回到当前国家的完整探索屏（剧情 NPC 与全部 NPC 合一，进度由 _storyState 恢复）
        // 优先当前国家：无论 _inStory 是否残留上个国家的标记，都进入当前国家的剧情/探索合一界面
        const stNation = p.nation || (p._inStory && p._inStory.nationId) || 'qingqiu';
        if (stNation && typeof EXPLORE !== 'undefined' && EXPLORE[stNation] && typeof App.enterExplore === 'function') { App.enterExplore(stNation); return; }
        if (stNation && typeof App.enterStory === 'function') { App.enterStory(stNation); return; }
      }
      if (action === 'continue') {
        // 断点续玩一致化：优先当前国家（剧情/探索合一，进度由 _storyState 按国家恢复）
        // 不再使用 _inStory.nationId（可能残留上个国家的剧情标记，导致误跳回旧国家）
        const nationId = p.nation || 'qingqiu';
        if (typeof EXPLORE !== 'undefined' && EXPLORE[nationId] && typeof App.enterExplore === 'function') {
          App.enterExplore(nationId);
          return;
        }
        if (p._inStory && p._inStory.nationId && typeof EXPLORE !== 'undefined' && EXPLORE[p._inStory.nationId] && typeof App.enterExplore === 'function') {
          App.enterExplore(p._inStory.nationId);
          return;
        }
        // 返回当前主线（沿用家园「继续探险」逻辑）
        const backTo = p.currentScene || (p.nation === 'qingqiu' || !p.nation ? 'q01_02_accept' : p.nation + '_entry');
        App.goto(backTo);
        return;
      }
      // 其他：直接跳转对应场景
      if (action) App.goto(action);
    },

    refreshStatus(p) {
      if (!p) return;
      let nameText = `${p.name} · ${p.professionName}`;
      // 固定命格角色：标注品质
      if (p.charQuality) nameText = `${p.name}【${p.charQuality}】 · ${p.professionName}`;
      // 已装备皮肤：在角色名后追加皮肤名（跨存档生效的全局皮肤）
      try {
        if (typeof global.META !== 'undefined' && META.getEquippedSkin) {
          const eq = META.getEquippedSkin();
          if (eq && eq.id && global.getSkin) {
            const s = global.getSkin(eq.id);
            if (s) nameText += ` · ${s.name}`;
          }
        }
      } catch (e) {}
      document.getElementById('s-name').textContent = nameText;
      // V1.3.20：空值防御（旧档缺 realm/hp/mp 时不显示 NaN/undefined）
      const rName = (p.realm && p.realm.name) || '凡体';
      const lvNow = p.lv || 1;
      document.getElementById('s-realm').textContent = `${rName} Lv${lvNow}`;
      const maxHp = STATE.calcMaxHp(p);
      const maxMp = STATE.calcMaxMp(p);
      const hpNow = isFinite(p.hp) ? p.hp : maxHp;
      const mpNow = isFinite(p.mp) ? p.mp : maxMp;
      const hpPct = Math.max(0, Math.min(100, (hpNow / maxHp) * 100));
      const mpPct = Math.max(0, Math.min(100, (mpNow / maxMp) * 100));
      // 当前国家恶念值（而非全局恶念）
      const natEvil = (p.nation && p.nationEvil && p.nationEvil[p.nation] != null) ? p.nationEvil[p.nation] : 0;
      const nationNames = { qingqiu:'青丘', yumin:'羽民', yanhuo:'厌火', xuanyuan:'轩辕', xuangu:'玄股', huantou:'讙头', sanshou:'三首', nieer:'聂耳', daren:'大人', baimin:'白民', changgu:'长股', zhurao:'周饶', jiaojing:'交胫', rouli:'柔利', shenmu:'深目', wuchang:'无肠', yimu:'一目', jiexiong:'结胸', qizhong:'跂踵', guixu:'归墟' };
      const evilLabel = document.getElementById('evil-label');
      if (evilLabel) evilLabel.textContent = '恶念·' + (nationNames[p.nation] || '当前');
      const evilPct = Math.max(0, Math.min(100, natEvil));
      document.getElementById('bar-hp').style.width = hpPct + '%';
      document.getElementById('bar-mp').style.width = mpPct + '%';
      document.getElementById('bar-evil').style.width = evilPct + '%';
      document.getElementById('txt-hp').textContent = `${p.hp}/${maxHp}`;
      document.getElementById('txt-mp').textContent = `${p.mp}/${maxMp}`;
      document.getElementById('txt-evil').textContent = `${natEvil}`;
      // 灵宠
      const petEl = document.getElementById('s-pet');
      if (petEl) {
        const main = STATE.mainPet(p);
        if (main) {
          const st = STATE.petStats(p, main);
          petEl.textContent = `🐾 ${main.name}  ${main.evoLine[main.evoStage]}`;
          petEl.title = `品质${main.quality}·${main.contractName}·${main.raceName}\n攻击${st.atk} 生命${st.hp} 防御${st.def}`;
        } else {
          petEl.textContent = '';
        }
      }
      // 常驻任务指引（左上角）
      Engine.refreshQuestGuide(p);
    },

    /* ============== 4. 因果卷轴 ============== */
    log(message, type = '') {
      const list = document.getElementById('log-rail-list');
      if (!list) return;
      const item = document.createElement('div');
      item.className = 'item ' + type;
      item.textContent = '· ' + message;
      list.appendChild(item);
      list.scrollTop = list.scrollHeight;
      while (list.children.length > 30) list.removeChild(list.firstChild);
    },

    /* ============== 5. 模态弹窗 ============== */
    modal(title, content, actions = [{ label:'确 定', cls:'btn-primary', fn:() => Engine.closeModal() }], opts = {}) {
      const titleEl = document.getElementById('modal-title');
      const c = document.getElementById('modal-content');
      const ac = document.getElementById('modal-actions');
      const box = document.getElementById('modal');
      const body = document.querySelector('#modal .modal-body');
      if (!titleEl || !c || !ac || !box) return;
      // 弹窗宽度模式：narrow（菜单/设置等紧凑弹窗）
      if (body) {
        if (opts.narrow) body.classList.add('narrow');
        else body.classList.remove('narrow');
      }
      titleEl.textContent = title;
      // 标题栏统一加一个右上角 × 关闭按钮（固定、不随内容滚动、永不被遮挡）
      const closeX = document.createElement('span');
      closeX.className = 'modal-title-close';
      closeX.textContent = '×';
      closeX.onclick = () => Engine.closeModal();
      // 关键：先移除旧关闭键再追加，避免多次打开后 × 累积导致点击到旧按钮（直接全关）
      const oldCloseX = titleEl.querySelector('.modal-title-close');
      if (oldCloseX) oldCloseX.remove();
      titleEl.appendChild(closeX);
      c.innerHTML = '';
      if (typeof content === 'string') c.innerHTML = content;
      else if (content instanceof Node) c.appendChild(content);
      ac.innerHTML = '';
      for (const a of actions) {
        const btn = document.createElement('button');
        btn.className = 'btn ' + (a.cls || 'btn-ghost');
        btn.textContent = a.label;
        btn.onclick = a.fn;
        ac.appendChild(btn);
      }
      // 兼容旧的 .big-close 按钮（内容里残留的 ×，同样绑定关闭）
      c.querySelectorAll('.big-close').forEach(el => { el.onclick = () => Engine.closeModal(); });
      box.classList.remove('hidden');
    },
    closeModal() {
      const box = document.getElementById('modal');
      if (box) box.classList.add('hidden');
    },

    /* ============== 5.5 飘字提示 ============== */
    toast(text, type = 'info') {
      const box = document.getElementById('toast-layer');
      if (!box) return;
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      el.textContent = text;
      box.appendChild(el);
      setTimeout(() => el.classList.add('show'), 10);
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2200);
      // 限制数量
      while (box.children.length > 4) box.removeChild(box.firstChild);
    },

    /* ============== 5.6 成就弹窗（左下角，可关闭 / 2秒自动关闭） ============== */
    notifyAchievements(list) {
      // 检查设置：是否开启成就弹窗
      try {
        if (localStorage.getItem('wenda-ach-popup') === '0') return;
      } catch (e) {}
      if (!list || !list.length) return;
      Engine.sfx('reward');
      let box = document.getElementById('ach-popup-layer');
      if (!box) {
        box = document.createElement('div');
        box.id = 'ach-popup-layer';
        box.className = 'ach-popup-layer';
        document.body.appendChild(box);
      }
      list.forEach((a, i) => {
        const el = document.createElement('div');
        el.className = 'ach-popup';
        const rewardHtml = (a.reward && a.reward.length)
          ? `<div class="ach-popup-reward">奖励：${a.reward.join('　')}</div>`
          : '';
        el.innerHTML = `<div class="ach-popup-icon"><img src="assets/img/achievements/${a.icon || 'ach-default'}.jpg" alt=""></div>
          <div class="ach-popup-body"><div class="ach-popup-title">成就达成 · ${a.name}</div>
          <div class="ach-popup-flavor">${a.flavor || ''}</div>
          ${rewardHtml}</div>
          <button class="ach-popup-close" title="关闭">✕</button>`;
        // 关闭按钮
        const close = el.querySelector('.ach-popup-close');
        if (close) close.onclick = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); };
        box.appendChild(el);
        setTimeout(() => el.classList.add('show'), 50 + i * 120);
        // 2秒后自动关闭
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2400 + i * 120);
      });
      // 限制数量
      while (box.children.length > 4) box.removeChild(box.firstChild);
    },

    /* ============== 5.7 音效合成（Web Audio，零文件依赖） ============== */
    _audioCtx: null,
    _sfxOn: true,
    _ensureAudio() {
      if (!Engine._audioCtx) {
        try {
          const AC = global.AudioContext || global.webkitAudioContext;
          if (AC) Engine._audioCtx = new AC();
        } catch (e) { Engine._audioCtx = null; }
      }
      return Engine._audioCtx;
    },
    /** 播放一段合成音效。type: 'click'|'breakthrough'|'battle'|'win'|'lose' */
    sfx(type) {
      try {
        if (localStorage.getItem('wenda-sfx') === '0') return;
      } catch (e) {}
      const ctx = Engine._ensureAudio();
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume && ctx.resume(); }
      const now = ctx.currentTime;
      const note = (freq, start, dur, type = 'sine', gain = 0.15) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now + start);
        g.gain.linearRampToValueAtTime(gain, now + start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now + start); osc.stop(now + start + dur);
      };
      switch (type) {
        case 'click':      note(660, 0, 0.06, 'square', 0.06); break;
        case 'battle':     note(180, 0, 0.12, 'sawtooth', 0.12); note(140, 0.08, 0.12, 'sawtooth', 0.10); break;
        case 'win':        note(523, 0, 0.12, 'triangle', 0.14); note(659, 0.1, 0.12, 'triangle', 0.14); note(784, 0.2, 0.2, 'triangle', 0.16); break;
        case 'lose':       note(220, 0, 0.15, 'sawtooth', 0.12); note(165, 0.14, 0.2, 'sawtooth', 0.12); break;
        case 'breakthrough': {
          // 上升音阶：五声音阶递进，营造「破境飞升」感
          const scale = [392, 440, 523, 587, 659, 784, 880, 1047];
          scale.forEach((f, i) => note(f, i * 0.08, 0.4, 'triangle', 0.13));
          note(1319, 0.66, 0.7, 'sine', 0.12);  // 高音收尾
          break;
        }
        case 'reward':     note(587, 0, 0.1, 'triangle', 0.12); note(880, 0.09, 0.15, 'triangle', 0.12); break;
        case 'mingshen': {
          // 命格抽取：古韵悠扬的连续上行（五声音阶 + 空灵泛音）
          const scale = [523, 587, 659, 784, 880, 1047];
          scale.forEach((f, i) => note(f, i * 0.06, 0.25, 'sine', 0.11));
          note(1568, 0.36, 0.6, 'sine', 0.10);
          break;
        }
        case 'crit':       note(1568, 0, 0.08, 'square', 0.13); note(2093, 0.05, 0.12, 'square', 0.12); break;
      }
    },

    /* ============== 5.8 突破仪式（全屏金色流光 + 境界 + 涨幅） ============== */
    breakthroughCeremony(realmName, gains) {
      const box = document.createElement('div');
      box.className = 'ceremony-mask';
      const gainLines = [];
      if (gains) {
        if (gains.life) gainLines.push(`<div class="ceremony-gain">生命 <b>+${gains.life}</b></div>`);
        if (gains.mp)   gainLines.push(`<div class="ceremony-gain">灵力 <b>+${gains.mp}</b></div>`);
        if (gains.atk)  gainLines.push(`<div class="ceremony-gain">攻击 <b>+${gains.atk}</b></div>`);
        if (gains.def)  gainLines.push(`<div class="ceremony-gain">防御 <b>+${gains.def}</b></div>`);
      }
      box.innerHTML = `<div class="ceremony-box">
        <div class="ceremony-rays"></div>
        <div class="ceremony-halo"></div>
        <div class="ceremony-title">境界突破</div>
        <div class="ceremony-realm">${realmName}</div>
        <div class="ceremony-gains">${gainLines.join('')}</div>
        <div class="ceremony-tip">道心通明，一往无前</div>
        <button class="btn btn-primary ceremony-btn">继续</button>
      </div>`;
      document.body.appendChild(box);
      Engine.sfx('breakthrough');
      const close = () => { box.classList.add('hide'); setTimeout(() => box.remove(), 500); };
      box.querySelector('.ceremony-btn').onclick = close;
      // 点击遮罩也可关闭
      box.addEventListener('click', (e) => { if (e.target === box) close(); });
    },

    /* ============== 5.9 战报卡片（通关/真结局生成，可导出图片分享） ============== */
    showBattleReport(data) {
      const p = data.player;
      if (!p) return;
      // 汇总战报数据
      const report = {
        name: p.name || '求道者',
        profession: p.professionName || '道徒',
        realm: (p.realm && p.realm.name) || '炼气期',
        lv: p.lv || 1,
        day: p.day || 1,
        ending: data.ending || '通关',
        achievements: (p.achievements || []).length,
        pets: (p.petDex || []).length,
        offerGod: (p.offerGod && STATE.getGods && STATE.getGods()[p.offerGod]) ? STATE.getGods()[p.offerGod].name : '无',
        round: p.round || 1
      };
      const html = `
        <div class="report-card" id="report-card">
          <div class="report-title">问道山海 · 战报</div>
          <div class="report-name">${report.name}</div>
          <div class="report-line">${report.profession} · ${report.realm} Lv${report.lv}</div>
          <div class="report-line">达成结局：<b>${report.ending}</b></div>
          <div class="report-grid">
            <div class="report-item"><div class="report-num">${report.day}</div><div class="report-k">历经天数</div></div>
            <div class="report-item"><div class="report-num">${report.achievements}</div><div class="report-k">成就数</div></div>
            <div class="report-item"><div class="report-num">${report.pets}</div><div class="report-k">灵宠图鉴</div></div>
            <div class="report-item"><div class="report-num">${report.round}</div><div class="report-k">周目</div></div>
          </div>
          <div class="report-line">供奉：${report.offerGod}</div>
          <div class="report-footer">问道山海 · 一念成神，一念成魔</div>
        </div>`;
      Engine.modal('战 报', html, [
        { label:'保存为图片', cls:'btn-secondary', fn: () => Engine.exportReportImage(report) },
        { label:'关闭', cls:'btn-primary', fn: () => Engine.closeModal() }
      ]);
    },

    /** 将战报绘制为图片并下载（Canvas，纯前端） */
    exportReportImage(report) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 600; canvas.height = 800;
        const ctx = canvas.getContext('2d');
        // 背景
        const grad = ctx.createLinearGradient(0, 0, 0, 800);
        grad.addColorStop(0, '#1a1208');
        grad.addColorStop(1, '#2a1c10');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 800);
        // 边框
        ctx.strokeStyle = '#c8a050';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, 560, 760);
        // 标题
        ctx.fillStyle = '#ffd778';
        ctx.font = 'bold 36px serif';
        ctx.textAlign = 'center';
        ctx.fillText('问道山海 · 战报', 300, 90);
        // 名字
        ctx.fillStyle = '#f0e6d8';
        ctx.font = 'bold 42px serif';
        ctx.fillText(report.name, 300, 160);
        // 职业境界
        ctx.fillStyle = '#c8b28a';
        ctx.font = '24px serif';
        ctx.fillText(report.profession + ' · ' + report.realm + ' Lv' + report.lv, 300, 210);
        // 结局
        ctx.fillStyle = '#ffd778';
        ctx.font = 'bold 26px serif';
        ctx.fillText('达成结局：' + report.ending, 300, 270);
        // 分隔线
        ctx.strokeStyle = '#5a4a38';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(80, 300); ctx.lineTo(520, 300); ctx.stroke();
        // 数据格子
        const items = [
          { n: report.day, k: '历经天数' },
          { n: report.achievements, k: '成就数' },
          { n: report.pets, k: '灵宠图鉴' },
          { n: report.round, k: '周目' }
        ];
        const cols = [110, 260, 410];
        items.forEach((it, i) => {
          const x = cols[i % 2] + (i >= 2 ? 150 : 0);
          const y = 380 + Math.floor(i / 2) * 130;
          ctx.fillStyle = '#ffd778';
          ctx.font = 'bold 40px serif';
          ctx.fillText(String(it.n), x, y);
          ctx.fillStyle = '#9a8a70';
          ctx.font = '18px serif';
          ctx.fillText(it.k, x, y + 34);
        });
        // 供奉
        ctx.fillStyle = '#c8b28a';
        ctx.font = '22px serif';
        ctx.fillText('供奉：' + report.offerGod, 300, 640);
        // 底部
        ctx.fillStyle = '#9a8a70';
        ctx.font = '16px serif';
        ctx.fillText('问道山海 · 一念成神，一念成魔', 300, 740);
        // 下载
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'wenda-shanhai-report-' + Date.now() + '.jpg';
        a.click();
      } catch (e) {
        Engine.log('图片导出失败，请稍后重试。', 'evil');
      }
    },

    /* ============== 6. 打字机 ============== */

    /** 立即渲染富文本（含 [highlight]/[keyword]/[curse] 标记），不逐字打字 */
    renderRichText(target, content) {
      target.innerHTML = '';
      const re = /\[(highlight|keyword|curse|img)\](.+?)\[\/\1\]/g;
      let lastIdx = 0, m;
      while ((m = re.exec(content)) !== null) {
        if (m.index > lastIdx) target.appendChild(document.createTextNode(content.slice(lastIdx, m.index)));
        if (m[1] === 'img') {
          // 图文穿插：在文字中插入插画/立绘
          const img = document.createElement('img');
          img.className = 'story-inline-img';
          img.src = m[2];
          img.alt = '';
          target.appendChild(img);
        } else {
          const span = document.createElement('span');
          span.className = m[1];
          span.textContent = m[2];
          target.appendChild(span);
        }
        lastIdx = re.lastIndex;
      }
      if (lastIdx < content.length) target.appendChild(document.createTextNode(content.slice(lastIdx)));
    },

    /** 打字机逐字渲染到 target。content: 文本；onDone: 完成回调（仅触发一次） */
    typewrite(target, content, onDone, speed = 28) {
      // 若有旧打字在跑，先清理，避免并发
      Engine.typing = false;
      clearInterval(Engine.typeTimer);
      Engine.typeTimer = null;

      Engine.typing = true;
      Engine.skipType = false;
      target.classList.add('type-cursor');
      target.innerHTML = '';

      // 支持简单的标记替换：[highlight]xxx[/highlight]、[img]path[/img]（图文穿插）
      const segments = [];
      const re = /\[(highlight|keyword|curse|img)\](.+?)\[\/\1\]/g;
      let lastIdx = 0, m;
      while ((m = re.exec(content)) !== null) {
        if (m.index > lastIdx) segments.push({ type: 'text', text: content.slice(lastIdx, m.index) });
        segments.push({ type: m[1], text: m[2] });
        lastIdx = re.lastIndex;
      }
      if (lastIdx < content.length) segments.push({ type: 'text', text: content.slice(lastIdx) });

      let segIdx = 0, charIdx = 0;
      let currentSpan = null;
      let done = false; // 防止 onDone 被多次调用

      const renderAll = () => {
        target.innerHTML = '';
        for (const seg of segments) {
          if (seg.type === 'img') {
            const img = document.createElement('img');
            img.className = 'story-inline-img';
            img.src = seg.text;
            img.alt = '';
            target.appendChild(img);
          } else if (seg.type === 'text') {
            target.appendChild(document.createTextNode(seg.text));
          } else {
            const span = document.createElement('span');
            span.className = seg.type;
            span.textContent = seg.text;
            target.appendChild(span);
          }
        }
      };

      const finish = () => {
        if (done) return;      // 只允许触发一次
        done = true;
        Engine.typing = false;
        target.classList.remove('type-cursor');
        clearInterval(Engine.typeTimer);
        Engine.typeTimer = null;
        if (typeof onDone === 'function') onDone();
      };

      const step = () => {
        if (done) { clearInterval(Engine.typeTimer); return; }
        if (Engine.skipType) {
          renderAll();
          finish();
          return;
        }
        // 逐段逐字
        if (segIdx < segments.length) {
          const seg = segments[segIdx];
          // 图片段：立即完整插入，不逐字
          if (seg.type === 'img') {
            const img = document.createElement('img');
            img.className = 'story-inline-img';
            img.src = seg.text;
            img.alt = '';
            target.appendChild(img);
            segIdx++;
            charIdx = 0;
            return;
          }
          if (charIdx === 0) {
            if (seg.type === 'text') currentSpan = document.createTextNode('');
            else { currentSpan = document.createElement('span'); currentSpan.className = seg.type; }
            target.appendChild(currentSpan);
          }
          if (charIdx < seg.text.length) {
            currentSpan.textContent += seg.text[charIdx];
            charIdx++;
          } else {
            segIdx++;
            charIdx = 0;
          }
        } else {
          finish();
          return;
        }
      };

      Engine.typeTimer = setInterval(step, speed);
    },

    /** 跳过当前打字（若在打字则立即完成并回调） */
    skipCurrentType() {
      if (Engine.typing) Engine.skipType = true;
    },

    /* ============== 7. 剧情场景渲染 ============== */
    /**
     * 进入一个场景
     * @param {object} scene - { id, title, text, options:[{label, require?, result, bg?}] }
     */
    enterScene(scene) {
      Engine.current = scene;
      Engine.focusIndex = 0;

      // 背景图
      if (scene.bg) Engine.setBg(scene.bg);

      // 标题
      const titleEl = document.getElementById('story-title');
      titleEl.textContent = scene.title || '';

      // 清空旧选项，防止残留
      const box = document.getElementById('story-options');
      if (box) box.innerHTML = '';

      // 文字渲染：菜单类场景（instant:true）立即全部显示；剧情场景逐字打字
      const textEl = document.getElementById('story-text');
      textEl.innerHTML = '';
      if (scene.instant) {
        // 立即渲染全文（含高亮标记），并直接显示选项
        Engine.renderRichText(textEl, scene.text || '');
        Engine.renderOptions(scene.options || []);
      } else {
        Engine.typewrite(textEl, scene.text || '', () => {
          Engine.renderOptions(scene.options || []);
        });
      }

      // 切换屏幕
      Engine.show('screen-story');
      // 刷新顶部状态栏与常驻任务指引
      if (App && App.player) Engine.refreshStatus(App.player);
    },

    /** 渲染家园界面（左侧属性 + 右侧方框选项，参考皇帝成长计划2） */
    renderHome(scene) {
      // 背景
      if (scene.bg) Engine.setBg(scene.bg);

      // 左侧属性面板
      const p = App.player;
      const leftEl = document.getElementById('home-stats');
      if (leftEl) {
        if (p && scene.homeStats) {
          leftEl.innerHTML = scene.homeStats;
        } else {
          leftEl.innerHTML = '';
        }
      }

      // 标题与描述（兼容 desc 与 text 字段，优先 desc）
      const titleEl = document.getElementById('home-title');
      const descEl = document.getElementById('home-desc');
      if (titleEl) titleEl.textContent = scene.title || '';
      if (descEl) {
        const raw = scene.desc || scene.text || '';
        // 富文本渲染（支持 [highlight]/[img] 等标记），换行由 white-space: pre-wrap 处理
        Engine.renderRichText(descEl, raw);
      }

      // 大地图节点图（玩法驱动·20国自由探索）
      const mapEl = document.getElementById('home-map');
      if (mapEl) {
        if (scene.homeMap) {
          mapEl.innerHTML = scene.homeMap.html || '';
          mapEl.style.display = '';
          // 绑定节点点击
          const nodes = mapEl.querySelectorAll('[data-nation]');
          nodes.forEach(node => {
            node.addEventListener('click', () => {
              const locked = node.getAttribute('data-locked') === '1';
              const n = node.getAttribute('data-nation');
              if (locked) {
                if (typeof App !== 'undefined' && App.gotoExploreNation) {
                  App.gotoExploreNation(n);   // 由 gotoExploreNation 统一做前置校验并提示
                }
                return;
              }
              if (typeof App !== 'undefined' && App.gotoExploreNation) {
                App.gotoExploreNation(n);
              }
            });
          });
        } else {
          mapEl.innerHTML = '';
          mapEl.style.display = 'none';
        }
      }

      // 右侧方框选项
      const box = document.getElementById('home-options');
      box.innerHTML = '';
      const options = scene.options || [];
      options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'home-card';
        // 图标（tag 映射）
        const iconMap = { 恢复:'🏥', 变强:'🧘', 境界:'⚡', 探索:'🗺️', 交易:'💰', 供奉:'🙏', 种植:'🌱', 伏魔:'👹', 御灵:'🐾', 职业:'⚔️', 丹道:'💊', 主线:'📜', 系统:'💾', 支线:'📖', 隐藏:'🔮', 技能:'✨', 培养:'🍖', 进化:'🦋', 出战:'🐉', 修炼:'🧘' };
        const icon = (opt.tag && iconMap[opt.tag]) ? iconMap[opt.tag] : '◈';
        btn.innerHTML = `<span class="home-card-icon">${icon}</span><span class="home-card-label">${opt.label}</span>`;
        // V1.3.19：代价预览（耗时辰/材料等）
        if (opt.cost && opt.cost.length) {
          const costSpan = document.createElement('span');
          costSpan.className = 'opt-cost';
          costSpan.textContent = '⚠ ' + opt.cost.join(' · ');
          btn.appendChild(costSpan);
        }

        // 锁定条件
        let lockReason = null;
        if (opt.require && !Engine.checkRequire(opt.require, opt.requireValue)) {
          lockReason = Engine.formatRequire(opt.require, opt.requireValue);
        } else if (opt.requireAll && !Engine.checkRequires(opt.requireAll)) {
          lockReason = opt.requireAll.map(c => Engine.formatRequire(c[0], c[1])).join('、');
        }
        if (lockReason) {
          btn.classList.add('disabled');
          const req = document.createElement('span');
          req.className = 'opt-req';
          req.textContent = '🔒 ' + lockReason;
          btn.appendChild(req);
        }
        btn.onclick = () => {
          if (btn.classList.contains('disabled')) return;
          Engine.chooseOption(opt);
        };
        box.appendChild(btn);
      });

      Engine.show('screen-home');
      // 刷新顶部状态栏与常驻任务指引
      if (App && App.player) Engine.refreshStatus(App.player);
    },

    /** 渲染选项 */
    renderOptions(options) {
      const box = document.getElementById('story-options');
      box.innerHTML = '';
      if (!options || options.length === 0) {
        const div = document.createElement('div');
        div.className = 'story-option';
        div.textContent = '（继续）';
        div.onclick = () => Engine.advance();
        box.appendChild(div);
        return;
      }
      options.forEach((opt, idx) => {
        // showIf：条件不满足则隐藏该选项（用于动态显隐，如隐藏BOSS触发条件）
        if (opt.showIf) {
          try { if (!opt.showIf(App.player)) return; } catch (e) { return; }
        }
        const btn = document.createElement('button');
        btn.className = 'story-option';
        btn.dataset.idx = idx;

        // 可选：选项标签
        if (opt.tag) {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'opt-tag';
          tagSpan.textContent = opt.tag;
          btn.appendChild(tagSpan);
        }
        // 文本
        const txtSpan = document.createElement('span');
        txtSpan.textContent = opt.label;
        btn.appendChild(txtSpan);
        // V1.3.19：代价预览（如耗时辰/需材料/可能战斗）
        if (opt.cost && opt.cost.length) {
          const costSpan = document.createElement('span');
          costSpan.className = 'opt-cost';
          costSpan.textContent = '⚠ ' + opt.cost.join(' · ');
          btn.appendChild(costSpan);
        }
        // 隐藏条件（支持单条件 require 与多条件 requireAll）
        let lockReason = null;
        if (opt.require && !Engine.checkRequire(opt.require, opt.requireValue)) {
          lockReason = Engine.formatRequire(opt.require, opt.requireValue);
        } else if (opt.requireAll && !Engine.checkRequires(opt.requireAll)) {
          lockReason = opt.requireAll.map(c => Engine.formatRequire(c[0], c[1])).join('、');
        }
        if (lockReason) {
          btn.classList.add('disabled');
          const req = document.createElement('span');
          req.className = 'opt-req';
          req.textContent = '🔒 需 ' + lockReason;
          btn.appendChild(req);
        }
        // 点击
        btn.onclick = () => {
          if (btn.classList.contains('disabled')) return;
          Engine.chooseOption(opt);
        };
        box.appendChild(btn);
      });
      // 默认聚焦第一个
      Engine.focusIndex = 0;
      Engine.updateFocus();
    },

    /** 检查多条件是否全部满足（requireAll: [[req,value],...]） */
    checkRequires(conds) {
      if (!conds || !conds.length) return true;
      return conds.every(c => Engine.checkRequire(c[0], c[1]));
    },

    /** 检查需求是否满足 */
    checkRequire(req, value) {
      const p = App.player;
      if (!p) return true;
      switch (req) {
        case 'evil_lte': return p.evil <= value;
        case 'evil_gte': return p.evil >= value;
        case 'has_mingshen': return (p.mingshen || []).some(m => m.id === value);   // V1.3.20：旧档防御
        case 'lv_gte':     return p.lv >= value;
        case 'profession': return p.profession === value;
        case 'unlocked':   return !!(p.unlocked && p.unlocked.has(value));
        case 'quest_done': return !!(p.completed && p.completed.has(value));
        // has_favor：value 为 NPC 键（如 'yunYao'），检查是否与该 NPC 建立过好感（>0 视为可触发）
        case 'has_favor':  return STATE.getFavor(p, value) > 0;
        default: return true;
      }
    },
    formatRequire(req, value) {
      const map = {
        evil_lte: `恶念值 ≤ ${value}`,
        evil_gte: `恶念值 ≥ ${value}`,
        has_mingshen: `命格【${value}】`,
        lv_gte: `等级 ≥ ${value}`,
        profession: `职业为【${value}】`,
        unlocked: `需解锁【${value}】`,
        quest_done: `需完成【${value}】`,
        has_favor: `需好感【${value}】`
      };
      return map[req] || req;
    },

    /** 选中标记（键盘上下） */
    updateFocus() {
      const opts = Array.from(document.querySelectorAll('.story-option'));
      opts.forEach((o, i) => {
        o.classList.toggle('focused', i === Engine.focusIndex && !o.classList.contains('disabled'));
      });
    },

    /** 选项点击 */
    chooseOption(opt) {
      // 反馈音效
      Engine.sfx('click');
      if (opt.evilDelta) {
        const r = STATE.addEvil(App.player, opt.evilDelta, opt.reason || opt.label);
        Engine.log(`恶念 ${r.delta > 0 ? '+' : ''}${r.delta}（${r.new}）`, r.delta > 0 ? 'evil' : 'good');
      }
      if (opt.log) Engine.log(opt.log, opt.logType || '');
      if (opt.completed) STATE.completeQuest(App.player, opt.completed);
      // 支持通过选项字段直接解锁（unlocked: 'xxx' 或 unlocked: ['a','b']）
      if (opt.unlocked) {
        const arr = Array.isArray(opt.unlocked) ? opt.unlocked : [opt.unlocked];
        arr.forEach(k => { if (App.player.unlocked) App.player.unlocked.add(k); });
      }
      Engine.refreshStatus(App.player);

      if (typeof opt.onChoose === 'function') {
        try {
          opt.onChoose(App.player);
        } catch (err) {
          // onChoose 异常不应中断选项流程（next 仍应执行），避免玩家卡死在当前场景
          if (typeof console !== 'undefined') console.error('onChoose error:', err);
          try { Engine.log('（此处出了一点小状况，但不影响继续）', 'system'); } catch (e) {}
        }
      }
      // 「选项回应」机制：带 reply 字段的选项（如询问/追问/观察类），先展示 NPC 回应或观察结果，玩家确认后再推进
      if (opt.reply) {
        const reply = typeof opt.reply === 'function' ? opt.reply(App.player) : opt.reply;
        const title = opt.replyTitle || '回应';
        const doNext = () => {
          if (opt.next) {
            if (typeof opt.next === 'string') App.goto(opt.next);
            else if (typeof opt.next === 'object') App.runScene(opt.next);
          } else if (opt.next === null) {
            // 停留
          } else {
            Engine.advance();
          }
        };
        Engine.modal(title, `<div class="reply-body">${reply}</div>`,
          [{ label: '继续', cls: 'btn-primary', fn: () => { Engine.closeModal(); doNext(); } }]);
        return;
      }
      if (opt.next) {
        // 直接跳转
        if (typeof opt.next === 'string') {
          App.goto(opt.next);
        } else if (typeof opt.next === 'object') {
          App.runScene(opt.next);
        }
      } else if (opt.next === null) {
        // 停留
      } else {
        Engine.advance();
      }
    },

    /** 默认推进 */
    advance() {
      if (Engine.current && Engine.current.next) {
        const n = Engine.current.next;
        if (typeof n === 'string') App.goto(n);
        else if (typeof n === 'object') App.runScene(n);
      }
    },

    /* ============== 8. 键盘控制 ============== */
    bindKeyboard() {
      document.addEventListener('keydown', (e) => {
        const opts = Array.from(document.querySelectorAll('.story-option'));
        // 打字中：空格/Esc 跳过，Enter 也跳过（不触发未渲染的选项）
        if (Engine.typing) {
          if (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter') {
            e.preventDefault();
            Engine.skipCurrentType();
          }
          return;
        }
        if (opts.length === 0) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          Engine.focusIndex = (Engine.focusIndex + 1) % opts.length;
          Engine.updateFocus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          Engine.focusIndex = (Engine.focusIndex - 1 + opts.length) % opts.length;
          Engine.updateFocus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const focused = opts[Engine.focusIndex];
          if (focused && !focused.classList.contains('disabled')) focused.click();
        } else if (e.key === ' ') {
          // 空格在选项渲染后 = 确认当前选项
          e.preventDefault();
          const focused = opts[Engine.focusIndex];
          if (focused && !focused.classList.contains('disabled')) focused.click();
        }
      });
    }
  };

  // 启动键盘绑定
  Engine.bindKeyboard();

  global.Engine = Engine;
})(window);