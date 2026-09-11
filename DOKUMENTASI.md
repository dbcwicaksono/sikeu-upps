# Dokumentasi SIKEU-UPPS

Dokumen ini menjelaskan **apa yang dibangun dan mengapa dibangun begitu**.

Tiga berkas melayani tiga pembaca berbeda:

| Berkas | Untuk siapa | Menjawab |
|---|---|---|
| [panduan.html](panduan.html) | pemakai sehari-hari | *bagaimana cara memakainya* |
| [README.md](README.md) | yang memasang | *bagaimana cara menjalankannya* |
| **DOKUMENTASI.md** (ini) | yang meneruskan | *mengapa bentuknya seperti ini* |

Yang ketiga paling mudah hilang. Cara memakai bisa ditebak dari layarnya, cara memasang
bisa dicoba-coba — tetapi **alasan** di balik sebuah keputusan hanya ada di kepala orang
yang mengambilnya. Ketika orang itu pergi, penerusnya akan membongkar hal-hal yang
sebenarnya sengaja dipasang begitu, lalu menabrak masalah yang sudah pernah dipecahkan.

---

## Bagian I — Semangat

Tujuh prinsip di bawah ini yang mengendalikan hampir setiap keputusan teknis dalam sistem
ini. Bila kelak Anda ragu mengubah sesuatu, ukur dengan ketujuh ini.

### 1. Angka borang harus bisa dipertanggungjawabkan

Ini alasan sistem ini ada. Bukan sekadar mengumpulkan data, tetapi menghasilkan angka yang
tahan ditanya asesor: *dari mana angka ini, siapa yang memasukkannya, siapa yang
menyetujuinya, kapan*.

Konsekuensinya di seluruh sistem:

- Angka borang **hanya** berasal dari baris berstatus `terverifikasi`
- Setiap baris menyimpan siapa membuat, siapa memverifikasi, dan kapan
- Menyunting data terverifikasi **menurunkan statusnya kembali**, jadi tidak ada angka yang
  berubah tanpa ditinjau ulang
- Sheet `Log` mencatat setiap tindakan beserta email pelakunya

### 2. Data tidak pernah hilang diam-diam

Bila sesuatu tidak bisa dipetakan, ia **ditandai**, bukan dibuang. Bila kategori tidak
dipakai lagi, ia **dinonaktifkan**, bukan dihapus. Bila dua kategori ternyata sama, ia
**digabungkan secara reversibel**, bukan ditimpa.

Contoh nyata dalam sistem ini:

- Dua puluh baris migrasi yang jenis penggunaannya ambigu diberi tanda `perlu_tinjau`,
  bukan ditebak diam-diam
- Sembilan belas baris bernominal nol disimpan sebagai `draft`, bukan dihapus — sebagian
  punya judul kegiatan, jadi mungkin kegiatan nyata yang nominalnya belum diisi
- Jenis dana yang sudah dipakai transaksi **ditolak** saat hendak dihapus
- Penggabungan kategori tidak menyentuh satu pun baris transaksi

Alasannya sederhana: data yang salah masih bisa diperbaiki, data yang hilang tidak.

### 3. Yang ditentukan borang dikunci, sisanya dibebaskan

Bentuk Tabel 12 dan Tabel 13 ditentukan format akreditasi, bukan oleh kita. Maka:

- **Empat sumber dana** dan **tujuh jenis penggunaan** dikunci — tidak bisa ditambah atau
  dikurangi dari aplikasi
- **Jenis dana** dibebaskan sepenuhnya, karena di situlah setiap UPPS berbeda
- **Rincian** ditambahkan sebagai lapis opsional yang tidak menyentuh borang sama sekali

Membedakan keduanya penting. Kalau semuanya dibebaskan, borang bisa rusak tanpa disadari.
Kalau semuanya dikunci, sistem tidak akan cocok dengan kenyataan fakultas mana pun.

### 4. Sistem menjelaskan dirinya sendiri

Sistem ini akan dipakai orang yang tidak membangunnya, dan kelak dikelola orang yang tidak
mengenal pembangunnya. Maka setiap penolakan harus menjelaskan **apa yang harus dilakukan**,
bukan sekadar menyatakan bahwa sesuatu gagal.

Bandingkan: *"Gagal menyimpan"* versus *"Jenis dana ini dipakai oleh 47 transaksi sehingga
tidak dapat dihapus. Nonaktifkan agar tidak muncul di form input, atau gabungkan ke kategori
lain — keduanya menjaga riwayat tetap utuh."*

Yang kedua memberi jalan keluar. Itulah nada yang dipakai di seluruh pesan galat.

Prinsip yang sama melahirkan layar **"Akun Anda belum terdaftar"** yang menampilkan alamat
email yang sedang dipakai — karena penyebab tersering adalah browser memakai akun pribadi,
padahal yang didaftarkan email kampus. Tanpa itu, orang hanya melihat halaman kosong dan
menyimpulkan sistemnya rusak.

### 5. Tidak mengarang data

Bila pengguna tidak menyatakan sesuatu, sistem tidak boleh mengisinya sendiri.

Ketika kolom `skema` dicabut dari formulir, entri baru dibiarkan **kosong** — bukan diisi
`Mandiri`. Mengisi otomatis akan menciptakan 617 pernyataan yang tidak pernah dibuat siapa
pun, dan tidak ada cara membedakannya dari pernyataan sungguhan di kemudian hari.

### 6. Menunggu bukan berarti aman

Pengguna menganggap data aman begitu ia menekan Simpan. Maka jarak antara "ditekan" dan
"tersimpan di server" harus sependek mungkin dan **selalu terlihat**.

