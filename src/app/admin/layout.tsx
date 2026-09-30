export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell min-h-dvh bg-[#efe8dc] text-[#171411]">
      {children}
    </div>
  );
}
