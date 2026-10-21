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

const NONE_VALUE = "__none__";

export function CourseSelect({ token, value, onChange, allowNone = false, noneLabel = "No course" }) {
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
    <Select
      value={value || (allowNone ? NONE_VALUE : "")}
      onValueChange={(selected) =>
        onChange(selected === NONE_VALUE ? null : selected)
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a course" />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>}
        {courses.map((course) => (
          <SelectItem key={course.id} value={course.id}>
            {course.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
