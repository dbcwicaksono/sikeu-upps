# SIKEU-UPPS

Sistem informasi keuangan UPPS yang menghasilkan **Tabel 12** dan **Tabel 13** borang
akreditasi langsung dari data transaksi, lengkap dengan **skor butir 5.1** yang dihitung
otomatis.

Gratis sepenuhnya: halaman statis di **GitHub Pages**, data di **Google Sheets**, jembatan
API berupa **Google Apps Script**. Tidak ada server yang perlu dibayar, dan tidak ada kata
sandi yang perlu dikelola.

```
Browser (github.io)                Apps Script /exec           Google Sheets
        │                                  │                         │
        │ 1. tombol Google Sign-In         │                         │
        │───────────► Google ──────────────│                         │
        │    ◄── ID token (JWT)            │                         │
        │ 2. POST {aksi, idToken, data}    │                         │
        │─────────────────────────────────►│ 3. verifikasi token     │
        │                                  │    aud / iss / exp      │
        │ ◄──────── JSON hasil ────────────│ 4. cek peran, tulis ───►│
```

Browser tidak pernah menyentuh Spreadsheet. Apps Script yang membacanya, berjalan sebagai
pemilik skrip — karena itu Spreadsheet tetap privat dan dosen tidak perlu diberi izin edit.

---

## Bentuk data

Satu transaksi mencatat **dari mana** dana datang dan **untuk apa** dipakai. Karena itu
Tabel 12 dan Tabel 13 adalah dua cara memandang data yang sama, dan totalnya selalu identik.

| Lapisan | Sifat | Keterangan |
|---|---|---|
| **Sumber Dana** (`M_Sumber`) | **tetap** | Mahasiswa · Usaha sendiri · Pemerintah (Pusat & Daerah) · Sumber Lain |
| **Jenis Dana** (`M_JenisDana`) | **fleksibel** | Kolom kedua Tabel 12. Bebas ditambah, dinonaktifkan, atau **digabungkan** |
| **Rincian** (`M_Rincian`) | fleksibel, opsional | Lapis ketiga untuk memecah angka gelondongan. Tidak mengubah borang |
| **Jenis Penggunaan** (`M_JenisPenggunaan`) | **tetap** | Tujuh baris Tabel 13, terbagi kelompok operasional dan investasi |

Tabel `Transaksi` menyimpan **kode**, bukan nama. Mengganti nama kategori cukup satu sel di
master, dan seluruh riwayat ikut menyesuaikan.

### Menggabungkan kategori yang bermakna sama

Kolom `gabung_ke` pada `M_JenisDana` membuat satu kategori dilaporkan pada baris kategori
lain. Sifatnya **non-destruktif dan reversibel**: baris transaksi tetap menyimpan kode
aslinya, hanya pelaporannya yang dialihkan, dan penggabungan dapat dilepas kapan saja.
Rantai bertingkat (A→B→C) ditelusuri sampai ujung, dan siklus ditolak.

---

## Pemasangan

### 1. Buat OAuth Client ID

1. Buka **console.cloud.google.com**, buat project baru.
2. **APIs & Services → OAuth consent screen** → *External* → isi nama aplikasi dan email.
   **Jangan menambahkan scope apa pun** — cukup yang bawaan.
3. Klik **PUBLISH APP** agar tidak terbatas pada daftar penguji.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   Pada *Authorized JavaScript origins* isi `https://<username>.github.io`
   (tanpa garis miring dan tanpa nama repo). *Authorized redirect URIs* dikosongkan.
5. Salin **Client ID**. Abaikan Client secret — alur ini tidak memakainya.

> Scope dasar (nama, email) tidak memicu peninjauan Google, sehingga layar
> "unverified app" tidak muncul. Yang dulu memunculkannya adalah scope
> `/auth/drive` pada skrip lama, bukan setelan `executeAs`.

### 2. Siapkan Google Sheet dan Apps Script

1. Buat Google Spreadsheet kosong, misalnya `Basis Data Keuangan UPPS`.
2. **Ekstensi → Apps Script**. Hapus isi `Code.gs`, lalu buat dua berkas:
   - `Kode.gs` ← isi [apps-script/Kode.gs](apps-script/Kode.gs)
   - `Setup.gs` ← isi [apps-script/Setup.gs](apps-script/Setup.gs)
3. Di `Kode.gs`, sesuaikan tiga konstanta di bagian atas: `CLIENT_ID`, `DOMAIN_KAMPUS`,
   dan `ADMIN_AWAL`.
4. Jalankan fungsi **`setupSpreadsheet`** satu kali. Seluruh tab, header, master data,
   dropdown validasi, dan format rupiah dibuat otomatis.

### 3. Terbitkan sebagai Web App

**Deploy → New deployment → Web app**, dengan *Execute as* **Me** dan *Who has access*
**Anyone**. Salin URL yang berakhiran **`/exec`** (bukan `/dev`).

> *Anyone* hanya berarti alamat itu boleh dihubungi tanpa akun Google. Setiap aksi tetap
> menuntut ID token yang sah, dan perannya diperiksa di server.

### 4. Terbitkan halaman di GitHub Pages

