/**
 * Konfigurasi SIKEU-UPPS.
 *
 * Kedua nilai di bawah memang tampil di repositori publik, dan itu tidak
 * masalah:
 *
 * - apiUrl bukan kredensial. Setiap operasi tetap menuntut ID token Google
 *   yang sah, dan peran diperiksa di sisi server.
 * - clientId memang dirancang untuk tampil di kode halaman. Yang mengunci
 *   adalah daftar "Authorized JavaScript origins" di Google Cloud Console:
 *   Google hanya menerbitkan token untuk halaman yang berasal dari domain
 *   terdaftar, sehingga Client ID yang disalin ke situs lain tidak berguna.
 */
window.SIKEU_CONFIG = {
  /** URL Web App Apps Script, berakhiran /exec. */
  apiUrl: 'GANTI_DENGAN_URL_WEB_APP_ANDA',

  /** OAuth Client ID dari Google Cloud Console. */
  clientId: '23882881057-72q15pps3vnja29bb8045kv2692ngiha.apps.googleusercontent.com',

  namaSistem: 'SIKEU-UPPS',
  subJudul: 'Sistem Informasi Keuangan untuk Tabel 12 & Tabel 13 Akreditasi'
};
