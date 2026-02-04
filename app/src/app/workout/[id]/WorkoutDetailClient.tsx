"use client";

import { useState, useRef, useEffect } from 'react';
import WorkoutChart, { ActiveTrackInfo } from '@/components/WorkoutChart';
import Link from 'next/link';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import type { GeneratedWorkout } from '../../../../scripts/lib/types';

interface WorkoutDetailClientProps {
  workout: GeneratedWorkout;
}

const formatTime = (seconds: number) => {
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

export default function WorkoutDetailClient({ workout }: WorkoutDetailClientProps) {
  const [activeTrack, setActiveTrack] = useState<ActiveTrackInfo | null>(null);
  const trackRefs = useRef<Map<number, HTMLAnchorElement>>(new Map());
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active track within the list container only
  useEffect(() => {
    if (activeTrack && listContainerRef.current) {
      const trackEl = trackRefs.current.get(activeTrack.trackNumber);
      const container = listContainerRef.current;
      if (trackEl) {
        const containerRect = container.getBoundingClientRect();
        const trackRect = trackEl.getBoundingClientRect();
        const containerHeight = container.clientHeight;
        const trackOffsetInContainer = trackRect.top - containerRect.top + container.scrollTop;
        const targetScroll = trackOffsetInContainer - (containerHeight / 2) + (trackRect.height / 2);
        container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    }
  }, [activeTrack?.trackNumber]);

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
            <a
              href={workout.album.meta.collectionViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-lg overflow-hidden shadow-2xl shadow-[var(--neon-blue)]/10 group relative"
            >
                <img
                    src={workout.album.meta.coverUrl}
                    alt="Album Cover"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center gap-2">
                  <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                    Open in Apple Music
                  </span>
                </div>
            </a>

            <div className="flex-1 w-full">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-1">{workout.album.meta.artist}</h1>
                    <h2 className="text-xl text-neutral-400">{workout.album.meta.title}</h2>
                    <p className="text-sm text-neutral-500 mt-1 font-mono">{formatDate(workout.summary.date)}</p>
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
                        <p className="text-2xl font-mono text-[var(--neon-amber)]">{formatDuration(avgPace)}/500m</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="w-full bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 flex-1 min-h-[500px]">
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">Performance & Rhythm</h3>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Song List - Second on mobile, Left on desktop */}
              <div
                ref={listContainerRef}
                className="w-full md:w-[420px] shrink-0 flex flex-col gap-1 max-h-[400px] md:h-[500px] overflow-y-scroll pr-2 relative order-2 md:order-1"
              >
                {workout.album.tracks.map((track) => {
                  const isActive = activeTrack?.trackNumber === track.trackNumber;
                  const trackUrl = workout.album.meta.collectionViewUrl
                    ? `${workout.album.meta.collectionViewUrl}?i=${track.trackId}`
                    : undefined;
                  return (
                    <a
                      key={track.trackNumber}
                      href={trackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      ref={(el) => {
                        if (el) trackRefs.current.set(track.trackNumber, el);
                      }}
                      className={`group rounded-lg px-3 py-2 border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-neutral-800/50 border-neutral-700 hover:border-[var(--neon-amber)]/50'
                          : 'bg-transparent border-transparent hover:bg-neutral-800/30 hover:border-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isActive
                            ? 'bg-[var(--neon-amber)] text-black'
                            : 'bg-neutral-800 text-neutral-500 group-hover:bg-neutral-700 group-hover:text-neutral-300'
                        }`}>
                          {track.trackNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate transition-colors ${isActive ? 'text-white font-medium' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                            {track.title}
                          </p>
                          {isActive && activeTrack && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 bg-neutral-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[var(--neon-amber)]"
                                  style={{ width: `${activeTrack.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-neutral-500 tabular-nums">
                                {formatTime(activeTrack.scaledStart)} – {formatTime(activeTrack.scaledEnd)}
                              </span>
                            </div>
                          )}
                        </div>
                        <ExternalLink
                          size={14}
                          className="shrink-0 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Chart - First on mobile, Right on desktop */}
              <div className="flex-1 min-w-0 order-1 md:order-2 min-h-[400px]">
                <WorkoutChart
                  data={chartData}
                  tracks={workout.album.tracks}
                  collectionViewUrl={workout.album.meta.collectionViewUrl}
                  onActiveTrackChange={setActiveTrack}
                />
              </div>
            </div>
        </div>
      </main>
    </div>
  );
}
