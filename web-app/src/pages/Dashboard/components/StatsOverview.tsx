/**
 * StatsOverview Component
 * Summary statistics cards for dashboard
 */

import { cn } from '@/utils';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Skeleton } from '@/components/common';

export interface StatsData {
  /** Total number of executions */
  totalExecutions: number;
  /** Pass rate percentage (0-100) */
  passRate: number;
  /** Number of failed tests */
  failedTests: number;
  /** Average execution duration in seconds */
  avgDuration: number;
  /** Change in pass rate from previous period */
  passRateTrend?: number;
}

export interface StatsOverviewProps {
  /** Statistics data */
  stats: StatsData | null;
  /** Loading state */
  isLoading?: boolean;
  /** Time period label (e.g., "Last 30 days") */
  periodLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  trend?: number;
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton variant="text" className="h-4 w-24" />
            <Skeleton variant="text" className="h-8 w-16" />
            <Skeleton variant="text" className="h-3 w-20" />
          </div>
          <Skeleton variant="circular" className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {(subtext || trend !== undefined) && (
            <div className="mt-1 flex items-center gap-2">
              {trend !== undefined && (
                <span
                  className={cn(
                    'flex items-center text-xs font-medium',
                    trend >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend >= 0 ? (
                    <TrendingUp className="mr-0.5 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-0.5 h-3 w-3" />
                  )}
                  {Math.abs(trend)}%
                </span>
              )}
              {subtext && (
                <span className="text-xs text-muted-foreground">{subtext}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            iconBg
          )}
        >
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
      </div>
    </div>
  );
}

export function StatsOverview({
  stats,
  isLoading = false,
  periodLabel = 'All time',
  className,
}: StatsOverviewProps) {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatPassRate = (rate: number): string => {
    if (rate === 0 && stats?.totalExecutions === 0) return '—';
    return `${rate}%`;
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <StatCard
        title="Total Executions"
        value={stats?.totalExecutions ?? 0}
        subtext={periodLabel}
        icon={Play}
        iconBg="bg-blue-100 dark:bg-blue-900/40"
        iconColor="text-blue-600 dark:text-blue-400"
        isLoading={isLoading}
      />
      <StatCard
        title="Pass Rate"
        value={formatPassRate(stats?.passRate ?? 0)}
        subtext={periodLabel}
        icon={CheckCircle}
        iconBg="bg-green-100 dark:bg-green-900/40"
        iconColor="text-green-600 dark:text-green-400"
        trend={stats?.passRateTrend}
        isLoading={isLoading}
      />
      <StatCard
        title="Failed Tests"
        value={stats?.failedTests ?? 0}
        subtext="Needs attention"
        icon={XCircle}
        iconBg="bg-red-100 dark:bg-red-900/40"
        iconColor="text-red-600 dark:text-red-400"
        isLoading={isLoading}
      />
      <StatCard
        title="Avg. Duration"
        value={stats ? formatDuration(stats.avgDuration) : '—'}
        subtext="Per execution"
        icon={Clock}
        iconBg="bg-purple-100 dark:bg-purple-900/40"
        iconColor="text-purple-600 dark:text-purple-400"
        isLoading={isLoading}
      />
    </div>
  );
}

export default StatsOverview;
