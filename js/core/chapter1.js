/**
 * 史前文明演化 - 第一章【找到可以生活的地方】情境與流程控制器 (CHAPTER 1 CONTROLLER)
 * 考據基準：國立臺灣史前文化博物館 (NMP) 八仙洞長濱文化研究
 * 流程結構：
 *   階段一：選一位帶領大家的人（認識 6 位先民，自主走動，點擊看一句話介紹）
 *   階段二：選擇居住地（森林 🌳、河邊 💧、大石頭旁 🪨、海邊岩洞 ⛰️）
 *   失敗歷程：選錯 ➔ 彩色 2 秒 ➔ 褪色變灰 ➔ 6 人負面表情依序特寫 ➔ 六人縮在一起 ➔ 這裡住不下去…… ➔ 重新選擇
 *   成功歷程：選海邊岩洞 ➔ 推進鏡頭 ➔ 六人進洞 ➔ 這裡能遮風 ➔ 我們在這裡住下來吧！ ➔ 6 人歡呼特寫 ➔ 解鎖第 1 回合【活下來】
 */

class Chapter1Manager {
    constructor(game) {
        this.game = game;
        this.state = 'UNINITIALIZED'; // 'PHASE1_FIND_LEADER', 'PHASE2_CHOOSE_LOCATION', 'FAILURE_SEQUENCE', 'SUCCESS_SEQUENCE', 'ROUND1_SURVIVE'
        
        this.chapterData = null;
        this.charactersData = null;
        this.dialogues = {};

        this.leader = null;
        this.selectedLocation = null;

        // 特效計時器
        this.sequenceTimer = null;
        this.faceSequenceTimer = null;
        this.isCampFireLit = false;
    }

    async init() {
        try {
            // 載入 JSON 配置資料 (依循小白建議：模組化獨立 JSON)
            const [chRes, charRes] = await Promise.all([
                fetch('data/chapter_01.json').then(r => r.json()),
                fetch('data/characters.json').then(r => r.json())
            ]);
            this.chapterData = chRes;
            this.charactersData = charRes;

            // 載入 6 位先民對話檔
            const charIds = ['elder_m', 'elder_f', 'young_m1', 'young_m2', 'young_f1', 'young_f2'];
            await Promise.all(charIds.map(async id => {
                const res = await fetch(`data/dialogue/${id}.json`).then(r => r.json());
                this.dialogues[id] = res.dialogue;
            }));

            console.log('Chapter 1 data and dialogues loaded successfully.');
        } catch (e) {
            console.warn('Failed to load external JSON, falling back to embedded data:', e);
            this.loadFallbackData();
        }

        this.spawnChapterCharacters();
        if (this.game.updatePopulationSummary) this.game.updatePopulationSummary();
        this.startPhase1();
    }

