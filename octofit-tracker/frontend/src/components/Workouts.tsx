import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Workout = {
  title?: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ suggestions: Workout[] }>('/api/workouts/suggestions/mona%40example.com')
      .then((data) => setSuggestions(data.suggestions))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load workout suggestions'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      loading={loading}
      error={error}
      empty={suggestions.length === 0}
      emptyText="No workout suggestions found."
    >
      <ul className="list-group">
        {suggestions.map((workout, index) => (
          <li className="list-group-item" key={index}>
            <strong>{workout.title}</strong>
            {workout.reason && <> - {workout.reason}</>}
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
