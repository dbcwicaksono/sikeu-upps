# SIKEU-UPPS

Sistem informasi keuangan UPPS yang menghasilkan **Tabel 12** dan **Tabel 13** borang
akreditasi langsung dari data transaksi, lengkap dengan **skor butir 5.1** yang dihitung
otomatis.

Gratis sepenuhnya: halaman statis di **GitHub Pages**, data di **Google Sheets**, jembatan
API berupa **Google Apps Script**. Tidak ada server yang perlu dibayar.

```
Browser  ──POST──►  Apps Script Web App  ──►  Google Sheets
(GitHub Pages)          (API + izin)            (basis data)
```

---

## Bentuk data

Satu transaksi mencatat **dari mana** dana datang dan **untuk apa** dipakai. Karena itu
Tabel 12 dan Tabel 13 adalah dua cara memandang data yang sama — totalnya selalu identik.

| Lapisan | Sifat | Keterangan |
|---|---|---|
| **Sumber Dana** | **tetap** | Mahasiswa · Usaha sendiri · Pemerintah (Pusat & Daerah) · Sumber Lain |
| **Jenis Dana** | **fleksibel** | Bebas Anda tambah pada tiap sumber. Inilah kolom kedua Tabel 12. |
| **Rincian** | fleksibel, opsional | Lapis ketiga untuk memecah angka gelondongan. Tidak mengubah borang. |
| **Jenis Penggunaan** | **tetap** | Tujuh baris Tabel 13, terbagi kelompok operasional dan investasi |

---

## Pemasangan

### 1. Siapkan Google Sheet dan Apps Script

1. Buat Google Spreadsheet baru, beri nama misalnya `Basis Data Keuangan UPPS`.
2. Menu **Ekstensi → Apps Script**.
3. Hapus isi `Code.gs` bawaan. Buat dua berkas dan tempel isinya:
   - `Kode.gs` ← isi [apps-script/Kode.gs](apps-script/Kode.gs)
   - `Setup.gs` ← isi [apps-script/Setup.gs](apps-script/Setup.gs)
4. Simpan, lalu pada daftar fungsi pilih **`siapkanSistem`** dan klik **Run**.
   Beri izin saat diminta.
5. Skrip akan membuat seluruh sheet, mengisi master data, dan mencetak
   **username `wadek` beserta kata sandi acak**. **Catat sandi itu sekarang** — tidak
   ditampilkan lagi.

### 2. Terbitkan sebagai Web App

1. Di editor Apps Script: **Deploy → New deployment → Web app**.
2. Isi:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
3. **Deploy**, lalu salin **Web app URL** (berakhiran `/exec`).

> *Who has access: Anyone* hanya berarti alamat itu dapat dihubungi tanpa akun Google.
> Setiap operasi tetap diperiksa oleh kode: tanpa token login yang sah, permintaan ditolak.

### 3. Terbitkan halaman di GitHub Pages

1. Buat repositori GitHub baru (boleh publik — akun gratis memang hanya bisa Pages di repo publik).
2. Unggah seluruh isi folder ini.
3. Buka **config.js**, ganti `GANTI_DENGAN_URL_WEB_APP_ANDA` dengan URL dari langkah 2.
4. **Settings → Pages → Source: Deploy from a branch → Branch: `main`, folder `/ (root)`**.
5. Tunggu satu-dua menit, lalu buka `https://<username>.github.io/<nama-repo>/`.

### 4. Migrasikan data lama

Berkas `data/transaksi.csv` (ada di komputer Anda, sengaja tidak diunggah ke repositori publik karena memuat data keuangan sesungguhnya) berisi **617 transaksi** hasil migrasi dari
`Data Keuangan.xlsx`, sudah dibakukan ejaannya dan dipetakan ke master baru.

1. Di Google Sheet, buka tab **`transaksi`**.
2. **File → Impor → Unggah** → pilih `data/transaksi.csv`.
3. Pilih **Ganti lembar saat ini** (*Replace current sheet*), pemisah **koma**.
4. Kembali ke aplikasi, jalankan menu **SIKEU → Periksa data** untuk memastikan tidak ada
   acuan yang rusak.

Setelah impor, Tabel 12 dan Tabel 13 di dashboard akan sama persis dengan versi Excel.

### 5. Buat akun dosen

