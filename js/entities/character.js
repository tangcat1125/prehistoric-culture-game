/**
 * 史前文明演化 - 美式摩登原始人·厚紙板剪紙角色實體 (CARDBOARD CUTOUT CHARACTER)
 * 造型特點：美式摩登原始人、厚紙板白邊剪紙與陰影
 * 修正重點：
 *   1. 消除劇烈抖動：大幅平緩步履搖晃頻率，站立閒置時保持穩定安靜，無震顫感。
 *   2. 舊石器潮間帶撿拾魚貝類：面向右側太平洋，有平緩俯身撿拾的剪紙紙卡動作。
 *   3. 體力值 (Stamina) 與分工差異：
 *      - 女性：撿拾魚貝與採集野果精巧細緻，數量顯著多於男性。
 *      - 老人：經驗豐富採集收穫最多，但體力消耗快，每次執行後需回營地火塘休息。
 *      - 男性：粗重勞動與採石有利。
 *   4. 小孩三階段與三段式長老傳承。
 */

class PrehistoricCharacter {
    constructor(configOrId, x = 300, y = 500, gender = null, agePhase = 'ADULT', customName = null) {
        if (typeof configOrId === 'object' && configOrId !== null) {
            const c = configOrId;
            this.id = c.id;
            this.name = c.name;
            this.ageGroup = c.ageGroup || (c.agePhase === 'ELDER' ? '老年' : '青壯');
            this.agePhase = c.agePhase || (this.ageGroup === '老年' ? 'ELDER' : 'ADULT');
            this.initialRole = c.initialRole || '探索、互助';
            this.gender = c.gender || 'MALE';
            this.dialogues = c.dialogues || {};
            this.x = c.x || 300;
            this.y = c.y || 500;
            this.age = c.ageYears || (this.agePhase === 'ELDER' ? 62 : (this.ageGroup === '幼兒' ? 2 : (this.ageGroup === '小孩' ? 7 : 24)));
            this.skills = c.skills || this.getDefaultSkills(this.id);
        } else {
            this.id = configOrId;
            this.gender = gender || (Math.random() < 0.5 ? 'MALE' : 'FEMALE');
            this.agePhase = agePhase;
            this.ageGroup = agePhase === 'ELDER' ? '老年' : (agePhase === 'CHILD' ? '幼童' : '青壯');
            this.initialRole = '部族成員';
            this.age = this.agePhase === 'CHILD' ? 7 : (this.agePhase === 'ELDER' ? 62 : 24);
            this.name = customName || (this.gender === 'MALE' ? '阿岩' : '小鹿');
            this.x = x;
            this.y = y;
            this.dialogues = {};
            this.skills = [];
        }

        this.baseY = this.y;
        this.facing = 'right'; // 舊石器先民預設面向右方太平洋海洋

        // 年齡與體力設定
        this.updateAgeStage();
        // 外觀只在正式成長事件切換，幼童的三個年份期間固定使用幼兒紙卡。
        this.visualAgeStage = this.age_stage;
        this.stamina = this.maxStamina;

        // 生命與狀態指標
        this.health = 100;
        this.isAlive = true;
        this.isSick = false;

        // 第一章身分與表情
        this.isLeader = false;
        this.currentExpression = 'normal';
        this.walkFrame = 1;

        // 家庭與繁衍愛心
        this.hasFamilyHeart = false;
        this.followingTarget = null;

        // 技能傳承狀態
        this.teacher = null;
        this.learning = {
            skill: null,
            progress: 0
        };

        // 狀態機
        this.state = 'IDLE'; // 'IDLE', 'WALKING_TO_STATION', 'WORKING', 'RETURNING_HOME', 'RESTING', 'HUDDLING', 'ENTERING_CAVE', 'FROZEN', 'FOLLOWING'
        this.currentTask = 'WANDER';
        this.targetStation = null;
        this.workTimer = 0;
        this.workDuration = 180;
        this.homeX = 260;
        this.homeY = this.y;
        this.axisY = this.y;
        this.laneOffset = 0;
        // 名冊指令是持續命令：完成一輪、回住處休息後，仍會依此指令再出工。
        this.assignedTask = null;
        this.autoWorkCooldown = 0;
        this.learningTimer = 0;

        // 動畫計時器 (平緩節奏，不產生劇烈震動)
        this.animTimer = Math.random() * 50;
        this.idleTimer = 0;
        this.wanderTargetX = this.x;

        // 對話泡泡
        this.speechBubble = { text: "", icon: "", timer: 0 };
        this.discoveryBonuses = new Set();
        this.roundFindings = [];
        this.roundStories = [];
        this.pendingDiscoveryId = null;
        this.researchCooldownRounds = 0;
        this.growthYears = 0;
        this.adultYears = 0;
        this.elderYears = 0;
        this.parentIds = Array.isArray(configOrId?.parentIds) ? [...configOrId.parentIds] : [];
        this.familyId = configOrId?.familyId || this.id;
        this.partnerId = configOrId?.partnerId || null;
        this.deathScheduled = false;
    }