Itu sebabnya antrean kirim mengirim sendiri di latar belakang alih-alih menunggu tombol
"Kirim semua", punya penanda yang selalu tampak, dan memperingatkan sebelum halaman
ditutup. Penyimpanan lokal di sini adalah jembatan beberapa detik, bukan tempat menyimpan
pekerjaan.

### 7. Yang tidak diuji dianggap rusak

Perhitungan borang diuji terhadap angka acuan pada setiap perubahan. Aturan wewenang diuji
dengan mencoba menembusnya. Sifat yang tidak boleh dilanggar — misalnya total Tabel 12 sama
dengan total Tabel 13 — diuji sebagai pernyataan tersendiri, bukan diandaikan benar.

Beberapa cacat paling halus dalam sistem ini ditemukan oleh uji, bukan oleh pembacaan kode.

---

## Bagian II — Masalah yang dipecahkan

Sistem ini menggantikan satu berkas Excel berisi 617 transaksi dengan tujuh pivot table.
Berkas itu bekerja, tetapi menyimpan empat cacat yang tidak terlihat dari permukaan.

### Cacat 1 — dua nominal tersimpan sebagai teks

Dua sel pada kolom jumlah tersimpan sebagai teks, bukan angka; salah satunya bahkan
mengandung spasi di tengah angka. `SUM` di Excel **mengabaikan sel teks tanpa
memberitahu**, sehingga kedua transaksi itu tidak pernah ikut terhitung. Keduanya berada di
tahun yang masuk jendela penilaian.

Ditemukan bukan dari membaca grid sel, melainkan dari `xl/pivotCache/pivotCacheDefinition1.xml`
di dalam berkas xlsx: pivot cache mendaftarkan nilai unik per kolom, dan kolom yang
seharusnya murni numerik ternyata punya dua nilai bertipe teks.

### Cacat 2 — rumus menunjuk baris yang salah

Sel salah satu jenis dana pada tahun terakhir memakai rumus yang menunjuk baris kategori
**lain**. Akibatnya satu kategori menampilkan angka milik kategori lain, sementara sel
kategori aslinya dibiarkan kosong. Totalnya kebetulan tetap benar karena angka yang sama
dihitung sekali — sehingga tidak pernah ketahuan.

### Cacat 3 — label kolom salah tiga kali

Judul kolom Tabel 12 dan 13 tertulis `TS-2` untuk ketiga tahun. Seharusnya TS-2, TS-1, TS.

### Cacat 4 — pembulatan tidak konsisten

Baris tidak selalu benar-benar menjumlah. Dibahas tuntas di Bagian VII.

**Pelajarannya:** spreadsheet tidak pernah memberitahu bahwa ada yang salah. Ia menghitung
apa yang bisa dihitung dan diam soal sisanya. Sistem ini dirancang untuk berisik: menolak
yang tidak valid, menandai yang meragukan, dan menguji sifat-sifat yang seharusnya selalu
benar.

---

## Bagian III — Bentuk data

### Satu transaksi, dua pandangan

Gagasan pusat seluruh sistem:

```
                    ┌─────────────────┐
                    │  satu transaksi │
                    └────────┬────────┘
              dari mana?     │     untuk apa?
            ┌────────────────┴───────────────┐
            ▼                                ▼
      Sumber Dana                     Jenis Penggunaan
      Jenis Dana                             │
            │                                │
            ▼                                ▼
       TABEL 12                          TABEL 13
```

Karena keduanya membaca catatan yang sama, **totalnya selalu identik**. Tidak ada
kemungkinan dua tabel berbeda karena salah ketik, dan tidak ada pekerjaan mengisi dua tabel
terpisah.

Ini juga menjelaskan mengapa Tabel 12 dan 13 tidak pernah diketik langsung: keduanya
dihitung ulang dari nol setiap kali dashboard dibuka.

### Menyimpan kode, bukan nama

Tabel `Transaksi` menyimpan `JD08`, bukan `"DIPA/DRPM"`. Nama tampilan hanya ada di master.

Akibatnya mengganti nama kategori cukup mengubah satu sel, dan seluruh riwayat ikut
menyesuaikan. Kalau nama disimpan langsung di tiap baris, mengganti nama berarti menyunting
ratusan baris — dan setiap baris yang terlewat menjadi kategori hantu yang memecah baris
borang.

### Empat lapis, dua sifat

| Lapis | Sheet | Sifat | Peran di borang |
|---|---|---|---|
| Sumber Dana | `M_Sumber` | **tetap**, 4 baris | baris Tabel 12 |
| Jenis Dana | `M_JenisDana` | **fleksibel** | kolom kedua Tabel 12 |
| Rincian | `M_Rincian` | fleksibel, opsional | **tidak muncul** |
| Jenis Penggunaan | `M_JenisPenggunaan` | **tetap**, 7 baris | baris Tabel 13 |

Rincian sengaja tidak menyentuh borang. Gunanya menjawab pertanyaan turunan — *"dana dari
mahasiswa itu dari SPP prodi mana saja?"* — tanpa mengubah bentuk tabel yang sudah
ditentukan format akreditasi.

### Penggabungan yang tidak merusak

Kolom `gabung_ke` pada `M_JenisDana` mengalihkan pelaporan satu kategori ke kategori lain.
Dua kategori yang ternyata bermakna sama menjadi satu baris borang.

Yang membuatnya aman: **tidak ada baris transaksi yang disentuh**. Setiap baris tetap
menyimpan kode aslinya; hanya saat menyusun laporan, kodenya ditelusuri sampai ujung rantai.
Melepas penggabungan cukup mengosongkan satu sel, dan semuanya kembali seperti semula.

