import "../globals.css";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-page flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-8">
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </div>
  );
}
