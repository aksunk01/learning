"use client";

import * as React from "react";

const ORDER_STORAGE_KEY = "kanban_column_order";
const VISIBILITY_STORAGE_KEY = "kanban_column_visibility";

export const DEFAULT_KANBAN_COLUMNS = ["overdue", "in_progress", "upcoming", "completed"];

const DEFAULT_VISIBILITY = Object.fromEntries(DEFAULT_KANBAN_COLUMNS.map((key) => [key, true]));

const KanbanColumnsContext = React.createContext({
  order: DEFAULT_KANBAN_COLUMNS,
  setOrder: () => {},
  moveColumn: () => {},
  visibility: DEFAULT_VISIBILITY,
  setColumnVisible: () => {},
  visibleOrder: DEFAULT_KANBAN_COLUMNS,
});

function sanitizeOrder(value) {
  if (!Array.isArray(value)) return DEFAULT_KANBAN_COLUMNS;

  const known = value.filter((key) => DEFAULT_KANBAN_COLUMNS.includes(key));
  const missing = DEFAULT_KANBAN_COLUMNS.filter((key) => !known.includes(key));
  const deduped = [...new Set([...known, ...missing])];

  return deduped.length === DEFAULT_KANBAN_COLUMNS.length ? deduped : DEFAULT_KANBAN_COLUMNS;
}

function sanitizeVisibility(value) {
  if (!value || typeof value !== "object") return DEFAULT_VISIBILITY;

  return Object.fromEntries(
    DEFAULT_KANBAN_COLUMNS.map((key) => [key, key in value ? !!value[key] : true])
  );
}

export function KanbanColumnsProvider({ children }) {
  const [order, setOrderState] = React.useState(DEFAULT_KANBAN_COLUMNS);
  const [visibility, setVisibilityState] = React.useState(DEFAULT_VISIBILITY);

  React.useEffect(() => {
    try {
      const storedOrder = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY));
      if (storedOrder) setOrderState(sanitizeOrder(storedOrder));
    } catch {
      // Keep default order if stored value is missing or malformed
    }

    try {
      const storedVisibility = JSON.parse(localStorage.getItem(VISIBILITY_STORAGE_KEY));
      if (storedVisibility) setVisibilityState(sanitizeVisibility(storedVisibility));
    } catch {
      // Keep default visibility if stored value is missing or malformed
    }
  }, []);

  const setOrder = React.useCallback((value) => {
    setOrderState((current) => {
      const next = sanitizeOrder(typeof value === "function" ? value(current) : value);
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveColumn = React.useCallback((fromIndex, toIndex) => {
    setOrderState((current) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.length ||
        toIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setColumnVisible = React.useCallback((key, visible) => {
    setVisibilityState((current) => {
      const next = { ...current, [key]: visible };
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const visibleOrder = React.useMemo(
    () => order.filter((key) => visibility[key] !== false),
    [order, visibility]
  );

  const contextValue = React.useMemo(
    () => ({ order, setOrder, moveColumn, visibility, setColumnVisible, visibleOrder }),
    [order, setOrder, moveColumn, visibility, setColumnVisible, visibleOrder]
  );

  return (
    <KanbanColumnsContext.Provider value={contextValue}>
      {children}
    </KanbanColumnsContext.Provider>
  );
}

export function useKanbanColumns() {
  return React.useContext(KanbanColumnsContext);
}
