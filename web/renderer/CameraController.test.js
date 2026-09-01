import { describe, expect, it } from "vitest";
import { cameraFitDistance, gameplayCameraPose } from "./CameraController.js";

describe("camera framing math", () => {
  it("moves farther away for narrow portrait viewports", () => {
    const desktop = gameplayCameraPose(0, 16 / 9);
    const portrait = gameplayCameraPose(0, 9 / 16);
    expect(desktop.distance).toBeGreaterThanOrEqual(14.6);
    expect(portrait.distance).toBeGreaterThan(desktop.distance);
  });

  it("centers the gameplay camera on the requested level", () => {
    const pose = gameplayCameraPose(5, 1.4);
    expect(pose.target.y).toBeCloseTo(6.25, 6);
    expect(pose.position.distanceTo(pose.target)).toBeCloseTo(pose.distance, 6);
  });

  it("uses horizontal FOV when it is the limiting dimension", () => {
    expect(cameraFitDistance(7, 42, 0.5)).toBeGreaterThan(cameraFitDistance(7, 42, 1.5));
  });
});
