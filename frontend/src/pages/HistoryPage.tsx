import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, ErrorMessage, LoadingSpinner } from '../components';
import { apiClient, APIError } from '../services/api';
import { InterviewResponse } from '../types/api';

export function HistoryPage() {
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadInterviews = async () => {
    setIsLoading(true);
    setError('');
    try {
      setInterviews(await apiClient.getInterviews());
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to load interview history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInterviews();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-dark-base">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Interview History</h1>
          <p className="text-text-secondary">Your completed and in-progress practice sessions.</p>
        </div>
        {error && <ErrorMessage message={error} onRetry={loadInterviews} onDismiss={() => setError('')} />}
        {interviews.length === 0 ? (
          <Card className="border-border-subtle py-12 text-center">
            <p className="text-text-primary text-lg font-medium mb-2">No interviews yet</p>
            <p className="text-text-tertiary text-sm">Start a practice interview when you are ready.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {interviews.map(interview => {
              const completed = interview.status === 'COMPLETED';
              return (
                <button
                  key={interview.id}
                  type="button"
                  onClick={() => navigate(completed ? `/results/${interview.id}` : `/interview/${interview.id}`)}
                  className="w-full text-left bg-dark-surface border border-border-subtle rounded-md px-6 py-5 hover:bg-dark-hover hover:border-border-normal focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text-primary text-lg">{interview.target_role}</p>
                      <p className="text-sm text-text-tertiary mt-1">
                        {completed ? 'Completed' : interview.status === 'IN_PROGRESS' ? 'In progress' : 'Not started'}
                        {completed && interview.completed_at ? ` · ${new Date(interview.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                      </p>
                    </div>
                    {completed && <span className="text-2xl font-bold text-accent-primary">{interview.overall_score}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}