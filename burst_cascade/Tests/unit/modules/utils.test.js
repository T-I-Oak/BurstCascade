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
            test('hexToRgb should convert hex to rgb object', () => {
                expect(Utils.hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
                expect(Utils.hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
                expect(Utils.hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
            });
        });
    });
})();
