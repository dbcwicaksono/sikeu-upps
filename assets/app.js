/* SIKEU-UPPS — pustaka bersama: identitas Google, klien API, format, dan perhitungan borang */
(function () {
  'use strict';

  var CFG = window.SIKEU_CONFIG || {};

  var STATUS = { DRAFT: 'draft', DIAJUKAN: 'diajukan', TERVERIFIKASI: 'terverifikasi', DITOLAK: 'ditolak' };

  var LABEL_STATUS = {
    draft: 'Draft', diajukan: 'Menunggu Verifikasi',
    terverifikasi: 'Terverifikasi', ditolak: 'Ditolak'
  };
  var KELAS_STATUS = {
    draft: 'lencana-abu', diajukan: 'lencana-jingga',
    terverifikasi: 'lencana-hijau', ditolak: 'lencana-merah'
  };
  var LABEL_PERAN = {
    admin: 'Admin', verifikator: 'Verifikator', operator: 'Operator', publik: 'Publik'
  };
  var TINGKAT = { publik: 0, operator: 1, verifikator: 2, admin: 3 };

  // ============================================================== identitas

  var KUNCI_TOKEN = 'sikeu_id_token';
  var KUNCI_PROFIL = 'sikeu_profil';
  var KUNCI_SAMARAN = 'sikeu_samaran';

  function simpanan() {
    try { return window.sessionStorage; } catch (e) { return null; }
  }
  function ambil(k) { var s = simpanan(); try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function taruh(k, v) { var s = simpanan(); try { if (s) s.setItem(k, v); } catch (e) {} }
  function buang(k) { var s = simpanan(); try { if (s) s.removeItem(k); } catch (e) {} }

  /** Baca isi JWT tanpa memverifikasinya — hanya untuk tampilan dan masa berlaku. */
  function isiToken(jwt) {
    try {
      var bagian = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var teks = decodeURIComponent(atob(bagian).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(teks);
    } catch (e) { return null; }
  }

  var Auth = {
    _pengguna: null,
    _saatMasuk: [],

    token: function () {
      var t = ambil(KUNCI_TOKEN);
      if (!t) return '';
      var isi = isiToken(t);
      // Beri jarak 60 detik supaya token tidak kedaluwarsa di tengah permintaan.
      if (!isi || !isi.exp || isi.exp * 1000 < Date.now() + 60000) {
        buang(KUNCI_TOKEN);
        return '';
      }
      return t;
    },

    masuk_p: function () { return !!Auth.token(); },

    /** Profil dari server (berisi peran). Diisi oleh Auth.muatProfil(). */
    pengguna: function () {
      if (Auth._pengguna) return Auth._pengguna;
      try { Auth._pengguna = JSON.parse(ambil(KUNCI_PROFIL) || 'null'); } catch (e) { Auth._pengguna = null; }
      return Auth._pengguna;
    },

    samaran: function () { return ambil(KUNCI_SAMARAN) || ''; },

    setSamaran: function (peran) {
      if (peran) taruh(KUNCI_SAMARAN, peran); else buang(KUNCI_SAMARAN);
      Auth._pengguna = null;
      buang(KUNCI_PROFIL);
    },

    peran: function () {
      var u = Auth.pengguna();
      return u ? u.peran : 'publik';
    },

    boleh: function (peranMinimal) {
      return TINGKAT[Auth.peran()] >= TINGKAT[peranMinimal];
    },

    /** Tanyakan ke server siapa kita dan apa perannya. */
    muatProfil: async function () {
      if (!Auth.token()) { Auth._pengguna = null; buang(KUNCI_PROFIL); return null; }
      var u = await API.panggil('saya', {});
      Auth._pengguna = u;
      taruh(KUNCI_PROFIL, JSON.stringify(u));
      return u;
    },

    keluar: function () {
      buang(KUNCI_TOKEN); buang(KUNCI_PROFIL); buang(KUNCI_SAMARAN);
      Auth._pengguna = null;
      if (window.google && google.accounts && google.accounts.id) {
        try { google.accounts.id.disableAutoSelect(); } catch (e) {}
      }
    },

    /** Muat pustaka Google Identity Services sekali saja. */
    siapkan: function () {
      if (Auth._siap) return Auth._siap;
      Auth._siap = new Promise(function (selesai, gagal) {
        if (!CFG.clientId) { gagal(new Error('clientId belum diisi di config.js.')); return; }
        if (window.google && google.accounts && google.accounts.id) { selesai(); return; }
        var s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = function () { selesai(); };
        s.onerror = function () {
          gagal(new Error('Gagal memuat Google Sign-In. Periksa koneksi internet Anda.'));
        };
        document.head.appendChild(s);
      }).then(function () {
        google.accounts.id.initialize({
          client_id: CFG.clientId,
          callback: function (res) {
            if (!res || !res.credential) return;
            taruh(KUNCI_TOKEN, res.credential);
            Auth._pengguna = null;
            buang(KUNCI_PROFIL);
            Auth._saatMasuk.forEach(function (fn) { fn(); });
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });
      });
      return Auth._siap;
    },

    saatMasuk: function (fn) { Auth._saatMasuk.push(fn); },

    /** Gambar tombol resmi "Sign in with Google" di dalam elemen. */
    gambarTombol: async function (el, opsi) {
      await Auth.siapkan();
      el.innerHTML = '';
      google.accounts.id.renderButton(el, Object.assign({
        theme: 'outline', size: 'large', text: 'signin_with',
        shape: 'rectangular', logo_alignment: 'left', locale: 'id'
      }, opsi || {}));
    }
  };

  // ============================================================= klien API

  var API = {
    panggil: async function (aksi, data) {
      if (!CFG.apiUrl || CFG.apiUrl.indexOf('GANTI') === 0) {
        throw new Error('URL API belum diisi. Buka config.js dan tempel URL Web App Apps Script Anda.');
      }
      var muatan = { aksi: aksi, data: data || {} };
      var t = Auth.token();
      if (t) muatan.idToken = t;
      var samaran = Auth.samaran();
      if (samaran) muatan.lihatSebagai = samaran;

      var r;
      try {
        r = await fetch(CFG.apiUrl, {
          method: 'POST',
          // text/plain menjadikan ini "simple request" sehingga tidak memicu
          // preflight OPTIONS, yang tidak dapat dijawab Apps Script.
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(muatan)
        });
      } catch (err) {
        throw new Error('Tidak dapat menghubungi server. Periksa koneksi internet dan URL API di config.js.');
      }

      var j;
      try { j = await r.json(); }
      catch (err) {
        throw new Error('Jawaban server tidak dapat dibaca. Pastikan Web App di-deploy dengan akses "Anyone" ' +
                        'dan URL-nya berakhiran /exec, bukan /dev.');
      }

      if (!j.ok) {
        var e2 = new Error(j.pesan || 'Terjadi kesalahan di server.');
        e2.perluMasuk = !!j.perluMasuk;
        if (j.perluMasuk) { buang(KUNCI_TOKEN); buang(KUNCI_PROFIL); Auth._pengguna = null; }
        throw e2;
      }
      return j.data;
    }
  };

  // =============================================================== format

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
    },
    status: function (kode) {
      var k = String(kode || '').toLowerCase();
      return '<span class="lencana ' + (KELAS_STATUS[k] || 'lencana-abu') + '">' +
        Fmt.aman(LABEL_STATUS[k] || k) + '</span>';
    }
  };

  // ============================================================ antarmuka

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
      }, jenis === 'galat' ? 6500 : 3500);
    },
    galat: function (p) { UI.toast(p, 'galat'); },
    sukses: function (p) { UI.toast(p, 'sukses'); },

    /** Kepala halaman + navigasi sesuai peran + pengalih "Lihat sebagai". */
    kepala: function (halamanAktif) {
      var u = Auth.pengguna();
      var peran = u ? u.peran : 'publik';

      var tautan = [{ href: 'index.html', label: 'Dashboard', kunci: 'dashboard' }];
      if (TINGKAT[peran] >= TINGKAT.operator) {
        tautan.push({ href: 'input.html', label: 'Input Data', kunci: 'input' });
      }
      if (TINGKAT[peran] >= TINGKAT.admin) {
        tautan.push({ href: 'master.html', label: 'Kelola Master', kunci: 'master' });
      }

      var nav = tautan.map(function (t) {
        return '<a href="' + t.href + '"' + (t.kunci === halamanAktif ? ' class="aktif"' : '') + '>' +
          Fmt.aman(t.label) + '</a>';
      }).join('');

      var blok;
      if (u) {
        var samaran = (u.peran_tersedia && u.peran_tersedia.length)
          ? '<select id="pilih-samaran" title="Lihat sebagai" ' +
            'style="width:auto;padding:4px 8px;font-size:12px">' +
            u.peran_tersedia.map(function (p) {
              return '<option value="' + p + '"' + (p === u.peran ? ' selected' : '') + '>' +
                'Lihat sebagai: ' + Fmt.aman(LABEL_PERAN[p] || p) + '</option>';
            }).join('') + '</select>'
          : '';
        blok = '<div class="nav-pengguna">' +
          '<b title="' + Fmt.aman(u.email) + '">' + Fmt.aman(u.nama) + '</b>' +
          '<span class="peran">' + Fmt.aman(LABEL_PERAN[u.peran] || u.peran) +
            (u.menyamar ? ' (samaran)' : '') + '</span>' +
          samaran +
          '<button class="tombol-kecil" id="tbl-keluar">Keluar</button></div>';
      } else {
        blok = '<div class="nav-pengguna"><span id="kotak-masuk-mini"></span></div>';
      }

      var el = document.createElement('header');
      el.className = 'kepala';
      el.innerHTML =
        '<div class="kepala-isi">' +
          '<div class="merek">' + Fmt.aman(CFG.namaSistem || 'SIKEU-UPPS') +
            '<small>' + Fmt.aman(CFG.subJudul || '') + '</small></div>' +
          '<nav class="nav">' + nav + blok + '</nav>' +
        '</div>';

      // Halaman memasang kerangka kepala statis agar tidak tampak putih kosong
      // selama menunggu server; di sini kerangka itu diganti yang sebenarnya.
      var kerangka = document.querySelector('header.kepala');
      if (kerangka) kerangka.parentNode.replaceChild(el, kerangka);
      else document.body.insertBefore(el, document.body.firstChild);

      var keluar = document.getElementById('tbl-keluar');
      if (keluar) {
        keluar.addEventListener('click', function () {
          Auth.keluar();
          location.href = 'index.html';
        });
      }

      var pilih = document.getElementById('pilih-samaran');
      if (pilih) {
        pilih.addEventListener('change', function () {
          // Peran asli tidak perlu disamarkan.
          Auth.setSamaran(pilih.value === u.peran_asli ? '' : pilih.value);
          location.reload();
        });
      }

      var mini = document.getElementById('kotak-masuk-mini');
      if (mini) {
        Auth.gambarTombol(mini, { size: 'medium', text: 'signin' }).catch(function () {
          mini.innerHTML = '<span style="font-size:12px;opacity:.8">Google Sign-In tidak tersedia</span>';
        });
      }
    },

    /**
     * Hapus layar tunggu awal.
     *
     * Apps Script perlu beberapa detik untuk bangun dari dingin pada panggilan
     * pertama. Tanpa layar tunggu, halaman tampak putih kosong dan terbaca
     * seperti gagal — jadi kerangkanya dipasang statis di HTML, lalu dibuang
     * di sini begitu ada yang bisa ditampilkan.
     */
    selesaiMuat: function () {
      var el = document.getElementById('layar-muat');
      if (el) el.remove();
    },

    /** Layar penuh "silakan masuk" untuk halaman yang menuntut identitas. */
    layarMasuk: function (wadah, judul, keterangan) {
      UI.selesaiMuat();
      wadah.innerHTML =
        '<div class="masuk-bungkus"><div class="kartu">' +
          '<div class="kartu-kepala"><h2 class="kartu-judul">' + Fmt.aman(judul) + '</h2></div>' +
          '<div class="kartu-isi" style="text-align:center">' +
            '<p style="color:var(--teks-lemah);font-size:13.5px;margin:0 0 18px">' + keterangan + '</p>' +
            '<div id="kotak-masuk" style="display:flex;justify-content:center"></div>' +
            '<p class="catatan-kaki" style="margin-top:18px">' +
              'Tidak ada kata sandi. Identitas Anda berasal langsung dari akun Google, ' +
              'sehingga setiap entri tercatat atas nama pemilik akun yang sebenarnya.' +
            '</p>' +
          '</div>' +
        '</div></div>';
      var kotak = document.getElementById('kotak-masuk');
      Auth.gambarTombol(kotak).catch(function (err) {
        kotak.innerHTML = '<div class="pesan pesan-galat">' + Fmt.aman(err.message) + '</div>';
      });
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
        { label: labelYa || 'Ya, lanjutkan', kelas: 'tombol-bahaya',
          aksi: function (tutup) { tutup(); saatYa(); } }
      ]);
    }
  };

  // ==================================================== perhitungan borang

  var Hitung = {
    /**
     * Bulatkan ke 0,01 juta rupiah (Rp 10.000 terdekat).
     * Dipakai untuk nilai tunggal; kolom tabel memakai bulatkanKolom().
     */
    bulat: function (v) { return Math.round((v || 0) / 1e4) * 1e4; },

    /**
     * Bulatkan satu kolom angka ke 0,01 juta dengan metode sisa terbesar,
     * sehingga jumlah nilai yang dibulatkan PERSIS sama dengan pembulatan
     * jumlah aslinya.
     *
     * Inilah yang menjaga total Tabel 12 sama dengan total Tabel 13. Keduanya
     * mengelompokkan uang yang sama dengan cara berbeda — per jenis dana dan
     * per jenis penggunaan — sehingga bila tiap sel dibulatkan sendiri-sendiri,
     * sisa pembulatannya berbeda dan total kedua tabel bisa meleset satu sen.
     */
    bulatkanKolom: function (mentah) {
      var UNIT = 1e4;                       // Rp 10.000 = 0,01 juta
      var skala = (mentah || []).map(function (v) { return (v || 0) / UNIT; });
      if (!skala.length) return [];

      var bawah = skala.map(Math.floor);
      var target = Math.round(skala.reduce(function (a, b) { return a + b; }, 0));
      var sisa = target - bawah.reduce(function (a, b) { return a + b; }, 0);

      var urut = skala.map(function (v, i) { return { i: i, pecahan: v - Math.floor(v) }; })
        .sort(function (a, b) { return b.pecahan - a.pecahan || a.i - b.i; });

      var hasil = bawah.slice();
      for (var n = 0; n < sisa && urut.length; n++) hasil[urut[n % urut.length].i] += 1;
      return hasil.map(function (u) { return u * UNIT; });
    },

    /**
     * Tiga tahun jendela akreditasi (TS-2, TS-1, TS), menaik.
     * Bila label TS belum diatur, pakai tiga tahun terakhir yang ada.
     */
    jendelaTS: function (master) {
      var berlabel = {};
      (master.tahun || []).forEach(function (t) {
        if (t.label_ts) berlabel[String(t.label_ts).toUpperCase()] = t.tahun;
      });
      if (berlabel['TS'] && berlabel['TS-1'] && berlabel['TS-2']) {
        return [berlabel['TS-2'], berlabel['TS-1'], berlabel['TS']];
      }
      var semua = (master.tahun || []).map(function (t) { return t.tahun; })
        .sort(function (a, b) { return a - b; });
      return semua.slice(-3);
    },

    labelTahun: function (master, tahun) {
      var m = (master.tahun || []).filter(function (t) { return t.tahun === tahun; })[0];
      return (m && m.label_ts) ? m.label_ts + ' (' + tahun + ')' : String(tahun);
    },

    /**
     * Saring agregat sesuai jendela tahun dan status.
     * Borang hanya boleh menghitung baris "terverifikasi"; ikutMenunggu
     * dipakai untuk pratinjau dampak antrean sebelum diverifikasi.
     */
    saring: function (agregat, tahunList, ikutMenunggu) {
      return (agregat || []).filter(function (a) {
        if (tahunList.indexOf(a.t) < 0) return false;
        if (a.v) return true;
        return !!ikutMenunggu && a.st === STATUS.DIAJUKAN;
      });
    },

    /**
     * Tabel 12 — Jumlah Penerimaan Dana di UPPS.
     * Sumber dana tetap; jenis dana mengikuti master, dan kategori yang
     * digabungkan sudah dilaporkan pada tujuannya oleh server.
     */
    tabel12: function (master, agregat, tahunList) {
      var petaJD = {};
      (master.jenis_dana || []).forEach(function (j) { petaJD[j.kode] = j; });

      var nilai = {};   // kode jenis dana -> { tahun -> jumlah }
      agregat.forEach(function (a) {
        if (!nilai[a.j]) nilai[a.j] = {};
        nilai[a.j][a.t] = (nilai[a.j][a.t] || 0) + a.n;
      });

      // Lintasan pertama: kumpulkan seluruh baris beserta nilai mentahnya,
      // lintas sumber dana, agar pembulatan kolom bisa sekali untuk semua.
      var semuaBaris = [];
      (master.sumber_dana || []).forEach(function (s) {
        (master.jenis_dana || [])
          .filter(function (j) { return j.sumber_kode === s.kode; })
          .forEach(function (j) {
            var mentah = tahunList.map(function (th) { return (nilai[j.kode] || {})[th] || 0; });
            if (mentah.reduce(function (x, y) { return x + y; }, 0) > 0) {
              semuaBaris.push({ sumber: s.kode, jenis_dana_kode: j.kode, nama: j.nama, mentah: mentah });
            }
          });

        // Kategori yang dipakai transaksi tetapi tidak lagi ada di master
        // tetap ditampilkan, supaya angka borang tidak hilang diam-diam.
        Object.keys(nilai).forEach(function (kode) {
          if (petaJD[kode]) return;
          var adaDiSumber = agregat.some(function (a) { return a.j === kode && a.s === s.kode; });
          if (!adaDiSumber) return;
          var mentah = tahunList.map(function (th) { return nilai[kode][th] || 0; });
          if (mentah.reduce(function (x, y) { return x + y; }, 0) > 0) {
            semuaBaris.push({
              sumber: s.kode, jenis_dana_kode: kode,
              nama: '(jenis dana tidak dikenal: ' + kode + ')', mentah: mentah, yatim: true
            });
          }
        });
      });

      // Lintasan kedua: bulatkan tiap kolom tahun secara serentak.
      var terbulat = tahunList.map(function (_, i) {
        return Hitung.bulatkanKolom(semuaBaris.map(function (b) { return b.mentah[i]; }));
      });
      semuaBaris.forEach(function (b, n) {
        b.per_tahun = tahunList.map(function (_, i) { return terbulat[i][n]; });
        b.jumlah = b.per_tahun.reduce(function (x, y) { return x + y; }, 0);
        b.rata = b.jumlah / tahunList.length;
      });

      var kelompok = (master.sumber_dana || []).map(function (s) {
        var barisSumber = semuaBaris.filter(function (b) { return b.sumber === s.kode; });
        var sub = tahunList.map(function (_, i) {
          return barisSumber.reduce(function (x, b) { return x + b.per_tahun[i]; }, 0);
        });
        var jml = sub.reduce(function (x, y) { return x + y; }, 0);
        return {
          kode: s.kode, nama: s.nama, baris: barisSumber,
          sub_per_tahun: sub, sub_jumlah: jml, sub_rata: jml / tahunList.length
        };
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

      var daftar = master.jenis_penggunaan || [];
      // Dibulatkan per kolom tahun dengan metode sisa terbesar, sama seperti
      // Tabel 12, sehingga total kedua tabel dijamin identik.
      var terbulat = tahunList.map(function (_, i) {
        return Hitung.bulatkanKolom(daftar.map(function (p) {
          return (nilai[p.kode] || {})[tahunList[i]] || 0;
        }));
      });

      var baris = daftar.map(function (p, n) {
        var per = tahunList.map(function (_, i) { return terbulat[i][n]; });
        var jml = per.reduce(function (x, y) { return x + y; }, 0);
        return {
          kode: p.kode, no: p.no, nama: p.nama, kelompok: p.kelompok,
          per_tahun: per, jumlah: jml, rata: jml / tahunList.length
        };
      });

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
     * Skor butir 5.1 akreditasi, memakai rumus pada lembar penilaian:
     * PDMHS, DOM, porsi investasi, RPD, dan RPKM.
     */
    skor: function (master, t12, t13) {
      var p = master.parameter || {};
      var dosen = Number(p.jumlah_dosen) || 0;
      var mhs = Number(p.jumlah_mahasiswa) || 0;
      var thn = t12.tahun.length || 3;
      var batas = function (v) { return Math.max(0, Math.min(4, v)); };
      var jt = function (v) { return v / 1e6; };

      // 5.1.1 — porsi dana dari mahasiswa terhadap total penerimaan
      var totalTerima = t12.total.jumlah;
      var pdm = totalTerima ? t12.subtotal_mahasiswa.jumlah / totalTerima : 0;
      var s511 = pdm <= 0.33 ? 4 : batas(4.99 - 2.99 * pdm);

      // 5.1.2.1 — dana operasional per mahasiswa per tahun (juta rupiah)
      var dom = mhs ? jt(t13.subtotal_operasional.jumlah) / mhs / thn : 0;
      var s5121 = dom >= 18 ? 4 : batas((2 * dom) / 9);

      // 5.1.2.2 — porsi dana investasi terhadap total penggunaan
      var totalPakai = t13.total.jumlah;
      var pi = (totalPakai ? t13.subtotal_investasi.jumlah / totalPakai : 0) * 100;
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
        { kode: '5.1.1', bobot: 1.4, skor: s511,
          nama: 'Persentase perolehan dana dari mahasiswa terhadap total penerimaan (PDMHS)',
          dasar: 'PDMHS = ' + Fmt.persen(pdm * 100),
          rumus: p.jenis_pt === 'PTS'
            ? 'PTS: memakai rumus PTN — sesuaikan bila borang Anda berbeda'
            : 'PTN: PDM ≤ 33% → 4; selain itu 4,99 − (2,99 × PDM)' },
        { kode: '5.1.2.1', bobot: 0.7, skor: s5121,
          nama: 'Dana operasional pendidikan, penelitian & PkM per mahasiswa per tahun',
          dasar: 'DOM = ' + Fmt.angka(dom) + ' juta/mhs/tahun',
          rumus: 'DOM ≥ 18 juta → 4; selain itu (2 × DOM) ÷ 9' },
        { kode: '5.1.2.2', bobot: 0.35, skor: s5122,
          nama: 'Porsi dana investasi (prasarana, sarana, SDM) terhadap total penggunaan',
          dasar: 'Investasi = ' + Fmt.persen(pi) + ' dari total penggunaan',
          rumus: '5–10% → 4; 10–15% → 3; 15–20% → 2; di luar itu → 1' },
        { kode: '5.1.2.3', bobot: 0.7, skor: s5123,
          nama: 'Dana penelitian per dosen tetap per tahun',
          dasar: 'RPD = ' + Fmt.angka(rpd) + ' juta/dosen/tahun',
          rumus: 'RPD ≥ 10 → 4; 0 < RPD < 10 → 1 + (3 × RPD) ÷ 10' },
        { kode: '5.1.2.4', bobot: 0.7, skor: s5124,
          nama: 'Dana pengabdian kepada masyarakat per dosen tetap per tahun',
          dasar: 'RPKM = ' + Fmt.angka(rpkm) + ' juta/dosen/tahun',
          rumus: 'RPKM ≥ 5 → 4; 0 < RPKM < 5 → 0,8 × RPKM' }
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

  // ================================================================ ekspor

  var Ekspor = {
    tabelKeExcel: function (elemenTabel, namaBerkas, judul) {
      var gaya = 'table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}' +
                 'td,th{border:1px solid #999;padding:4px 6px}' +
                 'th{background:#dce6f1;font-weight:bold;text-align:center}' +
                 '.angka{text-align:right}';
      var html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head>' +
        '<meta charset="utf-8"><style>' + gaya + '</style></head><body>' +
        (judul ? '<h3>' + Fmt.aman(judul) + '</h3>' : '') +
        elemenTabel.outerHTML + '</body></html>';
      Ekspor.unduh(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }),
                   namaBerkas + '.xls');
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

  window.SIKEU = {
    API: API, Auth: Auth, Fmt: Fmt, UI: UI, Hitung: Hitung, Ekspor: Ekspor, CFG: CFG,
    STATUS: STATUS, LABEL_STATUS: LABEL_STATUS, LABEL_PERAN: LABEL_PERAN, TINGKAT: TINGKAT
  };
})();
