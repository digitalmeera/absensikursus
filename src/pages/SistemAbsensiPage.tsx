import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { gasApi } from '../services/gasApi';
import { Absensi, Peserta, Shift } from '../types';
import { sound } from '../lib/sound';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  Keyboard, 
  Clock, 
  User, 
  Volume2, 
  RefreshCw,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const SistemAbsensiPage: React.FC = () => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [override, setOverride] = useState<boolean>(false);

  // Manual Input fallback
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Last scanned student result display
  const [lastScanResult, setLastScanResult] = useState<{
    peserta?: Peserta;
    absensi?: Absensi;
    message: string;
    isError?: boolean;
    isWarning?: boolean;
    timestamp: string;
  } | null>(null);

  // Recent scans in this session
  const [sessionScans, setSessionScans] = useState<Array<{
    nomorMurid: string;
    nama: string;
    waktu: string;
    status: string;
    shift: string;
  }>>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const containerId = 'barcode-reader-viewfinder';

  // Load shifts on mount
  useEffect(() => {
    const loadShifts = async () => {
      try {
        const res = await gasApi.getShifts();
        if (res.success && res.data) {
          setShifts(res.data);
          // Set shift yang aktif saat ini jika ada
          const nowStr = new Date().toTimeString().slice(0, 5);
          const active = res.data.find(
            (s) => s.status === 'Aktif' && nowStr >= s.jamMulai && nowStr <= s.jamSelesai
          );
          if (active) setSelectedShift(active.namaShift);
        }
      } catch (err) {
        console.error('Failed to load shifts', err);
      }
    };
    loadShifts();
  }, []);

  // Initialize Camera Scanner
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        setCameraError('');
        const qrCodeInstance = new Html5Qrcode(containerId);
        html5QrCodeRef.current = qrCodeInstance;

        const config = {
          fps: 15,
          qrbox: { width: 340, height: 200 },
          aspectRatio: 1.6,
        };

        await qrCodeInstance.start(
          { facingMode: 'environment' }, // prefer rear camera on mobile
          config,
          (decodedText) => {
            if (mounted) {
              handleBarcodeScanned(decodedText);
            }
          },
          () => {
            // Frame non-match - ignore silently
          }
        );

        if (mounted) {
          setCameraActive(true);
        }
      } catch (err: any) {
        console.warn('Camera start error:', err);
        if (mounted) {
          setCameraActive(false);
          setCameraError(
            err.message || 'Izin kamera ditolak atau tidak ada webcam yang tersedia.'
          );
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(() => {});
      }
    };
  }, []);

  // Core handler for barcode detection (from camera or manual input)
  const handleBarcodeScanned = async (barcodeVal: string) => {
    const cleanVal = barcodeVal.trim();
    if (!cleanVal) return;

    // Cooldown check (1.8 seconds) to prevent duplicate triggers of identical barcode
    const now = Date.now();
    if (
      cleanVal === lastScannedBarcodeRef.current &&
      now - lastScannedTimeRef.current < 2000
    ) {
      return;
    }

    lastScannedBarcodeRef.current = cleanVal;
    lastScannedTimeRef.current = now;

    await processAttendance(cleanVal);
  };

  const processAttendance = async (barcodeVal: string) => {
    setIsProcessing(true);

    try {
      const res = await gasApi.recordAbsensi({
        barcodeValue: barcodeVal,
        shift: selectedShift || undefined,
        statusPresensi: 'Hadir',
        override: override,
      });

      const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (res.success && res.data) {
        // SUKSES
        sound.playSuccess();
        setLastScanResult({
          absensi: res.data,
          message: res.message || 'Presensi berhasil dicatat!',
          timestamp: nowTimeStr,
        });

        // Tambah ke riwayat sesi lokal
        setSessionScans((prev) => [
          {
            nomorMurid: res.data!.nomorMurid,
            nama: res.data!.namaPeserta,
            waktu: res.data!.waktu,
            status: res.data!.statusPresensi,
            shift: res.data!.shift,
          },
          ...prev.slice(0, 9), // simpan 10 terakhir
        ]);
      } else {
        // GAGAL / DUPLIKAT / DI LUAR JAM
        sound.playWarning();
        setLastScanResult({
          message: res.message || 'Presensi tidak dapat dicatat.',
          isError: true,
          isWarning: res.isDuplicate || res.canOverride,
          timestamp: nowTimeStr,
        });
      }
    } catch (err: any) {
      sound.playWarning();
      setLastScanResult({
        message: err.message || 'Terjadi kesalahan sistem saat mencatat absensi.',
        isError: true,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    processAttendance(manualBarcode.trim());
    setManualBarcode('');
  };

  const handleRestartCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
    }
    setCameraActive(false);
    setCameraError('');

    try {
      const qrCodeInstance = new Html5Qrcode(containerId);
      html5QrCodeRef.current = qrCodeInstance;
      await qrCodeInstance.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 340, height: 200 }, aspectRatio: 1.6 },
        handleBarcodeScanned,
        () => {}
      );
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(err.message || 'Gagal memulai kamera.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Shift Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Sistem Absensi Barcode</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Arahkan kamera ke barcode kartu siswa. Pemindaian berlangsung secara kontinu otomatis.
          </p>
        </div>

        {/* Shift Selector & Override Option */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <Clock className="h-4 w-4 text-sky-600" />
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Shift Otomatis (Sesuai Jam)</option>
              {shifts.map((s) => (
                <option key={s.idShift} value={s.namaShift}>
                  {s.namaShift} ({s.jamMulai} - {s.jamSelesai})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs hover:bg-slate-50">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="h-3.5 w-3.5 text-sky-600 rounded border-slate-300"
            />
            <span>Override Jam</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Scanner Left, Result & History Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewfinder & Manual Input (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Scanner Viewfinder Box */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-xl">
            {/* Camera Frame */}
            <div className="relative min-h-[300px] sm:min-h-[360px] flex items-center justify-center">
              <div id={containerId} className="w-full h-full overflow-hidden" />

              {/* Laser line overlay animation */}
              {cameraActive && (
                <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                  <div className="w-full max-w-xs h-36 border-2 border-dashed border-sky-400/70 rounded-2xl relative flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                    <span className="absolute bottom-2 text-[10px] font-mono tracking-widest text-sky-300/80 uppercase">
                      Posisikan Barcode Disini
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Error / Permission Fallback */}
              {!cameraActive && (
                <div className="p-8 text-center text-white z-10 max-w-sm">
                  <CameraOff className="mx-auto h-12 w-12 text-slate-500 mb-3" />
                  <h4 className="text-sm font-bold text-slate-200">
                    Kamera Tidak Aktif
                  </h4>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {cameraError || 'Browser membutuhkan izin untuk mengakses webcam/kamera.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleRestartCamera}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Coba Aktifkan Ulang Kamera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Viewfinder Status Footer */}
            <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cameraActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span>{cameraActive ? 'Scanner Aktif (Continuous)' : 'Kamera Nonaktif'}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                <Volume2 className="h-3.5 w-3.5 text-sky-400" />
                <span>Audio Beep ON</span>
              </div>
            </div>
          </div>

          {/* Backup: Manual Barcode / USB Scanner Barcode Input */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <form onSubmit={handleManualSubmit} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5 text-sky-600" />
                <span>Input Manual / Scanner USB Barcode</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Ketik Nomor Murid (contoh: DM0001) lalu Enter..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !manualBarcode.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Memproses...' : 'Presensi'}
                </button>
              </div>
              <p className="text-[11px] text-slate-600">
                Mendukung scanner barcode laser USB / barcode nirkabel eksternal secara instan.
              </p>
            </form>
          </div>
        </div>

        {/* Right Column: Instant Result Card & Session History (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Last Scan Result Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Hasil Pemindaian Terakhir
            </h3>

            {lastScanResult ? (
              <div
                className={`rounded-2xl p-4 border transition-all ${
                  lastScanResult.isError
                    ? lastScanResult.isWarning
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-red-50/80 border-red-200 text-red-900'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastScanResult.isError ? (
                    <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-tight">
                      {lastScanResult.message}
                    </p>
                    <p className="text-[11px] opacity-75 mt-0.5">
                      Pukul: {lastScanResult.timestamp}
                    </p>
                  </div>
                </div>

                {/* Info Siswa jika ada */}
                {lastScanResult.absensi && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/80 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-2xs">
                      {lastScanResult.absensi.namaPeserta.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-slate-900 truncate">
                        {lastScanResult.absensi.namaPeserta}
                      </p>
                      <p className="font-mono text-sky-700 font-semibold">
                        {lastScanResult.absensi.nomorMurid}
                      </p>
                      <p className="text-slate-600 truncate mt-0.5">
                        {lastScanResult.absensi.programKelas}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-sky-400" />
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  Siap Memindai
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Dekatkan kartu peserta ke kamera untuk presensi.
                </p>
              </div>
            )}
          </div>

          {/* Session Attendance Stream (10 Rekaman Terbaru) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Riwayat Sesi Ini
              </h3>
              <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                {sessionScans.length} Siswa
              </span>
            </div>

            {sessionScans.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 divide-y divide-slate-100">
                {sessionScans.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{item.nama}</p>
                      <p className="font-mono text-[11px] text-sky-700 font-bold">{item.nomorMurid}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-[11px] text-slate-500">{item.waktu}</span>
                      <span className="block text-[10px] text-emerald-600 font-semibold">{item.shift}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-6">
                Belum ada siswa yang presensi pada sesi browser ini.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
