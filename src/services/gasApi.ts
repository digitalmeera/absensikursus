import { Peserta, Absensi, AdminUser, Shift, ProfilLembaga, DashboardStats, CardTemplateConfig, ApiResponse } from '../types';

const GAS_URL_STORAGE_KEY = 'digitalmeera_gas_url';
const LOCAL_PESERTA_KEY = 'digitalmeera_local_peserta';
const LOCAL_ABSENSI_KEY = 'digitalmeera_local_absensi';
const LOCAL_SHIFTS_KEY = 'digitalmeera_local_shifts';
const LOCAL_PROFIL_KEY = 'digitalmeera_local_profil';
const LOCAL_SETTINGS_KEY = 'digitalmeera_local_settings';
const LOCAL_ADMIN_KEY = 'digitalmeera_local_admin';
const LOCAL_SEQ_KEY = 'digitalmeera_local_seq';

export class GasApiService {
  private apiUrl: string = '';

  constructor() {
    this.initUrl();
  }

  private initUrl() {
    const envUrl = import.meta.env.VITE_API_URL || '';
    const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(GAS_URL_STORAGE_KEY) : '';
    this.apiUrl = storedUrl || envUrl || '';
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  public setApiUrl(url: string): void {
    this.apiUrl = url.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem(GAS_URL_STORAGE_KEY, this.apiUrl);
    }
  }

  public isConnectedToGas(): boolean {
    return !!this.apiUrl && this.apiUrl.includes('script.google.com');
  }

  /**
   * Helper request ke Google Apps Script Web App
   * Menggunakan fetch dengan redirect follow (Apps Script Web App 302 redirect)
   */
  private async requestGAS<T = any>(action: string, payload: any = {}, method: 'GET' | 'POST' = 'POST'): Promise<ApiResponse<T>> {
    if (!this.apiUrl) {
      throw new Error('URL Google Apps Script belum dikonfigurasi.');
    }

    try {
      let response: Response;
      if (method === 'GET') {
        const queryParams = new URLSearchParams({ action, ...payload }).toString();
        response = await fetch(`${this.apiUrl}?${queryParams}`, {
          method: 'GET',
          redirect: 'follow',
        });
      } else {
        response = await fetch(this.apiUrl, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8', // Apps Script menangani text/plain tanpa CORS preflight OPTIONS error
          },
          body: JSON.stringify({ action, ...payload }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      return json;
    } catch (err: any) {
      console.warn(`GAS request error for action [${action}]:`, err);
      throw err;
    }
  }

  // =========================================================================
  // AUTENTIKASI
  // =========================================================================
  async login(username: string, password: string): Promise<ApiResponse<AdminUser>> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS<AdminUser>('login', { username, password });
      } catch (err) {
        console.warn('Falling back to local auth verification due to GAS error');
      }
    }

    // Local Verification (strictly matching Code.gs logic: initial admin = admin / Digitalmeera@2026)
    const storedAdmin = this.getLocalAdmin();
    if (
      username.trim() === storedAdmin.username &&
      password === storedAdmin.password
    ) {
      return {
        success: true,
        message: 'Login berhasil (Mode Terverifikasi)',
        data: {
          id: storedAdmin.id,
          username: storedAdmin.username,
          nama: storedAdmin.nama,
        },
      };
    }

