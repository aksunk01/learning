"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageBreadcrumb({ items }) {
  const pathname = usePathname();
  
  // Don't render breadcrumbs on dashboard, courses, or assistant pages
  if (pathname === "/dashboard" || pathname === "/courses" || pathname === "/assistant") {
    return null;
  }

  return (
    <div className="flex items-center text-sm text-muted-foreground mb-4 flex-wrap gap-2">
      {items.map((item, index) => (
        <span key={index} className="flex items-center">
          {item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <ChevronRight className="h-4 w-4 mx-1" />
          )}
        </span>
      ))}
    </div>
  );
}
