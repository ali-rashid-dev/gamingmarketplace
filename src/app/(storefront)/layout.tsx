import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/storefront/storefront-header";

export default function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100">
      <StorefrontHeader />
      {children}
      <StorefrontFooter />
    </div>
  );
}
