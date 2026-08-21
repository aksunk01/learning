"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadCourseMaterial } from "@/lib/course-materials-api";

// Define the validation schema
const materialSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  materialType: z.string().trim().min(1, "Material type is required"),
  description: z.string().optional().nullable(),
  file: z.any().refine(
    (file) => file instanceof File && file.size > 0,
    {
      message: "File is required",
    }
  ),
});

export function UploadCourseMaterialDialog({
  courseId,
  token,
  onMaterialUploaded,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      materialType: "",
      description: "",
      file: null,
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);

    // Prepare the payload with trimmed values and null for empty optional fields
    const materialData = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      materialType: data.materialType.trim(),
      file: data.file,
    };

    try {
      const uploadedMaterial = await uploadCourseMaterial(
        courseId,
        materialData,
        token
      );

      // Call the success callback if provided
      if (onMaterialUploaded) {
        onMaterialUploaded(uploadedMaterial);
      }

      // Reset form and close dialog
      form.reset();
      setIsOpen(false);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        // Authentication error
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }

      setError(err.message || "Failed to upload course material");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      // Reset form when closing
      form.reset();
      setError(null);
    }

    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UploadIcon className="mr-2 h-4 w-4" />
          Upload Material
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Course Material</DialogTitle>
          <DialogDescription>
            Upload a file for this course.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field name="name">
              <FieldLabel>Name</FieldLabel>
              <Input
                placeholder="Material name"
                {...form.register("name")}
              />
              <FieldError>
                {form.formState.errors.name?.message}
              </FieldError>
            </Field>

            <Field name="materialType">
              <FieldLabel>Material Type</FieldLabel>
              <Input
                placeholder="e.g. Syllabus, Lecture Notes"
                {...form.register("materialType")}
              />
              <FieldError>
                {form.formState.errors.materialType?.message}
              </FieldError>
            </Field>

            <Field name="description">
              <FieldLabel>Description</FieldLabel>
              <Textarea
                placeholder="Material description"
                {...form.register("description")}
              />
              <FieldError>
                {form.formState.errors.description?.message}
              </FieldError>
            </Field>

            <Field name="file">
              <FieldLabel>File</FieldLabel>
              <Input
                type="file"
                accept=".pdf,.docx,.pptx,.txt"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;

                  form.setValue("file", file, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              />
              <FieldError>
                {form.formState.errors.file?.message}
              </FieldError>
            </Field>
          </FieldGroup>

          {error && (
            <div className="text-sm text-destructive">
              Error: {error}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
