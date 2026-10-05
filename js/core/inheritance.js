/**
 * 史前文明演化 - 部落穩定度、人口繁衍、三階段成長與長老知識傳承系統 (INHERITANCE & APPRENTICESHIP ENGINE)
 * 核心考據：
 *   1. 部落穩定度：食物 ≥ 70、住所 ≥ 70、安全 ≥ 60 連續 3 回合 ➔ 新的家庭正在形成 (❤️) ➔ 誕生幼兒 (先穩定 ➔ 後繁衍)
 *   2. 小孩三階段：幼兒 (留營玩耍/觀察/跟隨大人) ➔ 小孩 (撿樹枝石頭/跟長老學) ➔ 少年 (學過才會做)
 *   3. 長老傳承：觀察 ➔ 跟著做 ➔ 學會 (三段式直覺學習，非數字升級)
 *   4. 技術斷代危機：長老離世前若無人學會，該項史前技能將在部落失傳！
 */

class InheritanceSystem {
    constructor(game) {
        this.game = game;

        // 部落穩定度指標 (0 ~ 100)
        this.foodStability = 75;
        this.shelterStability = 80;
        this.safetyStability = 85;

        this.consecutiveStableRounds = 0;
        this.gestationRounds = 0;
        this.isFamilyForming = false;
        this.familyConfirmed = false;
        this.birthCount = 0;
        this.parents = [];

        // 技能資料庫
        this.skillsData = [];
        this.currentLearningSession = null;

        this.loadSkillsConfig();
    }

    async loadSkillsConfig() {
        try {
            const res = await fetch('data/skills.json').then(r => r.json());
            this.skillsData = res.skills || [];
        } catch (e) {
            console.warn('Using embedded skills config');
            this.skillsData = [
                {
                    id: "find_stone", name: "挑選石材", icon: "🪨", teacher: "elder_m",
                    dialogue: "跟我來，我教你找石頭。",
                    steps: ["👦 看長老在海灘挑石", "👦 跟著長老辨認硬石", "👦 自己挑出合用礫石"]
                },
                {
                    id: "stone_tool", name: "打製石器", icon: "🔨", teacher: "elder_m",
                    dialogue: "手握緊，斜斜敲下去！",
                    steps: ["👦 看長老打擊石核", "👦 跟著長老敲擊石片", "👦 自己打出砍砸刃口"]
                },
                {
                    id: "gather", name: "採集果實", icon: "🍒", teacher: "elder_f",
                    dialogue: "這些能吃，那些不行。",
                    steps: ["👦 看長老分辨野生植物", "👦 跟著長老分類可食果實", "👦 自己採集無毒野果"]
                },
                {
                    id: "firewood", name: "整理柴火", icon: "🪵", teacher: "elder_f",
                    dialogue: "乾燥的枯枝最好生火。",
                    steps: ["👦 看長老挑選乾燥枯木", "👦 跟著長老抱回細樹枝", "👦 自己為火塘補添柴火"]
                }
            ];
        }
    }

