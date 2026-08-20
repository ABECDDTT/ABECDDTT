/* ============================================================
 * 问道山海 —— 探索点触数据（探索式交互）
 * 玩家进入国家后，看到场景图，可点击场景中的人物/事物进行交互。
 * 每个国家有多个场景、多个 NPC、海量彩蛋。
 * 主线剧情仍走原有文字推进（不影响），探索层为可选互动层。
 *
 * 结构：
 *   EXPLORE = {
 *     qingqiu: {
 *       name: '青丘',
 *       scenes: [ { id, bg, name, hotpoints: [...] } ],
 *       ...
 *     }
 *   }
 * 每个 hotpoint（热点）：
 *   { id, x, y, icon, name, type: 'npc'|'object'|'easter',
 *     dialog: { name, text }, actions: [...] }
 * x/y 为百分比坐标（相对场景图），icon 为显示字符。
 * ============================================================ */
(function (global) {
  'use strict';

  const EXPLORE = {
    qingqiu: {
      name: '青丘',
      intro: '桃林深处，雾霭沉沉。青丘的狐影在花雨中时隐时现。',
      scenes: [
        {
          id: 'qingqiu_taolin',
          name: '青丘 · 桃林',
          bg: 'assets/img/nations/qing-taolin.jpg',
          // 场景内可交互热点（x/y 百分比，icon 为热点图标）
          hotpoints: [
            // ===== NPC =====
            { id: 'npc_shangren', x: 72, y: 38, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '青丘商人', type: 'npc',
              dialog: { name: '青丘商人', text: '哟，远道而来的道友！我这摊子上，可都是青丘的好货——桃木簪、狐绒披风、还有影狐一族褪下的九尾绒。要瞧瞧吗？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打听消息', type: 'gossip', text: '最近桃林夜里常有狐影出没，有人说那是百年前的影狐回来了……你可要当心。' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_linghu', x: 30, y: 42, icon: '🦊', name: '小灵狐', type: 'npc',
              dialog: { name: '小灵狐', text: '（一只通体雪白的小狐狸蹲在花下，歪着头看你，尾巴轻轻摇了摇。）' },
              actions: [
                { label: '投喂桃果', type: 'reward', text: '小灵狐蹭了蹭你的手，衔来一片桃叶放在你掌心，转身没入花雨。', item: 'MAT-C01', itemName: '朱果', rewardKey: 'qingqiu_linghu', rewardLimit: 2 },
                { label: '轻轻抚摸', type: 'text', text: '小灵狐舒服地眯起眼，喉咙里发出咕噜声。你感到心头一暖。' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_laoren', x: 18, y: 55, icon: '👴', name: '桃林老翁', type: 'npc',
              dialog: { name: '桃林老翁', text: '孩子，你是外乡人吧？这片桃林，一百年前还是青丘最热闹的地方……' },
              actions: [
                { label: '听老翁讲述往事', type: 'story', text: '老翁缓缓讲起百年前青丘的盛景，讲那场吞没桃林的魔气，讲那些没能走出雾海的人。讲到动情处，他抹了抹眼角。', reward: 'rumor' },
                { label: '询问石小满', type: 'text', text: '小满啊？那是个好孩子。他总说，自己这条命是村里人给的。你若要寻他，去灵圃看看。' },
                { label: '给予朱果（老翁用来祭奠亡妻）', type: 'give', needItem: { id: 'MAT-C01', n: 1, name: '朱果' }, text: '老翁接过朱果，浑浊的眼睛泛起泪光：「好孩子……这果子，她生前最爱。」他颤巍巍地从怀里摸出一枚陈旧的桃木令：「拿着这个，去桃林深处的墨家遗迹，那里的机关师……会认得此令。」', giveItem: { id: 'MAT-C02', n: 1 }, giveExp: 15, clueNation: 'qingqiu', clueText: '老翁的桃木令可开启墨家遗迹的机关门', rewardKey: 'qingqiu_laoren' },
                { label: '离开', type: 'close' }
              ] },
            // ===== 事物/彩蛋 =====
            { id: 'obj_taohei', x: 50, y: 30, icon: '🍑', name: '桃核', type: 'object',
              dialog: { name: '（你拾起一枚桃核）', text: '桃核上刻着一个细小的「众」字，入手温热，仿佛还带着谁掌心的温度。' },
              actions: [
                { label: '收入怀中', type: 'easter', text: '✨ 彩蛋！你寻得一枚刻着「众」字的桃核。它让你想起——龙不在天上，龙在每一个愿意为别人低头的人脊梁里。', reward: 'shard', rewardKey: 'qingqiu_taohei' },
                { label: '放下', type: 'close' }
              ] },
            { id: 'obj_shijing', x: 62, y: 60, icon: '📜', name: '残碑', type: 'object',
              dialog: { name: '（桃林深处，立着半截残碑）', text: '碑上字迹斑驳，依稀可辨：「……九尾……青丘……归……」' },
              actions: [
                { label: '细读碑文', type: 'easter', text: '✨ 彩蛋！碑文残存一句：「青丘之丘，九尾所居。」你隐约觉得，这与某只传说中的九尾狐有关。', reward: 'rumor', rewardKey: 'qingqiu_shijing' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'obj_hua', x: 40, y: 70, icon: '🌸', name: '灵桃花', type: 'object',
              dialog: { name: '（一树灵桃花开得正盛）', text: '花瓣无风自动，落了你一身。桃香清冽，沁人心脾。' },
              actions: [
                { label: '采集花瓣', type: 'reward', text: '你采下几瓣灵桃花，可入药。', item: 'MAT-C03', itemName: '忘忧草', rewardKey: 'qingqiu_huaban', rewardLimit: 2 },
                { label: '驻足观赏', type: 'text', text: '你静静站了一会儿，仿佛听见桃林深处传来若有若无的歌声。' },
                { label: '离开', type: 'close' }
              ] },
            // ===== 需求型 NPC（有需求，完成给奖励/线索，不卡剧情） =====
            { id: 'npc_zhanggui', x: 84, y: 52, icon: '🧮', name: '集市账房先生', type: 'npc',
              dialog: { name: '集市账房先生', text: '哎，客人你来得正好！集市的账目又对不上了——狐族的采买单子上，写着"朱果若干"……可我这库房里，朱果早就见底了！' },
              actions: [
                { label: '给予朱果（完成采买）', type: 'give', needItem: { id: 'MAT-C01', n: 3, name: '朱果' }, text: '账房先生连声道谢，将一袋沉甸甸的金币塞给你：「真是帮了大忙！这是谢礼，收下吧。」', giveGold: 120, giveExp: 40, clueNation: 'qingqiu', clueText: '集市账房提到：桃林深处的灵桃花年年结出异果，可换朱果', rewardKey: 'qingqiu_zhanggui' },
                { label: '下次再说', type: 'close' }
              ] },
            { id: 'npc_liehu', x: 22, y: 35, icon: '🏹', name: '年轻猎户', type: 'npc',
              dialog: { name: '年轻猎户', text: '你是修行的仙长吗？桃林边缘最近来了头凶兽，祸害了村里好几只羊。我空有弓箭，却伤不了它分毫……' },
              actions: [
                { label: '答应除兽（战斗）', type: 'battle', enemyHint: '桃林凶兽', reward: { exp: 150, gold: 80 }, text: '你循着血迹找到那头凶兽，一番激战后将它驱逐。猎户感激涕零：「多谢仙长！这是我珍藏的青丘桃木弓，送你了！」', rewardKey: 'qingqiu_liehu' },
                { label: '我非猎手，爱莫能助', type: 'close' }
              ] },
            { id: 'npc_qinshi', x: 62, y: 78, icon: '🎻', name: '盲眼琴师', type: 'npc',
              dialog: { name: '盲眼琴师', text: '（抚琴的盲者停下琴音）老朽在此等一个能解"三狐谜"的人。三只狐妖，一只只说真话，一只只说假话，一只真假不定。你问其中一只："你身后的狐妖说真话吗？"它答"是"。这是哪只狐妖？' },
              actions: [
                { label: '回答：真假不定', type: 'quiz', answer: 'b', correct: '你答对了！琴师抚掌而笑：「正是。真假不定之狐，方能答出这句模棱两可的话。」他赠你一卷《青丘狐经》。', wrong: '琴师摇头：「不对。真话狐必答"不是"，假话狐也会说"不是"，唯有真假不定者可能答"是"。再想想。」', reward: { exp: 60, gold: 50 }, rewardKey: 'qingqiu_qinshi' },
                { label: '回答：真话狐', type: 'quiz', answer: 'a', correct: '', wrong: '琴师摇头：「不对。真话狐必答"不是"，假话狐也会说"不是"，唯有真假不定者可能答"是"。再想想。」' },
                { label: '回答：假话狐', type: 'quiz', answer: 'c', correct: '', wrong: '琴师摇头：「不对。真话狐必答"不是"，假话狐也会说"不是"，唯有真假不定者可能答"是"。再想想。」' },
                { label: '放弃', type: 'close' }
              ] },
            { id: 'npc_shangban', x: 88, y: 62, icon: '🐄', name: '商队伙计', type: 'npc',
              dialog: { name: '商队伙计', text: '我家掌柜说："三筐桃，每筐二十枚。第一筐卖九枚，第二筐卖十一枚，第三筐卖几枚，三筐加起来正好卖四十枚？"我算糊涂了，仙长帮我算算！' },
              actions: [
                { label: '回答：二十枚', type: 'quiz', answer: 'c', correct: '伙计一拍大腿：「正是二十枚！9+11+20=40，还是仙长脑子快！」他硬塞给你一枚桃木灵印。', wrong: '伙计挠头：「不对啊，九加十一加…我再算算。9+11=20，要凑40得再加20，所以第三筐是20枚。」', reward: { exp: 40, gold: 40 }, rewardKey: 'qingqiu_shangban' },
                { label: '回答：十九枚', type: 'quiz', answer: 'a', correct: '', wrong: '伙计挠头：「不对啊，九加十一加…9+11=20，要凑40得再加20，所以第三筐是20枚。」' },
                { label: '回答：十八枚', type: 'quiz', answer: 'b', correct: '', wrong: '伙计挠头：「不对啊，九加十一加…9+11=20，要凑40得再加20，所以第三筐是20枚。」' },
                { label: '不理他', type: 'close' }
              ] }
          ]
        },
        {
          id: 'qingqiu_wuyuan',
          name: '青丘 · 雾渊',
          bg: 'assets/img/nations/qing-fog-abyss.jpg',
          hotpoints: [
            { id: 'npc_yinghu', x: 50, y: 45, icon: '👤', name: '雾中影狐', type: 'npc',
              dialog: { name: '雾中影狐', text: '（一个半透明的身影在雾中浮现，正是百年前影狐一族的残影。）……你，不该来这里。' },
              actions: [
                { label: '询问当年真相', type: 'story', text: '影狐残影断断续续地述说：当年那场屠戮，非人之罪，而是……雾，吞了所有人。', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'obj_deng', x: 25, y: 35, icon: '🏮', name: '雾中灯火', type: 'object',
              dialog: { name: '（雾中亮起一盏灯）', text: '一盏破旧的灯笼悬在雾里，光很弱，却始终不灭。' },
              actions: [
                { label: '靠近灯火', type: 'easter', text: '✨ 彩蛋！灯火忽明忽暗，竟照出雾中一行小字：「有人生而为灯，燃尽自己，照亮人间。」', reward: 'shard', rewardKey: 'qingqiu_deng' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'obj_shi', x: 75, y: 62, icon: '🗿', name: '雾中石像', type: 'object',
              dialog: { name: '（一尊石像半没于雾中）', text: '石像面目模糊，似人似狐，双手合十，不知在祈祷什么。' },
              actions: [
                { label: '观察石像', type: 'text', text: '石像底座刻着许多名字，都是百年前葬身雾海的人。你肃然起敬。' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      /* ============ 点触化主线（玩法驱动：点人对话推进剧情） ============
       * 每个场景：{ id, location, bg, npcs: [...] }
       * npc：{ id, name, icon, x, y, lines: [{name,text}], choices: [{label, nextStory/nextScene, evilDelta, completed, log, onChoose}] }
       * 主线走调和路线（最佳），镇压/放任分支通过 nextScene 回退到文字场景。
       */
      story: [
        {
          id: 'st_opening', location: '青丘 · 桃林', bg: 'assets/img/nations/qing-taolin.jpg',
          npcs: [
            { id: 'baishan', name: '白浅', portrait: 'assets/img/npc/npc_baishan.jpg', x: 50, y: 40,
              lines: [
                { name: '（旁白）', text: '山巅云海之上，千年桃林盛开如粉色云海，漫天花瓣如雪。你缓缓睁开眼睛，发现自己躺在厚厚的落花之中。' },
                { name: '（旁白）', text: '你记不清自己是谁，只依稀记得——家乡被魔气吞噬，你一路流亡至此。胸口的咒印隐隐作痛，那是魔气侵蚀的痕迹。' },
                { name: '白浅', text: '旅人，你终于到了。我是青丘国接引使——白浅。青丘乃《山海》第一境，凡踏入者，皆为有缘人。请随我入城吧。' }
              ],
              choices: [
                { label: '起身行礼，随她前往', nextStory: 'st_tutorial' },
                { label: '先问：青丘为何收留流亡者？', reply: '白浅停下脚步，回身道：「青丘从不无故收留外客。只是长老推演天机，算出将有「命外之人」踏足青丘，而那人的命格……或许正是解开青丘之劫的钥匙。如今看来，便是你。」', nextStory: 'st_q01_01' },
                { label: '沉默跟上，保持警觉', nextStory: 'st_q01_01' }
              ]
            },
            // 氛围 NPC：桃林中的小贩与采花人
            { id: 'amb_shangren1', name: '青丘商人', portrait: 'assets/img/npc/npc_shangren.jpg', x: 20, y: 55, ambience: true,
              lines: [
                { name: '青丘商人', text: '这位客官，可是刚入青丘？来来来，看看我这摊上的桃木簪、灵桃花酿——都是青丘地道的好东西！' },
                { name: '青丘商人', text: '（压低声音）客官若要打探消息，我这儿倒是有几桩新鲜事，就是……得看客官肯不肯出这个价钱了。' }
              ],
              choices: [
                { label: '看看货品', type: 'shop', nextStory: null },
                { label: '打探消息（按国家动态，偶有隐藏）', type: 'gossip' },
                { label: '（点头离开）', nextStory: 'st_q01_01' }
              ]
            },
            { id: 'amb_caikong', name: '采桃人', icon: '👩', x: 68, y: 62, ambience: true,
              lines: [
                { name: '采桃人', text: '（一边摘桃一边哼着歌）桃之夭夭，灼灼其华……咦，生面孔？外乡人吧，青丘的桃，甜着呢，尝尝？' }
              ],
              choices: [
                { label: '接过灵桃（获得朱果）', type: 'reward', item: 'MAT-C01', itemName: '朱果', rewardKey: 'qingqiu_caikong', rewardLimit: 3, text: '你接过一枚灵桃，入口甘甜，一股暖流涌遍全身。', nextStory: 'st_q01_01' },
                { label: '婉言谢绝', nextStory: 'st_q01_01' }
              ]
            },
            // 通用彩蛋：桃树下的旧玩具（所有玩家可发现）
            { id: 'easter_wangju', name: '旧木偶', icon: '🪀', x: 38, y: 72, ambience: true,
              lines: [
                { name: '（你俯身拾起）', text: '桃树下埋着半截旧木偶，刻痕已深。木偶背上歪歪扭扭刻着两个字——「平安」。' }
              ],
              choices: [
                { label: '收进怀里', type: 'reward', item: 'MAT-C08', itemName: '织梦丝', rewardKey: 'qingqiu_easter_wangju', rewardLimit: 1, text: '✨ 彩蛋！你收好了这枚旧木偶。那些无人记得的愿望，被时间埋进土里，又被你拾起。', nextStory: 'st_q01_01' },
                { label: '放回原处', nextStory: 'st_q01_01' }
              ]
            }
          ]
        },
        {
          id: 'st_tutorial', location: '青丘 · 迎客阁外', bg: 'assets/img/nations/qing-jieyin-envoy.jpg',
          npcs: [
            { id: 'baishan2', name: '白浅', portrait: 'assets/img/npc/npc_baishan.jpg', icon: '🦊', x: 45, y: 42,
              lines: [
                { name: '白浅', text: '旅人，你既流亡至此，往后修行之路凶险。入城之前，有几件事你需牢记于心。' },
                { name: '白浅', text: '视野左上角的【问道指引】，会时时提醒你此刻该做什么——修持、突破、培育灵宠、推进剧情，皆会显现，点按即可直达。' },
                { name: '白浅', text: '你手中的问道玉，是安身立命的根本。进城后，会有一处【家园·洞天福地】归你所有。可修炼、结契灵宠、外出探险、供奉神明。' },
                { name: '白浅', text: '遇到强敌时，右上角可随时返回家园休整——切莫恋战。只是战斗中脱身不得，须先了结眼前敌手。' }
              ],
              choices: [
                { label: '（了然于心）请带我入城', nextStory: 'st_q01_01' }
              ]
            }
          ]
        },
        {
          id: 'st_q01_01', location: '青丘 · 迎客阁', bg: 'assets/img/nations/qing-jieyin-envoy.jpg',
          npcs: [
            { id: 'baishan3', name: '白浅', portrait: 'assets/img/npc/npc_baishan.jpg', icon: '🦊', x: 55, y: 40,
              lines: [
                { name: '白浅', text: '那是【虚月】。虚月乃青丘禁地的核心，百年来一直安静，但近月忽有异动，长老们忧心忡忡。' },
                { name: '白浅', text: '旅人，你先去梳洗休息，明日圣女会亲自接见你。青丘虽大，但请记住——切莫独闯桃林深处，那是影狐的地盘。' },
                { name: '白浅', text: '另外……你手中的问道玉，莫要轻示他人。问道玉可感知因果灵材，引来觊觎。' }
              ],
              choices: [
                { label: '道谢后进入迎客阁休息', nextStory: 'st_q01_02' },
                { label: '问：圣女是何人？为何要见我？', reply: '白浅轻叹：「圣女乃青丘之主，九尾狐一脉唯一传人。她已闭关三十载，本不应再出。但昨日长老推演天机，算出将有「命外之人」踏入青丘——指的便是你。」', nextStory: 'st_q01_02' },
                { label: '独闯桃林深处探查虚月', nextScene: 'q01_01_b_danger' }
              ]
            }
          ]
        },
        {
          id: 'st_q01_02', location: '青丘 · 圣女殿', bg: 'assets/img/nations/qing-xuyue-curse.jpg',
          npcs: [
            { id: 'qingyao', name: '青瑶圣女', portrait: 'assets/img/npc/npc_qingyao.jpg', x: 50, y: 38,
              lines: [
                { name: '（旁白）', text: '翌日清晨，你随白浅前往圣女殿。殿中央一位白发女子端坐莲台，面容清丽却透出岁月沧桑，一双狐眼洞察人心。' },
                { name: '青瑶', text: '命外之人，你终于到了。' },
                { name: '（旁白）', text: '青瑶抬手，你胸口的问道玉凌空飞起，落在她掌心。她端详良久，眉头渐紧。' },
                { name: '青瑶', text: '问道玉中，你命格的纹路已现——这是天机所指。然而，玉上还残留着魔气咒印。你家乡的毁灭，并非天灾。有人故意为之。' },
                { name: '青瑶', text: '我需要你协助调查【虚月之咒】。虚月异动、桃林迷障、影狐异变——皆与此有关。你若愿助，我可赐你灵圃与基础功法，让你暂居青丘。' }
              ],
              choices: [
                { label: '应承协助调查', completed: 'Q01_02_ACCEPT', reward: { exp: 20, gold: 30 }, nextStory: 'st_accept' },
                { label: '先问报酬', reply: '青瑶似笑非笑：「报酬？青丘的灵圃、功法、以及……解开你家乡灭门之祸的线索。这些，够不够？」', reward: { exp: 10 }, nextStory: 'st_accept' },
                { label: '拒绝，不想卷入', evilDelta: 10, log: '拒绝圣女', nextScene: 'q01_02_refuse' }
              ]
            },
            // 氛围 NPC：圣女殿侍女
            { id: 'amb_shinv', name: '青丘侍女', icon: '🌸', x: 30, y: 55, ambience: true,
              lines: [
                { name: '青丘侍女', text: '（低声）圣女殿下已经三十年没有踏出过这殿门了。昨日她却在莲台前坐了一整夜，望着天上的虚月……' },
                { name: '青丘侍女', text: '客卿大人，圣女殿下既愿见你，必是看重你。青丘的未来，或许就在你身上了。' }
              ],
              choices: [
                { label: '（点头致意）', nextStory: 'st_q01_02' }
              ]
            }
          ]
        },
        {
          id: 'st_accept', location: '青丘 · 灵圃', bg: 'assets/img/nations/qing-taolin.jpg',
          npcs: [
            { id: 'baishan4', name: '白浅', portrait: 'assets/img/npc/npc_baishan.jpg', icon: '🦊', x: 45, y: 45,
              lines: [
                { name: '青瑶', text: '善。你已入炼气期。这是青丘的入门功法，从今日起你是青丘客卿。' },
                { name: '白浅', text: '接下来，你将面对三件事——一、虚月之咒：影狐似乎在守护某物；二、猎户后人：当年那支猎户，竟有一支后人至今留在青丘；三、圣女之选：新圣女将在三月后的仪式中诞生，影狐派系似在图谋此事。' },
                { name: '白浅', text: '客卿，你在青丘需自食其力。灵圃、桃林、集市皆为你开。如何修炼、如何抉择，全在你自己。' },
                { name: '白浅', text: '临别时，白浅从袖中捧出一只毛茸茸的小兔灵：「这是我青丘的绒绒兔，性情温顺，懂灵药性。让它随你修行，也好做个伴。」' }
              ],
              choices: [
                { label: '接下绒绒兔，开始自由修行', onChoose: (p) => { if (p.pets.length === 0) { STATE.addPet(p, 'rongrong', 'equal'); Engine.log('获得灵宠：绒绒兔（平等契约）', 'good'); } }, nextStory: 'st_q01_03' },
                { label: '直奔桃林深处调查影狐', onChoose: (p) => { if (p.pets.length === 0) { STATE.addPet(p, 'rongrong', 'equal'); } }, nextStory: 'st_q01_03' },
                { label: '寻找猎户后人', onChoose: (p) => { if (p.pets.length === 0) { STATE.addPet(p, 'rongrong', 'equal'); } }, nextStory: 'st_hunter' }
              ]
            },
            // 石小满专属彩蛋：桃林里的旧心事（其他角色看不到真奖励）
            { id: 'easter_lingpuyu', name: '灵圃角落的旧筐', icon: '🧺', x: 25, y: 70, ambience: true,
              lines: [
                { name: '（你注意到灵圃角落有一只旧药筐）', text: '药筐里叠着几件洗得发白的衣裳，补丁摞着补丁，针脚却极细密。筐底压着一粒桃核。' }
              ],
              choices: [
                { label: '拾起桃核', type: 'reward', item: 'MAT-C08', itemName: '织梦丝', rewardKey: 'qingqiu_lingpuyu', rewardLimit: 1, charOnly: ['c_huang_shiman'], plainText: '（石小满怔了怔——这桃核上的「众」字，与他贴身那枚一模一样。他心头一热，小心收好。）', text: '✨ 专属彩蛋！你认出桃核上细小的「众」字——那是你自己刻的。那些被遗落在时光里的旧衣裳、旧心愿，此刻都随着这枚桃核，重新回到你手心。', nextStory: 'st_q01_03' },
                { label: '放回原处', nextStory: 'st_q01_03' }
              ]
            },
            // 通用彩蛋：灵圃的猫
            { id: 'easter_mao', name: '圃中花猫', icon: '🐱', x: 70, y: 62, ambience: true,
              lines: [
                { name: '（一只花猫在灵圃边打盹）', text: '花猫听见动静，懒懒地睁开一只眼，甩了甩尾巴，又睡了过去。它的脖子上挂着一枚旧铃铛，铃铛上刻着「平安」二字。' }
              ],
              choices: [
                { label: '轻抚花猫', type: 'reward', item: 'MAT-C05', itemName: '月光草', rewardKey: 'qingqiu_mao', rewardLimit: 1, text: '✨ 彩蛋！花猫发出咕噜声，蹭了蹭你的手。那枚旧铃铛轻轻作响，像是某种祝福。', nextStory: 'st_q01_03' },
                { label: '不去打扰', nextStory: 'st_q01_03' }
              ]
            }
          ]
        },
        {
          id: 'st_q01_03', location: '青丘 · 影狐祭坛', bg: 'assets/img/nations/qing-shadow-altar.jpg',
          npcs: [
            { id: 'moji', name: '墨姬·影狐长老', portrait: 'assets/img/npc/npc_moji.jpg', x: 50, y: 40,
              lines: [
                { name: '（旁白）', text: '数日后，你听闻桃林深处有异动。穿过迷障紫雾，来到一处地下洞窟，洞窟中央有一座古朴祭坛，上方悬浮着散发紫黑光芒的虚月碎片。' },
                { name: '墨姬', text: '凡人……你们又来了。可还记得百年前的猎户？' },
                { name: '墨姬', text: '他们杀了我们的同族，剥了我们的皮毛做裘衣。我们每一只影狐，都背负着同族的亡魂。' },
                { name: '（旁白）', text: '墨姬的身形开始变化，九条尾巴如瀑布展开，她化形为一只巨大的九尾白狐，眼神血红——' }
              ],
              choices: [
                { label: '尝试与之对话，寻找化解之法', evilDelta: -10, log: '尝试调和路线', nextStory: 'st_dialogue' },
                { label: '直接开战', evilDelta: 30, log: '选择镇压路线', nextScene: 'battle_fying_elder' },
                { label: '取走虚月碎片离开', evilDelta: 50, log: '放任路线', completed: 'Q01_03_LEAVE', nextScene: 'q01_03_leave' }
              ]
            }
          ]
        },
        {
          id: 'st_dialogue', location: '青丘 · 影狐祭坛', bg: 'assets/img/nations/qing-fog-abyss.jpg',
          npcs: [
            { id: 'moji2', name: '墨姬', portrait: 'assets/img/npc/npc_moji.jpg', x: 48, y: 42,
              lines: [
                { name: '你', text: '长老，我知道你们的恨。但百年前的猎户早已身死——他们的后人却至今背负祖先的罪孽。不如让我去寻猎户后人，让他们当面道歉。' },
                { name: '墨姬', text: '你一介凡人，凭什么让他们低头？' },
                { name: '白浅', text: '长老，我们愿为他作保——若他寻不得后人，我们任你处置。' },
                { name: '墨姬', text: '三日。给你三日。寻得后人，让他们来此向我同族灵位磕头——若诚意不足，我必取你魂魄。' },
                { name: '白浅', text: '（低声）当年那支猎户有一后人流落在青丘边缘的「墨家遗迹」。' }
              ],
              choices: [
                { label: '前往墨家遗迹寻找猎户后人', nextStory: 'st_hunter' }
              ]
            }
          ]
        },
        {
          id: 'st_hunter', location: '青丘 · 墨家遗迹', bg: 'assets/img/nations/qing-fog-abyss.jpg',
          npcs: [
            { id: 'molao', name: '墨老', portrait: 'assets/img/npc/npc_molao.jpg', x: 50, y: 45,
              lines: [
                { name: '（旁白）', text: '你来到青丘边缘的墨家遗迹——一座废弃的机关工坊。一位白发老者坐在门口，面前摆放着一堆小型机关木鸟。' },
                { name: '墨老', text: '你……是青丘派来的吧？' },
                { name: '（旁白）', text: '他自称墨老——正是百年前那支猎户队伍中唯一未参与屠杀的成员。当日他试图阻止同乡的恶行，却被寡不敌众打断双腿。' },
                { name: '墨老', text: '我知道你要什么。让我去向影狐磕头？也好。这百年的债，是该还了。但请容我三日收拾——三日后，我随你前往。' }
              ],
              choices: [
                { label: '等他三日', evilDelta: -20, log: '获得猎户后人信任', completed: 'Q01_B1_DONE', nextStory: 'st_peaceful' },
                { label: '强行带他走', evilDelta: 10, log: '强行带走猎户后人', nextScene: 'q01_03_forced' }
              ]
            }
          ]
        },
        {
          id: 'st_peaceful', location: '青丘 · 影狐祭坛', bg: 'assets/img/nations/qing-shadow-altar.jpg',
          npcs: [
            { id: 'moji3', name: '墨姬', portrait: 'assets/img/npc/npc_moji.jpg', x: 50, y: 40,
              lines: [
                { name: '（旁白）', text: '三日后，你携墨老来到影狐祭坛。墨老颤抖着跪下，向影狐灵位磕了三个响头，额头磕出血来，泪水纵横。' },
                { name: '墨老', text: '百年前，我的同乡犯了滔天大罪。我无力阻止，是为懦夫。今日，我代他们向影狐一族赔罪。' },
                { name: '墨姬', text: '罢了。百年恩怨，今日一朝化解。' },
                { name: '墨姬', text: '命外之人，你做到了我等百年来不敢奢望之事。自今日起，你可签约影狐——凡我影狐一族，皆愿与你为友。' },
                { name: '（旁白）', text: '一道金光射入你胸口，你的命格再度更新——新增标签【狐灵】。狐族赠你隐藏商店的凭证。' }
              ],
              choices: [
                { label: '青丘之路，就此圆满', completed: 'Q01_MAIN_DONE', log: '完成青丘主线·调和路线', nextStory: 'st_end' }
              ]
            }
          ]
        },
        {
          id: 'st_end', location: '青丘 · 桃林边缘', bg: 'assets/img/nations/qing-taolin.jpg',
          npcs: [
            { id: 'baishan5', name: '白浅', portrait: 'assets/img/npc/npc_baishan.jpg', icon: '🦊', x: 50, y: 40,
              lines: [
                { name: '白浅', text: '命外之人——你已走完青丘之路。山海广袤，二十国各有机缘，接下来的路，该由你自己选了。' },
                { name: '白浅', text: '无论身在何处，点按右上角的家园印记，都能随时返回洞天福地休整。只是——战斗中脱身不得，须先了结眼前的敌手。' },
                { name: '（旁白）', text: '【恭喜完成青丘国主线·第一境·完】' }
              ],
              choices: [
                { label: '展开山海舆图，自行选择下一国', onChoose: (p) => { STATE.enterNation(p, 'qingqiu'); }, nextScene: 'home_explore' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 羽民国（yumin）· 风灵之殇
     * 主题：风灵通道濒死，虚月污染风眼，天羽/地居/半羽三阶层冲突
     * 关键人物：云瑶（大祭司之女）、风烈（禁卫统领）、翼老（地居领袖）
     * Boss：混沌风魔
     * ============================================================ */
    yumin: {
      name: '羽民',
      intro: '云海之上，浮岛如舟。风灵通道的低鸣，像这片天空最后的叹息。',
      scenes: [
        {
          id: 'yumin_wild',
          name: '羽民 · 风灵原',
          bg: 'assets/img/nations/yum-banyucun.jpg',
          hotpoints: [
            { id: 'npc_yunshang', x: 55, y: 42, icon: '👧', name: '半羽少女', type: 'npc',
              dialog: { name: '半羽少女', text: '（她抬头看你，小翅膀在风中紧张地颤动）你……你是地面来的人？' },
              actions: [
                { label: '询问风灵通道', type: 'story', text: '少女压低声音：「风灵通道最近越来越弱了，云瑶姐姐说……有紫色的东西在啃食风。」', reward: 'rumor' },
                { label: '给她一枚青丘桃果', type: 'reward', item: 'MAT-C01', itemName: '朱果', rewardKey: 'yumin_npc', rewardLimit: 1, text: '少女接过桃果，眼睛亮起来：「谢谢！你会飞吗？不会的话，风隼苍穹可以载你一程。」' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_yum', x: 70, y: 66, icon: '🪶', name: '坠落的羽毛', type: 'object',
              dialog: { name: '（你拾起一片羽毛）', text: '这片羽毛边缘泛着淡淡的紫黑色，像被什么侵蚀过。' },
              actions: [
                { label: '细看羽毛', type: 'easter', text: '✨ 彩蛋！羽毛上残留着虚月的气息——你想起青丘的教训：风灵通道的衰败，恐怕也是虚月污染的蔓延。', rewardKey: 'yumin_yu' },
                { label: '离开', type: 'close' }
              ] }
          ]
        },
        {
          id: 'yumin_city',
          name: '羽民 · 天羽城',
          bg: 'assets/img/nations/yum-tianyu-city.jpg',
          hotpoints: [
            { id: 'npc_yunYao', x: 50, y: 40, portrait: 'assets/img/npc/npc_yunyao.jpg', icon: '🕊️', name: '云瑶', type: 'npc',
              dialog: { name: '云瑶', text: '（青色风织羽衣的少女，身后一对小巧翅膀颤动）你来了？风灵大祭司——我母亲，想见你。风灵通道……快要撑不住了。' },
              actions: [
                { label: '随云瑶去见大祭司', type: 'goStory' },
                { label: '问：风灵通道怎么了？', type: 'story', text: '云瑶望着远处的穹顶，声音发颤：「有紫色的东西，在啃食风。天羽族说这是自然老化，地居族说这是天罚——可我知道，是有什么东西醒了。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren2', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '羽民商人', type: 'npc',
              dialog: { name: '羽民商人', text: '这位客官，羽民的云锦花、坠星藤种子、风灵石……都是云海上的好物！要来一些吗？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_yun', x: 76, y: 62, icon: '🌺', name: '云锦花丛', type: 'object',
              dialog: { name: '（一丛云锦花开得正好）', text: '云锦花在风中轻轻摇曳，花瓣上凝着露珠，倒映出天空。' },
              actions: [
                { label: '采摘云锦花', type: 'reward', item: 'MAT-FS05', itemName: '风灵粒子', rewardKey: 'yumin_yunjin', rewardLimit: 2, text: '你采下一朵云锦花，花蕊里凝着一缕风灵粒子，淡淡的香混着风的清冽。' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      /* 点触化主线（序章：云海相遇 → 关键抉择 → 对接文字主线） */
      story: [
        {
          id: 'sy_arrive', location: '羽民 · 大荒古道断崖', bg: 'assets/img/nations/qing-fog-abyss.jpg',
          npcs: [
            { id: 'yunYao1', name: '云瑶', portrait: 'assets/img/npc/npc_yunyao.jpg', x: 55, y: 42,
              lines: [
                { name: '（旁白）', text: '你辞别青丘，沿大荒古道一路东行。断崖之外不是地面——是云海。一只巨大的风隼从云层冲出，背上坐着一位青色羽衣的少女。' },
                { name: '云瑶', text: '你……你是地面来的人？不对，你身上有……虚月的气息！（警惕）你是青丘来的使者？还是虚月的眷属？' }
              ],
              choices: [
                { label: '「我从青丘来，在调查虚月污染的扩散。」', onChoose: (p) => { if (STATE.addFavor) STATE.addFavor(p, 'yunYao', 15); }, nextStory: 'sy_intro' },
                { label: '「一个半羽族，为什么独自在边境飞行？」', onChoose: (p) => { if (STATE.addFavor) STATE.addFavor(p, 'yunYao', 5); }, nextStory: 'sy_question' },
                { label: '「让开，我有急事。」', onChoose: (p) => { if (STATE.addFavor) STATE.addFavor(p, 'yunYao', -10); }, nextStory: 'sy_refuse' }
              ]
            }
          ]
        },
        {
          id: 'sy_refuse', location: '羽民 · 大荒古道断崖', bg: 'assets/img/nations/qing-fog-abyss.jpg',
          npcs: [
            { id: 'yunYaoRefuse', name: '云瑶', portrait: 'assets/img/npc/npc_yunyao.jpg', x: 55, y: 42,
              lines: [
                { name: '（旁白）', text: '你冷声让开，风隼却在你头顶盘旋不去。少女眉头一拧，展开双臂拦在你身前。' },
                { name: '云瑶', text: '不能放你走！你身上带着虚月的气息——天羽城的风灵通道正在被它侵蚀。你若带着污染乱闯，整片云海都会遭殃！' },
                { name: '云瑶', text: '（她放缓语气）我母亲是天羽城的风灵大祭司。你既然从青丘而来，想必也知道虚月意味着什么。你若真为苍生好，就该随我去把话说清楚。' }
              ],
              choices: [
                { label: '「……你说得对。带路吧。」', onChoose: (p) => { if (STATE.addFavor) STATE.addFavor(p, 'yunYao', 10); }, nextStory: 'sy_intro' },
                { label: '「我凭什么信你？」', nextStory: 'sy_refuse2' }
              ]
            }
          ]
        },
        {
          id: 'sy_refuse2', location: '羽民 · 大荒古道断崖', bg: 'assets/img/nations/qing-fog-abyss.jpg',
          npcs: [
            { id: 'yunYaoRefuse2', name: '云瑶', portrait: 'assets/img/npc/npc_yunyao.jpg', x: 55, y: 42,
              lines: [
                { name: '云瑶', text: '（她摘下颈间的风灵护符，递到你面前）你看——护符上的符文正在震颤。它感应到了虚月的污染。你若真与虚月无关，就不怕跟我走这一趟。' },
                { name: '云瑶', text: '而且，风灵通道若彻底崩塌，半羽族第一个遭殃。我亲眼见过紫色的东西在啃食风——那不是天羽族说的"自然老化"。' }
              ],
              choices: [
                { label: '「好，我随你去天羽城。」', onChoose: (p) => { if (STATE.addFavor) STATE.addFavor(p, 'yunYao', 10); }, nextStory: 'sy_intro' },
                { label: '「先问清楚你的身份。」', reply: '云瑶一怔，随即轻声道：「我叫云瑶。天羽城风灵大祭司之女——不过，我母亲是地居族。半羽、天羽、地居……在风灵通道出事之前，这些身份都不重要。」', nextStory: 'sy_intro' }
              ]
            }
          ]
        },
        {
          id: 'sy_question', location: '羽民 · 云海之上', bg: 'assets/img/nations/qing-fog-abyss.jpg',
          npcs: [
            { id: 'yunYao2', name: '云瑶', portrait: 'assets/img/npc/npc_yunyao.jpg', x: 50, y: 45,
              lines: [
                { name: '（旁白）', text: '少女被你反问噎住，脸颊微红。她是天羽城风灵大祭司之女云瑶，母亲是地居族，生来只有一对未长全的翅膀。' },
                { name: '云瑶', text: '天羽族嘲笑我「血不纯」，地居族也嫌我「不是自己人」。只有苍穹——（她拍了拍风隼）从不嫌弃我。' },
                { name: '云瑶', text: '我独自查探边境，是因为没人信我。他们都说风灵通道只是自然老化，可我亲眼看见……紫色的东西在啃食风。' }
              ],
              choices: [
                { label: '「血统不是原罪。你在做对的事。」', onChoose: (p) => { if (STATE.addFavor) STATE.addFavor(p, 'yunYao', 5); }, nextStory: 'sy_intro' }
              ]
            }
          ]
        },
        {
          id: 'sy_intro', location: '羽民 · 天羽城', bg: 'assets/img/nations/yum-tianyu-city.jpg',
          npcs: [
            { id: 'yunYao3', name: '云瑶', portrait: 'assets/img/npc/npc_yunyao.jpg', x: 45, y: 40,
              lines: [
                { name: '（旁白）', text: '云瑶带你穿过云海，抵达天羽城。整座城池悬于云上，风灵浮岛托着层层叠叠的羽族建筑。' },
                { name: '云瑶', text: '风灵大祭司——我母亲，想见你。但你要当心，天羽族、地居族、半羽族，已经彼此仇视了上百年。' },
                { name: '云瑶', text: '风灵通道的衰败，让三族的矛盾彻底爆发。天羽族说地居族渎职，地居族说天羽族傲慢，半羽族……两头受气。' },
                { name: '云瑶', text: '（望向远处的穹顶）风眼在呻吟。我知道的。你愿意，随我去见大祭司吗？' }
              ],
              choices: [
                { label: '随云瑶去见大祭司', onChoose: (p) => { try { STATE.enterNation(p, 'yumin'); } catch (e) {}; if (p) { STATE.addMaterial(p, 'MAT-FS01', 2); if (!p.unlocked) p.unlocked = new Set(); p.unlocked.add('tianyu_map'); p.unlocked.add('fengluan_ride'); Engine.log('风隼苍穹载你一程，获得【风灵石】×2，可换取天羽城情报。', 'good'); if (STATE.addFavor) STATE.addFavor(p, 'yunYao', 10); } }, nextScene: 'yumin_q02_01_enter' },
                { label: '先在城中四处走走', nextStory: 'sy_walk' }
              ]
            },
            { id: 'npc_shangren3', name: '羽民商人', portrait: 'assets/img/npc/npc_shangren.jpg', x: 22, y: 56, ambience: true,
              lines: [
                { name: '羽民商人', text: '客官，云锦花、坠星藤种子、风灵石——都是云海上的好物！听说风灵通道出事了，再不囤点货，往后怕是有钱也买不着了。' }
              ],
              choices: [
                { label: '看看货品', type: 'shop', nextStory: null },
                { label: '打探消息', type: 'gossip' },
                { label: '（点头离开）', nextStory: 'sy_intro' }
              ]
            }
          ]
        },
        {
          id: 'sy_walk', location: '羽民 · 天羽城街巷', bg: 'assets/img/nations/yum-banyucun.jpg',
          npcs: [
            { id: 'yilao', name: '翼老', icon: '👴', x: 48, y: 50,
              lines: [
                { name: '（旁白）', text: '你没有急着去见大祭司，而是在天羽城的街巷间慢慢走着。这座悬在云上的城，远比看上去复杂。' },
                { name: '翼老', text: '（地居族的老者，背有些驼）外乡人？别掺和天羽族的事。他们高踞云上，哪里看得见我们这些住在地上的人。' },
                { name: '翼老', text: '不过……你若真能修好风灵通道，或许，三族的仇，也有解开的可能。你一路看来，也该明白这座城裂成什么样了。' }
              ],
              choices: [
                { label: '问翼老：风灵通道为何衰弱？', nextStory: 'sy_walk_yilao' },
                { label: '回云瑶身边，去见大祭司', nextStory: 'sy_intro' },
                { label: '再走走看', nextStory: 'sy_walk' }
              ]
            },
            { id: 'halfgirl', name: '半羽少女', icon: '🕊️', x: 68, y: 44,
              lines: [
                { name: '（旁白）', text: '街角蹲着一个半羽族的小姑娘，正笨手笨脚地修补一只漏风的竹笼——笼里的风隼雏鸟呜呜地叫。' },
                { name: '半羽少女', text: '（抬头看你）你……你是天羽族请来的客人？我阿娘说，风灵通道要是再弱下去，我们这些翅膀长不全的，连风隼都养不起了。' },
                { name: '半羽少女', text: '（她忽然压低声音）我偷偷告诉你：夜里我听见风眼那边有"咔哒咔哒"的声音，像是有什么东西在啃。大人们都不信我。' }
              ],
              choices: [
                { label: '给她一枚朱果', onChoose: (p) => {
                    if (p && p.materials && (p.materials['MAT-C01'] || 0) > 0) {
                      STATE.removeMaterial(p, 'MAT-C01', 1);
                      Engine.log('你赠予半羽少女一枚朱果，她眼睛一亮，悄悄塞给你一片泛着微光的风羽。', 'good');
                      STATE.addMaterial(p, 'MAT-FS04', 1);
                    } else {
                      Engine.log('你翻遍行囊，也没找到可赠之物，只得歉意地笑了笑。', 'system');
                    }
                  }, nextStory: 'sy_walk' },
                { label: '回云瑶身边，去见大祭司', nextStory: 'sy_intro' }
              ]
            },
            { id: 'streetstall', name: '街边摊贩', icon: '🏮', x: 32, y: 62,
              lines: [
                { name: '（旁白）', text: '一个地居族的摊贩守着几只风隼蛋，见你驻足，连忙招呼。' },
                { name: '街边摊贩', text: '客官要不要来只风隼蛋？孵出来养大了，能载人飞！……不过这年头，风灵通道不稳，风隼都蔫了，孵出来也未必飞得起来。' },
                { name: '街边摊贩', text: '唉，天羽族说这是自然老化，地居族说是天罚，我们这些平头百姓，只盼着别真的断了这口气。' }
              ],
              choices: [
                { label: '买一只风隼蛋（20金币）', onChoose: (p) => {
                    if (p && (p.gold || 0) >= 20) {
                      p.gold -= 20;
                      STATE.addMaterial(p, 'SEED-FS01', 1);
                      Engine.log('你花20金币买下一只风隼蛋（坠星藤种子在侧，可作孵蛋灵植）。', 'good');
                    } else { Engine.log('你囊中羞涩，摊贩笑着摆摆手：「不妨事，看看也好。」', 'system'); }
                  }, nextStory: 'sy_walk' },
                { label: '回云瑶身边，去见大祭司', nextStory: 'sy_intro' },
                { label: '再走走看', nextStory: 'sy_walk' }
              ]
            }
          ]
        },
        {
          id: 'sy_walk_yilao', location: '羽民 · 天羽城街巷', bg: 'assets/img/nations/yum-banyucun.jpg',
          npcs: [
            { id: 'yilao2', name: '翼老', icon: '👴', x: 48, y: 50,
              lines: [
                { name: '翼老', text: '（叹了口气）风灵通道本是以风眼为心、大阵为脉的活物。百年前它还好好的，自打虚月的光照进云海，它就一天比一天衰弱。' },
                { name: '翼老', text: '天羽族赖它飞，地居族赖它活，半羽族……两头不靠。它若真断了，这座城就塌了。云瑶那丫头到处找人帮忙，也算有心了。' }
              ],
              choices: [
                { label: '回云瑶身边，去见大祭司', nextStory: 'sy_intro' },
                { label: '再走走看', nextStory: 'sy_walk' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 厌火国（yanhuo）· 焚天熔炉
     * 主题：焚天火山异动，永恒熔炉封印的蚀火苏醒，火灵大长老被反噬
     * 关键人物：炎辰（大长老之子）、铁心（锻族首席）、烬婆婆（灰族先知）
     * Boss：混沌炎龙
     * ============================================================ */
    yanhuo: {
      name: '厌火',
      intro: '熔炉的火光映红了半边天。灰族的脊背，撑着这座燃烧的城。',
      scenes: [
        {
          id: 'yanhuo_city',
          name: '厌火 · 熔炉城',
          bg: 'assets/img/nations/yanhuo-city.jpg',
          hotpoints: [
            { id: 'npc_yanchen', x: 50, y: 40, portrait: 'assets/img/npc/npc_yanchen.jpg', icon: '🔥', name: '炎辰', type: 'npc',
              dialog: { name: '炎辰', text: '（火灵大长老之子，眉宇间满是忧色）外乡人……我父亲被蚀火反噬，神志不清。你能救他吗？' },
              actions: [
                { label: '询问蚀火之事', type: 'story', text: '炎辰低声道：「永恒熔炉里封印着一缕蚀火——那是虚月污染的余烬。最近它醒了，我父亲为压制它，被反噬了。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren4', x: 30, y: 55, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '厌火商人', type: 'npc',
              dialog: { name: '厌火商人', text: '火灵石、火晶花、熔岩精铁——厌火的好货！都是熔炉边炼出来的，趁热来一块？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_yan', x: 70, y: 66, icon: '🔥', name: '灰烬之心', type: 'object',
              dialog: { name: '（灰烬里埋着一枚温热的石头）', text: '它像是谁的体温。灰族的老人说，每座熔炉里都住着一颗灰烬之心。' },
              actions: [
                { label: '拾起灰烬之心', type: 'easter', text: '✨ 彩蛋！灰烬之心在你掌心轻轻跳动——那是一种古老的、无言的祝福：「火无贵贱，炼铁的人，与铁一样重。」', rewardKey: 'yanhuo_hui' },
                { label: '放回原处', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_yanhuo_arrive', location: '厌火 · 熔炉城外', bg: 'assets/img/nations/yanhuo-city.jpg',
          npcs: [
            { id: 'tiexin', name: '铁心', icon: '⚒️', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '越往南行，空气越滚烫。当厌火国的熔炉城出现在视野里时，整片天空都被火光染成了橘红色。' },
                { name: '铁心', text: '（锻族首席锻造师，浑身是汗与铁灰）外乡人？来得正好。永恒熔炉的封印松了，火灵大长老为压制蚀火，自己先倒下了。' },
                { name: '铁心', text: '熔炉的火若灭了，这座城——不，这片土地上的所有人，都会冻死在灰烬里。' }
              ],
              choices: [
                { label: '进入熔炉城探查', nextStory: 'sy_yanhuo_city' },
                { label: '问：蚀火是什么？', reply: '铁心皱眉：「永恒熔炉里封印着一缕蚀火——虚月污染留下的余烬。它不该醒来。但最近，它在啃食封印，就像……有什么在召唤它。」', nextStory: 'sy_yanhuo_city' }
              ]
            }
          ]
        },
        {
          id: 'sy_yanhuo_city', location: '厌火 · 熔炉城大殿', bg: 'assets/img/nations/yanhuo-city.jpg',
          npcs: [
            { id: 'yanchen', name: '炎辰', portrait: 'assets/img/npc/npc_yanchen.jpg', x: 48, y: 42,
              lines: [
                { name: '炎辰', text: '（大长老之子，守在大殿外）父亲被蚀火反噬后，一直喊着一个人的名字——烬婆婆。灰族的先知，也是当年封印蚀火的人。' },
                { name: '炎辰', text: '烬婆婆说，封印蚀火的关键，不在熔炉里，而在「灰族的心」。她……在等一个愿意倾听的人。' }
              ],
              choices: [
                { label: '去见烬婆婆', onChoose: (p) => { try { STATE.enterNation(p, 'yanhuo'); } catch (e) {}; if (p) { STATE.addMaterial(p, 'MAT-YH07', 1); if (!p.unlocked) p.unlocked = new Set(); p.unlocked.add('huoling_ruins'); p.unlocked.add('yongheng_design'); Engine.log('烬婆婆赠你【灰烬之心】——可抵御一次虚月侵蚀。', 'good'); if (STATE.addFavor) STATE.addFavor(p, 'yanChen', 15); } }, nextScene: 'yanhuo_q03_01_mine' },
                { label: '再听听炎辰的讲述', nextStory: 'sy_yanhuo_city' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 轩辕国（xuanyuan）· 机关之城
     * 主题：机关塔核心被虚月侵蚀，觉醒机关人诞生，"人/机"边界之辨
     * 关键人物：公输月（机师）、机关人七号（觉醒者）、墨守（墨家后人）
     * Boss：混沌剑灵
     * ============================================================ */
    xuanyuan: {
      name: '轩辕',
      intro: '齿轮咬合，蒸汽低鸣。机关城里，有一颗铁做的心，正在学会心疼。',
      scenes: [
        {
          id: 'xuanyuan_city',
          name: '轩辕 · 机关城',
          bg: 'assets/img/nations/xuanyuan-city.jpg',
          hotpoints: [
            { id: 'npc_gongshu', x: 50, y: 42, portrait: 'assets/img/npc/npc_gongshu.jpg', icon: '🔧', name: '公输月', type: 'npc',
              dialog: { name: '公输月', text: '（机关城的机师，一身机油味）你见过会做梦的机关人吗？我见过。七号——它开始做梦了。' },
              actions: [
                { label: '询问机关人七号', type: 'story', text: '公输月眼神复杂：「七号是第一个觉醒的机关人。它开始问：我是谁。这个问题，比任何齿轮都难修。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren5', x: 30, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '轩辕商人', type: 'npc',
              dialog: { name: '轩辕商人', text: '机核碎片、精铁、还有新造的小机关鸟——轩辕的好货，童叟无欺！' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_xuan', x: 70, y: 64, icon: '⚙️', name: '废弃的机关人', type: 'object',
              dialog: { name: '（角落里躺着一具报废的机关人）', text: '它胸口刻着一行小字：「此身虽铁，愿为人用。」' },
              actions: [
                { label: '细看刻字', type: 'easter', text: '✨ 彩蛋！字迹歪歪扭扭，像是某个修械匠刻上去的。铁做的身体里，或许也住着一颗心。', rewardKey: 'xuanyuan_feiqi' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_xuan_arrive', location: '轩辕 · 机关城前', bg: 'assets/img/nations/xuanyuan-city.jpg',
          npcs: [
            { id: 'gongshu', name: '公输月', portrait: 'assets/img/npc/npc_gongshu.jpg', x: 50, y: 45,
              lines: [
                { name: '（旁白）', text: '羽民国的风还在耳边呼啸，你已经踏上了轩辕国的土地。一座由齿轮与蒸汽驱动的机关城，在晨雾中缓缓转动。' },
                { name: '公输月', text: '（机师，一身机油味）你就是那个从青丘一路走来的命外之人？机关塔的核心被虚月侵蚀了，再这样下去，整座城的机关人都会失控。' },
                { name: '公输月', text: '但更棘手的是……有个机关人，它醒了。它开始问「我是谁」。' }
              ],
              choices: [
                { label: '进入机关城', nextStory: 'sy_xuan_city' },
                { label: '问：机关人怎么会做梦？', reply: '公输月低声说：「七号是我们从虚月污染的机关塔里救出来的。它本该死机，却……醒了。它胸口刻着一行字：此身虽铁，愿为人用。」', nextStory: 'sy_xuan_city' }
              ]
            }
          ]
        },
        {
          id: 'sy_xuan_city', location: '轩辕 · 机关塔下', bg: 'assets/img/nations/xuanyuan-city.jpg',
          npcs: [
            { id: 'qihao', name: '机关人七号', icon: '🤖', x: 50, y: 42,
              lines: [
                { name: '机关人七号', text: '（齿轮转动的声音）你好……旅人。公输月说，你是从很远的地方来的。很远……是多远？' },
                { name: '机关人七号', text: '我醒来那天，看见自己的手。它不该是一堆铁。它应该……能握住什么。' },
                { name: '（旁白）', text: '七号的发声器里传来滋滋的电流声，像是哽咽。一个铁做的身体，正在学习"心疼"。' }
              ],
              choices: [
                { label: '倾听七号的故事', onChoose: (p) => { try { STATE.enterNation(p, 'xuanyuan'); } catch (e) {}; if (p) { if (!p.unlocked) p.unlocked = new Set(); p.unlocked.add('jiguan_qi'); Engine.log('墨守已托人打开废弃区的闸门，可前往查探七号。', 'good'); if (STATE.addFavor) STATE.addFavor(p, 'gongshuyue', 10); } }, nextScene: 'xuanyuan_q04_01_scrap' },
                { label: '询问机关塔的核心', reply: '七号的发声器转了转：「机关塔的核心被虚月侵蚀了，齿轮咬合的声音里混着低语。公输月说，若核心彻底失控，整座城都会停下。我……不知道我该不该帮忙。」', nextStory: 'sy_xuan_city' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 玄股国（xuangu）· 水神之渊
     * 主题：大泽被虚月污染，水神封印需要"容器"牺牲，主角入归墟取水神之泪
     * 关键人物：沧溟（祭司/容器预备者）、大祭司（其父）、渊姬
     * Boss：大祭司·虚月化身
     * ============================================================ */
    xuangu: {
      name: '玄股',
      intro: '大泽无垠，水天一色。水神封印之下，有人正等着被献祭。',
      scenes: [
        {
          id: 'xuangu_lake',
          name: '玄股 · 大泽',
          bg: 'assets/img/nations/xuangu-lake.jpg',
          hotpoints: [
            { id: 'npc_cangming', x: 50, y: 42, portrait: 'assets/img/npc/npc_cangming.jpg', icon: '🌊', name: '沧溟', type: 'npc',
              dialog: { name: '沧溟', text: '（水神殿祭司，面容平静却透着决绝）旅人……你是来救我的，还是来送我最后一程的？' },
              actions: [
                { label: '询问"容器"之事', type: 'story', text: '沧溟望向大泽深处：「水神封印需要容器承载——而那个容器，是我父亲选的。从我一出生，就注定了。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren6', x: 30, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '玄股商人', type: 'npc',
              dialog: { name: '玄股商人', text: '水灵珠、水藻叶、水脉晶——玄股水下的宝贝！客官要捞一点上来么？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_xuan2', x: 70, y: 66, icon: '💧', name: '泽中莲花', type: 'object',
              dialog: { name: '（大泽深处，一朵莲花静静开着）', text: '莲瓣上凝着露珠，倒映出一张年轻的、平静的面容。' },
              actions: [
                { label: '细看莲花', type: 'easter', text: '✨ 彩蛋！莲花的根茎，深深扎进封印之下。它像是在说：即便被献祭，也曾盛放过。', rewardKey: 'xuangu_lian' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_xuangu_arrive', location: '玄股 · 大泽之畔', bg: 'assets/img/nations/xuangu-lake.jpg',
          npcs: [
            { id: 'yuanji', name: '渊姬', icon: '🧜', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '离开轩辕国的机关轰鸣，你来到玄股国的大泽。水天相接，无边无际。一个披着水纱的女子，静静立在水畔。' },
                { name: '渊姬', text: '（低语）你来晚了……封印，又松了一分。水神之泪一旦耗尽，整片大泽都会化作死水。' },
                { name: '渊姬', text: '大祭司说，唯有「容器」能承载封印。他的儿子沧溟，从一出生，就被选作了那个容器。' }
              ],
              choices: [
                { label: '前往水神殿', nextStory: 'sy_xuangu_temple' },
                { label: '问：没有别的办法吗？', reply: '渊姬沉默良久：「或许……归墟深处的水神之泪能重建封印。但那是一条几乎必死的路。沧溟他，已经准备独自前往了。」', nextStory: 'sy_xuangu_temple' }
              ]
            }
          ]
        },
        {
          id: 'sy_xuangu_temple', location: '玄股 · 水神殿', bg: 'assets/img/nations/xuangu-lake.jpg',
          npcs: [
            { id: 'cangming2', name: '沧溟', portrait: 'assets/img/npc/npc_cangming.jpg', x: 48, y: 42,
              lines: [
                { name: '沧溟', text: '（见到你，他并不意外）父亲说，命外之人会来。他还说……命外之人，能改写被写好的命运。' },
                { name: '沧溟', text: '我不怕死。我只是不甘心——我这辈子，还没自己选过一回。' }
              ],
              choices: [
                { label: '与沧溟一同寻找水神之泪', onChoose: (p) => { try { STATE.enterNation(p, 'xuangu'); } catch (e) {}; if (p) { STATE.addMaterial(p, 'MAT-XG07', 1); if (!p.unlocked) p.unlocked = new Set(); p.unlocked.add('shuiling_hufu'); Engine.log('玄龟临别赠你【水灵护符】，可潜入深渊底层。', 'good'); if (STATE.addFavor) STATE.addFavor(p, 'cangming', 15); } }, nextScene: 'xuangu_q05_01_trial_moon' },
                { label: '再听沧溟的心声', nextStory: 'sy_xuangu_temple' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 讙头国（huantou）· 鸣海之渊
     * 主题：鸣海渊底之物被大渊主曲解为活祭，海妖作乱
     * 关键人物：潮音（大渊主之女）、铁喙（老渔者）、潜奴老者
     * Boss：混沌海妖（渊母）
     * ============================================================ */
    huantou: {
      name: '讙头',
      intro: '鸣海的涛声，像谁在海底呜咽。每一朵浪花下，都藏着未说完的话。',
      scenes: [
        {
          id: 'huantou_abyss',
          name: '讙头 · 鸣海渊口',
          bg: 'assets/img/nations/huantou-abyss.jpg',
          hotpoints: [
            { id: 'npc_chaoyin', x: 50, y: 42, portrait: 'assets/img/npc/npc_chaoyin.jpg', icon: '🌊', name: '潮音', type: 'npc',
              dialog: { name: '潮音', text: '（大渊主之女，赤足立在湿滑的礁石上）你听，渊底的歌……那不是海妖，那是渊母在哭。' },
              actions: [
                { label: '询问渊母之事', type: 'story', text: '潮音低声：「渊母被封印在渊底，大渊主却告诉族人，那是要活祭才能安抚的海妖。他错了……他一直在骗所有人。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren7', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '讙头商人', type: 'npc',
              dialog: { name: '讙头商人', text: '渊息珠、鸣海遗物——都是深海里捞上来的好东西！客官要看看么？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_huan', x: 72, y: 64, icon: '🐚', name: '寄居的海螺', type: 'object',
              dialog: { name: '（一只海螺被冲上岸边）', text: '海螺里传出细微的回响，像是一段被遗忘的歌谣。' },
              actions: [
                { label: '侧耳倾听', type: 'easter', text: '✨ 彩蛋！海螺里传来一句模糊的话：「渊母不是妖，她只是……走丢了的孩子。」', rewardKey: 'huantou_hailluo' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_huantou_arrive', location: '讙头 · 鸣海之畔', bg: 'assets/img/nations/huantou-abyss.jpg',
          npcs: [
            { id: 'tiehui', name: '铁喙', icon: '🎣', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '沿着海岸线南行，咸腥的海风越来越重。当鸣海的滔天巨浪出现在眼前时，你看见一个老渔者独自坐在礁石上。' },
                { name: '铁喙', text: '（老渔者，晒得黝黑）外乡人，别靠近渊口。大渊主说了，每年都要献上活祭，才能安抚渊底的海妖。' },
                { name: '铁喙', text: '可我跟海打了五十年交道，从没见过海妖吃人。我听到的，是哭声。' }
              ],
              choices: [
                { label: '询问渊底的真相', nextStory: 'sy_huantou_abyss' },
                { label: '问：活祭是怎么回事？', reply: '铁喙压低声音：「大渊主以活祭之名，把不愿服从的潜奴扔进渊里。哪有什么海妖……是他自己心里有鬼。」', nextStory: 'sy_huantou_abyss' }
              ]
            }
          ]
        },
        {
          id: 'sy_huantou_abyss', location: '讙头 · 渊口', bg: 'assets/img/nations/huantou-abyss.jpg',
          npcs: [
            { id: 'chaoyin2', name: '潮音', portrait: 'assets/img/npc/npc_chaoyin.jpg', x: 48, y: 42,
              lines: [
                { name: '潮音', text: '（大渊主之女，赤足踩在湿滑的礁石上）我父亲错了。渊母不是妖——她是被封印在这里的守护者。' },
                { name: '潮音', text: '鸣海之歌在日渐微弱。若渊母真的死去，整片海域都会……失去声音。' }
              ],
              choices: [
                { label: '与潮音一同下渊', onChoose: (p) => { try { STATE.enterNation(p, 'huantou'); } catch (e) {} }, nextScene: 'huantou_q06_01_root' },
                { label: '再听潮音的心声', nextStory: 'sy_huantou_abyss' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 三首国（sanshou）· 魂镜之试
     * 主题：魂镜高原魂井封印混沌魂主，三首（善/恶/执）分裂
     * 关键人物：明璃（善念）、夜叉（恶念）、无咎（执念）
     * Boss：混沌魂主
     * ============================================================ */
    sanshou: {
      name: '三首',
      intro: '高原之上，魂井映照人心。善念、恶念、执念，三张面孔，同一个人。',
      scenes: [
        {
          id: 'sanshou_mist',
          name: '三首 · 魂镜高原',
          bg: 'assets/img/nations/sanshou-mist.jpg',
          hotpoints: [
            { id: 'npc_mingli', x: 50, y: 42, portrait: 'assets/img/npc/npc_mingli.jpg', icon: '🪞', name: '明璃', type: 'npc',
              dialog: { name: '明璃', text: '（三首族善念化身，周身笼罩柔和的光）你来了……准备好面对自己了吗？魂井会照出你的三张面孔。' },
              actions: [
                { label: '询问魂井之事', type: 'story', text: '明璃轻声道：「魂井封印着混沌魂主。它不攻身体，只攻人心——善、恶、执，三念分裂，人便不再是完整的人。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren8', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '三首商人', type: 'npc',
              dialog: { name: '三首商人', text: '魂镜矿、魂晶——三首的好物！据说能映照命格，客官要不要照一照？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_san', x: 72, y: 66, icon: '🪞', name: '破碎的镜片', type: 'object',
              dialog: { name: '（地上散落着破碎的魂镜片）', text: '每一片镜片里，都映着一双眼睛——喜、怒、哀、惧，各不相同。' },
              actions: [
                { label: '拾起一片端详', type: 'easter', text: '✨ 彩蛋！你拾起的镜片映出你的倒影——三张面孔重叠在一起。原来善与恶，本就是同一颗心的两面。', rewardKey: 'sanshou_jing' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_sanshou_arrive', location: '三首 · 魂镜高原', bg: 'assets/img/nations/sanshou-mist.jpg',
          npcs: [
            { id: 'wujiu', name: '无咎', icon: '🪞', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '离开海域，你登上三首国的魂镜高原。浓雾终年不散，一座座魂井矗立在雾中，井底翻涌着不知名的光。' },
                { name: '无咎', text: '（执念化身，总是第一个开口）你好。我是无咎——他们说我执念太重，放不下。可放不下，有什么错？' },
                { name: '无咎', text: '魂井封印着混沌魂主。它不伤肉身，专攻人心。你若要去，先照一照自己吧。' }
              ],
              choices: [
                { label: '走向魂井', nextStory: 'sy_sanshou_mirror' },
                { label: '问：三念分裂是怎么回事？', reply: '无咎苦笑：「三首族的天赋是同时持有善念、恶念、执念。可魂主污染后，三念各自为政，人便疯了。我守着执念，是因为我怕……放下执念的那个我，会忘记自己是谁。」', nextStory: 'sy_sanshou_mirror' }
              ]
            }
          ]
        },
        {
          id: 'sy_sanshou_mirror', location: '三首 · 魂井', bg: 'assets/img/nations/sanshou-mist.jpg',
          npcs: [
            { id: 'mingli2', name: '明璃', portrait: 'assets/img/npc/npc_mingli.jpg', icon: '✨', x: 48, y: 42,
              lines: [
                { name: '明璃', text: '（善念化身，立在魂井旁）魂井映照的，不是你做过的事，而是你选择成为的人。' },
                { name: '明璃', text: '善与恶，从不是由结果定夺。是你在每一次选择里，握住的那一点光。' }
              ],
              choices: [
                { label: '正视魂井，面对三念', onChoose: (p) => { try { STATE.enterNation(p, 'sanshou'); } catch (e) {} }, nextScene: 'sanshou_q07_01_well' },
                { label: '再听明璃的告诫', nextStory: 'sy_sanshou_mirror' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 聂耳国（nieer）· 共鸣之谷
     * 主题：鸣石之心沉睡四凶"穷奇之耳"，吞噬所有声音
     * 关键人物：弦歌（天听大祭司之女）、铁鼓（振动盲人）
     * Boss：寂灭之音（穷奇之耳）
     * ============================================================ */
    nieer: {
      name: '聂耳',
      intro: '峡谷寂静得可怕。不是安静——是声音被什么东西，一点一点吃掉了。',
      scenes: [
        {
          id: 'nieer_canyon',
          name: '聂耳 · 共鸣峡谷',
          bg: 'assets/img/nations/nieer-canyon.jpg',
          hotpoints: [
            { id: 'npc_xiange', x: 50, y: 42, portrait: 'assets/img/npc/npc_xiange.jpg', icon: '🎵', name: '弦歌', type: 'npc',
              dialog: { name: '弦歌', text: '（天听大祭司之女，指尖轻抚琴弦却没有声音）你听得到吗？我弹琴，它却……不响。' },
              actions: [
                { label: '询问声音被吞噬之事', type: 'story', text: '弦歌眼中含泪：「鸣石之心被穷奇之耳污染，它开始吞噬声音。先是我母亲的歌声，再是整座城的鸟鸣——下一个，会是人声。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren9', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '聂耳商人', type: 'npc',
              dialog: { name: '聂耳商人', text: '鸣石、音之精——聂耳的好货！客官……（他忽然捂住嘴，面露惊恐，因为他听不见自己说话了）' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_nie', x: 72, y: 64, icon: '🔔', name: '失声的铃铛', type: 'object',
              dialog: { name: '（一挂风铃挂在岩壁上，却发不出声响）', text: '风穿过铃铛，它却沉默着——像这个世界所有的声音，都被什么人收走了。' },
              actions: [
                { label: '轻触铃铛', type: 'easter', text: '✨ 彩蛋！你指尖触及铃铛的刹那，仿佛听见一声极轻极远的「叮」——那是聂耳国，最后一次记得的歌声。', rewardKey: 'nieer_ling' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_nieer_arrive', location: '聂耳 · 峡谷入口', bg: 'assets/img/nations/nieer-canyon.jpg',
          npcs: [
            { id: 'tiegu', name: '铁鼓', icon: '🥁', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '越是深入聂耳国，世界越是安静。不是宁静，是一种被抽空的、让人心慌的寂静。峡谷口，一个盲人老鼓手在敲一面哑鼓。' },
                { name: '铁鼓', text: '（振动盲人，靠鼓声的震颤感知世界）别说话……不，你说话我也听不见。我靠鼓，鼓靠震。声音正在被吃掉。' },
                { name: '铁鼓', text: '穷奇之耳醒了。它吞声，是因为它饿了——它要吞掉最后一种声音，才能彻底苏醒。' }
              ],
              choices: [
                { label: '进入峡谷寻找鸣石之心', nextStory: 'sy_nieer_canyon' },
                { label: '问：最后一种声音是什么？', reply: '铁鼓沉默许久，敲了一下鼓：「是人声。穷奇之耳要吞掉所有人声，才能化作完整的「寂灭之音」。孩子们已经开始学不会说话了。」', nextStory: 'sy_nieer_canyon' }
              ]
            }
          ]
        },
        {
          id: 'sy_nieer_canyon', location: '聂耳 · 鸣石之心', bg: 'assets/img/nations/nieer-canyon.jpg',
          npcs: [
            { id: 'xiange2', name: '弦歌', portrait: 'assets/img/npc/npc_xiange.jpg', x: 48, y: 42,
              lines: [
                { name: '弦歌', text: '（指尖抚过空无一物的琴弦）天听族世代以声为祭。我们相信，声音里住着灵魂。' },
                { name: '弦歌', text: '鸣石之心是聂耳的命脉。若它被彻底吞噬，这里将永远沉默——连同我们所有的歌，所有的故事。' }
              ],
              choices: [
                { label: '与弦歌一同守护鸣石之心', onChoose: (p) => { try { STATE.enterNation(p, 'nieer'); } catch (e) {} }, nextScene: 'nieer_q08_01_mine' },
                { label: '再听弦歌的琴音', nextStory: 'sy_nieer_canyon' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 大人国（daren）· 擎天之柱
     * 主题：擎天四柱（夸父骨骼）被蚀骨污染，夸父之渴苏醒
     * 关键人物：岳山（擎天王之子）、细针（侏儒工匠）
     * Boss：混沌巨灵（夸父蚀骨）
     * ============================================================ */
    daren: {
      name: '大人',
      intro: '擎天四柱撑起的天穹下，巨人与侏儒，共享同一片将倾的天。',
      scenes: [
        {
          id: 'daren_plateau',
          name: '大人 · 擎天高原',
          bg: 'assets/img/nations/daren-plateau.jpg',
          hotpoints: [
            { id: 'npc_yueshan', x: 50, y: 42, portrait: 'assets/img/npc/npc_yueshan.jpg', icon: '🏔️', name: '岳山', type: 'npc',
              dialog: { name: '岳山', text: '（擎天王之子，身形高大却满脸愁容）四根擎天柱，断了一根。天……在往下沉。' },
              actions: [
                { label: '询问擎天柱之事', type: 'story', text: '岳山握紧拳头：「夸父的骨骼化作了擎天柱。可蚀骨污染了它们——夸父之渴醒了，他要把天……拉下来。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren10', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '大人商人', type: 'npc',
              dialog: { name: '大人商人', text: '擎石、逐日之杖——大人国的好货！虽然天快塌了，但生意还是要做的，客官你说是不是？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_da', x: 72, y: 66, icon: '🌞', name: '逐日的残杖', type: 'object',
              dialog: { name: '（半截木杖插在土里）', text: '木杖顶端刻着一轮烈日，那是夸父逐日的方向。' },
              actions: [
                { label: '触摸残杖', type: 'easter', text: '✨ 彩蛋！残杖微微发烫。夸父追了一生的太阳，到头来，他只想要一口水——和一片能站立的土地。', rewardKey: 'daren_zhang' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_daren_arrive', location: '大人 · 擎天高原', bg: 'assets/img/nations/daren-plateau.jpg',
          npcs: [
            { id: 'xizhen', name: '细针', icon: '🪡', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '离开聂耳国的寂静，你踏上大人国的高原。四根擎天巨柱直插云霄，天穹却似乎比往常低了一寸。一个侏儒工匠，正仰头望着柱子。' },
                { name: '细针', text: '（侏儒工匠，手艺却堪比巨人）我叫细针。擎天柱……断了一根。大人们慌了，说天要塌了。' },
                { name: '细针', text: '可塌下来又怎样？我们侏儒从不高攀天。我们只要脚下的地还在，就能继续活。' }
              ],
              choices: [
                { label: '前往擎天柱', nextStory: 'sy_daren_pillar' },
                { label: '问：夸父之渴是什么？', reply: '细针眯起眼：「夸父的骨骼化作了擎天柱。蚀骨污染后，夸父之渴醒了——他渴了一辈子，现在他要这整个世界，陪他一起渴。」', nextStory: 'sy_daren_pillar' }
              ]
            }
          ]
        },
        {
          id: 'sy_daren_pillar', location: '大人 · 擎天柱下', bg: 'assets/img/nations/daren-plateau.jpg',
          npcs: [
            { id: 'yueshan2', name: '岳山', portrait: 'assets/img/npc/npc_yueshan.jpg', x: 48, y: 42,
              lines: [
                { name: '岳山', text: '（擎天王之子，手按在巨柱粗糙的纹理上）这根柱子里，流着夸父的血。他倒下时，是朝着太阳的方向。' },
                { name: '岳山', text: '我们都说他执迷于逐日，可谁想过——夸父或许不是想追上太阳，他只是……想追回那个被太阳夺走的故乡。' }
              ],
              choices: [
                { label: '与岳山一同修补擎天柱', onChoose: (p) => { try { STATE.enterNation(p, 'daren'); } catch (e) {} }, nextScene: 'daren_q09_01_pillar' },
                { label: '再听岳山的述说', nextStory: 'sy_daren_pillar' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 白民国（baimin）· 万兽之原
     * 主题：兽灵契约被"饕餮之口"污染，契约由"桥梁"变"锁链"
     * 关键人物：雪翎（五灵共主之女）、雷牙、花蹄、影爪、英招残魂
     * Boss：混沌兽主（饕餮之口）
     * ============================================================ */
    baimin: {
      name: '白民',
      intro: '万兽原上，兽灵奔腾。可那一条条契约之链，正在把"伙伴"勒成"囚徒"。',
      scenes: [
        {
          id: 'baimin_plain',
          name: '白民 · 万兽原',
          bg: 'assets/img/nations/baimin-plain.jpg',
          hotpoints: [
            { id: 'npc_xueling', x: 50, y: 42, portrait: 'assets/img/npc/npc_xueling.jpg', icon: '🦌', name: '雪翎', type: 'npc',
              dialog: { name: '雪翎', text: '（五灵共主之女，身边跟着一头温顺的白鹿）契约本应是桥梁……可饕餮之口，把它变成了锁链。兽灵在受苦。' },
              actions: [
                { label: '询问契约被污染之事', type: 'story', text: '雪翎抚过白鹿的脖颈，那里有一道隐约的锁印：「兽灵与人的契约，本该是互相成就。现在……它在榨取兽灵的生命。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren11', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '白民商人', type: 'npc',
              dialog: { name: '白民商人', text: '灵草、兽灵心血——白民的好货！不过客官，牵走兽灵前可得想清楚，契约是缘，也是债。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_bai', x: 72, y: 66, icon: '🦋', name: '断线的兽铃', type: 'object',
              dialog: { name: '（草丛里躺着一枚断线的兽铃）', text: '铃铛上刻着兽灵的名字，绳端却空空荡荡——契约的锁链，终于断了。' },
              actions: [
                { label: '拾起兽铃', type: 'easter', text: '✨ 彩蛋！断线的那端，本应系着一段「伙伴」的缘分。契约若沦为锁链，不如放它自由。', rewardKey: 'baimin_ling' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_baimin_arrive', location: '白民 · 万兽原', bg: 'assets/img/nations/baimin-plain.jpg',
          npcs: [
            { id: 'leiYa', name: '雷牙', icon: '🐆', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '大人国的天穹依旧低垂，你已经来到白民国的万兽原。百兽奔腾，原野辽阔——可仔细看，每头兽灵的脖颈上，都缠着一道若隐若现的锁印。' },
                { name: '雷牙', text: '（豹灵守护者，身上同样有锁印）外乡人，看得出锁印么？白民与兽灵的契约，被饕餮之口污染了。' },
                { name: '雷牙', text: '以前，契约是「我载你奔跑，你为我挡风」。现在，契约是「我榨你精血，你不得反抗」。' }
              ],
              choices: [
                { label: '进入万兽原深处', nextStory: 'sy_baimin_plain' },
                { label: '问：契约能解开吗？', reply: '雷牙低吼：「除非找到英招残魂——传说中守护万兽的神兽。它或许知道，如何让契约回到本来的样子。」', nextStory: 'sy_baimin_plain' }
              ]
            }
          ]
        },
        {
          id: 'sy_baimin_plain', location: '白民 · 五灵祭坛', bg: 'assets/img/nations/baimin-plain.jpg',
          npcs: [
            { id: 'xueling2', name: '雪翎', portrait: 'assets/img/npc/npc_xueling.jpg', x: 48, y: 42,
              lines: [
                { name: '雪翎', text: '（五灵共主之女，白鹿轻蹭她的掌心）我父亲说，契约是白民立国之本。可若本就成了锁链……这样的国，还值得守护吗？' },
                { name: '雪翎', text: '英招残魂在万兽原的深处沉睡。它醒来之日，或许能告诉我们——兽与人的缘分，最初的模样。' }
              ],
              choices: [
                { label: '与雪翎唤醒英招残魂', onChoose: (p) => { try { STATE.enterNation(p, 'baimin'); } catch (e) {}; if (p) { STATE.addMaterial(p, 'MAT-BM01', 3); p.realm.exp = (p.realm.exp || 0) + 1800; const lu = STATE.checkLevelUp(p); if (lu) Engine.log('境界提升！', 'good'); Engine.log('你们在兽灵墓场经历一场恶战，战胜了六具兽灵灵体。获得灵草×3，修为大涨。', 'good'); if (STATE.addFavor) STATE.addFavor(p, 'xueling', 10); } }, nextScene: 'baimin_q10_01_roots' },
                { label: '再听雪翎的心声', nextStory: 'sy_baimin_plain' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 长股国（changgu）· 裂时之渊
     * 主题：时间沙漠裂时渊，饕餮之牙啃噬"时间"，滞者遭难
     * 关键人物：追风（时主之女）、老跃（退役逐者）、时漏（预见少年）
     * Boss：混沌牙兽
     * ============================================================ */
    changgu: {
      name: '长股',
      intro: '时间在长股国被啃出了缺口。有人被困在过去，有人被抛向未来。',
      scenes: [
        {
          id: 'changgu_desert',
          name: '长股 · 时间沙漠',
          bg: 'assets/img/nations/changgu-desert.jpg',
          hotpoints: [
            { id: 'npc_zhufeng', x: 50, y: 42, portrait: 'assets/img/npc/npc_zhuifeng.jpg', icon: '⏳', name: '追风', type: 'npc',
              dialog: { name: '追风', text: '（时主之女，腰间的沙漏却定格不动）你来的正是时候——裂时渊的饕餮之牙，把时间啃出了一道口子。' },
              actions: [
                { label: '询问裂时渊之事', type: 'story', text: '追风托起沙漏：「长股国世代逐时而行。可现在，饕餮之牙吞食时间——有人永远停在过去，有人被抛向没有尽头的未来。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren12', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '长股商人', type: 'npc',
              dialog: { name: '长股商人', text: '时砂、饕餮牙碎片——长股的好货！客官放心，我这买卖，从不赊时间。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_chang', x: 72, y: 66, icon: '⌛', name: '定格的沙漏', type: 'object',
              dialog: { name: '（一只沙漏倒放在沙丘上，却没有沙粒流动）', text: '沙粒悬在半空，像是被谁按下了暂停键。' },
              actions: [
                { label: '翻转沙漏', type: 'easter', text: '✨ 彩蛋！你翻转沙漏的刹那，看见无数个"自己"在时光里并行——原来每一刻的选择，都在另一条时间线上盛开。', rewardKey: 'changgu_shalou' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_changgu_arrive', location: '长股 · 时间沙漠', bg: 'assets/img/nations/changgu-desert.jpg',
          npcs: [
            { id: 'laoyue', name: '老跃', icon: '🏃', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '白民国的兽灵嘶鸣还在身后，你已经踏入长股国的时间沙漠。黄沙与流光交织，远处的裂时渊像一道撕裂天空的口子。' },
                { name: '老跃', text: '（退役的逐时者，拄着拐杖）年轻时，我能在时间里奔跑，追着落日，追着未来。现在……我连昨天的自己都追不上了。' },
                { name: '老跃', text: '饕餮之牙啃噬时间。滞者被困在原地，逐者迷失在岔路。这片沙漠，正在失去"现在"。' }
              ],
              choices: [
                { label: '前往裂时渊', nextStory: 'sy_changgu_abyss' },
                { label: '问：裂时渊里有什么？', reply: '老跃眯起眼：「裂时渊里，时间的碎片乱飞。有人在那里看到过去，有人看到未来。但进去的人，很少有能回来的——回来的，也都不是原来的自己了。」', nextStory: 'sy_changgu_abyss' }
              ]
            }
          ]
        },
        {
          id: 'sy_changgu_abyss', location: '长股 · 裂时渊', bg: 'assets/img/nations/changgu-desert.jpg',
          npcs: [
            { id: 'shilou', name: '时漏', icon: '👁️', x: 48, y: 42,
              lines: [
                { name: '时漏', text: '（能预见未来的少年，眼中流动着碎金般的光）我看见过你。在三条不同的时间里，你做了三种选择。' },
                { name: '时漏', text: '其中一种里，你封印了饕餮之牙，长股国重获时间。另一种里，你放任它吞噬，而你自己……变成了时间本身。' }
              ],
              choices: [
                { label: '与追风一同封住裂时渊', onChoose: (p) => { try { STATE.enterNation(p, 'changgu'); } catch (e) {} }, nextScene: 'changgu_q11_01_gorge' },
                { label: '再听时漏的预言', nextStory: 'sy_changgu_abyss' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 周饶国（zhurao）· 须弥微城
     * 主题：微观世界须弥城被"无序"（饕餮之鳞）污染
     * 关键人物：芥璃（微光城祭司）、针眼（微匠）
     * Boss：混沌鳞兽
     * ============================================================ */
    zhurao: {
      name: '周饶',
      intro: '在看不见的微尘里，藏着一座须弥之城。那里的秩序，正在崩塌。',
      scenes: [
        {
          id: 'zhurao_order',
          name: '周饶 · 须弥城',
          bg: 'assets/img/nations/zhurao-order.jpg',
          hotpoints: [
            { id: 'npc_jieli', x: 50, y: 42, portrait: 'assets/img/npc/npc_jieli.jpg', icon: '🔬', name: '芥璃', type: 'npc',
              dialog: { name: '芥璃', text: '（微光城祭司，身形极小却气度不凡）你竟然……能看见我们？那你也该看见，我们头顶的"无序"之云。' },
              actions: [
                { label: '询问无序之云', type: 'story', text: '芥璃抬头：「混沌鳞片落在须弥城上空，化作"无序"。它让齿轮倒转、泉水逆流、人心错乱——我们的秩序，快撑不住了。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren13', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '周饶商人', type: 'npc',
              dialog: { name: '周饶商人', text: '微尘、秩序原典——周饶的好货！客官，我们虽然小，但做买卖，一尘不差。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_zhurao', x: 72, y: 66, icon: '🌌', name: '倒悬的水滴', type: 'object',
              dialog: { name: '（一滴水珠悬在半空，却不落下）', text: '无序之力让水的方向也乱了。可水珠里，倒映着须弥城——它明明，是正的。' },
              actions: [
                { label: '凝视水滴', type: 'easter', text: '✨ 彩蛋！你从水珠里看见须弥城的倒影——城市是正的，乱的从来不是水，是看水的眼睛。', rewardKey: 'zhurao_shui' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_zhurao_arrive', location: '周饶 · 须弥城门外', bg: 'assets/img/nations/zhurao-order.jpg',
          npcs: [
            { id: 'zhenyan', name: '针眼', icon: '🪡', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '你俯身望向一片寻常的落叶——落叶的脉络里，藏着一座须弥之城。周饶国的子民，就生活在这微尘之间。' },
                { name: '针眼', text: '（微匠，手中捏着一根比发丝还细的针）外乡的巨人啊，你能看见我们，真是缘分。可这份缘分，来得不是时候。' },
                { name: '针眼', text: '混沌鳞片化作"无序"，罩在须弥城上空。我们的秩序、我们的规矩，正在一点一点地乱掉。' }
              ],
              choices: [
                { label: '进入须弥城', nextStory: 'sy_zhurao_city' },
                { label: '问：无序是什么？', reply: '针眼苦笑：「无序不是没有规则，是规则在不停改变。昨天还正确的，今天就是错误。人心惶惶，谁也信不过谁。」', nextStory: 'sy_zhurao_city' }
              ]
            }
          ]
        },
        {
          id: 'sy_zhurao_city', location: '周饶 · 须弥核心', bg: 'assets/img/nations/zhurao-order.jpg',
          npcs: [
            { id: 'jieli2', name: '芥璃', portrait: 'assets/img/npc/npc_jieli.jpg', x: 48, y: 42,
              lines: [
                { name: '芥璃', text: '（微光城祭司，立于须弥核心前）我们周饶一族，靠"秩序"立国。可无序降临后，连最忠实的契约，都会在下一个瞬间反转。' },
                { name: '芥璃', text: '巨人的世界里有巨人要守的东西。微尘的世界里，也有我们必须守的"一尘不差"。' },
                { name: '芥璃', text: '要进入无序的核心，须走「宏观通道」。长老宏观是须弥城唯一能"巨大化"到你看得见地步的人，他会为我们引路。' }
              ],
              choices: [
                { label: '与芥璃一同驱散无序', onChoose: (p) => { try { STATE.enterNation(p, 'zhurao'); } catch (e) {} }, nextScene: 'zhurao_q12_01_eye' },
                { label: '再听芥璃的守序之道', nextStory: 'sy_zhurao_city' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 交胫国（jiaojing）· 缠丝命轮
     * 主题："因果"被穷奇之爪撕碎，命轮记录遭吞噬
     * 关键人物：缠花（交胫主之女）、老绊（断胫者领袖）
     * Boss：混沌爪兽
     * ============================================================ */
    jiaojing: {
      name: '交胫',
      intro: '命轮之上的线，缠绕着所有人的因果。可有一只爪子，正把它们一根根撕断。',
      scenes: [
        {
          id: 'jiaojing_fate',
          name: '交胫 · 缠丝平原',
          bg: 'assets/img/nations/jiaojing-fate.jpg',
          hotpoints: [
            { id: 'npc_chanhua', x: 50, y: 42, portrait: 'assets/img/npc/npc_chanhua.jpg', icon: '🕸️', name: '缠花', type: 'npc',
              dialog: { name: '缠花', text: '（交胫主之女，指尖缠着几缕透明的因果之线）你身上缠着很多线——有些是善缘，有些是旧怨，还有一根，通向很远的未来。' },
              actions: [
                { label: '询问因果被撕裂之事', type: 'story', text: '缠花神色哀伤：「穷奇之爪撕碎了命轮。那些线断了的人，会渐渐忘记自己为什么活着——连仇人都记不得，爱过谁也想不起来。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren14', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '交胫商人', type: 'npc',
              dialog: { name: '交胫商人', text: '命砂、穷奇爪碎片——交胫的好货！客官可要看看，你与谁有一根未断的线？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_jiao', x: 72, y: 66, icon: '🧵', name: '断裂的红线', type: 'object',
              dialog: { name: '（一根断裂的红线躺在草丛里，线端仍在发光）', text: '红线的另一端连着谁？你看不见——因为连接它的那一段因果，已经被撕碎了。' },
              actions: [
                { label: '拾起红线', type: 'easter', text: '✨ 彩蛋！红线的另一端随风飘向远方。有些断掉的缘，或许还能重新系上——只要有人愿意，先去走那一步。', rewardKey: 'jiaojing_hong' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_jiaojing_arrive', location: '交胫 · 缠丝平原', bg: 'assets/img/nations/jiaojing-fate.jpg',
          npcs: [
            { id: 'laoban', name: '老绊', icon: '🦶', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '交胫国的大地上，缠满了透明的丝线。每一根线，都是一段因果——谁和谁相识、相欠、相守。一位断胫老者坐在命轮旁。' },
                { name: '老绊', text: '（断胫者领袖，拄着拐）我这双腿，是年轻时为一桩没断的因果断的。如今倒好，因果被爪子撕碎了，我连那段故事都记不清了。' },
                { name: '老绊', text: '穷奇之爪撕裂命轮。那些线断了的人，正在忘记自己为何而活。' }
              ],
              choices: [
                { label: '前往命轮织机', nextStory: 'sy_jiaojing_loom' },
                { label: '问：因果被撕裂会怎样？', reply: '老绊低声：「最惨的不是忘记仇人，是忘记爱过的人。有些人站在你面前，你却想不起他为什么对你哭过、笑过。」', nextStory: 'sy_jiaojing_loom' }
              ]
            }
          ]
        },
        {
          id: 'sy_jiaojing_loom', location: '交胫 · 命轮织机', bg: 'assets/img/nations/jiaojing-fate.jpg',
          npcs: [
            { id: 'chanhua2', name: '缠花', portrait: 'assets/img/npc/npc_chanhua.jpg', x: 48, y: 42,
              lines: [
                { name: '缠花', text: '（交胫主之女，十指翻飞，试图缝补断裂的命线）线断了可以再系，可记忆呢？被撕碎的回忆，再多的线也织不回来。' },
                { name: '缠花', text: '除非……能先让那只爪子停手，让命轮重新转动。' },
                { name: '缠花', text: '无绊已在渊口等候。他虽无绊，却比任何人都看得清脚下的路——他会为我们引路，直捣穷奇之爪的老巢。' }
              ],
              choices: [
                { label: '与缠花一同修复命轮', onChoose: (p) => { try { STATE.enterNation(p, 'jiaojing'); } catch (e) {} }, nextScene: 'jiaojing_q13_01_gorge' },
                { label: '再听缠花的心声', nextStory: 'sy_jiaojing_loom' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 柔利国（rouli）· 蜕形之海
     * 主题："形态"被四凶之尾吞噬，柔利族形体溶解
     * 关键人物：缺月（柔利主之女）、老痂（无形者领袖）
     * Boss：混沌尾兽
     * ============================================================ */
    rouli: {
      name: '柔利',
      intro: '蜕形之海上，形体如水一般易逝。有人拼命抓住"自己"的形状，有人已经忘了自己原本的模样。',
      scenes: [
        {
          id: 'rouli_shape',
          name: '柔利 · 蜕形之海',
          bg: 'assets/img/nations/rouli-shape.jpg',
          hotpoints: [
            { id: 'npc_queyue', x: 50, y: 42, portrait: 'assets/img/npc/npc_queyue.jpg', icon: '🌊', name: '缺月', type: 'npc',
              dialog: { name: '缺月', text: '（柔利主之女，身形轮廓若隐若现）你来了……小心，别离水太近。这里的海，会"化"掉你的形状。' },
              actions: [
                { label: '询问形体溶解之事', type: 'story', text: '缺月低头看着自己的手：「四凶之尾吞噬"形态"。我们柔利族生来会蜕皮重生，可现在，蜕完之后，再也长不回原来的样子了。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren15', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '柔利商人', type: 'npc',
              dialog: { name: '柔利商人', text: '蜕砂、混沌尾骨——柔利的好货！客官放心，我卖的是物，不是形。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_rou', x: 72, y: 66, icon: '🫧', name: '凝滞的泡沫', type: 'object',
              dialog: { name: '（海面上一串泡沫悬停不散，每个泡里都映着不同的面孔）', text: '有的面孔在笑，有的在哭——都是同一个人，在不同年纪的模样。' },
              actions: [
                { label: '触碰泡沫', type: 'easter', text: '✨ 彩蛋！泡沫应声而散。你忽然明白——"自己"从来不是一个固定的形状，而是每一个曾经的自己的总和。', rewardKey: 'rouli_pao' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_rouli_arrive', location: '柔利 · 蜕形之海', bg: 'assets/img/nations/rouli-shape.jpg',
          npcs: [
            { id: 'laojia', name: '老痂', icon: '🫧', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '柔利国的蜕形之海，像一面巨大的、会流动的镜子。海面倒映的，不是你的脸——而是无数张模糊的、正在融化的面孔。' },
                { name: '老痂', text: '（无形者领袖，声音沙哑）我年轻时，长着一张俊俏的脸。现在？连我自己都记不清了。' },
                { name: '老痂', text: '四凶之尾吞噬"形态"。柔利族蜕皮求生，可蜕完之后，谁都长不回原来的模样——我们正在变成"无名之众"。' }
              ],
              choices: [
                { label: '深入蜕形之海', nextStory: 'sy_rouli_sea' },
                { label: '问：没有形状会怎样？', reply: '老痂沉默良久：「没有形状，就没有名字；没有名字，就没有人记得你。我们不怕死，怕的是……被遗忘。」', nextStory: 'sy_rouli_sea' }
              ]
            }
          ]
        },
        {
          id: 'sy_rouli_sea', location: '柔利 · 蜕形之源', bg: 'assets/img/nations/rouli-shape.jpg',
          npcs: [
            { id: 'queyue2', name: '缺月', portrait: 'assets/img/npc/npc_queyue.jpg', x: 48, y: 42,
              lines: [
                { name: '缺月', text: '（柔利主之女，身体时而凝实时而透明）父亲说，柔利族的传统是"蜕形重生"。可这一回，我们蜕掉的，是"存在"本身。' },
                { name: '缺月', text: '我一直在想——如果连形状都没有了，我们还能不能……被称为"我们"？' },
                { name: '缺月', text: '「蜕皮」——那条预言蜕生蛇，正缠在我肩头。它是柔利族最古老的见证者，能读取万物的形态记忆。要深入残躯之海，须由它引路。' }
              ],
              choices: [
                { label: '与缺月一同守护"形态"', onChoose: (p) => { try { STATE.enterNation(p, 'rouli'); } catch (e) {} }, nextScene: 'rouli_q14_01_sea' },
                { label: '再听缺月的哲思', nextStory: 'sy_rouli_sea' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 深目国（shenmu）· 瞳渊之视
     * 主题：归墟之隙的"注视"定住现实，盲者被奴役
     * 关键人物：瞳渊（深目主之女）、盲先（盲者领袖）
     * Boss：混沌瞳兽
     * ============================================================ */
    shenmu: {
      name: '深目',
      intro: '天空裂开一道缝隙，缝隙里有东西在"看"。被它看见的事物，就再也无法改变。',
      scenes: [
        {
          id: 'shenmu_eye',
          name: '深目 · 瞳渊',
          bg: 'assets/img/nations/shenmu-eye.jpg',
          hotpoints: [
            { id: 'npc_tongyuan', x: 50, y: 42, portrait: 'assets/img/npc/npc_tongyuan.jpg', icon: '👁️', name: '瞳渊', type: 'npc',
              dialog: { name: '瞳渊', text: '（深目主之女，额间有一只未睁开的竖瞳）别抬头看天缝。被它"注视"的瞬间，你的命运就会被定住。' },
              actions: [
                { label: '询问天缝之事', type: 'story', text: '瞳渊低声：「归墟之隙在注视着深目国。被它看见的人，从此只会重复同一天——未来被"看死"了。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren16', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '深目商人', type: 'npc',
              dialog: { name: '深目商人', text: '瞳砂、归墟倒影——深目的好货！客官可要看看，你未来的倒影？' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_shen', x: 72, y: 66, icon: '👁️', name: '闭合的眼睛', type: 'object',
              dialog: { name: '（石壁上刻着一只闭合的眼睛，线条温柔）', text: '与天缝那只灼灼的竖瞳不同，这只眼睛闭着，像是……在拒绝注视，也像是，在守护什么。' },
              actions: [
                { label: '轻抚石刻', type: 'easter', text: '✨ 彩蛋！你轻抚那只闭合的眼睛，仿佛听见一句古老的话：「看，是为了记住。闭上眼，是为了不让记忆被写死。」', rewardKey: 'shenmu_yan' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_shenmu_arrive', location: '深目 · 瞳城', bg: 'assets/img/nations/shenmu-eye.jpg',
          npcs: [
            { id: 'mangxian', name: '盲先', icon: '🦯', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '深目国上空，一道横贯天际的裂缝静静张着。裂缝深处，仿佛有什么东西在缓缓"注视"着大地。一个盲者老者，正沿街用杖尖摸索前行。' },
                { name: '盲先', text: '（盲者领袖，声音平静）我们看不见天缝，却比谁都清楚它的存在。它"看"着所有人——被看定的人，连明天都不会有。' },
                { name: '盲先', text: '可你知道吗？看不见的人，反而不会被"定住"。我们的未来，还在自己手里。' }
              ],
              choices: [
                { label: '前往瞳渊', nextStory: 'sy_shenmu_abyss' },
                { label: '问：被注视会怎样？', reply: '盲先轻叹：「被注视的人，从此只会重复同一天。不是被困，是"未来"被那只眼睛一笔划掉了。」', nextStory: 'sy_shenmu_abyss' }
              ]
            }
          ]
        },
        {
          id: 'sy_shenmu_abyss', location: '深目 · 瞳渊之下', bg: 'assets/img/nations/shenmu-eye.jpg',
          npcs: [
            { id: 'tongyuan2', name: '瞳渊', portrait: 'assets/img/npc/npc_tongyuan.jpg', x: 48, y: 42,
              lines: [
                { name: '瞳渊', text: '（深目主之女，仰头望向天缝）我们深目族，以"视"为天赋。可归墟之隙，把这天赋变成了诅咒。' },
                { name: '瞳渊', text: '或许……最勇敢的不是睁眼直视它，而是敢于闭上眼，对那只眼睛说：你看吧，但我不会再按你写好的剧本活。' }
              ],
              choices: [
                { label: '与瞳渊一同对抗注视', onChoose: (p) => { try { STATE.enterNation(p, 'shenmu'); } catch (e) {} }, nextScene: 'shenmu_q15_01_tower' },
                { label: '再听瞳渊的决心', nextStory: 'sy_shenmu_abyss' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 无肠国（wuchang）· 吞天釜
     * 主题：吞天釜中饕餮之胃消化"存在"，无肠族熔炉反胃
     * 关键人物：饥离（无肠主之女）、满肚（空腹者领袖）、老饕（退役食神）
     * Boss：混沌吞兽
     * ============================================================ */
    wuchang: {
      name: '无肠',
      intro: '吞天釜日夜轰鸣，消化着一切"存在"。无肠族永远在吃，却永远也吃不饱。',
      scenes: [
        {
          id: 'wuchang_devour',
          name: '无肠 · 吞天釜',
          bg: 'assets/img/nations/wuchang-devour.jpg',
          hotpoints: [
            { id: 'npc_jili', x: 50, y: 42, portrait: 'assets/img/npc/npc_jili.jpg', icon: '🍽️', name: '饥离', type: 'npc',
              dialog: { name: '饥离', text: '（无肠主之女，捂着胃部，脸色苍白）你饿吗？我饿。我永远都在饿——饕餮之胃，在吞食我们的"存在"。' },
              actions: [
                { label: '询问吞天釜之事', type: 'story', text: '饥离颤声：「吞天釜里住着饕餮之胃。它消化一切——不只是食物，还有记忆、名字、甚至一个人"存在过"的痕迹。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren17', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '无肠商人', type: 'npc',
              dialog: { name: '无肠商人', text: '饥砂、饕餮胃囊碎片——无肠的好货！客官要不要来点？虽然……我也不知道吃了会不会饱。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_wuchang', x: 72, y: 66, icon: '🍚', name: '一碗馊掉的饭', type: 'object',
              dialog: { name: '（灶台上放着一碗馊掉的饭，却没有人动过）', text: '饭已经馊了，可碗边还贴着一张字条：「娘，我吃饱了。」' },
              actions: [
                { label: '细看字条', type: 'easter', text: '✨ 彩蛋！字迹歪歪扭扭，像是孩子写的。在永远饥饿的无肠国，一句"吃饱了"，竟是比黄金更珍贵的话。', rewardKey: 'wuchang_fan' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_wuchang_arrive', location: '无肠 · 饥原', bg: 'assets/img/nations/wuchang-devour.jpg',
          npcs: [
            { id: 'mangdu', name: '满肚', icon: '🍽️', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '深目国的天缝还悬在身后，你已经踏入无肠国的饥原。这里的人形销骨立，却都在大口吞咽——仿佛不吃，就会"不存在"。' },
                { name: '满肚', text: '（空腹者领袖，抚着瘪下去的肚子）外乡人，见笑了。我们无肠族，生来没有肠子，靠吞天釜维持"存在"。' },
                { name: '满肚', text: '可最近，釜里的饕餮之胃醒了。它不光吞食物，还在吞……我们活过的证据。' }
              ],
              choices: [
                { label: '前往吞天釜', nextStory: 'sy_wuchang_fu' },
                { label: '问：被"消化"会怎样？', reply: '满肚的眼神暗了暗：「被吞掉记忆的人，第二天醒来，连自己叫什么都不记得。被吞掉名字的人……就彻底不存在了，连墓碑都没有。」', nextStory: 'sy_wuchang_fu' }
              ]
            }
          ]
        },
        {
          id: 'sy_wuchang_fu', location: '无肠 · 吞天釜下', bg: 'assets/img/nations/wuchang-devour.jpg',
          npcs: [
            { id: 'jili2', name: '饥离', portrait: 'assets/img/npc/npc_jili.jpg', x: 48, y: 42,
              lines: [
                { name: '饥离', text: '（无肠主之女，仰望着轰鸣的巨釜）父亲说，无肠族靠吞天釜存活，这是恩赐。可若活着的前提是"被吞掉存在的痕迹"，这还算活着吗？' },
                { name: '饥离', text: '或许真正的"饱足"，不是吞下更多，而是终于有一样东西，是釜也吞不走的。' },
                { name: '饥离', text: '满肚与老饕已在釜口等候。老饕曾以食道丈量吞天釜，最懂釜腹的脾性——他们会为我们引路，直捣釜心。' }
              ],
              choices: [
                { label: '与饥离一同对抗吞天釜', onChoose: (p) => { try { STATE.enterNation(p, 'wuchang'); } catch (e) {} }, nextScene: 'wuchang_q16_01_kettle' },
                { label: '再听饥离的心声', nextStory: 'sy_wuchang_fu' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 一目国（yimu）· 独目之瞳
     * 主题：与深目国镜像——归墟之隙注视，一目族独眼被"看定"
     * 关键人物：瞳中（一目主之女）、盲山（盲者领袖）
     * Boss：混沌目魔
     * ============================================================ */
    yimu: {
      name: '一目',
      intro: '一目族的独眼，能看穿虚实。可当天空裂开，那只"注视"的眼睛，比任何刀剑都可怕。',
      scenes: [
        {
          id: 'yimu_eye',
          name: '一目 · 独目原',
          bg: 'assets/img/nations/yimu-eye.jpg',
          hotpoints: [
            { id: 'npc_tongzhong', x: 50, y: 42, portrait: 'assets/img/npc/npc_tongzhong.jpg', icon: '👁️', name: '瞳中', type: 'npc',
              dialog: { name: '瞳中', text: '（一目主之女，独目澄澈如镜）我们一目族，以独眼观世。可归墟之隙的注视，正在把我们的"看见"，变成"被看见"。' },
              actions: [
                { label: '询问独目被污染之事', type: 'story', text: '瞳中低语：「被天缝注视的一目族人，独目会渐渐失去神采——他们看见的未来，全被那只眼睛写死了。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren18', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '一目商人', type: 'npc',
              dialog: { name: '一目商人', text: '瞳砂、混沌目碎片——一目国的好货！客官，用一目族的眼睛看货，绝对童叟无欺。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_yimu', x: 72, y: 66, icon: '🪞', name: '蒙尘的铜镜', type: 'object',
              dialog: { name: '（一面蒙尘的铜镜斜倚在墙边）', text: '镜面早已模糊，却仍有一角明亮，映着不知谁的眼睛。' },
              actions: [
                { label: '擦拭铜镜', type: 'easter', text: '✨ 彩蛋！铜镜里映出的不是你的脸，而是无数个"曾经被看见"的人。有些注视是刀，有些注视，是守候。', rewardKey: 'yimu_jing' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_yimu_arrive', location: '一目 · 独目原', bg: 'assets/img/nations/yimu-eye.jpg',
          npcs: [
            { id: 'mangshan', name: '盲山', icon: '🦯', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '一目国与深目国相邻，却有截然不同的困境——这里的人天生只有一只独眼，能看穿虚实。可当天空裂开一条缝，那只"注视"的眼睛，成了所有人的噩梦。' },
                { name: '盲山', text: '（盲者领袖，被刺瞎了独目）我曾有一只好眼睛，能看穿谎言。可它看见了不该看的东西——天缝里的那只眼睛，也在看我。' },
                { name: '盲山', text: '从那以后，我便瞎了。可瞎了，反倒自由了。' }
              ],
              choices: [
                { label: '前往独目原深处', nextStory: 'sy_yimu_abyss' },
                { label: '问：看见未来不好吗？', reply: '盲山苦笑：「看见了未来，就不再相信"可能"。一目族最强的天赋，如今成了最深的牢笼。」', nextStory: 'sy_yimu_abyss' }
              ]
            }
          ]
        },
        {
          id: 'sy_yimu_abyss', location: '一目 · 瞳渊', bg: 'assets/img/nations/yimu-eye.jpg',
          npcs: [
            { id: 'tongzhong2', name: '瞳中', portrait: 'assets/img/npc/npc_tongzhong.jpg', x: 48, y: 42,
              lines: [
                { name: '瞳中', text: '（一目主之女，独目倒映着天缝）父亲说，闭上一目，是先祖为躲避灾祸留下的退路。可如今，天缝要我们永远睁着那只眼。' },
                { name: '瞳中', text: '也许……真正的答案，不是睁眼，也不是闭眼，而是学会"视而不见"。' },
                { name: '瞳中', text: '盲山与全视已在瞳城等候。盲山虽盲，却从不被天缝定住；全视能窥见镜中目光的去向——他们会带我们直抵盲塔。' }
              ],
              choices: [
                { label: '与瞳中一同对抗注视', onChoose: (p) => { try { STATE.enterNation(p, 'yimu'); } catch (e) {} }, nextScene: 'yimu_q17_01_tower' },
                { label: '再听瞳中的独白', nextStory: 'sy_yimu_abyss' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 结胸国（jiexiong）· 连脉之桥
     * 主题："连接"被梼杌之胸污染，结胸族胸骨空洞
     * 关键人物：贯离（结胸主之女）、满胸（断桥者领袖）
     * Boss：混沌贯兽
     * ============================================================ */
    jiexiong: {
      name: '结胸',
      intro: '连脉平原上，每一座桥都连着两个人。可梼杌之胸，正在把"相连"变成"捆绑"。',
      scenes: [
        {
          id: 'jiexiong_pillar',
          name: '结胸 · 连脉平原',
          bg: 'assets/img/nations/jiexiong-pillar.jpg',
          hotpoints: [
            { id: 'npc_guanli', x: 50, y: 42, portrait: 'assets/img/npc/npc_guanli.jpg', icon: '🌉', name: '贯离', type: 'npc',
              dialog: { name: '贯离', text: '（结胸主之女，胸前的"贯"字印记微微发光）结胸族以"连"为生——我们用心口的脉，连接彼此的心。可现在……' },
              actions: [
                { label: '询问连脉被污染之事', type: 'story', text: '贯离抚着胸口：「梼杌之胸污染了连脉。原本温暖的心心相连，如今变成了撕扯与捆绑——谁也不敢再相信谁。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren19', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '结胸商人', type: 'npc',
              dialog: { name: '结胸商人', text: '贯砂、梼杌胸骨碎片——结胸的好货！客官，咱俩也算连过脉的缘分，给个实价。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_jie', x: 72, y: 66, icon: '🌉', name: '断桥残木', type: 'object',
              dialog: { name: '（一座断桥横在水面，桥板还连着几根青藤）', text: '青藤是活的，还在努力缠向对岸——哪怕桥断了，它也没放弃"相连"。' },
              actions: [
                { label: '轻触青藤', type: 'easter', text: '✨ 彩蛋！青藤微微颤动，仿佛在对你说：真正断不了的连接，从来不在桥上，在心与心之间。', rewardKey: 'jiexiong_qing' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_jiexiong_arrive', location: '结胸 · 连脉平原', bg: 'assets/img/nations/jiexiong-pillar.jpg',
          npcs: [
            { id: 'manxiong', name: '满胸', icon: '🌉', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '一目国的独目还在隐隐作痛，你已经来到结胸国的连脉平原。这里的每一座桥，都连着两个人；每一条脉，都通着两颗心。' },
                { name: '满胸', text: '（断桥者领袖，胸前挂着一把断锁）我们结胸族，以"连"为荣。可梼杌之胸污染了连脉，让"相连"变成了"捆绑"。' },
                { name: '满胸', text: '现在，谁也不敢轻易与谁相连——怕被拖累，更怕被撕碎。' }
              ],
              choices: [
                { label: '前往界塔', nextStory: 'sy_jiexiong_tower' },
                { label: '问：连脉本是怎样的？', reply: '满胸望向远处：「连脉本是一根无形的线，把两颗心轻轻系在一起——不束缚，只陪伴。如今它变成锁链，绞得人心头滴血。」', nextStory: 'sy_jiexiong_tower' }
              ]
            }
          ]
        },
        {
          id: 'sy_jiexiong_tower', location: '结胸 · 界塔', bg: 'assets/img/nations/jiexiong-pillar.jpg',
          npcs: [
            { id: 'guanli2', name: '贯离', portrait: 'assets/img/npc/npc_guanli.jpg', x: 48, y: 42,
              lines: [
                { name: '贯离', text: '（结胸主之女，站在界塔顶端）结胸族相信，人与人的相连，是这世间最坚固的桥。可当桥变成了锁……' },
                { name: '贯离', text: '我们该学会的，不是斩断一切联系，而是分辨——哪些是能托住彼此的桥，哪些是绞杀彼此的链。' },
                { name: '贯离', text: '满胸与老桥已在塔底等候。老桥走过结胸族最多的桥，桥灵则能梳理连脉的走向——他们会为我们打开通往界塔核心的路。' }
              ],
              choices: [
                { label: '与贯离一同修复连脉', onChoose: (p) => { try { STATE.enterNation(p, 'jiexiong'); } catch (e) {} }, nextScene: 'jiexiong_q18_01_tower' },
                { label: '再听贯离的思索', nextStory: 'sy_jiexiong_tower' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 跂踵国（qizhong）· 行走之路
     * 主题："方向/行走"被梼杌之足污染，跂踵族方向迷失
     * 关键人物：行离（跂踵主之女）、驻足（驻足者领袖）
     * Boss：混沌行兽
     * ============================================================ */
    qizhong: {
      name: '跂踵',
      intro: '跂踵族生来无踵，只能不停行走。可当"方向"被污染，走得再远，也只是原地打转。',
      scenes: [
        {
          id: 'qizhong_walk',
          name: '跂踵 · 行原',
          bg: 'assets/img/nations/qizhong-walk.jpg',
          hotpoints: [
            { id: 'npc_xingli', x: 50, y: 42, icon: '👣', name: '行离', type: 'npc',
              dialog: { name: '行离', text: '（跂踵主之女，脚下的沙土被踏得发亮）跂踵族无踵，必须一直行走。可梼杌之足污染了"方向"——我们越走，越找不到路。' },
              actions: [
                { label: '询问方向被污染之事', type: 'story', text: '行离望着远方：「有人走了半生，才发现自己一直在同一个地方打转。不是路不对，是"方向感"被吃掉了。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren20', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '跂踵商人', type: 'npc',
              dialog: { name: '跂踵商人', text: '行砂、梼杌足骨碎片——跂踵的好货！客官放心，我这摊位虽小，但方向绝对没错。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_qiz', x: 72, y: 66, icon: '🛤️', name: '原地打转的脚印', type: 'object',
              dialog: { name: '（一片脚印围成一个圆，从清晨到黄昏，都是同一个圈）', text: '有人在这里走了一整天，却一步都没有离开过。' },
              actions: [
                { label: '踏出圈外', type: 'easter', text: '✨ 彩蛋！你踏出脚印圆圈的刹那，忽然明白——困住人的从不是路，是以为"只能这样走"的心。', rewardKey: 'qizhong_jiao' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_qizhong_arrive', location: '跂踵 · 行原', bg: 'assets/img/nations/qizhong-walk.jpg',
          npcs: [
            { id: 'zhuzu', name: '驻足', icon: '🚶', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '结胸国的断桥还在身后，你来到跂踵国的行原。这里的人没有脚跟，只能不停行走——仿佛停下，就会"不存在"。' },
                { name: '驻足', text: '（驻足者领袖，正艰难地站在原地）我走了一辈子，忽然想停一停。可跂踵族一旦停下，就会被遗忘。' },
                { name: '驻足', text: '梼杌之足污染了"方向"。现在，就算一直走下去，也找不到来路和归途。' }
              ],
              choices: [
                { label: '前往界轨', nextStory: 'sy_qizhong_track' },
                { label: '问：停下来会怎样？', reply: '驻足苦笑着指了指脚下：「跂踵族生来无踵，行走是我们的宿命。可宿命……该由谁来定义？」', nextStory: 'sy_qizhong_track' }
              ]
            }
          ]
        },
        {
          id: 'sy_qizhong_track', location: '跂踵 · 界轨', bg: 'assets/img/nations/qizhong-walk.jpg',
          npcs: [
            { id: 'xingli2', name: '行离', portrait: 'assets/img/npc/npc_xingli.jpg', x: 48, y: 42,
              lines: [
                { name: '行离', text: '（跂踵主之女，站在界轨的尽头）父亲说，跂踵族生来无踵，注定行走一生——这是先祖为寻找"方向"付出的代价。' },
                { name: '行离', text: '可若连方向都被污染，那么"走"本身，又有什么意义？' },
                { name: '行离', text: '驻足与老路已在轨口等候。老路一生踏遍行原，路灵能牵引行轨的流向——他们会为我们引路，直指界轨核心。' }
              ],
              choices: [
                { label: '与行离一同找回方向', onChoose: (p) => { try { STATE.enterNation(p, 'qizhong'); } catch (e) {} }, nextScene: 'qizhong_q19_01_track' },
                { label: '再听行离的困惑', nextStory: 'sy_qizhong_track' }
              ]
            }
          ]
        }
      ]
    },

    /* ============================================================
     * 归墟国（guixu）· 封兽之扉
     * 主题：封原"封印"被混沌封兽污染（第五道本体气息=归墟之扉钥匙），终章序幕
     * 关键人物：墟离（归墟主之女）、满墟（解封者领袖）
     * Boss：混沌封兽
     * ============================================================ */
    guixu: {
      name: '归墟',
      intro: '归墟，万物的终末之地。二十道封印在此汇聚——四凶本为一体的真相，即将揭晓。',
      scenes: [
        {
          id: 'guixu_void',
          name: '归墟 · 封原',
          bg: 'assets/img/nations/guixu-void.jpg',
          hotpoints: [
            { id: 'npc_xuli', x: 50, y: 42, icon: '🌀', name: '墟离', type: 'npc',
              dialog: { name: '墟离', text: '（归墟主之女，立于封原之上）你终于来了，命外之人。二十国的封印，都已松动——四凶，要回来了。' },
              actions: [
                { label: '询问归墟的真相', type: 'story', text: '墟离望向天边的裂隙：「四凶本为一体。我们看到的饕餮、梼杌、穷奇、混沌——不过是它分裂出的四张面孔。归墟之扉后，是它的本体。」', reward: 'rumor' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'npc_shangren21', x: 28, y: 56, portrait: 'assets/img/npc/npc_shangren.jpg', icon: '💰', name: '归墟商人', type: 'npc',
              dialog: { name: '归墟商人', text: '封砂、混沌尾骨碎片——归墟的好货！不过客官，到了这里，钱还重要吗？还是……留点心思对付即将醒来的东西吧。' },
              actions: [
                { label: '看看货品', type: 'shop' },
                { label: '打探消息', type: 'gossip' },
                { label: '离开', type: 'close' }
              ] },
            { id: 'easter_guixu', x: 72, y: 66, icon: '🌀', name: '残破的封印石', type: 'object',
              dialog: { name: '（一块残破的封印石躺在封原上，石面布满裂纹）', text: '裂纹里透出微弱的光，像是什么东西在封印之下，轻轻搏动。' },
              actions: [
                { label: '倾听封印石', type: 'easter', text: '✨ 彩蛋！你贴近封印石，听见极轻的呢喃——那不是凶兽的低吼，而是一段古老的话：「封印的从来不是魔，是所有人不敢面对的『真』。」', rewardKey: 'guixu_shi' },
                { label: '离开', type: 'close' }
              ] }
          ]
        }
      ],
      story: [
        {
          id: 'sy_guixu_arrive', location: '归墟 · 封原', bg: 'assets/img/nations/guixu-void.jpg',
          npcs: [
            { id: 'manxu', name: '满墟', icon: '🌀', x: 52, y: 45,
              lines: [
                { name: '（旁白）', text: '你走完了十九国的路，终于踏入归墟——万物的终末之地。天空中横亘着一道巨大的裂隙，裂隙深处，有什么东西正在缓缓苏醒。' },
                { name: '满墟', text: '（解封者领袖，立在封原边缘）你来了，命外之人。二十道封印都已松动，四凶……要回来了。' },
                { name: '满墟', text: '四凶本为一体。饕餮、梼杌、穷奇、混沌——不过是它分裂出的四张面孔。归墟之扉后，藏着它的本体。' }
              ],
              choices: [
                { label: '直面归墟之扉', onChoose: (p) => { try { STATE.enterNation(p, 'guixu'); } catch (e) {} }, nextScene: 'guixu_q20_01_tower' },
                { label: '再听满墟的述说', nextStory: 'sy_guixu_abyss' }
              ]
            }
          ]
        },
        {
          id: 'sy_guixu_abyss', location: '归墟 · 之扉前', bg: 'assets/img/nations/guixu-void.jpg',
          npcs: [
            { id: 'xuli2', name: '墟离', portrait: 'assets/img/npc/npc_xuli.jpg', x: 48, y: 42,
              lines: [
                { name: '墟离', text: '（归墟主之女，手按在归墟之扉的裂隙上）二十国的苦难，都是它分裂出的影子。它的本体，比任何一张面孔都更……沉重。' },
                { name: '墟离', text: '命外之人，你走过了那么多片土地，见过那么多人。你带着他们的故事而来——这或许，是唯一能撑住这扇门的东西。' },
                { name: '墟离', text: '满墟与老封已在塔底等候。老封是归墟最年长的守印人，封灵能牵引封印的流向——他们会为我们打开通往墟塔核心的道路。' }
              ],
              choices: [
                { label: '推开归墟之扉', onChoose: (p) => { try { STATE.enterNation(p, 'guixu'); } catch (e) {} }, nextScene: 'guixu_q20_01_tower' },
                { label: '再听墟离的嘱托', nextStory: 'sy_guixu_abyss' }
              ]
            }
          ]
        }
      ]
    }
  };

  global.EXPLORE = EXPLORE;
})(window);
