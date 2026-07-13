async function exportPNG(svgElement, state, filename = "diagram.png") {
  const { svg: preparedSvg, width, height } = prepareSvgForExport(svgElement, state);
  await exportRaster(preparedSvg, width, height, filename, "image/png", null);
}
async function exportJPG(svgElement, state, filename = "diagram.jpg") {
  const { svg: preparedSvg, width, height } = prepareSvgForExport(svgElement, state);
  await exportRaster(preparedSvg, width, height, filename, "image/jpeg", "#ffffff");
}
async function exportWebP(svgElement, state, filename = "diagram.webp") {
  const { svg: preparedSvg, width, height } = prepareSvgForExport(svgElement, state);
  await exportRaster(preparedSvg, width, height, filename, "image/webp", null);
}
function exportSVG(svgElement, state, filename = "diagram.svg") {
  const { svg: preparedSvg } = prepareSvgForExport(svgElement, state);
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(preparedSvg);
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename);
}

// Capture rich style data from the LIVE original DOM before cloning.
// foreignObject content (HTML divs styled via React) does NOT survive a
// canvas-based raster export reliably, so we capture explicit values that
// we can re-apply as inline attributes on a plain SVG <text> element.
function captureLabelData(originalSvg) {
  const labels = [];
  originalSvg.querySelectorAll("foreignObject").forEach((fo) => {
    // Inline edit textarea — we don't want to render this in the export
    if (fo.querySelector("textarea")) {
      labels.push(null);
      return;
    }
    // Connector handles foreignObject — identified by its `opacity-0`
    // hover-only container.
    const hoverHandles = Array.from(fo.querySelectorAll("div")).find((d) => {
      const cn = typeof d.className === "string" ? d.className : "";
      return cn.indexOf("opacity-0") >= 0 && cn.indexOf("relative") >= 0;
    });
    if (hoverHandles) {
      labels.push(null);
      return;
    }
    // Shape label — the flex/center container holding the label text
    const labelDiv = Array.from(fo.querySelectorAll("div")).find((d) => {
      const cn = typeof d.className === "string" ? d.className : "";
      return (
        cn.indexOf("flex") >= 0 &&
        cn.indexOf("items-center") >= 0 &&
        cn.indexOf("justify-center") >= 0
      );
    });
    if (!labelDiv) {
      labels.push(null);
      return;
    }
    const computed = window.getComputedStyle(labelDiv);
    labels.push({
      text: labelDiv.textContent || "",
      fill: computed.color || "#e2e8f0",
      fontFamily: computed.fontFamily || "sans-serif",
      fontSize: computed.fontSize || "14px",
      fontWeight: computed.fontWeight || "500",
      fontStyle: computed.fontStyle || "normal",
      textDecoration: computed.textDecoration || "none",
      x: parseFloat(fo.getAttribute("x") || "0"),
      y: parseFloat(fo.getAttribute("y") || "0"),
      width: parseFloat(fo.getAttribute("width") || "0"),
      height: parseFloat(fo.getAttribute("height") || "0"),
    });
  });
  return labels;
}

// Approximate the rendered width of a single character for word-wrap math.
// SVG <text> does NOT auto-wrap, so we manually pack words into tspans.
function estimateCharWidth(fontFamily, fontSize) {
  const px = parseFloat(fontSize) || 14;
  if (typeof fontFamily === "string" && fontFamily.toLowerCase().indexOf("mono") >= 0) {
    return px * 0.6;
  }
  return px * 0.55;
}

