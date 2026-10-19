"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCourses } from "@/lib/courses-api";

export function CourseSelect({ token, value, onChange }) {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    fetchCourses(token)
      .then((data) => {
        if (!isCancelled) setCourses(data);
      })
      .catch(() => {
        if (!isCancelled) setCourses([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a course" />
      </SelectTrigger>
      <SelectContent>
        {courses.map((course) => (
          <SelectItem key={course.id} value={course.id}>
            {course.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
