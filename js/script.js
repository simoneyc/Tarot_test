// API 端點配置
const API_BASE_URL = 'https://tarot-backend-n9oa.onrender.com';

window.showPerformanceReport = () => performanceMonitor.showReport();

// ===== 圖片預加載管理器 =====
class ImagePreloader {
    constructor() {
        this.imageCache = new Map(); // 緩存已加載的圖片
        this.loadingPromises = new Map(); // 避免重複加載同一張圖片
        this.preloadStarted = false;
    }

    // 預加載核心圖片（大牌前10張，最常被抽到）
    // 在 ImagePreloader 類中，替換整個 preloadEssentialImages 方法
    preloadEssentialImages() {
        if (this.preloadStarted) return Promise.resolve();
        this.preloadStarted = true;
        
        const essentialCards = [
            "愚者 The Fool",
            "魔術師 The Magician", 
            "女祭司 The High Priestess",
            "皇后 The Empress",
            "皇帝 The Emperor",
            "教皇 The Hierophant",
            "戀人 The Lovers",
            "戰車 The Chariot",
            "力量 Strength",
            "隱士 The Hermit"
        ];

        console.log('🖼️ 開始預加載核心圖片...');
        
        // 創建預加載序列
        const preloadSequence = async () => {
            // 顯示進度指示器
            showPreloadProgress();
            
            // 預加載卡背圖片（最重要）
            try {
                await this.preloadImage('./images/tarot/card-back.jpg');
                updatePreloadProgress(1, essentialCards.length + 1);
            } catch (error) {
                console.warn('卡背圖片預加載失敗:', error);
            }
            
            // 預加載核心塔羅牌圖片
            let completed = 1; // 卡背已完成
            
            for (const cardName of essentialCards) {
                try {
                    const imagePath = getTarotImagePath(cardName);
                    await this.preloadImage(imagePath);
                    console.log(`✅ 預加載成功: ${cardName}`);
                } catch (error) {
                    console.warn(`⚠️ 預加載失敗: ${cardName}`, error);
                }
                
                completed++;
                updatePreloadProgress(completed, essentialCards.length + 1);
                
                // 每張圖片之間稍微延遲，避免網路阻塞
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            console.log(`✅ 預加載完成: ${completed}/${essentialCards.length + 1} 張圖片`);
            
            // 延遲隱藏進度條，讓用戶看到完成狀態
            setTimeout(() => {
                hidePreloadProgress();
            }, 1000);
        };

        // 執行預加載序列並返回 Promise
        return preloadSequence().catch(error => {
            console.error('預加載過程出錯:', error);
            hidePreloadProgress();
        });
    }

    // 預加載單張圖片
    preloadImage(imagePath) {
        // 如果已經緩存，直接返回
        if (this.imageCache.has(imagePath)) {
            return Promise.resolve(this.imageCache.get(imagePath));
        }

        // 如果正在加載，返回現有的 Promise
        if (this.loadingPromises.has(imagePath)) {
            return this.loadingPromises.get(imagePath);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            
            // 設置超時機制（10秒）
            const timeout = setTimeout(() => {
                img.src = ''; // 取消加載
                reject(new Error(`圖片加載超時: ${imagePath}`));
            }, 10000);
            
            img.onload = () => {
                clearTimeout(timeout);
                this.imageCache.set(imagePath, img);
                console.log(`✅ 圖片加載成功: ${imagePath.split('/').pop()}`);
                resolve(img);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                console.warn(`❌ 圖片加載失敗: ${imagePath}`);
                
                // 如果是塔羅牌圖片失敗，嘗試加載備用圖片
                if (imagePath !== './images/tarot/card-back.jpg') {
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        console.log(`🔄 使用備用圖片: ${imagePath.split('/').pop()}`);
                        resolve(fallbackImg);
                    };
                    fallbackImg.onerror = () => reject(new Error(`備用圖片也無法加載`));
                    fallbackImg.src = './images/tarot/card-back.jpg';
                } else {
                    reject(new Error(`無法加載圖片: ${imagePath}`));
                }
            };
            
            img.src = imagePath;
        });

        this.loadingPromises.set(imagePath, promise);
        return promise;
    }

    // 智能預加載：根據用戶選中的牌預加載
    async smartPreload(selectedCards) {
        if (!selectedCards || selectedCards.length === 0) return;
        
        console.log('🎯 智能預加載選中的牌...');
        const promises = selectedCards.map(card => {
            const imagePath = getTarotImagePath(card.name);
            return this.preloadImage(imagePath).catch(error => {
                console.warn(`智能預加載失敗: ${card.name}`, error);
                return null;
            });
        });

        try {
            await Promise.allSettled(promises);
            console.log('✅ 智能預加載完成');
        } catch (error) {
            console.error('智能預加載出錯:', error);
        }
    }

    // 批量預加載（用於知識庫等場景）
    async batchPreload(cardNames, onProgress = null) {
        console.log(`📦 批量預加載 ${cardNames.length} 張圖片...`);
        let completed = 0;
        
        for (const cardName of cardNames) {
            try {
                const imagePath = getTarotImagePath(cardName);
                await this.preloadImage(imagePath);
                completed++;
                
                if (onProgress) {
                    onProgress(completed, cardNames.length);
                }
            } catch (error) {
                console.warn(`批量預加載失敗: ${cardName}`, error);
                completed++;
            }
        }
        
        console.log(`✅ 批量預加載完成: ${completed}/${cardNames.length}`);
    }

    // 檢查圖片是否已緩存
    isImageCached(imagePath) {
        return this.imageCache.has(imagePath);
    }

    // 獲取緩存統計
    getCacheStats() {
        return {
            cachedImages: this.imageCache.size,
            loadingImages: this.loadingPromises.size
        };
    }

    // 清理緩存（如果需要釋放記憶體）
    clearCache() {
        this.imageCache.clear();
        this.loadingPromises.clear();
        console.log('🗑️ 圖片緩存已清理');
    }
}

// 創建全局圖片預加載器實例
const imagePreloader = new ImagePreloader();

// 全局語言設置
let currentLanguage = 'zh';

