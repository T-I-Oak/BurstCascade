# Backlog

バックログには詳細な要件が記載されていません。
設計・実装する際にはプロジェクトオーナーと相談しながら進めてください。

## ゲーム
- [x] drawが正しく判定されていない

## アチーブメント
- [x] コア収集家のmetricの収集方法が誤っている
- [x] (改善)スピード決着のターン数を30ターンに変更する
- [x] コアスナイパー、コアハンターが判定されない

## シェア機能（新機能）
- [ ] X(Twitter)でマップをシェアできるようにする
- [ ] シェア対象はゲーム画面とアチーブメントを想定

## インフラ・バージョン管理
- [ ] 現在のバージョンを0.xにする (βバージョンの位置づけに変更)
- [ ] バージョン管理を package.json での管理に一本化する
- [ ] historyの持ち方を変更 (rootに `update_history.json` を配置)
    ```json
    [
      {
        "version": "1.0",
        "date": "2026-05-10",
        "title": "パフォーマンス改善",
        "description": "レンダリングエンジンの最適化により、動作がよりスムーズになりました。",
        "changes": [
          "描画処理のメモリ使用量を15%削減",
          "特定の条件下で発生していたグリッチの修正",
          "UIのレスポンス向上"
        ]
      }
    ]
    ```
- [ ] Viteでのビルド環境を構築する

### ビルドの設定詳細
1. **ベース環境の構築**
    - Viteの導入と基本構成の設定 (`npm init vite@latest` または既存への追加)
    - `package.json` に `type: "module"` を追加し ESM を有効化
    - scripts 定義: `dev`, `build`, `preview`, `test`
2. **依存パッケージのインストール**
    - `npm install -D vite vitest jsdom`
3. **vite.config.js の詳細設定**
    - ベースパス設定 (base)
    - バージョン情報の注入 (`__APP_VERSION__` を `define` で定義)
    - ビルドターゲット最適化 (`target: 'esnext'`, `cssTarget: 'chrome100'`)
    - 出力アセットの整理 (rollupOptions.output で `assets/` フォルダに統一)
4. **テスト環境の整備 (Vitest)**
    - `vite.config.js` 内に `test` セクションを追加
    - `environment: 'jsdom'` を設定

## 【共通バックログ】将来の共通基盤化を見据えた DataManager 標準規約
- [ ] 将来の共通基盤化を見据えた DataManager の標準インターフェースを実装する
    1. **コア・アクセス・メソッド (Generic Accessors)**
        将来のライブラリ化において「共通エンジン」となる部分。
        - `getSavedData(key: string, migrationMap: MigrationMap): object`
            - データ不在時: `migrationMap.init()` を実行し、生成されたデータを返す。
            - データ存在時: `data.dataVersion` とアプリのメジャーバージョンを比較し、必要に応じて `_migrate` を実行。
            - 後処理: 返却前に `dataVersion` フィールドを除去し、利用側を「純粋なデータ」のみにする。
        - `setSavedData(key: string, data: object): void`
            - 保存直前に、現在のメジャーバージョンを `dataVersion` として付加して永続化する。
    2. **MigrationMap 型の厳密な定義 (Contract)**
        以下の構造をプロジェクト間で共通化する。
        ```typescript
        {
          init: () => object,                // (必須) 初期データ生成ロジック
          [version: number]: (data: object) => object // (任意) 各メジャーバージョンでの変換ロジック
        }
        ```
    3. **内部マイグレーション・エンジン (_migrate)**
        保存されている `dataVersion` より大きく、現在のアプリのメジャーバージョン以下のキーに対応する変換関数を順次適用する共通アルゴリズム。
    4. **カプセル化と隠蔽 (Encapsulation)**
        `init()` や 各バージョン変換関数の戻り値には `dataVersion` を含める必要はない（`setSavedData` が自動で付与するため）。
        利用側（外部）がこのマイグレーションの仕組み（`dataVersion` の存在など）を一切意識せずに済むように実装する。
