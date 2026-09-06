import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, APIError } from '../services/api';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../components';
import { InterviewResponse } from '../types/api';

export function DashboardPage() {
  const [inProgressInterviews, setInProgressInterviews] = useState<InterviewResponse[]>([]);
  const [completedInterviews, setCompletedInterviews] = useState<InterviewResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [recentInProgress, recentCompleted] = await Promise.all([
        apiClient.getInterviews('IN_PROGRESS', 4),
        apiClient.getInterviews('COMPLETED', 4),
      ]);
      setInProgressInterviews(recentInProgress);
      setCompletedInterviews(recentCompleted);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const visibleInProgress = inProgressInterviews.slice(0, 3);
  const visibleCompleted = completedInterviews.slice(0, 3);
  const hasMoreInProgress = inProgressInterviews.length > 3;
  const hasMoreCompleted = completedInterviews.length > 3;
  const hasInterviews = inProgressInterviews.length > 0 || completedInterviews.length > 0;

  return (
    <div className="min-h-screen bg-dark-base">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Ready to practice?</h1>
          <p className="text-text-secondary">Let's improve your interview skills.</p>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onRetry={loadData}
          />
        )}

        <div className="mb-10">
          <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-3">Quick actions</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigate('/start-interview')}>Start New Interview</Button>
            <Button variant="secondary" onClick={() => navigate('/resume-upload')}>Upload Resume</Button>
            {completedInterviews.length > 0 && (
              <Button variant="secondary" onClick={() => navigate('/analytics')}>View Analytics</Button>
            )}
            {(completedInterviews.length > 0 || inProgressInterviews.length > 0) && (
              <Button variant="secondary" onClick={() => navigate('/history')}>View History</Button>
            )}
          </div>
        </div>

        {/* Main CTA Section */}
        <div className="mb-12 space-y-6">
          {/* Resume Upload */}
          <Card className="border-border-normal">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Resume</p>
                <p className="text-lg font-medium text-text-primary">Upload a resume</p>
                <p className="text-text-secondary text-sm mt-1">Upload a resume to get personalized interview questions.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/resumes')}
                  className="mt-3 -ml-3"
                >
                  Your Resumes →
                </Button>
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/resume-upload')}
              >
                Upload
              </Button>
            </div>
          </Card>

          {/* Primary CTA */}
          <Card className="border-border-normal bg-dark-elevated bg-opacity-50">
            <div className="mb-6">
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Start</p>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Begin a new interview
              </h2>
              <p className="text-text-secondary">
                We'll generate tailored questions based on your target role and resume.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/start-interview')}
              className="w-full"
            >
              Let's do this →
            </Button>
          </Card>
        </div>

        {/* Previous Interviews */}
        {hasInterviews && (
          <div className="space-y-4">
            {/* Analytics Card - Only show if completed interviews exist */}
            {completedInterviews.length > 0 && (
              <div className="mb-6">
                <Card className="border-border-normal bg-dark-elevated bg-opacity-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Insights</p>
                      <p className="text-lg font-medium text-text-primary">View your performance</p>
                      <p className="text-text-secondary text-sm mt-1">Track your progress and identify areas for improvement.</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => navigate('/analytics')}
                    >
                      Analytics
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {visibleInProgress.length > 0 && (
              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">Recent In-Progress Interviews</p>
                  {hasMoreInProgress && <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>See all →</Button>}
                </div>
                {visibleInProgress.map(interview => (
                  <button
                    key={interview.id}
                    type="button"
                    className="w-full text-left border border-border-normal rounded-md p-6 hover:border-accent-primary hover:bg-dark-surface focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
                    onClick={() => navigate(`/interview/${interview.id}`)}
                  >
                    <p className="font-semibold text-text-primary text-lg">{interview.target_role}</p>
                    <p className="text-text-tertiary text-sm mt-1">In progress · {interview.answered_question_count || 0}/{interview.question_count || 0} questions answered</p>
                    <span className="inline-block text-accent-primary text-sm font-medium mt-4">Resume interview →</span>
                  </button>
                ))}
              </section>
            )}

            {visibleCompleted.length > 0 && (
              <section className="space-y-3 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">Recent Completed Interviews</p>
                  {hasMoreCompleted && <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>See all →</Button>}
                </div>
                {visibleCompleted.map(interview => (
                  <button
                    key={interview.id}
                    type="button"
                    className="w-full text-left bg-dark-surface border border-border-normal rounded-md p-6 hover:border-accent-primary hover:bg-dark-hover focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
                    onClick={() => navigate(`/results/${interview.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-text-primary text-lg">{interview.target_role}</p>
                        <p className="text-text-tertiary text-sm mt-1">{new Date(interview.completed_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-accent-primary">{interview.overall_score}</p>
                        <p className="text-xs text-text-tertiary mt-1">Score</p>
                      </div>
                    </div>
                  </button>
                ))}
              </section>
            )}
          </div>
        )}

        {!hasInterviews && (
          <Card className="text-center py-16 border-border-subtle">
            <p className="text-text-primary text-lg font-medium mb-3">No interviews yet</p>
            <p className="text-text-tertiary">Your first one is probably going to feel awkward.</p>
            <p className="text-text-tertiary">That's kind of the point.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

