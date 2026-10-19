"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon, BookOpenIcon, ListChecksIcon, UploadIcon } from "lucide-react";
import { CreateCourseDialog } from "@/components/courses/create-course-dialog";
import { CreateAssignmentDialog } from "@/components/assignments/create-assignment-dialog";
import { UploadCourseMaterialDialog } from "@/components/courses/upload-course-material-dialog";

// Unified "Add" entry point for creating courses/assignments and uploading
// documents from pages that aren't scoped to a single course (dashboard,
// calendar, courses list). Pass courseId when used from a course-scoped
// page to skip the in-dialog course picker.
export function AddMenu({
  token,
  courseId,
  onCourseCreated,
  onAssignmentCreated,
  onMaterialUploaded,
}) {
  const [activeDialog, setActiveDialog] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimeoutRef = useRef(null);

  const openMenu = () => {
    clearTimeout(closeTimeoutRef.current);
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setMenuOpen(false), 150);
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            aria-label="Add"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleCloseMenu}
        >
          <DropdownMenuItem onClick={() => setActiveDialog("course")}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Add Course
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("assignment")}>
            <ListChecksIcon className="mr-2 h-4 w-4" />
            Add Assignment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("document")}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload Document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateCourseDialog
        token={token}
        trigger={null}
        open={activeDialog === "course"}
        onOpenChange={(open) => setActiveDialog(open ? "course" : null)}
        onCourseCreated={(course) => {
          setActiveDialog(null);
          onCourseCreated?.(course);
        }}
      />

      <CreateAssignmentDialog
        token={token}
        courseId={courseId}
        trigger={null}
        open={activeDialog === "assignment"}
        onOpenChange={(open) => setActiveDialog(open ? "assignment" : null)}
        onAssignmentCreated={(assignment) => {
          setActiveDialog(null);
          onAssignmentCreated?.(assignment);
        }}
      />

      <UploadCourseMaterialDialog
        token={token}
        courseId={courseId}
        trigger={null}
        open={activeDialog === "document"}
        onOpenChange={(open) => setActiveDialog(open ? "document" : null)}
        onMaterialUploaded={(material) => {
          setActiveDialog(null);
          onMaterialUploaded?.(material);
        }}
      />
    </>
  );
}
