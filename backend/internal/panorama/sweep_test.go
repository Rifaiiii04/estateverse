package panorama

import (
	"errors"
	"image"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/image/tiff"
)

// TestSweepRejectsOneMismatchedPhoto catches a delayed shutter paired with an unrelated view in an otherwise valid sweep.
func TestSweepRejectsOneMismatchedPhoto(t *testing.T) {
	inputs := syntheticCapture(42, 90, 160, 48, 0)
	frame := image.NewRGBA(image.Rect(0, 0, 90, 160))
	_, _ = rand.New(rand.NewSource(123)).Read(frame.Pix)
	inputs[4].Image = frame
	_, err := Stitch(inputs, Options{OutputWidth: 256, FallbackFOV: 48, MaxCorrection: 8})
	if !errors.Is(err, ErrUnreliableAlignment) {
		t.Fatalf("unmatched textured photo accepted: %v", err)
	}
}

// TestCroppedHuginOutput rejects an opaque strip that would appear fully covered when measured in its cropped bounds.
func TestCroppedHuginOutput(t *testing.T) {
	job := huginRun{dir: t.TempDir(), fov: 48, frameW: 90}
	file, err := os.Create(filepath.Join(job.dir, "pano.tif"))
	if err != nil {
		t.Fatal(err)
	}
	strip := image.NewGray(image.Rect(0, 0, 80, 20))
	err = tiff.Encode(file, strip, nil)
	file.Close()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := job.result(80); !errors.Is(err, ErrIncompleteCoverage) {
		t.Fatalf("partial panorama returned %v", err)
	}
}

// TestSweepCoverageAtShutterTolerance keeps both poles visible when each high and low pass tilts toward the horizon.
func TestSweepCoverageAtShutterTolerance(t *testing.T) {
	for _, fov := range []float64{34, 40, 48, 60, 68} {
		plan, err := PlanCapture(fov, 9.0/16.0)
		if err != nil {
			t.Fatal(err)
		}
		var frames []*Frame
		for _, target := range plan {
			pitch := target.Pitch
			if pitch != 0 {
				pitch -= math.Copysign(4, pitch)
			}
			img := image.NewRGBA(image.Rect(0, 0, 90, 160))
			frames = append(frames, newFrame(img, EulerToMat(deg(target.Yaw), deg(pitch), 0)))
		}
		setAllFOV(frames, fov)
		_, coverage := render(frames, makeGains(len(frames)), 256)
		if coverage < minSphereCoverage {
			t.Errorf("FOV %.0f covers only %.1f%% at accepted shutter offset", fov, coverage*100)
		}
	}
}
