export default function WatchLayout({ children }: { children: React.ReactNode }) {
  // Override global app layout and constraints
  return (
    <div className="bg-black text-white min-h-[100dvh] w-full flex flex-col justify-center items-center">
      {children}
    </div>
  );
}