    getDefaultSkills(id) {
        if (id === 'elder_m') return ['find_stone', 'stone_tool'];
        if (id === 'elder_f') return ['gather', 'firewood'];
        if (id === 'young_m1') return ['find_stone'];
        if (id === 'young_m2') return ['find_stone'];
        if (id === 'young_f1') return ['gather'];
        if (id === 'young_f2') return ['firewood'];
        return [];
    }

    updateAgeStage() {
        if (this.age <= 4) {
            this.age_stage = 'infant';
            this.ageGroup = '幼兒';
            this.scale = 0.52;
            this.speed = 1.0;
            this.maxStamina = 0;
        } else if (this.age <= 12) {
            this.age_stage = 'child';
            this.ageGroup = '小孩';
            this.scale = 0.70;
            this.speed = 1.8;
            this.maxStamina = 60;
        } else if (this.age <= 17) {
            this.age_stage = 'youth';
            this.ageGroup = '少年';
            this.scale = 0.88;
            this.speed = 1.9;
            this.maxStamina = 80;
        } else if (this.age >= 55) {
            this.age_stage = 'elder';
            this.ageGroup = '老年';
            this.scale = 0.92;
            this.speed = 1.2;
            this.maxStamina = 60; // 老人體力上限較低，容易疲憊需休息
        } else {
            this.age_stage = 'adult';
            this.ageGroup = '青壯';
            this.scale = 1.0;
            this.speed = 1.7;
            this.maxStamina = this.gender === 'MALE' ? 100 : 90;
        }
    }

    // 檢查能否執行特定工作（學過才會做！）
    canPerformTask(taskType) {
        if (this.age_stage === 'infant') return false;
        if (this.age_stage === 'child') {
            return ['GATHER_WOOD', 'GATHER_FRUIT', 'COASTAL_GATHER', 'RIVER_SEARCH', 'PICK_TWIGS', 'PICK_PEBBLES', 'LEARN'].includes(taskType);
        }
        if (this.age_stage === 'youth') {
            if (taskType === 'STRIKE_STONE' && !this.skills.includes('stone_tool')) return false;
            if ((taskType === 'COASTAL_GATHER' || taskType === 'GATHER_FRUIT') && !this.skills.includes('gather')) return false;
            return true;
        }
        return true;
    }