    // 每回合推進時更新穩定度並判定繁衍
    advanceRound() {
        // 每回合代表一季；生命週期只在冬季結束、四季完成時推進一年。
        if (this.game.seasonIndex === 3) {
            this.advanceChildGrowth();
            this.advanceAdultAndElderLifeCycle();
        }

        // 長老到達 10 年後保持待告別狀態；糧食在任何一回合達標都要立即準備祭典，
        // 不必等到下一個冬季才重新檢查。
        this.checkElderDeathReadiness();

        // 1. 動態計算三項穩定度
        // 食物：根據存糧評定 (每人需 3 單位儲備)
        const livingPop = this.game.characters.filter(c => c.isAlive).length;
        const foodRatio = Math.min(100, Math.round((this.game.resources.food / (livingPop * 3.5)) * 100));
        this.foodStability = Math.max(30, Math.min(100, foodRatio));

        // 住所：八仙洞營地升火則高達 85，否則 50
        this.shelterStability = (this.game.chapter1 && this.game.chapter1.isCampFireLit) ? 88 : 55;

        // 安全：無重大天災維持 85
        this.safetyStability = 85;

        this.updateStabilityUI();

        // 2. 判定是否符合穩定門檻 (食物≥70, 住所≥70, 安全≥60)
        const isStable = (this.foodStability >= 70 && this.shelterStability >= 70 && this.safetyStability >= 60);

        if (isStable) {
            this.consecutiveStableRounds++;

            // 連續維持 3 回合 ➔ 新的家庭正在形成 (❤️)
            if (this.consecutiveStableRounds >= 3 && !this.isFamilyForming) {
                this.triggerFamilyFormation();
            }

        } else {
            // 中斷則重置連續計數
            this.consecutiveStableRounds = Math.max(0, this.consecutiveStableRounds - 1);
            if (!this.isFamilyForming) {
                this.game.showToast("⚠️ 部落物資匱乏或受寒，族人專注於基本生存。");
            }
        }

        // 人口延續保護：第三季結束前一定嘗試啟動婚姻機制，避免只等待穩定度而人口斷層。
        // 原本的穩定度門檻仍優先；若未達門檻，第三季結束時改以「人口延續」條件配對。
        if (!this.isFamilyForming && this.game.roundNumber >= 3) {
            this.triggerFamilyFormation(true);
        }

        // 確認伴侶後，以季計算兩年生育週期（8 季）；生育後家庭仍保留，
        // 下一個週期可以再有第二、第三個孩子或雙胞胎。
        if (this.isFamilyForming && this.familyConfirmed && this.parents.length >= 2) {
            const parentsAlive = this.parents.every(parent => parent && parent.isAlive);
            if (!parentsAlive) {
                this.isFamilyForming = false;
                this.familyConfirmed = false;
                this.gestationRounds = 0;
            } else {
                this.gestationRounds++;
                if (this.gestationRounds >= 8) this.spawnNewbornChild();
            }
        }
    }

    advanceAdultAndElderLifeCycle() {
        const living = this.game.characters.filter(char => char.isAlive);
        living.forEach(char => {
            if (char.age_stage === 'adult') {
                char.adultYears = (char.adultYears || 0) + 1;
                if (char.adultYears >= 10) {
                    char.age = 55;
                    char.ageYears = 55;
                    char.elderYears = 0;
                    char.updateAgeStage();
                    char.visualAgeStage = 'elder';
                    char.say('我開始成為部族的長老了，該把經驗教給孩子。', '🧓', 220);
                    this.game.showToast(`🧓【${char.name}】經過十年，成為部族長老。`);
                }
            } else if (char.age_stage === 'elder') {
                char.elderYears = (char.elderYears || 0) + 1;
                if (char.elderYears >= 10 && !char.deathScheduled) {
                    char.deathScheduled = true;
                    this.requestElderDeath(char);
                }
            }
        });
    }

    requestElderDeath(elder) {
        const fish = this.game.resources.fish_shell || 0;
        const fruit = this.game.resources.fruit || 0;
        const capacity = (this.game.resourceCapacity.fish_shell || 100) + (this.game.resourceCapacity.fruit || 100);
        const foodRatio = capacity ? ((fish + fruit) / capacity) * 100 : 0;
        // HUD 顯示的鮮食總量是 food；同時保留魚貝＋水果的總量判定，兩者任一達到 80 即可準備。
        const foodReady = (this.game.resources.food || 0) >= 80 || foodRatio >= 80;
        if (!foodReady) {
            // 不清除 deathScheduled，讓後續每回合都有機會重新檢查。
            if (!elder.deathReadinessNotified) {
                elder.deathReadinessNotified = true;
                elder.say('我的時間快到了，但魚和果實還不夠辦祭典……', '🕯️', 240);
                this.game.showToast(`🕯️【${elder.name}】等待鮮食達到 80/100，才能啟動告別祭典。`);
            }
            return;
        }
        elder.deathReadinessNotified = false;
        this.game.startElderDeathRitual(elder);
    }

    checkElderDeathReadiness() {
        if (this.game.deathRitual) return;
        const elder = this.game.characters.find(char =>
            char.isAlive && char.age_stage === 'elder' && char.elderYears >= 10 && char.deathScheduled
        );
        if (elder) this.requestElderDeath(elder);
    }

