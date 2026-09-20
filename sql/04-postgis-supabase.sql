-- Data spasial PostGIS di Supabase. Jalankan di SQL Editor Supabase.
--
-- Panduan PostgreSQL lokal memuat satu perintah yang TIDAK berlaku di Supabase:
--   ALTER DATABASE namadatabase SET search_path TO gis, public;
-- Di Supabase PostGIS sering berakhir di schema extensions, sehingga begitu search_path
-- dikunci ke "gis, public" semua nama PostGIS tanpa awalan schema tidak ditemukan. QGIS
-- memanggil AddGeometryColumn tanpa awalan schema, jadi layer baru gagal dibuat dan
-- digitasi tidak bisa disimpan. Setelah Bagian 2, koneksi QGIS dan DBeaver harus ditutup
-- lalu dibuka lagi, karena ALTER DATABASE hanya berlaku untuk sesi baru.


-- BAGIAN 1 - DIAGNOSA

-- 1.1 Di schema mana PostGIS benar-benar terpasang? Ini akar masalahnya: kalau hasilnya
-- extensions sementara search_path hanya "gis, public", lanjut ke Bagian 2.
SELECT '1.1 lokasi extension' AS bagian;
SELECT e.extname                       AS extension,
       n.nspname                       AS schema_postgis,
       e.extversion                    AS versi,
       pg_get_userbyid(e.extowner)     AS pemilik
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname LIKE 'postgis%'
ORDER BY e.extname;

-- 1.2 search_path yang berlaku sekarang, dari tiga sumber: sesi (koneksi ini), database
-- (ALTER DATABASE, berlaku untuk sesi baru), peran (ALTER ROLE, menimpa nilai database).
SELECT '1.2 search_path' AS bagian;
SELECT 'sesi'     AS sumber, current_setting('search_path') AS nilai
UNION ALL
SELECT 'database', s.setconfig::text
FROM pg_db_role_setting s
JOIN pg_database d ON d.oid = s.setdatabase
WHERE d.datname = current_database() AND s.setrole = 0
UNION ALL
SELECT 'peran', s.setconfig::text
FROM pg_db_role_setting s
JOIN pg_roles r ON r.oid = s.setrole
WHERE r.rolname = current_user AND s.setdatabase = 0;

-- 1.3 Apakah nama PostGIS bisa dipanggil tanpa awalan schema? Inilah yang dilakukan QGIS.
-- Kalau kedua tipe bernilai false atau daftar fungsinya kosong, perbaikan di Bagian 2 memang
-- diperlukan. Daftar schema diurutkan sesuai prioritas pencarian.
SELECT '1.3 nama PostGIS di jalur pencarian' AS bagian;
SELECT to_regtype('geometry')  IS NOT NULL AS tipe_geometry_ketemu,
       to_regtype('geography') IS NOT NULL AS tipe_geography_ketemu;

SELECT n.nspname || '.' || p.oid::regprocedure::text AS fungsi_addgeometrycolumn,
       array_position(current_schemas(true), n.nspname) AS prioritas
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'addgeometrycolumn'
  AND n.nspname = ANY (current_schemas(true))
ORDER BY prioritas NULLS LAST;

-- 1.4 Apakah yang ada di schema gis memang tabel spasial? format_type dipakai supaya kolom
-- geometri tetap terbaca walaupun tipe geometry tidak ada di search_path. Tabel tanpa primary
-- key akan terbuka sebagai layer baca-saja di QGIS, dan itu sebab kegagalan menyimpan yang
-- berbeda dari masalah search_path.
SELECT '1.4 isi schema gis' AS bagian;
SELECT c.relname                                       AS tabel,
       COALESCE(a.attname, '-')                        AS kolom_geometri,
       COALESCE(format_type(a.atttypid, a.atttypmod), '-') AS tipe,
       EXISTS (SELECT 1 FROM pg_index i
               WHERE i.indrelid = c.oid AND i.indisprimary) AS ada_primary_key,
       pg_get_userbyid(c.relowner)                     AS pemilik,
       c.relrowsecurity                                AS rls_aktif
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attribute a
       ON a.attrelid = c.oid
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.atttypid IN (SELECT t.oid FROM pg_type t
                         WHERE t.typname IN ('geometry', 'geography'))
