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
    const browserDirPath = path.resolve(__dirname, '../../../Tests/browser');
    const indexHtmlPath = path.resolve(__dirname, '../../../Tests/index.html');

    // 再帰的にファイルを探索するヘルパー
    function getFiles(dir, allFiles = [], extension = '.test.js') {
        if (!fs.existsSync(dir)) return allFiles;
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const name = path.join(dir, file);
            if (fs.statSync(name).isDirectory()) {
                getFiles(name, allFiles, extension);
            } else if (file.endsWith(extension)) {
                // 絶対パスから基準ディレクトリからの相対パスに変換
                const relativePath = path.relative(dir === browserDirPath ? browserDirPath : unitDirPath, name).replace(/\\/g, '/');
                allFiles.push(relativePath);
            }
        });
        return allFiles;
    }

    test('All test files should be registered in Tests/index.html', () => {
        // 1. Tests/index.html を読み込み、両方の配列を取得
        const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
        const jestTestsMatch = indexHtml.match(/const JEST_TESTS = \[\s*([\s\S]*?)\s*\];/);
        const browserTestsMatch = indexHtml.match(/const BROWSER_TESTS = \[\s*([\s\S]*?)\s*\];/);

        if (!jestTestsMatch || !browserTestsMatch) {
            throw new Error('Could not find JEST_TESTS or BROWSER_TESTS array in index.html');
        }

        const jestRegistered = jestTestsMatch[1];
        const browserRegistered = browserTestsMatch[1];

        const missingJest = [];
        const missingBrowser = [];

        // 2. Unit Tests Check (unit/*.test.js -> JEST_TESTS)
        const unitFiles = getFiles(unitDirPath, [], '.test.js');
        unitFiles.forEach(file => {
            if (!jestRegistered.includes(`file: 'unit/${file}'`)) {
                missingJest.push(file);
            }
        });

        // 3. Browser Tests Check (browser/*.js -> BROWSER_TESTS)
        const browserFiles = getFiles(browserDirPath, [], '.js');
        browserFiles.forEach(file => {
            if (!browserRegistered.includes(`file: 'browser/${file}'`)) {
                missingBrowser.push(file);
            }
        });

        // 4. エラーメッセージの構築
        if (missingJest.length > 0 || missingBrowser.length > 0) {
            let message = '\n[Synchronization Error]\n';
            if (missingJest.length > 0) {
                message += `Missing in JEST_TESTS (Tests/unit/):\n${missingJest.map(f => `  - unit/${f}`).join('\n')}\n`;
            }
            if (missingBrowser.length > 0) {
                message += `Missing in BROWSER_TESTS (Tests/browser/):\n${missingBrowser.map(f => `  - browser/${f}`).join('\n')}\n`;
            }
            message += '\nPlease update JEST_TESTS or BROWSER_TESTS in Tests/index.html.';
            throw new Error(message);
        }

        expect(missingJest.length).toBe(0);
        expect(missingBrowser.length).toBe(0);
    });
});
