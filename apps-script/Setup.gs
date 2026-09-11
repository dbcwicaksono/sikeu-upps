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

// Kategori hibah dirampingkan menjadi satu "Hibah" per sumber dana (lihat
// rampingkanHibah). DIPA/DRPM dan Hibah lainnya tetap ada sebagai kategori
// yang digabungkan, karena data lama di data/transaksi.csv memakai kodenya.
// Isian ini sama persis dengan hasil rampingkanHibah() pada spreadsheet lama.
var SEED_JENIS_DANA = [
  // kode   sumber   nama                   urutan  gabung_ke
  ['JD01', 'MHS',   'PNBP',                  10, ''],
  ['JD02', 'MHS',   'Ormawa',                20, ''],
  ['JD03', 'USAHA', 'Kantin',                30, ''],
  ['JD04', 'USAHA', 'KEPK',                  40, ''],
  ['JD05', 'USAHA', 'Pengelolaan Jurnal',    50, ''],
  ['JD06', 'USAHA', 'Renbis',                60, ''],
  ['JD07', 'PEM',   'Gaji Dosen dan Tendik', 70, ''],
  ['JD08', 'PEM',   'DIPA/DRPM',             80, 'JD14'],
  ['JD09', 'PEM',   'Hibah lainnya',         90, 'JD14'],
  ['JD10', 'PEM',   'Kerjasama',            100, ''],
  ['JD11', 'LAIN',  'Beasiswa Dosen',       110, ''],
  ['JD12', 'LAIN',  'Hibah lainnya',        120, 'JD15'],
  ['JD13', 'LAIN',  'Kerjasama',            130, ''],
  ['JD14', 'PEM',   'Hibah',                 80, ''],
  ['JD15', 'LAIN',  'Hibah',                120, '']
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
  // DIPA/DRPM tidak mencakup gaji, jadi rincian gaji ASN berada di bawah Gaji Dosen dan Tendik.
  ['RC013', 'JD07', 'Gaji Dosen ASN',                                               130],
  ['RC014', 'JD07', 'Gaji Tendik ASN',                                              140],
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
  ['pendaftaran_otomatis', 'tidak', 'Bawaannya "tidak": hanya email yang tercantum di M_Pengguna yang boleh masuk. Isi "ya" bila pemilik email berdomain kampus boleh terdaftar sendiri sebagai operator'],
  ['dashboard_publik', 'tidak', 'Isi "ya" bila dashboard boleh dilihat tanpa login'],
  ['dana_mahasiswa',   '',     'Total dana mahasiswa per tahun dari laporan keuangan universitas, mis. 2023=1.234.567.890; 2024=2.345.678.901. Dipakai menu SIKEU > Rapikan PNBP']
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

  // Cadangan lebih dulu: sheet yang terisi dari cadangan tidak lagi disentuh isian awal di bawah.
  var pulih = pulihkanCadangan();

  isiJikaKosong('M_Sumber', SEED_SUMBER);
  isiJikaKosong('M_JenisPenggunaan', SEED_PENGGUNAAN);
  isiJikaKosong('M_JenisDana', SEED_JENIS_DANA.map(function (r) { return [r[0], r[1], r[2], r[3], true, r[4]]; }));
  isiJikaKosong('M_Rincian', SEED_RINCIAN.map(function (r) { return [r[0], r[1], r[2], r[3], true]; }));
  isiJikaKosong('M_Tahun', SEED_TAHUN);
  var paramBaru = lengkapiParameter();
  var kabarAdmin = seedAdmin();

  pasangValidasi();
  rapikanTampilan();

  var pesan =
    'Penyiapan selesai.\n\n' +
    (pulih
      ? 'Dipulihkan dari cadangan ' + pulih.dibuat + ':\n  ' + (pulih.diisi.join(', ') || '(tidak ada sheet kosong)') + '\n' +
        (pulih.dilewati.length ? '  Tidak ditimpa karena sudah berisi: ' + pulih.dilewati.join(', ') + '\n' : '') + '\n'
      : 'Tab yang dibuat: ' + Object.keys(SKEMA).join(', ') + '\n\n') +
    (kabarAdmin ? kabarAdmin + '\n  (login lewat Google Sign-In, tanpa kata sandi)\n\n' : '') +
    (paramBaru.length
      ? 'Parameter baru ditambahkan: ' + paramBaru.join(', ') + '\n' +
        '  Periksa nilainya di Kelola Master > Parameter Penilaian.\n\n' : '') +
    'Langkah berikutnya:\n' +
    '  1. Deploy > New deployment > Web app\n' +
    '     Execute as: Me   |   Who has access: Anyone\n' +
    '  2. Salin URL /exec ke config.js di repositori GitHub Pages Anda.' +
    (pulih ? '' : '\n  3. Untuk memuat data lama, tempel berkas Cadangan.gs ke proyek ini lalu jalankan fungsi ini lagi.');

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
 * Tambahkan kunci parameter yang belum ada, tanpa menyentuh yang sudah diisi.
 *
 * Berbeda dari master lain, daftar parameter bertambah seiring waktu. Kalau
 * hanya diisi saat sheet masih kosong, setiap parameter baru yang muncul di
 * versi berikutnya tidak akan pernah sampai ke spreadsheet yang sudah jalan —
 * dan pengelola harus menambahkannya manual tanpa tahu bahwa itu perlu.
 */
function lengkapiParameter() {
  var s = SpreadsheetApp.getActive().getSheetByName('M_Parameter');
  var ada = {};
  baca('M_Parameter').forEach(function (r) { ada[String(r.kunci).trim()] = true; });

  var kurang = SEED_PARAMETER.filter(function (p) { return !ada[p[0]]; });
  if (!kurang.length) return [];

  s.getRange(s.getLastRow() + 1, 1, kurang.length, 3).setValues(kurang);
  return kurang.map(function (p) { return p[0]; });
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

// ================================================== perampingan kategori

/** Nama jenis dana yang tergolong hibah. Kerjasama sengaja tidak termasuk. */
var POLA_HIBAH = /hibah|dipa|drpm/i;

/**
 * Satukan kategori hibah — DIPA/DRPM, Hibah lainnya, dan sejenisnya — menjadi
 * satu jenis dana "Hibah" pada setiap sumber dana. Kerjasama tidak disentuh.
 *
 * Pembedanya kini sumber dana: "Hibah" pada Pemerintah dan "Hibah" pada Sumber
 * Lain tetap dua baris Tabel 12 yang terpisah. Menggabungkan lintas sumber
 * memang ditolak sistem, karena sumber dana menentukan baris borang.
 *
 * Caranya penggabungan gabung_ke, BUKAN mengganti nama. DIPA/DRPM tetap ada di
 * master dengan namanya, setiap transaksi tetap menyimpan kode aslinya, dan
 * tiap penggabungan dapat dilepas lewat Kelola Master. Mengganti nama
 * "DIPA/DRPM" menjadi "Hibah" memang lebih singkat, tetapi menghapus
 * satu-satunya jejak bahwa transaksi itu berasal dari DIPA.
 *
 * Aman dijalankan berulang: kategori yang sudah tergabung dilewati.
 */
function rampingkanHibah() {
  var peta = petaJenisDana();
  var semua = Object.keys(peta).map(function (k) { return peta[k]; });
  var pakai = {};
  baca('Transaksi').forEach(function (t) {
    var k = String(t.jenis_dana_kode).trim();
    pakai[k] = (pakai[k] || 0) + 1;
  });

  var rencana = [], lewati = [];
  baca('M_Sumber').sort(function (a, b) { return angka(a.urutan) - angka(b.urutan); }).forEach(function (sd) {
    var kodeSumber = String(sd.kode).trim();
    var diSini = semua.filter(function (j) { return j.sumber_kode === kodeSumber; });
    var namaHibah = function (j) { return String(j.nama).trim().toLowerCase() === 'hibah'; };

    var calon = diSini.filter(function (j) { return !j.gabung_ke && !namaHibah(j) && POLA_HIBAH.test(j.nama); });
    if (!calon.length) return;

    var tujuan = diSini.filter(namaHibah)[0] || null;
    if (tujuan && tujuan.gabung_ke) {
      lewati.push(sd.nama + ': jenis dana "' + tujuan.nama + '" (' + tujuan.kode + ') sendiri sudah ' +
        'digabungkan ke ' + tujuan.gabung_ke + '. Lepas dulu penggabungannya, lalu jalankan lagi.');
      return;
    }
    rencana.push({
      sumber: kodeSumber, namaSumber: sd.nama, tujuan: tujuan, calon: calon,
      urutan: Math.min.apply(null, calon.map(function (j) { return j.urutan; }))
    });
  });

  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (err) { /* dijalankan dari editor */ }
  function lapor(judul, isi) {
    Logger.log(judul + '\n\n' + isi);
    if (ui) ui.alert(judul, isi, ui.ButtonSet.OK);
    return isi;
  }
  var catatanLewati = lewati.length ? '\n\nDilewati:\n' + lewati.join('\n') : '';

  if (!rencana.length) {
    return lapor('Rampingkan kategori hibah',
      'Tidak ada yang perlu dirampingkan: setiap kategori hibah sudah tergabung ke "Hibah".' + catatanLewati);
  }

  var uraian = rencana.map(function (p) {
    return p.namaSumber + ' → "Hibah"' +
      (p.tujuan ? ' (' + p.tujuan.kode + (p.tujuan.aktif ? '' : ', diaktifkan kembali') + ')' : ' (jenis dana baru)') + '\n' +
      p.calon.map(function (j) {
        return '   • ' + j.nama + ' (' + j.kode + ', ' + (pakai[j.kode] || 0) + ' transaksi)';
      }).join('\n');
  }).join('\n\n');

  if (ui) {
    var jawab = ui.alert('Rampingkan kategori hibah',
      'Kategori berikut akan dilaporkan sebagai satu baris "Hibah" pada Tabel 12, per sumber dana:\n\n' +
      uraian + catatanLewati + '\n\n' +
      'Kerjasama tidak disentuh. Data transaksi tidak diubah, dan setiap penggabungan dapat dilepas ' +
      'lewat Kelola Master. Lanjutkan?', ui.ButtonSet.YES_NO);
    if (jawab !== ui.Button.YES) return 'Dibatalkan.';
  }

  var s = sheet('M_JenisDana');
  var kolom = indeksKolom('M_JenisDana');
  var pelaku = { email: '', peranAsli: 'pemilik skrip' };
  try { pelaku.email = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (err) {}
  var sebab = ' (perampingan kategori hibah)';

  rencana.forEach(function (p) {
    var kode;
    if (p.tujuan) {
      kode = p.tujuan.kode;
      if (!p.tujuan.aktif) {
        s.getRange(p.tujuan._baris, kolom.aktif).setValue(true);
        catat(pelaku, 'ubah', 'M_JenisDana', kode, 'diaktifkan kembali' + sebab);
      }
    } else {
      kode = kodeBerikutnya('M_JenisDana', 'kode', 'JD', 2);
      tambahBaris('M_JenisDana', {
        kode: kode, sumber_kode: p.sumber, nama: 'Hibah', urutan: p.urutan, aktif: true, gabung_ke: ''
      });
      catat(pelaku, 'tambah', 'M_JenisDana', kode, 'Hibah' + sebab);
    }
    p.calon.forEach(function (j) {
      s.getRange(j._baris, kolom.gabung_ke).setValue(kode);
      catat(pelaku, 'gabung', 'M_JenisDana', j.kode, j.kode + ' -> ' + kode + sebab);
    });
  });
  hapusCache();

  return lapor('Perampingan selesai', uraian + catatanLewati + '\n\n' +
    'Buka ulang dashboard untuk melihat Tabel 12 yang baru. Transaksi lama tetap menyimpan kode ' +
    'aslinya; bila ada yang keliru, lepas penggabungannya di Kelola Master > Jenis Dana.');
}

// ======================================================= perapian PNBP

/** Satu-satunya uraian untuk angka gelondongan dana mahasiswa. */
var URAIAN_GELONDONGAN_PNBP = 'Penerimaan Mahasiswa';

/** Baris PNBP yang berupa angka gelondongan, bukan belanja terperinci. */
var POLA_GELONDONGAN_PNBP = /^$|^ukt$|^penerimaan mahasiswa$|operasional pembelajaran prodi/i;

// Hanya uraian yang DIAWALI remunerasi. Ada proyek kerjasama berjudul "Penyusunan
// Remunerasi Jasa Pelayanan …" yang bukan pembayaran remunerasi sama sekali.
var POLA_REMUNERASI = /^\s*(remunerasi|renumerasi)\b/i;

/**
 * Kegiatan anggaran PNBP/BLU, dinamai seperti pada LAKIN. Yang tertulis di
 * uraian didahulukan; bila tidak ada, diambil dari sub-kegiatannya.
 * Urutan penting: "prasarana pendukung pembelajaran" memuat "sarana pendukung
 * pembelajaran", jadi harus diperiksa lebih dulu.
 */
var KEGIATAN_PNBP = [
  [/prasarana pendukung pembelajaran/i,                        'Prasarana Pendukung Pembelajaran'],
  [/sarana pendukung perkantoran/i,                            'Sarana Pendukung Perkantoran'],
  [/sarana pendukung pembelajaran/i,                           'Sarana Pendukung Pembelajaran'],
  [/dukungan operasional pembelajaran|dukungan layanan pembelajaran \(pnbp/i, 'Dukungan Operasional Pembelajaran'],
  [/layanan pendidikan/i,                                      'Layanan Pendidikan'],
  [/pengadaan[^|]*perkantoran/i,                               'Sarana Pendukung Perkantoran']
];

/** [pola, sub-kegiatan, kegiatan bila uraian tidak menyebutnya]. Pola pertama yang cocok dipakai. */
var SUB_KEGIATAN_PNBP = [
  [/proses belajar mengajar/i,        'Proses Belajar Mengajar',                               'Layanan Pendidikan'],
  [/penerimaan mahasiswa baru/i,      'Penerimaan Mahasiswa Baru',                             'Layanan Pendidikan'],
  [/wisuda/i,                         'Wisuda dan Yudisium',                                   'Layanan Pendidikan'],
  [/pengembangan kurikulum/i,         'Pengembangan Kurikulum, Akreditasi, dan Mutu Akademik', 'Layanan Pendidikan'],
  [/unit kegiatan mahasiswa/i,        'Unit Kegiatan Mahasiswa dan Organisasi Kemahasiswaan',  'Layanan Pendidikan'],
  [/kegiatan kemahasiswaan/i,         'Kegiatan Kemahasiswaan',                                'Layanan Pendidikan'],
  [/pembinaan karir/i,                'Pembinaan Karir Mahasiswa',                             'Layanan Pendidikan'],
  [/kerjasama berbasis pendidikan/i,  'Kerjasama Berbasis Pendidikan',                         'Layanan Pendidikan'],
  [/honor tenaga pendidik/i,          'Honor Tenaga Pendidik Non PNS',                         'Layanan Pendidikan'],
  [/honor tenaga k/i,                 'Honor Tenaga Kependidikan Non PNS',                     'Dukungan Operasional Pembelajaran'],
  [/pemeliharaan sarana/i,            'Pemeliharaan Sarana',                                   'Dukungan Operasional Pembelajaran'],
  [/pemeliharaan prasarana/i,         'Pemeliharaan Prasarana',                                'Dukungan Operasional Pembelajaran'],
  [/penguatan manajemen sdm/i,        'Penguatan Manajemen SDM',                               'Dukungan Operasional Pembelajaran'],
  [/peningkatan kompetensi/i,         'Peningkatan Kompetensi Dosen dan Tendik',               'Dukungan Operasional Pembelajaran'],
  [/gaji (dan|&) tunjangan/i,         'Gaji dan Tunjangan',                                    'Dukungan Operasional Pembelajaran'],
  [/penyelenggaraan operasional/i,    'Penyelenggaraan Operasional Perkantoran',               'Dukungan Operasional Pembelajaran'],
  [/kendaraan/i,                      'Pengadaan Kendaraan',                                   'Sarana Pendukung Perkantoran'],
  [/meubelair/i,                      'Pengadaan Meubelair',                                   'Sarana Pendukung Pembelajaran'],
  [/buku pustaka/i,                   'Pengadaan Buku Pustaka',                                'Sarana Pendukung Pembelajaran'],
  [/alat pendidikan/i,                'Pengadaan Alat Pendidikan',                             'Sarana Pendukung Pembelajaran'],
  [/pembang/i,                        'Pembangunan Prasarana',                                 'Prasarana Pendukung Pembelajaran'],
  [/peralatan/i,                      'Pengadaan Peralatan',                                   'Sarana Pendukung Pembelajaran'],
  [/pengadaan/i,                      'Pengadaan Lainnya',                                     'Sarana Pendukung Pembelajaran'],
  [/investasi sarpras/i,              'Sarana dan Prasarana',                                  'Dukungan Operasional Pembelajaran'],
  [/dukungan layanan pembelajaran/i,  'Dukungan Layanan Pembelajaran',                         'Dukungan Operasional Pembelajaran']
];

function jenisBelanjaPnbp(uraian) {
  if (/persediaan/i.test(uraian)) return 'Belanja Persediaan';
  var m = String(uraian).match(/belanja (barang|jasa|perjalanan|pemeliharaan|modal)/i);
  return m ? 'Belanja ' + m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : '';
}

/**
 * Uraian baku PNBP: "Kegiatan — Sub-kegiatan (Jenis belanja)".
 * Angka gelondongan menjadi "Penerimaan Mahasiswa". Mengembalikan '' bila
 * uraiannya tidak dikenali, supaya tidak ada yang ditebak.
 */
function namaBakuPnbp(uraian) {
  var u = String(uraian || '').trim();
  if (POLA_GELONDONGAN_PNBP.test(u)) return URAIAN_GELONDONGAN_PNBP;
  if (u.indexOf(' — ') > 0) return u;

  var kegiatan = '', sub = '', i;
  for (i = 0; i < KEGIATAN_PNBP.length; i++) {
    if (KEGIATAN_PNBP[i][0].test(u)) { kegiatan = KEGIATAN_PNBP[i][1]; break; }
  }
  for (i = 0; i < SUB_KEGIATAN_PNBP.length; i++) {
    if (SUB_KEGIATAN_PNBP[i][0].test(u)) {
      sub = SUB_KEGIATAN_PNBP[i][1];
      if (!kegiatan) kegiatan = SUB_KEGIATAN_PNBP[i][2];
      break;
    }
  }
  if (!kegiatan) return '';
  var belanja = jenisBelanjaPnbp(u);
  return kegiatan + (sub ? ' — ' + sub : '') + (belanja ? ' (' + belanja + ')' : '');
}

function rupiahTeks(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "2023=1.234.567.890; 2024=2.345.678.901" menjadi { '2023': 1234567890, ... }. */
function uraiDanaMahasiswa(teks) {
  var dana = {}, salah = [];
  String(teks || '').split(/[;\n]+/).forEach(function (bagian) {
    var b = bagian.trim();
    if (!b) return;
    var m = b.match(/^(\d{4})\s*[=:]\s*(?:rp\.?\s*)?([\d.,\s]+)$/i);
    var n = m ? Number(m[2].trim().replace(/,\d{1,2}$/, '').replace(/\D/g, '')) : 0;
    if (!m || !(n > 0)) { salah.push(b); return; }
    dana[m[1]] = n;
  });
  return { dana: dana, salah: salah };
}

function tulisBarisBerurutan(s, nilai, indeks) {
  for (var a = 0; a < indeks.length; ) {
    var b = a;
    while (b + 1 < indeks.length && indeks[b + 1] === indeks[b] + 1) b++;
    s.getRange(indeks[a] + 1, 1, b - a + 1, nilai[0].length).setValues(nilai.slice(indeks[a], indeks[b] + 1));
    a = b + 1;
  }
}

/**
 * Rapikan PNBP: total tiap tahun disamakan dengan total dana mahasiswa menurut
 * laporan keuangan universitas, dan uraiannya diseragamkan.
 *
 * Temuan yang melatarinya: PNBP setiap tahun terdiri dari baris belanja
 * terperinci — jumlahnya sama persis dengan realisasi anggaran fakultas di
 * LAKIN — ditambah angka gelondongan. Gelondongan itu semestinya SISA: total
 * dana mahasiswa dikurangi belanja. Bila gelondongannya salah, PNBP melenceng
 * dari laporan universitas.
 *
 * Tiga hal dikerjakan, setelah rencananya ditampilkan dan disetujui:
 *  A. Gelondongan tiap tahun menjadi satu baris "Penerimaan Mahasiswa" sebesar
 *     sisa. Yang nominalnya berubah turun ke "diajukan" supaya ditinjau
 *     verifikator. Gelondongan kedua dan seterusnya dihapus; isinya dicatat
 *     utuh di Log dan disebut di catatan baris yang tersisa.
 *  B. Uraian diseragamkan (lihat namaBakuPnbp). Uraian lama pindah ke catatan.
 *     Nominal dan kategori tidak disentuh, jadi statusnya tetap.
 *  C. Bila tahun TS belum punya remunerasi, ditambahkan satu baris SEMENTARA
 *     yang disamakan dengan remunerasi TS-1, "diajukan" dan ditandai perlu
 *     ditinjau. Hapus begitu data sebenarnya masuk.
 *
 * Sumber dana, jenis dana, dan jenis penggunaan tidak pernah diubah.
 *
 * Tidak ada angka keuangan di berkas ini karena repositorinya publik. Total
 * dana mahasiswa ditanyakan sekali lewat kotak isian dan disimpan di parameter
 * dana_mahasiswa; remunerasi disalin dari baris yang sudah ada di spreadsheet.
 *
 * Aman dijalankan berulang: bila semuanya sudah sesuai, tidak ada yang ditulis.
 */
function rapikanPnbp() {
  var JUDUL = 'Rapikan PNBP';
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (err) { /* dijalankan dari editor */ }
  function lapor(isi) {
    Logger.log(JUDUL + '\n\n' + isi);
    if (ui) ui.alert(JUDUL, isi, ui.ButtonSet.OK);
    return isi;
  }

  var peta = petaJenisDana();
  var calon = Object.keys(peta).filter(function (k) {
    return /^pnbp$/i.test(String(peta[k].nama).trim()) && !peta[k].gabung_ke;
  });
  if (calon.length !== 1) {
    return lapor('Diperlukan tepat satu jenis dana bernama "PNBP" yang tidak digabungkan, tetapi ditemukan ' +
      calon.length + '. Periksa Kelola Master > Jenis Dana.');
  }
  var kodePnbp = calon[0];

  var tahunSah = {}, tahunBerlabel = {};
  baca('M_Tahun').forEach(function (r) {
    var th = String(angka(r.tahun));
    tahunSah[th] = true;
    if (String(r.label_ts || '').trim()) tahunBerlabel[String(r.label_ts).trim().toUpperCase()] = th;
  });

  // ---------------------------------------------- total dana mahasiswa
  var param = cariBaris('M_Parameter', 'kunci', 'dana_mahasiswa');
  var teksDana = param ? String(param.nilai || '').trim() : '';
  var danaBaru = false;
  if (!teksDana) {
    if (!ui) {
      return lapor('Parameter dana_mahasiswa masih kosong. Jalankan lewat menu SIKEU agar dapat diisi, ' +
        'atau isi di Kelola Master > Parameter, mis. 2023=1.234.567.890; 2024=2.345.678.901');
    }
    var isian = ui.prompt(JUDUL + ' — total dana mahasiswa',
      'Salin total "Jumlah Dana" dari laporan dana mahasiswa universitas, satu tahun per bagian, ' +
      'dipisah titik koma.\n\nContoh: 2023=1.234.567.890; 2024=2.345.678.901\n\n' +
      'Isian disimpan di parameter dana_mahasiswa. Tahun yang tidak diisi hanya dirapikan uraiannya.',
      ui.ButtonSet.OK_CANCEL);
    if (isian.getSelectedButton() !== ui.Button.OK) return 'Dibatalkan.';
    teksDana = String(isian.getResponseText() || '').trim();
    if (!teksDana) return lapor('Isian kosong, jadi tidak ada yang dikerjakan.');
    danaBaru = true;
  }
  var urai = uraiDanaMahasiswa(teksDana);
  Object.keys(urai.dana).forEach(function (th) {
    if (!tahunSah[th]) { urai.salah.push(th + ' (tahun ini belum ada di M_Tahun)'); delete urai.dana[th]; }
  });
  if (urai.salah.length) {
    return lapor('Isian total dana mahasiswa tidak terbaca: ' + urai.salah.join('; ') +
      '\n\nTulis seperti: 2023=1.234.567.890; 2024=2.345.678.901' +
      (danaBaru ? '' : '\nUbah di Kelola Master > Parameter > dana_mahasiswa.'));
  }
  var dana = urai.dana;

  // --------------------------------------------------- baca Transaksi
  var s = sheet('Transaksi');
  var nilai = s.getDataRange().getValues();
  var jejak = JSON.stringify(nilai);
  var kol = {};
  nilai[0].forEach(function (h, i) { kol[String(h).trim()] = i; });
  function teks(i, k) { var v = nilai[i][kol[k]]; return String(v === null || v === undefined ? '' : v).trim(); }
  function status(i) { return teks(i, 'status').toLowerCase(); }
  function dihitung(i) { return status(i) === STATUS.TERVERIFIKASI || status(i) === STATUS.DIAJUKAN; }
  function jumlah(i) { return angka(nilai[i][kol.jumlah]); }
  function urutId(a, b) { return teks(a, 'id').localeCompare(teks(b, 'id')); }
  function gelondongan(i) { return POLA_GELONDONGAN_PNBP.test(teks(i, 'uraian')); }

  var semua = [];
  for (var n = 1; n < nilai.length; n++) if (teks(n, 'id')) semua.push(n);
  var pnbp = semua.filter(function (i) {
    return ujungGabung(teks(i, 'jenis_dana_kode'), peta) === kodePnbp && jumlah(i) > 0;
  });

  // ------------------------------------------------- A. rencana nominal
  var rencanaA = [], hapus = [], masalah = [];
  Object.keys(dana).sort().forEach(function (th) {
    var diTahun = pnbp.filter(function (i) { return String(angka(nilai[i][kol.tahun])) === th && dihitung(i); });
    var gel = diTahun.filter(gelondongan).sort(urutId);
    var belanja = diTahun.filter(function (i) { return !gelondongan(i); })
      .reduce(function (x, i) { return x + jumlah(i); }, 0);
    var sisa = dana[th] - belanja;
    var jumlahGel = gel.reduce(function (x, i) { return x + jumlah(i); }, 0);

    if (sisa < 0) {
      masalah.push(th + ': belanja terperinci (Rp ' + rupiahTeks(belanja) + ') sudah melebihi total dana ' +
        'mahasiswa (Rp ' + rupiahTeks(dana[th]) + '). Tahun ini tidak disentuh; periksa baris belanjanya.');
      return;
    }
    if (gel.length <= 1 && jumlahGel === sisa) return;

    var tetap = sisa > 0 && gel.length ? gel[0] : null;
    var p = {
      tahun: th, total: dana[th], belanja: belanja, sisa: sisa, tetap: tetap,
      buang: sisa > 0 ? gel.slice(1) : gel,
      turun: tetap !== null && status(tetap) === STATUS.TERVERIFIKASI && jumlah(tetap) !== sisa,
      semula: gel.length
        ? gel.map(function (i) { return teks(i, 'id') + ' "' + (teks(i, 'uraian') || '(tanpa uraian)') + '" Rp ' + rupiahTeks(jumlah(i)); }).join(' + ')
        : '(tidak ada gelondongan)'
    };
    p.buang.forEach(function (i) { hapus.push(i); });
    rencanaA.push(p);
  });

  // --------------------------------------------------- B. rencana nama
  var dibuang = {};
  hapus.forEach(function (i) { dibuang[i] = true; });
  var rencanaB = [], lepas = [];
  pnbp.forEach(function (i) {
    if (dibuang[i]) return;
    var asal = teks(i, 'uraian'), baku = namaBakuPnbp(asal);
    if (!baku) lepas.push(i);
    else if (baku !== asal) rencanaB.push({ i: i, asal: asal, baku: baku });
  });

  // ------------------------------------------- C. remunerasi sementara
  var rencanaC = null, ts = tahunBerlabel.TS, ts1 = tahunBerlabel['TS-1'];
  if (ts && ts1) {
    var remunerasi = function (th, syarat) {
      return semua.filter(function (i) {
        return String(angka(nilai[i][kol.tahun])) === th && POLA_REMUNERASI.test(teks(i, 'uraian')) && syarat(i);
      }).sort(urutId);
    };
    var sudahAda = remunerasi(ts, function (i) { return status(i) !== STATUS.DITOLAK; });
    var acuan = remunerasi(ts1, dihitung);
    if (!sudahAda.length && acuan.length) {
      var kategori = function (i) { return [teks(i, 'sumber_kode'), teks(i, 'jenis_dana_kode'), teks(i, 'penggunaan_kode')].join('|'); };
      if (acuan.some(function (i) { return kategori(i) !== kategori(acuan[0]); })) {
        masalah.push('Remunerasi ' + ts1 + ' tercatat pada lebih dari satu kategori, jadi baris sementara ' + ts + ' tidak dibuat.');
      } else {
        rencanaC = { acuan: acuan, jumlah: acuan.reduce(function (x, i) { return x + jumlah(i); }, 0) };
      }
    }
  }

  var catatanMasalah = masalah.length ? '\n\nTidak dikerjakan:\n  ' + masalah.join('\n  ') : '';
  var catatanLepas = lepas.length
    ? '\n\nUraian yang belum dikenali, dibiarkan apa adanya:\n' + lepas.map(function (i) {
        return '  ' + teks(i, 'id') + ' (' + teks(i, 'tahun') + '): ' + teks(i, 'uraian').slice(0, 70);
      }).join('\n')
    : '';

  if (!rencanaA.length && !rencanaB.length && !rencanaC) {
    if (danaBaru) simpanDanaMahasiswa(dana);
    return lapor('Tidak ada yang perlu dirapikan: total PNBP sudah sama dengan total dana mahasiswa ' +
      'dan uraiannya sudah seragam.' + catatanMasalah + catatanLepas);
  }

  // ------------------------------------------------------ uraian rencana
  var bagian = [];
  if (rencanaA.length) {
    bagian.push('A. Total PNBP disamakan dengan total dana mahasiswa\n' + rencanaA.map(function (p) {
      return '  ' + p.tahun + ': dana mahasiswa Rp ' + rupiahTeks(p.total) + ', belanja terperinci Rp ' + rupiahTeks(p.belanja) + '\n' +
        (p.sisa > 0
          ? '    → "' + URAIAN_GELONDONGAN_PNBP + '" Rp ' + rupiahTeks(p.sisa) +
            (p.tetap !== null ? ' pada ' + teks(p.tetap, 'id') + (p.turun ? ', status menjadi diajukan' : '') : ' (baris baru, diajukan)') + '\n'
          : '') +
        (p.buang.length ? '    → dihapus: ' + p.buang.map(function (i) { return teks(i, 'id'); }).join(', ') + '\n' : '') +
        '    semula: ' + p.semula;
    }).join('\n'));
  }
  if (rencanaB.length) {
    bagian.push('B. ' + rencanaB.length + ' uraian PNBP diseragamkan, misalnya:\n' +
      rencanaB.slice(0, 5).map(function (p) {
        return '  ' + teks(p.i, 'id') + ': "' + (p.asal ? p.asal.slice(0, 55) + (p.asal.length > 55 ? '…' : '') : '(tanpa uraian)') +
          '"\n      → "' + p.baku + '"';
      }).join('\n') +
      (rencanaB.length > 5 ? '\n  … dan ' + (rencanaB.length - 5) + ' lainnya.' : '') +
      '\n  Uraian lama disimpan di kolom catatan. Nominal, kategori, dan status tidak berubah.');
  }
  if (rencanaC) {
    bagian.push('C. Remunerasi ' + ts + ' SEMENTARA: Rp ' + rupiahTeks(rencanaC.jumlah) + ', disamakan dengan ' +
      rencanaC.acuan.map(function (i) { return teks(i, 'id'); }).join(', ') + ' (' + ts1 + ').\n' +
      '  Status diajukan dan ditandai perlu ditinjau. Hapus begitu data ' + ts + ' sebenarnya masuk.');
  }
  var ringkasan = bagian.join('\n\n') + catatanMasalah + catatanLepas;

  if (ui) {
    var jawab = ui.alert(JUDUL, ringkasan + '\n\nSumber dana, jenis dana, dan jenis penggunaan tidak diubah. Lanjutkan?',
      ui.ButtonSet.YES_NO);
    if (jawab !== ui.Button.YES) return 'Dibatalkan.';
  }

  // ------------------------------------------------------------ terapkan
  var kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  try {
    // Dialog bisa terbuka lama; operator mungkin menyimpan sesuatu di sela itu.
    if (JSON.stringify(s.getDataRange().getValues()) !== jejak) {
      return lapor('Data transaksi berubah selama dialog terbuka, jadi tidak ada yang ditulis. Jalankan menu ini sekali lagi.');
    }

    var waktu = sekarang();
    var email = '';
    try { email = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (err) {}
    var pelaku = { email: email, peranAsli: 'pemilik skrip' };
    var penanda = ' (menu Rapikan PNBP)';
    var berubah = {};
    var atur = function (i, k, v) { nilai[i][kol[k]] = v; berubah[i] = true; };

    rencanaB.forEach(function (p) {
      var cat = teks(p.i, 'catatan');
      atur(p.i, 'uraian', p.baku);
      atur(p.i, 'catatan', (p.asal ? 'Uraian asal: ' + p.asal : 'Uraian asal kosong') + (cat ? ' | ' + cat : ''));
      atur(p.i, 'diubah_pada', waktu);
    });

    var maks = 0;
    semua.forEach(function (i) { var m = teks(i, 'id').match(/^T(\d+)$/); if (m) maks = Math.max(maks, parseInt(m[1], 10)); });
    var tambah = [];
    var barisBaru = function (isi) {
      var id = String(++maks);
      while (id.length < 4) id = '0' + id;
      isi.id = 'T' + id;
      var r = nilai[0].map(function () { return ''; });
      Object.keys(isi).forEach(function (k) { if (kol.hasOwnProperty(k)) r[kol[k]] = isi[k]; });
      tambah.push(r);
    };

    var operasional = baca('M_JenisPenggunaan')
      .filter(function (r) { return String(r.kelompok).trim() === 'operasional'; })
      .sort(function (a, b) { return angka(a.urutan) - angka(b.urutan); })[0];

    rencanaA.forEach(function (p) {
      var ket = 'Disesuaikan ' + waktu.slice(0, 10) + ': total dana mahasiswa ' + p.tahun + ' Rp ' + rupiahTeks(p.total) +
        ' dikurangi belanja terperinci Rp ' + rupiahTeks(p.belanja) + '. Semula ' + p.semula;
      if (p.tetap !== null) {
        var i = p.tetap, cat = teks(i, 'catatan');
        atur(i, 'uraian', URAIAN_GELONDONGAN_PNBP);
        atur(i, 'jumlah', p.sisa);
        atur(i, 'catatan', ket + (cat ? ' | ' + cat : ''));
        atur(i, 'diubah_pada', waktu);
        if (p.turun) {
          atur(i, 'status', STATUS.DIAJUKAN);
          atur(i, 'diajukan_pada', waktu);
          atur(i, 'diverifikasi_oleh', '');
          atur(i, 'diverifikasi_pada', '');
          atur(i, 'catatan_verifikasi', 'Nominal disesuaikan ke total dana mahasiswa' + penanda + ' oleh ' + email + '. Periksa, lalu verifikasi.');
        }
        catat(pelaku, 'ubah-nominal', 'Transaksi', teks(i, 'id'), ket + penanda);
      } else if (p.sisa > 0) {
        barisBaru({
          tanggal: p.tahun + '-01-01', tahun: Number(p.tahun), sumber_kode: peta[kodePnbp].sumber_kode,
          jenis_dana_kode: kodePnbp, penggunaan_kode: operasional ? String(operasional.kode).trim() : '',
          uraian: URAIAN_GELONDONGAN_PNBP, jumlah: p.sisa, status: STATUS.DIAJUKAN, perlu_tinjau: false,
          catatan: ket, dibuat_oleh: email || '(menu SIKEU)', dibuat_pada: waktu, diajukan_pada: waktu
        });
      }
    });

    if (rencanaC) {
      var a0 = rencanaC.acuan[0];
      barisBaru({
        tanggal: ts + '-01-01', tahun: Number(ts), sumber_kode: teks(a0, 'sumber_kode'),
        jenis_dana_kode: teks(a0, 'jenis_dana_kode'), rincian_kode: teks(a0, 'rincian_kode'),
        penggunaan_kode: teks(a0, 'penggunaan_kode'), uraian: 'Remunerasi ' + ts, jumlah: rencanaC.jumlah,
        status: STATUS.DIAJUKAN, perlu_tinjau: true,
        catatan: 'SEMENTARA: disamakan dengan remunerasi ' + ts1 + ' (' +
          rencanaC.acuan.map(function (i) { return teks(i, 'id'); }).join(', ') + ') sampai data ' + ts +
          ' masuk. Hapus baris ini begitu data sebenarnya diinput.',
        dibuat_oleh: email || '(menu SIKEU)', dibuat_pada: waktu, diajukan_pada: waktu
      });
    }

    tulisBarisBerurutan(s, nilai, Object.keys(berubah).map(Number).sort(function (a, b) { return a - b; }));
    if (tambah.length) s.getRange(s.getLastRow() + 1, 1, tambah.length, nilai[0].length).setValues(tambah);
    tambah.forEach(function (r) {
      catat(pelaku, 'tambah', 'Transaksi', r[kol.id], r[kol.uraian] + ' Rp ' + rupiahTeks(r[kol.jumlah]) + penanda);
    });

    // Dihapus paling akhir dan dari bawah, supaya nomor baris lain tidak bergeser.
    hapus.slice().sort(function (a, b) { return b - a; }).forEach(function (i) {
      var rekam = {};
      nilai[0].forEach(function (h, k) {
        rekam[String(h).trim()] = nilai[i][k] instanceof Date ? normalTanggal(nilai[i][k]) : nilai[i][k];
      });
      s.deleteRow(i + 1);
      catat(pelaku, 'hapus', 'Transaksi', rekam.id,
        'Digabung ke gelondongan tahun ' + rekam.tahun + penanda + '. Isi baris: ' + JSON.stringify(rekam));
    });

    if (rencanaB.length) {
      catat(pelaku, 'ubah-nama', 'Transaksi', rencanaB.map(function (p) { return teks(p.i, 'id'); }).join(','),
        rencanaB.length + ' uraian PNBP diseragamkan' + penanda + '; uraian asal disimpan di kolom catatan');
    }
    if (danaBaru) simpanDanaMahasiswa(dana);
    hapusCache();
  } finally {
    kunci.releaseLock();
  }

  return lapor('Selesai.\n\n' + ringkasan + '\n\n' +
    'Baris berstatus "diajukan" belum masuk Tabel 12 & 13 sampai disetujui verifikator: buka Input Data, ' +
    'saring Status "Menunggu Verifikasi". Semua perubahan tercatat di Log.');
}

function simpanDanaMahasiswa(dana) {
  var teks = Object.keys(dana).sort().map(function (th) { return th + '=' + rupiahTeks(dana[th]); }).join('; ');
  var r = cariBaris('M_Parameter', 'kunci', 'dana_mahasiswa');
  if (r) sheet('M_Parameter').getRange(r._baris, indeksKolom('M_Parameter').nilai).setValue(teks);
  else {
    var seed = SEED_PARAMETER.filter(function (p) { return p[0] === 'dana_mahasiswa'; })[0];
    tambahBaris('M_Parameter', { kunci: 'dana_mahasiswa', nilai: teks, keterangan: seed ? seed[2] : '' });
  }
}

// ================================================== cadangan & pemulihan

/**
 * Isi sheet yang masih kosong dari Cadangan.gs, bila berkas itu ada di proyek.
 *
 * Cadangan dibuat dari Kelola Master > Cadangan (aksiCadangan di Kode.gs).
 * Dengan ini membangun ulang SIKEU cukup: Sheet baru, tempel appsscript.json,
 * Kode.gs, Setup.gs, dan Cadangan.gs, lalu jalankan setupSpreadsheet() —
 * pengguna, parameter, status verifikasi, sampai Log kembali seperti semula.
 *
 * Sheet yang sudah berisi tidak pernah ditimpa. Kolom dicocokkan menurut nama
 * header, jadi cadangan lama tetap terbaca meski SKEMA kelak bertambah kolom.
 */
function pulihkanCadangan() {
  if (typeof DATA_CADANGAN === 'undefined' || !DATA_CADANGAN || !DATA_CADANGAN.sheet) return null;
  var hasil = { dibuat: DATA_CADANGAN.dibuat || '', diisi: [], dilewati: [] };
  Object.keys(SKEMA).forEach(function (nama) {
    var data = DATA_CADANGAN.sheet[nama];
    if (!data || data.length < 2) return;
    var s = SpreadsheetApp.getActive().getSheetByName(nama);
    if (s.getLastRow() > 1) { hasil.dilewati.push(nama); return; }
    var header = data[0].map(function (h) { return String(h).trim(); });
    var baris = data.slice(1).map(function (r) {
      return SKEMA[nama].map(function (k) { var i = header.indexOf(k); return i < 0 ? '' : r[i]; });
    });
    s.getRange(2, 1, baris.length, SKEMA[nama].length).setValues(baris);
    hasil.diisi.push(nama + ' (' + baris.length + ')');
  });
  return hasil;
}

// ============================================= berkas koreksi (Koreksi.gs)

/** Kolom transaksi yang menentukan angka borang; mengubahnya menuntut verifikasi ulang. */
var MEDAN_BORANG = ['jumlah', 'tahun', 'sumber_kode', 'jenis_dana_kode', 'penggunaan_kode'];

function sel(v) {
  if (v === null || v === undefined) return '';
  return v instanceof Date ? normalTanggal(v) : String(v).trim();
}

function petaKolom(header) {
  var k = {};
  header.forEach(function (h, i) { k[String(h).trim()] = i; });
  return k;
}

/** { sumber, nama: [alternatif, ...] } menjadi kode jenis dana di ujung penggabungan, atau ''. */
function kodeJenisDanaDariNama(acuan, peta) {
  var nama = [].concat(acuan.nama);
  for (var i = 0; i < nama.length; i++) {
    var cocok = Object.keys(peta).filter(function (k) {
      return peta[k].sumber_kode === acuan.sumber &&
        String(peta[k].nama).trim().toLowerCase() === String(nama[i]).trim().toLowerCase();
    });
    if (cocok.length === 1) return ujungGabung(cocok[0], peta);
  }
  return '';
}

/** Medan "jenis_dana" berupa nama diubah menjadi jenis_dana_kode. */
function uraikanAcuan(obj, peta) {
  var hasil = {};
  Object.keys(obj || {}).forEach(function (k) {
    if (k === 'jenis_dana') hasil.jenis_dana_kode = kodeJenisDanaDariNama(obj[k], peta);
    else hasil[k] = obj[k];
  });
  return hasil;
}

function samaNilai(kolom, nilai, harapan, peta) {
  if (kolom === 'jumlah' || kolom === 'tahun') return angka(nilai) === angka(harapan);
  // Dibandingkan di ujung penggabungan: kode yang kemudian digabungkan tetap dianggap sama.
  if (kolom === 'jenis_dana_kode') return ujungGabung(sel(nilai), peta) === ujungGabung(sel(harapan), peta);
  return sel(nilai) === sel(harapan);
}

/**
 * Terapkan berkas koreksi PRIVAT (Koreksi.gs, variabel DATA_KOREKSI).
 *
 * Koreksi berupa data, bukan kode, supaya nominal dan nama tidak pernah masuk
 * repositori publik. Berkasnya dibuat di komputer pengelola (tools/buat-koreksi.js)
 * lalu ditempel ke editor Apps Script.
 *
 * Isi yang dikenali:
 *  - jenisDanaBaru: [{ sumber_kode, nama, urutan }] — dilewati bila nama itu sudah ada
 *  - rincian: [{ kode, semula, menjadi }] — memindah rincian antar jenis dana
 *  - ubah:    [{ id, ket, semula, menjadi }] — mengubah transaksi yang ada
 *  - tambah:  [{ kunci, ket, data }] — transaksi baru, lewat validasiTransaksi()
 *  - ditahan: [{ ket }] — hanya dilaporkan, menunggu keputusan manusia
 * Jenis dana boleh ditulis sebagai nama: jenis_dana: { sumber, nama: [...] }.
 *
 * Pengamannya:
 *  - "semula" harus cocok dengan isi sheet. Bila tidak, baris itu dilewati dan
 *    dilaporkan sebagai konflik, bukan ditimpa.
 *  - Bila sheet sudah berisi "menjadi", koreksi dianggap sudah diterapkan.
 *    Transaksi tambahan ditandai [kunci] di catatan, jadi tidak pernah masuk dua kali.
 *  - Mengubah kolom yang menentukan angka borang pada data terverifikasi
 *    menurunkannya ke "diajukan". Transaksi baru selalu "diajukan".
 *  - Sheet dicek ulang setelah dialog disetujui.
 */
function terapkanKoreksi() {
  var JUDUL = 'Terapkan koreksi';
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (err) { /* dijalankan dari editor */ }
  function lapor(isi) {
    Logger.log(JUDUL + '\n\n' + isi);
    if (ui) ui.alert(JUDUL, isi, ui.ButtonSet.OK);
    return isi;
  }
  if (typeof DATA_KOREKSI === 'undefined' || !DATA_KOREKSI) {
    return lapor('Berkas koreksi belum ada di proyek ini. Tempel Koreksi.gs ke editor Apps Script sebagai berkas baru, ' +
      'simpan, lalu jalankan menu ini lagi.');
  }
  var K = DATA_KOREKSI, label = K.judul || 'Koreksi';

  var peta = petaJenisDana();
  var jdBaru = (K.jenisDanaBaru || []).filter(function (j) {
    return !kodeJenisDanaDariNama({ sumber: j.sumber_kode, nama: j.nama }, peta);
  });
  var petaRencana = {};
  Object.keys(peta).forEach(function (k) { petaRencana[k] = peta[k]; });
  jdBaru.forEach(function (j) {
    var kode = '(baru) ' + j.nama;
    petaRencana[kode] = { kode: kode, sumber_kode: j.sumber_kode, nama: j.nama, aktif: true, gabung_ke: '' };
  });

  var sT = sheet('Transaksi'), sR = sheet('M_Rincian');
  var nT = sT.getDataRange().getValues(), nR = sR.getDataRange().getValues();
  var jejak = function () {
    return JSON.stringify([sT.getDataRange().getValues(), sR.getDataRange().getValues(), sheet('M_JenisDana').getDataRange().getValues()]);
  };
  var jejakAwal = jejak();
  var kT = petaKolom(nT[0]), kR = petaKolom(nR[0]);
  var baris = function (nilai, kol, kunci, isi) {
    for (var i = 1; i < nilai.length; i++) if (sel(nilai[i][kol[kunci]]) === isi) return i;
    return -1;
  };

  var konflik = [], sudah = 0;
  function periksa(nilai, kol, i, e, nama) {
    var menjadi = uraikanAcuan(e.menjadi, petaRencana);
    var kolomAsing = Object.keys(menjadi).concat(Object.keys(e.semula || {})).filter(function (k) { return !kol.hasOwnProperty(k); });
    if (kolomAsing.length) { konflik.push(nama + ': kolom tidak dikenal (' + kolomAsing.join(', ') + ')'); return null; }
    if (menjadi.hasOwnProperty('jenis_dana_kode') && !menjadi.jenis_dana_kode) { konflik.push(nama + ': jenis dana tujuan tidak ditemukan'); return null; }
    if (Object.keys(menjadi).every(function (k) { return samaNilai(k, nilai[i][kol[k]], menjadi[k], petaRencana); })) { sudah++; return null; }
    var beda = Object.keys(e.semula || {}).filter(function (k) { return !samaNilai(k, nilai[i][kol[k]], e.semula[k], petaRencana); });
    if (beda.length) {
      konflik.push(nama + ': ' + beda.map(function (k) {
        return k + ' sekarang "' + sel(nilai[i][kol[k]]) + '", semestinya "' + sel(e.semula[k]) + '"';
      }).join('; '));
      return null;
    }
    return { i: i, e: e };
  }

  var rencanaRincian = [], rencanaUbah = [], rencanaTambah = [];
  (K.rincian || []).forEach(function (e) {
    var i = baris(nR, kR, 'kode', e.kode);
    if (i < 0) { konflik.push('Rincian ' + e.kode + ' tidak ditemukan'); return; }
    var p = periksa(nR, kR, i, e, 'Rincian ' + e.kode);
    if (p) rencanaRincian.push(p);
  });
  (K.ubah || []).forEach(function (e) {
    var i = baris(nT, kT, 'id', e.id);
    if (i < 0) { konflik.push(e.id + ' tidak ditemukan'); return; }
    var p = periksa(nT, kT, i, e, e.id);
    if (p) rencanaUbah.push(p);
  });

  var penanda = {};
  for (var n = 1; n < nT.length; n++) {
    (sel(nT[n][kT.catatan]).match(/\[[^\]\s]+\]/g) || []).forEach(function (m) { penanda[m] = true; });
  }
  var tahunSah = {}, sumberSah = {}, penggunaanSah = {};
  baca('M_Tahun').forEach(function (r) { tahunSah[angka(r.tahun)] = true; });
  baca('M_Sumber').forEach(function (r) { sumberSah[String(r.kode).trim()] = true; });
  baca('M_JenisPenggunaan').forEach(function (r) { penggunaanSah[String(r.kode).trim()] = true; });
  (K.tambah || []).forEach(function (e) {
    if (penanda['[' + e.kunci + ']']) { sudah++; return; }
    var d = uraikanAcuan(e.data, petaRencana), alasan = '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.tanggal || ''))) alasan = 'tanggal tidak sah';
    else if (!tahunSah[angka(d.tahun)]) alasan = 'tahun ' + d.tahun + ' belum ada di M_Tahun';
    else if (!sumberSah[d.sumber_kode]) alasan = 'sumber dana ' + d.sumber_kode + ' tidak dikenal';
    else if (!d.jenis_dana_kode || petaRencana[d.jenis_dana_kode].sumber_kode !== d.sumber_kode) alasan = 'jenis dana tidak ditemukan pada sumber ' + d.sumber_kode;
    else if (!penggunaanSah[d.penggunaan_kode]) alasan = 'jenis penggunaan ' + d.penggunaan_kode + ' tidak dikenal';
    else if (!String(d.uraian || '').trim()) alasan = 'uraian kosong';
    else if (!(angka(d.jumlah) > 0)) alasan = 'jumlah harus lebih dari nol';
    if (alasan) konflik.push('Tambah ' + e.kunci + ': ' + alasan);
    else rencanaTambah.push({ e: e, d: d });
  });

  var ditahan = (K.ditahan || []).map(function (x) { return '  ' + x.ket; });
  var catatanKonflik = konflik.length ? '\n\nKonflik, dilewati:\n  ' + konflik.join('\n  ') : '';
  var catatanTahan = ditahan.length ? '\n\nDitahan, menunggu keputusan (tidak diterapkan):\n' + ditahan.join('\n') : '';

  if (!jdBaru.length && !rencanaRincian.length && !rencanaUbah.length && !rencanaTambah.length) {
    return lapor(label + ': tidak ada yang perlu diterapkan' + (sudah ? ' (' + sudah + ' koreksi sudah diterapkan sebelumnya)' : '') +
      '.' + catatanKonflik + catatanTahan);
  }

  var borangBerubah = function (p) {
    var m = uraikanAcuan(p.e.menjadi, petaRencana);
    return Object.keys(m).some(function (k) { return MEDAN_BORANG.indexOf(k) >= 0 && !samaNilai(k, nT[p.i][kT[k]], m[k], petaRencana); });
  };
  var perKategori = {};
  rencanaTambah.forEach(function (p) {
    var jd = petaRencana[p.d.jenis_dana_kode];
    var k = p.d.sumber_kode + ' › ' + jd.nama + ' › ' + p.d.penggunaan_kode;
    perKategori[k] = perKategori[k] || { n: 0, jumlah: 0 };
    perKategori[k].n++; perKategori[k].jumlah += angka(p.d.jumlah);
  });
  var bagian = [label];
  if (jdBaru.length) bagian.push('Jenis dana baru: ' + jdBaru.map(function (j) { return j.sumber_kode + ' › ' + j.nama; }).join(', '));
  if (rencanaRincian.length) bagian.push('Rincian dipindah: ' + rencanaRincian.map(function (p) { return p.e.kode; }).join(', ') +
    (rencanaRincian[0].e.ket ? ' — ' + rencanaRincian[0].e.ket : ''));
  if (rencanaUbah.length) bagian.push('Transaksi diubah: ' + rencanaUbah.length + '\n' + rencanaUbah.map(function (p) {
    return '  ' + p.e.id + ': ' + (p.e.ket || '') + (borangBerubah(p) && sel(nT[p.i][kT.status]).toLowerCase() === STATUS.TERVERIFIKASI ? ' [menjadi diajukan]' : '');
  }).join('\n'));
  if (rencanaTambah.length) bagian.push('Transaksi ditambah: ' + rencanaTambah.length + ', status diajukan, total Rp ' +
    rupiahTeks(rencanaTambah.reduce(function (x, p) { return x + angka(p.d.jumlah); }, 0)) + '\n' +
    Object.keys(perKategori).sort().map(function (k) {
      return '  ' + k + ': ' + perKategori[k].n + ' (Rp ' + rupiahTeks(perKategori[k].jumlah) + ')';
    }).join('\n'));
  if (sudah) bagian.push('Sudah diterapkan sebelumnya: ' + sudah);
  var ringkasan = bagian.join('\n\n') + catatanKonflik + catatanTahan;

  if (ui) {
    var jawab = ui.alert(JUDUL, ringkasan + '\n\nLanjutkan?', ui.ButtonSet.YES_NO);
    if (jawab !== ui.Button.YES) return 'Dibatalkan.';
  }

  var kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  var ditambah = [], gagal = [];
  try {
    if (jejak() !== jejakAwal) {
      return lapor('Data berubah selama dialog terbuka, jadi tidak ada yang ditulis. Jalankan menu ini sekali lagi.');
    }
    var waktu = sekarang();
    var email = '';
    try { email = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (err) {}
    var pelaku = { email: email, peranAsli: 'pemilik skrip' };
    var akhiran = ' (' + label + ')';

    jdBaru.forEach(function (j) {
      var kode = kodeBerikutnya('M_JenisDana', 'kode', 'JD', 2);
      tambahBaris('M_JenisDana', { kode: kode, sumber_kode: j.sumber_kode, nama: j.nama,
        urutan: angka(j.urutan) || (baca('M_JenisDana').length + 1) * 10, aktif: true, gabung_ke: '' });
      catat(pelaku, 'tambah', 'M_JenisDana', kode, j.nama + akhiran);
    });
    peta = petaJenisDana();

    rencanaRincian.forEach(function (p) {
      var m = uraikanAcuan(p.e.menjadi, peta);
      Object.keys(m).forEach(function (k) { nR[p.i][kR[k]] = m[k]; });
      sR.getRange(p.i + 1, 1, 1, nR[0].length).setValues([nR[p.i]]);
      catat(pelaku, 'koreksi', 'M_Rincian', p.e.kode, (p.e.ket || '') + akhiran);
    });

    var berubah = [];
    rencanaUbah.forEach(function (p) {
      var i = p.i, m = uraikanAcuan(p.e.menjadi, peta), borang = false;
      Object.keys(m).forEach(function (k) {
        if (samaNilai(k, nT[i][kT[k]], m[k], peta)) return;
        if (MEDAN_BORANG.indexOf(k) >= 0) borang = true;
        nT[i][kT[k]] = m[k];
      });
      var cat = sel(nT[i][kT.catatan]);
      nT[i][kT.catatan] = 'Koreksi ' + waktu.slice(0, 10) + ': ' + (p.e.ket || '') + (cat ? ' | ' + cat : '');
      nT[i][kT.diubah_pada] = waktu;
      var turun = borang && sel(nT[i][kT.status]).toLowerCase() === STATUS.TERVERIFIKASI;
      if (turun) {
        nT[i][kT.status] = STATUS.DIAJUKAN;
        nT[i][kT.diajukan_pada] = waktu;
        nT[i][kT.diverifikasi_oleh] = '';
        nT[i][kT.diverifikasi_pada] = '';
        nT[i][kT.catatan_verifikasi] = 'Dikoreksi' + akhiran + ' oleh ' + email + '. Periksa, lalu verifikasi.';
      }
      berubah.push(i);
      catat(pelaku, 'koreksi', 'Transaksi', p.e.id, (p.e.ket || '') + (turun ? '; status menjadi diajukan' : '') + akhiran);
    });
    tulisBarisBerurutan(sT, nT, berubah.sort(function (a, b) { return a - b; }));

    var maks = 0;
    for (var r = 1; r < nT.length; r++) {
      var m2 = sel(nT[r][kT.id]).match(/^T(\d+)$/);
      if (m2) maks = Math.max(maks, parseInt(m2[1], 10));
    }
    var baru = [];
    rencanaTambah.forEach(function (p) {
      try {
        var bersih = validasiTransaksi(uraikanAcuan(p.e.data, peta));
        var id = String(++maks);
        while (id.length < 4) id = '0' + id;
        bersih.id = 'T' + id;
        bersih.status = STATUS.DIAJUKAN;
        bersih.dibuat_oleh = email || '(menu SIKEU)';
        bersih.dibuat_pada = waktu;
        bersih.diajukan_pada = waktu;
        bersih.catatan = (bersih.catatan ? bersih.catatan + ' ' : '') + '[' + p.e.kunci + ']';
        baru.push(nT[0].map(function (h) { var v = bersih[String(h).trim()]; return v === undefined ? '' : v; }));
        ditambah.push(bersih.id);
      } catch (err) {
        maks--;
        gagal.push(p.e.kunci + ': ' + err.message);
      }
    });
    if (baru.length) {
      sT.getRange(sT.getLastRow() + 1, 1, baru.length, nT[0].length).setValues(baru);
      catat(pelaku, 'tambah', 'Transaksi', ditambah[0] + '–' + ditambah[ditambah.length - 1],
        baru.length + ' transaksi dari berkas koreksi, status diajukan' + akhiran);
    }
    hapusCache();
  } finally {
    kunci.releaseLock();
  }

  return lapor('Selesai.\n\n' + ringkasan +
    (gagal.length ? '\n\nGagal divalidasi, tidak ditambahkan:\n  ' + gagal.join('\n  ') : '') +
    '\n\nTransaksi berstatus "diajukan" belum masuk Tabel 12 & 13 sampai disetujui verifikator. ' +
    'Semua perubahan tercatat di Log. Berkas Koreksi.gs boleh dihapus dari proyek setelah ini.');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SIKEU')
    .addItem('Siapkan spreadsheet (jalankan sekali)', 'setupSpreadsheet')
    .addItem('Periksa data', 'periksaData')
    .addItem('Rampingkan kategori hibah', 'rampingkanHibah')
    .addItem('Rapikan PNBP & remunerasi sementara', 'rapikanPnbp')
    .addItem('Terapkan berkas koreksi (Koreksi.gs)', 'terapkanKoreksi')
    .addSeparator()
    .addItem('Kosongkan cache', 'hapusCache')
    .addToUi();
}
