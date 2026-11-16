package services

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"math/bits"
	"testing"
)

// sceneImage draws a deterministic "room photo" with a bright window, a dark sofa, and a gradient wall.
func sceneImage(w, h int, mirrored bool) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := range h {
		for x := range w {
			img.Set(x, y, sceneColor(float64(x)/float64(w), float64(y)/float64(h), mirrored))
		}
	}
	return img
}

// sceneColor returns the colour of one normalized position in the synthetic room photo.
func sceneColor(fx, fy float64, mirrored bool) color.RGBA {
	if mirrored {
		fx = 1 - fx
	}
	v := uint8(80 + 100*fy)
	if fx > 0.6 && fx < 0.85 && fy > 0.15 && fy < 0.5 {
		v = 240
	}
	if fx > 0.1 && fx < 0.45 && fy > 0.65 && fy < 0.85 {
		v = 30
	}
	return color.RGBA{v, v, uint8(int(v) * 9 / 10), 255}
}

// hashJPEG encodes an image as JPEG at the given quality and returns its dHash.
func hashJPEG(t *testing.T, img image.Image, quality int) uint64 {
	t.Helper()
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
		t.Fatal(err)
	}
	hash, err := ComputeDHash(&buf)
	if err != nil {
		t.Fatal(err)
	}
	return hash
}

// TestDHashMatchesResizedRecompressedCopy treats a smaller, lower-quality re-upload as the same photo.
func TestDHashMatchesResizedRecompressedCopy(t *testing.T) {
	original := hashJPEG(t, sceneImage(1200, 900, false), 92)
	reupload := hashJPEG(t, sceneImage(640, 480, false), 55)
	if d := bits.OnesCount64(original ^ reupload); d > 5 {
		t.Fatalf("re-uploaded copy differs by %d bits, want <= 5", d)
	}
}

// TestDHashSeparatesDifferentPhotos keeps a genuinely different photo far from the original.
func TestDHashSeparatesDifferentPhotos(t *testing.T) {
	original := hashJPEG(t, sceneImage(1200, 900, false), 92)
	other := hashJPEG(t, sceneImage(1200, 900, true), 92)
	if d := bits.OnesCount64(original ^ other); d <= 5 {
		t.Fatalf("different photos differ by only %d bits", d)
	}
}
