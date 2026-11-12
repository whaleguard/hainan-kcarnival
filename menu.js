/* 부스별 판매 메뉴 (예시 메뉴·가격, 위안화) + GPT 상품 사진 시트 잘라쓰기 */
(function () {
  "use strict";
  // sheet: [file, cols, rows]
  const SHEETS = { S1: ["menu-s1.jpg", 3, 3], S2: ["menu-s2.jpg", 3, 3], S3: ["menu-s3.jpg", 3, 3], S4: ["menu-s4.jpg", 4, 3], S5: ["menu-s5.jpg", 4, 3], S6: ["menu-s6.jpg", 3, 2] };
  // key: [sheet, cell, ko, zh, en, ja]
  const I = {
    saju: ["S6", 0, "AI 사주 운세 출력", "AI四柱运势打印", "AI saju fortune print", "AI四柱推命プリント"],
    gunghap: ["S6", 1, "궁합 카드", "缘分配对卡", "Compatibility card", "相性カード"],
    sinnyeon: ["S6", 2, "2027 신년운세 카드", "2027新年运势福卡", "2027 New-year fortune card", "2027新年運勢カード"],
    yut: ["S6", 3, "윷놀이 한 판", "尤茨游戏一局", "Yut nori (1 round)", "ユンノリ1回"],
    tuho: ["S6", 4, "투호 던지기 5개", "投壶 5支", "Tuho (5 arrows)", "投壺5本"],
    jegi: ["S6", 5, "제기차기·딱지치기 도전", "踢毽子·拍纸板挑战", "Jegi & ddakji challenge", "チェギ・メンコ挑戦"],
    fried: ["S1", 0, "후라이드치킨 한 마리", "原味炸鸡 整只", "Fried chicken (whole)", "フライドチキン 1羽"],
    yang: ["S1", 1, "양념치킨 한 마리", "甜辣炸鸡 整只", "Yangnyeom chicken (whole)", "ヤンニョムチキン 1羽"],
    soy: ["S1", 2, "간장마늘치킨 한 마리", "酱油蒜香炸鸡 整只", "Soy garlic chicken (whole)", "醤油ニンニクチキン 1羽"],
    gang: ["S1", 3, "닭강정 컵", "韩式甜脆鸡块 杯", "Dakgangjeong cup", "タッカンジョン カップ"],
    tteok: ["S1", 4, "떡볶이", "辣炒年糕", "Tteokbokki", "トッポッキ"],
    eomuk: ["S1", 5, "어묵꼬치 (국물 포함)", "鱼饼串 (含汤)", "Fish cake skewers & broth", "おでん串 (スープ付き)"],
    gimbap: ["S1", 6, "김밥", "紫菜包饭", "Gimbap", "キンパ"],
    hotdog: ["S1", 7, "한국식 핫도그", "韩式热狗", "Korean corn dog", "韓国式ホットドッグ"],
    cheese: ["S1", 8, "치즈볼 5개", "芝士球 5个", "Cheese balls (5)", "チーズボール 5個"],
    janchi: ["S2", 0, "잔치국수", "韩式汤面", "Janchi guksu noodles", "チャンチグクス"],
    naeng: ["S2", 1, "비빔냉면", "拌冷面", "Bibim naengmyeon", "ビビン冷麺"],
    ramyeon: ["S2", 2, "냄비 라면", "锅煮拉面", "Pot ramyeon", "鍋ラーメン"],
    jjajang: ["S2", 3, "짜장면", "韩式炸酱面", "Jjajangmyeon", "チャジャン麺"],
    bulgogi: ["S2", 4, "불고기 꼬치", "烤牛肉串", "Bulgogi skewer", "プルコギ串"],
    dakkochi: ["S2", 5, "닭꼬치", "鸡肉串", "Chicken skewer", "タッコチ"],
    bibimbap: ["S2", 6, "비빔밥", "石锅拌饭", "Bibimbap", "ビビンバ"],
    dosirak: ["S2", 7, "한식 도시락", "韩式便当", "Korean lunch box", "韓国弁当"],
    jeon: ["S2", 8, "김치전", "泡菜煎饼", "Kimchi pancake", "キムチチヂミ"],
    sikhye: ["S3", 0, "식혜", "甜米露", "Sikhye rice punch", "シッケ"],
    yuja: ["S3", 1, "유자에이드", "柚子气泡饮", "Yuja ade", "ゆずエイド"],
    banana: ["S3", 2, "바나나우유", "香蕉牛奶", "Banana milk", "バナナ牛乳"],
    berry: ["S3", 3, "딸기라떼", "草莓拿铁", "Strawberry latte", "いちごラテ"],
    beer: ["S3", 4, "생맥주 500ml", "生啤 500ml", "Draft beer 500ml", "生ビール 500ml"],
    soju: ["S3", 5, "소주 1병", "烧酒 1瓶", "Soju (bottle)", "焼酎 1本"],
    makgeolli: ["S3", 6, "막걸리 한 사발", "马格利米酒 一碗", "Makgeolli bowl", "マッコリ 1杯"],
    bingsu: ["S3", 7, "팥빙수", "红豆刨冰", "Patbingsu", "パッピンス"],
    hotteok: ["S3", 8, "호떡", "韩式糖饼", "Hotteok", "ホットク"],
    toner: ["S4", 0, "토너 200ml", "爽肤水 200ml", "Toner 200ml", "化粧水 200ml"],
    serum: ["S4", 1, "세럼 50ml", "精华 50ml", "Serum 50ml", "美容液 50ml"],
    cream: ["S4", 2, "수분크림 50ml", "保湿霜 50ml", "Moisturizer 50ml", "保湿クリーム 50ml"],
    sun: ["S4", 3, "선크림 SPF50+", "防晒霜 SPF50+", "Sunscreen SPF50+", "日焼け止め SPF50+"],
    cushion: ["S4", 4, "쿠션 팩트", "气垫粉底", "Cushion compact", "クッションファンデ"],
    tint: ["S4", 5, "립틴트", "唇釉", "Lip tint", "リップティント"],
    mask: ["S4", 6, "마스크팩 10매", "面膜 10片", "Sheet masks (10)", "シートマスク 10枚"],
    shampoo: ["S4", 7, "샴푸 500ml", "洗发水 500ml", "Shampoo 500ml", "シャンプー 500ml"],
    handcream: ["S4", 8, "핸드크림", "护手霜", "Hand cream", "ハンドクリーム"],
    perfume: ["S4", 9, "향수 50ml", "香水 50ml", "Perfume 50ml", "香水 50ml"],
    device: ["S4", 10, "LED 뷰티 디바이스", "LED美容仪", "LED beauty device", "LED美容機器"],
    lotion: ["S4", 11, "바디로션 300ml", "身体乳 300ml", "Body lotion 300ml", "ボディローション 300ml"],
    pcard: ["S5", 0, "K-POP 포토카드 세트", "K-POP小卡套装", "K-POP photocard set", "K-POPフォトカードセット"],
    stick: ["S5", 1, "응원봉", "应援棒", "Light stick", "ペンライト"],
    plush: ["S5", 2, "캐릭터 인형", "角色玩偶", "Character plush", "キャラクターぬいぐるみ"],
    keyring: ["S5", 3, "키링", "钥匙扣", "Keyring", "キーリング"],
    fourcut: ["S5", 4, "네컷 사진 (2장)", "四格照片 (2张)", "4-cut photo strip (2)", "4カット写真 (2枚)"],
    hanbok: ["S5", 5, "한복 대여 1시간", "韩服租赁 1小时", "Hanbok rental (1 hr)", "韓服レンタル 1時間"],
    color: ["S5", 6, "퍼스널컬러 진단", "个人色彩诊断", "Personal color analysis", "パーソナルカラー診断"],
    kit: ["S5", 7, "떡볶이 밀키트 2인분", "辣炒年糕预制菜 2人份", "Tteokbokki meal kit (2)", "トッポッキ ミールキット 2人前"],
    gochu: ["S5", 8, "고추장 500g", "韩式辣酱 500g", "Gochujang 500g", "コチュジャン 500g"],
    ginseng: ["S5", 9, "홍삼스틱 30포", "红参棒 30包", "Red ginseng sticks (30)", "紅参スティック 30包"],
    yujatea: ["S5", 10, "꿀유자차 1kg", "蜂蜜柚子茶 1kg", "Honey yuja tea 1kg", "はちみつゆず茶 1kg"],
    gim: ["S5", 11, "김스낵", "海苔脆片", "Seaweed snack", "のりスナック"]
  };
  // booth id → [[item, price ¥], ...]
  const M = {
    "1": [["fried", 68], ["cheese", 22], ["beer", 25]],
    "2": [["yang", 72], ["cheese", 22], ["beer", 25]],
    "3": [["soy", 72], ["gang", 28], ["beer", 25]],
    "4": [["gang", 28], ["cheese", 22], ["yuja", 18]],
    "5": [["janchi", 32], ["naeng", 38], ["ramyeon", 25], ["jjajang", 35]],
    "6": [["tteok", 26], ["eomuk", 18], ["gimbap", 22], ["hotdog", 20]],
    "7": [["sikhye", 15], ["yuja", 18], ["banana", 15], ["berry", 22]],
    "8": [["beer", 25], ["soju", 35], ["makgeolli", 40], ["jeon", 30]],
    "9": [["toner", 128], ["serum", 168], ["cream", 148], ["mask", 69]],
    B01: [["tteok", 26], ["eomuk", 18], ["gimbap", 22], ["hotdog", 20]],
    B02: [["fried", 68], ["yang", 72], ["gang", 28], ["beer", 25]],
    B03: [["bulgogi", 25], ["dakkochi", 20], ["jeon", 30], ["beer", 25]],
    B04: [["gimbap", 22], ["dosirak", 42], ["bibimbap", 45]],
    B05: [["bingsu", 42], ["hotteok", 15], ["berry", 22]],
    B06: [["yuja", 18], ["banana", 15], ["berry", 22], ["sikhye", 15]],
    B07: [["kit", 39], ["gochu", 29], ["ramyeon", 35]],
    B08: [["kit", 39], ["gim", 12], ["gochu", 29]],
    B09: [["gochu", 29], ["gim", 12], ["yujatea", 58]],
    B10: [["ginseng", 268], ["yujatea", 58], ["gim", 12]],
    B11: [["toner", 128], ["serum", 168], ["cream", 148], ["sun", 98]],
    B12: [["cushion", 138], ["tint", 79], ["mask", 69]],
    B13: [["shampoo", 88], ["lotion", 78], ["handcream", 39]],
    B14: [["serum", 168], ["sun", 98], ["mask", 69]],
    B15: [["mask", 69], ["cream", 148], ["toner", 128]],
    B16: [["perfume", 228], ["handcream", 39], ["lotion", 78]],
    B17: [["device", 899], ["serum", 168]],
    B18: [["pcard", 39], ["stick", 199], ["keyring", 29]],
    B19: [["pcard", 25]],
    B20: [["saju", 20], ["gunghap", 30], ["sinnyeon", 15]],
    B21: [["yut", 10], ["tuho", 10], ["jegi", 10]],
    B22: [["fourcut", 30]],
    B23: [["hanbok", 99]],
    B24: [["color", 168]]
  };
  const L = { ko: 2, zh: 3, en: 4, ja: 5 };
  window.MENU = {
    items(id) { return (M[id] || []).map(([k, p]) => ({ key: k, price: p, sheet: I[k][0], cell: I[k][1], name: lang => I[k][L[lang]] })); },
    note: { ko: "예시 메뉴·가격 (참가업체 확정 후 변경)", zh: "示例菜单·价格（以参展商确认为准）", en: "Sample menu & prices (final after exhibitors confirm)", ja: "メニュー・価格は例です（出展者確定後に変更）" },
    title: { ko: "판매 메뉴", zh: "销售菜单", en: "Menu", ja: "メニュー" },
    img: {},   // "S1:0" → dataURL
    ready: false,
    _cbs: [],
    onReady(cb) { if (this.ready) cb(); else this._cbs.push(cb); }
  };
  // crop each sheet into square-ish thumbnails once
  let left = Object.keys(SHEETS).length;
  Object.entries(SHEETS).forEach(([s, [file, cols, rows]]) => {
    const im = new Image();
    im.onload = () => {
      const cw = im.naturalWidth / cols, ch = im.naturalHeight / rows, inset = 0.04;
      const c = document.createElement("canvas"); c.width = 320; c.height = 320; const x = c.getContext("2d");
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        const sw = cw * (1 - inset * 2), sh = ch * (1 - inset * 2), side = Math.min(sw, sh);
        const sx = k * cw + (cw - side) / 2, sy = r * ch + (ch - side) / 2;
        x.fillStyle = "#fff"; x.fillRect(0, 0, 320, 320); x.drawImage(im, sx, sy, side, side, 0, 0, 320, 320);
        window.MENU.img[s + ":" + (r * cols + k)] = c.toDataURL("image/jpeg", 0.86);
      }
      done();
    };
    im.onerror = done;
    im.src = file + "?v=1";
  });
  function done() { if (--left === 0) { window.MENU.ready = true; window.MENU._cbs.forEach(f => f()); window.MENU._cbs = []; } }
})();
