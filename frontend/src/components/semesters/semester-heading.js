"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDownIcon, PencilIcon } from "lucide-react";
import { fetchSemesters, updateSemester } from "@/lib/semesters-api";

export function SemesterHeading({ token, value, onChange, onSemesterUpdated, className = "" }) {
  const [semesters, setSemesters] = useState([]);
  const [editingSemester, setEditingSemester] = useState(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editError, setEditError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const openEditDialog = (semester) => {
    setEditingSemester(semester);
    setEditName(semester.name);
    setEditStartDate(semester.start_date || "");
    setEditEndDate(semester.end_date || "");
    setEditError(null);
  };

  const closeEditDialog = () => {
    setEditingSemester(null);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      setEditError("Semester name is required");
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const updated = await updateSemester(
        editingSemester.id,
        {
          name: editName.trim(),
          start_date: editStartDate || null,
          end_date: editEndDate || null,
        },
        token
      );

      setSemesters((current) =>
        current.map((semester) => (semester.id === updated.id ? updated : semester))
      );
      onSemesterUpdated?.(updated);
      setEditingSemester(null);
    } catch (err) {
      setEditError(err.message || "Failed to update semester");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
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
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onClick={() => onChange(null)}>
            All Semesters
          </DropdownMenuItem>
          {semesters.map((semester) => (
            <DropdownMenuItem
              key={semester.id}
              onClick={() => onChange(semester.id)}
              className="flex items-center justify-between gap-2"
            >
              <span>{semester.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  openEditDialog(semester);
                }}
              >
                <PencilIcon />
                <span className="sr-only">Edit {semester.name}</span>
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!editingSemester} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit semester</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="semester-name">Name</Label>
              <Input
                id="semester-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="semester-start-date">Start date</Label>
                <Input
                  id="semester-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="semester-end-date">End date</Label>
                <Input
                  id="semester-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeEditDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
