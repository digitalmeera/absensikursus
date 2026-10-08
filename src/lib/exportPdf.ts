import jsPDF from 'jspdf';
import { Peserta, Absensi, ProfilLembaga, CardTemplateConfig } from '../types';
import { generateBarcodeDataUrl } from './barcode';

const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 53.98;

/**
 * Download kartu peserta tunggal dalam format PDF (85.60 mm x 53.98 mm)
 */
export async function downloadSingleCardPdf(
  peserta: Peserta,
  profil: ProfilLembaga,
  config?: CardTemplateConfig
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
  });

  await renderCardOnPdfPage(doc, peserta, profil, config);
  doc.save(`Kartu_${peserta.nomorMurid}_${peserta.namaPeserta.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Download semua kartu peserta dalam satu file PDF multi-halaman
 */
export async function downloadAllCardsPdf(
  pesertaList: Peserta[],
  profil: ProfilLembaga,
  config?: CardTemplateConfig
): Promise<void> {
  if (pesertaList.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
  });

  for (let i = 0; i < pesertaList.length; i++) {
    if (i > 0) {
      doc.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape');
    }
    await renderCardOnPdfPage(doc, pesertaList[i], profil, config);
  }

  doc.save(`Kartu_Semua_Peserta_Digitalmeera_${Date.now()}.pdf`);
}

/**
 * Render satu kartu peserta pada halaman PDF
 */
async function renderCardOnPdfPage(
  doc: jsPDF,
  peserta: Peserta,
  profil: ProfilLembaga,
  config?: CardTemplateConfig
): Promise<void> {
  const theme = config?.theme || 'modern-navy';

  // Palette warna background
  let primaryColor = [15, 23, 42]; // Slate 900
  let accentColor = [14, 165, 233]; // Sky 500
  let ribbonColor = [30, 41, 59]; // Slate 800

  if (theme === 'emerald-green') {
    primaryColor = [6, 78, 59];
    accentColor = [16, 185, 129];
    ribbonColor = [4, 120, 87];
  } else if (theme === 'royal-indigo') {
    primaryColor = [49, 46, 129];
    accentColor = [99, 102, 241];
    ribbonColor = [67, 56, 202];
  } else if (theme === 'crimson-amber') {
    primaryColor = [127, 29, 29];
    accentColor = [245, 158, 11];
    ribbonColor = [153, 27, 27];
  }

  // 1. Background Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, 'F');

  // Decorative Accent bar top
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, CARD_WIDTH_MM, 2.5, 'F');

  // Inner card body container
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(3, 14, CARD_WIDTH_MM - 6, CARD_HEIGHT_MM - 17, 2, 2, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(profil.namaLembaga || 'DIGITALMEERA', 5, 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(226, 232, 240);
  doc.text('KARTU PESERTA KURSUS & LES PRIVAT', 5, 11.5);

  // Logo / Emblem right top
  doc.setFillColor(ribbonColor[0], ribbonColor[1], ribbonColor[2]);
  doc.roundedRect(CARD_WIDTH_MM - 24, 4, 20, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('OFFICIAL CARD', CARD_WIDTH_MM - 21.5, 9);

  // 2. Foto Siswa
  const photoX = 6;
  const photoY = 17;
  const photoW = 18;
  const photoH = 22;

  // Frame Foto
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(photoX, photoY, photoW, photoH, 1, 1, 'D');

  if (peserta.foto && peserta.foto.startsWith('data:image')) {
    try {
      doc.addImage(peserta.foto, 'JPEG', photoX + 0.3, photoY + 0.3, photoW - 0.6, photoH - 0.6);
    } catch {
      drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH, peserta.namaPeserta);
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH, peserta.namaPeserta);
  }

  // 3. Info Siswa
  const infoX = 27;
  let currentY = 19;

  // Nama Peserta
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const truncatedNama = peserta.namaPeserta.length > 22 ? peserta.namaPeserta.substring(0, 22) + '...' : peserta.namaPeserta;
  doc.text(truncatedNama, infoX, currentY);

  // Nomor Murid Badge
  currentY += 4.5;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(infoX, currentY - 3, 24, 4.2, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(peserta.nomorMurid, infoX + 2, currentY);

  // Program Kelas
  currentY += 4.5;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('PROGRAM KELAS:', infoX, currentY);

  currentY += 3.2;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const truncatedProgram = peserta.programKelas.length > 30 ? peserta.programKelas.substring(0, 30) + '...' : peserta.programKelas;
  doc.text(truncatedProgram, infoX, currentY);

  // Status Peserta badge
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(CARD_WIDTH_MM - 24, 18, 18, 4, 1, 1, 'F');
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('AKTIF', CARD_WIDTH_MM - 18, 20.8);

  // 4. Barcode Code 128
  const barcodeDataUrl = generateBarcodeDataUrl(peserta.nomorMurid, {
    width: 2,
    height: 48,
    displayValue: true,
    fontSize: 12,
    margin: 4,
  });

  if (barcodeDataUrl) {
    try {
      // Area barcode landscape di bagian bawah kartu
      const barX = 7;
      const barY = 39.5;
      const barW = CARD_WIDTH_MM - 14;
      const barH = 9.5;

      doc.addImage(barcodeDataUrl, 'PNG', barX, barY, barW, barH);
    } catch (err) {
      console.error('Failed to add barcode image to PDF', err);
    }
  }

  // Footer micro text
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  doc.text(profil.website || 'digitalmeera.com', CARD_WIDTH_MM / 2, CARD_HEIGHT_MM - 1.2, { align: 'center' });
}

function drawPhotoPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number, name: string) {
  doc.setFillColor(241, 245, 249);
  doc.rect(x + 0.3, y + 0.3, w - 0.6, h - 0.6, 'F');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'DM';
  doc.text(initials, x + w / 2, y + h / 2 + 3, { align: 'center' });
}

/**
 * Render kartu ke resolusi tinggi Canvas lalu download sebagai file JPG
 */
export async function downloadCardAsJpg(
  peserta: Peserta,
  profil: ProfilLembaga,
  config?: CardTemplateConfig
): Promise<void> {
  const canvas = document.createElement('canvas');
  const scale = 3; // 300 DPI high-res
  const width = Math.round(CARD_WIDTH_MM * 11.81 * scale); // ~1011 px * 3
  const height = Math.round(CARD_HEIGHT_MM * 11.81 * scale); // ~638 px * 3

  canvas.width = 1012;
  canvas.height = 638;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const theme = config?.theme || 'modern-navy';
  let primaryGrad1 = '#0f172a';
  let primaryGrad2 = '#1e293b';
  let accentColor = '#0ea5e9';

  if (theme === 'emerald-green') {
    primaryGrad1 = '#064e3b';
    primaryGrad2 = '#065f46';
    accentColor = '#10b981';
  } else if (theme === 'royal-indigo') {
    primaryGrad1 = '#312e81';
    primaryGrad2 = '#3730a3';
    accentColor = '#6366f1';
  } else if (theme === 'crimson-amber') {
    primaryGrad1 = '#7f1d1d';
    primaryGrad2 = '#991b1b';
    accentColor = '#f59e0b';
  }

  // 1. Background
  const grad = ctx.createLinearGradient(0, 0, 1012, 638);
  grad.addColorStop(0, primaryGrad1);
  grad.addColorStop(1, primaryGrad2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1012, 638);

  // Top accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 1012, 16);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(profil.namaLembaga || 'DIGITALMEERA', 40, 72);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 18px sans-serif';
  ctx.fillText('KARTU PESERTA KURSUS & LES PRIVAT', 40, 105);

  // Inner card body container
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundRect(ctx, 36, 130, 940, 470, 18);
  ctx.fill();

  // Photo
  const photoX = 64;
  const photoY = 160;
  const photoW = 200;
  const photoH = 240;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  let photoLoaded = false;
  if (peserta.foto && peserta.foto.startsWith('data:image')) {
    try {
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, photoX, photoY, photoW, photoH);
          photoLoaded = true;
          resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = peserta.foto;
      });
    } catch {
      // fallback
    }
  }

  if (!photoLoaded) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    const initials = peserta.namaPeserta.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'DM';
    ctx.fillText(initials, photoX + photoW / 2, photoY + photoH / 2 + 18);
    ctx.textAlign = 'left';
  }

  // Student details
  const infoX = 300;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(peserta.namaPeserta, infoX, 205);

  // Student ID Badge
  ctx.fillStyle = accentColor;
  roundRect(ctx, infoX, 230, 220, 48, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(peserta.nomorMurid, infoX + 22, 263);

  // Program Kelas
  ctx.fillStyle = '#64748b';
  ctx.font = '600 18px sans-serif';
  ctx.fillText('PROGRAM KELAS', infoX, 315);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(peserta.programKelas, infoX, 350);

  // Barcode
  const barcodeUrl = generateBarcodeDataUrl(peserta.nomorMurid, {
    width: 3,
    height: 70,
    displayValue: true,
    fontSize: 18,
    margin: 8,
  });

  if (barcodeUrl) {
    const barImg = new Image();
    await new Promise((resolve) => {
      barImg.onload = () => {
        ctx.drawImage(barImg, 64, 420, 884, 150);
        resolve(true);
      };
      barImg.onerror = () => resolve(false);
      barImg.src = barcodeUrl;
    });
  }

  const link = document.createElement('a');
  link.download = `Kartu_${peserta.nomorMurid}_${peserta.namaPeserta.replace(/\s+/g, '_')}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Export Laporan Rekap Absensi ke PDF format A4
 */
export function exportAbsensiToPdf(
  data: Absensi[],
  profil: ProfilLembaga,
  periodInfo: string
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Lembaga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(profil.namaLembaga || 'DIGITALMEERA', pageWidth / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(profil.alamat || 'Lembaga Kursus & Les Privat Komputer', pageWidth / 2, 23, { align: 'center' });
  doc.text(`WA: ${profil.nomorWA || '-'} | Email: ${profil.email || '-'} | ${profil.website || '-'}`, pageWidth / 2, 27, { align: 'center' });

  // Garis Pemisah Kop
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(14, 30, pageWidth - 14, 30);

  // Judul Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN PRESENSI & KEHADIRAN SISWA', 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Periode: ${periodInfo}`, 14, 43);
  doc.text(`Total Kehadiran: ${data.length} data`, pageWidth - 14, 43, { align: 'right' });

  // Tabel Header
  let tableY = 48;
  const colX = [14, 22, 42, 57, 75, 120, 150, 172]; // column X coordinates
  const rowHeight = 7;

  doc.setFillColor(30, 41, 59);
  doc.rect(14, tableY, pageWidth - 28, rowHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('No', 16, tableY + 4.8);
  doc.text('Tanggal', 24, tableY + 4.8);
  doc.text('Waktu', 44, tableY + 4.8);
  doc.text('ID Siswa', 59, tableY + 4.8);
  doc.text('Nama Peserta', 77, tableY + 4.8);
  doc.text('Program', 122, tableY + 4.8);
  doc.text('Shift', 152, tableY + 4.8);
  doc.text('Status', 174, tableY + 4.8);

  tableY += rowHeight;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  data.forEach((item, index) => {
    if (tableY > 260) {
      doc.addPage();
      tableY = 20;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, pageWidth - 28, rowHeight, 'F');
    }

    doc.setTextColor(51, 65, 85);
    doc.text((index + 1).toString(), 16, tableY + 4.8);
    doc.text(item.tanggal, 24, tableY + 4.8);
    doc.text(item.waktu, 44, tableY + 4.8);
    doc.text(item.nomorMurid, 59, tableY + 4.8);

    const nameTrunc = item.namaPeserta.length > 24 ? item.namaPeserta.substring(0, 24) + '...' : item.namaPeserta;
    doc.text(nameTrunc, 77, tableY + 4.8);

    const progTrunc = item.programKelas.length > 18 ? item.programKelas.substring(0, 18) + '...' : item.programKelas;
    doc.text(progTrunc, 122, tableY + 4.8);
    doc.text(item.shift, 152, tableY + 4.8);

    // Status color
    if (item.statusPresensi === 'Hadir') {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(239, 68, 68);
    }
    doc.text(item.statusPresensi, 174, tableY + 4.8);

    tableY += rowHeight;
  });

  // Tanda Tangan
  if (tableY > 240) {
    doc.addPage();
    tableY = 20;
  }
  tableY += 12;

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Dicetak pada: ${todayStr}`, 14, tableY);

  doc.text(`Mengetahui,`, pageWidth - 60, tableY);
  doc.text(`Pimpinan Kursus DIGITALMEERA`, pageWidth - 60, tableY + 4);
  doc.text(`( .................................................. )`, pageWidth - 60, tableY + 24);

  doc.save(`Laporan_Absensi_Digitalmeera_${Date.now()}.pdf`);
}