    // 計算各角色不同工種之產出數量 (女性魚貝野果精巧+多、老人經驗豐富產出多、男性採石多)
    calculateYield(taskType) {
        let baseYield = 4;
        let msg = "";

        switch (taskType) {
            case 'COASTAL_GATHER': // 舊石器潮間帶撿拾魚貝類
                if (this.age_stage === 'elder') {
                    baseYield = 8; // 老人經驗豐富，產出多
                    msg = "+8 潮間海螺海貝 (長老經驗老道)";
                } else if (this.gender === 'FEMALE') {
                    baseYield = 7; // 女生精巧，撿拾魚貝數量多
                    msg = "+7 鮮美海貝與海螺 (女性精巧採集)";
                } else {
                    baseYield = 4;
                    msg = "+4 潮間海貝";
                }
                break;

            case 'RIVER_SEARCH':
                baseYield = this.gender === 'FEMALE' ? 6 : 4;
                msg = `+${baseYield} 河畔魚貝與可食小生物`;
                break;

            case 'GATHER_FRUIT': // 採集野果
                if (this.age_stage === 'elder') {
                    baseYield = 8;
                    msg = "+8 野生熟果與塊根 (長老熟知產地)";
                } else if (this.gender === 'FEMALE') {
                    baseYield = 7;
                    msg = "+7 甜美野生果實 (女性精巧採集)";
                } else {
                    baseYield = 4;
                    msg = "+4 野生野果";
                }
                break;

            case 'STRIKE_STONE': // 採集石材與打製石器 (粗重工作)
            case 'PICK_PEBBLES':
                if (this.gender === 'MALE') {
                    baseYield = 6; // 男生粗重工作有利
                    msg = "+6 安山硬石材與砍砸器 (男性力道強勁)";
                } else if (this.age_stage === 'elder') {
                    baseYield = 5;
                    msg = "+5 鋒利石片器 (長老打製精準)";
                } else {
                    baseYield = 3;
                    msg = "+3 礫石石材";
                }
                break;

            case 'GATHER_WOOD': // 撿拾柴火
                baseYield = this.gender === 'MALE' ? 5 : 4;
                msg = `+${baseYield} 乾燥柴火枯枝`;
                break;

            case 'WEAVE_NET':
                baseYield = 4;
                msg = '+4 編織漁網與植物纖維';
                break;
            case 'MAKE_TOOLS':
                baseYield = 3;
                msg = '+3 件複合石器工具';
                break;
            case 'CHOP_TREE':
                baseYield = 10;
                msg = '+10 粗木材（石斧砍樹）';
                break;
            case 'GRIND_STONE':
                baseYield = 8;
                msg = '+8 打磨石材';
                break;
            case 'FISHING':
                baseYield = 9;
                msg = '+9 魚獲（主動釣魚）';
                break;
            case 'TUNA_HUNT':
                baseYield = 18;
                msg = '+18 大型鮪魚（補獵成功）';
                break;
            case 'POTTERY':
                baseYield = 1;
                msg = '+1 燒製陶器（延長食材保存）';
                break;
            case 'MAINTAIN_TOOLS':
                baseYield = 0;
                msg = '工具維護完成';
                break;
            case 'REPAIR_NET':
                baseYield = 0;
                msg = '漁網修補完成';
                break;

            default:
                baseYield = 4;
                msg = "+4 部落收穫";
                break;
        }

        if (taskType === 'COASTAL_GATHER' && this.discoveryBonuses.has('bone_hook_discovery')) {
            baseYield += 2;
            msg += '（骨釣具技巧 +2）';
        }
        if (taskType === 'STRIKE_STONE' && this.discoveryBonuses.has('sharp_stone_discovery')) {
            baseYield += 2;
            msg += '（刮削器技巧 +2）';
        }
        if (taskType === 'GATHER_WOOD' && this.discoveryBonuses.has('fiber_discovery')) {
            baseYield += 2;
            msg += '（纖維搓繩技巧 +2）';
        }
        if (taskType === 'GRIND_STONE' && this.discoveryBonuses.has('jade_polish_discovery')) {
            baseYield += 4;
            msg += '（打磨技術加速 +4）';
        }
        if (['GATHER_WOOD', 'GATHER_FRUIT', 'COASTAL_GATHER', 'STRIKE_STONE'].includes(taskType) && this.discoveryBonuses.has('jade_polish_discovery')) {
            baseYield += 2;
            msg += '（打磨技術提升採集效率 +2）';
        }

        return { amount: baseYield, message: msg };
    }

    say(text, icon = "💬", duration = 140) {
        this.speechBubble = { text, icon, timer: duration };
    }

