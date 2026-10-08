import React from 'react';
import { Modal } from '../components/Modal';
import { Peserta, ProfilLembaga } from '../types';
import { downloadSingleCardPdf, downloadCardAsJpg } from '../lib/exportPdf';
import { Download, FileText, Image as ImageIcon, Calendar, Phone, MapPin, User, BookOpen } from 'lucide-react';
import { generateBarcodeDataUrl } from '../lib/barcode';

interface DetailPesertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  peserta: Peserta | null;
  profil: ProfilLembaga;
}

export const DetailPesertaModal: React.FC<DetailPesertaModalProps> = ({
  isOpen,
  onClose,
  peserta,
  profil,
}) => {
  if (!peserta) return null;

  const barcodeUrl = generateBarcodeDataUrl(peserta.nomorMurid, {
    width: 2,
    height: 50,
    displayValue: true,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Profil Peserta"
      subtitle={`Nomor Murid: ${peserta.nomorMurid}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          {/* Foto Siswa */}
          <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
            {peserta.foto ? (
              <img src={peserta.foto} alt={peserta.namaPeserta} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500 font-bold text-xl">
                {peserta.namaPeserta.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Core Info */}
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="font-mono text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                {peserta.nomorMurid}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                peserta.statusPeserta === 'Aktif'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {peserta.statusPeserta}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{peserta.namaPeserta}</h3>
            <p className="text-xs font-semibold text-slate-600">{peserta.programKelas}</p>
            <p className="text-xs text-slate-500">{peserta.status} &bull; {peserta.jenisKelamin}</p>
          </div>

          {/* Barcode Preview */}
          {barcodeUrl && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-2xs">
              <img src={barcodeUrl} alt="Barcode Siswa" className="h-14 object-contain" />
              <span className="text-[10px] font-mono text-slate-400 mt-0.5">Code 128 Static</span>
            </div>
          )}
        </div>

        {/* Detailed Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Tempat, Tanggal Lahir</span>
            <p className="font-medium text-slate-800">{peserta.tempatLahir}, {peserta.tanggalLahir}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Agama</span>
            <p className="font-medium text-slate-800">{peserta.agama}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Nomor WA / Telpon</span>
            <p className="font-medium text-slate-800 font-mono">{peserta.nomorWA}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Orang Tua / Wali</span>
            <p className="font-medium text-slate-800">{peserta.orangTua}</p>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Alamat Tempat Tinggal</span>
            <p className="font-medium text-slate-800">{peserta.alamat}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Biaya Program</span>
            <p className="font-bold text-sky-700">{peserta.hargaProgram}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Tanggal Pendaftaran</span>
            <p className="font-medium text-slate-800">{peserta.tanggalPendaftaran}</p>
          </div>
        </div>

        {/* Card Export Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-xs font-bold text-slate-900">Kartu Peserta Resmi</p>
            <p className="text-[11px] text-slate-600">Ukuran standar kartu 85,60 mm &times; 53,98 mm</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadCardAsJpg(peserta, profil)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5 text-sky-600" />
              <span>Unduh JPG</span>
            </button>
            <button
              type="button"
              onClick={() => downloadSingleCardPdf(peserta, profil)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