    loadFallbackData() {
        this.chapterData = {
            title: "第一章｜找到可以生活的地方",
            phase1: {
                goal: "選一位帶領大家的人",
                subtext: "大家需要一位帶頭的人。點點看，誰最適合？"
            },
            phase2: {
                question: "大家今晚住這裡嗎？",
                correctLocation: "sea_cave"
            }
        };

        this.charactersData = {
            characters: [
                { id: "elder_m", name: "老爺爺", ageGroup: "老年", gender: "MALE", initialRole: "經驗、石器", ageYears: 62 },
                { id: "elder_f", name: "老奶奶", ageGroup: "老年", gender: "FEMALE", initialRole: "經驗、採集", ageYears: 60 },
                { id: "young_m1", name: "青年男A", ageGroup: "青壯", gender: "MALE", initialRole: "狩獵、搬運", ageYears: 24 },
                { id: "young_m2", name: "青年男B", ageGroup: "青壯", gender: "MALE", initialRole: "石器、漁獵", ageYears: 22 },
                { id: "young_f1", name: "青年女A", ageGroup: "青壯", gender: "FEMALE", initialRole: "採集、探索", ageYears: 23 },
                { id: "young_f2", name: "青年女B", ageGroup: "青壯", gender: "FEMALE", initialRole: "食物、營地", ageYears: 21 }
            ]
        };

        this.dialogues = {
            elder_m: { intro: "我認得哪些石頭能做工具。", leader: "大家跟我來，先找住的地方。", cave: "這個岩洞可以安心休息。", forest_fail: "這裡沒有地方遮蔽風雨。", river_fail: "河流水位離我們太近了。", rock_fail: "這塊石頭擋不住風雨。" },
            elder_f: { intro: "先找水、食物和遮風的地方。", leader: "別急，大家跟著我找營地。", cave: "這裡乾燥，可以好好休息。", forest_fail: "林子濕冷，今晚很難熬。", river_fail: "水越來越近了，好危險！", rock_fail: "風雨吹進來，擋不住啊！" },
            young_m1: { intro: "我可以去前面看看！", leader: "交給我！帶大家往前探路！", cave: "岩壁很厚，野獸進不來！", forest_fail: "雨一直淋下來，好冷啊。", river_fail: "水越來越近了！快跑！", rock_fail: "石頭擋不住旁邊吹的狂風！" },
            young_m2: { intro: "海邊有石頭，也可能找到食物。", leader: "跟我走，找個靠海的好地方。", cave: "岩壁堅固，能升起溫暖營火。", forest_fail: "樹林視線差，又濕又冷。", river_fail: "水位暴漲，太危險了！", rock_fail: "風雨太大了，這裡待不住。" },
            young_f1: { intro: "我先看看附近有沒有能吃的。", leader: "大家跟緊我，注意四周安全。", cave: "這裡空間大，適合生活。", forest_fail: "天黑了，這裡沒有庇護所。", river_fail: "水漫上來了，不是安全地點。", rock_fail: "雨水一直潑進來，好冷！" },
            young_f2: { intro: "天黑以前，我們要找到休息處。", leader: "時間不多了，大家跟我走！", cave: "這裡能遮風，大家快進來！", forest_fail: "又濕又冷，這裡住不下去。", river_fail: "水越來越高，大家快撤退！", rock_fail: "全身都濕透了，好冷啊。" }
        };
    }

    // 生成第一章指定的 6 名先民
    spawnChapterCharacters() {
        const groundY = Math.min(590, window.innerHeight - 130);
        const charsList = this.charactersData.characters;

        // 分布在橫軸中央平坦草地上 (x: 520 ~ 1050)
        const startX = 520;
        const spacing = 100;

        this.game.characters = charsList.map((c, idx) => {
            const charObj = new PrehistoricCharacter({
                id: c.id,
                name: c.name,
                ageGroup: c.ageGroup,
                agePhase: c.ageGroup === '老年' ? 'ELDER' : 'ADULT',
                initialRole: c.initialRole,
                gender: c.gender,
                ageYears: c.ageYears || 24,
                dialogues: this.dialogues[c.id] || {},
                x: startX + idx * spacing + (Math.random() - 0.5) * 40,
                y: groundY
            });
            return charObj;
        });

        // 鏡頭初始居中對準這 6 位先民
        this.game.camera.targetX = 260;
    }

    // ========================================================
    // 階段一：選一位帶領大家的人 (Phase 1)
    // ========================================================
    startPhase1() {
        this.state = 'PHASE1_FIND_LEADER';
        this.leader = null;

        // 更新頂部章節指示器
        this.updateHeaderBanner(
            "第一章｜找到可以生活的地方",
            "大家需要一位帶頭的人。點點看，誰最適合？"
        );

        // 顯示提示浮條
        this.game.showToast("👥 點擊畫面上的族人，傾聽他們的一句話，選一位帶領大家！");
    }

    // 點擊族人 ➔ 跳出人物卡牌與一句話
    onCharacterClicked(char) {
        if (this.state === 'PHASE1_FIND_LEADER') {
            this.showLeaderCandidateModal(char);
        } else if (this.state === 'PHASE2_CHOOSE_LOCATION') {
            // 階段二點擊角色：給出營地建議
            const loc = this.selectedLocation || 'cave';
            const quote = (char.dialogues && char.dialogues[loc]) || char.dialogues.intro || "我們快找地方過夜吧！";
            char.say(quote, "💬", 140);
        }
    }

