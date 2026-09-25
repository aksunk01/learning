"use client";

import { fetchCourse } from '@/lib/courses-api';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchAssignment, linkAssignmentMaterials, unlinkAssignmentMaterial, updateAssignmentMaterial, updateAssignmentCompletion } from '@/lib/assignments-api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchCourseMaterials, fetchCourseMaterialFile } from '@/lib/course-materials-api';
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb";
import { formatWallClockDate } from "@/lib/date-helpers";
import { Edit as EditIcon, ExternalLinkIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import { EditAssignmentDialog } from "@/components/assignments/edit-assignment-dialog";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import { useIsMobile } from "@/hooks/use-mobile";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [selectedViewerMaterialId, setSelectedViewerMaterialId] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [unlinking, setUnlinking] = useState(null);
  const [unlinkError, setUnlinkError] = useState('');
  const [makingPrimary, setMakingPrimary] = useState(null);
  const [makePrimaryError, setMakePrimaryError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [isTogglingCompletion, setIsTogglingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [viewerBlob, setViewerBlob] = useState(null);
  const [viewerMimeType, setViewerMimeType] = useState('');
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');
  const docxContainerRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      // Redirect to login page if no token
      router.push('/login');
      return;
    }

    const fetchAssignmentData = async () => {
      try {
        const data = await fetchAssignment(params.assignmentId, token);
        setAssignment(data);

        if(data.course_id){
          const courseData = await fetchCourse(data.course_id, token);
          setCourse(courseData)
        }
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          // Authentication error
          localStorage.removeItem('access_token');
          router.push('/login');
        } else {
          setError(err.message || 'Failed to fetch assignment');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssignmentData();
  }, [params.assignmentId, router]);


  const linkedMaterials = assignment?.linked_materials || [];

  const viewerSelectionStillLinked = linkedMaterials.some(
    (material) => material.material_id === selectedViewerMaterialId
  );

  const primaryViewerMaterial = linkedMaterials.find(
    (material) => material.is_primary
  );

  const effectiveViewerMaterialId = viewerSelectionStillLinked
    ? selectedViewerMaterialId
    : primaryViewerMaterial?.material_id ?? linkedMaterials[0]?.material_id ?? null;

  const selectedViewerMaterial =
    linkedMaterials.find(
      (material) => material.material_id === effectiveViewerMaterialId
    ) || null;

  // Desktop shows the document inline; mobile links out to the full-screen viewer instead.
  useEffect(() => {
    let isCancelled = false;

    const loadViewerMaterial = async () => {
      if (isMobile || !assignment?.course_id || !effectiveViewerMaterialId) {
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        setViewerLoading(true);
        setViewerError('');

        const blob = await fetchCourseMaterialFile(
          assignment.course_id,
          effectiveViewerMaterialId,
          token
        );

        if (isCancelled) return;

        setViewerMimeType(blob.type);
        setViewerBlob(blob);
      } catch (err) {
        if (!isCancelled) {
          setViewerError(err.message || 'Failed to load document');
          setViewerBlob(null);
          setViewerMimeType('');
        }
      } finally {
        if (!isCancelled) {
          setViewerLoading(false);
        }
      }
    };

    loadViewerMaterial();

    return () => {
      isCancelled = true;
      setViewerBlob(null);
      setViewerMimeType('');
      setViewerError('');
    };
  }, [isMobile, assignment?.course_id, effectiveViewerMaterialId]);

  // Handle DOCX rendering separately from file loading
  useEffect(() => {
    if (!viewerBlob || !docxContainerRef.current) {
      return;
    }

    if (viewerMimeType !== DOCX_MIME_TYPE) {
      return;
    }

    let isCancelled = false;

    const renderDocx = async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        docxContainerRef.current.innerHTML = '';
        await renderAsync(viewerBlob, docxContainerRef.current, undefined, {
          ignoreWidth: true,
          ignoreHeight: true,
        });
      } catch (error) {
        if (!isCancelled) {
          setViewerError(`Failed to render DOCX: ${error.message}`);
        }
      }
    };

    renderDocx();

    return () => {
      isCancelled = true;
    };
  }, [viewerBlob, viewerMimeType]);

  const handleOpenDialog = async () => {
    setDialogOpen(true);
    if (!assignment?.course_id) {
      // Course ID not available in assignment response
      setMaterialsError('Course information not available');
      return;
    }

    setMaterialsLoading(true);
    setMaterialsError('');
    setSelectedMaterialId(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const materials = await fetchCourseMaterials(assignment.course_id, token);
      setCourseMaterials(materials);
    } catch (err) {
      setMaterialsError(err.message || 'Failed to fetch course materials');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleAssignmentUpdated = (updatedAssignment) => {
    setAssignment((currentAssignment) => ({
      ...currentAssignment,
      ...updatedAssignment
    }));
  };

  const handleToggleCompletion = async () => {
    setCompletionError('');
    setIsTogglingCompletion(true);

    try {
      const token = localStorage.getItem('access_token');
      const updatedAssignment = await updateAssignmentCompletion(
        assignment.id,
        !assignment.is_completed,
        token
      );

      handleAssignmentUpdated(updatedAssignment);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('access_token');
        router.push('/login');
        return;
      }

      setCompletionError(err.message || 'Failed to update assignment');
    } finally {
      setIsTogglingCompletion(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMaterialId(null);
    setSearchText('');
    setMaterialsError('');
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const handleSelectMaterial = (materialId) => {
    if (!assignment.linked_materials?.some(m => m.material_id === materialId)) {
      setSelectedMaterialId(materialId);
    }
  };

  const filteredMaterials = courseMaterials.filter(material =>
    material.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading assignment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Assignment not found</div>
      </div>
    );
  }

  const isFromDashboard = searchParams.get('from') === 'dashboard';
  
  // Build breadcrumb items only after assignment is confirmed to exist
  let breadcrumbItems = [];
  
  if (isFromDashboard) {
    breadcrumbItems.push(
      { label: "Dashboard", href: "/dashboard" },
      { label: "Courses", href: "/courses" }
    );
  } else {
    breadcrumbItems.push(
      { label: "Courses", href: "/courses" }
    );
  }
  
  if (course) {
    breadcrumbItems.push(
      { label: course.name, href: `/courses/${course.id}` }
    );
  }
  
  breadcrumbItems.push(
    { label: assignment.name }
  );

  return (
    <div className="w-full max-w-none mx-auto p-4 pb-24 md:p-6 lg:p-8">
      <PageBreadcrumb items={breadcrumbItems} />
      <Card className="mb-6">
        <EditAssignmentDialog
          assignment={assignment}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdated={handleAssignmentUpdated}
        />
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-2xl font-bold">{course?.name ? `${course.name}: ` : ''}
               {assignment.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={assignment.is_completed ? "outline" : "default"}
                size="sm"
                onClick={handleToggleCompletion}
                disabled={isTogglingCompletion}
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                {isTogglingCompletion
                  ? 'Updating...'
                  : assignment.is_completed
                  ? 'Mark Incomplete'
                  : 'Mark Complete'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <EditIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
          {completionError && (
            <p className="text-sm text-destructive mt-2">{completionError}</p>
          )}
        </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 xl:gap-10">
              <div className="order-2 lg:order-1 flex-1 min-w-0">
              <div>
                {selectedViewerMaterial && (
                  <h4 className="font-medium mb-2">Document</h4>
                )}

                {selectedViewerMaterial ? (
                  isMobile ? (
                    <Card>
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {selectedViewerMaterial.name}
                        </span>

                        <Link
                          href={`/courses/${assignment.course_id}/materials/${selectedViewerMaterial.material_id}`}
                          className="shrink-0"
                        >
                          <Button size="sm" className="w-full sm:w-auto">
                            <ExternalLinkIcon className="h-4 w-4 mr-2" />
                            Open document
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Viewing: {selectedViewerMaterial.name}
                          </span>
                        </div>

                        {viewerLoading ? (
                          <div className="flex items-center justify-center h-[78vh]">
                            <p className="text-gray-500">Loading document...</p>
                          </div>
                        ) : viewerError ? (
                          <div className="flex items-center justify-center h-[78vh]">
                            <p className="text-red-500 text-center">{viewerError}</p>
                          </div>
                        ) : viewerBlob ? (
                          viewerMimeType?.startsWith('application/pdf') ? (
                            <div className="h-[78vh] overflow-y-auto">
                              <PdfViewer blob={viewerBlob} />
                            </div>
                          ) : viewerMimeType === DOCX_MIME_TYPE ? (
                            <div
                              ref={docxContainerRef}
                              className="docx-viewer w-full h-[78vh] overflow-y-auto border rounded p-4 bg-white text-black"
                              aria-label={`DOCX document viewer for ${selectedViewerMaterial.name}`}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-[78vh] p-4 text-center">
                              <p className="text-gray-500 mb-4">
                                Preview is currently available for PDF and DOCX files only.
                              </p>
                              <Link
                                href={`/courses/${assignment.course_id}/materials/${selectedViewerMaterial.material_id}`}
                              >
                                <Button size="sm">
                                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                  Open document
                                </Button>
                              </Link>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-center h-[78vh]">
                            <p className="text-gray-500 text-center">
                              Preview is currently available for PDF and DOCX files only.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Card className="p-4">
                    <p className="text-gray-500 dark:text-gray-400">
                      No material selected for viewer
                    </p>
                  </Card>
                )}
              </div>
            </div>
              <div className="order-1 lg:order-2 w-full lg:w-[340px] shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 mb-6">
                  {course && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Course
                      </h3>
                      <p className="text-lg font-semibold">
                        {course.name}
                      </p>
                    </div>
                  )}

                  {assignment.assignment_type && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Type
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        {assignment.assignment_type}
                      </Badge>
                    </div>
                  )}

                  {assignment.due_at && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Due Date
                      </h3>
                      <p className="text-lg">
                       {formatWallClockDate(assignment.due_at)}
                      </p>
                    </div>
                  )}

                  {assignment.is_completed !== undefined && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </h3>
                      <Badge
                        variant={assignment.is_completed ? "default" : "outline"}
                        className="mt-1"
                      >
                        {assignment.is_completed ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  )}
                </div>

                {assignment.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Description
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {assignment.description}
                    </p>
                  </div>
                )}

                {/* Existing linked materials section continues here */}

          {assignment.linked_materials?.length > 0 ? (
            <div className="mt-8">
              <div className="flex flex-col gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Linked Materials
                </h3>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  if (open) {
                    handleOpenDialog();
                  } else {
                    handleCloseDialog();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">+ Link Material</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Link Material</DialogTitle>
                      <DialogDescription>
                        Select a material from your course to link it to this assignment.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input 
                        placeholder="Search materials..." 
                        className="mb-4"
                        value={searchText}
                        onChange={handleSearchChange}
                      />
                      {materialsLoading ? (
                        <p className="text-gray-500 dark:text-gray-400">Loading materials...</p>
                      ) : materialsError ? (
                        <p className="text-red-500">{materialsError}</p>
                      ) : filteredMaterials.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">No materials found</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filteredMaterials.map((material) => {
                            const isLinked = assignment.linked_materials?.some(
                              m => m.material_id === material.id
                            );
                            
                            return (
                              <div
                                key={material.id}
                                className={`p-3 rounded-md cursor-pointer border ${
                                  selectedMaterialId === material.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : isLinked
                                    ? 'border-gray-200 dark:border-gray-700 opacity-60'
                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => !isLinked && handleSelectMaterial(material.id)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium">{material.name}</h4>
                                    {material.material_type && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {material.material_type}
                                      </p>
                                    )}
                                  </div>
                                  {isLinked && (
                                    <Badge variant="secondary" className="text-xs">
                                      Linked
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                      <Button 
                        disabled={!selectedMaterialId || materialsLoading || linking}
                        onClick={async () => {
                          if (!selectedMaterialId) return;
                          
                          setLinkError('');
                          setLinking(true);
                          
                          try {
                            const token = localStorage.getItem('access_token');
                            await linkAssignmentMaterials(assignment.id, [{
                              material_id: selectedMaterialId,
                              relationship_type: "reference",
                              is_primary: false
                            }], token);
                            
                            // Refresh assignment to get updated linked materials
                            const refreshedAssignment = await fetchAssignment(assignment.id, token);
                            setAssignment(refreshedAssignment);
                            
                            handleCloseDialog();
                          } catch (err) {
                            setLinkError(err.message || 'Failed to link material');
                          } finally {
                            setLinking(false);
                          }
                        }}
                      >
                        {linking ? 'Linking...' : 'Link Material'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {assignment.linked_materials.map((material) => (
                <Card
                  key={material.material_id}
                  onClick={() => setSelectedViewerMaterialId(material.material_id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    effectiveViewerMaterialId === material.material_id
                      ? 'ring-2 ring-primary border-primary bg-muted/50'
                      : 'hover:bg-muted/30'
                  }`}
                >
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="font-medium">
                          {material.name}
                        </h4>

                        {material.material_type && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {material.material_type}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {material.relationship_type && (
                          <Badge variant="secondary" className="text-xs">
                            {material.relationship_type}
                          </Badge>
                        )}

                        {material.is_primary && (
                          <Badge variant="default" className="text-xs">
                            Primary
                          </Badge>
                        )}

                        {!material.is_primary && (
                          <Button
                          variant='outline'
                          size='sm'
                          onClick={async (event) =>{
                            event.stopPropagation();

                            setMakePrimaryError('');
                            setMakingPrimary(material.material_id);

                            try{
                              const token = localStorage.getItem('access_token');

                              await updateAssignmentMaterial(
                                assignment.id,
                                material.material_id,
                                {is_primary: true},
                                token
                              );

                              const refreshedAssignment = await fetchAssignment(
                                assignment.id,
                                token
                              );

                              setAssignment(refreshedAssignment);
                            } catch (e){
                              setMakePrimaryError(
                                e.message || "Failed to make material primary"
                              );
                            } finally {
                              setMakingPrimary(null);
                            }
                          }}

                          disabled={makingPrimary === material.material_id}
                          >
                          {makingPrimary === material.material_id
                            ? 'Updating...'
                            : 'Make Primary'
                          }
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async (event) => {
                            event.stopPropagation();
                            setUnlinkError('');
                            setUnlinking(material.material_id);
                            
                            try {
                              const token = localStorage.getItem('access_token');
                              await unlinkAssignmentMaterial(assignment.id, material.material_id, token);
                              
                              // Refresh assignment to get updated linked materials
                              const refreshedAssignment = await fetchAssignment(assignment.id, token);
                              setAssignment(refreshedAssignment);
                            } catch (err) {
                              setUnlinkError(err.message || 'Failed to unlink material');
                            } finally {
                              setUnlinking(null);
                            }
                          }}
                          disabled={unlinking === material.material_id}
                        >
                          {unlinking === material.material_id ? 'Unlinking...' : 'Unlink'}
                        </Button>
                      </div>
                    </div>
                    {unlinkError && (
                      <p className="text-red-500 text-sm mt-2">Error: {unlinkError}</p>
                    )}

                    {makePrimaryError && (
                      <p className='text-red-500 text-sm mt-2'>
                        Error: {makePrimaryError}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <div className="flex flex-col gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Linked Materials
                </h3>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  if (open) {
                    handleOpenDialog();
                  } else {
                    handleCloseDialog();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">+ Link Material</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Link Material</DialogTitle>
                      <DialogDescription>
                        Select a material from your course to link it to this assignment.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input 
                        placeholder="Search materials..." 
                        className="mb-4"
                        value={searchText}
                        onChange={handleSearchChange}
                      />
                      {materialsLoading ? (
                        <p className="text-gray-500 dark:text-gray-400">Loading materials...</p>
                      ) : materialsError ? (
                        <p className="text-red-500">{materialsError}</p>
                      ) : filteredMaterials.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">No materials found</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filteredMaterials.map((material) => {
                            const isLinked = assignment.linked_materials?.some(
                              m => m.material_id === material.id
                            );
                            
                            return (
                              <div
                                key={material.id}
                                className={`p-3 rounded-md cursor-pointer border ${
                                  selectedMaterialId === material.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : isLinked
                                    ? 'border-gray-200 dark:border-gray-700 opacity-60'
                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => !isLinked && handleSelectMaterial(material.id)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium">{material.name}</h4>
                                    {material.material_type && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {material.material_type}
                                      </p>
                                    )}
                                  </div>
                                  {isLinked && (
                                    <Badge variant="secondary" className="text-xs">
                                      Linked
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                      <Button 
                        disabled={!selectedMaterialId || materialsLoading || materialsLoading || linking}
                        onClick={async () => {
                          
                          if (!selectedMaterialId) return;

                          setLinkError('');
                          setLinking(true);

                          try {
                            const token = localStorage.getItem('access_token');

                            await linkAssignmentMaterials(
                              assignment.id,
                              [{
                                material_id: selectedMaterialId,
                                relationship_type: "reference",
                                is_primary: false
                              }],
                              token
                            );

                            const refreshedAssignment = await fetchAssignment(
                              assignment.id,
                              token
                            );

                            setAssignment(refreshedAssignment);
                            handleCloseDialog();
                          } catch (e) {
                            setLinkError(e.message || 'Failed to link material');
                          } finally {
                            setLinking(false);
                          }
                        }}
                      >
                        Link Material
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="p-4">
                <p className="text-gray-500 dark:text-gray-400">
                  No materials linked to this assignment yet.
                </p>
              </Card>
            </div>
          )}
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
