-- Seed akun super admin. Ganti dua penanda di blok DO di bawah, lalu jalankan.
-- SQL biasa tanpa meta-command, jadi bisa ditempel apa adanya ke SQL Editor Supabase.

-- Buat hash dulu di halaman Kit Identitas Peserta (langkah 3), atau dengan
-- perintah `node scripts/hash-password.mjs` di folder proyek. Keduanya sama
-- sah, karena bcrypt tidak tersedia di dalam PostgreSQL. Hasilnya 60 karakter
-- berawalan $2b$12$.

DO $$
DECLARE
    email_admin text := '<ISI_EMAIL_DI_SINI>';
    hash_admin  text := '<ISI_HASH_DI_SINI>';
BEGIN
    -- Diperiksa dari SISA PENANDA, bukan dengan membandingkan nilai terhadap
    -- penandanya sendiri: penggantian teks sederhana ikut mengubah string
    -- pembandingnya, sehingga perbandingan apa adanya menolak nilai yang benar.
    IF email_admin LIKE '%<ISI_EMAIL%' THEN
        RAISE EXCEPTION 'Email belum diisi. Ganti nilai <ISI_EMAIL_DI_SINI> pada berkas ini.';
    END IF;

    IF hash_admin LIKE '%<ISI_HASH%' THEN
        RAISE EXCEPTION
            'Hash belum diisi. Buat dulu di halaman Kit Identitas Peserta (langkah 3) atau dengan node scripts/hash-password.mjs, lalu tempel hasilnya di sini.';
    END IF;

    -- Menolak nilai yang bukan hash bcrypt. Tanpa ini, salah paste kata sandi
    -- asli membuat akun tidak bisa login sekaligus menyimpan kata sandi polos.
    IF hash_admin !~ '^\$2[aby]\$[0-9]{2}\$' THEN
        RAISE EXCEPTION
            'Nilai hash bukan hash bcrypt. Yang benar diawali $2a$, $2b$, atau $2y$. Diterima: %',
            left(hash_admin, 12);
    END IF;

    IF email_admin !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'Email tidak sah: %', email_admin;
    END IF;

    INSERT INTO users (user_id, name, email, password, role, is_active, created_at)
    VALUES (gen_random_uuid(), 'Super Admin', lower(btrim(email_admin)),
            hash_admin, 'super_admin', true, now())
    ON CONFLICT (email) DO UPDATE
    SET password  = EXCLUDED.password,
        role      = 'super_admin',
        is_active = true;

    RAISE NOTICE 'Akun super admin % siap dipakai.', lower(btrim(email_admin));
END $$;

-- Bila tabel users belum ada, jalankan sql/01-schema.sql lebih dahulu.

-- Verifikasi. Harapan: tepat satu baris, is_active true, dan awalan_hash berisi
-- hash bcrypt ($2a$ atau $2b$), bukan kata sandi asli.

SELECT 'Akun super admin' AS bagian;
SELECT user_id, name, email, role, is_active, left(password, 7) AS awalan_hash
FROM users
WHERE role = 'super_admin';