    showLeaderCandidateModal(char) {
        const modal = document.getElementById('modal-leader-select');
        if (!modal) return;

        const avatarImg = document.getElementById('leader-modal-avatar');
        avatarImg.src = this.game.getFaceImagePath(char, 'normal');

        document.getElementById('leader-modal-name').innerText = `${char.name}（${char.ageGroup}）`;
        document.getElementById('leader-modal-role').innerText = `能力傾向：${char.initialRole}`;
        
        const quote = (char.dialogues && char.dialogues.intro) || "大家一起齊心度過嚴冬！";
        document.getElementById('leader-modal-quote').innerText = `「${quote}」`;

        // 綁定選定按鈕
        const btnConfirm = document.getElementById('btn-confirm-leader');
        btnConfirm.onclick = () => {
            this.appointLeader(char);
        };

        modal.style.display = 'flex';
        this.game.sound.playTone(540, 'triangle', 0.12, 0.2);
    }

    closeLeaderCandidateModal() {
        const modal = document.getElementById('modal-leader-select');
        if (modal) modal.style.display = 'none';
    }

    appointLeader(char) {
        this.leader = char;
        char.isLeader = true;
        this.closeLeaderCandidateModal();

        // 播放頭目就位定音
        this.game.sound.playTone(660, 'sine', 0.2, 0.3);
        this.game.sound.playTone(880, 'sine', 0.25, 0.35);

        // 頭目向前一步發言
        const leaderLine = (char.dialogues && char.dialogues.leader) || "大家跟我來，先找住的地方。";
        char.say(leaderLine, "👑", 200);

        this.updateHeaderBanner(
            "第一章｜找到可以生活的地方",
            `👑 帶頭者【${char.name}】就位！請選擇一處能遮風避雨的過夜營地。`
        );

        this.game.showToast(`👑 已推選【${char.name}】為帶頭者！接下來所有決策將由他代表發言。`);

        // 短暫停頓後展開階段二：選擇居住地
        setTimeout(() => {
            this.startPhase2();
        }, 1400);
    }

    // ========================================================
    // 階段二：選擇居住地 (Phase 2)
    // ========================================================
    startPhase2() {
        this.state = 'PHASE2_CHOOSE_LOCATION';

        // 顯示底部 4 個大型居住地選項面板
        const dock = document.getElementById('location-choice-dock');
        if (dock) dock.style.display = 'grid';

        this.updateHeaderBanner(
            "第二階段｜選擇居住地",
            "大家今晚住這裡嗎？點選營地進行實地勘查。"
        );
    }

    // 點擊某個營地卡牌進行勘查
    inspectLocation(locId) {
        if (this.state !== 'PHASE2_CHOOSE_LOCATION') return;

        this.selectedLocation = locId;

        // 鏡頭滑動到對應地貌區域
        const locCoords = {
            sea_cave: 240,     // 左側海蝕岩洞
            coast_forest: 980,  // 中央森林
            rock: 1600,        // 大石頭灘
            river: 2350        // 河邊水域
        };
        if (locCoords[locId] !== undefined) {
            this.game.camera.targetX = Math.max(0, locCoords[locId] - window.innerWidth / 3);
        }

        // 開啟確認彈窗：由頭目出面詢問「大家今晚住這裡嗎？」
        this.showLocationConfirmModal(locId);
    }

    showLocationConfirmModal(locId) {
        const modal = document.getElementById('modal-location-confirm');
        if (!modal) return;

        const locMeta = {
            sea_cave: { name: "海邊岩洞", icon: "⛰️", img: "assets/locations/sea_cave.webp", desc: "八仙洞天然海蝕岩壁，洞穴深入山壁，可避風避雨。" },
            coast_forest: { name: "森林", icon: "🌳", img: "assets/locations/coast_forest.webp", desc: "古樟木林，林木茂密，適合採集木材、野果與植物纖維。" },
            rock: { name: "大石頭旁", icon: "🪨", img: "assets/locations/rock.webp", desc: "海灘旁天然巨礫石，能擋單向風，但側面與上方皆無遮擋。" },
            river: { name: "河邊", icon: "💧", img: "assets/locations/river.webp", desc: "近水水源便利，但夜間潮水上升與暴雨易引發水位暴漲。" }
        };

        const cur = locMeta[locId];
        document.getElementById('loc-confirm-title').innerText = `${cur.icon} ${cur.name}`;
        document.getElementById('loc-confirm-desc').innerText = cur.desc;

        const locImg = document.getElementById('loc-confirm-img');
        locImg.src = cur.img;
        locImg.onerror = () => { locImg.src = `assets/locations/${locId}.png`; };

        // 頭目頭像與詢問句
        const leaderFace = document.getElementById('loc-confirm-leader-avatar');
        if (this.leader) {
            leaderFace.src = this.game.getFaceImagePath(this.leader, 'normal');
            document.getElementById('loc-confirm-leader-name').innerText = this.leader.name;
        }

        modal.style.display = 'flex';
        this.game.sound.playTone(480, 'sine', 0.1, 0.15);
    }

