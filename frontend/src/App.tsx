import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar, AuthGuard } from './components';
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ResumeUploadPage,
  ResumesPage,
  StartInterviewPage,
  InterviewScreen,
  ResultsPage,
  AnalyticsPage,
} from './pages';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-dark-base">
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <DashboardPage />
                </AuthGuard>
              }
            />
            <Route
              path="/resume-upload"
              element={
                <AuthGuard>
                  <ResumeUploadPage />
                </AuthGuard>
              }
            />
            <Route
              path="/resumes"
              element={
                <AuthGuard>
                  <ResumesPage />
                </AuthGuard>
              }
            />
            <Route
              path="/start-interview"
              element={
                <AuthGuard>
                  <StartInterviewPage />
                </AuthGuard>
              }
            />
            <Route
              path="/interview/:interviewId"
              element={
                <AuthGuard>
                  <InterviewScreen />
                </AuthGuard>
              }
            />
            <Route
              path="/results/:interviewId"
              element={
                <AuthGuard>
                  <ResultsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/analytics"
              element={
                <AuthGuard>
                  <AnalyticsPage />
                </AuthGuard>
              }
            />

            {/* Default Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
