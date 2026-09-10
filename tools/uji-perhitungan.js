/**
 * Uji regresi mesin perhitungan borang, tanpa browser.
 *
 * Mencocokkan hasil Hitung.tabel12 / tabel13 / skor terhadap angka acuan,
 * sekaligus memeriksa konsistensi internal tabel: setiap baris harus benar-benar
 * menjumlah pada dua desimal juta, dan total Tabel 12 harus sama dengan total
 * Tabel 13 karena keduanya memandang data yang sama.
 *
 * Jalankan:  node tools/uji-perhitungan.js
 *
 * Angka acuan berada di tools/acuan.json yang sengaja TIDAK diunggah ke
 * repositori publik karena memuat data keuangan sesungguhnya. Tanpa berkas itu
 * uji ini dilewati, bukan digagalkan.
 */
const fs = require('fs');
const path = require('path');

const AKAR = path.join(__dirname, '..');
const BERKAS_ACUAN = process.argv[2] || path.join(__dirname, 'acuan.json');

if (!fs.existsSync(BERKAS_ACUAN)) {
  console.log('Dilewati: berkas acuan tidak ditemukan di ' + BERKAS_ACUAN + '.');
  console.log('Uji ini memerlukan angka acuan dari data sesungguhnya, yang tidak disertakan');
  console.log('di repositori publik. Lihat README bagian "Menjaga ketepatan angka".');
  process.exit(0);
}

global.window = { SIKEU_CONFIG: { apiUrl: 'x' } };
eval(fs.readFileSync(path.join(AKAR, 'assets/app.js'), 'utf8'));
const S = global.window.SIKEU, H = S.Hitung, F = S.Fmt;

const A = JSON.parse(fs.readFileSync(BERKAS_ACUAN, 'utf8'));

// Master di bawah ini sengaja ditulis ulang di sini, bukan diambil dari server,
// supaya uji tetap berjalan tanpa koneksi dan tidak ikut berubah bila master
// di produksi diubah.
const master = {
  sumber_dana: [
    { kode: 'MHS', nama: 'Mahasiswa', urutan: 1 },
    { kode: 'USAHA', nama: 'Usaha sendiri', urutan: 2 },
    { kode: 'PEM', nama: 'Pemerintah (Pusat & Daerah)', urutan: 3 },
    { kode: 'LAIN', nama: 'Sumber Lain', urutan: 4 }
  ],
  jenis_dana: [
    ['JD01', 'MHS', 'PNBP'], ['JD02', 'MHS', 'Ormawa'], ['JD03', 'USAHA', 'Kantin'],
    ['JD04', 'USAHA', 'KEPK'], ['JD05', 'USAHA', 'Pengelolaan Jurnal'], ['JD06', 'USAHA', 'Renbis'],
    ['JD07', 'PEM', 'Gaji Dosen dan Tendik'], ['JD08', 'PEM', 'DIPA/DRPM'], ['JD09', 'PEM', 'Hibah lainnya'],
    ['JD10', 'PEM', 'Kerjasama'], ['JD11', 'LAIN', 'Beasiswa Dosen'], ['JD12', 'LAIN', 'Hibah lainnya'],
    ['JD13', 'LAIN', 'Kerjasama']
  ].map((r, i) => ({ id: r[0], sumber_kode: r[1], nama: r[2], urutan: (i + 1) * 10 })),
  rincian: [],
  jenis_penggunaan: [
    ['P1', 1, 'Pendidikan', 'operasional'], ['P2', 2, 'Penelitian', 'operasional'],
    ['P3', 3, 'Pengabdian kepada masyarakat', 'operasional'], ['P4', 4, 'Investasi SDM', 'investasi'],
    ['P5', 5, 'Investasi sarana', 'investasi'], ['P6', 6, 'Investasi prasarana', 'investasi'],
    ['P7', 7, 'Lain-lain', 'investasi']
  ].map((r, i) => ({ kode: r[0], no: r[1], nama: r[2], kelompok: r[3], urutan: i + 1 })),
  tahun: [
    { tahun: 2021, label_ts: '' }, { tahun: 2022, label_ts: '' }, { tahun: 2023, label_ts: 'TS-2' },
    { tahun: 2024, label_ts: 'TS-1' }, { tahun: 2025, label_ts: 'TS' }
  ],
  parameter: Object.assign({ nama_upps: 'UPPS' }, A.parameter)
};