Masuk sebagai `wadek` → **Kelola Master → Pengguna → + Tambah pengguna**. Tersedia tombol
pembuat sandi acak. Sampaikan sandi itu kepada yang bersangkutan dan minta segera diganti
lewat tombol **Ganti kata sandi** di halaman Input.

---

## Peran dan hak akses

| | Wakil Dekan (`admin`) | Dosen (`dosen`) |
|---|---|---|
| Lihat dashboard | ya | ya |
| Input transaksi | semua sumber dana | hanya Pemerintah & Sumber Lain |
| Ubah / hapus | semua data | hanya miliknya sendiri, selama belum diverifikasi |
| Status entri baru | langsung **Terverifikasi** | **Menunggu Verifikasi** |
| Verifikasi | ya | tidak |
| Kelola master & pengguna | ya | tidak |

**Tabel 12 dan Tabel 13 hanya menghitung data berstatus Terverifikasi.** Data yang masih
menunggu ditampilkan sebagai peringatan di dashboard, dan bisa diikutsertakan sementara
lewat saringan *Data yang dihitung* untuk melihat dampaknya sebelum diverifikasi.

Sumber dana yang boleh diinput dosen diatur di **Kelola Master → Parameter → `sumber_dosen`**.

---

## Keamanan

- Kata sandi disimpan sebagai **SHA-256 dengan garam per pengguna dan lada rahasia**
  di Script Properties. Tidak ada sandi dalam bentuk terbaca, baik di sheet maupun di repo.
- Token sesi ditandatangani **HMAC-SHA256**, berlaku 12 jam, dan diperiksa ulang terhadap
  status aktif pengguna pada setiap permintaan.
- URL API memang terlihat di repo publik. Itu tidak menjadi masalah: URL bukan kredensial,
  dan seluruh aksi tulis menuntut token yang sah.
- **Dashboard tertutup secara bawaan.** Untuk membukanya bagi umum, ubah parameter
  `dashboard_publik` menjadi `ya`. Pertimbangkan baik-baik — alamat aplikasi ada di repo publik.
- Semua perubahan tercatat di sheet **`log`** (siapa, kapan, apa) sebagai jejak audit saat
  asesmen lapangan.

---

## Skor akreditasi butir 5.1

Dashboard menghitung kelima butir langsung dari data, memakai rumus pada lembar penilaian:

| Butir | Rumus |
|---|---|
| 5.1.1 PDMHS | PTN: PDM ≤ 33% → 4; selain itu 4,99 − (2,99 × PDM) · bobot 1,40 |
| 5.1.2.1 DOM | operasional ÷ mahasiswa ÷ tahun; ≥ 18 juta → 4; selain itu (2 × DOM) ÷ 9 · bobot 0,70 |
| 5.1.2.2 Investasi | 5–10% → 4; 10–15% → 3; 15–20% → 2; di luar itu → 1 · bobot 0,35 |
| 5.1.2.3 RPD | penelitian ÷ dosen ÷ tahun; ≥ 10 juta → 4; selain itu 1 + (3 × RPD) ÷ 10 · bobot 0,70 |
| 5.1.2.4 RPKM | PkM ÷ dosen ÷ tahun; ≥ 5 juta → 4; selain itu 0,8 × RPKM · bobot 0,70 |

Penyebutnya — **jumlah dosen** dan **jumlah mahasiswa** — diambil dari Kelola Master →
Parameter. Perbarui setiap kali angkanya berubah, karena skor ikut berubah.

Rumus 5.1.1 yang tertanam adalah versi **PTN**. Bila UPPS Anda PTS, cocokkan dulu dengan
matriks penilaian yang berlaku.

---

## Catatan tentang data hasil migrasi

Migrasi membakukan beberapa hal yang di Excel tercatat tidak konsisten. Setiap baris yang
disentuh diberi catatan sehingga jejaknya tetap terlihat.

| Di Excel | Menjadi | Jumlah baris |
|---|---|---|
| `Sumber lain` dan `Sumber Lain` | `Sumber Lain` | 198 + 15 |
| `Usaha Sendiri` | `Usaha sendiri` | 72 |
| `pengabdian` | `Pengabdian kepada masyarakat` | 9 |
| `DRPM` | digabung ke `DIPA/DRPM` | 2 |
| `Investasi Sarpras` | `Investasi sarana`, **ditandai perlu ditinjau** | 20 |

