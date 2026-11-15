package panorama

import (
	"image"
	"image/color"
	"math"
	"testing"
)

// TestCalibrateMeasuresLens checks the initial three frames recover portrait and landscape camera intrinsics.
func TestCalibrateMeasuresLens(t *testing.T) {
	for _, scene := range []struct {
		w, h int
		fov  float64
	}{{180, 320, 34}, {180, 320, 48}, {180, 320, 65}, {240, 135, 90}} {
		var frames []FrameInput
		for _, yaw := range []float64{0, 20, 40} {
			rot := EulerToMat(deg(yaw), 0, 0)
			frames = append(frames, FrameInput{Image: renderView(rot, scene.w, scene.h, scene.fov), Orientation: matToQuat(rot)})
		}
		result, err := Calibrate(frames)
		if err != nil || !result.Calibrated || math.Abs(result.HorizontalFOV-scene.fov) > 2 {
			t.Fatalf("lens %.1f not recovered: %+v, %v", scene.fov, result, err)
		}
	}
}

// TestCalibrateUsesConservativeFallback prevents a blank wall from producing a falsely wide camera estimate.
func TestCalibrateUsesConservativeFallback(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 180, 320))
	for y := 0; y < 320; y++ {
		for x := 0; x < 180; x++ {
			img.Set(x, y, color.RGBA{180, 180, 180, 255})
		}
	}
	frames := []FrameInput{{Image: img, Orientation: [4]float64{1, 0, 0, 0}}, {Image: img, Orientation: [4]float64{1, 0, 0, 0}}, {Image: img, Orientation: [4]float64{1, 0, 0, 0}}}
	result, err := Calibrate(frames)
	if err != nil || result.Calibrated || result.HorizontalFOV != 34 {
		t.Fatalf("unsafe blank-wall calibration: %+v %v", result, err)
	}
}
