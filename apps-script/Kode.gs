/**
 * SIKEU-UPPS — API Sistem Informasi Keuangan UPPS
 * Backend  : Google Apps Script Web App, data disimpan di Google Sheets
 * Frontend : halaman statis di GitHub Pages
 *
 * Semua permintaan masuk lewat doPost dengan Content-Type text/plain
 * (permintaan "simple" sehingga tidak memicu preflight CORS yang tidak
 * didukung Apps Script). Isi body berupa JSON: { aksi, token, data }.
 */

// ---------------------------------------------------------------- skema sheet

var SKEMA = {
  pengguna:         ['id', 'username', 'nama', 'email', 'peran', 'garam', 'hash', 'aktif', 'dibuat_pada'],
  sumber_dana:      ['kode', 'nama', 'urutan'],
  jenis_dana:       ['id', 'sumber_kode', 'nama', 'urutan', 'aktif'],
  rincian:          ['id', 'jenis_dana_id', 'nama', 'urutan', 'aktif'],
  jenis_penggunaan: ['kode', 'no', 'nama', 'kelompok', 'urutan'],
  tahun:            ['tahun', 'label_ts', 'aktif', 'urutan'],
  parameter:        ['kunci', 'nilai', 'keterangan'],
  transaksi:        ['id', 'tanggal', 'tahun', 'sumber_kode', 'jenis_dana_id', 'rincian_id',
                     'penggunaan_kode', 'skema', 'uraian', 'jumlah', 'status', 'catatan',
                     'perlu_tinjau', 'dibuat_oleh', 'dibuat_pada', 'diubah_oleh', 'diubah_pada',
                     'diverifikasi_oleh', 'diverifikasi_pada'],
  log:              ['waktu', 'username', 'aksi', 'entitas', 'ref_id', 'detail']
};

var STATUS_MENUNGGU = 'Menunggu Verifikasi';
var STATUS_TERVERIFIKASI = 'Terverifikasi';

// ------------------------------------------------------------------ utilitas

function props() { return PropertiesService.getScriptProperties(); }
function bk() { return SpreadsheetApp.getActive(); }

function sheet(nama) {
  var s = bk().getSheetByName(nama);
  if (!s) throw new Error('Sheet "' + nama + '" belum ada. Jalankan siapkanSistem() dulu.');
  return s;
}

/** Baca seluruh sheet sebagai array objek, memakai baris pertama sebagai header. */
function baca(nama) {
  var nilai = sheet(nama).getDataRange().getValues();
  if (nilai.length < 2) return [];
  var header = nilai[0].map(function (h) { return String(h).trim(); });
  var hasil = [];
  for (var i = 1; i < nilai.length; i++) {
    var baris = nilai[i];
    if (baris.every(function (v) { return v === '' || v === null; })) continue;
    var o = { _baris: i + 1 };
    for (var k = 0; k < header.length; k++) o[header[k]] = baris[k];
    hasil.push(o);
  }
  return hasil;
}

function indeksKolom(nama) {
  var header = sheet(nama).getRange(1, 1, 1, sheet(nama).getLastColumn()).getValues()[0];
  var peta = {};
  header.forEach(function (h, i) { peta[String(h).trim()] = i + 1; });
  return peta;
}

function tambahBaris(nama, obj) {
  var kolom = SKEMA[nama];
  sheet(nama).appendRow(kolom.map(function (k) { return obj[k] === undefined ? '' : obj[k]; }));
}

function tulisBaris(nama, nomorBaris, obj) {
  var kolom = SKEMA[nama];
  sheet(nama).getRange(nomorBaris, 1, 1, kolom.length)
    .setValues([kolom.map(function (k) { return obj[k] === undefined ? '' : obj[k]; })]);
}

function cariBaris(nama, kunci, nilai) {
  var data = baca(nama);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][kunci]) === String(nilai)) return data[i];
  }
  return null;
}

function sekarang() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");
}

