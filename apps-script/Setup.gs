/**
 * SIKEU-UPPS — penyiapan awal.
 *
 * Jalankan siapkanSistem() SATU KALI dari editor Apps Script. Fungsi ini
 * membuat seluruh sheet, mengisi master data, dan membuat akun admin pertama.
 * Kata sandi admin dicetak di Log Eksekusi — segera ganti setelah masuk.
 */

var SEED_SUMBER = [
  ['MHS',   'Mahasiswa',                    1],
  ['USAHA', 'Usaha sendiri',                2],
  ['PEM',   'Pemerintah (Pusat & Daerah)',  3],
  ['LAIN',  'Sumber Lain',                  4]
];

// Tujuh baris tetap Tabel 13. Kelompok "operasional" masuk sub-total pertama,
// "investasi" masuk sub-total kedua — persis seperti format borang.
var SEED_PENGGUNAAN = [
  ['P1', 1, 'Pendidikan',                  'operasional', 1],
  ['P2', 2, 'Penelitian',                  'operasional', 2],
  ['P3', 3, 'Pengabdian kepada masyarakat', 'operasional', 3],
  ['P4', 4, 'Investasi SDM',               'investasi',   4],
  ['P5', 5, 'Investasi sarana',            'investasi',   5],
  ['P6', 6, 'Investasi prasarana',         'investasi',   6],
  ['P7', 7, 'Lain-lain',                   'investasi',   7]
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
  // Rincian PNBP mahasiswa (JD01)
  ['RC001', 'JD01', 'SPP Prodi Kesmas',                                          10],
  ['RC002', 'JD01', 'SPI Prodi Kesmas',                                          20],
  ['RC003', 'JD01', 'SPP Prodi Gizi',                                            30],
  ['RC004', 'JD01', 'SPI Prodi Gizi',                                            40],
  ['RC005', 'JD01', 'SPP Prodi S2 Adminkes',                                     50],
  ['RC006', 'JD01', 'SPI Prodi S2 Adminkes',                                     60],
  ['RC007', 'JD01', 'Dana Penelitian dan Pengabdian Internal, Buku Ajar, HKI/Paten', 70],
  ['RC008', 'JD01', 'Remunerasi Dosen',                                          80],
  ['RC009', 'JD01', 'Remunerasi Tendik',                                         90],
  ['RC010', 'JD01', 'Gaji Dosen',                                               100],
  ['RC011', 'JD01', 'Gaji Tendik',                                              110],
  ['RC012', 'JD01', 'Uang Makan Kontrak',                                       120],
  // Rincian DIPA/DRPM (JD08)
  ['RC013', 'JD08', 'Gaji Dosen ASN',                                           130],
  ['RC014', 'JD08', 'Gaji Tendik ASN',                                          140],
  ['RC015', 'JD08', 'Dana Kementerian: Penelitian',                             150],
  ['RC016', 'JD08', 'Dana Kementerian: Hibah Alat/Gedung',                      160],
  ['RC017', 'JD08', 'Dana Kementerian: Beasiswa Pendidikan',                    170],
  ['RC018', 'JD08', 'Dana Kementerian: Lain',                                   180],
  // Rincian hibah dari sumber lain (JD12)
  ['RC019', 'JD12', 'Hibah Penelitian',                                         190],
  ['RC020', 'JD12', 'Konsultan',                                                200],
  ['RC021', 'JD12', 'Hibah Alumni/Swasta',                                      210]
];

var SEED_TAHUN = [
  [2021, '',     true, 2021],
  [2022, '',     true, 2022],
  [2023, 'TS-2', true, 2023],
  [2024, 'TS-1', true, 2024],
  [2025, 'TS',   true, 2025]
];

