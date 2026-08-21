"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, BookOpenIcon, PanelLeft, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function AppDock() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef(null);

  const isDashboardActive = pathname === "/dashboard";
  const isCoursesActive =
    pathname === "/courses" || pathname.startsWith("/courses/");

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  if (pathname === "/" || pathname === "/login"){
    return null;
  }

  return (
    <>
      {/* Desktop dock - visible only at md and larger */}
      <div 
        className="fixed -left-2 top-1/2 z-50 -translate-y-1/2 hidden md:flex md:flex-col md:items-center md:gap-2 md:w-auto md:max-w-none"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`relative w-12 overflow-hidden rounded-lg border border-border bg-background p-2 shadow-lg transition-[height] duration-300 motion-safe:ease-in-out ${isExpanded ? "h-24" : "h-12"}`}>
          {/* Collapsed state - always visible but faded */}
          <button
            aria-label="Expand navigation"
            className={`rounded-lg border border-border bg-background p-2 shadow-md transition-all duration-300 motion-safe:ease-in-out hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none absolute inset-0 flex items-center justify-center ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            onClick={() => setIsExpanded(true)}
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          
          {/* Expanded state - always mounted but hidden when collapsed */}
          <nav
            aria-label="Primary navigation"
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-[opacity,transform] duration-300 motion-safe:ease-in-out ${isExpanded? "visible scale-100 opacity-100": "invisible scale-95 pointer-events-none opacity-0"}`}
          >
            <Link
              href="/dashboard"
              aria-label="Dashboard"
              aria-current={isDashboardActive ? "page" : undefined}
              className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isDashboardActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <HomeIcon className="h-5 w-5" />
            </Link>

            <Link
              href="/courses"
              aria-label="Courses"
              aria-current={isCoursesActive ? "page" : undefined}
              className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isCoursesActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <BookOpenIcon className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Mobile dock - visible only below md */}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-row items-center gap-2 rounded-lg border border-border bg-background p-2 shadow-lg max-w-[calc(100vw-2rem)] md:hidden">
        <div className={`flex items-center gap-2 transition-all duration-300 motion-safe:ease-in-out relative overflow-hidden ${isExpanded ? 'w-[240px]' : 'w-12'}`}>
          {/* Collapsed state - always visible but faded */}
          <button
            aria-label="Expand navigation"
            className={`rounded-lg border border-border bg-background p-2 shadow-md transition-all duration-300 motion-safe:ease-in-out hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none absolute inset-0 flex items-center justify-center ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            onClick={() => setIsExpanded(true)}
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          
          {/* Expanded state - always mounted but hidden when collapsed */}
          <div className={`flex items-center gap-2 transition-all duration-300 motion-safe:ease-in-out absolute inset-0 ${isExpanded ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
            <Link
              href="/dashboard"
              aria-label="Dashboard"
              aria-current={isDashboardActive ? "page" : undefined}
              className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isDashboardActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => setIsExpanded(false)}
            >
              <HomeIcon className="h-5 w-5" />
            </Link>

            <Link
              href="/courses"
              aria-label="Courses"
              aria-current={isCoursesActive ? "page" : undefined}
              className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isCoursesActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => setIsExpanded(false)}
            >
              <BookOpenIcon className="h-5 w-5" />
            </Link>
            
            <button
              aria-label="Collapse navigation"
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
