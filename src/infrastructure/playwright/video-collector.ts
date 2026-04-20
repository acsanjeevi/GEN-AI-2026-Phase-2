/**
 * Video Collector
 * Collects video files from Playwright test execution and stores them as artifacts
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { getArtifactsService, ArtifactsService } from '../persistence/artifacts/ArtifactsService';
import { createLogger } from '../logging';

const logger = createLogger({ level: 'info', format: 'json', serviceName: 'video-collector' });

/**
 * Video collection options
 */
export interface VideoCollectionOptions {
  /** Test plan ID */
  testPlanId: string;
  /** Item/Scenario ID */
  itemId?: string;
  /** Video file path from Playwright */
  videoPath: string;
  /** Description */
  description?: string;
}

/**
 * Video collection result
 */
export interface VideoCollectionResult {
  /** Success flag */
  success: boolean;
  /** Artifact ID if successful */
  artifactId?: string;
  /** File size in bytes */
  size?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Collects video files from Playwright execution
 */
export class VideoCollector {
  private artifactsService: ArtifactsService;

  constructor(artifactsService?: ArtifactsService) {
    this.artifactsService = artifactsService || getArtifactsService();
  }

  /**
   * Collect a single video file
   */
  async collectVideo(options: VideoCollectionOptions): Promise<VideoCollectionResult> {
    const { testPlanId, itemId, videoPath, description } = options;

    try {
      // Check if video file exists
      try {
        await fs.access(videoPath);
      } catch {
        return {
          success: false,
          error: `Video file not found: ${videoPath}`,
        };
      }

      // Read video file
      const videoBuffer = await fs.readFile(videoPath);

      // Save to artifacts
      const artifactMetadata = await this.artifactsService.saveVideo(
        testPlanId,
        videoBuffer,
        itemId,
        description || 'Test execution video'
      );

      logger.info(`Video collected: ${videoPath}`, {
        testPlanId,
        itemId,
        artifactId: artifactMetadata.id,
        size: artifactMetadata.size,
      });

      return {
        success: true,
        artifactId: artifactMetadata.id,
        size: artifactMetadata.size,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to collect video: ${videoPath}`, { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Collect multiple video files
   */
  async collectVideos(
    optionsList: VideoCollectionOptions[]
  ): Promise<VideoCollectionResult[]> {
    const results = await Promise.all(
      optionsList.map(options => this.collectVideo(options))
    );

    const successful = results.filter(r => r.success).length;
    logger.info(`Video collection complete: ${successful}/${results.length} videos collected`, {
      total: results.length,
      successful,
      failed: results.filter(r => !r.success).length,
    });

    return results;
  }

  /**
   * Clean up temporary video files after collection
   */
  async cleanupVideoFiles(videoPaths: string[]): Promise<void> {
    for (const videoPath of videoPaths) {
      try {
        await fs.unlink(videoPath);
        logger.debug(`Cleaned up video file: ${videoPath}`);
      } catch (error) {
        logger.warn(`Failed to cleanup video file: ${videoPath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

/**
 * Get or create video collector instance
 */
let collectorInstance: VideoCollector | null = null;

export function getVideoCollector(artifactsService?: ArtifactsService): VideoCollector {
  if (!collectorInstance) {
    collectorInstance = new VideoCollector(artifactsService);
  }
  return collectorInstance;
}

/**
 * Reset video collector (for testing)
 */
export function resetVideoCollector(): void {
  collectorInstance = null;
}
