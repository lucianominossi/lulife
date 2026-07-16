import { redirect } from "next/navigation";
import { currentYearMonth } from "@/lib/dates";

export default function HomePage() {
  redirect(`/month/${currentYearMonth()}`);
}
