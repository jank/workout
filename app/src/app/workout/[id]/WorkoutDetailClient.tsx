"use client";

import WorkoutChart from '@/components/WorkoutChart';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { GeneratedWorkout } from '../../../../scripts/lib/types';

interface WorkoutDetailClientProps {
  workout: GeneratedWorkout;
}

export default function WorkoutDetailClient({ workout }: WorkoutDetailClientProps) {
  // Zip chart data back to array of objects
  const chartData = workout.charts.time.map((t: number, i: number) => ({
    t,
    w: workout.charts.watts[i],
    hr: workout.charts.heartRate[i],
    p: workout.charts.pace[i]
  }));

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const avgPace = workout.summary.totalTime / (workout.summary.totalDistance / 500);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <nav className="p-6 border-b border-neutral-800">
        <Link href="/" className="flex items-center text-neutral-400 hover:text-white transition-colors gap-2 w-fit">
          <ChevronLeft size={20} />
          Back to Log
        </Link>
      </nav>

      <main className="flex-1 flex flex-col p-6 md:p-12 gap-8 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-lg overflow-hidden shadow-2xl shadow-[var(--neon-blue)]/10">
                <img 
                    src={workout.album.meta.coverUrl} 
                    alt="Album Cover" 
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="flex-1 w-full">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-1">{workout.album.meta.artist}</h1>
                    <h2 className="text-xl text-neutral-400">{workout.album.meta.title}</h2>
                    <p className="text-sm text-neutral-500 mt-1 font-mono">{new Date(workout.summary.date).toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                        <p className="text-xs text-neutral-500 uppercase">Distance</p>
                        <p className="text-2xl font-mono text-[var(--neon-blue)]">{workout.summary.totalDistance}m</p>
                    </div>
                    <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                        <p className="text-xs text-neutral-500 uppercase">Time</p>
                        <p className="text-2xl font-mono text-white">{formatDuration(workout.summary.totalTime)}</p>
                    </div>
                    <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                        <p className="text-xs text-neutral-500 uppercase">Avg Watts</p>
                        <p className="text-2xl font-mono text-[var(--neon-green)]">{Math.round(workout.summary.avgWatts)}w</p>
                    </div>
                    <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                        <p className="text-xs text-neutral-500 uppercase">Avg Pace</p>
                        <p className="text-2xl font-mono text-[var(--neon-purple)]">{formatDuration(avgPace)}/500m</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="w-full bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 flex-1 min-h-[500px]">
            <h3 className="text-sm font-bold text-neutral-500 mb-6 uppercase tracking-widest">Performance & Rhythm</h3>
            <WorkoutChart data={chartData} tracks={workout.album.tracks} />
        </div>
      </main>
    </div>
  );
}
