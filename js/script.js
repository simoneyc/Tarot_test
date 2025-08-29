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
        'notification-choices': '請完整描述兩個選項再繼續！',
        'clear-records': '清除記錄',
        'clear-records-title': '清除占卜記錄',
        'clear-records-message': '您希望如何清除記錄？',
        'clear-all': '清除全部記錄',
        'clear-non-favorites': '僅清除非收藏記錄',
        'cancel': '取消',
        'final-confirm-all': '確定要刪除全部 {count} 條記錄嗎？此操作無法撤銷！',
        'final-confirm-non-fav': '確定要刪除 {count} 條非收藏記錄嗎？此操作無法撤銷！',
        'records-cleared': '記錄已清除',
        'no-records-to-clear': '沒有記錄可以清除'
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
        'notification-choices': 'Please fully describe both options before continuing!',
        'clear-records': 'Clear Records',
        'clear-records-title': 'Clear Divination Records',
        'clear-records-message': 'How would you like to clear the records?',
        'clear-all': 'Clear All Records',
        'clear-non-favorites': 'Clear Non-Favorite Records Only',
        'cancel': 'Cancel',
        'final-confirm-all': 'Are you sure you want to delete all {count} records? This action cannot be undone!',
        'final-confirm-non-fav': 'Are you sure you want to delete {count} non-favorite records? This action cannot be undone!',
        'records-cleared': 'Records cleared',
        'no-records-to-clear': 'No records to clear'
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

        // 🆕 保存占卜記錄
        const recordData = {
            question: currentQuestion,
            mode: currentMode,
            cards: selectedCards,
            interpretation: interpretation
        };
        divinationManager.saveRecord(recordData);
        
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
    // 🆕 自動保存占卜記錄
    // saveCurrentDivination(interpretation);

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

// ===== 占卜記錄管理器類 =====

class DivinationManager {
    constructor() {
        this.storageKeys = {
            RECORDS: 'tarot_divination_records',
            FAVORITES: 'tarot_favorite_records', 
            USER_STATS: 'tarot_user_statistics',
            SETTINGS: 'tarot_user_settings',
            TAGS: 'tarot_user_tags'
        };
        
        this.maxRecords = 200;  // 最大記錄數
        this.maxFavorites = 50; // 最大收藏數
        
        // 初始化時檢查存儲
        this.initializeStorage();
    }

    // ===== 核心CRUD操作 =====
    
    /**
     * 保存新的占卜記錄
     * @param {Object} divinationData - 占卜數據
     * @returns {Object} 保存的記錄
     */
    saveRecord(divinationData) {
        try {
            const records = this.getAllRecords();
            
            // 創建新記錄
            const newRecord = {
                id: this.generateId(),
                timestamp: new Date().toISOString(),
                language: currentLanguage,
                question: divinationData.question,
                questionType: this.classifyQuestion(divinationData.question),
                mode: divinationData.mode,
                cards: divinationData.cards.map(card => ({
                    name: card.name,
                    orientation: card.orientation,
                    position: this.getCardPosition(card, divinationData.mode),
                    symbol: card.symbol,
                    imagePath: getTarotImagePath(card.name)
                })),
                interpretation: divinationData.interpretation,
                interpretationSummary: this.generateSummary(divinationData.interpretation),
                isFavorite: false,
                userRating: null,
                userNotes: "",
                tags: [],
                readCount: 1,
                lastViewed: new Date().toISOString(),
                isArchived: false
            };

            // 添加到記錄數組開頭（最新的在前）
            records.unshift(newRecord);
            
            // 限制記錄數量（但保留收藏）
            this.limitRecords(records);
            
            // 保存記錄
            localStorage.setItem(this.storageKeys.RECORDS, JSON.stringify(records));
            
            // 更新統計
            this.updateStatistics('save', newRecord);
            
            console.log(`💾 占卜記錄已保存: ${newRecord.id}`);
            return newRecord;
            
        } catch (error) {
            console.error('保存占卜記錄失敗:', error);
            this.showNotification('記錄保存失敗', 'error');
            return null;
        }
    }

    /**
     * 獲取所有記錄
     * @param {Object} filters - 過濾條件
     * @returns {Array} 記錄數組
     */
    getAllRecords(filters = {}) {
        try {
            const data = localStorage.getItem(this.storageKeys.RECORDS);
            let records = data ? JSON.parse(data) : [];
            
            // 應用過濾條件
            if (Object.keys(filters).length > 0) {
                records = this.applyFilters(records, filters);
            }
            
            return records;
            
        } catch (error) {
            console.error('讀取記錄失敗:', error);
            return [];
        }
    }

    /**
     * 根據ID獲取記錄
     * @param {string} recordId - 記錄ID
     * @returns {Object|null} 記錄對象
     */
    getRecordById(recordId) {
        const records = this.getAllRecords();
        const record = records.find(r => r.id === recordId);
        
        if (record) {
            // 更新查看統計
            record.readCount++;
            record.lastViewed = new Date().toISOString();
            this.updateRecord(record);
        }
        
        return record || null;
    }

    /**
     * 更新記錄
     * @param {Object} updatedRecord - 更新後的記錄
     * @returns {boolean} 更新是否成功
     */
    updateRecord(updatedRecord) {
        try {
            const records = this.getAllRecords();
            const index = records.findIndex(r => r.id === updatedRecord.id);
            
            if (index !== -1) {
                records[index] = { ...records[index], ...updatedRecord };
                localStorage.setItem(this.storageKeys.RECORDS, JSON.stringify(records));
                
                // 更新統計
                this.updateStatistics('update', updatedRecord);
                
                return true;
            }
            return false;
            
        } catch (error) {
            console.error('更新記錄失敗:', error);
            return false;
        }
    }

