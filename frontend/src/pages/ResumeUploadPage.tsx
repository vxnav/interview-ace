import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, APIError } from '../services/api';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../components';
import { ResumeResponse } from '../types/api';

export function ResumeUploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resume, setResume] = useState<ResumeResponse | null>(null);
  const [resumeCount, setResumeCount] = useState<number | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const hasReachedResumeLimit = resumeCount !== null && resumeCount >= 10;

  useEffect(() => {
    const loadResumeCount = async () => {
      try {
        const resumes = await apiClient.getResumes();
        setResumeCount(resumes.length);
      } catch (err) {
        setError(err instanceof APIError ? err.message : 'Failed to load resume information');
      }
    };
    loadResumeCount();
  }, []);

  const handleFile = async (file: File) => {
    if (hasReachedResumeLimit) {
      setError('You\'ve reached the 10-resume limit. Delete a resume to upload another.');
      return;
    }
    setError('');
    setSelectedFileName(file.name);

    // Validate file type
    const acceptedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!acceptedTypes.includes(file.type)) {
      setError('Please upload a PDF, Word document, or text file');
      return;
    }

    setIsLoading(true);
    try {
      const uploadedResume = await apiClient.uploadResume(file);
      setResume(uploadedResume);
      setResumeCount(currentCount => currentCount === null ? currentCount : currentCount + 1);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-dark-base">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Upload your resume</h1>
          <p className="text-text-secondary">We'll use it to make the questions actually relevant to you.</p>
          {resumeCount !== null && <p className="text-sm text-text-tertiary mt-2">{resumeCount} / 10 resumes</p>}
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError('')}
          />
        )}

        {!resume && hasReachedResumeLimit ? (
          <Card className="border-border-normal py-10 text-center">
            <p className="text-text-primary font-medium mb-2">Resume limit reached</p>
            <p className="text-text-secondary text-sm mb-5">You've reached the 10-resume limit. Delete a resume to upload another.</p>
            <Button variant="secondary" onClick={() => navigate('/resumes')}>View Your Resumes</Button>
          </Card>
        ) : !resume ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`bg-dark-surface border border-border-subtle rounded-lg p-6 text-center py-16 cursor-pointer border-2 border-dashed transition-all ${
              isDragging ? 'border-accent-primary bg-dark-elevated' : 'border-border-normal'
            }`}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (!isLoading && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInput}
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              disabled={isLoading}
            />

            {isLoading ? (
              <div className="space-y-3">
                <LoadingSpinner />
                <p className="text-sm text-text-secondary">
                  Uploading {selectedFileName}...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <svg
                    className={`mx-auto h-12 w-12 transition-colors ${
                      isDragging ? 'text-accent-primary' : 'text-text-tertiary'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-text-primary mb-1">
                  {isDragging ? 'Drop your resume here' : 'Drag your resume here'}
                </p>
                <p className="text-text-secondary text-sm mb-3">
                  or click to browse files
                </p>
                {selectedFileName && (
                  <p className="text-sm text-accent-primary mb-3">{selectedFileName}</p>
                )}
                <p className="text-xs text-text-tertiary">
                  PDF, DOC, DOCX, or TXT
                </p>
              </>
            )}
          </div>
        ) : (
          <Card className="text-center">
            <div className="mb-6">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-status-success bg-opacity-20">
                <svg className="h-7 w-7 text-status-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-1">Resume ready</h3>
              <p className="text-text-secondary text-sm">
                {resume.original_filename || 'Filename unavailable'}
              </p>
            </div>

            {resume.parsed_data && (
              <div className="mb-6 text-left bg-dark-elevated rounded-lg p-4 border border-border-subtle">
                <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-3">
                  Parsed Information
                </p>
                <pre className="text-xs text-text-secondary overflow-auto max-h-40 font-mono">
                  {JSON.stringify(resume.parsed_data, null, 2)}
                </pre>
              </div>
            )}

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/start-interview')}
                className="w-full"
              >
                Continue →
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setResume(null);
                  setError('');
                }}
                className="w-full"
              >
                Try a different resume
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

