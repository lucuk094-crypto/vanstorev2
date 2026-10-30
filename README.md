# VanStore — katalog website & transaksi via WhatsApp

VanStore adalah katalog produk digital. Pengunjung memilih produk dan menghubungi penjual lewat WhatsApp. Negosiasi, pembayaran, dan pengiriman file mentahan dilakukan **manual** di luar website. Website tidak memproses atau memverifikasi pembayaran, tidak menyimpan pesanan, dan tidak mengirim file otomatis.

## Menyiapkan Supabase

1. Buat proyek di https://supabase.com. Di SQL Editor, jalankan seluruh isi `supabase/schema.sql`. Ini membuat tabel dan kebijakan Row Level Security (RLS) agar publik hanya melihat produk terbit, sedangkan hanya admin yang terdaftar dapat menambah, mengedit dan menghapus.
2. Di Authentication > Users, buat akun dengan email dan password yang kuat. Nonaktifkan pendaftaran publik jika tidak diperlukan. Kemudian, di SQL Editor jalankan perintah ini dengan email yang sesuai:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'email-admin-anda@example.com'
   on conflict do nothing;
   ```

   Pastikan perintah menambahkan satu baris. Jangan letakkan password dalam kode atau GitHub. Akun Supabase biasa yang tidak tercantum di `admin_users` tidak memiliki akses admin.
3. Salin Project URL dan **anon/publishable key** dari Project Settings > API. Jangan pernah memasukkan service_role/secret key ke frontend atau variabel `VITE_`.
4. Buat `.env.local` berdasarkan `.env.example` dan isi nilai tersebut. Untuk produksi, tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di Vercel Project > Settings > Environment Variables, lalu redeploy.
5. Jalankan `npm install`, lalu `npm run dev`. Buka Admin, masuk dengan akun tadi, dan atur nomor WhatsApp, misalnya `6281234567890`. Tambahkan produk dan pilih apakah ingin dipublikasikan. Gambar dapat diunggah melalui dashboard (JPG, PNG, WebP maksimal 5 MB) atau memakai URL publik; URL demo juga publik. File mentahan **jangan** dimasukkan ke deskripsi atau URL produk.

## Penggunaan dan batasan

- Produk, pengaturan toko, dan status draft tersimpan di Supabase dan tersedia lintas perangkat. Hanya produk publik tampil untuk pengunjung.
- Harga adalah harga yang ditampilkan; kesepakatan akhir dibahas di WhatsApp. Penjual memverifikasi pembayaran sendiri dan mengirim file manual.
- Tidak ada dashboard riwayat pesanan karena WhatsApp menjadi saluran transaksi. Chat dan pelacakan pesanan dikelola melalui WhatsApp.
- Upload gambar memakai bucket publik `product-images`; hanya admin yang dapat mengunggah. Gambar yang diunggah (termasuk gambar untuk draft) bisa diakses publik jika URL-nya diketahui. Jangan unggah source code atau informasi rahasia ke bucket ini. Gambar yang tidak lagi digunakan tidak otomatis dihapus, kelola lewat Supabase Storage. URL gambar alternatif harus publik. Produk publik tidak boleh memuat tautan file privat atau rahasia.
- Jika sebelumnya sudah menjalankan versi lama skema, jalankan kembali bagian Storage di akhir `supabase/schema.sql` melalui SQL Editor sebelum mencoba upload gambar.
- Data lama aplikasi disimpan di localStorage browser, bukan di repository/database. Data itu tidak dimigrasikan otomatis ke Supabase. Masukkan ulang atau migrasikan secara terpisah sebelum mengganti produksi.
- `supabase/schema.sql` adalah skema untuk proyek baru; jika tabel bernama sama sudah ada, tinjau dan sesuaikan migrasi sebelum menjalankannya.
- Uji kebijakan RLS dengan akun anonim dan akun non-admin, serta tes alur WhatsApp dan data produk sebelum situs diumumkan. Amankan akun Supabase dan aktifkan MFA pada akun pengelola proyek bila tersedia.

## Perintah

```
npm install
npm run dev
npm run lint
npm run build
npx tsx --test src/utils/store.test.ts
```
