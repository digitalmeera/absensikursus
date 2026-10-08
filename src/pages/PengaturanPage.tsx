import React, { useState, useEffect } from 'react';
import { ProfilLembaga, Shift, CardTemplateConfig, AdminUser } from '../types';
import { gasApi } from '../services/gasApi';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { 
  User, 
  Building2, 
  Clock, 
  CreditCard, 
  FileText, 
  Upload, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Link2, 
  Save, 
  RefreshCw,
  Code2
} from 'lucide-react';

interface PengaturanPageProps {
  profil: ProfilLembaga;
  onProfilUpdated: (p: ProfilLembaga) => void;
  adminUser: AdminUser;
  onAdminUpdated: (admin: AdminUser) => void;
  onOpenCodeModal: () => void;
  onOpenGasModal: () => void;
}

export const PengaturanPage: React.FC<PengaturanPageProps> = ({
  profil,
  onProfilUpdated,
  adminUser,
  onAdminUpdated,
  onOpenCodeModal,
  onOpenGasModal,
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'lembaga' | 'shift' | 'kartu' | 'backend'>('admin');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Tab A: Admin State
  const [adminUsername, setAdminUsername] = useState<string>(adminUser.username);
  const [adminNama, setAdminNama] = useState<string>(adminUser.nama);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [adminSaving, setAdminSaving] = useState<boolean>(false);
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab B: Lembaga State
  const [namaLembaga, setNamaLembaga] = useState<string>(profil.namaLembaga);
  const [logo, setLogo] = useState<string>(profil.logo || '');
  const [alamat, setAlamat] = useState<string>(profil.alamat);
  const [nomorWA, setNomorWA] = useState<string>(profil.nomorWA);
  const [email, setEmail] = useState<string>(profil.email);
  const [website, setWebsite] = useState<string>(profil.website);
  const [footer, setFooter] = useState<string>(profil.footer);
  const [lembagaSaving, setLembagaSaving] = useState<boolean>(false);

  // Tab C: Shift State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftModalOpen, setShiftModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftNama, setShiftNama] = useState<string>('');
  const [shiftJamMulai, setShiftJamMulai] = useState<string>('08:00');
  const [shiftJamSelesai, setShiftJamSelesai] = useState<string>('10:00');
  const [shiftStatus, setShiftStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  // Tab D: Kartu Config State
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig>({
    theme: 'modern-navy',
    accentColor: '#0ea5e9',
    barcodeSize: 'large',
    showPhoto: true,
    showProgram: true,
    showWatermark: true,
  });

  // Tab E: Backend GAS URL
  const [gasUrl, setGasUrl] = useState<string>(gasApi.getApiUrl());
  const [testingGas, setTestingGas] = useState<boolean>(false);

  useEffect(() => {
    // Load shifts & card config
    const load = async () => {
      const [sRes, cCfg] = await Promise.all([
        gasApi.getShifts(),
        gasApi.getCardConfig(),
      ]);
      if (sRes.success && sRes.data) setShifts(sRes.data);
      if (cCfg) setCardConfig(cCfg);
    };
    load();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Submit Admin Profile
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setAdminMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setAdminSaving(true);
    try {
      const res = await gasApi.updateAdmin(
        adminUser.id,
        adminUsername,
        adminNama,
        currentPassword,
        newPassword || undefined
      );

      if (res.success) {
        setAdminMsg({ type: 'success', text: 'Profil administrator berhasil disimpan.' });
        onAdminUpdated({ ...adminUser, username: adminUsername, nama: adminNama });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setAdminMsg({ type: 'error', text: res.message || 'Gagal menyimpan profil.' });
      }
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setAdminSaving(false);
    }
  };

  // Submit Profil Lembaga
  const handleSaveLembaga = async (e: React.FormEvent) => {
    e.preventDefault();
    setLembagaSaving(true);
    try {
      const updated: ProfilLembaga = {
        namaLembaga,
        logo,
        alamat,
        nomorWA,
        email,
        website,
        footer,
      };
      const res = await gasApi.updateProfil(updated);
      if (res.success) {
        onProfilUpdated(updated);
        showToast('Identitas lembaga berhasil diperbarui.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLembagaSaving(false);
    }
  };

  // Upload Logo Lembaga
  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Shift CRUD Handlers
  const handleOpenAddShift = () => {
    setEditingShift(null);
    setShiftNama('');
    setShiftJamMulai('08:00');
    setShiftJamSelesai('10:00');
    setShiftStatus('Aktif');
    setShiftModalOpen(true);
  };

  const handleOpenEditShift = (s: Shift) => {
    setEditingShift(s);
    setShiftNama(s.namaShift);
    setShiftJamMulai(s.jamMulai);
    setShiftJamSelesai(s.jamSelesai);
    setShiftStatus(s.status);
    setShiftModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftNama.trim()) return;

    if (editingShift) {
      const res = await gasApi.updateShift({
        ...editingShift,
        namaShift: shiftNama.trim(),
        jamMulai: shiftJamMulai,
        jamSelesai: shiftJamSelesai,
        status: shiftStatus,
      });
      if (res.success) {
        showToast('Shift berhasil diperbarui.');
        setShiftModalOpen(false);
        const sRes = await gasApi.getShifts();
        if (sRes.success && sRes.data) setShifts(sRes.data);
      }
    } else {
      const res = await gasApi.createShift({
        namaShift: shiftNama.trim(),
        jamMulai: shiftJamMulai,
        jamSelesai: shiftJamSelesai,
        status: shiftStatus,
      });
      if (res.success) {
        showToast('Shift baru berhasil ditambahkan.');
        setShiftModalOpen(false);
        const sRes = await gasApi.getShifts();
        if (sRes.success && sRes.data) setShifts(sRes.data);
      }
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    const res = await gasApi.deleteShift(shiftToDelete.idShift);
    if (res.success) {
      showToast('Shift berhasil dihapus.');
      setShiftToDelete(null);
      const sRes = await gasApi.getShifts();
      if (sRes.success && sRes.data) setShifts(sRes.data);
    }
  };

  // Save Card Config
  const handleSaveCardConfig = () => {
    gasApi.saveCardConfig(cardConfig);
    showToast('Konfigurasi template kartu berhasil disimpan.');
  };

  // Test GAS URL
  const handleTestGas = async () => {
    setTestingGas(true);
    const res = await gasApi.testConnection(gasUrl);
    setTestingGas(false);
    showToast(res.message);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Pengaturan Sistem
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Konfigurasi akun administrator, identitas lembaga, jam shift presensi, template kartu, dan API backend.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'admin'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profil Admin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lembaga')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'lembaga'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Identitas Lembaga</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shift')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'shift'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Jam Presensi & Shift</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kartu')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'kartu'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Template Kartu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backend')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'backend'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Link2 className="h-4 w-4" />
          <span>Koneksi Google Spreadsheet</span>
        </button>
      </div>

      {/* TAB A: PROFIL ADMIN */}
      {activeTab === 'admin' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Akun & Keamanan Administrator
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Ganti username atau password administrator untuk menjaga keamanan sistem.
          </p>

          {adminMsg && (
            <div
              className={`mb-5 flex items-start gap-2.5 rounded-xl p-3 text-xs ${
                adminMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {adminMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <p className="font-medium">{adminMsg.text}</p>
            </div>
          )}

          <form onSubmit={handleSaveAdmin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Username Admin
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Nama Lengkap Administrator
              </label>
              <input
                type="text"
                value={adminNama}
                onChange={(e) => setAdminNama(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Ubah Password (Kosongkan jika tidak ingin mengganti)
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Password Saat Ini</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini jika ganti password..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={adminSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{adminSaving ? 'Menyimpan...' : 'Simpan Profil Admin'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB B: IDENTITAS LEMBAGA */}
      {activeTab === 'lembaga' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Identitas Lembaga Digitalmeera
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Nama lembaga dan logo ini akan ditampilkan pada kop laporan, kartu peserta, login, dan header.
          </p>

          <form onSubmit={handleSaveLembaga} className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Logo Digitalmeera
              </label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {logo ? (
                    <img src={logo} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="font-bold text-sm text-slate-400">DM</span>
                  )}
                </div>
                <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                  Ganti Logo
                  <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                </label>
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo('')}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Nama Lembaga
              </label>
              <input
                type="text"
                value={namaLembaga}
                onChange={(e) => setNamaLembaga(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Alamat Lembaga
              </label>
              <textarea
                rows={2}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={nomorWA}
                  onChange={(e) => setNomorWA(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Teks Footer Website
              </label>
              <input
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={lembagaSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{lembagaSaving ? 'Menyimpan...' : 'Simpan Identitas Lembaga'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB C: JAM PRESENSI & SHIFT */}
      {activeTab === 'shift' && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pengaturan Jam Batas Presensi & Shift
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Barcode yang discan akan otomatis mencocokkan jadwal shift yang berlaku.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddShift}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Shift</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID Shift</th>
                  <th className="px-4 py-3">Nama Shift</th>
                  <th className="px-4 py-3">Jam Mulai</th>
                  <th className="px-4 py-3">Jam Selesai</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((s) => (
                  <tr key={s.idShift} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{s.idShift}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.namaShift}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-sky-700">{s.jamMulai}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-sky-700">{s.jamSelesai}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          s.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditShift(s)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShiftToDelete(s)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB D: TEMPLATE KARTU PESERTA */}
      {activeTab === 'kartu' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-3xl space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pengaturan Tampilan Kartu Peserta
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubah tema warna, palet, dan gaya kartu peserta kursus.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Pilih Tema Desain Kartu
              </label>
              <select
                value={cardConfig.theme}
                onChange={(e) => setCardConfig({ ...cardConfig, theme: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="modern-navy">Modern Navy (Slate & Sky Blue)</option>
                <option value="emerald-green">Emerald Green (Deep Green & Mint)</option>
                <option value="royal-indigo">Royal Indigo (Deep Indigo & Violet)</option>
                <option value="crimson-amber">Crimson Amber (Deep Red & Warm Gold)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Ukuran Barcode
              </label>
              <select
                value={cardConfig.barcodeSize}
                onChange={(e) => setCardConfig({ ...cardConfig, barcodeSize: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="large">Besar (Rekomendasi Scanner Kamera)</option>
                <option value="normal">Standar Normal</option>
              </select>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={handleSaveCardConfig}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Pengaturan Kartu</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB E: BACKEND SPREADSHEET URL */}
      {activeTab === 'backend' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Koneksi Google Spreadsheet & Apps Script
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Frontend Vercel terhubung ke Google Apps Script Web App untuk membaca dan menyimpan data secara real-time.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Google Apps Script Web App URL
            </label>
            <input
              type="text"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfyc.../exec"
              className="w-full rounded-xl border border-slate-300 font-mono text-xs px-3.5 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleTestGas}
              disabled={testingGas}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {testingGas ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              <span>Uji & Hubungkan Spreadsheet</span>
            </button>

            <button
              type="button"
              onClick={onOpenCodeModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Code2 className="h-4 w-4 text-indigo-600" />
              <span>Lihat Source Code.gs</span>
            </button>
          </div>
        </div>
      )}

      {/* Shift Form Modal */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title={editingShift ? 'Edit Shift Presensi' : 'Tambah Shift Baru'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveShift} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nama Shift
            </label>
            <input
              type="text"
              value={shiftNama}
              onChange={(e) => setShiftNama(e.target.value)}
              placeholder="Contoh: Shift Pagi"
              required
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Jam Mulai
              </label>
              <input
                type="text"
                value={shiftJamMulai}
                onChange={(e) => setShiftJamMulai(e.target.value)}
                placeholder="08:00"
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Jam Selesai
              </label>
              <input
                type="text"
                value={shiftJamSelesai}
                onChange={(e) => setShiftJamSelesai(e.target.value)}
                placeholder="10:00"
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Status Shift
            </label>
            <select
              value={shiftStatus}
              onChange={(e) => setShiftStatus(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShiftModalOpen(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              Simpan Shift
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Shift Dialog */}
      <ConfirmDialog
        isOpen={!!shiftToDelete}
        onClose={() => setShiftToDelete(null)}
        onConfirm={handleDeleteShift}
        title="Hapus Shift"
        message={`Apakah Anda yakin ingin menghapus ${shiftToDelete?.namaShift}?`}
        confirmText="Hapus Shift"
        cancelText="Batal"
      />
    </div>
  );
};