const thn = H.jendelaTS(master);
const data = H.saring(A.agregat, thn, false);
const t12 = H.tabel12(master, data, thn);
const t13 = H.tabel13(master, data, thn);
const skor = H.skor(master, t12, t13);

let lolos = 0;
const gagal = [];
const jt = v => v / 1e6;
const b2 = v => Math.round(v / 1e4) / 100;   // rupiah -> juta, 2 desimal

function cek(nama, dapat, harap, tol = 0.02) {
  if (Math.abs(dapat - harap) <= tol) lolos++;
  else gagal.push(`${nama}: sistem=${dapat.toFixed(4)} acuan=${harap} selisih=${(dapat - harap).toFixed(4)}`);
}

console.log('Jendela TS terdeteksi: ' + thn.join(', '));

// --- Tabel 12 -------------------------------------------------------------
console.log('\n--- TABEL 12 ---');
t12.kelompok.forEach(k => k.baris.forEach(b => {
  const kunci = k.kode + '|' + b.nama;
  console.log(`  ${kunci.padEnd(34)}${b.per_tahun.map(v => jt(v).toFixed(2).padStart(11)).join('')}`);
  if (!A.t12[kunci]) { gagal.push(`${kunci}: baris tak terduga muncul di Tabel 12`); return; }
  b.per_tahun.forEach((v, i) => cek(`T12 ${kunci} ${thn[i]}`, jt(v), A.t12[kunci][i]));
}));
thn.forEach((y, i) => {
  cek(`T12 sub-total mahasiswa ${y}`, jt(t12.subtotal_mahasiswa.per_tahun[i]), A.t12_subtotal_mahasiswa[i]);
  cek(`T12 sub-total lainnya ${y}`, jt(t12.subtotal_lainnya.per_tahun[i]), A.t12_subtotal_lainnya[i]);
  cek(`T12 total ${y}`, jt(t12.total.per_tahun[i]), A.t12_total[i]);
});

// --- Tabel 13 -------------------------------------------------------------
console.log('\n--- TABEL 13 ---');
t13.baris.forEach(b => {
  console.log(`  ${b.nama.padEnd(32)}${b.per_tahun.map(v => jt(v).toFixed(2).padStart(11)).join('')}`);
  b.per_tahun.forEach((v, i) => cek(`T13 ${b.kode} ${thn[i]}`, jt(v), A.t13[b.kode][i]));
  if (A.t13_persen[b.kode]) {
    b.persen.forEach((p, i) => cek(`T13 % ${b.kode} ${thn[i]}`, p, A.t13_persen[b.kode][i]));
  }
  if (A.t13_jumlah_3thn[b.kode] !== undefined) {
    cek(`T13 ${b.kode} jumlah 3 tahun`, b2(b.jumlah), A.t13_jumlah_3thn[b.kode], 0.0001);
  }
});
thn.forEach((y, i) => {
  cek(`T13 sub-total operasional ${y}`, jt(t13.subtotal_operasional.per_tahun[i]), A.t13_subtotal_operasional[i]);
  cek(`T13 sub-total investasi ${y}`, jt(t13.subtotal_investasi.per_tahun[i]), A.t13_subtotal_investasi[i]);
});
cek('T13 total 3 tahun', b2(t13.total.jumlah), A.t13_total_3thn, 0.0001);
cek('T13 rata-rata', jt(t13.total.rata), A.t13_rata, 0.05);