// 多語言文本配置
const translations = {
    zh: {
        // 加載和錯誤訊息
        'connecting-energy': '正在連接宇宙能量...',
        'analyzing-cards': '分析牌面組合關係...',
        'reading-symbols': '解讀神秘符號...',
        'exploring-subconscious': '探索潛意識訊息...',
        'integrating-guidance': '整合靈性指引...',
        'weaving-answers': '編織命運答案...',
        'oracle-coming': '神諭即將降臨...',
        'oracle-reading': '✦ 神諭解讀 ✦',
        'api-error': '解讀服務暫時無法使用',
        'api-error-detail': '請稍後再試或檢查網路連線',
        'question-label': '你的神諭問題：',
        'upright': '正位',
        'reversed': '逆位',
        'notification-spread': '請選擇一種牌陣再繼續！',
        'notification-question': '請輸入你的問題再繼續！',
        'notification-choices': '請完整描述兩個選項再繼續！'
    },
    en: {
        // 加載和錯誤訊息
        'connecting-energy': 'Connecting to universal energy...',
        'analyzing-cards': 'Analyzing card combinations...',
        'reading-symbols': 'Reading mystical symbols...',
        'exploring-subconscious': 'Exploring subconscious messages...',
        'integrating-guidance': 'Integrating spiritual guidance...',
        'weaving-answers': 'Weaving destiny answers...',
        'oracle-coming': 'Oracle is about to descend...',
        'oracle-reading': '✦ Oracle Reading ✦',
        'api-error': 'Reading service temporarily unavailable',
        'api-error-detail': 'Please try again later or check network connection',
        'question-label': 'Your Oracle Question:',
        'upright': 'Upright',
        'reversed': 'Reversed',
        'notification-spread': 'Please choose a spread before continuing!',
        'notification-question': 'Please enter your question before continuing!',
        'notification-choices': 'Please fully describe both options before continuing!'
    }
};

// 獲取翻譯文本
function t(key) {
    return translations[currentLanguage][key] || translations['zh'][key] || key;
}

// 牌陣資訊配置
const spreadInfo = {
    single: {
        name: { zh: "單張指引", en: "Single Guidance" },
        description: { 
            zh: "一張神諭之牌將為你點亮前路，提供簡潔而深刻的指引。適合日常決策與尋求靈感。", 
            en: "A divine oracle card will illuminate your path, providing concise and profound guidance. Perfect for daily decisions and seeking inspiration."
        },
        cards: 1,
        positions: { zh: ["指引"], en: ["Guidance"] },
        title: { zh: "請選擇一張指引之牌", en: "Please choose one guidance card" }
    },
    three: {
        name: { zh: "三張牌占卜", en: "Three Card Reading" },
        description: { 
            zh: "經典的時間流占卜法，揭示過去的影響、現在的狀況與未來的可能發展，幫你了解事情的完整脈絡。", 
            en: "Classic timeline divination revealing past influences, present situation, and future possibilities, helping you understand the complete context."
        },
        cards: 3,
        positions: { zh: ["過去", "現在", "未來"], en: ["Past", "Present", "Future"] },
        title: { zh: "請選擇三張命運之牌", en: "Please choose three destiny cards" }
    },
    core: {
        name: { zh: "四張直指核心", en: "Four Core Focus" },
        description: { 
            zh: "深度剖析問題的占卜法，從問題核心、障礙因素、解決對策到個人優勢，提供全面而深入的分析。", 
            en: "Deep analysis divination targeting the essence of problems, from core issues, obstacles, solutions to personal advantages, providing comprehensive and in-depth analysis."
        },
        cards: 4,
        positions: { zh: ["問題核心", "障礙", "對策", "優勢"], en: ["Core Issue", "Obstacle", "Solution", "Advantage"] },
        title: { zh: "請選擇四張直指核心之牌", en: "Please choose four core focus cards" }
    },
    choice: {
        name: { zh: "二選一抉擇", en: "Two Choice Decision" },
        description: { 
            zh: "當你面臨重要抉擇時，這個牌陣將幫你深入了解兩個選項的現狀與可能結果，協助你做出最明智的決定。", 
            en: "When facing important decisions, this spread helps you deeply understand both options' current status and potential outcomes, assisting you in making the wisest choice."
        },
        cards: 5,
        positions: { zh: ["選項A狀態", "選項B狀態", "A可能結果", "B可能結果", "當事人狀態"], en: ["Option A Status", "Option B Status", "A Potential Result", "B Potential Result", "Your Current State"] },
        title: { zh: "請選擇五張二選一之牌", en: "Please choose five decision cards" }
    },
    love: {
        name: { zh: "感情萬用", en: "Love Universal" },
        description: { 
            zh: "專為感情問題設計的牌陣，深入探索你與對方的內心世界、相互態度，以及這段關係的可能發展方向。", 
            en: "Specially designed for relationship matters, exploring deep into your and your partner's inner worlds, mutual attitudes, and potential relationship development directions."
        },
        cards: 5,
        positions: { zh: ["我的狀態", "我對對方態度", "對方狀態", "對方對我態度", "可能結果"], en: ["My State", "My Feelings Toward Them", "Their State", "Their Feelings Toward Me", "Potential Outcome"] },
        title: { zh: "請選擇五張感情萬用之牌", en: "Please choose five love reading cards" }
    }
};

