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
    },
    insight: {
        name: { zh: "釐清現況", en: "Situation Clarity" },
        description: { zh: "從眼前現況、尚未察覺的影響與可採取的方向，快速整理一件讓你困惑的事。", en: "Clarify a confusing situation through what is visible, what remains unseen, and the direction available to you." },
        cards: 3,
        positions: { zh: ["眼前現況", "隱藏影響", "行動指引"], en: ["Current Situation", "Hidden Influence", "Guidance"] },
        title: { zh: "請選擇三張釐清現況牌", en: "Please choose three clarity cards" }
    },
    career: {
        name: { zh: "職涯發展", en: "Career Path" },
        description: { zh: "以常見的五張職涯分析，檢視自身定位、外在因素、可行建議、挑戰策略與未來發展。", en: "Use a practical five-card career analysis to examine your position, external factors, advice, challenges, and emerging developments." },
        cards: 5,
        positions: { zh: ["我的職涯狀態", "外在影響", "可行建議", "挑戰的應對", "發展趨勢"], en: ["Career Self", "External Factors", "Aligned Advice", "Approach to Challenges", "Emerging Development"] },
        title: { zh: "請選擇五張職涯指引牌", en: "Please choose five career cards" }
    },
    growth: {
        name: { zh: "身心靈", en: "Mind Body Spirit" },
        description: { zh: "常見的三張牌陣，分別觀察心智、身體與精神層面的狀態及彼此平衡。", en: "A widely used three-card spread for checking the balance between mind, body, and spirit." },
        cards: 3,
        positions: { zh: ["心智", "身體", "精神"], en: ["Mind", "Body", "Spirit"] },
        title: { zh: "請選擇三張身心靈牌", en: "Please choose three mind-body-spirit cards" }
    },
    yesno: {
        name: { zh: "Yes or No", en: "Yes or No" },
        description: { zh: "以支持因素、反對因素與關鍵提醒判斷整體傾向，結果可能是偏向 Yes、偏向 No 或尚不明朗。", en: "Read the overall tendency through supporting factors, opposing factors, and what matters most: leaning Yes, leaning No, or unclear." },
        cards: 3,
        positions: { zh: ["支持因素", "反對因素", "關鍵提醒"], en: ["Supporting Factors", "Opposing Factors", "What You Need to Know"] },
        title: { zh: "請選擇三張 Yes or No 指引牌", en: "Please choose three Yes or No cards" }
    },
    daily: {
        name: { zh: "每日之牌", en: "Daily Card" },
        description: { zh: "每天抽一張牌，作為今日主題、值得留意的能量與可實踐的提醒。", en: "Draw one card as the theme, energy, and practical reflection for your day." },
        cards: 1,
        positions: { zh: ["今日之牌"], en: ["Card of the Day"] },
        title: { zh: "請選擇一張今日之牌", en: "Please choose your card of the day" }
    }
};

const questionExamples = {
    single: {
        zh: [
            '我今天最需要留意的是什麼？',
            '此刻我最需要聽見什麼提醒？',
            '面對目前的困惑，我可以從哪裡開始？',
            '今天有什麼能量值得我善加運用？',
            '我現在忽略了哪個重要訊息？',
            '什麼行動最能幫助現在的我？'
        ],
        en: [
            'What needs my attention most today?',
            'What reminder do I need to hear right now?',
            'Where can I begin with my current confusion?',
            'What energy can I make good use of today?',
            'What important message am I overlooking?',
            'What action would help me most right now?'
        ]
    },
    three: {
        zh: [
            '這件事是如何走到現在，又可能往哪裡發展？',
            '過去的什麼經驗正在影響我目前的選擇？',
            '這段關係接下來三個月可能如何發展？',
            '我的工作狀態接下來會有什麼變化？',
            '目前的困境將如何演變，我該如何準備？',
            '這個計畫從現在到未來可能經歷什麼？'
        ],
        en: [
            'How did this situation reach the present, and where might it go?',
            'What past experience is influencing my current choice?',
            'How might this relationship develop over the next three months?',
            'How might my work situation change from here?',
            'How could this challenge unfold, and how can I prepare?',
            'What journey might this plan take from now into the future?'
        ]
    },
    core: {
        zh: [
            '目前問題真正的核心是什麼？',
            '阻礙我前進的關鍵因素是什麼？',
            '我可以如何突破目前的停滯？',
            '在這個局面中，我還沒有看見的優勢是什麼？',
            '要改善目前的關係，我最需要面對什麼？',
            '要讓工作進展更順利，我應該調整哪個部分？'
        ],
        en: [
            'What is the true core of my current situation?',
            'What key factor is preventing me from moving forward?',
            'How can I break through this period of stagnation?',
            'What unseen advantage do I have in this situation?',
            'What must I face to improve this relationship?',
            'What should I adjust to help my work progress more smoothly?'
        ]
    },
    choice: {
        zh: [
            '面對這兩個選擇，我分別需要考量什麼？',
            '哪個選項更符合我現階段真正的需要？',
            '選擇不同道路，各自可能帶來什麼影響？',
            '在這次抉擇中，我忽略了什麼重要因素？',
            '我該留在現況，還是接受新的機會？',
            '這兩個方向，哪一個更有助於我的長期成長？'
        ],
        en: [
            'What should I consider about each of these two choices?',
            'Which option better reflects what I truly need right now?',
            'What might each path bring into my life?',
            'What important factor am I overlooking in this decision?',
            'Should I remain where I am or accept the new opportunity?',
            'Which direction better supports my long-term growth?'
        ]
    },
    love: {
        zh: [
            '我與對方目前各自抱持什麼心態？',
            '對方如何看待我們現在的關係？',
            '這段關係接下來可能往哪個方向發展？',
            '我們之間真正需要溝通的是什麼？',
            '我可以如何讓這段關係更健康地發展？',
            '這段感情目前最大的課題是什麼？'
        ],
        en: [
            'What attitudes do we each currently hold toward this relationship?',
            'How does the other person view our relationship right now?',
            'Where might this relationship be heading next?',
            'What do we truly need to communicate about?',
            'How can I help this relationship develop in a healthier way?',
            'What is the greatest lesson in this relationship right now?'
        ]
    },
    insight: {
        zh: ['這件事真正需要我看清的是什麼？', '目前有哪些我尚未察覺的影響？', '我該如何整理眼前的混亂？', '這個困境背後隱藏著什麼關鍵？', '我現在最適合採取什麼方向？', '要突破目前狀態，我需要先理解什麼？'],
        en: ['What do I most need to see clearly in this situation?', 'What influence have I not yet noticed?', 'How can I make sense of the confusion in front of me?', 'What key factor is hidden beneath this difficulty?', 'What direction would serve me best right now?', 'What must I understand before I can move forward?']
    },
    career: {
        zh: ['我目前的職涯最需要調整什麼？', '下一步怎麼做能讓工作發展更順利？', '我有哪些尚未充分運用的職場優勢？', '目前工作中的挑戰會帶來什麼機會？', '這個職涯選擇適合我的長期發展嗎？', '我該如何準備接下來的工作轉變？'],
        en: ['What most needs adjustment in my career right now?', 'What next step could help my work develop more smoothly?', 'Which professional strength am I not fully using?', 'What opportunity may be hidden in my current challenge?', 'Does this career direction support my long-term growth?', 'How can I prepare for the next change in my work life?']
    },
    growth: {
        zh: ['我的身心靈目前處於什麼狀態？', '我該如何恢復內在的平衡？', '我的心智、身體與精神各需要什麼照顧？', '最近的疲憊主要來自哪個層面？', '我可以如何讓自己重新穩定下來？', '哪個層面的需求正被我忽略？'],
        en: ['What is the current state of my mind, body, and spirit?', 'How can I restore my inner balance?', 'What care does each part of me need?', 'Which part of me is behind my recent exhaustion?', 'How can I become grounded again?', 'Which need am I currently overlooking?']
    },
    yesno: {
        zh: ['這件事目前是否值得我繼續推進？', '接受這個機會對我有利嗎？', '現在是採取這項行動的好時機嗎？', '這個方向符合我的真正需要嗎？', '我是否應該主動聯絡對方？', '目前的條件支持我做出這個決定嗎？'],
        en: ['Is this worth pursuing right now?', 'Would accepting this opportunity benefit me?', 'Is this a good time to take this action?', 'Does this direction align with what I truly need?', 'Should I reach out to this person?', 'Do the current conditions support this decision?']
    },
    daily: {
        zh: ['今天的主題與提醒是什麼？', '今天有什麼能量值得我留意？', '我今天最適合抱持什麼態度？', '今天的我需要記得什麼？', '我可以如何善用今天的能量？', '今天有什麼值得反思的訊息？'],
        en: ["What is today's theme and reminder?", 'What energy deserves my attention today?', 'What attitude would serve me best today?', 'What do I need to remember today?', "How can I work with today's energy?", 'What message is worth reflecting on today?']
    }
};