var SEED_PARAMETER = [
  ['nama_upps',      'UPPS',  'Nama Unit Pengelola Program Studi, tampil di judul dashboard dan cetakan borang'],
  ['jenis_pt',       'PTN',   'PTN atau PTS. Menentukan rumus skor butir 5.1.1'],
  ['jumlah_dosen',   '55',    'Jumlah dosen tetap. Penyebut skor 5.1.2.3 (penelitian) dan 5.1.2.4 (PkM)'],
  ['jumlah_mahasiswa', '1501', 'Jumlah mahasiswa aktif. Penyebut skor 5.1.2.1 (dana operasional)'],
  ['sumber_dosen',   'PEM,LAIN', 'Kode sumber dana yang boleh diinput peran dosen, dipisah koma'],
  ['dashboard_publik', 'tidak', 'Isi "ya" bila dashboard boleh dibuka tanpa login. Default tertutup karena alamat aplikasi ada di repositori publik'],
  ['tahun_ts',       '2025',  'Tahun yang dianggap TS. Dashboard memakai TS, TS-1, TS-2']
];

// ------------------------------------------------------------------ penyiapan

function siapkanSistem() {
  var bk = SpreadsheetApp.getActive();

  Object.keys(SKEMA).forEach(function (nama) {
    var s = bk.getSheetByName(nama);
    if (!s) s = bk.insertSheet(nama);
    if (s.getLastRow() === 0) {
      s.getRange(1, 1, 1, SKEMA[nama].length).setValues([SKEMA[nama]]);
    }
    s.getRange(1, 1, 1, SKEMA[nama].length)
      .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
    s.setFrozenRows(1);
  });

  isiJikaKosong('sumber_dana', SEED_SUMBER);
  isiJikaKosong('jenis_penggunaan', SEED_PENGGUNAAN);
  isiJikaKosong('jenis_dana', SEED_JENIS_DANA.map(function (r) { return [r[0], r[1], r[2], r[3], true]; }));
  isiJikaKosong('rincian', SEED_RINCIAN.map(function (r) { return [r[0], r[1], r[2], r[3], true]; }));
  isiJikaKosong('tahun', SEED_TAHUN);
  isiJikaKosong('parameter', SEED_PARAMETER);

  if (!props().getProperty('LADA')) props().setProperty('LADA', Utilities.getUuid());
  rahasia(); // membangkitkan RAHASIA_TOKEN bila belum ada

  var pesan = buatAdminPertama();

  // Rapikan tampilan sheet transaksi.
  var t = bk.getSheetByName('transaksi');
  t.setColumnWidth(9, 380);          // uraian
  t.getRange('J:J').setNumberFormat('#,##0');

  bk.getSheetByName('sumber_dana').getRange('A1').setNote(
    'Sumber dana Tabel 12 bersifat TETAP sesuai format borang. Jangan ditambah atau diubah.');
  bk.getSheetByName('jenis_penggunaan').getRange('A1').setNote(
    'Jenis penggunaan Tabel 13 bersifat TETAP sesuai format borang. Jangan ditambah atau diubah.');

  Logger.log(pesan);
  try {
    SpreadsheetApp.getUi().alert('Penyiapan selesai', pesan, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) { /* dijalankan tanpa UI */ }
  return pesan;
}

function isiJikaKosong(nama, baris) {
  var s = SpreadsheetApp.getActive().getSheetByName(nama);
  if (s.getLastRow() > 1) return;
  if (!baris.length) return;
  s.getRange(2, 1, baris.length, baris[0].length).setValues(baris);
}

function buatAdminPertama() {
  var ada = baca('pengguna').filter(function (r) { return r.peran === 'admin'; });
  if (ada.length) {
    return 'Sheet dan master data siap. Akun admin sudah ada (' + ada[0].username + '), ' +
           'jadi tidak dibuat ulang.';
  }
  var sandi = sandiAcak(14);
  var garam = Utilities.getUuid();
  tambahBaris('pengguna', {
    id: 'U001', username: 'wadek', nama: 'Wakil Dekan', email: '',
    peran: 'admin', garam: garam, hash: hashSandi(sandi, garam),
    aktif: true, dibuat_pada: sekarang()
  });
  return 'Penyiapan selesai.\n\nAkun admin pertama:\n  Username : wadek\n  Sandi    : ' + sandi +
         '\n\nCatat sandi ini sekarang — tidak akan ditampilkan lagi. ' +
         'Segera ganti lewat halaman Input setelah berhasil masuk.';
}

function sandiAcak(n) {
  var abjad = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < n; i++) s += abjad.charAt(Math.floor(Math.random() * abjad.length));
  return s;
}

