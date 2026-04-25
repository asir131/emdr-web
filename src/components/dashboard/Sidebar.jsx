"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLogoutMutation } from "@/redux/features/login";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const navItems = [
    { name: "My EMDR", href: "/dashboard" },
    { name: "My Progress", href: "/dashboard/progress" },
    { name: "My Homework ", href: "/dashboard/homework" },
    { name: "My Resources", href: "/dashboard/resources" },
  ];

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
    } finally {
      router.replace("/authentication/login");
    }
  };

  return (
    <div className="w-64 h-screen   text-white flex flex-col relative overflow-hidden border-r border-white/20">
      <div className="absolute inset-0 bg-[url('/sidebar-bg.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="pt-2 px-6 pb-6 relative z-10 flex flex-col h-full">
        <div className="flex flex-col items-center ">
          <Link href="/" className="w-32 h-32 flex items-center justify-center mb-4 cursor-pointer hover:opacity-80 transition-opacity">
            <img
              src="/homeImage/loginimg.png"
              alt="UK Inkind"
              className="w-full h-full object-contain"
            />
          </Link>
        </div>
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? (pathname === "/dashboard" ||
                  pathname === "/dashboard/assessments" ||
                  pathname.startsWith("/dashboard/new-roadmap") ||
                  pathname.startsWith("/dashboard/EMDRCompanion") ||
                  pathname.startsWith("/dashboard/AssessmentsF")) &&
                !pathname.startsWith("/dashboard/assessments/activity")
                : item.href === "/dashboard/progress"
                  ? pathname.startsWith("/dashboard/progress") ||
                  pathname.startsWith("/dashboard/assessments/activity") ||
                  pathname.startsWith("/dashboard/results")
                  : item.href === "/dashboard/homework"
                    ? pathname.startsWith("/dashboard/homework") ||
                    pathname.startsWith("/dashboard/emotions") ||
                    pathname.startsWith("/dashboard/behaviours") ||
                    pathname.startsWith("/dashboard/thoughts")
                    : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-[16px] font-medium transition-colors ${isActive
                  ? "bg-[#4A7C59] text-[#FBFBFC] shadow-sm"
                  : "text-black bg-[#FBFBFC] hover:bg-[#6B9071]/50 hover:text-[#FBFBFC]"
                  }`}
              >
                <span>{item.name}</span>
                {item.name.trim() === "My Homework" && (
                  <span className="bg-white text-[#4A7C59] text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                    Prime+
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mb-50">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-black bg-white hover:bg-[#6B9071]/50 hover:text-[#FBFBFC] transition-colors w-full rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
