import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient, APIError } from '../services/api';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../components';
import { InterviewResultsResponse } from '../types/api';

export function ResultsPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();

  const [results, setResults] = useState<InterviewResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  useEffect(() => {
    loadResults();
  }, [interviewId]);

  const loadResults = async () => {
    if (!interviewId) return;
    setIsLoading(true);
    setError('');
    try {
      const resultsData = await apiClient.getInterviewResults(Number(interviewId));
      setResults(resultsData);
      // Expand first question by default
      if (resultsData.questions.length > 0) {
        setExpandedQuestionId(resultsData.questions[0].question_id);
      }
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to load results';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-dark-base flex items-center justify-center px-4">
        <ErrorMessage
          message="Could not load results. Please try again."
          onRetry={loadResults}
        />
      </div>
    );
  }

  const averageCorrectness = results.questions
    .filter(q => q.evaluation?.correctness_score !== null)
    .reduce((sum, q) => sum + (q.evaluation?.correctness_score || 0), 0) /
    (results.questions.filter(q => q.evaluation?.correctness_score !== null).length || 1);

  const averageCommunication = results.questions
    .filter(q => q.evaluation?.communication_score !== null)
    .reduce((sum, q) => sum + (q.evaluation?.communication_score || 0), 0) /
    (results.questions.filter(q => q.evaluation?.communication_score !== null).length || 1);

  return (
    <div className="min-h-screen bg-dark-base">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError('')}
          />
        )}

        {/* Header - Overall Score */}
        <div className="text-center mb-16">
          <p className="text-text-secondary text-lg mb-4">Here's how you did.</p>
          <div className="space-y-2">
            <div className="text-7xl font-bold text-accent-primary">
              {results.overall_score}
            </div>
            <p className="text-text-tertiary text-lg">out of 100</p>
          </div>
        </div>

        {/* Interview Summary */}
        <Card className="mb-12 border-border-normal">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">Role</p>
              <p className="text-lg font-semibold text-text-primary mt-2">{results.target_role}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">Questions</p>
              <p className="text-lg font-semibold text-text-primary mt-2">{results.questions.length}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">Date</p>
              <p className="text-lg font-semibold text-text-primary mt-2">
                {new Date(results.completed_at || '').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </Card>

        {/* Score Breakdown */}
        <div className="mb-12">
          <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-4">Average Scores</p>
          <div className="grid grid-cols-2 gap-6">
            <Card className="border-border-normal">
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">
                Correctness
              </p>
              <p className="text-4xl font-bold text-accent-primary mt-3">
                {Math.round(averageCorrectness)}
              </p>
            </Card>
            <Card className="border-border-normal">
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">
                Communication
              </p>
              <p className="text-4xl font-bold text-status-success mt-3">
                {Math.round(averageCommunication)}
              </p>
            </Card>
          </div>
        </div>

        {/* Questions Breakdown - Accordion */}
        <div className="mb-12">
          <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-5">Question Breakdown</p>
          <div className="space-y-3">
            {results.questions.map((question, idx) => {
              const isExpanded = expandedQuestionId === question.question_id;
              const avgScore = question.evaluation
                ? Math.round(
                    ((question.evaluation.correctness_score || 0) +
                      (question.evaluation.communication_score || 0)) / 2
                  )
                : null;

              return (
                <div
                  key={question.question_id}
                  className={`border transition-all duration-200 rounded-lg overflow-hidden ${
                    isExpanded
                      ? 'border-accent-primary bg-dark-elevated'
                      : 'border-border-subtle bg-dark-surface hover:border-border-normal'
                  } cursor-pointer`}
                  onClick={() =>
                    setExpandedQuestionId(isExpanded ? null : question.question_id)
                  }
                >
                  {/* Accordion Header */}
                  <div className="px-6 py-5 flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">
                        Question {idx + 1}
                      </p>
                      <p className="text-text-primary font-medium leading-relaxed">
                        {question.question_text}
                      </p>
                    </div>

                    {/* Score and Chevron Container */}
                    <div className="ml-4 flex flex-col items-end flex-shrink-0">
                      {avgScore !== null && (
                        <div className="text-right mb-3">
                          <p className="text-2xl font-bold text-accent-primary">
                            {avgScore}
                          </p>
                          <p className="text-xs text-text-tertiary">Score</p>
                        </div>
                      )}

                      {/* Chevron Icon */}
                      <div
                        className={`transition-transform duration-300 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      >
                        <svg
                          className="w-5 h-5 text-text-tertiary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content - Expanded View */}
                  {isExpanded && (
                    <div className="px-6 py-6 border-t border-border-subtle space-y-6 animate-fadeIn">
                      {/* Answer */}
                      <div>
                        <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-3">
                          Your Answer
                        </p>
                        {question.answer ? (
                          <p className="text-text-primary leading-relaxed">
                            {question.answer.transcript}
                          </p>
                        ) : (
                          <p className="text-text-tertiary text-sm italic">No answer recorded</p>
                        )}
                      </div>

                      {/* Scores and Feedback */}
                      {question.evaluation ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-dark-base border border-border-subtle rounded-lg p-4">
                              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">
                                Correctness
                              </p>
                              <p className="text-3xl font-bold text-accent-primary mt-3">
                                {question.evaluation.correctness_score}
                              </p>
                            </div>
                            <div className="bg-dark-base border border-border-subtle rounded-lg p-4">
                              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">
                                Communication
                              </p>
                              <p className="text-3xl font-bold text-status-success mt-3">
                                {question.evaluation.communication_score}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-3">
                              Feedback
                            </p>
                            <p className="text-text-primary leading-relaxed text-sm">
                              {question.evaluation.feedback}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-text-tertiary text-sm italic">Evaluation not available</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <Card className="border-border-subtle text-center py-8">
          <p className="text-text-secondary mb-6">Ready for another round?</p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Back to dashboard →
          </Button>
        </Card>
      </div>
    </div>
  );
}
