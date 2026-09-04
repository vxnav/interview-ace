import { useState, useEffect } from 'react';
import { apiClient, APIError } from '../services/api';
import { ErrorMessage, LoadingSpinner } from '../components';
import { AnalyticsResponse, PerformanceDataPoint, TopicPerformance } from '../types/api';
import './AnalyticsPage.css';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiClient.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to load analytics';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-dark-base flex items-center justify-center px-4">
        <ErrorMessage
          message="Could not load analytics. Please try again."
          onRetry={loadAnalytics}
        />
      </div>
    );
  }

  // Check if user has any completed interviews
  if (analytics.total_completed_interviews === 0) {
    return (
      <div className="min-h-screen bg-dark-base">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="mb-16">
            <h1 className="text-4xl font-bold text-text-primary mb-2">Performance Analytics</h1>
            <p className="text-text-secondary">Track your interview performance and improvement.</p>
          </div>

          <div className="bg-dark-surface border border-border-normal rounded-lg p-12 text-center">
            <p className="text-text-primary text-lg font-medium mb-2">No completed interviews yet</p>
            <p className="text-text-tertiary text-sm">Complete an interview to see your performance analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasInsufficientData = 
    analytics.total_completed_interviews < 1 ||
    analytics.total_questions_answered < 1 ||
    analytics.average_overall_score === null;

  return (
    <div className="min-h-screen bg-dark-base">
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Performance Analytics</h1>
          <p className="text-text-secondary">Your interview performance summary and insights.</p>
        </div>

        {error && (
          <ErrorMessage message={error} onRetry={loadAnalytics} />
        )}

        {/* Hero Section - Average Score */}
        <HeroMetrics analytics={analytics} />

        {/* Charts Section */}
        {hasInsufficientData ? (
          <div className="bg-dark-surface border border-border-normal rounded-lg p-8 text-center my-12">
            <p className="text-text-primary font-medium mb-1">Insufficient data for visualizations</p>
            <p className="text-text-tertiary text-sm">Complete more interviews to see detailed performance trends.</p>
          </div>
        ) : (
          <>
            {/* Performance Timeline Chart */}
            {analytics.performance_over_time.length > 0 && (
              <PerformanceTimeline data={analytics.performance_over_time} />
            )}

            {/* Topic Performance Charts */}
            {analytics.topic_wise_performance.length > 0 && (
              <TopicPerformanceSection data={analytics.topic_wise_performance} />
            )}

            {/* Strengths Section */}
            {analytics.topic_wise_performance.length > 0 && (
              <StrengthsSection data={analytics.topic_wise_performance} />
            )}

          </>
        )}

        <div className="mt-4 pb-4 text-center">
          <button
            type="button"
            disabled
            className="text-sm font-medium text-accent-primary border-b border-accent-primary/40 pb-1 opacity-70 cursor-not-allowed"
          >
            Practice these areas →
          </button>
        </div>
      </div>
    </div>
  );
}

// Hero Metrics Component
function HeroMetrics({ analytics }: { analytics: AnalyticsResponse }) {
  return (
    <div className="mb-16 fade-in-hero">
      {/* Main Average Score */}
      <div className="mb-10">
        <div className="text-center">
          <div className="text-6xl font-bold text-accent-primary count-up mb-2">
            {analytics.average_overall_score !== null ? Math.round(analytics.average_overall_score) : '—'}
          </div>
          <p className="text-text-secondary text-sm uppercase tracking-wider">Average Overall Score</p>
        </div>
      </div>

      {/* Supporting Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Correctness */}
        <div className="bg-dark-surface border border-border-subtle rounded-lg p-6 text-center fade-in-support stagger-1">
          <div className="text-3xl font-bold text-accent-primary count-up mb-2">
            {analytics.average_correctness_score !== null ? Math.round(analytics.average_correctness_score) : '—'}
          </div>
          <p className="text-text-tertiary text-xs uppercase tracking-widest">Correctness</p>
        </div>

        {/* Communication */}
        <div className="bg-dark-surface border border-border-subtle rounded-lg p-6 text-center fade-in-support stagger-2">
          <div className="text-3xl font-bold text-accent-primary count-up mb-2">
            {analytics.average_communication_score !== null ? Math.round(analytics.average_communication_score) : '—'}
          </div>
          <p className="text-text-tertiary text-xs uppercase tracking-widest">Communication</p>
        </div>

        {/* Interviews */}
        <div className="bg-dark-surface border border-border-subtle rounded-lg p-6 text-center fade-in-support stagger-3">
          <div className="text-3xl font-bold text-accent-primary count-up mb-2">
            {analytics.total_completed_interviews}
          </div>
          <p className="text-text-tertiary text-xs uppercase tracking-widest">Interviews</p>
        </div>

        {/* Questions */}
        <div className="bg-dark-surface border border-border-subtle rounded-lg p-6 text-center fade-in-support stagger-4">
          <div className="text-3xl font-bold text-accent-primary count-up mb-2">
            {analytics.total_questions_answered}
          </div>
          <p className="text-text-tertiary text-xs uppercase tracking-widest">Questions</p>
        </div>
      </div>
    </div>
  );
}

// Performance Timeline with Vertical Bar Chart
function PerformanceTimeline({ data }: { data: PerformanceDataPoint[] }) {
  if (data.length === 0) return null;

  const maxScore = 100;
  const chartHeight = 200;

  return (
    <div className="mb-16 fade-in-chart stagger-1">
      <h2 className="text-xl font-semibold text-text-primary mb-1">Performance Timeline</h2>
      <p className="text-text-tertiary text-sm mb-6">Your interview scores over time</p>

      <div className="bg-dark-surface border border-border-subtle rounded-lg p-8">
        {/* Y-axis label */}
        <div className="flex gap-4">
          {/* Y-axis */}
          <div className="flex flex-col justify-between text-right w-8 text-xs text-text-tertiary">
            <div>100</div>
            <div>75</div>
            <div>50</div>
            <div>25</div>
            <div>0</div>
          </div>

          {/* Chart Area */}
          <div className="flex-1">
            {/* Gridlines */}
            <div className="relative" style={{ height: chartHeight }}>
              <div className="absolute top-0 w-full border-t border-border-subtle opacity-30"></div>
              <div className="absolute top-1/4 w-full border-t border-border-subtle opacity-20"></div>
              <div className="absolute top-1/2 w-full border-t border-border-subtle opacity-20"></div>
              <div className="absolute top-3/4 w-full border-t border-border-subtle opacity-20"></div>
              <div className="absolute bottom-0 w-full border-t border-border-subtle opacity-30"></div>

              {/* Bars */}
              <div className="absolute inset-0 flex items-end justify-around gap-2 px-2">
                {data.map((point, idx) => {
                  const heightPercent = Math.max(0, Math.min((point.overall_score / maxScore) * 100, 100));

                  return (
                    <div
                      key={`${point.interview_id}-${idx}`}
                      className="relative h-full flex-1"
                    >
                      <div
                        className="absolute left-0 w-full text-center text-xs font-semibold text-accent-primary count-up"
                        style={{ bottom: `calc(${heightPercent}% + 6px)` }}
                      >
                        {Math.round(point.overall_score)}
                      </div>
                      <div
                        className="chart-bar-vertical absolute bottom-0 inset-x-0 w-full bg-accent-primary rounded-t hover:bg-accent-hover"
                        style={{
                          height: `${heightPercent}%`,
                          minHeight: '2px',
                          animationDelay: `${idx * 0.08}s`,
                        }}
                      ></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex items-end justify-around gap-2 px-2 mt-2 text-xs text-text-tertiary">
              {data.map((point, idx) => {
                const date = new Date(point.completed_at);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                return <div key={`${point.interview_id}-label-${idx}`}>{dateStr}</div>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type RadarTopic = TopicPerformance & {
  label: string;
  axisX: number;
  axisY: number;
  pointX: number;
  pointY: number;
  labelX: number;
  labelY: number;
};

// Topic Performance with Radar Chart
function TopicPerformanceSection({ data }: { data: TopicPerformance[] }) {
  const [hoveredTopic, setHoveredTopic] = useState<RadarTopic | null>(null);
  const topicOrder = ['technical', 'experience', 'project', 'behavioral'];
  const center = 160;
  const radius = 105;
  const chartTopics = topicOrder.map((topic, index) => {
    const performance = data.find(item => item.topic.toLowerCase() === topic && item.num_questions > 0);
    const angle = (-Math.PI / 2) + (index * Math.PI / 2);

    return performance && {
      ...performance,
      label: topic.charAt(0).toUpperCase() + topic.slice(1),
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
      pointX: center + Math.cos(angle) * radius * Math.max(0, Math.min(performance.average_score, 100)) / 100,
      pointY: center + Math.sin(angle) * radius * Math.max(0, Math.min(performance.average_score, 100)) / 100,
      labelX: center + Math.cos(angle) * (radius + 27),
      labelY: center + Math.sin(angle) * (radius + 27),
    };
  }).filter((topic): topic is RadarTopic => Boolean(topic));

  if (chartTopics.length === 0) return null;

  const strongestTopic = chartTopics.reduce((strongest, topic) =>
    topic.average_score > strongest.average_score ? topic : strongest
  );
  const weakestTopic = chartTopics.reduce((weakest, topic) =>
    topic.average_score < weakest.average_score ? topic : weakest
  );
  const polygonPoints = chartTopics.map(topic => `${topic.pointX},${topic.pointY}`).join(' ');
  const axisPoints = (scale: number) => topicOrder.map((_, index) => {
    const angle = (-Math.PI / 2) + (index * Math.PI / 2);
    return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
  }).join(' ');

  return (
    <div className="mb-16 fade-in-chart stagger-2">
      <h2 className="text-xl font-semibold text-text-primary mb-1">Topic Performance</h2>
      <p className="text-text-tertiary text-sm mb-6">Average interview performance by evaluated topic</p>

      <div className="bg-dark-surface border border-border-subtle rounded-lg p-5 md:p-8 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_16rem] gap-8 items-center">
        <div className="radar-chart-wrap mx-auto w-full max-w-sm" aria-label="Radar chart of average interview performance by topic">
          <svg viewBox="0 0 320 320" className="w-full h-auto overflow-visible" role="img">
            {[0.25, 0.5, 0.75, 1].map(scale => (
              <polygon
                key={scale}
                points={axisPoints(scale)}
                className="radar-grid"
              />
            ))}
            {chartTopics.map(topic => (
              <line
                key={`${topic.topic}-axis`}
                x1={center}
                y1={center}
                x2={topic.axisX}
                y2={topic.axisY}
                className="radar-axis"
              />
            ))}
            <text x={center + 6} y={center - (radius * 0.25) + 4} className="radar-scale">25</text>
            <text x={center + 6} y={center - (radius * 0.5) + 4} className="radar-scale">50</text>
            <text x={center + 6} y={center - (radius * 0.75) + 4} className="radar-scale">75</text>
            <text x={center + 6} y={center - radius + 4} className="radar-scale">100</text>
            <polygon points={polygonPoints} className="radar-area" />
            {chartTopics.map(topic => (
              <g
                key={topic.topic}
                className="radar-topic"
                onMouseEnter={() => setHoveredTopic(topic)}
                onMouseLeave={() => setHoveredTopic(null)}
                onFocus={() => setHoveredTopic(topic)}
                onBlur={() => setHoveredTopic(null)}
                tabIndex={0}
                role="button"
                aria-label={`${topic.label}: ${Math.round(topic.average_score)} average across ${topic.num_questions} evaluated questions`}
              >
                <circle cx={topic.pointX} cy={topic.pointY} r="12" className="radar-hit-area" />
                <circle cx={topic.pointX} cy={topic.pointY} r="4" className="radar-point" />
                <text x={topic.labelX} y={topic.labelY} textAnchor="middle" dominantBaseline="middle" className="radar-label">
                  {topic.label}
                </text>
              </g>
            ))}
            {hoveredTopic && (
              <g className="radar-tooltip" aria-live="polite">
                <rect x="92" y="136" width="136" height="52" rx="4" />
                <text x={center} y="157" textAnchor="middle">{hoveredTopic.label}: {Math.round(hoveredTopic.average_score)}</text>
                <text x={center} y="175" textAnchor="middle">{hoveredTopic.num_questions} evaluated question{hoveredTopic.num_questions !== 1 ? 's' : ''}</text>
              </g>
            )}
          </svg>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-xs uppercase tracking-widest text-text-tertiary">0-100 scale</span>
            <span className="text-xs text-text-tertiary">Evaluated only</span>
          </div>
          {chartTopics.map(topic => {
            const isStrongest = topic.topic === strongestTopic.topic;
            const isWeakest = topic.topic === weakestTopic.topic;
            return (
              <button
                key={topic.topic}
                type="button"
                onMouseEnter={() => setHoveredTopic(topic)}
                onMouseLeave={() => setHoveredTopic(null)}
                onFocus={() => setHoveredTopic(topic)}
                onBlur={() => setHoveredTopic(null)}
                className="w-full text-left border-l-2 border-accent-primary pl-3 py-1 transition-colors hover:bg-dark-elevated focus:outline-none focus:bg-dark-elevated"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-text-primary">{topic.label}</span>
                  <span className="font-semibold text-accent-primary">{Math.round(topic.average_score)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-1">
                  <span className="text-xs text-text-tertiary">{topic.num_questions} evaluated question{topic.num_questions !== 1 ? 's' : ''}</span>
                  {(isStrongest || isWeakest) && (
                    <span className={isStrongest ? 'text-xs text-status-success' : 'text-xs text-accent-primary'}>
                      {isStrongest ? 'Strongest' : 'Weakest'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Strengths Section
function StrengthsSection({ data }: { data: TopicPerformance[] }) {
  if (data.length === 0) return null;

  const sortedByScore = [...data].sort((a, b) => b.average_score - a.average_score);
  const topStrengths = sortedByScore.filter((t) => t.average_score >= 75).slice(0, 3);

  if (topStrengths.length === 0) return null;

  return (
    <div className="mb-16 fade-in-chart stagger-3">
      <h2 className="text-xl font-semibold text-text-primary mb-1">Your Strengths</h2>
      <p className="text-text-tertiary text-sm mb-6">Topics where you excel</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topStrengths.map((strength, idx) => (
          <div
            key={strength.topic}
            className="bg-dark-surface border border-border-subtle rounded-lg p-6 fade-in-support"
            style={{
              animation: `fadeInSlide 0.6s ease-out ${idx * 0.1}s both`,
              borderColor: 'rgb(107, 184, 150, 0.3)',
            }}
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-accent-primary mb-2" style={{ color: 'rgb(107, 184, 150)' }}>
                {Math.round(strength.average_score)}
              </p>
              <p className="font-medium text-text-primary capitalize mb-1">{strength.topic}</p>
              <p className="text-xs text-text-tertiary">{strength.num_questions} questions answered</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

