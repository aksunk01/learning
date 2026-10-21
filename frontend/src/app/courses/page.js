"use client";

import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetchCourses, deleteCourse } from "@/lib/courses-api";
import { AddMenu } from "@/components/navigation/add-menu";
import { EditCourseDialog } from "@/components/courses/edit-course-dialog";
import { SemesterHeading } from "@/components/semesters/semester-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_COURSE_COLOR, courseGlowStyle } from "@/lib/colors";
import { useColorIntensity } from "@/components/providers/color-intensity-provider";

export default function CoursesPage() {
  const { intensityFactor } = useColorIntensity();
  const [courses, setCourses] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState(null);
  const [deleteError, setDeleteError] = useState("");


  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      // Redirect to login page if no token
      router.push("/login");
      return;
    }



    const fetchCoursesData = async () => {
      try {
        const coursesData = await fetchCourses(storedToken);
        setToken(storedToken)
        setCourses(coursesData);
      } catch (err) {
        if (err.message.includes("401") || err.message.includes("403")) {
          // Authentication error
          localStorage.removeItem("access_token");
          router.push("/login");
        } else {
          setError("Failed to load courses");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoursesData();
  }, [router]);

  const handleCourseCreated = (createdCourse) => {
    setCourses((currentCourses) => [...currentCourses, createdCourse]);
  };

  const handleCourseUpdated = (updatedCourse) => {
    setCourses((currentCourses) =>
      currentCourses.map((course) =>
        course.id === updatedCourse.id ? { ...course, ...updatedCourse } : course
      )
    );
  };

  const handleEditCourse = (course, event) => {
    event.stopPropagation();
    event.preventDefault();
    setEditingCourse(course);
    setEditOpen(true);
  };

  const confirmDeleteCourse = (course, event) => {
    event.stopPropagation();
    event.preventDefault();
    setCourseToDelete(course);
    setDeleteError("");
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = (open) => {
    if (!deletingCourseId) {
      setDeleteDialogOpen(open);
      if (!open) {
        setCourseToDelete(null);
        setDeleteError("");
      }
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    const course = courseToDelete;
    setDeletingCourseId(course.id);

    try {
      await deleteCourse(course.id, token);

      setCourses((currentCourses) =>
        currentCourses.filter((item) => item.id !== course.id)
      );

      setDeleteDialogOpen(false);
      setCourseToDelete(null);
      setDeleteError("");
    } catch (err) {
      if (err.message.includes("401") || err.message.includes("403")) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }

      setDeleteError(err.message || "Failed to delete course");
    } finally {
      setDeletingCourseId(null);
    }
  };

  const visibleCourses = useMemo(() => {
    const filtered = selectedSemesterId
      ? courses.filter((course) => course.semester_id === selectedSemesterId)
      : courses;

    return [...filtered].sort((a, b) => a.code.localeCompare(b.code));
  }, [courses, selectedSemesterId]);

  if (isLoading) {
    return (
      <div className="flex-1 p-6 pb-24 md:pb-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
            <p className="text-muted-foreground mt-2">
              Manage your academic courses
            </p>
          </div>
          <ThemeToggle />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 pb-24 md:pb-6">
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
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6">
      <EditCourseDialog
        course={editingCourse}
        token={token}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={handleCourseUpdated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{courseToDelete?.name}&quot;?
              <br />
              This course and its assignments will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="text-destructive text-sm mb-2">{deleteError}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCourseId === courseToDelete?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDeleteCourse();
              }}
              disabled={deletingCourseId === courseToDelete?.id}
            >
              {deletingCourseId === courseToDelete?.id ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-8 flex justify-between items-center">
        <div>
          <SemesterHeading
            token={token}
            value={selectedSemesterId}
            onChange={setSelectedSemesterId}
          />
          <p className="text-muted-foreground mt-2">
            Manage your academic courses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddMenu
            token={token}
            onCourseCreated={handleCourseCreated}
          />
          <ThemeToggle />
        </div>
      </div>

      {visibleCourses && visibleCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCourses.map((course) => (
            <Link href={`/courses/${course.id}`} key={course.id}>
              <Card
                className="group cursor-pointer hover:shadow-md transition-shadow"
                style={courseGlowStyle(course.color || DEFAULT_COURSE_COLOR, intensityFactor)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex-1 truncate">{course.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEditCourse(course, e)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => confirmDeleteCourse(course, e)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-1">Code: {course.code}</p>
                  {course.semester && (
                    <p className="text-muted-foreground mb-1">Semester: {course.semester.name}</p>
                  )}
                  {course.description && (
                    <p className="text-muted-foreground">{course.description}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-card border rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">No courses found</h2>
          <p className="text-muted-foreground mb-4">
            {selectedSemesterId
              ? "No courses are assigned to this semester yet."
              : "Get started by creating your first course."}
          </p>
        </div>
      )}
    </div>
  );
}
