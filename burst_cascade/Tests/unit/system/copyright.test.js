const fs = require('fs');
const path = require('path');

describe('Copyright Display', () => {
    test('index.html should contain the correct copyright notice', () => {
        const indexHtmlPath = path.resolve(__dirname, '../../../../index.html');
        const html = fs.readFileSync(indexHtmlPath, 'utf8');
        
        // 文字列として含まれているか確認
        expect(html).toContain('© T.I.OAK 2026');
        
        // 正しい構造で含まれているか確認
        expect(html).toMatch(/<div class="copyright">© T.I.OAK 2026<\/div>/);
    });
});
