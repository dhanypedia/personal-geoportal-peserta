import { getServerSession } from "next-auth";
import KelolaAkun from "./components/KelolaAkun";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session.user.role !== "super_admin") {
    redirect("/");
  }

  return <KelolaAkun />;
}