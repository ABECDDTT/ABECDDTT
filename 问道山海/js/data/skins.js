/* ===========================================================
 * 问道山海 · 皮肤系统数据
 * 皮肤分两类：
 *   - 角色皮肤（char）：角色图鉴角色的换装
 *   - 职业皮肤（prof）：隐藏职业解锁后对应的外观
 * 皮肤在「设置」中更换，也可在封面功能栏查看。
 * =========================================================== */
(function (global) {
  'use strict';

  const SKINS = [
    /* ============ 职业皮肤（隐藏职业解锁后获得） ============ */
    { id: 'skin_prof_xuanyuan', kind: 'prof', name: '剑心机关', quality: '地',
      desc: '剑修之姿，剑气与机关纹路交织。解锁隐藏职业「剑修」后可得。',
      unlock: 'prof', unlockId: 'sword' },
    { id: 'skin_prof_hujiu', kind: 'prof', name: '狐影青丘', quality: '地',
      desc: '青丘狐仙之姿，九尾虚影若隐若现。解锁隐藏职业「狐仙」后可得。',
      unlock: 'prof', unlockId: 'fox' },
    { id: 'skin_prof_danxia', kind: 'prof', name: '丹霞流火', quality: '地',
      desc: '丹道宗师之姿，衣袂若丹炉吐焰。解锁隐藏职业「丹道宗师」后可得。',
      unlock: 'prof', unlockId: 'alchemy' },
    { id: 'skin_prof_yingci', kind: 'prof', name: '影刺无痕', quality: '地',
      desc: '影刺之姿，身形如墨，来去无踪。解锁隐藏职业「影刺」后可得。',
      unlock: 'prof', unlockId: 'assassin' },

    /* ============ 角色皮肤 ============ */
    { id: 'skin_char_shiman', kind: 'char', name: '心火桃灯', quality: '玄',
      desc: '石小满提着桃灯的身影，灯中映着桃林与人心。', unlock: 'char', unlockId: 'c_huang_shiman' },
    { id: 'skin_char_axiu', kind: 'char', name: '无翼织羽', quality: '玄',
      desc: '阿秀披着自己织就的羽衣，无翼却能高飞。', unlock: 'char', unlockId: 'c_huang_axiu' },
    { id: 'skin_char_laokui', kind: 'char', name: '淬火铁翁', quality: '玄',
      desc: '老奎抡锤之姿，火星四溅，铁与火共舞。', unlock: 'char', unlockId: 'c_xuan_laokui' },
    { id: 'skin_char_yaopo', kind: 'char', name: '百草悬壶', quality: '玄',
      desc: '药婆背着药篓，袖中百草飘香。', unlock: 'char', unlockId: 'c_xuan_yaopo' },
    { id: 'skin_char_mokai', kind: 'char', name: '铁骨匠心', quality: '地',
      desc: '莫开执扳手而立，铁屑落处，皆是温柔。', unlock: 'char', unlockId: 'c_di_mokai' },
    { id: 'skin_char_susu', kind: 'char', name: '织水成桥', quality: '地',
      desc: '苏苏立于绳桥之上，衣袂如流水。', unlock: 'char', unlockId: 'c_di_susu' },
    { id: 'skin_char_yehuo', kind: 'char', name: '执灯照夜', quality: '天',
      desc: '野火举灯之姿，灯焰不灭，照亮长夜。', unlock: 'char', unlockId: 'c_tian_yehuo' },
    { id: 'skin_char_qingci', kind: 'char', name: '窑火青花', quality: '天',
      desc: '青瓷立于窑前，身后是通天窑火与漫天花色。', unlock: 'char', unlockId: 'c_tian_qingci' },

    /* ============ 宠物皮肤（灵宠换装） ============ */
    { id: 'skin_pet_rongrong', kind: 'pet', name: '月华绒绒', quality: '玄',
      desc: '绒绒兔披上月华，周身银光流转。', unlock: 'pet', unlockId: 'rongrong' },
    { id: 'skin_pet_xuanhuo', kind: 'pet', name: '赤焰玄火', quality: '玄',
      desc: '玄火蛇赤焰覆体，如流动的熔岩。', unlock: 'pet', unlockId: 'xuanhuo' },
    { id: 'skin_pet_huangdi', kind: 'pet', name: '圣剑霜华', quality: '地',
      desc: '黄帝剑灵剑气化霜，凛冽无双。', unlock: 'pet', unlockId: 'huangdi' },
    { id: 'skin_pet_cangqiong', kind: 'pet', name: '苍穹金羽', quality: '地',
      desc: '风隼苍穹羽化鎏金，振翅生辉。', unlock: 'pet', unlockId: 'cangqiong' },
    { id: 'skin_pet_yunku', kind: 'pet', name: '紫电云鲲', quality: '天',
      desc: '云鲲云浮紫电缠绕，雷霆随行。', unlock: 'pet', unlockId: 'yunku' },

    /* ============ 封面皮肤（精美封面背景，可在皮肤面板切换） ============ */
    { id: 'cover_riyue', kind: 'cover', name: '日月同辉', quality: '地',
      desc: '日月同辉，山海初开。', unlock: 'none', bg: 'assets/img/title-sunmoon.jpg' },
    { id: 'cover_xingchen', kind: 'cover', name: '星河问道', quality: '天',
      desc: '星河为卷，命格为墨。', unlock: 'none', bg: 'assets/img/mingshen-stars.jpg' },
    { id: 'cover_taolin', kind: 'cover', name: '青丘桃林', quality: '玄',
      desc: '桃花灼灼，狐影婆娑。', unlock: 'none', bg: 'assets/img/nations/qing-taolin.jpg' },
    { id: 'cover_xuanyuan', kind: 'cover', name: '轩辕机关', quality: '玄',
      desc: '机关巨城，齿轮成天。', unlock: 'none', bg: 'assets/img/nations/xuanyuan-city.jpg' }
  ];

  function getSkin(id) { return SKINS.find(s => s.id === id); }

  global.SKINS = SKINS;
  global.getSkin = getSkin;
})(window);
