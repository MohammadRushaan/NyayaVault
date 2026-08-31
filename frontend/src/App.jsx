import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Lock,
  FileText,
  Database,
  CheckCircle2,
  History,
  AlertTriangle,
  RefreshCw,
  Camera,
  Crop,
  Check,
  X,
  Eye,
  Sparkles,
  SplitSquareVertical,
  Download,
  Binary
} from "lucide-react";
import axios from "axios";

/* global cv */

const SAMPLE_BILINGUAL_FIR = `प्रथम सूचना रिपोर्ट (FIRST INFORMATION REPORT)
(धारा 154 दं.प्र.सं. / Section 173 BNSS)
1. थाना (Police Station): साइबर क्राइम सेल, नई दिल्ली | वर्ष: 2026
2. प्रथम सूचना रिपोर्ट सं. (FIR No.): FIR-2026-DEL-0891 | दिनांक: 31-08-2026
3. संबंधित धाराएं (Acts & Sections): Section 318(4) BNS (Cheating), Section 66 IT Act

4. प्रार्थी / शिकायतकर्ता (Complainant Details):
   - नाम (Name): राजेश कुमार शर्मा (Rajesh Kumar Sharma)
   - आधार संख्या (Aadhaar No): 8492 4810 9923
   - मोबाइल नंबर (Phone): +91 98371 44520
   - पता (Address): मकान नं. 14, सिविल लाइन्स, नई दिल्ली

5. अभियुक्त विवरण (Accused Details):
   - नाम (Name): अज्ञात साइबर फ्रॉड गिरोह (Unknown Threat Actors)
   - फोन (Contact): +91 88291 00214
   - प्रयुक्त पैन कार्ड (Forged PAN): ABCDE1234F

6. घटना का संक्षिप्त विवरण (Narrative):
   प्रार्थी ने अवगत कराया कि अज्ञात व्यक्ति ने बैंक अधिकारी बनकर ओटीपी प्राप्त किया तथा प्रार्थी के बैंक खाते से ₹1,50,000 की राशि अवैध रूप से स्थानांतरित कर ली।

7. जप्त प्रदर्श (Seized Electronic Evidence): 
   1x Dell Laptop Hard Drive (S/N: HDD-9920-DEL)`;

