import { notFound } from 'next/navigation';
import workouts from '@/data/generated-workouts.json';
import WorkoutDetailClient from './WorkoutDetailClient';
import type { GeneratedWorkout } from '../../../../scripts/lib/types';

export function generateStaticParams() {
  return workouts.map((workout) => ({
    id: workout.id,
  }));
}

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = workouts.find((w) => w.id === id) as GeneratedWorkout | undefined;

  if (!workout) {
    notFound();
  }

  return <WorkoutDetailClient workout={workout} />;
}
