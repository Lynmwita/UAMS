'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { fileToPhotoDataUrl, captureVideoFrameToDataUrl, initialsForName } from '@/lib/students/photo';

interface PhotoCaptureInputProps {
  photoUrl?: string;
  onChange: (photoUrl: string) => void;
  name?: string;
  id?: string;
  label?: string;
  helperText?: string;
}

export function PhotoCaptureInput({
  photoUrl = '',
  onChange,
  name = 'Person',
  id = 'photo-input',
  label = 'ID Card & Profile Photo',
  helperText = 'Upload an image file or take a live picture using your camera. It is automatically formatted for your official ID card.',
}: PhotoCaptureInputProps) {
  const [error, setError] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks cleanly
  const stopCameraStream = (stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream(cameraStream);
    };
  }, [cameraStream]);

  const handleFileChange = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      onChange(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'That image could not be processed.');
    }
  };

  const startCamera = async () => {
    setCameraError('');
    setCapturedPhoto(null);
    setIsCameraOpen(true);
    setIsStartingCamera(true);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      let msg = 'Could not access the camera. Please check camera permissions or upload a photo instead.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser or choose "Upload photo".';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. Please upload a photo from your files.';
      }
      setCameraError(msg);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const closeCamera = () => {
    stopCameraStream(cameraStream);
    setCameraStream(null);
    setCapturedPhoto(null);
    setCameraError('');
    setIsCameraOpen(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const dataUrl = captureVideoFrameToDataUrl(videoRef.current);
      setCapturedPhoto(dataUrl);
    } catch (err: any) {
      setCameraError(err?.message || 'Could not capture photo.');
    }
  };

  const retakeSnapshot = () => {
    setCapturedPhoto(null);
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  };

  const acceptSnapshot = () => {
    if (capturedPhoto) {
      onChange(capturedPhoto);
      closeCamera();
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3.5">
        {/* Photo avatar preview */}
        <div className="relative flex-shrink-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={`Photo of ${name}`}
              className="h-16 w-16 rounded-xl object-cover border-2 border-academic-gold-500 shadow-sm"
            />
          ) : (
            <div
              className="h-16 w-16 rounded-xl bg-academic-navy-950 text-academic-gold-400 font-extrabold flex flex-col items-center justify-center border-2 border-academic-navy-800 shadow-sm"
            >
              <span className="text-sm">{initialsForName(name)}</span>
              <span className="text-[8px] font-semibold tracking-wider text-slate-300">NO PHOTO</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Upload File */}
          <input
            id={id}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleFileChange(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition"
          >
            <Upload className="h-3.5 w-3.5 text-slate-600" />
            <span>Upload Photo</span>
          </button>

          {/* Camera Snapshot */}
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Camera className="h-3.5 w-3.5 text-academic-gold-400" />
            <span>Take with Camera</span>
          </button>

          {/* Remove */}
          {photoUrl && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setError('');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold transition"
              title="Remove photo"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      )}

      {error && (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Live Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-academic-navy-50 text-academic-navy-900 rounded-lg">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-academic-navy-950">ID Card Camera</h3>
                  <p className="text-[11px] text-slate-500">Center your face inside the portrait guide</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <p>{cameraError}</p>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Viewfinder / Captured Preview */}
                <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-slate-900 rounded-2xl overflow-hidden border-2 border-academic-navy-900 shadow-inner flex items-center justify-center">
                  {capturedPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={capturedPhoto}
                      alt="Captured photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      {/* Portrait Guideline Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[190px] h-[230px] rounded-[50%] border-2 border-academic-gold-400/70 border-dashed shadow-sm" />
                      </div>
                      <div className="absolute top-2 left-2 bg-slate-950/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs font-medium">
                        Live Preview
                      </div>
                    </>
                  )}

                  {isStartingCamera && !capturedPhoto && (
                    <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-academic-gold-400" />
                      <span>Initializing camera...</span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  {capturedPhoto ? (
                    <>
                      <button
                        type="button"
                        onClick={retakeSnapshot}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={acceptSnapshot}
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Use This Photo</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={takeSnapshot}
                      disabled={isStartingCamera}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-academic-navy-950 hover:bg-academic-navy-900 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50"
                    >
                      <Camera className="h-4 w-4 text-academic-gold-400" />
                      <span>Take Photo</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