    assignStation(station, force = false) {
        if (!this.isAlive) return;

        if (!force && (this.state === 'WALKING_TO_STATION' || this.state === 'WORKING' || this.state === 'RETURNING_HOME')) {
            this.say("這一輪工作還沒結束，先回住處再安排下一輪。", "⏳", 140);
            return;
        }

        // 玩家明確點擊角色或名冊更換工作時，立即中止原工作並套用新指令。
        if (force) {
            this.targetStation = null;
            this.workTimer = 0;
            this.followingTarget = null;
            this.state = 'IDLE';
        }

        // 若體力已耗盡，無法上工，需先休息
        if (this.stamina < 15 && this.age_stage !== 'infant') {
            this.say("體力透支了，先在營地休息歇歇！", "💤", 140);
            this.state = 'RESTING';
            this.wanderTargetX = 260 + (Math.random() - 0.5) * 60; // 回到火塘營地
            return;
        }

        if (!this.canPerformTask(station.actionType)) {
            if (this.age_stage === 'infant') {
                this.say("幼兒還小，留在營地玩耍！", "👶", 120);
                return;
            }
            if (this.age_stage === 'child') {
                this.say("先跟長老學會才能做喔！", "👦", 120);
                return;
            }
            if (this.age_stage === 'youth') {
                this.say("這項技能我還沒學會...", "🤔", 120);
                return;
            }
        }

        this.targetStation = station;
        this.laneOffset = this.getLaneOffset(station.actionType);
        this.axisY = station.y + 20 + this.laneOffset;
        this.currentTask = station.actionType;
        this.assignedTask = station.actionType;
        const baseDuration = this.age_stage === 'child' ? 90 : (this.age_stage === 'elder' ? 180 : 180);
        const speedTech = {
            GATHER_WOOD: ['fiber_discovery', 'stone_axe_adze_discovery'],
            GATHER_FRUIT: ['jade_polish_discovery'],
            STRIKE_STONE: ['sharp_stone_discovery'],
            COASTAL_GATHER: ['bone_hook_discovery', 'bone_hook_discovery_after_fiber'],
            RIVER_SEARCH: ['pottery_discovery'],
            WEAVE_NET: ['fiber_discovery'],
            CHOP_TREE: ['stone_axe_adze_discovery'],
            GRIND_STONE: ['jade_polish_discovery'],
            FISHING: ['bone_hook_discovery_after_fiber']
        }[station.actionType] || [];
        const accelerated = speedTech.some(id => this.discoveryBonuses.has(id));
        this.workDuration = Math.max(this.age_stage === 'child' ? 55 : 105, Math.round(baseDuration * (accelerated ? 0.72 : 1)));
        this.autoWorkCooldown = 0;
        this.state = 'WALKING_TO_STATION';
        this.say(`前往【${station.name}】！`, station.icon || "🏃", 120);
    }

    getLaneOffset(actionType) {
        const lanes = {
            GATHER_WOOD: -30,
            GATHER_FRUIT: 12,
            STRIKE_STONE: -18,
            COASTAL_GATHER: 28,
            RIVER_SEARCH: 4,
            WEAVE_NET: -24,
            MAKE_TOOLS: 8,
            POTTERY: 38,
            CHOP_TREE: -30,
            GRIND_STONE: 18,
            FISHING: 12,
            TUNA_HUNT: 36
            ,LEARN: 0
            ,TEACH: 0
        };
        return lanes[actionType] ?? 0;
    }

