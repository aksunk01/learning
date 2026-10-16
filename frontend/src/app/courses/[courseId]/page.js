"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchCourse } from "@/lib/courses-api";
import { fetchCourseMaterials, processCourseMaterial } from "@/lib/course-materials-api";
import { fetchCourseAssignments, deleteAssignment, updateAssignmentCompletion } from "@/lib/assignments-api";
import { UploadCourseMaterialDialog } from "@/components/courses/upload-course-material-dialog";
import { GradingTab } from "@/components/courses/grading-tab";
import { fetchCourseGrade } from "@/lib/grading-api";
import { GradeGauge } from "@/components/courses/grade-gauge";
import { CreateAssignmentDialog } from "@/components/assignments/create-assignment-dialog";
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
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb";
import {formatWallClockDate} from "@/lib/date-helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, MoreHorizontal, ExternalLinkIcon } from "lucide-react";
import {EditAssignmentDialog} from "@/components/assignments/edit-assignment-dialog";
import { EditCourseDialog } from "@/components/courses/edit-course-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DEFAULT_COURSE_COLOR, coursePageTintStyle } from "@/lib/colors";
import { useColorIntensity } from "@/components/providers/color-intensity-provider";

export default function CourseDetailsPage() {
  const { intensityFactor } = useColorIntensity();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grade, setGrade] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);
  const [activeView, setActiveView] = useState("assignments");
  const [deletingAssignmentId, setDeletingAssignmentId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [togglingCompletionId, setTogglingCompletionId] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);

  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId;

  // Handle navigation to assignment detail page
  const handleAssignmentClick = (assignmentId, event) => {
    // Prevent navigation if the click was on the dropdown menu or its items
    if (event?.target.closest('[data-dropdown-menu]')) {
      return;
    }
    
    router.push(`/assignments/${assignmentId}?from=dashboard`);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    const loadCourseAndMaterials = async () => {
      try {
        // Load course data
        const courseData = await fetchCourse(courseId, storedToken);
        setCourse(courseData);
        
        // Load materials data
        const materialsData = await fetchCourseMaterials(courseId, storedToken);
        setMaterials(materialsData);
        
        // Load assignments data
        const assignmentsData = await fetchCourseAssignments(courseId, storedToken);
        setAssignments(assignmentsData);

        // Load grade data (non-fatal if it fails)
        try {
          const gradeData = await fetchCourseGrade(courseId, storedToken);
          setGrade(gradeData);
        } catch (gradeErr) {
          console.error("Failed to load course grade:", gradeErr);
        }

        // Set token after successful authentication
        setToken(storedToken);
      } catch (err) {
        if (err.message.includes("401") || err.message.includes("403")) {
          localStorage.removeItem("access_token");
          router.push("/login");
        } else {
          setError("Failed to load course details");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseAndMaterials();
  }, [courseId, router]);

  const confirmDeleteAssignment = (assignment) => {
    setAssignmentToDelete(assignment);
    setDeleteError("");
    setDeleteDialogOpen(true);
  };

  const handleAssignmentCreated = (createdAssignment) => {
    setAssignments((currentAssignments) => [
      ...currentAssignments,
      createdAssignment,
    ]);
  };

  const handleEditAssignment = (assignment, event) => {
    // Prevent the card click from navigating
    if (event) {
      event.stopPropagation();
    }
    
    setEditingAssignment(assignment);
    setEditOpen(true);
  };

  const handleCourseUpdated = (updatedCourse) => {
    setCourse((current) => ({ ...current, ...updatedCourse }));
  };

  const handleAssignmentUpdated = (updatedAssignment) => {
    setAssignments(current =>
      current.map(item =>
        item.id === updatedAssignment.id
          ? { ...item, ...updatedAssignment }
          : item
      )
    );
  };

  const handleDeleteAssignment = async () => {
    // Prevent default closing behavior of AlertDialogAction
 

    if (!assignmentToDelete) return;

    // Capture the assignment to avoid reference issues during async operation
    const assignment = assignmentToDelete;
    
    setDeletingAssignmentId(assignment.id);
        
    try {
      await deleteAssignment(assignment.id, token);
      
      // Remove the assignment from local state
      setAssignments((currentAssignments) =>
        currentAssignments.filter(
          (item) => item.id !== assignment.id
        )
      );
      
      // Close dialog after successful deletion
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      setDeleteError("");
    } catch (err) {
      if (err.message.includes("401") || err.message.includes("403")) {
        // Authentication error
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      
      // For other errors, we keep the assignment in state and show an error
      setDeleteError(err.message || "Failed to delete assignment");
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  const handleCancelDelete = (open) => {
    // Only close if not currently deleting
    if (!deletingAssignmentId) {
      return;
    }

    if (!open) {
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      setDeleteError("");
    }
  };

  const handleMaterialUploaded = async (uploadedMaterial) => {
    // Add the uploaded material to state immediately
    setMaterials((currentMaterials) => [
      ...currentMaterials,
      uploadedMaterial,
    ]);

    // Update the material to show "processing" status
    setMaterials(prevMaterials =>
      prevMaterials.map(material =>
        material.id === uploadedMaterial.id
          ? { ...material, processing_status: 'processing' }
          : material
      )
    );

    try {
      // Process the material
      const processedMaterial = await processCourseMaterial(courseId, uploadedMaterial.id, token);
      
      // Update the material with processed data (preserving existing fields)
      setMaterials(prevMaterials =>
        prevMaterials.map(material =>
          material.id === uploadedMaterial.id
            ? {
                ...material,
                processing_status: processedMaterial.processing_status,
                processed_at: processedMaterial.processed_at,
                processing_error: null,
              }
            : material
        )
      );
    } catch (err) {
      if (err.message.includes("401") || err.message.includes("403")) {
        // Authentication error
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }

      // Update the material to show failure status
      setMaterials(prevMaterials =>
        prevMaterials.map(material =>
          material.id === uploadedMaterial.id
            ? { 
                ...material, 
                processing_status: 'failed',
                processing_error: err.message || 'Failed to process document'
              }
            : material
        )
      );
    }
  };

  const handleAssignmentCompletion = async (
    assignmentId,
    isCompleted
  ) => {
    // Set the assignment being toggled for UI feedback
    setTogglingCompletionId(assignmentId);
    
    try {
      const updatedAssignment = await updateAssignmentCompletion(
        assignmentId,
        isCompleted,
        token
      );
      
      // Update local state with the new completion status
      setAssignments(prevAssignments =>
        prevAssignments.map(assignment =>
          assignment.id === assignmentId ? updatedAssignment : assignment
        )
      );
    } catch (err) {
      if (err.message.includes("401") || err.message.includes("403")) {
        // Authentication error
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      
      // Handle error case - could show a toast or similar UI feedback
      console.error("Failed to update assignment completion:", err);
    } finally {
      setTogglingCompletionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 pb-24 md:pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Loading Course...</h1>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex-1 p-6 pb-24 md:pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Course Details</h1>
        <p className="text-destructive mt-2">
          {error || "Course not found"}
        </p>
      </div>
    );
  }

  // Build breadcrumb items
  // Build breadcrumb items
  const breadcrumbItems = [
    { label: "Courses", href: "/courses" },
    { label: course.name }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">Pending</span>;
      case 'processing':
        return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">Processing</span>;
      case 'completed':
        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Completed</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Failed</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">{status}</span>;
    }
  };

  // Sort assignments by due_at (ascending), with null values at the end
const sortedAssignments = [...assignments].sort((a, b) => {
  if (!a.due_at && !b.due_at) return 0;
  if (!a.due_at) return 1;
  if (!b.due_at) return -1;
  return a.due_at.localeCompare(b.due_at);
});

  const courseColor = course.color || DEFAULT_COURSE_COLOR;

  const renderAssignmentCard = (assignment, isCompleted) => (
    <div
      key={assignment.id}
      className={`border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors ${isCompleted ? 'opacity-70 bg-muted/50' : ''}`}
      onClick={(e) => handleAssignmentClick(assignment.id, e)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-medium ${isCompleted ? 'line-through' : ''}`}>{assignment.title}</h4>
          {assignment.assignment_type && (
            <p className="text-sm text-muted-foreground mt-1">{assignment.assignment_type}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAssignmentCompletion(assignment.id, !isCompleted);
            }}
            disabled={togglingCompletionId === assignment.id}
            className={`text-sm font-medium ${isCompleted ? 'text-gray-500 hover:text-gray-700' : 'text-primary hover:text-primary/80'}`}
          >
            {togglingCompletionId === assignment.id
              ? "Updating..."
              : isCompleted ? "Mark Incomplete" : "Mark Complete"}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssignmentClick(assignment.id, e);
                }}
              >
                View
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditAssignment(assignment, e);
                }}
              >
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDeleteAssignment(assignment);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        {assignment.due_at && (
          <div>
            <span className="text-muted-foreground">Due:</span> { formatWallClockDate(assignment.due_at) }
          </div>
        )}
        {assignment.points != null && (
          <div>
            <span className="text-muted-foreground">Points:</span> {assignment.points}
          </div>
        )}
        {assignment.weight_percent != null && (
          <div>
            <span className="text-muted-foreground">Weight:</span> {assignment.weight_percent}%
          </div>
        )}
      </div>

      {isCompleted && assignment.completed_at && (
        <div className="mt-2 text-xs text-muted-foreground">
          Completed: {new Date(assignment.completed_at).toLocaleString()}
        </div>
      )}
    </div>
  );

  const todoAssignments = sortedAssignments.filter((a) => !a.is_completed);
  const doneAssignments = sortedAssignments.filter((a) => a.is_completed);

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6" style={coursePageTintStyle(courseColor, intensityFactor)}>
      <PageBreadcrumb items={breadcrumbItems} />
      <EditAssignmentDialog
        assignment={editingAssignment}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={handleAssignmentUpdated}
      />
      <EditCourseDialog
        course={course}
        token={token}
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
        onUpdated={handleCourseUpdated}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Course Details</h1>
      </div>

      <div className="relative bg-card border rounded-lg p-6 mb-6 flex items-center justify-between gap-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditCourseOpen(true)}>
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold mb-4 pr-8">
            {course.name}
          </h2>

          <p className="text-muted-foreground mb-2">
            Code: {course.code}
          </p>

          {course.semester && (
            <p className="text-muted-foreground mb-2">
              Semester: {course.semester.name}
            </p>
          )}

          {course.description && (
            <p className="text-muted-foreground mt-4">
              {course.description}
            </p>
          )}
        </div>

        {grade?.overall_percent != null && (
          <GradeGauge percent={grade.overall_percent} />
        )}
      </div>

      <div className="bg-card border rounded-lg p-6 mb-6">
        {/* Tab navigation */}
        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            className={`py-2 px-4 font-medium text-sm ${activeView === 'assignments' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveView('assignments')}
          >
            Assignments
          </button>
          <button
            type="button"
            className={`py-2 px-4 font-medium text-sm ${activeView === 'documents' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveView('documents')}
          >
            Documents
          </button>
          <button
            type="button"
            className={`py-2 px-4 font-medium text-sm ${activeView === 'grading' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveView('grading')}
          >
            Grading
          </button>
        </div>

        {activeView === 'assignments' ? (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h3 className="text-xl font-semibold">
                Assignments
              </h3>

              <CreateAssignmentDialog
                courseId={courseId}
                token={token}
                onAssignmentCreated={handleAssignmentCreated}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  To Do ({todoAssignments.length})
                </h4>
                <div className="max-h-[32rem] overflow-y-auto space-y-4 pr-1">
                  {todoAssignments.length === 0 ? (
                    <p className="text-muted-foreground">No incomplete assignments found for this course.</p>
                  ) : (
                    todoAssignments.map((assignment) => renderAssignmentCard(assignment, false))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Done ({doneAssignments.length})
                </h4>
                <div className="max-h-[32rem] overflow-y-auto space-y-4 pr-1">
                  {doneAssignments.length === 0 ? (
                    <p className="text-muted-foreground">No completed assignments found for this course.</p>
                  ) : (
                    doneAssignments.map((assignment) => renderAssignmentCard(assignment, true))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeView === 'documents' ? (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h3 className="text-xl font-semibold">Documents</h3>
              
              <UploadCourseMaterialDialog
                courseId={courseId}
                token={token}
                onMaterialUploaded={handleMaterialUploaded}
              />
            </div>
            
            {materials.length === 0 ? (
              <p className="text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-4">
                {materials.map((material) => (
                  <div key={material.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{material.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{material.file_name}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        {getStatusBadge(material.processing_status)}
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span> {material.material_type}
                      </div>
                      {material.file_size && (
                        <div>
                          <span className="text-muted-foreground">Size:</span> {Math.round(material.file_size / 1024)} KB
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Created:</span> {new Date(material.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {material.processing_status === 'failed' && material.processing_error && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                        Error: {material.processing_error}
                      </div>
                    )}

                    <div className="mt-3">
                      <Link href={`/courses/${course.id}/materials/${material.id}`}>
                        <Button size="sm" variant="outline" className="w-full sm:w-auto">
                          <ExternalLinkIcon className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <GradingTab courseId={courseId} token={token} onGradeChange={setGrade} />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={handleCancelDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Delete &quot;{assignmentToDelete?.title}&quot;?
                <br />
                This assignment will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <div className="text-destructive text-sm mb-2">
                {deleteError}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={deletingAssignmentId === assignmentToDelete?.id}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  handleDeleteAssignment();
                }}
                disabled={deletingAssignmentId === assignmentToDelete?.id}
              >
                {deletingAssignmentId === assignmentToDelete?.id ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
