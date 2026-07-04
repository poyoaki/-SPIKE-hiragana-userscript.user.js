// ==UserScript==
// @name         SPIKE App ブロック文言ひらがな化
// @namespace    local.spike.hiragana
// @version      1.6.0
// @description  LEGO Education SPIKE Web App (spike.legoeducation.com) のブロック表示文字列を、漢字を使わないひらがな表記に置き換えます。外部通信は一切行いません。
// @author       you
// @match        https://spike.legoeducation.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  console.log('[SPIKE hiragana] スクリプト読み込み完了 v1.6.0 (辞書内蔵・通信なし)');

  // ---------------------------------------------------------------------
  // 設定
  // ---------------------------------------------------------------------

  // 対象1: SVG内のテキスト要素(ブロック本体のラベルはSVGの<text>/<tspan>で描画される)
  // 対象2: Blocklyのドロップダウン選択メニューなど、HTMLで描画されるポップアップ
  //        (class名に "blockly" や "goog-menu" を含む要素。難読化されていないため
  //        クラス名でそのまま判定できる)
  // Tampermonkeyのサンドボックス環境では el.closest() がSVG要素に対して
  // 正しく動作しないことがあるため、closest()を使わず parentNode を手動で
  // たどってチェックする。
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function isInsideTargetContainer(el) {
    let node = el;
    let depth = 0;
    while (node && depth < 40) {
      if (node.namespaceURI === SVG_NS) return true;
      if (
        typeof node.className === 'string' &&
        (node.className.indexOf('blockly') !== -1 ||
          node.className.indexOf('goog-menu') !== -1)
      ) {
        return true;
      }
      node = node.parentNode;
      depth++;
    }
    return false;
  }

  // ユーザーが自由入力したテキスト(変数名・コメントなど)は変換しない
  function isInsideSkippedElement(el) {
    let node = el;
    let depth = 0;
    while (node && depth < 40) {
      if (node.tagName) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return true;
        if (
          node.getAttribute &&
          node.getAttribute('contenteditable') === 'true'
        ) {
          return true;
        }
      }
      node = node.parentNode;
      depth++;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // 漢字 → ひらがな 対訳表
  // 実際にSPIKE Appの画面に表示されている文言から作成。キーは長いものから
  // 先に照合するので、複合語と単漢字が両方登録されていても正しく変換される。
  // ---------------------------------------------------------------------

  const KANJI_DICT = {
    '反時計回り': 'ひだりむき',
    '時計回り': 'みぎむき',
    '最短経路': 'さいたん',
    '反射光': 'はんしゃ',
    '四捨五入': 'ししゃごにゅう',
    '移動開始': 'いどうかいし',
    '上下逆': 'じょうげぎゃく',
    '絶対値': 'ぜったいち',
    '落下している': 'らっか',
    '受け取った': 'うけとった',
    '停止する': 'ていし',
    '表示する': 'ひょうじ',
    '再生する': 'さいせい',
    '実行する': 'じっこう',
    '検知する': 'けんちする',
    '終了する': 'しゅうりょう',
    '含まれる': 'ふくまれる',
    '繰り返す': 'くりかえす',
    '押された': 'おされた',
    '過ぎた': 'すぎた',
    '割った': 'わった',
    '距離': 'きょり',
    '近い': 'ちかい',
    '色': 'いろ',
    '方向': 'ほうこう',
    '回転する': 'まわす',
    '回転': 'かいてん',
    '回す': 'まわす',
    '回': 'かい',
    '位置': 'いち',
    '行く': 'いく',
    '停止': 'ていし',
    'の向き': 'むき',
    '向き': 'むき',
    '移動に使う': 'いどうの',
    '移動': 'いどう',
    '開始する': 'かいし',
    '開始': 'かいし',
    '右側': 'みぎ',
    '左側': 'ひだり',
    '右': 'みぎ',
    '左': 'ひだり',
    '度': 'ど',
    '秒間': 'びょう',
    '秒': 'びょう',
    '全': 'ぜん',
    '明るさ': 'あかるさ',
    '接続': 'せつぞく',
    '直立': 'ふつう',
    '設定': 'せってい',
    '終わる': 'おわる',
    '音量': 'おんりょう',
    '音': 'おと',
    '鳴らす': 'ならす',
    '止める': 'とめる',
    '効果': 'こうか',
    '変える': 'かえる',
    '傾き': 'かたむき',
    '上': 'うえ',
    '他': 'ほか',
    '圧力': 'あつりょく',
    '角': 'かく',
    'までの乱数': 'のらんすう',
    '乱数': 'らんすう',
    '間': 'あいだ',
    '番目': 'ばんめ',
    '文字': 'もじ',
    '長さ': 'ながさ',
    '余り': 'あまり',
    '使う': 'つかう',
    '前': 'まえ',
    '制御': 'せいぎょ',
    '演算': 'えんざん',
    '変数': 'へんすう',
    '作る': 'つくる',
    '送って': 'おくって',
    '送る': 'おくる',
    '待つ': 'まつ',
  };

  // 長いキーから先に置換する(複合語を単漢字より優先させるため)
  const KANJI_KEYS_SORTED = Object.keys(KANJI_DICT).sort(
    (a, b) => b.length - a.length
  );

  // 文字コード範囲からレンジ文字列を組み立てる。ソース中に直接あいまいな
  // 文字リテラルを書かず、数値コードだけで正規表現を組み立てることで、
  // 保存・読み込み時の文字化けの影響を受けないようにする。
  function codeRange(startCode, endCode) {
    return String.fromCharCode(startCode) + '-' + String.fromCharCode(endCode);
  }

  // ひらがな+カタカナ(U+3041-U+30FF) と CJK漢字(U+3400-U+9FFF)
  const JP_CHAR_RE = new RegExp(
    '[' + codeRange(0x3041, 0x30ff) + codeRange(0x3400, 0x9fff) + ']'
  );

  // カタカナの範囲(U+30A1-U+30F6。長音記号 U+30FC は対象外)
  const KATAKANA_RE = new RegExp(
    '[' + codeRange(0x30a1, 0x30f6) + ']',
    'g'
  );

  function replaceKanji(text) {
    let result = text;
    for (const key of KANJI_KEYS_SORTED) {
      if (result.indexOf(key) !== -1) {
        result = result.split(key).join(KANJI_DICT[key]);
      }
    }
    return result;
  }

  // カタカナ→ひらがなは文字コードの機械的な変換で対応できる
  // (Unicodeでカタカナとひらがなは同じ並び順で0x60ずれているため)
  function katakanaToHiragana(text) {
    return text.replace(KATAKANA_RE, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
  }

  // 自己診断: 既知の文字列でregexが正しく動くか起動時に確認する
  (function selfTest() {
    const sample = String.fromCharCode(0x30e2, 0x30fc, 0x30bf, 0x30fc); // モーター
    const kanjiSample = String.fromCharCode(0x56de, 0x8ee2); // 回転
    console.log(
      '[SPIKE hiragana] 自己診断: JP_CHAR_RE=' + JP_CHAR_RE.source,
      '/ カタカナ一致=' + JP_CHAR_RE.test(sample),
      '/ 漢字一致=' + JP_CHAR_RE.test(kanjiSample),
      '/ 変換結果=' + toHiraganaSafe(sample + kanjiSample)
    );
  })();

  function toHiraganaSafe(text) {
    try {
      return katakanaToHiragana(replaceKanji(text));
    } catch (err) {
      return '(エラー: ' + err + ')';
    }
  }

  function toHiragana(text) {
    if (!JP_CHAR_RE.test(text)) return text;
    return katakanaToHiragana(replaceKanji(text));
  }

  // ---------------------------------------------------------------------
  // DOM 走査・置換
  // ---------------------------------------------------------------------

  const originalTextByNode = new WeakMap();
  const convertedNodes = new Set();

  function collectCandidateTextNodes(root) {
    const nodes = [];
    let debugTotal = 0;
    let debugJpMatch = 0;
    let debugSvgMatch = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        debugTotal++;
        if (!node.nodeValue || !JP_CHAR_RE.test(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        debugJpMatch++;
        if (convertedNodes.has(node)) return NodeFilter.FILTER_REJECT;
        const el = node.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;
        if (isInsideSkippedElement(el)) return NodeFilter.FILTER_REJECT;
        if (!isInsideTargetContainer(el)) return NodeFilter.FILTER_REJECT;
        debugSvgMatch++;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    console.log(
      `[SPIKE hiragana] デバッグ: walker訪問${debugTotal}件 / 日本語一致${debugJpMatch}件 / svg一致${debugSvgMatch}件`
    );
    return nodes;
  }

  let hiraganaEnabled = true;
  let processing = false;
  let pending = false;

  function processAll() {
    if (!hiraganaEnabled) return;
    if (processing) {
      pending = true;
      return;
    }
    processing = true;
    try {
      const nodes = collectCandidateTextNodes(document.body);
      let convertedCount = 0;
      for (const node of nodes) {
        const original = node.nodeValue;
        const converted = toHiragana(original);
        originalTextByNode.set(node, original);
        convertedNodes.add(node);
        if (converted !== original) {
          node.nodeValue = converted;
          convertedCount++;
        }
      }
      console.log(
        `[SPIKE hiragana] 候補${nodes.length}件中 ${convertedCount}件を変換しました`
      );
    } catch (err) {
      console.error('[SPIKE hiragana] processAll 失敗', err);
    } finally {
      processing = false;
      if (pending) {
        pending = false;
        processAll();
      }
    }
  }

  function restoreAll() {
    let restoredCount = 0;
    for (const node of convertedNodes) {
      if (!node.isConnected) continue;
      const original = originalTextByNode.get(node);
      if (original !== undefined && node.nodeValue !== original) {
        node.nodeValue = original;
        restoredCount++;
      }
    }
    convertedNodes.clear();
    console.log(`[SPIKE hiragana] ${restoredCount}件を漢字表記に戻しました`);
  }

  // ---------------------------------------------------------------------
  // MutationObserver でブロックの再描画・新規ブロック追加に追従
  // ---------------------------------------------------------------------

  let debounceTimer = null;
  function scheduleProcess() {
    if (!hiraganaEnabled) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processAll, 300);
  }

  function start() {
    scheduleProcess();
    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some(
        (m) => m.type === 'childList' || m.type === 'characterData'
      );
      if (relevant) scheduleProcess();
    });
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  // ---------------------------------------------------------------------
  // ON/OFF トグルボタン(その場で切り替え。ページ再読み込みは不要)
  // ---------------------------------------------------------------------

  function addToggleButton() {
    const btn = document.createElement('button');
    const render = () => {
      btn.textContent = hiraganaEnabled
        ? 'ひらがな: ON (クリックでOFF)'
        : 'ひらがな: OFF (クリックでON)';
    };
    btn.style.cssText =
      'position:fixed;bottom:80px;right:12px;z-index:999999;' +
      'padding:6px 10px;font-size:12px;border-radius:6px;border:1px solid #999;' +
      'background:#fff;cursor:pointer;opacity:0.85;';
    render();
    btn.addEventListener('click', () => {
      hiraganaEnabled = !hiraganaEnabled;
      render();
      if (hiraganaEnabled) {
        processAll();
      } else {
        restoreAll();
      }
    });
    document.body.appendChild(btn);
  }

  function init() {
    start();
    addToggleButton();
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
