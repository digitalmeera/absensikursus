import React, { useState, useEffect } from 'react';
import { Peserta, ProfilLembaga, CardTemplateConfig } from '../types';
import { gasApi } from '../services/gasApi';
import { downloadSingleCardPdf, downloadAllCardsPdf, downloadCardAsJpg } from '../lib/exportPdf';
import { generateBarcodeDataUrl } from '../lib/barcode';
import { 
  CreditCard, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  Sparkles, 
  CheckCircle2,
  Users
} from 'lucide-react';

interface KartuPesertaPageProps {
  profil: ProfilLembaga;
}

export const KartuPesertaPage: React.FC<KartuPesertaPageProps> = ({ profil }) => {
  const [pesertaList, setPesertaList] = useState<Peserta[]>([]);
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig>({
    theme: 'modern-navy',
    accentColor: '#0ea5e9',
    barcodeSize: 'large',
    showPhoto: true,
    showProgram: true,
    showWatermark: true,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [downloadingAll, setDownloadingAll] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [pRes, cfg] = await Promise.all([
          gasApi.getPeserta(),
          gasApi.getCardConfig(),
        ]);
        if (pRes.success && pRes.data) {
          setPesertaList(pRes.data.filter((p) => p.statusPeserta !== 'Deleted'));
        }
        setCardConfig(cfg);
      } catch (err) {
        console.error('Error loading cards:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleDownloadAll = async () => {
    if (pesertaList.length === 0) return;
    setDownloadingAll(true);
    try {
      await downloadAllCardsPdf(pesertaList, profil, cardConfig);
      showToast('Semua kartu berhasil di-download dalam satu file PDF.');
    } catch (err) {
      console.error('Download all error', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const filtered = pesertaList.filter(
    (p) =>
      p.namaPeserta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nomorMurid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Download All */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Kartu Peserta Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ukuran standar kartu ID-1 (85,60 mm &times; 53,98 mm) dengan barcode Code 128 permanen.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={downloadingAll || pesertaList.length === 0}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>{downloadingAll ? 'Menyiapkan PDF...' : 'Download Semua Kartu (PDF)'}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kartu berdasarkan nama murid atau nomor murid (DM000X)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Memuat kartu peserta...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((peserta) => {
            const barcodeDataUrl = generateBarcodeDataUrl(peserta.nomorMurid, {
              width: 2.2,
              height: 48,
              displayValue: true,
              fontSize: 12,
            });

            // Theme colors
            let themeBg = 'from-slate-900 to-slate-800';
            let themeAccent = 'bg-sky-500';
            let themeBadge = 'bg-sky-500 text-white';

            if (cardConfig.theme === 'emerald-green') {
              themeBg = 'from-emerald-950 to-teal-900';
              themeAccent = 'bg-emerald-500';
              themeBadge = 'bg-emerald-500 text-white';
            } else if (cardConfig.theme === 'royal-indigo') {
              themeBg = 'from-indigo-950 to-slate-900';
              themeAccent = 'bg-indigo-500';
              themeBadge = 'bg-indigo-500 text-white';
            } else if (cardConfig.theme === 'crimson-amber') {
              themeBg = 'from-red-950 to-slate-900';
              themeAccent = 'bg-amber-500';
              themeBadge = 'bg-amber-500 text-slate-900';
            }

            return (
              <div
                key={peserta.id}
                className="flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Visual Card (Aspect Ratio ~85.60 x 53.98 = 1.586) */}
                <div
                  className={`relative w-full aspect-[85.6/53.98] overflow-hidden rounded-2xl bg-gradient-to-br ${themeBg} p-3 text-white shadow-md flex flex-col justify-between`}
                >
                  {/* Top Bar Accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${themeAccent}`} />

                  {/* Header of Card */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-[9px] font-black">
                        DM
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold tracking-wider leading-none text-white">
                          {profil.namaLembaga || 'DIGITALMEERA'}
                        </h4>
                        <span className="text-[7px] text-slate-300 uppercase tracking-widest font-medium">
                          Kartu Peserta Resmi
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider bg-white/15 px-1.5 py-0.5 rounded text-white/90">
                      OFFICIAL
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="flex items-center gap-3 my-auto">
                    {/* Photo */}
                    <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-white/30 bg-slate-800 shadow-xs flex items-center justify-center">
                      {peserta.foto ? (
                        <img
                          src={peserta.foto}
                          alt={peserta.namaPeserta}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-xs text-white/60">
                          {peserta.namaPeserta.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-white truncate leading-snug">
                        {peserta.namaPeserta}
                      </p>
                      <div className="mt-0.5 inline-block">
                        <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${themeBadge}`}>
                          {peserta.nomorMurid}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-300 font-medium truncate mt-1">
                        {peserta.programKelas}
                      </p>
                    </div>
                  </div>

                  {/* Barcode Area at the bottom */}
                  <div className="rounded-lg bg-white p-1 shadow-xs flex items-center justify-center">
                    {barcodeDataUrl && (
                      <img
                        src={barcodeDataUrl}
                        alt={`Barcode ${peserta.nomorMurid}`}
                        className="h-8 w-full object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Card Controls */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div className="text-slate-500">
                    <span className="font-mono font-bold text-slate-800">{peserta.nomorMurid}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadCardAsJpg(peserta, profil, cardConfig)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      title="Download format Gambar JPG (300 DPI)"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                      <span>JPG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadSingleCardPdf(peserta, profil, cardConfig)}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 transition-colors"
                      title="Download format PDF (85.60 x 53.98 mm)"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
          <h4 className="mt-3 text-sm font-bold text-slate-800">
            {searchTerm ? 'Tidak ada kartu yang cocok' : 'Belum Ada Kartu Peserta'}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {searchTerm
              ? 'Silakan coba kata kunci pencarian yang lain'
              : 'Daftarkan peserta di menu Data Peserta untuk membuat kartu otomatis.'}
          </p>
        </div>
      )}
    </div>
  );
};
