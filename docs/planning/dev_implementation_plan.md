# 開発実装計画 - デフォルトモードの変更 (v0.10.0)

## 1. 目的
ゲーム起動時のデフォルト設定を `PvC`（1P vs CPU）、`MINI`（ミニマップ）、`NORMAL`（AI難易度）に変更し、ユーザーがスムーズに標準的なゲーム体験を開始できるようにします。

## 2. 厳守事項
- **「ついでの修正」の禁止**: 今回対象外の「チュートリアルシステムの導入」や他のゲームロジックへの影響を及ぼすリファクタリング等は行わない。
- **挙動の維持**: 分割したテスト環境（`npm test`）がすべてパスすることを確認しながら進める。
- **Windows環境の制害**: コマンド実行時は `&&` を使用せず、一つずつ実行すること。
- **[重要!!] 開発完了時の承認**: 開発完了時は必ずユーザー（オーナー）に承認を得てからマージを行う。

---

## 3. 実装ステップ

### No.01: 設定ロード初期値とHTMLデフォルトの変更
- [x] `src/main.js` 内の `loadSettings` に定義されている設定未保存時の初期オブジェクト（`migrationMap.init()`）で、`size` を `'regular'` から `'mini'` に変更する。
- [x] `index.html` 内の `MAP SIZE` トグルオプション（`id="size-select"`）にて、`data-value="mini"` に `selected` クラスを付与し、`data-value="regular"` から `selected` クラスを除去する。
- **[STOP] オーナーの承認を得る**

### No.02: テスト環境の仮想DOM更新とテストの合格確認
- [x] `tests/vitest.setup.js` の `document.body.innerHTML` において、`id="size-select"` の `selected` クラスを `regular` から `mini` に変更する。
- [x] 各テストファイル（`uiManager.test.js`, `renderer.test.js`, `main.test.js`, `inputHandler.test.js`, `gameStateManager.test.js`）内の `document.body.innerHTML` の `size-select` 部分についても同様に `selected` クラスを `mini` に変更する。
- [x] `npm test` を実行し、既存および変更後のすべてのテストが完全にパスすることを確認する。
- **[STOP] オーナーの承認を得る**

### No.03: 最終監査・ドキュメント更新
- [ ] 全てのテストが正常にパスすることを確認する。
- [ ] `docs/planning/backlog.md` の「デフォルトモードの変更」タスクを完了に更新する。
- [ ] 一時ファイル（`tmp_` 等）の残骸がないかチェック・整理する。
- **[STOP!] 開発完了時にユーザーの承認を得る**

---

## 4. パッチバージョンの更新履歴
- 新規ブランチ開発開始時に Minor バージョンを更新して `0.10.0` とします。
- 以降、各ステップの完了・承認を得るごとに Patch バージョンを更新し `package.json` に反映します（v0.10.1, v0.10.2...）。
