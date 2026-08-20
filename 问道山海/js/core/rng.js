/* ===========================================================
 * 问道山海 · 核心随机与抽取工具
 * 提供：基础随机、权重抽取、唯一性校验、关键词匹配
 * =========================================================== */
(function (global) {
  'use strict';

  const RNG = {
    // ---------- 基础随机 ----------
    /** 返回 [min, max] 的整数（闭区间） */
    intBetween(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /** 概率判定 p ∈ [0,1] */
    chance(p) { return Math.random() < p; },

    /** 数组随机取一项（空数组返回 null，防崩溃） */
    pick(arr) {
      if (!arr || arr.length === 0) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    },

    /** 加权抽取：items = [{k,v,weight|w}, ...]（空数组返回 null；兼容 weight 与 w 两种字段名） */
    weightedPick(items) {
      if (!items || items.length === 0) return null;
      const w = (x) => {
        const v = (x.weight != null) ? x.weight : (x.w != null ? x.w : 1);
        return (typeof v === 'number' && v > 0) ? v : 1;
      };
      const total = items.reduce((s, x) => s + w(x), 0);
      let r = Math.random() * total;
      for (const it of items) {
        r -= w(it);
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },

    /** 洗牌（Fisher-Yates） */
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    /** 抽 n 个不重复项（不足时取全部） */
    sampleN(arr, n) {
      return RNG.shuffle(arr).slice(0, Math.min(n, arr.length));
    },

    /** 唯一性校验：尝试抽取直到得到 n 个不重复的项（最多重试 maxTimes 次） */
    uniqueSample(pool, n, keyFn = (x) => x.id || x, maxTimes = 10) {
      for (let t = 0; t < maxTimes; t++) {
        const picked = RNG.sampleN(pool, n);
        const keys = picked.map(keyFn);
        const set = new Set(keys);
        if (set.size === picked.length) return picked;
      }
      // 兜底：去重后再补齐
      const seen = new Set();
      const out = [];
      for (const x of RNG.shuffle(pool)) {
        const k = keyFn(x);
        if (!seen.has(k)) { seen.add(k); out.push(x); }
        if (out.length >= n) break;
      }
      return out;
    },

    // ---------- 关键词匹配 ----------
    /** 在文本中匹配词根（大小写不敏感），返回命中的词根数组 */
    matchKeywords(text, wordRoots) {
      if (!text) return [];
      const t = text.toLowerCase();
      const hits = [];
      for (const root of wordRoots) {
        if (t.includes(root.toLowerCase())) hits.push(root);
      }
      return hits;
    },

    /** 计算每个方向池的命中权重 */
    scorePools(text, poolWords) {
      const scores = {};
      for (const [poolName, words] of Object.entries(poolWords)) {
        const hits = RNG.matchKeywords(text, words);
        // 同词根多次出现按 1 算
        scores[poolName] = new Set(hits.map(w => w.toLowerCase())).size;
      }
      return scores;
    },

    /** 按方向池得分排序（高分优先） */
    rankPools(scores) {
      return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([name, score]) => ({ name, score }));
    }
  };

  global.RNG = RNG;
})(window);