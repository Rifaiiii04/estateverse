"use client";

import React from "react";
import type { TourRoom } from "@/types/tour";

interface RoomSelectorProps {
  rooms: TourRoom[];
  currentId: number;
  onSelect: (id: number) => void;
}

// RoomSelector lists rooms as keyboard-accessible chips so visitors can jump directly to any room.
export function RoomSelector({ rooms, currentId, onSelect }: RoomSelectorProps) {
  return (
    <nav aria-label="Daftar ruangan tur 360°" className="absolute bottom-3 inset-x-3">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {rooms.map((room) => {
          const isActive = room.id === currentId;
          return (
            <li key={room.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(room.id)}
                aria-current={isActive ? "true" : undefined}
                className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  isActive ? "bg-white text-neutral-950" : "bg-black/55 text-white hover:bg-black/70"
                }`}
              >
                {room.name}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
