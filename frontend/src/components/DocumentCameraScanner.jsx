import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, Check, X, Shield, Crop, RotateCcw, AlertCircle } from "lucide-react";
import { applyPerspectiveTransform } from "../utils/opencvScanner";

export default function DocumentCameraScanner({ isOpen, onClose, onCaptureComplete }) {
  const videoRef = useRef(null);
  const snapCanvasRef = useRef(null);
  const warpedCanvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [errorMsg, setErrorMsg] = useState(null);
  const [stage, setStage] = useState("camera"); // 'camera' | 'adjust' | 'warped'
  
  // 4 corner coordinates (percentage 0.0 - 1.0)
  const [corners, setCorners] = useState([
    { x: 0.1, y: 0.1 }, // Top-Left
    { x: 0.9, y: 0.1 }, // Top-Right
    { x: 0.9, y: 0.9 }, // Bottom-Right
    { x: 0.1, y: 0.9 }, // Bottom-Left
  ]);
  const [activeCorner, setActiveCorner] = useState(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState(null);
  const [warpedImageDataUrl, setWarpedImageDataUrl] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    if (isOpen && stage === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, stage, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
        };
      }
    } catch (err) {
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(fallback);
        if (videoRef.current) {
          videoRef.current.srcObject = fallback;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(() => {});
          };
        }
      } catch (e) {
        setErrorMsg("Camera access denied or unavailable.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = snapCanvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImageDataUrl(dataUrl);

    stopCamera();
    setStage("adjust");
  };

  const applyWarp = () => {
    const snapCanvas = snapCanvasRef.current;
    const warpedCanvas = warpedCanvasRef.current;
    if (!snapCanvas || !warpedCanvas) return;

    // Ensure dimensions are initialized
    if (snapCanvas.width === 0 || snapCanvas.height === 0) {
      snapCanvas.width = 1280;
      snapCanvas.height = 720;
    }

    const pixelCorners = corners.map((c) => ({
      x: Math.round(c.x * snapCanvas.width),
      y: Math.round(c.y * snapCanvas.height),
    }));

    const success = applyPerspectiveTransform(snapCanvas, warpedCanvas, pixelCorners);
    if (success) {
      const dataUrl = warpedCanvas.toDataURL("image/png");
      setWarpedImageDataUrl(dataUrl);

      warpedCanvas.toBlob((blob) => {
        const file = new File([blob], `scanned_doc_${Date.now()}.png`, { type: "image/png" });
        setPreviewFile(file);
        setStage("warped");
      }, "image/png", 0.95);
    }
  };

  const handlePointerMove = (e) => {
    if (activeCorner === null || stage !== "adjust") return;
    const container = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - container.left) / container.width));
    const y = Math.max(0, Math.min(1, (e.clientY - container.top) / container.height));

    setCorners((prev) => {
      const updated = [...prev];
      updated[activeCorner] = { x, y };
      return updated;
    });
  };

  const confirmScan = () => {
    if (previewFile && onCaptureComplete) {
      onCaptureComplete(previewFile);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 relative flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Shield className="h-5 w-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              {stage === "camera" && "1. Capture Document Frame"}
              {stage === "adjust" && "2. Drag Corners to Align & Flatten"}
              {stage === "warped" && "3. Perspective Corrected Output"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hidden work canvases */}
        <canvas ref={snapCanvasRef} className="hidden" />
        <canvas ref={warpedCanvasRef} className="hidden" />

        {/* Viewport Display */}
        <div
          className="relative aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 select-none touch-none flex items-center justify-center"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setActiveCorner(null)}
          onPointerLeave={() => setActiveCorner(null)}
        >
          {errorMsg ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
              <p className="text-xs text-rose-300">{errorMsg}</p>
            </div>
          ) : stage === "camera" ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-8 border-2 border-dashed border-emerald-400/40 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                </div>
                <div className="flex justify-between">
                  <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                </div>
              </div>
            </>
          ) : stage === "adjust" ? (
            <>
              {capturedImageDataUrl && (
                <img
                  src={capturedImageDataUrl}
                  alt="Captured Frame"
                  className="w-full h-full object-cover pointer-events-none"
                  onLoad={(e) => {
                    if (snapCanvasRef.current) {
                      snapCanvasRef.current.width = e.target.naturalWidth || 1280;
                      snapCanvasRef.current.height = e.target.naturalHeight || 720;
                      const ctx = snapCanvasRef.current.getContext("2d");
                      ctx.drawImage(e.target, 0, 0);
                    }
                  }}
                />
              )}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <polygon
                  points={corners.map((c) => `${c.x * 100}%,${c.y * 100}%`).join(" ")}
                  className="fill-emerald-500/20 stroke-emerald-400 stroke-2"
                />
              </svg>
              {corners.map((c, idx) => (
                <div
                  key={idx}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setActiveCorner(idx);
                  }}
                  style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-400 border-2 border-white shadow-xl cursor-grab active:cursor-grabbing z-20 flex items-center justify-center text-[10px] font-bold text-slate-950"
                >
                  {idx + 1}
                </div>
              ))}
            </>
          ) : (
            <img src={warpedImageDataUrl} alt="Flattened Document" className="max-w-full max-h-full object-contain p-2" />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-4">
          {stage === "camera" && (
            <>
              <button
                type="button"
                onClick={() => setFacingMode((p) => (p === "environment" ? "user" : "environment"))}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Switch Camera
              </button>
              <button
                type="button"
                onClick={takeSnapshot}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                <Camera className="h-4 w-4" /> Snap Frame
              </button>
            </>
          )}

          {stage === "adjust" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStage("camera");
                  setCapturedImageDataUrl(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retake
              </button>
              <button
                type="button"
                onClick={applyWarp}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                <Crop className="h-4 w-4" /> Warp & Flatten Document
              </button>
            </>
          )}

          {stage === "warped" && (
            <>
              <button
                type="button"
                onClick={() => setStage("adjust")}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Re-adjust
              </button>
              <button
                type="button"
                onClick={confirmScan}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Check className="h-4 w-4" /> Use Flattened Document
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}