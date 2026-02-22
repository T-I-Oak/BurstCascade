(function () {
    window.BurstCascade = window.BurstCascade || {};

    window.BurstCascade.Constants = {
        VERSION: '4.8.0',
        BPM: {
            TITLE: 80,
            GAME: 120,
            PINCH: 155
        },
        COLORS: {
            0: { top: '#1e293b', side: '#0f172a', border: '#334155', highlight: '#475569' }, // Neutral
            1: { top: '#16a34a', side: '#166534', border: '#064e3b', highlight: '#4ade80' }, // P1
            2: { top: '#dc2626', side: '#991b1b', border: '#7f1d1d', highlight: '#f87171' }  // P2
        },
        PARTICLE_COLORS: {
            1: '#4ade80',
            2: '#f87171'
        },
        UI: {
            GLASS_BG: 'rgba(30, 41, 59, 0.7)',
            ACCENT: '#38bdf8'
        }
    };
})();