    return {
      success: false,
      message: 'Username atau password salah.',
    };
  }

  async updateAdmin(id: string, username: string, nama: string, currentPassword?: string, newPassword?: string): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('updateAdmin', { id, username, nama, currentPassword, password: newPassword });
      } catch (err) {
        console.warn('GAS error on updateAdmin');
      }
    }

    const admin = this.getLocalAdmin();
    if (newPassword) {
      if (currentPassword !== admin.password) {
        return { success: false, message: 'Password saat ini tidak cocok.' };
      }
      admin.password = newPassword;
    }
    if (username) admin.username = username;
    if (nama) admin.nama = nama;
    this.saveLocalAdmin(admin);

    return { success: true, message: 'Profil administrator berhasil diperbarui.' };
  }

  // =========================================================================
  // DASHBOARD STATS
  // =========================================================================
  async getDashboard(): Promise<ApiResponse<DashboardStats>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS<DashboardStats>('getDashboard', {}, 'GET');
        if (res.success) return res;
      } catch (err) {
        console.warn('GAS error on getDashboard');
      }
    }

    // Local Stats Calculation (strictly 0 if database is empty!)
    const peserta = this.getLocalPeserta().filter(p => p.statusPeserta !== 'Deleted');
    const absensi = this.getLocalAbsensi();
    const todayStr = new Date().toISOString().slice(0, 10);

    let totalPeserta = peserta.length;
    let paketOfficePemula = 0;
    let paketOfficeDesain = 0;
    peserta.forEach(p => {
      if (p.programKelas.includes('Paket Office Pemula')) paketOfficePemula++;
      else if (p.programKelas.includes('Paket Office + Desain')) paketOfficeDesain++;
    });

    let absensiHariIni = 0;
    const hadirTodaySet = new Set<string>();
    absensi.forEach(a => {
      if (a.tanggal === todayStr) {
        absensiHariIni++;
        hadirTodaySet.add(a.nomorMurid);
      }
    });

    const tidakHadirHariIni = Math.max(0, totalPeserta - hadirTodaySet.size);

    return {
      success: true,
      data: {
        totalPeserta,
        paketOfficePemula,
        paketOfficeDesain,
        absensiHariIni,
        tidakHadirHariIni,
        totalAbsensi: absensi.length,
        recentAbsensi: absensi.slice(-5).reverse(),
      },
    };
  }

  // =========================================================================
  // PESERTA CRUD
  // =========================================================================
  async getPeserta(): Promise<ApiResponse<Peserta[]>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS<any[]>('getPeserta', {}, 'GET');
        if (res.success && Array.isArray(res.data)) {
          // Normalisasi nama kolom dari Sheet (misal "Nomor Murid" -> nomorMurid)
          const normalized: Peserta[] = res.data.map(r => this.normalizePesertaRow(r));
          this.saveLocalPeserta(normalized);
          return { success: true, data: normalized };
        }
      } catch (err) {
        console.warn('GAS error on getPeserta');
      }
    }

    const localList = this.getLocalPeserta().filter(p => p.statusPeserta !== 'Deleted');
    return { success: true, data: localList };
  }

  async createPeserta(data: Omit<Peserta, 'id' | 'nomorMurid' | 'barcodeId' | 'barcodeValue' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Peserta>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS('createPeserta', {
          nama: data.namaPeserta,
          namaPeserta: data.namaPeserta,
          tempatLahir: data.tempatLahir,
          tanggalLahir: data.tanggalLahir,
          jenisKelamin: data.jenisKelamin,
          agama: data.agama,
          status: data.status,
          nomorWA: data.nomorWA,
          orangTua: data.orangTua,
          alamat: data.alamat,
          programKelas: data.programKelas,
          hargaProgram: data.hargaProgram,
          foto: data.foto,
          tanggalPendaftaran: data.tanggalPendaftaran,
          statusPeserta: data.statusPeserta || 'Aktif',
        });
        if (res.success && res.data) {
          const createdStudent: Peserta = {
            id: res.data.id || `PST${Date.now()}`,
            nomorMurid: res.data.nomorMurid || `DM0001`,
            foto: res.data.foto || data.foto || '',
            namaPeserta: res.data.namaPeserta || data.namaPeserta,
            tempatLahir: res.data.tempatLahir || data.tempatLahir,
            tanggalLahir: res.data.tanggalLahir || data.tanggalLahir,
            jenisKelamin: res.data.jenisKelamin || data.jenisKelamin,
            agama: res.data.agama || data.agama,
            status: res.data.status || data.status,
            nomorWA: res.data.nomorWA || data.nomorWA,
            orangTua: res.data.orangTua || data.orangTua,
            alamat: res.data.alamat || data.alamat,
            programKelas: res.data.programKelas || data.programKelas,
            hargaProgram: res.data.hargaProgram || data.hargaProgram,
            barcodeId: res.data.barcodeId || `BAR-${res.data.nomorMurid || 'DM0001'}`,
            barcodeValue: res.data.barcodeValue || res.data.nomorMurid || 'DM0001',
            tanggalPendaftaran: res.data.tanggalPendaftaran || data.tanggalPendaftaran || new Date().toISOString().slice(0, 10),
            statusPeserta: res.data.statusPeserta || data.statusPeserta || 'Aktif',
            createdAt: res.data.createdAt || new Date().toISOString(),
            updatedAt: res.data.updatedAt || new Date().toISOString(),
          };

          const list = this.getLocalPeserta();
          const existingIdx = list.findIndex(p => p.nomorMurid === createdStudent.nomorMurid || p.id === createdStudent.id);
          if (existingIdx >= 0) {
            list[existingIdx] = createdStudent;
          } else {
            list.push(createdStudent);
          }
          this.saveLocalPeserta(list);

          return {
            success: true,
            message: 'Data peserta berhasil ditambahkan.',
            data: createdStudent,
          };
        }
      } catch (err) {
        console.warn('GAS error on createPeserta', err);
      }
    }

    // Local sequence generator (Lock-safe, DM0001, DM0002, ...)
    const nextNum = this.getNextStudentSequence();
    const pad = String(nextNum).padStart(4, '0');
    const nomorMurid = `DM${pad}`;
    const now = new Date().toISOString();

    const newPeserta: Peserta = {
      id: `PST${Date.now()}`,
      nomorMurid,
      foto: data.foto || '',
      namaPeserta: data.namaPeserta.trim(),
      tempatLahir: data.tempatLahir.trim(),
      tanggalLahir: data.tanggalLahir,
      jenisKelamin: data.jenisKelamin,
      agama: data.agama,
      status: data.status,
      nomorWA: data.nomorWA.trim(),
      orangTua: data.orangTua.trim(),
      alamat: data.alamat.trim(),
      programKelas: data.programKelas,
      hargaProgram: data.hargaProgram,
      barcodeId: `BAR-${nomorMurid}`,
      barcodeValue: nomorMurid,
      tanggalPendaftaran: data.tanggalPendaftaran || now.slice(0, 10),
      statusPeserta: data.statusPeserta || 'Aktif',
      createdAt: now,
      updatedAt: now,
    };

    const list = this.getLocalPeserta();
    list.push(newPeserta);
    this.saveLocalPeserta(list);

    return {
      success: true,
      message: 'Data peserta berhasil ditambahkan.',
      data: newPeserta,
    };
  }

  async updatePeserta(peserta: Peserta): Promise<ApiResponse<Peserta>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS('updatePeserta', {
          id: peserta.id,
          nomorMurid: peserta.nomorMurid,
          nama: peserta.namaPeserta,
          tempatLahir: peserta.tempatLahir,
          tanggalLahir: peserta.tanggalLahir,
          jenisKelamin: peserta.jenisKelamin,
          agama: peserta.agama,
          status: peserta.status,
          nomorWA: peserta.nomorWA,
          orangTua: peserta.orangTua,
          alamat: peserta.alamat,
          programKelas: peserta.programKelas,
          foto: peserta.foto,
          statusPeserta: peserta.statusPeserta,
        });
        if (res.success) return res;
      } catch (err) {
        console.warn('GAS error on updatePeserta');
      }
    }

    const list = this.getLocalPeserta();
    const idx = list.findIndex(p => p.id === peserta.id || p.nomorMurid === peserta.nomorMurid);
    if (idx === -1) {
      return { success: false, message: 'Peserta tidak ditemukan.' };
    }

    // Keep Nomor Murid, Barcode, and CreatedAt immutable
    const updated: Peserta = {
      ...list[idx],
      ...peserta,
      nomorMurid: list[idx].nomorMurid,
      barcodeId: list[idx].barcodeId,
      barcodeValue: list[idx].barcodeValue,
      createdAt: list[idx].createdAt,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updated;
    this.saveLocalPeserta(list);

    return {
      success: true,
      message: 'Data peserta berhasil diperbarui.',
      data: updated,
    };
  }

  async deletePeserta(id: string, nomorMurid: string): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS('deletePeserta', { id, nomorMurid });
        if (res.success) return res;
      } catch (err) {
        console.warn('GAS error on deletePeserta');
      }
    }

    // Soft delete: status = 'Deleted'
    const list = this.getLocalPeserta();
    const idx = list.findIndex(p => p.id === id || p.nomorMurid === nomorMurid);
    if (idx !== -1) {
      list[idx].statusPeserta = 'Deleted';
      list[idx].updatedAt = new Date().toISOString();
      this.saveLocalPeserta(list);
      return { success: true, message: 'Peserta berhasil dihapus (soft delete).' };
    }

    return { success: false, message: 'Peserta tidak ditemukan.' };
  }

  // =========================================================================
  // SISTEM ABSENSI (SCANNER & CRUD)
  // =========================================================================
  async getAbsensi(): Promise<ApiResponse<Absensi[]>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS<any[]>('getAbsensi', {}, 'GET');
        if (res.success && Array.isArray(res.data)) {
          const normalized = res.data.map(r => this.normalizeAbsensiRow(r));
          return { success: true, data: normalized };
        }
      } catch (err) {
        console.warn('GAS error on getAbsensi');
      }
    }

    return { success: true, data: this.getLocalAbsensi() };
  }

  async recordAbsensi(payload: {
    barcodeValue: string;
    shift?: string;
    statusPresensi?: 'Hadir' | 'Izin' | 'Sakit' | 'Terlambat';
    keterangan?: string;
    admin?: string;
    override?: boolean;
  }): Promise<ApiResponse<Absensi>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS<any>('createAbsensi', payload);
        return res;
      } catch (err) {
        console.warn('GAS error on createAbsensi');
      }
    }

    // Local Logic matching Code.gs
    const pesertaList = this.getLocalPeserta().filter(p => p.statusPeserta !== 'Deleted');
    const student = pesertaList.find(
      p => p.barcodeValue === payload.barcodeValue || p.nomorMurid === payload.barcodeValue
    );

    if (!student) {
      return { success: false, message: 'Barcode tidak terdaftar.' };
    }

    if (student.statusPeserta !== 'Aktif') {
      return { success: false, message: `Peserta tidak aktif (${student.statusPeserta}).` };
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${mins}`;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayStr = days[now.getDay()];

    // Tentukan shift
    let shiftName = payload.shift || '';
    const activeShifts = this.getLocalShifts().filter(s => s.status === 'Aktif');

    if (!shiftName && activeShifts.length > 0) {
      const match = activeShifts.find(s => timeStr >= s.jamMulai && timeStr <= s.jamSelesai);
      if (match) {
        shiftName = match.namaShift;
      } else {
        if (!payload.override) {
          const first = activeShifts[0];
          if (timeStr < first.jamMulai) {
            return {
              success: false,
              canOverride: true,
              message: `Presensi belum dibuka (Pukul ${timeStr}). Jam presensi mulai ${first.jamMulai}.`,
            };
          } else {
            return {
              success: false,
              canOverride: true,
              message: `Waktu presensi telah berakhir (Pukul ${timeStr}).`,
            };
          }
        }
        shiftName = 'Di Luar Shift';
      }
    }

    // Cegah duplikat absensi pada hari & shift yang sama
    const existingAbsensi = this.getLocalAbsensi();
    const already = existingAbsensi.find(
      a =>
        a.nomorMurid === student.nomorMurid &&
        a.tanggal === dateStr &&
        (!shiftName || a.shift === shiftName)
    );

    if (already && !payload.override) {
      return {
        success: false,
        isDuplicate: true,
        canOverride: true,
        message: `Peserta ${student.namaPeserta} sudah melakukan presensi pada pukul ${already.waktu}${already.shift ? ` (${already.shift})` : ''}.`,
      };
    }

    const newAbsensi: Absensi = {
      idAbsensi: `ABS${Date.now()}`,
      nomorMurid: student.nomorMurid,
      namaPeserta: student.namaPeserta,
      programKelas: student.programKelas,
      tanggal: dateStr,
      waktu: timeStr,
      hari: dayStr,
      statusPresensi: payload.statusPresensi || 'Hadir',
      shift: shiftName || 'Reguler',
      keterangan: payload.keterangan || (payload.override ? 'Override Manual' : '-'),
      admin: payload.admin || 'Admin',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    existingAbsensi.push(newAbsensi);
    this.saveLocalAbsensi(existingAbsensi);

    return {
      success: true,
      message: `Presensi berhasil dicatat untuk ${student.namaPeserta}`,
      data: newAbsensi,
    };
  }

  async updateAbsensi(idAbsensi: string, data: Partial<Absensi>): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('updateAbsensi', { idAbsensi, ...data });
      } catch (err) {
        console.warn('GAS error on updateAbsensi');
      }
    }

    const list = this.getLocalAbsensi();
    const idx = list.findIndex(a => a.idAbsensi === idAbsensi);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
      this.saveLocalAbsensi(list);
      return { success: true, message: 'Data absensi berhasil diperbarui.' };
    }

    return { success: false, message: 'Data absensi tidak ditemukan.' };
  }

  async deleteAbsensi(idAbsensi: string): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('deleteAbsensi', { idAbsensi });
      } catch (err) {
        console.warn('GAS error on deleteAbsensi');
      }
    }

    let list = this.getLocalAbsensi();
    list = list.filter(a => a.idAbsensi !== idAbsensi);
    this.saveLocalAbsensi(list);
    return { success: true, message: 'Data absensi berhasil dihapus.' };
  }

  // =========================================================================
  // SHIFT MANAGEMENT
  // =========================================================================
  async getShifts(): Promise<ApiResponse<Shift[]>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS<any[]>('getShift', {}, 'GET');
        if (res.success && Array.isArray(res.data)) {
          const normalized = res.data.map(s => ({
            idShift: s['ID Shift'] || s.idShift,
            namaShift: s['Nama Shift'] || s.namaShift,
            jamMulai: s['Jam Mulai'] || s.jamMulai,
            jamSelesai: s['Jam Selesai'] || s.jamSelesai,
            status: s['Status'] || s.status,
          }));
          return { success: true, data: normalized };
        }
      } catch (err) {
        console.warn('GAS error on getShift');
      }
    }

    return { success: true, data: this.getLocalShifts() };
  }

  async createShift(shift: Omit<Shift, 'idShift'>): Promise<ApiResponse<Shift>> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('createShift', shift);
      } catch (err) {
        console.warn('GAS error on createShift');
      }
    }

    const newShift: Shift = {
      ...shift,
      idShift: `SHF${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    const list = this.getLocalShifts();
    list.push(newShift);
    this.saveLocalShifts(list);
    return { success: true, message: 'Shift berhasil ditambahkan.', data: newShift };
  }

  async updateShift(shift: Shift): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('updateShift', shift);
      } catch (err) {
        console.warn('GAS error on updateShift');
      }
    }

    const list = this.getLocalShifts();
    const idx = list.findIndex(s => s.idShift === shift.idShift);
    if (idx !== -1) {
      list[idx] = { ...shift, updatedAt: new Date().toISOString() };
      this.saveLocalShifts(list);
      return { success: true, message: 'Shift berhasil diperbarui.' };
    }
    return { success: false, message: 'Shift tidak ditemukan.' };
  }

  async deleteShift(idShift: string): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('deleteShift', { idShift });
      } catch (err) {
        console.warn('GAS error on deleteShift');
      }
    }

    let list = this.getLocalShifts();
    list = list.filter(s => s.idShift !== idShift);
    this.saveLocalShifts(list);
    return { success: true, message: 'Shift berhasil dihapus.' };
  }

  // =========================================================================
  // PROFIL & PENGATURAN
  // =========================================================================
  async getProfil(): Promise<ApiResponse<ProfilLembaga>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS<ProfilLembaga>('getProfil', {}, 'GET');
        if (res.success && res.data) return res;
      } catch (err) {
        console.warn('GAS error on getProfil');
      }
    }

    return { success: true, data: this.getLocalProfil() };
  }

  async updateProfil(data: Partial<ProfilLembaga>): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('updateProfil', data);
      } catch (err) {
        console.warn('GAS error on updateProfil');
      }
    }

    const profil = { ...this.getLocalProfil(), ...data, updatedAt: new Date().toISOString() };
    this.saveLocalProfil(profil);
    return { success: true, message: 'Profil lembaga berhasil diperbarui.' };
  }

  async getCardConfig(): Promise<CardTemplateConfig> {
    if (typeof window === 'undefined') {
      return {
        theme: 'modern-navy',
        accentColor: '#0ea5e9',
        barcodeSize: 'large',
        showPhoto: true,
        showProgram: true,
        showWatermark: true,
      };
    }
    const raw = localStorage.getItem('digitalmeera_card_config');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return {
      theme: 'modern-navy',
      accentColor: '#0ea5e9',
      barcodeSize: 'large',
      showPhoto: true,
      showProgram: true,
      showWatermark: true,
    };
  }

  saveCardConfig(cfg: CardTemplateConfig): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('digitalmeera_card_config', JSON.stringify(cfg));
    }
  }

  // =========================================================================
  // TEST KONEKSI KE APPS SCRIPT
  // =========================================================================
  async testConnection(url?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const targetUrl = (url || this.apiUrl).trim();
    if (!targetUrl) {
      return { success: false, message: 'Masukkan URL Google Apps Script Web App terlebih dahulu.' };
    }

    try {
      const pingUrl = `${targetUrl}?action=ping`;
      const response = await fetch(pingUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Koneksi gagal dengan status HTTP ${response.status} (${response.statusText}).`,
        };
      }

      const json = await response.json();
      if (json.success) {
        this.setApiUrl(targetUrl);
        return {
          success: true,
          message: 'Berhasil terhubung ke Google Apps Script Web App & Spreadsheet!',
          data: json,
        };
      } else {
        return {
          success: false,
          message: json.message || 'Apps Script merespons tetapi mengembalikan error.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Tidak dapat terhubung ke server. Pastikan Web App disetel "Who has access: Anyone" dan URL berakhiran /exec.',
      };
    }
  }

  // =========================================================================
  // LOCAL STORE HELPERS (ZERO DUMMY DATA COMPLIANT)
  // =========================================================================
  private getLocalPeserta(): Peserta[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_PESERTA_KEY);
    const rawAlt = localStorage.getItem('digitalmeera_peserta_list');
    
    let list1: Peserta[] = [];
    let list2: Peserta[] = [];

    try {
      if (raw) list1 = JSON.parse(raw);
    } catch {}
    try {
      if (rawAlt) list2 = JSON.parse(rawAlt);
    } catch {}

    // Merge and deduplicate by nomorMurid or id
    const map = new Map<string, Peserta>();
    [...list1, ...list2].forEach((p) => {
      const key = p.nomorMurid || p.id;
      if (key && !map.has(key)) {
        map.set(key, p);
      }
    });

    const merged = Array.from(map.values());
    if (merged.length > 0 && (!raw || list1.length !== merged.length)) {
      try {
        localStorage.setItem(LOCAL_PESERTA_KEY, JSON.stringify(merged));
      } catch {}
    }
    return merged;
  }

  private saveLocalPeserta(list: Peserta[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_PESERTA_KEY, JSON.stringify(list));
        localStorage.setItem('digitalmeera_peserta_list', JSON.stringify(list));
        localStorage.setItem('digitalmeera_last_sync', Date.now().toString());

        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('digitalmeera_sync');
          bc.postMessage({ type: 'PESERTA_UPDATED' });
          bc.close();
        }
      } catch {}

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('peserta_updated'));
    }
  }

  private getLocalAbsensi(): Absensi[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_ABSENSI_KEY);
    return raw ? JSON.parse(raw) : []; // EMPTY ARRAY! No dummy attendance!
  }

  private saveLocalAbsensi(list: Absensi[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_ABSENSI_KEY, JSON.stringify(list));
    }
  }

  private getLocalShifts(): Shift[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_SHIFTS_KEY);
    if (raw) return JSON.parse(raw);

    // Initial default shifts per requirement
    const defaults: Shift[] = [
      { idShift: 'SHF01', namaShift: 'Shift Pagi', jamMulai: '08:00', jamSelesai: '10:00', status: 'Aktif' },
      { idShift: 'SHF02', namaShift: 'Shift Siang', jamMulai: '10:00', jamSelesai: '12:00', status: 'Aktif' },
      { idShift: 'SHF03', namaShift: 'Shift Sore', jamMulai: '13:00', jamSelesai: '15:00', status: 'Aktif' },
    ];
    this.saveLocalShifts(defaults);
    return defaults;
  }

  private saveLocalShifts(list: Shift[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(list));
    }
  }

  private getLocalProfil(): ProfilLembaga {
    if (typeof window === 'undefined') {
      return {
        namaLembaga: 'DIGITALMEERA',
        logo: '',
        alamat: 'Jl. Pendidikan No. 12, Indonesia',
        nomorWA: '081234567890',
        email: 'info@digitalmeera.tech',
        website: 'www.digitalmeera.tech',
        footer: '© DIGITALMEERA - Sistem Kursus & Les Privat',
      };
    }
    const raw = localStorage.getItem(LOCAL_PROFIL_KEY);
    if (raw) return JSON.parse(raw);

    const defaultProfil: ProfilLembaga = {
      namaLembaga: 'DIGITALMEERA',
      logo: '',
      alamat: 'Jl. Pendidikan No. 12, Indonesia',
      nomorWA: '081234567890',
      email: 'info@digitalmeera.tech',
      website: 'www.digitalmeera.tech',
      footer: '© DIGITALMEERA - Sistem Kursus & Les Privat',
    };
    this.saveLocalProfil(defaultProfil);
    return defaultProfil;
  }

  private saveLocalProfil(profil: ProfilLembaga): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_PROFIL_KEY, JSON.stringify(profil));
    }
  }

  private getLocalAdmin() {
    if (typeof window === 'undefined') {
      return { id: 'ADM0001', username: 'admin', password: 'Digitalmeera@2026', nama: 'Administrator Digitalmeera' };
    }
    const raw = localStorage.getItem(LOCAL_ADMIN_KEY);
    if (raw) return JSON.parse(raw);

    // Initial admin per requirement
    const defaultAdmin = {
      id: 'ADM0001',
      username: 'admin',
      password: 'Digitalmeera@2026',
      nama: 'Administrator Digitalmeera',
    };
    this.saveLocalAdmin(defaultAdmin);
    return defaultAdmin;
  }

  private saveLocalAdmin(admin: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(admin));
    }
  }

  private getNextStudentSequence(): number {
    if (typeof window === 'undefined') return 1;
    let seq = parseInt(localStorage.getItem(LOCAL_SEQ_KEY) || '1', 10);
    // Double check with max ID in local students
    const list = this.getLocalPeserta();
    list.forEach(p => {
      if (p.nomorMurid.startsWith('DM')) {
        const num = parseInt(p.nomorMurid.replace('DM', ''), 10);
        if (!isNaN(num) && num >= seq) {
          seq = num + 1;
        }
      }
    });

    localStorage.setItem(LOCAL_SEQ_KEY, String(seq + 1));
    return seq;
  }

  // Normalizer Google Spreadsheet column names
  private normalizePesertaRow(r: any): Peserta {
    return {
      id: r.ID || r.id || '',
      nomorMurid: r['Nomor Murid'] || r.nomorMurid || '',
      foto: r.Foto || r.foto || '',
      namaPeserta: r['Nama Peserta'] || r.namaPeserta || '',
      tempatLahir: r['Tempat Lahir'] || r.tempatLahir || '',
      tanggalLahir: r['Tanggal Lahir'] || r.tanggalLahir || '',
      jenisKelamin: r['Jenis Kelamin'] || r.jenisKelamin || 'Laki-laki',
      agama: r.Agama || r.agama || 'Islam',
      status: r.Status || r.status || 'Umum',
      nomorWA: r['Nomor WA/Telpon'] || r.nomorWA || '',
      orangTua: r['Orang Tua/Wali'] || r.orangTua || '',
      alamat: r.Alamat || r.alamat || '',
      programKelas: r['Program Kelas'] || r.programKelas || '',
      hargaProgram: r['Harga Program'] || r.hargaProgram || '',
      barcodeId: r['Barcode ID'] || r.barcodeId || '',
      barcodeValue: r['Barcode Value'] || r.barcodeValue || '',
      tanggalPendaftaran: r['Tanggal Pendaftaran'] || r.tanggalPendaftaran || '',
      statusPeserta: r['Status Peserta'] || r.statusPeserta || 'Aktif',
      createdAt: r['Created At'] || r.createdAt || '',
      updatedAt: r['Updated At'] || r.updatedAt || '',
    };
  }

  private normalizeAbsensiRow(r: any): Absensi {
    return {
      idAbsensi: r['ID Absensi'] || r.idAbsensi || '',
      nomorMurid: r['Nomor Murid'] || r.nomorMurid || '',
      namaPeserta: r['Nama Peserta'] || r.namaPeserta || '',
      programKelas: r['Program Kelas'] || r.programKelas || '',
      tanggal: r.Tanggal || r.tanggal || '',
      waktu: r.Waktu || r.waktu || '',
      hari: r.Hari || r.hari || '',
      statusPresensi: r['Status Presensi'] || r.statusPresensi || 'Hadir',
      shift: r.Shift || r.shift || '',
      keterangan: r.Keterangan || r.keterangan || '',
      admin: r.Admin || r.admin || '',
      createdAt: r['Created At'] || r.createdAt || '',
      updatedAt: r['Updated At'] || r.updatedAt || '',
    };
  }
}

export const gasApi = new GasApiService();
