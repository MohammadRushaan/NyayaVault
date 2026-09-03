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
  Binary,
  UserCheck,
  HardDriveDownload,
  Activity,
  ArrowRight,
  Search,
  AlertOctagon,
  FileCheck,
  QrCode,
  ScanLine
} from "lucide-react";
import axios from "axios";

/* global cv */

const API_BASE = "https://nyayavault.onrender.com/api";

const SAMPLE_BILINGUAL_FIR = `प्रथम सूचना रिपोर्ट (FIRST INFORMATION REPORT)
(धारा 154 दं.प्र.सं. / Section 173 BNSS)
1. थाना (Police Station): साइबर क्राइम सेल, नई दिल्ली | वर्ष: 2026
2. प्रथम सूचना रिपोर्ट सं. (FIR No.): FIR-2026-DEL-0891 | दिनांक: 31-08-2026
3. संबंधित धाराएं (Acts & Sections): Section 318(4) BNS (Cheating), Section 66 IT Act

4. प्रार्थी / शिकायतकर्ता (Complainant Details):
   - नाम (Name): राजेश कुमार शर्मा (Rajesh Kumar Sharma)
   - आधार संख्या (Aadhaar No): [REDACTED_AADHAAR]
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
  // Navigation & Role State
  const [tab, setTab] = useState("command"); // 'command' | 'ingest' | 'custody' | 'court'
  const [currentOfficer, setCurrentOfficer] = useState("IO_SHARMA");
  const [officers, setOfficers] = useState([]);

  // Command Dashboard & Search State
  const [metrics, setMetrics] = useState({ total_documents: 0, active_cases: 0, security_alerts: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("All");

  // Ingestion Input State
  const [inputMode, setInputMode] = useState("file");
  const [caseNo, setCaseNo] = useState("FIR-2026-DEL-0891");
  const [docType, setDocType] = useState("First Information Report (FIR)");
  const [officerId, setOfficerId] = useState("IO_SHARMA");
  const [role, setRole] = useState("Investigating Officer");

  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawText, setRawText] = useState(SAMPLE_BILINGUAL_FIR);
  const [ingestOutput, setIngestOutput] = useState(null);
  const [originalGenesisImageDataUrl, setOriginalGenesisImageDataUrl] = useState(null);

  // Ledger & Timeline State
  const [ledgerHistory, setLedgerHistory] = useState([]);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [handoverFrom, setHandoverFrom] = useState("Station Malkhana");
  const [handoverTo, setHandoverTo] = useState("Forensic Science Lab (FSL)");
  const [handoverPurpose, setHandoverPurpose] = useState("Ballistics & Electronic Memory Extraction Analysis");
  const [isHandingOver, setIsHandingOver] = useState(false);

  // Court Verifier State
  const [benchmarkHash, setBenchmarkHash] = useState("");
  const [courtBenchmarkImageDataUrl, setCourtBenchmarkImageDataUrl] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyUploadedImageDataUrl, setVerifyUploadedImageDataUrl] = useState(null);
  const [verifyText, setVerifyText] = useState("");
  const [verifyStatus, setVerifyStatus] = useState(null);

  // Section 63 BSA Certificate Modal State
  const [certModalDocId, setCertModalDocId] = useState(null);
  const [certificateData, setCertificateData] = useState(null);
  const [isLoadingCert, setIsLoadingCert] = useState(false);

  // OpenCV Camera & Warping Modal State
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
  const smoothedCornersRef = useRef(null);

  const fetchAuthHeaders = () => ({
  "X-Officer-Id": currentOfficer || "IO_SHARMA"
});

  useEffect(() => {
    fetch(`${API_BASE}/auth/users`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOfficers(data);
      })
      .catch(() => {});
    loadDashboard();
    fetchLedger();
  }, [currentOfficer]);

  const loadDashboard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard/metrics`, { headers: fetchAuthHeaders() });
      if (res.data.metrics) setMetrics(res.data.metrics);
      if (res.data.recent_alerts) setRecentAlerts(res.data.recent_alerts);
    } catch (err) {
      console.error("Dashboard metrics error:", err);
    }
  };

  const fetchLedger = async () => {
    try {
      const res = await axios.get(`${API_BASE}/ledger/history`, { headers: fetchAuthHeaders() });
      setLedgerHistory(res.data);
      if (res.data.length > 0 && !selectedLedgerItem) {
        setSelectedLedgerItem(res.data[0]);
      }
    } catch (err) {
      console.error("Ledger history error:", err);
    }
  };

  // OpenCV Frame Processor Loop
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

  const openLiveCamera = async () => {
    setCameraOpen(true);
    setCameraStage("live");
    setWarpedResultUrl(null);
    setWarpedBlobFile(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
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

  const confirmWarpedScan = () => {
    if (warpedBlobFile) {
      setUploadedFile(warpedBlobFile);
      setOriginalGenesisImageDataUrl(warpedResultUrl);
      setCourtBenchmarkImageDataUrl(warpedResultUrl);
      setInputMode("file");
      closeCamera();
    }
  };

  const downloadMalkhanaQrTag = (qrDataUrl, docId, caseNumber) => {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `MALKHANA_QR_${caseNumber}_${docId}.png`;
    a.click();
  };

  // 1. Separate Physical QR Verification Handler
  const handleQrUploadAndVerify = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/documents/verify-qr`, formData, {
        headers: fetchAuthHeaders()
      });

      const data = res.data;
      setBenchmarkHash(data.expected_hash);
      setVerifyText(data.masked_text);
      setSelectedLedgerItem({
        doc_id: data.doc_id,
        case_number: data.case_number,
        doc_type: data.doc_type,
        sha256_hash: data.expected_hash,
        masked_text: data.masked_text
      });

      setVerifyStatus({
        is_intact: true,
        computed_hash: data.calculated_hash,
        mode: "PHYSICAL_QR_SEAL"
      });

      loadDashboard();
    } catch (err) {
      alert("QR Seal Verification Failed: " + (err.response?.data?.detail || err.message));
    }
  };

  // 2. Separate Raw File / Content Verification Handler
  const executeVerification = async () => {
    const data = new FormData();
    data.append("expected_hash", benchmarkHash);
    if (selectedLedgerItem?.doc_id) data.append("doc_id", selectedLedgerItem.doc_id);

    if (verifyFile) {
      data.append("file", verifyFile);
    } else {
      data.append("text_content", verifyText);
    }

    try {
      const res = await axios.post(`${API_BASE}/documents/verify`, data, { headers: fetchAuthHeaders() });
      setVerifyStatus({
        is_intact: res.data.integrity_verified,
        computed_hash: res.data.calculated_hash,
        mode: "EVIDENCE_CONTENT"
      });
      loadDashboard();
    } catch (err) {
      alert("Verification error: " + (err.response?.data?.detail || err.message));
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

    if (inputMode === "file" && uploadedFile) {
      data.append("file", uploadedFile);
    } else {
      data.append("text_content", rawText);
    }

    try {
      const res = await axios.post(`${API_BASE}/documents/ingest`, data, { headers: fetchAuthHeaders() });
      const qrDataUrl = `data:image/png;base64,${res.data.malkhana_qr}`;
      setIngestOutput({
        ...res.data,
        disk_storage_path: `vault_storage/${res.data.doc_id}.enc`,
        sha256_hash: res.data.sha256_digest,
        redacted_preview: res.data.masked_text,
        malkhana_qr: qrDataUrl
      });
      setBenchmarkHash(res.data.sha256_digest);
      setVerifyText(res.data.masked_text || rawText);

      if (inputMode === "file" && uploadedFile && uploadedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setOriginalGenesisImageDataUrl(ev.target.result);
          setCourtBenchmarkImageDataUrl(ev.target.result);
        };
        reader.readAsDataURL(uploadedFile);
      }

      loadDashboard();
      fetchLedger();
    } catch (err) {
      alert("Ingestion error: " + (err.response?.data?.detail || err.message));
    }
  };

  // Custody Timeline Handover
  const handleHandover = async (e) => {
    e.preventDefault();
    if (!selectedDocId) return;
    setIsHandingOver(true);
    try {
      const res = await axios.post(
        `${API_BASE}/custody/handover`,
        {
          doc_id: selectedDocId,
          from_entity: handoverFrom,
          to_entity: handoverTo,
          purpose: handoverPurpose
        },
        { headers: fetchAuthHeaders() }
      );
      if (res.status === 200) {
        loadTimeline(selectedDocId);
        loadDashboard();
      }
    } catch (err) {
      alert(`Handover rejected: ${err.response?.data?.detail || "Unauthorized role"}`);
    } finally {
      setIsHandingOver(false);
    }
  };

  const loadTimeline = async (docId) => {
    setSelectedDocId(docId);
    try {
      const res = await axios.get(`${API_BASE}/custody/${docId}/timeline`, { headers: fetchAuthHeaders() });
      setTimeline(res.data);
    } catch (err) {
      console.error("Timeline error:", err);
    }
  };

  // 1-Click Tamper Simulation
  const simulateTamper = () => {
    const altered = verifyText.replace("₹1,50,000", "₹15,00,000 (FRAUD AMOUNT ALTERED)");
    setVerifyText(altered);
    setVerifyFile(null);

    const data = new FormData();
    data.append("expected_hash", benchmarkHash);
    if (selectedLedgerItem?.doc_id) data.append("doc_id", selectedLedgerItem.doc_id);
    data.append("text_content", altered);

    axios.post(`${API_BASE}/documents/verify`, data, { headers: fetchAuthHeaders() }).then((res) => {
      setVerifyStatus({
        is_intact: res.data.integrity_verified,
        computed_hash: res.data.calculated_hash,
        mode: "EVIDENCE_CONTENT"
      });
      loadDashboard();
    });
  };

  const loadLedgerItemInVerifier = (item) => {
    setSelectedLedgerItem(item);
    setBenchmarkHash(item.sha256_hash);
    setVerifyText(item.masked_text || item.raw_text || "");
    setVerifyFile(null);
    setVerifyStatus(null);
    setTab("court");
  };

  const openBsaCertificate = async (docId) => {
    setCertModalDocId(docId);
    setIsLoadingCert(true);
    try {
      const res = await axios.get(`${API_BASE}/ledger/${docId}/bsa-certificate`, { headers: fetchAuthHeaders() });
      setCertificateData(res.data);
    } catch (err) {
      alert("Failed to fetch statutory Section 63 BSA certificate.");
    } finally {
      setIsLoadingCert(false);
    }
  };

  const triggerBackup = async () => {
    try {
      const res = await axios.post(`${API_BASE}/system/backup`, {}, { headers: fetchAuthHeaders() });
      alert(`Encrypted Backup Created Successfully!\n\nArchive: ${res.data.backup_file}\nSHA-256 Digest: ${res.data.sha256_hash}`);
    } catch (err) {
      alert(`Backup Denied: ${err.response?.data?.detail || "Requires Administrator Role"}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
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
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = warpedResultUrl;
                      a.download = `evidence_${caseNo}_${Date.now()}.png`;
                      a.click();
                    }}
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

      {/* App Header with RBAC & Backup */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-8 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="h-8 w-8 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              NyayaVault <span className="text-xs bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-mono">BSA Sec 63 Compliant</span>
            </h1>
            <p className="text-xs text-slate-400">Zero-Trust Evidence Ingestion, Bilingual PII Scrubbing & Merkle Custody Ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Active Officer:</span>
            <select
              value={currentOfficer}
              onChange={(e) => setCurrentOfficer(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-300 focus:outline-none cursor-pointer"
            >
              {officers.map((o) => (
                <option key={o.officer_id} value={o.officer_id} className="bg-slate-900 text-slate-100">
                  {o.name} ({o.role})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={triggerBackup}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 text-emerald-400 transition"
          >
            <HardDriveDownload className="w-4 h-4" /> Vault Backup
          </button>
        </div>
      </header>

      {/* Navigation Sub-Header */}
      <div className="bg-slate-900/50 border-b border-slate-800/80 px-8 py-2.5 flex justify-between items-center">
        <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
          <button onClick={() => setTab("command")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === "command" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}>
            <Activity className="w-3.5 h-3.5" /> 1. COMMAND DASHBOARD
          </button>
          <button onClick={() => setTab("ingest")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === "ingest" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}>
            <Camera className="w-3.5 h-3.5" /> 2. INGESTION & OCR
          </button>
          <button onClick={() => setTab("custody")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === "custody" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}>
            <History className="w-3.5 h-3.5" /> 3. LEDGER & CUSTODY
          </button>
          <button onClick={() => setTab("court")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === "court" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}>
            <SplitSquareVertical className="w-3.5 h-3.5" /> 4. COURT VERIFIER
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Tab 1: Senior Officer Command Dashboard */}
        {tab === "command" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Encrypted Records</p>
                <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">{metrics.total_documents}</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">AES-256-GCM Envelope Sealed</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Police Cases</p>
                <h3 className="text-3xl font-extrabold text-cyan-400 mt-2">{metrics.active_cases}</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">Under Lawful Chain Custody</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Integrity Breaches Flagged</p>
                <h3 className="text-3xl font-extrabold text-rose-400 mt-2">{metrics.security_alerts}</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">Real-Time Hash Tamper Events</p>
              </div>
            </div>

            {/* Smart Search Bar & Records Grid */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Case No, UUID, or redacted narrative..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="All">All Document Classifications</option>
                  <option value="First Information Report (FIR)">FIR</option>
                  <option value="Witness Statement">Witness Statement</option>
                  <option value="Charge Sheet">Charge Sheet</option>
                  <option value="Forensic Report">Forensic Report</option>
                  <option value="Malkhana Seizure Memo">Malkhana Seizure Memo</option>
                </select>
                <button onClick={fetchLedger} className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 text-white">
                  <RefreshCw className="w-3.5 h-3.5" /> Filter
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="pb-3 px-2">Document ID</th>
                      <th className="pb-3 px-2">Case Number</th>
                      <th className="pb-3 px-2">Classification</th>
                      <th className="pb-3 px-2">Certifying Officer</th>
                      <th className="pb-3 px-2">Genesis SHA-256 Digest</th>
                      <th className="pb-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {ledgerHistory.map((d) => (
                      <tr key={d.doc_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-2 font-mono text-emerald-400 font-medium">{d.doc_id}</td>
                        <td className="py-3 px-2 font-semibold text-slate-200">{d.case_number}</td>
                        <td className="py-3 px-2">
                          <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px] text-slate-300">
                            {d.doc_type}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-400">{d.officer_id} ({d.actor_role})</td>
                        <td className="py-3 px-2 font-mono text-slate-500">{d.sha256_hash.substring(0, 16)}...</td>
                        <td className="py-3 px-2 text-right space-x-3">
                          <button onClick={() => { setSelectedDocId(d.doc_id); loadTimeline(d.doc_id); setTab("custody"); }} className="text-cyan-400 hover:underline font-bold">
                            Timeline
                          </button>
                          <span className="text-slate-700">|</span>
                          <button onClick={() => openBsaCertificate(d.doc_id)} className="text-emerald-400 hover:underline font-bold">
                            Sec 63 Cert
                          </button>
                        </td>
                      </tr>
                    ))}
                    {ledgerHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No evidence records in ledger matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Security Breach Alerts */}
            {recentAlerts.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-500/30 p-5 rounded-2xl space-y-3 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Active Tamper Alerts & Cybersecurity Event Stream
                </h3>
                <div className="space-y-2">
                  {recentAlerts.map((a) => (
                    <div key={a.alert_id} className="p-3 bg-slate-900 border border-rose-500/20 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono text-rose-400 font-bold">{a.alert_type}</span> on Doc <span className="font-mono text-slate-200">{a.doc_id}</span>: {a.details}
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Triggered by: {a.triggered_by} • {new Date(a.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <span className="text-rose-400 font-mono text-[10px] bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Ingestion & OCR */}
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
                        className="px-4 py-2.5 bg-emerald-950 border border-emerald-500/40 hover:bg-emerald-900/60 text-emerald-300 font-bold rounded-xl flex items-center gap-2 transition shadow-lg"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-emerald-600 file:text-white text-xs cursor-pointer"
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
                  <Lock className="h-4 w-4" /> Run OCR, Strip PII (Sec 72 BNS) & Commit Encrypted Block
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
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-purple-400 block text-xs font-bold uppercase flex items-center gap-1.5">
                          <QrCode className="w-4 h-4" /> Malkhana Physical QR Seal
                        </span>
                        <p className="text-slate-400 text-[11px] font-sans">
                          Print and affix to physical evidence bag to bind physical chain of custody.
                        </p>
                        <button
                          type="button"
                          onClick={() => downloadMalkhanaQrTag(ingestOutput.malkhana_qr, ingestOutput.doc_id, ingestOutput.case_number)}
                          className="mt-1.5 px-3 py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-purple-300 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5" /> Download QR Tag (.png)
                        </button>
                      </div>
                      <img src={ingestOutput.malkhana_qr} alt="Malkhana QR" className="h-20 w-20 bg-white p-1 rounded-xl border shrink-0" />
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

        {/* Tab 3: Ledger & Custody Timeline */}
        {tab === "custody" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ledger Blocks Sidebar */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col max-h-[80vh] shadow-xl">
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
                      onClick={() => {
                        setSelectedLedgerItem(item);
                        setSelectedDocId(item.doc_id);
                        loadTimeline(item.doc_id);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                        (selectedLedgerItem?.doc_id === item.doc_id || selectedDocId === item.doc_id)
                          ? "bg-emerald-950/40 border-emerald-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex justify-between font-mono font-bold text-emerald-400">
                        <span>#{item.id} {item.case_number}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(
                          // Ensure the timestamp ends with Z so it's treated as UTC
                          item.timestamp && !item.timestamp.endsWith('Z') && !item.timestamp.includes('+')
                            ? `${item.timestamp}Z`
                            : item.timestamp
                        ).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata", // Explicit IST Timezone
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true, // Use 12-hour format (AM/PM)
                        })}
                      </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{item.doc_type}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate mt-1">Hash: {item.sha256_hash}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custody Movement & Chained Timeline */}
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
                  <h2 className="font-bold text-xs uppercase tracking-wider text-slate-100 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-400" /> Log Physical Evidence Movement
                  </h2>
                  <form onSubmit={handleHandover} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Document ID</label>
                      <input
                        type="text"
                        placeholder="e.g. DOC-XXXX..."
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transferring Entity (From)</label>
                      <input
                        type="text"
                        value={handoverFrom}
                        onChange={(e) => setHandoverFrom(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receiving Entity (To)</label>
                      <input
                        type="text"
                        value={handoverTo}
                        onChange={(e) => setHandoverTo(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custodial Purpose</label>
                      <input
                        type="text"
                        value={handoverPurpose}
                        onChange={(e) => setHandoverPurpose(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={isHandingOver}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-xs py-2.5 rounded-xl transition text-white shadow-lg disabled:opacity-50"
                      >
                        {isHandingOver ? "Signing Movement..." : "Sign & Record Custody Handover"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Chronological Timeline Feed */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-400" /> Custody Trail: <span className="font-mono text-emerald-400 font-bold">{selectedDocId || "Select a Document"}</span>
                    </h3>
                    {selectedDocId && (
                      <div className="space-x-2">
                        <button onClick={() => openBsaCertificate(selectedDocId)} className="text-xs font-bold text-emerald-400 hover:underline">
                          View Sec 63 Cert
                        </button>
                        <button onClick={() => { if (selectedLedgerItem) loadLedgerItemInVerifier(selectedLedgerItem); }} className="text-xs font-bold text-cyan-400 hover:underline">
                          Load in Verifier
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {timeline.map((evt) => (
                      <div key={evt.event_id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-emerald-400">{evt.from_entity}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-bold text-xs text-cyan-400">{evt.to_entity}</span>
                          </div>
                          <p className="text-xs text-slate-300">{evt.purpose}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Officer: {evt.authorized_by} • Verified Hash: {evt.verified_hash.substring(0, 16)}...
                          </p>
                        </div>
                        <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded font-mono shrink-0">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                    {timeline.length === 0 && (
                      <p className="text-slate-500 text-xs py-8 text-center">
                        Select a block on the left to inspect its custody lifecycle and handover milestones.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Courtroom Verifier with Dual Independent Channels */}
        {tab === "court" && (
          <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <SplitSquareVertical className="h-5 w-5 text-emerald-400" />
                  Court Evidentiary Verification & Visual Comparison Terminal
                </h2>
                <p className="text-xs text-slate-400">Section 63 BSA Cryptographic Audit & Physical QR Decoder</p>
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

            {/* CHANNEL A: Physical QR Tag Verification */}
            <div className="bg-purple-950/20 border border-purple-500/40 p-5 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-300">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider font-mono">
                      Method 1: Physical Evidence QR Tag Verification
                    </h3>
                    <p className="text-xs text-slate-400">
                      Upload or scan the physical QR tag affixed to the Malkhana evidence bag to verify on-chain registration.
                    </p>
                  </div>
                </div>
                <label className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 transition shadow-lg shrink-0">
                  <ScanLine className="w-4 h-4" /> Scan / Upload Physical QR
                  <input type="file" accept="image/*" onChange={handleQrUploadAndVerify} className="hidden" />
                </label>
              </div>
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

            {/* CHANNEL B: Digital Evidence File & Narrative Audit */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Method 2: Digital Evidence File & Narrative Audit
              </h3>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400">BENCHMARK ON-CHAIN SHA-256 HASH</label>
                  <input
                    type="text"
                    value={benchmarkHash}
                    onChange={(e) => setBenchmarkHash(e.target.value)}
                    placeholder="Genesis hash to verify against..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 mt-1 text-cyan-400 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">UPLOAD RAW EVIDENCE FILE PRESENTED IN COURT</label>
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
                    <label className="text-slate-400">— OR TEST EXTRACTED TEXT CONTENT —</label>
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
                    Verify Digital Evidence Integrity
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
                <div className="space-y-1 font-mono flex-1">
                  <h3 className="font-bold text-sm">
                    {verifyStatus.is_intact
                      ? `INTEGRITY VERIFIED: ORIGINAL UNMODIFIED RECORD (${verifyStatus.mode || "VALID"})`
                      : "CRITICAL SECURITY ALERT: EVIDENCE TAMPERING DETECTED"}
                  </h3>
                  <p className="text-xs opacity-90 font-sans">
                    {verifyStatus.is_intact
                      ? "The computed file hash matches the on-chain genesis block hash sealed under Section 63 BSA."
                      : "The calculated content hash does not match the sealed on-chain digest. File rejected by evidentiary rules."}
                  </p>
                  <p className="text-[10px] break-all pt-1 opacity-75">
                    Computed Hash: {verifyStatus.computed_hash}
                  </p>
                  {verifyStatus.is_intact && selectedLedgerItem?.doc_id && (
                    <div className="pt-2">
                      <button
                        onClick={() => openBsaCertificate(selectedLedgerItem.doc_id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg font-sans flex items-center gap-1.5"
                      >
                        <Award className="w-4 h-4" /> Generate Statutory Sec 63 BSA Certificate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: SECTION 63 BSA STATUTORY CERTIFICATE */}
      {certModalDocId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" /> Electronic Record Admissibility Certificate
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Under Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023</p>
              </div>
              <button onClick={() => setCertModalDocId(null)} className="text-slate-400 hover:text-white text-xs bg-slate-800 px-2.5 py-1 rounded-lg">
                Close
              </button>
            </div>

            {isLoadingCert ? (
              <p className="py-12 text-center text-xs text-slate-400 font-mono">Generating statutory certificate package...</p>
            ) : certificateData ? (
              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                  <div>
                    <span className="text-slate-500">Case Identifier:</span>
                    <p className="font-bold text-slate-200">{certificateData.case_number}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Document UUID:</span>
                    <p className="font-bold text-emerald-400">{certificateData.doc_id}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Classification:</span>
                    <p className="text-slate-200">{certificateData.doc_type}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Certifying Officer:</span>
                    <p className="text-slate-200">{certificateData.officer?.id} ({certificateData.officer?.role})</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <p className="text-slate-500">SHA-256 Genesis Digest:</p>
                  <p className="text-emerald-400 break-all">{certificateData.crypto_integrity?.sha256_digest}</p>
                  <p className="text-slate-500 mt-2">Chained Block Hash:</p>
                  <p className="text-slate-300 break-all">{certificateData.crypto_integrity?.block_hash}</p>
                </div>

                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700 text-slate-300 italic text-xs leading-relaxed">
                  "{certificateData.declaration}"
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-2">
                  <span>Statutory Reference: Act No. 47 of 2023</span>
                  <span>Timestamp: {certificateData.timestamp}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