export default function App() {
  const [tab, setTab] = useState("ingest");
  const [inputMode, setInputMode] = useState("file");

  const [caseNo, setCaseNo] = useState("FIR-2026-DEL-0891");
  const [docType, setDocType] = useState("First Information Report (FIR)");
  const [officerId, setOfficerId] = useState("IO_OFFICER_4401");
  const [role, setRole] = useState("Investigating Officer");

  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawText, setRawText] = useState(SAMPLE_BILINGUAL_FIR);

  // Ingestion Output State
  const [ingestOutput, setIngestOutput] = useState(null);
  const [originalGenesisImageDataUrl, setOriginalGenesisImageDataUrl] = useState(null);

  // Ledger History
  const [ledgerHistory, setLedgerHistory] = useState([]);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState(null);

  // Court Verifier State
  const [benchmarkHash, setBenchmarkHash] = useState("");
  const [courtBenchmarkImageDataUrl, setCourtBenchmarkImageDataUrl] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyUploadedImageDataUrl, setVerifyUploadedImageDataUrl] = useState(null);
  const [verifyText, setVerifyText] = useState("");
  const [verifyStatus, setVerifyStatus] = useState(null);

  // Camera & Warping Modal State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStage, setCameraStage] = useState("live");
  const videoRef = useRef(null);
  const rawCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const warpedCanvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [manualCorners, setManualCorners] = useState([
    { x: 0.15, y: 0.15 },
    { x: 0.85, y: 0.15 },
    { x: 0.85, y: 0.85 },
    { x: 0.15, y: 0.85 }
  ]);
  const [activeCornerIdx, setActiveCornerIdx] = useState(null);
  const [capturedSnapshotUrl, setCapturedSnapshotUrl] = useState(null);
  const [warpedResultUrl, setWarpedResultUrl] = useState(null);
  const [warpedBlobFile, setWarpedBlobFile] = useState(null);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/ledger/history");
      setLedgerHistory(res.data);
      if (res.data.length > 0 && !selectedLedgerItem) {
        setSelectedLedgerItem(res.data[0]);
      }
    } catch (err) {
      console.error("Ledger error:", err);
    }
  };

  // Stabilized OpenCV Edge Detection Loop
  const smoothedCornersRef = useRef(null);

  useEffect(() => {
    let animId;
    let lastProcessedTime = 0;

    const processFrame = (currentTime) => {
      if (
        cameraOpen &&
        cameraStage === "live" &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        typeof cv !== "undefined" &&
        cv.Mat
      ) {
        if (currentTime - lastProcessedTime >= 60) {
          lastProcessedTime = currentTime;

          const video = videoRef.current;
          const rawCanvas = rawCanvasRef.current;
          const overlayCanvas = overlayCanvasRef.current;

          if (rawCanvas && overlayCanvas && video.videoWidth > 0) {
            const w = 640;
            const h = Math.round((video.videoHeight / video.videoWidth) * 640) || 360;

            if (rawCanvas.width !== w) rawCanvas.width = w;
            if (rawCanvas.height !== h) rawCanvas.height = h;
            if (overlayCanvas.width !== w) overlayCanvas.width = w;
            if (overlayCanvas.height !== h) overlayCanvas.height = h;

            const ctx = rawCanvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, w, h);

            try {
              let src = cv.imread(rawCanvas);
              let gray = new cv.Mat();
              let blurred = new cv.Mat();
              let thresh = new cv.Mat();
              let contours = new cv.MatVector();
              let hierarchy = new cv.Mat();

              cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
              cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
              cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

              cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

              let maxArea = 0;
              let rawFound = null;
              const minArea = w * h * 0.12;

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
                    const pts = [
                      { x: approx.data32S[0], y: approx.data32S[1] },
                      { x: approx.data32S[2], y: approx.data32S[3] },
                      { x: approx.data32S[4], y: approx.data32S[5] },
                      { x: approx.data32S[6], y: approx.data32S[7] }
                    ];
                    pts.sort((a, b) => a.x + a.y - (b.x + b.y));
                    const tl = pts[0];
                    const br = pts[3];
                    const rem = [pts[1], pts[2]].sort((a, b) => a.y - a.x - (b.y - b.x));
                    rawFound = [tl, rem[0], br, rem[1]];
                  }
                  hull.delete();
                  approx.delete();
                }
                c.delete();
              }

              const oCtx = overlayCanvas.getContext("2d");
              oCtx.clearRect(0, 0, w, h);

              if (rawFound) {
                const alpha = 0.35;
                if (!smoothedCornersRef.current) {
                  smoothedCornersRef.current = rawFound;
                } else {
                  smoothedCornersRef.current = smoothedCornersRef.current.map((prev, idx) => ({
                    x: Math.round(prev.x * (1 - alpha) + rawFound[idx].x * alpha),
                    y: Math.round(prev.y * (1 - alpha) + rawFound[idx].y * alpha)
                  }));
                }

                const s = smoothedCornersRef.current;
                oCtx.beginPath();
                oCtx.moveTo(s[0].x, s[0].y);
                oCtx.lineTo(s[1].x, s[1].y);
                oCtx.lineTo(s[2].x, s[2].y);
                oCtx.lineTo(s[3].x, s[3].y);
                oCtx.closePath();
                oCtx.lineWidth = 3;
                oCtx.strokeStyle = "#10b981";
                oCtx.fillStyle = "rgba(16, 185, 129, 0.22)";
                oCtx.fill();
                oCtx.stroke();

                s.forEach((pt) => {
                  oCtx.beginPath();
                  oCtx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
                  oCtx.fillStyle = "#34d399";
                  oCtx.fill();
                  oCtx.lineWidth = 2;
                  oCtx.strokeStyle = "#ffffff";
                  oCtx.stroke();
                });
              } else {
                smoothedCornersRef.current = null;
              }

              src.delete();
              gray.delete();
              blurred.delete();
              thresh.delete();
              contours.delete();
              hierarchy.delete();
            } catch (e) {}
          }
        }
      }
      animId = requestAnimationFrame(processFrame);
    };

    if (cameraOpen && cameraStage === "live") {
      animId = requestAnimationFrame(processFrame);
    }
    return () => {
      cancelAnimationFrame(animId);
      smoothedCornersRef.current = null;
    };
  }, [cameraOpen, cameraStage]);

  // Camera Management
  const openLiveCamera = async () => {
    setCameraOpen(true);
    setCameraStage("live");
    setWarpedResultUrl(null);
    setWarpedBlobFile(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      alert("Camera access denied or unavailable.");
      setCameraOpen(false);
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  const executeSnapFrame = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = v.videoWidth || 1280;
    snapCanvas.height = v.videoHeight || 720;
    const ctx = snapCanvas.getContext("2d");
    ctx.drawImage(v, 0, 0, snapCanvas.width, snapCanvas.height);

    const dataUrl = snapCanvas.toDataURL("image/png");
    setCapturedSnapshotUrl(dataUrl);

    setManualCorners([
      { x: 0.12, y: 0.12 },
      { x: 0.88, y: 0.12 },
      { x: 0.88, y: 0.88 },
      { x: 0.12, y: 0.88 }
    ]);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraStage("adjust");
  };

  const executePerspectiveWarp = () => {
    if (!capturedSnapshotUrl) return;

    const img = new Image();
    img.onload = () => {
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;
      const sCtx = srcCanvas.getContext("2d");
      sCtx.drawImage(img, 0, 0);

      const [c0, c1, c2, c3] = manualCorners.map((c) => ({
        x: Math.round(c.x * img.width),
        y: Math.round(c.y * img.height)
      }));

      const widthA = Math.hypot(c2.x - c3.x, c2.y - c3.y);
      const widthB = Math.hypot(c1.x - c0.x, c1.y - c0.y);
      const targetW = Math.max(300, Math.round(Math.max(widthA, widthB)));

      const heightA = Math.hypot(c1.x - c2.x, c1.y - c2.y);
      const heightB = Math.hypot(c0.x - c3.x, c0.y - c3.y);
      const targetH = Math.max(300, Math.round(Math.max(heightA, heightB)));

      const dstCanvas = warpedCanvasRef.current || document.createElement("canvas");
      dstCanvas.width = targetW;
      dstCanvas.height = targetH;

      let warpedDone = false;

      if (typeof cv !== "undefined" && cv.Mat) {
        try {
          let src = cv.imread(srcCanvas);
          let dst = new cv.Mat();
          let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [c0.x, c0.y, c1.x, c1.y, c2.x, c2.y, c3.x, c3.y]);
          let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, targetW - 1, 0, targetW - 1, targetH - 1, 0, targetH - 1]);

          let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
          cv.warpPerspective(src, dst, M, new cv.Size(targetW, targetH), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
          cv.imshow(dstCanvas, dst);

          src.delete();
          dst.delete();
          srcCoords.delete();
          dstCoords.delete();
          M.delete();
          warpedDone = true;
        } catch (e) {}
      }

      if (!warpedDone) {
        const minX = Math.min(c0.x, c1.x, c2.x, c3.x);
        const maxX = Math.max(c0.x, c1.x, c2.x, c3.x);
        const minY = Math.min(c0.y, c1.y, c2.y, c3.y);
        const maxY = Math.max(c0.y, c1.y, c2.y, c3.y);
        const cropW = Math.max(100, maxX - minX);
        const cropH = Math.max(100, maxY - minY);
        dstCanvas.width = cropW;
        dstCanvas.height = cropH;
        const dCtx = dstCanvas.getContext("2d");
        dCtx.drawImage(srcCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      }

      const outUrl = dstCanvas.toDataURL("image/png");
      setWarpedResultUrl(outUrl);

      dstCanvas.toBlob((blob) => {
        const file = new File([blob], `scanned_warped_${Date.now()}.png`, { type: "image/png" });
        setWarpedBlobFile(file);
        setCameraStage("warped");
      }, "image/png", 0.95);
    };
    img.src = capturedSnapshotUrl;
  };

  const downloadWarpedImage = () => {
    if (!warpedResultUrl) return;
    const a = document.createElement("a");
    a.href = warpedResultUrl;
    a.download = `evidence_${caseNo}_${Date.now()}.png`;
    a.click();
  };

  const confirmWarpedScan = () => {
    if (warpedBlobFile) {
      setUploadedFile(warpedBlobFile);
      setOriginalGenesisImageDataUrl(warpedResultUrl);
      setCourtBenchmarkImageDataUrl(warpedResultUrl);
      setInputMode("file");
      closeCamera();
    }
  };

  // Ingest Document
  const submitIngestion = async (e) => {
    e.preventDefault();
    if (inputMode === "file" && !uploadedFile) {
      return alert("Select or scan a document file first.");
    }

    const data = new FormData();
    data.append("case_number", caseNo);
    data.append("doc_type", docType);
    data.append("officer_id", officerId);
    data.append("actor_role", role);

    if (inputMode === "file" && uploadedFile) {
      data.append("file", uploadedFile);
    } else {
      data.append("text_content", rawText);
    }

    try {
      const res = await axios.post("http://localhost:8000/api/documents/ingest", data);
      setIngestOutput(res.data);
      setBenchmarkHash(res.data.sha256_hash);
      setVerifyText(res.data.raw_text);

      if (inputMode === "file" && uploadedFile && uploadedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setOriginalGenesisImageDataUrl(ev.target.result);
          setCourtBenchmarkImageDataUrl(ev.target.result);
        };
        reader.readAsDataURL(uploadedFile);
      }

      fetchLedger();
    } catch (err) {
      alert("Ingestion error: " + (err.response?.data?.detail || err.message));
    }
  };

  // Courtroom Verification Run
  const executeVerification = async () => {
    const data = new FormData();
    data.append("expected_hash", benchmarkHash);

    if (verifyFile) {
      data.append("file", verifyFile);
    } else {
      data.append("text_content", verifyText);
    }

    try {
      const res = await axios.post("http://localhost:8000/api/documents/verify", data);
      setVerifyStatus(res.data);
    } catch (err) {
      alert("Verification error: " + err.message);
    }
  };

  // Simulate Tampering
  const simulateTamper = () => {
    const altered = verifyText.replace("₹1,50,000", "₹15,00,000 (FRAUD AMOUNT ALTERED)");
    setVerifyText(altered);
    setVerifyFile(null);

    const data = new FormData();
    data.append("expected_hash", benchmarkHash);
    data.append("text_content", altered);

    axios.post("http://localhost:8000/api/documents/verify", data).then((res) => {
      setVerifyStatus(res.data);
    });
  };

  const loadLedgerItemInVerifier = (item) => {
    setBenchmarkHash(item.sha256_hash);
    setVerifyText(item.raw_text);
    setVerifyFile(null);
    setVerifyStatus(null);
    setTab("court");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* OpenCV Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 relative flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {cameraStage === "live" && "OpenCV Live Document Scanner"}
                {cameraStage === "adjust" && "Draggable Corner Alignment"}
                {cameraStage === "warped" && "OpenCV Perspective-Warped Output"}
              </h3>
              <button onClick={closeCamera} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <canvas ref={rawCanvasRef} className="hidden" />
            <canvas ref={warpedCanvasRef} className="hidden" />

            <div
              className="relative aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 select-none touch-none flex items-center justify-center"
              onPointerMove={(e) => {
                if (activeCornerIdx === null || cameraStage !== "adjust") return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                setManualCorners((prev) => {
                  const u = [...prev];
                  u[activeCornerIdx] = { x, y };
                  return u;
                });
              }}
              onPointerUp={() => setActiveCornerIdx(null)}
              onPointerLeave={() => setActiveCornerIdx(null)}
            >
              {cameraStage === "live" ? (
                <div className="relative w-full h-full">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                  <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-1.5 pointer-events-none">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] font-mono text-slate-300">Align Document Inside Viewfinder</span>
                  </div>
                </div>
              ) : cameraStage === "adjust" ? (
                <div className="relative w-full h-full">
                  <img src={capturedSnapshotUrl} alt="Snapshot" className="w-full h-full object-cover pointer-events-none" />
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <polygon
                      points={manualCorners.map((c) => `${c.x * 100}%,${c.y * 100}%`).join(" ")}
                      className="fill-emerald-500/20 stroke-emerald-400 stroke-2"
                    />
                  </svg>
                  {manualCorners.map((c, idx) => (
                    <div
                      key={idx}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setActiveCornerIdx(idx);
                      }}
                      style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-400 border-2 border-white shadow-xl cursor-grab active:cursor-grabbing z-20 flex items-center justify-center text-[10px] font-bold text-slate-950"
                    >
                      {idx + 1}
                    </div>
                  ))}
                </div>
              ) : (
                <img src={warpedResultUrl} alt="Warped Scan" className="max-w-full max-h-full object-contain p-2" />
              )}
            </div>

            <div className="flex justify-between items-center mt-4">
              {cameraStage === "live" && (
                <>
                  <button type="button" onClick={closeCamera} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeSnapFrame}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
                  >
                    <Camera className="h-4 w-4" /> Snap Frame
                  </button>
                </>
              )}

              {cameraStage === "adjust" && (
                <>
                  <button type="button" onClick={openLiveCamera} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={executePerspectiveWarp}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
                  >
                    <Crop className="h-4 w-4" /> Apply Perspective Warp
                  </button>
                </>
              )}

              {cameraStage === "warped" && (
                <div className="flex justify-between w-full items-center">
                  <button
                    type="button"
                    onClick={downloadWarpedImage}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-cyan-500/30"
                  >
                    <Download className="h-4 w-4" /> Download Image (.png)
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCameraStage("adjust")} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">
                      Re-adjust
                    </button>
                    <button
                      type="button"
                      onClick={confirmWarpedScan}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
                    >
                      <Check className="h-4 w-4" /> Use Scan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* App Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-8 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="h-8 w-8 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              NyayaVault <span className="text-xs bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-mono">Section 65B BSA Certified</span>
            </h1>
            <p className="text-xs text-slate-400">Zero-Trust Evidence Ingestion, Bilingual PII Scrubbing & Merkle Block Ledger</p>
          </div>
        </div>
        <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
          <button onClick={() => setTab("ingest")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${tab === "ingest" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>1. INGESTION & OCR</button>
          <button onClick={() => setTab("custody")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${tab === "custody" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>2. LEDGER & 65B CERTIFICATE</button>
          <button onClick={() => setTab("court")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${tab === "court" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>3. COURT VERIFIER</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* Tab 1: Ingestion & OCR */}
        {tab === "ingest" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold flex items-center space-x-2 text-slate-200 uppercase tracking-wider">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span>Evidence Ingestion Terminal</span>
                </h2>
                <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setInputMode("file")}
                    className={`px-3 py-1 rounded-md font-bold transition ${inputMode === "file" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    Photo / File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("text")}
                    className={`px-3 py-1 rounded-md font-bold transition ${inputMode === "text" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    Direct Text Entry
                  </button>
                </div>
              </div>

              <form onSubmit={submitIngestion} className="space-y-4 text-xs flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-mono">CASE / FIR NUMBER</label>
                    <input type="text" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 mt-1 font-mono text-slate-200 outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-mono">CLASSIFICATION</label>
                    <input type="text" value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 mt-1 text-slate-200 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-mono">INVESTIGATING OFFICER</label>
                    <input type="text" value={officerId} onChange={(e) => setOfficerId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 mt-1 font-mono text-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-mono">DESIGNATION</label>
                    <input type="text" value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 mt-1 text-slate-200 outline-none" />
                  </div>
                </div>

                {inputMode === "file" ? (
                  <div className="space-y-3 flex-1 flex flex-col justify-center border-2 border-dashed border-slate-800 rounded-xl p-4 bg-slate-950/60">
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={openLiveCamera}
                        className="px-4 py-2.5 bg-emerald-950 border border-emerald-500/40 hover:bg-emerald-900/60 text-emerald-300 font-bold rounded-xl flex items-center gap-2 transition"
                      >
                        <Camera className="h-4 w-4" /> Live Camera Scanner & Perspective Warp
                      </button>
                    </div>
                    <div className="text-center text-slate-500 text-[11px]">— OR CHOOSE EVIDENCE FILE FROM DISK —</div>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setUploadedFile(file);
                        if (file && file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setOriginalGenesisImageDataUrl(ev.target.result);
                            setCourtBenchmarkImageDataUrl(ev.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-emerald-600 file:text-white text-xs"
                    />
                    {uploadedFile && (
                      <p className="text-emerald-400 text-center text-xs font-mono">
                        Selected: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-400 font-mono">BILINGUAL FIR TEXT</label>
                      <button
                        type="button"
                        onClick={() => setRawText(SAMPLE_BILINGUAL_FIR)}
                        className="text-emerald-400 text-[11px] font-mono hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Load Sample FIR
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500 leading-relaxed"
                    />
                  </div>
                )}

                <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" /> Run OCR, Strip PII & Commit Encrypted Block
                </button>
              </form>
            </div>

            {/* Ingestion Telemetry & Redaction Panel */}
            <div className="space-y-4">
              {ingestOutput ? (
                <>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 font-mono text-xs shadow-xl">
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Cryptographic Telemetry & Physical Disk Link
                    </h3>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">DISK STORAGE (AES-256-GCM CIPHERTEXT):</span>
                      <span className="text-emerald-300 break-all font-mono">{ingestOutput.disk_storage_path}</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">EVIDENTIARY SHA-256 HASH DIGEST:</span>
                      <span className="text-cyan-400 break-all font-mono">{ingestOutput.sha256_hash}</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-purple-400 block text-[10px] font-bold uppercase">Malkhana QR Tag</span>
                        <span className="text-slate-400 text-[11px]">Property seal & physical case anchor</span>
                      </div>
                      <img src={ingestOutput.malkhana_qr} alt="Malkhana QR" className="h-16 w-16 bg-white p-1 rounded-lg border" />
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow-xl">
                    <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5 uppercase font-mono">
                      <FileText className="h-4 w-4" /> Extracted & Redacted PII (Section 72 BNS Safe)
                    </span>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs text-slate-300 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {ingestOutput.redacted_preview}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
                  <Database className="h-12 w-12 text-slate-700" />
                  <p className="text-sm font-semibold text-slate-400">No Document Ingested Yet</p>
                  <p className="text-xs max-w-sm">Capture a document or submit text to execute local OCR, strip PII identities, and commit an encrypted block to disk.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Ledger & 65B Certificate */}
        {tab === "custody" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-emerald-400" /> Immutable Chain ({ledgerHistory.length} Blocks)
                </h2>
                <button onClick={fetchLedger} className="text-slate-400 hover:text-white"><RefreshCw className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {ledgerHistory.map((item) => (
                  <div
                    key={item.doc_id}
                    onClick={() => setSelectedLedgerItem(item)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${selectedLedgerItem?.doc_id === item.doc_id ? "bg-emerald-950/40 border-emerald-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"}`}
                  >
                    <div className="flex justify-between font-mono font-bold text-emerald-400">
                      <span>#{item.id} {item.case_number}</span>
                      <span className="text-[10px] text-slate-500">{new Date(item.timestamp * 1000).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">{item.doc_type}</p>
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-1">Hash: {item.sha256_hash}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {selectedLedgerItem ? (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <Award className="h-4 w-4" />
                      <span>{selectedLedgerItem.bsa_certificate.statute}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedLedgerItem.bsa_certificate.certification_statement}</p>
                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                      <p>Certifying Officer: {selectedLedgerItem.bsa_certificate.certifying_officer}</p>
                      <p>Timestamp: {new Date(selectedLedgerItem.bsa_certificate.timestamp * 1000).toLocaleString()}</p>
                      <p className="col-span-2 break-all text-emerald-400">Digital Signature (SHA-384): {selectedLedgerItem.bsa_certificate.digital_signature}</p>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs font-mono">
                    <p className="text-slate-400">Block Hash: <span className="text-purple-400 break-all">{selectedLedgerItem.block_hash}</span></p>
                    <p className="text-slate-400">Previous Hash: <span className="text-slate-500 break-all">{selectedLedgerItem.prev_hash}</span></p>
                    <p className="text-slate-400">Local Encrypted Path: <span className="text-cyan-400 break-all">{selectedLedgerItem.encrypted_file_path}</span></p>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadLedgerItemInVerifier(selectedLedgerItem)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Eye className="h-4 w-4" /> Load Block into Court Verifier
                  </button>
                </div>
              ) : (
                <div className="h-full bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center p-8 text-slate-500">
                  Select a block on the left to inspect its chain of custody.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Courtroom Verifier with Dual Verification Engine */}
        {tab === "court" && (
          <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <SplitSquareVertical className="h-5 w-5 text-emerald-400" />
                  Court Evidentiary Verification & Visual Comparison Terminal
                </h2>
                <p className="text-xs text-slate-400">Section 65B BSA Binary Cryptographic Audit & Visual Comparison</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (ledgerHistory.length > 0) loadLedgerItemInVerifier(ledgerHistory[0]);
                }}
                className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Load Latest Ledger Record
              </button>
            </div>

            {/* Side-by-Side Visual Comparison Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold font-mono text-cyan-400 uppercase flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> 1. Registered Genesis Sealed Artifact
                  </span>
                  <span className="text-[10px] bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded font-mono">
                    On-Chain Benchmark
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-black/50 rounded-lg p-2 min-h-[200px] max-h-[240px] overflow-hidden border border-slate-900">
                  {courtBenchmarkImageDataUrl ? (
                    <img src={courtBenchmarkImageDataUrl} alt="Original Genesis Artifact" className="max-h-52 object-contain rounded" />
                  ) : (
                    <div className="text-center text-slate-600 text-xs font-mono">
                      No sealed photo artifact registered
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold font-mono text-amber-400 uppercase flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> 2. Evidence Presented in Court
                  </span>
                  <span className="text-[10px] bg-amber-950 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded font-mono">
                    Under Inspection
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-black/50 rounded-lg p-2 min-h-[200px] max-h-[240px] overflow-hidden border border-slate-900">
                  {verifyUploadedImageDataUrl ? (
                    <img src={verifyUploadedImageDataUrl} alt="Uploaded File For Audit" className="max-h-52 object-contain rounded" />
                  ) : courtBenchmarkImageDataUrl && !verifyFile ? (
                    <img src={courtBenchmarkImageDataUrl} alt="Active Benchmark Artifact" className="max-h-52 object-contain rounded opacity-80" />
                  ) : (
                    <div className="text-center text-slate-600 text-xs font-mono">
                      Upload physical file below to inspect
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Inputs */}
            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400">REGISTERED ON-CHAIN BENCHMARK SHA-256 HASH</label>
                <input
                  type="text"
                  value={benchmarkHash}
                  onChange={(e) => setBenchmarkHash(e.target.value)}
                  placeholder="Paste on-chain SHA-256 hash"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 mt-1 text-cyan-400 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">UPLOAD PHYSICAL FILE PRESENTED IN COURT</label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setVerifyFile(file);
                    if (file && file.type.startsWith("image/")) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setVerifyUploadedImageDataUrl(ev.target.result);
                      reader.readAsDataURL(file);
                    } else {
                      setVerifyUploadedImageDataUrl(null);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-emerald-600 file:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400">— OR TEST EXTRACTED TEXT CONTENT DIRECTLY —</label>
                  <button
                    type="button"
                    onClick={simulateTamper}
                    className="text-rose-400 hover:text-rose-300 font-bold text-[11px] flex items-center gap-1 bg-rose-950/40 border border-rose-500/30 px-2.5 py-1 rounded-md"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> 1-Click Simulate Fraud/Tampering
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={verifyText}
                  onChange={(e) => setVerifyText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-emerald-500 leading-relaxed font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={executeVerification}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition"
                >
                  Verify Authenticity Against Blockchain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyText(SAMPLE_BILINGUAL_FIR);
                    setVerifyFile(null);
                    setVerifyUploadedImageDataUrl(null);
                    setVerifyStatus(null);
                  }}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Reset Form
                </button>
              </div>
            </div>

            {/* Verification Verdict Badge */}
            {verifyStatus && (
              <div
                className={`p-5 rounded-2xl border flex items-start space-x-4 ${
                  verifyStatus.is_intact
                    ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/60 text-rose-300"
                }`}
              >
                {verifyStatus.is_intact ? (
                  <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-400" />
                ) : (
                  <ShieldAlert className="h-7 w-7 shrink-0 text-rose-400 animate-pulse" />
                )}
                <div className="space-y-1 font-mono">
                  <h3 className="font-bold text-sm">
                    {verifyStatus.is_intact
                      ? "INTEGRITY VERIFIED: ORIGINAL UNMODIFIED RECORD"
                      : "CRITICAL SECURITY ALERT: EVIDENCE TAMPERING DETECTED"}
                  </h3>
                  <p className="text-xs opacity-90 font-sans">
                    {verifyStatus.is_intact
                      ? "The computed file hash matches the on-chain genesis block hash sealed under Section 65B BSA."
                      : "The calculated content hash does not match the sealed on-chain digest. File rejected by evidentiary rules."}
                  </p>
                  <p className="text-[10px] break-all pt-1 opacity-75">
                    Computed Hash: {verifyStatus.computed_hash}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}