// 塔羅牌圖片映射
const tarotImageMap = {
    // 大牌 (Major Arcana)
    "愚者 The Fool": "./images/tarot/major/00-fool.jpg",
    "魔術師 The Magician": "./images/tarot/major/01-magician.jpg",
    "女祭司 The High Priestess": "./images/tarot/major/02-high-priestess.jpg",
    "皇后 The Empress": "./images/tarot/major/03-empress.jpg",
    "皇帝 The Emperor": "./images/tarot/major/04-emperor.jpg",
    "教皇 The Hierophant": "./images/tarot/major/05-hierophant.jpg",
    "戀人 The Lovers": "./images/tarot/major/06-lovers.jpg",
    "戰車 The Chariot": "./images/tarot/major/07-chariot.jpg",
    "力量 Strength": "./images/tarot/major/08-strength.jpg",
    "隱士 The Hermit": "./images/tarot/major/09-hermit.jpg",
    "命運之輪 Wheel of Fortune": "./images/tarot/major/10-wheel-fortune.jpg",
    "正義 Justice": "./images/tarot/major/11-justice.jpg",
    "倒吊人 The Hanged Man": "./images/tarot/major/12-hanged-man.jpg",
    "死神 Death": "./images/tarot/major/13-death.jpg",
    "節制 Temperance": "./images/tarot/major/14-temperance.jpg",
    "惡魔 The Devil": "./images/tarot/major/15-devil.jpg",
    "塔 The Tower": "./images/tarot/major/16-tower.jpg",
    "星星 The Star": "./images/tarot/major/17-star.jpg",
    "月亮 The Moon": "./images/tarot/major/18-moon.jpg",
    "太陽 The Sun": "./images/tarot/major/19-sun.jpg",
    "審判 Judgement": "./images/tarot/major/20-judgement.jpg",
    "世界 The World": "./images/tarot/major/21-world.jpg",
    
    // 聖杯牌組 (Cups)
    "聖杯王牌": "./images/tarot/minor/cups/ace-cups.jpg",
    "聖杯二": "./images/tarot/minor/cups/02-cups.jpg",
    "聖杯三": "./images/tarot/minor/cups/03-cups.jpg",
    "聖杯四": "./images/tarot/minor/cups/04-cups.jpg",
    "聖杯五": "./images/tarot/minor/cups/05-cups.jpg",
    "聖杯六": "./images/tarot/minor/cups/06-cups.jpg",
    "聖杯七": "./images/tarot/minor/cups/07-cups.jpg",
    "聖杯八": "./images/tarot/minor/cups/08-cups.jpg",
    "聖杯九": "./images/tarot/minor/cups/09-cups.jpg",
    "聖杯十": "./images/tarot/minor/cups/10-cups.jpg",
    "聖杯侍從": "./images/tarot/minor/cups/page-cups.jpg",
    "聖杯騎士": "./images/tarot/minor/cups/knight-cups.jpg",
    "聖杯王后": "./images/tarot/minor/cups/queen-cups.jpg",
    "聖杯國王": "./images/tarot/minor/cups/king-cups.jpg",
    
    // 權杖牌組 (Wands)
    "權杖王牌": "./images/tarot/minor/wands/ace-wands.jpg",
    "權杖二": "./images/tarot/minor/wands/02-wands.jpg",
    "權杖三": "./images/tarot/minor/wands/03-wands.jpg",
    "權杖四": "./images/tarot/minor/wands/04-wands.jpg",
    "權杖五": "./images/tarot/minor/wands/05-wands.jpg",
    "權杖六": "./images/tarot/minor/wands/06-wands.jpg",
    "權杖七": "./images/tarot/minor/wands/07-wands.jpg",
    "權杖八": "./images/tarot/minor/wands/08-wands.jpg",
    "權杖九": "./images/tarot/minor/wands/09-wands.jpg",
    "權杖十": "./images/tarot/minor/wands/10-wands.jpg",
    "權杖侍從": "./images/tarot/minor/wands/page-wands.jpg",
    "權杖騎士": "./images/tarot/minor/wands/knight-wands.jpg",
    "權杖王后": "./images/tarot/minor/wands/queen-wands.jpg",
    "權杖國王": "./images/tarot/minor/wands/king-wands.jpg",
    
    // 寶劍牌組 (Swords)
    "寶劍王牌": "./images/tarot/minor/swords/ace-swords.jpg",
    "寶劍二": "./images/tarot/minor/swords/02-swords.jpg",
    "寶劍三": "./images/tarot/minor/swords/03-swords.jpg",
    "寶劍四": "./images/tarot/minor/swords/04-swords.jpg",
    "寶劍五": "./images/tarot/minor/swords/05-swords.jpg",
    "寶劍六": "./images/tarot/minor/swords/06-swords.jpg",
    "寶劍七": "./images/tarot/minor/swords/07-swords.jpg",
    "寶劍八": "./images/tarot/minor/swords/08-swords.jpg",
    "寶劍九": "./images/tarot/minor/swords/09-swords.jpg",
    "寶劍十": "./images/tarot/minor/swords/10-swords.jpg",
    "寶劍侍從": "./images/tarot/minor/swords/page-swords.jpg",
    "寶劍騎士": "./images/tarot/minor/swords/knight-swords.jpg",
    "寶劍王后": "./images/tarot/minor/swords/queen-swords.jpg",
    "寶劍國王": "./images/tarot/minor/swords/king-swords.jpg",
    
    // 錢幣牌組 (Pentacles)
    "錢幣王牌": "./images/tarot/minor/pentacles/ace-pentacles.jpg",
    "錢幣二": "./images/tarot/minor/pentacles/02-pentacles.jpg",
    "錢幣三": "./images/tarot/minor/pentacles/03-pentacles.jpg",
    "錢幣四": "./images/tarot/minor/pentacles/04-pentacles.jpg",
    "錢幣五": "./images/tarot/minor/pentacles/05-pentacles.jpg",
    "錢幣六": "./images/tarot/minor/pentacles/06-pentacles.jpg",
    "錢幣七": "./images/tarot/minor/pentacles/07-pentacles.jpg",
    "錢幣八": "./images/tarot/minor/pentacles/08-pentacles.jpg",
    "錢幣九": "./images/tarot/minor/pentacles/09-pentacles.jpg",
    "錢幣十": "./images/tarot/minor/pentacles/10-pentacles.jpg",
    "錢幣侍從": "./images/tarot/minor/pentacles/page-pentacles.jpg",
    "錢幣騎士": "./images/tarot/minor/pentacles/knight-pentacles.jpg",
    "錢幣王后": "./images/tarot/minor/pentacles/queen-pentacles.jpg",
    "錢幣國王": "./images/tarot/minor/pentacles/king-pentacles.jpg"
};

// 獲取塔羅牌圖片路徑函數
function getTarotImagePath(cardName) {
    const imagePath = tarotImageMap[cardName];
    if (!imagePath) {
        console.warn(`找不到牌卡圖片映射: ${cardName}`);
        return './images/tarot/card-back.jpg';
    }
    return imagePath;
}

// 替換原有的 checkImageExists 函數
async function checkImageExists(imagePath) {
    try {
        // 優先檢查緩存
        if (imagePreloader.isImageCached(imagePath)) {
            return true;
        }
        
        // 嘗試預加載圖片
        await imagePreloader.preloadImage(imagePath);
        return true;
    } catch (error) {
        console.warn(`圖片檢查失敗: ${imagePath}`, error);
        return false;
    }
}

// 新增：獲取預加載的圖片元素
function getPreloadedImage(imagePath) {
    return imagePreloader.imageCache.get(imagePath) || null;
}

// 新增：安全的圖片加載函數
async function loadImageSafely(imagePath, fallbackPath = './images/tarot/card-back.jpg') {
    try {
        await imagePreloader.preloadImage(imagePath);
        return imagePath;
    } catch (error) {
        console.warn(`使用備用圖片: ${imagePath} -> ${fallbackPath}`);
        try {
            await imagePreloader.preloadImage(fallbackPath);
            return fallbackPath;
        } catch (fallbackError) {
            console.error('連備用圖片都無法加載:', fallbackError);
            return null;
        }
    }
}

