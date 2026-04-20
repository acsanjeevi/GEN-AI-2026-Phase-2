/**
 * Unit tests for video collector
 */

import { VideoCollector } from '../../../../src/infrastructure/playwright/video-collector';
import * as fs from 'fs';
import * as path from 'path';

describe('VideoCollector', () => {
  let collector: VideoCollector;
  let tempDir: string;

  beforeEach(() => {
    collector = new VideoCollector();
    tempDir = path.join(__dirname, 'temp-videos');
  });

  afterEach(async () => {
    // Cleanup temp files
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('collectVideo', () => {
    it('should collect a video file successfully', async () => {
      // Create test video file
      await fs.promises.mkdir(tempDir, { recursive: true });
      const videoPath = path.join(tempDir, 'test.webm');
      await fs.promises.writeFile(videoPath, Buffer.from('mock video content'));

      const result = await collector.collectVideo({
        testPlanId: 'test-plan-1',
        itemId: 'scenario-1',
        videoPath,
        description: 'Test video',
      });

      expect(result.success).toBe(true);
      expect(result.artifactId).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
    });

    it('should fail gracefully when video file not found', async () => {
      const result = await collector.collectVideo({
        testPlanId: 'test-plan-1',
        itemId: 'scenario-1',
        videoPath: '/nonexistent/video.webm',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should collect multiple videos', async () => {
      // Create test video files
      await fs.promises.mkdir(tempDir, { recursive: true });
      const videoPaths = [];
      for (let i = 0; i < 3; i++) {
        const videoPath = path.join(tempDir, `test-${i}.webm`);
        await fs.promises.writeFile(videoPath, Buffer.from(`mock video content ${i}`));
        videoPaths.push(videoPath);
      }

      const options = videoPaths.map((videoPath, i) => ({
        testPlanId: 'test-plan-1',
        itemId: `scenario-${i}`,
        videoPath,
      }));

      const results = await collector.collectVideos(options);

      expect(results.length).toBe(3);
      expect(results.filter(r => r.success).length).toBe(3);
    });
  });

  describe('cleanupVideoFiles', () => {
    it('should remove video files', async () => {
      await fs.promises.mkdir(tempDir, { recursive: true });
      const videoPath = path.join(tempDir, 'test.webm');
      await fs.promises.writeFile(videoPath, Buffer.from('mock video'));

      expect(fs.existsSync(videoPath)).toBe(true);

      await collector.cleanupVideoFiles([videoPath]);

      expect(fs.existsSync(videoPath)).toBe(false);
    });

    it('should handle cleanup of non-existent files gracefully', async () => {
      // Should not throw
      await expect(
        collector.cleanupVideoFiles(['/nonexistent/video.webm'])
      ).resolves.not.toThrow();
    });
  });
});
