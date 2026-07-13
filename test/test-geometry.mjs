/**
 * Test untuk perbaikan canvas GraDiOl berbasis referensi draw.io:
 *  - Anchor edge stabil saat handle eksplisit
 *  - Perimeter shape-aware (ellipse/diamond/triangle)
 *  - Self-loop edge
 *  - Cache A* tidak error
 */
import {
	getEdgeGeometry,
	getNodeCenter,
	getShapePerimeterPoint
} from '../lib/utils/geometry.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
	if (cond) {
		passed++;
		console.log('  ✓', msg);
	} else {
		failed++;
		console.error('  ✗', msg);
	}
}

function node(id, type, x, y, w = 120, h = 60) {
	return { id, type, position: { x, y }, width: w, height: h };
}

console.log('TEST 1: Anchor stabil saat handle eksplisit');
{
	const a = node('a', 'rectangle', 0, 0);
	const b = node('b', 'rectangle', 300, 0);
	const e1 = getEdgeGeometry(a, b, { sourceHandle: 'right', targetHandle: 'left' });
	const e2 = getEdgeGeometry(a, b, { sourceHandle: 'right', targetHandle: 'left' });
	// Handle eksplisit -> anchor harus persis sama (tidak "loncat")
	assert(
		e1.source.x === e2.source.x && e1.source.y === e2.source.y,
		'source anchor konsisten untuk handle eksplisit'
	);
	assert(
		e1.target.x === e2.target.x && e1.target.y === e2.target.y,
		'target anchor konsisten untuk handle eksplisit'
	);
	assert(e1.source.x === 120 && e1.source.y === 30, 'source anchor di sisi kanan tengah');
	// Target anchor setelah markerPad (arrow) digeser keluar dari node agar arrow tidak tertutup
	assert(e1.target.x < 300 && e1.target.y === 30, 'target anchor di sisi kiri (tergeser keluar oleh arrow pad)');
}

console.log('TEST 2: Perimeter ellipse (garis tidak menembus lingkaran)');
{
	const a = node('a', 'ellipse', 0, 0, 100, 100);
	const b = node('b', 'ellipse', 300, 0, 100, 100);
	// Aim dari a ke b (kanan)
	const p = getShapePerimeterPoint(a, { x: 400, y: 50 });
	const center = getNodeCenter(a);
	const dx = p.x - center.x;
	const dy = p.y - center.y;
	// Titik harus di tepi ellipse: (dx/50)² + (dy/50)² ≈ 1
	const v = (dx / 50) ** 2 + (dy / 50) ** 2;
	assert(Math.abs(v - 1) < 0.05, `perimeter ellipse di tepi (v=${v.toFixed(3)})`);
	assert(p.x > center.x, 'perimeter ellipse di sisi kanan (arah aim)');
}

console.log('TEST 3: Perimeter diamond');
{
	const a = node('a', 'diamond', 0, 0, 100, 100);
	const p = getShapePerimeterPoint(a, { x: 200, y: 50 });
	const center = getNodeCenter(a);
	// Diamond: |dx|/50 + |dy|/50 = 1  (bentuk rhombus)
	const v = Math.abs(p.x - center.x) / 50 + Math.abs(p.y - center.y) / 50;
	assert(Math.abs(v - 1) < 0.05, `perimeter diamond di tepi (v=${v.toFixed(3)})`);
}

console.log('TEST 4: Self-loop edge');
{
	const a = node('a', 'rectangle', 0, 0, 120, 60);
	const e = getEdgeGeometry(a, a, {});
	assert(e.source.x === 120 && e.source.y === 30, 'self-loop keluar dari kanan');
	assert(e.target.x === 60 && e.target.y === 60, 'self-loop masuk ke bawah');
	assert(e.path.startsWith('M 120 30 C'), 'self-loop pakai path bezier melengkung');
	assert(!e.path.includes('NaN'), 'self-loop path tidak mengandung NaN');
}

console.log('TEST 5: Edge dengan obstacle (A* routing) tidak crash');
{
	const a = node('a', 'rectangle', 0, 0);
	const b = node('b', 'rectangle', 300, 0);
	const obstacle = node('o', 'rectangle', 140, -20, 40, 100);
	const e = getEdgeGeometry(a, b, {}, { index: 0, total: 1 }, [a, b, obstacle]);
	assert(typeof e.path === 'string' && e.path.length > 0, 'path ter-generate dengan obstacle');
	assert(!e.path.includes('NaN'), 'path obstacle tidak mengandung NaN');
}

console.log('TEST 7: Default/straight edge tidak memutar (akar masalah "aneh")');
{
	const a = node('a', 'rectangle', 0, 0);
	const b = node('b', 'rectangle', 300, 0);
	// Node obstacle tepat di tengah garis a-b
	const obstacle = node('o', 'rectangle', 130, -20, 40, 100);
	const all = [a, b, obstacle];
	const eDefault = getEdgeGeometry(a, b, { type: 'default' }, { index: 0, total: 1 }, all);
	const eStraight = getEdgeGeometry(a, b, { type: 'straight' }, { index: 0, total: 1 }, all);
	// Straight edge: boleh ada tepat 1 'L' (garis langsung), tapi TIDAK boleh
	// ada waypoint memutar (lebih dari 1 'L' atau 'C' di tengah).
	const lCount = (eStraight.path.match(/ L /g) || []).length;
	assert(lCount <= 1, `straight edge langsung garis (${lCount} segmen L, harus ≤1)`);
	assert(!eStraight.path.includes(' C '), 'straight edge tidak punya curve memutar');
}

console.log('TEST 8: Bezier default flat (controlDist kecil, tidak melengkung besar)');
{
	const a = node('a', 'rectangle', 0, 0);
	const b = node('b', 'rectangle', 400, 0); // jauh
	const e = getEdgeGeometry(a, b, { sourceHandle: 'right', targetHandle: 'left' });
	// Control point keluar tegak lurus dari sisi (x meningkat sedikit, y tetap)
	// Path: M sx sy C c1x c1y, c2x c2y, tx ty
	const m = e.path.match(/C ([-\d.]+) ([-\d.]+), ([-\d.]+) ([-\d.]+)/);
	const c1x = parseFloat(m[1]);
	const c1y = parseFloat(m[2]);
	assert(Math.abs(c1y - 30) < 1, `control point 1 horizontal (y=${c1y}, harus ~30)`);
	assert(c1x - 120 <= 60, `control point 1 tidak terlalu jauh (dx=${c1x - 120})`);
}

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
