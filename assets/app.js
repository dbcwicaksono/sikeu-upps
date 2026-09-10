/* SIKEU-UPPS — pustaka bersama: klien API, sesi, format, dan perhitungan borang */
(function () {
  'use strict';

  var CFG = window.SIKEU_CONFIG || {};

  // ------------------------------------------------------------- klien API

  var API = {
    async panggil(aksi, data) {
      if (!CFG.apiUrl || CFG.apiUrl.indexOf('GANTI') === 0) {
        throw new Error('URL API belum diisi. Buka config.js dan tempel URL Web App Apps Script Anda.');
      }
      var r;
      try {
        r = await fetch(CFG.apiUrl, {
          method: 'POST',
          // text/plain menjadikan ini "simple request" sehingga tidak ada
          // preflight OPTIONS — Apps Script tidak bisa menjawab preflight.
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ aksi: aksi, token: Sesi.token(), data: data || {} })
        });
      } catch (err) {
        throw new Error('Tidak dapat menghubungi server. Periksa koneksi internet dan URL API.');
      }
      var j;
      try { j = await r.json(); }
      catch (err) { throw new Error('Jawaban server tidak dapat dibaca. Pastikan Web App di-deploy dengan akses "Anyone".'); }
      if (!j.ok) {
        // Muat ulang hanya bila memang ada sesi yang kedaluwarsa; tanpa
        // penjagaan ini, pengunjung yang belum masuk akan terjebak
        // memuat ulang halaman terus-menerus.
        if (j.keluar && Sesi.token()) Sesi.keluar(true);
        var e2 = new Error(j.pesan || 'Terjadi kesalahan di server.');
        e2.perluMasuk = !!j.keluar;
        throw e2;
      }
      return j.data;
    }
  };

  // ------------------------------------------------------------------ sesi

  var KUNCI_TOKEN = 'sikeu_token';
  var KUNCI_USER = 'sikeu_pengguna';

  var Sesi = {
    token: function () { try { return localStorage.getItem(KUNCI_TOKEN) || ''; } catch (e) { return ''; } },
    pengguna: function () {
      try { return JSON.parse(localStorage.getItem(KUNCI_USER) || 'null'); } catch (e) { return null; }
    },
    masuk: function (token, pengguna) {
      try {
        localStorage.setItem(KUNCI_TOKEN, token);
        localStorage.setItem(KUNCI_USER, JSON.stringify(pengguna));
      } catch (e) { /* penyimpanan diblokir */ }
    },
    keluar: function (otomatis) {
      try { localStorage.removeItem(KUNCI_TOKEN); localStorage.removeItem(KUNCI_USER); } catch (e) {}
      if (otomatis) {
        setTimeout(function () { location.reload(); }, 400);
      }
    },
    adalahAdmin: function () { var u = Sesi.pengguna(); return !!u && u.peran === 'admin'; },
    masuk_p: function () { return !!Sesi.token() && !!Sesi.pengguna(); }
  };

  // ---------------------------------------------------------------- format

  var Fmt = {
    /** 1234560000 -> "1.234,56" (dalam juta rupiah, sesuai borang) */
    juta: function (n, desimal) {
      var d = desimal === undefined ? 2 : desimal;
      return (Number(n || 0) / 1e6).toLocaleString('id-ID', {
        minimumFractionDigits: d, maximumFractionDigits: d
      });
    },
    rupiah: function (n) {
      return 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
    },
    angka: function (n, d) {
      return Number(n || 0).toLocaleString('id-ID', {
        minimumFractionDigits: d === undefined ? 2 : d,
        maximumFractionDigits: d === undefined ? 2 : d
      });
    },
    persen: function (n, d) { return Fmt.angka(n, d === undefined ? 2 : d) + '%'; },
    tanggal: function (s) {
      if (!s) return '';
      var t = String(s).slice(0, 10).split('-');
      if (t.length !== 3) return String(s);
      var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return Number(t[2]) + ' ' + bulan[Number(t[1]) - 1] + ' ' + t[0];
    },
    aman: function (s) {
      return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  };

  // -------------------------------------------------------------- antarmuka

  var UI = {
    toast: function (pesan, jenis) {
      var wadah = document.getElementById('toast-wadah');
      if (!wadah) {
        wadah = document.createElement('div');
        wadah.id = 'toast-wadah';
        document.body.appendChild(wadah);
      }
      var t = document.createElement('div');
      t.className = 'toast ' + (jenis || '');
      t.textContent = pesan;
      wadah.appendChild(t);
      setTimeout(function () {
        t.style.transition = 'opacity .3s';
        t.style.opacity = '0';
        setTimeout(function () { t.remove(); }, 300);
      }, jenis === 'galat' ? 6000 : 3500);
    },
    galat: function (p) { UI.toast(p, 'galat'); },
    sukses: function (p) { UI.toast(p, 'sukses'); },

    /** Bangun kepala halaman + navigasi sesuai peran. */
    kepala: function (halamanAktif) {
      var u = Sesi.pengguna();
      var tautan = [
        { href: 'index.html', label: 'Dashboard', kunci: 'dashboard' },
        { href: 'input.html', label: 'Input Data', kunci: 'input' }
      ];
      if (u && u.peran === 'admin') {
        tautan.push({ href: 'master.html', label: 'Kelola Master', kunci: 'master' });
      }

      var nav = tautan.map(function (t) {
        return '<a href="' + t.href + '"' + (t.kunci === halamanAktif ? ' class="aktif"' : '') + '>' +
          Fmt.aman(t.label) + '</a>';
      }).join('');

      var blokPengguna = u
        ? '<div class="nav-pengguna"><b>' + Fmt.aman(u.nama) + '</b>' +
          '<span class="peran">' + (u.peran === 'admin' ? 'Wakil Dekan' : 'Dosen') + '</span>' +
          '<button class="tombol-kecil" id="tbl-keluar">Keluar</button></div>'
        : '<div class="nav-pengguna"><a href="input.html">Masuk</a></div>';

      var el = document.createElement('header');
      el.className = 'kepala';
      el.innerHTML =
        '<div class="kepala-isi">' +
          '<div class="merek">' + Fmt.aman(CFG.namaSistem || 'SIKEU-UPPS') +
            '<small>' + Fmt.aman(CFG.subJudul || '') + '</small></div>' +
          '<nav class="nav">' + nav + blokPengguna + '</nav>' +
        '</div>';
      document.body.insertBefore(el, document.body.firstChild);

      var keluar = document.getElementById('tbl-keluar');
      if (keluar) {
        keluar.addEventListener('click', function () {
          Sesi.keluar();
          location.href = 'index.html';
        });
      }
    },

    modal: function (judul, isiHtml, tombol) {
      var tirai = document.createElement('div');
      tirai.className = 'tirai';
      tirai.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
          '<div class="modal-kepala"><h3>' + Fmt.aman(judul) + '</h3>' +
            '<button class="modal-tutup" aria-label="Tutup">&times;</button></div>' +
          '<div class="modal-isi">' + isiHtml + '</div>' +
          '<div class="modal-kaki"></div>' +
        '</div>';
      document.body.appendChild(tirai);

      var tutup = function () { tirai.remove(); };
      tirai.querySelector('.modal-tutup').addEventListener('click', tutup);
      tirai.addEventListener('click', function (e) { if (e.target === tirai) tutup(); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { tutup(); document.removeEventListener('keydown', esc); }
      });

      var kaki = tirai.querySelector('.modal-kaki');
      (tombol || []).forEach(function (t) {
        var b = document.createElement('button');
        b.className = t.kelas || '';
        b.textContent = t.label;
        b.addEventListener('click', function () { t.aksi(tutup, tirai); });
        kaki.appendChild(b);
      });

      var fokus = tirai.querySelector('input, select, textarea');
      if (fokus) fokus.focus();
      return { tirai: tirai, tutup: tutup };
    },

    konfirmasi: function (judul, pesan, saatYa, labelYa) {
      UI.modal(judul, '<p style="margin:0">' + Fmt.aman(pesan) + '</p>', [
        { label: 'Batal', aksi: function (tutup) { tutup(); } },
        {
          label: labelYa || 'Ya, lanjutkan', kelas: 'tombol-bahaya',
          aksi: function (tutup) { tutup(); saatYa(); }
        }
      ]);
    }
  };

  // ------------------------------------------------ perhitungan borang

  var Hitung = {
    /**
     * Bulatkan ke 0,01 juta rupiah (Rp 10.000 terdekat).
     *
     * Borang menyajikan angka dalam juta rupiah dua desimal. Agar tabel yang
     * tercetak konsisten — sub-total benar-benar sama dengan hasil penjumlahan
     * baris di atasnya — pembulatan dilakukan pada sel dasar, lalu seluruh
     * sub-total dan total diturunkan dari nilai yang sudah dibulatkan itu.
     */
    bulat: function (v) { return Math.round((v || 0) / 1e4) * 1e4; },

    /**
     * Ambil tiga tahun jendela akreditasi (TS-2, TS-1, TS) dari master.
     * Diurutkan menaik. Bila label TS belum diatur, pakai tiga tahun terakhir.
     */
    jendelaTS: function (master) {
      var berlabel = {};
      (master.tahun || []).forEach(function (t) {
        if (t.label_ts) berlabel[t.label_ts.toUpperCase()] = t.tahun;
      });
      if (berlabel['TS'] && berlabel['TS-1'] && berlabel['TS-2']) {
        return [berlabel['TS-2'], berlabel['TS-1'], berlabel['TS']];
      }
      var semua = (master.tahun || []).map(function (t) { return t.tahun; }).sort(function (a, b) { return a - b; });
      return semua.slice(-3);
    },

    labelTahun: function (master, tahun) {
      var m = (master.tahun || []).filter(function (t) { return t.tahun === tahun; })[0];
      return (m && m.label_ts) ? m.label_ts + ' (' + tahun + ')' : String(tahun);
    },

    /** Saring agregat sesuai jendela tahun dan status verifikasi. */
    saring: function (agregat, tahunList, ikutMenunggu) {
      return (agregat || []).filter(function (a) {
        if (tahunList.indexOf(a.t) < 0) return false;
        if (!ikutMenunggu && !a.v) return false;
        return true;
      });
    },

    /**
     * Tabel 12 — Jumlah Penerimaan Dana di UPPS.
     * Sumber dana tetap; jenis dana mengikuti master (hanya yang ada nilainya).
     */
    tabel12: function (master, agregat, tahunList) {
      var petaJD = {};
      (master.jenis_dana || []).forEach(function (j) { petaJD[j.id] = j; });

      var nilai = {};   // jenis_dana_id -> { tahun -> jumlah }
      agregat.forEach(function (a) {
        if (!nilai[a.j]) nilai[a.j] = {};
        nilai[a.j][a.t] = (nilai[a.j][a.t] || 0) + a.n;
      });

      var kelompok = [];
      (master.sumber_dana || []).forEach(function (s) {
        var barisSumber = (master.jenis_dana || [])
          .filter(function (j) { return j.sumber_kode === s.kode; })
          .map(function (j) {
            var per = tahunList.map(function (th) { return Hitung.bulat((nilai[j.id] || {})[th] || 0); });
            return {
              jenis_dana_id: j.id, nama: j.nama, per_tahun: per,
              jumlah: per.reduce(function (x, y) { return x + y; }, 0),
              rata: per.reduce(function (x, y) { return x + y; }, 0) / tahunList.length
            };
          })
          .filter(function (b) { return b.jumlah > 0; });

        // Jenis dana yang dipakai transaksi tetapi sudah dinonaktifkan di master
        // tetap ditampilkan agar angka borang tidak hilang diam-diam.
        Object.keys(nilai).forEach(function (id) {
          if (petaJD[id]) return;
          var adaDiSumber = false;
          agregat.forEach(function (a) { if (a.j === id && a.s === s.kode) adaDiSumber = true; });
          if (!adaDiSumber) return;
          var per = tahunList.map(function (th) { return Hitung.bulat(nilai[id][th] || 0); });
          var jml = per.reduce(function (x, y) { return x + y; }, 0);
          if (jml > 0) {
            barisSumber.push({
              jenis_dana_id: id, nama: '(jenis dana terhapus: ' + id + ')',
              per_tahun: per, jumlah: jml, rata: jml / tahunList.length, yatim: true
            });
          }
        });

        var sub = tahunList.map(function (_, i) {
          return barisSumber.reduce(function (x, b) { return x + b.per_tahun[i]; }, 0);
        });
        kelompok.push({
          kode: s.kode, nama: s.nama, baris: barisSumber,
          sub_per_tahun: sub,
          sub_jumlah: sub.reduce(function (x, y) { return x + y; }, 0),
          sub_rata: sub.reduce(function (x, y) { return x + y; }, 0) / tahunList.length
        });
      });

      var mhs = kelompok.filter(function (k) { return k.kode === 'MHS'; });
      var lain = kelompok.filter(function (k) { return k.kode !== 'MHS'; });

      var jum = function (daftar) {
        var per = tahunList.map(function (_, i) {
          return daftar.reduce(function (x, k) { return x + k.sub_per_tahun[i]; }, 0);
        });
        var t = per.reduce(function (x, y) { return x + y; }, 0);
        return { per_tahun: per, jumlah: t, rata: t / tahunList.length };
      };

      return {
        tahun: tahunList,
        kelompok: kelompok,
        subtotal_mahasiswa: jum(mhs),
        subtotal_lainnya: jum(lain),
        total: jum(kelompok)
      };
    },

    /**
     * Tabel 13 — Jumlah Penggunaan Dana di UPPS.
     * Tujuh baris tetap, lengkap dengan persentase terhadap total tahun berjalan.
     */
    tabel13: function (master, agregat, tahunList) {
      var nilai = {};
      agregat.forEach(function (a) {
        if (!nilai[a.g]) nilai[a.g] = {};
        nilai[a.g][a.t] = (nilai[a.g][a.t] || 0) + a.n;
      });

      var baris = (master.jenis_penggunaan || []).map(function (p) {
        var per = tahunList.map(function (th) { return Hitung.bulat((nilai[p.kode] || {})[th] || 0); });
        var jml = per.reduce(function (x, y) { return x + y; }, 0);
        return {
          kode: p.kode, no: p.no, nama: p.nama, kelompok: p.kelompok,
          per_tahun: per, jumlah: jml, rata: jml / tahunList.length
        };
      });

      // Total kolom dijumlahkan dari baris yang sudah dibulatkan, sehingga
      // persentase pun konsisten dengan angka yang tercetak di tabel.
      var totalTahun = tahunList.map(function (_, i) {
        return baris.reduce(function (x, b) { return x + b.per_tahun[i]; }, 0);
      });

      baris.forEach(function (b) {
        b.persen = b.per_tahun.map(function (v, i) { return totalTahun[i] ? (v / totalTahun[i]) * 100 : 0; });
      });

      var ringkas = function (filter) {
        var isi = baris.filter(filter);
        var per = tahunList.map(function (_, i) {
          return isi.reduce(function (x, b) { return x + b.per_tahun[i]; }, 0);
        });
        var jml = per.reduce(function (x, y) { return x + y; }, 0);
        return {
          per_tahun: per,
          persen: per.map(function (v, i) { return totalTahun[i] ? (v / totalTahun[i]) * 100 : 0; }),
          jumlah: jml,
          rata: jml / tahunList.length
        };
      };

      return {
        tahun: tahunList,
        baris: baris,
        subtotal_operasional: ringkas(function (b) { return b.kelompok === 'operasional'; }),
        subtotal_investasi: ringkas(function (b) { return b.kelompok === 'investasi'; }),
        total: ringkas(function () { return true; })
      };
    },

    /**
     * Skor butir 5.1 akreditasi, memakai rumus yang tertulis di lembar
     * penilaian: PDMHS, DOM, persentase investasi, RPD, dan RPKM.
     */
    skor: function (master, t12, t13) {
      var p = master.parameter || {};
      var dosen = Number(p.jumlah_dosen) || 0;
      var mhs = Number(p.jumlah_mahasiswa) || 0;
      var thn = t12.tahun.length || 3;
      var batas = function (v) { return Math.max(0, Math.min(4, v)); };
      var jt = function (v) { return v / 1e6; };

      // 5.1.1 — persentase dana dari mahasiswa terhadap total penerimaan
      var totalTerima = t12.total.jumlah;
      var pdm = totalTerima ? t12.subtotal_mahasiswa.jumlah / totalTerima : 0;
      var s511 = pdm <= 0.33 ? 4 : batas(4.99 - 2.99 * pdm);

      // 5.1.2.1 — dana operasional per mahasiswa per tahun (juta rupiah)
      var dom = mhs ? jt(t13.subtotal_operasional.jumlah) / mhs / thn : 0;
      var s5121 = dom >= 18 ? 4 : batas((2 * dom) / 9);

      // 5.1.2.2 — porsi dana investasi terhadap total penggunaan
      var totalPakai = t13.total.jumlah;
      var inv = totalPakai ? t13.subtotal_investasi.jumlah / totalPakai : 0;
      var pi = inv * 100;
      var s5122 = (pi >= 5 && pi < 10) ? 4 : (pi >= 10 && pi < 15) ? 3 : (pi >= 15 && pi <= 20) ? 2 : 1;

      // 5.1.2.3 — dana penelitian per dosen per tahun
      var pen = t13.baris.filter(function (b) { return b.kode === 'P2'; })[0];
      var rpd = dosen ? jt(pen ? pen.jumlah : 0) / dosen / thn : 0;
      var s5123 = rpd >= 10 ? 4 : batas(rpd > 0 ? 1 + (3 * rpd) / 10 : 0);

      // 5.1.2.4 — dana PkM per dosen per tahun
      var pkm = t13.baris.filter(function (b) { return b.kode === 'P3'; })[0];
      var rpkm = dosen ? jt(pkm ? pkm.jumlah : 0) / dosen / thn : 0;
      var s5124 = rpkm >= 5 ? 4 : batas(0.8 * rpkm);

      var butir = [
        {
          kode: '5.1.1', bobot: 1.4, skor: s511,
          nama: 'Persentase perolehan dana dari mahasiswa terhadap total penerimaan (PDMHS)',
          dasar: 'PDMHS = ' + Fmt.persen(pdm * 100),
          rumus: p.jenis_pt === 'PTS'
            ? 'PTS: memakai rumus PTN — sesuaikan bila borang Anda berbeda'
            : 'PTN: PDM ≤ 33% → 4; selain itu 4,99 − (2,99 × PDM)'
        },
        {
          kode: '5.1.2.1', bobot: 0.7, skor: s5121,
          nama: 'Dana operasional pendidikan, penelitian & PkM per mahasiswa per tahun',
          dasar: 'DOM = ' + Fmt.angka(dom) + ' juta/mhs/tahun',
          rumus: 'DOM ≥ 18 juta → 4; selain itu (2 × DOM) ÷ 9'
        },
        {
          kode: '5.1.2.2', bobot: 0.35, skor: s5122,
          nama: 'Porsi dana investasi (prasarana, sarana, SDM) terhadap total penggunaan',
          dasar: 'Investasi = ' + Fmt.persen(pi) + ' dari total penggunaan',
          rumus: '5–10% → 4; 10–15% → 3; 15–20% → 2; di luar itu → 1'
        },
        {
          kode: '5.1.2.3', bobot: 0.7, skor: s5123,
          nama: 'Dana penelitian per dosen tetap per tahun',
          dasar: 'RPD = ' + Fmt.angka(rpd) + ' juta/dosen/tahun',
          rumus: 'RPD ≥ 10 → 4; 0 < RPD < 10 → 1 + (3 × RPD) ÷ 10'
        },
        {
          kode: '5.1.2.4', bobot: 0.7, skor: s5124,
          nama: 'Dana pengabdian kepada masyarakat per dosen tetap per tahun',
          dasar: 'RPKM = ' + Fmt.angka(rpkm) + ' juta/dosen/tahun',
          rumus: 'RPKM ≥ 5 → 4; 0 < RPKM < 5 → 0,8 × RPKM'
        }
      ];

      butir.forEach(function (b) { b.terbobot = b.skor * b.bobot; });

      return {
        butir: butir,
        total_bobot: butir.reduce(function (x, b) { return x + b.bobot; }, 0),
        total_terbobot: butir.reduce(function (x, b) { return x + b.terbobot; }, 0),
        nilai: { pdm: pdm, dom: dom, investasi: pi, rpd: rpd, rpkm: rpkm, dosen: dosen, mahasiswa: mhs }
      };
    }
  };

  // ------------------------------------------------------------------ ekspor

  var Ekspor = {
    /** Unduh sebuah <table> sebagai berkas yang bisa dibuka Excel. */
    tabelKeExcel: function (elemenTabel, namaBerkas, judul) {
      var gaya = 'table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}' +
                 'td,th{border:1px solid #999;padding:4px 6px}' +
                 'th{background:#dce6f1;font-weight:bold;text-align:center}' +
                 '.angka{text-align:right}';
      var html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head>' +
        '<meta charset="utf-8"><style>' + gaya + '</style></head><body>' +
        (judul ? '<h3>' + Fmt.aman(judul) + '</h3>' : '') +
        elemenTabel.outerHTML + '</body></html>';
      var blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      Ekspor.unduh(blob, namaBerkas + '.xls');
    },

    barisKeCsv: function (baris, namaBerkas) {
      var csv = baris.map(function (r) {
        return r.map(function (sel) {
          var s = String(sel === null || sel === undefined ? '' : sel);
          return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(';');
      }).join('\r\n');
      Ekspor.unduh(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), namaBerkas + '.csv');
    },

    unduh: function (blob, nama) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = nama;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  };

  window.SIKEU = { API: API, Sesi: Sesi, Fmt: Fmt, UI: UI, Hitung: Hitung, Ekspor: Ekspor, CFG: CFG };
})();