Alternatif yang sengaja **tidak** dipilih: menimpa kode di semua baris transaksi. Itu lebih
sederhana untuk dibaca, tetapi menghapus informasi — dan begitu ketahuan salah gabung,
tidak ada jalan kembali.

Penelusuran rantai menangani `A → B → C` dan **menolak siklus**. Tanpa penolakan itu,
`A → B → A` akan membuat setiap penyusunan laporan berputar tanpa henti.

### Mengapa kolom `skema` dicabut dari formulir

Kolom `skema` (Mandiri/Kerjasama) diwarisi dari berkas Excel. Pemeriksaan menunjukkan:

- **Nol kemunculan** di `assets/app.js` — berkas yang memuat seluruh logika Tabel 12,
  Tabel 13, dan skor. Disimpan, divalidasi, dibawa dalam agregat, lalu tidak pernah dibaca
- Pada **10 dari 13** jenis dana, isinya seragam — sudah tertebak dari jenis dananya
- Dua di antaranya bahkan **bernama** "Kerjasama" dan seluruh barisnya berskema Kerjasama:
  menyatakan hal yang sama dua kali
- Hanya 14 baris pada tiga kategori campuran yang benar-benar membawa keterangan tambahan

Jadi: satu pilihan yang harus diambil pada **setiap** entri, hampir selalu tertebak, dan
hasilnya tidak muncul di mana pun. Untuk sistem yang akan dipakai orang awam, itu ongkos
tanpa imbalan.

Kolomnya dipertahankan agar data lama utuh, dan nilai yang sah tetap diterima bila dikirim —
sehingga keputusan ini dapat dibatalkan tanpa kehilangan apa pun.

### Mengapa kategori hibah dirampingkan

Tabel 12 semula memecah hibah menjadi beberapa baris: *DIPA/DRPM* dan *Hibah lainnya* pada
Pemerintah, serta *Hibah lainnya* pada Sumber Lain. Pengelola memutuskan hibah cukup menjadi
**satu kategori per sumber dana**, sedangkan **Kerjasama tetap berdiri sendiri**.

Pembedanya kini sumber dana. Hibah pada Pemerintah dan Hibah pada Sumber Lain tetap dua
baris terpisah — sumber dana memang menentukan baris borang, dan penggabungan lintas sumber
ditolak sistem.

| Kategori semula | Transaksi | Kini dilaporkan sebagai |
|---|---|---|
| Pemerintah › DIPA/DRPM (`JD08`) | 92 | Pemerintah › Hibah (`JD14`) |
| Pemerintah › Hibah lainnya (`JD09`) | 40 | Pemerintah › Hibah (`JD14`) |
| Sumber Lain › Hibah lainnya (`JD12`) | 7 | Sumber Lain › Hibah (`JD15`) |

Caranya penggabungan `gabung_ke` ke kategori **Hibah yang baru**, bukan mengganti nama
DIPA/DRPM menjadi Hibah. Mengganti nama lebih singkat, tetapi 92 transaksi akan kehilangan
satu-satunya keterangan bahwa dananya dari DIPA. Dengan penggabungan, setiap transaksi tetap
menyimpan kode aslinya dan setiap gabungan dapat dilepas satu per satu.

*Beasiswa Dosen* dan *Gaji Dosen dan Tendik* tidak ikut, karena bukan hibah menurut namanya.
Bila kelak dianggap hibah juga, gabungkan lewat Kelola Master.

Yang perlu diketahui penerus:

- **Spreadsheet lama** dirampingkan lewat menu `SIKEU → Rampingkan kategori hibah`
  (`rampingkanHibah()` di `Setup.gs`). Ia menampilkan rencananya lebih dulu, menunggu
  persetujuan, mencatat setiap langkah di `Log`, dan tidak berbuat apa-apa bila dijalankan
  ulang. **Pemasangan baru** langsung dalam bentuk ini: `SEED_JENIS_DANA` disusun persis sama
  dengan hasil menu itu, dan kesamaannya diuji.
- **Menyunting transaksi lama** berkategori DIPA/DRPM menyimpannya sebagai Hibah, karena
  server menolak kategori yang sudah digabungkan. Angka borang tidak bergeser, tetapi kode
  asal baris itu berganti. Formulir memberitahukan hal ini sebelum disimpan.
- **Cacat yang ditemukan sebelum perampingan diterapkan:** formulir ubah transaksi memilih
  jenis dana *pertama* pada sumber itu untuk transaksi berkategori gabungan, karena
  kategorinya tidak lagi ada di daftar pilihan. DIPA/DRPM akan diam-diam menjadi *Gaji Dosen
  dan Tendik* begitu disimpan — dan server menerimanya, karena itu kategori yang sah. Kini
  formulir memilihkan kategori tujuannya. Cacat yang sama pada formulir rincian di Kelola
  Master (rincian berpindah ke PNBP) ikut diperbaiki.
- **Angka borang:** total Tabel 12 per tahun dan seluruh Tabel 13 identik sebelum dan
  sesudah. Karena susunan baris berubah, pembulatan sisa terbesar *boleh* memindahkan 0,01
  juta antarsumber dana; pada data 617 transaksi tidak ada yang berpindah di jendela TS.
- Rincian `RC013`–`RC018` milik DIPA/DRPM — termasuk *Gaji Dosen ASN* dan *Gaji Tendik ASN* —
  ikut tampil di bawah Hibah. Belum ada transaksi yang memakainya; tinjau apakah memang
  tempatnya di sana.

---