function wrapLabelLines(text, maxWidth, fontFamily, fontSize) {
  const charW = estimateCharWidth(fontFamily, fontSize);
  const paragraphs = (text || "").split("\n");
  const lines = [];
  paragraphs.forEach((p) => {
    if (!p.trim()) {
      lines.push("");
      return;
    }
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      // Word is wider than the whole box — emit it on its own line rather than
      // risk an infinite loop. The browser will still render it; shape outline
      // already accommodates the inner padding.
      if (candidate.length * charW <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
  });
  return lines.length ? lines : [""];
}

function buildSvgTextFromLabel(label) {
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const cx = label.x + label.width / 2;
  const cy = label.y + label.height / 2;
  text.setAttribute("x", String(cx));
  text.setAttribute("y", String(cy));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("fill", label.fill);
  text.setAttribute("font-family", label.fontFamily);
  text.setAttribute("font-size", label.fontSize);
  text.setAttribute("font-weight", label.fontWeight);
  text.setAttribute("style", "white-space: pre;");
  if (label.fontStyle && label.fontStyle !== "normal") {
    text.setAttribute("font-style", label.fontStyle);
  }
  if (label.textDecoration && label.textDecoration !== "none") {
    text.setAttribute("text-decoration", label.textDecoration);
  }
  // The shape's foreignObject had `p-2` (8px) padding; respect it so wrapping
  // matches what the user sees on the canvas.
  const innerWidth = Math.max(20, label.width - 16);
  const lines = wrapLabelLines(label.text || "", innerWidth, label.fontFamily, label.fontSize);
  const lineCount = lines.length;
  // Shift the FIRST tspan UP by half the total block, so a multi-line label
  // stays vertically centered instead of drifting downward (line-by-line dy is
  // relative to the previous baseline).
  const firstShiftEm = lineCount > 1 ? -((lineCount - 1) * 1.2) / 2 : 0;
  lines.forEach((line, i) => {
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.setAttribute("x", String(cx));
    if (i === 0 && firstShiftEm !== 0) {
      tspan.setAttribute("dy", `${firstShiftEm}em`);
    } else if (i > 0) {
      tspan.setAttribute("dy", "1.2em");
    }
    tspan.textContent = line;
    text.appendChild(tspan);
  });
  return text;
}

function convertLabelsToText(clone, labels) {
  const clonedFOs = Array.from(clone.querySelectorAll("foreignObject"));
  clonedFOs.forEach((fo, index) => {
    const label = labels[index];
    if (!label) return;
    if (!label.text || !label.text.trim()) return;
    const svgText = buildSvgTextFromLabel(label);
    fo.parentNode.replaceChild(svgText, fo);
  });
}

function prepareSvgForExport(originalSvg, state) {
  // 1. Capture label styles from the LIVE DOM *before* cloning.
  const labelData = captureLabelData(originalSvg);

  const clone = originalSvg.cloneNode(true);

  // 2. Embed CSS so any leftover Tailwind classes on shapes/strokes still resolve.
  let cssText = "";
  for (const styleSheet of document.styleSheets) {
    try {
      for (const rule of styleSheet.cssRules) {
        cssText += rule.cssText + "\n";
      }
    } catch (e) {
      // Ignore CORS errors for external stylesheets
    }
  }
  const defs =
    clone.querySelector("defs") ||
    document.createElementNS("http://www.w3.org/2000/svg", "defs");
  if (!clone.querySelector("defs")) clone.prepend(defs);
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = cssText;
  defs.appendChild(styleEl);

  // 3. Remove UI-only elements so they don't appear in the export.
  const uiSelectors = [
    'rect[class*="fill-indigo-500/10"]',
    'path[stroke-dasharray="5,5"]',
    "rect.dashed",
    '[class*="fill-indigo-500/20"]',
    'rect[class*="cursor-nw-resize"],rect[class*="cursor-ne-resize"],rect[class*="cursor-sw-resize"],rect[class*="cursor-se-resize"]',
    'path[d="M0,0 L11,11 L4.8,11 L0,20 Z"]',
    'rect[fill="url(#canvas-grid)"]',
  ];
  uiSelectors.forEach((selector) => {
    try {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    } catch (e) {
      // selector may be unsupported in some browsers
    }
  });

  // 4. Convert shape-label foreignObjects into reliable SVG <text> elements,
  //    then drop any remaining foreignObjects (edit textareas + connector handles).
  convertLabelsToText(clone, labelData);
  clone.querySelectorAll("foreignObject").forEach((fo) => fo.remove());

  // 5. Reset pan/zoom transform — we re-derive a tight viewBox below.
  const contentGroup = clone.querySelector("g[transform]");
  if (contentGroup) {
    contentGroup.setAttribute("transform", "");
  }

  // 6. Compute the tight viewBox that wraps every node (with padding).
  let x = 0;
  let y = 0;
  let w = originalSvg.clientWidth;
  let h = originalSvg.clientHeight;
  if (state && state.nodes.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const padding = 40;
    state.nodes.forEach((node) => {
      const nx = node.position.x;
      const ny = node.position.y;
      const nw = node.width || 120;
      const nh = node.height || 60;
      minX = Math.min(minX, nx);
      minY = Math.min(minY, ny);
      maxX = Math.max(maxX, nx + nw);
      maxY = Math.max(maxY, ny + nh);
    });
    if (minX !== Infinity) {
      x = minX - padding;
      y = minY - padding;
      w = maxX - minX + padding * 2;
      h = maxY - minY + padding * 2;
    }
  }
  clone.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  clone.setAttribute("width", `${w}`);
  clone.setAttribute("height", `${h}`);
  // Ensure the export rasterizer composites cleanly on top of any background.
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return { svg: clone, width: w, height: h };
}
async function exportRaster(svgElement, width, height, filename, mimeType, bgColor) {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
  const img = new Image();
  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) downloadBlob(blob, filename);
          URL.revokeObjectURL(svgUrl);
          resolve();
        },
        mimeType,
        0.95
      );
    };
    img.onerror = (e) => {
      console.error("Export failed", e);
      resolve();
    };
    img.src = svgUrl;
  });
}
function exportJSON(state, filename = "diagram.json") {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
}
function exportDSL(dslText, filename = "diagram.dsl") {
  const blob = new Blob([dslText], { type: "text/plain" });
  downloadBlob(blob, filename);
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
export {
  exportDSL,
  exportJPG,
  exportJSON,
  exportPNG,
  exportSVG,
  exportWebP
};
