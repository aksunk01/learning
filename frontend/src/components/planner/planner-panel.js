"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTodayPlan } from "@/lib/planner-api";
import { updateAssignmentCompletion } from "@/lib/assignments-api";
import { PlannerItemCard } from "@/components/planner/planner-item-card";
import { CompleteTimeDialog } from "@/components/planner/complete-time-dialog";

export function PlannerPanel({ open, onOpenChange, token }) {
  const router = useRouter();

  const [todayPlan, setTodayPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [completingItem, setCompletingItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadPlanner = async (activeToken) => {
    setIsLoading(true);
    setError("");

    try {
      const today = await fetchTodayPlan(activeToken);
      setTodayPlan(today);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      setError(err.message || "Failed to load planner");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !token) return;
    Promise.resolve().then(() => loadPlanner(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const handleCompleteClick = (item) => {
    setCompletingItem(item);
    setDialogOpen(true);
  };

  const finishCompletion = async (actualMinutes) => {
    if (!completingItem || !token) return;

    try {
      await updateAssignmentCompletion(completingItem.assignment_id, true, token, { actualMinutes });
    } catch (err) {
      setError(err.message || "Failed to mark task complete");
    } finally {
      setCompletingItem(null);
      loadPlanner(token);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Planner</SheetTitle>
          <SheetDescription>Today&apos;s to-do list.</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          {error && <div className="text-destructive mb-4">{error}</div>}

          {todayPlan?.is_fallback && todayPlan.items.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Nothing homework/project-related is due today, so here&apos;s what&apos;s coming up next.
            </p>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-3 w-64" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {todayPlan && todayPlan.items.length > 0 ? (
                todayPlan.items.map((item) => (
                  <PlannerItemCard
                    key={item.assignment_id}
                    item={item}
                    onComplete={handleCompleteClick}
                    completing={completingItem?.assignment_id === item.assignment_id}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Nothing on your list - you&apos;re caught up.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <CompleteTimeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={completingItem?.title}
          onConfirm={finishCompletion}
          onSkip={() => finishCompletion(null)}
        />
      </SheetContent>
    </Sheet>
  );
}
