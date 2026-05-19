import defaultScenarios from './data/tutorial_scenarios.json';

/**
 * TutorialManager - GameWorks OAK 共通ポータブルチュートリアルエンジン (Ver 0.13.0)
 * 
 * ゲーム固有のロジックやデザイン表現から完全に独立しており、
 * 委譲オプションおよびCSSカスタムプロパティを介してあらゆるゲームに再利用・適用可能です。
 */
export class TutorialManager {
    /**
     * @param {Array} scenarios - チュートリアルのシナリオ配列
     * @param {object} options - ゲーム固有の処理を行うオプションハンドラ
     * @param {function} options.onTriggerCondition - トリガーの条件判定を行うコールバック
     * @param {function} options.onCalculateRect - ゲーム内オブジェクトの座標矩形を計算するコールバック
     * @param {function} options.onActionResume - チュートリアル終了時にゲームを再開するコールバック
     */
    constructor(scenarios = defaultScenarios, options = {}) {
        this.scenarios = scenarios;
        this.currentScenarioIndex = options.initialScenarioIndex !== undefined ? options.initialScenarioIndex : 0;
        this.currentPageIndex = 0;
        this.isShowing = false;

        // 委譲コールバックのバインド
        this.onTriggerCondition = options.onTriggerCondition || (() => true);
        this.onCalculateRect = options.onCalculateRect || (() => null);
        this.onActionResume = options.onActionResume || (() => {});
        this.onSaveIndex = options.onSaveIndex || (() => {});
        this.defaultPadding = options.defaultPadding !== undefined ? options.defaultPadding : 0;
    }

    /**
     * トリガー条件が満たされており、起動予定であるかを事前に判定する（ダイアログは表示しない）
     * @param {string} triggerName - トリガーイベント名
     * @param {object} context - 判定に必要なゲーム状態コンテキスト
     * @returns {boolean} 起動予定の場合は true
     */
    willTrigger(triggerName, context) {
        if (this.isShowing || this.currentScenarioIndex >= this.scenarios.length) {
            return false;
        }

        const currentStep = this.scenarios[this.currentScenarioIndex];
        if (currentStep.trigger !== triggerName) {
            return false;
        }

        return this.onTriggerCondition(triggerName, context);
    }

    /**
     * トリガー条件を判定してチュートリアルを開始する
     * @param {string} triggerName - トリガーイベント名
     * @param {object} context - 判定に必要なゲーム状態コンテキスト
     * @returns {boolean} チュートリアルが表示された場合は true
     */
    checkTrigger(triggerName, context) {
        // すでに表示中、または全ステップ完了している場合は何もしない
        if (this.isShowing || this.currentScenarioIndex >= this.scenarios.length) {
            return false;
        }

        const currentStep = this.scenarios[this.currentScenarioIndex];
        if (currentStep.trigger !== triggerName) {
            return false;
        }

        // ゲーム固有の条件判定をハンドラに委譲
        const isConditionMet = this.onTriggerCondition(triggerName, context);

        if (isConditionMet) {
            this.isShowing = true;
            this.currentPageIndex = 0;
            this.showTooltip(currentStep.pages[0]);
            
            // マスクキャンバスの表示化
            const maskCanvas = document.getElementById('tutorial-mask-canvas');
            if (maskCanvas) {
                maskCanvas.classList.remove('hidden');
                this.resizeMask();
            }
            return true;
        }

        return false;
    }

