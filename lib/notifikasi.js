import Swal from "sweetalert2";

// Seluruh pemberitahuan portal lewat berkas ini.
//
// Sebelumnya 20 tempat memakai alert() bawaan peramban, satu tempat memakai
// Snackbar MUI, dan 10 tempat memanggil Swal.fire langsung dengan gayanya
// masing-masing. Akibatnya satu aksi yang sama tampil berbeda di halaman yang
// berbeda, dan alert() muncul di pita atas peramban sehingga terlepas dari
// halaman yang memicunya. Dengan satu modul, seluruh pemberitahuan memakai
// bentuk dan susunan yang sama, dan mengubah tampilannya cukup di satu tempat.

// Warnanya diambil dari yang sudah dipakai halaman internal, bukan dipilih
// baru: latar putih dan judul #1E1E2D sama seperti seluruh modal di sana,
// tombol utama #4F46E5 sama seperti tombol aksi, dan merahnya sama dengan
// konfirmasi hapus yang sudah ada.
const WARNA = {
    latar: "#FFFFFF",
    judul: "#1E1E2D",
    utama: "#4F46E5",
    batal: "#6B7280",
    hapus: "#DC2626",
};

// Modal MUI memakai z-index 1300, sedangkan SweetAlert2 1060. Tanpa
// dinaikkan, pemberitahuan yang muncul selagi modal masih terbuka, yaitu
// seluruh pesan galat, tertimpa modalnya dan tombolnya tidak dapat diklik.
const LAPISAN = "2000";

// Sudut dan ukuran huruf diatur dari sini, bukan dari berkas CSS.
//
// Berkas globals.css ternyata tidak pernah diimpor oleh layout, jadi aturan
// di dalamnya tidak pernah sampai ke peramban. Mengimpornya sekaligus akan
// mengaktifkan seluruh isinya, termasuk reset * { padding: 0; margin: 0 }
// yang dapat mengubah tata letak seluruh halaman. Selain itu SweetAlert2
// menulis sebagian besar gayanya sebagai gaya sebaris, sehingga aturan dari
// berkas CSS pun tidak menang. Menyetelnya langsung pada unsur di sini
// terhindar dari kedua masalah itu.
function rapikan(kotak) {
    kotak.style.borderRadius = "12px";
    kotak.style.padding = "24px";

    // Kotak ini anak langsung dari wadahnya, dan wadah itulah yang perlu
    // dinaikkan di atas modal MUI.
    if (kotak.parentElement) kotak.parentElement.style.zIndex = LAPISAN;

    const judul = kotak.querySelector(".swal2-title");
    if (judul) {
        judul.style.fontSize = "19px";
        judul.style.fontWeight = "700";
        judul.style.lineHeight = "1.4";
    }

    const isi = kotak.querySelector(".swal2-html-container");
    if (isi) {
        isi.style.fontSize = "14px";
        isi.style.lineHeight = "1.6";
        // Pesan galat dari server dapat berupa kalimat panjang tanpa spasi,
        // misalnya nama host pada galat koneksi database. Tanpa aturan ini,
        // kotaknya melebar keluar layar.
        isi.style.overflowWrap = "anywhere";
    }
}

const dasar = Swal.mixin({
    background: WARNA.latar,
    color: WARNA.judul,
    confirmButtonColor: WARNA.utama,
    cancelButtonColor: WARNA.batal,
    // Bawaan SweetAlert2 berbahasa Inggris. Seluruh antarmuka portal memakai
    // bahasa Indonesia, jadi teks tombolnya ikut disamakan di sini, bukan
    // disebut satu per satu di setiap pemanggilan.
    confirmButtonText: "Mengerti",
    cancelButtonText: "Batal",
    reverseButtons: true,
    didOpen: rapikan,
});

// Keempat bentuk di bawah ini menutup seluruh keperluan halaman internal.
// Tempat pemakaian cukup menyebut judul dan isinya, tanpa perlu mengatur
// warna, ikon, atau ukuran.
//
// Judulnya sengaja menyebut aksi yang selesai, bukan sekadar "Berhasil".
// Ikon centang sudah mengatakan bahwa operasinya berhasil, sedangkan yang
// belum dikatakan ikon itu adalah operasi yang mana.

export function berhasil(judul, isi) {
    return dasar.fire({ icon: "success", title: judul, text: isi });
}

export function gagal(judul, isi) {
    return dasar.fire({ icon: "error", title: judul, text: isi });
}

export function peringatan(judul, isi) {
    return dasar.fire({ icon: "warning", title: judul, text: isi });
}

export function maklumat(judul, isi) {
    return dasar.fire({ icon: "info", title: judul, text: isi });
}

// Konfirmasi tindakan yang tidak dapat dibatalkan. Mengembalikan true bila
// pengguna benar-benar menyetujuinya.
export async function tanyaHapus(judul, isi) {
    const hasil = await dasar.fire({
        icon: "warning",
        title: judul,
        text: isi,
        showCancelButton: true,
        confirmButtonText: "Ya, hapus",
        cancelButtonText: "Batal",
        confirmButtonColor: WARNA.hapus,
        // Fokus jatuh ke tombol Batal, bukan tombol hapus. Menekan Enter
        // karena refleks tidak boleh langsung menghapus.
        focusCancel: true,
    });

    return hasil.isConfirmed;
}
