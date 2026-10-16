import { PlainFrame } from "@/components/shell/plain-frame";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PlainFrame>{children}</PlainFrame>;
}
