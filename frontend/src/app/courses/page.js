"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetchCourses } from "@/lib/courses-api";
import { CreateCourseDialog } from "@/components/courses/create-course-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const [token, setToken] = useState(null);


  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    
    if (!storedToken) {
      // Redirect to login page if no token
      router.push("/login");
      return;
    }
    

    
    const fetchCoursesData = async () => {
      try {
        const data = await fetchCourses(storedToken);
        setToken(storedToken)
        setCourses(data);
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

  if (isLoading) {
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
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-2">
            Manage your academic courses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateCourseDialog 
            token={token} 
            onCourseCreated={handleCourseCreated} 
          />
          <ThemeToggle />
        </div>
      </div>
      
      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link href={`/courses/${course.id}`} key={course.id}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-1">Code: {course.code}</p>
                  {course.semester && (
                    <p className="text-muted-foreground mb-1">Semester: {course.semester}</p>
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
          <p className="text-muted-foreground mb-4">Get started by creating your first course.</p>
        </div>
      )}
    </div>
  );
}
