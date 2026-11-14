package panorama

import (
	"image"
	"math"
	"math/rand"
	"testing"
)

const (
	testFrameW = 180
	testFrameH = 320
	testFOV    = 46.0
)

// TestProjectionRoundTrip verifies unproject followed by project returns the original pixel.
func TestProjectionRoundTrip(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	cam := camera{w: 720, h: 1280, cx: 360, cy: 640, f: 900}
	for i := 0; i < 200; i++ {
		rot := randomRotation(rng, 170)
		x, y := 1+rng.Float64()*718, 1+rng.Float64()*1278
		px, py, ok := cam.project(rot, cam.unproject(rot, x, y))
		if !ok || math.Abs(px-x) > 1e-6 || math.Abs(py-y) > 1e-6 {
			t.Fatalf("round trip mismatch: (%v,%v) -> (%v,%v) ok=%v", x, y, px, py, ok)
		}
	}
}

// TestEulerConventions checks yaw turns right, pitch tilts up, and lon/lat agree with yaw/pitch.
func TestEulerConventions(t *testing.T) {
	fwd := EulerToMat(deg(90), 0, 0).Forward()
	if math.Abs(fwd.X-1) > 1e-9 {
		t.Fatalf("yaw 90° should face +X, got %+v", fwd)
	}
	lon, lat := LonLatFromDir(EulerToMat(deg(30), deg(20), deg(10)).Forward())
	if math.Abs(lon-deg(30)) > 1e-9 || math.Abs(lat-deg(20)) > 1e-9 {
		t.Fatalf("expected lon 30°, lat 20°, got %v, %v", lon*180/math.Pi, lat*180/math.Pi)
	}
}

// TestQuaternionRoundTrip ensures QuatToMat inverts the test helper matToQuat.
func TestQuaternionRoundTrip(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	for i := 0; i < 100; i++ {
		m := randomRotation(rng, 179)
		q := matToQuat(m)
		if back := QuatToMat(q[0], q[1], q[2], q[3]); back.AngleTo(m) > 1e-6 {
			t.Fatalf("quaternion round trip drifted by %v rad", back.AngleTo(m))
		}
	}
}

// TestStitchSyntheticScene stitches a noisy synthetic capture and compares it with the true scene.
func TestStitchSyntheticScene(t *testing.T) {
	inputs := syntheticCapture(42, testFrameW, testFrameH, testFOV, 3)
	opts := Options{OutputWidth: 512, FallbackFOV: 52, MaxCorrection: 8}

	refined, err := Stitch(inputs, opts)
	if err != nil {
		t.Fatalf("stitch failed: %v", err)
	}
	opts.SkipRefine = true
	sensorOnly, err := Stitch(inputs, opts)
	if err != nil {
		t.Fatalf("sensor-only stitch failed: %v", err)
	}

	refinedPSNR, sensorPSNR := psnrAgainstScene(refined.Panorama), psnrAgainstScene(sensorOnly.Panorama)
	t.Logf("fov=%.2f alignment=%.3f coverage=%.4f quality=%d psnr refined=%.2f sensor-only=%.2f",
		refined.FOV, refined.Alignment, refined.Coverage, refined.Quality, refinedPSNR, sensorPSNR)

	if refined.Coverage < 0.999 {
		t.Errorf("expected full sphere coverage, got %.4f", refined.Coverage)
	}
	if math.Abs(refined.FOV-testFOV) > 2.5 {
		t.Errorf("estimated FOV %.2f too far from true %.1f", refined.FOV, testFOV)
	}
	if refinedPSNR < 20 {
		t.Errorf("refined panorama PSNR %.2f dB is below 20 dB", refinedPSNR)
	}
	if refinedPSNR < sensorPSNR+1 {
		t.Errorf("refinement should beat sensor-only placement: %.2f vs %.2f dB", refinedPSNR, sensorPSNR)
	}
}

// TestStitchRejectsBadInput covers too few frames and mismatched resolutions.
func TestStitchRejectsBadInput(t *testing.T) {
	inputs := syntheticCapture(7, 60, 100, testFOV, 1)
	if _, err := Stitch(inputs[:MinFrames-1], DefaultOptions()); err != ErrTooFewFrames {
		t.Fatalf("expected ErrTooFewFrames, got %v", err)
	}
	inputs[3].Image = image.NewRGBA(image.Rect(0, 0, 61, 100))
	if _, err := Stitch(inputs, DefaultOptions()); err != ErrMixedSizes {
		t.Fatalf("expected ErrMixedSizes, got %v", err)
	}
}

// BenchmarkStitchPhoneSize measures a full capture at phone frame size (720×1280) into a 4096-wide panorama.
func BenchmarkStitchPhoneSize(b *testing.B) {
	inputs := syntheticCapture(3, 720, 1280, testFOV, 3)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := Stitch(inputs, DefaultOptions()); err != nil {
			b.Fatal(err)
		}
	}
}
