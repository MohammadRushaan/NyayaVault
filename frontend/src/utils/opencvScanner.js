/* global cv */

export function isCvReady() {
  return typeof cv !== "undefined" && typeof cv.Mat !== "undefined";
}

function orderPoints(pts) {
  const points = pts.slice();
  points.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const tl = points[0];
  const br = points[3];

  const remaining = [points[1], points[2]];
  remaining.sort((a, b) => (a.y - a.x) - (b.y - b.x));
  const tr = remaining[0];
  const bl = remaining[1];

  return [tl, tr, br, bl];
}

export function detectDocumentCorners(sourceCanvas) {
  if (!isCvReady() || !sourceCanvas || sourceCanvas.width === 0) return null;

  let src = cv.imread(sourceCanvas);
  let gray = new cv.Mat();
  let blurred = new cv.Mat();
  let thresh = new cv.Mat();
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();

  try {
    // 1. Convert to Gray & Blur
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // 2. Otsu Auto-Thresholding for Bright Document Extraction
    cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    // 3. Find Contours
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let bestPoints = null;
    const minArea = sourceCanvas.width * sourceCanvas.height * 0.12;

    for (let i = 0; i < contours.size(); i++) {
      let c = contours.get(i);
      let area = cv.contourArea(c);

      if (area > minArea && area > maxArea) {
        let hull = new cv.Mat();
        cv.convexHull(c, hull, false, true);

        let peri = cv.arcLength(hull, true);
        let approx = new cv.Mat();

        for (let eps of [0.02, 0.03, 0.04, 0.06]) {
          cv.approxPolyDP(hull, approx, eps * peri, true);
          if (approx.rows === 4) break;
        }

        if (approx.rows === 4) {
          maxArea = area;
          bestPoints = [];
          for (let j = 0; j < 4; j++) {
            bestPoints.push({
              x: approx.data32S[j * 2],
              y: approx.data32S[j * 2 + 1]
            });
          }
        } else {
          // Fallback to bounding rotated rectangle
          let rect = cv.minAreaRect(hull);
          let pts = cv.RotatedRect.points(rect);
          maxArea = area;
          bestPoints = pts.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
        }

        hull.delete();
        approx.delete();
      }
      c.delete();
    }

    if (bestPoints && bestPoints.length === 4) {
      return orderPoints(bestPoints);
    }
    return null;
  } catch (e) {
    return null;
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();
  }
}

export function applyPerspectiveTransform(sourceCanvas, targetCanvas, corners) {
  if (!sourceCanvas || !targetCanvas || !corners || corners.length !== 4) return false;

  const [tl, tr, br, bl] = corners;

  // Calculate pixel bounds
  const minX = Math.max(0, Math.min(tl.x, bl.x, tr.x, br.x));
  const maxX = Math.min(sourceCanvas.width, Math.max(tl.x, bl.x, tr.x, br.x));
  const minY = Math.max(0, Math.min(tl.y, tr.y, bl.y, br.y));
  const maxY = Math.min(sourceCanvas.height, Math.max(tl.y, tr.y, bl.y, br.y));

  const cropW = Math.max(100, Math.round(maxX - minX));
  const cropH = Math.max(100, Math.round(maxY - minY));

  targetCanvas.width = cropW;
  targetCanvas.height = cropH;

  const ctx = targetCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cropW, cropH);

  // Fast GPU draw image slice
  ctx.drawImage(
    sourceCanvas,
    minX, minY, cropW, cropH,
    0, 0, cropW, cropH
  );

  return true;
}

export function isCvReady() {
  return true;
}