/**
 * SIKEU-UPPS — penyiapan awal.
 *
 * Buat satu Google Spreadsheet kosong, tempel Kode.gs dan Setup.gs, lalu
 * jalankan setupSpreadsheet() SATU KALI. Seluruh tab, header, master data,
 * dropdown validasi, dan format rupiah dibuat otomatis.
 *
 * Tidak ada kata sandi yang perlu dikelola: identitas berasal dari Google
 * Sign-In, dan sheet M_Pengguna hanya memetakan email ke peran.
 */

var SEED_SUMBER = [
  ['MHS',   'Mahasiswa',                   1],
  ['USAHA', 'Usaha sendiri',               2],
  ['PEM',   'Pemerintah (Pusat & Daerah)', 3],
  ['LAIN',  'Sumber Lain',                 4]
];

// Tujuh baris tetap Tabel 13. Kelompok "operasional" masuk sub-total pertama,
// "investasi" masuk sub-total kedua, persis seperti format borang.
var SEED_PENGGUNAAN = [
  ['P1', 1, 'Pendidikan',                   'operasional', 1],
  ['P2', 2, 'Penelitian',                   'operasional', 2],
  ['P3', 3, 'Pengabdian kepada masyarakat', 'operasional', 3],
  ['P4', 4, 'Investasi SDM',                'investasi',   4],
  ['P5', 5, 'Investasi sarana',             'investasi',   5],
  ['P6', 6, 'Investasi prasarana',          'investasi',   6],
  ['P7', 7, 'Lain-lain',                    'investasi',   7]
];

var SEED_JENIS_DANA = [
  ['JD01', 'MHS',   'PNBP',                  10],
  ['JD02', 'MHS',   'Ormawa',                20],
  ['JD03', 'USAHA', 'Kantin',                30],
  ['JD04', 'USAHA', 'KEPK',                  40],
  ['JD05', 'USAHA', 'Pengelolaan Jurnal',    50],
  ['JD06', 'USAHA', 'Renbis',                60],
  ['JD07', 'PEM',   'Gaji Dosen dan Tendik', 70],
  ['JD08', 'PEM',   'DIPA/DRPM',             80],
  ['JD09', 'PEM',   'Hibah lainnya',         90],
  ['JD10', 'PEM',   'Kerjasama',            100],
  ['JD11', 'LAIN',  'Beasiswa Dosen',       110],
  ['JD12', 'LAIN',  'Hibah lainnya',        120],
  ['JD13', 'LAIN',  'Kerjasama',            130]
];

var SEED_RINCIAN = [
  ['RC001', 'JD01', 'SPP Prodi Kesmas',                                              10],
  ['RC002', 'JD01', 'SPI Prodi Kesmas',                                              20],
  ['RC003', 'JD01', 'SPP Prodi Gizi',                                                30],
  ['RC004', 'JD01', 'SPI Prodi Gizi',                                                40],
  ['RC005', 'JD01', 'SPP Prodi S2 Adminkes',                                         50],
  ['RC006', 'JD01', 'SPI Prodi S2 Adminkes',                                         60],
  ['RC007', 'JD01', 'Dana Penelitian dan Pengabdian Internal, Buku Ajar, HKI/Paten', 70],
  ['RC008', 'JD01', 'Remunerasi Dosen',                                              80],
  ['RC009', 'JD01', 'Remunerasi Tendik',                                             90],
  ['RC010', 'JD01', 'Gaji Dosen',                                                   100],
  ['RC011', 'JD01', 'Gaji Tendik',                                                  110],
  ['RC012', 'JD01', 'Uang Makan Kontrak',                                           120],
  ['RC013', 'JD08', 'Gaji Dosen ASN',                                               130],
  ['RC014', 'JD08', 'Gaji Tendik ASN',                                              140],
  ['RC015', 'JD08', 'Dana Kementerian: Penelitian',                                 150],
  ['RC016', 'JD08', 'Dana Kementerian: Hibah Alat/Gedung',                          160],
  ['RC017', 'JD08', 'Dana Kementerian: Beasiswa Pendidikan',                        170],
  ['RC018', 'JD08', 'Dana Kementerian: Lain',                                       180],
  ['RC019', 'JD12', 'Hibah Penelitian',                                             190],
  ['RC020', 'JD12', 'Konsultan',                                                    200],
  ['RC021', 'JD12', 'Hibah Alumni/Swasta',                                          210]
];

var SEED_TAHUN = [
  [2021, '',     true],
  [2022, '',     true],
  [2023, 'TS-2', true],
  [2024, 'TS-1', true],
  [2025, 'TS',   true]
];