function idBerikutnya(nama, kunci, awalan, lebar) {
  var data = baca(nama);
  var maks = 0;
  data.forEach(function (r) {
    var m = String(r[kunci]).match(new RegExp('^' + awalan + '(\\d+)$'));
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  var n = String(maks + 1);
  while (n.length < lebar) n = '0' + n;
  return awalan + n;
}

function angka(v) {
  if (v === '' || v === null || v === undefined) return 0;
  var n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function benar(v) {
  return v === true || String(v).toUpperCase() === 'TRUE' || String(v) === '1' || String(v).toLowerCase() === 'ya';
}

function catat(username, aksi, entitas, refId, detail) {
  try {
    tambahBaris('log', {
      waktu: sekarang(), username: username || '-', aksi: aksi,
      entitas: entitas || '', ref_id: refId || '', detail: detail || ''
    });
  } catch (err) { /* log tidak boleh menggagalkan operasi utama */ }
}

function hapusCache() {
  CacheService.getScriptCache().removeAll(['rekap', 'master']);
}

// --------------------------------------------------------------- autentikasi

function rahasia() {
  var r = props().getProperty('RAHASIA_TOKEN');
  if (!r) {
    r = Utilities.getUuid() + Utilities.getUuid();
    props().setProperty('RAHASIA_TOKEN', r);
  }
  return r;
}

function heks(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function hashSandi(sandi, garam) {
  var lada = props().getProperty('LADA') || '';
  return heks(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, garam + ':' + sandi + ':' + lada, Utilities.Charset.UTF_8));
}

function buatToken(u) {
  var isi = Utilities.base64EncodeWebSafe(JSON.stringify({
    u: u.username, p: u.peran, e: Date.now() + 12 * 3600 * 1000
  }));
  var tanda = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(isi, rahasia()));
  return isi + '.' + tanda;
}

/** Kembalikan objek pengguna bila token sah, atau null. */
function periksaToken(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  var bagian = String(token).split('.');
  var harap = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(bagian[0], rahasia()));
  if (bagian[1] !== harap) return null;
  var isi;
  try {
    isi = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(bagian[0])).getDataAsString());
  } catch (err) { return null; }
  if (!isi.e || Date.now() > isi.e) return null;
  var u = cariBaris('pengguna', 'username', isi.u);
  if (!u || !benar(u.aktif)) return null;
  return u;
}

// -------------------------------------------------------------------- router

/** Aksi publik (tanpa login) dan peran yang boleh mengakses sisanya. */
var IZIN = {
  login:            '*',
  rekap:            '*',
  master:           '*',
  saya:             ['admin', 'dosen'],
  listTransaksi:    ['admin', 'dosen'],
  simpanTransaksi:  ['admin', 'dosen'],
  hapusTransaksi:   ['admin', 'dosen'],
  gantiSandi:       ['admin', 'dosen'],
  verifikasi:       ['admin'],
  simpanJenisDana:  ['admin'],
  hapusJenisDana:   ['admin'],
  simpanRincian:    ['admin'],
  hapusRincian:     ['admin'],
  simpanTahun:      ['admin'],
  hapusTahun:       ['admin'],
  simpanParameter:  ['admin'],
  simpanPengguna:   ['admin'],
  hapusPengguna:    ['admin'],
  listPengguna:     ['admin'],
  masterPenuh:      ['admin'],
  listLog:          ['admin']
};

