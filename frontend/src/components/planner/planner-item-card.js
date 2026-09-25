"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { formatWallClockDateShort } from "@/lib/date-helpers";

const PRIORITY_VARIANT = {
  Critical: "destructive",
  High: "default",
  Medium: "secondary",
  Low: "outline",
};

export function PlannerItemCard({ item, onComplete, completing }) {
  return (
    <Card className={item.is_overdue ? "border-destructive" : undefined}>
      <CardContent className="p-4 flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 mt-0.5"
          aria-label="Mark complete"
          disabled={completing}
          onClick={() => onComplete(item)}
        >
          <CheckIcon className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="secondary">{item.course_name}</Badge>
            <Badge variant={PRIORITY_VARIANT[item.priority_level] || "outline"}>
              {item.priority_level}
            </Badge>
            {item.is_overdue && <Badge variant="destructive">Overdue</Badge>}
          </div>

          <Link
            href={`/assignments/${item.assignment_id}`}
            className="font-medium hover:underline"
          >
            {item.title}
            {item.chunk_label ? ` (${item.chunk_label})` : ""}
          </Link>

          <div className="text-sm text-muted-foreground mt-1">
            ~{item.estimated_minutes} min
            {item.due_at ? ` · due ${formatWallClockDateShort(item.due_at)}` : ""}
          </div>

          {item.why && (
            <p className="text-sm text-muted-foreground mt-2">{item.why}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