WHERE n.nspname = 'gis'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- 1.5 Apakah peran koneksi berhak membuat tabel di schema gis?
SELECT '1.5 hak akses schema gis' AS bagian;
SELECT current_user                                     AS peran_koneksi,
       has_schema_privilege('gis', 'USAGE')             AS boleh_pakai,
       has_schema_privilege('gis', 'CREATE')            AS boleh_buat_tabel,
       pg_get_userbyid(n.nspowner)                      AS pemilik_schema
FROM pg_namespace n
WHERE n.nspname = 'gis';


-- BAGIAN 2 - PERBAIKAN
-- Menyusun ulang search_path: schema data, lalu public, lalu schema tempat PostGIS
-- benar-benar berada; nilainya dibaca dari katalog. PostGIS tidak bisa dipindah schema
-- setelah terpasang, jadi yang disesuaikan jalurnya. Aman dijalankan berulang.

DO $$
DECLARE
    skema_data    text := 'gis';     -- schema tempat tabel spasial disimpan
    skema_postgis text;
    jalur         text;
BEGIN
    SELECT n.nspname INTO skema_postgis
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis';

    IF skema_postgis IS NULL THEN
        RAISE EXCEPTION 'extension postgis belum aktif di database ini. '
                        'Aktifkan lebih dahulu lewat Database > Extensions.';
    END IF;

    SELECT string_agg(s, ', ' ORDER BY urutan) INTO jalur
    FROM (
        SELECT skema_data AS s, 1 AS urutan
        UNION ALL SELECT 'public', 2
        UNION ALL SELECT skema_postgis, 3
         WHERE skema_postgis NOT IN (skema_data, 'public')
    ) t;

    EXECUTE format('ALTER DATABASE %I SET search_path TO %s', current_database(), jalur);

    -- ALTER DATABASE hanya berlaku untuk sesi baru, jadi jalur yang sama disetel juga
    -- untuk sesi ini supaya uji di Bagian 4 mewakili keadaan setelah koneksi dibuka ulang.
    PERFORM set_config('search_path', jalur, false);

    RAISE NOTICE 'search_path database % diset ke: %', current_database(), jalur;
    RAISE NOTICE 'Tutup lalu buka lagi koneksi QGIS dan DBeaver supaya berlaku.';
END $$;

-- Kalau perintah di atas ditolak dengan "must be owner of database", pakai bentuk
-- per peran berikut, lalu jalankan ulang Bagian 1.2 untuk memastikan nilainya masuk:
--
--   ALTER ROLE postgres IN DATABASE postgres SET search_path TO gis, public, extensions;


-- BAGIAN 3 - PEMBERSIHAN WRAPPER DARI MODUL PRAKTIK 8
-- Panduan lama menyuruh membuat public.addgeometrycolumn dan gis.addgeometrycolumn sebagai
-- pengganti. Wrapper itu memanggil AddGeometryColumn dengan enam argumen sementara fungsi
-- aslinya butuh tujuh, jadi panggilannya tidak pernah cocok dan QGIS hanya menampilkan
-- "function public.addgeometrycolumn(...) does not exist". Wrapper itu juga yang diberi GRANT
-- EXECUTE ke PUBLIC, anon, dan authenticated, dan sejak Bagian 2 fungsi PostGIS asli sudah
-- bisa dipanggil langsung. Penjagaan pg_depend memastikan fungsi milik extension PostGIS
-- tidak pernah ikut terhapus.

DO $$
DECLARE
    r      record;
    jumlah int := 0;
