import { parseAscii } from '../lib/ascii/parser.js';

const testSimple = `+----------+       +----------+
|  Input   |------>| Validate |
+----------+       +----------+
                        |
                        |
                        v
                   +----------+
                   | Is Valid? |
                   +----------+
                        |
                        v
                   +----------+
                   |  Accept  |
                   +----------+`;

const testBranch = `+----------+       +----------+
|  Input   |------>| Validate |
+----------+       +----------+
                        |
                        v
                   +----------+
                   | Is Valid? |
                   +----------+
                        |
              +---------+---------+
              |                   |
              v                   v
        +----------+       +----------+
        |  Accept  |       |  Reject  |
        +----------+       +----------+`;

console.log('=== TEST 1: Simple ===');
const result1 = parseAscii(testSimple);
console.log('Nodes found:', result1.nodes.length);
result1.nodes.forEach(n => console.log(`  - "${n.label}" (type: ${n.type}, pos: ${n.position.x},${n.position.y})`));
console.log('Edges found:', result1.edges.length);
result1.edges.forEach(e => console.log(`  - ${e.source} -> ${e.target}`));

console.log('\n=== TEST 2: Branching ===');
const result2 = parseAscii(testBranch);
console.log('Nodes found:', result2.nodes.length);
result2.nodes.forEach(n => console.log(`  - "${n.label}" (type: ${n.type}, pos: ${n.position.x},${n.position.y})`));
console.log('Edges found:', result2.edges.length);
result2.edges.forEach(e => console.log(`  - ${e.source} -> ${e.target}`));