    update(resources, sound, onProductionCallback, onDeathCallback) {
        if (!this.isAlive) return;

        // 平緩動畫計時器
        this.animTimer += 0.04;
        if (this.autoWorkCooldown > 0) this.autoWorkCooldown--;

        if (this.speechBubble.timer > 0) {
            this.speechBubble.timer--;
        }

        // 走動計時與平緩步態 (每半秒切換一次紙卡雙腿，不快速抖動)
        const isMoving = (this.state === 'WALKING_TO_STATION' || this.state === 'RETURNING_HOME' || this.state === 'ENTERING_CAVE' || (this.state === 'IDLE' && Math.abs(this.wanderTargetX - this.x) > 8) || (this.state === 'RESTING' && Math.abs(this.wanderTargetX - this.x) > 8) || this.followingTarget !== null);
        if (isMoving) {
            this.walkFrame = Math.floor(this.animTimer * 1.6) % 2 === 0 ? 1 : 2;
        }

        // 休息狀態下緩慢恢復體力
        if (this.state === 'RESTING') {
            if (this.stamina < this.maxStamina) {
                this.stamina = Math.min(this.maxStamina, this.stamina + 0.35);
            } else {
                this.state = 'IDLE';
                this.say("體力恢復了，可以繼續工作！", "💪", 120);
            }
        }

        // 幼兒跟隨大人
        if ((this.age_stage === 'infant' || this.age_stage === 'child') && this.followingTarget && this.followingTarget.isAlive) {
            const targetX = this.followingTarget.x + (this.gender === 'MALE' ? -35 : 35);
            if (Math.abs(targetX - this.x) > 16) {
                const dir = targetX > this.x ? 1 : -1;
                this.x += dir * this.speed;
                this.facing = dir > 0 ? 'right' : 'left';
            }
            // 幼童的學習不是永久跟隨：完成一段短課程後回火塘休息。
            if (this.age_stage === 'child' && this.currentTask === 'LEARN') {
                this.learningTimer++;
                if (this.learningTimer >= 180) {
                    this.learningTimer = 0;
                    this.assignedTask = null;
                    this.currentTask = 'WANDER';
                    this.followingTarget = null;
                    this.state = 'RESTING';
                    this.wanderTargetX = this.homeX;
                    this.say('跟著長老學會了一點生活技巧，先回火塘休息！', '📚', 180);
                }
            }
            return;
        }

        // 行為狀態機
        switch (this.state) {
            case 'IDLE':
            case 'RESTING':
                this.idleTimer++;
                if (this.idleTimer > 240 + Math.random() * 240 && this.state !== 'RESTING') {
                    this.idleTimer = 0;
                    // 在八仙洞營地周圍平緩小幅度走動 (平滑無抖動)
                    const roamRange = this.age_stage === 'infant' ? 50 : 160;
                    this.wanderTargetX = this.x + (Math.random() - 0.5) * roamRange;
                    this.wanderTargetX = Math.max(180, Math.min(3100, this.wanderTargetX));
                }

                const dist = this.wanderTargetX - this.x;
                if (Math.abs(dist) > 8) {
                    const step = Math.sign(dist) * Math.min(Math.abs(dist), this.speed * 0.45);
                    this.x += step;
                    this.facing = dist > 0 ? 'right' : 'left';
                }
                break;

            case 'HUDDLING':
                if (this.huddleTargetX !== undefined && Math.abs(this.huddleTargetX - this.x) > 6) {
                    const dir = this.huddleTargetX > this.x ? 1 : -1;
                    this.x += dir * (this.speed * 0.6);
                    this.facing = dir > 0 ? 'right' : 'left';
                }
                break;

            case 'FOLLOWING':
                if (!this.followingTarget || !this.followingTarget.isAlive) {
                    this.state = 'IDLE';
                    break;
                }
                if (Math.abs(this.followingTarget.x - this.x) > 28) {
                    const followDir = this.followingTarget.x > this.x ? 1 : -1;
                    this.x += followDir * this.speed * 0.7;
                    this.facing = followDir > 0 ? 'right' : 'left';
                }
                break;

            case 'ENTERING_CAVE':
                if (this.caveTargetX !== undefined && Math.abs(this.caveTargetX - this.x) > 6) {
                    const dir = this.caveTargetX > this.x ? 1 : -1;
                    this.x += dir * (this.speed * 0.7);
                    this.facing = dir > 0 ? 'right' : 'left';
                } else {
                    this.currentExpression = 'happy';
                }
                break;

            case 'FROZEN':
                break;

            case 'WALKING_TO_STATION':
                if (!this.targetStation) { this.state = 'IDLE'; break; }
                this.y += (this.axisY - this.y) * 0.12;
                const distToStation = this.targetStation.x - this.x;
                if (Math.abs(distToStation) > 16) {
                    const dir = distToStation > 0 ? 1 : -1;
                    this.x += dir * this.speed;
                    this.facing = dir > 0 ? 'right' : 'left';
                } else {
                    // 到達站點，若為潮間帶撿拾魚貝類，面朝右方太平洋大海
                    this.y = this.axisY;
                    this.state = 'WORKING';
                    if (this.currentTask === 'COASTAL_GATHER') {
                        this.facing = 'right';
                    }
                    this.workTimer = 0;
                }
                break;

            case 'RETURNING_HOME':
                this.y += (this.homeY - this.y) * 0.12;
                if (Math.abs(this.homeX - this.x) > 16) {
                    const dir = this.homeX > this.x ? 1 : -1;
                    this.x += dir * this.speed;
                    this.facing = dir > 0 ? 'right' : 'left';
                } else {
                    this.x = this.homeX;
                    this.y = this.homeY;
                    this.currentTask = 'WANDER';
                    this.state = ['elder', 'child'].includes(this.age_stage) ? 'RESTING' : 'IDLE';
                    this.autoWorkCooldown = 180;
                    this.say(this.age_stage === 'elder' ? "回到火塘旁休息一下。" : "這一輪做完了，回住處歇息。", "🏕️", 140);
                }
                break;

            case 'WORKING':
                if (!this.targetStation) { this.state = 'IDLE'; break; }
                if (this.currentTask === 'FESTIVAL' && this.festivalCenterX !== undefined) {
                    this.festivalAngle = (this.festivalAngle || 0) + 0.018;
                    this.x = this.festivalCenterX + Math.cos(this.festivalAngle) * this.festivalRadius;
                    this.y = this.festivalCenterY + Math.sin(this.festivalAngle) * this.festivalRadius * 0.28;
                    this.facing = Math.cos(this.festivalAngle) >= 0 ? 'right' : 'left';
                }
                this.workTimer++;

                if (this.workTimer % 60 === 0) {
                    this.playTaskSound(this.currentTask, sound);
                }

                if (this.workTimer >= this.workDuration) {
                    this.workTimer = 0;

                    // 體力消耗 (老人消耗 30 體力，青壯年消耗 15~20)
                    const drain = ['LEARN', 'TEACH'].includes(this.currentTask)
                        ? (this.age_stage === 'child' ? 12 : 8)
                        : (this.age_stage === 'elder' ? 30 : (this.age_stage === 'child' ? 25 : (this.gender === 'MALE' ? 15 : 20)));
                    this.stamina = Math.max(0, this.stamina - drain);

                    // 執行生產回調
                    if (onProductionCallback) {
                        onProductionCallback(this.currentTask, this);
                    }

                    // 每一輪只生產一次，完成後回到原來的住處；持續派工會在休息後自動再出工。
                    this.state = 'RETURNING_HOME';
                    this.targetStation = null;
                    this.wanderTargetX = this.homeX;
                    this.say("這一輪工作完成，回住處休息。", "🏕️", 160);
                }
                break;
        }
    }

