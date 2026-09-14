export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      {children}
    </div>
  );
}
