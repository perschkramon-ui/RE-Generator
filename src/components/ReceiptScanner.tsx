import { useState, useRef, useEffect, useCallback } from 'react';

type SourceChoice = 'ask' | 'camera' | 'file';

interface Props {
  onClose: () => void;
}

export function ReceiptScanner({ onClose }: Props) {
  const [source, setSource] = useState<SourceChoice>('ask');
  const [capturedFile, setCapturedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [flash, setFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Camera ──────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('permission') || msg.includes('NotAllowed')) {
        setCameraError('Kamerazugriff verweigert. Bitte in den Browsereinstellungen erlauben.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('Keine Kamera gefunden.');
      } else {
        setCameraError(`Kamera konnte nicht gestartet werden: ${msg}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (source === 'camera') startCamera();
    return () => stopCamera();
  }, [source, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedFile) URL.revokeObjectURL(capturedFile.url);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const name = `Foto_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
      stopCamera();
      setCapturedFile({ url, name, type: 'image/jpeg' });
    }, 'image/jpeg', 0.92);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedFile({ url, name: file.name, type: file.type });
    setSource('file');
  }

  function download() {
    if (!capturedFile) return;
    const a = document.createElement('a');
    a.href = capturedFile.url;
    a.download = capturedFile.name;
    a.click();
  }

  function reset() {
    if (capturedFile) URL.revokeObjectURL(capturedFile.url);
    setCapturedFile(null);
    setCameraError(null);
    setSource('ask');
    stopCamera();
  }

  function handleClose() {
    stopCamera();
    if (capturedFile) URL.revokeObjectURL(capturedFile.url);
    onClose();
  }

  const isPDF = capturedFile?.type === 'application/pdf';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full"
        style={{ maxWidth: 640, maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <div>
              <h2 className="font-bold text-gray-900">Beleg scannen</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {source === 'ask' && 'Quelle wählen'}
                {source === 'camera' && !capturedFile && 'Kamera aktiv'}
                {source === 'file' && !capturedFile && 'Datei auswählen'}
                {capturedFile && capturedFile.name}
              </p>
            </div>
          </div>
          <button onClick={handleClose}
            className="text-gray-400 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">

          {/* ── STEP 1: Choose source ── */}
          {source === 'ask' && !capturedFile && (
            <div className="p-8">
              <p className="text-center text-sm text-gray-500 mb-6">Wie möchtest du den Beleg einlesen?</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Camera */}
                <button
                  onClick={() => setSource('camera')}
                  className="group flex flex-col items-center gap-4 p-6 border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800">Kamera</p>
                    <p className="text-xs text-gray-500 mt-1">Foto direkt aufnehmen</p>
                  </div>
                </button>

                {/* File */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center gap-4 p-6 border-2 border-gray-200 rounded-2xl hover:border-green-400 hover:bg-green-50 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800">Aus Fotos / Datei</p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, TIFF, PDF</p>
                  </div>
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-6">
                🔒 Alles läuft lokal im Browser — kein Upload, keine Cloud
              </p>
            </div>
          )}

          {/* ── STEP 2a: Camera view ── */}
          {source === 'camera' && !capturedFile && (
            <div className="relative bg-black">
              {cameraError ? (
                <div className="flex flex-col items-center justify-center p-10 gap-4 text-center min-h-64">
                  <span className="text-4xl">📵</span>
                  <p className="text-sm text-red-400 font-medium">{cameraError}</p>
                  <div className="flex gap-3">
                    <button onClick={reset}
                      className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                      Zurück
                    </button>
                    <button onClick={startCamera}
                      className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                      Erneut versuchen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Flash overlay */}
                  {flash && (
                    <div className="absolute inset-0 bg-white z-10 pointer-events-none" style={{ opacity: 0.8 }} />
                  )}
                  {/* Viewfinder guide */}
                  <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <div className="border-2 border-white/50 rounded-lg"
                      style={{ width: '85%', height: '65%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
                  </div>
                  <video
                    ref={videoRef}
                    className="w-full"
                    style={{ maxHeight: 400, objectFit: 'cover' }}
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <div className="text-white text-sm">Kamera wird gestartet …</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: Preview ── */}
          {capturedFile && (
            <div className="relative">
              {isPDF ? (
                <iframe
                  src={capturedFile.url}
                  className="w-full"
                  style={{ height: 420, border: 'none' }}
                  title="PDF Vorschau"
                />
              ) : (
                <img
                  src={capturedFile.url}
                  alt="Belegvorschau"
                  className="w-full object-contain"
                  style={{ maxHeight: 440 }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {/* Left: back/reset */}
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {capturedFile ? 'Neu scannen' : 'Zurück'}
          </button>

          {/* Right: main actions */}
          <div className="flex items-center gap-2">
            {source === 'camera' && !capturedFile && !cameraError && cameraActive && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  title="Stattdessen Datei wählen"
                >
                  📂 Datei wählen
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-md"
                >
                  <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white" />
                  </div>
                  Aufnehmen
                </button>
              </>
            )}

            {capturedFile && (
              <>
                <button
                  onClick={download}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Speichern
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
                >
                  ✓ Fertig
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/tiff,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
        capture={undefined}
      />
    </div>
  );
}
