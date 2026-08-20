/* ===========================================================
 * 问道山海 · 国家场景注册表
 * 所有国家的剧情场景统一合并到 global.ALL_SCENES，
 * 供 app.js 的 runScene 按场景 ID 查找。
 *
 * 国家与场景编号（以 1-5 国文档为准）：
 *   Q01 青丘国  (qingqiu.js)
 *   Q02 羽民国  (yumin.js)
 *   Q03 厌火国  (yanhuo.js)
 *   Q04 轩辕国  (xuanyuan.js)
 *   Q05 玄股国  (xuangu.js)
 * =========================================================== */
(function (global) {
  'use strict';

  // 合并所有国家场景到统一注册表
  const ALL_SCENES = {};

  function mergeScenes(sourceObj) {
    if (!sourceObj) return;
    for (const k in sourceObj) {
      if (sourceObj.hasOwnProperty(k)) ALL_SCENES[k] = sourceObj[k];
    }
  }

  // 合并已加载国家的场景
  mergeScenes(global.QINGQIU_SCENES);
  mergeScenes(global.YUMIN_SCENES);
  mergeScenes(global.YANHUO_SCENES);
  mergeScenes(global.XUANYUAN_SCENES);
  mergeScenes(global.XUANGU_SCENES);
  mergeScenes(global.HUANTOU_SCENES);
  mergeScenes(global.SANSHOU_SCENES);
  mergeScenes(global.NIEER_SCENES);
  mergeScenes(global.DAREN_SCENES);
  mergeScenes(global.BAIMIN_SCENES);
  mergeScenes(global.CHANGGU_SCENES);
  mergeScenes(global.ZHURAO_SCENES);
  mergeScenes(global.JIAOJING_SCENES);
  mergeScenes(global.ROULI_SCENES);
  mergeScenes(global.SHENMU_SCENES);
  mergeScenes(global.WUCHANG_SCENES);
  mergeScenes(global.YIMU_SCENES);
  mergeScenes(global.JIEXIONG_SCENES);
  mergeScenes(global.QIZHONG_SCENES);
  mergeScenes(global.GUIXU_SCENES);
  mergeScenes(global.CHALLENGE_SCENES);

  global.ALL_SCENES = ALL_SCENES;
})(window);
