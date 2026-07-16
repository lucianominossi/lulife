import { redirect } from "next/navigation";
import { currentYearMonth } from "@/lib/dates";

export default function MonthIndex() {
  redirect(`/month/${currentYearMonth()}`);
}
