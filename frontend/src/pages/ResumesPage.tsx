import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../components';
import { apiClient, APIError } from '../services/api';
import { ResumeResponse } from '../types/api';

export function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadResumes = async () => {
    setIsLoading(true);
    setError('');
    try {
      setResumes(await apiClient.getResumes());
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to load resumes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleViewResume = async (resume: ResumeResponse) => {
    const resumeWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!resumeWindow) {
      setError('Your browser blocked the resume tab. Please allow pop-ups and try again.');
      return;
    }

    try {
      const file = await apiClient.getResumeFile(resume.id);
      const fileUrl = URL.createObjectURL(file);
      resumeWindow.location.href = fileUrl;
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch (err) {
      resumeWindow.close();
      setError(err instanceof APIError ? err.message : 'Could not open resume');
    }
  };

  const handleDeleteResume = async (resume: ResumeResponse) => {
    if (!window.confirm(`Delete ${resume.original_filename || 'this resume'}?`)) return;

    setDeletingId(resume.id);
    setError('');
    try {
      await apiClient.deleteResume(resume.id);
      setResumes(currentResumes => currentResumes.filter(item => item.id !== resume.id));
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to delete resume');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-dark-base">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-10">
          <div>
            <h1 className="text-4xl font-bold text-text-primary mb-2">Your Resumes</h1>
            <p className="text-text-secondary">Manage the resumes available when you begin an interview.</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/resume-upload')}>Upload Resume</Button>
        </div>

        {error && <ErrorMessage message={error} onRetry={loadResumes} onDismiss={() => setError('')} />}

        {resumes.length === 0 ? (
          <Card className="border-border-subtle py-12 text-center">
            <p className="text-text-primary text-lg font-medium mb-2">No resumes uploaded</p>
            <p className="text-text-tertiary text-sm mb-6">Upload a resume to get personalized interview questions.</p>
            <Button variant="secondary" onClick={() => navigate('/resume-upload')}>Upload Resume</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {resumes.map(resume => (
              <Card key={resume.id} className="border-border-subtle px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">{resume.original_filename || 'Untitled resume'}</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Uploaded {new Date(resume.uploaded_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewResume(resume)}>View Resume</Button>
                    <Button
                      variant="secondary"
                      isLoading={deletingId === resume.id}
                      disabled={deletingId !== null}
                      onClick={() => handleDeleteResume(resume)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}