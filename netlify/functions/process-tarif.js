const ExcelJS = require('exceljs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Fungsi untuk mengurai nilai harga dari Excel
function parsePrice(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || null;
}

// Fungsi untuk memformat angka menjadi format Rupiah (tanpa "Rp")
function formatRp(num) {
  if (num === null || num === undefined) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

// Fungsi utama untuk memproses data dari buffer Excel
async function processExcelData(excelBuffer) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer);
    
    // --- PERUBAHAN DI SINI ---
    // Menggunakan metode yang lebih andal untuk mendapatkan worksheet pertama
    const sheet = workbook.worksheets[0]; 
    
    if (!sheet) {
      throw new Error('Worksheet tidak ditemukan di dalam file Excel.');
    }

    const headerRow = sheet.getRow(1);
    const headers = {};
    
    headerRow.eachCell((cell, colNumber) => {
      const headerText = (cell.text || '').trim().toUpperCase();
      headers[headerText] = colNumber;
    });

    // Validasi kolom yang wajib ada
    const colClass = headers['CLASS'];
    const colCode = headers['CODE'] || headers['KODE'];
    const colName = headers['NAME'] || headers['NAMA'];
    const colPrice = headers['PRICE UPLOAD'] || headers['PRICE'] || headers['HARGA'];

    if (!colClass || !colCode || !colName || !colPrice) {
      throw new Error(`Kolom wajib tidak ditemukan. Pastikan file Excel memiliki kolom: CLASS, CODE/KODE, NAME/NAMA, dan PRICE UPLOAD/PRICE/HARGA. Ditemukan: ${Object.keys(headers).join(', ')}`);
    }

    // Kelompokkan data berdasarkan Kode dan Nama Pemeriksaan
    const grouped = {};
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // Lewati baris header
      
      const code = (row.getCell(colCode).text || '').trim();
      const name = (row.getCell(colName).text || '').trim();
      const kelas = (row.getCell(colClass).text || '').trim().toUpperCase();
      const price = parsePrice(row.getCell(colPrice).value);

      if (!code || !name || !kelas) return;

      const key = `${code}|${name}`;
      if (!grouped[key]) {
        grouped[key] = { 
          code, 
          name, 
          OPD: null, ED: null, 'KELAS 3': null, 
          'KELAS 2': null, 'KELAS 1': null, VIP: null, VVIP: null 
        };
      }
      
      if (Object.keys(grouped[key]).includes(kelas)) {
          grouped[key][kelas] = price;
      }
    });
    
    // Konversi hasil pengelompokan menjadi array
    return Object.values(grouped);
    
  } catch (error) {
    console.error('Error saat memproses Excel:', error);
    throw new Error(`Gagal memproses file Excel: ${error.message}`);
  }
}

// Fungsi baru untuk generate PDF menggunakan pdf-lib
async function generatePdfFromData(rows) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const title = 'BUKU TARIF LABORATORIUM';
  const titleSize = 16;
  const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 40,
    font: boldFont,
    size: titleSize,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Pengaturan Tabel
  const tableTop = height - 70;
  const tableLeft = 40;
  const rowHeight = 20;
  const headerHeight = 25;

  const colWidths = [60, 220, 60, 60, 60, 60, 60, 60, 60];
  const headers = ['Kode', 'Nama Pemeriksaan', 'OPD', 'ED', 'Kelas 3', 'Kelas 2', 'Kelas 1', 'VIP', 'VVIP'];

  // Fungsi untuk menggambar baris tabel
  function drawRow(rowData, y, isHeader = false) {
    let currentX = tableLeft;
    const currentFont = isHeader ? boldFont : font;
    const fontSize = isHeader ? 9 : 8;

    if (isHeader) {
      page.drawRectangle({
        x: tableLeft, y: y - 5, width: colWidths.reduce((a, b) => a + b),
        height: headerHeight, color: rgb(0.94, 0.94, 0.94),
      });
    }

    rowData.forEach((text, i) => {
      const isNumeric = !isHeader && i > 1;
      const textWidth = currentFont.widthOfTextAtSize(text, fontSize);
      
      let textX = currentX + 5;
      if (isNumeric) {
        textX = currentX + colWidths[i] - textWidth - 5;
      }

      page.drawText(text, {
        x: textX, y: y + (isHeader ? 5 : 2),
        font: currentFont, size: fontSize, color: rgb(0, 0, 0),
      });
      currentX += colWidths[i];
    });
  }

  // Gambar Header
  drawRow(headers, tableTop, true);

  // Gambar Isi Tabel
  let currentY = tableTop - headerHeight;
  rows.forEach(dataRow => {
    const rowContent = [
      dataRow.code || '',
      dataRow.name || '',
      formatRp(dataRow.OPD),
      formatRp(dataRow.ED),
      formatRp(dataRow['KELAS 3']),
      formatRp(dataRow['KELAS 2']),
      formatRp(dataRow['KELAS 1']),
      formatRp(dataRow.VIP),
      formatRp(dataRow.VVIP),
    ];
    drawRow(rowContent, currentY);
    currentY -= rowHeight;
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Main handler untuk Netlify Function
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      throw new Error("Request body kosong.");
    }
    
    const body = JSON.parse(event.body);
    if (!body.file) {
        throw new Error("Request body tidak valid, 'file' base64 tidak ditemukan.");
    }
    
    const excelBuffer = Buffer.from(body.file, 'base64');
    const processedData = await processExcelData(excelBuffer);

    if (processedData.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Tidak ada data valid yang ditemukan di file Excel.' })
      };
    }
    
    const pdfBuffer = await generatePdfFromData(processedData);
    const pdfBase64 = pdfBuffer.toString('base64');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'File berhasil diproses',
        pdf: `data:application/pdf;base64,${pdfBase64}`,
        count: processedData.length
      })
    };

  } catch (error) {
    console.error('❌ Error dalam handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error.message })
    };
  }
};