    playTaskSound(task, sound) {
        if (!sound) return;
        switch (task) {
            case 'COASTAL_GATHER': sound.playFishSplash && sound.playFishSplash(); break;
            case 'STRIKE_STONE': sound.playStoneChip && sound.playStoneChip(); break;
            case 'GATHER_FRUIT': sound.playNetWeave && sound.playNetWeave(); break;
            case 'GATHER_WOOD': sound.playWoodChop && sound.playWoodChop(); break;
            default: sound.playTone && sound.playTone(320, 'triangle', 0.1, 0.1); break;
        }
    }

    getSpriteKey() {
        // 舊石器時代優先使用本體圖資與走動幀
        const isMoving = (this.state === 'WALKING_TO_STATION' || this.state === 'RETURNING_HOME' || this.state === 'ENTERING_CAVE' || (this.state === 'IDLE' && Math.abs(this.wanderTargetX - this.x) > 8) || (this.state === 'RESTING' && Math.abs(this.wanderTargetX - this.x) > 8) || this.followingTarget !== null);

        const isChildAppearance = ['infant', 'child'].includes(this.visualAgeStage);
        const elderKey = this.age_stage === 'elder' && !this.id.startsWith('elder_')
            ? (this.gender === 'FEMALE' ? 'elder_f' : 'elder_m')
            : null;
        if (isMoving) {
            const frameStr = this.walkFrame === 1 ? '01' : '02';
            if (elderKey) return `${elderKey}_walk_${frameStr}`;
            if (this.id.startsWith('child_')) return isChildAppearance ? (this.gender === 'FEMALE' ? `child_female_walk_${frameStr}` : `child_01_walk_${frameStr}`) : (this.gender === 'FEMALE' ? `young_f1_walk_${frameStr}` : `young_m1_walk_${frameStr}`);
            return `${this.id}_walk_${frameStr}`;
        }
        if (elderKey) return `${elderKey}_idle`;
        if (this.id.startsWith('child_')) return isChildAppearance ? (this.gender === 'FEMALE' ? 'child_female_idle' : 'child_01_idle') : (this.gender === 'FEMALE' ? 'young_f1_idle' : 'young_m1_idle');
        return `${this.id}_idle`;
    }