    closeLocationConfirmModal() {
        const modal = document.getElementById('modal-location-confirm');
        if (modal) modal.style.display = 'none';
    }

    // 玩家按下【住這裡】
    confirmSettlement() {
        this.closeLocationConfirmModal();
        const dock = document.getElementById('location-choice-dock');
        if (dock) dock.style.display = 'none';

        if (this.selectedLocation === 'sea_cave') {
            this.triggerSuccessSequence();
        } else {
            this.triggerFailureSequence(this.selectedLocation);
        }
    }

    // ========================================================
    // 失敗歷程：選森林 / 河邊 / 大石頭旁
    // ========================================================
    triggerFailureSequence(locId) {
        this.state = 'FAILURE_SEQUENCE';

        const failData = {
            coast_forest: {
                quote: "這裡沒有地方遮蔽……",
                companionQuote: "林子濕冷，今晚很難熬。",
                subtitle: "這裡不適合成為我們的營地。再找找看吧！",
                dialogueKey: "forest_fail"
            },
            river: {
                quote: "河流水位離我們太近了。",
                companionQuote: "水越來越近了，好危險！",
                subtitle: "這裡不是安全的休息地點。再找找看吧！",
                dialogueKey: "river_fail"
            },
            rock: {
                quote: "這塊石頭擋不住風雨。",
                companionQuote: "風雨吹進來，擋不住啊！",
                subtitle: "這塊石頭擋不住風雨。再找找看吧！",
                dialogueKey: "rock_fail"
            }
        }[locId];

        // 步驟 1：環境彩色 2 秒，風雨音效響起
        this.game.sound.playTone(220, 'sawtooth', 1.5, 0.3);
        if (locId === 'coast_forest') this.game.showToast("🍃 夜晚降臨，狂風吹起，暴雨淋在林木間...");
        else if (locId === 'river') this.game.showToast("🌊 夜晚溪水暴漲，冰冷的水流逐漸逼近營地...");
        else this.game.showToast("💨 夜雨傾盆，單薄的巨石完全抵擋不住刺骨寒風...");

        setTimeout(() => {
            // 步驟 2：環境逐漸失去顏色 ➔ 變灰 ➔ 6 名角色停止活動
            const canvas = document.getElementById('gameCanvas');
            canvas.style.transition = 'filter 2s ease';
            canvas.style.filter = 'grayscale(100%) brightness(85%)';

            this.game.characters.forEach(c => {
                c.state = 'FROZEN';
            });

            setTimeout(() => {
                // 步驟 3：六張人物臉部依序快速特寫 (😠 😢 😟 😞 😢 😣)
                this.playDramaticFailureFaces(() => {
                    // 步驟 4：六人縮在營地中央
                    const campCenter = this.game.camera.x + window.innerWidth / 2;
                    this.game.characters.forEach((c, idx) => {
                        c.state = 'HUDDLING';
                        c.huddleTargetX = campCenter - 100 + idx * 35;
                        c.currentExpression = ['angry', 'sad', 'worried', 'sad', 'sad', 'angry'][idx % 6];
                    });

                    // 頭目與同伴發言
                    if (this.leader) {
                        const lQuote = (this.leader.dialogues && this.leader.dialogues[failData.dialogueKey]) || failData.quote;
                        this.leader.say(lQuote, "🌧️", 220);
                    }
                    const companion = this.game.characters.find(c => c !== this.leader) || this.game.characters[1];
                    setTimeout(() => {
                        companion.say(failData.companionQuote, "🥶", 220);
                    }, 800);

                    // 步驟 5：彈出【這裡住不下去……】與【重新選擇】卡牌
                    setTimeout(() => {
                        this.showGameOverModal(failData.subtitle);
                    }, 1800);
                });
            }, 1200);

        }, 2000);
    }

