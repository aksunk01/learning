"use client";

import { ThemeToggle } from "@/components/theme-toggle";

export default function CoursesPage() {
  return (
    <div className="flex-1 p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-2">
            Manage your academic courses
          </p>
        </div>
        <ThemeToggle />
      </div>
      
      <div className="bg-card border rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Courses</h2>
        <p className="text-muted-foreground">This page is under construction.</p>
      </div>
    </div>
  );
}
