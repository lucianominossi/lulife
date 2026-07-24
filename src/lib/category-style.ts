import {
  Car,
  Home,
  ShoppingCart,
  Utensils,
  HeartPulse,
  Gamepad2,
  Briefcase,
  PiggyBank,
  CreditCard,
  Wallet,
  Plane,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { IconTone } from "@/components/ui/icon-box";

const CATEGORY_PALETTE = [
  "#6C5CFF",
  "#3B82F6",
  "#22C55E",
  "#F43F5E",
  "#FB923C",
  "#FACC15",
  "#06B6D4",
  "#EC4899",
];

type CategoryStyle = {
  icon: LucideIcon;
  tone: IconTone;
  color: string;
};

export function getCategoryStyle(name: string): CategoryStyle {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/moradia|aluguel|casa|condominio|housing/.test(n))
    return { icon: Home, tone: "invest", color: "#3B82F6" };
  if (/aliment|comida|mercado|food|restaurante/.test(n))
    return { icon: Utensils, tone: "expense", color: "#F43F5E" };
  if (/transp|uber|combust|carro|parking/.test(n))
    return { icon: Car, tone: "transport", color: "#FB923C" };
  if (/lazer|entreten|cinema|hobby|game/.test(n))
    return { icon: Gamepad2, tone: "goals", color: "#FACC15" };
  if (/saude|health|farmacia|medico/.test(n))
    return { icon: HeartPulse, tone: "expense", color: "#F43F5E" };
  if (/compra|shopping|loja/.test(n))
    return { icon: ShoppingCart, tone: "savings", color: "#6C5CFF" };
  if (/viagem|passagem|hotel/.test(n))
    return { icon: Plane, tone: "invest", color: "#3B82F6" };
  if (/salario|renda|income|freelance/.test(n))
    return { icon: Briefcase, tone: "income", color: "#22C55E" };
  if (/poup|reserva|meta|emergencia/.test(n))
    return { icon: PiggyBank, tone: "savings", color: "#6C5CFF" };
  if (/cartao|fatura|credito/.test(n))
    return { icon: CreditCard, tone: "expense", color: "#F43F5E" };
  if (/pix|debito|banco/.test(n))
    return { icon: Wallet, tone: "invest", color: "#3B82F6" };

  return { icon: MoreHorizontal, tone: "muted", color: "#7A8596" };
}

export function categoryColor(index: number, name?: string): string {
  if (name) return getCategoryStyle(name).color;
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

export { CATEGORY_PALETTE };