// 神秘箴言
const mysticalQuotes = {
    zh: [
        "宇宙的秘密正在向你揭示...",
        "時間的長河中，答案浮現...",
        "古老的智慧正在甦醒...",
        "星辰的軌跡預示著你的命運...",
        "靈魂的深處傳來神諭...",
        "命運的絲線正在編織...",
        "神秘的力量正在匯聚...",
        "宇宙的能量為你流轉..."
    ],
    en: [
        "The secrets of the universe are being revealed to you...",
        "In the flow of time, answers emerge...",
        "Ancient wisdom is awakening...",
        "The paths of stars foretell your destiny...",
        "Oracles come from the depths of your soul...",
        "The threads of fate are being woven...",
        "Mystical forces are gathering...",
        "Universal energy flows for you..."
    ]
};

// 進度階段描述
const progressStages = {
    zh: [
        { percent: 15, text: "正在連接宇宙能量..." },
        { percent: 30, text: "分析牌面組合關係..." },
        { percent: 45, text: "解讀神秘符號..." },
        { percent: 60, text: "探索潛意識訊息..." },
        { percent: 75, text: "整合靈性指引..." },
        { percent: 90, text: "編織命運答案..." },
        { percent: 100, text: "神諭即將降臨..." }
    ],
    en: [
        { percent: 15, text: "Connecting to universal energy..." },
        { percent: 30, text: "Analyzing card combinations..." },
        { percent: 45, text: "Reading mystical symbols..." },
        { percent: 60, text: "Exploring subconscious messages..." },
        { percent: 75, text: "Integrating spiritual guidance..." },
        { percent: 90, text: "Weaving destiny answers..." },
        { percent: 100, text: "Oracle is about to descend..." }
    ]
};

// 塔羅牌數據
const tarotCards = [
    { name: "愚者 The Fool", symbol: "🌟" },
    { name: "魔術師 The Magician", symbol: "🎭" },
    { name: "女祭司 The High Priestess", symbol: "🌙" },
    { name: "皇后 The Empress", symbol: "👑" },
    { name: "皇帝 The Emperor", symbol: "⚡" },
    { name: "教皇 The Hierophant", symbol: "📿" },
    { name: "戀人 The Lovers", symbol: "💕" },
    { name: "戰車 The Chariot", symbol: "🏆" },
    { name: "力量 Strength", symbol: "🦁" },
    { name: "隱士 The Hermit", symbol: "🔮" },
    { name: "命運之輪 Wheel of Fortune", symbol: "🎡" },
    { name: "正義 Justice", symbol: "⚖️" },
    { name: "倒吊人 The Hanged Man", symbol: "🌀" },
    { name: "死神 Death", symbol: "🦋" },
    { name: "節制 Temperance", symbol: "🕊️" },
    { name: "惡魔 The Devil", symbol: "🔥" },
    { name: "塔 The Tower", symbol: "⚡" },
    { name: "星星 The Star", symbol: "⭐" },
    { name: "月亮 The Moon", symbol: "🌙" },
    { name: "太陽 The Sun", symbol: "☀️" },
    { name: "審判 Judgement", symbol: "🔯" },
    { name: "世界 The World", symbol: "🌍" },
    { name: "聖杯王牌", symbol: "🏺" },
    { name: "聖杯二", symbol: "💑" },
    { name: "聖杯三", symbol: "🥂" },
    { name: "聖杯四", symbol: "🤔" },
    { name: "聖杯五", symbol: "😔" },
    { name: "聖杯六", symbol: "🌸" },
    { name: "聖杯七", symbol: "💭" },
    { name: "聖杯八", symbol: "🚪" },
    { name: "聖杯九", symbol: "😊" },
    { name: "聖杯十", symbol: "🏠" },
    { name: "聖杯侍從", symbol: "🎨" },
    { name: "聖杯騎士", symbol: "🎭" },
    { name: "聖杯王后", symbol: "👸" },
    { name: "聖杯國王", symbol: "👑" },
    { name: "權杖王牌", symbol: "🔥" },
    { name: "權杖二", symbol: "🗺️" },
    { name: "權杖三", symbol: "👁️" },
    { name: "權杖四", symbol: "🎉" },
    { name: "權杖五", symbol: "⚔️" },
    { name: "權杖六", symbol: "🏅" },
    { name: "權杖七", symbol: "🛡️" },
    { name: "權杖八", symbol: "🚀" },
    { name: "權杖九", symbol: "💪" },
    { name: "權杖十", symbol: "📦" },
    { name: "權杖侍從", symbol: "🗲" },
    { name: "權杖騎士", symbol: "🎎" },
    { name: "權杖王后", symbol: "🦅" },
    { name: "權杖國王", symbol: "👨‍💼" },
    { name: "寶劍王牌", symbol: "💡" },
    { name: "寶劍二", symbol: "⚖️" },
    { name: "寶劍三", symbol: "💔" },
    { name: "寶劍四", symbol: "😴" },
    { name: "寶劍五", symbol: "⚡" },
    { name: "寶劍六", symbol: "🚢" },
    { name: "寶劍七", symbol: "🎭" },
    { name: "寶劍八", symbol: "🕸️" },
    { name: "寶劍九", symbol: "😰" },
    { name: "寶劍十", symbol: "🌅" },
    { name: "寶劍侍從", symbol: "🧐" },
    { name: "寶劍騎士", symbol: "🗡️" },
    { name: "寶劍王后", symbol: "🔍" },
    { name: "寶劍國王", symbol: "🧠" },
    { name: "錢幣王牌", symbol: "💰" },
    { name: "錢幣二", symbol: "🎪" },
    { name: "錢幣三", symbol: "🔨" },
    { name: "錢幣四", symbol: "🔒" },
    { name: "錢幣五", symbol: "🚪" },
    { name: "錢幣六", symbol: "🤝" },
    { name: "錢幣七", symbol: "🌱" },
    { name: "錢幣八", symbol: "⚒️" },
    { name: "錢幣九", symbol: "💎" },
    { name: "錢幣十", symbol: "🏛️" },
    { name: "錢幣侍從", symbol: "📚" },
    { name: "錢幣騎士", symbol: "🐢" },
    { name: "錢幣王后", symbol: "🌺" },
    { name: "錢幣國王", symbol: "🏆" }
];

// 全局變量
let selectedCards = [];
let currentQuestion = "";
let currentMode = "three";
let currentTheme = "classic";

