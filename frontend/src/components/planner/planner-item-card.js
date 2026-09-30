"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { formatWallClockDateShort } from "@/lib/date-helpers";

export function PlannerItemCard({ item, onComplete, completing }) {
  return (
    <Card size="sm" className={item.is_overdue ? "border-destructive" : undefined}>
      <CardContent className="relative py-1.5 px-3 pr-9">
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute top-1.5 right-1.5 shrink-0"
          aria-label="Mark complete"
          disabled={completing}
          onClick={() => onComplete(item)}
        >
          <CheckIcon className="h-4 w-4" />
        </Button>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">{item.course_name}</Badge>
            {item.is_overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
          </div>

          <Link
            href={`/assignments/${item.assignment_id}`}
            className="block font-medium text-sm hover:underline truncate pr-6"
          >
            {item.title}
          </Link>

          <div className="text-xs text-muted-foreground">
            {item.due_at ? `Due ${formatWallClockDateShort(item.due_at)}` : "No due date"}
          </div>

          {item.reason && (
            <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
