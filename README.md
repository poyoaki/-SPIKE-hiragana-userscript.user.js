# -SPIKE-hiragana-userscript.user.js
LEGO(R) Spike web programming app's Japanese HIRAGANA localization. It enables programming by little kids who can't read difficult Kanji characters.

このプロジェクトは、webアプリのLEGO Education SPIKEアプリの日本語表示を、低学年向けのひらがな表示に切り替えます。
Chromeブラウザで動作します。

How to install
1. Tampermonkeyを導入
Chromeの拡張機能ストアから Tampermonkey をインストール

2. ユーザースクリプトを登録
まず、tampermonkeyアドオンを有効にし、アドレスバー横にアイコンを出します。すると右クリックでスクリプトを追加出来るようになります。
Tampermonkeyのダッシュボード →「新規スクリプト作成」を開き、SPIKE-hiragana-userscript.user.js の中身を全部貼り付けて保存
(または、jsファイルをブラウザにドラッグ&ドロップでもインポート画面が出ます。たぶん)
その後、ユーザースクリプトを有効にすると動きます。

3．SPIKE web Appを開く
ブラウザで https://spike.legoeducation.com/ にアクセスし、言語を日本語表にして、Prime用のブロックエディタを開きます。（Basic用の変換辞書は持ってません）

【動作】
スクリプトが有効になっていれば、自動的に漢字がひらがなになります。ブロックの見出しやブロックのサイズは感じに最適化されてるので、見切れます。
画面右下に出る「ひらがな: ON」ボタンで、ひらがな表示 ⇔ 通常(漢字)表示 を切り替え可能
