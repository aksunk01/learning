"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { CourseSelect } from "@/components/courses/course-select";
import { fetchCourseGrade } from "@/lib/grading-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildRowsFromGrade(grade) {
  return grade.categories.map((category) => ({
    id: category.id,
    name: category.name,
    weight: String(category.weight_percent ?? 0),
    score: category.percent === null || category.percent === undefined
      ? ""
      : String(round(category.percent)),
  }));
}

export default function GradeCalculatorPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [rows, setRows] = useState([]);
  const [target, setTarget] = useState("90");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    Promise.resolve().then(() => setToken(storedToken));
  }, [router]);

  useEffect(() => {
    if (!token || !courseId) {
      Promise.resolve().then(() => setRows([]));
      return;
    }

    let isCancelled = false;

    const loadGrade = async () => {
      setIsLoading(true);
      setError("");

      try {
        const grade = await fetchCourseGrade(courseId, token);
        if (isCancelled) return;
        setRows(buildRowsFromGrade(grade));
      } catch (err) {
        if (isCancelled) return;
        if (err.message.includes("401") || err.message.includes("403")) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }
        setError(err.message || "Failed to load grading categories for this course");
        setRows([]);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadGrade();

    return () => {
      isCancelled = true;
    };
  }, [token, courseId, router]);

  const handleRowChange = (id, field, value) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const result = useMemo(() => {
    const targetNum = parseFloat(target);
    if (!rows.length || Number.isNaN(targetNum)) return null;

    let totalWeight = 0;
    let knownWeight = 0;
    let knownWeightedScore = 0;
    let remainingCategories = 0;

    for (const row of rows) {
      const weight = parseFloat(row.weight);
      if (Number.isNaN(weight) || weight <= 0) continue;
      totalWeight += weight;

      const score = row.score.trim() === "" ? null : parseFloat(row.score);
      if (score !== null && !Number.isNaN(score)) {
        knownWeight += weight;
        knownWeightedScore += weight * score;
      } else {
        remainingCategories += 1;
      }
    }

    if (totalWeight <= 0) return null;

    const remainingWeight = totalWeight - knownWeight;
    const currentOverall = knownWeight > 0 ? knownWeightedScore / knownWeight : null;

    if (remainingWeight <= 0.001) {
      return {
        remainingWeight: 0,
        currentOverall,
        neededAverage: null,
        achieved: currentOverall !== null ? currentOverall >= targetNum : null,
      };
    }

    const neededAverage = (targetNum * totalWeight - knownWeightedScore) / remainingWeight;

    return {
      remainingWeight: round(remainingWeight),
      currentOverall: currentOverall !== null ? round(currentOverall) : null,
      neededAverage: round(neededAverage),
      remainingCategories,
    };
  }, [rows, target]);

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grade Calculator</h1>
          <p className="text-muted-foreground mt-2">
            See what score you need on the rest of a course to hit your target grade.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CourseSelect token={token} value={courseId} onChange={setCourseId} />

            <div className="space-y-1.5">
              <Label htmlFor="target-grade">Target overall grade (%)</Label>
              <Input
                id="target-grade"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {!courseId && (
              <p className="text-muted-foreground">Select a course to load its grading categories.</p>
            )}

            {courseId && isLoading && <p className="text-muted-foreground">Loading...</p>}

            {courseId && !isLoading && rows.length === 0 && !error && (
              <p className="text-muted-foreground">
                This course has no grading categories yet.
              </p>
            )}

            {rows.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Weights and scores are prefilled from your current grades. Clear a score to
                  treat that category as remaining, or edit any value to experiment.
                </p>

                <div className="grid grid-cols-[1fr_7rem_7rem] gap-3 text-sm font-medium text-muted-foreground">
                  <span>Category</span>
                  <span>Weight %</span>
                  <span>Score %</span>
                </div>

                {rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_7rem_7rem] gap-3 items-center">
                    <span className="truncate">{row.name}</span>
                    <Input
                      type="number"
                      value={row.weight}
                      onChange={(e) => handleRowChange(row.id, "weight", e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="remaining"
                      value={row.score}
                      onChange={(e) => handleRowChange(row.id, "score", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.currentOverall !== null && (
              <p>
                Current grade from completed work:{" "}
                <span className="font-semibold">{result.currentOverall}%</span>
              </p>
            )}

            {result.remainingWeight === 0 ? (
              <p>
                There is no remaining weight left to earn &mdash; your final grade is{" "}
                <span className="font-semibold">{result.currentOverall ?? "unknown"}%</span>,{" "}
                {result.achieved === true && "which meets your target."}
                {result.achieved === false && "which does not meet your target."}
              </p>
            ) : (
              <p>
                You need to average{" "}
                <span
                  className={`font-semibold ${
                    result.neededAverage > 100
                      ? "text-destructive"
                      : result.neededAverage <= 0
                      ? "text-green-600 dark:text-green-500"
                      : ""
                  }`}
                >
                  {result.neededAverage}%
                </span>{" "}
                on the remaining {result.remainingWeight}% of the course to reach a{" "}
                {target}% overall grade.
                {result.neededAverage > 100 && " That isn't achievable with the current weights."}
                {result.neededAverage <= 0 && " You've already secured this grade."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
