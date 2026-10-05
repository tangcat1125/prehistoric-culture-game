/**
 * 史前文明演化 - 時代演化資料與歷史考據
 * 包含：探勘選家、採集數值、存糧繁衍人口、意外火苗與文明躍遷
 */

const ERAS = [
    {
        id: 0,
        subPhase: "pre_fire",
        name: "舊石器初期：海崖選家與火的誕生",
        period: "約 50,000 年前",
        eraClass: "paleolithic",
        badgeIcon: "🪨",
        bgNote: "古先民選定海崖海蝕洞（八仙洞）為家，尚未有火，摸索採集與敲石",
        tasks: [
            { id: "choose_home", desc: "勘查海崖天然岩洞並選定為家 (八仙洞)", current: 0, target: 1, action: "選家定居" },
            { id: "gather_bushes", desc: "採集野果充飢與拾取乾燥茅草枯枝", current: 0, target: 12, action: "林地採集" },
            { id: "strike_pebbles", desc: "在礫石灘敲擊石頭 (摩擦尋求火苗)", current: 0, target: 10, action: "敲擊石頭" }
        ],
        historyTitle: "舊石器時代起點：長濱八仙洞與天降之火",
        historyDesc: `
            <h4>📍 八仙洞考古遺址（臺東縣長濱鄉海崖）</h4>
            <p>這群古先民跨越山嶺與密林，在濱海背風的<strong>海崖天然海蝕岩洞</strong>選定為家。此處取水方便、能遮風避雨，面臨浩瀚太平洋提供豐富海產。</p>
            <ul>
                <li>🪨 <strong>敲擊石頭</strong>：敲打天然礫石製作最初的砍砸器。</li>
                <li>🔥 <strong>意外迸發的火苗</strong>：在反覆猛烈敲打堅硬礫石時，火星落入乾枯茅草，誕生了第一簇神聖火苗！</li>
            </ul>
        `
    },
    {
        id: 1,
        subPhase: "post_fire",
        name: "舊石器成熟期：用火與巨獸時代",
        period: "約 30,000 年前",
        eraClass: "paleolithic-fire",
        badgeIcon: "🔥",
        bgNote: "營火烤熟食物、精製石器、砍伐大樹、獵捕大山豬與近海大魚",
        tasks: [
            { id: "cook_meals", desc: "八仙洞營火烤熟食物 (累積繁衍存糧)", current: 0, target: 16, action: "營火烤肉" },
            { id: "hunt_giant_boar", desc: "精製石矛與獵捕巨型山豬 (獲巨肉與獸皮)", current: 0, target: 2, action: "狩獵巨獸" },
            { id: "catch_sea_fish", desc: "探索近海深水區捕撈大魚", current: 0, target: 3, action: "近海大魚" },
            { id: "chop_big_trees", desc: "以精製石斧砍伐大樹獲得木材", current: 0, target: 4, action: "砍伐木材" },
            { id: "grow_population", desc: "存糧充足迎來新生兒，人口達 6 人", current: 3, target: 6, action: "繁衍人口" }
        ],
        historyTitle: "掌握用火：熟食促進大腦發育與人口繁衍",
        historyDesc: `
            <h4>🔥 熟食革命與工具進步</h4>
            <p>火的誕生徹底改變了史前人類的命運：</p>
            <ul>
                <li>🍖 <strong>告別生食</strong>：烤熟的肉類更易吸收營養，族人健康度與繁衍率大幅飆升。</li>
                <li>🪓 <strong>精製石斧與木材</strong>：精細敲打的尖狀器能夠砍伐原木、製作堅固石矛。</li>
                <li>🐗 <strong>大獵物狩獵</strong>：集體協同獵捕巨型山豬、近海捕魚，生活資源大幅豐盈！</li>
            </ul>
        `
    },
    {
        id: 2,
        subPhase: "neolithic",
        name: "新石器時代：卑南聚落與農業革命",
        period: "約 7,000 年前",
        eraClass: "neolithic",
        badgeIcon: "🏺",
        bgNote: "走出洞穴定居卑南石板屋，泥土陶罐、小米耕作與玉飾工藝",
        tasks: [
            { id: "make_pottery", desc: "燒製泥土印紋陶罐 (儲藏糧食)", current: 0, target: 6, action: "燒製陶罐" },
            { id: "harvest_millet", desc: "磨製石刀收割金黃小米", current: 0, target: 18, action: "小米農作" },
            { id: "craft_jade_earring", desc: "琢磨國寶「人獸形玉質耳飾」", current: 0, target: 2, action: "琢磨玉玦" },
            { id: "reach_pop_neolithic", desc: "卑南聚落人口繁衍擴張至 10 人", current: 6, target: 10, action: "聚落人口" }
        ],
        historyTitle: "新石器時代：定居石板屋與農業陶器革命",
        historyDesc: `
            <h4>📍 卑南考古遺址（臺東市卑南平原）</h4>
            <p>人口滿溢走出洞穴，在台地平原開創偉大的新石器文明：</p>
            <ul>
                <li>🏘️ <strong>定居石板屋</strong>：不再到處流浪，建造板岩石板屋與防潮穀倉。</li>
                <li>🏺 <strong>泥土陶罐</strong>：能熬煮湯汁與密封保存小米，抗旱度冬。</li>
                <li>💎 <strong>玉石工藝</strong>：國寶「人獸形玉質耳飾」彰顯了高度美學與社群地位。</li>
            </ul>
        `
    },
    {
        id: 3,
        subPhase: "metal",
        name: "金屬器時代：十三行冶鐵與海路貿易",
        period: "約 2,000 年前",
        eraClass: "metal",
        badgeIcon: "⚒️",
        bgNote: "架高干欄建築、高溫高爐煉鐵、人面陶罐與跨海貿易網絡",
        tasks: [
            { id: "smelt_iron_tools", desc: "高爐高溫冶鐵打造鐵鋤與鐵刀", current: 0, target: 6, action: "高溫冶鐵" },
            { id: "face_pottery_ritual", desc: "燒製國寶人面陶罐與祭祀陶偶", current: 0, target: 2, action: "人面陶罐" },
            { id: "foreign_trade_goods", desc: "碼頭以外貿特產換回玻璃與瑪瑙", current: 0, target: 4, action: "跨海貿易" },
            { id: "reach_pop_metal", desc: "十三行繁榮海陸大城人口達 15 人", current: 10, target: 15, action: "城鎮人口" }
        ],
        historyTitle: "金屬器時代：水陸樞紐與南島海洋貿易網",
        historyDesc: `
            <h4>📍 十三行考古遺址（新北市八里區淡水河口）</h4>
            <p>坐落於觀音山與淡水河口的史前國際商埠：</p>
            <ul>
                <li>⚒️ <strong>高溫煉鐵</strong>：生產工具徹底換代，農耕與採集效率成倍暴增！</li>
                <li>🏡 <strong>架高干欄建築</strong>：防潮濕海霧與野生野獸，居住品質現代化。</li>
                <li>🌐 <strong>海外交流</strong>：以臺灣玉與獸皮，換回東南亞亞洲各地的玻璃環與瑪瑙珠飾！</li>
            </ul>
        `
    }
];
