"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadIcon } from "lucide-react";
import { fetchAssignment, linkAssignmentMaterials } from "@/lib/assignments-api";
import { fetchCourseMaterials } from "@/lib/course-materials-api";
import { UploadCourseMaterialDialog } from "@/components/courses/upload-course-material-dialog";

// Lets the user either pick an already-uploaded course material or upload a
// new one, then links it to `assignment`. Uploading auto-links the result.
export function LinkMaterialDialog({ assignment, token, onLinked }) {
  const [open, setOpen] = useState(false);
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const linkedMaterialIds = new Set(
    (assignment.linked_materials || []).map((m) => m.material_id)
  );

  const handleOpenChange = async (nextOpen) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setSelectedMaterialId(null);
      setSearchText("");
      setMaterialsError("");
      setUploadError("");
      return;
    }

    if (!assignment.course_id) {
      setMaterialsError("Course information not available");
      return;
    }

    setMaterialsLoading(true);
    setMaterialsError("");
    setSelectedMaterialId(null);

    try {
      const materials = await fetchCourseMaterials(assignment.course_id, token);
      setCourseMaterials(materials);
    } catch (err) {
      setMaterialsError(err.message || "Failed to fetch course materials");
    } finally {
      setMaterialsLoading(false);
    }
  };

  const linkMaterial = async (materialId) => {
    setLinkError("");

    try {
      await linkAssignmentMaterials(assignment.id, [{
        material_id: materialId,
        relationship_type: "reference",
        is_primary: false,
      }], token);

      const refreshedAssignment = await fetchAssignment(assignment.id, token);
      onLinked?.(refreshedAssignment);
    } catch (err) {
      throw new Error(err.message || "Failed to link material");
    }
  };

  const handleLinkSelected = async () => {
    if (!selectedMaterialId) return;

    setLinking(true);

    try {
      await linkMaterial(selectedMaterialId);
      handleOpenChange(false);
    } catch (err) {
      setLinkError(err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleMaterialUploadedAndLinked = async (uploadedMaterial) => {
    setUploadError("");

    try {
      await linkMaterial(uploadedMaterial.id);
    } catch (err) {
      setUploadError(err.message);
    }
  };

  const filteredMaterials = courseMaterials.filter((material) =>
    material.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">+ Link Material</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Material</DialogTitle>
          <DialogDescription>
            Select a material from your course to link it to this assignment, or upload a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <UploadCourseMaterialDialog
            courseId={assignment.course_id}
            token={token}
            trigger={
              <Button variant="outline" size="sm" className="mb-4 w-full">
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            }
            onMaterialUploaded={handleMaterialUploadedAndLinked}
          />

          {uploadError && (
            <p className="text-red-500 text-sm mb-4">{uploadError}</p>
          )}

          <Input
            placeholder="Search materials..."
            className="mb-4"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
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
                const isLinked = linkedMaterialIds.has(material.id);

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
                    onClick={() => !isLinked && setSelectedMaterialId(material.id)}
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
        {linkError && (
          <p className="text-red-500 text-sm">{linkError}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!selectedMaterialId || materialsLoading || linking}
            onClick={handleLinkSelected}
          >
            {linking ? 'Linking...' : 'Link Material'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
