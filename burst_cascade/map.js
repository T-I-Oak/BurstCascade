/**
 * ヘキサマップの座標系と変換ロジック
 * 軸座標系 (Axial Coordinates) を使用
 */

(function () {
    window.BurstCascade = window.BurstCascade || {};

    class Hex {
        constructor(q, r, height = 0, owner = 0, zone = 'main') {
            this.q = q;
            this.r = r;
            this.height = height; // -5 to +5 (internal)
            this.owner = owner;   // 0: Neutral, 1: P1, 2: P2
            this.zone = zone;
            this.hasFlag = false;
            this.flagOwner = 0;   // 本来の持ち主 (1 or 2)
            this.isDisabled = false; // Ver 4.0: 無効化フラグ

            // 表示用のアニメーションデータ
            this.visualHeight = height;
            this.visualFlagScale = 0; // 0 to 1
        }

        get s() {
            return -this.q - this.r;
        }

        clone() {
            const copy = new Hex(this.q, this.r, this.zone);
            copy.height = this.height;
            copy.visualHeight = this.visualHeight;
            copy.owner = this.owner;
            copy.hasFlag = this.hasFlag;
            copy.flagOwner = this.flagOwner;
            copy.visualFlagScale = this.visualFlagScale;
            return copy;
        }

        updateOwner() {
            if (this.height > 0) this.owner = 1;
            else if (this.height < 0) this.owner = 2;
            else this.owner = 0;
        }
    }

    class HexMap {
        constructor(size, mapType = 'regular') {
            this.size = size;
            this.mapType = mapType; // 'regular' or 'mini'
            this.hexes = [];
            this.mainHexes = []; // キャッシュ: メインマップのマス
            this.handHexes = { 'hand-p1': [], 'hand-p2': [] }; // キャッシュ: 手札のマス
            this.hexGrid = {}; // 高速検索用インデックス (zone:q:r)

            this.centers = {}; // ラベル描画用の表示中心（フロート可）
            this.offsets = {}; // ロジック用の中央座標（整数）
            this.generateMap();

            this.hands = { 'hand-p1': [], 'hand-p2': [] }; // 手札データの初期化
            for (let i = 0; i < 6; i++) {
                this.performHandUpdate('hand-p1', 'random');
                this.performHandUpdate('hand-p2', 'random');
            }
        }

        clone() {
            // new HexMap(size) は generateMap を呼んでしまうため、
            // 空のインスタンスを作成して効率的に中身をコピーする
            const copy = Object.create(HexMap.prototype);
            copy.size = this.size;
            copy.mapType = this.mapType;
            copy.centers = this.centers; // 静的データなので参照渡しでOK
            copy.offsets = this.offsets;

            // ヘキサゴンの状態を高速に同期
            copy.hexes = this.hexes.map(h => h.clone());
            copy.mainHexes = copy.hexes.filter(h => h.zone === 'main');
            copy.handHexes = {
                'hand-p1': copy.hexes.filter(h => h.zone === 'hand-p1'),
                'hand-p2': copy.hexes.filter(h => h.zone === 'hand-p2')
            };

            // インデックスの再構築
            copy.hexGrid = {};
            copy.hexes.forEach(h => {
                copy.hexGrid[`${h.zone}:${h.q}:${h.r}`] = h;
            });

            // 手札データ（パターン）の高速コピー
            copy.hands = {
                'hand-p1': this.hands['hand-p1'].map(p => p.slice()),
                'hand-p2': this.hands['hand-p2'].map(p => p.slice())
            };
            return copy;
        }

        generateMap() {
            // メインマップ
            this.centers['main'] = { q: 0, r: 0 };
            this.offsets['main'] = { q: 0, r: 0 };
            this.generateZone(0, 0, this.size, 'main');

            // P1手札: ラベルはやや外側(1.5, 7)、ロジック上の中心は(2, 6)
            this.centers['hand-p1'] = { q: -1.5, r: -7 };
            this.offsets['hand-p1'] = { q: -2, r: -6 };
            this.generateZone(-2, -6, 2, 'hand-p1');

            // P2手札
            this.centers['hand-p2'] = { q: 1.5, r: 7 };
            this.offsets['hand-p2'] = { q: 2, r: 6 };
            this.generateZone(2, 6, 2, 'hand-p2');
        }

        getHexAt(q, r, zone = 'main') {
            return this.hexGrid[`${zone}:${q}:${r}`];
        }

        // 手札をマップに適用し、オーバーフロー情報（陣営別）を返す
        applyHand(targetHex, handZoneId) {
            const handOffset = this.offsets[handZoneId];
            const handHexes = this.hexes.filter(h => h.zone === handZoneId);

            let overflowOccurred = false;
            const overflowedOwners = [];
            const overflowedHexes = [];

            handHexes.forEach(handHex => {
                // 手札センターからの相対座標
                const dq = handHex.q - handOffset.q;
                const dr = handHex.r - handOffset.r;

                // メインマップ上の対象マス
                const mapHex = this.getHexAt(targetHex.q + dq, targetHex.r + dr, 'main');

                // Ver 4.0: 無効化されたマスには作用しない
                if (mapHex && !mapHex.isDisabled) {
                    const originalOwner = mapHex.owner;
                    mapHex.height += handHex.height;

                    // オーバーフロー判定 (-9 to +9 を超える場合)
                    if (mapHex.height > 9 || mapHex.height < -9) {
                        mapHex.height = 0;
                        overflowOccurred = true;
                        overflowedHexes.push(mapHex);
                        overflowedOwners.push(originalOwner); // 0であっても必ずpushする
                    }
                    mapHex.updateOwner();

                    // フラッグ消失チェック
                    if (mapHex.hasFlag) {
                        // 1. 中立になった場合
                        // 2. 敵陣営に占領された場合 (本来の持ち主と現在のオーナーが異なる)
                        if (mapHex.owner === 0 || mapHex.owner !== mapHex.flagOwner) {
                            mapHex.hasFlag = false;
                        }
                    }
                }
            });

            return { overflowOccurred, overflowedOwners, overflowedHexes };
        }

        // 手札更新処理
        performHandUpdate(zoneId, pattern) {
            const handHexes = this.hexes.filter(h => h.zone === zoneId);
            if (handHexes.length < 2) return;

            let success = false;
            let attempts = 0;
            while (!success && attempts < 100) {
                attempts++;
                // 1. ランダムに2マス抽出
                const idxA = Math.floor(Math.random() * handHexes.length);
                let idxB = Math.floor(Math.random() * handHexes.length);
                if (idxA === idxB) continue;

                const hexA = handHexes[idxA];
                const hexB = handHexes[idxB];

                // 2. パターンによる増減対象の決定
                let giver, receiver;
                if (pattern === 'random') {
                    [giver, receiver] = Math.random() > 0.5 ? [hexA, hexB] : [hexB, hexA];
                } else if (pattern === 'focus') {
                    // 集中: 小さい方が減り、大きい方が増える
                    [giver, receiver] = (hexA.height < hexB.height) ? [hexA, hexB] : [hexB, hexA];
                } else if (pattern === 'diffuse') {
                    // 拡散: 大きい方が減り、小さい方が増える
                    [giver, receiver] = (hexA.height > hexB.height) ? [hexA, hexB] : [hexB, hexA];
                }

                // 3. 範囲チェック (-5 to +5)
                if (giver.height > -5 && receiver.height < 5) {
                    giver.height -= 1;
                    receiver.height += 1;
                    // オーナーの更新 (正: P1, 負: P2, 0: 中立)
                    [giver, receiver].forEach(h => {
                        if (h.height > 0) h.owner = 1;
                        else if (h.height < 0) h.owner = 2;
                        else h.owner = 0;
                    });
                    success = true;
                }
            }
        }

        generateZone(offsetQ, offsetR, size, zoneId) {
            // メインマップの頂点座標を定義 (size-1 の距離にある6点)
            // Regular (size=3): distance 2
            // Mini (size=3): distance 1 (effective size=2)
            let coreDistance = size - 1;
            if (zoneId === 'main' && this.mapType === 'mini') {
                coreDistance = size - 2; // distance 1
            }

            const corners = [
                { q: coreDistance, r: 0 }, { q: 0, r: coreDistance }, { q: -coreDistance, r: coreDistance },
                { q: -coreDistance, r: 0 }, { q: 0, r: -coreDistance }, { q: coreDistance, r: -coreDistance }
            ];

            for (let q = -size + 1; q < size; q++) {
                let r1 = Math.max(-size + 1, -q - size + 1);
                let r2 = Math.min(size - 1, -q + size - 1);
                for (let r = r1; r <= r2; r++) {
                    const finalQ = q + offsetQ;
                    const finalR = r + offsetR;

                    let h = 0;
                    let o = 0;
                    let hasFlag = false;
                    let flagOwner = 0;
                    let isDisabled = false;

                    if (zoneId === 'main') {
                        // Miniモードの外周無効化 (-2, 2 の範囲にあるやつ)
                        if (this.mapType === 'mini') {
                            const dist = (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
                            if (dist >= size - 1) { // distance >= 2
                                isDisabled = true;
                            }
                        }

                        // 頂点の判定 (Disabledでない場合のみ)
                        if (!isDisabled) {
                            const cornerIdx = corners.findIndex(c => c.q === q && c.r === r);
                            if (cornerIdx !== -1) {
                                // 交互に 3 と -3 を配置
                                const isP1 = (cornerIdx % 2 === 0);
                                h = isP1 ? 3 : -3;
                                o = isP1 ? 1 : 2;

                                // フラッグを初期配置
                                hasFlag = true;
                                flagOwner = isP1 ? 1 : 2;
                            }
                        }
                    } else if (zoneId === 'hand-p1' || zoneId === 'hand-p2') {
                        // 手札エリア: P1は正(3, 1)、P2は負(-3, -1)
                        const isP1 = (zoneId === 'hand-p1');
                        const baseH = (q === 0 && r === 0) ? 3 : 1;
                        h = isP1 ? baseH : -baseH;
                        o = isP1 ? 1 : 2;
                    }

                    const hex = new Hex(finalQ, finalR, h, o, zoneId);
                    hex.isDisabled = isDisabled;

                    if (zoneId === 'main' && hasFlag) {
                        hex.hasFlag = true;
                        hex.flagOwner = flagOwner;
                    }
                    this.hexes.push(hex);
                    this.hexGrid[`${zoneId}:${finalQ}:${finalR}`] = hex;
                    if (zoneId === 'main') this.mainHexes.push(hex);
                    else if (zoneId === 'hand-p1') this.handHexes['hand-p1'].push(hex);
                    else if (zoneId === 'hand-p2') this.handHexes['hand-p2'].push(hex);
                }
            }
        }
    }

    class Layout {
        constructor(size, origin) {
            this.size = size; // タイルの大きさ (半径)
            this.origin = origin; // Canvas上の中心点

            // Pointy-topped の基本変換行列
            this.orientation = {
                f0: Math.sqrt(3), f1: Math.sqrt(3) / 2,
                f2: 0, f3: 3 / 2
            };

            // クォータービュー・変形用パラメータ
            this.projection = {
                angle: 15 * Math.PI / 180,
                tilt: 0.1,
                scaleY: 1.0
            };
        }

        project(x, y) {
            const cosA = Math.cos(this.projection.angle);
            const sinA = Math.sin(this.projection.angle);
            const rotX = x * cosA - y * sinA;
            const rotY = x * sinA + y * cosA;
            const tiltedY = (rotY - rotX * this.projection.tilt) * this.projection.scaleY;

            return {
                x: rotX + this.origin.x,
                y: tiltedY + this.origin.y
            };
        }

        hexToPixel(hex) {
            const x = (this.orientation.f0 * hex.q + this.orientation.f1 * hex.r) * this.size;
            const y = (this.orientation.f2 * hex.q + this.orientation.f3 * hex.r) * this.size;
            return this.project(x, y);
        }

        // 正六角形の頂点座標を取得 (投影なしの生座標)
        getRawVertices(hex) {
            const centerX = (this.orientation.f0 * hex.q + this.orientation.f1 * hex.r) * this.size;
            const centerY = (this.orientation.f2 * hex.q + this.orientation.f3 * hex.r) * this.size;

            const vertices = [];
            for (let i = 0; i < 6; i++) {
                // i=0 が右下付近
                const angle = (2 * Math.PI * i) / 6 + Math.PI / 6;
                vertices.push({
                    x: centerX + this.size * Math.cos(angle),
                    y: centerY + this.size * Math.sin(angle)
                });
            }
            return vertices;
        }

        // 投影後の頂点座標を取得
        getPolygonVertices(hex, scale = 1.0) {
            const centerX = (this.orientation.f0 * hex.q + this.orientation.f1 * hex.r) * this.size;
            const centerY = (this.orientation.f2 * hex.q + this.orientation.f3 * hex.r) * this.size;

            const vertices = [];
            for (let i = 0; i < 6; i++) {
                const angle = (2 * Math.PI * i) / 6 + Math.PI / 6;
                const vx = centerX + (this.size * scale) * Math.cos(angle);
                const vy = centerY + (this.size * scale) * Math.sin(angle);
                vertices.push(this.project(vx, vy));
            }
            return vertices;
        }
    }

    window.BurstCascade.Hex = Hex;
    window.BurstCascade.HexMap = HexMap;
    window.BurstCascade.Layout = Layout;
})();
