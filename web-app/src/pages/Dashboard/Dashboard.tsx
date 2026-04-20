/**
 * Dashboard Page
 * Main dashboard with overview, recent executions, and quick actions
 */

import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/layout';
import { useToast } from '@/components/common';
import { executionService } from '@/services';
import {
  StatsOverview,
  RecentExecutions,
  QuickRunForm,
  type StatsData,
  type ExecutionCardData,
} from './components';

export function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [executions, setExecutions] = useState<ExecutionCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data from API
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch real executions from API
      const response = await executionService.list({ limit: 10 });
      
      // Transform API response to ExecutionCardData format
      const executionCards: ExecutionCardData[] = response.executions.map((exec) => {
        // Calculate duration from timestamps if summary not available
        const duration = exec.summary?.duration || 
          (exec.startedAt && exec.completedAt 
            ? new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime() 
            : 0);
        
        // Get counts from summary or items
        const scenarioCount = exec.summary?.total || exec.items?.length || 0;
        const passedCount = exec.summary?.passed || exec.items?.filter(i => i.status === 'passed').length || 0;
        const failedCount = exec.summary?.failed || exec.items?.filter(i => i.status === 'failed').length || 0;
        
        return {
          id: exec.id,
          name: exec.name || exec.featureName || 'Unnamed Execution',
          status: mapStatus(exec.status),
          startedAt: exec.startedAt || exec.createdAt,
          completedAt: exec.completedAt,
          duration,
          scenarioCount,
          passedCount,
          failedCount,
        };
      });

      setExecutions(executionCards);

      // Calculate stats from executions
      const totalExecutions = response.total || executionCards.length;
      const passedExecutions = executionCards.filter((e) => e.status === 'passed').length;
      const failedExecutions = executionCards.filter((e) => e.status === 'failed').length;
      const totalDuration = executionCards.reduce((sum, e) => sum + (e.duration || 0), 0);
      const avgDuration = executionCards.length > 0 
        ? Math.round(totalDuration / executionCards.length / 1000) 
        : 0;
      const passRate = totalExecutions > 0 
        ? Math.round((passedExecutions / Math.max(passedExecutions + failedExecutions, 1)) * 100) 
        : 0;

      setStats({
        totalExecutions,
        passRate,
        failedTests: failedExecutions,
        avgDuration,
        passRateTrend: 0, // Would need historical data to calculate
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data. Is the backend running?');
      
      // Set empty state
      setStats({
        totalExecutions: 0,
        passRate: 0,
        failedTests: 0,
        avgDuration: 0,
        passRateTrend: 0,
      });
      setExecutions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Map backend status to frontend status
  const mapStatus = (status: string): ExecutionCardData['status'] => {
    switch (status) {
      case 'completed':
        return 'passed';
      case 'failed':
      case 'error':
        return 'failed';
      case 'running':
      case 'pending':
        return 'running';
      case 'cancelled':
        return 'failed';
      default:
        return 'running';
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetry = () => {
    loadData();
  };

  const handleDelete = async (id: string) => {
    try {
      await executionService.delete(id);
      setExecutions((prev) => prev.filter((e) => e.id !== id));
      toast.success('Execution deleted successfully');
      
      // Refresh stats
      loadData();
    } catch (err) {
      toast.error('Failed to delete execution');
      throw err;
    }
  };

  const handleRerun = (id: string) => {
    toast.info(`Re-running execution ${id}...`);
    // TODO: Implement re-run functionality
  };

  return (
    <PageContainer
      title="Dashboard"
      description="Welcome to No-Code UI Automation Platform"
    >
      {/* Stats Overview */}
      <StatsOverview
        stats={stats}
        isLoading={isLoading}
        periodLabel="All time"
        className="mb-8"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Executions - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <RecentExecutions
            executions={executions}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            onDelete={handleDelete}
            onRerun={handleRerun}
            maxItems={6}
          />
        </div>

        {/* Quick Run Form - Takes 1 column */}
        <div className="lg:col-span-1">
          <QuickRunForm />
        </div>
      </div>
    </PageContainer>
  );
}

export default Dashboard;
