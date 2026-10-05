/**
 * 史前文明演化 - 時代架構與科技樹 (ERAS CONFIG)
 * 世紀帝國 (AoE) 式部族演化體系
 * 考據出處：國立臺灣史前文化博物館 (National Museum of Prehistory)
 */

const PREHISTORIC_ERAS = [
    {
        id: 0,
        code: "paleolithic",
        name: "舊石器時代（長濱文化）",
        period: "距今約 50,000 至 5,000 年前",
        badge: "🪨",
        siteName: "長濱八仙洞遺址",
        bgDescription: "先民依傍海崖海蝕洞居住，尚未發展農業與製陶，以打製粗糙石器、採集野果、潮間帶撿拾魚貝與摩擦生火維生。",
        costToAdvance: { food: 60, stone: 40, wood: 20 },
        unlockedBuildings: ["cave_camp", "pebble_quarry", "coastal_shellfish", "wild_bushes"],
        unlockedActions: ["FORAGE", "STRIKE_STONE", "COASTAL_GATHER", "WARM_REST"],
        maxPop: 8,
        tasks: [
            { id: "gather_food", name: "採集野果與潮間帶撿拾魚貝 (生鮮存糧)", current: 0, target: 50, unit: "份" },
            { id: "strike_stone", name: "在礫石灘敲擊打製砍砸器與火星", current: 0, target: 20, unit: "次" },
            { id: "pop_growth", name: "部族存糧充足，人口繁衍至 5 人", current: 3, target: 5, unit: "人" }
        ],
        nmpHighlight: "國立臺灣史前文化博物館考據：長濱文化是臺灣目前已知最早的舊石器時代遺址，先民利用天然海蝕洞穴遮蔽風浪，敲打礫石作為砍砸器，並懂得使用火照明取暖。"
    },
    {
        id: 1,
        code: "neolithic",
        name: "新石器時代（卑南文化）",
        period: "距今約 5,000 至 2,000 年前",
        badge: "🏺",
        siteName: "臺東卑南遺址",
        bgDescription: "農業革命爆發！先民走出洞穴建造板岩石板屋定居，種植黃金小米、麻繩結網織布、燒製印紋陶罐、琢磨花蓮豐田玉（人獸形玉玦），並實施屋基板岩石板棺神聖墓葬。",
        costToAdvance: { food: 180, wood: 120, stone: 100, artifacts: 10 },
        unlockedBuildings: ["beinan_slate_house", "millet_field", "pottery_kiln", "jade_workshop", "weaving_loom", "canoe_dock"],
        unlockedActions: ["FARM_MILLET", "MAKE_POTTERY", "CRAFT_JADE", "WEAVE_NET", "ROW_CANOE", "CHOP_TREE"],
        maxPop: 15,
        tasks: [
            { id: "build_slate_house", name: "採集板岩石材，建造卑南石板屋", current: 0, target: 1, unit: "座" },
            { id: "harvest_millet", name: "使用穿孔石刀收割黃金小米", current: 0, target: 60, unit: "份" },
            { id: "craft_jade", name: "琢磨國寶「人獸形玉玦」或石矛頭", current: 0, target: 3, unit: "件" },
            { id: "proper_burial", name: "遵照卑南祖靈習俗完成石板棺安葬", current: 0, target: 1, unit: "次" }
        ],
        nmpHighlight: "國立臺灣史前文化博物館考據：卑南遺址是環太平洋最大石板棺墓葬群遺址，出土上千具長軸朝向都蘭山的石板棺，隨葬極致精美的國寶「人獸形玉玦」，展現發達的農業聚落與崇高的祖靈信仰。"
    },
    {
        id: 2,
        code: "metal_age",
        name: "金屬器時代（十三行文化）",
        period: "距今約 2,000 至 400 年前",
        badge: "⚒️",
        siteName: "新北八里十三行遺址",
        bgDescription: "掌握高溫煉鐵技術，打造鐵鋤與鐵刀！聚落居於架高干欄建築防潮避獸，手製人面陶罐，並以獨木舟展開跨島遠洋貿易，換回東南亞亞洲之玻璃環與瑪瑙珠。",
        costToAdvance: null, // 最高時代
        unlockedBuildings: ["stilt_house", "iron_furnace", "maritime_trade_dock", "ceremonial_shrine"],
        unlockedActions: ["SMELT_IRON", "MARITIME_TRADE", "CEREMONIAL_PRAYER"],
        maxPop: 24,
        tasks: [
            { id: "smelt_iron", name: "高爐高溫煉鐵，鍛造鐵器農具", current: 0, target: 10, unit: "件" },
            { id: "ocean_trade", name: "划獨木舟出海貿易，換回玻璃與瑪瑙", current: 0, target: 5, unit: "次" },
            { id: "reach_pop_max", name: "十三行繁榮海陸大城人口達 16 人", current: 8, target: 16, unit: "人" }
        ],
        nmpHighlight: "國立臺灣史前文化博物館考據：十三行遺址出土煉鐵殘渣、鐵刀、人面陶罐，並在墓葬中發現外來的玻璃珠、瑪瑙飾品與中國銅錢，見證臺灣史前先民已具備高度海洋航行與國際交換能力。"
    }
];
