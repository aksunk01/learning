"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { fetchSemesters } from "@/lib/semesters-api";

export function SemesterHeading({ token, value, onChange, className = "" }) {
  const [semesters, setSemesters] = useState([]);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    fetchSemesters(token)
      .then((data) => {
        if (!isCancelled) setSemesters(data);
      })
      .catch(() => {
        // Semester switcher degrades to "All Semesters" if this fails
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const currentLabel = value
    ? semesters.find((semester) => semester.id === value)?.name || "All Semesters"
    : "All Semesters";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 text-3xl font-bold tracking-tight hover:opacity-80 transition-opacity ${className}`}
        >
          {currentLabel}
          <ChevronDownIcon className="h-6 w-6 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => onChange(null)}>
          All Semesters
        </DropdownMenuItem>
        {semesters.map((semester) => (
          <DropdownMenuItem key={semester.id} onClick={() => onChange(semester.id)}>
            {semester.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