**Yang masih perlu keputusan Anda:** Tabel 13 memisahkan *Investasi sarana* dan
*Investasi prasarana*, sedangkan data lama hanya mengenal satu kategori gabungan
"Investasi Sarpras". Kedua puluh baris itu sementara masuk ke **sarana** (sesuai angka
Tabel 13 versi Excel, yang mencatat prasarana = 0) dan diberi tanda **perlu ditinjau**.
Buka dashboard → tautan *Lihat daftarnya*, lalu pindahkan yang memang prasarana. Setidaknya
satu baris tampak jelas prasarana: *"Pemeliharaan Prasarana Perkantoran"* (2024).

### Dua kekeliruan di Excel yang diperbaiki

1. **Sel Kantin 2025 pada Tabel 12** memakai rumus `ROUND(E68/1000000,2)` yang menunjuk baris
   **Renbis**, bukan Kantin. Akibatnya Kantin 2025 tertulis 186,25 (semestinya 0) dan sel
   Renbis 2025 dibiarkan kosong (semestinya 186,25). Totalnya kebetulan tetap benar sehingga
   tidak terlihat. Sistem ini menampilkan keduanya dengan benar.
2. **Judul kolom** Tabel 12 dan 13 tertulis `TS-2 (2023)`, `TS-2 (2024)`, `TS-2 (2025)` —
   ketiganya TS-2. Label yang benar kini diambil dari master Tahun: TS-2, TS-1, TS.

---

## Menjaga ketepatan angka

Borang menyajikan rupiah dalam satuan juta dua desimal. Agar tabel yang dicetak benar-benar
konsisten — sub-total sama dengan hasil penjumlahan baris di atasnya — **pembulatan dilakukan
pada sel dasar**, lalu seluruh sub-total dan total diturunkan dari nilai yang sudah dibulatkan.
Tanpa ini, penjumlahan rupiah mentah akan menghasilkan selisih Rp 10.000 yang membuat kolom
tampak tidak menjumlah.

Berkas uji regresi ikut disertakan. Jalankan setiap kali Anda mengubah rumus:

```bash
node tools/uji-perhitungan.js
```

Uji ini mencocokkan setiap baris Tabel 12, Tabel 13, persentase, sub-total, dan kelima skor
terhadap angka Excel, sekaligus memastikan tabel konsisten secara internal dan total Tabel 12
selalu sama dengan total Tabel 13. Saat ini **139 pemeriksaan, semuanya cocok**.

---

## Pemeliharaan

| Kebutuhan | Caranya |
|---|---|
| Tambah jenis dana baru | Kelola Master → Jenis Dana |
| Jenis dana tidak dipakai lagi | **Nonaktifkan**, jangan dihapus — riwayat tetap utuh |
| Ganti tahun akreditasi | Kelola Master → Tahun, pindahkan label TS / TS-1 / TS-2 |
| Jumlah dosen atau mahasiswa berubah | Kelola Master → Parameter |
| Lupa sandi admin | Editor Apps Script → fungsi `setelUlangSandi` |
| Periksa integritas data | Menu **SIKEU → Periksa data** di Google Sheet |
| Angka dashboard terasa basi | Tombol **Muat ulang data** (hasil di-cache 2 menit) |

### Mengeluarkan borang

Tombol **Unduh Excel** pada tiap tabel menghasilkan berkas yang bisa langsung dibuka Excel
atau ditempel ke naskah borang. Tombol **Cetak / simpan PDF** menyusun ulang halaman tanpa
navigasi dan tombol — hanya tabel dan kartu skor.

---

## Struktur berkas

```
index.html            Dashboard: Tabel 12, Tabel 13, skor 5.1, grafik
input.html            Login + CRUD transaksi + antrean verifikasi
master.html           Kelola jenis dana, rincian, tahun, parameter, pengguna, log
config.js             URL API — satu-satunya berkas yang perlu Anda ubah
assets/app.js         Klien API, sesi, format, mesin penghitung borang
assets/style.css      Gaya bersama, termasuk aturan cetak
apps-script/Kode.gs   API: perutean, izin, CRUD, agregasi
apps-script/Setup.gs  Penyiapan sekali jalan, seed master, pemeriksa data
data/transaksi.csv    617 transaksi hasil migrasi (lokal, tidak di repo)
tools/                Uji regresi perhitungan (acuan.json lokal, tidak di repo)
```
