import * as types from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if it exists
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Request failed with status ${response.status}`;
    throw new APIError(response.status, errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const apiClient = {
  // Auth
  async register(data: types.RegisterRequest): Promise<types.UserResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: types.LoginRequest): Promise<types.TokenResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Resumes
  async uploadResume(file: File): Promise<types.ResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE_URL}/resumes`;
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `Upload failed`;
      throw new APIError(response.status, errorMessage);
    }

    return response.json();
  },

  async getResumes(): Promise<types.ResumeResponse[]> {
    return request('/resumes', { method: 'GET' });
  },

  async getResumeFile(resumeId: number): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(response.status, errorData.detail || 'Could not open resume');
    }

    return response.blob();
  },

  async deleteResume(resumeId: number): Promise<void> {
    return request(`/resumes/${resumeId}`, { method: 'DELETE' });
  },

  // Interviews
  async createInterview(targetRole: string, resumeId?: number): Promise<types.InterviewResponse> {
    return request('/interviews', {
      method: 'POST',
      body: JSON.stringify({
        target_role: targetRole,
        resume_id: resumeId || null,
      }),
    });
  },

  async getInterviews(): Promise<types.InterviewResponse[]> {
    return request('/interviews', { method: 'GET' });
  },

  async getInterview(interviewId: number): Promise<types.InterviewResponse> {
    return request(`/interviews/${interviewId}`, { method: 'GET' });
  },

  async updateInterviewStatus(
    interviewId: number,
    status: 'IN_PROGRESS'
  ): Promise<types.InterviewResponse> {
    return request(`/interviews/${interviewId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getInterviewQuestions(interviewId: number): Promise<types.InterviewQuestionResponse[]> {
    return request(`/interviews/${interviewId}/questions`, { method: 'GET' });
  },

  async generateQuestions(interviewId: number): Promise<types.GenerateQuestionsResponse> {
    return request(`/interviews/${interviewId}/generate-questions`, { method: 'POST' });
  },

  async submitAnswer(questionId: number, transcript: string): Promise<types.AnswerResponse> {
    return request(`/questions/${questionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  },

  async submitAudioAnswer(questionId: number, audio: Blob): Promise<types.AnswerResponse> {
    const formData = new FormData();
    const extension = audio.type.split('/')[1]?.split(';')[0] || 'webm';
    formData.append('audio', audio, `recording.${extension}`);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/audio-answer`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(response.status, errorData.detail || 'Audio upload failed');
    }

    return response.json();
  },

  async getAnswer(questionId: number): Promise<types.AnswerResponse> {
    return request(`/questions/${questionId}/answer`, { method: 'GET' });
  },

  async updateAnswer(answerId: number, transcript: string): Promise<types.AnswerResponse> {
    return request(`/answers/${answerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ transcript }),
    });
  },

  async evaluateAnswer(answerId: number): Promise<types.EvaluationResponse> {
    return request(`/answers/${answerId}/evaluate`, { method: 'POST' });
  },

  async completeInterview(interviewId: number): Promise<types.CompleteInterviewResponse> {
    return request(`/interviews/${interviewId}/complete`, { method: 'POST' });
  },

  async getInterviewResults(interviewId: number): Promise<types.InterviewResultsResponse> {
    return request(`/interviews/${interviewId}/results`, { method: 'GET' });
  },

  async getAnalytics(): Promise<types.AnalyticsResponse> {
    return request('/analytics', { method: 'GET' });
  },
};

export { APIError };
