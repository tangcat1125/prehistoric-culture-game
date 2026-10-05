/**
 * 史前文明演化 - 第一章【找到可以生活的地方】遊戲主引擎 (PREHISTORIC GAME ENGINE)
 * 整合：
 *  - 橫向軸線鏡頭與長濱文化剪紙地景 (左「穴」 ➔ 中「森/石」 ➔ 右「海」)
 *  - 第一章 6 位先民獨立模組化去背圖資 (body / face / actions)
 *  - 國立臺灣史前文化博物館 (NMP) 八仙洞長濱文化考據
 */

class PrehistoricGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 世界尺寸 (橫軸展開 3400 像素)
        this.worldWidth = 3400;
        this.worldHeight = window.innerHeight;

        // 核心子系統
        this.sound = new SoundEngine();
        this.camera = new CameraController(this.worldWidth);
        this.disasterSystem = new DisasterSystem();

        // 時代與部族
        this.tribeName = "八仙洞長濱先民";
        this.currentEra = 0; // 0: 舊石器長濱

        // 資源庫
        this.resources = {
            food: 0,
            stone: 0,
            wood: 0,
            fiber: 0,
            artifacts: 0,
            fish_shell: 0,
            fruit: 0,
            timber: 0,
            jade: 0,
            clay: 0,
            favor: 50
        };
        this.resourceCapacity = {
            food: 100, fish_shell: 100, fruit: 100, timber: 100,
            wood: 100, stone: 100, jade: 100, clay: 100,
            fiber: 100, artifacts: 100
        };

        // 角色名冊與選中實體
        this.characters = [];
        this.selectedCharacter = null;
        this.quickWorkerId = null;
        this.quickGroupKey = null;
        this.quickRosterFilter = 'ALL';
        this.quickRosterScope = null;
        this.roundNumber = 0;
        // 一年由四個季節組成；每個遊戲回合代表一季。
        this.seasonIndex = 0;
        this.yearNumber = 1;
        this.seasonNames = ['春季', '夏季', '秋季', '冬季'];
        // 一回合 60 秒；每 10 秒顯示一次明顯倒數節點，給玩家足夠時間安排工作。
        this.roundDurationSeconds = 60;
        this.roundSecondsRemaining = 60;
        this.roundTimerHandle = null;
        this.gameSpeed = 1;
        this.teacherGameEnded = false;
        this.researchAssignments = {};
        this.pendingResearchSelection = null;
        this.behaviorStats = { forest: 0, stone: 0, coast: 0, technology: 0, learning: 0 };
        this.festivalUnlocked = false;
        this.festivalActive = false;
        this.festivalEndAt = 0;
        this.deathRitual = null;
        this.burialMounds = [];
        this.spiritualTechs = new Set();
        this.fireFuelFrame = 0;
        this.fireLevel = 0;
        this.toolDurability = 100;
        this.netDurability = 100;
        this.pendingNpcTalkId = null;
        this.techProgress = {};
        this.unlockedWorkCircles = new Set();
        this.techWorkDefinitions = {
            fiber_discovery: { id: 'WEAVE_NET', label: '編漁網', icon: '🕸️', station: 'net_weaving', location: '居住地' },
            sharp_stone_discovery: { id: 'MAKE_TOOLS', label: '做工具', icon: '🔨', station: 'tool_making', location: '火堆旁' },
            bone_hook_discovery: { id: 'FISHING', label: '釣魚', icon: '🎣', station: 'coastal_fishing', location: '海岸' },
            bone_hook_discovery_after_fiber: { id: 'FISHING', label: '釣魚', icon: '🎣', station: 'coastal_fishing', location: '海岸' },
            stone_axe_adze_discovery: { id: 'CHOP_TREE', label: '砍樹', icon: '🪓', station: 'tree_chopping', location: '森林' },
            jade_polish_discovery: { id: 'GRIND_STONE', label: '敲磨石頭', icon: '🟢', station: 'stone_grinding', location: '石區' },
            hunting_technique_discovery: { id: 'TUNA_HUNT', label: '捕大魚', icon: '🐟', station: 'tuna_hunting', location: '海岸' },
            pottery_discovery: { id: 'POTTERY', label: '燒陶', icon: '🏺', station: 'pottery_kiln', location: '居住地' }
        };
        this.maintenanceWorkDefinitions = {
            MAINTAIN_TOOLS: { id: 'MAINTAIN_TOOLS', label: '維護工具', icon: '🛠️', station: 'tool_maintenance', location: '居住地' },
            REPAIR_NET: { id: 'REPAIR_NET', label: '修補漁網', icon: '🕸️', station: 'net_repair', location: '居住地' }
        };

        // 橫軸工作站點
        this.workstations = [];

        // 圖資快取
        this.assets = {};
        // 表情包正式英文化路徑；所有已上傳圖組都由英文 WebP 路徑載入。
        this.facePackByCharacter = {
            child_01: 'child_girl',
            elder_m: 'elder_male',
            // 老奶奶的表情包沿用女性表情包；遊戲場景身體圖仍使用 char_elder_female.webp。
            elder_f: 'young_female',
            young_m1: 'young_male',
            young_m2: 'young_male',
            young_f1: 'young_female',
            young_f2: 'young_female'
        };
        this.faceExpressionFrame = { normal: 1, happy: 2, angry: 3, sad: 4, worried: 5 };

        this.initEventListeners();
        this.loadAssets();
        this.sound.startBackgroundMusic();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initWorld();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.worldHeight = window.innerHeight;
        this.camera.resize(this.canvas.width, this.canvas.height);
    }

    // 載入所有全新生成之透明去背圖資 (WebP 優先，PNG 備援)
    loadAssets() {
        // 1. 橫軸長濱地貌背景
        this.loadImageAsset('bg_paleolithic', 'assets/images/bg_paleolithic_axis.webp', 'assets/images/bg_paleolithic_axis.png');

        // 2. 第一章 6 位先民與新成員 child_01 模組化去背圖資 (body / face)
        const charIds = ['elder_m', 'elder_f', 'young_m1', 'young_m2', 'young_f1', 'young_f2', 'child_01', 'child_female'];
        const bodyFallbacks = {
            elder_m: 'assets/images/char_elder_male.webp',
            elder_f: 'assets/images/char_elder_female.webp',
            young_m1: 'assets/images/char_adult_male_idle.webp',
            young_m2: 'assets/images/char_adult_male_idle.webp',
            young_f1: 'assets/images/char_adult_female_idle.webp',
            young_f2: 'assets/images/char_youth_female_idle.webp',
            child_01: 'assets/images/char_child_boy_idle.webp',
            child_female: 'assets/images/paper_cave_girl_character.webp'
        };
        charIds.forEach(id => {
            // body: idle, walk_01, walk_02
            ['idle', 'walk_01', 'walk_02'].forEach(b => {
                // 女童紙卡同時保留 PNG 備援，避免部分瀏覽器載入 WebP 失敗時整個角色空白。
                const pngFallback = id === 'child_female'
                    ? 'assets/images/paper_cave_girl_character.png'
                    : null;
                this.loadImageAsset(`${id}_${b}`, bodyFallbacks[id], pngFallback);
            });
            // 表情圖由 HUD／對談的 <img> 在需要時載入，不在啟動時預先建立 40 個 Image 物件。
            // 這些圖不是地景 Canvas 的必要資材，延後載入可降低初始卡頓與記憶體峰值。
        });

        // 3. 4 個營地圖資
        ['coast_forest', 'river', 'rock', 'sea_cave'].forEach(loc => {
            this.loadImageAsset(loc, `assets/locations/${loc}.webp`, `assets/locations/${loc}.png`);
        });

        // 4. UI 剪紙圖資 (含愛心繁衍標記)
        ['leader_icon', 'choice_button', 'game_over', 'heart_icon'].forEach(u => {
            this.loadImageAsset(u, `assets/ui/${u}.webp`, `assets/ui/${u}.png`);
        });

        // 5. 工作動作專屬圖資
        ['action_chopping', 'action_fishing', 'action_boating', 'action_weaving'].forEach(act => {
            this.loadImageAsset(act, `assets/images/${act}.webp`, `assets/images/${act}.png`);
        });
        this.loadImageAsset('campfire_npc', 'assets/images/campfire_npc.webp', null);
    }

    loadImageAsset(key, webpSrc, pngFallback) {
        const img = new Image();
        img.src = webpSrc;
        img.onerror = () => {
            if (pngFallback && img.src !== pngFallback) {
                img.src = pngFallback;
            }
        };
        this.assets[key] = img;
    }

    getFaceImagePath(character, expression = 'normal') {
        const childAppearance = character.id && character.id.startsWith('child_') && ['infant', 'child'].includes(character.visualAgeStage || character.age_stage);
        const pack = childAppearance
            ? (character.gender === 'FEMALE' ? 'child_girl' : 'child_boy')
            : (character.age_stage === 'elder'
                // 目前沒有 elder_female 表情包，女性長者沿用 young_female，避免載入不存在的路徑。
                ? (character.gender === 'FEMALE' ? 'young_female' : 'elder_male')
            : (character.id && character.id.startsWith('child_')
                ? (character.gender === 'FEMALE' ? 'young_female' : 'young_male')
                : this.facePackByCharacter[character.id]));
        if (pack) {
            const frame = this.faceExpressionFrame[expression] || 1;
            return `assets/characters/face_packs/${pack}/expression_${String(frame).padStart(2, '0')}.webp`;
        }
        const fallback = {
            child_female: 'assets/images/paper_cave_girl_character.webp',
            elder_f: 'assets/images/char_youth_female_idle.webp',
            young_f1: 'assets/images/char_youth_female_idle.webp',
            young_f2: 'assets/images/char_youth_female_idle.webp'
        };
        return fallback[character.id] || 'assets/images/char_adult_male_idle.webp';
    }

    // 初始化世界
    initWorld() {
        const groundY = Math.min(590, window.innerHeight - 130);

        // 1. 初始化橫軸站點 (八仙洞海蝕洞群、森林柴火、天然巨石灘、潮間帶撿拾灘)
        this.workstations = [
            new Workstation({
                id: 'cave_camp', name: '八仙洞·火塘生活營地',
                x: 260, y: groundY - 20, radius: 75, minEra: 0,
                icon: "⛰️", actionType: "REST", eraName: "舊石器時代",
                description: "天然海蝕岩洞，升起營火避風取暖、保存火苗。"
            }),
            new Workstation({
                id: 'forest_wood', name: '森林·柴火採集區',
                x: 1050, y: groundY - 20, radius: 60, minEra: 0,
                hitArea: { x: 650, y: 40, width: 850, height: 500 },
                icon: "🪵", actionType: "GATHER_WOOD", eraName: "舊石器時代",
                outputResource: "wood", outputAmount: 5,
                description: "在森林裡撿拾枯枝柴火，維繫營地火塘火苗。"
            }),
            new Workstation({
                id: 'wild_bushes', name: '森林·野果採集區',
                x: 1320, y: groundY - 20, radius: 60, minEra: 0,
                hitArea: { x: 650, y: 40, width: 850, height: 500 },
                icon: "🍒", actionType: "GATHER_FRUIT", eraName: "舊石器時代",
                outputResource: "food", outputAmount: 5,
                description: "辨識並採集成熟野果、塊根與可食植物。"
            }),
            new Workstation({
                id: 'pebble_quarry', name: '天然硬礫石巨石灘',
                x: 1800, y: groundY - 60, radius: 65, minEra: 0,
                hitArea: { x: 1500, y: 40, width: 850, height: 500 },
                icon: "🪨", actionType: "STRIKE_STONE", eraName: "舊石器時代",
                outputResource: "stone", outputAmount: 5,
                description: "敲打天然硬礫石製作砍砸器並尋求火星。"
            }),
            new Workstation({
                id: 'coastal_shellfish', name: '潮間帶魚貝撿拾灘',
                x: 2920, y: groundY - 5, radius: 65, minEra: 0,
                hitArea: { x: 2400, y: 360, width: 1000, height: 340 },
                icon: "🐚", actionType: "COASTAL_GATHER", eraName: "舊石器時代",
                outputResource: "food", outputAmount: 6,
                description: "退潮時在礁石與沙灘撿拾海貝、海螺與受困魚蟹。"
            }),
            new Workstation({
                id: 'forest_river_search', name: '森林·河畔搜索區',
                x: 1500, y: groundY - 10, radius: 58, minEra: 0,
                hitArea: { x: 1050, y: 120, width: 620, height: 430 },
                icon: "🌿", actionType: "RIVER_SEARCH", eraName: "舊石器時代",
                outputResource: "food", outputAmount: 4,
                description: "沿著森林河畔搜索魚貝、泥灘與可塑形的黏土。"
            }),
            new Workstation({ id: 'net_weaving', name: '居住地·編漁網', x: 260, y: groundY - 20, radius: 75, minEra: 0, icon: '🕸️', actionType: 'WEAVE_NET', description: '在火塘旁將植物纖維編成漁網。' }),
            new Workstation({ id: 'net_repair', name: '居住地·修補漁網', x: 260, y: groundY - 20, radius: 75, minEra: 0, icon: '🕸️', actionType: 'REPAIR_NET', description: '在居住地修補破損的漁網。' }),
            new Workstation({ id: 'tool_making', name: '火堆旁·製作工具', x: 300, y: groundY - 20, radius: 75, minEra: 0, icon: '🔨', actionType: 'MAKE_TOOLS', description: '在火堆旁把石片、木柄與纖維組合成工具。' }),
            new Workstation({ id: 'tool_maintenance', name: '居住地·維護工具', x: 300, y: groundY - 20, radius: 75, minEra: 0, icon: '🛠️', actionType: 'MAINTAIN_TOOLS', description: '在居住地修整石器、木柄與綁帶。' }),
            new Workstation({ id: 'pottery_kiln', name: '居住地·燒陶窯', x: 340, y: groundY - 20, radius: 75, minEra: 0, icon: '🏺', actionType: 'POTTERY', description: '把黏土放入火堆燒製，延長魚貝與水果的保存時間。' }),
            new Workstation({ id: 'tree_chopping', name: '森林·砍樹區', x: 1050, y: groundY - 20, radius: 60, minEra: 0, icon: '🪓', actionType: 'CHOP_TREE', description: '使用石斧砍取較粗的木材。' }),
            new Workstation({ id: 'stone_grinding', name: '石區·打磨台', x: 1800, y: groundY - 60, radius: 65, minEra: 0, icon: '🟢', actionType: 'GRIND_STONE', description: '敲磨石材與玉石，加速資材加工。' }),
            new Workstation({ id: 'coastal_fishing', name: '海岸·釣魚區', x: 2920, y: groundY - 5, radius: 65, minEra: 0, icon: '🎣', actionType: 'FISHING', description: '利用魚鉤與漁網主動釣魚。' }),
            new Workstation({ id: 'tuna_hunting', name: '海岸·捕大魚區', x: 2920, y: groundY - 5, radius: 65, minEra: 0, icon: '🐟', actionType: 'TUNA_HUNT', description: '使用漁獵技術捕捉大型鮪魚。' })
        ];

        // 2. 啟動第一章控制器、傳承系統與意外發明管理器
        this.chapter1 = new Chapter1Manager(this);
        this.inheritance = new InheritanceSystem(this);
        this.discovery = new DiscoveryManager(this);
        this.chapter1.init();
        this.updatePopulationSummary();
        this.updateMaterialInventory();
    }

    initEventListeners() {
        const c = this.canvas;

        // 使用者第一次點擊或按鍵時解除瀏覽器的自動播放限制。
        const unlockMusic = () => this.sound.startBackgroundMusic();
        document.addEventListener('pointerdown', unlockMusic, { once: true });
        document.addEventListener('keydown', unlockMusic, { once: true });

        c.addEventListener('pointerup', (e) => {
            if (this.camera.isDragging && this.camera.dragDistance > 10) return;

            const worldX = e.clientX + this.camera.x;
            const worldY = e.clientY;

            // 1. 優先檢查是否點選族人
            let clickedChar = null;
            for (let char of this.characters) {
                if (char.isAlive && Math.hypot(char.x - worldX, char.y - worldY) < 55) {
                    clickedChar = char;
                    break;
                }
            }

            if (clickedChar) {
                // 第一階段：選一位帶領大家的人
                if (this.chapter1 && this.chapter1.state === 'PHASE1_FIND_LEADER') {
                    this.chapter1.onCharacterClicked(clickedChar);
                    return;
                }
                // 第二階段：營地對話
                if (this.chapter1 && this.chapter1.state.startsWith('PHASE2')) {
                    this.chapter1.onCharacterClicked(clickedChar);
                    return;
                }
                // 一般遊戲中點角色只代表「想替他變更工作」；工作本身由名冊指令持續執行。
                this.selectedCharacter = clickedChar;
                this.quickWorkerId = clickedChar.id;
                this.quickGroupKey = null;
                this.openCharacterWorkReport(clickedChar);
                return;
            }

            // 2. 檢查是否點選站點
            let clickedStation = null;
            for (let st of this.workstations) {
                const area = st.hitArea;
                const inArea = area
                    ? worldX >= area.x && worldX <= area.x + area.width && worldY >= area.y && worldY <= area.y + area.height
                    : Math.hypot(st.x - worldX, st.y - worldY) < st.radius + 15;
                if (this.currentEra >= st.minEra && inArea) {
                    clickedStation = st;
                    break;
                }
            }

            if (clickedStation) {
                this.showToast(`這是【${clickedStation.name}】的工作區，請從【部族名冊】派遣角色。`);
                return;
            }

            // 空白地景不再直接控制角色；所有工作與移動由名冊指令驅動。
        });
    }

    selectCharacter(char) {
        this.selectedCharacter = char;
        if (char) {
            this.quickWorkerId = char.id;
            this.quickGroupKey = null;
        }
        this.renderQuickRoster();
    }

    updatePopulationSummary() {
        const male = this.characters.filter(c => c.isAlive && c.gender === 'MALE').length;
        const female = this.characters.filter(c => c.isAlive && c.gender === 'FEMALE').length;
        const maleEl = document.getElementById('population-male');
        const femaleEl = document.getElementById('population-female');
        if (maleEl) maleEl.innerText = male;
        if (femaleEl) femaleEl.innerText = female;
    }

    updateMaterialInventory() {
        const storage = key => `${Math.min(this.resources[key] || 0, this.resourceCapacity[key] || 100)}/${this.resourceCapacity[key] || 100}`;
        const values = {
            'material-fish-shell': storage('fish_shell'),
            'material-fruit': storage('fruit'),
            'material-wood': storage('timber'),
            'material-stone': storage('stone'),
            'material-jade': storage('jade'),
            'material-clay': storage('clay')
        };
        Object.entries(values).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.innerText = value;
        });
        const fireEl = document.getElementById('fire-fuel-status');
        if (fireEl) fireEl.innerText = this.chapter1?.isCampFireLit ? `火焰 ${Math.max(1, this.fireLevel)}/3` : '尚未點火';
    }

    renderQuickRoster() {
        const listEl = document.getElementById('quick-roster-list');
        if (!listEl) return;
        const living = this.characters.filter(c => c.isAlive);
        const filterMatches = char => {
            if (this.quickRosterFilter === 'WORKING') return ['WORKING', 'WALKING_TO_STATION', 'RETURNING_HOME'].includes(char.state);
            if (this.quickRosterFilter === 'IDLE') return !char.assignedTask || ['IDLE', 'RESTING'].includes(char.state);
            if (this.quickRosterFilter === 'RESEARCH') return char.currentTask === 'RESEARCH';
            if (this.quickRosterFilter === 'CHILDREN') return ['infant', 'child'].includes(char.age_stage);
            if (this.quickRosterFilter === 'ELDERS') return char.age_stage === 'elder';
            return true;
        };
        const scopeMatches = char => {
            if (this.quickRosterScope === 'YOUNG_MALE') return char.age_stage === 'adult' && char.gender === 'MALE';
            if (this.quickRosterScope === 'YOUNG_FEMALE') return char.age_stage === 'adult' && char.gender === 'FEMALE';
            if (this.quickRosterScope === 'CHILDREN') return ['infant', 'child'].includes(char.age_stage);
            if (this.quickRosterScope === 'ELDERS') return char.age_stage === 'elder';
            if (this.quickRosterScope === 'RESEARCH') return char.currentTask === 'RESEARCH';
            if (this.quickRosterScope === 'WORKING') return ['WORKING', 'WALKING_TO_STATION', 'RETURNING_HOME'].includes(char.state);
            if (this.quickRosterScope === 'IDLE') return !char.assignedTask || ['IDLE', 'RESTING'].includes(char.state);
            return true;
        };
        const filtered = living.filter(filterMatches).filter(scopeMatches);
        if (!this.quickGroupKey && !this.quickRosterScope && !living.some(c => c.id === this.quickWorkerId)) {
            this.quickWorkerId = living[0] ? living[0].id : null;
        }
        const memberCard = char => {
            const talkReady = char.id === this.pendingNpcTalkId;
            const researching = char.currentTask === 'RESEARCH' && ['WALKING_TO_STATION', 'WORKING'].includes(char.state);
            return `
            <button class="quick-roster-member${talkReady ? ' talk-ready' : ''}${researching ? ' researching' : ''}" onclick="game.selectQuickWorker('${char.id}')" title="${researching ? '研究中：留在洞穴整理技術' : (talkReady ? '點擊聽取這位族人的發現' : `選擇 ${char.name} 執行工作`)}">
                <img src="${this.getFaceImagePath(char, 'normal')}" loading="lazy" decoding="async" class="quick-roster-avatar${char.id === this.quickWorkerId ? ' selected' : ''}" alt="${char.name}">
                ${researching ? '<span class="quick-roster-research-mark">＋</span>' : ''}
                <span>${talkReady ? '💬 ' : ''}${char.name}</span>
            </button>
        `; };
        const groupCard = (key, icon, label, count) => `
            <button class="quick-roster-group${this.quickGroupKey === key ? ' selected' : ''}" onclick="game.selectQuickGroup('${key}')" title="選擇${label}，下方工作指令會套用到這一群人">
                <span class="quick-roster-group-icon">${icon}</span>
                <span>${label}</span><small>${count} 人</small>
            </button>
        `;
        const groupDefinitions = [
            ['YOUNG_MALE', '👨‍👨‍👦', '青年男子群', c => c.age_stage === 'adult' && c.gender === 'MALE'],
            ['YOUNG_FEMALE', '👩‍👩‍👧', '青年女子群', c => c.age_stage === 'adult' && c.gender === 'FEMALE'],
            ['CHILDREN', '🧒', '小孩', c => ['infant', 'child'].includes(c.age_stage)],
            ['ELDERS', '🧓', '老人', c => c.age_stage === 'elder'],
            ['WORKING', '🔨', '工作中', c => ['WORKING', 'WALKING_TO_STATION', 'RETURNING_HOME'].includes(c.state)],
            ['RESEARCH', '🧠', '研究中', c => c.currentTask === 'RESEARCH'],
            ['IDLE', '⏸️', '待命', c => !c.assignedTask || ['IDLE', 'RESTING'].includes(c.state)]
        ];
        const groupCards = living.length > 10 && !this.quickRosterScope
            ? `<div class="quick-roster-group-heading">選擇一個群體查看角色（點擊後再選個人）</div>${groupDefinitions
                .map(([key, icon, label, predicate]) => {
                    const count = living.filter(c => filterMatches(c) && predicate(c)).length;
                    return count ? groupCard(key, icon, label, count) : '';
                }).join('')}`
            : (this.quickRosterScope ? `<button class="quick-roster-back" onclick="game.clearRosterScope()">← 返回角色分類</button><div class="quick-roster-group-heading">${groupDefinitions.find(item => item[0] === this.quickRosterScope)?.[2] || '角色'}（${filtered.length} 人）</div>` : '');
        // 超過 10 人先顯示群體；進入群體後才渲染該群體的個人角色。
        listEl.innerHTML = groupCards || filtered.map(memberCard).join('');
        listEl.classList.toggle('showing-groups', Boolean(groupCards));
        document.querySelectorAll('.quick-roster-filter').forEach(button => button.classList.toggle('active', button.dataset.rosterFilter === this.quickRosterFilter));
        const selected = living.find(c => c.id === this.quickWorkerId);
        const label = document.getElementById('quick-worker-label');
        const scopeLabels = { YOUNG_MALE: '青年男子群', YOUNG_FEMALE: '青年女子群', CHILDREN: '小孩', ELDERS: '老人', WORKING: '工作中族人', RESEARCH: '研究中的族人', IDLE: '待命族人' };
        if (label) label.innerText = this.quickGroupKey
            ? `目前選擇：${scopeLabels[this.quickGroupKey]}`
            : (this.quickRosterScope ? `目前瀏覽：${scopeLabels[this.quickRosterScope]}` : (selected ? `目前選擇：${selected.name}（${selected.ageGroup}）` : '請先選擇一位族人'));
    }

    selectQuickWorker(charId) {
        const char = this.characters.find(c => c.id === charId && c.isAlive);
        if (!char) return;
        this.selectedCharacter = char;
        this.quickWorkerId = char.id;
        this.quickGroupKey = null;
        this.quickRosterScope = null;
        this.renderQuickRoster();
        if (char.id === this.pendingNpcTalkId) this.openNpcDialogue();
    }

    selectQuickGroup(groupKey) {
        const valid = ['YOUNG_MALE', 'YOUNG_FEMALE', 'CHILDREN', 'ELDERS', 'WORKING', 'RESEARCH', 'IDLE'];
        if (!valid.includes(groupKey)) return;
        this.quickRosterScope = groupKey;
        this.quickGroupKey = ['YOUNG_MALE', 'YOUNG_FEMALE'].includes(groupKey) ? groupKey : null;
        this.quickWorkerId = null;
        this.selectedCharacter = null;
        this.renderQuickRoster();
        const labels = { YOUNG_MALE: '青年男子群', YOUNG_FEMALE: '青年女子群', CHILDREN: '小孩', ELDERS: '老人', WORKING: '工作中族人', RESEARCH: '研究中的族人', IDLE: '待命族人' };
        this.showToast(`👥 已選擇${labels[groupKey]}，請再選擇個別角色。`);
    }

    setRosterFilter(filter) {
        this.quickRosterFilter = filter;
        this.quickRosterScope = null;
        this.quickGroupKey = null;
        this.quickWorkerId = null;
        this.selectedCharacter = null;
        this.renderQuickRoster();
    }

    clearRosterScope() {
        this.quickRosterScope = null;
        this.quickGroupKey = null;
        this.quickWorkerId = null;
        this.renderQuickRoster();
    }

    openCharacterWorkReport(char) {
        if (!char || !char.isAlive) return;
        this.quickWorkerId = char.id;
        this.openNpcDialogue(char, true);
    }

    // 有技術線索的回報，不再直接讓族人回去採集；玩家確認後，該族人會留在洞穴研究。
    confirmNpcDialogue(charId = null) {
        const id = charId || this.quickWorkerId || this.pendingNpcTalkId;
        const speaker = this.characters.find(char => char.id === id && char.isAlive);
        if (!speaker) {
            this.closeNpcDialogue();
            return;
        }

        // 已正式觸發的發現優先；尚未形成發現卡時，依工作報告中的可能方向建立研究線索。
        const reportResearchByTask = {
            GATHER_WOOD: 'fiber_discovery',
            GATHER_FRUIT: 'pottery_discovery',
            STRIKE_STONE: 'sharp_stone_discovery',
            COASTAL_GATHER: 'bone_hook_discovery',
            RIVER_SEARCH: 'pottery_discovery'
        };
        const discoveryId = speaker.pendingDiscoveryId || reportResearchByTask[speaker.assignedTask];
        const discovery = this.discovery?.discoveriesData?.find(item => item.id === discoveryId);
        const tech = discoveryId ? this.techWorkDefinitions[discoveryId] : null;

        if (discovery && tech && !this.unlockedWorkCircles.has(tech.id)) {
            speaker.pendingDiscoveryId = null;
            this.startCharacterResearch(discovery.id, speaker.id);
            this.closeNpcDialogue();
            this.showToast(`🧠【${speaker.name}】留下來研究「${discovery.name}」，暫停原本工作。`);
            return;
        }

        this.closeNpcDialogue();
    }

    changeCharacterTaskFromReport(charId, taskType) {
        this.assignRosterTask(charId, taskType);
        this.closeNpcDialogue();
        this.showToast(`📋 已更新【${this.characters.find(c => c.id === charId)?.name || '族人'}】的工作指令。`);
    }

    chooseReportDiscovery(charId, discoveryId, isCorrect) {
        const worker = this.characters.find(c => c.id === charId && c.isAlive);
        const discovery = this.discovery?.discoveriesData?.find(item => item.id === discoveryId);
        if (!worker || !discovery || worker.pendingDiscoveryId !== discoveryId) return;

        worker.pendingDiscoveryId = null;
        if (isCorrect) {
            this.discovery.unlockedDiscoveries.add(discovery.id);
            this.characters.filter(c => c.isAlive).forEach(char => char.discoveryBonuses?.add(discovery.id));
            this.registerTechnologyDiscovery(discovery.id);
            worker.roundStories = worker.roundStories || [];
            worker.roundStories.push(`我想明白了！我們把「${discovery.name}」收進部族的技巧裡。`);
            this.discovery.activeDiscovery = null;
            this.sound.playEvolutionFanfare();
            this.showToast(`✨【${worker.name}】理解了發現！已收納【${discovery.name}】。`);
        } else {
            worker.researchCooldownRounds = 3;
            worker.roundStories = worker.roundStories || [];
            worker.roundStories.push('我失敗了！這次嘗試沒有成功，我需要幾個回合重新整理想法。');
            worker.say('我失敗了！', '😰', 220);
            this.sound.playTone(220, 'sawtooth', 0.25, 0.25);
            this.showToast(`😰【${worker.name}】研究失敗，接下來三個回合需要整理思路。`);
        }
        this.quickWorkerId = worker.id;
        this.openNpcDialogue(worker, true);
        this.renderQuickRoster();
        this.renderSkillTree();
    }

    assignQuickTask(taskType) {
        if (this.quickGroupKey) {
            const gender = this.quickGroupKey === 'YOUNG_MALE' ? 'MALE' : 'FEMALE';
            const group = this.characters.filter(char => char.isAlive && char.age_stage === 'adult' && char.gender === gender);
            if (!group.length) {
                this.showToast('目前沒有符合條件的青年族人。');
                return;
            }
            group.forEach(char => this.assignRosterTask(char.id, taskType));
            this.showToast(`👥 已將工作指令套用到${this.quickGroupKey === 'YOUNG_MALE' ? '青年男子群' : '青年女子群'}（${group.length} 人）。`);
            this.renderQuickRoster();
            return;
        }
        const char = this.characters.find(c => c.id === this.quickWorkerId && c.isAlive);
        if (!char) {
            this.showToast('請先從下方名冊選擇族人。');
            return;
        }
        this.assignRosterTask(char.id, taskType);
        this.renderQuickRoster();
    }

    assignRiverSearchFromReport(charId) {
        const char = this.characters.find(c => c.id === charId && c.isAlive);
        const station = this.workstations.find(st => st.actionType === 'RIVER_SEARCH');
        if (!char || !station) return;
            char.assignStation(station, true);
        this.closeNpcDialogue();
        this.showToast(`🌿 已派遣【${char.name}】前往森林河畔搜索魚貝與黏土。`);
        this.renderQuickRoster();
    }

    getKnowledgeText(char) {
        const skillNames = {
            find_stone: '挑選尖石', stone_tool: '打製石器', gather: '辨識可食植物', firewood: '整理柴火',
            fiber_discovery: '植物纖維與搓繩', sharp_stone_discovery: '尖石刮削', bone_hook_discovery: '魚骨與貝殼骨鉤',
            bone_hook_discovery_after_fiber: '纖維綁骨鉤', pottery_discovery: '黏土燒陶', jade_polish_discovery: '玉石打磨',
            stone_axe_adze_discovery: '石斧與粗木加工'
        };
        const known = [...new Set([...(char?.skills || []), ...(char?.discoveryBonuses || [])])]
            .map(id => skillNames[id] || this.discovery?.discoveriesData?.find(item => item.id === id)?.name)
            .filter(Boolean);
        return known.length ? known.join('、') : '火塘、採集與辨認材料的生活經驗';
    }

    assignHomeTeachingTask(char, taskType, partner = null, force = false) {
        const station = this.workstations.find(st => st.id === 'cave_camp');
        if (!char || !station || !char.isAlive) return false;
        if (!force && (char.state === 'WALKING_TO_STATION' || char.state === 'WORKING' || char.state === 'RETURNING_HOME')) {
            char.say('這一輪還沒結束，回住處後再安排學習或教學。', '⏳', 140);
            return false;
        }
        if (char.stamina < 15) {
            char.state = 'RESTING';
            char.wanderTargetX = char.homeX;
            char.say('我太累了，先回火塘休息。', '💤', 140);
            return false;
        }
        char.targetStation = station;
        char.laneOffset = char.getLaneOffset(taskType);
        char.axisY = station.y + 20 + char.laneOffset;
        char.currentTask = taskType;
        char.assignedTask = taskType;
        char.workTimer = 0;
        char.workDuration = taskType === 'LEARN' ? 125 : 150;
        char.autoWorkCooldown = 0;
        char.followingTarget = null;
        char.teacher = taskType === 'LEARN' ? partner : null;
        char.learningTimer = 0;
        char.state = 'WALKING_TO_STATION';
        const knowledge = this.getKnowledgeText(partner || char);
        char.say(taskType === 'LEARN' ? `回居住地跟${partner?.name || '長老'}學習：${knowledge}` : `回居住地教學：${knowledge}`, taskType === 'LEARN' ? '📚' : '🗣️', 220);
        return true;
    }

    handleStationClick(station) {
        let worker = this.selectedCharacter || (this.chapter1 ? this.chapter1.leader : null) || this.characters[0];
        if (worker) {
            worker.assignStation(station, true);
            this.sound.playTone(660, 'triangle', 0.15, 0.2);
            this.showToast(`🏃 派遣【${worker.name}】前往【${station.name}】！`);
        }
    }

    getEquipmentEfficiency(actionType) {
        const toolTasks = ['STRIKE_STONE', 'MAKE_TOOLS', 'CHOP_TREE', 'GRIND_STONE', 'GATHER_WOOD'];
        const netTasks = ['FISHING', 'TUNA_HUNT'];
        let efficiency = 1;
        if (toolTasks.includes(actionType)) efficiency *= this.toolDurability <= 0 ? 0.45 : (this.toolDurability < 35 ? 0.7 : 1);
        if (netTasks.includes(actionType)) efficiency *= this.netDurability <= 0 ? 0.45 : (this.netDurability < 35 ? 0.7 : 1);
        return efficiency;
    }

    wearEquipment(actionType, worker, addStory) {
        const toolTasks = ['STRIKE_STONE', 'MAKE_TOOLS', 'CHOP_TREE', 'GRIND_STONE', 'GATHER_WOOD'];
        const netTasks = ['FISHING', 'TUNA_HUNT'];
        if (toolTasks.includes(actionType)) {
            const before = this.toolDurability;
            this.toolDurability = Math.max(0, this.toolDurability - (actionType === 'MAKE_TOOLS' ? 3 : 6));
            if (before > 35 && this.toolDurability <= 35) {
                addStory(`我手上的工具開始崩口，敲起來越來越慢；要是再不修整，採集速度會掉下來。`);
                worker.say('工具快壞了，需要回居住地維護！', '🛠️', 220);
            }
        }
        if (netTasks.includes(actionType)) {
            const before = this.netDurability;
            this.netDurability = Math.max(0, this.netDurability - 8);
            if (before > 35 && this.netDurability <= 35) {
                addStory(`漁網被礁石磨出破洞，魚從裂縫裡逃走了；需要回居住地把網補好。`);
                worker.say('漁網破掉了，得先回去修補！', '🕸️', 220);
            }
        }
    }

    handleProduction(actionType, worker) {
        const yieldInfo = worker.calculateYield(actionType);
        const efficiency = this.getEquipmentEfficiency(actionType);
        if (efficiency < 1) {
            yieldInfo.amount = Math.max(1, Math.floor(yieldInfo.amount * efficiency));
            yieldInfo.message += '（工具或漁網狀況不佳，採集速度下降）';
        }
        const findings = worker.roundFindings || (worker.roundFindings = []);
        const addFinding = (name, image, amount) => findings.push({ name, image, amount });
        const addStory = story => {
            if (!worker.roundStories) worker.roundStories = [];
            worker.roundStories.push(story);
        };
        if (actionType === 'GATHER_WOOD' || actionType === 'GATHER_FRUIT' || actionType === 'CHOP_TREE') this.behaviorStats.forest++;
        if (actionType === 'STRIKE_STONE' || actionType === 'GRIND_STONE' || actionType === 'MAKE_TOOLS') this.behaviorStats.stone++;
        if (['COASTAL_GATHER', 'COASTAL_FISH', 'RIVER_SEARCH', 'FISHING', 'TUNA_HUNT'].includes(actionType)) this.behaviorStats.coast++;
        if (['WEAVE_NET', 'MAKE_TOOLS', 'CHOP_TREE', 'GRIND_STONE', 'FISHING', 'TUNA_HUNT', 'POTTERY', 'RESEARCH'].includes(actionType)) this.behaviorStats.technology++;
        const productionCosts = {
            WEAVE_NET: { fiber: 2 },
            MAKE_TOOLS: { wood: 1, fiber: 1, stone: 2 },
            FISHING: { wood: 1, fiber: 1 },
            CHOP_TREE: { wood: 1, stone: 1 },
            GRIND_STONE: { stone: 1 },
            POTTERY: { wood: 3, clay: 1 },
            MAINTAIN_TOOLS: { wood: 1, stone: 1 },
            REPAIR_NET: { fiber: 2 }
        };
        const cost = productionCosts[actionType];
        if (cost && !this.consumeMaterials(cost)) {
            worker.say(`材料不夠，這項工作需要木材、纖維、石材或黏土。`, '⚠️', 180);
            this.showToast(`⚠️【${worker.name}】材料不足，無法完成${actionType === 'POTTERY' ? '燒陶' : '工具製作'}。`);
            return;
        }
        
        if (actionType === 'STRIKE_STONE' || actionType === 'PICK_PEBBLES') {
            this.storeResource('stone', yieldInfo.amount);
            addFinding('石頭', 'assets/resources/stone.webp', yieldInfo.amount);
            addStory(`我在石灘找了很久，敲開一塊礫石時，碎片的邊緣亮亮的、尖尖的，看起來很適合拿來切東西。`);
            // 玉石不是每次都能遇到；只有少量機會從礫石中被辨認出來。
            if (Math.random() < 0.06) {
                this.storeResource('jade', 1);
                addFinding('玉石', 'assets/resources/jade_disc.webp', 1);
            }
            worker.say(yieldInfo.message, "🪨", 140);
        } else if (actionType === 'COASTAL_GATHER' || actionType === 'COASTAL_FISH') {
            this.storeResource('food', yieldInfo.amount);
            this.storeResource('fish_shell', yieldInfo.amount);
            addFinding('魚貝類', 'assets/resources/fish_blue.webp', yieldInfo.amount);
            addStory(`我沿著退潮的海岸撿拾魚貝，翻開石縫時看見彎曲的魚骨；它好像能勾住東西，也許能做成新的工具。`);
            if (Math.random() < 0.18) {
                this.storeResource('clay', 1);
                addFinding('黏土', 'assets/resources/stone.webp', 1);
                addStory(`泥灘裡有一團黏土，曬乾後變得很硬。我在想，要是把它放進火堆，或許能做成保存食物的容器。`);
                worker.say('這裡的泥土曬乾後很硬，也許能放進火裡燒成器皿！', '🟤', 180);
            }
            worker.say(yieldInfo.message, "🐚", 140);
        } else if (actionType === 'RIVER_SEARCH') {
            this.storeResource('food', yieldInfo.amount);
            this.storeResource('fish_shell', yieldInfo.amount);
            addFinding('河畔魚貝', 'assets/resources/fish_blue.webp', yieldInfo.amount);
            addStory('我沿著森林河邊慢慢搜索，水草和泥灘裡藏著魚貝；河岸還有一團黏土，帶回火堆旁也許能試著燒成容器。');
            if (Math.random() < 0.45) {
                this.storeResource('clay', 1);
                addFinding('河岸黏土', 'assets/resources/stone.webp', 1);
                addStory('這團黏土曬乾後很硬，放在火堆旁燒一燒，或許能發展出保存食物的陶器。');
            }
            worker.say('河邊有魚貝，也找到可以帶回火堆試燒的黏土！', "🟤", 180);
        } else if (actionType === 'GATHER_FRUIT') {
            this.storeResource('food', yieldInfo.amount);
            this.storeResource('fruit', yieldInfo.amount);
            addFinding('水果與塊根', 'assets/resources/fruit.webp', yieldInfo.amount);
            addStory(`我走進森林，在低矮的灌木間找到成熟野果和塊根；有些果實特別甜，值得記住它們生長的位置。`);
            worker.say(yieldInfo.message, "🍒", 140);
        } else if (actionType === 'GATHER_WOOD' || actionType === 'PICK_TWIGS') {
            this.storeResource('wood', yieldInfo.amount);
            this.storeResource('timber', yieldInfo.amount);
            addFinding('木材與枯枝', 'assets/resources/wood.webp', yieldInfo.amount);
            addStory(`我在森林裡挑乾燥的枯枝，還剝到一小段韌韌的樹皮。這些纖維一直拉不斷，也許能搓成繩子。`);
            worker.say(yieldInfo.message, "🪵", 140);
        } else if (actionType === 'WEAVE_NET') {
            this.storeResource('fiber', yieldInfo.amount);
            addFinding('植物纖維漁網', 'assets/resources/wood.webp', yieldInfo.amount);
            addStory(`我把森林帶回來的纖維一圈一圈交錯，終於編出能兜住東西的網。這不只是繩子，也許能幫我們捕到更遠的魚。`);
            worker.say(yieldInfo.message, "🕸️", 140);
        } else if (actionType === 'MAKE_TOOLS') {
            this.storeResource('artifacts', yieldInfo.amount);
            addFinding('複合工具', 'assets/resources/stone.webp', yieldInfo.amount);
            addStory(`我把石片、木柄和纖維綁在一起，手握起來穩多了。不同材料合在一起，似乎能變成真正的工具。`);
            worker.say(yieldInfo.message, "🔨", 140);
        } else if (actionType === 'CHOP_TREE') {
            this.storeResource('wood', yieldInfo.amount);
            this.storeResource('timber', yieldInfo.amount);
            addFinding('粗木材', 'assets/resources/wood.webp', yieldInfo.amount);
            addStory(`有了石器，我能處理更粗的木頭。森林裡的樹幹不再只是燃料，也能成為建造和製作的材料。`);
            worker.say(yieldInfo.message, "🪓", 140);
        } else if (actionType === 'GRIND_STONE') {
            this.storeResource('stone', yieldInfo.amount);
            addFinding('打磨石材', 'assets/resources/stone.webp', yieldInfo.amount);
            addStory(`我反覆敲磨石頭，粗糙的表面慢慢變平。那塊綠色的石頭尤其漂亮，也許能磨成裝飾品。`);
            worker.say(yieldInfo.message, "🟢", 140);
        } else if (actionType === 'FISHING') {
            this.storeResource('food', yieldInfo.amount);
            this.storeResource('fish_shell', yieldInfo.amount);
            addFinding('釣獲魚類', 'assets/resources/fish_smile.webp', yieldInfo.amount);
            addStory(`我把魚骨做成的勾勾綁上纖維，第一次在較深的水邊試著釣魚；這讓我們不必只等魚貝被潮水帶上岸。`);
            if (Math.random() < 0.18) {
                this.storeResource('clay', 1);
                addFinding('黏土', 'assets/resources/stone.webp', 1);
                worker.say('海岸泥層裡有黏土！也許能燒成保存食物的容器。', '🟤', 180);
            }
            worker.say(yieldInfo.message, "🎣", 140);
        } else if (actionType === 'TUNA_HUNT') {
            this.storeResource('food', yieldInfo.amount);
            this.storeResource('fish_shell', yieldInfo.amount);
            addFinding('大型鮪魚', 'assets/resources/fish_blue.webp', yieldInfo.amount);
            addStory(`今天帶回一條大魚！以前只能撿小魚貝，現在工具和漁獵的方法讓我們有機會取得更大的食物。`);
            worker.say(yieldInfo.message, "🐟", 140);
        } else if (actionType === 'MAINTAIN_TOOLS') {
            this.toolDurability = Math.min(100, this.toolDurability + 45);
            addStory('我在居住地重新磨利石片、固定木柄，工具恢復了力道，採集可以繼續順利進行。');
            worker.say('工具維護好了，大家可以恢復正常採集！', '🛠️', 220);
        } else if (actionType === 'REPAIR_NET') {
            this.netDurability = Math.min(100, this.netDurability + 55);
            addStory('我把植物纖維重新穿過破洞，漁網補好了；下次下海時，魚不會再從裂縫逃走。');
            worker.say('漁網補好了，可以繼續捕魚！', '🕸️', 220);
        } else if (actionType === 'POTTERY') {
            if ((this.resources.clay || 0) > 0) this.resources.clay--;
            this.storeResource('artifacts', yieldInfo.amount);
            addFinding('燒製陶器', 'assets/resources/stone.webp', yieldInfo.amount);
            addStory(`我把黏土放進火堆邊緩慢燒製，終於得到一個硬陶容器。魚貝和水果終於有地方可以好好保存。`);
            worker.say(yieldInfo.message, "🏺", 160);
        } else if (actionType === 'LEARN' || actionType === 'TEACH') {
            const teacher = actionType === 'LEARN'
                ? (worker.teacher || this.characters.find(c => c.isAlive && c.age_stage === 'elder'))
                : worker;
            const knowledge = this.getKnowledgeText(teacher || worker);
            if (actionType === 'LEARN') {
                const inheritedDiscovery = [...(teacher?.discoveryBonuses || [])]
                    .find(id => !worker.discoveryBonuses.has(id));
                if (inheritedDiscovery) worker.discoveryBonuses.add(inheritedDiscovery);
                const inheritedSkill = (teacher?.skills || []).find(skill => !worker.skills.includes(skill));
                if (inheritedSkill) worker.skills.push(inheritedSkill);
                addStory(`我回到居住地跟${teacher?.name || '長老'}學習。她／他把${knowledge}一一說給我聽，我開始記住這些做事的方法。`);
                worker.say(`我學會了：${knowledge}`, '📚', 220);
            } else {
                addStory(`我在火塘旁教孩子${knowledge}。這些經驗不能只留在我心裡，要一代一代傳下去。`);
                worker.say(`把${knowledge}教給孩子。`, '🗣️', 220);
            }
            this.behaviorStats.learning++;
        } else if (actionType === 'RESEARCH') {
            const discovery = this.discovery?.discoveriesData?.find(item => item.id === worker.researchTopic);
            addStory(`我回到居住地整理「${discovery?.name || '這個新發現'}」：要把材料、地點和做法連起來，才知道它能不能成為技術。`);
            worker.say(`我正在研究：${discovery?.name || '新的技術線索'}`, '🧠', 220);
        } else if (actionType === 'FESTIVAL') {
            addStory(`今晚我們圍著火塘跳舞，把${this.buildFestivalMyth()}講給孩子聽。這段故事會留在部族的記憶裡。`);
            worker.say('火塘的故事要一代一代傳下去！', '🔥', 220);
        } else {
            this.storeResource('food', yieldInfo.amount);
            worker.say(yieldInfo.message, "🧺", 140);
        }

        this.wearEquipment(actionType, worker, addStory);
        this.updateMaterialInventory();

        this.showToast(`🧺【${worker.name}】完成了工作，收穫：${yieldInfo.message}（剩餘體力: ${Math.round(worker.stamina)}）`);

        // 檢查意外發現與文化演進
        if (this.discovery) {
            this.discovery.onTaskCompleted(actionType, worker);
        }

        // 若開啟著名冊彈窗，實時刷新數值
        const rosterModal = document.getElementById('modal-roster');
        if (rosterModal && rosterModal.style.display === 'flex') {
            this.renderRosterList();
        }
    }

    storeResource(key, amount) {
        const capacity = this.resourceCapacity[key] || 100;
        this.resources[key] = Math.max(0, Math.min(capacity, (this.resources[key] || 0) + amount));
    }

    applyPerishableSpoilage() {
        const potteryReady = this.discovery && this.discovery.unlockedDiscoveries.has('pottery_discovery');
        // 每回合是一季；鮮食只做溫和消耗，避免 60 秒一季時人口很快餓死。
        const spoilRate = potteryReady ? 0.025 : 0.08;
        const livingPop = this.characters.filter(c => c.isAlive).length;
        const consumption = Math.min(this.resources.food || 0, Math.max(1, Math.ceil(livingPop * 0.75)));
        const fishShare = (this.resources.fish_shell || 0) + (this.resources.fruit || 0) > 0
            ? (this.resources.fish_shell || 0) / ((this.resources.fish_shell || 0) + (this.resources.fruit || 0)) : 0;
        const consumedFish = Math.min(this.resources.fish_shell || 0, Math.ceil(consumption * fishShare));
        const consumedFruit = Math.min(this.resources.fruit || 0, consumption - consumedFish);
        this.resources.fish_shell = Math.max(0, (this.resources.fish_shell || 0) - consumedFish);
        this.resources.fruit = Math.max(0, (this.resources.fruit || 0) - consumedFruit);
        this.resources.food = Math.max(0, (this.resources.food || 0) - consumedFish - consumedFruit);
        const fishLost = Math.floor((this.resources.fish_shell || 0) * spoilRate);
        const fruitLost = Math.floor((this.resources.fruit || 0) * spoilRate);
        const lost = fishLost + fruitLost;
        if (lost > 0 || consumption > 0) {
            this.resources.fish_shell = Math.max(0, this.resources.fish_shell - fishLost);
            this.resources.fruit = Math.max(0, this.resources.fruit - fruitLost);
            this.resources.food = Math.max(0, this.resources.food - lost);
            this.showToast(`🧺 回合結算：族人消耗 ${consumedFish + consumedFruit} 份食物，另有 ${lost} 份鮮食耗損${potteryReady ? '（燒陶保存，耗損降低）' : '；木材、石材不會耗損'}`);
        }
        this.updateMaterialInventory();
    }

    consumeWood(amount) {
        const available = Math.min(this.resources.timber || 0, this.resources.wood || 0);
        const used = Math.min(available, amount);
        this.resources.timber = Math.max(0, (this.resources.timber || 0) - used);
        this.resources.wood = Math.max(0, (this.resources.wood || 0) - used);
        return used;
    }

    consumeMaterials(cost) {
        const woodNeed = cost.wood || 0;
        const woodAvailable = Math.min(this.resources.timber || 0, this.resources.wood || 0);
        if (woodAvailable < woodNeed) return false;
        for (const [key, amount] of Object.entries(cost)) {
            if (key !== 'wood' && (this.resources[key] || 0) < amount) return false;
        }
        if (woodNeed) this.consumeWood(woodNeed);
        Object.entries(cost).forEach(([key, amount]) => {
            if (key !== 'wood') this.resources[key] -= amount;
        });
        this.updateMaterialInventory();
        return true;
    }

    updateCampfireFuel() {
        if (!this.chapter1?.isCampFireLit) {
            return;
        }
        // 火塘一旦建立就是部族的常駐核心；木材只改變火勢，不會讓火焰消失。
        if (this.fireLevel <= 0) {
            this.fireLevel = 3;
        }
        this.fireFuelFrame++;
        if (this.fireFuelFrame < 600) return;
        this.fireFuelFrame = 0;
        const burnRate = this.discovery?.unlockedDiscoveries.has('pottery_discovery') ? 2 : 1;
        const used = this.consumeWood(burnRate);
        this.fireLevel = used >= burnRate ? Math.max(1, this.fireLevel - 1) : 1;
        if (used < burnRate || Math.min(this.resources.timber || 0, this.resources.wood || 0) <= 0) {
            this.showToast('🔥 木材不足，火塘變得微弱；火焰仍會守住部族。請優先派人回森林採集木材。');
        } else if (this.discovery?.unlockedDiscoveries.has('pottery_discovery')) {
            this.showToast('🏺 燒陶讓火塘燃燒得更旺，木材消耗加快。');
        }
        this.updateMaterialInventory();
    }

    // ========================================================
    // 部族人員名冊與任務指派系統 (Roster Management)
    // ========================================================
    openRosterModal() {
        const modal = document.getElementById('modal-roster');
        if (!modal) return;
        this.renderRosterList();
        modal.style.display = 'flex';
    }

    closeRosterModal() {
        const modal = document.getElementById('modal-roster');
        if (modal) modal.style.display = 'none';
    }

    renderRosterList() {
        this.updatePopulationSummary();
        const listEl = document.getElementById('roster-members-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        this.characters.forEach(char => {
            const card = document.createElement('div');
            card.className = "paper-card p-3 bg-white/95 rounded-xl border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm";

            // 特性與優勢描述
            let specialtyBadge = "";
            if (char.gender === 'FEMALE' && char.age_stage === 'adult') {
                specialtyBadge = `<span class="text-[11px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">🌸 女性精巧：魚貝、野果採集產出多 (+75%)</span>`;
            } else if (char.age_stage === 'elder') {
                specialtyBadge = `<span class="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">👴 長老經驗：產出最高 (+80%)，耗30體力需回火塘休息</span>`;
            } else if (char.gender === 'MALE' && char.age_stage === 'adult') {
                specialtyBadge = `<span class="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">💪 男性粗重：採石、打製石器與重勞力有利 (+50%)</span>`;
            } else if (char.age_stage === 'child' || char.age_stage === 'youth') {
                specialtyBadge = `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">👦 成長傳承：拾石拾柴，跟長老學會才能獨立工作</span>`;
            } else if (char.age_stage === 'infant') {
                specialtyBadge = `<span class="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">👶 幼兒照料：營地觀察玩耍，不參與任何勞動</span>`;
            }

            // 體力條樣式
            const stamPct = char.maxStamina > 0 ? Math.round((char.stamina / char.maxStamina) * 100) : 0;
            let stamColor = "bg-emerald-500";
            if (stamPct < 30) stamColor = "bg-red-500";
            else if (stamPct < 60) stamColor = "bg-amber-500";

            // 當前狀態標籤
            let statusTag = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">待命中</span>`;
            if (char.state === 'RESTING') {
                statusTag = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">💤 營地休息中</span>`;
            } else if (char.state === 'RETURNING_HOME') {
                statusTag = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">🏕️ 返回住處</span>`;
            } else if (char.state === 'WORKING' || char.state === 'WALKING_TO_STATION') {
                statusTag = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">🔨 工作中</span>`;
            } else if (char.currentTask === 'LEARN' && ['WALKING_TO_STATION', 'WORKING', 'FOLLOWING'].includes(char.state)) {
                statusTag = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">📚 跟長老學習</span>`;
            } else if (char.currentTask === 'TEACH' && ['WALKING_TO_STATION', 'WORKING'].includes(char.state)) {
                statusTag = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">🗣️ 火塘教學中</span>`;
            }
            if (char.researchCooldownRounds > 0) {
                statusTag = `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">🔎 研究整理中（${char.researchCooldownRounds}）</span>`;
            }

            // 技能標籤
            const skillsList = (char.skills || []).map(s => {
                const map = {
                    find_stone: "🪨 挑石",
                    stone_tool: "🔨 打石器",
                    gather: "🍒 採集",
                    firewood: "🪵 拾柴"
                };
                return `<span class="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded border border-stone-200">${map[s] || s}</span>`;
            }).join(" ");

            // 任務指派按鈕
            const busy = ['WALKING_TO_STATION', 'WORKING', 'RETURNING_HOME'].includes(char.state);
            const canWork = char.isAlive && char.age_stage !== 'infant' && char.stamina >= 15 && !busy;
            const workButtons = char.age_stage === 'child' ? `
                <button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'GATHER_WOOD')" title="小孩短時間拾取輕量柴枝">🪵 撿小柴</button>
                <button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'GATHER_FRUIT')" title="小孩短時間採集低處野果">🍎 採小果</button>
                <button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'COASTAL_GATHER')" title="小孩跟著大人撿拾安全魚貝">🐚 撿魚貝</button>
                <button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'LEARN')" title="回居住地跟著長老學習">📚 跟長老學習</button>
                <button class="roster-task-btn rest" onclick="game.assignRosterTask('${char.id}', 'REST')" title="小孩需要更常休息">⛺ 休息</button>
            ` : `
                <button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'COASTAL_GATHER')" title="派遣前往潮間帶撿拾魚貝（面向右方大海，平緩俯身動作）">🐚 潮間撿拾</button>
                <button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'STRIKE_STONE')" title="派遣前往巨石灘採石與打製砍砸器">🪨 採集打石</button>
                <button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'GATHER_WOOD')" title="派遣前往森林撿拾柴火">🪵 撿拾柴火</button>
                <button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'GATHER_FRUIT')" title="派遣前往森林採集野果與塊根">🍒 採集野果</button>
                ${char.age_stage === 'elder' ? `<button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'TEACH')" title="回居住地教導小孩既有技術">🗣️ 教學</button>` : ''}
                ${this.unlockedWorkCircles.has('MAKE_TOOLS') ? `<button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'MAINTAIN_TOOLS')" title="回居住地維護石器與木柄">🛠️ 維護工具</button>` : ''}
                ${this.unlockedWorkCircles.has('WEAVE_NET') ? `<button class="roster-task-btn" onclick="game.assignRosterTask('${char.id}', 'REPAIR_NET')" title="回居住地修補漁網">🕸️ 修補漁網</button>` : ''}
                <button class="roster-task-btn rest" onclick="game.assignRosterTask('${char.id}', 'REST')" title="返回八仙洞火塘休息恢復體力">⛺ 火塘休息</button>
            `;
            let actionButtons = '';
            if (busy) {
                actionButtons = `<span class="text-xs text-sky-700 font-bold">🏕️ 正在工作；點擊下方指令可立即改派</span><div class="flex flex-wrap gap-1.5 justify-end">${workButtons}</div>`;
            } else if (canWork) {
                actionButtons = `
                    <div class="flex flex-wrap gap-1.5 justify-end">
                        ${workButtons}
                    </div>
                `;
            } else if (char.age_stage === 'infant') {
                actionButtons = `<span class="text-xs text-stone-500 font-bold">留在營地觀察與玩耍 👶</span>`;
            } else if (char.stamina < 15) {
                actionButtons = `
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-red-600 font-bold">體力透支</span>
                        <button class="roster-task-btn rest" onclick="game.assignRosterTask('${char.id}', 'REST')">
                            ⛺ 回火塘休息
                        </button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="flex items-center gap-3 w-full md:w-auto">
                    <img src="${this.getFaceImagePath(char)}" class="w-12 h-12 rounded-full border-2 border-white shadow bg-amber-50 object-contain flex-shrink-0">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-black text-sm text-amber-950">${char.name}</span>
                            <span class="text-xs font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">${char.ageGroup}</span>
                            ${char.isLeader ? '<span class="text-xs font-bold text-amber-600">👑 帶頭者</span>' : ''}
                            ${statusTag}
                        </div>
                        <div class="mt-1">${specialtyBadge}</div>
                        <div class="flex items-center gap-1.5 mt-1 text-[11px] text-stone-600">
                            <span>技能:</span>
                            ${skillsList || '<span class="text-[10px] text-stone-400">尚無</span>'}
                        </div>
                    </div>
                </div>

                <div class="flex flex-col md:items-end w-full md:w-auto gap-2">
                    <div class="w-full md:w-48">
                        <div class="flex justify-between text-[11px] font-bold text-stone-700 mb-0.5">
                            <span>體力值 (Stamina)</span>
                            <span>${Math.round(char.stamina)} / ${char.maxStamina}</span>
                        </div>
                        <div class="w-full h-2 bg-stone-200 rounded-full overflow-hidden border border-stone-300">
                            <div class="h-full ${stamColor} transition-all duration-300" style="width: ${stamPct}%"></div>
                        </div>
                    </div>
                    ${actionButtons}
                </div>
            `;

            listEl.appendChild(card);
        });
    }

    assignRosterTask(charId, taskType) {
        const char = this.characters.find(c => c.id === charId);
        if (!char || !char.isAlive) return;

        // 玩家改派工作時，取消這名族人的洞穴研究，避免研究指令和新工作同時存在。
        Object.entries(this.researchAssignments).forEach(([researchId, assignment]) => {
            if (researchId !== 'festival' && assignment?.charId === char.id) delete this.researchAssignments[researchId];
        });
        if (taskType !== 'RESEARCH') char.researchTopic = null;

        if (taskType === 'REST') {
            char.assignedTask = null;
            char.state = 'RESTING';
            char.targetStation = null;
            char.currentTask = 'WANDER';
            char.autoWorkCooldown = 0;
            char.wanderTargetX = 260 + (Math.random() - 0.5) * 50;
            char.say("回火塘烤火歇歇腿...", "⛺", 140);
            this.sound.playTone(390, 'sine', 0.1, 0.2);
            this.showToast(`⛺【${char.name}】已返回八仙洞火塘休息！`);
            this.renderRosterList();
            return;
        }

        if (char.age_stage === 'infant') {
            this.showToast(`👶【${char.name}】還在幼兒照料期，先留在居住地成長。`);
            this.renderRosterList();
            return;
        }

        if (taskType === 'LEARN') {
            if (char.age_stage !== 'child') {
                this.showToast('📚 只有小孩需要跟著長老學習。');
                return;
            }
            const elder = this.characters.find(c => c.isAlive && c.age_stage === 'elder');
            if (!elder) {
                this.showToast('目前沒有可請教的長老。');
                return;
            }
            this.assignHomeTeachingTask(char, 'LEARN', elder, true);
            this.showToast(`📚【${char.name}】開始跟著【${elder.name}】學習。`);
            this.renderRosterList();
            return;
        }

        if (taskType === 'TEACH') {
            if (char.age_stage !== 'elder') {
                this.showToast('🗣️ 只有老人可以執行教學工作。');
                return;
            }
            const learner = this.characters.find(c => c.isAlive && c.age_stage === 'child' && c.state !== 'WORKING');
            if (!learner) {
                this.showToast('目前沒有可在居住地學習的小孩。');
                return;
            }
            this.assignHomeTeachingTask(char, 'TEACH', learner, true);
            learner.teacher = char;
            this.showToast(`🗣️【${char.name}】回居住地教導【${learner.name}】。`);
            this.renderRosterList();
            return;
        }

        let targetStation = null;
        if (taskType === 'COASTAL_GATHER') {
            targetStation = this.workstations.find(st => st.actionType === 'COASTAL_GATHER') || this.workstations.find(st => st.id === 'coastal_shellfish');
        } else if (taskType === 'STRIKE_STONE') {
            targetStation = this.workstations.find(st => st.actionType === 'STRIKE_STONE') || this.workstations.find(st => st.id === 'pebble_quarry');
        } else if (taskType === 'GATHER_WOOD') {
            targetStation = this.workstations.find(st => st.actionType === 'GATHER_WOOD') || this.workstations.find(st => st.id === 'forest_wood');
        } else if (taskType === 'GATHER_FRUIT') {
            targetStation = this.workstations.find(st => st.actionType === 'GATHER_FRUIT') || this.workstations.find(st => st.id === 'wild_bushes');
        } else {
            const tech = Object.values(this.techWorkDefinitions).find(item => item.id === taskType && this.unlockedWorkCircles.has(item.id));
            const maintenance = this.maintenanceWorkDefinitions[taskType];
            const definition = tech || maintenance;
            if (definition) targetStation = this.workstations.find(st => st.id === definition.station);
        }

        if (targetStation) {
            char.assignStation(targetStation, true);
            this.sound.playTone(660, 'triangle', 0.15, 0.2);
            this.showToast(`🏃 已派遣【${char.name}】前往【${targetStation.name}】！`);
            this.renderRosterList();
        }
    }

    // 角色完成一輪並休息後，依照最後一次名冊指令自動再出工。
    autoResumeAssignedWork() {
        for (const char of this.characters) {
            if (!char.isAlive || !char.assignedTask || char.state !== 'IDLE' || char.autoWorkCooldown > 0) continue;
            if (char.stamina < 15 || char.age_stage === 'infant') continue;
            if (char.assignedTask === 'LEARN') {
                const elder = char.teacher || this.characters.find(c => c.isAlive && c.age_stage === 'elder');
                if (elder) this.assignHomeTeachingTask(char, 'LEARN', elder);
                continue;
            }
            if (char.assignedTask === 'TEACH') {
                const learner = this.characters.find(c => c.isAlive && c.age_stage === 'child');
                if (learner) this.assignHomeTeachingTask(char, 'TEACH', learner);
                continue;
            }
            const station = this.workstations.find(st => st.actionType === char.assignedTask);
            if (station) char.assignStation(station);
        }
    }

    startRoundTimeline() {
        clearInterval(this.roundTimerHandle);
        this.roundNumber = 1;
        this.seasonIndex = 0;
        this.yearNumber = 1;
        this.syncSeasonToDisasterSystem();
        this.roundSecondsRemaining = this.roundDurationSeconds;
        const timeline = document.getElementById('round-timeline');
        if (timeline) timeline.style.display = 'block';
        this.renderRoundTimeline();
        this.restartRoundTicker();
    }

    restartRoundTicker() {
        clearInterval(this.roundTimerHandle);
        if (!this.chapter1 || this.chapter1.state !== 'ROUND1_SURVIVE') return;
        this.roundTimerHandle = setInterval(() => this.tickRoundTimeline(), 1000 / this.gameSpeed);
    }

    toggleGameSpeed() {
        const speeds = [1, 2, 4];
        const nextIndex = (speeds.indexOf(this.gameSpeed) + 1) % speeds.length;
        this.gameSpeed = speeds[nextIndex];
        this.restartRoundTicker();
        const button = document.getElementById('game-speed-btn');
        if (button) button.innerHTML = `<span>${this.gameSpeed === 1 ? '▶' : '▶'.repeat(this.gameSpeed / 2 + 1)} ${this.gameSpeed}x</span>`;
        this.showToast(`⏩ 遊戲速度：${this.gameSpeed}x`);
    }

    tickRoundTimeline() {
        if (!this.chapter1 || this.chapter1.state !== 'ROUND1_SURVIVE') return;
        this.roundSecondsRemaining--;
        this.renderRoundTimeline();
        if (this.roundSecondsRemaining <= 0) {
            this.completeTimedRound();
        }
    }

    completeTimedRound() {
        clearInterval(this.roundTimerHandle);
        this.roundTimerHandle = null;
        this.applyPerishableSpoilage();
        if (this.inheritance) this.inheritance.advanceRound();
        this.advanceTechnologyProgress();
        this.checkFestivalReadiness();
        this.characters.forEach(char => {
            if (char.researchCooldownRounds > 0) char.researchCooldownRounds--;
        });
        this.roundNumber++;
        this.advanceSeason();
        if (this.inheritance?.updateStabilityUI) this.inheritance.updateStabilityUI();
        if (this.deathRitual?.active) {
            this.deathRitual.roundsRemaining--;
            if (this.deathRitual.roundsRemaining <= 0) this.finishElderDeathRitual();
        }
        this.roundSecondsRemaining = this.roundDurationSeconds;
        if (this.chapter1) {
            this.chapter1.updateHeaderBanner(
                `第 ${this.roundNumber} 回合｜持續生活`,
                '族人依照名冊指令工作、休息與回到住處；你可以點角色更換工作。'
            );
        }
        this.renderRoundTimeline();
        this.restartRoundTicker();
        this.queueNpcDialogue();
        this.showToast(`⏱️ 第 ${this.roundNumber - 1} 回合結束，進入第 ${this.roundNumber} 回合！`);
    }

    getSeasonLabel() {
        return this.seasonNames[this.seasonIndex] || '春季';
    }

    syncSeasonToDisasterSystem() {
        if (this.disasterSystem && this.disasterSystem.setSeason) {
            this.disasterSystem.setSeason(this.seasonIndex, this.yearNumber, (msg) => this.showToast(msg));
        }
    }

    advanceSeason() {
        this.seasonIndex = (this.seasonIndex + 1) % this.seasonNames.length;
        if (this.seasonIndex === 0) {
            this.yearNumber++;
            for (const char of this.characters) {
                if (char.isAlive && char.advanceAge) char.advanceAge(1);
            }
            this.showToast(`📅 四季走完，部族迎來第 ${this.yearNumber} 年！`);
        }
        this.syncSeasonToDisasterSystem();
    }

    registerTechnologyDiscovery(discoveryId) {
        const tech = this.techWorkDefinitions[discoveryId];
        if (!tech || this.unlockedWorkCircles.has(tech.id)) return;
        if (this.techProgress[tech.id] === undefined) this.techProgress[tech.id] = 0;
        this.renderTechWorkCircles();
        this.renderSkillTree();
        this.showToast(`🧠 已收納【${tech.label}】構想，還需要兩次回合結束完成技術。`);
    }

    advanceTechnologyProgress() {
        // 研究不是一個工作循環就完成：必須讓同一名 NPC 在洞穴留守，
        // 跑完兩次橫向小回合時間軸，才完成一項技術。
        Object.entries(this.researchAssignments).forEach(([researchId, assignment]) => {
            if (researchId === 'festival') return;
            assignment.rounds = (assignment.rounds || 0) + 1;
            const tech = this.techWorkDefinitions[researchId];
            if (!tech || this.unlockedWorkCircles.has(tech.id)) return;

            this.techProgress[tech.id] = Math.min(2, assignment.rounds);
            const researcher = this.characters.find(char => char.id === assignment.charId && char.isAlive);
            if (assignment.rounds >= 2) {
                this.unlockedWorkCircles.add(tech.id);
                if (researcher && researcher.currentTask === 'RESEARCH') {
                    researcher.researchTopic = null;
                    researcher.assignedTask = null;
                    researcher.currentTask = 'WANDER';
                    researcher.targetStation = null;
                    researcher.state = 'IDLE';
                    researcher.say(`我完成了「${tech.label}」的研究！可以開始使用這項技術了。`, '✨', 240);
                }
                delete this.researchAssignments[researchId];
                this.showToast(`✨ 技術完成：【${tech.icon} ${tech.label}】研究完成，工作圈已啟動！`);
            }
        });
        this.renderTechWorkCircles();
        this.renderSkillTree();
        this.renderQuickRoster();
    }

    renderTechWorkCircles() {
        const el = document.getElementById('tech-work-circles');
        if (!el) return;
        const unique = Object.values(this.techWorkDefinitions)
            .filter((tech, index, list) => list.findIndex(item => item.id === tech.id) === index);
        const actionEl = document.getElementById('quick-tech-actions');
        if (actionEl) {
            actionEl.innerHTML = unique
                .filter(tech => this.unlockedWorkCircles.has(tech.id))
                .map(tech => '<button class="round1-action-btn compact tech-action-btn" onclick="game.assignTechWork(\'' + tech.id + '\')" title="' + tech.location + '：' + tech.label + '">' + tech.icon + ' ' + tech.label + '</button>')
                .join('');
        }
        el.innerHTML = unique.filter(tech => this.unlockedWorkCircles.has(tech.id) || this.techProgress[tech.id] !== undefined)
            .map(tech => {
                const unlocked = this.unlockedWorkCircles.has(tech.id);
                const progress = this.techProgress[tech.id] || 0;
                return unlocked
                    ? `<button class="tech-work-circle" onclick="game.assignTechWork('${tech.id}')" title="${tech.location}：${tech.label}"><span>${tech.icon}</span><b>${tech.label}</b><small>${tech.location}</small></button>`
                    : `<div class="tech-work-circle researching"><span>🧠</span><b>${tech.label}</b><small>研究進度 ${progress}/2</small></div>`;
            }).join('');
    }

    assignTechWork(taskType) {
        const tech = Object.values(this.techWorkDefinitions).find(item => item.id === taskType);
        if (!tech || !this.unlockedWorkCircles.has(taskType)) return;
        this.assignQuickTask(taskType);
    }

    startFestivalResearch() {
        if (this.festivalUnlocked) {
            this.showToast('🔥 火塘祭典已經可以舉行。');
            return;
        }
        const hasFire = this.chapter1?.isCampFireLit;
        const enoughCulture = this.unlockedWorkCircles.size >= 2;
        const hasTeaching = (this.behaviorStats.learning || 0) > 0;
        if (!hasFire || !enoughCulture || !hasTeaching) {
            this.showToast('祭典需要：穩定火塘、至少兩項完成技術，並且先有一次教學或學習傳承。');
            return;
        }
        const container = document.getElementById('skill-tree-content');
        const workers = this.characters.filter(char => char.isAlive && char.age_stage !== 'infant');
        const existing = document.getElementById('research-picker');
        if (existing) existing.remove();
        const picker = document.createElement('section');
        picker.id = 'research-picker';
        picker.className = 'research-picker';
        picker.innerHTML = `<h3>🔥 誰來整理「火塘祭典」的傳說？</h3><p>先選擇一位族人，再按下確定；完成後全族可以圍著火堆跳舞，並留下部族神話。</p><div class="research-picker-list">${workers.map(char => `<button class="research-picker-choice" data-researcher-id="${char.id}" onclick="game.selectResearcher('festival', '${char.id}')"><img src="${this.getFaceImagePath(char, 'normal')}" alt="${char.name}"><span>${char.name}<small>${char.ageGroup}｜${char.assignedTask || '待命'}</small></span></button>`).join('')}</div><button id="research-confirm-btn" class="paper-btn primary text-xs" disabled onclick="game.confirmResearchSelection()">✅ 確定派遣</button>`;
        container?.prepend(picker);
        picker?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    checkFestivalReadiness() {
        if (this.festivalUnlocked || this.festivalActive || this.deathRitual) return;
        if (!this.chapter1?.isCampFireLit) return;

        const fish = this.resources.fish_shell || 0;
        const fruit = this.resources.fruit || 0;
        const foodReady = (this.resources.food || 0) >= 80 || ((fish + fruit) / 200) * 100 >= 80;
        const enoughCulture = this.unlockedWorkCircles.size >= 2;
        const hasTeaching = (this.behaviorStats.learning || 0) > 0;
        if (!foodReady || !enoughCulture || !hasTeaching) return;

        const leader = (this.chapter1?.leader?.isAlive ? this.chapter1.leader : null)
            || this.characters.find(char => char.isAlive && char.isLeader)
            || this.characters.find(char => char.isAlive && char.age_stage === 'elder')
            || this.characters.find(char => char.isAlive && char.age_stage !== 'infant');
        if (!leader) return;

        leader.say('火塘、食物和大家學會的本領都準備好了；我們來舉行一回合祭典吧！', '🔥', 300);
        this.showToast(`🔥【${leader.name}】宣布祭典準備完成，族人回到火塘圍舞！`);
        this.startFestival(leader.id);
    }

    buildFestivalMyth() {
        const discovered = this.discovery?.unlockedDiscoveries || new Set();
        const images = [];
        if (this.chapter1?.isCampFireLit) images.push('不熄的火塘守護著洞穴');
        if (discovered.has('fiber_discovery') || this.unlockedWorkCircles.has('WEAVE_NET')) images.push('森林把柔韌的纖維交給人們');
        if (discovered.has('sharp_stone_discovery') || this.unlockedWorkCircles.has('MAKE_TOOLS')) images.push('尖石教會我們分辨工具與普通石頭');
        if (discovered.has('bone_hook_discovery') || this.unlockedWorkCircles.has('FISHING')) images.push('海浪把魚骨送來，讓人們學會等待大魚');
        if (this.unlockedWorkCircles.has('POTTERY')) images.push('黏土在火中變成能保存食物的器皿');
        if ((this.behaviorStats.learning || 0) > 0) images.push('長老把記憶唱給孩子，孩子再唱給下一代');
        return images.slice(0, 3).join('；') || '火光讓我們記住彼此，也記住活下來的方法';
    }

    startFestival(charId) {
        const researcher = this.characters.find(char => char.id === charId && char.isAlive && char.age_stage !== 'infant');
        const station = this.workstations.find(item => item.id === 'cave_camp');
        if (!researcher || !station) return;
        this.festivalUnlocked = true;
        this.researchAssignments.festival = { charId, rounds: 0 };
        researcher.researchTopic = 'FESTIVAL';
        this.showToast(`🔥【${researcher.name}】完成祭典研究！全族準備回到火塘。`);
        this.festivalActive = true;
        if (this.sound.playFestivalMusic) this.sound.playFestivalMusic();
        // 祭典持續一個完整回合；若在回合結算瞬間啟動，至少保留一回合長度。
        const festivalSeconds = Math.max(this.roundDurationSeconds, this.roundSecondsRemaining || 0);
        this.festivalEndAt = Date.now() + (festivalSeconds * 1000 / Math.max(1, this.gameSpeed));
        this.behaviorStats.technology++;
        const participants = this.characters.filter(char => char.isAlive && char.age_stage !== 'infant');
        participants.forEach((char, index) => {
            char.targetStation = station;
            char.laneOffset = 0;
            char.axisY = station.y + 15;
            char.currentTask = 'FESTIVAL';
            char.assignedTask = 'FESTIVAL';
            char.workTimer = 0;
            char.workDuration = 1200;
            char.festivalCenterX = station.x;
            char.festivalCenterY = station.y + 8;
            char.festivalRadius = 65 + (index % 3) * 24;
            char.festivalAngle = (Math.PI * 2 * index) / participants.length;
            char.state = 'WALKING_TO_STATION';
            char.say(index === 0 ? '火塘祭典開始了！' : '我聽見大家的歌聲了！', '🔥', 220);
        });
        this.renderSkillTree();
        this.showFestivalMyth();
    }

    selectResearcher(type, charId) {
        this.pendingResearchSelection = { type, charId };
        document.querySelectorAll('.research-picker-choice').forEach(button => {
            button.classList.toggle('selected', button.dataset.researcherId === charId);
        });
        const confirm = document.getElementById('research-confirm-btn');
        if (confirm) confirm.disabled = false;
    }

    confirmResearchSelection() {
        const selection = this.pendingResearchSelection;
        if (!selection) return;
        this.pendingResearchSelection = null;
        if (selection.type === 'festival') this.startFestival(selection.charId);
        else this.startCharacterResearch(selection.type.split(':')[1], selection.charId);
    }

    showFestivalMyth() {
        const modal = document.getElementById('modal-festival');
        if (!modal) return;
        const text = document.getElementById('festival-myth-text');
        if (text) text.innerText = `「${this.buildFestivalMyth()}。」`;
        const subtitle = document.getElementById('festival-myth-subtitle');
        if (subtitle) subtitle.innerText = `第 ${this.roundNumber} 回合・火塘祭典｜族人把生活經驗說成故事`;
        modal.style.display = 'flex';
    }

    closeFestivalMyth() {
        const modal = document.getElementById('modal-festival');
        if (modal) modal.style.display = 'none';
    }

    finishFestival() {
        if (!this.festivalActive) return;
        this.festivalActive = false;
        if (this.sound.stopSpecialMusic) this.sound.stopSpecialMusic();
        this.characters.filter(char => char.currentTask === 'FESTIVAL').forEach(char => {
            char.currentTask = 'WANDER';
            char.assignedTask = null;
            char.targetStation = null;
            char.state = 'RETURNING_HOME';
            char.wanderTargetX = char.homeX;
            char.roundStories = char.roundStories || [];
            char.roundStories.push(`我們圍著火塘跳舞，記住了這個傳說：${this.buildFestivalMyth()}。`);
        });
        this.showToast('🌙 祭典結束，神話傳說已經成為部族共同記憶。');
        this.renderSkillTree();
    }

    startElderDeathRitual(elder) {
        if (!elder || this.deathRitual) return;
        const leader = (this.chapter1?.leader?.isAlive ? this.chapter1.leader : null) || this.characters.find(char => char.isAlive && char.isLeader) || this.characters.find(char => char.isAlive && char.age_stage !== 'infant');
        if (!leader) return;
        this.deathRitual = { elder, leader, awaitingConfirmation: true, active: false, roundsRemaining: 0 };
        leader.say(`我們要用魚和果實送長老走完最後一段路，請大家回到火塘。`, '🕯️', 260);
        const modal = document.getElementById('modal-death-ritual');
        if (modal) {
            const elderName = document.getElementById('death-elder-name');
            const leaderName = document.getElementById('death-leader-name');
            const food = document.getElementById('death-food-status');
            if (elderName) elderName.innerText = elder.name;
            if (leaderName) leaderName.innerText = leader.name;
            if (food) food.innerText = `魚貝 ${this.resources.fish_shell || 0}/100＋水果 ${this.resources.fruit || 0}/100（已達 80% 儀式準備）`;
            modal.style.display = 'flex';
        }
    }

    confirmElderDeathRitual() {
        if (!this.deathRitual?.awaitingConfirmation) return;
        const ritual = this.deathRitual;
        ritual.awaitingConfirmation = false;
        ritual.active = true;
        if (this.sound.playFuneralMusic) this.sound.playFuneralMusic();
        ritual.roundsRemaining = 1;
        const modal = document.getElementById('modal-death-ritual');
        if (modal) modal.style.display = 'none';
        const station = this.workstations.find(item => item.id === 'cave_camp');
        const participants = this.characters.filter(char => char.isAlive && char.age_stage !== 'infant' && char !== ritual.elder);
        participants.forEach((char, index) => {
            char.targetStation = station;
            char.laneOffset = 0;
            char.axisY = station.y + 15;
            char.currentTask = 'FUNERAL';
            char.assignedTask = 'FUNERAL';
            char.workTimer = 0;
            char.workDuration = 999999;
            char.festivalCenterX = station.x;
            char.festivalCenterY = station.y + 8;
            char.festivalRadius = 65 + (index % 3) * 24;
            char.festivalAngle = (Math.PI * 2 * index) / Math.max(1, participants.length);
            char.state = 'WALKING_TO_STATION';
            char.say(index === 0 ? '我們圍著火塘送長老走最後一程。' : '我會記住長老教過的事。', '🕯️', 240);
        });
        ritual.elder.targetStation = station;
        ritual.elder.x = station.x;
        ritual.elder.y = station.y;
        ritual.elder.state = 'FROZEN';
        ritual.elder.currentTask = 'FUNERAL';
        ritual.story = `部族以魚與果實設宴，圍著火塘跳舞，送${ritual.elder.name}回到祖先身邊。`;
        this.showFestivalMyth();
        const text = document.getElementById('festival-myth-text');
        if (text) text.innerText = `「${ritual.story}從今以後，${this.buildFestivalMyth()}。」`;
        const subtitle = document.getElementById('festival-myth-subtitle');
        if (subtitle) subtitle.innerText = '告別祭典・葬禮儀式開始｜本回合完成後安葬於居住地旁';
        this.showToast(`🕯️【${ritual.elder.name}】的告別祭典開始，持續一回合。`);
    }

    finishElderDeathRitual() {
        const ritual = this.deathRitual;
        if (!ritual?.active) return;
        if (this.sound.stopSpecialMusic) this.sound.stopSpecialMusic();
        const elder = ritual.elder;
        elder.isAlive = false;
        elder.state = 'DEAD';
        elder.currentTask = 'WANDER';
        elder.assignedTask = null;
        const station = this.workstations.find(item => item.id === 'cave_camp');
        this.burialMounds.push({ x: (station?.x || 260) + 95, y: station?.y || 500, name: elder.name });
        this.spiritualTechs.add('ancestor_prayer');
        this.spiritualTechs.add('burial_ritual');
        if (this.inheritance) this.inheritance.checkKnowledgeContinuity(elder);
        this.characters.filter(char => char.isAlive && char.currentTask === 'FUNERAL').forEach(char => {
            char.currentTask = 'WANDER';
            char.assignedTask = null;
            char.targetStation = null;
            char.state = 'RETURNING_HOME';
            char.wanderTargetX = char.homeX;
            char.roundStories = char.roundStories || [];
            char.roundStories.push(`我們完成了告別祭典，${elder.name}的土堆留在居住地旁；接下來要用祈禱和故事記住他。`);
        });
        ritual.active = false;
        this.deathRitual = null;
        this.showToast(`🪨【${elder.name}】已安葬在居住地旁，解鎖「神靈祈禱」與「葬禮儀式」文化。`);
        this.updatePopulationSummary();
        this.renderQuickRoster();
        this.renderSkillTree();
        const nextElder = this.characters.find(char => char.isAlive && char.age_stage === 'elder' && char.elderYears >= 10 && char.deathScheduled);
        if (nextElder) this.startElderDeathRitual(nextElder);
    }

    // 每回合只安排一位族人回報；玩家點擊底部持續晃動的頭像後，才開啟對談。
    queueNpcDialogue() {
        const candidates = this.characters.filter(c => c.isAlive && c.age_stage !== 'infant' && (
            (c.roundFindings && c.roundFindings.length) ||
            (c.roundStories && c.roundStories.length) ||
            c.pendingDiscoveryId
        ));
        const speaker = candidates[Math.floor(Math.random() * candidates.length)] || this.characters.find(c => c.isAlive && c.age_stage !== 'infant');
        this.pendingNpcTalkId = speaker ? speaker.id : null;
        this.renderQuickRoster();
        if (speaker) this.showToast(`💬【${speaker.name}】好像有新的發現，點擊下方晃動的頭像聽取情資。`);
    }

    renderRoundTimeline() {
        const fill = document.getElementById('round-timeline-fill');
        const label = document.getElementById('round-timeline-label');
        const yearLabel = document.getElementById('round-year-label');
        const countdown = document.getElementById('round-timeline-countdown');
        const yearCount = document.getElementById('year-tally-count');
        const yearSticks = document.getElementById('year-tally-sticks');
        const elapsed = this.roundDurationSeconds - this.roundSecondsRemaining;
        if (fill) fill.style.width = `${Math.max(0, Math.min(100, elapsed / this.roundDurationSeconds * 100))}%`;
        if (label) label.innerText = `第 ${Math.max(1, this.roundNumber)} 回合時間軸`;
        if (yearLabel) yearLabel.innerText = `第 ${Math.max(1, this.yearNumber || 1)} 年`;
        if (countdown) countdown.innerText = this.roundSecondsRemaining % 10 === 0
            ? `倒數 ${this.roundSecondsRemaining} 秒`
            : `剩餘 ${this.roundSecondsRemaining} 秒`;

        // 一年完成四季後留下 1 根實色石棒；目前正在走的年份先以淡色石棒顯示，
        // 讓學生從第一年開始就能看見原始計年方式。
        const completedYears = Math.max(0, (this.yearNumber || 1) - 1);
        if (yearCount) yearCount.innerText = completedYears;
        if (yearSticks) {
            const visibleYears = Math.max(1, this.yearNumber || 1);
            yearSticks.innerHTML = Array.from({ length: visibleYears }, (_, index) =>
                `<span class="year-tally-stick${index >= completedYears ? ' current' : ''}" title="第 ${index + 1} 年${index >= completedYears ? '（進行中）' : ''}"></span>`
            ).join('');
        }
    }

    openNpcDialogue(speakerOverride = null, isWorkReport = false) {
        const modal = document.getElementById('modal-npc-dialogue');
        if (!modal || document.getElementById('modal-discovery')?.style.display === 'flex') return;
        const workers = this.characters.filter(c => c.isAlive && c.assignedTask && ['WORKING', 'WALKING_TO_STATION', 'RETURNING_HOME'].includes(c.state));
        const pendingSpeaker = this.characters.find(c => c.id === this.pendingNpcTalkId && c.isAlive);
        const speaker = speakerOverride || pendingSpeaker || workers[Math.floor(Math.random() * workers.length)] || this.characters.find(c => c.isAlive && c.age_stage !== 'infant');
        if (!speaker) return;
        const taskText = { GATHER_WOOD: '整理柴火時', GATHER_FRUIT: '採集野果時', STRIKE_STONE: '敲打石材時', COASTAL_GATHER: '撿拾魚貝時', RIVER_SEARCH: '沿森林河畔搜索時', LEARN: '回居住地學習時', TEACH: '在火塘旁教學時', RESEARCH: '留在洞穴研究時' }[speaker.assignedTask] || '工作的時候';
        const lines = [
            `${taskText}，我好像摸到了一點新的門道……`,
            `這裡的材料有規律，或許能變成更好用的技巧。`,
            `我先繼續做做看，你要不要把這個想法記進部族的技巧？`
        ];
        const face = document.getElementById('npc-dialogue-face');
        if (face) face.src = this.getFaceImagePath(speaker, 'happy');
        const name = document.getElementById('npc-dialogue-name');
        if (name) name.innerText = speaker.name;
        const title = document.getElementById('npc-dialogue-title');
        if (title) title.innerText = isWorkReport ? '工作報告' : '族人來報告了！';
        const stories = [...new Set(speaker.roundStories || [])];
        const pendingDiscovery = this.discovery?.getPendingReportDiscovery(speaker);
        const possible = {
            GATHER_WOOD: '植物纖維、搓繩與編織',
            GATHER_FRUIT: '辨識食物與保存方法',
            STRIKE_STONE: '石刀、石斧與其他石器',
            COASTAL_GATHER: '骨鉤、魚貝裝飾與漁獵',
            FISHING: '更穩定的漁獵技術',
            GRIND_STONE: '打磨玉石與裝飾品',
            POTTERY: '陶器與食物保存',
            LEARN: '把長老的生活技術記下來',
            TEACH: '把既有技術傳給下一代'
        }[speaker.assignedTask];
        const findingText = pendingDiscovery
            ? `「${pendingDiscovery.speech}」${pendingDiscovery.story}`
            : (stories.length
                ? `${stories.slice(-2).join(' ')}${possible ? ` 也許這能發展成「${possible}」。` : ''}`
                : lines[Math.floor(Math.random() * lines.length)]);
        const text = document.getElementById('npc-dialogue-text');
        if (text) text.innerText = `「${findingText}」`;
        const findingEl = document.getElementById('npc-dialogue-findings');
        if (findingEl) findingEl.innerHTML = pendingDiscovery
            ? `<span class="npc-story-hint">💡 新線索：${pendingDiscovery.name}｜請從下方選擇研究方向</span>`
            : (possible === '辨識食物與保存方法'
                ? `<button class="npc-story-hint npc-story-action" onclick="game.assignRiverSearchFromReport('${speaker.id}')">💡 可能發展：${possible}｜點擊派往森林河畔搜索</button>`
                : (possible ? `<span class="npc-story-hint">💡 可能發展：${possible}</span>` : ''));
        const task = document.getElementById('npc-dialogue-task');
        if (task) task.innerText = `${speaker.ageGroup}｜目前指令：${speaker.assignedTask || '營地休息'}`;
        const actions = document.getElementById('npc-dialogue-actions');
        if (actions) {
            const choices = speaker.age_stage === 'child'
                ? [
                    ['GATHER_WOOD', '🪵 撿小柴'], ['GATHER_FRUIT', '🍎 採小果'],
                    ['COASTAL_GATHER', '🐚 撿魚貝'], ['LEARN', '📚 跟長老學習'], ['REST', '⛺ 火塘休息']
                ]
                : [
                    ['GATHER_WOOD', '🪵 拾柴'], ['GATHER_FRUIT', '🍎 採果'],
                    ['STRIKE_STONE', '🪨 採石'], ['COASTAL_GATHER', '🐚 撿魚貝'], ['REST', '⛺ 火塘休息']
                ];
            if (speaker.age_stage === 'elder') choices.splice(choices.length - 1, 0, ['TEACH', '🗣️ 教學']);
            if (speaker.age_stage !== 'child') {
                Object.values(this.techWorkDefinitions).filter((tech, index, list) => list.findIndex(item => item.id === tech.id) === index && this.unlockedWorkCircles.has(tech.id))
                    .forEach(tech => choices.push([tech.id, `${tech.icon} ${tech.label}`]));
                if (this.unlockedWorkCircles.has('MAKE_TOOLS')) choices.push(['MAINTAIN_TOOLS', '🛠️ 維護工具']);
                if (this.unlockedWorkCircles.has('WEAVE_NET')) choices.push(['REPAIR_NET', '🕸️ 修補漁網']);
            }
            const researchCard = pendingDiscovery ? `
                <section class="npc-research-card">
                    <div class="npc-research-title">${pendingDiscovery.icon} 這個發現可以發展成什麼？</div>
                    <p>${pendingDiscovery.question}</p>
                    <div class="npc-research-options">
                        <button class="npc-research-choice correct" onclick="game.chooseReportDiscovery('${speaker.id}', '${pendingDiscovery.id}', true)">${pendingDiscovery.correctOption.text}</button>
                        <button class="npc-research-choice" onclick="game.chooseReportDiscovery('${speaker.id}', '${pendingDiscovery.id}', false)">${pendingDiscovery.wrongOption.text}</button>
                    </div>
                    <small>選錯會讓${speaker.name}暫停研究三個回合。</small>
                </section>` : '';
            const cooldownHint = speaker.researchCooldownRounds > 0
                ? `<div class="npc-research-cooldown">🔎 我正在重新整理研究想法，還要 ${speaker.researchCooldownRounds} 個回合。</div>`
                : '';
            actions.innerHTML = `${researchCard}${cooldownHint}<span class="npc-actions-label">要替他更換工作嗎？</span>${choices.map(([id, label]) => `<button class="npc-task-choice" onclick="game.changeCharacterTaskFromReport('${speaker.id}', '${id}')">${label}</button>`).join('')}`;
        }
        const confirmButton = document.getElementById('npc-dialogue-confirm-btn');
        if (confirmButton) {
            const reportResearchByTask = {
                GATHER_WOOD: 'fiber_discovery', GATHER_FRUIT: 'pottery_discovery',
                STRIKE_STONE: 'sharp_stone_discovery', COASTAL_GATHER: 'bone_hook_discovery',
                RIVER_SEARCH: 'pottery_discovery'
            };
            const researchId = speaker.pendingDiscoveryId || reportResearchByTask[speaker.assignedTask];
            const researchTech = researchId ? this.techWorkDefinitions[researchId] : null;
            const canResearch = researchTech && !this.unlockedWorkCircles.has(researchTech.id);
            confirmButton.innerText = canResearch ? '確定，留在洞穴研究' : '確定，繼續工作';
            confirmButton.setAttribute('aria-label', canResearch ? '確認讓此族人留在洞穴研究' : '確認並繼續目前工作');
        }
        modal.style.display = 'flex';
    }

    closeNpcDialogue() {
        const modal = document.getElementById('modal-npc-dialogue');
        if (modal) modal.style.display = 'none';
        this.pendingNpcTalkId = null;
        const speaker = this.characters.find(c => c.id === this.quickWorkerId);
        if (speaker) {
            speaker.roundFindings = [];
            speaker.roundStories = [];
        }
        this.renderQuickRoster();
    }

    openNmpMuseumModal() {
        const modal = document.getElementById('modal-nmp-lore');
        if (!modal) return;

        const container = document.getElementById('nmp-lore-container');
        container.innerHTML = '';

        if (typeof NMP_LORE_DATABASE !== 'undefined') {
            NMP_LORE_DATABASE.forEach(item => {
                const card = document.createElement('div');
                card.className = "paper-card p-4 mb-4";
                card.innerHTML = `
                    <div class="flex items-start gap-4">
                        <img src="${item.image}" class="w-20 h-20 object-contain rounded-lg border-2 border-white shadow-md bg-stone-100 p-1 flex-shrink-0">
                        <div class="flex-grow">
                            <div class="flex items-center justify-between mb-1">
                                <h4 class="font-black text-amber-950 text-base">${item.title}</h4>
                                <span class="paper-tag">${item.badge}</span>
                            </div>
                            <div class="text-xs font-bold text-amber-800 mb-2">${item.era} ｜ ${item.category}</div>
                            <p class="text-xs text-stone-700 leading-relaxed mb-2">${item.summary}</p>
                            <div class="text-xs text-stone-600 bg-white/70 p-2 rounded-lg border border-amber-200/60 leading-relaxed">${item.details}</div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        modal.style.display = 'flex';
    }

    closeNmpMuseumModal() {
        const modal = document.getElementById('modal-nmp-lore');
        if (modal) modal.style.display = 'none';
    }

    openSkillTreeModal() {
        const modal = document.getElementById('modal-skill-tree');
        if (!modal) return;
        this.renderSkillTree();
        modal.style.display = 'flex';
    }

    closeSkillTreeModal() {
        const modal = document.getElementById('modal-skill-tree');
        if (modal) modal.style.display = 'none';
    }

    openResearchPicker(discoveryId) {
        const discovery = this.discovery?.discoveriesData?.find(item => item.id === discoveryId);
        if (!discovery) return;
        const tech = this.techWorkDefinitions[discoveryId];
        if (!tech) {
            this.showToast('這條線索目前還沒有可執行的研究工作。');
            return;
        }
        if (this.unlockedWorkCircles.has(tech.id)) {
            this.showToast(`✨【${tech.label}】已完成，可以直接派人工作。`);
            return;
        }
        const workers = this.characters.filter(char => char.isAlive && char.age_stage !== 'infant');
        const container = document.getElementById('skill-tree-content');
        if (!container) return;
        const existing = document.getElementById('research-picker');
        if (existing) existing.remove();
        const picker = document.createElement('section');
        picker.id = 'research-picker';
        picker.className = 'research-picker';
        picker.innerHTML = `<h3>🧠 派誰研究「${discovery.name}」？</h3><p>${discovery.question || discovery.story || '請選一位族人整理這條技術線索。'}</p><div class="research-picker-list">${workers.map(char => `<button class="research-picker-choice" data-researcher-id="${char.id}" onclick="game.selectResearcher('discovery:${discoveryId}', '${char.id}')"><img src="${this.getFaceImagePath(char, 'normal')}" alt="${char.name}"><span>${char.name}<small>${char.ageGroup}｜${char.assignedTask || '待命'}</small></span></button>`).join('')}</div><button id="research-confirm-btn" class="paper-btn primary text-xs" disabled onclick="game.confirmResearchSelection()">✅ 確定派遣</button><button class="paper-btn text-xs" onclick="document.getElementById('research-picker')?.remove()">先不研究</button>`;
        container.prepend(picker);
        picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    startCharacterResearch(discoveryId, charId) {
        const discovery = this.discovery?.discoveriesData?.find(item => item.id === discoveryId);
        const char = this.characters.find(item => item.id === charId && item.isAlive && item.age_stage !== 'infant');
        const tech = this.techWorkDefinitions[discoveryId];
        if (!discovery || !char || !tech) return;
        // 玩家已按下「確定派遣」，研究指令優先於原本工作；立即中止舊工作並回居住地研究。
        if (char.state === 'WORKING' || char.state === 'WALKING_TO_STATION' || char.state === 'RETURNING_HOME') {
            char.targetStation = null;
            char.workTimer = 0;
            char.followingTarget = null;
            char.state = 'IDLE';
        }
        this.researchAssignments[discoveryId] = { charId, rounds: 0 };
        this.techProgress[tech.id] = this.techProgress[tech.id] || 0;
        const station = this.workstations.find(item => item.id === 'cave_camp');
        char.targetStation = station;
        char.laneOffset = char.getLaneOffset('RESEARCH');
        char.axisY = station.y + 20 + char.laneOffset;
        char.currentTask = 'RESEARCH';
        char.assignedTask = 'RESEARCH';
        char.researchTopic = discoveryId;
        char.workTimer = 0;
        // 研究進度由「小回合結束」計算，不讓一般工作完成回調把 NPC 送回住處。
        // 兩次橫向時間軸跑完後，advanceTechnologyProgress() 才會結束研究。
        char.workDuration = Number.MAX_SAFE_INTEGER;
        char.autoWorkCooldown = 0;
        this.selectedCharacter = char;
        this.quickWorkerId = char.id;
        char.state = 'WALKING_TO_STATION';
        char.say(`回居住地研究「${discovery.name}」`, '🧠', 220);
        this.showToast(`🧠 已派【${char.name}】回居住地研究「${discovery.name}」。`);
        this.renderQuickRoster();
        this.renderSkillTree();
    }

    renderSkillTree() {
        const container = document.getElementById('skill-tree-content');
        if (!container) return;
        const manager = this.discovery;
        const data = manager?.discoveriesData || [];
        const discovered = manager?.unlockedDiscoveries || new Set();
        const nodes = data.map(item => {
            const tech = this.techWorkDefinitions[item.id];
            const found = discovered.has(item.id);
            const completed = tech && this.unlockedWorkCircles.has(tech.id);
            const researching = tech && !completed && this.techProgress[tech.id] !== undefined;
            const assignment = this.researchAssignments[item.id];
            const researcher = assignment ? this.characters.find(char => char.id === assignment.charId) : null;
            const status = completed ? '技術已完成' : researcher ? `🧠 ${researcher.name} 研究中｜${this.techProgress[tech.id] || 0}/2` : found ? '已發現線索' : researching ? `研究進度 ${this.techProgress[tech.id]}/2` : '尚未發現';
            const state = completed ? 'completed' : (found || researching ? 'found' : 'locked');
            const requirement = item.requiresDiscoveries?.length ? `需要先發現：${item.requiresDiscoveries.join('、')}` : '可以從族人的日常工作中偶然發現';
            const extension = tech ? `可延伸工作：${tech.icon} ${tech.label}（${tech.location}）` : '可延伸成部族文化線索';
            const click = tech ? ` onclick="game.openResearchPicker('${item.id}')" title="點擊選擇族人研究這項技術"` : '';
            return `<article class="skill-node ${state}${tech ? ' researchable' : ''}"${click}><h4>${item.icon || '💡'} ${item.name}</h4><p>${item.story || item.speech || '族人的工作留下了一個線索。'}</p><p>↳ ${requirement}</p><p>→ ${extension}</p><span class="skill-status">${status}</span>${tech && !completed ? '<b class="skill-research-cta">點擊派人研究</b>' : ''}</article>`;
        }).join('');
        const completedCount = [...discovered].length;
        container.innerHTML = `
            <details class="skill-tree-folder" open>
                <summary>📂 已發現的線索（${completedCount}）｜點擊收起／展開</summary>
                <div class="skill-tree-grid">${nodes || '<p class="p-3 text-sm text-stone-600">族人還沒有帶回任何線索，先派人工作吧。</p>'}</div>
            </details>
            <details class="skill-tree-folder">
                <summary>📁 隱藏資料夾：長濱文化發展路徑</summary>
                <div class="skill-tree-grid">
                    <article class="skill-node found"><h4>🔥 穩定火塘與居住地</h4><p>有固定住處、火塘與輪替工作，才有時間累積技術。</p><span class="skill-status">生活基礎</span></article>
                    <article class="skill-node ${this.unlockedWorkCircles.has('WEAVE_NET') ? 'completed' : 'locked'}"><h4>🕸️ 植物纖維 → 漁網</h4><p>森林纖維、編織與海岸採集互相連動。</p><span class="skill-status">${this.unlockedWorkCircles.has('WEAVE_NET') ? '已完成' : '待發展'}</span></article>
                    <article class="skill-node ${this.unlockedWorkCircles.has('FISHING') ? 'completed' : 'locked'}"><h4>🎣 魚骨與纖維 → 漁獵</h4><p>從撿拾魚貝走向釣魚與主動利用海洋。</p><span class="skill-status">${this.unlockedWorkCircles.has('FISHING') ? '已完成' : '待發展'}</span></article>
                    <article class="skill-node ${this.unlockedWorkCircles.has('POTTERY') ? 'completed' : 'locked'}"><h4>🏺 黏土 → 燒陶保存</h4><p>陶器降低鮮食耗損，讓聚落有更穩定的生活餘裕。</p><span class="skill-status">${this.unlockedWorkCircles.has('POTTERY') ? '已完成' : '待發展'}</span></article>
                    <article class="skill-node ${this.unlockedWorkCircles.has('CHOP_TREE') ? 'completed' : 'locked'}"><h4>🪓 石器 → 粗木加工</h4><p>工具、木材與長期居住共同推動文化累積。</p><span class="skill-status">${this.unlockedWorkCircles.has('CHOP_TREE') ? '已完成' : '待發展'}</span></article>
                    <article class="skill-node ${this.spiritualTechs.has('ancestor_prayer') ? 'completed' : 'locked'}"><h4>🕯️ 神靈祈禱</h4><p>透過告別祭典與故事，記住離世長老的經驗。</p><span class="skill-status">${this.spiritualTechs.has('ancestor_prayer') ? '已發展' : '等待告別祭典'}</span></article>
                    <article class="skill-node ${this.spiritualTechs.has('burial_ritual') ? 'completed' : 'locked'}"><h4>🪨 居住地葬禮儀式</h4><p>在居住地旁留下土堆，讓祖先仍與部族一起生活。</p><span class="skill-status">${this.spiritualTechs.has('burial_ritual') ? '已發展' : '等待長老安葬'}</span></article>
                    <article class="skill-node ${this.festivalUnlocked ? 'completed' : 'found'} researchable" onclick="game.startFestivalResearch()" title="點擊選擇族人整理祭典傳說"><h4>🔥 火塘祭典 → 神話傳說</h4><p>火塘、技術與世代傳承，讓族人用舞蹈和故事記住共同生活。</p><p>條件：穩定火塘、兩項完成技術、教學或學習傳承</p><span class="skill-status">${this.festivalUnlocked ? '已發展' : '點擊派人研究'}</span></article>
                </div>
            </details>`;
        container.insertAdjacentHTML('beforeend', this.getSkillTreeMapHtml());
    }

    getSkillTreeMapHtml() {
        const discovered = this.discovery?.unlockedDiscoveries || new Set();
        const done = id => this.unlockedWorkCircles.has(id);
        const found = id => discovered.has(id);
        const state = (isDone, isFound) => isDone ? 'completed' : isFound ? 'found' : 'locked';
        const status = (isDone, isFound) => isDone ? '已完成' : isFound ? '已發現線索' : '等待探索';
        const node = (icon, title, materials, place, isDone, isFound, researchId = null) => {
            const clickable = researchId ? ` researchable" onclick="game.openResearchPicker('${researchId}')" title="點擊選擇族人研究"` : '"';
            const researchHint = researchId && !isDone ? '<b class="skill-research-cta">點擊派人研究</b>' : '';
            return `<article class="skill-tree-node ${state(isDone, isFound)}${clickable}><h4>${icon} ${title}</h4><p>蒐集：${materials}</p><p>地點：${place}</p><span>${status(isDone, isFound)}</span>${researchHint}</article>`;
        };
        const fiberFound = found('fiber_discovery');
        const stoneFound = found('sharp_stone_discovery');
        const fishingFound = found('bone_hook_discovery') || found('bone_hook_discovery_after_fiber');
        return `<details class="skill-tree-folder skill-tree-diagram" open>
            <summary>🌳 技能樹：資材 → 工作地點 → 技術分支｜點擊節點資料夾查看發展條件</summary>
            <div class="skill-tree-map">
                <div class="skill-tree-root">🔥 穩定火塘與居住地<span>所有技術的起點：先維持聚落、火塘與工作輪替</span></div>
                <div class="skill-tree-trunk"></div>
                <div class="skill-tree-branches">
                    <section class="skill-tree-branch"><div class="skill-tree-branch-title">🌲 森林纖維線</div>
                        ${node('🌿','植物纖維','木材、樹皮','森林',fiberFound,fiberFound,'fiber_discovery')}<i>↓</i>
                        ${node('🧵','搓線','植物纖維','森林／居住地',false,fiberFound,'fiber_discovery')}<i>↓</i>
                        ${node('🧶','織布','纖維、線','居住地',false,fiberFound,'fiber_discovery')}<i>↓</i>
                        ${node('🕸️','織網','纖維、線、時間', '居住地',done('WEAVE_NET'),fiberFound,'fiber_discovery')}
                    </section>
                    <section class="skill-tree-branch"><div class="skill-tree-branch-title">🪨 石材工具線</div>
                        ${node('🪨','挑選石材','礫石、尖石','石灘／採石區',stoneFound,stoneFound,'sharp_stone_discovery')}<i>↓</i>
                        ${node('🔨','石器工具','石材、木柄、纖維','火堆旁',done('MAKE_TOOLS'),stoneFound,'sharp_stone_discovery')}<i>↓</i>
                        ${node('🪓','粗木加工','石斧、木材、纖維','森林',done('CHOP_TREE'),done('MAKE_TOOLS'),'stone_axe_adze_discovery')}
                    </section>
                    <section class="skill-tree-branch"><div class="skill-tree-branch-title">🌊 海岸漁獵線</div>
                        ${node('🐚','魚貝與魚骨','魚貝、魚骨','海岸採集區',fishingFound,fishingFound,'bone_hook_discovery')}<i>↓</i>
                        ${node('🪝','骨鉤','魚骨、貝殼、纖維','居住地／海岸',false,fishingFound,'bone_hook_discovery')}<i>↓</i>
                        ${node('🎣','狩（魚）獵','木材、繩子、磨石技術','海岸釣魚區',done('FISHING'),fishingFound,'bone_hook_discovery')}
                    </section>
                    <section class="skill-tree-branch"><div class="skill-tree-branch-title">🏺 保存生活線</div>
                        ${node('🟤','黏土','黏土、火塘','海岸泥灘',false,found('pottery_discovery'),'pottery_discovery')}<i>↓</i>
                        ${node('🏺','燒陶','黏土、木材、火','居住地燒陶窯',done('POTTERY'),found('pottery_discovery'),'pottery_discovery')}
                    </section>
                </div>
            </div>
        </details>`;
    }

    openTeacherSummary() {
        const modal = document.getElementById('modal-teacher-summary');
        if (!modal) return;
        this.renderTeacherSummary();
        this.appendStorybookToSummary();
        modal.style.display = 'flex';
    }

    closeTeacherSummary() {
        const modal = document.getElementById('modal-teacher-summary');
        if (modal) modal.style.display = 'none';
    }

    getLearningAnalysisScores() {
        const counters = this.discovery?.taskCounters || {};
        const alive = this.characters.filter(char => char.isAlive).length;
        const discoveries = this.discovery?.unlockedDiscoveries?.size || 0;
        const completed = this.unlockedWorkCircles?.size || 0;
        const stats = this.behaviorStats || {};
        return [
            Math.min(100, 30 + (stats.forest || 0) * 7 + (counters.GATHER_WOOD || 0) * 3),
            Math.min(100, 25 + (stats.stone || 0) * 8 + (counters.STRIKE_STONE || 0) * 3),
            Math.min(100, 25 + (stats.coast || 0) * 8 + (counters.COASTAL_GATHER || 0) * 3),
            Math.min(100, 20 + discoveries * 12 + completed * 10),
            Math.min(100, 25 + (stats.learning || 0) * 12 + alive * 4)
        ];
    }

    buildLearningRadarSvg(scores) {
        const labels = ['森林資材', '石材工具', '海岸利用', '技術發展', '傳承合作'];
        const cx = 180, cy = 145, radius = 92;
        const point = (value, index, r = radius) => {
            const angle = -Math.PI / 2 + index * (Math.PI * 2 / labels.length);
            const distance = r * value / 100;
            return `${(cx + Math.cos(angle) * distance).toFixed(1)},${(cy + Math.sin(angle) * distance).toFixed(1)}`;
        };
        const grid = [20, 40, 60, 80, 100].map(level => `<polygon points="${labels.map((_, i) => point(level, i)).join(' ')}" class="radar-grid"/>`).join('');
        const axes = labels.map((label, i) => {
            const end = point(100, i);
            const angle = -Math.PI / 2 + i * (Math.PI * 2 / labels.length);
            const tx = cx + Math.cos(angle) * 116;
            const ty = cy + Math.sin(angle) * 116;
            return `<line x1="${cx}" y1="${cy}" x2="${end.split(',')[0]}" y2="${end.split(',')[1]}" class="radar-axis"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" class="radar-label" text-anchor="middle">${label}</text>`;
        }).join('');
        return `<svg class="learning-radar" viewBox="0 0 360 290" role="img" aria-label="玩家行為星芒圖">${grid}${axes}<polygon points="${scores.map((score, i) => point(score, i)).join(' ')}" class="radar-value"/>${scores.map((score, i) => `<circle cx="${point(score, i).split(',')[0]}" cy="${point(score, i).split(',')[1]}" r="4" class="radar-dot"/>`).join('')}</svg>`;
    }

    renderTeacherSummary() {
        const container = document.getElementById('teacher-summary-content');
        if (!container) return;
        const discovered = this.discovery?.unlockedDiscoveries || new Set();
        const markers = [
            this.chapter1?.isCampFireLit,
            discovered.has('fiber_discovery'),
            discovered.has('sharp_stone_discovery'),
            discovered.has('bone_hook_discovery') || discovered.has('bone_hook_discovery_after_fiber'),
            this.unlockedWorkCircles.has('WEAVE_NET'),
            this.unlockedWorkCircles.has('POTTERY')
        ];
        const score = markers.filter(Boolean).length;
        const culture = score >= 5 ? '已形成長濱文化雛形！' : score >= 3 ? '正在走向長濱文化，還有幾條技術路徑待發展。' : '仍在建立聚落基礎，請繼續觀察族人的發現。';
        const techCount = this.unlockedWorkCircles.size;
        const scores = this.getLearningAnalysisScores();
        const indicators = [
            ['觀察與整理', '從森林、石灘與海岸的工作結果，辨認史前人群如何利用環境。'],
            ['技術與生活', '理解火塘、石器、纖維、漁獵與燒陶如何解決生活問題。'],
            ['時間與文化變遷', '用回合、世代與技術樹看見文化不是突然出現，而是逐步累積。'],
            ['合作與傳承', '透過老人教學、小孩學習與分工，理解知識如何在群體中延續。']
        ];
        container.innerHTML = `<div class="teacher-summary-result"><h3>${culture}</h3><p>第 ${Math.max(0, this.roundNumber - 1)} 世代｜第 ${this.roundNumber} 回合</p><p>目前人口：${this.characters.filter(c => c.isAlive).length} 人｜已收納線索：${discovered.size}｜已完成技術：${techCount}</p><div class="learning-analysis"><div>${this.buildLearningRadarSvg(scores)}</div><div class="indicator-list"><h4>108課綱學習指標分析</h4><p class="indicator-note">課堂對應摘要：透過模擬活動理解臺灣史前生活與文化發展，實際課程仍可依教師版本調整。</p>${indicators.map(([title, text]) => `<div><b>${title}</b><span>${text}</span></div>`).join('')}</div></div><p>學生可以回顧：固定居住、火塘、石器、纖維、海岸利用與食物保存，是否逐步互相連接成文化。</p>${this.teacherGameEnded ? '<p class="font-black text-emerald-700">本局已由老師結束，這份進度可以作為課堂討論紀錄。</p>' : ''}<button class="paper-btn primary text-sm certificate-btn" onclick="game.printLearningCertificate()">🖨️ 列印學習獎狀</button></div>`;
    }

    getStorybookPages() {
        const discoveries = [...(this.discovery?.unlockedDiscoveries || new Set())];
        const discoveryNames = discoveries.map(id => this.discovery?.discoveriesData?.find(item => item.id === id)?.name || id).slice(0, 4);
        const completedTechs = this.unlockedWorkCircles?.size || 0;
        const alive = this.characters.filter(char => char.isAlive).length;
        const food = (this.resources.fish_shell || 0) + (this.resources.fruit || 0);
        const pages = [
            ['第一頁｜找到可以生活的地方', `我們來到八仙洞，看見可以遮風的岩洞，也在洞口留下火塘。從這一天開始，${this.tribeName}有了可以一起生活的地方。`],
            ['第二頁｜分工讓生活繼續', `族人依照名冊分工：有人走進森林採集木材與水果，有人在石灘尋找石材，也有人到海岸撿拾魚貝。這一局留下了${this.roundNumber}個回合的生活足跡。`],
            ['第三頁｜從發現到技術', discoveryNames.length ? `族人把偶然發現說出來，再由玩家思考要不要研究。這次收集到的線索包括：${discoveryNames.join('、')}。完成了${completedTechs}項工作技術，文化不是突然出現，而是一點一點累積。` : '族人還在觀察材料。也許下一次工作時，會看見新的線索，讓生活方法繼續往前走。'],
            ['第四頁｜一起記住生活', `${this.festivalUnlocked ? '族人曾圍著火塘跳舞，把經驗變成祭典與故事。' : '火塘仍等待族人用歌、舞與故事留下共同記憶。'}${this.burialMounds?.length ? '部族也用儀式記住離開的人，讓祖先留在居住地旁。' : ''}現在部族中有${alive}位仍在生活的人，食物與環境都需要大家一起照顧。`],
            ['第五頁｜我的想法', `如果你是這個部族的孩子，你會怎麼安排下一季？你會優先蒐集什麼資材、派誰去做什麼工作，又會想發展哪一項技術？`]
        ];
        return pages.map(([title, text], index) => `<article class="storybook-page"><span class="storybook-page-number">${index + 1}</span><h4>${title}</h4><p>${text}</p></article>`).join('');
    }

    appendStorybookToSummary() {
        const container = document.getElementById('teacher-summary-content');
        if (!container || container.querySelector('.storybook-section')) return;
        container.insertAdjacentHTML('beforeend', `<section class="storybook-section" aria-label="學習繪本與反思畫布"><div class="storybook-cover"><span>📖</span><h3>把這一局畫成繪本</h3><p>請先讀完族人的故事，再想一想：你的選擇如何改變了部族？</p></div><div class="storybook-pages">${this.getStorybookPages()}</div><div class="storybook-reflection"><h4>✏️ 我的史前生活想像</h4><p>請畫下你心中的部族生活、火塘、工作場景，或下一項想發展的技術。</p><canvas id="storybook-drawing-canvas" width="760" height="360" aria-label="學生繪圖區"></canvas><div class="storybook-tools"><button class="paper-btn text-sm" onclick="game.clearStorybookDrawing()">清除畫布</button><button class="paper-btn primary text-sm" onclick="game.printStorybook()">列印學習繪本</button></div><label class="storybook-answer-label">我想對族人說：<textarea id="storybook-reflection-text" rows="3" placeholder="我會先……因為……"></textarea></label></div></section>`);
        this.setupStorybookCanvas();
    }

    setupStorybookCanvas() {
        const canvas = document.getElementById('storybook-drawing-canvas');
        if (!canvas || canvas.dataset.bound === 'true') return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fffdf7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#8b5e3c';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        let drawing = false;
        const point = event => {
            const rect = canvas.getBoundingClientRect();
            return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
        };
        canvas.addEventListener('pointerdown', event => { drawing = true; canvas.setPointerCapture(event.pointerId); const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
        canvas.addEventListener('pointermove', event => { if (!drawing) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke(); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => canvas.addEventListener(type, () => { drawing = false; }));
        canvas.dataset.bound = 'true';
    }

    clearStorybookDrawing() {
        const canvas = document.getElementById('storybook-drawing-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fffdf7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    printStorybook() {
        const canvas = document.getElementById('storybook-drawing-canvas');
        const drawing = canvas ? canvas.toDataURL('image/png') : '';
        const reflection = document.getElementById('storybook-reflection-text')?.value || '';
        const popup = window.open('', '_blank', 'width=900,height=900');
        if (!popup) { this.showToast('請允許瀏覽器開啟列印視窗，才能列印學習繪本。'); return; }
        popup.document.write(`<html lang="zh-Hant"><head><meta charset="UTF-8"><title>史前生活學習繪本</title><style>body{margin:0;padding:28px;background:#f5ead5;color:#451a03;font-family:"Noto Sans TC",sans-serif}.book{max-width:820px;margin:auto}.page{page-break-after:always;min-height:650px;padding:30px;border:8px solid #a8794e;border-radius:18px;background:#fffaf0;box-sizing:border-box}.page h1{font-size:30px}.page p{font-size:20px;line-height:2}.drawing{width:100%;border:3px solid #8b5e3c;border-radius:12px;background:#fffdf7}.answer{font-size:20px;line-height:1.8;white-space:pre-wrap;border-bottom:2px solid #8b5e3c;min-height:80px}@media print{body{background:#fff;padding:0}.page{border-radius:0;min-height:260mm}}</style></head><body><main class="book">${this.getStorybookPages().replace(/<article class="storybook-page"><span class="storybook-page-number">\d<\/span><h4>(.*?)<\/h4><p>(.*?)<\/p><\/article>/g, '<section class="page"><h1>$1</h1><p>$2</p></section>')}<section class="page"><h1>我的史前生活想像</h1><img class="drawing" src="${drawing}"><h2>我想對族人說</h2><div class="answer">${reflection || '　　　　　　　　　　　　　　　　'}</div></section></main><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
        popup.document.close();
    }

    printLearningCertificate() {
        const scores = this.getLearningAnalysisScores();
        const discovered = this.discovery?.unlockedDiscoveries?.size || 0;
        const culture = this.unlockedWorkCircles.size >= 3 ? '長濱文化探索學習' : '臺灣史前生活探索學習';
        const popup = window.open('', '_blank', 'width=900,height=700');
        if (!popup) {
            this.showToast('請允許瀏覽器開啟列印視窗，才能印出獎狀。');
            return;
        }
        popup.document.write(`<html lang="zh-Hant"><head><meta charset="UTF-8"><title>${culture}石板獎狀</title><style>
        @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#211f1b;color:#eee3cc;font-family:"Noto Sans TC",sans-serif}.certificate{position:relative;margin:20px auto;padding:52px 70px;max-width:1040px;min-height:650px;text-align:center;overflow:hidden;border:18px solid #4b4942;border-radius:24px;background:linear-gradient(135deg,#6b6961 0%,#3e3d38 46%,#59574f 100%);box-shadow:inset 0 0 0 3px #858177,inset 0 0 30px rgba(0,0,0,.65),0 12px 28px rgba(0,0,0,.45)}.certificate:before,.certificate:after{content:"";position:absolute;inset:18px;border:2px solid rgba(220,205,174,.25);pointer-events:none}.certificate:after{inset:34px;border-style:dashed;border-color:rgba(28,27,24,.42)}.stone-mark{position:absolute;color:rgba(27,25,21,.42);font-size:42px;transform:rotate(-12deg)}.stone-mark.left{left:35px;top:55px}.stone-mark.right{right:38px;bottom:55px;transform:rotate(14deg)}.seal{position:relative;z-index:1;font-size:52px;filter:grayscale(.8) sepia(.25);text-shadow:2px 3px 0 #25231f}.title,.subtitle,.name,.detail,.footer{position:relative;z-index:1;text-shadow:1px 2px 0 #282622}.title{font-size:40px;font-weight:950;letter-spacing:.18em;margin:14px 0;color:#f3e7ca}.subtitle{font-size:21px;color:#d89d67;font-weight:900}.name{margin:38px auto 22px;max-width:720px;padding:13px;border-top:3px solid #bca27c;border-bottom:3px solid #bca27c;font-size:31px;font-weight:950;letter-spacing:.08em;color:#f7edda}.detail{font-size:18px;line-height:1.9;color:#eee3cc}.footer{display:flex;justify-content:space-between;margin-top:48px;font-size:16px;color:#d9c6a4}.print-btn{position:relative;z-index:2;margin-top:18px;padding:8px 18px;border:2px solid #d89d56;border-radius:9px;background:#3b3027;color:#f6e7c5;font-weight:900}@media print{body{background:#fff}.certificate{margin:0;max-width:none;box-shadow:none}.print-btn{display:none}}</style></head><body><main class="certificate"><span class="stone-mark left">◈ ᚫ ◇</span><span class="stone-mark right">◇ ᛉ ◈</span><div class="seal">🪨🔥🌿</div><div class="title">石板學習獎狀</div><div class="subtitle">${culture}・舊石器時代探索</div><div class="name">八仙洞長濱先民模擬遊戲</div><div class="detail">恭喜完成史前生活與文化發展探索！<br>已收納 ${discovered} 條文化線索，並觀察資材、技術、合作與傳承如何逐步形成。<br>本次學習表現星芒分數：${scores.join('、')}</div><div class="footer"><span>教師簽章：________________</span><span>日期：________________</span></div><button class="print-btn" onclick="window.print()">列印石板獎狀</button></main></body></html>`);
        popup.document.close();
        popup.focus();
        setTimeout(() => popup.print(), 300);
    }

    finishGameForTeacher() {
        this.teacherGameEnded = true;
        clearInterval(this.roundTimerHandle);
        this.roundTimerHandle = null;
        if (this.chapter1) this.chapter1.state = 'TEACHER_COMPLETE';
        this.renderTeacherSummary();
        this.showToast('🏁 老師已結束本局，學生可以查看技能樹與長濱文化發展結果。');
    }

    showToast(msg) {
        const toast = document.getElementById('toast-msg');
        if (!toast) return;
        toast.innerText = msg;
        toast.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update() {
        this.camera.update();
        this.updateCampfireFuel();
        if (this.festivalActive && Date.now() >= this.festivalEndAt) this.finishFestival();

        for (let st of this.workstations) st.update();

        for (let char of this.characters) {
            char.update(
                this.resources,
                this.sound,
                (action, worker) => this.handleProduction(action, worker),
                null
            );
        }
        this.autoResumeAssignedWork();

    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(-this.camera.x, 0);

        // 1. 繪製手繪參考設計圖之長濱文化橫軸全景背景 (左「穴」 ➔ 中「森/石」 ➔ 右「海」)
        this.drawFormosaLandscape(ctx);

        // 2. 若第一章海邊岩洞成功定居，在洞口繪製溫暖跳動營火
        if (this.chapter1 && (this.chapter1.isCampFireLit || this.fireLevel > 0)) {
            const groundY = Math.min(590, window.innerHeight - 130);
            this.drawCampFire(ctx, 250, groundY - 10);
        }
        this.drawBurialMounds(ctx);

        // 3. 技術成熟後，在指定位置顯示原始紙卡風格的新工作框。
        this.drawUnlockedTechStations(ctx);

        // 4. 繪製 6 位先民剪紙實體 (傳遞全新生成之模組化去背圖資 this.assets)
        const livingChars = this.characters.filter(c => c.isAlive);
        livingChars.sort((a, b) => a.y - b.y);
        for (let char of livingChars) {
            if (char === this.selectedCharacter) {
                ctx.save();
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.ellipse(char.x, char.y + 16, 36, 14, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            char.draw(ctx, this.assets);
        }

        ctx.restore();
    }

    drawUnlockedTechStations(ctx) {
        // 工作區不再覆蓋在底圖上顯示文字標記；玩家從下方工作選項與技能樹辨識工作。
        return;
    }

    drawBurialMounds(ctx) {
        if (!this.burialMounds?.length) return;
        this.burialMounds.forEach(mound => {
            ctx.save();
            ctx.translate(mound.x, mound.y);
            ctx.fillStyle = '#70543a';
            ctx.strokeStyle = '#3f2d20';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 5, 48, 17, 0, Math.PI, Math.PI * 2);
            ctx.lineTo(48, 5);
            ctx.quadraticCurveTo(0, 30, -48, 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#9a7b53';
            ctx.beginPath();
            ctx.roundRect(-8, -22, 16, 31, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#f3e7d3';
            ctx.font = "bold 11px 'Noto Sans TC'";
            ctx.textAlign = 'center';
            ctx.fillText('🪨', 0, -7);
            ctx.restore();
        });
    }

    // 繪製橫軸長濱文化自然景觀
    drawFormosaLandscape(ctx) {
        const bgImg = this.assets['bg_paleolithic'];

        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.drawImage(bgImg, 0, 0, this.worldWidth, this.worldHeight);
        } else {
            const groundY = Math.min(590, window.innerHeight - 130);
            ctx.fillStyle = "#87ceeb";
            ctx.fillRect(0, 0, this.worldWidth, groundY);
            ctx.fillStyle = "#c29b6e";
            ctx.fillRect(0, groundY, this.worldWidth, this.worldHeight - groundY);
        }
    }

    // 繪製八仙洞火塘營火 (溫暖光芒與火焰剪紙)
    drawCampFire(ctx, x, y) {
        ctx.save();
        const fireImg = this.assets['campfire_npc'];
        const bob = Math.sin(Date.now() * 0.006) * 2;
        const sway = Math.sin(Date.now() * 0.004) * 0.035;
        const level = Math.max(0, Math.min(3, this.fireLevel || 0));
        const fireScale = level <= 0 ? 0.42 : (0.72 + level * 0.14);
        if (fireImg && fireImg.complete && fireImg.naturalWidth > 0) {
            ctx.translate(x, y - 38 + bob);
            ctx.rotate(sway);
            ctx.drawImage(fireImg, -32 * fireScale, -54 * fireScale, 64 * fireScale, 72 * fireScale);
        } else {
            // 火焰圖資載入失敗時仍保留可見的剪紙火焰，避免整個火塘消失。
            ctx.translate(x, y - 18 + bob);
            ctx.rotate(sway);
            ctx.globalAlpha = level <= 0 ? 0.45 : 1;
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.ellipse(0, 18, 34 * fireScale, 11 * fireScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(0, -44 * fireScale);
            ctx.bezierCurveTo(-26 * fireScale, -18 * fireScale, -22 * fireScale, 2, 0, 16 * fireScale);
            ctx.bezierCurveTo(22 * fireScale, 2, 26 * fireScale, -18 * fireScale, 0, -44 * fireScale);
            ctx.fill();
            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.moveTo(0, -25 * fireScale);
            ctx.bezierCurveTo(-12 * fireScale, -8 * fireScale, -9 * fireScale, 5, 0, 12 * fireScale);
            ctx.bezierCurveTo(9 * fireScale, 5, 12 * fireScale, -8 * fireScale, 0, -25 * fireScale);
            ctx.fill();
        }

        ctx.restore();
    }
}

// 啟動主實例
window.addEventListener('DOMContentLoaded', () => {
    window.game = new PrehistoricGame();
});
