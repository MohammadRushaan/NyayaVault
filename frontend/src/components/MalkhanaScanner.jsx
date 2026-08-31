import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Camera, XCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export default function MalkhanaScanner({ isOpen, onClose, onScanSuccess }) {
  const [scanResult, setScanResult] = useState(null);
  const [parseError, setParseError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const scanner = new Html5QrcodeScanner(
      "malkhana-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false
    );

    scanner.render(
      (decodedText) => {
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.system !== "NyayaVault-Malkhana") {
            throw new Error("Invalid QR Header");
          }
          setScanResult(parsed);
          setParseError(null);
          scanner.clear();
          if (onScanSuccess) onScanSuccess(parsed);
        } catch (err) {
          setParseError("Unrecognized or non-Malkhana QR format.");
        }
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 relative flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Malkhana Evidence Scanner</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-slate-950 border border-slate-800 p-2">
          <div id="malkhana-reader" className="w-full text-slate-400"></div>
        </div>

        {scanResult && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-xs space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Evidence Tag Detected</span>
            </div>
            <p className="text-slate-300 font-mono">Case No: {scanResult.case_no}</p>
            <p className="text-slate-300 font-mono">Doc ID: {scanResult.doc_id}</p>
            <p className="text-slate-400 font-mono break-all text-[10px]">Hash: {scanResult.hash}</p>
          </div>
        )}

        {parseError && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs flex items-center space-x-2 text-rose-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </div>
    </div>
  );
}