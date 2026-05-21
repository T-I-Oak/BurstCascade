---
name: start-dev
description: 開発作業を開始するための準備（ドキュメント確認、提案、ブランチ作成）を行います。
user-invocable: true
---

# Skill: start-dev

## 目的
開発作業を開始するための準備を行う。

## 手順
1. プロジェクトの基本ルールを再確認する。
    - C:\Users\tioak\Documents\Games\Projects\GameWorksOAK\GameWorksOAK\docs\common 配下の各ガイドライン。
    - C:\Users\tioak\Documents\Games\Projects\GameWorksOAK\GameWorksOAK\docs\common\local_ai_constraints.md（存在する場合）の AI 専用規範。
2. `docs/` フォルダー配下のドキュメント（`backlog.md`, `dev_handover.md` 等）を確認し、現状を把握する。
3. 今回開発する内容を提案する。
4. オーナーと開発内容が合意できたら、適切な名前でブランチを作成する。
5. 開発計画を `docs/dev_implementation_plan.md` として作成（または更新）する。
    - 各ステップに連番（No.）を振り、ステップごとにオーナーの承認を得るプロセスを含めること。
6. バージョン（Minor）を 1 つ加算し、プロジェクト内の設定（package.json 等）を更新する。
    - 以降、ソースコードの変更を伴うタスクを完了するごとに、Patch バージョンを更新し package.json に反映すること。
