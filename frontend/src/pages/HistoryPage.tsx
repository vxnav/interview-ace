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

  const completedInterviews = interviews.filter(interview => interview.status === 'COMPLETED');
  const inProgressInterviews = interviews.filter(interview => interview.status === 'IN_PROGRESS');
  const notStartedInterviews = interviews.filter(interview => interview.status === 'CREATED');

  const renderInterviews = (items: InterviewResponse[], status: 'completed' | 'in-progress' | 'not-started') => (
    <div className="space-y-3">
      {items.map(interview => {
        const completed = status === 'completed';
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
                  {completed && interview.completed_at
                    ? new Date(interview.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : status === 'in-progress'
                      ? `In progress · ${interview.answered_question_count || 0}/${interview.question_count || 0} questions answered`
                      : 'Not started'}
                </p>
                {!completed && <span className="inline-block text-accent-primary text-sm font-medium mt-3">{status === 'in-progress' ? 'Resume interview →' : 'Start interview →'}</span>}
              </div>
              {completed && <span className="text-2xl font-bold text-accent-primary">{interview.overall_score}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );

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
          <div className="space-y-10">
            {completedInterviews.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-4">Completed</h2>
                {renderInterviews(completedInterviews, 'completed')}
              </section>
            )}
            {inProgressInterviews.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-4">In Progress</h2>
                {renderInterviews(inProgressInterviews, 'in-progress')}
              </section>
            )}
            {notStartedInterviews.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-4">Not Started</h2>
                {renderInterviews(notStartedInterviews, 'not-started')}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}