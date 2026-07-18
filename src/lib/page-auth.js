import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";

export async function requirePageUser() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function redirectIfAuthenticated() {
  const user = await getServerUser();
  if (user) {
    redirect("/dashboard");
  }
}