1. Isi `apiUrl` dan `clientId` di [config.js](config.js).
2. **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
3. Buka `https://<username>.github.io/<nama-repo>/`.

### 5. Migrasikan data lama

Berkas `data/transaksi.csv` ada di komputer Anda dan **sengaja tidak diunggah** ke
repositori publik karena memuat catatan keuangan sesungguhnya. Isinya 617 transaksi hasil
migrasi dari `Data Keuangan.xlsx`.

Di Google Sheet: buka tab **`Transaksi`** → **File → Impor → Unggah** → pilih berkas itu →
**Ganti lembar saat ini**, pemisah **koma**. Lalu jalankan menu **SIKEU → Periksa data**.

---

## Peran dan alur verifikasi

| | Admin | Verifikator | Operator | Publik |
|---|:--:|:--:|:--:|:--:|
| Lihat dashboard | ✓ | ✓ | ✓ | ✓ |
| Tambah transaksi | ✓ | ✓ | ✓ | — |
| Ubah / hapus milik sendiri | ✓ | ✓ | selama belum diverifikasi | — |
| Ubah / hapus milik orang lain | ✓ | ✓ | — | — |
| Verifikasi & tolak | ✓ | ✓ | — | — |
| Kelola master | ✓ | — | — | — |
| Kelola pengguna | ✓ | — | — | — |

Pemilik email berdomain kampus yang belum terdaftar **otomatis menjadi operator** saat
pertama kali masuk, sehingga dosen tidak perlu didaftarkan satu per satu — tetapi setiap
entri tetap terkunci ke email yang benar-benar ia miliki.

Admin punya pengalih **"Lihat sebagai"** untuk menguji seluruh alur dari satu akun.
Impersonasi hanya dapat **menurunkan** wewenang, tidak pernah menaikkannya.

### Alur status

```
draft ──ajukan──► diajukan ──verifikasi──► terverifikasi
  ▲                  │                          │
  │                  └──tolak──► ditolak         │ disunting
  └────────── revisi ───────────────┘            ▼
                                             diajukan
```

- **Tabel 12 dan Tabel 13 hanya menghitung baris berstatus `terverifikasi`.**
- Menyunting data yang sudah terverifikasi **menurunkan statusnya kembali**, supaya angka
  borang tidak pernah berubah tanpa ditinjau ulang.
- Penolakan **wajib disertai alasan**, yang ditampilkan kepada operator.
- Dashboard menyediakan mode pratinjau untuk melihat dampak antrean sebelum diverifikasi.

---

## Keamanan

- **Tidak ada kata sandi di mana pun.** `M_Pengguna` hanya memetakan email ke peran.
- ID token diverifikasi ke Google dan diperiksa klaim `aud`, `iss`, `exp`, serta
  `email_verified`. Pemeriksaan `aud` penting: tanpa itu, token milik aplikasi lain ikut
  diterima. Hasil verifikasi di-cache paling lama 5 menit.
- Skrip hanya meminta scope `spreadsheets.currentonly`, `script.external_request`, dan
  `script.container.ui`. Tidak ada restricted scope.
- `apiUrl` dan `clientId` memang tampil di repositori publik dan itu tidak masalah — yang
  mengunci adalah daftar *Authorized JavaScript origins*.
- **Dashboard tertutup secara bawaan.** Ubah parameter `dashboard_publik` menjadi `ya`
  hanya bila Anda memang ingin membukanya untuk umum.
- Sheet `Log` mencatat email pelaku, peran, aksi, dan waktunya sebagai jejak audit.

---

## Skor akreditasi butir 5.1

| Butir | Rumus | Bobot |
|---|---|---|
| 5.1.1 PDMHS | PTN: PDM ≤ 33% → 4; selain itu 4,99 − (2,99 × PDM) | 1,40 |
| 5.1.2.1 DOM | operasional ÷ mahasiswa ÷ tahun; ≥ 18 juta → 4; selain itu (2 × DOM) ÷ 9 | 0,70 |
| 5.1.2.2 Investasi | 5–10% → 4; 10–15% → 3; 15–20% → 2; di luar itu → 1 | 0,35 |
| 5.1.2.3 RPD | penelitian ÷ dosen ÷ tahun; ≥ 10 juta → 4; selain itu 1 + (3 × RPD) ÷ 10 | 0,70 |
| 5.1.2.4 RPKM | PkM ÷ dosen ÷ tahun; ≥ 5 juta → 4; selain itu 0,8 × RPKM | 0,70 |

Penyebutnya — jumlah dosen dan mahasiswa — diambil dari **Kelola Master → Parameter**.

Rumus 5.1.1 yang tertanam adalah versi **PTN**. Bila UPPS Anda PTS, cocokkan dulu dengan
matriks penilaian yang berlaku.

---

## Catatan tentang data hasil migrasi

| Di Excel | Menjadi | Baris |
|---|---|---|
| `Sumber lain` dan `Sumber Lain` | `Sumber Lain` | 198 + 15 |
| `Usaha Sendiri` | `Usaha sendiri` | 72 |
| `pengabdian` | `Pengabdian kepada masyarakat` | 9 |
| `DRPM` | digabung ke `DIPA/DRPM` | 2 |
| `Investasi Sarpras` | `Investasi sarana`, **ditandai perlu ditinjau** | 20 |
| nominal 0 tanpa keterangan | disimpan sebagai **draft**, tidak dihapus | 19 |

