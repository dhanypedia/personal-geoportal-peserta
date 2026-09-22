/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: "standalone",
  basePath: "/portal",

  // Dimatikan karena penampil Cesium dan Gaussian Splat membuat canvas sendiri.
  // Dalam mode ketat, React memasang komponen dua kali saat pengembangan, dan
  // canvas kedua bertabrakan dengan yang pertama.
  reactStrictMode: false,

  // Token Cesium Ion perlu diteruskan ke sisi peramban. Tanpa blok ini,
  // process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN bernilai kosong di peramban dan
  // peta 3D gagal memuat citra dasar.
  env: {
    NEXT_PUBLIC_CESIUM_ION_TOKEN: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN
  }
};

export default nextConfig;
