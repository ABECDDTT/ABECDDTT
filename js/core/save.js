/* ===========================================================
 * 问道山海 · 存档管理（3 存档位）
 * localStorage 三槽位 + 导出/导入
 * 系统自动存档写入"当前活动槽位"，已有则直接覆盖，不会额外占满槽位
 * =========================================================== */
(function (global) {
  'use strict';

  const SLOT_COUNT = 3;
  const LEGACY_KEY = 'wenda-shanhai-save-v1';
  const ACTIVE_KEY = 'wenda-shanhai-active-slot';

  function slotKey(i) { return 'wenda-shanhai-save-slot-' + i; }

  const SAVE = {
    /** 当前活动槽位（自动存档写入位置，默认 0） */
    activeSlot() {
      try {
        const v = parseInt(localStorage.getItem(ACTIVE_KEY), 10);
        return (v >= 0 && v < SLOT_COUNT) ? v : 0;
      } catch (e) { return 0; }
    },

    setActiveSlot(i) {
      try { localStorage.setItem(ACTIVE_KEY, String(i)); } catch (e) { /* ignore */ }
    },

    /** 分配一个空闲槽位作为新游戏的活动槽位（无空闲则用 0，新游戏会提示覆盖） */
    claimEmptySlot() {
      for (let i = 0; i < SLOT_COUNT; i++) {
        try { if (!localStorage.getItem(slotKey(i))) { SAVE.setActiveSlot(i); return i; } } catch (e) {}
      }
      SAVE.setActiveSlot(0);
      return 0;
    },

    /** 序列化玩家数据 + 元信息 */
    _pack(player) {
      const data = STATE.serialize(player);
      data.savedAt = Date.now();
      data._slotName = player.professionName + '·' + player.name;
      data._slotRealm = (player.realm && player.realm.name) || '炼气期';
      data._slotLv = player.lv || 1;
      data._slotDay = player.day || 1;
      data._slotNation = player.nation || null;
      // V1.3.18：挑战模式存档标记挑战身份（用于"我的挑战存档"自动覆盖，与剧情存档隔离）
      data._slotChallenge = player.challengeId || null;
      data._slotChallengeName = player.challengeName || null;
      return data;
    },

    /** 保存到指定槽位（覆盖该槽位已有存档） */
    save(player, slot) {
      try {
        const i = (slot === undefined) ? SAVE.activeSlot() : slot;
        const data = SAVE._pack(player);
        localStorage.setItem(slotKey(i), JSON.stringify(data));
        SAVE.setActiveSlot(i);
        return { ok: true, slot: i };
      } catch (e) {
        console.error('存档失败:', e);
        return { ok: false, error: e.message };
      }
    },

    /** 自动存档：写入当前活动槽位（已有则覆盖，不会占用新槽位） */
    autosave(player) {
      return SAVE.save(player, SAVE.activeSlot());
    },

    /** 读取指定槽位 */
    load(slot) {
      try {
        const i = (slot === undefined) ? SAVE.activeSlot() : slot;
        const raw = localStorage.getItem(slotKey(i));
        if (!raw) return null;
        const obj = JSON.parse(raw);
        const p = STATE.deserialize(obj);
        SAVE.setActiveSlot(i);
        return p;
      } catch (e) {
        console.error('读档失败:', e);
        return null;
      }
    },

    /** 列出所有槽位信息（用于"再续前缘"选择界面） */
    list() {
      const slots = [];
      for (let i = 0; i < SLOT_COUNT; i++) {
        try {
          const raw = localStorage.getItem(slotKey(i));
          if (!raw) { slots.push({ slot: i, empty: true }); continue; }
          const obj = JSON.parse(raw);
          slots.push({
            slot: i,
            empty: false,
            name: obj._slotName || '求道者',
            realm: obj._slotRealm || '炼气期',
            lv: obj._slotLv || 1,
            day: obj._slotDay || 1,
            nation: obj._slotNation || null,
            challenge: obj._slotChallenge || null,
            challengeName: obj._slotChallengeName || null,
            savedAt: obj.savedAt || 0
          });
        } catch (e) {
          slots.push({ slot: i, empty: true });
        }
      }
      return slots;
    },

    /** 找空闲槽位（无空闲返回 -1） */
    findEmptySlot() {
      for (let i = 0; i < SLOT_COUNT; i++) {
        try { if (!localStorage.getItem(slotKey(i))) return i; } catch (e) {}
      }
      return -1;
    },

    /** 找已有"同一挑战角色"存档的槽位（比较 challengeId；非挑战/剧情存档不匹配；无则 -1） */
    findChallengeSlot(player) {
      if (!player || !player.challengeId) return -1;
      for (let i = 0; i < SLOT_COUNT; i++) {
        try {
          const raw = localStorage.getItem(slotKey(i));
          if (!raw) continue;
          const obj = JSON.parse(raw);
          if (obj && obj._slotChallenge === player.challengeId) return i;
        } catch (e) { /* ignore */ }
      }
      return -1;
    },

    /** 删除指定槽位（V1.3.20：若删的是活动槽，自动改指向首个仍存在的存档，避免后续自动保存写空槽） */
    remove(slot) {
      try {
        localStorage.removeItem(slotKey(slot));
        if (SAVE.activeSlot() === slot) {
          let next = -1;
          for (let i = 0; i < SLOT_COUNT; i++) { if (localStorage.getItem(slotKey(i))) { next = i; break; } }
          SAVE.setActiveSlot(next >= 0 ? next : 0);
        }
        return true;
      } catch (e) { return false; }
    },

    /** 是否有任一槽位有存档 */
    hasSave() {
      for (let i = 0; i < SLOT_COUNT; i++) {
        try { if (localStorage.getItem(slotKey(i))) return true; } catch (e) {}
      }
      return false;
    },

    /** 兼容迁移：旧版单槽位存档 → 迁移到槽位 0 */
    migrateLegacy() {
      try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (!raw) return false;
        if (localStorage.getItem(slotKey(0))) { localStorage.removeItem(LEGACY_KEY); return false; }
        localStorage.setItem(slotKey(0), raw);
        localStorage.removeItem(LEGACY_KEY);
        return true;
      } catch (e) { return false; }
    }
  };

  global.SAVE = SAVE;
})(window);
