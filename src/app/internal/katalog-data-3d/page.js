import { getServerSession } from "next-auth";
import KatalogData3D from "./components/KatalogData3D";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const page = async () => {
  const session = await getServerSession(authOptions);
  return (
    <KatalogData3D accessToken={session.accessToken} role={session.user.role}/>
  )
}

export default page;