function balas(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Apakah dashboard boleh dilihat tanpa login?
 *
 * Default "tidak": angka keuangan hanya terbuka bagi pengguna terdaftar.
 * Ubah parameter dashboard_publik menjadi "ya" di halaman Kelola Master bila
 * Anda memang ingin dashboard dapat dibuka siapa saja yang tahu alamatnya —
 * ingat bahwa alamat itu ada di repositori publik.
 */
function dashboardPublik() {
  var p = cariBaris('parameter', 'kunci', 'dashboard_publik');
  return !!p && String(p.nilai).trim().toLowerCase() === 'ya';
}

/** Izin efektif sebuah aksi, setelah memperhitungkan pengaturan dashboard. */
function izinEfektif(aksi) {
  var izin = IZIN[aksi];
  if ((aksi === 'rekap' || aksi === 'master') && !dashboardPublik()) return ['admin', 'dosen'];
  return izin;
}

function doGet(e) {
  var aksi = (e && e.parameter && e.parameter.aksi) || '';
  if (aksi === 'rekap' || aksi === 'master') {
    if (!dashboardPublik()) {
      return balas({ ok: false, pesan: 'Dashboard memerlukan login.', keluar: true });
    }
    return balas({ ok: true, data: aksi === 'rekap' ? aksiRekap() : aksiMaster() });
  }
  return ContentService.createTextOutput(
    'SIKEU-UPPS API aktif. Gunakan POST untuk semua operasi.'
  ).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var permintaan;
  try {
    permintaan = JSON.parse(e.postData.contents);
  } catch (err) {
    return balas({ ok: false, pesan: 'Format permintaan tidak valid.' });
  }

  var aksi = permintaan.aksi;
  if (!IZIN[aksi]) return balas({ ok: false, pesan: 'Aksi tidak dikenal: ' + aksi });
  var izin = izinEfektif(aksi);

  var pengguna = null;
  if (izin !== '*') {
    pengguna = periksaToken(permintaan.token);
    if (!pengguna) return balas({ ok: false, pesan: 'Sesi berakhir. Silakan masuk kembali.', keluar: true });
    if (izin.indexOf(pengguna.peran) < 0) {
      return balas({ ok: false, pesan: 'Anda tidak berhak melakukan aksi ini.' });
    }
  }

  var data = permintaan.data || {};
  var kunci = null;
  try {
    // Operasi tulis dikunci agar tidak saling menimpa.
    if (aksi.indexOf('simpan') === 0 || aksi.indexOf('hapus') === 0 ||
        aksi === 'verifikasi' || aksi === 'gantiSandi') {
      kunci = LockService.getScriptLock();
      kunci.waitLock(20000);
    }
    var hasil = jalankan(aksi, data, pengguna);
    return balas({ ok: true, data: hasil });
  } catch (err) {
    return balas({ ok: false, pesan: String(err && err.message ? err.message : err) });
  } finally {
    if (kunci) kunci.releaseLock();
  }
}

function jalankan(aksi, d, u) {
  switch (aksi) {
    case 'login':           return aksiLogin(d);
    case 'saya':            return { username: u.username, nama: u.nama, peran: u.peran, email: u.email };
    case 'master':          return aksiMaster();
    case 'rekap':           return aksiRekap();
    case 'listTransaksi':   return aksiListTransaksi(d, u);
    case 'simpanTransaksi': return aksiSimpanTransaksi(d, u);
    case 'hapusTransaksi':  return aksiHapusTransaksi(d, u);
    case 'verifikasi':      return aksiVerifikasi(d, u);
    case 'gantiSandi':      return aksiGantiSandi(d, u);
    case 'simpanJenisDana': return aksiSimpanJenisDana(d, u);
    case 'hapusJenisDana':  return aksiHapusJenisDana(d, u);
    case 'simpanRincian':   return aksiSimpanRincian(d, u);
    case 'hapusRincian':    return aksiHapusRincian(d, u);
    case 'simpanTahun':     return aksiSimpanTahun(d, u);
    case 'hapusTahun':      return aksiHapusTahun(d, u);
    case 'simpanParameter': return aksiSimpanParameter(d, u);
    case 'simpanPengguna':  return aksiSimpanPengguna(d, u);
    case 'hapusPengguna':   return aksiHapusPengguna(d, u);
    case 'listPengguna':    return aksiListPengguna();
    case 'masterPenuh':     return aksiMasterPenuh();
    case 'listLog':         return aksiListLog(d);
  }
  throw new Error('Aksi tidak dikenal: ' + aksi);
}

// --------------------------------------------------------------------- login

function aksiLogin(d) {
  var username = String(d.username || '').trim().toLowerCase();
  var u = cariBaris('pengguna', 'username', username);
  // Pesan sengaja disamakan agar tidak membocorkan username mana yang ada.
  var gagal = new Error('Username atau kata sandi salah.');
  if (!u) throw gagal;
  if (!benar(u.aktif)) throw new Error('Akun Anda dinonaktifkan. Hubungi Wakil Dekan.');
  if (hashSandi(String(d.sandi || ''), u.garam) !== String(u.hash)) throw gagal;
  catat(username, 'login', 'pengguna', u.id, '');
  return {
    token: buatToken(u),
    pengguna: { username: u.username, nama: u.nama, peran: u.peran, email: u.email }
  };
}

function aksiGantiSandi(d, u) {
  if (hashSandi(String(d.sandiLama || ''), u.garam) !== String(u.hash)) {
    throw new Error('Kata sandi lama salah.');
  }
  var baru = String(d.sandiBaru || '');
  if (baru.length < 8) throw new Error('Kata sandi baru minimal 8 karakter.');
  var garam = Utilities.getUuid();
  u.garam = garam;
  u.hash = hashSandi(baru, garam);
  tulisBaris('pengguna', u._baris, u);
  catat(u.username, 'ganti-sandi', 'pengguna', u.id, '');
  return { pesan: 'Kata sandi berhasil diubah.' };
}

// -------------------------------------------------------------- master data

function aksiMaster() {
  var tunai = CacheService.getScriptCache().get('master');
  if (tunai) return JSON.parse(tunai);

  var hasil = {
    sumber_dana: baca('sumber_dana').map(function (r) {
      return { kode: r.kode, nama: r.nama, urutan: angka(r.urutan) };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    jenis_dana: baca('jenis_dana').filter(function (r) { return benar(r.aktif); })
      .map(function (r) {
        return { id: r.id, sumber_kode: r.sumber_kode, nama: r.nama, urutan: angka(r.urutan) };
      }).sort(function (a, b) { return a.urutan - b.urutan; }),

    rincian: baca('rincian').filter(function (r) { return benar(r.aktif); })
      .map(function (r) {
        return { id: r.id, jenis_dana_id: r.jenis_dana_id, nama: r.nama, urutan: angka(r.urutan) };
      }).sort(function (a, b) { return a.urutan - b.urutan; }),

    jenis_penggunaan: baca('jenis_penggunaan').map(function (r) {
      return { kode: r.kode, no: angka(r.no), nama: r.nama, kelompok: r.kelompok, urutan: angka(r.urutan) };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    tahun: baca('tahun').filter(function (r) { return benar(r.aktif); })
      .map(function (r) {
        return { tahun: angka(r.tahun), label_ts: r.label_ts || '', urutan: angka(r.urutan) };
      }).sort(function (a, b) { return a.tahun - b.tahun; }),

    parameter: {}
  };
  baca('parameter').forEach(function (r) { hasil.parameter[r.kunci] = r.nilai; });

  CacheService.getScriptCache().put('master', JSON.stringify(hasil), 300);
  return hasil;
}

// ------------------------------------------------------------------- rekap

/**
 * Kembalikan master + agregat transaksi. Tabel 12, Tabel 13, skor akreditasi
 * dan grafik semuanya disusun di sisi frontend dari agregat ini, sehingga
 * pengguna bisa mengganti filter tanpa memanggil server lagi.
 */
function aksiRekap() {
  var tunai = CacheService.getScriptCache().get('rekap');
  if (tunai) return JSON.parse(tunai);

  var ember = {};
  var menunggu = 0, perluTinjau = 0, jumlahBaris = 0;

  baca('transaksi').forEach(function (t) {
    if (!t.id) return;
    jumlahBaris++;
    var status = String(t.status || STATUS_MENUNGGU);
    if (status === STATUS_MENUNGGU) menunggu++;
    if (benar(t.perlu_tinjau)) perluTinjau++;

    var k = [t.sumber_kode, t.jenis_dana_id, t.rincian_id || '', t.penggunaan_kode,
             t.skema || 'Mandiri', angka(t.tahun), status].join('||');
    if (!ember[k]) ember[k] = { n: 0, c: 0 };
    ember[k].n += angka(t.jumlah);
    ember[k].c += 1;
  });

  var agregat = Object.keys(ember).map(function (k) {
    var p = k.split('||');
    return {
      s: p[0], j: p[1], r: p[2], g: p[3], k: p[4],
      t: Number(p[5]), v: p[6] === STATUS_TERVERIFIKASI ? 1 : 0,
      n: ember[k].n, c: ember[k].c
    };
  });

  var hasil = {
    master: aksiMaster(),
    agregat: agregat,
    ringkas: {
      jumlah_transaksi: jumlahBaris,
      menunggu_verifikasi: menunggu,
      perlu_tinjau: perluTinjau,
      diperbarui: sekarang()
    }
  };

  var teks = JSON.stringify(hasil);
  if (teks.length < 95000) CacheService.getScriptCache().put('rekap', teks, 120);
  return hasil;
}

// --------------------------------------------------------------- transaksi

/** Sumber dana yang boleh diinput oleh peran "dosen" (default: eksternal). */
function sumberBolehDosen() {
  var p = cariBaris('parameter', 'kunci', 'sumber_dosen');
  return String((p && p.nilai) || 'PEM,LAIN').split(',').map(function (s) { return s.trim(); });
}

function pastikanBolehTulis(t, u, modeUbah) {
  if (u.peran === 'admin') return;
  var boleh = sumberBolehDosen();
  if (boleh.indexOf(String(t.sumber_kode)) < 0) {
    throw new Error('Sebagai dosen Anda hanya dapat menginput dana dari sumber: ' + boleh.join(', ') + '.');
  }
  if (modeUbah) {
    if (String(t.dibuat_oleh) !== u.username) {
      throw new Error('Anda hanya dapat mengubah data yang Anda input sendiri.');
    }
    if (String(t.status) === STATUS_TERVERIFIKASI) {
      throw new Error('Data ini sudah diverifikasi Wakil Dekan sehingga terkunci. Hubungi Wakil Dekan bila perlu koreksi.');
    }
  }
}

function aksiListTransaksi(d, u) {
  var f = d.filter || {};
  var data = baca('transaksi').filter(function (t) { return !!t.id; });

  if (u.peran === 'dosen' && !f.semua) {
    data = data.filter(function (t) { return String(t.dibuat_oleh) === u.username; });
  }
  if (f.tahun) data = data.filter(function (t) { return angka(t.tahun) === angka(f.tahun); });
  if (f.sumber) data = data.filter(function (t) { return t.sumber_kode === f.sumber; });
  if (f.jenis_dana) data = data.filter(function (t) { return t.jenis_dana_id === f.jenis_dana; });
  if (f.penggunaan) data = data.filter(function (t) { return t.penggunaan_kode === f.penggunaan; });
  if (f.status) data = data.filter(function (t) { return String(t.status) === f.status; });
  if (f.perlu_tinjau) data = data.filter(function (t) { return benar(t.perlu_tinjau); });
  if (f.cari) {
    var q = String(f.cari).toLowerCase();
    data = data.filter(function (t) { return String(t.uraian).toLowerCase().indexOf(q) >= 0; });
  }

  data.sort(function (a, b) {
    if (angka(b.tahun) !== angka(a.tahun)) return angka(b.tahun) - angka(a.tahun);
    return String(b.id).localeCompare(String(a.id));
  });

  var total = data.length;
  var jumlahTotal = data.reduce(function (s, t) { return s + angka(t.jumlah); }, 0);
  var hal = Math.max(1, angka(d.halaman) || 1);
  var per = Math.min(500, angka(d.perHalaman) || 50);
  var potong = data.slice((hal - 1) * per, hal * per);

  return {
    total: total,
    jumlah_total: jumlahTotal,
    halaman: hal,
    per_halaman: per,
    baris: potong.map(function (t) {
      return {
        id: t.id, tanggal: normalTanggal(t.tanggal), tahun: angka(t.tahun),
        sumber_kode: t.sumber_kode, jenis_dana_id: t.jenis_dana_id, rincian_id: t.rincian_id || '',
        penggunaan_kode: t.penggunaan_kode, skema: t.skema, uraian: t.uraian,
        jumlah: angka(t.jumlah), status: t.status, catatan: t.catatan || '',
        perlu_tinjau: benar(t.perlu_tinjau), dibuat_oleh: t.dibuat_oleh,
        dibuat_pada: normalTanggal(t.dibuat_pada), diubah_oleh: t.diubah_oleh || '',
        diverifikasi_oleh: t.diverifikasi_oleh || ''
      };
    })
  };
}

function normalTanggal(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
  return String(v || '');
}

function validasiTransaksi(d) {
  var t = {
    tanggal: String(d.tanggal || '').trim(),
    tahun: angka(d.tahun),
    sumber_kode: String(d.sumber_kode || '').trim(),
    jenis_dana_id: String(d.jenis_dana_id || '').trim(),
    rincian_id: String(d.rincian_id || '').trim(),
    penggunaan_kode: String(d.penggunaan_kode || '').trim(),
    skema: String(d.skema || 'Mandiri').trim(),
    uraian: String(d.uraian || '').trim(),
    jumlah: angka(d.jumlah),
    catatan: String(d.catatan || '').trim(),
    perlu_tinjau: benar(d.perlu_tinjau)
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.tanggal)) throw new Error('Tanggal wajib diisi (format YYYY-MM-DD).');
  if (!t.tahun) t.tahun = angka(t.tanggal.slice(0, 4));
  if (!cariBaris('tahun', 'tahun', t.tahun)) throw new Error('Tahun ' + t.tahun + ' belum terdaftar di master Tahun.');
  if (!cariBaris('sumber_dana', 'kode', t.sumber_kode)) throw new Error('Sumber dana tidak dikenal.');

  var jd = cariBaris('jenis_dana', 'id', t.jenis_dana_id);
  if (!jd) throw new Error('Jenis dana wajib dipilih.');
  if (String(jd.sumber_kode) !== t.sumber_kode) {
    throw new Error('Jenis dana "' + jd.nama + '" bukan milik sumber dana yang dipilih.');
  }
  if (t.rincian_id) {
    var rc = cariBaris('rincian', 'id', t.rincian_id);
    if (!rc) throw new Error('Rincian tidak dikenal.');
    if (String(rc.jenis_dana_id) !== t.jenis_dana_id) {
      throw new Error('Rincian "' + rc.nama + '" bukan milik jenis dana yang dipilih.');
    }
  }
  if (!cariBaris('jenis_penggunaan', 'kode', t.penggunaan_kode)) throw new Error('Jenis penggunaan wajib dipilih.');
  if (['Mandiri', 'Kerjasama'].indexOf(t.skema) < 0) t.skema = 'Mandiri';
  if (!t.uraian) throw new Error('Uraian wajib diisi.');
  if (!(t.jumlah > 0)) throw new Error('Jumlah dana harus lebih besar dari nol.');
  return t;
}

function aksiSimpanTransaksi(d, u) {
  var bersih = validasiTransaksi(d);
  var lama = d.id ? cariBaris('transaksi', 'id', d.id) : null;
  if (d.id && !lama) throw new Error('Transaksi ' + d.id + ' tidak ditemukan.');

  if (lama) {
    pastikanBolehTulis(lama, u, true);
    pastikanBolehTulis(bersih, u, false);
    var gabung = {};
    SKEMA.transaksi.forEach(function (k) { gabung[k] = lama[k]; });
    Object.keys(bersih).forEach(function (k) { gabung[k] = bersih[k]; });
    gabung.id = lama.id;
    gabung.diubah_oleh = u.username;
    gabung.diubah_pada = sekarang();
    // Perubahan oleh dosen mengembalikan status ke antrean verifikasi.
    if (u.peran !== 'admin') {
      gabung.status = STATUS_MENUNGGU;
      gabung.diverifikasi_oleh = '';
      gabung.diverifikasi_pada = '';
    }
    gabung.dibuat_pada = normalTanggal(lama.dibuat_pada);
    tulisBaris('transaksi', lama._baris, gabung);
    catat(u.username, 'ubah', 'transaksi', lama.id, bersih.uraian);
    hapusCache();
    return { id: lama.id, pesan: 'Perubahan tersimpan.' };
  }

  pastikanBolehTulis(bersih, u, false);
  bersih.id = idBerikutnya('transaksi', 'id', 'T', 4);
  bersih.status = u.peran === 'admin' ? STATUS_TERVERIFIKASI : STATUS_MENUNGGU;
  bersih.dibuat_oleh = u.username;
  bersih.dibuat_pada = sekarang();
  bersih.diubah_oleh = '';
  bersih.diubah_pada = '';
  bersih.diverifikasi_oleh = u.peran === 'admin' ? u.username : '';
  bersih.diverifikasi_pada = u.peran === 'admin' ? sekarang() : '';
  tambahBaris('transaksi', bersih);
  catat(u.username, 'tambah', 'transaksi', bersih.id, bersih.uraian);
  hapusCache();
  return {
    id: bersih.id,
    pesan: u.peran === 'admin'
      ? 'Transaksi tersimpan dan langsung terverifikasi.'
      : 'Transaksi tersimpan dan menunggu verifikasi Wakil Dekan.'
  };
}

function aksiHapusTransaksi(d, u) {
  var t = cariBaris('transaksi', 'id', d.id);
  if (!t) throw new Error('Transaksi tidak ditemukan.');
  pastikanBolehTulis(t, u, true);
  sheet('transaksi').deleteRow(t._baris);
  catat(u.username, 'hapus', 'transaksi', t.id, t.uraian);
  hapusCache();
  return { pesan: 'Transaksi dihapus.' };
}

function aksiVerifikasi(d, u) {
  var daftar = d.ids || [];
  var jadi = d.status === STATUS_MENUNGGU ? STATUS_MENUNGGU : STATUS_TERVERIFIKASI;
  var kolom = indeksKolom('transaksi');
  var s = sheet('transaksi');
  var semua = baca('transaksi');
  var n = 0;

  daftar.forEach(function (id) {
    var t = null;
    for (var i = 0; i < semua.length; i++) { if (String(semua[i].id) === String(id)) { t = semua[i]; break; } }
    if (!t) return;
    s.getRange(t._baris, kolom.status).setValue(jadi);
    s.getRange(t._baris, kolom.diverifikasi_oleh).setValue(jadi === STATUS_TERVERIFIKASI ? u.username : '');
    s.getRange(t._baris, kolom.diverifikasi_pada).setValue(jadi === STATUS_TERVERIFIKASI ? sekarang() : '');
    if (d.selesaiTinjau) s.getRange(t._baris, kolom.perlu_tinjau).setValue(false);
    n++;
  });

  catat(u.username, jadi === STATUS_TERVERIFIKASI ? 'verifikasi' : 'batal-verifikasi', 'transaksi', daftar.join(','), n + ' baris');
  hapusCache();
  return { pesan: n + ' transaksi diperbarui menjadi "' + jadi + '".' };
}

// ------------------------------------------------------- master: jenis dana

function aksiSimpanJenisDana(d, u) {
  var nama = String(d.nama || '').trim();
  if (!nama) throw new Error('Nama jenis dana wajib diisi.');
  if (!cariBaris('sumber_dana', 'kode', d.sumber_kode)) throw new Error('Sumber dana tidak dikenal.');

  var kembar = baca('jenis_dana').filter(function (r) {
    return String(r.sumber_kode) === String(d.sumber_kode) &&
           String(r.nama).toLowerCase() === nama.toLowerCase() &&
           String(r.id) !== String(d.id);
  });
  if (kembar.length) throw new Error('Jenis dana "' + nama + '" sudah ada pada sumber tersebut.');

  var isi = {
    sumber_kode: d.sumber_kode, nama: nama,
    urutan: angka(d.urutan) || (baca('jenis_dana').length + 1) * 10,
    aktif: d.aktif === false ? false : true
  };

  if (d.id) {
    var lama = cariBaris('jenis_dana', 'id', d.id);
    if (!lama) throw new Error('Jenis dana tidak ditemukan.');
    isi.id = lama.id;
    tulisBaris('jenis_dana', lama._baris, isi);
    catat(u.username, 'ubah', 'jenis_dana', isi.id, nama);
  } else {
    isi.id = idBerikutnya('jenis_dana', 'id', 'JD', 2);
    tambahBaris('jenis_dana', isi);
    catat(u.username, 'tambah', 'jenis_dana', isi.id, nama);
  }
  hapusCache();
  return { id: isi.id, pesan: 'Jenis dana tersimpan.' };
}

function aksiHapusJenisDana(d, u) {
  var r = cariBaris('jenis_dana', 'id', d.id);
  if (!r) throw new Error('Jenis dana tidak ditemukan.');
  var dipakai = baca('transaksi').filter(function (t) { return String(t.jenis_dana_id) === String(d.id); }).length;
  if (dipakai) {
    throw new Error('Jenis dana ini dipakai oleh ' + dipakai + ' transaksi sehingga tidak bisa dihapus. ' +
                    'Nonaktifkan saja agar tidak muncul di form input tetapi riwayatnya tetap utuh.');
  }
  var anak = baca('rincian').filter(function (x) { return String(x.jenis_dana_id) === String(d.id); });
  anak.reverse().forEach(function (x) { sheet('rincian').deleteRow(x._baris); });
  sheet('jenis_dana').deleteRow(r._baris);
  catat(u.username, 'hapus', 'jenis_dana', d.id, r.nama);
  hapusCache();
  return { pesan: 'Jenis dana dihapus.' };
}

// ---------------------------------------------------------- master: rincian

function aksiSimpanRincian(d, u) {
  var nama = String(d.nama || '').trim();
  if (!nama) throw new Error('Nama rincian wajib diisi.');
  if (!cariBaris('jenis_dana', 'id', d.jenis_dana_id)) throw new Error('Jenis dana tidak dikenal.');

  var isi = {
    jenis_dana_id: d.jenis_dana_id, nama: nama,
    urutan: angka(d.urutan) || (baca('rincian').length + 1) * 10,
    aktif: d.aktif === false ? false : true
  };

  if (d.id) {
    var lama = cariBaris('rincian', 'id', d.id);
    if (!lama) throw new Error('Rincian tidak ditemukan.');
    isi.id = lama.id;
    tulisBaris('rincian', lama._baris, isi);
    catat(u.username, 'ubah', 'rincian', isi.id, nama);
  } else {
    isi.id = idBerikutnya('rincian', 'id', 'RC', 3);
    tambahBaris('rincian', isi);
    catat(u.username, 'tambah', 'rincian', isi.id, nama);
  }
  hapusCache();
  return { id: isi.id, pesan: 'Rincian tersimpan.' };
}

function aksiHapusRincian(d, u) {
  var r = cariBaris('rincian', 'id', d.id);
  if (!r) throw new Error('Rincian tidak ditemukan.');
  var dipakai = baca('transaksi').filter(function (t) { return String(t.rincian_id) === String(d.id); }).length;
  if (dipakai) throw new Error('Rincian ini dipakai oleh ' + dipakai + ' transaksi. Nonaktifkan saja.');
  sheet('rincian').deleteRow(r._baris);
  catat(u.username, 'hapus', 'rincian', d.id, r.nama);
  hapusCache();
  return { pesan: 'Rincian dihapus.' };
}

// ------------------------------------------------------------ master: tahun

function aksiSimpanTahun(d, u) {
  var th = angka(d.tahun);
  if (th < 1900 || th > 2200) throw new Error('Tahun tidak valid.');
  var label = String(d.label_ts || '').trim().toUpperCase();
  if (label && !/^TS(-[1-9])?$/.test(label)) throw new Error('Label harus TS, TS-1, TS-2, dan seterusnya.');

  // Satu label TS hanya boleh dipakai satu tahun.
  if (label) {
    baca('tahun').forEach(function (r) {
      if (String(r.label_ts).toUpperCase() === label && angka(r.tahun) !== th) {
        sheet('tahun').getRange(r._baris, indeksKolom('tahun').label_ts).setValue('');
      }
    });
  }

  var isi = { tahun: th, label_ts: label, aktif: d.aktif === false ? false : true, urutan: th };
  var lama = cariBaris('tahun', 'tahun', th);
  if (lama) tulisBaris('tahun', lama._baris, isi);
  else tambahBaris('tahun', isi);
  catat(u.username, lama ? 'ubah' : 'tambah', 'tahun', String(th), label);
  hapusCache();
  return { pesan: 'Tahun ' + th + ' tersimpan.' };
}

function aksiHapusTahun(d, u) {
  var r = cariBaris('tahun', 'tahun', angka(d.tahun));
  if (!r) throw new Error('Tahun tidak ditemukan.');
  var dipakai = baca('transaksi').filter(function (t) { return angka(t.tahun) === angka(d.tahun); }).length;
  if (dipakai) throw new Error('Tahun ini dipakai oleh ' + dipakai + ' transaksi. Nonaktifkan saja.');
  sheet('tahun').deleteRow(r._baris);
  catat(u.username, 'hapus', 'tahun', String(d.tahun), '');
  hapusCache();
  return { pesan: 'Tahun dihapus.' };
}

// -------------------------------------------------------- master: parameter

function aksiSimpanParameter(d, u) {
  var daftar = d.parameter || {};
  var kolom = indeksKolom('parameter');
  Object.keys(daftar).forEach(function (k) {
    var r = cariBaris('parameter', 'kunci', k);
    if (r) sheet('parameter').getRange(r._baris, kolom.nilai).setValue(daftar[k]);
    else tambahBaris('parameter', { kunci: k, nilai: daftar[k], keterangan: '' });
  });
  catat(u.username, 'ubah', 'parameter', Object.keys(daftar).join(','), '');
  hapusCache();
  return { pesan: 'Parameter tersimpan.' };
}

// --------------------------------------------------------- master: pengguna

function aksiSimpanPengguna(d, u) {
  var username = String(d.username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new Error('Username 3-30 karakter, hanya huruf kecil, angka, titik, garis bawah, dan strip.');
  }
  if (['admin', 'dosen'].indexOf(d.peran) < 0) throw new Error('Peran harus "admin" atau "dosen".');

  var lama = d.id ? cariBaris('pengguna', 'id', d.id) : null;
  if (d.id && !lama) throw new Error('Pengguna tidak ditemukan.');

  var bentrok = cariBaris('pengguna', 'username', username);
  if (bentrok && (!lama || bentrok.id !== lama.id)) throw new Error('Username "' + username + '" sudah dipakai.');

  var isi = {
    id: lama ? lama.id : idBerikutnya('pengguna', 'id', 'U', 3),
    username: username,
    nama: String(d.nama || '').trim() || username,
    email: String(d.email || '').trim(),
    peran: d.peran,
    garam: lama ? lama.garam : '',
    hash: lama ? lama.hash : '',
    aktif: d.aktif === false ? false : true,
    dibuat_pada: lama ? normalTanggal(lama.dibuat_pada) : sekarang()
  };

  if (d.sandi) {
    if (String(d.sandi).length < 8) throw new Error('Kata sandi minimal 8 karakter.');
    isi.garam = Utilities.getUuid();
    isi.hash = hashSandi(String(d.sandi), isi.garam);
  }
  if (!isi.hash) throw new Error('Kata sandi wajib diisi untuk pengguna baru.');

  // Jangan sampai tidak ada admin aktif yang tersisa.
  if (lama && lama.peran === 'admin' && (isi.peran !== 'admin' || !isi.aktif)) {
    var adminLain = baca('pengguna').filter(function (r) {
      return r.peran === 'admin' && benar(r.aktif) && String(r.id) !== String(lama.id);
    });
    if (!adminLain.length) throw new Error('Tidak boleh menonaktifkan admin terakhir.');
  }

  if (lama) tulisBaris('pengguna', lama._baris, isi);
  else tambahBaris('pengguna', isi);
  catat(u.username, lama ? 'ubah' : 'tambah', 'pengguna', isi.id, username + ' (' + isi.peran + ')');
  return { id: isi.id, pesan: 'Pengguna tersimpan.' };
}

function aksiHapusPengguna(d, u) {
  var r = cariBaris('pengguna', 'id', d.id);
  if (!r) throw new Error('Pengguna tidak ditemukan.');
  if (String(r.username) === String(u.username)) throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
  if (r.peran === 'admin') {
    var adminLain = baca('pengguna').filter(function (x) {
      return x.peran === 'admin' && benar(x.aktif) && String(x.id) !== String(r.id);
    });
    if (!adminLain.length) throw new Error('Tidak boleh menghapus admin terakhir.');
  }
  var punya = baca('transaksi').filter(function (t) { return String(t.dibuat_oleh) === String(r.username); }).length;
  if (punya) {
    throw new Error('Pengguna ini punya ' + punya + ' transaksi. Nonaktifkan saja agar jejak audit tetap utuh.');
  }
  sheet('pengguna').deleteRow(r._baris);
  catat(u.username, 'hapus', 'pengguna', d.id, r.username);
  return { pesan: 'Pengguna dihapus.' };
}

function aksiListPengguna() {
  return baca('pengguna').map(function (r) {
    return {
      id: r.id, username: r.username, nama: r.nama, email: r.email,
      peran: r.peran, aktif: benar(r.aktif), dibuat_pada: normalTanggal(r.dibuat_pada)
    };
  });
}

/** Master lengkap termasuk baris nonaktif — untuk halaman kelola master. */
function aksiMasterPenuh() {
  var pakaiJD = {}, pakaiRC = {}, pakaiTH = {};
  baca('transaksi').forEach(function (t) {
    pakaiJD[t.jenis_dana_id] = (pakaiJD[t.jenis_dana_id] || 0) + 1;
    if (t.rincian_id) pakaiRC[t.rincian_id] = (pakaiRC[t.rincian_id] || 0) + 1;
    pakaiTH[angka(t.tahun)] = (pakaiTH[angka(t.tahun)] || 0) + 1;
  });

  return {
    sumber_dana: baca('sumber_dana').map(function (r) {
      return { kode: r.kode, nama: r.nama, urutan: angka(r.urutan) };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    jenis_dana: baca('jenis_dana').map(function (r) {
      return {
        id: r.id, sumber_kode: r.sumber_kode, nama: r.nama,
        urutan: angka(r.urutan), aktif: benar(r.aktif), dipakai: pakaiJD[r.id] || 0
      };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    rincian: baca('rincian').map(function (r) {
      return {
        id: r.id, jenis_dana_id: r.jenis_dana_id, nama: r.nama,
        urutan: angka(r.urutan), aktif: benar(r.aktif), dipakai: pakaiRC[r.id] || 0
      };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    jenis_penggunaan: baca('jenis_penggunaan').map(function (r) {
      return { kode: r.kode, no: angka(r.no), nama: r.nama, kelompok: r.kelompok, urutan: angka(r.urutan) };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    tahun: baca('tahun').map(function (r) {
      return {
        tahun: angka(r.tahun), label_ts: r.label_ts || '',
        aktif: benar(r.aktif), dipakai: pakaiTH[angka(r.tahun)] || 0
      };
    }).sort(function (a, b) { return a.tahun - b.tahun; }),

    parameter: baca('parameter').map(function (r) {
      return { kunci: r.kunci, nilai: r.nilai, keterangan: r.keterangan };
    })
  };
}

function aksiListLog(d) {
  var data = baca('log');
  var per = Math.min(500, angka(d.perHalaman) || 100);
  return { baris: data.slice(-per).reverse(), total: data.length };
}
