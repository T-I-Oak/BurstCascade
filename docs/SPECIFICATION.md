# Burst Cascade 技術仕様書 (ESM/Vite 移行後)

## 概要
Burst Cascade は、Vite と ES Modules (ESM) をベースとしたモダンな Web アプリケーションとして再構築されました。グローバル名前空間 (`window.BurstCascade`) への依存を排除し、モジュール間の明示的な依存関係を確立しています。

## ディレクトリ構造
```
BurstCascade/
├── index.html              # エントリーポイント (HTML)
├── package.json            # プロジェクト設定・依存関係
├── vite.config.js          # Vite 設定
├── burst_cascade/
│   ├── app.js              # エントリーポイント (JS)
│   ├── main.js             # ゲームメインロジック (Game クラス)
│   ├── map.js              # ヘックスマップ管理 (HexMap クラス等)
│   ├── ai.js               # AI ロジック
│   ├── achievements.js      # 実績・統計管理
│   ├── renderer.js         # 描画エンジン
│   ├── sound.js            # サウンド管理
│   ├── constants.js        # 定数定義
│   ├── dataManager.js      # ストレージ・マイグレーション管理
│   ├── utils.js            # ユーティリティ関数
│   └── tests/              # テストディレクトリ
│       ├── vitest.setup.js # Vitest 初期設定
│       └── unit/           # ユニットテスト
```

## アーキテクチャ
- **モジュール管理**: 全ての JS ファイルは ESM (`export`/`import`) を使用します。
- **ゲームインスタンス**: `app.js` で `Game` クラスがインスタンス化され、`window.addEventListener('load', ...)` 内で初期化されます。
- **描画**: Canvas 2D API を使用。`Renderer` クラスが描画を、`main.js` がゲームループを管理します。
- **サウンド**: Web Audio API を使用。`SoundManager` クラスが管理します。
- **データ管理**: `DataManager` クラスが LocalStorage の読み書きと、アプリのメジャーバージョン（`__APP_VERSION__`）に応じた自動マイグレーション処理を一元管理します。

## ビルド・開発環境
- **Vite**: 開発サーバーおよびプロダクションビルドに使用。
- **Vitest**: ユニットテストフレームワーク。JSDOM 環境で動作します。
- **バージョン管理**: `package.json` の `version` フィールドおよび `update_history.json` で管理されます。

## テスト
- `npm test` で全てのユニットテストを実行します。
- テスト実行時は `vitest.setup.js` により、Canvas や AudioContext のモックが自動的に適用されます。
