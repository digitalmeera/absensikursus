import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Palette, 
  CheckCircle, 
  UserX, 
  ClipboardCheck, 
  QrCode, 
  UserPlus, 
  CreditCard, 
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { gasApi } from '../services/gasApi';
import { DashboardStats } from '../types';
import { ActivePage } from '../components/Sidebar';

interface DashboardPageProps {
  onNavigate: (page: ActivePage) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPeserta: 0,
    paketOfficePemula: 0,
    paketOfficeDesain: 0,
    absensiHariIni: 0,
    tidakHadirHariIni: 0,
    totalAbsensi: 0,
    recentAbsensi: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await gasApi.getDashboard();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const attendancePercentage = stats.totalPeserta > 0 
    ? Math.round((stats.absensiHariIni / stats.totalPeserta) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Utama
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ringkasan data peserta, aktivitas kehadiran harian, dan statistik program kursus.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Peserta */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Peserta
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalPeserta}
            </span>
            <span className="ml-1.5 text-xs text-slate-400 font-medium">Siswa Aktif</span>
          </div>
        </div>

        {/* 2. Paket Office Pemula */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Office Pemula
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.paketOfficePemula}
            </span>
            <span className="ml-1.5 text-xs text-slate-400 font-medium">Siswa</span>
          </div>
        </div>

        {/* 3. Office + Desain */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Office + Desain
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Palette className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.paketOfficeDesain}
            </span>
            <span className="ml-1.5 text-xs text-slate-400 font-medium">Siswa</span>
          </div>
        </div>

        {/* 4. Absensi Hari Ini */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Hadir Hari Ini
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-200 text-emerald-700">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
              {stats.absensiHariIni}
            </span>
            <span className="ml-1.5 text-xs text-emerald-700 font-medium">Presensi</span>
          </div>
        </div>

        {/* 5. Belum Hadir Hari Ini */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Belum Hadir
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200 text-amber-700">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
              {stats.tidakHadirHariIni}
            </span>
            <span className="ml-1.5 text-xs text-amber-700 font-medium">Siswa</span>
          </div>
        </div>

        {/* 6. Total Record Absensi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Absensi
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalAbsensi}
            </span>
            <span className="ml-1.5 text-xs text-slate-400 font-medium">Record</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Aksi Cepat Sistem
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('absensi')}
            className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-left hover:bg-sky-100/70 transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Buka Scanner
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Kamera Barcode</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('peserta')}
            className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 text-left hover:bg-indigo-100/70 transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Tambah Peserta
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Pendaftaran Baru</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('kartu')}
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-left hover:bg-emerald-100/70 transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Kartu Peserta
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Download & Cetak</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('laporan')}
            className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 text-left hover:bg-purple-100/70 transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Laporan & Export
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Excel & PDF</p>
            </div>
          </button>
        </div>
      </div>

      {/* Progress & Distribution Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance Percentage Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Tingkat Kehadiran Hari Ini
            </h3>
            <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
              {attendancePercentage}% Hadir
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, attendancePercentage)}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              <strong className="text-slate-900">{stats.absensiHariIni}</strong> dari{' '}
              <strong className="text-slate-900">{stats.totalPeserta}</strong> siswa telah presensi
            </span>
            <span>
              {stats.tidakHadirHariIni} siswa belum hadir
            </span>
          </div>
        </div>

        {/* Program Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Komposisi Program Kursus
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Paket Office Pemula (Rp300.000)</span>
                <span className="font-bold">{stats.paketOfficePemula} Siswa</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{
                    width: stats.totalPeserta > 0
                      ? `${(stats.paketOfficePemula / stats.totalPeserta) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Paket Office + Desain (Rp400.000)</span>
                <span className="font-bold">{stats.paketOfficeDesain} Siswa</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{
                    width: stats.totalPeserta > 0
                      ? `${(stats.paketOfficeDesain / stats.totalPeserta) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Attendance Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Aktivitas Presensi Terbaru
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              5 rekaman presensi barcode terakhir
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('monitoring')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {stats.recentAbsensi && stats.recentAbsensi.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Nomor Murid</th>
                  <th className="px-5 py-3">Nama Peserta</th>
                  <th className="px-5 py-3">Program</th>
                  <th className="px-5 py-3">Shift</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentAbsensi.map((item, idx) => (
                  <tr key={item.idAbsensi || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-600">
                      {item.tanggal} {item.waktu}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-sky-600">
                      {item.nomorMurid}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {item.namaPeserta}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {item.programKelas}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {item.shift}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        {item.statusPresensi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <ClipboardCheck className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-medium text-slate-500">
              Belum ada riwayat absensi.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Gunakan Sistem Absensi untuk mulai memindai barcode siswa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
