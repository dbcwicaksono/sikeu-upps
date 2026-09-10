/**
 * SIKEU-UPPS — API Sistem Informasi Keuangan UPPS
 *
 * Backend  : Google Apps Script Web App, data di Google Sheets
 * Frontend : halaman statis di GitHub Pages
 * Identitas: Google Sign-In. Halaman memperoleh ID token dari Google, lalu
 *            token itu diverifikasi di sini. Email tidak dapat dipalsukan
 *            maupun diketik sendiri oleh pengguna.
 *
 * Semua permintaan lewat doPost dengan Content-Type text/plain, sehingga
 * tergolong "simple request" dan tidak memicu preflight CORS yang tidak
 * dapat dijawab Apps Script. Body: { aksi, idToken, lihatSebagai, data }.
 *
 * CATATAN SCOPE: berkas ini hanya memakai SpreadsheetApp (spreadsheet yang
 * memuatnya) dan UrlFetchApp (verifikasi token ke Google). Keduanya bukan
 * restricted scope, sehingga tidak memunculkan layar "unverified app".
 * Jangan menambahkan https://www.googleapis.com/auth/drive.
 */

// ============================================================ konfigurasi

/** Client ID OAuth. Nilai publik — memang tampil di kode halaman juga. */
var CLIENT_ID = '23882881057-72q15pps3vnja29bb8045kv2692ngiha.apps.googleusercontent.com';

/** Domain kampus. Pemilik email di domain ini otomatis menjadi operator. */
var DOMAIN_KAMPUS = ['unej.ac.id', 'mail.unej.ac.id'];

/*
 * Tidak ada daftar admin di berkas ini.
 *
 * Berkas ini tersimpan di repositori publik, jadi menuliskan alamat email
 * siapa pun di sini berarti memublikasikannya ke pengumpul spam. Admin pertama
 * dibuat oleh setupSpreadsheet() dari akun yang menjalankannya, dan selanjutnya
 * seluruh pemetaan email ke peran ada di sheet M_Pengguna yang bersifat privat.
 */

var PERAN = { ADMIN: 'admin', VERIFIKATOR: 'verifikator', OPERATOR: 'operator', PUBLIK: 'publik' };

/** Urutan wewenang, dipakai agar impersonasi tidak bisa menaikkan hak. */
var TINGKAT = { publik: 0, operator: 1, verifikator: 2, admin: 3 };

var STATUS = { DRAFT: 'draft', DIAJUKAN: 'diajukan', TERVERIFIKASI: 'terverifikasi', DITOLAK: 'ditolak' };

var SKEMA = {
  M_Pengguna:        ['email', 'nama', 'peran', 'aktif', 'dibuat_pada', 'terakhir_masuk', 'catatan'],
  M_Sumber:          ['kode', 'nama', 'urutan'],
  M_JenisDana:       ['kode', 'sumber_kode', 'nama', 'urutan', 'aktif', 'gabung_ke'],
  M_Rincian:         ['kode', 'jenis_dana_kode', 'nama', 'urutan', 'aktif'],
  M_JenisPenggunaan: ['kode', 'no', 'nama', 'kelompok', 'urutan'],
  M_Tahun:           ['tahun', 'label_ts', 'aktif'],
  M_Parameter:       ['kunci', 'nilai', 'keterangan'],
  Transaksi:         ['id', 'tanggal', 'tahun', 'sumber_kode', 'jenis_dana_kode', 'rincian_kode',
                      'penggunaan_kode', 'skema', 'uraian', 'jumlah', 'status', 'perlu_tinjau',
                      'catatan', 'dibuat_oleh', 'dibuat_pada', 'diajukan_pada', 'diubah_pada',
                      'diverifikasi_oleh', 'diverifikasi_pada', 'catatan_verifikasi'],
  Log:               ['waktu', 'email', 'peran', 'aksi', 'entitas', 'ref_id', 'detail']
};

// =============================================================== utilitas

function props() { return PropertiesService.getScriptProperties(); }
function bk() { return SpreadsheetApp.getActive(); }

function sheet(nama) {
  var s = bk().getSheetByName(nama);
  if (!s) throw new Error('Sheet "' + nama + '" belum ada. Jalankan setupSpreadsheet() lebih dulu.');
  return s;
}

/** Baca sheet sebagai array objek; baris pertama dianggap header. */
function baca(nama) {
  var nilai = sheet(nama).getDataRange().getValues();
  if (nilai.length < 2) return [];
  var header = nilai[0].map(function (h) { return String(h).trim(); });
  var hasil = [];
  for (var i = 1; i < nilai.length; i++) {
    if (nilai[i].every(function (v) { return v === '' || v === null; })) continue;
    var o = { _baris: i + 1 };
    for (var k = 0; k < header.length; k++) o[header[k]] = nilai[i][k];
    hasil.push(o);
  }
  return hasil;
}

function indeksKolom(nama) {
  var s = sheet(nama);
  var header = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  var peta = {};
  header.forEach(function (h, i) { peta[String(h).trim()] = i + 1; });
  return peta;
}

function tambahBaris(nama, obj) {
  sheet(nama).appendRow(SKEMA[nama].map(function (k) { return obj[k] === undefined ? '' : obj[k]; }));
}

function tulisBaris(nama, nomorBaris, obj) {
  sheet(nama).getRange(nomorBaris, 1, 1, SKEMA[nama].length)
    .setValues([SKEMA[nama].map(function (k) { return obj[k] === undefined ? '' : obj[k]; })]);
}

function cariBaris(nama, kunci, nilai) {
  var data = baca(nama);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][kunci]).trim() === String(nilai).trim()) return data[i];
  }
  return null;
}

function sekarang() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");
}

function normalTanggal(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
  return String(v || '');
}

