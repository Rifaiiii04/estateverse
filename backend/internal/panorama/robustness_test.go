package panorama

import (
	"errors"
	"image"
	"image/color"
	"math"
	"math/rand"
	"testing"
)

// TestRefineFOVPreservesFallbackWithoutTexture prevents blank walls from forcing the lens estimate to a search boundary.
func TestRefineFOVPreservesFallbackWithoutTexture(t *testing.T) {
	img := image.NewUniform(color.RGBA{180, 180, 180, 255})
	frames := []*Frame{newFrame(imgWithBounds(img), identity()), newFrame(imgWithBounds(img), identity())}
	nbrs := findNeighbors(frames)
	setAllFOV(frames, 48)
	if got := refineFOV(frames, nbrs, 48, 2); got != 48 {
		t.Fatalf("textureless overlap changed fallback FOV from 48 to %.2f", got)
	}
}

// TestStitchRejectsUnrelatedFullSphere rejects noise photos even when their reported orientations cover every direction.
func TestStitchRejectsUnrelatedFullSphere(t *testing.T) {
	inputs := syntheticCapture(42, 90, 160, 48, 0)
	rng := rand.New(rand.NewSource(123))
	for i := range inputs {
		img := image.NewRGBA(image.Rect(0, 0, 90, 160))
		_, _ = rng.Read(img.Pix)
		inputs[i].Image = img
	}
	_, err := Stitch(inputs, Options{OutputWidth: 256, FallbackFOV: 48, MaxCorrection: 8})
	if !errors.Is(err, ErrUnreliableAlignment) {
		t.Fatalf("expected unreliable alignment for unrelated images, got %v", err)
	}
}

// imgWithBounds gives a constant-color image the finite bounds required by the stitcher.
func imgWithBounds(src image.Image) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, 90, 160))
	for y := 0; y < 160; y++ {
		for x := 0; x < 90; x++ {
			img.Set(x, y, src.At(x, y))
		}
	}
	return img
}

// TestStitchLandscapeLens recovers wide horizontal lenses when Android delivers landscape-shaped video frames.
func TestStitchLandscapeLens(t *testing.T) {
	inputs := syntheticCapture(42, 240, 135, 90, 0)
	res, err := Stitch(inputs, Options{OutputWidth: 384, FallbackFOV: 75, MaxCorrection: 8})
	if err != nil {
		t.Fatal(err)
	}
	psnr := psnrAgainstScene(res.Panorama)
	t.Logf("landscape FOV %.2f, PSNR %.2f", res.FOV, psnr)
	if math.Abs(res.FOV-90) > 2.5 || psnr < 23 {
		t.Fatalf("landscape lens miscalibrated: FOV %.2f, PSNR %.2f", res.FOV, psnr)
	}
}

// TestStitchRejectsRepeatedView prevents a partial capture from becoming a stretched full-sphere panorama.
func TestStitchRejectsRepeatedView(t *testing.T) {
	inputs := make([]FrameInput, MinFrames)
	for i := range inputs {
		inputs[i] = FrameInput{Image: renderView(identity(), 90, 160, 48), Orientation: [4]float64{1, 0, 0, 0}}
	}
	if _, err := Stitch(inputs, Options{OutputWidth: 256, FallbackFOV: 48, MaxCorrection: 8}); err == nil {
		t.Fatal("a repeated view was accepted as a complete room")
	}
}
