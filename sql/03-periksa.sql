-- Tempel seluruh berkas ke SQL Editor Supabase lalu Run. Semua di sini hanya SELECT.
-- Jangan mengandalkan tab tabel di dashboard, karena tidak semua jenis constraint
-- ditampilkan dengan cara yang sama.

-- 1. Semua constraint di tiga tabel, apa adanya.
-- Harapan setelah 01-schema.sql pada PostgreSQL 17 ke bawah (termasuk Supabase):
--   users 3 baris, katalog_data_2d 4 baris, katalog_data_3d 6 baris.
-- PostgreSQL 18 ke atas menambah baris, karena sejak versi 18 batasan NOT NULL ikut
-- tercatat di pg_constraint dengan kode 'n'; di versi lama NOT NULL disimpan di
-- pg_attribute dan tidak muncul di query ini. Jadi angka yang lebih kecil di Supabase
-- BUKAN tanda ada yang salah, asal ketiga tabel muncul dan kolom check_ tidak nol.
-- Kode jenis: p primary key, u unique, f foreign key, c check, n not null
SELECT '1. Constraint yang terpasang' AS bagian;
SELECT c.relname AS tabel,
       con.conname AS nama_constraint,
       con.contype AS kode,
       CASE con.contype
         WHEN 'p' THEN 'PRIMARY KEY'
         WHEN 'u' THEN 'UNIQUE'
         WHEN 'f' THEN 'FOREIGN KEY'
         WHEN 'c' THEN 'CHECK'
         WHEN 'n' THEN 'NOT NULL'
         ELSE con.contype::text
       END AS arti
FROM pg_constraint con
JOIN pg_class c     ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users', 'katalog_data_2d', 'katalog_data_3d')
ORDER BY c.relname, con.contype, con.conname;

-- 2. Ringkasan: berapa constraint per tabel.
SELECT '2. Jumlah constraint per tabel' AS bagian;
SELECT c.relname AS tabel, count(*) AS jumlah,
       count(*) FILTER (WHERE con.contype = 'u') AS unique_,
       count(*) FILTER (WHERE con.contype = 'f') AS foreign_key,
       count(*) FILTER (WHERE con.contype = 'c') AS check_
FROM pg_constraint con
JOIN pg_class c     ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users', 'katalog_data_2d', 'katalog_data_3d')
GROUP BY c.relname ORDER BY c.relname;

-- 3. Kolom wajib yang belum NOT NULL. Harapan: hasilnya kosong.
-- Sebagian kolom sengaja boleh kosong karena nilainya baru terisi setelah proses
-- berjalan: wms_url/wfs_url (setelah layer terbit ke GeoServer), author di 2D dan 3D
-- (data hasil impor), url 3D (setelah berkas model tersimpan), serta latitude, longitude,
-- heading, pitch, roll, scale (saat model ditempatkan di peta). Karena itu query ini
-- hanya menyebut kolom yang MEMANG wajib: identitas, nama, dan status.
SELECT '3. Kolom wajib yang belum NOT NULL (harus kosong)' AS bagian;
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND is_nullable = 'YES'
  AND (table_name, column_name) IN (
      ('users', 'nama'), ('users', 'email'), ('users', 'password'),
      ('users', 'role'), ('users', 'is_active'), ('users', 'created_at'),
      ('katalog_data_2d', 'layer_name'), ('katalog_data_2d', 'akses'),
      ('katalog_data_2d', 'is_editable'),
      ('katalog_data_3d', 'nama'), ('katalog_data_3d', 'akses'),
      ('katalog_data_3d', 'tipe_file')
  )
ORDER BY table_name, column_name;

-- 4. Constraint yang seharusnya ada tetapi belum terpasang. Bagian ini yang paling
-- berguna: langsung menyebut nama constraint yang hilang.
SELECT '4. Constraint yang hilang' AS bagian;
WITH seharusnya(tabel, nama) AS (
    VALUES
      ('users', 'users_pkey'),
      ('users', 'users_email_key'),
      ('users', 'users_role_valid'),
      ('katalog_data_2d', 'katalog_data_2d_pkey'),
      ('katalog_data_2d', 'katalog_data_2d_author_fkey'),
      ('katalog_data_2d', 'katalog_data_2d_akses_valid'),
      ('katalog_data_3d', 'katalog_data_3d_pkey'),
      ('katalog_data_3d', 'katalog_data_3d_author_fkey'),
      ('katalog_data_3d', 'katalog_data_3d_akses_valid')
)
SELECT s.tabel, s.nama AS nama_constraint_hilang
FROM seharusnya s
WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c     ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = s.tabel AND con.conname = s.nama
)
ORDER BY s.tabel, s.nama;

-- Bila bagian 4 berisi baris, jalankan sql/01-schema.sql: berkas itu aman
-- dijalankan berulang dan hanya menambahkan yang belum ada.