// 回到主畫面功能
function goToHome() {
    // 添加點擊動畫效果
    const navbar = document.querySelector('.navbar-brand');
    navbar.style.transform = 'scale(0.95)';
    setTimeout(() => {
        navbar.style.transform = '';
    }, 150);
    
    // 如果不在主畫面，則重新開始占卜
    if (!document.getElementById('step1').classList.contains('active')) {
        restartDivination();
    } else {
        // 如果已經在主畫面，添加一個小的回饋效果
        const title = document.querySelector('.title');
        title.style.animation = 'none';
        setTimeout(() => {
            title.style.animation = 'titleGlow 3s ease-in-out infinite alternate';
        }, 100);
    }
}
function switchLanguage(lang) {
    currentLanguage = lang;
    
    // 更新語言按鈕狀態
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    
    // 更新頁面標題
    document.title = lang === 'zh' ? 'TarotVision - 塔羅視界' : 'TarotVision - Mystical Insights';
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
    
    // 更新所有具有多語言屬性的元素
    updateLanguageElements();
}

// 更新語言元素
function updateLanguageElements() {
    document.querySelectorAll('[data-zh], [data-en]').forEach(element => {
        const key = currentLanguage === 'zh' ? 'data-zh' : 'data-en';
        const text = element.getAttribute(key);
        if (text) {
            element.innerHTML = text;
        }
    });
    
    // 更新 placeholder 屬性
    document.querySelectorAll('[data-zh-placeholder], [data-en-placeholder]').forEach(element => {
        const key = currentLanguage === 'zh' ? 'data-zh-placeholder' : 'data-en-placeholder';
        const placeholder = element.getAttribute(key);
        if (placeholder) {
            element.placeholder = placeholder;
        }
    });
    
    // 更新牌陣描述（如果當前在步驟3）
    if (document.getElementById('step3').classList.contains('active')) {
        updateSpreadDescription();
    }
}

// 替換原有的 DOMContentLoaded 事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TarotVision 正在初始化...');
    
    // 語言切換按鈕事件
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchLanguage(this.dataset.lang);
        });
    });
    
    // 檢查是否為桌面端並支持 hover，決定是否顯示粒子效果
    const isMobile = window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches;
    if (!isMobile && window.matchMedia('(min-width: 769px)').matches && window.matchMedia('(hover: hover)').matches) {
        initializeParticles();
    }
    
    // 設置牌陣監聽器
    setupSpreadListeners();
    
    // 顯示第一步
    showStep(1);
    
    // 🆕 開始預加載核心圖片（使用 Promise 而不是 await）
    setTimeout(() => {
        imagePreloader.preloadEssentialImages()
            .then(() => {
                console.log('📊 圖片緩存統計:', imagePreloader.getCacheStats());
            })
            .catch(error => {
                console.error('預加載初始化失敗:', error);
            });
    }, 1000);
    
    console.log('✅ TarotVision 初始化完成');
});

// 粒子系統初始化
function initializeParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => createParticle(particlesContainer), i * 300);
    }
    setInterval(() => {
        if (particlesContainer.children.length < particleCount) {
            createParticle(particlesContainer);
        }
    }, 2000);
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
    particle.style.animationDelay = Math.random() * 2 + 's';
    container.appendChild(particle);
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 8000);
}

// 設置牌陣選擇監聽器
function setupSpreadListeners() {
    document.querySelectorAll('.spread-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.spread-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentMode = this.dataset.mode;
        });
    });
}

// 開始神秘之旅
function startDivination() {
    showStep(2);
}

// 確認牌陣選擇
function confirmSpreadSelection() {
    const selectedSpread = document.querySelector('.spread-card.active');
    if (!selectedSpread) {
        showNotification(t('notification-spread'), 'warning');
        return;
    }
    
    currentMode = selectedSpread.dataset.mode;
    updateSpreadDescription();
    showStep(3);
}

// 更新牌陣描述
function updateSpreadDescription() {
    const info = spreadInfo[currentMode];
    const descContainer = document.getElementById('spreadDescription');
    
    descContainer.innerHTML = `
        <h3 style="color: var(--primary-gold); margin-bottom: 15px;">
            ${currentLanguage === 'zh' ? '你選擇的牌陣：' : 'Your Chosen Spread: '}${info.name[currentLanguage]}
        </h3>
        <p style="opacity: 0.9; line-height: 1.6;">${info.description[currentLanguage]}</p>
    `;
    
    // 更新問題輸入框提示
    const questionInput = document.getElementById('questionInput');
    const choiceInputs = document.getElementById('choiceInputs');
    
    if (currentMode === 'choice') {
        questionInput.placeholder = currentLanguage === 'zh' ? 
            '請描述你面臨的抉擇情況...' : 
            'Please describe the decision situation you are facing...';
        choiceInputs.style.display = 'block';
    } else {
        questionInput.placeholder = currentLanguage === 'zh' ? 
            '在此輸入你最想了解的問題...' : 
            'Enter the question you most want to understand...';
        choiceInputs.style.display = 'none';
    }
}

// 提交問題
function submitQuestion() {
    currentQuestion = document.getElementById('questionInput').value.trim();
    
    if (currentMode === 'choice') {
        const choice1 = document.getElementById('choice1Input').value.trim();
        const choice2 = document.getElementById('choice2Input').value.trim();
        if (!choice1 || !choice2) {
            showNotification(t('notification-choices'), 'warning');
            return;
        }
        currentQuestion = currentLanguage === 'zh' ?
            `${currentQuestion}\n選項一：${choice1}\n選項二：${choice2}` :
            `${currentQuestion}\nOption One: ${choice1}\nOption Two: ${choice2}`;
    }
    
    if (!currentQuestion) {
        showNotification(t('notification-question'), 'warning');
        return;
    }
    
    showStep(5); // 顯示洗牌動畫
    
    // 3秒後進入選牌頁面
    setTimeout(() => {
        updateSelectionPageSettings();
        showStep(4);
        generateCards();
    }, 3000);
}

// 更新選牌頁面設置
function updateSelectionPageSettings() {
    const info = spreadInfo[currentMode];
    document.getElementById('totalCards').textContent = info.cards;
    const titleElement = document.getElementById('selectionTitle');
    titleElement.textContent = info.title[currentLanguage];
}

// 顯示步驟函數
function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById('step' + stepNumber).classList.add('active');
}

