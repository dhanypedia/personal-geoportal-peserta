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
      ('users', 'name'), ('users', 'email'), ('users', 'password'),
      ('users', 'role'), ('users', 'is_active'), ('users', 'created_at'),
      ('katalog_data_2d', 'layer_name'), ('katalog_data_2d', 'akses'),
      ('katalog_data_2d', 'is_editable'),
      ('katalog_data_3d', 'model_name'), ('katalog_data_3d', 'akses'),
      ('katalog_data_3d', 'tipe_file')
  )
ORDER BY table_name, column_name;

-- 4. Constraint yang seharusnya ada tetapi belum terpasang, atau terpasang dengan
-- jenis yang salah. Daftar di bawah memuat SELURUH constraint yang dibuat
-- 01-schema.sql, yaitu tiga belas buah: users tiga, katalog_data_2d empat,
-- katalog_data_3d enam. Jenisnya ikut diperiksa, sehingga constraint yang namanya
-- benar tetapi jenisnya salah juga ikut ketahuan.
-- Harapan: hasilnya kosong.
SELECT '4. Constraint yang hilang atau salah jenis (harus kosong)' AS bagian;
WITH seharusnya(tabel, nama, kode) AS (
    VALUES
      ('users', 'users_pkey', 'p'),
      ('users', 'users_email_key', 'u'),
      ('users', 'users_role_valid', 'c'),
      ('katalog_data_2d', 'katalog_data_2d_pkey', 'p'),
      ('katalog_data_2d', 'katalog_data_2d_layer_name_key', 'u'),
      ('katalog_data_2d', 'katalog_data_2d_akses_valid', 'c'),
      ('katalog_data_2d', 'katalog_data_2d_author_fkey', 'f'),
      ('katalog_data_3d', 'katalog_data_3d_pkey', 'p'),
      ('katalog_data_3d', 'katalog_data_3d_akses_valid', 'c'),
      ('katalog_data_3d', 'katalog_data_3d_tipe_file_valid', 'c'),
      ('katalog_data_3d', 'katalog_data_3d_lat_range', 'c'),
      ('katalog_data_3d', 'katalog_data_3d_lon_range', 'c'),
      ('katalog_data_3d', 'katalog_data_3d_author_fkey', 'f')
),
ada AS (
    -- contype bertipe internal "char", bukan text, sehingga perlu dicor sebelum
    -- digabungkan dengan teks. Tanpa cor, PostgreSQL menolaknya dengan
    -- "operator is not unique: unknown || char".
    SELECT c.relname AS tabel, con.conname AS nama, con.contype::text AS kode
    FROM pg_constraint con
    JOIN pg_class c     ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('users', 'katalog_data_2d', 'katalog_data_3d')
)
SELECT s.tabel,
       s.nama AS nama_constraint,
       CASE WHEN a.nama IS NULL
            THEN 'BELUM TERPASANG'
            ELSE 'terpasang, tetapi jenisnya ' || a.kode || ' dan seharusnya ' || s.kode
       END AS keadaan
FROM seharusnya s
LEFT JOIN ada a ON a.tabel = s.tabel AND a.nama = s.nama
WHERE a.nama IS NULL OR a.kode <> s.kode
ORDER BY s.tabel, s.nama;

-- 5. Kesimpulan dalam satu baris, supaya tidak perlu menafsirkan hasil bagian 4
-- yang kosong. Harapan: terpasang 13, hilang 0, dan kesimpulannya LENGKAP.
-- Jenis yang dihitung hanya p, u, f, dan c, supaya batasan NOT NULL yang ikut
-- tercatat di PostgreSQL 18 ke atas tidak mengubah angkanya.
SELECT '5. Kesimpulan' AS bagian;
WITH jumlah AS (
    SELECT count(*) AS terpasang
    FROM pg_constraint con
    JOIN pg_class c     ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('users', 'katalog_data_2d', 'katalog_data_3d')
      AND con.contype IN ('p', 'u', 'f', 'c')
)
SELECT terpasang,
       13 - terpasang AS hilang,
       13 AS seharusnya,
       CASE WHEN terpasang = 13
            THEN 'LENGKAP, tidak ada constraint yang hilang'
            ELSE 'ADA YANG HILANG, jalankan sql/01-schema.sql lalu periksa bagian 4'
       END AS kesimpulan
FROM jumlah;

-- Ketiga belas constraint itu berasal dari 01-schema.sql. Bila bagian 4 berisi
-- baris, jalankan berkas itu: aman diulang dan hanya menambahkan yang belum ada.