## Bagian IV — Arsitektur

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

### Mengapa dibagi tiga

**Browser tidak pernah menyentuh Spreadsheet.** Ia hanya bicara ke Apps Script, yang berjalan
sebagai pemilik skrip. Karena itu Spreadsheet tetap privat dan pengguna **tidak perlu diberi
izin edit** — sehingga tidak ada yang bisa melewati validasi dengan menyunting sheet
langsung.

Ini bukan kenyamanan, melainkan syarat prinsip nomor 1. Kalau pengguna punya akses edit ke
sheet, seluruh aturan status dan wewenang menjadi hiasan belaka.

### Mengapa halaman tetap di GitHub Pages

Rancangan awal menempatkan halaman input di Apps Script HtmlService, dengan dua alasan:
`Session.getActiveUser()` butuh konteks Apps Script, dan `google.script.run` menghindari CORS.

Keduanya **hilang** begitu identitas berpindah ke Google Sign-In. ID token dapat diverifikasi
dari mana saja, dan CORS sudah tertangani (lihat di bawah). Yang tersisa hanyalah ongkosnya:
dua tempat deploy, dua salinan CSS, dan setiap perubahan tampilan harus disalin manual ke
editor Apps Script.

Maka semuanya tetap statis di Pages, dan Apps Script murni menjadi API.

### CORS: mengapa `text/plain`

Apps Script **tidak dapat menjawab preflight `OPTIONS`**. Permintaan lintas domain memicu
preflight bila memakai `Content-Type: application/json` atau header khusus.

Solusinya ada di [assets/app.js](assets/app.js):

```javascript
headers: { 'Content-Type': 'text/plain;charset=utf-8' },
body: JSON.stringify({ aksi, idToken, data })
```

`text/plain` menjadikannya *simple request* — dikirim langsung tanpa preflight. Isinya tetap
JSON, hanya labelnya berbeda, dan server tetap mem-parsingnya sebagai JSON.

**Jangan mengubah header ini.** Menggantinya menjadi `application/json` akan mematikan
seluruh operasi tulis dengan galat CORS yang membingungkan.

### Perhitungan di sisi mana

Server mengembalikan **master + agregat**, bukan tabel jadi. Tabel 12, Tabel 13, skor, dan
grafik disusun di browser dari agregat itu.

Alasannya: mengganti periode atau menyalakan mode pratinjau tidak perlu memanggil server
lagi. Dengan satu panggilan memakan sekitar tiga detik, itu perbedaan antara antarmuka yang
responsif dan yang terasa macet.

Agregat juga jauh lebih kecil daripada data mentah — ratusan baris, bukan ribuan.

---

## Bagian V — Identitas dan wewenang

### Mengapa tidak memakai kata sandi

Versi pertama sistem ini memakai username dan kata sandi ber-hash. Berfungsi, tetapi:

- Pengelola harus membuat, mengirim, dan mereset sandi
- Email pengguna **diketik manusia** dan tidak diverifikasi siapa pun
- Jejaknya sampai ke *akun*, bukan ke *orang*

Dengan Google Sign-In, email datang dari Google dan tidak dapat dipalsukan. Untuk sistem
yang harus menjawab *"siapa yang memasukkan angka ini"* saat asesmen, perbedaan itu
menentukan.

### Verifikasi token, dan mengapa `aud` penting

Server memverifikasi ID token ke endpoint `tokeninfo` milik Google, lalu memeriksa:

| Klaim | Diperiksa karena |
|---|---|
| `aud` | token harus diterbitkan **untuk aplikasi kita**. Tanpa ini, token milik aplikasi lain ikut diterima — siapa pun yang punya aplikasi Google bisa membuat token yang lolos |
| `iss` | penerbitnya memang Google |
| `exp` | belum kedaluwarsa |
| `email_verified` | Google sudah memastikan email itu benar milik pemiliknya |

Hasil verifikasi di-cache paling lama lima menit agar tidak memanggil Google pada setiap
permintaan.

### Scope: penyebab layar "unverified app"

Skrip lama meminta `https://www.googleapis.com/auth/drive` — akses ke **seluruh** Drive.
Itu *restricted scope* dalam kebijakan verifikasi Google, dan setiap aplikasi yang memintanya
dari akun non-Workspace akan memunculkan layar peringatan bagi semua penggunanya.

Sistem ini hanya meminta tiga scope, tidak ada yang restricted:

```
spreadsheets.currentonly     hanya spreadsheet yang memuat skrip ini
script.external_request      UrlFetchApp untuk verifikasi token
script.container.ui          menu SIKEU di spreadsheet
```

**Jangan menambahkan `/auth/drive`.** Itu satu baris yang akan menghidupkan kembali masalah
yang sudah selesai.

### Empat peran

| Peran | Wewenang |
|---|---|
| `admin` | segalanya, termasuk master dan pengguna |
| `verifikator` | memverifikasi, menolak, mengubah seluruh transaksi |
| `operator` | menambah, dan mengubah entrinya sendiri selama belum diverifikasi |
| `publik` | melihat dashboard saja |

Wewenang bertingkat: `TINGKAT = { publik: 0, operator: 1, verifikator: 2, admin: 3 }`.
Pemeriksaannya selalu `TINGKAT[peran] >= TINGKAT[minimal]`.

### Impersonasi yang hanya bisa menurun

Admin punya pengalih *"Lihat sebagai"* untuk menguji seluruh alur dari satu akun.
Penjagaannya ada di server, bukan di tampilan:

