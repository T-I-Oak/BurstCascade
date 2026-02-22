describe('Test Synchronization Check', () => {
    // ブラウザ環境（Node.js 以外）では fs が使えないため、環境チェックを行う
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

    if (!isNode) {
        test('Skipping sync check in browser environment', () => {
            console.log('[Sync Check] Skipped because environment is not Node.js');
        });
        return;
    }

    const fs = require('fs');
    const path = require('path');

    const unitDirPath = path.resolve(__dirname, '..');
    const indexHtmlPath = path.resolve(__dirname, '../../../Tests/index.html');

    // 再帰的にファイルを探索するヘルパー
    function getTestFiles(dir, allFiles = []) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const name = path.join(dir, file);
            if (fs.statSync(name).isDirectory()) {
                getTestFiles(name, allFiles);
            } else if (file.endsWith('.test.js')) {
                // 絶対パスから unit/ からの相対パスに変換
                const relativePath = path.relative(unitDirPath, name).replace(/\\/g, '/');
                allFiles.push(relativePath);
            }
        });
        return allFiles;
    }

    test('All .test.js files in Tests/unit (including subdirectories) should be registered in Tests/index.html', () => {
        // 1. Tests/unit 内のファイルを再帰的にリストアップ
        const testFiles = getTestFiles(unitDirPath);

        // 2. Tests/index.html を読み込む
        const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

        // 3. JEST_TESTS 配列の内容をパース（簡易的な文字列検索）
        // 配列の開始 [ から 終わり ] までをターゲットにする
        const jestTestsMatch = indexHtml.match(/const JEST_TESTS = \[\s*([\s\S]*?)\s*\];/);

        if (!jestTestsMatch) {
            throw new Error('Could not find JEST_TESTS array in index.html');
        }

        const registeredContent = jestTestsMatch[1];

        // 4. 各テストファイルが登録されているかチェック
        const missingFiles = [];
        testFiles.forEach(file => {
            // unit/フォルダ/ファイル名 という形式で登録されているか確認
            const expectedEntry = `file: 'unit/${file}'`;
            if (!registeredContent.includes(expectedEntry)) {
                missingFiles.push(file);
            }
        });

        // エラーメッセージの構築
        if (missingFiles.length > 0) {
            const message = `
[Synchronization Error]
The following test files exist in 'Tests/unit/' but are NOT registered in 'Tests/index.html':
${missingFiles.map(f => `  - ${f}`).join('\n')}

Please add them to the 'JEST_TESTS' array in 'Tests/index.html' to ensure they run in the browser runner.
            `;
            throw new Error(message);
        }

        expect(missingFiles.length).toBe(0);
    });
});