function angka(v) {
  if (v === '' || v === null || v === undefined) return 0;
  var n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function benar(v) {
  var s = String(v).trim().toLowerCase();
  return v === true || s === 'true' || s === '1' || s === 'ya';
}

function kodeBerikutnya(nama, kunci, awalan, lebar) {
  var maks = 0;
  baca(nama).forEach(function (r) {
    var m = String(r[kunci]).match(new RegExp('^' + awalan + '(\\d+)$'));
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  var n = String(maks + 1);
  while (n.length < lebar) n = '0' + n;
  return awalan + n;
}

function catat(u, aksi, entitas, refId, detail) {
  try {
    tambahBaris('Log', {
      waktu: sekarang(), email: (u && u.email) || '-', peran: (u && u.peranAsli) || '-',
      aksi: aksi, entitas: entitas || '', ref_id: refId || '', detail: detail || ''
    });
  } catch (err) { /* kegagalan mencatat tidak boleh menggagalkan operasi utama */ }
}

function hapusCache() {
  CacheService.getScriptCache().removeAll(['rekap', 'master']);
}

// ============================================================ autentikasi

/**
 * Verifikasi ID token Google.
 *
 * Endpoint tokeninfo milik Google yang memeriksa tanda tangan RS256; kita
 * tinggal memastikan token itu memang diterbitkan UNTUK aplikasi kita
 * (klaim aud) dan belum kedaluwarsa. Tanpa pemeriksaan aud, token milik
 * aplikasi lain akan ikut diterima.
 */
function verifikasiTokenGoogle(idToken) {
  if (!idToken) return null;

  var cache = CacheService.getScriptCache();
  var kunci = 'tok_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(idToken)));
  var tunai = cache.get(kunci);
  if (tunai) return JSON.parse(tunai);

  var res;
  try {
    res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true });
  } catch (err) {
    throw new Error('Tidak dapat menghubungi Google untuk memverifikasi identitas. Coba lagi.');
  }
  if (res.getResponseCode() !== 200) return null;

  var info;
  try { info = JSON.parse(res.getContentText()); } catch (err) { return null; }

  if (info.aud !== CLIENT_ID) return null;
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(info.iss) < 0) return null;
  if (!info.exp || Number(info.exp) * 1000 < Date.now()) return null;
  if (!info.email) return null;
  if (!(info.email_verified === true || String(info.email_verified) === 'true')) return null;

  var hasil = {
    email: String(info.email).trim().toLowerCase(),
    nama: info.name || String(info.email).split('@')[0],
    hd: info.hd || String(info.email).split('@')[1] || ''
  };
  // Cache dibatasi sampai token kedaluwarsa, maksimal 5 menit, agar tidak
  // memanggil Google pada setiap permintaan.
  var sisa = Math.max(0, Math.min(300, Number(info.exp) - Math.floor(Date.now() / 1000) - 30));
  if (sisa > 0) cache.put(kunci, JSON.stringify(hasil), sisa);
  return hasil;
}

function domainKampus(email) {
  var d = String(email).split('@')[1] || '';
  return DOMAIN_KAMPUS.indexOf(d.toLowerCase()) >= 0;
}

/**
 * Kenali pengguna dari token, tentukan perannya, dan daftarkan bila perlu.
 * Mengembalikan null bila token tidak sah.
 */
function kenaliPengguna(idToken, lihatSebagai) {
  var g = verifikasiTokenGoogle(idToken);
  if (!g) return null;

  var baris = cariBaris('M_Pengguna', 'email', g.email);
  var peran;

  if (baris) {
    if (!benar(baris.aktif)) throw new Error('Akun ' + g.email + ' dinonaktifkan. Hubungi Wakil Dekan.');
    peran = String(baris.peran).trim().toLowerCase();
    if (!TINGKAT.hasOwnProperty(peran)) peran = PERAN.PUBLIK;
  } else if (domainKampus(g.email)) {
    // Siapa pun berakun kampus boleh mengajukan draft; namanya terkunci ke email.
    tambahBaris('M_Pengguna', {
      email: g.email, nama: g.nama, peran: PERAN.OPERATOR, aktif: true,
      dibuat_pada: sekarang(), terakhir_masuk: sekarang(), catatan: 'Terdaftar otomatis (domain kampus)'
    });
    peran = PERAN.OPERATOR;
  } else {
    // Akun di luar kampus tidak dicatat, cukup dianggap publik.
    peran = PERAN.PUBLIK;
  }

  var u = { email: g.email, nama: (baris && baris.nama) || g.nama, peranAsli: peran, peran: peran, menyamar: '' };

  // Impersonasi: hanya admin, dan hanya untuk MENURUNKAN wewenang.
  if (lihatSebagai && peran === PERAN.ADMIN) {
    var minta = String(lihatSebagai).trim().toLowerCase();
    if (TINGKAT.hasOwnProperty(minta) && TINGKAT[minta] < TINGKAT[peran]) {
      u.peran = minta;
      u.menyamar = minta;
    }
  }
  return u;
}

function bolehMinimal(u, peranMinimal) {
  return TINGKAT[u.peran] >= TINGKAT[peranMinimal];
}

// ================================================================= router

/** Peran minimal untuk tiap aksi. 'publik' berarti terbuka bagi siapa saja yang sudah masuk. */
var IZIN = {
  saya:              PERAN.PUBLIK,
  master:            PERAN.PUBLIK,
  rekap:             PERAN.PUBLIK,
  listTransaksi:     PERAN.OPERATOR,
  simpanTransaksi:   PERAN.OPERATOR,
  hapusTransaksi:    PERAN.OPERATOR,
  ajukanTransaksi:   PERAN.OPERATOR,
  putusanVerifikasi: PERAN.VERIFIKATOR,
  masterPenuh:       PERAN.VERIFIKATOR,
  listPengguna:      PERAN.ADMIN,
  simpanPengguna:    PERAN.ADMIN,
  hapusPengguna:     PERAN.ADMIN,
  simpanJenisDana:   PERAN.ADMIN,
  hapusJenisDana:    PERAN.ADMIN,
  gabungJenisDana:   PERAN.ADMIN,
  simpanRincian:     PERAN.ADMIN,
  hapusRincian:      PERAN.ADMIN,
  simpanTahun:       PERAN.ADMIN,
  hapusTahun:        PERAN.ADMIN,
  simpanParameter:   PERAN.ADMIN,
  listLog:           PERAN.ADMIN
};

/** Aksi yang boleh dipanggil tanpa masuk sama sekali. */
var TANPA_MASUK = ['master', 'rekap'];

