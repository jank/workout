'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

interface WorkoutCardProps {
  id: string;
  date: string;
  distance: number;
  time: number;
  albumCover: string;
  artist: string;
  album: string;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

export default function WorkoutCard({ id, date, distance, time, albumCover, artist, album }: WorkoutCardProps) {
  const router = useRouter();
  const artRef = useRef<HTMLDivElement>(null);
  const [shine, setShine] = useState({ x: 50, y: 50, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!artRef.current) return;
    const rect = artRef.current.getBoundingClientRect();
    // Calculate mouse position as percentage (0-100)
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Mirror the position (opposite of mouse)
    setShine({ x: 100 - x, y: 100 - y, active: true });
  };

  const handleMouseLeave = () => {
    setShine({ x: 50, y: 50, active: false });
  };

  return (
    <div
      onClick={() => router.push(`/workout/${id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/workout/${id}`)}
      className="group block w-full overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-[var(--neon-blue)] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:scale-[1.02] transition-all duration-200"
    >
      {/* Album Art - Square */}
      <div
        ref={artRef}
        className="w-full aspect-square overflow-hidden relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={albumCover}
          alt={album}
          className="w-full h-full object-cover"
        />
        {/* Dynamic shine effect following mouse (mirrored) */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: shine.active ? 1 : 0,
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 25%, transparent 50%)`,
          }}
        />
      </div>

      {/* Album Info */}
      <div className="p-4 border-b border-neutral-800">
        <h3 className="text-white font-bold text-base leading-tight truncate">{album}</h3>
        <p className="text-neutral-400 text-sm truncate">{artist}</p>
      </div>

      {/* Workout Stats */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Date</p>
          <p className="text-sm text-neutral-400 font-mono">{formatDate(date)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Duration</p>
          <p className="text-sm text-white font-mono">{formatDuration(time)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Distance</p>
          <p className="text-sm text-[var(--neon-blue)] font-mono">{distance.toLocaleString()}m</p>
        </div>
      </div>
    </div>
  );
}