// --- Skor butir 5.1 -------------------------------------------------------
console.log('\n--- SKOR 5.1 ---');
skor.butir.forEach(b => {
  console.log(`  ${b.kode.padEnd(9)} skor ${b.skor.toFixed(4).padStart(8)}  bobot ${b.bobot}` +
              `  terbobot ${b.terbobot.toFixed(4)}   ${b.dasar}`);
  cek(`skor ${b.kode}`, b.skor, A.skor[b.kode]);
});
cek('PDMHS %', skor.nilai.pdm * 100, A.nilai.pdm, 0.01);
cek('DOM juta', skor.nilai.dom, A.nilai.dom, 0.01);
cek('RPD juta', skor.nilai.rpd, A.nilai.rpd, 0.01);
cek('RPKM juta', skor.nilai.rpkm, A.nilai.rpkm, 0.01);
cek('total terbobot', skor.total_terbobot, A.nilai.terbobot, 0.05);
console.log(`  TOTAL terbobot ${skor.total_terbobot.toFixed(4)} dari ${(skor.total_bobot * 4).toFixed(2)}`);

// --- Konsistensi internal tabel tercetak ----------------------------------
// Asesor bisa saja menjumlahkan sendiri kolom di borang, jadi angka yang
// tampil harus benar-benar menjumlah pada dua desimal juta.
console.log('\n--- KONSISTENSI INTERNAL ---');
t12.kelompok.forEach(k => k.baris.forEach(b => {
  cek(`T12 ${b.nama}: total baris = jumlah kolom`,
    b2(b.jumlah), b.per_tahun.reduce((s, v) => s + b2(v), 0), 0.0001);
}));
t13.baris.forEach(b => {
  cek(`T13 ${b.nama}: total baris = jumlah kolom`,
    b2(b.jumlah), b.per_tahun.reduce((s, v) => s + b2(v), 0), 0.0001);
});
thn.forEach((y, i) => {
  const semuaBaris = t12.kelompok.reduce((s, k) => s + k.baris.reduce((x, b) => x + b2(b.per_tahun[i]), 0), 0);
  cek(`T12 total ${y} = jumlah semua baris`, b2(t12.total.per_tahun[i]), semuaBaris, 0.0001);
  cek(`T12 total ${y} = subMhs + subLain`, b2(t12.total.per_tahun[i]),
    b2(t12.subtotal_mahasiswa.per_tahun[i]) + b2(t12.subtotal_lainnya.per_tahun[i]), 0.0001);

  const op = t13.baris.filter(b => b.kelompok === 'operasional').reduce((s, b) => s + b2(b.per_tahun[i]), 0);
  const iv = t13.baris.filter(b => b.kelompok === 'investasi').reduce((s, b) => s + b2(b.per_tahun[i]), 0);
  cek(`T13 sub-total operasional ${y} konsisten`, b2(t13.subtotal_operasional.per_tahun[i]), op, 0.0001);
  cek(`T13 sub-total investasi ${y} konsisten`, b2(t13.subtotal_investasi.per_tahun[i]), iv, 0.0001);
  cek(`T13 total ${y} = operasional + investasi`, b2(t13.total.per_tahun[i]), op + iv, 0.0001);
  cek(`T13 persen total ${y} = 100`, t13.total.persen[i], 100, 0.0001);
  cek(`T12 total ${y} = T13 total ${y}`, b2(t12.total.per_tahun[i]), b2(t13.total.per_tahun[i]), 0.0001);
});

// --- Pemformat ------------------------------------------------------------
console.log('\n--- FORMAT ---');
[['juta(1234560000)', F.juta(1234560000), '1.234,56'],
 ['rupiah(24750000)', F.rupiah(24750000), 'Rp 24.750.000'],
 ['tanggal(2025-03-07)', F.tanggal('2025-03-07'), '7 Mar 2025'],
 ['aman(<b>)', F.aman('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;']
].forEach(([nama, dapat, harap]) => {
  console.log(`  ${nama.padEnd(22)} = ${dapat}`);
  if (dapat === harap) lolos++; else gagal.push(`${nama}: sistem="${dapat}" acuan="${harap}"`);
});

// --- Hasil ----------------------------------------------------------------
console.log('\n==========================================');
console.log(`LOLOS: ${lolos}   GAGAL: ${gagal.length}`);
if (gagal.length) {
  console.log('\nRINCIAN GAGAL:');
  gagal.forEach(g => console.log('  x ' + g));
}
process.exit(gagal.length ? 1 : 0);
