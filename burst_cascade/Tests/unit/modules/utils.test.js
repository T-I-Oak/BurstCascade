(function () {
    const Utils = window.BurstCascade.Utils;

    describe('Utils Module', () => {
        describe('adjustColor', () => {
            test('should lighten a color', () => {
                expect(Utils.adjustColor('#000000', 20)).toBe('#141414');
            });

            test('should darken a color', () => {
                expect(Utils.adjustColor('#ffffff', -20).toLowerCase()).toBe('#ebebeb');
            });

            test('should clamp color values to 0-255', () => {
                expect(Utils.adjustColor('#000000', -100)).toBe('#000000');
                expect(Utils.adjustColor('#ffffff', 100).toLowerCase()).toBe('#ffffff');
            });
        });

        describe('hexToRgb', () => {
            test('should convert hex to rgb object', () => {
                const rgb = Utils.hexToRgb('#ff0000');
                expect(rgb.r).toBe(255);
                expect(rgb.g).toBe(0);
                expect(rgb.b).toBe(0);
            });
        });
    });
})();