```javascript
if (lihatSebagai && peran === PERAN.ADMIN) {
  var minta = String(lihatSebagai).trim().toLowerCase();
  if (TINGKAT.hasOwnProperty(minta) && TINGKAT[minta] < TINGKAT[peran]) { ... }
}
```

Dua syarat: pemintanya memang admin, **dan** peran yang diminta lebih rendah. Operator yang
mengirim `lihatSebagai: 'admin'` tetap operator. Ini diuji secara khusus, karena celah
seperti ini justru muncul dari fitur yang niatnya membantu.

### Daftar tertutup

Hanya email yang tercantum di `M_Pengguna` yang dapat masuk. Parameter
`pendaftaran_otomatis` bawaannya `tidak`.

Pernah ada versi yang mendaftarkan pemilik email kampus secara otomatis. Itu ditinggalkan
karena satu domain kampus bisa mencakup ribuan orang, dan pengelola tidak punya cara
mengetahui siapa saja yang masuk.

**Lubang yang pernah terbuka dan sudah ditutup:** aksi `rekap` dan `master` berperan minimal
`publik`. Sebelum diperbaiki, siapa pun yang punya akun Google bisa membaca seluruh angka
keuangan hanya dengan menekan tombol masuk — karena begitu ia berhasil masuk, ia memenuhi
syarat "publik". Sekarang pengguna yang sudah masuk tetapi tidak ada di `M_Pengguna`
diperlakukan setara pengunjung yang belum masuk sama sekali.

Pelajarannya: **"sudah masuk" tidak sama dengan "berhak"**. Setiap kali menambahkan aksi
baru, tanyakan apakah tingkat `publik` benar-benar yang dimaksud.

---

## Bagian VI — Alur verifikasi

```
draft ──ajukan──► diajukan ──setujui──► terverifikasi
  ▲                   │                        │
  │                   └──tolak──► ditolak      │ bila disunting
  └──────── perbaiki ─────────────┘            ▼
                                           diajukan
```

Hanya `terverifikasi` yang masuk Tabel 12 dan 13. Tiga aturan yang mudah terlihat sepele
tetapi masing-masing memecahkan masalah nyata:

**Menyunting data terverifikasi menurunkan statusnya.** Tanpa ini, seseorang bisa mengubah
nominal yang sudah disetujui dan angka borang berubah tanpa ada yang meninjau. Dengan ini,
setiap perubahan harus melewati mata verifikator sekali lagi.

**Penolakan wajib disertai alasan.** Server menolak penolakan tanpa alasan. Operator perlu
tahu apa yang harus diperbaiki, bukan sekadar tahu bahwa ia salah — dan alasannya tampil
langsung di baris yang bersangkutan.

**Draft bebas dari kekhawatiran.** Karena draft tidak pernah menyentuh borang, tidak ada
risiko menyimpan sesuatu yang belum yakin. Ini yang membuat sistem nyaman dipakai: kesalahan
ketik pada draft tidak bisa merusak apa pun.

---

## Bagian VII — Ketepatan angka

Bagian paling halus dari sistem ini, dan yang paling mudah dirusak tanpa sadar.

### Masalahnya

Borang menyajikan rupiah dalam **juta, dua desimal**. Pembulatan menciptakan dua tuntutan
yang saling bertabrakan:

1. Setiap kolom harus benar-benar menjumlah bila asesor menghitungnya sendiri
2. Total Tabel 12 harus sama persis dengan total Tabel 13

Pendekatan naif gagal pada keduanya:

- **Jumlahkan rupiah mentah lalu bulatkan sekali** → baris tidak menjumlah. Pernah terjadi:
  satu baris menampilkan tiga angka yang bila dijumlah menghasilkan nilai berbeda dari kolom
  totalnya
- **Bulatkan tiap sel lalu jumlahkan** → baris menjumlah, tetapi Tabel 12 dan 13
  mengelompokkan uang yang sama dengan cara berbeda, sehingga sisa pembulatannya berbeda dan
  totalnya bisa meleset satu sen

### Penyelesaiannya: pembulatan sisa terbesar

`Hitung.bulatkanKolom()` di [assets/app.js](assets/app.js) membulatkan satu kolom sekaligus:
setiap nilai dibulatkan ke bawah, lalu sisa yang kurang dibagikan kepada nilai-nilai dengan
pecahan terbesar sampai jumlahnya persis sama dengan pembulatan jumlah aslinya.

Hasilnya kedua tuntutan terpenuhi. Ongkosnya: satu sel bisa meleset 0,01 dari pembulatan
naifnya sendiri. Itu harga yang jauh lebih murah dibanding dua tabel yang tidak bertotal
sama.

**Metode ini dipakai pada Tabel 12 dan Tabel 13 dengan cara yang sama.** Kalau Anda mengubah
salah satunya saja, jaminan total identik langsung hilang.

### Diuji sebagai sifat, bukan sebagai angka

Uji regresi tidak hanya mencocokkan angka dengan acuan. Ia juga memeriksa **sifat yang harus
selalu benar**:

- setiap baris menjumlah sama dengan kolom totalnya
- setiap sub-total sama dengan jumlah baris di atasnya
- total = sub-total operasional + sub-total investasi
- persentase total setiap tahun = 100
- **total Tabel 12 = total Tabel 13** pada setiap tahun

Sifat terakhir itu yang menangkap masalah satu sen tadi. Kalau hanya mencocokkan angka
dengan acuan, cacatnya akan lolos — karena acuannya sendiri ikut bergeser.

---

## Bagian VIII — Antrean kirim

### Mengapa perlu