// 生成卡片
function generateCards() {
    const cardsFan = document.getElementById('cardsFan');
    cardsFan.innerHTML = '';
    const shuffledCards = [...tarotCards].sort(() => Math.random() - 0.5);
    
    shuffledCards.forEach((cardData, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'tarot-card';
        cardElement.dataset.cardName = cardData.name;
        cardElement.dataset.cardSymbol = cardData.symbol;
        
        cardElement.style.zIndex = index;
        cardElement.innerHTML = `
        <div class="card-inner">
            <div class="card-face card-back"></div>
            <div class="card-face card-front">
                <div style="text-align: center;">
                    <div style="font-size: 1.8rem; margin-bottom: 8px;">${cardData.symbol}</div>
                    <div style="font-size: 0.75rem; line-height: 1.3;">${cardData.name}</div>
                </div>
            </div>
        </div>`;
        
        cardElement.addEventListener('click', (e) => {
            e.stopPropagation();
            selectCard(cardElement);
        });
        cardsFan.appendChild(cardElement);
    });
    showScrollHint();
}

function showScrollHint() {
    const scrollWrapper = document.querySelector('.cards-scroll-wrapper');
    if (scrollWrapper.scrollWidth > scrollWrapper.clientWidth) {
        let hints = 0;
        const hintInterval = setInterval(() => {
            if (hints < 2) {
                scrollWrapper.scrollLeft += 150;
                setTimeout(() => scrollWrapper.scrollLeft -= 150, 800);
                hints++;
            } else {
                clearInterval(hintInterval);
            }
        }, 2000);
    }
}

// 替換原有的 selectCard 函數
async function selectCard(cardElement) {

    const selectionStartTime = performance.now();
    const maxCards = parseInt(document.getElementById('totalCards').textContent);
    if (selectedCards.length >= maxCards || cardElement.classList.contains('selected')) return;
    
    createSelectEffect(cardElement);
    const orientation = Math.random() < 0.5 ? "upright" : "reversed";
    
    const cardName = cardElement.dataset.cardName;
    const cardSymbol = cardElement.dataset.cardSymbol;
    
    // 🆕 使用改進的圖片加載
    const imagePath = getTarotImagePath(cardName);
    console.log(`🃏 選擇卡牌: ${cardName} (${orientation})`);
    
    // 預加載圖片（如果還沒預加載的話）
    let imageExists = false;
    try {
        await imagePreloader.preloadImage(imagePath);
        imageExists = true;
        console.log(`✅ 圖片已就緒: ${cardName}`);
    } catch (error) {
        console.warn(`⚠️ 圖片加載失敗，使用備用顯示: ${cardName}`, error);
        imageExists = false;
    }
    
    if (orientation === "reversed") {
        cardElement.classList.add("reversed");
    }
    
    const cardFront = cardElement.querySelector('.card-front');
    
    if (imageExists) {
        // 使用預加載的圖片
        const preloadedImg = imagePreloader.imageCache.get(imagePath);
        cardFront.innerHTML = `
            <img src="${imagePath}" 
                 alt="${cardName}" 
                 style="
                    width: 100%; 
                    height: 100%; 
                    object-fit: cover; 
                    border-radius: 10px;
                    ${orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}
                 "
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="
                width: 100%; 
                height: 100%; 
                background: linear-gradient(135deg, var(--primary-gold), #b8860b);
                color: var(--dark-red);
                display: none;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-size: 0.75rem;
                line-height: 1.3;
                padding: 8px;
                ${orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}
            ">
                <div>
                    <div style="font-size: 1.5rem; margin-bottom: 5px;">${cardSymbol}</div>
                    <div>${cardName}</div>
                </div>
            </div>
        `;
    } else {
        // 使用符號顯示
        cardFront.innerHTML = `
            <div style="
                text-align: center;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                ${orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}
            ">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">${cardSymbol}</div>
                <div style="font-size: 0.75rem; line-height: 1.3;">${cardName}</div>
            </div>
        `;
    }
    
    cardElement.classList.add("flipped", "selected");
    
    selectedCards.push({
        element: cardElement,
        name: cardName,
        orientation: orientation,
        symbol: cardSymbol
    });
    
    updateProgress();
    
    // 🆕 選卡後智能預加載其他可能需要的圖片
    if (selectedCards.length < maxCards) {
        // 預加載剩餘未選中的卡牌中的一些熱門牌
        const remainingCards = document.querySelectorAll('.tarot-card:not(.selected)');
        const randomCards = Array.from(remainingCards)
            .sort(() => Math.random() - 0.5)
            .slice(0, 5) // 隨機預加載5張
            .map(card => ({ name: card.dataset.cardName }));
        
        if (randomCards.length > 0) {
            imagePreloader.smartPreload(randomCards);
        }
    }
    
    if (selectedCards.length === maxCards) {
        console.log('🎯 所有卡牌已選擇，準備進行解讀');
        setTimeout(() => {
            showStep(6);
            const questionLabel = t('question-label');
            document.getElementById('userQuestion').innerHTML = `<strong>${questionLabel}</strong><br>"${currentQuestion}"`;
            showLoadingAndGetResults();
        }, 1000);
    }

    const selectionEndTime = performance.now();
    performanceMonitor.recordCardSelection(cardName, selectionEndTime - selectionStartTime);

}

// 增強的載入訊息顯示
function showEnhancedLoading() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="enhanced-loading">
            <div class="mystic-symbols">
                <div class="energy-circle"></div>
                <div class="symbol">☯</div>
                <div class="symbol">✦</div>
                <div class="symbol">☽</div>
            </div>
            
            <div class="progress-container">
                <div class="progress-text" id="progressText">${t('connecting-energy')}</div>
                <div class="enhanced-progress-bar">
                    <div class="enhanced-progress-fill" id="enhancedProgressFill" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="mystical-quotes">
                <div class="quote-fade" id="mysticalQuote">${mysticalQuotes[currentLanguage][0]}</div>
            </div>
        </div>
    `;
    
    startLoadingAnimation();
}

// 載入動畫控制
function startLoadingAnimation() {
    let currentStage = 0;
    let quoteIndex = 0;
    const stages = progressStages[currentLanguage];
    const quotes = mysticalQuotes[currentLanguage];
    
    const progressInterval = setInterval(() => {
        if (currentStage < stages.length) {
            const stage = stages[currentStage];
            const progressFill = document.getElementById('enhancedProgressFill');
            const progressText = document.getElementById('progressText');
            
            if (progressFill && progressText) {
                progressFill.style.width = stage.percent + '%';
                progressText.textContent = stage.text;
            }
            
            currentStage++;
        }
    }, 800);
    
    const quoteInterval = setInterval(() => {
        const quoteElement = document.getElementById('mysticalQuote');
        if (quoteElement) {
            quoteIndex = (quoteIndex + 1) % quotes.length;
            quoteElement.textContent = quotes[quoteIndex];
        }
    }, 3000);
    
    window.loadingIntervals = { progressInterval, quoteInterval };
}

// 清理載入動畫
function clearLoadingAnimation() {
    if (window.loadingIntervals) {
        clearInterval(window.loadingIntervals.progressInterval);
        clearInterval(window.loadingIntervals.quoteInterval);
        window.loadingIntervals = null;
    }
}

// API 調用和結果顯示
async function showLoadingAndGetResults() {
    try {
        showEnhancedLoading();
        
        const cardsData = selectedCards.map(card => ({
            name: card.name,
            orientation: card.orientation,
            symbol: card.symbol
        }));

        // 根據語言設置決定 API 請求的語言參數
        const requestBody = {
            question: currentQuestion,
            cards: cardsData,
            mode: currentMode,
            language: currentLanguage // 新增語言參數
        };

        const response = await fetch(`${API_BASE_URL}/api/tarot-reading`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status}`);
        }

        const data = await response.json();
        const interpretation = data.interpretation;
        
        clearLoadingAnimation();
        displayFinalResults(interpretation);
        
    } catch (error) {
        console.error('API 調用錯誤:', error);
        clearLoadingAnimation();
        showAPIError();
    }
}

