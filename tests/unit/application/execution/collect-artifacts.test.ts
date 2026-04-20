/**
 * Unit tests for collect artifacts use case
 */

import {
  CollectArtifactsUseCase,
  createCollectArtifactsUseCase,
} from '../../../../src/application/execution/collect-artifacts.usecase';
import { VideoCollector } from '../../../../src/infrastructure/playwright/video-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('CollectArtifactsUseCase', () => {
  let useCase: CollectArtifactsUseCase;
  let tempDir: string;

  beforeEach(() => {
    useCase = createCollectArtifactsUseCase();
    tempDir = path.join(__dirname, 'temp-artifacts');
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('execute', () => {
    it('should collect artifacts from test execution', async () => {
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Create mock video files
      const videoPath = path.join(tempDir, 'video-1.webm');
      await fs.promises.writeFile(videoPath, Buffer.from('mock video'));

      const result = await useCase.execute({
        testPlanId: 'test-plan-1',
        items: [
          {
            id: 'scenario-1',
            videoPath,
          },
        ],
        cleanupSources: false,
      });

      expect(result.success).toBe(true);
      expect(result.summary.videosCollected).toBeGreaterThan(0);
    });

    it('should handle multiple items with different artifacts', async () => {
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Create mock files
      const video1 = path.join(tempDir, 'video-1.webm');
      const video2 = path.join(tempDir, 'video-2.webm');
      await fs.promises.writeFile(video1, Buffer.from('video 1'));
      await fs.promises.writeFile(video2, Buffer.from('video 2'));

      const result = await useCase.execute({
        testPlanId: 'test-plan-1',
        items: [
          {
            id: 'scenario-1',
            videoPath: video1,
          },
          {
            id: 'scenario-2',
            videoPath: video2,
          },
        ],
        cleanupSources: false,
      });

      expect(result.success).toBe(true);
      expect(result.summary.videosCollected).toBe(2);
    });

    it('should cleanup source files when requested', async () => {
      await fs.promises.mkdir(tempDir, { recursive: true });

      const videoPath = path.join(tempDir, 'video.webm');
      await fs.promises.writeFile(videoPath, Buffer.from('video data'));

      await useCase.execute({
        testPlanId: 'test-plan-1',
        items: [
          {
            id: 'scenario-1',
            videoPath,
          },
        ],
        cleanupSources: true,
      });

      // File should be deleted after cleanup
      expect(fs.existsSync(videoPath)).toBe(false);
    });

    it('should return errors when collection fails', async () => {
      const result = await useCase.execute({
        testPlanId: 'test-plan-1',
        items: [
          {
            id: 'scenario-1',
            videoPath: '/nonexistent/video.webm',
          },
        ],
        cleanupSources: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should track collection statistics accurately', async () => {
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Create one valid and one invalid video
      const validVideo = path.join(tempDir, 'valid.webm');
      await fs.promises.writeFile(validVideo, Buffer.from('valid video'));

      const result = await useCase.execute({
        testPlanId: 'test-plan-1',
        items: [
          {
            id: 'scenario-1',
            videoPath: validVideo,
          },
          {
            id: 'scenario-2',
            videoPath: '/nonexistent/video.webm',
          },
        ],
        cleanupSources: false,
      });

      expect(result.summary.videosCollected).toBeGreaterThan(0);
      expect(result.summary.failed).toBeGreaterThan(0);
    });
  });
});
