import React, { useState, useEffect, useRef } from "react";
import {
  Sun,
  Moon,
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
   - आधार संख्या (Aadhaar No): 9182 4739 1029
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
  const [handoverOfficer, setHandoverOfficer] = useState(currentOfficer || "IO_SHARMA");
  const [tab, setTab] = useState("command");
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

  // Sorting State for Table Columns
  const [sortField, setSortField] = useState("id");
  const [sortAsc, setSortAsc] = useState(false);

  // Theme State: defaults to dark or loads saved preference
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("nyayavault_theme") || "dark";
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("nyayavault_theme", next);
      return next;
    });
  };

  const isDark = theme === "dark";

  // Comprehensive Adaptive Design Tokens
  const t = {
    bgApp: isDark ? "bg-[#070c18] text-slate-100" : "bg-slate-50 text-slate-900",
    header: isDark ? "bg-[#0a1020]/95 border-slate-800" : "bg-white/95 border-slate-200 shadow-sm",
    titlePrimary: isDark ? "text-white" : "text-slate-900",
    card: isDark ? "bg-[#0d1527] border-slate-800 text-slate-100 shadow-xl" : "bg-white border-slate-200 text-slate-800 shadow-sm",
    cardInner: isDark ? "bg-[#070d1a] border-slate-800" : "bg-slate-50 border-slate-200",
    input: isDark 
      ? "bg-[#060a14] border-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500" 
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    pillNav: isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700",
    border: isDark ? "border-slate-800" : "border-slate-200",
    tableRowHover: isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-100/70",
    subnav: isDark ? "bg-slate-900/50 border-slate-800/80" : "bg-slate-100/70 border-slate-200",
    innerBox: isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
  };

  // Sync Ingestion tab fields whenever Active Officer changes
  // Sync form fields whenever the Active Officer dropdown changes
