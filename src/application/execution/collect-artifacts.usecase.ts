/**
 * Collect Test Artifacts Use Case
 * Handles collection of videos, screenshots, traces, and other artifacts from test execution
 */

import { VideoCollector, getVideoCollector, VideoCollectionOptions } from '../../infrastructure/playwright/video-collector';
import { getArtifactsService, ArtifactsService } from '../../infrastructure/persistence/artifacts/ArtifactsService';
import { createLogger } from '../../infrastructure/logging';

const logger = createLogger({ level: 'info', format: 'json', serviceName: 'collect-artifacts' });

/**
 * Input for artifact collection
 */
export interface CollectArtifactsInput {
  /** Test plan ID */
  testPlanId: string;
  /** Items/Scenarios with video information */
  items: Array<{
    id: string;
    videoPath?: string;
    screenshotPaths?: string[];
    tracePath?: string;
  }>;
  /** Whether to cleanup source files after collection */
  cleanupSources?: boolean;
}

/**
 * Output from artifact collection
 */
export interface CollectArtifactsOutput {
  /** Success flag */
  success: boolean;
  /** Summary of collected artifacts */
  summary: {
    videosCollected: number;
    screenshotsCollected: number;
    tracesCollected: number;
    failed: number;
  };
  /** Detailed errors if any */
  errors?: string[];
}

/**
 * Collect Test Artifacts Use Case
 */
export class CollectArtifactsUseCase {
  private videoCollector: VideoCollector;
  private artifactsService: ArtifactsService;

  constructor(
    videoCollector?: VideoCollector,
    artifactsService?: ArtifactsService
  ) {
    this.videoCollector = videoCollector || getVideoCollector();
    this.artifactsService = artifactsService || getArtifactsService();
  }

  /**
   * Execute artifact collection
   */
  async execute(input: CollectArtifactsInput): Promise<CollectArtifactsOutput> {
    const { testPlanId, items, cleanupSources = true } = input;
    const errors: string[] = [];

    logger.info('Starting artifact collection', { testPlanId, itemCount: items.length });

    let videosCollected = 0;
    let screenshotsCollected = 0;
    let tracesCollected = 0;
    let failed = 0;

    // Collect videos
    const videoCollectionOptions: VideoCollectionOptions[] = items
      .filter(item => item.videoPath)
      .map(item => ({
        testPlanId,
        itemId: item.id,
        videoPath: item.videoPath!,
        description: `Video for scenario: ${item.id}`,
      }));

    if (videoCollectionOptions.length > 0) {
      const videoResults = await this.videoCollector.collectVideos(videoCollectionOptions);
      videosCollected = videoResults.filter(r => r.success).length;
      failed += videoResults.filter(r => !r.success).length;

      videoResults.forEach(result => {
        if (!result.success && result.error) {
          errors.push(`Video collection failed: ${result.error}`);
        }
      });

      logger.info(`Videos collected: ${videosCollected}/${videoCollectionOptions.length}`);
    }

    // Collect screenshots
    for (const item of items) {
      if (item.screenshotPaths && item.screenshotPaths.length > 0) {
        for (const screenshotPath of item.screenshotPaths) {
          try {
            const screenshotBuffer = require('fs').readFileSync(screenshotPath);
            await this.artifactsService.saveScreenshot(
              testPlanId,
              screenshotBuffer,
              item.id,
              undefined,
              `Screenshot for scenario: ${item.id}`
            );
            screenshotsCollected++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(`Screenshot collection failed: ${errorMsg}`);
            failed++;
            logger.error(`Failed to collect screenshot: ${screenshotPath}`, { error: errorMsg });
          }
        }
      }
    }

    // Collect traces
    for (const item of items) {
      if (item.tracePath) {
        try {
          const traceBuffer = require('fs').readFileSync(item.tracePath);
          await this.artifactsService.saveTrace(
            testPlanId,
            traceBuffer,
            item.id,
            `Trace for scenario: ${item.id}`
          );
          tracesCollected++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Trace collection failed: ${errorMsg}`);
          failed++;
          logger.error(`Failed to collect trace: ${item.tracePath}`, { error: errorMsg });
        }
      }
    }

    // Cleanup source files if requested
    if (cleanupSources) {
      const sourceFiles = items
        .filter(item => item.videoPath || item.screenshotPaths || item.tracePath)
        .flatMap(item => [
          ...(item.screenshotPaths || []),
          ...(item.videoPath ? [item.videoPath] : []),
          ...(item.tracePath ? [item.tracePath] : []),
        ]);

      if (sourceFiles.length > 0) {
        await this.videoCollector.cleanupVideoFiles(sourceFiles);
      }
    }

    const success = errors.length === 0;

    logger.info('Artifact collection completed', {
      testPlanId,
      success,
      videosCollected,
      screenshotsCollected,
      tracesCollected,
      failed,
    });

    return {
      success,
      summary: {
        videosCollected,
        screenshotsCollected,
        tracesCollected,
        failed,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * Factory function
 */
export function createCollectArtifactsUseCase(
  videoCollector?: VideoCollector,
  artifactsService?: ArtifactsService
): CollectArtifactsUseCase {
  return new CollectArtifactsUseCase(videoCollector, artifactsService);
}

// Singleton
let instanceCollectArtifacts: CollectArtifactsUseCase | null = null;

/**
 * Get or create singleton instance
 */
export function getCollectArtifactsUseCase(): CollectArtifactsUseCase {
  if (!instanceCollectArtifacts) {
    instanceCollectArtifacts = createCollectArtifactsUseCase();
  }
  return instanceCollectArtifacts;
}

/**
 * Reset singleton (for testing)
 */
export function resetCollectArtifactsUseCase(): void {
  instanceCollectArtifacts = null;
}