Satu panggilan bolak-balik ke Apps Script terukur **sekitar tiga detik**, bahkan dalam
keadaan hangat. Penyebabnya melekat: setiap permintaan melewati satu lompatan redirect ke
`script.googleusercontent.com`. Tiga puluh entri berarti satu setengah menit murni menunggu.

### Mengapa bukan "simpan lokal sampai dikirim manual"

Usul awalnya: kumpulkan entri di browser, kirim serentak saat menekan tombol. Itu ditolak
karena menukar sifat keamanan yang sudah dimiliki.

Saat ini, tombol Simpan selesai berarti data **sudah aman di Google Sheets**. Dengan
penyimpanan lokal sampai dikirim manual, seorang dosen yang mengisi 40 hibah selama sejam
akan kehilangan semuanya bila browsernya membersihkan data situs, atau ia lanjut dari laptop
lain, atau ia memakai mode penyamaran.

Yang dipakai sebagai gantinya: **antrean yang mengirim sendiri**. Formulir tertutup seketika,
antrean terkirim otomatis beberapa detik kemudian sebagai satu panggilan gabungan. Rasanya
sama instan saat mengetik, tetapi data tetap sampai ke server dalam hitungan detik — bukan
menunggu seseorang ingat menekan tombol.

Perlu dicatat: kebutuhan "kumpulkan dulu, ajukan bareng-bareng" sebenarnya **sudah terpenuhi
oleh status draft**. Yang kurang hanyalah kecepatan menyimpan tiap draft.

### Idempotensi

Setiap entri membawa kunci yang dibuat di sisi klien. Server mencatat kunci yang sudah
diproses selama enam jam.

Ini memecahkan kasus yang mudah terlewat: jaringan terputus **setelah** server selesai
menulis tetapi sebelum jawabannya sampai. Klien menganggap gagal dan mencoba lagi. Tanpa
kunci idempotensi, seluruh entri masuk dua kali.

Kunci dicatat **setelah** penulisan berhasil, bukan sebelum — supaya tidak ada kunci yang
tertinggal menandai baris yang tidak pernah ada.

### Kegagalan sebagian

Entri yang gagal validasi tidak menggagalkan yang lain. Yang lolos tetap tersimpan, yang
gagal tinggal di antrean beserta alasannya.

Alternatifnya — batalkan semua bila ada satu yang gagal — lebih mudah dipahami, tetapi satu
salah ketik akan memblokir 49 entri yang sudah benar.

### Penulisan sekali jalan

`simpanTransaksiMassal` menulis seluruh baris dalam **satu** `setValues`, dengan nomor urut
dihitung sekali di awal. Menulis baris per baris dengan `appendRow` akan lambat dan berisiko
menabrak batas waktu eksekusi Apps Script.

---

## Bagian IX — Migrasi

617 transaksi dipindahkan dari berkas Excel. Pemetaannya diverifikasi lebih dulu terhadap
Tabel 12 dan 13 versi Excel — **sebelum** satu baris kode aplikasi ditulis — supaya sistem
tidak dibangun di atas asumsi yang salah.

Sumber kebenaran pemetaan bukan tebakan, melainkan `xl/pivotTables/pivotTable1..7.xml` di
dalam berkas xlsx, yang menyatakan secara eksplisit bahwa Tabel 12 = baris *Sumber Dana ›
Jenis Dana* × kolom tahun, dan Tabel 13 = baris *Jenis Penggunaan* × kolom tahun.

Pembakuan yang dilakukan, masing-masing dengan catatan pada barisnya:

| Di Excel | Menjadi |
|---|---|
| `Sumber lain` dan `Sumber Lain` | `Sumber Lain` |
| `Usaha Sendiri` | `Usaha sendiri` |
| `pengabdian` | `Pengabdian kepada masyarakat` |
| `DRPM` | digabung ke `DIPA/DRPM` |
| `Investasi Sarpras` | `Investasi sarana`, **ditandai perlu ditinjau** |
| nominal 0 tanpa keterangan | disimpan sebagai **draft**, tidak dihapus |

Perhatikan bahwa Excel sendiri sudah menyatukan beda kapitalisasi di pivot cache-nya —
jadi pembakuan ini sejalan dengan perilaku laporan aslinya, bukan penafsiran baru.

**Yang masih menunggu keputusan manusia:** Tabel 13 memisahkan *Investasi sarana* dan
*Investasi prasarana*, sedangkan data lama hanya mengenal "Investasi Sarpras". Dua puluh
baris itu sementara masuk ke sarana dan diberi tanda `perlu_tinjau`. Sistem tidak menebak,
dan menolak melupakannya.

---

## Bagian X — Pengujian

| Suite | Cakupan | Jumlah |
|---|---|---|
| `tools/uji-perhitungan.js` | Tabel 12, Tabel 13, persentase, sub-total, lima skor, konsistensi internal, kesamaan total kedua tabel, pemformat | **139** |
| Alur peran & status | penolakan wewenang, impersonasi, seluruh perpindahan status, penggabungan | 31 |
| Endpoint massal | idempotensi, kegagalan sebagian, batas 200, keunikan id | 10 |
| Daftar tertutup | penolakan tak terdaftar, tidak ada pendaftaran diam-diam | 10 |
| Rantai `gabung_ke` | rantai bertingkat, siklus, gelang sendiri, rantai 60 simpul | 11 |
| Pencabutan `skema` | tidak dikarang, data lama utuh, angka borang tidak bergeser | 6 |
| Perampingan hibah | pemetaan kategori, Kerjasama tak tersentuh, transaksi tak berubah satu sel pun, total T12/T13 dan skor tetap, jalan ulang, seed = hasil menu, formulir ubah, konfirmasi, keadaan tepi | 40 |