// 替換原有的混亂代碼段，插入完整的函數
async function displayFinalResults(interpretation) {
    let formattedInterpretation = interpretation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedInterpretation = formattedInterpretation.replace(/\* /g, '');

    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="ai-interpretation" style="
            background: rgba(0,0,0,0.7); 
            padding: 30px; 
            border-radius: 15px; 
            border: 1px solid var(--primary-gold); 
            backdrop-filter: blur(10px);
            margin: 20px 0;
            line-height: 1.8;
            font-size: 1.1rem;
        ">
            <div style="
                text-align: center; 
                font-size: 1.5rem; 
                color: var(--primary-gold); 
                margin-bottom: 25px;
                font-family: 'Philosopher', serif;
            ">
                ${t('oracle-reading')}
            </div>
            <div style="white-space: pre-line;">${formattedInterpretation}</div>
        </div>
    `;

    const cardsDisplay = document.createElement('div');
    cardsDisplay.className = 'selected-cards-display';
    cardsDisplay.style.cssText = `
        display: flex; 
        justify-content: center; 
        gap: 30px; 
        margin-top: 30px; 
        flex-wrap: wrap;
    `;

    for (let i = 0; i < selectedCards.length; i++) {
        const card = selectedCards[i];
        const cardDisplay = document.createElement('div');
        cardDisplay.style.cssText = `
            text-align: center; 
            background: rgba(0,0,0,0.6); 
            padding: 20px; 
            border-radius: 15px; 
            border: 2px solid var(--primary-gold);
            max-width: 220px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        `;
        
        const imagePath = getTarotImagePath(card.name);
        
        // 🆕 優先使用預加載的圖片
        let imageExists = imagePreloader.isImageCached(imagePath);
        
        // 如果沒有緩存，嘗試加載
        if (!imageExists) {
            console.log(`🔄 結果頁面補充加載圖片: ${card.name}`);
            try {
                await imagePreloader.preloadImage(imagePath);
                imageExists = true;
            } catch (error) {
                console.warn(`結果頁面圖片加載失敗: ${card.name}`, error);
                imageExists = false;
            }
        }
        
        cardDisplay.innerHTML = `
            <div style="position: relative; margin-bottom: 15px;">
                ${imageExists ? 
                    `<img src="${imagePath}" 
                         alt="${card.name}" 
                         style="
                            width: 140px; 
                            height: 230px; 
                            object-fit: cover; 
                            border-radius: 10px; 
                            border: 2px solid var(--primary-gold);
                            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                            ${card.orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}
                         "
                         onerror="console.warn('結果頁圖片載入失敗:', '${card.name}'); this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div style="
                        width: 140px; 
                        height: 230px; 
                        background: linear-gradient(135deg, var(--dark-red), #4a0000);
                        border: 2px solid var(--primary-gold);
                        border-radius: 10px;
                        display: none;
                        align-items: center;
                        justify-content: center;
                        font-size: 3.5rem;
                        color: var(--primary-gold);
                        ${card.orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}
                     ">${card.symbol}</div>` :
                    `<div style="
                        width: 140px; 
                        height: 230px; 
                        background: linear-gradient(135deg, var(--dark-red), #4a0000);
                        border: 2px solid var(--primary-gold);
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 3.5rem;
                        color: var(--primary-gold);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                        ${card.orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}
                    ">${card.symbol}</div>`
                }
                ${card.orientation === 'reversed' ? 
                    `<div style="
                        position: absolute; 
                        top: -8px; 
                        right: -8px; 
                        background: linear-gradient(45deg, #ffa500, #ff8c00); 
                        color: white; 
                        padding: 4px 8px; 
                        border-radius: 10px; 
                        font-size: 0.8rem; 
                        font-weight: bold;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    ">${t('reversed')}</div>` : ''
                }
            </div>
            <div style="
                font-size: 1rem; 
                font-weight: 600;
                color: var(--primary-gold);
                margin-bottom: 8px;
                line-height: 1.3;
            ">
                ${card.name}
            </div>
            <div style="
                font-size: 0.85rem; 
                color: ${card.orientation === 'upright' ? '#90ee90' : '#ffa500'};
                font-weight: 500;
            ">
                (${card.orientation === 'upright' ? t('upright') : t('reversed')})
            </div>
        `;
        
        cardsDisplay.appendChild(cardDisplay);
    }

    container.appendChild(cardsDisplay);
}

// 顯示 API 錯誤
function showAPIError() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #ff6b6b;">
            <div style="font-size: 1.5rem; margin-bottom: 20px;">⚠️</div>
            <div>${t('api-error')}</div>
            <div style="font-size: 0.9rem; margin-top: 10px; opacity: 0.8;">${t('api-error-detail')}</div>
        </div>
    `;
}

// 其他輔助函數
function createSelectEffect(cardElement) {
    const effect = document.createElement('div');
    effect.className = 'card-select-effect';
    cardElement.appendChild(effect);
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 600);
}

