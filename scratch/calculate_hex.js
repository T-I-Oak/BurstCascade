// ゲーム内の Layout ロジックを完全にシミュレートして SVG パスを生成するスクリプト
const Math_PI = Math.PI;

const projection = {
    angle: 15 * Math_PI / 180,
    tilt: 0.1,
    scaleY: 1.0
};

function project(x, y) {
    const cosA = Math.cos(projection.angle);
    const sinA = Math.sin(projection.angle);
    const rotX = x * cosA - y * sinA;
    const rotY = x * sinA + y * cosA;
    const tiltedY = (rotY - rotX * projection.tilt) * projection.scaleY;
    return { x: rotX, y: tiltedY };
}

function getPolygonVertices(size, scale = 1.0) {
    const vertices = [];
    for (let i = 0; i < 6; i++) {
        const angle = (2 * Math_PI * i) / 6 + Math_PI / 6;
        const vx = (size * scale) * Math.cos(angle);
        const vy = (size * scale) * Math.sin(angle);
        vertices.push(project(vx, vy));
    }
    return vertices;
}

const size = 100;
const h = size * 0.12 * 3; // visualHeight=3 を想定
const topVerts = getPolygonVertices(size);
const bottomVerts = topVerts.map(v => ({ x: v.x, y: v.y + h })); // Rendererでは y-h だが、描画座標系に合わせる

console.log("--- TOP FACE PATH ---");
let topPath = `M ${topVerts[0].x} ${topVerts[0].y}`;
for(let i=1; i<6; i++) topPath += ` L ${topVerts[i].x} ${topVerts[i].y}`;
console.log(topPath + " Z");

console.log("--- SIDE FACES ---");
// Renderer の側面描画ロジック (vB.x > vA.x)
const ccwIndices = [0, 5, 4, 3, 2, 1];
for (let j = 0; j < 6; j++) {
    const idxA = ccwIndices[j], idxB = ccwIndices[(j + 1) % 6];
    const vA = topVerts[idxA], vB = topVerts[idxB];
    if (vB.x > vA.x) {
        let sidePath = `M ${vA.x} ${vA.y} L ${vB.x} ${vB.y} L ${vB.x} ${vB.y + h} L ${vA.x} ${vA.y + h} Z`;
        console.log(`Side ${j}: ${sidePath}`);
    }
}

console.log("--- TEXT MATRIX ---");
const cosA = Math.cos(projection.angle), sinA = Math.sin(projection.angle);
const a = cosA, b = (sinA - cosA * projection.tilt) * projection.scaleY, c = -sinA, d = (cosA + sinA * projection.tilt) * projection.scaleY;
console.log(`matrix(${a.toFixed(4)}, ${b.toFixed(4)}, ${c.toFixed(4)}, ${d.toFixed(4)}, 0, 0)`);