Setiap baris yang disentuh diberi catatan sehingga jejaknya tetap terlihat.

**Yang masih perlu keputusan:** Tabel 13 memisahkan *Investasi sarana* dan *Investasi
prasarana*, sedangkan data lama hanya mengenal "Investasi Sarpras". Kedua puluh baris itu
sementara masuk ke sarana dan diberi tanda **perlu ditinjau** — buka dashboard → *Lihat
daftarnya*, lalu pindahkan yang memang prasarana.

### Empat kekeliruan pada berkas Excel yang diperbaiki

1. **Dua nominal tersimpan sebagai teks** — `39.146.550` dan `106. 757.000` (perhatikan
   spasi nyasar), keduanya tahun 2024. `SUM` di Excel mengabaikan sel teks, jadi kedua
   transaksi ini **tidak pernah masuk hitungan**. Setelah dipulihkan, total 2024 naik dari
   24.906,46 menjadi **25.052,37 juta**.
2. **Sel Kantin 2025 pada Tabel 12** memakai rumus `ROUND(E68/1000000,2)` yang menunjuk
   baris **Renbis**. Akibatnya Kantin 2025 tertulis 186,25 (semestinya 0) dan sel Renbis
   2025 dibiarkan kosong (semestinya 186,25).
3. **Judul kolom** tertulis `TS-2` tiga kali. Label kini diambil dari `M_Tahun`.
4. **Pembulatan tidak konsisten** sehingga baris tidak selalu menjumlah — lihat bagian
   berikut.

---

## Menjaga ketepatan angka

Borang menyajikan rupiah dalam juta dua desimal. Agar tabel yang dicetak benar-benar
konsisten, pembulatan memakai **metode sisa terbesar** per kolom tahun: jumlah nilai yang
dibulatkan dijamin persis sama dengan pembulatan jumlah aslinya.

Ini yang membuat dua hal sekaligus benar:

- setiap kolom benar-benar menjumlah bila asesor menghitungnya sendiri, dan
- **total Tabel 12 selalu sama dengan total Tabel 13**, padahal keduanya mengelompokkan
  uang yang sama dengan cara berbeda.

Tanpa metode ini, sisa pembulatan kedua tabel berbeda dan totalnya bisa meleset satu sen.

### Uji regresi

```bash
node tools/uji-perhitungan.js
```

Mencocokkan setiap baris Tabel 12, Tabel 13, persentase, sub-total, dan kelima skor
terhadap angka acuan, sekaligus memeriksa konsistensi internal dan kesamaan total kedua
tabel. **139 pemeriksaan.**

Angka acuan berada di `tools/acuan.json` yang juga tidak diunggah ke repositori publik.
Tanpa berkas itu uji dilewati, bukan digagalkan.

Alur peran, status, dan penggabungan diuji terpisah terhadap server tiruan
(**31 pemeriksaan**), mencakup penolakan siklus penggabungan dan pembuktian bahwa
impersonasi tidak dapat menaikkan wewenang.

---

## Pemeliharaan

| Kebutuhan | Caranya |
|---|---|
| Tambah jenis dana | Kelola Master → Jenis Dana |
| Dua kategori ternyata sama | **Gabungkan**, jangan dihapus — reversibel |
| Jenis dana tidak dipakai lagi | **Nonaktifkan**, riwayat tetap utuh |
| Ganti tahun akreditasi | Kelola Master → Tahun, pindahkan label TS / TS-1 / TS-2 |
| Jumlah dosen atau mahasiswa berubah | Kelola Master → Parameter |
| Beri akses verifikator | Kelola Master → Pengguna, ubah perannya |
| Periksa integritas data | Menu **SIKEU → Periksa data** di Google Sheet |
| Angka dashboard terasa basi | Tombol **Muat ulang data** (cache 2 menit) |

Tombol **Unduh Excel** pada tiap tabel menghasilkan berkas siap tempel ke naskah borang.
**Cetak / simpan PDF** menyusun ulang halaman tanpa navigasi dan tombol.

---

## Struktur berkas

```
index.html            Dashboard: Tabel 12, Tabel 13, skor 5.1, grafik
input.html            CRUD transaksi + antrean verifikasi
master.html           Jenis dana & penggabungan, rincian, tahun, parameter, pengguna, log
config.js             apiUrl dan clientId — satu-satunya berkas yang perlu diubah
assets/app.js         Identitas Google, klien API, format, mesin penghitung borang
assets/style.css      Gaya bersama, termasuk aturan cetak
apps-script/Kode.gs   API: verifikasi token, peran, CRUD, agregasi, penggabungan
apps-script/Setup.gs  setupSpreadsheet(), seed master, periksaData()
data/transaksi.csv    617 transaksi hasil migrasi (lokal, tidak di repo)
tools/                Uji regresi perhitungan (acuan.json lokal, tidak di repo)
```
