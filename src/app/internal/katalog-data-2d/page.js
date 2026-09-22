import { getServerSession } from "next-auth";
import KatalogData2D from "./components/KatalogData2D";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function KatalogData2DPage() {
  const session = await getServerSession(authOptions);
  return <KatalogData2D accessToken={session.accessToken} role={session.user.role}/>;
}
