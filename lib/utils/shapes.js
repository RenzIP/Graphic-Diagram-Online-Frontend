function getShapePath(type, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  switch (type) {
    // --- Basic Shapes ---
    case "process":
    case "rectangle":
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    case "rounded":
    case "start-end":
    case "terminator":
      const r = Math.min(w, h) / 2;
      return `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    case "decision":
    case "diamond":
    case "relationship":
    case "gateway":
      return `M ${cx} 0 L ${w} ${cy} L ${cx} ${h} L 0 ${cy} Z`;
    case "triangle":
      return `M ${cx} 0 L ${w} ${h} L 0 ${h} Z`;
    case "circle":
    case "ellipse":
    case "start-event":
    case "intermediate-event":
    case "end-event":
    case "attribute":
    case "connector":
    case "interface":
      return `M 0 ${cy} A ${cx} ${cy} 0 1 1 ${w} ${cy} A ${cx} ${cy} 0 1 1 0 ${cy} Z`;
    case "star":
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI / 5 - Math.PI / 2;
        const r2 = i % 2 === 0 ? w / 2 : w / 4;
        points.push(cx + r2 * Math.cos(angle));
        points.push(cy + r2 * Math.sin(angle));
      }
      return `M ${points[0]} ${points[1]} L ` + points.slice(2).reduce((acc, val, i, arr) => {
        if (i % 2 === 0) return acc + `${val} ${arr[i + 1]} L `;
        return acc;
      }, "") + "Z";
    case "hexagon":
    case "preparation":
      return `M ${w * 0.25} 0 L ${w * 0.75} 0 L ${w} ${cy} L ${w * 0.75} ${h} L ${w * 0.25} ${h} L 0 ${cy} Z`;
    case "octagon":
      const o = Math.min(w, h) * 0.3;
      return `M ${o} 0 L ${w - o} 0 L ${w} ${o} L ${w} ${h - o} L ${w - o} ${h} L ${o} ${h} L 0 ${h - o} L 0 ${o} Z`;
    case "parallelogram":
    case "input-output":
      const p = w * 0.2;
      return `M ${p} 0 L ${w} 0 L ${w - p} ${h} L 0 ${h} Z`;
    case "trapezoid":
    case "manual-operation":
      const t = w * 0.2;
      return `M 0 0 L ${w} 0 L ${w - t} ${h} L ${t} ${h} Z`;
    case "cloud":
      // Smooth, symmetric cloud. Built from overlapping arcs so the bumps read
      // evenly. Tuned to stay inside the bounding box at any width/height.
      return `M ${w * 0.28} ${h * 0.72}
        C ${w * 0.10} ${h * 0.72} ${w * 0.08} ${h * 0.46} ${w * 0.26} ${h * 0.44}
        C ${w * 0.22} ${h * 0.22} ${w * 0.50} ${h * 0.14} ${w * 0.58} ${h * 0.32}
        C ${w * 0.74} ${h * 0.20} ${w * 0.96} ${h * 0.32} ${w * 0.88} ${h * 0.50}
        C ${w * 0.98} ${h * 0.58} ${w * 0.92} ${h * 0.78} ${w * 0.74} ${h * 0.74}
        C ${w * 0.70} ${h * 0.92} ${w * 0.36} ${h * 0.92} ${w * 0.28} ${h * 0.72}
        Z`;
    case "note":
      const fold = Math.min(w, h) * 0.2;
      return `M 0 0 L ${w - fold} 0 L ${w} ${fold} L ${w} ${h} L 0 ${h} Z 
        M ${w - fold} 0 L ${w - fold} ${fold} L ${w} ${fold}`;
    case "callout":
      return `M 0 0 L ${w} 0 L ${w} ${h * 0.7} L ${w * 0.4} ${h * 0.7} L ${w * 0.2} ${h} L ${w * 0.3} ${h * 0.7} L 0 ${h * 0.7} Z`;
    case "cross":
      const c = Math.min(w, h) * 0.25;
      return `M ${c} 0 L ${w - c} 0 L ${w - c} ${c} L ${w} ${c} L ${w} ${h - c} L ${w - c} ${h - c} L ${w - c} ${h} L ${c} ${h} L ${c} ${h - c} L 0 ${h - c} L 0 ${c} L ${c} ${c} Z`;
    case "cylinder":
    case "database": {
      // Cylinder with a flat bottom and a curved top rim, matching draw.io's
      // database icon. The body is a rectangle; the top is a half-ellipse.
      // Uses a symmetric ellipse cap so the rim reads cleanly at any aspect.
      const ry = Math.max(6, Math.min(h * 0.18, w * 0.18));
      return [
        `M 0 ${ry}`,
        `L 0 ${h}`,
        `L ${w} ${h}`,
        `L ${w} ${ry}`,
        `A ${w / 2} ${ry} 0 0 1 0 ${ry}`,
        `Z`,
        `M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`
      ].join(" ");
    }
    // Flowchart specific
    case "manual-input":
      const mi = h * 0.2;
      return `M 0 ${mi} L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    case "delay":
      return `M 0 0 L ${w * 0.8} 0 A ${w * 0.2} ${h / 2} 0 0 1 ${w * 0.8} ${h} L 0 ${h} Z`;
    case "display":
      return `M 0 ${h / 2} L ${w * 0.2} 0 L ${w * 0.8} 0 L ${w} ${h / 2} L ${w * 0.8} ${h} L ${w * 0.2} ${h} Z`;
    case "internal-storage":
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${w * 0.15} 0 L ${w * 0.15} ${h} M ${w * 0.15} ${h * 0.15} L ${w} ${h * 0.15}`;
    case "card":
      return `M 0 ${h * 0.2} L ${w * 0.2} 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    case "collate":
      return `M 0 0 L ${w} ${h} L 0 ${h} L ${w} 0 Z`;
    case "off-page":
      return `M 0 0 L ${w} 0 L ${w} ${h * 0.8} L ${w * 0.5} ${h} L 0 ${h * 0.8} Z`;
    case "document":
      return `M 0 0 L ${w} 0 L ${w} ${h * 0.85} Q ${w * 0.75} ${h} ${w * 0.5} ${h * 0.85} T 0 ${h * 0.85} Z`;
    case "multi-document":
      return `M 0 0 L ${w} 0 L ${w} ${h * 0.85} Q ${w * 0.75} ${h} ${w * 0.5} ${h * 0.85} T 0 ${h * 0.85} Z`;
    // Simplified
    // UML stick-figure actor (stroke-only; fill is handled separately in ShapeNode)
    case "actor": {
      // UML stick figure. Use a larger head and higher arms so the figure
      // reads as a person and not a cross/plus sign.
      const figureH = h * 0.75;
      const headR = Math.min(w, figureH) * 0.20;
      const wc = w / 2;
      const headCy = headR + 4;
      const neckY = headCy + headR;
      const armY = neckY + figureH * 0.08;
      const hipY = neckY + figureH * 0.45;
      const footY = figureH - 2;
      const armSpan = w * 0.38;
      const legSpan = w * 0.32;
      return [
        // Head (closed circle)
        `M ${wc - headR} ${headCy}`,
        `A ${headR} ${headR} 0 1 0 ${wc + headR} ${headCy}`,
        `A ${headR} ${headR} 0 1 0 ${wc - headR} ${headCy}`,
        // Body
        `M ${wc} ${neckY} L ${wc} ${hipY}`,
        // Arms (placed high, near the neck)
        `M ${wc - armSpan} ${armY} L ${wc + armSpan} ${armY}`,
        // Legs
        `M ${wc} ${hipY} L ${wc - legSpan} ${footY}`,
        `M ${wc} ${hipY} L ${wc + legSpan} ${footY}`
      ].join(" ");
    }
    case "usecase":
      return `M 0 ${cy} A ${cx} ${cy} 0 1 1 ${w} ${cy} A ${cx} ${cy} 0 1 1 0 ${cy} Z`;
    case "class":
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M 0 ${h * 0.25} L ${w} ${h * 0.25}`;
    case "package":
      const tabH = h * 0.15;
      const tabW = w * 0.4;
      return `M 0 0 L ${tabW} 0 L ${tabW} ${tabH} L ${w} ${tabH} L ${w} ${h} L 0 ${h} Z M 0 ${tabH} L ${tabW} ${tabH}`;
    // ERD
    case "entity":
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    case "weak-entity":
      const gap = 4;
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${gap} ${gap} L ${w - gap} ${gap} L ${w - gap} ${h - gap} L ${gap} ${h - gap} Z`;
    // Network
    case "server":
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${w * 0.1} ${h * 0.2} L ${w * 0.9} ${h * 0.2} M ${w * 0.1} ${h * 0.5} L ${w * 0.9} ${h * 0.5} M ${w * 0.1} ${h * 0.8} L ${w * 0.9} ${h * 0.8}`;
    case "cube":
      const dCube = w * 0.25;
      return `M 0 ${dCube} L ${w - dCube} ${dCube} L ${w - dCube} ${h} L 0 ${h} Z M 0 ${dCube} L ${dCube} 0 L ${w} 0 L ${w} ${h - dCube} L ${w - dCube} ${h} M ${w - dCube} ${dCube} L ${w} 0`;
    default:
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }
}
export {
  getShapePath
};
