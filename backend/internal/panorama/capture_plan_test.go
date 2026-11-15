package panorama

import (
	"image"
	"math/rand"
	"testing"
)

// TestAutomaticCapturePlan checks actual projected coverage and bounded photo counts across supported camera lenses.
func TestAutomaticCapturePlan(t *testing.T) {
	for _, lens := range []struct{ fov, aspect float64 }{{34, 9.0 / 16}, {40, 9.0 / 16}, {48, 9.0 / 16}, {60, 9.0 / 16}, {48, 0.75}, {90, 16.0 / 9}} {
		plan, err := PlanCapture(lens.fov, lens.aspect)
		if err != nil {
			t.Fatalf("lens %+v: %v", lens, err)
		}
		var frames []*Frame
		for i, target := range plan {
			if target.ID != i {
				t.Fatal("target ids are not sequential")
			}
			frames = append(frames, newFrame(image.NewRGBA(image.Rect(0, 0, 180, int(180/lens.aspect))), EulerToMat(deg(target.Yaw), deg(target.Pitch), 0)))
		}
		setAllFOV(frames, lens.fov)
		_, coverage := render(frames, makeGains(len(frames)), 512)
		t.Logf("FOV %.1f aspect %.3f: %d photos, coverage %.5f", lens.fov, lens.aspect, len(plan), coverage)
		if coverage < minSphereCoverage || len(plan) > 48 {
			t.Fatal("unsafe automatic capture plan")
		}
		if lens.fov >= 48 && lens.aspect < 0.6 && len(plan) > 24 {
			t.Errorf("too many photos for a normal portrait lens: %d", len(plan))
		}
	}
}

// TestAutomaticPlanStitch checks the complete measured-plan pipeline with noisy poses rather than geometry alone.
func TestAutomaticPlanStitch(t *testing.T) {
	for _, fov := range []float64{48, 60} {
		var seed []FrameInput
		for _, yaw := range []float64{0, 20, 40} {
			truth := EulerToMat(deg(yaw), 0, 0)
			seed = append(seed, FrameInput{Image: renderView(truth, 180, 320, fov), Orientation: matToQuat(truth)})
		}
		calibration, err := Calibrate(seed)
		if err != nil {
			t.Fatal(err)
		}
		inputs := append([]FrameInput{}, seed...)
		rng := rand.New(rand.NewSource(42))
		for _, target := range calibration.Targets[3:] {
			truth := EulerToMat(deg(target.Yaw), deg(target.Pitch), 0)
			inputs = append(inputs, FrameInput{Image: renderView(truth, 180, 320, fov), Orientation: matToQuat(truth.Mul(randomRotation(rng, 2)))})
		}
		result, err := Stitch(inputs, Options{OutputWidth: 512, FallbackFOV: 48, MaxCorrection: 8})
		if err != nil {
			t.Fatal(err)
		}
		psnr := psnrAgainstScene(result.Panorama)
		t.Logf("automatic FOV %.1f: %d photos, coverage %.5f PSNR %.2f", fov, len(inputs), result.Coverage, psnr)
		if psnr < 23 || result.Coverage < minSphereCoverage {
			t.Fatal("automatic panorama quality regressed")
		}
	}
}