const lastQuestionExampleIndexes = {};

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
let focusGuideTimer = null;
let readingAbortController = null;
let readingElapsedTimer = null;
let readingStartedAt = 0;
let readingPhase = 'idle';
let readingInFlight = false;
let lastInterpretation = '';
let modalTriggerElement = null;


// 主題管理
let currentTheme = 'classic';

/**
 * 初始化主題
 */
function initializeTheme() {
    // 網站固定使用經典暗黑主題，並清除舊版儲存的明亮模式偏好
    try {
        localStorage.removeItem('tarot_theme');
    } catch (e) {
        console.warn('⚠️ 無法清除舊版主題偏好');
    }
    setTheme('classic', false);
}

/**
 * 設置主題
 */
// 優化主題設置函數
function setTheme(theme, animate = true) {
    try {
        // 驗證主題名稱
        if (!['classic', 'light'].includes(theme)) {
            console.warn('⚠️ 無效的主題名稱，使用預設主題');
            theme = 'classic';
        }
        
        currentTheme = theme;
        
        // 性能優化：避免不必要的重複設置
        const currentDataTheme = document.documentElement.getAttribute('data-theme');
        if (currentDataTheme === theme && !animate) {
            return;
        }
        
        // 添加過渡動畫
        if (animate) {
            document.documentElement.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                document.documentElement.style.transition = '';
            }, 200);
        }
        
        // 設置 data-theme 屬性
        document.documentElement.setAttribute('data-theme', theme);
        
        // 儲存偏好（添加錯誤處理）
        try {
            localStorage.setItem('tarot_theme', theme);
        } catch (e) {
            console.warn('⚠️ 無法儲存主題偏好設置');
        }
        
        // 更新主題按鈕
        updateThemeButton();
        
        // 處理粒子效果
        setTimeout(() => handleParticles(), 100);
        
        // 觸發自定義事件
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme, previousTheme: currentDataTheme }
        }));
        
        console.log(`🎨 主題已切換至: ${theme === 'classic' ? '經典神秘' : '現代明亮'}`);
        
    } catch (error) {
        console.error('❌ 主題切換失敗:', error);
        // 降級處理
        if (theme !== 'classic') {
            setTheme('classic', false);
        }
    }
}

// 添加主題變化事件監聽器（用於其他組件響應主題變化）
document.addEventListener('themeChanged', function(e) {
    const { theme } = e.detail;
    
    // 更新記錄數量徽章（如果存在）
    updateRecordsBadge();
    
    // 重新應用語言設置（確保主題切換後文字正確）
    setTimeout(() => {
        updateLanguageElements();
    }, 50);
});

/**
 * 切換主題
 */
function toggleTheme() {
    const newTheme = currentTheme === 'classic' ? 'light' : 'classic';
    setTheme(newTheme, true);
    
    // 添加按鈕點擊反饋
    const btn = document.querySelector('.theme-toggle-btn');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
}

/**
 * 更新主題按鈕顯示
 */
function updateThemeButton() {
    const btn = document.querySelector('.theme-toggle-btn');
    const icon = btn?.querySelector('.theme-icon');
    const text = btn?.querySelector('.theme-text');
    
    if (icon && text) {
        if (currentTheme === 'classic') {
            icon.textContent = '🌙'; // 經典模式顯示月亮
            text.setAttribute('data-zh', '明亮');
            text.setAttribute('data-en', 'light');
            if (currentLanguage === 'zh') {
                text.textContent = '明亮';
            } else {
                text.textContent = 'light';
            }
        } else {
            icon.textContent = '✨'; // 明亮模式顯示星星
            text.setAttribute('data-zh', '經典');
            text.setAttribute('data-en', 'Classic');
            if (currentLanguage === 'zh') {
                text.textContent = '經典';
            } else {
                text.textContent = 'Classic';
            }
        }
    }
}

/**
 * 處理粒子效果顯示/隱藏
 */
// 修改現有的 handleParticles 函數
function handleParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    if (currentTheme === 'light') {
        // 明亮主題：隱藏並清理粒子
        particlesContainer.style.display = 'none';
        clearParticles();
    } else {
        // 經典主題：顯示粒子（如果是桌面端）
        const isMobile = window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches;
        if (!isMobile && window.matchMedia('(min-width: 769px)').matches && window.matchMedia('(hover: hover)').matches) {
            particlesContainer.style.display = 'block';
            // 如果粒子容器為空，重新初始化
            if (particlesContainer.children.length === 0) {
                initializeParticles();
            }
        } else {
            particlesContainer.style.display = 'none';
        }
    }
}

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
    if (document.getElementById('step4').classList.contains('active')) {
        updateSelectionPageSettings();
        updateSelectedCardPositions();
        updateProgress();
    }

    // 更新主題按鈕文字（在函數結尾添加）
    updateThemeButton();
}

// 替換原有的 DOMContentLoaded 事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TarotVision 正在初始化...');
    
    // 初始化主題（新增這行）
    initializeTheme();
    
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

// 修改現有函數，添加主題檢查
function initializeParticles() {
    // 只在經典主題且桌面端初始化粒子
    if (currentTheme !== 'classic') return;
    
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const isMobile = window.innerWidth <= 768 || !window.matchMedia('(hover: hover)').matches;
    if (isMobile || !window.matchMedia('(min-width: 769px)').matches || !window.matchMedia('(hover: hover)').matches) {
        return;
    }
    
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => createParticle(particlesContainer), i * 300);
    }
    
    // 動態維護粒子數量
    const particleInterval = setInterval(() => {
        if (currentTheme !== 'classic') {
            clearInterval(particleInterval);
            return;
        }
        
        if (particlesContainer.children.length < particleCount) {
            createParticle(particlesContainer);
        }
    }, 2000);
    
    // 儲存間隔ID以便清理
    window.particleInterval = particleInterval;
}

// 優化 createParticle 函數，支援主題色彩
function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
    particle.style.animationDelay = Math.random() * 2 + 's';
    
    // 根據主題設置顏色
    const particleColor = currentTheme === 'classic' ? 'var(--primary-gold)' : '#A0522D';
    particle.style.background = particleColor;
    
    container.appendChild(particle);
    
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 8000);
}

// 新增：清理粒子效果的函數
function clearParticles() {
    const particlesContainer = document.getElementById('particles');
    if (particlesContainer) {
        particlesContainer.innerHTML = '';
    }
    
    if (window.particleInterval) {
        clearInterval(window.particleInterval);
        window.particleInterval = null;
    }
}