/**
 * Setel ulang kata sandi seorang pengguna dari editor Apps Script.
 * Dipakai bila Wakil Dekan lupa sandi dan tidak ada admin lain.
 * Ubah dua nilai di bawah, jalankan, lalu kosongkan kembali.
 */
function setelUlangSandi() {
  var USERNAME = 'wadek';
  var SANDI_BARU = '';        // isi sementara, minimal 8 karakter

  if (!SANDI_BARU) { Logger.log('Isi dulu SANDI_BARU di dalam fungsi ini.'); return; }
  var u = cariBaris('pengguna', 'username', USERNAME);
  if (!u) { Logger.log('Pengguna "' + USERNAME + '" tidak ditemukan.'); return; }
  u.garam = Utilities.getUuid();
  u.hash = hashSandi(SANDI_BARU, u.garam);
  tulisBaris('pengguna', u._baris, u);
  Logger.log('Kata sandi "' + USERNAME + '" berhasil disetel ulang.');
}

/**
 * Periksa kesehatan data: acuan yatim, jenis dana tak terpakai, baris
 * yang masih menunggu tinjauan. Jalankan kapan pun untuk memeriksa integritas.
 */
function periksaData() {
  var jd = {}, rc = {}, th = {}, pg = {}, sd = {};
  baca('jenis_dana').forEach(function (r) { jd[r.id] = r; });
  baca('rincian').forEach(function (r) { rc[r.id] = r; });
  baca('tahun').forEach(function (r) { th[angka(r.tahun)] = r; });
  baca('jenis_penggunaan').forEach(function (r) { pg[r.kode] = r; });
  baca('sumber_dana').forEach(function (r) { sd[r.kode] = r; });

  var masalah = [];
  var menunggu = 0, tinjau = 0, total = 0;

  baca('transaksi').forEach(function (t) {
    if (!t.id) return;
    total++;
    if (!sd[t.sumber_kode])        masalah.push(t.id + ': sumber dana "' + t.sumber_kode + '" tidak ada di master');
    if (!jd[t.jenis_dana_id])      masalah.push(t.id + ': jenis dana "' + t.jenis_dana_id + '" tidak ada di master');
    else if (jd[t.jenis_dana_id].sumber_kode !== t.sumber_kode)
      masalah.push(t.id + ': jenis dana ' + t.jenis_dana_id + ' bukan milik sumber ' + t.sumber_kode);
    if (t.rincian_id && !rc[t.rincian_id]) masalah.push(t.id + ': rincian "' + t.rincian_id + '" tidak ada di master');
    if (!pg[t.penggunaan_kode])    masalah.push(t.id + ': jenis penggunaan "' + t.penggunaan_kode + '" tidak ada di master');
    if (!th[angka(t.tahun)])       masalah.push(t.id + ': tahun ' + t.tahun + ' tidak ada di master');
    if (!(angka(t.jumlah) > 0))    masalah.push(t.id + ': jumlah dana kosong atau nol');
    if (String(t.status) === STATUS_MENUNGGU) menunggu++;
    if (benar(t.perlu_tinjau)) tinjau++;
  });

  var lap = 'PEMERIKSAAN DATA SIKEU-UPPS\n' +
    '  Total transaksi        : ' + total + '\n' +
    '  Menunggu verifikasi    : ' + menunggu + '\n' +
    '  Perlu ditinjau manual  : ' + tinjau + '\n' +
    '  Masalah ditemukan      : ' + masalah.length + '\n';
  if (masalah.length) lap += '\n' + masalah.slice(0, 50).join('\n');
  if (masalah.length > 50) lap += '\n... dan ' + (masalah.length - 50) + ' lainnya.';

  Logger.log(lap);
  try {
    SpreadsheetApp.getUi().alert('Pemeriksaan Data', lap, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) { /* tanpa UI */ }
  return lap;
}

/** Menu bantu di Google Sheets. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SIKEU')
    .addItem('Siapkan sistem (jalankan sekali)', 'siapkanSistem')
    .addItem('Periksa data', 'periksaData')
    .addSeparator()
    .addItem('Kosongkan cache', 'hapusCache')
    .addToUi();
}
