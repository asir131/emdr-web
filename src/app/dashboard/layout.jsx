"use client";
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { useStoredAuth } from "@/redux/authStorage";

const bgImages = {
  "/dashboard": "https://i.ibb.co.com/LDkH9SNf/I-want-a-beautiful-whimsical-watercolour-illustration-of-a-swedish-forest-with-a-fox-in-the-distanc.jpg",
  "/dashboard/progress":
    "https://i.ibb.co.com/4g9Xd58T/5c2b0c67-9d58-431f-b7a8-e781abf72d11.jpg",
  "/dashboard/homework":
    "https://i.ibb.co.com/TMLMBZ3M/7bf1c821-1479-4da9-bfc7-ca89bfb28850.jpg",
  "/dashboard/emotions":
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
  "/dashboard/behaviours":
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
  "/dashboard/resources":
    "https://i.ibb.co.com/LDkH9SNf/I-want-a-beautiful-whimsical-watercolour-illustration-of-a-swedish-forest-with-a-fox-in-the-distanc.jpg",
  "/dashboard/thoughts":
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
};

import WelcomeWalkthrough from "@/components/dashboard/WelcomeWalkthrough";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, hasHydrated } = useStoredAuth();
  const currentBg = bgImages[pathname] || "/homeImage/background.jpg";
  const isSessionPage = pathname === "/dashboard/resources/bilateral/session";

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace(
        `/authentication/login?redirect=${encodeURIComponent(pathname)}`
      );
    }
  }, [hasHydrated, pathname, router, token]);

  if (!hasHydrated || !token) {
    return null;
  }

  return (
    <div className="flex h-screen w-full relative overflow-hidden">
      <WelcomeWalkthrough />
      {!isSessionPage && (
        <div className="absolute inset-0 z-0">
          <img
            src={currentBg}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out"
            key={currentBg}
          />
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
      )}
      {!isSessionPage && (
        <div className="relative z-10 h-full">
          <Sidebar />
        </div>
      )}
      <div className="flex-1 flex flex-col relative z-20 overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          {!isSessionPage && <Header />}
          <main
            className={`flex-1 overflow-y-auto ${isSessionPage ? "p-0" : "p-8 pt-2"
              }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
