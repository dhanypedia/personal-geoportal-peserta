-- Migrasi: hapus peran 'editor', ubah nilai bawaan role menjadi 'viewer'.
--
-- Diperlukan HANYA bila database Anda sudah terlanjur dibuat memakai versi lama
-- sql/01-schema.sql. Berkas itu memakai CREATE TABLE IF NOT EXISTS, sehingga
-- menjalankannya kembali TIDAK mengubah tabel yang sudah ada: nilai bawaan dan
-- batasan peran yang lama akan tetap terpasang.
--
-- Urutan tidak boleh ditukar: batasan baru akan GAGAL dipasang bila perintah UPDATE
-- di bawah dilewati, karena masih ada baris berperan 'editor' yang melanggarnya.

BEGIN;

-- Lihat dulu apakah migrasi memang diperlukan: jumlah baris per peran, dan nilai
-- bawaan kolom role sebelum diubah.
SELECT
    'peran yang terpasang' AS keterangan,
    role,
    count(*) AS jumlah
FROM users
GROUP BY role
ORDER BY role;

SELECT
    'nilai bawaan kolom role' AS keterangan,
    column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- Pindahkan pengguna berperan 'editor' menjadi 'viewer'. Dijalankan SEBELUM batasan
-- diubah: peran 'editor' tidak lagi dikenal lib/auth/roles.js, sehingga pengguna yang
-- masih memakainya dapat login tetapi ditolak di seluruh endpoint katalog dengan 403.
UPDATE users
SET role = 'viewer'
WHERE role = 'editor';

-- Ubah nilai bawaan kolom role.
ALTER TABLE users
    ALTER COLUMN role SET DEFAULT 'viewer';

-- Ganti batasan peran menjadi tiga peran. DROP lebih dahulu supaya berkas ini aman
-- dijalankan lebih dari sekali.
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_valid;

ALTER TABLE users
    ADD CONSTRAINT users_role_valid
    CHECK (role IN ('viewer', 'admin', 'super_admin'));

COMMIT;

-- Periksa hasilnya. Harapan: perannya hanya viewer, admin, dan super_admin; nilai
-- bawaan 'viewer'; batasan CHECK (role = ANY (ARRAY['viewer','admin','super_admin'])).
SELECT
    'peran setelah migrasi' AS keterangan,
    role,
    count(*) AS jumlah
FROM users
GROUP BY role
ORDER BY role;

SELECT
    'nilai bawaan setelah migrasi' AS keterangan,
    column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

SELECT
    'batasan setelah migrasi' AS keterangan,
    pg_get_constraintdef(oid) AS definisi
FROM pg_constraint
WHERE conname = 'users_role_valid';