    advanceChildGrowth() {
        const children = this.game.characters.filter(c => c.isAlive && (c.age_stage === 'infant' || c.age_stage === 'child') && c.growthYears !== undefined);
        children.forEach(child => {
            child.growthYears = (child.growthYears || 0) + 1;
            if (child.growthYears < 3) {
                this.game.showToast(`🌱【${child.name}】正在成長：還需要 ${3 - child.growthYears} 年成為大人。`);
                return;
            }

            child.age = 18;
            child.ageYears = 18;
            child.updateAgeStage();
            child.visualAgeStage = 'adult';
            child.followingTarget = null;
            child.assignedTask = null;
            child.currentTask = 'WANDER';
            child.state = 'IDLE';
            child.wanderTargetX = child.x;
            child.stamina = child.maxStamina;
            child.say('我已經長大了，可以為部族工作！', '🌟', 220);
            this.game.sound.playEvolutionFanfare();
            this.game.showToast(`🌟【${child.name}】經過三年，正式成為大人並加入工作名冊！`);
        });
        if (this.game.updatePopulationSummary) this.game.updatePopulationSummary();
        if (this.game.renderQuickRoster) this.game.renderQuickRoster();
    }

    // 觸發家庭形成 (青壯年頭頂浮現 ❤️ 圖示)
    triggerFamilyFormation(populationSafetyFallback = false) {
        const adults = this.game.characters.filter(c => c.isAlive && c.age_stage === 'adult');
        const canPair = (a, b) => {
            if (!a || !b || a.partnerId || b.partnerId) return false;
            const aParents = a.parentIds || [];
            const bParents = b.parentIds || [];
            if (a.familyId && a.familyId === b.familyId) return false;
            if (aParents.includes(b.id) || bParents.includes(a.id)) return false;
            if (aParents.some(id => bParents.includes(id))) return false;
            return true;
        };
        const males = adults.filter(c => c.gender === 'MALE');
        const females = adults.filter(c => c.gender === 'FEMALE');
        const pair = males.flatMap(male => females.map(female => [male, female])).find(([male, female]) => canPair(male, female));

        if (pair) {
            this.isFamilyForming = true;
            this.gestationRounds = 0;
            this.familyConfirmed = false;
            this.parents = pair;

            males[0].hasFamilyHeart = true;
            females[0].hasFamilyHeart = true;

            this.game.sound.playTone(660, 'sine', 0.2, 0.25);
            this.game.sound.playTone(880, 'sine', 0.25, 0.3);

            this.showMarriageDecisionModal();
            males[0].say("部族溫暖穩定，有了依靠...", "❤️", 180);
            females[0].say("我們一起守護這個家！", "❤️", 180);
            if (populationSafetyFallback) {
                this.game.showToast('🌱 三季已到，為了讓部族延續，婚姻機制提前啟動。');
            }
        }
    }

    showMarriageDecisionModal() {
        const modal = document.getElementById('modal-family-formation');
        if (!modal || this.parents.length < 2) return;
        const male = this.parents[0];
        const female = this.parents[1];
        const maleFace = document.getElementById('family-male-face');
        const femaleFace = document.getElementById('family-female-face');
        if (maleFace) maleFace.src = this.game.getFaceImagePath(male, 'happy');
        if (femaleFace) femaleFace.src = this.game.getFaceImagePath(female, 'happy');
        const names = document.getElementById('family-couple-names');
        if (names) names.innerText = `${male.name} ＋ ${female.name}`;
        modal.style.display = 'flex';
    }

    confirmFamilyFormation() {
        const modal = document.getElementById('modal-family-formation');
        if (modal) modal.style.display = 'none';
        if (this.parents.length >= 2) {
            this.parents[0].partnerId = this.parents[1].id;
            this.parents[1].partnerId = this.parents[0].id;
        }
        this.familyConfirmed = true;
        this.gestationRounds = 0;
        this.game.showToast(`❤️ ${this.parents[0]?.name || '青年男子'} 與 ${this.parents[1]?.name || '青年女子'} 決定結為伴侶！約兩年後迎接新生命。`);
    }

