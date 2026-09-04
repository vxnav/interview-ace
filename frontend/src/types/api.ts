// API types and interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface ResumeResponse {
  id: number;
  user_id: number;
  file_path: string;
  original_filename: string | null;
  parsed_data: Record<string, any> | null;
  uploaded_at: string;
}

export interface InterviewResponse {
  id: number;
  user_id: number;
  resume_id: number | null;
  target_role: string;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  overall_score: number | null;
  created_at: string;
  completed_at: string | null;
  answered_question_count?: number;
  question_count?: number;
  questions?: InterviewQuestionResponse[];
}

export interface InterviewQuestionResponse {
  id: number;
  interview_id: number;
  question_text: string;
  topic: string;
  question_order: number;
  answer?: AnswerResponse;
}

export interface AnswerResponse {
  id: number;
  interview_question_id: number;
  transcript: string | null;
  audio_path: string | null;
  created_at: string;
  evaluation?: EvaluationResponse;
}

export interface EvaluationResponse {
  id: number;
  answer_id: number;
  correctness_score: number | null;
  communication_score: number | null;
  filler_word_count: number | null;
  feedback: string | null;
  created_at: string;
}

export interface CompleteInterviewResponse {
  interview_id: number;
  status: string;
  overall_score: number;
  completed_at: string;
}

export interface InterviewResultsResponse {
  interview_id: number;
  target_role: string;
  status: string;
  overall_score: number | null;
  created_at: string;
  completed_at: string | null;
  questions: InterviewResultQuestionResponse[];
}

export interface InterviewResultQuestionResponse {
  question_id: number;
  question_text: string;
  topic: string;
  question_order: number;
  answer: InterviewResultAnswerResponse | null;
  evaluation: InterviewResultEvaluationResponse | null;
}

export interface InterviewResultAnswerResponse {
  answer_id: number;
  transcript: string | null;
  created_at: string;
}

export interface InterviewResultEvaluationResponse {
  correctness_score: number | null;
  communication_score: number | null;
  filler_word_count: number | null;
  feedback: string | null;
  created_at: string;
}

export interface GenerateQuestionsResponse {
  interview_id: number;
  target_role: string;
  num_generated: number;
  questions: InterviewQuestionResponse[];
}

// Analytics types
export interface TopicPerformance {
  topic: string;
  average_score: number;
  num_questions: number;
}

export interface PerformanceDataPoint {
  interview_id: number;
  target_role: string;
  overall_score: number;
  completed_at: string;
}

export interface AreaToImprove {
  topic: string;
  average_score: number;
  num_questions: number;
  lowest_correctness: number | null;
  lowest_communication: number | null;
}

export interface AnalyticsResponse {
  average_overall_score: number | null;
  average_correctness_score: number | null;
  average_communication_score: number | null;
  total_completed_interviews: number;
  total_questions_answered: number;
  performance_over_time: PerformanceDataPoint[];
  topic_wise_performance: TopicPerformance[];
  areas_to_improve: AreaToImprove[];
}