    draw(ctx, assets = null) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. 剪紙投影
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.ellipse(0, 8, 24 * this.scale, 6 * this.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 平緩平穩的剪紙動作 (消除劇烈抖動)
        const isMoving = (this.state === 'WALKING_TO_STATION' || this.state === 'RETURNING_HOME' || this.state === 'ENTERING_CAVE' || (this.state === 'IDLE' && Math.abs(this.wanderTargetX - this.x) > 8) || (this.state === 'RESTING' && Math.abs(this.wanderTargetX - this.x) > 8) || this.followingTarget !== null);
        
        if (isMoving) {
            // 平緩踏步微彈 (最大僅 1.5 像素，微傾 0.025 弧度)
            const walkCycle = this.animTimer * 1.8;
            const bounce = Math.abs(Math.sin(walkCycle)) * 1.5;
            const tilt = Math.sin(walkCycle) * 0.025;
            ctx.translate(0, -bounce);
            ctx.rotate(tilt);
        } else if (this.state === 'WORKING' && ['FESTIVAL', 'FUNERAL'].includes(this.currentTask)) {
            const danceCycle = this.animTimer * 3.4;
            const danceBounce = Math.abs(Math.sin(danceCycle)) * 5;
            const danceTilt = Math.sin(danceCycle) * 0.12;
            ctx.translate(0, -danceBounce);
            ctx.rotate(danceTilt);
        } else if (this.state === 'WORKING' && this.currentTask === 'COASTAL_GATHER') {
            // 舊石器潮間帶撿拾魚貝：面向右方大海，平緩俯身擺動紙卡動作
            const gatherCycle = Math.sin(this.animTimer * 1.4);
            const gatherSway = gatherCycle * 0.05; // 輕微躬身
            const gatherDrop = Math.max(0, gatherCycle) * 3;
            ctx.translate(0, gatherDrop);
            ctx.rotate(gatherSway);
        }

        // 轉向控制
        if (this.facing === 'left') {
            ctx.scale(-1, 1);
        }

        // 3. 繪製身體圖資
        const spriteKey = this.getSpriteKey();
        let spriteImg = assets ? assets[spriteKey] : null;

        if (!spriteImg || !spriteImg.complete || spriteImg.naturalWidth === 0) {
            // 出生角色使用時間戳 ID，不能用 `${this.id}_idle` 找圖；要回到穩定的性別／年齡資材。
            const stableFallbackKey = this.id.startsWith('child_')
                ? (this.gender === 'FEMALE' ? 'child_female_idle' : 'child_01_idle')
                : (this.id.startsWith('elder_') ? `${this.id}_idle` : 'char_adult_male_idle');
            spriteImg = assets
                ? (assets[stableFallbackKey] || assets['char_adult_male_idle'])
                : null;
        }

        if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
            const aspect = spriteImg.naturalHeight / spriteImg.naturalWidth;
            // 以目標高度統一不同圖檔比例；幼兒保持較小，避免長版幼兒素材反而比成人高。
            const targetHeights = { infant: 108, child: 128, youth: 154, adult: 178, elder: 170 };
            const drawH = targetHeights[this.age_stage] || 178;
            const drawW = drawH / aspect;
            ctx.drawImage(spriteImg, -drawW / 2, -drawH + 14 * this.scale, drawW, drawH);
            this.currentDrawH = drawH;
        } else {
            this.currentDrawH = 95 * this.scale;
            this.drawVectorFallback(ctx);
        }

        // 研究中的族人以橘紅色框線標示；研究完成後 currentTask 清除，框線就會消失。
        const isResearching = this.currentTask === 'RESEARCH' && ['WALKING_TO_STATION', 'WORKING'].includes(this.state);
        if (isResearching) {
            ctx.save();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(239, 68, 68, .45)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(-38 * this.scale, -this.currentDrawH - 4, 76 * this.scale, this.currentDrawH + 18, 13);
            ctx.stroke();
            ctx.restore();
        }

        // 4. 頭目標記徽章
        if (this.isLeader) {
            const leaderImg = assets ? assets['leader_icon'] : null;
            const bob = Math.sin(this.animTimer * 2) * 2;
            const crownY = -this.currentDrawH - 24 + bob;
            if (leaderImg && leaderImg.complete && leaderImg.naturalWidth > 0) {
                ctx.drawImage(leaderImg, -18, crownY, 36, 36);
            } else {
                ctx.font = "24px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("👑", 0, crownY + 22);
            }
        }