// 設置牌陣選擇監聽器
function setupSpreadListeners() {
    document.querySelectorAll('.spread-card').forEach(card => {
        card.tabIndex = 0;
        card.setAttribute('role', 'radio');
        card.setAttribute('aria-checked', card.classList.contains('active') ? 'true' : 'false');
        card.addEventListener('click', function() {
            document.querySelectorAll('.spread-card').forEach(c => {
                c.classList.remove('active');
                c.setAttribute('aria-checked', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-checked', 'true');
            currentMode = this.dataset.mode;
        });
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                card.click();
            }
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

    renderQuestionExamples(false);
}

// 提交問題
function submitQuestion() {
    const questionInput = document.getElementById('questionInput');
    const questionError = document.getElementById('questionError');
    currentQuestion = questionInput.value.trim();

    questionInput.classList.remove('input-error');
    questionError.textContent = '';

    if (!currentQuestion) {
        const message = currentLanguage === 'zh' ? '請先輸入你想詢問的問題' : 'Please enter your question first';
        questionInput.classList.add('input-error');
        questionError.textContent = message;
        questionInput.focus();
        return;
    }
    
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
    
    showStep(5); // 顯示可略過的專注引導
    clearTimeout(focusGuideTimer);
    focusGuideTimer = setTimeout(proceedToCardSelection, 3000);
}

function proceedToCardSelection() {
    clearTimeout(focusGuideTimer);
    focusGuideTimer = null;
    updateSelectionPageSettings();
    showStep(4);
    generateCards();
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
    updateReadingSteps(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        const heading = document.querySelector(`#step${stepNumber} h1, #step${stepNumber} h2`);
        if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
        }
    }, 250);
}

function updateReadingSteps(stepNumber) {
    const tracker = document.getElementById('readingSteps');
    if (!tracker) return;
    const flowMap = { 2: 1, 3: 2, 5: 3, 4: 3, 6: 4 };
    const activeFlowStep = flowMap[stepNumber];
    tracker.hidden = !activeFlowStep;
    tracker.querySelectorAll('.reading-step').forEach(item => {
        const itemStep = Number(item.dataset.flowStep);
        item.classList.toggle('active', itemStep === activeFlowStep);
        item.classList.toggle('completed', itemStep < activeFlowStep);
    });
}

// 生成卡片
function generateCards() {
    selectedCards = [];
    updateProgress();
    const cardsFan = document.getElementById('cardsFan');
    cardsFan.innerHTML = '';
    const shuffledCards = [...tarotCards].sort(() => Math.random() - 0.5);
    
    shuffledCards.forEach((cardData, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'tarot-card';
        cardElement.dataset.cardName = cardData.name;
        cardElement.dataset.cardSymbol = cardData.symbol;
        cardElement.tabIndex = 0;
        cardElement.setAttribute('role', 'button');
        cardElement.setAttribute('aria-pressed', 'false');
        cardElement.setAttribute('aria-label', currentLanguage === 'zh' ? '選擇一張覆蓋的塔羅牌' : 'Select a face-down tarot card');
        
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
        cardElement.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectCard(cardElement);
            }
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
    if (cardElement.classList.contains('selected')) {
        deselectCard(cardElement);
        return;
    }
    if (selectedCards.length >= maxCards || cardElement.classList.contains('selecting')) return;
    cardElement.classList.add('selecting');
    
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
    cardElement.classList.remove('selecting');
    cardElement.setAttribute('aria-pressed', 'true');
    cardElement.setAttribute('aria-label', `${cardName}，${orientation === 'upright' ? t('upright') : t('reversed')}，${currentLanguage === 'zh' ? '再按一次可取消' : 'press again to deselect'}`);
    
    selectedCards.push({
        element: cardElement,
        name: cardName,
        orientation: orientation,
        symbol: cardSymbol
    });
    updateSelectedCardPositions();
    
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
    
    const selectionEndTime = performance.now();
    performanceMonitor.recordCardSelection(cardName, selectionEndTime - selectionStartTime);

}

// 增強的載入訊息顯示
function showEnhancedLoading() {
    const container = document.getElementById('resultsContainer');
    const positions = spreadInfo[currentMode].positions[currentLanguage];
    const cardsPreview = selectedCards.map((card, index) => `
        <div class="waiting-card">
            <img src="${getTarotImagePath(card.name)}" alt="${card.name}" class="${card.orientation === 'reversed' ? 'is-reversed' : ''}">
            <span>${positions[index]}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="enhanced-loading honest-loading">
            <div class="waiting-cards" aria-label="${currentLanguage === 'zh' ? '本次抽到的牌' : 'Your selected cards'}">${cardsPreview}</div>
            <div class="mystic-symbols">
                <div class="energy-circle"></div>
                <div class="symbol">☯</div>
                <div class="symbol">✦</div>
                <div class="symbol">☽</div>
            </div>
            
            <div class="reading-wait-copy" aria-live="polite">
                <div class="progress-text" id="progressText"></div>
                <div class="reading-elapsed"><span data-zh="已等待" data-en="Waiting">${currentLanguage === 'zh' ? '已等待' : 'Waiting'}</span> <strong id="readingElapsed">0</strong> <span data-zh="秒" data-en="seconds">${currentLanguage === 'zh' ? '秒' : 'seconds'}</span></div>
                <p class="reading-wait-detail" id="readingWaitDetail"></p>
            </div>

            <div class="reading-tip">
                <span class="reading-tip-label">${currentLanguage === 'zh' ? '牌卡小知識' : 'Tarot note'}</span>
                <p id="readingTip">${currentLanguage === 'zh' ? '正逆位不代表單純的好壞，而是能量展現方式的不同。' : 'Upright and reversed cards are different expressions of energy, not simply good or bad.'}</p>
            </div>
            <button class="cancel-reading-btn" type="button" onclick="cancelReadingRequest()">${currentLanguage === 'zh' ? '取消等待' : 'Cancel request'}</button>
        </div>
    `;
    startReadingTimer();
}

function updateReadingStatus(phase) {
    readingPhase = phase;
    const text = document.getElementById('progressText');
    const detail = document.getElementById('readingWaitDetail');
    if (!text || !detail) return;

    const messages = {
        waking: {
            zh: ['正在連結解讀服務', '免費服務首次啟動可能需要稍候'],
            en: ['Connecting to the reading service', 'The free service may need a moment to wake up']
        },
        submitting: {
            zh: ['正在安全送出你的問題與牌卡', '你的抽牌結果會保留在這個頁面'],
            en: ['Securely sending your question and cards', 'Your selected cards will remain on this page']
        },
        interpreting: {
            zh: ['正在等待牌意解讀', 'AI 正在整理這組牌之間的關係'],
            en: ['Waiting for your tarot interpretation', 'AI is organizing the relationships between your cards']
        }
    };
    const message = messages[phase]?.[currentLanguage] || messages.waking[currentLanguage];
    text.textContent = message[0];
    detail.textContent = message[1];
}

function startReadingTimer() {
    clearLoadingAnimation();
    readingStartedAt = Date.now();
    const updateElapsed = () => {
        const seconds = Math.floor((Date.now() - readingStartedAt) / 1000);
        const elapsed = document.getElementById('readingElapsed');
        const detail = document.getElementById('readingWaitDetail');
        if (elapsed) elapsed.textContent = seconds;
        if (detail && seconds >= 20) {
            detail.textContent = currentLanguage === 'zh'
                ? '服務目前較繁忙；你的問題與牌卡都已保留，不需要重新抽牌。'
                : 'The service is busy. Your question and cards are preserved, so you do not need to draw again.';
        }
    };
    updateElapsed();
    readingElapsedTimer = setInterval(updateElapsed, 1000);
}

function clearLoadingAnimation() {
    clearInterval(readingElapsedTimer);
    readingElapsedTimer = null;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
    const controller = new AbortController();
    const parentSignal = options.signal;
    const forwardAbort = () => controller.abort();
    if (parentSignal) {
        if (parentSignal.aborted) controller.abort();
        parentSignal.addEventListener('abort', forwardAbort, { once: true });
    }
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (controller.signal.aborted && !parentSignal?.aborted) {
            const timeoutError = new Error('REQUEST_TIMEOUT');
            timeoutError.name = 'TimeoutError';
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        parentSignal?.removeEventListener('abort', forwardAbort);
    }
}

async function fetchReadingWithRetry(requestBody, maxAttempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (attempt > 1) {
                const detail = document.getElementById('readingWaitDetail');
                if (detail) detail.textContent = currentLanguage === 'zh'
                    ? `服務暫時忙碌，正在進行第 ${attempt - 1} 次重新嘗試…`
                    : `The service is busy. Retry ${attempt - 1} is in progress…`;
                await new Promise(resolve => setTimeout(resolve, 1500 * (attempt - 1)));
            }
            const response = await fetchWithTimeout(`${API_BASE_URL}/api/tarot-reading`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: readingAbortController.signal
            }, 120000);

            // 429 is the site's usage limit; retrying would only consume another attempt.
            if (response.status === 503 && attempt < maxAttempts) continue;
            return response;
        } catch (error) {
            lastError = error;
            if (error.name === 'AbortError' || error.name === 'TimeoutError' || attempt === maxAttempts) throw error;
        }
    }
    throw lastError;
}

// API 調用和結果顯示
async function showLoadingAndGetResults() {
    if (readingInFlight) return;
    readingInFlight = true;
    readingAbortController = new AbortController();
    try {
        showEnhancedLoading();
        updateReadingStatus('waking');

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

        const healthResponse = await fetchWithTimeout(`${API_BASE_URL}/api/health`, {
            cache: 'no-store',
            signal: readingAbortController.signal
        }, 65000);
        if (!healthResponse.ok) throw new Error(`Health check failed: ${healthResponse.status}`);

        updateReadingStatus('submitting');
        await new Promise(resolve => setTimeout(resolve, 250));
        updateReadingStatus('interpreting');

        const response = await fetchReadingWithRetry(requestBody);

        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status}`);
        }

        const data = await response.json();
        const interpretation = data.interpretation;
        
        clearLoadingAnimation();
        readingInFlight = false;
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
        readingInFlight = false;
        if (error.name === 'AbortError') {
            showReadingCancelled();
        } else if (error.name === 'TimeoutError') {
            showAPIError(new Error(currentLanguage === 'zh' ? '服務回應逾時' : 'The service timed out'));
        } else {
            showAPIError(error);
        }
    } finally {
        readingAbortController = null;
    }
}

// 替換原有的混亂代碼段，插入完整的函數
async function displayFinalResultsLegacy(interpretation) {
    let formattedInterpretation = interpretation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedInterpretation = formattedInterpretation.replace(/\* /g, '');

    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="ai-interpretation" style="
            background: var(--black-alpha-70); 
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
            background: var(--black-alpha-60);
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
function cancelReadingRequest() {
    if (readingAbortController) readingAbortController.abort();
}

function showReadingCancelled() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="reading-message-card">
            <div class="reading-message-icon">☾</div>
            <h3>${currentLanguage === 'zh' ? '已取消這次解讀請求' : 'Reading request cancelled'}</h3>
            <p>${currentLanguage === 'zh' ? '你的問題與抽到的牌都還在，可以直接重新嘗試。' : 'Your question and selected cards are still here. You can retry without drawing again.'}</p>
            <div class="flow-actions">
                <button class="btn btn-secondary" onclick="returnToQuestion()">${currentLanguage === 'zh' ? '修改問題' : 'Edit question'}</button>
                <button class="btn" onclick="retryReading()">${currentLanguage === 'zh' ? '重新嘗試解讀' : 'Retry reading'}</button>
            </div>
        </div>`;
}

function retryReading() {
    if (!readingInFlight) showLoadingAndGetResults();
}

function showAPIError(error) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="reading-message-card is-error">
            <div class="reading-message-icon">!</div>
            <h3>${t('api-error')}</h3>
            <p>${t('api-error-detail')}</p>
            <p class="reading-preserved-note">${currentLanguage === 'zh' ? '你的問題與抽到的牌已保留，不需要重新抽牌。' : 'Your question and cards are preserved; you do not need to draw again.'}</p>
            <div class="flow-actions">
                <button class="btn btn-secondary" onclick="returnToQuestion()">${currentLanguage === 'zh' ? '修改問題' : 'Edit question'}</button>
                <button class="btn" onclick="retryReading()">${currentLanguage === 'zh' ? '重新嘗試' : 'Try again'}</button>
            </div>
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
    const confirmButton = document.getElementById('confirmCardsBtn');
    const status = document.getElementById('selectionStatus');
    const ready = selectedCards.length === maxCards;
    if (confirmButton) confirmButton.disabled = !ready;
    if (status) {
        status.textContent = ready
            ? (currentLanguage === 'zh' ? '牌已選齊，可以確認' : 'Your cards are ready')
            : (currentLanguage === 'zh' ? `還需選擇 ${maxCards - selectedCards.length} 張` : `${maxCards - selectedCards.length} card(s) remaining`);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    const bgColor = type === 'error' ? 'rgba(255, 107, 107, 0.9)' : 
                   type === 'warning' ? 'rgba(255, 193, 7, 0.9)' : 
                   'rgba(212, 175, 55, 0.9)';
    
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${bgColor};
        color: #fff; padding: 15px 25px; border-radius: 10px; z-index: 1000; 
        font-weight: bold; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    const liveRegion = document.getElementById('liveAnnouncements');
    if (liveRegion) liveRegion.textContent = message;
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
    document.title = currentLanguage === 'zh' ? 'TarotVision - 塔羅視界' : 'TarotVision - Mystical Insights';
    
    // 清理表單
    document.getElementById('questionInput').value = '';
    document.getElementById('choice1Input').value = '';
    document.getElementById('choice2Input').value = '';
    document.getElementById('choiceInputs').style.display = 'none';
    document.getElementById('questionCount').textContent = '0 / 150';
    document.getElementById('questionError').textContent = '';
    
    // 清理進度
    document.getElementById('selectedCount').textContent = '0';
    document.getElementById('progressFill').style.width = '0%';
    
    // 清理其他內容
    document.getElementById('cardsFan').innerHTML = '';
    document.getElementById('resultsContainer').innerHTML = '';
    
    // 重置牌陣選擇
    document.querySelectorAll('.spread-card').forEach(card => card.classList.remove('active'));
    document.querySelectorAll('.spread-card').forEach(card => card.setAttribute('aria-checked', 'false'));
    const defaultSpread = document.querySelector('.spread-card[data-mode="three"]');
    defaultSpread.classList.add('active');
    defaultSpread.setAttribute('aria-checked', 'true');
    
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
    /**
     * 根據ID獲取記錄（純讀取，不計數）
     */
    getRecordById(recordId) {
        const records = this.getAllRecords();
        return records.find(r => r.id === recordId) || null;
    }

    /**
     * 增加查看次數（帶防重複機制）
     */
    incrementViewCount(recordId) {
        // 防重複計數機制（5分鐘內同一記錄不重複計數）
        const viewKey = `viewed_${recordId}`;
        const lastViewTime = sessionStorage.getItem(viewKey);
        const now = Date.now();
        
        if (lastViewTime && (now - parseInt(lastViewTime)) < 5 * 60 * 1000) {
            return false; // 5分鐘內已查看過，不重複計數
        }
        
        const record = this.getRecordById(recordId);
        if (record) {
            record.readCount = (record.readCount || 0) + 1;
            record.lastViewed = new Date().toISOString();
            this.updateRecord(record);
            
            // 記錄查看時間
            sessionStorage.setItem(viewKey, now.toString());
            
            console.log(`👁️ 查看次數已更新: ${recordId} -> ${record.readCount}`);
            return record.readCount;
        }
        
        return false;
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
            <div style="background: var(--black-alpha-80); border-radius: 15px; overflow: hidden;">
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
        const formattedDate = date.toLocaleDateString(currentLanguage === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
        const formattedTime = date.toLocaleTimeString(currentLanguage === 'zh' ? 'zh-TW' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        const safeQuestion = escapeHtml(this.truncateText(record.question, 86));
        const safeSummary = escapeHtml(this.truncateText(record.interpretationSummary || record.interpretation || '', 125));
        const modeName = escapeHtml(this.getModeDisplayName(record.mode));
        const typeName = escapeHtml(this.getTypeDisplayName(record.questionType));
        
        return `
            <div class="record-card" role="button" tabindex="0" onclick="openRecordModal('${record.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openRecordModal('${record.id}');}">
                <div class="record-card-accent" aria-hidden="true"></div>
                <div class="record-header">
                    <div>
                        <div class="record-date">${formattedDate}<span>${formattedTime}</span></div>
                        <div class="record-mode-badge">${modeName}</div>
                    </div>
                    <div class="record-actions" onclick="event.stopPropagation();">
                        <button class="action-btn favorite-btn ${record.isFavorite ? 'active' : ''}" 
                                onclick="toggleFavorite('${record.id}')" 
                                title="${record.isFavorite ? '取消收藏' : '加入收藏'}" aria-label="${record.isFavorite ? '取消收藏' : '加入收藏'}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.47 6.03.88-4.36 4.25 1.03 6L12 16.77 6.6 19.6l1.03-6-4.36-4.25 6.03-.88L12 3Z"/></svg>
                        </button>
                        <button class="action-btn" onclick="shareRecord('${record.id}')" title="分享" aria-label="分享記錄"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></svg></button>
                        <button class="action-btn delete-btn" onclick="deleteRecord('${record.id}')" title="刪除" aria-label="刪除記錄"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg></button>
                    </div>
                </div>

                <div class="record-eyebrow">${currentLanguage === 'zh' ? '本次提問' : 'Your question'}</div>
                <div class="record-question">${safeQuestion}</div>

                <div class="record-cards-preview">
                    ${record.cards.slice(0, 5).map(card => `
                        <div class="card-mini ${card.orientation === 'reversed' ? 'reversed' : ''}" 
                            title="${escapeHtml(card.name)} (${card.orientation})">
                            <img src="${getTarotImagePath(card.name)}" 
                                alt="${escapeHtml(card.name)}"
                                class="${card.orientation === 'reversed' ? 'is-reversed' : ''}"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="card-mini-fallback ${card.orientation === 'reversed' ? 'is-reversed' : ''}">
                                ${escapeHtml(card.symbol)}
                            </div>
                        </div>
                    `).join('')}
                    ${record.cards.length > 5 ? '<span class="record-more-cards">+' + (record.cards.length - 5) + '</span>' : ''}
                </div>

                <div class="record-summary"><span>${currentLanguage === 'zh' ? '解讀摘要' : 'Reading summary'}</span><p>${safeSummary}</p></div>

                ${record.tags.length > 0 ? `
                    <div class="record-tags">
                        ${record.tags.slice(0, 3).map(tag => `<span class="tag"># ${escapeHtml(tag)}</span>`).join('')}
                        ${record.tags.length > 3 ? `<span class="tag">+${record.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}

                <div class="record-meta">
                    <span class="record-type">${typeName}</span>
                    <div class="record-stats"><span>${record.readCount || 0} ${currentLanguage === 'zh' ? '次查看' : 'views'}</span>${record.userRating ? `<span>${record.userRating} / 5</span>` : ''}</div>
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
        const safeQuestion = escapeHtml(this.truncateText(record.question, 100));
        const safeMode = escapeHtml(this.getModeDisplayName(record.mode));
        const safeType = escapeHtml(this.getTypeDisplayName(record.questionType));
        
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
                        ${safeQuestion}
                    </div>
                    <div style="color: rgba(212, 175, 55, 0.7); font-size: 0.8rem;">
                        ${safeMode} · ${safeType}
                        ${record.tags.length > 0 ? ` · ${record.tags.slice(0, 2).map(escapeHtml).join(', ')}` : ''}
                    </div>
                </div>
                
                <!-- 統計 -->
                <div style="display: flex; align-items: center; gap: 15px; color: rgba(212, 175, 55, 0.7); font-size: 0.8rem;">
                    <span>👁️ ${record.readCount}</span>
                </div>
                
                <!-- 操作按鈕 -->
                <div style="margin-left: 20px;" onclick="event.stopPropagation();">
                    <button class="action-btn favorite-btn ${record.isFavorite ? 'active' : ''}" 
                            onclick="toggleFavorite('${record.id}')" 
                            title="${record.isFavorite ? '取消收藏' : '加入收藏'}"
                            style="font-size: 1.2rem; padding: 8px; border-radius: 50%; transition: all 0.3s ease; color: ${record.isFavorite ? '#ffd700' : 'rgba(212, 175, 55, 0.7)'};">
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
            love: currentLanguage === 'zh' ? '感情' : 'Love',
            insight: currentLanguage === 'zh' ? '釐清' : 'Clarity',
            career: currentLanguage === 'zh' ? '職涯' : 'Career',
            growth: currentLanguage === 'zh' ? '身心靈' : 'Mind Body Spirit',
            yesno: 'Yes or No',
            daily: currentLanguage === 'zh' ? '每日' : 'Daily'
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
    // 查找所有可能的收藏按鈕（卡片視圖和列表視圖）
    const favoriteButtons = document.querySelectorAll(`[onclick*="toggleFavorite('${recordId}')"]`);
    const primaryButton = favoriteButtons[0]; // 用於觸覺回饋的主要按鈕
    
    // 立即添加觸覺回饋
    addButtonFeedback(primaryButton, 'favorite');
    
    // 獲取當前狀態
    const record = divinationManager.getRecordById(recordId);
    if (!record) return;
    
    const newStatus = !record.isFavorite;
    
    // 立即更新所有視圖中的 UI（樂觀更新）
    favoriteButtons.forEach(btn => {
        if (btn) {
            if (!btn.querySelector('svg')) btn.textContent = newStatus ? '⭐' : '☆';
            btn.classList.toggle('active', newStatus);
            btn.title = newStatus ? '取消收藏' : '加入收藏';
            btn.setAttribute('aria-label', btn.title);
            
            // 添加立即視覺回饋動畫
            btn.style.transform = 'scale(1.3)';
            btn.style.color = newStatus ? '#ffd700' : '';
            setTimeout(() => {
                btn.style.transform = '';
            }, 200);
        }
    });
    
    // 執行數據操作
    try {
        const actualNewStatus = divinationManager.toggleFavorite(recordId);
        
        // 驗證操作是否成功，如果不一致則回滾 UI
        if (actualNewStatus !== newStatus) {
            favoriteButtons.forEach(btn => {
                if (btn) {
                    if (!btn.querySelector('svg')) btn.textContent = actualNewStatus ? '⭐' : '☆';
                    btn.classList.toggle('active', actualNewStatus);
                    btn.title = actualNewStatus ? '取消收藏' : '加入收藏';
                    btn.setAttribute('aria-label', btn.title);
                }
            });
        }
        
        // 如果當前是僅顯示收藏的過濾狀態，刷新列表
        if (historyUI && historyUI.currentFilters.favoritesOnly && !actualNewStatus) {
            historyUI.loadRecords();
        }
        
        showNotification(actualNewStatus ? '已加入收藏' : '已取消收藏', 'success');
        
    } catch (error) {
        console.error('收藏操作失敗:', error);
        
        // 回滾 UI 到原始狀態
        favoriteButtons.forEach(btn => {
            if (btn) {
                if (!btn.querySelector('svg')) btn.textContent = record.isFavorite ? '⭐' : '☆';
                btn.classList.toggle('active', record.isFavorite);
                btn.title = record.isFavorite ? '取消收藏' : '加入收藏';
                btn.setAttribute('aria-label', btn.title);
            }
        });
        
        showNotification('操作失敗，請重試', 'error');
    }
}

/**
 * 刪除記錄
 */
let recentlyDeletedRecord = null;
let undoDeleteTimer = null;

function deleteRecord(recordId, skipConfirm = false) {
    const deleteBtn = document.querySelector(`[onclick="deleteRecord('${recordId}')"]`);
    addButtonFeedback(deleteBtn, 'delete');
    if (skipConfirm || confirm(currentLanguage === 'zh' ? '確定要刪除這條記錄嗎？' : 'Are you sure you want to delete this record?')) {
        recentlyDeletedRecord = divinationManager.getRecordById(recordId);
        const success = divinationManager.deleteRecord(recordId);
        if (success) {
            showUndoDeleteNotice();
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
    const record = divinationManager.getRecordById(recordId);
    if (!record) return;
    const cards = record.cards.map(card => `${card.position}：${card.name}（${card.orientation === 'upright' ? t('upright') : t('reversed')}）`).join('\n');
    copyTextToClipboard(`${record.question}\n\n${cards}\n\n${record.interpretation}`)
        .then(() => showNotification(currentLanguage === 'zh' ? '記錄已複製，可貼到其他應用程式分享' : 'Record copied and ready to share', 'success'))
        .catch(() => showNotification(currentLanguage === 'zh' ? '複製失敗' : 'Copy failed', 'error'));
}

function showUndoDeleteNotice() {
    document.querySelector('.undo-delete-notice')?.remove();
    clearTimeout(undoDeleteTimer);
    const notice = document.createElement('div');
    notice.className = 'undo-delete-notice';
    notice.setAttribute('role', 'status');
    notice.innerHTML = `
        <span>${currentLanguage === 'zh' ? '記錄已刪除' : 'Record deleted'}</span>
        <button type="button" onclick="undoDeleteRecord()">${currentLanguage === 'zh' ? '復原' : 'Undo'}</button>`;
    document.body.appendChild(notice);
    undoDeleteTimer = setTimeout(() => {
        notice.remove();
        recentlyDeletedRecord = null;
    }, 7000);
}

function undoDeleteRecord() {
    if (!recentlyDeletedRecord) return;
    const records = divinationManager.getAllRecords();
    if (!records.some(record => record.id === recentlyDeletedRecord.id)) {
        records.unshift(recentlyDeletedRecord);
        localStorage.setItem(divinationManager.storageKeys.RECORDS, JSON.stringify(records.slice(0, divinationManager.maxRecords)));
    }
    recentlyDeletedRecord = null;
    clearTimeout(undoDeleteTimer);
    document.querySelector('.undo-delete-notice')?.remove();
    historyUI?.loadRecords();
    updateRecordsBadge();
    showNotification(currentLanguage === 'zh' ? '記錄已復原' : 'Record restored', 'success');
}

function exportHistoryRecords() {
    const records = divinationManager.getAllRecords();
    if (!records.length) {
        showNotification(currentLanguage === 'zh' ? '目前沒有可匯出的記錄' : 'There are no records to export', 'warning');
        return;
    }
    const backup = { app: 'TarotVision', version: 1, exportedAt: new Date().toISOString(), records };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tarotvision-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification(currentLanguage === 'zh' ? `已匯出 ${records.length} 筆記錄` : `Exported ${records.length} records`, 'success');
}

async function importHistoryRecords(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
        const data = JSON.parse(await file.text());
        if (data.app !== 'TarotVision' || !Array.isArray(data.records)) throw new Error('INVALID_BACKUP');
        const validRecords = data.records
            .filter(record => record && typeof record.id === 'string' && typeof record.question === 'string' && Array.isArray(record.cards))
            .map(record => ({
                ...record,
                id: record.id.replace(/[^a-zA-Z0-9_-]/g, ''),
                question: record.question.slice(0, 500),
                interpretation: String(record.interpretation || '').slice(0, 20000),
                interpretationSummary: String(record.interpretationSummary || '').slice(0, 500),
                userNotes: String(record.userNotes || '').slice(0, 2000),
                tags: Array.isArray(record.tags) ? record.tags.map(tag => String(tag).slice(0, 40)).slice(0, 20) : [],
                cards: record.cards
                    .filter(card => card && typeof card.name === 'string' && ['upright', 'reversed'].includes(card.orientation))
                    .map(card => ({
                        name: card.name.slice(0, 100),
                        orientation: card.orientation,
                        position: String(card.position || '').slice(0, 100),
                        symbol: String(card.symbol || '').slice(0, 10)
                    }))
                    .slice(0, 5)
            }))
            .filter(record => record.id && record.cards.length);
        if (!validRecords.length) throw new Error('EMPTY_BACKUP');
        const existing = divinationManager.getAllRecords();
        const merged = new Map(existing.map(record => [record.id, record]));
        validRecords.forEach(record => merged.set(record.id, record));
        const records = Array.from(merged.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, divinationManager.maxRecords);
        localStorage.setItem(divinationManager.storageKeys.RECORDS, JSON.stringify(records));
        historyUI?.loadRecords();
        updateRecordsBadge();
        showNotification(currentLanguage === 'zh' ? `已匯入備份，目前共有 ${records.length} 筆記錄` : `Backup imported. ${records.length} records available`, 'success');
    } catch (error) {
        showNotification(currentLanguage === 'zh' ? '無法匯入：檔案不是有效的 TarotVision 備份' : 'Import failed: this is not a valid TarotVision backup', 'error');
    } finally {
        input.value = '';
    }
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
    modalTriggerElement = document.activeElement;
    const record = divinationManager.getRecordById(recordId);
    if (!record) {
        showNotification('記錄不存在', 'error');
        return;
    }

    const safeRecordId = String(record.id).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeRecordId || safeRecordId !== record.id) {
        showNotification(currentLanguage === 'zh' ? '這筆紀錄格式不安全，無法開啟' : 'This record cannot be opened safely', 'error');
        return;
    }

    // 增加查看次數並獲取新的計數
    const newViewCount = divinationManager.incrementViewCount(recordId);
    
    // 即時更新所有位置的查看次數顯示
    if (newViewCount !== false) {
        setTimeout(() => {
            updateViewCountEverywhere(recordId, newViewCount);
        }, 100);
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
        <div style="text-align: center; background: var(--black-alpha-60); padding: 20px; border-radius: 15px; border: 2px solid var(--primary-gold); max-width: 200px;">
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
                        alt="${escapeHtml(card.name)}"
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
                    ">${escapeHtml(card.symbol || '')}</div>
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
                ${escapeHtml(card.position || '')}
            </div>
            <div style="font-weight: 600; color: var(--primary-gold); margin-bottom: 5px;">
                ${escapeHtml(card.name)}
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
        <div style="background: var(--black-alpha-60); padding: 25px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <h3 style="color: var(--primary-gold); margin-bottom: 15px; font-family: 'Philosopher', serif;">
                ${t('question-label')}
            </h3>
            <p style="font-size: 1.2rem; line-height: 1.6; color: rgba(212, 175, 55, 0.9);">
                "${escapeHtml(record.question)}"
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
        <div style="background: var(--black-alpha-60); padding: 25px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <h3 style="color: var(--primary-gold); margin-bottom: 20px; font-family: 'Philosopher', serif;">
                ${t('oracle-reading')}
            </h3>
            <div style="line-height: 1.8; color: rgba(212, 175, 55, 0.9); white-space: pre-line;">
                ${formatReadingText(record.interpretation || '')}
            </div>
        </div>

        <!-- 用戶筆記和評分 -->
        <div style="background: var(--black-alpha-60); padding: 25px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
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
                          style="width: 100%; height: 100px; background: var(--black-alpha-80); color: var(--primary-gold); border: 2px solid rgba(212, 175, 55, 0.6); border-radius: 10px; padding: 15px; font-family: 'Cinzel', serif; font-size: 0.9rem; resize: vertical;"
                          placeholder="${currentLanguage === 'zh' ? '在此記錄你的想法、感受或後續發展...' : 'Record your thoughts, feelings, or follow-up developments...'}"
                          maxlength="2000"
                          onchange="updateNotes('${safeRecordId}', this.value)">${escapeHtml(record.userNotes || '')}</textarea>
            </div>
        </div>

        <!-- 標籤管理 -->
        <div style="background: var(--black-alpha-60); padding: 25px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <h3 style="color: var(--primary-gold); margin-bottom: 20px; font-family: 'Philosopher', serif;">
                ${currentLanguage === 'zh' ? '標籤管理' : 'Tag Management'}
            </h3>
            <div id="currentTags_${record.id}" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">
                ${record.tags.map(tag => `
                    <span class="tag" style="background: rgba(212, 175, 55, 0.2); color: var(--primary-gold); padding: 5px 12px; border-radius: 15px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;">
                        ${escapeHtml(tag)}
                        <span onclick="removeTag('${safeRecordId}', decodeURIComponent('${encodeURIComponent(tag)}'))" style="cursor: pointer; color: #ff6b6b; font-weight: bold;">×</span>
                    </span>
                `).join('')}
            </div>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="newTag_${record.id}" 
                       style="flex: 1; padding: 10px; background: var(--black-alpha-80); color: var(--primary-gold); border: 2px solid rgba(212, 175, 55, 0.6); border-radius: 8px; font-family: 'Cinzel', serif;"
                       placeholder="${currentLanguage === 'zh' ? '新增標籤...' : 'Add tag...'}"
                       onkeypress="if(event.key==='Enter') addTag('${record.id}')">
                <button onclick="addTag('${record.id}')" 
                        style="background: var(--primary-gold); color: var(--dark-red); border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: 'Cinzel', serif;">
                    ${currentLanguage === 'zh' ? '添加' : 'Add'}
                </button>
            </div>
        </div>

        <!-- 統計信息 -->
        <div style="display: flex; justify-content: space-around; background: var(--black-alpha-60); padding: 20px; border-radius: 15px; border: 1px solid var(--primary-gold); margin-bottom: 30px;">
            <div style="text-align: center;">
                <div style="color: var(--primary-gold); font-size: 1.2rem; font-weight: bold;">👁️</div>
                <div style="color: rgba(212, 175, 55, 0.8); font-size: 0.8rem; margin-top: 5px;">
                    ${currentLanguage === 'zh' ? '查看次數' : 'View Count'}<br>
                    <strong id="modalViewCount_${record.id}">${record.readCount}</strong>
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
            <button onclick="if(confirm('${currentLanguage === 'zh' ? '確定要刪除這條記錄嗎？' : 'Are you sure you want to delete this record?'}')) { deleteRecord('${record.id}', true); closeRecordModal(); }"
                    style="background: transparent; color: #ff6b6b; border: 2px solid #ff6b6b; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cinzel', serif; font-weight: bold; transition: all 0.3s ease;">
                🗑️ ${currentLanguage === 'zh' ? '刪除' : 'Delete'}
            </button>
        </div>
    `;

    // 顯示模態框
    modal.style.zIndex = '10001';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    modal.querySelector('button')?.focus();

    // 即時更新查看次數顯示
    if (newViewCount !== false) {
        setTimeout(() => {
            updateViewCountEverywhere(recordId, newViewCount);
        }, 100);
    }
}

/**
 * 關閉記錄詳情模態框
 */
function closeRecordModal() {
    const modal = document.getElementById('recordModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // 恢復背景滾動
        modalTriggerElement?.focus();
        modalTriggerElement = null;
    }
}

/**
 * 更新所有位置的查看次數顯示
 */
function updateViewCountEverywhere(recordId, newCount) {
    if (newCount === false) return;
    
    // 1. 更新彈窗中的顯示
    const modalViewCount = document.getElementById(`modalViewCount_${recordId}`);
    if (modalViewCount) {
        modalViewCount.textContent = newCount;
        modalViewCount.style.color = '#ffd700';
        modalViewCount.style.transform = 'scale(1.2)';
        setTimeout(() => {
            modalViewCount.style.color = '';
            modalViewCount.style.transform = '';
        }, 500);
    }
    
    // 2. 更新歷史記錄頁面的卡片視圖
    const recordCards = document.querySelectorAll('.record-card');
    recordCards.forEach(card => {
        if (card.getAttribute('onclick')?.includes(recordId)) {
            const viewCountSpan = card.querySelector('.stat-item span:last-child');
            if (viewCountSpan && viewCountSpan.previousElementSibling?.textContent === '👁️') {
                viewCountSpan.textContent = newCount;
                // 添加更新動畫
                viewCountSpan.style.color = '#ffd700';
                viewCountSpan.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    viewCountSpan.style.color = '';
                    viewCountSpan.style.transform = '';
                }, 500);
            }
        }
    });
    
    // 3. 更新歷史記錄頁面的列表視圖
    const listItems = document.querySelectorAll('#recordsList [onclick*="openRecordModal"]');
    listItems.forEach(item => {
        if (item.getAttribute('onclick')?.includes(recordId)) {
            // 找到包含眼睛圖標的span元素
            const viewCountElement = item.querySelector('span');
            if (viewCountElement && viewCountElement.textContent.includes('👁️')) {
                viewCountElement.textContent = `👁️ ${newCount}`;
                // 添加更新動畫
                viewCountElement.style.color = '#ffd700';
                setTimeout(() => {
                    viewCountElement.style.color = 'rgba(212, 175, 55, 0.7)';
                }, 500);
            }
        }
    });
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
                    ${escapeHtml(tag)}
                    <span onclick="removeTag('${recordId}', decodeURIComponent('${encodeURIComponent(tag)}'))" style="cursor: pointer; color: #ff6b6b; font-weight: bold;">×</span>
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
                    ${escapeHtml(tag)}
                    <span onclick="removeTag('${recordId}', decodeURIComponent('${encodeURIComponent(tag)}'))" style="cursor: pointer; color: #ff6b6b; font-weight: bold;">×</span>
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
    const modal = document.getElementById('recordModal');
    if (e.key === 'Tab' && modal?.style.display === 'block') {
        const focusable = Array.from(modal.querySelectorAll('button, input, textarea, select, [tabindex]:not([tabindex="-1"])'))
            .filter(element => !element.disabled && element.offsetParent !== null);
        if (focusable.length) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
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

function deselectCard(cardElement) {
    const selectedIndex = selectedCards.findIndex(card => card.element === cardElement);
    if (selectedIndex === -1) return;

    selectedCards.splice(selectedIndex, 1);
    cardElement.classList.remove('selected', 'flipped', 'reversed', 'selecting');
    cardElement.setAttribute('aria-pressed', 'false');
    cardElement.setAttribute('aria-label', currentLanguage === 'zh' ? '選擇一張覆蓋的塔羅牌' : 'Select a face-down tarot card');
    cardElement.querySelector('.card-front').innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 1.8rem; margin-bottom: 8px;">${cardElement.dataset.cardSymbol}</div>
            <div style="font-size: 0.75rem; line-height: 1.3;">${cardElement.dataset.cardName}</div>
        </div>`;
    cardElement.querySelector('.card-position-badge')?.remove();
    updateSelectedCardPositions();
    updateProgress();
}

function updateSelectedCardPositions() {
    const positions = spreadInfo[currentMode].positions[currentLanguage];
    selectedCards.forEach((card, index) => {
        let badge = card.element.querySelector('.card-position-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'card-position-badge';
            card.element.appendChild(badge);
        }
        badge.textContent = `${index + 1}. ${positions[index]}`;
    });
}

function confirmSelectedCards() {
    const maxCards = Number(document.getElementById('totalCards').textContent);
    if (selectedCards.length !== maxCards) return;

    showStep(6);
    const questionLabel = t('question-label');
    document.getElementById('userQuestion').innerHTML = `<strong>${questionLabel}</strong><br>"${currentQuestion}"`;
    showLoadingAndGetResults();
}

function returnToQuestion() {
    selectedCards = [];
    document.getElementById('cardsFan').innerHTML = '';
    updateProgress();
    showStep(3);
    document.getElementById('questionInput').focus();
}

function initializeQuestionExperience() {
    const input = document.getElementById('questionInput');
    const count = document.getElementById('questionCount');
    const error = document.getElementById('questionError');
    if (!input || !count) return;

    const updateCount = () => {
        count.textContent = `${input.value.length} / ${input.maxLength}`;
        input.classList.remove('input-error');
        error.textContent = '';
    };

    input.addEventListener('input', updateCount);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.isComposing) {
            event.preventDefault();
            submitQuestion();
        }
    });

    document.getElementById('questionExampleChips')?.addEventListener('click', event => {
        const chip = event.target.closest('.example-chip');
        if (!chip) return;
        input.value = chip.dataset.question;
        updateCount();
        input.focus();
    });
}

function renderQuestionExamples(forceRefresh = false) {
    const container = document.getElementById('questionExampleChips');
    const pool = questionExamples[currentMode]?.[currentLanguage] || questionExamples.three[currentLanguage];
    if (!container || !pool) return;

    const cacheKey = `${currentMode}-${currentLanguage}`;
    const previous = lastQuestionExampleIndexes[cacheKey] || [];
    let candidates = pool.map((_, index) => index).filter(index => !previous.includes(index));
    if (candidates.length < 3) candidates = pool.map((_, index) => index);

    for (let index = candidates.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
    }

    const selectedIndexes = candidates.slice(0, 3);
    lastQuestionExampleIndexes[cacheKey] = selectedIndexes;
    container.innerHTML = selectedIndexes.map(index => `
        <button type="button" class="example-chip" data-question="${pool[index]}">${pool[index]}</button>
    `).join('');
}

document.addEventListener('DOMContentLoaded', initializeQuestionExperience);

function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
}

function formatReadingText(text) {
    const lines = escapeHtml(text).replace(/^#{1,6}\s*/gm, '').split(/\r?\n/);
    const output = [];
    let paragraph = [];
    let listType = null;

    const formatInline = value => value.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const flushParagraph = () => {
        if (!paragraph.length) return;
        output.push(`<p>${paragraph.map(formatInline).join('<br>')}</p>`);
        paragraph = [];
    };
    const closeList = () => {
        if (!listType) return;
        output.push(`</${listType}>`);
        listType = null;
    };

    lines.forEach(line => {
        const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
        const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
        const item = unordered || ordered;

        if (item) {
            flushParagraph();
            const nextType = ordered ? 'ol' : 'ul';
            if (listType !== nextType) {
                closeList();
                output.push(`<${nextType}>`);
                listType = nextType;
            }
            output.push(`<li>${formatInline(item[1])}</li>`);
            return;
        }

        if (!line.trim()) {
            flushParagraph();
            closeList();
            return;
        }

        closeList();
        paragraph.push(line);
    });

    flushParagraph();
    closeList();
    return output.join('');
}

async function displayFinalResults(interpretation) {
    lastInterpretation = interpretation;
    const container = document.getElementById('resultsContainer');
    const positions = spreadInfo[currentMode].positions[currentLanguage];
    const plainParagraphs = interpretation.split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
    const summary = (plainParagraphs[0] || interpretation).replace(/[#*_]/g, '').slice(0, 220);
    const cardsMarkup = selectedCards.map((card, index) => `
        <article class="result-card-item">
            <div class="result-card-image ${card.orientation === 'reversed' ? 'is-reversed' : ''}">
                <img src="${getTarotImagePath(card.name)}" alt="${escapeHtml(card.name)}">
            </div>
            <div class="result-card-position">${escapeHtml(positions[index])}</div>
            <h3>${escapeHtml(card.name)}</h3>
            <span class="result-orientation ${card.orientation}">${card.orientation === 'upright' ? t('upright') : t('reversed')}</span>
        </article>
    `).join('');

    container.innerHTML = `
        <section class="result-summary" aria-labelledby="resultSummaryTitle">
            <span class="result-section-kicker">${currentLanguage === 'zh' ? '核心訊息' : 'Core message'}</span>
            <h3 id="resultSummaryTitle">${escapeHtml(summary)}${summary.length >= 220 ? '…' : ''}</h3>
        </section>

        <section class="result-section" aria-labelledby="drawnCardsTitle">
            <div class="result-section-heading">
                <span class="result-section-kicker">${currentLanguage === 'zh' ? '你的牌陣' : 'Your spread'}</span>
                <h2 id="drawnCardsTitle">${currentLanguage === 'zh' ? '本次抽到的牌' : 'Cards drawn'}</h2>
            </div>
            <div class="result-cards-grid">${cardsMarkup}</div>
        </section>

        <section class="result-section result-reading" aria-labelledby="fullReadingTitle">
            <div class="result-section-heading">
                <span class="result-section-kicker">${currentLanguage === 'zh' ? '完整解讀' : 'Full interpretation'}</span>
                <h2 id="fullReadingTitle">${t('oracle-reading')}</h2>
            </div>
            <div class="result-reading-body">${formatReadingText(interpretation)}</div>
        </section>

        <div class="result-action-bar" aria-label="${currentLanguage === 'zh' ? '解讀操作' : 'Reading actions'}">
            <button class="btn btn-secondary" onclick="copyCurrentReading()">${currentLanguage === 'zh' ? '複製解讀' : 'Copy reading'}</button>
            <button class="btn btn-secondary" onclick="regenerateReading()">${currentLanguage === 'zh' ? '保留牌卡，重新解讀' : 'Regenerate with these cards'}</button>
            <button class="btn" onclick="showHistoryPage()">${currentLanguage === 'zh' ? '查看占卜記錄' : 'View history'}</button>
        </div>`;

    document.title = currentLanguage === 'zh' ? '解讀完成｜TarotVision' : 'Reading ready | TarotVision';
}

async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
}

async function copyCurrentReading() {
    const positions = spreadInfo[currentMode].positions[currentLanguage];
    const cardsText = selectedCards.map((card, index) => `${positions[index]}：${card.name}（${card.orientation === 'upright' ? t('upright') : t('reversed')}）`).join('\n');
    const text = `${currentQuestion}\n\n${cardsText}\n\n${lastInterpretation}`;
    try {
        await copyTextToClipboard(text);
        showNotification(currentLanguage === 'zh' ? '解讀已複製' : 'Reading copied', 'success');
    } catch (error) {
        showNotification(currentLanguage === 'zh' ? '無法複製，請手動選取文字' : 'Unable to copy automatically', 'error');
    }
}

function regenerateReading() {
    if (readingInFlight) return;
    showLoadingAndGetResults();
}

function updateNetworkStatus() {
    const banner = document.getElementById('networkStatus');
    if (!banner) return;
    if (navigator.onLine) {
        banner.textContent = currentLanguage === 'zh' ? '網路已恢復連線' : 'Connection restored';
        banner.hidden = false;
        banner.classList.remove('is-offline');
        setTimeout(() => { if (navigator.onLine) banner.hidden = true; }, 2500);
    } else {
        banner.textContent = currentLanguage === 'zh' ? '目前沒有網路連線；你的問題與牌卡仍會保留。' : 'You are offline. Your question and cards will remain available.';
        banner.hidden = false;
        banner.classList.add('is-offline');
    }
}

window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('online', updateNetworkStatus);
document.addEventListener('DOMContentLoaded', () => {
    if (!navigator.onLine) updateNetworkStatus();
});
