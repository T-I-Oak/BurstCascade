import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Root / Index Tests', () => {
    describe('Copyright Display', () => {
        test('index.html should contain the correct copyright notice', () => {
            // Path relative to this test file (tests/implementation/index.test.js)
            const indexHtmlPath = path.resolve(__dirname, '../../index.html');
            const html = fs.readFileSync(indexHtmlPath, 'utf8');
            
            // 文字列として含まれているか確認
            expect(html).toContain('© T.I.OAK 2026');
            
            // 正しい構造で含まれているか確認
            expect(html).toMatch(/<div class="copyright">© T.I.OAK 2026<\/div>/);
        });
    });
});
