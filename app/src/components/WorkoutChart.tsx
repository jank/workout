"use client";

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';

interface ChartPoint {
  t: number;
  w: number;
  hr: number;
  p: number;
}

interface Track {
  title: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  trackNumber: number;
  trackId: number;
  scaledStart?: number;
  scaledEnd?: number;
}

export interface ActiveTrackInfo {
  title: string;
  trackNumber: number;
  trackId: number;
  scaledStart: number;
  scaledEnd: number;
  progress: number;
}

interface WorkoutChartProps {
  data: ChartPoint[];
  tracks: Track[];
  collectionId?: number;
  onActiveTrackChange?: (track: ActiveTrackInfo | null) => void;
}

type LeftAxisMetric = 'watts' | 'pace';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatPace = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Colors for alternating track segments
const TRACK_COLORS = [
  'rgb(64, 64, 64)',
  'rgb(82, 82, 82)',
];

export default function WorkoutChart({ data, tracks, collectionId, onActiveTrackChange }: WorkoutChartProps) {
  const [activeTime, setActiveTime] = useState<number | null>(null);
  const [hoveredTimelineIndex, setHoveredTimelineIndex] = useState<number | null>(null);
  const [leftAxisMetric, setLeftAxisMetric] = useState<LeftAxisMetric>('watts');
  const pendingTimeRef = useRef<number | null>(null);

  // Update activeTime from ref after render to avoid setState during render
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingTimeRef.current !== activeTime) {
        setActiveTime(pendingTimeRef.current);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [activeTime]);

  const optimizedData = useMemo(() => {
    return data.filter((_, i) => i % 5 === 0);
  }, [data]);

  const workoutDuration = data.length > 0 ? data[data.length - 1].t : 0;
  const albumDuration = tracks.length > 0 ? tracks[tracks.length - 1].endTime : 0;

  const scaledTracks = useMemo(() => {
    if (albumDuration === 0) return tracks;
    const scale = workoutDuration / albumDuration;
    return tracks.map(track => ({
      ...track,
      scaledStart: track.startTime * scale,
      scaledEnd: track.endTime * scale,
    }));
  }, [tracks, workoutDuration, albumDuration]);

  // Track from hovering over chart
  const hoveredTrack = useMemo(() => {
    if (activeTime === null) return null;
    return scaledTracks.find(
      track => track.scaledStart !== undefined &&
               track.scaledEnd !== undefined &&
               activeTime >= track.scaledStart &&
               activeTime < track.scaledEnd
    ) || null;
  }, [activeTime, scaledTracks]);

  // Track from hovering over timeline
  const timelineHoveredTrack = hoveredTimelineIndex !== null ? scaledTracks[hoveredTimelineIndex] : null;

  // Active track is timeline-hovered or chart-hovered
  const activeTrack = timelineHoveredTrack || hoveredTrack;

  // Calculate progress through current track
  const trackProgress = useMemo(() => {
    if (!activeTrack || activeTime === null || activeTrack.scaledStart === undefined || activeTrack.scaledEnd === undefined) return 0;
    const trackDuration = activeTrack.scaledEnd - activeTrack.scaledStart;
    return ((activeTime - activeTrack.scaledStart) / trackDuration) * 100;
  }, [activeTrack, activeTime]);

  // Notify parent of active track changes
  useEffect(() => {
    if (onActiveTrackChange) {
      if (activeTrack && activeTrack.scaledStart !== undefined && activeTrack.scaledEnd !== undefined) {
        onActiveTrackChange({
          title: activeTrack.title,
          trackNumber: activeTrack.trackNumber,
          trackId: activeTrack.trackId,
          scaledStart: activeTrack.scaledStart,
          scaledEnd: activeTrack.scaledEnd,
          progress: trackProgress,
        });
      } else {
        onActiveTrackChange(null);
      }
    }
  }, [activeTrack, trackProgress, onActiveTrackChange]);

  // Handle chart click to open Apple Music
  const handleChartClick = () => {
    if (hoveredTrack && collectionId && hoveredTrack.trackId) {
      const url = `https://music.apple.com/de/album/${collectionId}?i=${hoveredTrack.trackId}`;
      window.open(url, '_blank');
    }
  };

  const leftAxisConfig = {
    watts: {
      dataKey: 'w',
      stroke: 'var(--neon-blue)',
      label: 'Watts',
      domain: undefined as [string, string] | undefined,
      tickFormatter: (v: number) => `${v}`,
      reversed: false
    },
    pace: {
      dataKey: 'p',
      stroke: 'var(--neon-amber)',
      label: 'Pace /500m',
      domain: undefined as [string, string] | undefined,
      tickFormatter: (v: number) => formatPace(v),
      reversed: true
    }
  };

  const currentConfig = leftAxisConfig[leftAxisMetric];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Controls Row */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-neutral-500 uppercase">Left Axis:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setLeftAxisMetric('watts')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              leftAxisMetric === 'watts'
                ? 'bg-[var(--neon-blue)] text-black font-semibold'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            Watts
          </button>
          <button
            onClick={() => setLeftAxisMetric('pace')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              leftAxisMetric === 'pace'
                ? 'bg-[var(--neon-amber)] text-black font-semibold'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            Pace
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <div className="h-[400px] w-full outline-none" tabIndex={-1}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={optimizedData}
            margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
            onMouseLeave={() => { pendingTimeRef.current = null; setActiveTime(null); }}
            onClick={handleChartClick}
            style={{ cursor: hoveredTrack ? 'pointer' : 'default' }}
          >
            <defs>
              <linearGradient id="colorWatts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--neon-blue)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--neon-blue)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={formatTime}
              stroke="#666"
              tick={{fontSize: 12}}
              minTickGap={60}
            />
            <YAxis
              yAxisId="left"
              stroke={currentConfig.stroke}
              label={{ value: currentConfig.label, angle: -90, position: 'insideLeft', fill: '#666' }}
              domain={currentConfig.domain}
              tickFormatter={currentConfig.tickFormatter}
              reversed={currentConfig.reversed}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--neon-red)"
              domain={['dataMin - 10', 'dataMax + 10']}
              label={{ value: 'HR', angle: 90, position: 'insideRight', fill: '#666' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
              labelFormatter={(label) => {
                pendingTimeRef.current = label as number;
                return formatTime(label as number);
              }}
              formatter={(value, name) => {
                const v = value as number;
                if (name === 'p') return [formatPace(v), 'Pace'];
                if (name === 'w') return [`${v}W`, 'Watts'];
                if (name === 'hr') return [`${v} bpm`, 'HR'];
                return [v, name];
              }}
            />

            {/* Highlight active track area */}
            {activeTrack && activeTrack.scaledStart !== undefined && activeTrack.scaledEnd !== undefined && (
              <ReferenceArea
                yAxisId="left"
                x1={activeTrack.scaledStart}
                x2={activeTrack.scaledEnd}
                fill="#FF9F1C"
                fillOpacity={0.2}
                stroke="#FF9F1C"
                strokeWidth={1}
              />
            )}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={currentConfig.dataKey}
              stroke={currentConfig.stroke}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={500}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="hr"
              stroke="var(--neon-red)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Song Timeline - aligned with chart */}
      <div
        className="w-full"
        style={{ marginLeft: '65px', marginRight: '65px', width: 'calc(100% - 130px)' }}
        onMouseLeave={() => setHoveredTimelineIndex(null)}
      >
        <div className="flex h-6 rounded overflow-hidden">
          {scaledTracks.map((track, i) => {
            const widthPct = ((track.scaledEnd! - track.scaledStart!) / workoutDuration) * 100;
            const isHovered = hoveredTimelineIndex === i || hoveredTrack?.title === track.title;

            const handleClick = () => {
              if (collectionId && track.trackId) {
                const url = `https://music.apple.com/de/album/${collectionId}?i=${track.trackId}`;
                window.open(url, '_blank');
              }
            };

            return (
              <div
                key={i}
                onClick={handleClick}
                onMouseEnter={() => setHoveredTimelineIndex(i)}
                className="relative h-full cursor-pointer transition-all duration-150"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: isHovered ? 'var(--neon-amber)' : TRACK_COLORS[i % 2],
                }}
                title={`${track.trackNumber}. ${track.title}`}
              >
                {/* Track number indicator */}
                <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-medium ${
                  isHovered ? 'text-black' : 'text-neutral-500'
                }`}>
                  {widthPct > 3 ? track.trackNumber : ''}
                </span>
              </div>
            );
          })}
        </div>
        {/* Time markers */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-neutral-600">0:00</span>
          <span className="text-[10px] text-neutral-600">{formatTime(workoutDuration)}</span>
        </div>
      </div>
    </div>
  );
}
