// Style reminder: even the fallback screen uses the city’s utilitarian command palette and Russian copy.

import { Button } from "@/components/ui/button";
import AlertCircle from "lucide-react/dist/esm/icons/circle-alert";
import HomeIcon from "lucide-react/dist/esm/icons/house";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0c1016] p-6 text-[#ede7dc]">
      <section className="w-full max-w-md border border-[#2a3138] bg-[#151a20] p-7 shadow-2xl">
        <AlertCircle className="mb-5 h-12 w-12 text-[#c65547]" />
        <p className="eyebrow">СЕКТОР НЕ НАЙДЕН</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase tracking-[0.05em]">404</h1>
        <p className="mt-3 text-sm leading-6 text-[#a8a9a5]">Маршрут не входит в карту текущей версии убежища.</p>
        <Button className="mt-7" onClick={() => setLocation("/")}><HomeIcon className="mr-2 h-4 w-4" /> Вернуться в город</Button>
      </section>
    </main>
  );
}