Suite pertama dijalankan dari repositori:

```bash
node tools/uji-perhitungan.js
```

Angka acuannya berada di `tools/acuan.json` yang **tidak diunggah** ke repositori publik
karena memuat data keuangan sesungguhnya. Tanpa berkas itu uji **dilewati, bukan
digagalkan** — supaya orang lain tetap dapat menjalankan sisanya.

### Cara acuan diperbarui

Berkas acuan adalah *golden file* yang asalnya dari Excel. Ketika koreksi data mengubah
angka yang benar, acuannya harus ikut berubah — tetapi hanya pada sel yang memang terdampak.

Skrip regenerasinya menghitung ulang, membandingkan dengan acuan lama, dan **menolak menulis**
bila ada sel lain yang ikut berubah di luar dugaan. Dengan begitu memperbarui acuan tidak
bisa dipakai untuk menutupi kerusakan yang tidak disengaja.

---

## Bagian XI — Keputusan yang sengaja tidak diambil

Bagian ini sama pentingnya dengan yang diambil, karena inilah yang paling sering dibongkar
oleh penerus yang tidak tahu alasannya.

| Tidak dilakukan | Alasan |
|---|---|
| Repositori privat | GitHub Pages di akun gratis mensyaratkan repositori publik. Konsekuensinya: data keuangan tidak boleh masuk repo |
| Halaman input di HtmlService | Alasannya hilang setelah identitas berpindah ke Google Sign-In. Menyisakan ongkos dua tempat deploy tanpa manfaat |
| Menyimpan `data/transaksi.csv` di repo | Berisi judul penelitian beserta nominalnya, gaji, dan dana kerjasama. Repositorinya publik |
| Menuliskan alamat email admin di kode | Repositorinya publik; email di sana akan dipanen pengumpul spam. Admin pertama diambil dari akun yang menjalankan setup |
| Menghapus kolom `skema` | Membuang keterangan 14 baris yang tidak ada di tempat lain, dan tidak dapat dibatalkan |
| Menimpa kode transaksi saat menggabungkan kategori | Menghapus informasi. Penggabungan dibuat reversibel |
| Mengganti nama "DIPA/DRPM" menjadi "Hibah" | Lebih singkat, tetapi 92 transaksi kehilangan satu-satunya keterangan bahwa dananya dari DIPA. Digabungkan ke "Hibah" baru sebagai gantinya |
| Menghapus kategori yang masih dipakai | Merusak riwayat. Ditolak sistem; tersedia nonaktifkan dan gabungkan |
| Kata sandi | Beban pengelolaan, dan jejaknya hanya sampai ke akun, bukan ke orang |
| Pivot table untuk agregasi | Tidak dapat menerapkan aturan status dan pembulatan sisa terbesar |

---

## Bagian XII — Jebakan yang sudah pernah ditabrak

Semuanya pernah benar-benar terjadi selama pembangunan. Masing-masing memakan waktu yang
tidak perlu Anda habiskan lagi.

### Deployment Apps Script adalah potret beku

Menekan **Save** di editor **tidak mengubah apa pun** yang dilayani `/exec`. Setelah
menyunting kode: **Deploy → Manage deployments → ikon pensil → Version: New version →
Deploy**. Alamatnya tetap sama.

Gejalanya membingungkan: kode di editor sudah benar, tetapi aplikasi berperilaku seperti
versi lama.

### Aset tercampur versi

GitHub Pages menyajikan aset dengan `Cache-Control: max-age=600`. Browser bisa memakai
`app.js` lama sampai sepuluh menit sementara HTML-nya sudah baru — dan **campuran itu lebih
berbahaya daripada keduanya sama-sama lama**. Pernah terjadi: `app.js` lama tidak mengenal
fungsi yang dipanggil HTML baru, sehingga halaman berputar tanpa henti padahal datanya sudah
sampai.

Karena itu setiap aset dirujuk dengan `?v=<versi>`. **Naikkan nomornya setiap kali isi
berkas di `assets/` berubah**, di keempat halaman HTML sekaligus.

### Impor CSV menimpa sheet yang sedang aktif

Pilihan *Ganti lembar saat ini* menimpa tab yang sedang terbuka, apa pun itu — bukan tab
yang Anda tuju. Pernah terjadi: 617 transaksi mendarat di tab `Log` dan menghapus isinya.

Klik tab tujuan **lebih dulu**, pastikan benar-benar aktif. `SIKEU → Periksa data` sekarang
memeriksa header setiap sheet dan menyebutkan secara langsung bila ada data yang salah tab.

### `requestAnimationFrame` berhenti saat tab tersembunyi

Dipakai untuk meredam peristiwa scroll. Ketika tab tidak terlihat, rAF berhenti total,
penanda peredamnya tersangkut menyala, dan pembaruan tidak pernah berjalan lagi bahkan
setelah tab dibuka kembali. Diganti `setTimeout`.

### Posisi gulir dipulihkan setelah skrip berjalan

Browser memulihkan posisi gulir **setelah** skrip halaman selesai, dan pemulihan itu tidak
menerbitkan peristiwa `scroll`. Perhitungan yang bergantung pada posisi gulir harus diulang
pada `load` dan beberapa saat sesudahnya.

### `setupSpreadsheet` melewati sheet yang sudah berisi

Itu disengaja agar aman dijalankan berulang. Tetapi berarti **parameter baru tidak pernah
sampai** ke spreadsheet yang sudah jalan. Karena itu ada `lengkapiParameter()` yang
menambahkan kunci yang belum ada tanpa menyentuh nilai yang sudah diisi.

