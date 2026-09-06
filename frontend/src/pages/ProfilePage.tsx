import { useEffect, useState } from 'react';
import { Button, Card, ErrorMessage, Input, LoadingSpinner } from '../components';
import { useAuth } from '../context/AuthContext';
import { apiClient, APIError } from '../services/api';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [completedCount, setCompletedCount] = useState(0);
  const [resumeCount, setResumeCount] = useState(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('interviewace-theme') === 'light' ? 'Light' : 'Dark'
  );
  const displayUsername = user?.username || user?.email.split('@')[0] || 'InterviewAce user';

  const loadProfileData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [interviews, resumes] = await Promise.all([apiClient.getInterviews(), apiClient.getResumes()]);
      const completedInterviews = interviews.filter(interview => interview.status === 'COMPLETED');
      const scoredInterviews = completedInterviews.filter(interview => interview.overall_score !== null);
      setCompletedCount(completedInterviews.length);
      setResumeCount(resumes.length);
      setAverageScore(scoredInterviews.length > 0
        ? scoredInterviews.reduce((total, interview) => total + (interview.overall_score || 0), 0) / scoredInterviews.length
        : null
      );
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to load account statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    setUsername(user?.username || '');
  }, [user?.username]);

  const handleSaveProfile = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Username is required');
      return;
    }

    setIsSavingProfile(true);
    setError('');
    setSuccess('');
    try {
      const updatedUser = await apiClient.updateCurrentUser(trimmedUsername);
      updateUser(updatedUser);
      setUsername(updatedUser.username);
      setIsEditing(false);
      setSuccess('Profile updated');
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setUsername(user?.username || '');
    setError('');
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Complete all password fields');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password changed');
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    const updateTheme = () => {
      setTheme(localStorage.getItem('interviewace-theme') === 'light' ? 'Light' : 'Dark');
    };
    window.addEventListener('interviewace-theme-change', updateTheme);
    return () => window.removeEventListener('interviewace-theme-change', updateTheme);
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-dark-base">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Profile</h1>
          <p className="text-text-secondary">Your InterviewAce account at a glance.</p>
        </div>
        {error && <ErrorMessage message={error} onRetry={loadProfileData} onDismiss={() => setError('')} />}
        {success && (
          <div className="mb-4 border border-status-success bg-dark-elevated rounded-md px-4 py-3 text-sm text-status-success">
            {success}
          </div>
        )}
        <Card className="mb-8 border-border-normal">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Account</p>
              {!isEditing && <p className="text-2xl font-semibold text-text-primary">{displayUsername}</p>}
              {!isEditing && <p className="text-text-secondary mt-1">{user?.email || 'Email unavailable'}</p>}
            </div>
            {!isEditing && <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>}
          </div>
          {isEditing && (
            <div className="space-y-4">
              <Input label="Username" value={username} onChange={event => setUsername(event.target.value)} disabled={isSavingProfile} maxLength={100} />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
                <div className="w-full px-4 py-2.5 rounded-md bg-dark-elevated border border-border-subtle text-text-secondary text-sm">
                  {user?.email || 'Email unavailable'}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button variant="primary" isLoading={isSavingProfile} onClick={handleSaveProfile}>Save Changes</Button>
                <Button variant="secondary" disabled={isSavingProfile} onClick={handleCancelEdit}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-border-subtle">
            <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Completed</p>
            <p className="text-3xl font-bold text-accent-primary">{completedCount}</p>
            <p className="text-sm text-text-secondary mt-1">Interviews</p>
          </Card>
          <Card className="border-border-subtle">
            <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Uploaded</p>
            <p className="text-3xl font-bold text-text-primary">{resumeCount}</p>
            <p className="text-sm text-text-secondary mt-1">Resumes</p>
          </Card>
          <Card className="border-border-subtle">
            <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Theme</p>
            <p className="text-3xl font-bold text-text-primary">{theme}</p>
            <p className="text-sm text-text-secondary mt-1">Current preference</p>
          </Card>
          <Card className="border-border-subtle">
            <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Average score</p>
            <p className="text-3xl font-bold text-accent-primary">{averageScore === null ? '—' : Math.round(averageScore)}</p>
            <p className="text-sm text-text-secondary mt-1">Across completed interviews</p>
          </Card>
        </div>
        <Card className="border-border-subtle">
          <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold mb-2">Member since</p>
          <p className="text-lg font-medium text-text-primary">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unavailable'}
          </p>
        </Card>
        <section className="mt-8 border-t border-border-subtle pt-8 max-w-xl">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-text-primary mb-1">Change Password</h2>
            <p className="text-sm text-text-secondary">Use your current password to set a new one.</p>
          </div>
          <div className="space-y-4">
            <Input type="password" label="Current password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={isChangingPassword} autoComplete="current-password" />
            <Input type="password" label="New password" value={newPassword} onChange={event => setNewPassword(event.target.value)} disabled={isChangingPassword} autoComplete="new-password" helperText="At least 8 characters" />
            <Input type="password" label="Confirm new password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} disabled={isChangingPassword} autoComplete="new-password" />
            <Button variant="secondary" isLoading={isChangingPassword} onClick={handleChangePassword}>Change Password</Button>
          </div>
        </section>
      </div>
    </div>
  );
}