useEffect(() => {
  const selectedObj = officers.find((o) => o.officer_id === currentOfficer);
  if (selectedObj) {
    setOfficerId(selectedObj.officer_id);
    setRole(selectedObj.role);
    // Automatically update the handover officer to match the active officer's name or ID:
    setHandoverOfficer(selectedObj.name || selectedObj.officer_id);
  } else {
    setHandoverOfficer(currentOfficer);
  }
}, [currentOfficer, officers]);

  const fetchAuthHeaders = () => ({
    "X-Officer-Id": currentOfficer || "IO_SHARMA"
  });

  // Helper function to safely format dates into Indian Standard Time (IST)
  const formatIST = (timestampStr) => {
    if (!timestampStr) return "";
    try {
      const safeIso = timestampStr.endsWith("Z") || timestampStr.includes("+")
        ? timestampStr
        : `${timestampStr}Z`;
      const d = new Date(safeIso);
      return isNaN(d.getTime())
        ? timestampStr
        : d.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
          });
    } catch {
      return timestampStr;
    }
  };

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
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append("query", searchQuery.trim());
      }
      if (docTypeFilter && docTypeFilter !== "All") {
        params.append("doc_type", docTypeFilter);
      }

      const queryString = params.toString();
      const endpoint = queryString 
        ? `${API_BASE}/documents/search?${queryString}` 
        : `${API_BASE}/ledger/history`;

      const res = await axios.get(endpoint, { headers: fetchAuthHeaders() });
      setLedgerHistory(res.data);
      if (res.data.length > 0 && !selectedLedgerItem) {
        setSelectedLedgerItem(res.data[0]);
      }
    } catch (err) {
      console.error("Ledger query error:", err);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [docTypeFilter]);

  // Session Storage Form Persistence
  useEffect(() => {
    const savedText = sessionStorage.getItem("nyaya_raw_text");
    const savedCase = sessionStorage.getItem("nyaya_case_no");
    if (savedText) setRawText(savedText);
    if (savedCase) setCaseNo(savedCase);
  }, []);

  const handleTextChange = (val) => {
    setRawText(val);
    sessionStorage.setItem("nyaya_raw_text", val);
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

      const widthTop = Math.hypot(c1.x - c0.x, c1.y - c0.y);
      const widthBottom = Math.hypot(c2.x - c3.x, c2.y - c3.y);
      const targetW = Math.round(Math.max(widthTop, widthBottom));
      const targetH = Math.round(targetW * 1.414);

      const dstCanvas = warpedCanvasRef.current || document.createElement("canvas");
      dstCanvas.width = targetW;
      dstCanvas.height = targetH;

      if (typeof cv !== "undefined" && cv.Mat) {
        try {
          let src = cv.imread(srcCanvas);
          let dst = new cv.Mat();
          let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [c0.x, c0.y, c1.x, c1.y, c2.x, c2.y, c3.x, c3.y]);
          let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, targetW - 1, 0, targetW - 1, targetH - 1, 0, targetH - 1]);

          let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
          cv.warpPerspective(src, dst, M, new cv.Size(targetW, targetH), cv.INTER_CUBIC, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
          cv.imshow(dstCanvas, dst);

          src.delete();
          dst.delete();
          srcCoords.delete();
          dstCoords.delete();
          M.delete();
        } catch (e) {
          console.error("OpenCV Warp Exception: ", e);
        }
      }

      const outUrl = dstCanvas.toDataURL("image/png");
      setWarpedResultUrl(outUrl);
      dstCanvas.toBlob((blob) => {
        const file = new File([blob], `scanned_warped_${Date.now()}.png`, { type: "image/png" });
        setWarpedBlobFile(file);
        setCameraStage("warped");
      }, "image/png", 0.98);
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

  const submitIngestion = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (inputMode === "file" && !uploadedFile) {
      alert("Select or scan a document file first.");
      return;
    }

    const data = new FormData();
    data.append("case_number", caseNo.trim() || "FIR-2026-DEL-0891");
    data.append("doc_type", docType.trim() || "First Information Report (FIR)");
    // Send whatever you typed into the form:
    data.append("officer_id", officerId.trim() || currentOfficer);
    data.append("actor_role", role.trim() || "Investigating Officer");

    if (inputMode === "file" && uploadedFile) {
      data.append("file", uploadedFile);
    } else {
      data.append("text_content", rawText || "");
    }

    try {
      const res = await axios.post(`${API_BASE}/documents/ingest`, data, {
        headers: {
          // Keep the authorized session header intact
          "X-Officer-Id": currentOfficer || "IO_SHARMA"
        }
      });

      if (res && res.data) {
        const qrDataUrl = res.data.malkhana_qr
          ? (res.data.malkhana_qr.startsWith("data:") ? res.data.malkhana_qr : `data:image/png;base64,${res.data.malkhana_qr}`)
          : "";

        setIngestOutput({
          ...res.data,
          disk_storage_path: `vault_storage/${res.data.doc_id}.enc`,
          sha256_hash: res.data.sha256_digest,
          redacted_preview: res.data.masked_text,
          malkhana_qr: qrDataUrl
        });

        setBenchmarkHash(res.data.sha256_digest || "");
        setVerifyText(res.data.masked_text || rawText || "");

        if (inputMode === "file" && uploadedFile && uploadedFile.type && uploadedFile.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setOriginalGenesisImageDataUrl(ev.target.result);
            setCourtBenchmarkImageDataUrl(ev.target.result);
          };
          reader.readAsDataURL(uploadedFile);
        }

        setTimeout(() => {
          loadDashboard().catch(() => {});
          fetchLedger().catch(() => {});
        }, 300);
      }
    } catch (err) {
      console.error("Ingestion failed:", err);
      const detail = err.response?.data?.detail || err.message;
      alert(`Ingestion error: ${detail}`);
    }
  };

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
          purpose: handoverPurpose,
          authorized_by: handoverOfficer || officerId || currentOfficer  // <-- Send the custom name
        },
        { 
          headers: {
            ...fetchAuthHeaders(),
            "X-Officer-Id": handoverOfficer || officerId || currentOfficer
          } 
        }
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

  const sortedLedgerHistory = [...ledgerHistory].sort((a, b) => {
    let aVal = a[sortField] ?? "";
    let bVal = b[sortField] ?? "";
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-200 selection:bg-emerald-500 selection:text-white ${t.bgApp}`}>
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

      {/* ================= HEADER WITH THEME-AWARE STYLING ================= */}
      <header className={`border-b backdrop-blur sticky top-0 z-40 px-8 py-3.5 flex flex-wrap justify-between items-center gap-4 transition-colors duration-200 ${t.header}`}>
        <div className="flex items-center gap-3.5">
          {/* High-Contrast Medallion Seal */}
          <div className="relative flex-shrink-0 group">
            <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-md shadow-amber-950/20">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden relative">
                <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="46" r="38" stroke="#d4af37" strokeWidth="2.5" strokeDasharray="160 50" strokeLinecap="round" />
                  <circle cx="48" cy="24" r="7" fill="#0f172a" />
                  <rect x="43" y="22" width="11" height="3" rx="1.5" fill="#d4af37" />
                  <path d="M42 33 C42 33 46 31 52 31 C56 31 58 34 58 37 L61 68 H38 L42 33 Z" fill="#0f172a" />
                  <path d="M42 34 L34 45 L37 60 L43 56 Z" fill="#0f172a" />
                  <rect x="32" y="48" width="8" height="13" rx="1" fill="#0f172a" stroke="#d4af37" strokeWidth="1.2" />
                  <line x1="34" y1="48" x2="34" y2="61" stroke="#ffffff" strokeWidth="1" />
                  <path d="M56 35 L66 22 L64 16 C64 16 66 14 68 14 C70 14 71 16 71 17 L69 22 L60 38 Z" fill="#0f172a" />
                  <line x1="56" y1="26" x2="84" y2="26" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="70" cy="26" r="2" fill="#d4af37" />
                  <line x1="60" y1="26" x2="56" y2="38" stroke="#d4af37" strokeWidth="1" />
                  <line x1="60" y1="26" x2="64" y2="38" stroke="#d4af37" strokeWidth="1" />
                  <path d="M54 38 C54 42 66 42 66 38 Z" fill="#0f172a" stroke="#d4af37" strokeWidth="0.8" />
                  <line x1="80" y1="26" x2="76" y2="38" stroke="#d4af37" strokeWidth="1" />
                  <line x1="80" y1="26" x2="84" y2="38" stroke="#d4af37" strokeWidth="1" />
                  <path d="M74 38 C74 42 86 42 86 38 Z" fill="#0f172a" stroke="#d4af37" strokeWidth="0.8" />
                  <path d="M22 71 Q 50 67 78 71" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                  <text x="36" y="87" fontFamily="serif" fontSize="18" fontWeight="bold" fill="#0f172a" letterSpacing="-1">N</text>
                  <text x="51" y="87" fontFamily="serif" fontSize="18" fontWeight="bold" fill="#b48222">V</text>
                  <line x1="20" y1="82" x2="30" y2="82" stroke="#0f172a" strokeWidth="1" />
                  <line x1="68" y1="82" x2="78" y2="82" stroke="#0f172a" strokeWidth="1" />
                </svg>
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-bold tracking-tight flex items-center ${t.titlePrimary}`}>
                Nyaya<span className="text-emerald-500">Vault</span>
              </h1>
              <span className="text-[11px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                BSA Sec 63 Compliant
              </span>
            </div>
            <p className={`text-[11.5px] leading-tight mt-0.5 ${t.textMuted}`}>
              Zero-Trust Evidence Ingestion, Bilingual PII Scrubbing &amp; Merkle Custody Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl transition ${t.pillNav}`}>
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span className={`text-xs ${t.textMuted}`}>Active Officer:</span>
            <select
              value={currentOfficer}
              onChange={(e) => setCurrentOfficer(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none cursor-pointer"
            >
              {officers.map((o) => (
                <option key={o.officer_id} value={o.officer_id} className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-800"}>
                  {o.name} ({o.role})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={triggerBackup}
            className={`flex items-center gap-2 border text-xs font-bold px-3 py-1.5 rounded-xl transition ${t.pillNav} hover:border-emerald-500`}
          >
            <HardDriveDownload className="w-4 h-4 text-emerald-500" /> Vault Backup
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300"
                : "bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm"
            }`}
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Navigation Sub-Header */}
      <div className={`border-b px-8 py-2.5 flex justify-between items-center transition-colors duration-200 ${t.subnav}`}>
        <div className={`flex border p-1 rounded-xl transition-colors duration-200 ${t.innerBox}`}>
          <button onClick={() => setTab("command")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === "command" ? "bg-emerald-600 text-white shadow-md" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
            <Activity className="w-3.5 h-3.5" /> 1. COMMAND DASHBOARD
          </button>
          <button onClick={() => setTab("ingest")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === "ingest" ? "bg-emerald-600 text-white shadow-md" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
            <Camera className="w-3.5 h-3.5" /> 2. INGESTION & OCR
          </button>
          <button onClick={() => setTab("custody")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === "custody" ? "bg-emerald-600 text-white shadow-md" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
            <History className="w-3.5 h-3.5" /> 3. LEDGER & CUSTODY
          </button>
          <button onClick={() => setTab("court")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === "court" ? "bg-emerald-600 text-white shadow-md" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
            <SplitSquareVertical className="w-3.5 h-3.5" /> 4. COURT VERIFIER
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Tab 1: Senior Officer Command Dashboard */}
        {tab === "command" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className={`p-5 rounded-2xl relative overflow-hidden border transition-colors duration-200 ${t.card}`}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <p className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Total Encrypted Records</p>
                <h3 className="text-3xl font-extrabold text-emerald-500 mt-2">{metrics.total_documents}</h3>
                <p className={`text-[11px] mt-1 font-mono ${t.textMuted}`}>AES-256-GCM Envelope Sealed</p>
              </div>

              <div className={`p-5 rounded-2xl relative overflow-hidden border transition-colors duration-200 ${t.card}`}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                <p className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Active Police Cases</p>
                <h3 className="text-3xl font-extrabold text-cyan-500 mt-2">{metrics.active_cases}</h3>
                <p className={`text-[11px] mt-1 font-mono ${t.textMuted}`}>Under Lawful Chain Custody</p>
              </div>

              <div className={`p-5 rounded-2xl relative overflow-hidden border transition-colors duration-200 ${t.card}`}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
                <p className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Integrity Breaches Flagged</p>
                <h3 className="text-3xl font-extrabold text-rose-500 mt-2">{metrics.security_alerts}</h3>
                <p className={`text-[11px] mt-1 font-mono ${t.textMuted}`}>Real-Time Hash Tamper Events</p>
              </div>
            </div>

            {/* Smart Search Bar & Records Grid */}
            <div className={`p-5 rounded-2xl space-y-4 border transition-colors duration-200 ${t.card}`}>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Case No, UUID, or redacted narrative..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") fetchLedger(); }}
                    className={`w-full rounded-xl pl-10 pr-4 py-2 text-xs outline-none transition ${t.input}`}
                  />
                </div>
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className={`rounded-xl px-4 py-2 text-xs outline-none cursor-pointer transition ${t.input}`}
                >
                  <option value="All">All Document Classifications</option>
                  <option value="First Information Report (FIR)">First Information Report (FIR)</option>
                  <option value="Physical Seizure Memo (Malkhana Reg. 19)">Physical Seizure Memo (Malkhana Reg. 19)</option>
                  <option value="Witness Statement">Witness Statement</option>
                  <option value="Charge Sheet">Charge Sheet</option>
                  <option value="Forensic Report">Forensic Report</option>
                </select>
                <button 
                  type="button"
                  onClick={fetchLedger} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 text-white shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Filter
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b text-[11px] uppercase tracking-wider font-semibold select-none ${t.textMuted} ${t.border}`}>
                    <tr>
                      <th onClick={() => handleSort("doc_id")} className="pb-3 px-2 cursor-pointer hover:text-emerald-500">
                        Document ID {sortField === "doc_id" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th onClick={() => handleSort("case_number")} className="pb-3 px-2 cursor-pointer hover:text-emerald-500">
                        Case Number {sortField === "case_number" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th onClick={() => handleSort("doc_type")} className="pb-3 px-2 cursor-pointer hover:text-emerald-500">
                        Classification {sortField === "doc_type" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th onClick={() => handleSort("officer_id")} className="pb-3 px-2 cursor-pointer hover:text-emerald-500">
                        Certifying Officer {sortField === "officer_id" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="pb-3 px-2">Genesis SHA-256 Digest</th>
                      <th className="pb-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-200"}`}>
                    {sortedLedgerHistory.map((d) => (
                      <tr key={d.doc_id} className={`transition ${t.tableRowHover}`}>
                        <td className="py-3 px-2 font-mono text-emerald-500 font-medium">{d.doc_id}</td>
                        <td className={`py-3 px-2 font-semibold ${t.titlePrimary}`}>{d.case_number}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] border ${t.cardInner}`}>
                            {d.doc_type}
                          </span>
                        </td>
                        <td className={`py-3 px-2 ${t.textMuted}`}>{d.officer_id} ({d.actor_role})</td>
                        <td className="py-3 px-2 font-mono text-slate-400">{d.sha256_hash.substring(0, 16)}...</td>
                        <td className="py-3 px-2 text-right space-x-3">
                          <button onClick={() => { setSelectedDocId(d.doc_id); loadTimeline(d.doc_id); setTab("custody"); }} className="text-cyan-500 hover:underline font-bold">
                            Timeline
                          </button>
                          <span className={t.textMuted}>|</span>
                          <button onClick={() => openBsaCertificate(d.doc_id)} className="text-emerald-500 hover:underline font-bold">
                            Sec 63 Cert
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedLedgerHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className={`py-8 text-center ${t.textMuted}`}>
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
                    <div key={a.alert_id} className={`p-3 border border-rose-500/20 rounded-xl flex justify-between items-center text-xs ${t.cardInner}`}>
                      <div>
                        <span className="font-mono text-rose-500 font-bold">{a.alert_type}</span> on Doc <span className={`font-mono ${t.titlePrimary}`}>{a.doc_id}</span>: {a.details}
                        <p className={`text-[10px] mt-0.5 font-mono ${t.textMuted}`}>
                          Triggered by: {a.triggered_by} • {formatIST(a.timestamp)}
                        </p>
                      </div>
                      <span className="text-rose-500 font-mono text-[10px] bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
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
            <div className={`p-6 rounded-2xl flex flex-col space-y-4 border transition-colors duration-200 ${t.card}`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-sm font-bold flex items-center space-x-2 uppercase tracking-wider ${t.titlePrimary}`}>
                  <Lock className="h-4 w-4 text-emerald-500" />
                  <span>Evidence Ingestion Terminal</span>
                </h2>
                <div className={`flex border p-1 rounded-lg text-xs transition-colors duration-200 ${t.cardInner}`}>
                  <button
                    type="button"
                    onClick={() => setInputMode("file")}
                    className={`px-3 py-1 rounded-md font-bold transition ${inputMode === "file" ? "bg-emerald-600 text-white" : t.textMuted}`}
                  >
                    Photo / File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("text")}
                    className={`px-3 py-1 rounded-md font-bold transition ${inputMode === "text" ? "bg-emerald-600 text-white" : t.textMuted}`}
                  >
                    Direct Text Entry
                  </button>
                </div>
              </div>

              <form onSubmit={submitIngestion} className="space-y-4 text-xs flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`font-mono block mb-1 ${t.textMuted}`}>CASE / FIR NUMBER</label>
                    <input type="text" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} className={`w-full rounded-lg p-2 font-mono text-xs outline-none transition ${t.input}`} />
                  </div>
                  <div>
                    <label className={`font-mono block mb-1 ${t.textMuted}`}>CLASSIFICATION</label>
                    <input type="text" value={docType} onChange={(e) => setDocType(e.target.value)} className={`w-full rounded-lg p-2 text-xs outline-none transition ${t.input}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`font-mono block mb-1 ${t.textMuted}`}>INVESTIGATING OFFICER</label>
                    <input type="text" value={officerId} onChange={(e) => setOfficerId(e.target.value)} className={`w-full rounded-lg p-2 font-mono text-xs outline-none transition ${t.input}`} />
                  </div>
                  <div>
                    <label className={`font-mono block mb-1 ${t.textMuted}`}>DESIGNATION</label>
                    <input type="text" value={role} onChange={(e) => setRole(e.target.value)} className={`w-full rounded-lg p-2 text-xs outline-none transition ${t.input}`} />
                  </div>
                </div>

                {inputMode === "file" ? (
                  <div className={`space-y-3 flex-1 flex flex-col justify-center border-2 border-dashed rounded-xl p-4 transition-colors duration-200 ${t.border} ${t.cardInner}`}>
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={openLiveCamera}
                        className="px-4 py-2.5 bg-emerald-600/15 border border-emerald-500/40 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-300 font-bold rounded-xl flex items-center gap-2 transition shadow-sm"
                      >
                        <Camera className="h-4 w-4" /> Live Camera Scanner & Perspective Warp
                      </button>
                    </div>
                    <div className={`text-center text-[11px] ${t.textMuted}`}>— OR CHOOSE EVIDENCE FILE FROM DISK —</div>
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
                      className={`w-full border rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-emerald-600 file:text-white text-xs cursor-pointer ${t.input}`}
                    />
                    {uploadedFile && (
                      <p className="text-emerald-500 text-center text-xs font-mono">
                        Selected: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <label className={`font-mono ${t.textMuted}`}>BILINGUAL FIR TEXT</label>
                      <button
                        type="button"
                        onClick={() => handleTextChange(SAMPLE_BILINGUAL_FIR)}
                        className="text-emerald-500 text-[11px] font-mono hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Load Sample FIR
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      value={rawText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      className={`w-full flex-1 rounded-xl p-3 font-mono text-xs outline-none leading-relaxed transition ${t.input}`}
                    />
                  </div>
                )}

                {/* Change type="submit" to type="button" and attach onClick directly */}
                <button 
                  type="button" 
                  onClick={submitIngestion}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" /> Run OCR, Strip PII (Sec 72 BNS) & Commit Encrypted Block
                </button>
              </form>
            </div>

            {/* Ingestion Telemetry & Redaction Panel */}
            <div className="space-y-4">
              {ingestOutput ? (
                <>
                  <div className={`p-5 rounded-2xl space-y-3 font-mono text-xs border transition-colors duration-200 ${t.card}`}>
                    <h3 className="text-sm font-bold text-emerald-500 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Cryptographic Telemetry & Physical Disk Link
                    </h3>
                    <div className={`p-2.5 rounded-lg border ${t.cardInner}`}>
                      <span className={`block text-[10px] ${t.textMuted}`}>DISK STORAGE (AES-256-GCM CIPHERTEXT):</span>
                      <span className="text-emerald-500 break-all font-mono">{ingestOutput.disk_storage_path}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${t.cardInner}`}>
                      <span className={`block text-[10px] ${t.textMuted}`}>EVIDENTIARY SHA-256 HASH DIGEST:</span>
                      <span className="text-cyan-500 break-all font-mono">{ingestOutput.sha256_hash}</span>
                    </div>
                    <div className={`p-3 rounded-lg border flex justify-between items-center gap-4 ${t.cardInner}`}>
                      <div className="space-y-1">
                        <span className="text-purple-500 block text-xs font-bold uppercase flex items-center gap-1.5">
                          <QrCode className="w-4 h-4" /> Malkhana Physical QR Seal
                        </span>
                        <p className={`text-[11px] font-sans ${t.textMuted}`}>
                          Print and affix to physical evidence bag to bind physical chain of custody.
                        </p>
                        <button
                          type="button"
                          onClick={() => downloadMalkhanaQrTag(ingestOutput.malkhana_qr, ingestOutput.doc_id, ingestOutput.case_number)}
                          className="mt-1.5 px-3 py-1.5 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/40 text-purple-600 dark:text-purple-300 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5" /> Download QR Tag (.png)
                        </button>
                      </div>
                      <img src={ingestOutput.malkhana_qr} alt="Malkhana QR" className="h-20 w-20 bg-white p-1 rounded-xl border shrink-0" />
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl space-y-2 border transition-colors duration-200 ${t.card}`}>
                    <span className="text-amber-500 font-bold text-xs flex items-center gap-1.5 uppercase font-mono">
                      <FileText className="h-4 w-4" /> Extracted & Redacted PII (Section 72 BNS Safe)
                    </span>
                    <div className={`p-4 rounded-xl font-mono text-xs max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed border ${t.cardInner}`}>
                      {ingestOutput.redacted_preview}
                    </div>
                  </div>
                </>
              ) : (
                <div className={`h-full border rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-3 transition-colors duration-200 ${t.cardInner}`}>
                  <Database className={`h-12 w-12 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
                  <p className={`text-sm font-semibold ${t.titlePrimary}`}>No Document Ingested Yet</p>
                  <p className={`text-xs max-w-sm ${t.textMuted}`}>
                    Capture a document or submit text to execute local OCR, strip PII identities, and commit an encrypted block to disk.
                  </p>
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
              <div className={`lg:col-span-1 rounded-2xl p-4 flex flex-col max-h-[80vh] border transition-colors duration-200 ${t.card}`}>
                <div className="flex justify-between items-center mb-3">
                  <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${t.titlePrimary}`}>
                    <History className="h-4 w-4 text-emerald-500" /> Immutable Chain ({ledgerHistory.length} Blocks)
                  </h2>
                  <button onClick={fetchLedger} className={`hover:text-emerald-500 ${t.textMuted}`}><RefreshCw className="h-3.5 w-3.5" /></button>
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
                          : isDark
                            ? "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between font-mono font-bold text-emerald-500">
                        <span>#{item.id} {item.case_number}</span>
                        <span className={`text-[10px] ${t.textMuted}`}>
                          {formatIST(item.timestamp)}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 ${t.titlePrimary}`}>{item.doc_type}</p>
                      <p className={`text-[10px] font-mono truncate mt-1 ${t.textMuted}`}>Hash: {item.sha256_hash}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custody Movement & Chained Timeline */}
              <div className="lg:col-span-2 space-y-5">
                <div className={`p-5 rounded-2xl space-y-4 border transition-colors duration-200 ${t.card}`}>
                  <h2 className={`font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${t.titlePrimary}`}>
                    <ArrowRight className="w-4 h-4 text-emerald-500" /> Log Physical Evidence Movement
                  </h2>
                  <form onSubmit={handleHandover} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>Target Document ID</label>
                      <input
                        type="text"
                        placeholder="e.g. DOC-XXXX..."
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                        className={`w-full rounded-xl p-2 text-xs font-mono outline-none transition ${t.input}`}
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>Transferring Entity (From)</label>
                      <input
                        type="text"
                        value={handoverFrom}
                        onChange={(e) => setHandoverFrom(e.target.value)}
                        className={`w-full rounded-xl p-2 text-xs outline-none transition ${t.input}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>Receiving Entity (To)</label>
                      <input
                        type="text"
                        value={handoverTo}
                        onChange={(e) => setHandoverTo(e.target.value)}
                        className={`w-full rounded-xl p-2 text-xs outline-none transition ${t.input}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>Custodial Purpose</label>
                      <input
                        type="text"
                        value={handoverPurpose}
                        onChange={(e) => setHandoverPurpose(e.target.value)}
                        className={`w-full rounded-xl p-2 text-xs outline-none transition ${t.input}`}
                      />
                    </div>

                    {/* ================= PUT YOUR SNIPPET HERE ================= */}
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                        Authorizing Officer
                      </label>
                      <input
                        type="text"
                        value={handoverOfficer}
                        onChange={(e) => setHandoverOfficer(e.target.value)}
                        placeholder={`Default: ${currentOfficer}`}
                        className={`w-full rounded-xl p-2 text-xs outline-none transition ${t.input}`}
                      />
                    </div>
                    {/* ========================================================== */}

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={isHandingOver}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-xs py-2.5 rounded-xl transition text-white shadow-md disabled:opacity-50"
                      >
                        {isHandingOver ? "Signing Movement..." : "Sign & Record Custody Handover"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Chronological Timeline Feed */}
                <div className={`p-5 rounded-2xl space-y-4 border transition-colors duration-200 ${t.card}`}>
                  <div className="flex justify-between items-center">
                    <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${t.titlePrimary}`}>
                      <Award className="w-4 h-4 text-emerald-500" /> Custody Trail: <span className="font-mono text-emerald-500 font-bold">{selectedDocId || "Select a Document"}</span>
                    </h3>
                    {selectedDocId && (
                      <div className="space-x-2">
                        <button onClick={() => openBsaCertificate(selectedDocId)} className="text-xs font-bold text-emerald-500 hover:underline">
                          View Sec 63 Cert
                        </button>
                        <button onClick={() => { if (selectedLedgerItem) loadLedgerItemInVerifier(selectedLedgerItem); }} className="text-xs font-bold text-cyan-500 hover:underline">
                          Load in Verifier
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {timeline.map((evt) => (
                      <div key={evt.event_id} className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 transition-colors duration-200 ${t.cardInner}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-emerald-500">{evt.from_entity}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-bold text-xs text-cyan-500">{evt.to_entity}</span>
                          </div>
                          <p className={`text-xs ${t.titlePrimary}`}>{evt.purpose}</p>
                          <p className={`text-[11px] font-mono ${t.textMuted}`}>
                            Officer: {evt.authorized_by} • Verified Hash: {evt.verified_hash.substring(0, 16)}...
                          </p>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded font-mono shrink-0 border ${t.pillNav}`}>
                          {formatIST(evt.timestamp)}
                        </span>
                      </div>
                    ))}
                    {timeline.length === 0 && (
                      <p className={`text-xs py-8 text-center ${t.textMuted}`}>
                        Select a block on the left to inspect its custody lifecycle and handover milestones.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Courtroom Verifier */}
        {tab === "court" && (
          <div className={`max-w-5xl mx-auto p-8 rounded-2xl space-y-6 border transition-colors duration-200 ${t.card}`}>
            <div className={`border-b pb-4 flex justify-between items-center ${t.border}`}>
              <div>
                <h2 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 ${t.titlePrimary}`}>
                  <SplitSquareVertical className="h-5 w-5 text-emerald-500" />
                  Court Evidentiary Verification & Visual Comparison Terminal
                </h2>
                <p className={`text-xs ${t.textMuted}`}>Section 63 BSA Cryptographic Audit & Physical QR Decoder</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (ledgerHistory.length > 0) loadLedgerItemInVerifier(ledgerHistory[0]);
                }}
                className="text-xs font-mono text-emerald-500 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Load Latest Ledger Record
              </button>
            </div>

            {/* CHANNEL A: Physical QR Tag Verification */}
            <div className="bg-purple-600/10 border border-purple-500/30 p-5 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-300">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider font-mono">
                      Method 1: Physical Evidence QR Tag Verification
                    </h3>
                    <p className={`text-xs ${t.textMuted}`}>
                      Upload or scan the physical QR tag affixed to the Malkhana evidence bag to verify on-chain registration.
                    </p>
                  </div>
                </div>
                <label className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 transition shadow-md shrink-0">
                  <ScanLine className="w-4 h-4" /> Scan / Upload Physical QR
                  <input type="file" accept="image/*" onChange={handleQrUploadAndVerify} className="hidden" />
                </label>
              </div>
            </div>

            {/* Side-by-Side Visual Comparison Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl space-y-2 flex flex-col border ${t.cardInner}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400 uppercase flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> 1. Registered Genesis Sealed Artifact
                  </span>
                  <span className="text-[10px] bg-cyan-600/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 px-2 py-0.5 rounded font-mono font-bold">
                    On-Chain Benchmark
                  </span>
                </div>
                <div className={`flex-1 flex items-center justify-center rounded-lg p-2 min-h-[200px] max-h-[240px] overflow-hidden border ${isDark ? "bg-black/50 border-slate-900" : "bg-white border-slate-200"}`}>
                  {courtBenchmarkImageDataUrl ? (
                    <img src={courtBenchmarkImageDataUrl} alt="Original Genesis Artifact" className="max-h-52 object-contain rounded" />
                  ) : (
                    <div className={`text-center text-xs font-mono ${t.textMuted}`}>
                      No sealed photo artifact registered
                    </div>
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-xl space-y-2 flex flex-col border ${t.cardInner}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> 2. Evidence Presented in Court
                  </span>
                  <span className="text-[10px] bg-amber-600/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                    Under Inspection
                  </span>
                </div>
                <div className={`flex-1 flex items-center justify-center rounded-lg p-2 min-h-[200px] max-h-[240px] overflow-hidden border ${isDark ? "bg-black/50 border-slate-900" : "bg-white border-slate-200"}`}>
                  {verifyUploadedImageDataUrl ? (
                    <img src={verifyUploadedImageDataUrl} alt="Uploaded File For Audit" className="max-h-52 object-contain rounded" />
                  ) : courtBenchmarkImageDataUrl && !verifyFile ? (
                    <img src={courtBenchmarkImageDataUrl} alt="Active Benchmark Artifact" className="max-h-52 object-contain rounded opacity-80" />
                  ) : (
                    <div className={`text-center text-xs font-mono ${t.textMuted}`}>
                      Upload physical file below to inspect
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CHANNEL B: Digital Evidence File & Narrative Audit */}
            <div className={`p-6 rounded-2xl space-y-4 border ${t.cardInner}`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2 ${t.titlePrimary}`}>
                <FileText className="w-4 h-4 text-emerald-500" />
                Method 2: Digital Evidence File & Narrative Audit
              </h3>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className={`block mb-1 ${t.textMuted}`}>BENCHMARK ON-CHAIN SHA-256 HASH</label>
                  <input
                    type="text"
                    value={benchmarkHash}
                    onChange={(e) => setBenchmarkHash(e.target.value)}
                    placeholder="Genesis hash to verify against..."
                    className={`w-full rounded-lg p-2.5 text-cyan-500 outline-none transition ${t.input}`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 ${t.textMuted}`}>UPLOAD RAW EVIDENCE FILE PRESENTED IN COURT</label>
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
                    className={`w-full rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-emerald-600 file:text-white ${t.input}`}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className={t.textMuted}>— OR TEST EXTRACTED TEXT CONTENT —</label>
                    <button
                      type="button"
                      onClick={simulateTamper}
                      className="text-rose-500 hover:text-rose-400 font-bold text-[11px] flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-md"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> 1-Click Simulate Fraud/Tampering
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={verifyText}
                    onChange={(e) => setVerifyText(e.target.value)}
                    className={`w-full rounded-xl p-3 outline-none leading-relaxed font-mono transition ${t.input}`}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={executeVerification}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition"
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
                    className={`px-4 py-3 font-bold rounded-xl border transition ${t.pillNav}`}
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
                    ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-600 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/60 text-rose-600 dark:text-rose-300"
                }`}
              >
                {verifyStatus.is_intact ? (
                  <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-500" />
                ) : (
                  <ShieldAlert className="h-7 w-7 shrink-0 text-rose-500 animate-pulse" />
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
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg font-sans flex items-center gap-1.5 shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-2xl w-full rounded-2xl p-6 space-y-5 shadow-2xl border ${t.card}`}>
            <div className={`border-b pb-4 flex justify-between items-start ${t.border}`}>
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${t.titlePrimary}`}>
                  <Award className="w-5 h-5 text-emerald-500" /> Electronic Record Admissibility Certificate
                </h3>
                <p className={`text-xs mt-0.5 ${t.textMuted}`}>Under Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023</p>
              </div>
              <button onClick={() => setCertModalDocId(null)} className={`text-xs px-2.5 py-1 rounded-lg border ${t.pillNav}`}>
                Close
              </button>
            </div>

            {isLoadingCert ? (
              <p className={`py-12 text-center text-xs font-mono ${t.textMuted}`}>Generating statutory certificate package...</p>
            ) : certificateData ? (
              <div className="space-y-4 text-xs font-sans">
                <div className={`grid grid-cols-2 gap-3 p-4 rounded-xl border font-mono ${t.cardInner}`}>
                  <div>
                    <span className={t.textMuted}>Case Identifier:</span>
                    <p className={`font-bold ${t.titlePrimary}`}>{certificateData.case_number}</p>
                  </div>
                  <div>
                    <span className={t.textMuted}>Document UUID:</span>
                    <p className="font-bold text-emerald-500">{certificateData.doc_id}</p>
                  </div>
                  <div>
                    <span className={t.textMuted}>Classification:</span>
                    <p className={t.titlePrimary}>{certificateData.doc_type}</p>
                  </div>
                  <div>
                    <span className={t.textMuted}>Certifying Officer:</span>
                    <p className={t.titlePrimary}>{certificateData.officer?.id} ({certificateData.officer?.role})</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border space-y-1.5 font-mono text-[11px] ${t.cardInner}`}>
                  <p className={t.textMuted}>SHA-256 Genesis Digest:</p>
                  <p className="text-emerald-500 break-all">{certificateData.crypto_integrity?.sha256_digest}</p>
                  <p className={`mt-2 ${t.textMuted}`}>Chained Block Hash:</p>
                  <p className={`break-all ${t.titlePrimary}`}>{certificateData.crypto_integrity?.block_hash}</p>
                </div>

                <div className={`p-4 rounded-xl border italic text-xs leading-relaxed ${isDark ? "bg-slate-800/40 text-slate-300 border-slate-700" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                  "{certificateData.declaration}"
                </div>

                <div className={`flex justify-between items-center text-[10px] font-mono pt-2 ${t.textMuted}`}>
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