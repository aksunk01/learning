"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchSemesters, createSemester } from "@/lib/semesters-api";

const NEW_SEMESTER_VALUE = "__new_semester__";
const NONE_VALUE = "__none__";

export function SemesterSelect({ token, value, onChange }) {
  const [semesters, setSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    fetchSemesters(token)
      .then((data) => {
        if (!isCancelled) setSemesters(data);
      })
      .catch(() => {
        if (!isCancelled) setError("Failed to load semesters");
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const handleSelectChange = (selected) => {
    if (selected === NEW_SEMESTER_VALUE) {
      setIsCreating(true);
      setError(null);
      return;
    }

    onChange(selected === NONE_VALUE ? null : selected);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError("Semester name is required");
      return;
    }

    setError(null);

    try {
      const created = await createSemester(
        {
          name: newName.trim(),
          start_date: newStartDate || null,
          end_date: newEndDate || null,
        },
        token
      );

      setSemesters((current) => [created, ...current]);
      onChange(created.id);
      setIsCreating(false);
      setNewName("");
      setNewStartDate("");
      setNewEndDate("");
    } catch (err) {
      setError(err.message || "Failed to create semester");
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setError(null);
    setNewName("");
    setNewStartDate("");
    setNewEndDate("");
  };

  if (isCreating) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <Input
          placeholder="Semester name (e.g. Fall 2026)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={newStartDate}
            onChange={(e) => setNewStartDate(e.target.value)}
          />
          <Input
            type="date"
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleCreate}>
            Save semester
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleCancelCreate}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Select
      value={value || NONE_VALUE}
      onValueChange={handleSelectChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a semester" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>No semester</SelectItem>
        {semesters.map((semester) => (
          <SelectItem key={semester.id} value={semester.id}>
            {semester.name}
          </SelectItem>
        ))}
        <SelectItem value={NEW_SEMESTER_VALUE}>+ Create new semester</SelectItem>
      </SelectContent>
    </Select>
  );
}