    // 播放 6 張臉部依序快速特寫 (每張 450ms)
    playDramaticFailureFaces(onComplete) {
        const overlay = document.getElementById('modal-face-sequence');
        if (!overlay) { if (onComplete) onComplete(); return; }

        overlay.style.display = 'flex';
        const cardImg = document.getElementById('face-sequence-img');
        const cardName = document.getElementById('face-sequence-name');
        const cardExpr = document.getElementById('face-sequence-expr');

        const expressions = [
            { expr: 'angry', text: "😠 生氣受凍", icon: "😠" },
            { expr: 'sad', text: "😢 難過濕透", icon: "😢" },
            { expr: 'worried', text: "😟 擔憂受險", icon: "😟" },
            { expr: 'sad', text: "😞 沮喪無助", icon: "😞" },
            { expr: 'sad', text: "😢 難過發抖", icon: "😢" },
            { expr: 'angry', text: "😣 咬牙受寒", icon: "😣" }
        ];

        let index = 0;
        const showNextFace = () => {
            if (index >= this.game.characters.length) {
                overlay.style.display = 'none';
                if (onComplete) onComplete();
                return;
            }

            const char = this.game.characters[index];
            const meta = expressions[index % expressions.length];

            cardImg.src = this.game.getFaceImagePath(char, meta.expr);

            cardName.innerText = char.name;
            cardExpr.innerText = meta.text;

            this.game.sound.playTone(320 - index * 25, 'triangle', 0.12, 0.2);

            index++;
            this.faceSequenceTimer = setTimeout(showNextFace, 480);
        };

        showNextFace();
    }

    showGameOverModal(subtitle) {
        const modal = document.getElementById('modal-game-over');
        if (!modal) return;

        document.getElementById('game-over-sub').innerText = subtitle;
        modal.style.display = 'flex';
    }

    // 按下【重新選擇】重置回階段二
    retrySettlement() {
        const modal = document.getElementById('modal-game-over');
        if (modal) modal.style.display = 'none';

        // 恢復畫面彩色
        const canvas = document.getElementById('gameCanvas');
        canvas.style.transition = 'filter 1s ease';
        canvas.style.filter = 'none';

        // 重置角色回閒步
        this.game.characters.forEach((c, idx) => {
            c.state = 'IDLE';
            c.currentExpression = 'normal';
            c.wanderTargetX = 500 + idx * 90;
        });

        this.startPhase2();
        this.game.showToast("🔄 重新選擇：請依據避風與遮蔽需求，重新評估營地！");
    }

    // ========================================================
    // 成功歷程：選擇海邊岩洞 ⛰️
    // ========================================================
    triggerSuccessSequence() {
        this.state = 'SUCCESS_SEQUENCE';

        // 1. 鏡頭平滑推進八仙洞海蝕洞 (x: 0)
        this.game.camera.targetX = 0;

        // 2. 六名角色排隊進洞
        const caveEntranceX = 260;
        this.game.characters.forEach((c, idx) => {
            c.state = 'ENTERING_CAVE';
            c.caveTargetX = caveEntranceX - 80 + idx * 30;
        });

        // 3. 升起岩洞營火
        this.isCampFireLit = true;

        // 4. 文字顯示
        this.game.showToast("⛰️ 這裡能遮風，也留下了生活的空間。");
        setTimeout(() => {
            if (this.leader) this.leader.say("我們在這裡住下來吧！", "🎉", 240);
        }, 1200);

        // 5. 六人高興特寫彈窗 🎉
        setTimeout(() => {
            this.showHappyCelebrationModal();
        }, 2200);
    }

