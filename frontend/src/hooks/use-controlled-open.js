import { useState } from "react";

// Lets a Dialog work both standalone (manages its own open state, shows its
// own trigger) and driven externally (parent passes open/onOpenChange and a
// `trigger={null}` to suppress the built-in trigger button).
export function useControlledOpen(openProp, onOpenChangeProp) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;

  return [isControlled ? openProp : internalOpen, isControlled ? onOpenChangeProp : setInternalOpen];
}