    // 誕生新成員 (幼兒)
    spawnNewbornChild() {
        // 家庭關係不因一次生育而結束，之後仍可進入下一個兩年週期。
        this.gestationRounds = 0;

        const mother = this.parents[1] || this.game.characters.find(c => c.gender === 'FEMALE') || this.game.characters[0];
        const groundY = Math.min(590, window.innerHeight - 130);

        // 大多數為單胎，偶爾出現雙胞胎；保留隨機性，也讓第二、第三個孩子能在後續週期出生。
        const litterSize = Math.random() < 0.14 ? 2 : 1;
        const childNames = ['小石', '小葉', '小岩', '小溪', '小米', '小芽'];
        const newborns = [];

        for (let index = 0; index < litterSize; index++) {
            const living = this.game.characters.filter(char => char.isAlive);
            const maleCount = living.filter(char => char.gender === 'MALE').length;
            const femaleCount = living.filter(char => char.gender === 'FEMALE').length;
            // 隨機但略微拉回性別比例，避免長期失衡與近親配對風險。
            const maleProbability = maleCount < femaleCount ? 0.65 : (femaleCount < maleCount ? 0.35 : 0.5);
            const childGender = Math.random() < maleProbability ? 'MALE' : 'FEMALE';
            const childId = `child_${Date.now()}_${this.birthCount}_${index}`;
            const newChild = new PrehistoricCharacter({
                id: childId,
                name: childNames[(this.birthCount + index) % childNames.length],
                ageGroup: '幼兒',
                agePhase: 'CHILD',
                ageYears: 7,
                gender: childGender,
                parentIds: this.parents.map(parent => parent.id),
                familyId: `${this.parents[0]?.id || 'parent'}_${this.parents[1]?.id || 'pair'}`,
                initialRole: '觀察學習、部族幼苗',
                skills: [],
                dialogues: {
                    intro: "我在岩洞旁撿小石子！",
                    observe: "長老爺爺，教我敲石頭！",
                    learn_done: "我學會這項新技能了！"
                },
                x: mother.x - 30 + index * 45,
                y: groundY
            });
            newChild.followingTarget = mother;
            newChild.state = 'FOLLOWING';
            newChild.growthYears = 0;
            newChild.adultYears = 0;
            newChild.elderYears = 0;
            this.game.characters.push(newChild);
            newborns.push(newChild);
            this.birthCount++;
        }
        if (this.game.updatePopulationSummary) this.game.updatePopulationSummary();
        if (this.game.renderQuickRoster) this.game.renderQuickRoster();

        this.game.sound.playEvolutionFanfare();
        const firstChild = newborns[0];
        if (firstChild) this.showNewChildCelebrationModal(firstChild);
        this.game.showToast(litterSize === 2
            ? `👶👶 雙胞胎出生了！這個家庭仍會在下一個兩年週期迎接新的可能。`
            : `👶 ${firstChild?.name || '新孩子'} 出生了！約兩年後還可能迎接下一個孩子。`);
    }

    showNewChildCelebrationModal(child) {
        const modal = document.getElementById('modal-new-child');
        if (!modal) return;

        document.getElementById('new-child-name').innerText = `${child.name}（${child.gender === 'MALE' ? '男孩' : '女孩'}，7歲）`;
        modal.style.display = 'flex';
    }

    closeNewChildModal() {
        const modal = document.getElementById('modal-new-child');
        if (modal) modal.style.display = 'none';
        this.game.showToast("👶 幼兒已加入部族！他將在營地跟隨大人成長，請長老引導他學習！");
    }

    // 更新頂部穩定度微型 HUD
    updateStabilityUI() {
        const foodEl = document.getElementById('stab-val-food');
        const shelterEl = document.getElementById('stab-val-shelter');
        const safetyEl = document.getElementById('stab-val-safety');
        const roundEl = document.getElementById('stab-consecutive-rounds');

        if (foodEl) foodEl.innerText = `${this.game.resources.food || 0}/100`;
        if (shelterEl) shelterEl.innerText = `${this.shelterStability}%`;
        if (safetyEl) safetyEl.innerText = `${this.safetyStability}%`;
        if (roundEl) roundEl.innerText = this.game.getSeasonLabel ? this.game.getSeasonLabel() : '春季';
    }