BEGIN
    FOR r IN
        SELECT format('%s.%s(%s)',
                      n.nspname,
                      p.proname,
                      pg_get_function_identity_arguments(p.oid)) AS tanda_tangan
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'addgeometrycolumn'
          AND n.nspname IN ('public', 'gis')
          -- Fungsi PostGIS selalu membawa argumen use_typmod, fungsi dari panduan
          -- lama tidak. Syarat ini mempersempit sasaran ke fungsi buatan sendiri.
          AND pg_get_function_identity_arguments(p.oid) NOT LIKE '%use_typmod%'
          AND NOT EXISTS (
                SELECT 1 FROM pg_depend d
                WHERE d.objid = p.oid
                  AND d.refclassid = 'pg_extension'::regclass
                  AND d.deptype = 'e')
    LOOP
        EXECUTE format('DROP FUNCTION %s', r.tanda_tangan);
        RAISE NOTICE 'wrapper buatan sendiri dihapus: %', r.tanda_tangan;
        jumlah := jumlah + 1;
    END LOOP;

    IF jumlah = 0 THEN
        RAISE NOTICE 'tidak ada wrapper buatan sendiri yang perlu dihapus';
    END IF;
END $$;


-- BAGIAN 4 - UJI FUNGSI
-- Meniru persis panggilan QGIS saat membuat kolom geometri di schema gis. Tabel uji dibuat
-- lalu dihapus lagi dalam blok yang sama, jadi tidak meninggalkan sisa.

DO $$
DECLARE
    hasil text;
BEGIN
    BEGIN
        DROP TABLE IF EXISTS gis.uji_prasyarat_qgis;
        CREATE TABLE gis.uji_prasyarat_qgis (id serial PRIMARY KEY);
        SELECT AddGeometryColumn('gis', 'uji_prasyarat_qgis', 'geom', 4326, 'POINT', 2)
          INTO hasil;
        RAISE NOTICE 'BERHASIL: %', hasil;
        RAISE NOTICE 'Jalur QGIS sudah benar. Ulangi langkah PostGIS di QGIS.';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'GAGAL: % (SQLSTATE %)', SQLERRM, SQLSTATE;
        RAISE NOTICE 'Kirimkan baris GAGAL ini supaya sebabnya bisa dipastikan.';
    END;

    DROP TABLE IF EXISTS gis.uji_prasyarat_qgis;
END $$;

-- Pemeriksaan ulang: dua kolom harus bernilai true, dan search_path harus memuat schema
-- tempat PostGIS dipasang.
SELECT to_regtype('geometry')  IS NOT NULL AS tipe_geometry_ketemu,
       to_regtype('geography') IS NOT NULL AS tipe_geography_ketemu;

SELECT current_setting('search_path') AS search_path_sekarang;


-- TABEL KEPUTUSAN. Cocokkan pesan galat di QGIS dengan baris berikut.
-- - addgeometrycolumn / type "geometry" / st_srid dan kawan-kawan does not exist: PostGIS di
--   luar search_path, jalankan Bagian 2.
-- - public.addgeometrycolumn(...) does not exist: wrapper panduan lama, Bagian 2 lalu Bagian 3.
-- - permission denied for schema gis: peran koneksi bukan pemilik, jalankan
--   GRANT USAGE, CREATE ON SCHEMA gis TO <peran>;
-- - new row violates row-level security policy: RLS aktif di tabel spasial, jalankan
--   ALTER TABLE gis.<tabel> DISABLE ROW LEVEL SECURITY;
-- - prepared statement "..." already exists atau koneksi terputus saat menyimpan berarti
--   koneksi lewat pooler mode transaction, ganti port 6543 menjadi 5432. Mode itu tidak
--   mempertahankan prepared statement maupun pengaturan per sesi, tapi DATABASE_URL
--   aplikasi tetap boleh memakai 6543.
-- - Toggle editing mati dan layer terbaca baca-saja: tabelnya tanpa primary key, jalankan
--   ALTER TABLE gis.<tabel> ADD PRIMARY KEY (id);