function updateProgress() {
    const maxCards = parseInt(document.getElementById('totalCards').textContent);
    const progress = (selectedCards.length / maxCards) * 100;
    document.getElementById('selectedCount').textContent = selectedCards.length;
    document.getElementById('progressFill').style.width = progress + '%';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'rgba(255, 107, 107, 0.9)' : 
                   type === 'warning' ? 'rgba(255, 193, 7, 0.9)' : 
                   'rgba(212, 175, 55, 0.9)';
    
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${bgColor};
        color: #fff; padding: 15px 25px; border-radius: 10px; z-index: 1000; 
        font-weight: bold; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// 重新開始占卜
function restartDivination() {
    selectedCards = [];
    currentQuestion = "";
    currentMode = "three";
    
    // 清理表單
    document.getElementById('questionInput').value = '';
    document.getElementById('choice1Input').value = '';
    document.getElementById('choice2Input').value = '';
    document.getElementById('choiceInputs').style.display = 'none';
    
    // 清理進度
    document.getElementById('selectedCount').textContent = '0';
    document.getElementById('progressFill').style.width = '0%';
    
    // 清理其他內容
    document.getElementById('cardsFan').innerHTML = '';
    document.getElementById('resultsContainer').innerHTML = '';
    
    // 重置牌陣選擇
    document.querySelectorAll('.spread-card').forEach(card => card.classList.remove('active'));
    document.querySelector('.spread-card[data-mode="three"]').classList.add('active');
    
    showStep(1);
}

// 鍵盤和觸摸事件
document.addEventListener('keydown', function(e) {
    const scrollWrapper = document.querySelector('.cards-scroll-wrapper');
    if (!scrollWrapper || !document.getElementById('step4').classList.contains('active')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollWrapper.scrollLeft -= 100; }
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollWrapper.scrollLeft += 100; }
});

document.addEventListener('wheel', function(e) {
    const scrollWrapper = document.querySelector('.cards-scroll-wrapper');
    if (!scrollWrapper || !document.getElementById('step4').classList.contains('active')) return;
    const rect = scrollWrapper.getBoundingClientRect();
    if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        e.preventDefault();
        scrollWrapper.scrollLeft += e.deltaY;
    }
}, { passive: false });

document.addEventListener('touchmove', function(e) {
    const scrollWrapper = document.querySelector('.cards-scroll-wrapper');
    if (!scrollWrapper || !document.getElementById('step4').classList.contains('active')) return;
    const rect = scrollWrapper.getBoundingClientRect();
    const touch = e.touches[0];
    if (touch.clientY < rect.top || touch.clientY > rect.bottom) { return; }
}, { passive: true });

// 語言切換功能（單一按鈕）
function toggleLanguage() {
    const btn = document.querySelector('.lang-toggle-btn');
    const langText = btn.querySelector('.lang-text');
    const currentLang = langText.getAttribute('data-current');
    
    // 切換語言
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    currentLanguage = newLang;
    
    // 更新按鈕文字和狀態
    langText.setAttribute('data-current', newLang);
    langText.textContent = newLang === 'zh' ? '中文' : 'EN';
    
    // 添加切換動畫
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        btn.style.transform = '';
    }, 150);
    
    // 更新頁面標題
    document.title = newLang === 'zh' ? 'TarotVision - 塔羅視界' : 'TarotVision - Mystical Insights';
    document.documentElement.lang = newLang === 'zh' ? 'zh-TW' : 'en';
    
    // 更新所有具有多語言屬性的元素
    updateLanguageElements();
    
    // 如果當前在步驟3，更新牌陣描述
    if (document.getElementById('step3').classList.contains('active')) {
        updateSpreadDescription();
    }
}


// ===== 預加載進度控制函數 =====

// 顯示預加載進度
function showPreloadProgress() {
    const indicator = document.getElementById('preloadIndicator');
    if (indicator) {
        indicator.style.display = 'block';
        updateLanguageElements(); // 確保語言正確
    }
}

// 隱藏預加載進度
function hidePreloadProgress() {
    const indicator = document.getElementById('preloadIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// 更新預加載進度
function updatePreloadProgress(current, total) {
    const progressBar = document.getElementById('preloadProgress');
    if (progressBar) {
        const percentage = (current / total) * 100;
        progressBar.style.width = percentage + '%';
    }
}

// ===== 性能監控函數 =====

// 性能監控器
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            imageLoadTimes: [],
            cardSelectionTimes: [],
            pageLoadTime: performance.now()
        };
    }

    // 記錄圖片加載時間
    recordImageLoad(imagePath, loadTime) {
        this.metrics.imageLoadTimes.push({
            path: imagePath,
            time: loadTime,
            timestamp: Date.now()
        });
    }

    // 記錄選卡時間
    recordCardSelection(cardName, selectionTime) {
        this.metrics.cardSelectionTimes.push({
            card: cardName,
            time: selectionTime,
            timestamp: Date.now()
        });
    }

    // 獲取性能報告
    getPerformanceReport() {
        const avgImageLoadTime = this.metrics.imageLoadTimes.length > 0 
            ? this.metrics.imageLoadTimes.reduce((sum, item) => sum + item.time, 0) / this.metrics.imageLoadTimes.length
            : 0;

        const avgCardSelectionTime = this.metrics.cardSelectionTimes.length > 0
            ? this.metrics.cardSelectionTimes.reduce((sum, item) => sum + item.time, 0) / this.metrics.cardSelectionTimes.length
            : 0;

        return {
            totalPageLoadTime: performance.now() - this.metrics.pageLoadTime,
            averageImageLoadTime: avgImageLoadTime,
            averageCardSelectionTime: avgCardSelectionTime,
            totalImagesLoaded: this.metrics.imageLoadTimes.length,
            totalCardsSelected: this.metrics.cardSelectionTimes.length,
            cacheHitRate: imagePreloader.getCacheStats()
        };
    }

    // 在控制台顯示性能報告
    showReport() {
        const report = this.getPerformanceReport();
        console.group('📊 TarotVision 性能報告');
        console.log(`頁面總載入時間: ${report.totalPageLoadTime.toFixed(2)}ms`);
        console.log(`平均圖片載入時間: ${report.averageImageLoadTime.toFixed(2)}ms`);
        console.log(`平均選卡響應時間: ${report.averageCardSelectionTime.toFixed(2)}ms`);
        console.log(`已載入圖片數量: ${report.totalImagesLoaded}`);
        console.log(`已選擇卡牌數量: ${report.totalCardsSelected}`);
        console.log(`圖片緩存狀態:`, report.cacheHitRate);
        console.groupEnd();
    }
}

// 創建性能監控器實例
const performanceMonitor = new PerformanceMonitor();
