package panorama

import (
	"image"
	"math"
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
		if lens.fov >= 48 && lens.aspect < 0.6 && len(plan) > 26 {
			t.Errorf("too many photos for a normal portrait lens: %d", len(plan))
		}
	}
}

// TestCapturePlanIsSequential checks the path: eye level first, rings rising then falling, each swept to the right
// with even steps and entered by a pure tilt from the previous photo.
func TestCapturePlanIsSequential(t *testing.T) {
	for _, lens := range []struct{ fov, aspect float64 }{{34, 9.0 / 16}, {48, 9.0 / 16}, {60, 9.0 / 16}, {90, 16.0 / 9}} {
		plan, err := PlanCapture(lens.fov, lens.aspect)
		if err != nil {
			t.Fatalf("lens %+v: %v", lens, err)
		}
		for i, yaw := range calibrationYaws {
			if plan[i].Yaw != yaw || plan[i].Pitch != 0 {
				t.Fatalf("lens %+v: calibration photo %d moved to %+v", lens, i, plan[i])
			}
		}
		for i := 1; i < len(plan); i++ {
			prev, cur := plan[i-1], plan[i]
			if pathRank(cur.Pitch) < pathRank(prev.Pitch) {
				t.Fatalf("lens %+v: photo %d returns to an earlier ring", lens, i)
			}
			if cur.Pitch != prev.Pitch && cur.Yaw != prev.Yaw {
				t.Fatalf("lens %+v: photo %d needs a turn while changing rings", lens, i)
			}
			if step := math.Mod(cur.Yaw-prev.Yaw+360, 360); cur.Pitch == prev.Pitch && (step <= 0 || step >= 180) {
				t.Fatalf("lens %+v: photo %d does not continue to the right (step %.0f°)", lens, i, step)
			}
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

// pathRank orders ring tilts along the intended path: eye level, rising to the ceiling, then falling to the floor.
func pathRank(pitch float64) float64 {
	if pitch >= 0 {
		return pitch
	}
	return 180 - pitch
}