    // ========================================================
    // 長老技能傳承系統 (三段式：觀察 ➔ 跟著做 ➔ 學會)
    // ========================================================
    openApprenticeshipModal(child, elder) {
        const modal = document.getElementById('modal-apprenticeship');
        if (!modal) return;

        this.currentLearningSession = {
            child: child,
            elder: elder,
            skill: null,
            step: 1
        };

        // 顯示師徒資訊
        document.getElementById('appr-child-name').innerText = `${child.name}（${child.ageGroup}）`;
        document.getElementById('appr-elder-name').innerText = `${elder.name}（${elder.ageGroup}）`;

        const elderFace = document.getElementById('appr-elder-face');
        elderFace.src = this.game.getFaceImagePath(elder, 'normal');

        // 篩選長老精通、且孩子尚未學會的技能
        const availableSkills = this.skillsData.filter(s => elder.skills.includes(s.id) && !child.skills.includes(s.id));
        const listEl = document.getElementById('appr-skills-list');
        listEl.innerHTML = '';

        if (availableSkills.length === 0) {
            listEl.innerHTML = `
                <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold text-center">
                    ✨ ${child.name} 已經學會了 ${elder.name} 傳授的所有本領！
                </div>
            `;
            document.getElementById('appr-step-container').style.display = 'none';
        } else {
            document.getElementById('appr-step-container').style.display = 'block';
            availableSkills.forEach(s => {
                const btn = document.createElement('div');
                btn.className = "paper-card p-3 cursor-pointer hover:border-amber-600 transition flex items-center justify-between";
                btn.onclick = () => this.selectSkillToLearn(s);
                btn.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${s.icon}</span>
                        <div>
                            <h5 class="font-black text-sm text-amber-950">${s.name}</h5>
                            <p class="text-[11px] text-stone-600">${s.description}</p>
                        </div>
                    </div>
                    <button class="paper-btn primary text-xs">跟長老學</button>
                `;
                listEl.appendChild(btn);
            });

            // 預設選擇第一項技能
            this.selectSkillToLearn(availableSkills[0]);
        }

        modal.style.display = 'flex';
    }

    selectSkillToLearn(skill) {
        if (!this.currentLearningSession) return;
        this.currentLearningSession.skill = skill;
        this.currentLearningSession.step = 1;

        const session = this.currentLearningSession;
        const elder = session.elder;

        // 長老說話
        elder.say(skill.dialogue, "👴", 180);

        this.renderLearningStepUI();
    }

    renderLearningStepUI() {
        const session = this.currentLearningSession;
        if (!session || !session.skill) return;

        const skill = session.skill;
        const step = session.step;

        document.getElementById('appr-current-skill-title').innerText = `${skill.icon} 傳承技能：【${skill.name}】`;
        document.getElementById('appr-elder-dialogue').innerText = `「${skill.dialogue}」`;

        // 更新三段式進度指示
        for (let i = 1; i <= 3; i++) {
            const stepEl = document.getElementById(`appr-step-node-${i}`);
            if (i < step) {
                stepEl.className = "appr-step-node completed";
                stepEl.innerText = "✓";
            } else if (i === step) {
                stepEl.className = "appr-step-node active";
                stepEl.innerText = i;
            } else {
                stepEl.className = "appr-step-node";
                stepEl.innerText = i;
            }
        }

        // 動態注入當前步驟的微型互動
        const contentBox = document.getElementById('appr-interactive-box');
        contentBox.innerHTML = '';

        if (step === 1) {
            // 第 1 步：觀察 (👦 看長老示範)
            contentBox.innerHTML = `
                <div class="text-center p-3">
                    <div class="text-3xl mb-1">👀</div>
                    <h5 class="font-black text-sm text-amber-950 mb-1">第 1 階段：細心觀察長老</h5>
                    <p class="text-xs text-stone-700 leading-relaxed mb-3">${skill.steps[0]}</p>
                    <button class="paper-btn primary text-xs px-6 py-2" onclick="game.inheritance.completeCurrentStep()">
                        <span>看懂了，下一步！ ➔</span>
                    </button>
                </div>
            `;
        } else if (step === 2) {
            // 第 2 步：跟著做 (互動趣味小任務)
            if (skill.id === 'gather') {
                contentBox.innerHTML = `
                    <div class="p-3 text-center">
                        <h5 class="font-black text-sm text-amber-950 mb-1">第 2 階段：跟著長老分類可食野果</h5>
                        <p class="text-xs text-stone-600 mb-3">史前時代沒有超市，哪一種野果能採集食用？</p>
                        <div class="flex justify-center gap-4">
                            <button class="paper-card p-3 hover:border-emerald-600 cursor-pointer flex flex-col items-center" onclick="game.inheritance.answerFruitTask(true)">
                                <span class="text-3xl">🍒</span>
                                <span class="text-xs font-black text-emerald-800 mt-1">野生甜無花果 [可食]</span>
                            </button>
                            <button class="paper-card p-3 hover:border-red-600 cursor-pointer flex flex-col items-center" onclick="game.inheritance.answerFruitTask(false)">
                                <span class="text-3xl">🍄</span>
                                <span class="text-xs font-black text-red-800 mt-1">色彩斑斕毒蕈 [有毒]</span>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // 打石器 / 挑石頭 / 撿柴火
                contentBox.innerHTML = `
                    <div class="p-3 text-center">
                        <h5 class="font-black text-sm text-amber-950 mb-1">第 2 階段：跟著長老動手敲打練習</h5>
                        <p class="text-xs text-stone-700 leading-relaxed mb-3">${skill.steps[1]}</p>
                        <button class="paper-btn primary text-xs px-6 py-2" onclick="game.inheritance.completeCurrentStep()">
                            <span>手握石錘，敲下去！ 🔨</span>
                        </button>
                    </div>
                `;
            }
        } else if (step === 3) {
            // 第 3 步：自己完成
            contentBox.innerHTML = `
                <div class="text-center p-3">
                    <div class="text-3xl mb-1">✨</div>
                    <h5 class="font-black text-sm text-amber-950 mb-1">第 3 階段：獨自完整驗證技術</h5>
                    <p class="text-xs text-stone-700 leading-relaxed mb-3">${skill.steps[2]}</p>
                    <button class="paper-btn jade text-xs px-6 py-2" onclick="game.inheritance.finishSkillLearning()">
                        <span>🎉 自己完成了！學會技能！</span>
                    </button>
                </div>
            `;
        }
    }

    answerFruitTask(isCorrect) {
        if (isCorrect) {
            this.game.sound.playTone(700, 'triangle', 0.15, 0.2);
            this.completeCurrentStep();
        } else {
            this.game.sound.playTone(240, 'sawtooth', 0.2, 0.2);
            this.game.showToast("⚠️ 那種植物帶有劇毒！請重新選擇安全可食的野果！");
        }
    }

    completeCurrentStep() {
        if (!this.currentLearningSession) return;
        this.currentLearningSession.step++;
        this.game.sound.playTone(520, 'sine', 0.1, 0.15);
        this.renderLearningStepUI();
    }

    finishSkillLearning() {
        if (!this.currentLearningSession) return;
        const session = this.currentLearningSession;
        const child = session.child;
        const elder = session.elder;
        const skill = session.skill;

        // 加入孩子技能庫
        if (!child.skills.includes(skill.id)) {
            child.skills.push(skill.id);
        }

        // 小孩身分如果剛好滿 13 歲，自動解鎖少年工作權
        if (child.age >= 13) {
            child.age_stage = 'youth';
            child.ageGroup = '少年';
        }

        this.game.sound.playEvolutionFanfare();
        child.say(`我學會【${skill.name}】了！`, "🎉", 200);
        elder.say("很好！你學會這項手藝了！", "👴", 200);

        this.closeApprenticeshipModal();
        this.game.showToast(`✨ 知識薪火相傳！【${child.name}】成功向【${elder.name}】學會了【${skill.name}】！`);
    }

    closeApprenticeshipModal() {
        const modal = document.getElementById('modal-apprenticeship');
        if (modal) modal.style.display = 'none';
        this.currentLearningSession = null;
    }

    // ========================================================
    // 關鍵歷史機制：長老離世與技術斷代危機
    // ========================================================
    checkKnowledgeContinuity(deceasedElder) {
        if (!deceasedElder || !deceasedElder.skills) return;

        // 檢查該長老身上的每一項技能，部落裡是否還有任何活著的成員掌握
        const livingMembers = this.game.characters.filter(c => c.isAlive && c !== deceasedElder);

        deceasedElder.skills.forEach(skillId => {
            const anyoneLearned = livingMembers.some(c => c.skills && c.skills.includes(skillId));
            if (!anyoneLearned) {
                // ⚠️ 技術斷代！全族失去這項技能！
                const skillMeta = this.skillsData.find(s => s.id === skillId) || { name: skillId, icon: "❓" };
                this.triggerKnowledgeLossEvent(deceasedElder, skillMeta);
            }
        });
    }

    triggerKnowledgeLossEvent(elder, skill) {
        const modal = document.getElementById('modal-knowledge-lost');
        if (!modal) return;

        document.getElementById('lost-elder-name').innerText = elder.name;
        document.getElementById('lost-skill-name').innerText = `${skill.icon} 【${skill.name}】`;

        modal.style.display = 'flex';
        this.game.sound.playAncestralDirge();
    }

    closeKnowledgeLostModal() {
        const modal = document.getElementById('modal-knowledge-lost');
        if (modal) modal.style.display = 'none';
        this.game.showToast("⚠️ 史前時代沒有文字課本，技術斷代了！必須等待後人再次重新探索！");
    }
}

// 註冊全域
window.InheritanceSystem = InheritanceSystem;
