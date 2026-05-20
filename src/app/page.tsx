import { redirect } from "next/navigation";

export default function Home() {
  // Middleware handles auth check — if logged in goes to dashboard, if not goes to login
  redirect("/dashboard");
}