Bila Anda menambahkan parameter baru, cukup tambahkan ke `SEED_PARAMETER` — sisanya
otomatis.

---

## Bagian XIII — Batas dan risiko yang diketahui

Disebutkan terus terang, bukan disembunyikan.

**Panggilan pertama lambat.** Apps Script perlu beberapa detik bangun dari mode tidur.
Ditangani dengan layar tunggu dan penjelasan, bukan dihilangkan — memang tidak bisa.

**Kuota Apps Script.** Alamat `/exec` bersifat publik, jadi orang iseng bisa memanggilnya
berulang kali sampai menghabiskan kuota harian. Bukan kebocoran data — setiap permintaan
tetap ditolak tanpa token yang sah — dan kuotanya pulih tiap hari.

**Jendela antrean.** Selama entri masih di antrean (beberapa detik, atau lebih lama bila
internet putus), ia hanya ada di browser itu. Ditandai jelas dan diperingatkan sebelum
halaman ditutup, tetapi tidak nol risiko.

**Rumus butir 5.1.1 versi PTN.** Diambil dari lembar penilaian yang ada. Bila UPPS berstatus
PTS, cocokkan dulu dengan matriks yang berlaku.

**Dua puluh baris `perlu_tinjau`** masih menunggu keputusan sarana atau prasarana.

**Dashboard di-cache dua menit.** Perubahan mungkin belum terlihat langsung; tombol *Muat
ulang data* memaksa penyegaran.

**Riwayat git memuat beberapa nominal.** Pesan commit awal sempat menyebut angka keuangan
sebelum kebijakan "data tidak masuk repo" ditegakkan. Berkasnya sendiri tidak pernah
ter-push. Bila ini mengganggu, repositorinya masih muda dan dapat dibuat ulang dengan satu
commit tanpa riwayat lama.

---

## Bagian XIV — Peta berkas

```
index.html            Dashboard: Tabel 12, Tabel 13, skor 5.1, grafik
input.html            CRUD transaksi, antrean kirim, antrean verifikasi
master.html           Jenis dana & penggabungan, rincian, tahun, parameter, pengguna, log
panduan.html          Panduan pemakaian di dalam aplikasi
config.js             apiUrl dan clientId — satu-satunya berkas yang perlu diubah saat memasang
assets/app.js         Identitas Google, klien API, format, MESIN PERHITUNGAN BORANG
assets/style.css      Gaya bersama, termasuk aturan cetak
apps-script/Kode.gs   API: verifikasi token, peran, CRUD, agregasi, penggabungan
apps-script/Setup.gs  setupSpreadsheet(), seed master, periksaData(), rampingkanHibah()
apps-script/appsscript.json   Scope dan setelan web app
README.md             Cara memasang
DOKUMENTASI.md        Dokumen ini

tidak di repositori, hanya di komputer pengelola:
data/transaksi.csv    617 transaksi hasil migrasi
tools/                Uji regresi perhitungan dan angka acuannya
```

### Di mana mengubah apa

| Ingin mengubah | Bukanya di |
|---|---|
| Tampilan dan perilaku halaman | `index.html`, `input.html`, `master.html`, `assets/` |
| Rumus Tabel 12/13 dan skor | `assets/app.js`, bagian `Hitung` |
| Aturan wewenang dan validasi | `apps-script/Kode.gs` |
| Struktur sheet dan isian awal | `apps-script/Setup.gs` |
| Alamat API dan Client ID | `config.js` |
| Panduan untuk pemakai | `panduan.html` |

**Sheet mana yang menyimpan apa** ada di `SKEMA` pada bagian atas `Kode.gs`. Itu satu-satunya
tempat struktur tabel dinyatakan; `Setup.gs` membacanya untuk membuat sheet, dan seluruh
fungsi baca-tulis memakainya sebagai acuan kolom.

---

## Bagian XV — Cara melanjutkan

### Menambahkan aksi API baru

1. Tambahkan entri di `IZIN` dengan peran minimalnya — **pikirkan baik-baik apakah `publik`
   benar-benar yang dimaksud**
2. Tambahkan `case` di `jalankan()`
3. Tulis fungsinya
4. Panggil dari halaman lewat `S.API.panggil('namaAksi', data)`

Konsistensi keduanya dapat diperiksa dengan membandingkan daftar `IZIN` dengan daftar
`case` — keduanya harus sama persis.

### Menambahkan kolom pada sebuah sheet

1. Tambahkan ke `SKEMA` di `Kode.gs`
2. Tambahkan kolomnya secara manual di spreadsheet yang sudah berjalan — `setupSpreadsheet`
   hanya menulis header pada sheet yang benar-benar kosong
3. Sesuaikan fungsi yang membaca dan menulis baris itu

### Mengubah rumus borang

Seluruhnya ada di `Hitung` pada `assets/app.js`. Setelah mengubah, **wajib** menjalankan
`node tools/uji-perhitungan.js`. Bila ada yang gagal, pahami dulu penyebabnya sebelum
memperbarui acuan — acuan yang diperbarui asal-asalan menghapus nilai seluruh suite.

### Setelah setiap perubahan

| Yang diubah | Yang harus dilakukan |
|---|---|
| Berkas di `assets/` | naikkan `?v=` di keempat halaman HTML |
| `apps-script/*.gs` | salin ke editor, lalu **Deploy → New version** |
| Rumus perhitungan | jalankan uji regresi |
| Perilaku yang dilihat pemakai | perbarui `panduan.html` |
| Struktur atau keputusan mendasar | perbarui dokumen ini |

Baris terakhir itu yang paling sering terlupakan, dan yang paling mahal akibatnya.
