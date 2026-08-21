"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchCourse } from "@/lib/courses-api";
import { fetchCourseMaterials, processCourseMaterial } from "@/lib/course-materials-api";
import { UploadCourseMaterialDialog } from "@/components/courses/upload-course-material-dialog";

export default function CourseDetailsPage() {
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);

  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId;

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

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Loading Course...</h1>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex-1 p-6 md:pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Course Details</h1>
        <p className="text-destructive mt-2">
          {error || "Course not found"}
        </p>
      </div>
    );
  }

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

  return (
    <div className="flex-1 p-6 md:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Course Details</h1>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">{course.name}</h2>

        <p className="text-muted-foreground mb-2">
          Code: {course.code}
        </p>

        {course.semester && (
          <p className="text-muted-foreground mb-2">
            Semester: {course.semester}
          </p>
        )}

        {course.description && (
          <p className="text-muted-foreground mt-4">
            {course.description}
          </p>
        )}
      </div>

      <div className="bg-card border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
