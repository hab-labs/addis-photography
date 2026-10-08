import { describe, it, expect } from "vitest";
import {
  isFileSupported,
  CHUNK_SIZE,
  MAX_PARALLEL_UPLOADS,
  ChunkUploader,
} from "./chunkUploader";

describe("Resumable Chunked Uploader Specifications", () => {
  it("enforces 5MB chunk slice size", () => {
    expect(CHUNK_SIZE).toBe(5 * 1024 * 1024);
  });

  it("enforces 3 parallel upload worker ceiling", () => {
    expect(MAX_PARALLEL_UPLOADS).toBe(3);
  });

  it("validates supported media formats (JPG, PNG, HEIC, MP4, MOV)", () => {
    const validJpg = new File(["test"], "photo.jpg", { type: "image/jpeg" });
    const validPng = new File(["test"], "graphic.png", { type: "image/png" });
    const validHeic = new File(["test"], "iphone.heic", { type: "image/heic" });
    const validMp4 = new File(["test"], "clip.mp4", { type: "video/mp4" });
    const validMov = new File(["test"], "video.mov", { type: "video/quicktime" });
    const invalidPdf = new File(["test"], "doc.pdf", { type: "application/pdf" });
    const invalidExe = new File(["test"], "app.exe", { type: "application/octet-stream" });

    expect(isFileSupported(validJpg)).toBe(true);
    expect(isFileSupported(validPng)).toBe(true);
    expect(isFileSupported(validHeic)).toBe(true);
    expect(isFileSupported(validMp4)).toBe(true);
    expect(isFileSupported(validMov)).toBe(true);
    expect(isFileSupported(invalidPdf)).toBe(false);
    expect(isFileSupported(invalidExe)).toBe(false);
  });

  it("calculates chunk count and initializes upload items correctly", () => {
    const uploader = new ChunkUploader();
    // 12 MB file should result in 3 chunks (5MB + 5MB + 2MB)
    const fileBytes = new Uint8Array(12 * 1024 * 1024);
    const mockFile = new File([fileBytes], "wedding-reel.mp4", { type: "video/mp4" });

    const items = uploader.addFiles([mockFile], "alb-test-1");
    expect(items).toHaveLength(1);
    expect(items[0].chunksTotal).toBe(3);
    expect(items[0].filename).toBe("wedding-reel.mp4");
    expect(items[0].status).toBe("uploading");
  });
});