    showHappyCelebrationModal() {
        const modal = document.getElementById('modal-happy-celebration');
        if (!modal) return;

        const grid = document.getElementById('happy-faces-grid');
        grid.innerHTML = '';

        this.game.characters.forEach(c => {
            c.currentExpression = 'happy';
            const item = document.createElement('div');
            item.className = "flex flex-col items-center p-3 bg-amber-50/90 rounded-2xl border-2 border-amber-200/90 shadow hover:shadow-md transition-all";
            item.innerHTML = `
                <img src="${this.game.getFaceImagePath(c, 'happy')}" class="w-24 h-24 md:w-28 md:h-28 rounded-full border-3 border-amber-300 shadow-md bg-amber-100/50 p-1 object-contain mx-auto transition-transform hover:scale-105">
                <span class="text-sm font-black text-amber-950 mt-2">${c.name}</span>
                <span class="text-xs text-emerald-800 font-extrabold bg-emerald-100/90 px-2.5 py-0.5 rounded-full mt-1 border border-emerald-300">🎉 安心定居</span>
            `;
            grid.appendChild(item);
        });

        modal.style.display = 'flex';
        this.game.sound.playEvolutionFanfare();
    }

    // 從慶祝畫面進入【第 1 回合｜活下來】
    proceedToRound1() {
        if (this.game.sound && this.game.sound.startBackgroundMusic) {
            this.game.sound.startBackgroundMusic();
        }
        const modal = document.getElementById('modal-happy-celebration');
        if (modal) modal.style.display = 'none';

        this.state = 'ROUND1_SURVIVE';

        this.updateHeaderBanner(
            "第 1 回合｜活下來",
            "今天要先做什麼？八仙洞長濱文化聚落正式展開生活！"
        );

        // 展開第 1 回合工作任務塢 (找石頭 ➔ 打石器 ➔ 找食物 ➔ 生火)
        const round1Dock = document.getElementById('round1-task-dock');
        if (round1Dock) round1Dock.style.display = 'grid';
        if (this.game.renderQuickRoster) this.game.renderQuickRoster();
        if (this.game.renderTechWorkCircles) this.game.renderTechWorkCircles();

        if (this.game.inheritance) {
            this.game.inheritance.updateStabilityUI();
        }

        if (this.game.startRoundTimeline) this.game.startRoundTimeline();

        this.game.showToast("🔥 我們在八仙洞住下來了！現在指派今日的第一件工作！");
    }

    // 執行第 1 回合任務
    executeRound1Action(actionId) {
        const actions = {
            find_stone: {
                name: "尋找硬礫石",
                targetStationId: "pebble_quarry",
                desc: "在海灘尋找適合敲打的硬石核與礫石。"
            },
            make_tool: {
                name: "打製偏峰砍砸器",
                targetStationId: "pebble_quarry",
                desc: "手握石核單面打擊，打製出鋒利的長濱砍砸器。"
            },
            gather_food: {
                name: "潮間帶撿拾魚貝",
                targetStationId: "coastal_shellfish",
                desc: "在潮間帶撿拾退潮時的魚貝海螺與受困魚蟹。"
            },
            make_fire: {
                name: "洞內火塘升火",
                targetStationId: "cave_camp",
                desc: "在洞穴平坦處設立火塘升火，避風保存火種。"
            }
        };

        const act = actions[actionId];
        if (!act) return;

        // 指派帶頭者或空閒族人前往
        const worker = this.leader || this.game.characters[0];
        const station = this.game.workstations.find(st => st.id === act.targetStationId);

        if (station && worker) {
            worker.assignStation(station);
            this.game.sound.playTone(600, 'triangle', 0.15, 0.2);
            this.game.showToast(`✨【${worker.name}】開始【${act.name}】！${act.desc}`);
            
            // 彈出史前館知識短語
            setTimeout(() => {
                this.game.showToast(`🏛️ 史前館考據：八仙洞遺址發現大量單面偏峰砍砸器與火塘遺跡，證實先民在此生活。`);
            }, 3000);
        }
    }

    // 輔助函式：更新頂部章節橫幅
    updateHeaderBanner(title, subtext) {
        const titleEl = document.getElementById('chapter-banner-title');
        const subEl = document.getElementById('chapter-banner-sub');
        if (titleEl) titleEl.innerText = title;
        if (subEl) subEl.innerText = subtext;
    }
}

// 註冊至全域
window.Chapter1Manager = Chapter1Manager;
