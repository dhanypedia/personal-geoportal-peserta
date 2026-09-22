import { getServerSession } from "next-auth";
import Dashboard from "./components/Dashboard";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function Internal() {
  const session = await getServerSession(authOptions);
  return <Dashboard accessToken={session.accessToken} />;
}
