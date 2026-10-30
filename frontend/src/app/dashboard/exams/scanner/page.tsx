'use client';

import { useState, useRef, useEffect } from 'react';
import { ScanLine, CheckCircle2, XCircle, Camera, Keyboard, X } from 'lucide-react';

interface VerifyResult {
  success: boolean;
  valid: boolean;
  verdict: 'ADMIT' | 'DO NOT ADMIT';
  student_name?: string;
  admission_number?: string;
  program_name?: string;
  clearance_status?: string;
  waiver?: { valid_until: string } | null;
  reason?: string;
  error?: string;
}

export default function ScannerPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const verify = async (qrCode: string) => {
    const trimmed = qrCode.trim();
    if (!trimmed || verifying) return;
    setVerifying(true);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/exams/verify-qr?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, valid: false, verdict: 'DO NOT ADMIT', reason: 'Network error — verify manually at the exam office.' });
    } finally {
      setVerifying(false);
    }
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError('Camera unavailable. Type the code manually — manual entry always works.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  const reset = () => {
    setCode('');
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
          <ScanLine className="h-7 w-7 text-academic-navy-900" />
          Invigilator Scanner
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Scan or type an exam-pass QR code. Unknown codes fail closed — <strong>DO NOT ADMIT</strong>.
        </p>
      </div>

      {/* Manual entry — always available */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
          <Keyboard className="h-4 w-4" /> Enter QR Code
        </label>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verify(code)}
            placeholder="e.g. UAMS-SEC-CLR-BIT-2023-8849-VALID-2026"
            autoFocus
            className="flex-1 font-mono text-sm border-2 border-slate-300 rounded-xl px-4 py-3 focus:border-academic-navy-900 outline-none"
          />
          <button
            onClick={() => verify(code)}
            disabled={!code.trim() || verifying}
            className="px-6 py-3 bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          >
            {verifying ? 'Checking…' : 'Verify'}
          </button>
        </div>

        {/* Camera (optional enhancement) */}
        <div className="pt-2 border-t border-slate-100">
          {!cameraOn ? (
            <button onClick={startCamera} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> Use camera instead (aim at the QR code, then type what you see)
            </button>
          ) : (
            <div className="space-y-2">
              <video ref={videoRef} className="w-full rounded-xl border border-slate-300 bg-black" playsInline muted />
              <button onClick={stopCamera} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
                <X className="h-4 w-4" /> Close camera
              </button>
            </div>
          )}
          {cameraError && <p className="text-xs text-amber-700 mt-2">{cameraError}</p>}
          <p className="text-[11px] text-slate-400 mt-1">
            Note: this viewfinder is a visual aid only — always type the code and press Verify. Automated QR decoding is not built in.
          </p>
        </div>
      </div>

      {/* Verdict */}
      {result && (
        <div className={`rounded-2xl border-4 p-8 text-center space-y-3 ${
          result.verdict === 'ADMIT' ? 'border-emerald-500 bg-emerald-50' : 'border-rose-600 bg-rose-50'
        }`}>
          {result.verdict === 'ADMIT' ? (
            <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-rose-600 mx-auto" />
          )}
          <p className={`text-4xl font-black tracking-tight ${
            result.verdict === 'ADMIT' ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {result.verdict}
          </p>
          {result.valid && result.student_name ? (
            <div className="text-sm text-slate-700 space-y-1">
              <p className="text-lg font-bold text-slate-900">{result.student_name}</p>
              <p className="font-mono">{result.admission_number}</p>
              <p className="text-xs text-slate-500">{result.program_name}</p>
              <p className="text-xs font-bold mt-2">
                Status: {result.clearance_status === 'waived' ? `Waived until ${result.waiver?.valid_until}` : result.clearance_status}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-rose-800">{result.reason || result.error}</p>
          )}
          {result.valid && result.reason && (
            <p className="text-xs text-slate-600">{result.reason}</p>
          )}
          <button onClick={reset}
            className="mt-4 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800">
            Scan Next Student
          </button>
        </div>
      )}
    </div>
  );
}
