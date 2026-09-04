import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, APIError } from '../services/api';
import { Button, Input, Card, ErrorMessage, LoadingSpinner } from '../components';
import { ResumeResponse } from '../types/api';

function getDisplayFileName(resume: ResumeResponse) {
  if (resume.original_filename) {
    return resume.original_filename;
  }

  return 'Filename unavailable';
}

export function StartInterviewPage() {
  const [resumes, setResumes] = useState<ResumeResponse[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const resumesData = await apiClient.getResumes();
      setResumes(resumesData);
      setSelectedResumeId(resumesData.length > 0 ? resumesData[0].id : null);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to load resumes';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!targetRole.trim()) {
      setError('Please enter a target role');
      return;
    }

    setIsStarting(true);
    try {
      // Create interview
      const interview = await apiClient.createInterview(targetRole, selectedResumeId || undefined);

      // Generate questions
      await apiClient.generateQuestions(interview.id);

      // Navigate to interview screen
      navigate(`/interview/${interview.id}`);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to start interview';
      setError(message);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-dark-base">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-10">
          <p className="text-text-secondary text-sm mb-2">Ready?</p>
          <h1 className="text-4xl font-bold text-text-primary mb-3">Begin a new interview</h1>
          <p className="text-text-tertiary">5 questions tailored to your target role and experience.</p>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError('')}
          />
        )}

        <Card className="space-y-8">
          <form onSubmit={handleStart} className="space-y-6">
            {resumes.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-4">
                  Which resume would you like to use?
                </label>
                <div className="space-y-3">
                  {resumes.map(resume => (
                    <label
                      key={resume.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedResumeId === resume.id
                          ? 'border-accent-primary bg-dark-elevated'
                          : 'border-border-subtle hover:bg-dark-hover hover:border-accent-primary'
                      }`}
                    >
                      <input
                        type="radio"
                        name="resume"
                        value={resume.id}
                        checked={selectedResumeId === resume.id}
                        onChange={(e) => setSelectedResumeId(Number(e.target.value))}
                        disabled={isStarting}
                        className="sr-only peer"
                      />
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border-normal peer-checked:border-accent-primary peer-checked:bg-accent-primary">
                        <span className="h-2 w-2 rounded-full bg-dark-base opacity-0 peer-checked:opacity-100" />
                      </span>
                      <span className="ml-3 min-w-0 truncate text-text-primary font-medium">
                        {getDisplayFileName(resume)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Input
              type="text"
              label="What role are you interviewing for?"
              placeholder="e.g., Senior Backend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              disabled={isStarting}
              required
            />

            <div className="bg-dark-elevated border border-accent-primary border-opacity-20 rounded-lg p-5">
              <p className="text-sm text-text-secondary leading-relaxed">
                <span className="font-semibold text-text-primary">Here's how it works:</span> We'll generate 5 personalized questions based on your target role and resume. You can answer them at your own pace, and you'll get AI-powered feedback after each one.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isStarting}
              className="w-full"
            >
              {isStarting ? 'Generating questions...' : 'Let\'s do this →'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