function balas(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function dashboardPublik() {
  var p = cariBaris('M_Parameter', 'kunci', 'dashboard_publik');
  return !!p && String(p.nilai).trim().toLowerCase() === 'ya';
}

function doGet(e) {
  var aksi = (e && e.parameter && e.parameter.aksi) || '';
  if (aksi === 'rekap' || aksi === 'master') {
    if (!dashboardPublik()) {
      return balas({ ok: false, pesan: 'Dashboard memerlukan login.', perluMasuk: true });
    }
    return balas({ ok: true, data: aksi === 'rekap' ? aksiRekap() : aksiMaster() });
  }
  return ContentService.createTextOutput('SIKEU-UPPS API aktif. Gunakan POST.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return balas({ ok: false, pesan: 'Format permintaan tidak valid.' }); }

  var aksi = req.aksi;
  if (!IZIN.hasOwnProperty(aksi)) return balas({ ok: false, pesan: 'Aksi tidak dikenal: ' + aksi });

  var kunci = null;
  try {
    var u = null;
    if (req.idToken) {
      u = kenaliPengguna(req.idToken, req.lihatSebagai);
      if (!u) return balas({ ok: false, pesan: 'Sesi Google Anda berakhir. Silakan masuk lagi.', perluMasuk: true });
    }

    if (!u) {
      // Belum masuk: hanya dashboard, dan hanya bila memang dibuka untuk umum.
      if (TANPA_MASUK.indexOf(aksi) < 0 || !dashboardPublik()) {
        return balas({ ok: false, pesan: 'Silakan masuk dengan akun Google Anda.', perluMasuk: true });
      }
      u = { email: '(publik)', nama: 'Publik', peran: PERAN.PUBLIK, peranAsli: PERAN.PUBLIK, menyamar: '' };
    }

    if (!bolehMinimal(u, IZIN[aksi])) {
      return balas({
        ok: false,
        pesan: 'Peran Anda (' + u.peran + ') tidak berwenang melakukan ini. Diperlukan: ' + IZIN[aksi] + '.'
      });
    }

    if (/^(simpan|hapus|ajukan|putusan|gabung)/.test(aksi)) {
      kunci = LockService.getScriptLock();
      kunci.waitLock(20000);
    }
    return balas({ ok: true, data: jalankan(aksi, req.data || {}, u) });
  } catch (err) {
    return balas({ ok: false, pesan: String(err && err.message ? err.message : err) });
  } finally {
    if (kunci) kunci.releaseLock();
  }
}

function jalankan(aksi, d, u) {
  switch (aksi) {
    case 'saya':              return aksiSaya(u);
    case 'master':            return aksiMaster();
    case 'rekap':             return aksiRekap();
    case 'listTransaksi':     return aksiListTransaksi(d, u);
    case 'simpanTransaksi':   return aksiSimpanTransaksi(d, u);
    case 'hapusTransaksi':    return aksiHapusTransaksi(d, u);
    case 'ajukanTransaksi':   return aksiAjukan(d, u);
    case 'putusanVerifikasi': return aksiPutusan(d, u);
    case 'masterPenuh':       return aksiMasterPenuh();
    case 'listPengguna':      return aksiListPengguna();
    case 'simpanPengguna':    return aksiSimpanPengguna(d, u);
    case 'hapusPengguna':     return aksiHapusPengguna(d, u);
    case 'simpanJenisDana':   return aksiSimpanJenisDana(d, u);
    case 'hapusJenisDana':    return aksiHapusJenisDana(d, u);
    case 'gabungJenisDana':   return aksiGabungJenisDana(d, u);
    case 'simpanRincian':     return aksiSimpanRincian(d, u);
    case 'hapusRincian':      return aksiHapusRincian(d, u);
    case 'simpanTahun':       return aksiSimpanTahun(d, u);
    case 'hapusTahun':        return aksiHapusTahun(d, u);
    case 'simpanParameter':   return aksiSimpanParameter(d, u);
    case 'listLog':           return aksiListLog(d);
  }
  throw new Error('Aksi tidak dikenal: ' + aksi);
}

/**
 * Identitas pengguna saat ini. Dipanggil sekali tiap halaman dimuat, jadi di
 * sinilah "terakhir_masuk" dicatat — bukan pada setiap permintaan, agar tidak
 * menulis ke sheet terus-menerus.
 */
function aksiSaya(u) {
  try {
    var baris = cariBaris('M_Pengguna', 'email', u.email);
    if (baris) {
      var kolom = indeksKolom('M_Pengguna');
      sheet('M_Pengguna').getRange(baris._baris, kolom.terakhir_masuk).setValue(sekarang());
      if (!String(baris.nama).trim() && u.nama) {
        sheet('M_Pengguna').getRange(baris._baris, kolom.nama).setValue(u.nama);
      }
    }
  } catch (err) { /* pencatatan waktu masuk tidak boleh menggagalkan login */ }

  return {
    email: u.email, nama: u.nama, peran: u.peran,
    peran_asli: u.peranAsli, menyamar: u.menyamar,
    peran_tersedia: u.peranAsli === PERAN.ADMIN
      ? [PERAN.ADMIN, PERAN.VERIFIKATOR, PERAN.OPERATOR, PERAN.PUBLIK] : []
  };
}

// ========================================================= penggabungan

/**
 * Telusuri rantai gabung_ke sampai ujungnya.
 *
 * Menggabungkan kategori bersifat non-destruktif: baris transaksi tetap
 * menyimpan kode aslinya, hanya pelaporannya yang dialihkan. Melepas gabungan
 * cukup dengan mengosongkan gabung_ke.
 */
function ujungGabung(kode, peta) {
  var dilihat = {}, kini = String(kode || '');
  var langkah = 0;
  while (kini && peta[kini] && peta[kini].gabung_ke) {
    if (dilihat[kini]) {
      throw new Error('Siklus penggabungan jenis dana terdeteksi pada "' + kini + '".');
    }
    dilihat[kini] = true;
    kini = String(peta[kini].gabung_ke).trim();
    if (++langkah > 50) throw new Error('Rantai penggabungan jenis dana terlalu panjang.');
  }
  return kini || String(kode || '');
}

function petaJenisDana() {
  var peta = {};
  baca('M_JenisDana').forEach(function (r) {
    peta[String(r.kode).trim()] = {
      kode: String(r.kode).trim(), sumber_kode: String(r.sumber_kode).trim(),
      nama: r.nama, urutan: angka(r.urutan), aktif: benar(r.aktif),
      gabung_ke: String(r.gabung_ke || '').trim(), _baris: r._baris
    };
  });
  return peta;
}

// ============================================================ master data

function aksiMaster() {
  var tunai = CacheService.getScriptCache().get('master');
  if (tunai) return JSON.parse(tunai);

  var peta = petaJenisDana();
  var hasil = {
    sumber_dana: baca('M_Sumber').map(function (r) {
      return { kode: String(r.kode).trim(), nama: r.nama, urutan: angka(r.urutan) };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    // Hanya kategori yang aktif DAN bukan hasil penggabungan yang tampil di
    // form input; yang sudah digabungkan tidak boleh dipilih lagi.
    jenis_dana: Object.keys(peta).map(function (k) { return peta[k]; })
      .filter(function (j) { return j.aktif && !j.gabung_ke; })
      .map(function (j) {
        return { kode: j.kode, sumber_kode: j.sumber_kode, nama: j.nama, urutan: j.urutan };
      }).sort(function (a, b) { return a.urutan - b.urutan; }),

    rincian: baca('M_Rincian').filter(function (r) { return benar(r.aktif); })
      .map(function (r) {
        return {
          kode: String(r.kode).trim(),
          jenis_dana_kode: ujungGabung(String(r.jenis_dana_kode).trim(), peta),
          nama: r.nama, urutan: angka(r.urutan)
        };
      }).sort(function (a, b) { return a.urutan - b.urutan; }),

    jenis_penggunaan: baca('M_JenisPenggunaan').map(function (r) {
      return { kode: String(r.kode).trim(), no: angka(r.no), nama: r.nama,
               kelompok: String(r.kelompok).trim(), urutan: angka(r.urutan) };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    tahun: baca('M_Tahun').filter(function (r) { return benar(r.aktif); })
      .map(function (r) { return { tahun: angka(r.tahun), label_ts: String(r.label_ts || '').trim() }; })
      .sort(function (a, b) { return a.tahun - b.tahun; }),

    parameter: {}
  };
  baca('M_Parameter').forEach(function (r) { hasil.parameter[String(r.kunci).trim()] = r.nilai; });

  CacheService.getScriptCache().put('master', JSON.stringify(hasil), 300);
  return hasil;
}

function aksiMasterPenuh() {
  var peta = petaJenisDana();
  var pakaiJD = {}, pakaiRC = {}, pakaiTH = {};
  baca('Transaksi').forEach(function (t) {
    var k = String(t.jenis_dana_kode).trim();
    pakaiJD[k] = (pakaiJD[k] || 0) + 1;
    if (t.rincian_kode) pakaiRC[t.rincian_kode] = (pakaiRC[t.rincian_kode] || 0) + 1;
    pakaiTH[angka(t.tahun)] = (pakaiTH[angka(t.tahun)] || 0) + 1;
  });

  return {
    sumber_dana: baca('M_Sumber').map(function (r) {
      return { kode: String(r.kode).trim(), nama: r.nama, urutan: angka(r.urutan) };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    jenis_dana: Object.keys(peta).map(function (k) {
      var j = peta[k];
      return {
        kode: j.kode, sumber_kode: j.sumber_kode, nama: j.nama, urutan: j.urutan,
        aktif: j.aktif, gabung_ke: j.gabung_ke,
        gabung_akhir: j.gabung_ke ? ujungGabung(j.kode, peta) : '',
        dipakai: pakaiJD[j.kode] || 0
      };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    rincian: baca('M_Rincian').map(function (r) {
      return {
        kode: String(r.kode).trim(), jenis_dana_kode: String(r.jenis_dana_kode).trim(),
        nama: r.nama, urutan: angka(r.urutan), aktif: benar(r.aktif),
        dipakai: pakaiRC[String(r.kode).trim()] || 0
      };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    jenis_penggunaan: baca('M_JenisPenggunaan').map(function (r) {
      return { kode: String(r.kode).trim(), no: angka(r.no), nama: r.nama,
               kelompok: String(r.kelompok).trim(), urutan: angka(r.urutan) };
    }).sort(function (a, b) { return a.urutan - b.urutan; }),

    tahun: baca('M_Tahun').map(function (r) {
      return { tahun: angka(r.tahun), label_ts: String(r.label_ts || '').trim(),
               aktif: benar(r.aktif), dipakai: pakaiTH[angka(r.tahun)] || 0 };
    }).sort(function (a, b) { return a.tahun - b.tahun; }),

    parameter: baca('M_Parameter').map(function (r) {
      return { kunci: String(r.kunci).trim(), nilai: r.nilai, keterangan: r.keterangan };
    })
  };
}

// ================================================================= rekap

/**
 * Master + agregat transaksi. Tabel 12, Tabel 13, skor akreditasi dan grafik
 * disusun di frontend dari agregat ini, sehingga filter dapat diubah tanpa
 * memanggil server lagi.
 */
function aksiRekap() {
  var tunai = CacheService.getScriptCache().get('rekap');
  if (tunai) return JSON.parse(tunai);

  var peta = petaJenisDana();
  var ember = {};
  var hitung = { total: 0, draft: 0, diajukan: 0, terverifikasi: 0, ditolak: 0, perlu_tinjau: 0 };

  baca('Transaksi').forEach(function (t) {
    if (!t.id) return;
    hitung.total++;
    var st = String(t.status || STATUS.DRAFT).trim().toLowerCase();
    if (hitung.hasOwnProperty(st)) hitung[st]++;
    if (benar(t.perlu_tinjau)) hitung.perlu_tinjau++;

    // Kategori yang digabungkan dilaporkan pada kategori tujuannya.
    var jd = ujungGabung(String(t.jenis_dana_kode).trim(), peta);
    var k = [t.sumber_kode, jd, t.rincian_kode || '', t.penggunaan_kode,
             t.skema || 'Mandiri', angka(t.tahun), st].join('||');
    if (!ember[k]) ember[k] = { n: 0, c: 0 };
    ember[k].n += angka(t.jumlah);
    ember[k].c += 1;
  });

  var hasil = {
    master: aksiMaster(),
    agregat: Object.keys(ember).map(function (k) {
      var p = k.split('||');
      return { s: p[0], j: p[1], r: p[2], g: p[3], k: p[4], t: Number(p[5]),
               st: p[6], v: p[6] === STATUS.TERVERIFIKASI ? 1 : 0,
               n: ember[k].n, c: ember[k].c };
    }),
    ringkas: {
      jumlah_transaksi: hitung.total,
      draft: hitung.draft,
      diajukan: hitung.diajukan,
      terverifikasi: hitung.terverifikasi,
      ditolak: hitung.ditolak,
      perlu_tinjau: hitung.perlu_tinjau,
      diperbarui: sekarang()
    }
  };

  var teks = JSON.stringify(hasil);
  if (teks.length < 95000) CacheService.getScriptCache().put('rekap', teks, 120);
  return hasil;
}

// ============================================================= transaksi

function sumberBolehOperator() {
  var p = cariBaris('M_Parameter', 'kunci', 'sumber_operator');
  var nilai = String((p && p.nilai) || '').trim();
  if (!nilai || nilai === '*') return null;             // null berarti semua boleh
  return nilai.split(',').map(function (s) { return s.trim(); });
}

function aksiListTransaksi(d, u) {
  var f = d.filter || {};
  var peta = petaJenisDana();
  var data = baca('Transaksi').filter(function (t) { return !!t.id; });

  // Operator hanya melihat miliknya sendiri, kecuali memang meminta semua
  // (untuk transparansi) — tetapi tetap tidak bisa mengubah milik orang lain.
  var miliknya = String(f.lingkup || '') !== 'semua';
  if (u.peran === PERAN.OPERATOR && miliknya) {
    data = data.filter(function (t) { return String(t.dibuat_oleh).toLowerCase() === u.email; });
  }

  if (f.tahun) data = data.filter(function (t) { return angka(t.tahun) === angka(f.tahun); });
  if (f.sumber) data = data.filter(function (t) { return t.sumber_kode === f.sumber; });
  if (f.penggunaan) data = data.filter(function (t) { return t.penggunaan_kode === f.penggunaan; });
  if (f.status) data = data.filter(function (t) { return String(t.status).toLowerCase() === f.status; });
  if (f.perlu_tinjau) data = data.filter(function (t) { return benar(t.perlu_tinjau); });
  if (f.milik) data = data.filter(function (t) { return String(t.dibuat_oleh).toLowerCase() === String(f.milik).toLowerCase(); });
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

  return {
    total: total, jumlah_total: jumlahTotal, halaman: hal, per_halaman: per,
    baris: data.slice((hal - 1) * per, hal * per).map(function (t) {
      var kode = String(t.jenis_dana_kode).trim();
      var akhir = ujungGabung(kode, peta);
      return {
        id: t.id, tanggal: normalTanggal(t.tanggal), tahun: angka(t.tahun),
        sumber_kode: t.sumber_kode, jenis_dana_kode: kode,
        jenis_dana_dilaporkan: akhir !== kode ? akhir : '',
        rincian_kode: t.rincian_kode || '', penggunaan_kode: t.penggunaan_kode,
        skema: t.skema, uraian: t.uraian, jumlah: angka(t.jumlah),
        status: String(t.status || STATUS.DRAFT).toLowerCase(),
        perlu_tinjau: benar(t.perlu_tinjau), catatan: t.catatan || '',
        dibuat_oleh: t.dibuat_oleh, dibuat_pada: normalTanggal(t.dibuat_pada),
        diajukan_pada: normalTanggal(t.diajukan_pada),
        diverifikasi_oleh: t.diverifikasi_oleh || '',
        diverifikasi_pada: normalTanggal(t.diverifikasi_pada),
        catatan_verifikasi: t.catatan_verifikasi || '',
        milik_saya: String(t.dibuat_oleh).toLowerCase() === u.email
      };
    })
  };
}

function validasiTransaksi(d) {
  var peta = petaJenisDana();
  var t = {
    tanggal: String(d.tanggal || '').trim(),
    tahun: angka(d.tahun),
    sumber_kode: String(d.sumber_kode || '').trim(),
    jenis_dana_kode: String(d.jenis_dana_kode || '').trim(),
    rincian_kode: String(d.rincian_kode || '').trim(),
    penggunaan_kode: String(d.penggunaan_kode || '').trim(),
    skema: String(d.skema || 'Mandiri').trim(),
    uraian: String(d.uraian || '').trim(),
    jumlah: angka(d.jumlah),
    catatan: String(d.catatan || '').trim(),
    perlu_tinjau: benar(d.perlu_tinjau)
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.tanggal)) throw new Error('Tanggal wajib diisi (format YYYY-MM-DD).');
  if (!t.tahun) t.tahun = angka(t.tanggal.slice(0, 4));
  if (!cariBaris('M_Tahun', 'tahun', t.tahun)) throw new Error('Tahun ' + t.tahun + ' belum terdaftar di M_Tahun.');
  if (!cariBaris('M_Sumber', 'kode', t.sumber_kode)) throw new Error('Sumber dana tidak dikenal.');

  var jd = peta[t.jenis_dana_kode];
  if (!jd) throw new Error('Jenis dana wajib dipilih.');
  if (jd.sumber_kode !== t.sumber_kode) {
    throw new Error('Jenis dana "' + jd.nama + '" bukan milik sumber dana yang dipilih.');
  }
  if (jd.gabung_ke) {
    throw new Error('Jenis dana "' + jd.nama + '" sudah digabungkan ke kategori lain, jadi tidak dapat dipilih.');
  }
  if (!jd.aktif) throw new Error('Jenis dana "' + jd.nama + '" sedang nonaktif.');

  if (t.rincian_kode) {
    var rc = cariBaris('M_Rincian', 'kode', t.rincian_kode);
    if (!rc) throw new Error('Rincian tidak dikenal.');
    if (ujungGabung(String(rc.jenis_dana_kode).trim(), peta) !== t.jenis_dana_kode) {
      throw new Error('Rincian "' + rc.nama + '" bukan milik jenis dana yang dipilih.');
    }
  }
  if (!cariBaris('M_JenisPenggunaan', 'kode', t.penggunaan_kode)) throw new Error('Jenis penggunaan wajib dipilih.');
  if (['Mandiri', 'Kerjasama'].indexOf(t.skema) < 0) t.skema = 'Mandiri';
  if (!t.uraian) throw new Error('Uraian wajib diisi.');
  if (!(t.jumlah > 0)) throw new Error('Jumlah dana harus lebih besar dari nol.');
  return t;
}

/** Periksa apakah pengguna berhak menulis baris ini. */
function pastikanBolehTulis(lama, calon, u) {
  if (bolehMinimal(u, PERAN.VERIFIKATOR)) return;      // verifikator & admin bebas

  var boleh = sumberBolehOperator();
  if (boleh && boleh.indexOf(String(calon.sumber_kode)) < 0) {
    throw new Error('Sebagai operator Anda hanya dapat menginput dana dari sumber: ' + boleh.join(', ') + '.');
  }
  if (!lama) return;

  if (String(lama.dibuat_oleh).toLowerCase() !== u.email) {
    throw new Error('Anda hanya dapat mengubah data yang Anda input sendiri.');
  }
  var st = String(lama.status).toLowerCase();
  if (st === STATUS.TERVERIFIKASI) {
    throw new Error('Data ini sudah diverifikasi sehingga terkunci. Hubungi Wakil Dekan bila perlu koreksi.');
  }
  if (st === STATUS.DIAJUKAN) {
    throw new Error('Data ini sedang menunggu verifikasi. Tarik kembali ke draft dulu bila ingin mengubahnya.');
  }
}

function aksiSimpanTransaksi(d, u) {
  var bersih = validasiTransaksi(d);
  var lama = d.id ? cariBaris('Transaksi', 'id', d.id) : null;
  if (d.id && !lama) throw new Error('Transaksi ' + d.id + ' tidak ditemukan.');
  pastikanBolehTulis(lama, bersih, u);

  if (lama) {
    var gabung = {};
    SKEMA.Transaksi.forEach(function (k) { gabung[k] = lama[k]; });
    Object.keys(bersih).forEach(function (k) { gabung[k] = bersih[k]; });
    gabung.id = lama.id;
    gabung.dibuat_pada = normalTanggal(lama.dibuat_pada);
    gabung.diubah_pada = sekarang();

    // Menyunting data yang sudah terverifikasi menurunkan statusnya kembali,
    // supaya angka borang tidak pernah berubah tanpa ditinjau ulang.
    if (String(lama.status).toLowerCase() === STATUS.TERVERIFIKASI) {
      gabung.status = STATUS.DIAJUKAN;
      gabung.diverifikasi_oleh = '';
      gabung.diverifikasi_pada = '';
      gabung.catatan_verifikasi = 'Status diturunkan otomatis karena data disunting oleh ' + u.email;
    } else if (String(lama.status).toLowerCase() === STATUS.DITOLAK) {
      gabung.status = STATUS.DRAFT;                    // revisi setelah ditolak
    }
    tulisBaris('Transaksi', lama._baris, gabung);
    catat(u, 'ubah', 'Transaksi', lama.id, bersih.uraian);
    hapusCache();
    return { id: lama.id, status: gabung.status, pesan: 'Perubahan tersimpan.' };
  }

  bersih.id = kodeBerikutnya('Transaksi', 'id', 'T', 4);
  bersih.status = STATUS.DRAFT;
  bersih.dibuat_oleh = u.email;
  bersih.dibuat_pada = sekarang();
  bersih.diajukan_pada = '';
  bersih.diubah_pada = '';
  bersih.diverifikasi_oleh = '';
  bersih.diverifikasi_pada = '';
  bersih.catatan_verifikasi = '';
  tambahBaris('Transaksi', bersih);
  catat(u, 'tambah', 'Transaksi', bersih.id, bersih.uraian);
  hapusCache();
  return { id: bersih.id, status: STATUS.DRAFT,
           pesan: 'Tersimpan sebagai draft. Klik "Ajukan" bila sudah siap diverifikasi.' };
}

function aksiHapusTransaksi(d, u) {
  var t = cariBaris('Transaksi', 'id', d.id);
  if (!t) throw new Error('Transaksi tidak ditemukan.');
  if (!bolehMinimal(u, PERAN.VERIFIKATOR)) {
    if (String(t.dibuat_oleh).toLowerCase() !== u.email) {
      throw new Error('Anda hanya dapat menghapus data yang Anda input sendiri.');
    }
    if ([STATUS.DRAFT, STATUS.DITOLAK].indexOf(String(t.status).toLowerCase()) < 0) {
      throw new Error('Hanya draft atau data yang ditolak yang dapat Anda hapus.');
    }
  }
  sheet('Transaksi').deleteRow(t._baris);
  catat(u, 'hapus', 'Transaksi', t.id, t.uraian);
  hapusCache();
  return { pesan: 'Transaksi dihapus.' };
}

/** draft -> diajukan, atau menarik kembali diajukan -> draft. */
function aksiAjukan(d, u) {
  var ids = d.ids || (d.id ? [d.id] : []);
  var tarik = !!d.tarik;
  var kolom = indeksKolom('Transaksi');
  var s = sheet('Transaksi');
  var semua = baca('Transaksi');
  var n = 0;

  ids.forEach(function (id) {
    var t = null;
    for (var i = 0; i < semua.length; i++) if (String(semua[i].id) === String(id)) { t = semua[i]; break; }
    if (!t) return;

    var st = String(t.status).toLowerCase();
    if (!bolehMinimal(u, PERAN.VERIFIKATOR) && String(t.dibuat_oleh).toLowerCase() !== u.email) return;

    if (tarik) {
      if (st !== STATUS.DIAJUKAN) return;
      s.getRange(t._baris, kolom.status).setValue(STATUS.DRAFT);
      s.getRange(t._baris, kolom.diajukan_pada).setValue('');
    } else {
      if ([STATUS.DRAFT, STATUS.DITOLAK].indexOf(st) < 0) return;
      s.getRange(t._baris, kolom.status).setValue(STATUS.DIAJUKAN);
      s.getRange(t._baris, kolom.diajukan_pada).setValue(sekarang());
    }
    n++;
  });

  catat(u, tarik ? 'tarik-pengajuan' : 'ajukan', 'Transaksi', ids.join(','), n + ' baris');
  hapusCache();
  return { pesan: n + ' transaksi ' + (tarik ? 'ditarik kembali ke draft.' : 'diajukan untuk verifikasi.') };
}

/** Keputusan verifikator: terverifikasi atau ditolak. */
function aksiPutusan(d, u) {
  var ids = d.ids || (d.id ? [d.id] : []);
  var jadi = String(d.status || '').toLowerCase();
  if ([STATUS.TERVERIFIKASI, STATUS.DITOLAK, STATUS.DIAJUKAN].indexOf(jadi) < 0) {
    throw new Error('Status tujuan harus terverifikasi, ditolak, atau diajukan.');
  }
  var catatanV = String(d.catatan || '').trim();
  if (jadi === STATUS.DITOLAK && !catatanV) {
    throw new Error('Alasan penolakan wajib diisi agar operator tahu apa yang harus diperbaiki.');
  }

  var kolom = indeksKolom('Transaksi');
  var s = sheet('Transaksi');
  var semua = baca('Transaksi');
  var n = 0;

  ids.forEach(function (id) {
    var t = null;
    for (var i = 0; i < semua.length; i++) if (String(semua[i].id) === String(id)) { t = semua[i]; break; }
    if (!t) return;
    s.getRange(t._baris, kolom.status).setValue(jadi);
    s.getRange(t._baris, kolom.catatan_verifikasi).setValue(catatanV);
    if (jadi === STATUS.TERVERIFIKASI) {
      s.getRange(t._baris, kolom.diverifikasi_oleh).setValue(u.email);
      s.getRange(t._baris, kolom.diverifikasi_pada).setValue(sekarang());
    } else {
      s.getRange(t._baris, kolom.diverifikasi_oleh).setValue('');
      s.getRange(t._baris, kolom.diverifikasi_pada).setValue('');
    }
    if (d.selesaiTinjau) s.getRange(t._baris, kolom.perlu_tinjau).setValue(false);
    n++;
  });

  catat(u, 'putusan-' + jadi, 'Transaksi', ids.join(','), n + ' baris. ' + catatanV);
  hapusCache();
  return { pesan: n + ' transaksi berstatus "' + jadi + '".' };
}

// ====================================================== master: jenis dana

function aksiSimpanJenisDana(d, u) {
  var nama = String(d.nama || '').trim();
  if (!nama) throw new Error('Nama jenis dana wajib diisi.');
  if (!cariBaris('M_Sumber', 'kode', d.sumber_kode)) throw new Error('Sumber dana tidak dikenal.');

  var kembar = baca('M_JenisDana').filter(function (r) {
    return String(r.sumber_kode).trim() === String(d.sumber_kode).trim() &&
           String(r.nama).trim().toLowerCase() === nama.toLowerCase() &&
           String(r.kode).trim() !== String(d.kode || '').trim();
  });
  if (kembar.length) throw new Error('Jenis dana "' + nama + '" sudah ada pada sumber tersebut.');

  var lama = d.kode ? cariBaris('M_JenisDana', 'kode', d.kode) : null;
  var isi = {
    kode: lama ? String(lama.kode).trim() : kodeBerikutnya('M_JenisDana', 'kode', 'JD', 2),
    sumber_kode: String(d.sumber_kode).trim(),
    nama: nama,
    urutan: angka(d.urutan) || (baca('M_JenisDana').length + 1) * 10,
    aktif: d.aktif === false ? false : true,
    gabung_ke: lama ? String(lama.gabung_ke || '').trim() : ''
  };

  if (lama) tulisBaris('M_JenisDana', lama._baris, isi);
  else tambahBaris('M_JenisDana', isi);
  catat(u, lama ? 'ubah' : 'tambah', 'M_JenisDana', isi.kode, nama);
  hapusCache();
  return { kode: isi.kode, pesan: 'Jenis dana tersimpan.' };
}

/**
 * Gabungkan satu jenis dana ke jenis dana lain, atau lepaskan gabungannya.
 * Bersifat reversibel: baris transaksi tidak disentuh sama sekali.
 */
function aksiGabungJenisDana(d, u) {
  var peta = petaJenisDana();
  var dari = String(d.kode || '').trim();
  var ke = String(d.gabung_ke || '').trim();

  var sumberBaris = peta[dari];
  if (!sumberBaris) throw new Error('Jenis dana yang akan digabungkan tidak ditemukan.');

  if (!ke) {
    sheet('M_JenisDana').getRange(sumberBaris._baris, indeksKolom('M_JenisDana').gabung_ke).setValue('');
    catat(u, 'lepas-gabung', 'M_JenisDana', dari, '');
    hapusCache();
    return { pesan: 'Penggabungan "' + sumberBaris.nama + '" dilepas.' };
  }

  var tujuan = peta[ke];
  if (!tujuan) throw new Error('Jenis dana tujuan tidak ditemukan.');
  if (dari === ke) throw new Error('Jenis dana tidak dapat digabungkan ke dirinya sendiri.');
  if (tujuan.sumber_kode !== sumberBaris.sumber_kode) {
    throw new Error('Hanya jenis dana pada sumber dana yang sama yang dapat digabungkan. "' +
      sumberBaris.nama + '" ada di ' + sumberBaris.sumber_kode + ', sedangkan "' +
      tujuan.nama + '" di ' + tujuan.sumber_kode + '.');
  }

  // Uji siklus pada salinan peta sebelum menulis apa pun.
  var uji = {};
  Object.keys(peta).forEach(function (k) {
    uji[k] = { kode: peta[k].kode, gabung_ke: peta[k].gabung_ke };
  });
  uji[dari].gabung_ke = ke;
  ujungGabung(dari, uji);       // melempar galat bila terbentuk siklus
  Object.keys(uji).forEach(function (k) { ujungGabung(k, uji); });

  sheet('M_JenisDana').getRange(sumberBaris._baris, indeksKolom('M_JenisDana').gabung_ke).setValue(ke);
  catat(u, 'gabung', 'M_JenisDana', dari, dari + ' -> ' + ke);
  hapusCache();
  return {
    pesan: '"' + sumberBaris.nama + '" kini dilaporkan sebagai "' + tujuan.nama +
           '". Data transaksi tidak diubah, penggabungan ini dapat dilepas kapan saja.'
  };
}

function aksiHapusJenisDana(d, u) {
  var r = cariBaris('M_JenisDana', 'kode', d.kode);
  if (!r) throw new Error('Jenis dana tidak ditemukan.');

  var dipakai = baca('Transaksi').filter(function (t) {
    return String(t.jenis_dana_kode).trim() === String(d.kode).trim();
  }).length;
  if (dipakai) {
    throw new Error('Jenis dana ini dipakai oleh ' + dipakai + ' transaksi sehingga tidak dapat dihapus. ' +
      'Nonaktifkan agar tidak muncul di form input, atau gabungkan ke kategori lain — ' +
      'keduanya menjaga riwayat tetap utuh.');
  }
  var menunjuk = baca('M_JenisDana').filter(function (x) {
    return String(x.gabung_ke || '').trim() === String(d.kode).trim();
  });
  if (menunjuk.length) {
    throw new Error('Jenis dana ini menjadi tujuan penggabungan dari ' + menunjuk.length +
      ' kategori lain. Lepaskan penggabungan itu lebih dulu.');
  }

  baca('M_Rincian').filter(function (x) {
    return String(x.jenis_dana_kode).trim() === String(d.kode).trim();
  }).reverse().forEach(function (x) { sheet('M_Rincian').deleteRow(x._baris); });

  sheet('M_JenisDana').deleteRow(r._baris);
  catat(u, 'hapus', 'M_JenisDana', d.kode, r.nama);
  hapusCache();
  return { pesan: 'Jenis dana dihapus.' };
}

// ========================================================= master: rincian

function aksiSimpanRincian(d, u) {
  var nama = String(d.nama || '').trim();
  if (!nama) throw new Error('Nama rincian wajib diisi.');
  if (!cariBaris('M_JenisDana', 'kode', d.jenis_dana_kode)) throw new Error('Jenis dana tidak dikenal.');

  var lama = d.kode ? cariBaris('M_Rincian', 'kode', d.kode) : null;
  var isi = {
    kode: lama ? String(lama.kode).trim() : kodeBerikutnya('M_Rincian', 'kode', 'RC', 3),
    jenis_dana_kode: String(d.jenis_dana_kode).trim(),
    nama: nama,
    urutan: angka(d.urutan) || (baca('M_Rincian').length + 1) * 10,
    aktif: d.aktif === false ? false : true
  };
  if (lama) tulisBaris('M_Rincian', lama._baris, isi);
  else tambahBaris('M_Rincian', isi);
  catat(u, lama ? 'ubah' : 'tambah', 'M_Rincian', isi.kode, nama);
  hapusCache();
  return { kode: isi.kode, pesan: 'Rincian tersimpan.' };
}

function aksiHapusRincian(d, u) {
  var r = cariBaris('M_Rincian', 'kode', d.kode);
  if (!r) throw new Error('Rincian tidak ditemukan.');
  var dipakai = baca('Transaksi').filter(function (t) {
    return String(t.rincian_kode).trim() === String(d.kode).trim();
  }).length;
  if (dipakai) throw new Error('Rincian ini dipakai oleh ' + dipakai + ' transaksi. Nonaktifkan saja.');
  sheet('M_Rincian').deleteRow(r._baris);
  catat(u, 'hapus', 'M_Rincian', d.kode, r.nama);
  hapusCache();
  return { pesan: 'Rincian dihapus.' };
}

// =========================================================== master: tahun

function aksiSimpanTahun(d, u) {
  var th = angka(d.tahun);
  if (th < 1900 || th > 2200) throw new Error('Tahun tidak valid.');
  var label = String(d.label_ts || '').trim().toUpperCase();
  if (label && !/^TS(-[1-9])?$/.test(label)) throw new Error('Label harus TS, TS-1, TS-2, dan seterusnya.');

  if (label) {
    var kolom = indeksKolom('M_Tahun');
    baca('M_Tahun').forEach(function (r) {
      if (String(r.label_ts).toUpperCase() === label && angka(r.tahun) !== th) {
        sheet('M_Tahun').getRange(r._baris, kolom.label_ts).setValue('');
      }
    });
  }

  var isi = { tahun: th, label_ts: label, aktif: d.aktif === false ? false : true };
  var lama = cariBaris('M_Tahun', 'tahun', th);
  if (lama) tulisBaris('M_Tahun', lama._baris, isi);
  else tambahBaris('M_Tahun', isi);
  catat(u, lama ? 'ubah' : 'tambah', 'M_Tahun', String(th), label);
  hapusCache();
  return { pesan: 'Tahun ' + th + ' tersimpan.' };
}

function aksiHapusTahun(d, u) {
  var r = cariBaris('M_Tahun', 'tahun', angka(d.tahun));
  if (!r) throw new Error('Tahun tidak ditemukan.');
  var dipakai = baca('Transaksi').filter(function (t) { return angka(t.tahun) === angka(d.tahun); }).length;
  if (dipakai) throw new Error('Tahun ini dipakai oleh ' + dipakai + ' transaksi. Nonaktifkan saja.');
  sheet('M_Tahun').deleteRow(r._baris);
  catat(u, 'hapus', 'M_Tahun', String(d.tahun), '');
  hapusCache();
  return { pesan: 'Tahun dihapus.' };
}

// ======================================================= master: parameter

function aksiSimpanParameter(d, u) {
  var daftar = d.parameter || {};
  var kolom = indeksKolom('M_Parameter');
  Object.keys(daftar).forEach(function (k) {
    var r = cariBaris('M_Parameter', 'kunci', k);
    if (r) sheet('M_Parameter').getRange(r._baris, kolom.nilai).setValue(daftar[k]);
    else tambahBaris('M_Parameter', { kunci: k, nilai: daftar[k], keterangan: '' });
  });
  catat(u, 'ubah', 'M_Parameter', Object.keys(daftar).join(','), '');
  hapusCache();
  return { pesan: 'Parameter tersimpan.' };
}

// ======================================================== master: pengguna

function aksiListPengguna() {
  var kontribusi = {};
  baca('Transaksi').forEach(function (t) {
    var e = String(t.dibuat_oleh).toLowerCase();
    kontribusi[e] = (kontribusi[e] || 0) + 1;
  });
  return baca('M_Pengguna').map(function (r) {
    var e = String(r.email).trim().toLowerCase();
    return {
      email: e, nama: r.nama, peran: String(r.peran).trim().toLowerCase(),
      aktif: benar(r.aktif), dibuat_pada: normalTanggal(r.dibuat_pada),
      terakhir_masuk: String(r.terakhir_masuk || ''), catatan: r.catatan || '',
      transaksi: kontribusi[e] || 0
    };
  });
}

function aksiSimpanPengguna(d, u) {
  var email = String(d.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Alamat email tidak valid.');
  var peran = String(d.peran || '').trim().toLowerCase();
  if (!TINGKAT.hasOwnProperty(peran)) throw new Error('Peran harus admin, verifikator, operator, atau publik.');

  var lama = cariBaris('M_Pengguna', 'email', email);
  var isi = {
    email: email,
    nama: String(d.nama || '').trim() || (lama && lama.nama) || email.split('@')[0],
    peran: peran,
    aktif: d.aktif === false ? false : true,
    dibuat_pada: lama ? normalTanggal(lama.dibuat_pada) : sekarang(),
    terakhir_masuk: lama ? String(lama.terakhir_masuk || '') : '',
    catatan: String(d.catatan || (lama && lama.catatan) || '')
  };

  // Jangan sampai tidak tersisa admin aktif.
  if (lama && String(lama.peran).toLowerCase() === PERAN.ADMIN && (peran !== PERAN.ADMIN || !isi.aktif)) {
    var adminLain = baca('M_Pengguna').filter(function (r) {
      return String(r.peran).toLowerCase() === PERAN.ADMIN && benar(r.aktif) &&
             String(r.email).trim().toLowerCase() !== email;
    });
    if (!adminLain.length) throw new Error('Tidak boleh menurunkan atau menonaktifkan admin terakhir.');
  }

  if (lama) tulisBaris('M_Pengguna', lama._baris, isi);
  else tambahBaris('M_Pengguna', isi);
  catat(u, lama ? 'ubah' : 'tambah', 'M_Pengguna', email, peran);
  return { pesan: 'Pengguna tersimpan.' };
}

function aksiHapusPengguna(d, u) {
  var email = String(d.email || '').trim().toLowerCase();
  var r = cariBaris('M_Pengguna', 'email', email);
  if (!r) throw new Error('Pengguna tidak ditemukan.');
  if (email === u.email) throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');

  if (String(r.peran).toLowerCase() === PERAN.ADMIN) {
    var adminLain = baca('M_Pengguna').filter(function (x) {
      return String(x.peran).toLowerCase() === PERAN.ADMIN && benar(x.aktif) &&
             String(x.email).trim().toLowerCase() !== email;
    });
    if (!adminLain.length) throw new Error('Tidak boleh menghapus admin terakhir.');
  }
  var punya = baca('Transaksi').filter(function (t) {
    return String(t.dibuat_oleh).toLowerCase() === email;
  }).length;
  if (punya) {
    throw new Error('Pengguna ini punya ' + punya + ' transaksi. Nonaktifkan saja agar jejak audit tetap utuh.');
  }
  sheet('M_Pengguna').deleteRow(r._baris);
  catat(u, 'hapus', 'M_Pengguna', email, '');
  return { pesan: 'Pengguna dihapus.' };
}

function aksiListLog(d) {
  var data = baca('Log');
  var per = Math.min(500, angka(d.perHalaman) || 100);
  return { baris: data.slice(-per).reverse(), total: data.length };
}