        // 5. 家庭形成愛心圖示 ❤️
        if (this.hasFamilyHeart) {
            const heartImg = assets ? assets['heart_icon'] : null;
            const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
            const heartY = -this.currentDrawH - 28;
            ctx.save();
            ctx.translate(0, heartY);
            ctx.scale(pulse, pulse);
            if (heartImg && heartImg.complete && heartImg.naturalWidth > 0) {
                ctx.drawImage(heartImg, -14, -14, 28, 28);
            } else {
                ctx.font = "20px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("❤️", 0, 7);
            }
            ctx.restore();
        }

        // 6. 意外發現提示燈泡 💡
        if (this.hasDiscoveryBulb) {
            const bulbY = -this.currentDrawH - 32;
            ctx.font = "22px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("💡", 0, bulbY);
        }

        // 工作狀態標記：讓玩家不用點開名冊，也能看出角色目前是否有工作。
        const taskIcons = { GATHER_WOOD: '🪵', GATHER_FRUIT: '🍎', STRIKE_STONE: '🪨', COASTAL_GATHER: '🐚', RIVER_SEARCH: '🌿', WEAVE_NET: '🕸️', MAKE_TOOLS: '🔨', CHOP_TREE: '🪓', GRIND_STONE: '🟢', FISHING: '🎣', TUNA_HUNT: '🐟', POTTERY: '🏺', LEARN: '📚', TEACH: '🗣️', RESEARCH: '🧠', FESTIVAL: '🔥', FUNERAL: '🕯️' };
        let statusIcon = null;
        if (isResearching) statusIcon = '+';
        else if (this.state === 'WORKING' || this.state === 'WALKING_TO_STATION') statusIcon = taskIcons[this.currentTask] || '🔨';
        else if (this.state === 'FOLLOWING' && this.currentTask === 'LEARN') statusIcon = '📚';
        else if (this.state === 'RETURNING_HOME') statusIcon = '🏕️';
        else if (this.state === 'RESTING') statusIcon = '💤';
        else if (this.state === 'IDLE') statusIcon = this.assignedTask ? '⏳' : '⏸️';
        if (statusIcon) {
            const statusY = -this.currentDrawH - 8;
            ctx.save();
            ctx.fillStyle = isResearching ? '#fff1e8' : 'rgba(255, 252, 242, .95)';
            ctx.strokeStyle = isResearching ? '#ef4444' : '#a16207';
            ctx.lineWidth = isResearching ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.roundRect(17, statusY - 15, 29, 25, 9);
            ctx.fill();
            ctx.stroke();
            ctx.font = isResearching ? 'bold 21px sans-serif' : '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isResearching ? '#dc2626' : ctx.fillStyle;
            ctx.fillText(statusIcon, 31, statusY - 2);
            ctx.restore();
        }

        ctx.restore();

        // 8. 對話泡泡
        if (this.speechBubble && this.speechBubble.timer > 0) {
            this.drawSpeechBubble(ctx);
        }
    }

    drawSpeechBubble(ctx) {
        ctx.save();
        const bubbleX = this.x;
        const bubbleY = this.y - this.currentDrawH - 26;

        ctx.font = "bold 13px 'Noto Sans TC', sans-serif";
        const textWidth = ctx.measureText(this.speechBubble.text).width;
        const padX = 14;
        const padY = 8;
        const bW = textWidth + padX * 2 + 22;
        const bH = 34;

        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.roundRect(bubbleX - bW / 2 + 2, bubbleY - bH / 2 + 3, bW, bH, 10);
        ctx.fill();

        ctx.fillStyle = "#fffcf2";
        ctx.strokeStyle = "#854d0e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bubbleX - bW / 2, bubbleY - bH / 2, bW, bH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bubbleX - 6, bubbleY + bH / 2);
        ctx.lineTo(bubbleX, bubbleY + bH / 2 + 7);
        ctx.lineTo(bubbleX + 6, bubbleY + bH / 2);
        ctx.fillStyle = "#fffcf2";
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#451a03";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(this.speechBubble.icon, bubbleX - bW / 2 + 10, bubbleY);
        ctx.fillText(this.speechBubble.text, bubbleX - bW / 2 + 30, bubbleY);

        ctx.restore();
    }

    drawVectorFallback(ctx) {
        ctx.fillStyle = this.gender === 'MALE' ? '#a16207' : '#c2410c';
        ctx.beginPath();
        ctx.arc(0, -50, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}
