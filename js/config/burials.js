/**
 * 史前文明演化 - 墓葬系統與祖靈信仰知識庫 (BURIALS & MORTUARY SYSTEM)
 * 考據出處：國立臺灣史前文化博物館 (National Museum of Prehistory)
 * 涵蓋：卑南遺址板岩石板棺、都蘭山朝向、屋基室內葬、嬰幼兒甕棺、隨葬品規範
 */

const BURIAL_CONFIG = {
    // 墓葬形制選項
    forms: [
        {
            id: "slate_cist",
            name: "板岩石板棺 (Slate Cist)",
            icon: "🪨",
            minEra: 1, // 新石器
            desc: "以六片大型板岩板切割組裝而成，四周以石榫或卯接固定，蓋上沉重石蓋板。",
            nmpNote: "【史前館考據】卑南遺址核心特徵！出土超過兩千座石板棺，為環太平洋最具代表性的新石器石棺墓葬群。"
        },
        {
            id: "jar_burial",
            name: "陶製甕棺 (Jar Burial)",
            icon: "🏺",
            minEra: 1,
            desc: "使用口徑較大的深腹印紋陶甕，將逝者（多為嬰幼兒）蜷臥放入，陶盆覆蓋其頂。",
            nmpNote: "【史前館考據】普遍用於早夭嬰孩或二次葬，象徵重回母親溫暖子宮，祈求靈魂安息與重生。"
        },
        {
            id: "cave_flexed",
            name: "岩壁洞穴屈肢掩埋 (Cave Flexed Burial)",
            icon: "🧗",
            minEra: 0, // 舊石器
            desc: "將逝者肢體屈曲如睡眠姿態，安放於天然背風海蝕岩洞一隅，覆以礫石碎沙。",
            nmpNote: "【史前館考據】舊石器長濱文化先民依傍洞穴生活，逝者就近安放於庇護洞中，生前未有石棺結構。"
        },
        {
            id: "wild_ditch",
            name: "荒野草率棄置 (Careless Abandonment)",
            icon: "🍂",
            minEra: 0,
            desc: "不加修築與儀式，隨意將遺體移至荒郊野嶺。",
            nmpNote: "【禁忌】此舉極度違背史前先民萬物有靈與祖靈守護之信念，將引發部族恐慌與疫病！"
        }
    ],

    // 墓葬地點選項
    locations: [
        {
            id: "indoor_slate_house",
            name: "聚落住家室內 / 屋基下方",
            icon: "🏘️",
            minEra: 1,
            desc: "深掘於石板屋生活地板之下，使逝去親人與現世家人朝夕相伴。",
            nmpNote: "【史前館考據】卑南文化獨特習俗——『室內葬（屋基葬）』，象徵祖靈永不離開，世代守護家宅安全。"
        },
        {
            id: "sacred_burial_zone",
            name: "聚落神聖石棺墓地",
            icon: "⛩️",
            minEra: 1,
            desc: "設立於聚落周圍向山向陽的公眾墓葬祈福區。",
            nmpNote: "【史前館考據】卑南聚落隨著人口擴大，逐漸在聚落外圍形成綿密排列的板岩石板棺墓地。"
        },
        {
            id: "cave_corner",
            name: "海崖洞穴天然岩隙",
            icon: "🪨",
            minEra: 0,
            desc: "海蝕洞深處避風避光之處。",
            nmpNote: "【史前館考據】舊石器時代先民的主要居所與避難處。"
        },
        {
            id: "remote_swamp",
            name: "潮濕遠方沼澤地",
            icon: "💧",
            minEra: 0,
            desc: "遠離聚落的陰冷沼澤泥淖。",
            nmpNote: "【禁忌】潮濕易受猛獸啃食與瘴氣侵蝕，非史前人安葬先人之所。"
        }
    ],

    // 墓葬方位選項 (Orientation) - 史前館核心考據重點！
    orientations: [
        {
            id: "mount_dulan",
            name: "正向聖山：都蘭山 (Mount Dulan)",
            icon: "⛰️",
            desc: "棺頭長軸嚴格朝向東北方神聖都蘭山脈。",
            nmpNote: "【史前館核心考據】卑南遺址出土之數千座板岩石板棺，棺頭絕大多數朝向東海岸聖山『都蘭山』，象徵逝者靈魂歸返聖山祖靈懷抱！",
            isSacredForBeinan: true
        },
        {
            id: "pacific_ocean",
            name: "面臨大海：太平洋深水區",
            icon: "🌊",
            desc: "棺頭朝向開闊的太平洋日出方向。",
            nmpNote: "【史前館考據】十三行與部分沿海聚落有面海或河口葬俗，但卑南石板棺以朝向都蘭山為正統信仰。"
        },
        {
            id: "random_direction",
            name: "隨意放置 / 未辨方位",
            icon: "🧭",
            desc: "未辨認地理聖山與山川方位，隨地勢隨意安放。",
            nmpNote: "【提示】史前先民對生死方位極其嚴謹，未依信仰方位埋葬將失去神聖引導。"
        }
    ],

    // 隨葬品選項 (Grave Goods)
    graveGoods: [
        {
            id: "jade_earring",
            name: "國寶「人獸形玉玦」",
            icon: "💎",
            minEra: 1,
            type: "jade",
            desc: "花蓮豐田閃玉雕琢，頂部伏獸、下方雙人並立，象徵崇高部落地位與神聖靈力。",
            nmpNote: "【史前館國寶】臺灣史前最具代表性國寶文物！出土於卑南遺址石板棺，多佩戴於耳際或胸前，為權貴與部落長老之至高隨葬品。"
        },
        {
            id: "jade_spear",
            name: "磨製玉質矛頭 / 尖狀器",
            icon: "🗡️",
            minEra: 1,
            type: "weapon",
            desc: "以質地堅硬的透閃石精心磨製的尖銳矛頭，刀鋒銳利。",
            nmpNote: "【史前館考據】石板棺內常隨葬精美玉矛頭，象徵逝者為英勇獵人或守衛族群的戰士。"
        },
        {
            id: "corded_pottery",
            name: "雙耳印紋繩紋陶罐",
            icon: "🏺",
            minEra: 1,
            type: "pottery",
            desc: "手捏燒製的紅陶折肩雙耳罐，表面飾有細密繩紋，盛裝糧食小米入棺。",
            nmpNote: "【史前館考據】陶罐是卑南石板棺內最普遍隨葬品，為逝者前往祖靈彼岸提供充沛口糧。"
        },
        {
            id: "spindle_whorl",
            name: "陶質紡輪 (Spindle Whorl)",
            icon: "🧶",
            minEra: 1,
            type: "textile",
            desc: "扁圓形中央穿孔的陶輪，用於搓捻麻線、編織漁網與衣服。",
            nmpNote: "【史前館考據】女性墓葬重要隨葬品，見證卑南女性精湛的紡織技術與社群地位。"
        },
        {
            id: "pebble_scraper",
            name: "打製礫石砍砸器",
            icon: "🪨",
            minEra: 0,
            type: "stone",
            desc: "敲打天然礫石單面刃口的原始打砸器。",
            nmpNote: "【史前館考據】舊石器時代長濱文化的隨身日用工具。"
        }
    ],

    // 墓葬合理性評估演算 (根據國立臺灣史前文化博物館考據)
    evaluateBurial: function(deceased, selection, currentEra) {
        let score = 0;
        let feedback = [];
        let ancestralFavorBonus = 0;
        let moraleEffect = 0;

        const isChild = deceased.agePhase === 'CHILD';
        const isElder = deceased.agePhase === 'ELDER';
        const isNeolithic = currentEra >= 1;
        const isPaleolithic = currentEra === 0;

        // 1. 檢驗墓葬形制 (Form)
        if (selection.form === 'wild_ditch') {
            score -= 50;
            feedback.push("❌ 族人哀悼：將親人棄置荒野，引發族人極度悲痛與不安，祖靈不寧！");
            ancestralFavorBonus -= 30;
            moraleEffect -= 25;
            return { score, feedback, ancestralFavorBonus, moraleEffect, isSacred: false };
        }

        if (isChild && selection.form === 'jar_burial') {
            score += 35;
            feedback.push("⭐ 史前館考據印證：嬰幼兒以陶甕棺安葬，宛如回歸母體溫暖子宮，至為慈愛周全！");
            ancestralFavorBonus += 25;
        } else if (!isChild && selection.form === 'slate_cist' && isNeolithic) {
            score += 35;
            feedback.push("⭐ 史前館考據印證：成年族人安眠於板岩石板棺中，結構穩固莊嚴，恪遵卑南先民神聖風俗！");
            ancestralFavorBonus += 25;
        } else if (isPaleolithic && selection.form === 'cave_flexed') {
            score += 30;
            feedback.push("⭐ 史前館考據印證：舊石器先民安息於避風岩洞，符合長濱時代自然避風葬俗。");
            ancestralFavorBonus += 20;
        } else {
            score += 15;
            feedback.push("✔️ 墓葬形制基本得宜。");
            ancestralFavorBonus += 10;
        }

        // 2. 檢驗墓葬地點 (Location)
        if (isNeolithic && selection.location === 'indoor_slate_house') {
            score += 35;
            feedback.push("⭐ 史前館考據印證：安葬於『室內屋基下方』！先民『與生者同在』，祖靈自地底永恆庇佑子孫！");
            ancestralFavorBonus += 30;
            moraleEffect += 15;
        } else if (selection.location === 'sacred_burial_zone') {
            score += 25;
            feedback.push("✔️ 葬於神聖墓地，得到聚落集體祝禱。");
            ancestralFavorBonus += 15;
        } else if (selection.location === 'remote_swamp') {
            score -= 20;
            feedback.push("⚠️ 地點潮濕陰暗，族人擔憂祖靈受寒。");
            ancestralFavorBonus -= 10;
        }

        // 3. 檢驗方位 (Orientation) - 聖山都蘭山核心！
        if (selection.orientation === 'mount_dulan') {
            score += 40;
            feedback.push("🌟 國寶級神聖考據：棺頭長軸『嚴格朝向都蘭山』！逝者靈魂順利歸返卑南聖山祖靈之境，得大圓滿！");
            ancestralFavorBonus += 40;
            moraleEffect += 20;
        } else if (selection.orientation === 'pacific_ocean') {
            score += 15;
            feedback.push("✔️ 朝向蔚藍海洋，魂歸浪濤。");
            ancestralFavorBonus += 10;
        } else {
            score -= 10;
            feedback.push("⚠️ 方位隨意擺設，未能對正聖山都蘭山，先靈彷徨尋路。");
        }

        // 4. 隨葬品加乘 (Grave Goods)
        if (selection.graveGoods) {
            if (selection.graveGoods === 'jade_earring') {
                score += 30;
                feedback.push("💎 隨葬國寶【人獸形玉玦】：神獸與族人並立，無上尊貴！部族精神威望飆升！");
                ancestralFavorBonus += 35;
            } else if (selection.graveGoods === 'corded_pottery') {
                score += 20;
                feedback.push("🏺 隨葬【繩紋雙耳陶罐】：盛裝黃金小米，願逝者前往彼岸衣食無虞。");
                ancestralFavorBonus += 20;
            } else if (selection.graveGoods === 'jade_spear') {
                score += 20;
                feedback.push("🗡️ 隨葬【磨製玉矛頭】：勇者長矛護體，彰顯守護部落之英勇！");
                ancestralFavorBonus += 20;
            } else if (selection.graveGoods === 'spindle_whorl') {
                score += 20;
                feedback.push("🧶 隨葬【陶質紡輪】：紀念逝者巧手紡線結網，德澤後人。");
                ancestralFavorBonus += 20;
            }
        }

        const isSacred = score >= 80;
        return { score, feedback, ancestralFavorBonus, moraleEffect, isSacred };
    }
};