    /**
     * 刪除記錄
     * @param {string} recordId - 記錄ID
     * @returns {boolean} 刪除是否成功
     */
    deleteRecord(recordId) {
        try {
            const records = this.getAllRecords();
            const recordIndex = records.findIndex(r => r.id === recordId);
            
            if (recordIndex !== -1) {
                const deletedRecord = records[recordIndex];
                records.splice(recordIndex, 1);
                
                localStorage.setItem(this.storageKeys.RECORDS, JSON.stringify(records));
                
                // 更新統計
                this.updateStatistics('delete', deletedRecord);
                
                console.log(`🗑️ 記錄已刪除: ${recordId}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('刪除記錄失敗:', error);
            return false;
        }
    }

    // ===== 收藏功能 =====
    
    /**
     * 切換收藏狀態
     * @param {string} recordId - 記錄ID
     * @returns {boolean} 新的收藏狀態
     */
    toggleFavorite(recordId) {
        const record = this.getRecordById(recordId);
        if (!record) return false;
        
        const newFavoriteStatus = !record.isFavorite;
        
        // 檢查收藏數量限制
        if (newFavoriteStatus && this.getFavorites().length >= this.maxFavorites) {
            this.showNotification('收藏數量已達上限', 'warning');
            return false;
        }
        
        record.isFavorite = newFavoriteStatus;
        this.updateRecord(record);
        
        // 更新收藏索引（性能優化）
        this.updateFavoritesIndex();
        
        console.log(`${newFavoriteStatus ? '⭐' : '☆'} 收藏狀態已更新: ${recordId}`);
        return newFavoriteStatus;
    }

    /**
     * 獲取收藏記錄
     * @returns {Array} 收藏記錄數組
     */
    getFavorites() {
        return this.getAllRecords().filter(record => record.isFavorite);
    }

    // ===== 搜索和過濾 =====
    
    /**
     * 搜索記錄
     * @param {string} keyword - 關鍵字
     * @param {Object} filters - 過濾條件
     * @returns {Array} 匹配的記錄
     */
    searchRecords(keyword = '', filters = {}) {
        let records = this.getAllRecords();
        
        // 關鍵字搜索
        if (keyword.trim()) {
            const lowerKeyword = keyword.toLowerCase();
            records = records.filter(record => 
                record.question.toLowerCase().includes(lowerKeyword) ||
                record.interpretation.toLowerCase().includes(lowerKeyword) ||
                record.userNotes.toLowerCase().includes(lowerKeyword) ||
                record.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
                record.cards.some(card => card.name.toLowerCase().includes(lowerKeyword))
            );
        }
        
        // 應用過濾條件
        records = this.applyFilters(records, filters);
        
        return records;
    }

    /**
     * 應用過濾條件
     * @private
     */
    applyFilters(records, filters) {
        return records.filter(record => {
            // 占卜模式過濾
            if (filters.mode && record.mode !== filters.mode) return false;
            
            // 問題類型過濾
            if (filters.questionType && record.questionType !== filters.questionType) return false;
            
            // 收藏狀態過濾
            if (filters.favoritesOnly && !record.isFavorite) return false;
            
            // 評分過濾
            if (filters.minRating && (!record.userRating || record.userRating < filters.minRating)) return false;
            
            // 時間範圍過濾
            if (filters.dateRange) {
                const recordDate = new Date(record.timestamp);
                if (filters.dateRange.start && recordDate < new Date(filters.dateRange.start)) return false;
                if (filters.dateRange.end && recordDate > new Date(filters.dateRange.end)) return false;
            }
            
            // 標籤過濾
            if (filters.tags && filters.tags.length > 0) {
                const hasMatchingTag = filters.tags.some(tag => record.tags.includes(tag));
                if (!hasMatchingTag) return false;
            }
            
            return true;
        });
    }

    // ===== 輔助方法 =====
    
    /**
     * 生成唯一ID
     * @private
     */
    generateId() {
        return `div_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 問題分類
     * @private
     */
    classifyQuestion(question) {
        const lowerQ = question.toLowerCase();
        
        // 愛情關鍵字
        if (lowerQ.includes('愛情') || lowerQ.includes('戀愛') || lowerQ.includes('感情') || 
            lowerQ.includes('love') || lowerQ.includes('relationship') || lowerQ.includes('romance')) {
            return 'love';
        }
        
        // 事業關鍵字
        if (lowerQ.includes('工作') || lowerQ.includes('事業') || lowerQ.includes('職業') ||
            lowerQ.includes('career') || lowerQ.includes('work') || lowerQ.includes('job')) {
            return 'career';
        }
        
        // 健康關鍵字
        if (lowerQ.includes('健康') || lowerQ.includes('身體') || 
            lowerQ.includes('health') || lowerQ.includes('wellness')) {
            return 'health';
        }
        
        // 選擇關鍵字
        if (lowerQ.includes('選擇') || lowerQ.includes('決定') || lowerQ.includes('抉擇') ||
            lowerQ.includes('choice') || lowerQ.includes('decision') || lowerQ.includes('should')) {
            return 'choice';
        }
        
        return 'general';
    }

    /**
     * 生成解讀摘要
     * @private
     */
    generateSummary(interpretation, maxLength = 100) {
        if (!interpretation) return '';
        
        // 移除HTML標籤和多餘空白
        const cleanText = interpretation.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        
        if (cleanText.length <= maxLength) return cleanText;
        
        // 在句號處截斷，避免截斷句子
        const truncated = cleanText.substr(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('。');
        const lastPeriodEn = truncated.lastIndexOf('.');
        
        const cutPoint = Math.max(lastPeriod, lastPeriodEn);
        if (cutPoint > maxLength * 0.7) { // 如果截斷點不會太短
            return cleanText.substr(0, cutPoint + 1);
        }
        
        return truncated + '...';
    }

    /**
     * 獲取卡牌在牌陣中的位置
     * @private
     */
    getCardPosition(card, mode) {
        const positions = spreadInfo[mode]?.positions[currentLanguage] || [];
        const cardIndex = selectedCards.findIndex(c => c.name === card.name);
        return positions[cardIndex] || `位置${cardIndex + 1}`;
    }

    /**
     * 限制記錄數量
     * @private
     */
    limitRecords(records) {
        if (records.length <= this.maxRecords) return;
        
        // 分離收藏和非收藏記錄
        const favorites = records.filter(r => r.isFavorite);
        const nonFavorites = records.filter(r => !r.isFavorite);
        
        // 如果收藏記錄太多，保留最新的
        if (favorites.length > this.maxFavorites) {
            favorites.splice(this.maxFavorites);
        }
        
        // 計算可保留的非收藏記錄數
        const maxNonFavorites = this.maxRecords - favorites.length;
        if (nonFavorites.length > maxNonFavorites) {
            nonFavorites.splice(maxNonFavorites);
        }
        
        // 重新組合（收藏記錄和非收藏記錄按時間排序）
        records.length = 0;
        records.push(...[...favorites, ...nonFavorites].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        ));
    }

    /**
     * 初始化存儲
     * @private
     */
    initializeStorage() {
        // 檢查並修復數據結構
        const records = this.getAllRecords();
        let needsUpdate = false;
        
        records.forEach(record => {
            // 添加缺失的字段
            if (!record.interpretationSummary && record.interpretation) {
                record.interpretationSummary = this.generateSummary(record.interpretation);
                needsUpdate = true;
            }
            if (!record.questionType) {
                record.questionType = this.classifyQuestion(record.question);
                needsUpdate = true;
            }
            if (record.readCount === undefined) {
                record.readCount = 1;
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            localStorage.setItem(this.storageKeys.RECORDS, JSON.stringify(records));
            console.log('📊 數據結構已更新');
        }
    }

    /**
     * 顯示通知
     * @private
     */
    showNotification(message, type = 'info') {
        // 複用現有的 showNotification 函數
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * 更新統計信息
     * @private
     */
    updateStatistics(action, record) {
        // 這裡可以添加統計邏輯，目前先保持空實現
        console.log(`統計更新: ${action}`, record.id);
    }

    /**
     * 更新收藏索引（性能優化）
     * @private  
     */
    updateFavoritesIndex() {
        // 收藏索引優化邏輯，目前先保持空實現
        console.log('收藏索引已更新');
    }
}

// 創建全局實例
const divinationManager = new DivinationManager();

// ===== 歷史記錄功能實現 =====

// 歷史記錄界面管理器
class HistoryUI {
    constructor() {
        this.currentView = 'grid'; // grid 或 list
        this.currentPage = 1;
        this.recordsPerPage = 12;
        this.currentFilters = {};
        this.searchKeyword = '';
        
        // 綁定事件監聽器
        this.bindEventListeners();
    }

    /**
     * 綁定事件監聽器
     */
    bindEventListeners() {
        // 搜索框事件
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // 防抖搜索
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchKeyword = e.target.value;
                    this.loadRecords();
                }, 500);
            });
        }

        // 過濾器事件
        ['modeFilter', 'typeFilter', 'favFilter'].forEach(filterId => {
            const filterElement = document.getElementById(filterId);
            if (filterElement) {
                filterElement.addEventListener('change', () => {
                    this.updateFilters();
                    this.loadRecords();
                });
            }
        });
    }

    /**
     * 更新過濾條件
     */
    updateFilters() {
        this.currentFilters = {
            mode: document.getElementById('modeFilter')?.value || '',
            questionType: document.getElementById('typeFilter')?.value || '',
            favoritesOnly: document.getElementById('favFilter')?.value === 'favorites'
        };
        this.currentPage = 1; // 重置到第一頁
    }

    /**
     * 加載記錄
     */
    async loadRecords() {
        try {
            // 獲取過濾後的記錄
            const allRecords = divinationManager.searchRecords(this.searchKeyword, this.currentFilters);
            
            // 更新統計
            this.updateStats(allRecords);
            
            // 處理空狀態
            if (allRecords.length === 0) {
                this.showEmptyState();
                return;
            }
            
            // 分頁處理
            const totalPages = Math.ceil(allRecords.length / this.recordsPerPage);
            const startIndex = (this.currentPage - 1) * this.recordsPerPage;
            const endIndex = startIndex + this.recordsPerPage;
            const pageRecords = allRecords.slice(startIndex, endIndex);
            
            // 渲染記錄
            if (this.currentView === 'grid') {
                this.renderGridView(pageRecords);
            } else {
                this.renderListView(pageRecords);
            }
            
            // 渲染分頁
            this.renderPagination(totalPages);
            
            // 隱藏空狀態
            this.hideEmptyState();
            
        } catch (error) {
            console.error('加載記錄失敗:', error);
            showNotification('加載記錄失敗', 'error');
        }
    }

    /**
     * 渲染網格視圖
     */
    renderGridView(records) {
        const container = document.getElementById('recordsGrid');
        if (!container) return;
        
        container.style.display = 'grid';
        document.getElementById('recordsList').style.display = 'none';
        
        container.innerHTML = records.map(record => this.createRecordCard(record)).join('');
        
        // 更新視圖按鈕狀態
        this.updateViewButtons('grid');
    }

    /**
     * 渲染列表視圖
     */
    renderListView(records) {
        const container = document.getElementById('recordsList');
        if (!container) return;
        
        container.style.display = 'block';
        document.getElementById('recordsGrid').style.display = 'none';
        
        container.innerHTML = `
            <div style="background: rgba(0,0,0,0.8); border-radius: 15px; overflow: hidden;">
                ${records.map(record => this.createRecordListItem(record)).join('')}
            </div>
        `;
        
        // 更新視圖按鈕狀態
        this.updateViewButtons('list');
    }

    /**
     * 創建記錄卡片
     */
    createRecordCard(record) {
        const date = new Date(record.timestamp);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
        const formattedTime = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="record-card" onclick="openRecordModal('${record.id}')">
                <!-- 卡片頭部 -->
                <div class="record-header">
                    <div class="record-date">${formattedDate} ${formattedTime}</div>
                    <div class="record-actions" onclick="event.stopPropagation();">
                        <button class="action-btn favorite-btn ${record.isFavorite ? 'active' : ''}" 
                                onclick="toggleFavorite('${record.id}')" 
                                title="${record.isFavorite ? '取消收藏' : '加入收藏'}">
                            ${record.isFavorite ? '⭐' : '☆'}
                        </button>
                        <button class="action-btn" onclick="shareRecord('${record.id}')" title="分享">📤</button>
                        <button class="action-btn" onclick="deleteRecord('${record.id}')" title="刪除">🗑️</button>
                    </div>
                </div>
                
                <!-- 問題標題 -->
                <div class="record-question">${this.truncateText(record.question, 80)}</div>
                
                <!-- 卡牌預覽 -->
                <div class="record-cards-preview">
                    ${record.cards.slice(0, 5).map(card => `
                        <div class="card-mini ${card.orientation === 'reversed' ? 'reversed' : ''}" 
                            title="${card.name} (${card.orientation})">
                            <img src="${getTarotImagePath(card.name)}" 
                                alt="${card.name}"
                                style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; ${card.orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="width: 100%; height: 100%; display: none; align-items: center; justify-content: center; font-size: 1rem; ${card.orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}">
                                ${card.symbol}
                            </div>
                        </div>
                    `).join('')}
                    ${record.cards.length > 5 ? '<span style="color: rgba(212, 175, 55, 0.7);">...</span>' : ''}
                </div>
                
                <!-- 解讀摘要 -->
                <div class="record-summary">${record.interpretationSummary}</div>
                
                <!-- 標籤 -->
                ${record.tags.length > 0 ? `
                    <div class="record-tags">
                        ${record.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${record.tags.length > 3 ? '<span class="tag">...</span>' : ''}
                    </div>
                ` : ''}
                
                <!-- 元數據 -->
                <div class="record-meta">
                    <div class="record-stats">
                        <div class="stat-item">
                            <span>👁️</span>
                            <span>${record.readCount}</span>
                        </div>
                        ${record.userRating ? `
                            <div class="stat-item">
                                <span>⭐</span>
                                <span>${record.userRating}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div style="color: rgba(212, 175, 55, 0.6); font-size: 0.7rem;">
                        ${this.getModeDisplayName(record.mode)} · ${this.getTypeDisplayName(record.questionType)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 創建列表項
     */
    createRecordListItem(record) {
        const date = new Date(record.timestamp);
        const formattedDate = date.toLocaleDateString('zh-TW');
        
        return `
            <div style="display: flex; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.2); cursor: pointer;" 
                 onclick="openRecordModal('${record.id}')">
                
                <!-- 日期 -->
                <div style="min-width: 100px; color: rgba(212, 175, 55, 0.8); font-size: 0.9rem;">
                    ${formattedDate}
                </div>
                
                <!-- 問題和模式 -->
                <div style="flex: 1; margin: 0 20px;">
                    <div style="color: var(--primary-gold); font-weight: 600; margin-bottom: 5px;">
                        ${this.truncateText(record.question, 100)}
                    </div>
                    <div style="color: rgba(212, 175, 55, 0.7); font-size: 0.8rem;">
                        ${this.getModeDisplayName(record.mode)} · ${this.getTypeDisplayName(record.questionType)}
                        ${record.tags.length > 0 ? ` · ${record.tags.slice(0, 2).join(', ')}` : ''}
                    </div>
                </div>
                
                <!-- 統計 -->
                <div style="display: flex; align-items: center; gap: 15px; color: rgba(212, 175, 55, 0.7); font-size: 0.8rem;">
                    <span>👁️ ${record.readCount}</span>
                    ${record.userRating ? `<span>⭐ ${record.userRating}</span>` : ''}
                    ${record.isFavorite ? '<span style="color: #ffd700;">⭐</span>' : ''}
                </div>
                
                <!-- 操作按鈕 -->
                <div style="margin-left: 20px;" onclick="event.stopPropagation();">
                    <button class="action-btn" onclick="toggleFavorite('${record.id}')" 
                            title="${record.isFavorite ? '取消收藏' : '加入收藏'}">
                        ${record.isFavorite ? '⭐' : '☆'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 渲染分頁
     */
    renderPagination(totalPages) {
        const container = document.getElementById('pagination');
        if (!container || totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const pages = [];
        
        // 上一頁
        if (this.currentPage > 1) {
            pages.push(`<button class="page-btn" onclick="historyUI.goToPage(${this.currentPage - 1})">‹</button>`);
        }
        
        // 頁碼
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            pages.push(`<button class="page-btn" onclick="historyUI.goToPage(1)">1</button>`);
            if (startPage > 2) pages.push('<span style="color: var(--primary-gold);">...</span>');
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(`<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="historyUI.goToPage(${i})">${i}</button>`);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pages.push('<span style="color: var(--primary-gold);">...</span>');
            pages.push(`<button class="page-btn" onclick="historyUI.goToPage(${totalPages})">${totalPages}</button>`);
        }
        
        // 下一頁
        if (this.currentPage < totalPages) {
            pages.push(`<button class="page-btn" onclick="historyUI.goToPage(${this.currentPage + 1})">›</button>`);
        }

        container.innerHTML = pages.join('');
    }

    /**
     * 跳轉到指定頁面
     */
    goToPage(page) {
        this.currentPage = page;
        this.loadRecords();
        
        // 滾動到頂部
        document.querySelector('.history-container').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 更新統計信息
     */
    updateStats(records) {
        const totalElement = document.getElementById('totalCount');
        const favoriteElement = document.getElementById('favoriteCount');
        
        if (totalElement) totalElement.textContent = records.length;
        if (favoriteElement) {
            const favoriteCount = records.filter(r => r.isFavorite).length;
            favoriteElement.textContent = favoriteCount;
        }
    }

    /**
     * 顯示空狀態
     */
    showEmptyState() {
        document.getElementById('recordsGrid').style.display = 'none';
        document.getElementById('recordsList').style.display = 'none';
        document.getElementById('pagination').innerHTML = '';
        document.getElementById('emptyState').style.display = 'block';
    }

    /**
     * 隱藏空狀態
     */
    hideEmptyState() {
        document.getElementById('emptyState').style.display = 'none';
    }

    /**
     * 更新視圖按鈕狀態
     */
    updateViewButtons(activeView) {
        document.getElementById('gridViewBtn').classList.toggle('active', activeView === 'grid');
        document.getElementById('listViewBtn').classList.toggle('active', activeView === 'list');
    }

    /**
     * 輔助方法：截斷文本
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    /**
     * 輔助方法：獲取模式顯示名稱
     */
    getModeDisplayName(mode) {
        const modeNames = {
            single: currentLanguage === 'zh' ? '單張' : 'Single',
            three: currentLanguage === 'zh' ? '三張' : 'Three',
            core: currentLanguage === 'zh' ? '核心' : 'Core',
            choice: currentLanguage === 'zh' ? '選擇' : 'Choice',
            love: currentLanguage === 'zh' ? '感情' : 'Love'
        };
        return modeNames[mode] || mode;
    }

    /**
     * 輔助方法：獲取類型顯示名稱
     */
    getTypeDisplayName(type) {
        const typeNames = {
            love: currentLanguage === 'zh' ? '愛情' : 'Love',
            career: currentLanguage === 'zh' ? '事業' : 'Career',
            health: currentLanguage === 'zh' ? '健康' : 'Health',
            choice: currentLanguage === 'zh' ? '選擇' : 'Choice',
            general: currentLanguage === 'zh' ? '一般' : 'General'
        };
        return typeNames[type] || type;
    }
}

// 全局函數
let historyUI = null;

/**
 * 初始化歷史記錄頁面
 */
function initHistoryPage() {
    if (!historyUI) {
        historyUI = new HistoryUI();
    }
    historyUI.loadRecords();
}

/**
 * 切換視圖模式
 */
function switchView(viewType) {
    if (historyUI) {
        historyUI.currentView = viewType;
        historyUI.loadRecords();
    }
}

/**
 * 搜索記錄
 */
function searchRecords() {
    if (historyUI) {
        const searchInput = document.getElementById('searchInput');
        historyUI.searchKeyword = searchInput?.value || '';
        historyUI.currentPage = 1;
        historyUI.loadRecords();
    }
}

/**
 * 切換收藏狀態
 */
function toggleFavorite(recordId) {
    const favoriteBtn = document.querySelector(`[onclick="toggleFavorite('${recordId}')"]`);
    
    // 立即添加觸覺回饋
    addButtonFeedback(favoriteBtn, 'favorite');
    
    // 獲取當前狀態
    const record = divinationManager.getRecordById(recordId);
    if (!record) return;
    
    const newStatus = !record.isFavorite;
    
    // 立即更新 UI（樂觀更新）
    if (favoriteBtn) {
        favoriteBtn.textContent = newStatus ? '⭐' : '☆';
        favoriteBtn.classList.toggle('active', newStatus);
        favoriteBtn.title = newStatus ? '取消收藏' : '加入收藏';
        
        // 添加立即視覺回饋動畫
        favoriteBtn.style.transform = 'scale(1.3)';
        favoriteBtn.style.color = newStatus ? '#ffd700' : '';
        setTimeout(() => {
            favoriteBtn.style.transform = '';
        }, 200);
    }
    
    // 執行數據操作
    try {
        const actualNewStatus = divinationManager.toggleFavorite(recordId);
        
        // 驗證操作是否成功，如果不一致則回滾 UI
        if (actualNewStatus !== newStatus && favoriteBtn) {
            favoriteBtn.textContent = actualNewStatus ? '⭐' : '☆';
            favoriteBtn.classList.toggle('active', actualNewStatus);
            favoriteBtn.title = actualNewStatus ? '取消收藏' : '加入收藏';
        }
        
        // 如果當前是只顯示收藏的過濾狀態，刷新列表
        if (historyUI && historyUI.currentFilters.favoritesOnly && !actualNewStatus) {
            historyUI.loadRecords();
        }
        
        showNotification(actualNewStatus ? '已加入收藏' : '已取消收藏', 'success');
        
    } catch (error) {
        console.error('收藏操作失敗:', error);
        
        // 回滾 UI 到原始狀態
        if (favoriteBtn) {
            favoriteBtn.textContent = record.isFavorite ? '⭐' : '☆';
            favoriteBtn.classList.toggle('active', record.isFavorite);
            favoriteBtn.title = record.isFavorite ? '取消收藏' : '加入收藏';
        }
        
        showNotification('操作失敗，請重試', 'error');
    }
}

/**
 * 刪除記錄
 */
function deleteRecord(recordId) {
    const deleteBtn = document.querySelector(`[onclick="deleteRecord('${recordId}')"]`);
    addButtonFeedback(deleteBtn, 'delete');
    if (confirm(currentLanguage === 'zh' ? '確定要刪除這條記錄嗎？' : 'Are you sure you want to delete this record?')) {
        const success = divinationManager.deleteRecord(recordId);
        if (success) {
            showNotification(currentLanguage === 'zh' ? '記錄已刪除' : 'Record deleted', 'success');
            if (historyUI) {
                historyUI.loadRecords();
            }
        }
    }
}

/**
 * 分享記錄
 */
function shareRecord(recordId) {
    const shareBtn = document.querySelector(`[onclick="shareRecord('${recordId}')"]`);
    addButtonFeedback(shareBtn, 'share');
    // 這個功能將在下一階段實現
    showNotification(currentLanguage === 'zh' ? '分享功能即將推出' : 'Share feature coming soon', 'info');
}

// ===== 歷史記錄整合功能 =====

/**
 * 顯示歷史記錄頁面
 */
function showHistoryPage() {
    // 添加點擊動畫
    const btn = document.querySelector('.nav-history-btn');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    
    // 切換到歷史記錄頁面
    showStep(7);
    
    // 初始化歷史記錄頁面
    setTimeout(() => {
        initHistoryPage();
        updateLanguageElements(); // 確保語言正確
    }, 100);
}

/**
 * 打開記錄詳情模態框
 */
function openRecordModal(recordId) {
    const record = divinationManager.getRecordById(recordId);
    if (!record) {
        showNotification('記錄不存在', 'error');
        return;
    }

    const modal = document.getElementById('recordModal');
    const content = document.getElementById('modalContent');
    
    if (!modal || !content) return;

    // 格式化日期
    const date = new Date(record.timestamp);
    const formattedDate = date.toLocaleDateString(currentLanguage === 'zh' ? 'zh-TW' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 生成卡牌展示
    const cardsDisplay = record.cards.map((card, index) => `
        <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 20px; border-radius: 15px; border: 2px solid var(--primary-gold); max-width: 200px;">
            <div style="position: relative; margin-bottom: 15px;">
                <div style="
                    width: 120px; 
                    height: 200px; 
                    border: 2px solid var(--primary-gold);
                    border-radius: 10px;
                    margin: 0 auto;
                    overflow: hidden;
                    ${card.orientation === 'reversed' ? 'transform: rotate(180deg);' : ''}
                ">
                    <img src="${getTarotImagePath(card.name)}" 
                        alt="${card.name}"
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="
                        width: 100%; 
                        height: 100%; 
                        background: linear-gradient(135deg, var(--dark-red), #4a0000);
                        display: none;
                        align-items: center;
                        justify-content: center;
                        font-size: 3rem;
                        color: var(--primary-gold);
                    ">${card.symbol}</div>
                </div>
                ${card.orientation === 'reversed' ? `
                    <div style="
                        position: absolute; 
                        top: -8px; 
                        right: 10px; 
                        background: linear-gradient(45deg, #ffa500, #ff8c00); 
                        color: white; 
                        padding: 4px 8px; 
                        border-radius: 8px; 
                        font-size: 0.7rem; 
                        font-weight: bold;
                    ">${t('reversed')}</div>
                ` : ''}
            </div>
            <div style="font-weight: 600; color: var(--primary-gold); margin-bottom: 8px; font-size: 0.9rem;">
                ${card.position}
            </div>
            <div style="font-weight: 600; color: var(--primary-gold); margin-bottom: 5px;">
                ${card.name}
            </div>
            <div style="font-size: 0.8rem; color: ${card.orientation === 'upright' ? '#90ee90' : '#ffa500'};">
                (${card.orientation === 'upright' ? t('upright') : t('reversed')})
            </div>
        </div>
    `).join('');

    // 填充模態框內容
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; margin-top: 120px;">
            <h2 style="color: var(--primary-gold); font-family: 'Philosopher', serif; margin-bottom: 10px;">
                ${currentLanguage === 'zh' ? '占卜記錄詳情' : 'Divination Record Details'}
            </h2>
            <p style="color: rgba(212, 175, 55, 0.8); font-size: 0.9rem;">${formattedDate}</p>
        </div>

        <!-- 問題 -->
        <div style="background: rgba(0,0,0,0.6); padding: 25px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <h3 style="color: var(--primary-gold); margin-bottom: 15px; font-family: 'Philosopher', serif;">
                ${t('question-label')}
            </h3>
            <p style="font-size: 1.2rem; line-height: 1.6; color: rgba(212, 175, 55, 0.9);">
                "${record.question}"
            </p>
        </div>

        <!-- 卡牌展示 -->
        <div style="margin-bottom: 30px;">
            <h3 style="color: var(--primary-gold); margin-bottom: 20px; text-align: center; font-family: 'Philosopher', serif;">
                ${currentLanguage === 'zh' ? '抽到的牌' : 'Cards Drawn'}
            </h3>
            <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                ${cardsDisplay}
            </div>
        </div>

        <!-- 解讀內容 -->
        <div style="background: rgba(0,0,0,0.6); padding: 25px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <h3 style="color: var(--primary-gold); margin-bottom: 20px; font-family: 'Philosopher', serif;">
                ${t('oracle-reading')}
            </h3>
            <div style="line-height: 1.8; color: rgba(212, 175, 55, 0.9); white-space: pre-line;">
                ${record.interpretation.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--primary-gold);">$1</strong>')}
            </div>
        </div>

        <!-- 用戶筆記和評分 -->
        <div style="background: rgba(0,0,0,0.6); padding: 25px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <h3 style="color: var(--primary-gold); margin-bottom: 20px; font-family: 'Philosopher', serif;">
                ${currentLanguage === 'zh' ? '個人筆記與評價' : 'Personal Notes & Rating'}
            </h3>
            
            <!-- 評分 -->
            <div style="margin-bottom: 20px;">
                <label style="color: var(--primary-gold); margin-bottom: 10px; display: block;">
                    ${currentLanguage === 'zh' ? '準確度評分：' : 'Accuracy Rating:'}
                </label>
                <div class="rating-stars" style="display: flex; gap: 5px; margin-bottom: 15px;">
                    ${[1,2,3,4,5].map(star => `
                        <span class="rating-star ${record.userRating >= star ? 'active' : ''}" 
                              onclick="updateRating('${record.id}', ${star})"
                              style="cursor: pointer; font-size: 1.5rem; color: ${record.userRating >= star ? '#ffd700' : 'rgba(212, 175, 55, 0.3)'}; transition: all 0.3s ease;">
                            ⭐
                        </span>
                    `).join('')}
                </div>
            </div>

            <!-- 筆記 -->
            <div>
                <label style="color: var(--primary-gold); margin-bottom: 10px; display: block;">
                    ${currentLanguage === 'zh' ? '個人筆記：' : 'Personal Notes:'}
                </label>
                <textarea id="recordNotes_${record.id}" 
                          style="width: 100%; height: 100px; background: rgba(0,0,0,0.8); color: var(--primary-gold); border: 2px solid rgba(212, 175, 55, 0.6); border-radius: 10px; padding: 15px; font-family: 'Cinzel', serif; font-size: 0.9rem; resize: vertical;"
                          placeholder="${currentLanguage === 'zh' ? '在此記錄你的想法、感受或後續發展...' : 'Record your thoughts, feelings, or follow-up developments...'}"
                          onchange="updateNotes('${record.id}', this.value)">${record.userNotes || ''}</textarea>
            </div>
        </div>

        <!-- 標籤管理 -->
        <div style="background: rgba(0,0,0,0.6); padding: 25px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <h3 style="color: var(--primary-gold); margin-bottom: 20px; font-family: 'Philosopher', serif;">
                ${currentLanguage === 'zh' ? '標籤管理' : 'Tag Management'}
            </h3>
            <div id="currentTags_${record.id}" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">
                ${record.tags.map(tag => `
                    <span class="tag" style="background: rgba(212, 175, 55, 0.2); color: var(--primary-gold); padding: 5px 12px; border-radius: 15px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;">
                        ${tag}
                        <span onclick="removeTag('${record.id}', '${tag}')" style="cursor: pointer; color: #ff6b6b; font-weight: bold;">×</span>
                    </span>
                `).join('')}
            </div>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="newTag_${record.id}" 
                       style="flex: 1; padding: 10px; background: rgba(0,0,0,0.8); color: var(--primary-gold); border: 2px solid rgba(212, 175, 55, 0.6); border-radius: 8px; font-family: 'Cinzel', serif;"
                       placeholder="${currentLanguage === 'zh' ? '新增標籤...' : 'Add tag...'}"
                       onkeypress="if(event.key==='Enter') addTag('${record.id}')">
                <button onclick="addTag('${record.id}')" 
                        style="background: var(--primary-gold); color: var(--dark-red); border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: 'Cinzel', serif;">
                    ${currentLanguage === 'zh' ? '添加' : 'Add'}
                </button>
            </div>
        </div>

        <!-- 統計信息 -->
        <div style="display: flex; justify-content: space-around; background: rgba(0,0,0,0.6); padding: 20px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <div style="text-align: center;">
                <div style="color: var(--primary-gold); font-size: 1.2rem; font-weight: bold;">👁️</div>
                <div style="color: rgba(212, 175, 55, 0.8); font-size: 0.8rem; margin-top: 5px;">
                    ${currentLanguage === 'zh' ? '查看次數' : 'View Count'}<br>
                    <strong>${record.readCount}</strong>
                </div>
            </div>
            <div style="text-align: center;">
                <div style="color: var(--primary-gold); font-size: 1.2rem; font-weight: bold;">📅</div>
                <div style="color: rgba(212, 175, 55, 0.8); font-size: 0.8rem; margin-top: 5px;">
                    ${currentLanguage === 'zh' ? '占卜模式' : 'Mode'}<br>
                    <strong>${divinationManager ? historyUI?.getModeDisplayName(record.mode) : record.mode}</strong>
                </div>
            </div>
            <div style="text-align: center;">
                <div style="color: var(--primary-gold); font-size: 1.2rem; font-weight: bold;">🏷️</div>
                <div style="color: rgba(212, 175, 55, 0.8); font-size: 0.8rem; margin-top: 5px;">
                    ${currentLanguage === 'zh' ? '問題類型' : 'Type'}<br>
                    <strong>${divinationManager ? historyUI?.getTypeDisplayName(record.questionType) : record.questionType}</strong>
                </div>
            </div>
        </div>

        <!-- 操作按鈕 -->
        <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
            <button onclick="toggleFavorite('${record.id}'); updateModalFavoriteButton('${record.id}')" 
                    id="modalFavoriteBtn_${record.id}"
                    style="background: ${record.isFavorite ? 'var(--primary-gold)' : 'transparent'}; color: ${record.isFavorite ? 'var(--dark-red)' : 'var(--primary-gold)'}; border: 2px solid var(--primary-gold); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cinzel', serif; font-weight: bold; transition: all 0.3s ease;">
                ${record.isFavorite ? '⭐ ' : '☆ '}${record.isFavorite ? (currentLanguage === 'zh' ? '已收藏' : 'Favorited') : (currentLanguage === 'zh' ? '加入收藏' : 'Add to Favorites')}
            </button>
            <button onclick="shareRecord('${record.id}')" 
                    style="background: transparent; color: var(--primary-gold); border: 2px solid var(--primary-gold); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cinzel', serif; font-weight: bold; transition: all 0.3s ease;">
                📤 ${currentLanguage === 'zh' ? '分享' : 'Share'}
            </button>
            <button onclick="if(confirm('${currentLanguage === 'zh' ? '確定要刪除這條記錄嗎？' : 'Are you sure you want to delete this record?'}')) { deleteRecord('${record.id}'); closeRecordModal(); }" 
                    style="background: transparent; color: #ff6b6b; border: 2px solid #ff6b6b; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cinzel', serif; font-weight: bold; transition: all 0.3s ease;">
                🗑️ ${currentLanguage === 'zh' ? '刪除' : 'Delete'}
            </button>
        </div>
    `;

    // 顯示模態框
    modal.style.zIndex = '10001';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滾動
}

/**
 * 關閉記錄詳情模態框
 */
function closeRecordModal() {
    const modal = document.getElementById('recordModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // 恢復背景滾動
    }
}

/**
 * 更新評分
 */
function updateRating(recordId, rating) {
    const record = divinationManager.getRecordById(recordId);
    if (record) {
        record.userRating = rating;
        divinationManager.updateRecord(record);
        
        // 更新星星顯示
        const stars = document.querySelectorAll(`#recordModal .rating-star`);
        stars.forEach((star, index) => {
            const starRating = index + 1;
            star.style.color = starRating <= rating ? '#ffd700' : 'rgba(212, 175, 55, 0.3)';
            star.classList.toggle('active', starRating <= rating);
        });
        
        showNotification(`${currentLanguage === 'zh' ? '評分已更新' : 'Rating updated'}: ${rating}/5`, 'success');
    }
}

/**
 * 更新筆記
 */
function updateNotes(recordId, notes) {
    const record = divinationManager.getRecordById(recordId);
    if (record) {
        record.userNotes = notes;
        divinationManager.updateRecord(record);
        console.log(`📝 筆記已更新: ${recordId}`);
    }
}

/**
 * 添加標籤
 */
function addTag(recordId) {

    // 添加按鈕回饋效果
    const addButton = event?.target;
    if (addButton) {
        addButtonFeedback(addButton, 'tag');
    }

    const input = document.getElementById(`newTag_${recordId}`);
    const tag = input.value.trim();
    
    if (!tag) return;
    
    const record = divinationManager.getRecordById(recordId);
    if (record && !record.tags.includes(tag)) {
        record.tags.push(tag);
        divinationManager.updateRecord(record);
        
        // 清空輸入框
        input.value = '';
        
        // 更新標籤顯示
        const tagsContainer = document.getElementById(`currentTags_${recordId}`);
        if (tagsContainer) {
            tagsContainer.innerHTML = record.tags.map(tag => `
                <span class="tag" style="background: rgba(212, 175, 55, 0.2); color: var(--primary-gold); padding: 5px 12px; border-radius: 15px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;">
                    ${tag}
                    <span onclick="removeTag('${recordId}', '${tag}')" style="cursor: pointer; color: #ff6b6b; font-weight: bold;">×</span>
                </span>
            `).join('');
        }
        
        // 恢復按鈕狀態
        if (addButton) {
            addButton.disabled = false;
            addButton.textContent = currentLanguage === 'zh' ? '添加' : 'Add';
            addButton.style.opacity = '1';
        }
        
        showNotification(currentLanguage === 'zh' ? '標籤已添加' : 'Tag added', 'success');
        
    } else {
        // 恢復按鈕狀態 - 失敗情況
        if (addButton) {
            addButton.disabled = false;
            addButton.textContent = currentLanguage === 'zh' ? '添加' : 'Add';
            addButton.style.opacity = '1';
        }
        
        if (record && record.tags.includes(tag)) {
            showNotification(currentLanguage === 'zh' ? '標籤已存在' : 'Tag already exists', 'warning');
        }
    }
}

/**
 * 移除標籤
 */
function removeTag(recordId, tagToRemove) {

    // 添加按鈕回饋效果
    const removeButton = event?.target;
    if (removeButton) {
        addButtonFeedback(removeButton, 'delete');
    }

    const record = divinationManager.getRecordById(recordId);
    if (record) {
        record.tags = record.tags.filter(tag => tag !== tagToRemove);
        divinationManager.updateRecord(record);
        
        // 更新標籤顯示
        const tagsContainer = document.getElementById(`currentTags_${recordId}`);
        if (tagsContainer) {
            tagsContainer.innerHTML = record.tags.map(tag => `
                <span class="tag" style="background: rgba(212, 175, 55, 0.2); color: var(--primary-gold); padding: 5px 12px; border-radius: 15px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;">
                    ${tag}
                    <span onclick="removeTag('${recordId}', '${tag}')" style="cursor: pointer; color: #ff6b6b; font-weight: bold;">×</span>
                </span>
            `).join('');
        }
        
        showNotification(currentLanguage === 'zh' ? '標籤已移除' : 'Tag removed', 'success');
    }
}

/**
 * 更新模態框中的收藏按鈕
 */
function updateModalFavoriteButton(recordId) {
    const record = divinationManager.getRecordById(recordId);
    const btn = document.getElementById(`modalFavoriteBtn_${recordId}`);
    
    if (btn && record) {
        // 添加過渡動畫
        btn.style.transition = 'all 0.3s ease';
        
        // 更新樣式
        btn.style.background = record.isFavorite ? 'var(--primary-gold)' : 'transparent';
        btn.style.color = record.isFavorite ? 'var(--dark-red)' : 'var(--primary-gold)';
        btn.innerHTML = `${record.isFavorite ? '⭐ ' : '☆ '}${record.isFavorite ? (currentLanguage === 'zh' ? '已收藏' : 'Favorited') : (currentLanguage === 'zh' ? '加入收藏' : 'Add to Favorites')}`;
        
        // 短暫的視覺強調
        btn.style.transform = 'scale(1.05)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);
    }
}

/**
 * 更新記錄數量徽章
 */
function updateRecordsBadge() {
    const badge = document.getElementById('recordsBadge');
    if (badge && divinationManager) {
        const totalRecords = divinationManager.getAllRecords().length;
        
        if (totalRecords > 0) {
            badge.textContent = totalRecords > 99 ? '99+' : totalRecords.toString();
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// 修改現有的 showLoadingAndGetResults 函數，在成功獲取結果後保存記錄
// 找到 displayFinalResults(interpretation); 這行，在其後添加：

/**
 * 在占卜完成後自動保存記錄
 */
function saveCurrentDivination(interpretation) {
    try {
        const recordData = {
            question: currentQuestion,
            mode: currentMode,
            cards: selectedCards,
            interpretation: interpretation
        };
        
        const savedRecord = divinationManager.saveRecord(recordData);
        
        if (savedRecord) {
            console.log('✅ 占卜記錄已自動保存');
            updateRecordsBadge(); // 更新徽章
            
            // 顯示保存成功的提示（可選）
            setTimeout(() => {
                showNotification(
                    currentLanguage === 'zh' ? '占卜記錄已保存' : 'Divination record saved', 
                    'success'
                );
            }, 2000);
        }
    } catch (error) {
        console.error('自動保存記錄失敗:', error);
    }
}

// 頁面加載時更新徽章
document.addEventListener('DOMContentLoaded', function() {
    // 延遲更新徽章，確保 divinationManager 已初始化
    setTimeout(() => {
        updateRecordsBadge();
    }, 1000);
});

// 點擊模態框外部關閉
document.addEventListener('click', function(e) {
    const modal = document.getElementById('recordModal');
    if (modal && e.target === modal) {
        closeRecordModal();
    }
});

// ESC 鍵關閉模態框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeRecordModal();
    }
});

/**
 * 顯示清除記錄對話框
 */
function showClearRecordsDialog() {
    const allRecords = divinationManager.getAllRecords();
    const nonFavoriteRecords = allRecords.filter(r => !r.isFavorite);
    
    if (allRecords.length === 0) {
        showNotification(t('no-records-to-clear'), 'info');
        return;
    }
    
    // 創建自定義對話框
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    dialog.innerHTML = `
        <div style="
            background: linear-gradient(135deg, var(--deep-purple), var(--mystic-blue));
            border: 2px solid var(--primary-gold);
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        ">
            <h3 style="color: var(--primary-gold); margin-bottom: 20px; font-family: 'Philosopher', serif;">
                ${t('clear-records-title')}
            </h3>
            <p style="color: rgba(212, 175, 55, 0.9); margin-bottom: 30px; line-height: 1.5;">
                ${t('clear-records-message')}
            </p>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button onclick="confirmClearRecords('all')" style="
                    background: rgba(139, 0, 0, 0.8);
                    color: #ff6b6b;
                    border: 2px solid #ff6b6b;
                    padding: 12px 20px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-family: 'Cinzel', serif;
                    font-weight: bold;
                ">
                    🗑️ ${t('clear-all')} (${allRecords.length})
                </button>
                ${nonFavoriteRecords.length > 0 ? `
                <button onclick="confirmClearRecords('non-favorites')" style="
                    background: rgba(255, 165, 0, 0.8);
                    color: #ffa500;
                    border: 2px solid #ffa500;
                    padding: 12px 20px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-family: 'Cinzel', serif;
                    font-weight: bold;
                ">
                    ⭐ ${t('clear-non-favorites')} (${nonFavoriteRecords.length})
                </button>
                ` : ''}
                <button onclick="closeClearDialog()" style="
                    background: transparent;
                    color: var(--primary-gold);
                    border: 2px solid var(--primary-gold);
                    padding: 12px 20px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-family: 'Cinzel', serif;
                    font-weight: bold;
                ">
                    ${t('cancel')}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    window.clearDialog = dialog;
}

/**
 * 確認清除記錄
 */
function confirmClearRecords(type) {
    const allRecords = divinationManager.getAllRecords();
    const recordsToDelete = type === 'all' ? 
        allRecords : 
        allRecords.filter(r => !r.isFavorite);
    
    const confirmMessage = type === 'all' ? 
        t('final-confirm-all').replace('{count}', recordsToDelete.length) :
        t('final-confirm-non-fav').replace('{count}', recordsToDelete.length);
    
    if (confirm(confirmMessage)) {
        // 執行清除
        recordsToDelete.forEach(record => {
            divinationManager.deleteRecord(record.id);
        });
        
        // 關閉對話框
        closeClearDialog();
        
        // 刷新頁面
        if (historyUI) {
            historyUI.loadRecords();
        }
        updateRecordsBadge();
        
        showNotification(t('records-cleared'), 'success');
    }
}

/**
 * 關閉清除對話框
 */
function closeClearDialog() {
    if (window.clearDialog) {
        document.body.removeChild(window.clearDialog);
        window.clearDialog = null;
    }
}

// ===== 按鈕觸覺反饋輔助函數 =====

/**
 * 添加按鈕點擊效果
 */
function addButtonFeedback(button, effectType = 'default') {
    if (!button) return;
    
    // 基礎點擊動畫
    button.classList.add('clicked');
    
    // 不同類型的特殊效果
    switch (effectType) {
        case 'favorite':
            // 收藏按鈕特殊效果：放大+旋轉
            button.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            button.style.transform = 'scale(1.2) rotate(15deg)';
            setTimeout(() => {
                button.style.transform = 'scale(1) rotate(0deg)';
            }, 300);
            break;
            
        case 'delete':
            // 刪除按鈕：震動效果
            button.style.animation = 'deleteShake 0.5s ease';
            button.style.background = 'rgba(255, 107, 107, 0.3)';
            setTimeout(() => {
                button.style.background = '';
                button.style.animation = '';
            }, 500);
            break;
            
        case 'share':
            // 分享按鈕：彈跳效果
            button.style.animation = 'shareBouce 0.4s ease';
            setTimeout(() => {
                button.style.animation = '';
            }, 400);
            break;
            
        case 'tag':
            // 標籤按鈕：脈衝效果
            button.style.animation = 'tagPulse 0.6s ease';
            setTimeout(() => {
                button.style.animation = '';
            }, 600);
            break;
            
        default:
            // 預設效果：縮放
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
    }
    
    // 移除動畫類
    setTimeout(() => {
        button.classList.remove('clicked');
    }, 600);
}

/**
 * 按鈕加載狀態
 */
function setButtonLoading(button, isLoading, originalText = '') {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('btn-loading');
        button.disabled = true;
        button.setAttribute('data-original-text', button.textContent);
        button.textContent = currentLanguage === 'zh' ? '處理中...' : 'Processing...';
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.textContent = originalText;
            button.removeAttribute('data-original-text');
        }
    }
}