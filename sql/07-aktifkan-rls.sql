-- Perlu HANYA bila tabel Anda dibuat sebelum 01-schema.sql memuat perintah RLS.
-- Supabase menyediakan REST API otomatis untuk setiap tabel di schema public, dan kunci anon
-- yang dipakai API itu memang dirancang untuk sisi peramban, jadi nilainya tidak dianggap
-- rahasia. Yang mencegah penyalahgunaan adalah RLS. Diuji: tanpa RLS, peran anon bisa membaca
-- kolom password dan punya izin SELECT, INSERT, UPDATE, DELETE, serta TRUNCATE pada tabel users.
-- Sesudah RLS, anon dan authenticated tidak melihat satu baris pun, sedangkan aplikasi tetap
-- jalan karena Prisma memakai peran postgres, pemilik tabel, dan pemilik tabel melewati RLS.
-- RLS tanpa policy memang itu yang diinginkan: semua akses lewat API aplikasi sendiri.

BEGIN;

ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE katalog_data_2d ENABLE ROW LEVEL SECURITY;
ALTER TABLE katalog_data_3d ENABLE ROW LEVEL SECURITY;

-- View juga perlu ditangani: bawaannya view berjalan dengan hak PEMILIKNYA, bukan hak
-- pemanggilnya, dan karena pemilik tabel melewati RLS, view membuat RLS pada tabel di
-- bawahnya tidak berlaku. Diuji: peran anon tidak melihat satu baris pun dari
-- katalog_data_2d, tetapi MASIH melihat baris berakses 'private' beserta email penulisnya
-- lewat v_katalog_2d_lengkap.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'v_katalog_2d_lengkap'
          AND c.relkind = 'v'
    ) THEN
        ALTER VIEW public.v_katalog_2d_lengkap SET (security_invoker = true);
    END IF;
END
$$;

COMMIT;

-- Periksa hasilnya: tiga tabel harus bernilai rls = true, dan view harus memuat
-- security_invoker=true pada kolom opsi.
SELECT
    c.relname        AS objek,
    c.relkind        AS jenis,
    c.relrowsecurity AS rls,
    c.reloptions    AS opsi
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users', 'katalog_data_2d', 'katalog_data_3d', 'v_katalog_2d_lengkap')
ORDER BY c.relname;