var SEED_PARAMETER = [
  ['nama_upps',        'UPPS', 'Nama Unit Pengelola Program Studi, tampil di dashboard dan cetakan borang'],
  ['jenis_pt',         'PTN',  'PTN atau PTS. Menentukan rumus skor butir 5.1.1'],
  ['jumlah_dosen',     '55',   'Jumlah dosen tetap. Penyebut skor 5.1.2.3 dan 5.1.2.4'],
  ['jumlah_mahasiswa', '1501', 'Jumlah mahasiswa aktif. Penyebut skor 5.1.2.1'],
  ['sumber_operator',  '*',    'Kode sumber dana yang boleh diinput operator, dipisah koma. Isi * untuk semua'],
  ['dashboard_publik', 'tidak', 'Isi "ya" bila dashboard boleh dilihat tanpa login']
];

// ============================================================== penyiapan

function setupSpreadsheet() {
  var bk = SpreadsheetApp.getActive();

  Object.keys(SKEMA).forEach(function (nama) {
    var s = bk.getSheetByName(nama);
    if (!s) s = bk.insertSheet(nama);
    if (s.getLastRow() === 0) s.getRange(1, 1, 1, SKEMA[nama].length).setValues([SKEMA[nama]]);
    s.getRange(1, 1, 1, SKEMA[nama].length)
      .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
    s.setFrozenRows(1);
  });

  isiJikaKosong('M_Sumber', SEED_SUMBER);
  isiJikaKosong('M_JenisPenggunaan', SEED_PENGGUNAAN);
  isiJikaKosong('M_JenisDana', SEED_JENIS_DANA.map(function (r) { return [r[0], r[1], r[2], r[3], true, '']; }));
  isiJikaKosong('M_Rincian', SEED_RINCIAN.map(function (r) { return [r[0], r[1], r[2], r[3], true]; }));
  isiJikaKosong('M_Tahun', SEED_TAHUN);
  isiJikaKosong('M_Parameter', SEED_PARAMETER);
  var kabarAdmin = seedAdmin();

  pasangValidasi();
  rapikanTampilan();

  var pesan =
    'Penyiapan selesai.\n\n' +
    'Tab yang dibuat: ' + Object.keys(SKEMA).join(', ') + '\n\n' +
    (kabarAdmin ? kabarAdmin + '\n  (login lewat Google Sign-In, tanpa kata sandi)\n\n' : '') +
    'Langkah berikutnya:\n' +
    '  1. Deploy > New deployment > Web app\n' +
    '     Execute as: Me   |   Who has access: Anyone\n' +
    '  2. Salin URL /exec ke config.js di repositori GitHub Pages Anda.\n' +
    '  3. Impor data/transaksi.csv ke tab Transaksi bila ingin memuat data lama.';

  Logger.log(pesan);
  try {
    SpreadsheetApp.getUi().alert('SIKEU-UPPS', pesan, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) { /* dijalankan tanpa UI */ }
  return pesan;
}

function isiJikaKosong(nama, baris) {
  var s = SpreadsheetApp.getActive().getSheetByName(nama);
  if (s.getLastRow() > 1 || !baris.length) return;
  s.getRange(2, 1, baris.length, baris[0].length).setValues(baris);
}

/**
 * Admin pertama adalah akun yang menjalankan setup ini — yaitu pemilik skrip.
 *
 * Sengaja tidak ada daftar email di dalam kode, karena berkas ini tersimpan di
 * repositori publik. Admin berikutnya ditambahkan lewat halaman Kelola Master.
 */
function seedAdmin() {
  var s = SpreadsheetApp.getActive().getSheetByName('M_Pengguna');
  if (s.getLastRow() > 1) return '';

  var email = '';
  try { email = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (err) {}
  if (!email) {
    return 'PERINGATAN: email pemilik skrip tidak terbaca, jadi belum ada admin. ' +
           'Tambahkan sendiri satu baris di sheet M_Pengguna: email Anda, nama, "admin", TRUE.';
  }
  s.getRange(2, 1, 1, SKEMA.M_Pengguna.length).setValues([[
    email, email.split('@')[0], 'admin', true, sekarang(), '', 'Admin pertama (pemilik skrip)'
  ]]);
  return 'Admin pertama: ' + email;
}

/** Dropdown pada tab Transaksi supaya penyuntingan manual tetap terkendali. */
function pasangValidasi() {
  var bk = SpreadsheetApp.getActive();
  var t = bk.getSheetByName('Transaksi');
  var kolom = indeksKolom('Transaksi');
  var akhir = Math.max(t.getMaxRows() - 1, 500);

  function daftar(nilai) {
    return SpreadsheetApp.newDataValidation().requireValueInList(nilai, true)
      .setAllowInvalid(false).build();
  }

  t.getRange(2, kolom.sumber_kode, akhir, 1).setDataValidation(
    daftar(baca('M_Sumber').map(function (r) { return String(r.kode); })));
  t.getRange(2, kolom.penggunaan_kode, akhir, 1).setDataValidation(
    daftar(baca('M_JenisPenggunaan').map(function (r) { return String(r.kode); })));
  t.getRange(2, kolom.skema, akhir, 1).setDataValidation(daftar(['Mandiri', 'Kerjasama']));
  t.getRange(2, kolom.status, akhir, 1).setDataValidation(
    daftar([STATUS.DRAFT, STATUS.DIAJUKAN, STATUS.TERVERIFIKASI, STATUS.DITOLAK]));

  var p = bk.getSheetByName('M_Pengguna');
  var kp = indeksKolom('M_Pengguna');
  p.getRange(2, kp.peran, Math.max(p.getMaxRows() - 1, 200), 1).setDataValidation(
    daftar([PERAN.ADMIN, PERAN.VERIFIKATOR, PERAN.OPERATOR, PERAN.PUBLIK]));

  var jp = bk.getSheetByName('M_JenisPenggunaan');
  var kj = indeksKolom('M_JenisPenggunaan');
  jp.getRange(2, kj.kelompok, Math.max(jp.getMaxRows() - 1, 50), 1).setDataValidation(
    daftar(['operasional', 'investasi']));
}

function rapikanTampilan() {
  var bk = SpreadsheetApp.getActive();
  var t = bk.getSheetByName('Transaksi');
  var kolom = indeksKolom('Transaksi');

  t.getRange(2, kolom.jumlah, Math.max(t.getMaxRows() - 1, 500), 1).setNumberFormat('#,##0');
  t.getRange(2, kolom.tanggal, Math.max(t.getMaxRows() - 1, 500), 1).setNumberFormat('yyyy-mm-dd');
  t.setColumnWidth(kolom.uraian, 380);
  t.setColumnWidth(kolom.catatan, 240);

  bk.getSheetByName('M_Sumber').getRange('A1').setNote(
    'TETAP. Empat sumber dana ini adalah baris Tabel 12 sesuai format borang. Jangan ditambah atau diubah.');
  bk.getSheetByName('M_JenisPenggunaan').getRange('A1').setNote(
    'TETAP. Tujuh jenis penggunaan ini adalah baris Tabel 13 sesuai format borang. Jangan ditambah atau diubah.');
  bk.getSheetByName('M_JenisDana').getRange('F1').setNote(
    'gabung_ke: isi dengan kode jenis dana lain untuk menyatukan dua kategori yang bermakna sama. ' +
    'Bersifat non-destruktif dan reversibel — transaksi tetap menyimpan kode aslinya, ' +
    'hanya pelaporannya yang dialihkan. Kosongkan untuk melepas penggabungan.');
  bk.getSheetByName('M_Pengguna').getRange('A1').setNote(
    'Sheet ini memetakan email ke peran, BUKAN menyimpan kredensial. ' +
    'Identitas berasal dari Google Sign-In sehingga email tidak dapat dipalsukan.');
}

// ================================================ pemeriksaan & pemeliharaan

/** Periksa integritas data: acuan yatim, siklus penggabungan, nilai janggal. */
function periksaData() {
  var peta = petaJenisDana();
  var sd = {}, pg = {}, th = {}, rc = {};
  baca('M_Sumber').forEach(function (r) { sd[String(r.kode).trim()] = r; });
  baca('M_JenisPenggunaan').forEach(function (r) { pg[String(r.kode).trim()] = r; });
  baca('M_Tahun').forEach(function (r) { th[angka(r.tahun)] = r; });
  baca('M_Rincian').forEach(function (r) { rc[String(r.kode).trim()] = r; });

  var masalah = [];

  // Header tiap sheet diperiksa lebih dulu. Impor CSV dengan "Ganti lembar
  // saat ini" menimpa sheet yang sedang AKTIF, sehingga data mudah mendarat di
  // tab yang salah. Gejalanya membingungkan kalau tidak dinamai terus terang.
  Object.keys(SKEMA).forEach(function (nama) {
    var s = SpreadsheetApp.getActive().getSheetByName(nama);
    if (!s) { masalah.push('Sheet "' + nama + '" tidak ada'); return; }
    var header = s.getRange(1, 1, 1, Math.max(s.getLastColumn(), 1)).getValues()[0]
      .map(function (h) { return String(h).trim(); });
    var harus = SKEMA[nama];
    var cocok = harus.every(function (k, i) { return header[i] === k; });
    if (!cocok) {
      masalah.push('Sheet "' + nama + '" headernya tidak sesuai. Seharusnya diawali: ' +
        harus.slice(0, 4).join(', ') + ' ... — tetapi terbaca: ' +
        header.slice(0, 4).join(', ') +
        (header[0] === 'id' && nama !== 'Transaksi'
          ? '  >>> sepertinya data Transaksi ter-impor ke tab ini. Hapus tab ini, klik tab ' +
            'Transaksi lebih dulu, impor ulang, lalu jalankan Siapkan spreadsheet.'
          : ''));
    }
  });

  // Siklus penggabungan diperiksa lebih dulu karena merusak seluruh agregasi.
  Object.keys(peta).forEach(function (k) {
    try { ujungGabung(k, peta); }
    catch (err) { masalah.push('M_JenisDana ' + k + ': ' + err.message); }
  });
  Object.keys(peta).forEach(function (k) {
    var j = peta[k];
    if (j.gabung_ke && !peta[j.gabung_ke]) {
      masalah.push('M_JenisDana ' + k + ': gabung_ke menunjuk kode "' + j.gabung_ke + '" yang tidak ada');
    }
    if (j.gabung_ke && peta[j.gabung_ke] && peta[j.gabung_ke].sumber_kode !== j.sumber_kode) {
      masalah.push('M_JenisDana ' + k + ': digabungkan lintas sumber dana');
    }
  });

  var hitung = { total: 0, draft: 0, diajukan: 0, terverifikasi: 0, ditolak: 0, tinjau: 0 };
  baca('Transaksi').forEach(function (t) {
    if (!t.id) return;
    hitung.total++;
    var st = String(t.status || '').toLowerCase();
    if (hitung.hasOwnProperty(st)) hitung[st]++;
    else masalah.push(t.id + ': status "' + t.status + '" tidak dikenal');
    if (benar(t.perlu_tinjau)) hitung.tinjau++;

    var jd = String(t.jenis_dana_kode).trim();
    if (!sd[String(t.sumber_kode).trim()]) masalah.push(t.id + ': sumber dana "' + t.sumber_kode + '" tidak ada');
    if (!peta[jd]) masalah.push(t.id + ': jenis dana "' + jd + '" tidak ada di master');
    else if (peta[jd].sumber_kode !== String(t.sumber_kode).trim()) {
      masalah.push(t.id + ': jenis dana ' + jd + ' bukan milik sumber ' + t.sumber_kode);
    }
    if (t.rincian_kode && !rc[String(t.rincian_kode).trim()]) {
      masalah.push(t.id + ': rincian "' + t.rincian_kode + '" tidak ada');
    }
    if (!pg[String(t.penggunaan_kode).trim()]) masalah.push(t.id + ': jenis penggunaan "' + t.penggunaan_kode + '" tidak ada');
    if (!th[angka(t.tahun)]) masalah.push(t.id + ': tahun ' + t.tahun + ' tidak ada di M_Tahun');
    if (!(angka(t.jumlah) > 0)) masalah.push(t.id + ': jumlah dana kosong atau nol');
    if (!String(t.dibuat_oleh).trim()) masalah.push(t.id + ': tidak ada dibuat_oleh, jejak audit terputus');
  });

  var lap = 'PEMERIKSAAN DATA SIKEU-UPPS\n' +
    '  Total transaksi   : ' + hitung.total + '\n' +
    '  draft             : ' + hitung.draft + '\n' +
    '  diajukan          : ' + hitung.diajukan + '\n' +
    '  terverifikasi     : ' + hitung.terverifikasi + '  <- hanya ini yang masuk Tabel 12 & 13\n' +
    '  ditolak           : ' + hitung.ditolak + '\n' +
    '  perlu ditinjau    : ' + hitung.tinjau + '\n' +
    '  masalah ditemukan : ' + masalah.length + '\n';
  if (masalah.length) lap += '\n' + masalah.slice(0, 50).join('\n');
  if (masalah.length > 50) lap += '\n... dan ' + (masalah.length - 50) + ' lainnya.';

  Logger.log(lap);
  try {
    SpreadsheetApp.getUi().alert('Pemeriksaan Data', lap, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) { /* tanpa UI */ }
  return lap;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SIKEU')
    .addItem('Siapkan spreadsheet (jalankan sekali)', 'setupSpreadsheet')
    .addItem('Periksa data', 'periksaData')
    .addSeparator()
    .addItem('Kosongkan cache', 'hapusCache')
    .addToUi();
}