    /**
     * 指定されたページ情報を吹き出し（ツールチップ）UIに反映・表示する
     * @param {object} page - 表示するページデータ
     */
    showTooltip(page) {
        const tooltipEl = document.getElementById('tutorial-tooltip');
        const titleEl = document.getElementById('tutorial-title');
        const msgEl = document.getElementById('tutorial-message');

        if (!tooltipEl) return;

        const currentStep = this.scenarios[this.currentScenarioIndex];
        if (titleEl) titleEl.textContent = currentStep.title;
        if (msgEl) msgEl.textContent = page.message;

        tooltipEl.classList.remove('hidden');

        // style更新(hidden削除)が確実に描画ツリーに適用され、かつブラウザのレイアウト(Reflow)が100%確定した「次の描画フレーム」で配置を実行する
        // これにより、文字数に応じたツールチップの正確な実寸 offsetHeight を完全に取得できるようになり、めり込みや浮きを完全に根絶します
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.positionTooltip(page);
            });
        });
    }

    /**
     * ツールチップをハイライト対象に合わせて動的にポジショニングする
     * @param {object} page - 表示するページデータ
     */
    positionTooltip(page) {
        const tooltipEl = document.getElementById('tutorial-tooltip');
        if (!tooltipEl || !page.highlight || page.highlight.length === 0) return;

        // 配列の先頭（最初の要素）を吹き出しの吸着ターゲットとする
        const primaryHl = page.highlight[0];
        const rect = this.calculateHighlightTargetRect(primaryHl);
        if (!rect) return;

        const arrowEl = tooltipEl.querySelector('.tooltip-arrow');
        if (arrowEl) {
            arrowEl.className = 'tooltip-arrow'; // クラス名初期化
        }

        const tooltipWidth = tooltipEl.offsetWidth || 320;
        const tooltipHeight = tooltipEl.offsetHeight || 140;

        // 1. 矩形または楕円の、画面上の物理的なハイライト枠の正確な上端 (borderTop) と下端 (borderBottom) を算出
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const padding = primaryHl.padding !== undefined ? primaryHl.padding : this.defaultPadding;

        let borderTop, borderBottom;
        if (primaryHl.shape === 'rect') {
            borderTop = rect.top - padding;
            borderBottom = rect.top + rect.height + padding;
        } else {
            const ry = (rect.height / 2) + padding;
            borderTop = cy - ry;
            borderBottom = cy + ry;
        }

        // 2. 枠の上部と下部で、どちらの Viewport 領域が広いかを動的に判定
        const spaceAbove = borderTop;
        const spaceBelow = typeof window !== 'undefined' ? (window.innerHeight - borderBottom) : 500;
        const placeBelow = spaceBelow > spaceAbove;

        // 3. 広い側に配置を決定し、矢印の先端が枠の境界線に 1ピクセルの隙間もなくピタリと接触するようにY座標を計算
        let topPos;
        if (placeBelow) {
            // 下側に配置 (上向き矢印の先端がハイライト下端枠に接触)
            topPos = borderBottom + 8;
            if (arrowEl) arrowEl.classList.add('arrow-up');
        } else {
            // 上側に配置 (下向き矢印の先端がハイライト上端枠に接触)
            topPos = borderTop - tooltipHeight - 8;
            if (arrowEl) arrowEl.classList.add('arrow-down');
        }

        // 4. 水平位置は、ハイライトの中心軸に中央揃え (画面端からはみ出さないよう10pxのマージン安全補正)
        const leftPos = cx - tooltipWidth / 2;

        tooltipEl.style.top = `${topPos}px`;
        tooltipEl.style.left = `${Math.max(10, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1024) - tooltipWidth - 10, leftPos))}px`;
    }

    /**
     * ハイライト対象の画面上の絶対座標矩形 (top, left, width, height) を計算する
     * @param {object} hl - ハイライトデータ
     * @returns {object|null} 座標オブジェクト
     */
    calculateHighlightTargetRect(hl) {
        // DOM要素のIDが直接指定されていて、かつ固有のtargetTypeがない場合は自動的にgetBoundingClientRectから取得
        if (hl.elementId && (!hl.targetType || hl.targetType === 'element-only')) {
            const el = document.getElementById(hl.elementId);
            if (el) {
                const r = el.getBoundingClientRect();
                return {
                    top: r.top,
                    left: r.left,
                    width: r.width,
                    height: r.height
                };
            }
        }

        // それ以外のゲーム内固有ハイライト（targetTypeなど）は、登録された座標計算ハンドラに委譲
        return this.onCalculateRect(hl);
    }

    /**
     * 暗幕マスクキャンバスのリサイズ設定
     */
    resizeMask() {
        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        if (!maskCanvas || maskCanvas.classList.contains('hidden')) return;

        maskCanvas.width = window.innerWidth;
        maskCanvas.height = window.innerHeight;
    }

    /**
     * 暗幕マスクのくり抜き描画更新（animateループから毎フレーム実行される）
     */
    updateMask() {
        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        if (!maskCanvas || maskCanvas.classList.contains('hidden')) return;

        // 画面サイズに合わせる
        if (maskCanvas.width !== window.innerWidth || maskCanvas.height !== window.innerHeight) {
            this.resizeMask();
        }

        const ctx = maskCanvas.getContext('2d');
        const width = maskCanvas.width;
        const height = maskCanvas.height;

        // CSSカスタムプロパティからスタイル設定を動的に取得（JSハードコードデザイン値の完全排除）
        const computed = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
        const maskColor = computed ? (computed.getPropertyValue('--tutorial-mask-color').trim() || 'rgba(0, 0, 0, 0.65)') : 'rgba(0, 0, 0, 0.65)';
        const strokeColor = computed ? (computed.getPropertyValue('--tutorial-highlight-stroke').trim() || 'transparent') : 'transparent';
        const shadowColor = computed ? (computed.getPropertyValue('--tutorial-highlight-shadow').trim() || 'transparent') : 'transparent';
        const shadowBlur = computed ? parseInt(computed.getPropertyValue('--tutorial-highlight-shadow-blur').trim() || '0', 10) : 0;

        // 1. 全画面を暗幕カラーで塗りつぶす
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = maskColor;
        ctx.fillRect(0, 0, width, height);

        const currentStep = this.scenarios[this.currentScenarioIndex];
        if (!currentStep) return;
        const page = currentStep.pages[this.currentPageIndex];
        if (!page || !page.highlight) return;

        // 2. 合成モードを 'destination-out'（くり抜き）にする
        ctx.globalCompositeOperation = 'destination-out';

        page.highlight.forEach(hl => {
            const rect = this.calculateHighlightTargetRect(hl);
            if (!rect) return;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const padding = hl.padding !== undefined ? hl.padding : this.defaultPadding;

            if (hl.shape === 'rect') {
                // 全画面/大枠は角丸矩形でくり抜く (padding拡張対応)
                const radius = 24;
                ctx.beginPath();
                ctx.moveTo(rect.left - padding + radius, rect.top - padding);
                ctx.lineTo(rect.left + rect.width + padding - radius, rect.top - padding);
                ctx.quadraticCurveTo(rect.left + rect.width + padding, rect.top - padding, rect.left + rect.width + padding, rect.top - padding + radius);
                ctx.lineTo(rect.left + rect.width + padding, rect.top + rect.height + padding - radius);
                ctx.quadraticCurveTo(rect.left + rect.width + padding, rect.top + rect.height + padding, rect.left + rect.width + padding - radius, rect.top + rect.height + padding);
                ctx.lineTo(rect.left - padding + radius, rect.top + rect.height + padding);
                ctx.quadraticCurveTo(rect.left - padding, rect.top + rect.height + padding, rect.left - padding, rect.top + rect.height + padding - radius);
                ctx.lineTo(rect.left - padding, rect.top - padding + radius);
                ctx.quadraticCurveTo(rect.left - padding, rect.top - padding, rect.left - padding + radius, rect.top - padding);
                ctx.closePath();
                ctx.fill();
            } else {
                // 部分ハイライト（楕円形状）：ターゲットの横幅・縦幅に合わせてアスペクト比を完全に維持したグラデーション楕円でくり抜く (padding拡張対応)
                const rx = (rect.width / 2) + padding;  // 横半径
                const ry = (rect.height / 2) + padding;  // 縦半径

                ctx.save();
                ctx.translate(cx, cy);
                // 縦横比が極端に偏っても完全にフィットするように scale を適用
                ctx.scale(1, ry / rx);

                // scale されたコンテキスト上で円として描画し、グラデーションもシャープにアスペクト比に同期させる
                const grad = ctx.createRadialGradient(0, 0, Math.max(0, rx - 4), 0, 0, rx);
                grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;

                ctx.beginPath();
                ctx.arc(0, 0, rx, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });

        // 3. 合成モードを元に戻し、CSSから読み込んだストローク・シャドウで境界線を描画
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;

        if (shadowColor !== 'transparent' && shadowBlur > 0) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
        }

        page.highlight.forEach(hl => {
            const rect = this.calculateHighlightTargetRect(hl);
            if (!rect) return;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const padding = hl.padding !== undefined ? hl.padding : this.defaultPadding;

            if (hl.shape === 'rect') {
                const radius = 24;
                ctx.beginPath();
                ctx.moveTo(rect.left - padding + radius, rect.top - padding);
                ctx.lineTo(rect.left + rect.width + padding - radius, rect.top - padding);
                ctx.quadraticCurveTo(rect.left + rect.width + padding, rect.top - padding, rect.left + rect.width + padding, rect.top - padding + radius);
                ctx.lineTo(rect.left + rect.width + padding, rect.top + rect.height + padding - radius);
                ctx.quadraticCurveTo(rect.left + rect.width + padding, rect.top + rect.height + padding, rect.left + rect.width + padding - radius, rect.top + rect.height + padding);
                ctx.lineTo(rect.left - padding + radius, rect.top + rect.height + padding);
                ctx.quadraticCurveTo(rect.left - padding, rect.top + rect.height + padding, rect.left - padding, rect.top + rect.height + padding - radius);
                ctx.lineTo(rect.left - padding, rect.top - padding + radius);
                ctx.quadraticCurveTo(rect.left - padding, rect.top - padding, rect.left - padding + radius, rect.top - padding);
                ctx.closePath();
                ctx.stroke();
            } else {
                const rx = (rect.width / 2) + padding;
                const ry = (rect.height / 2) + padding;
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        ctx.shadowBlur = 0; // シャドウのリセット
    }

    /**
     * ページをめくる、またはチュートリアルステップを完了してゲームを再開する
     */
    advanceScenario() {
        if (!this.isShowing) return;

        const currentStep = this.scenarios[this.currentScenarioIndex];
        
        if (this.currentPageIndex < currentStep.pages.length - 1) {
            // 次のページへ進む
            this.currentPageIndex++;
            this.showTooltip(currentStep.pages[this.currentPageIndex]);
        } else {
            // このステップの全ページを表示完了 ➔ 終了して進行を進める
            this.currentPageIndex = 0;
            this.currentScenarioIndex++;
            this.onSaveIndex(this.currentScenarioIndex);
            this.isShowing = false;

            // ツールチップと暗幕を非表示化
            const tooltipEl = document.getElementById('tutorial-tooltip');
            if (tooltipEl) tooltipEl.classList.add('hidden');

            const maskCanvas = document.getElementById('tutorial-mask-canvas');
            if (maskCanvas) maskCanvas.classList.add('hidden');

            // 登録された再開コールバックを実行
            this.onActionResume();
        }
    }

    /**
     * チュートリアル状態を最初からにリセットする
     */
    resetTutorial() {
        this.currentScenarioIndex = 0;
        this.onSaveIndex(0);
        this.currentPageIndex = 0;
        this.isShowing = false;

        const tooltipEl = document.getElementById('tutorial-tooltip');
        if (tooltipEl) tooltipEl.classList.add('hidden');

        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        if (maskCanvas) maskCanvas.classList.add('hidden');

        // 再開ハンドラを一度空振りして安全に状態を復帰
        this.onActionResume();
    }
}
