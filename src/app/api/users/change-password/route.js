import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";
import { db } from "../../../../../lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(request) {
  const { payload, error, status } = requireAuth(request, "viewer");
  if (error) {
    return NextResponse.json({ message: error }, { status });
  }

  const data = await request.json();
  const { user_id, password_lama, password_baru, konfirmasi_password } = data;

  // Validasi field wajib
  if (!user_id || !password_lama || !password_baru || !konfirmasi_password) {
    return NextResponse.json(
      {
        message:
          "user_id, password_lama, password_baru, dan konfirmasi_password wajib diisi",
      },
      { status: 400 },
    );
  }

  // Hanya boleh ganti password milik sendiri, kecuali super_admin
  if (payload.role !== "super_admin" && payload.user_id !== user_id) {
    return NextResponse.json(
      { message: "Tidak diizinkan mengganti password user lain" },
      { status: 403 },
    );
  }

  if (password_baru !== konfirmasi_password) {
    return NextResponse.json(
      { message: "Konfirmasi password tidak sesuai dengan password baru" },
      { status: 400 },
    );
  }

  if (password_baru.length < 8) {
    return NextResponse.json(
      { message: "Password baru minimal 8 karakter" },
      { status: 400 },
    );
  }

  if (password_baru === password_lama) {
    return NextResponse.json(
      { message: "Password baru tidak boleh sama dengan password lama" },
      { status: 400 },
    );
  }

  try {
    const user = await db.users.findUnique({
      where: { user_id },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    // Cek password lama cocok
    const isPasswordMatch = bcrypt.compareSync(
      password_lama,
      user.password || "",
    );
    if (!isPasswordMatch) {
      return NextResponse.json(
        { message: "Password lama tidak sesuai" },
        { status: 400 },
      );
    }

    const hashedPassword = bcrypt.hashSync(password_baru, 10);

    const updatedUser = await db.users.update({
      where: { user_id },
      data: { password: hashedPassword },
    });

    // Jangan kirim balik field password
    const { password, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(
      { message: "Berhasil mengganti password", data: userWithoutPassword },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
