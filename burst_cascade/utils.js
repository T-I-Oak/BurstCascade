(function () {
    window.BurstCascade = window.BurstCascade || {};

    window.BurstCascade.Utils = {
        /**
         * Hexカラーの明度を調整する
         */
        adjustColor(hex, amt) {
            let col = hex.replace('#', '');
            let r = parseInt(col.substring(0, 2), 16) + amt;
            let g = parseInt(col.substring(2, 4), 16) + amt;
            let b = parseInt(col.substring(4, 6), 16) + amt;
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
        },

        /**
         * ポイントがポリゴン内に含まれるか判定 (Ray-casting algorithm)
         */
        isPointInPolygon(px, py, vertices) {
            let inside = false;
            for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
                const xi = vertices[i].x, yi = vertices[i].y;
                const xj = vertices[j].x, yj = vertices[j].y;
                const intersect = ((yi > py) !== (yj > py)) &&
                    (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }
    };
})();
