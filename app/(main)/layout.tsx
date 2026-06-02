import "../globals.css";
import { MainLayoutWrapper } from "./main-layout-wrapper";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MainLayoutWrapper>{children}</MainLayoutWrapper>;
}
