'use client';

import { useRouter } from 'next/navigation';

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

export default function WorkoutCard({ id, date, distance, time, albumCover, artist, album }: WorkoutCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/workout/${id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/workout/${id}`)}
      className="relative block w-full aspect-square overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-500"
    >
      {/* Background Image */}
      <img
        src={albumCover}
        alt={album}
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />

      {/* Content */}
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <div className="mb-4">
          <h3 className="text-white font-bold text-lg leading-tight">{artist}</h3>
          <p className="text-neutral-400 text-sm truncate">{album}</p>
        </div>

        <div className="flex justify-between items-end border-t border-white/10 pt-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider">Distance</p>
            <p className="text-xl font-mono text-[var(--neon-blue)]">{distance.toLocaleString()}m</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500 uppercase tracking-wider">Time</p>
            <p className="text-xl font-mono text-white">{formatDuration(time)}</p>
          </div>
        </div>

        <p className="absolute top-6 right-6 text-xs text-neutral-500 font-mono">
          {new Date(date).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
