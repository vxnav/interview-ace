import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient, APIError } from '../services/api';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../components';
import { InterviewQuestionResponse, AnswerResponse, EvaluationResponse } from '../types/api';

export function InterviewScreen() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<InterviewQuestionResponse[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerRecords, setAnswerRecords] = useState<Record<number, AnswerResponse>>({});
  const [evaluations, setEvaluations] = useState<Record<number, EvaluationResponse | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSavingExit, setIsSavingExit] = useState(false);
  const [error, setError] = useState('');
  const [showingEvaluation, setShowingEvaluation] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadQuestions();
  }, [interviewId]);

  useEffect(() => () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
    }
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
    }
  }, [recordingUrl]);

  const loadQuestions = async () => {
    if (!interviewId) return;
    setIsLoading(true);
    setError('');
    try {
      const questionsData = await apiClient.getInterviewQuestions(Number(interviewId));
      setQuestions(questionsData);

      // Load existing answers and evaluations
      const answersMap: Record<number, string> = {};
      const answerRecordsMap: Record<number, AnswerResponse> = {};
      const evaluationsMap: Record<number, EvaluationResponse | null> = {};

      for (const q of questionsData) {
        if (q.answer) {
          answersMap[q.id] = q.answer.transcript || '';
          answerRecordsMap[q.id] = q.answer;
          evaluationsMap[q.id] = q.answer.evaluation || null;
        } else {
          evaluationsMap[q.id] = null;
        }
      }

      setAnswers(answersMap);
      setAnswerRecords(answerRecordsMap);
      setEvaluations(evaluationsMap);
      const firstUnevaluatedIndex = questionsData.findIndex(
        question => !question.answer?.evaluation
      );
      setCurrentQuestionIndex(
        firstUnevaluatedIndex === -1 ? questionsData.length - 1 : firstUnevaluatedIndex
      );
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to load questions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorMessage
          message="No questions found. Please start a new interview."
          onDismiss={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id] || '';
  const currentEvaluation = evaluations[currentQuestion.id];
  const hasUnevaluatedAnswer = Boolean(answerRecords[currentQuestion.id]) && !currentEvaluation;

  const evaluateSavedAnswer = async (answer: AnswerResponse) => {
    setError('');
    setIsEvaluating(true);

    try {
      const evaluation = await apiClient.evaluateAnswer(answer.id);
      setEvaluations(previous => ({ ...previous, [currentQuestion.id]: evaluation }));
      setShowingEvaluation(true);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to evaluate answer';
      setError(`Evaluation failed. ${message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveAnswer = async () => {
    const savedAnswer = answerRecords[currentQuestion.id];
    if (!savedAnswer && !currentAnswer.trim()) {
      setError('Please provide an answer before submitting');
      return;
    }

    try {
      const answer = savedAnswer ?? await apiClient.submitAnswer(currentQuestion.id, currentAnswer);
      setAnswerRecords(previous => ({ ...previous, [currentQuestion.id]: answer }));
      setAnswers(previous => ({ ...previous, [currentQuestion.id]: answer.transcript || currentAnswer }));
      await evaluateSavedAnswer(answer);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to evaluate answer';
      setError(message);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Audio recording is not supported in this browser');
      return;
    }

    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (recordingUrl) {
          URL.revokeObjectURL(recordingUrl);
        }
        setRecordedAudio(audio);
        setRecordingUrl(URL.createObjectURL(audio));
        setIsRecording(false);
        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      recordingStreamRef.current = stream;
      setRecordedAudio(null);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(seconds => seconds + 1);
      }, 1000);
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone permission was denied'
        : 'Unable to access the microphone';
      setError(message);
    }
  };

  const handleSubmitRecording = async () => {
    const savedAnswer = answerRecords[currentQuestion.id];
    if (!savedAnswer && !recordedAudio) return;

    try {
      const answer = savedAnswer ?? await apiClient.submitAudioAnswer(currentQuestion.id, recordedAudio!);
      setAnswerRecords(previous => ({ ...previous, [currentQuestion.id]: answer }));
      setAnswers(previous => ({ ...previous, [currentQuestion.id]: answer.transcript || '' }));
      await evaluateSavedAnswer(answer);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to save recording';
      setError(message);
    }
  };

  const handleRetryEvaluation = async () => {
    const answer = answerRecords[currentQuestion.id];
    if (answer) {
      await evaluateSavedAnswer(answer);
    }
  };

  const handleNext = () => {
    setShowingEvaluation(false);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All done
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!interviewId) return;
    
    setError('');
    setIsEvaluating(true);
    try {
      await apiClient.completeInterview(Number(interviewId));
      navigate(`/results/${interviewId}`);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to complete interview';
      setError(message);
      setIsEvaluating(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (!interviewId) return;

    setError('');
    setIsSavingExit(true);
    try {
      await apiClient.updateInterviewStatus(Number(interviewId), 'IN_PROGRESS');
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to save interview progress';
      setError(message);
      setIsSavingExit(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-base flex flex-col">
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-6">
          <ErrorMessage
            message={error}
            onDismiss={() => setError('')}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full px-4 py-12">
        {/* Progress Bar - Top */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-secondary text-sm font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <button
              type="button"
              onClick={handleSaveAndExit}
              disabled={isEvaluating || isSavingExit}
              className="text-xs text-text-tertiary hover:text-accent-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingExit ? 'Saving...' : 'Save & Exit'}
            </button>
          </div>
          <div className="w-full bg-dark-elevated rounded-full h-1.5">
            <div
              className="bg-accent-primary h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        {!showingEvaluation ? (
          <>
            {/* Question */}
            <div className="mb-12">
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-4">
                {currentQuestion.topic}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* Answer Textarea */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Your answer
              </label>
              <textarea
                value={currentAnswer}
                onChange={(e) =>
                  setAnswers(prev => ({
                    ...prev,
                    [currentQuestion.id]: e.target.value,
                  }))
                }
                placeholder="Take your time. Be thoughtful and thorough."
                className="w-full h-56 px-5 py-4 bg-dark-surface border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary resize-none transition-all"
                disabled={isEvaluating}
              />
              <div className="mt-3 flex justify-between items-center">
                <p className="text-xs text-text-tertiary">
                  {currentAnswer.length} characters
                </p>
                <Button
                  variant="primary"
                  isLoading={isEvaluating}
                  onClick={handleSaveAnswer}
                  disabled={!currentAnswer.trim()}
                >
                  {hasUnevaluatedAnswer ? 'Evaluate saved answer →' : 'Submit answer →'}
                </Button>
              </div>

              {hasUnevaluatedAnswer && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-accent-primary/40 bg-dark-elevated rounded-lg p-4">
                  <p className="text-sm text-text-secondary">
                    Evaluation failed. Your answer was saved and can be retried.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={isEvaluating}
                    onClick={handleRetryEvaluation}
                  >
                    Retry evaluation
                  </Button>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border-subtle">
                <div className="flex flex-wrap items-center gap-3">
                  {!isRecording ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleStartRecording}
                      disabled={isEvaluating}
                    >
                      Start recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={stopRecording}
                    >
                      Stop recording
                    </Button>
                  )}
                  {isRecording && (
                    <p className="text-sm text-accent-primary">Recording {recordingSeconds}s</p>
                  )}
                </div>

                {recordingUrl && !isRecording && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <audio controls src={recordingUrl} />
                    <Button
                      type="button"
                      variant="primary"
                      isLoading={isEvaluating}
                      onClick={handleSubmitRecording}
                    >
                      Submit recording →
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Evaluation Display */
          currentEvaluation && (
            <div className="space-y-10">
              {/* Scores */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">
                    Correctness
                  </p>
                  <div className="text-5xl font-bold text-accent-primary">
                    {currentEvaluation.correctness_score}
                  </div>
                  <div className="w-16 h-1 bg-accent-primary rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">
                    Communication
                  </p>
                  <div className="text-5xl font-bold text-status-success">
                    {currentEvaluation.communication_score}
                  </div>
                  <div className="w-16 h-1 bg-status-success rounded-full"></div>
                </div>
              </div>

              {/* Feedback */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text-primary uppercase tracking-widest">
                  Your feedback
                </p>
                <Card className="border-border-normal">
                  <p className="text-text-primary leading-relaxed">
                    {currentEvaluation.feedback}
                  </p>
                </Card>
              </div>

              {/* Filler Words */}
              {currentEvaluation.filler_word_count !== null && currentEvaluation.filler_word_count > 0 && (
                <div className="bg-dark-elevated border border-border-subtle rounded-lg p-4">
                  <p className="text-text-secondary text-sm">
                    <span className="font-semibold">Filler words detected:</span> {currentEvaluation.filler_word_count}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="pt-6 border-t border-border-subtle">
                {currentQuestionIndex < questions.length - 1 && (
                  <Button
                    variant="primary"
                    size="lg"
                    isLoading={isEvaluating}
                    onClick={handleNext}
                    className="w-full"
                  >
                    Next question →
                  </Button>
                )}
                {currentQuestionIndex === questions.length - 1 && (
                  <Button
                    variant="primary"
                    size="lg"
                    isLoading={isEvaluating}
                    onClick={handleNext}
                    className="w-full"
                  >
                    See your results →
                  </Button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
