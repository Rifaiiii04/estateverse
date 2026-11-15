package panorama

import (
	"image"
	"math/rand"
	"testing"
)

// compactTargets covers the sphere with three overlapping rings and no separate pole photographs.
func compactTargets() []captureTarget {
	var targets []captureTarget
	for _, row := range []struct {
		count int
		pitch float64
	}{{12, 0}, {6, 60}, {6, -60}} {
		for i := 0; i < row.count; i++ {
			targets = append(targets, captureTarget{float64(i) * 360 / float64(row.count), row.pitch})
		}
	}
	return targets
}

// TestCompactCoverage measures the actual projected coverage of a reduced grid over different portrait camera lenses.
func TestCompactCoverage(t *testing.T) {
	for _, fov := range []float64{34, 40, 46, 48, 55} {
		var frames []*Frame
		for _, target := range compactTargets() {
			frames = append(frames, newFrame(image.NewRGBA(image.Rect(0, 0, 180, 320)), EulerToMat(deg(target.yaw), deg(target.pitch), 0)))
		}
		setAllFOV(frames, fov)
		_, coverage := render(frames, makeGains(len(frames)), 512)
		t.Logf("24 photos: FOV %.0f coverage %.5f", fov, coverage)
		if fov >= 46 && coverage < minSphereCoverage {
			t.Errorf("compact grid leaves excessive gaps at FOV %.0f: %.5f", fov, coverage)
		}
		if fov <= 40 && coverage >= minSphereCoverage {
			t.Errorf("narrow-lens fixture should require the detailed fallback: %.5f", coverage)
		}
	}
}

// TestCompactStitch verifies the smaller grid still reconstructs a textured room with sensor noise.
func TestCompactStitch(t *testing.T) {
	rng := rand.New(rand.NewSource(42))
	var inputs []FrameInput
	for _, target := range compactTargets() {
		truth := EulerToMat(deg(target.yaw), deg(target.pitch), 0)
		sensor := truth.Mul(randomRotation(rng, 3))
		if len(inputs) == 0 {
			sensor = truth // fix the arbitrary global heading so PSNR measures seam errors rather than whole-sphere rotation
		}
		inputs = append(inputs, FrameInput{Image: renderView(truth, 180, 320, 46), Orientation: matToQuat(sensor)})
	}
	result, err := Stitch(inputs, Options{OutputWidth: 512, FallbackFOV: 48, MaxCorrection: 8})
	if err != nil {
		t.Fatal(err)
	}
	psnr := psnrAgainstScene(result.Panorama)
	t.Logf("24 photos: FOV %.2f coverage %.5f PSNR %.2f", result.FOV, result.Coverage, psnr)
	if psnr < 23 || result.Coverage < minSphereCoverage {
		t.Fatalf("compact panorama quality regressed: PSNR %.2f coverage %.5f", psnr, result.Coverage)
	}
}

// makeGains provides neutral exposure for geometry-only coverage tests.
func makeGains(n int) []float64 {
	gains := make([]float64, n)
	for i := range gains {
		gains[i] = 1
	}
	return gains
}
