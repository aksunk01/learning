"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangleIcon, SparklesIcon } from "lucide-react";
import {
  fetchTodayPlan,
  fetchWeekPlan,
  fetchWorkloadConflicts,
  recommendForTime,
} from "@/lib/planner-api";
import { updateAssignmentCompletion } from "@/lib/assignments-api";
import { updateSubtaskCompletion } from "@/lib/assignment-subtasks-api";
import { PlannerItemCard } from "@/components/planner/planner-item-card";
import { CompleteTimeDialog } from "@/components/planner/complete-time-dialog";
import { formatWallClockDateShort } from "@/lib/date-helpers";

const TIME_PRESETS = [30, 60, 120];

export default function PlannerPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);

  const [todayPlan, setTodayPlan] = useState(null);
  const [weekPlan, setWeekPlan] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [completingItem, setCompletingItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [availableMinutes, setAvailableMinutes] = useState(60);
  const [recommendResult, setRecommendResult] = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    Promise.resolve().then(() => setToken(storedToken));
  }, [router]);

  const loadPlanner = async (activeToken) => {
    setIsLoading(true);
    setError("");

    try {
      const [today, week, conflictList] = await Promise.all([
        fetchTodayPlan(activeToken),
        fetchWeekPlan(activeToken),
        fetchWorkloadConflicts(activeToken),
      ]);

      setTodayPlan(today);
      setWeekPlan(week);
      setConflicts(conflictList);
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
    if (!token) return;
    Promise.resolve().then(() => loadPlanner(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCompleteClick = (item) => {
    setCompletingItem(item);
    setDialogOpen(true);
  };

  const finishCompletion = async (actualMinutes) => {
    if (!completingItem || !token) return;

    try {
      if (completingItem.subtask_id) {
        await updateSubtaskCompletion(
          completingItem.assignment_id,
          completingItem.subtask_id,
          true,
          token,
          { actualMinutes }
        );
      } else {
        await updateAssignmentCompletion(completingItem.assignment_id, true, token, { actualMinutes });
      }
    } catch (err) {
      setError(err.message || "Failed to mark task complete");
    } finally {
      setCompletingItem(null);
      loadPlanner(token);
    }
  };

  const handleRecommend = async () => {
    if (!token) return;
    setRecommendLoading(true);
    setRecommendError("");
    setRecommendResult(null);

    try {
      const result = await recommendForTime(availableMinutes, token);
      setRecommendResult(result);
    } catch (err) {
      setRecommendError(err.message || "Failed to get a recommendation");
    } finally {
      setRecommendLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 pb-24 md:pb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Planner</h1>
        <p className="text-muted-foreground mb-8">
          What you should work on, and when.
        </p>
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
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Planner</h1>
      <p className="text-muted-foreground mb-6">
        What you should work on, and when.
      </p>

      {error && <div className="text-destructive mb-4">{error}</div>}

      {conflicts.length > 0 && (
        <Card className="mb-6 border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 font-medium text-destructive mb-2">
              <AlertTriangleIcon className="h-4 w-4" />
              Workload conflict ahead
            </div>
            {conflicts.map((c) => (
              <p key={c.as_of_date} className="text-sm text-muted-foreground mb-1">
                By {formatWallClockDateShort(c.as_of_date)}, you&apos;re about {c.deficit_minutes} minutes
                over what fits in your available study time. Biggest contributors:{" "}
                {c.contributing_items.map((i) => i.title).join(", ")}.
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            What Should I Work On?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {TIME_PRESETS.map((minutes) => (
              <Button
                key={minutes}
                variant={availableMinutes === minutes ? "default" : "outline"}
                size="sm"
                onClick={() => setAvailableMinutes(minutes)}
              >
                {minutes} min
              </Button>
            ))}
            <Input
              type="number"
              min="1"
              value={availableMinutes}
              onChange={(e) => setAvailableMinutes(parseInt(e.target.value, 10) || 0)}
              className="w-24"
            />
            <Button onClick={handleRecommend} disabled={recommendLoading || !availableMinutes}>
              {recommendLoading ? "Thinking..." : "Recommend"}
            </Button>
          </div>

          {recommendError && <p className="text-destructive text-sm">{recommendError}</p>}

          {recommendResult && (
            <div className="space-y-3">
              <p className="text-sm">{recommendResult.explanation}</p>
              {recommendResult.items.map((item) => (
                <PlannerItemCard
                  key={`${item.assignment_id}-${item.subtask_id || "main"}`}
                  item={item}
                  onComplete={handleCompleteClick}
                  completing={completingItem?.assignment_id === item.assignment_id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3 mt-4">
          {todayPlan && todayPlan.items.length > 0 ? (
            todayPlan.items.map((item) => (
              <PlannerItemCard
                key={`${item.assignment_id}-${item.subtask_id || "main"}`}
                item={item}
                onComplete={handleCompleteClick}
                completing={completingItem?.assignment_id === item.assignment_id}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nothing scheduled for today - you&apos;re caught up.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {weekPlan &&
              weekPlan.days.map((day) => (
                <div key={day.date}>
                  <h3 className="font-medium mb-2">{formatWallClockDateShort(day.date)}</h3>
                  <div className="space-y-3">
                    {day.items.length > 0 ? (
                      day.items.map((item) => (
                        <PlannerItemCard
                          key={`${item.assignment_id}-${item.subtask_id || "main"}-${item.chunk_label || ""}`}
                          item={item}
                          onComplete={handleCompleteClick}
                          completing={completingItem?.assignment_id === item.assignment_id}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nothing planned.</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <CompleteTimeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={completingItem?.title}
        onConfirm={finishCompletion}
        onSkip={() => finishCompletion(null)}
      />
    </div>
  );
}
