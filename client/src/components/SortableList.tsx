/**
 * SortableList — a generic drag-to-reorder wrapper using @dnd-kit/sortable.
 *
 * Usage:
 *   <SortableList
 *     items={items}          // must have { id: number | string }
 *     onReorder={(newOrder) => saveReorder(newOrder)}
 *     renderItem={(item, dragHandleProps) => <MyCard item={item} {...dragHandleProps} />}
 *   />
 *
 * The `dragHandleProps` object contains { ref, ...listeners, ...attributes } which
 * you spread onto the drag-handle element (e.g. a GripVertical icon button).
 */

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import type { DraggableAttributes } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SortableItem {
  id: number | string;
  sortOrder?: number;
}

export interface DragHandleProps {
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  listeners: Record<string, unknown> | undefined;
  attributes: DraggableAttributes;
  isDragging: boolean;
}

interface SortableListProps<T extends SortableItem> {
  items: T[];
  onReorder: (reordered: T[]) => void;
  renderItem: (item: T, dragHandleProps: DragHandleProps) => React.ReactNode;
  className?: string;
}

// ─── Inner sortable row ─────────────────────────────────────────────────────

function SortableRow<T extends SortableItem>({
  item,
  renderItem,
}: {
  item: T;
  renderItem: (item: T, dragHandleProps: DragHandleProps) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
  };

  const dragHandleProps: DragHandleProps = {
    ref: setActivatorNodeRef,
    style: { cursor: isDragging ? "grabbing" : "grab", touchAction: "none" },
    listeners,
    attributes,
    isDragging,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(item, dragHandleProps)}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  className,
}: SortableListProps<T>) {
  const [localItems, setLocalItems] = useState<T[]>(items);

  // Sync when external items change (e.g. after server refetch)
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localItems.findIndex((i) => i.id === active.id);
    const newIndex = localItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(reordered);
    onReorder(reordered);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localItems.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={className}>
          {localItems.map((item) => (
            <SortableRow key={item.id} item={item} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
