package panorama

import (
	"context"
	"errors"
	"image"
	"math"
	"math/rand"
	"testing"
)

// syntheticBand projects a known sphere into a finished rectangular sweep with controlled yaw and exposure errors.
func syntheticBand(pitch, south, north float64, offset image.Point, exposure float64) BandInput {
	const width = 1024
	top := int(math.Round((90 - north) * width / 360))
	height := int(math.Round((90-south)*width/360)) - top
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		distance := min(y+top, width/2-1-y-top)
		tilt := float64(offset.Y) * math.Min(1, float64(distance)*24/width)
		lat := math.Pi/2 - (float64(y+top)+0.5-tilt)*2*math.Pi/width
		for x := 0; x < width; x++ {
			lon := (float64(x-offset.X)+0.5)*2*math.Pi/width - math.Pi
			r, g, b := sceneColor(DirFromLonLat(lon, lat))
			i := img.PixOffset(x, y)
			img.Pix[i], img.Pix[i+1], img.Pix[i+2], img.Pix[i+3] = uint8(r*exposure), uint8(g*exposure), uint8(b*exposure), 255
		}
	}
	return BandInput{BandGeometry{pitch, south, north, width, height}, img}
}

// TestSweepBandStitch checks source resolution, wrapped yaw, exposure, pole coverage and quality across three or five passes.
func TestSweepBandStitch(t *testing.T) {
	for _, count := range []int{3, 5} {
		inputs := make([]BandInput, count)
		step := 180 / float64(count)
		for i := range inputs {
			pitch := -90 + (float64(i)+0.5)*step
			inputs[i] = syntheticBand(pitch, math.Max(-90, pitch-step/2-4), math.Min(90, pitch+step/2+4),
				image.Pt((i-count/2)*7, (i-count/2)*3), 1+float64(i-count/2)*0.035)
		}
		inputs[0], inputs[1] = inputs[1], inputs[0]
		result, err := StitchBands(context.Background(), inputs)
		if err != nil {
			t.Fatal(err)
		}
		psnr := psnrAgainstScene(result.Panorama)
		t.Logf("%d strips PSNR %.2f dB, coverage %.1f%%", count, psnr, result.Coverage*100)
		if result.Panorama.Bounds().Size() != image.Pt(1024, 512) || psnr < 40 || result.Coverage != 1 {
			t.Fatal("band geometry, exposure or seam alignment regressed")
		}
	}
}

// TestSweepBandRejectsInvalid rejects a gap in coverage and a textured strip unrelated to its neighbors.
func TestSweepBandRejectsInvalid(t *testing.T) {
	inputs := []BandInput{syntheticBand(-60, -90, -25, image.Point{}, 1), syntheticBand(0, -35, 35, image.Point{}, 1), syntheticBand(60, 25, 90, image.Point{}, 1)}
	inputs[0].Geometry.MinPitch = -89.75
	if _, err := StitchBands(context.Background(), inputs); !errors.Is(err, ErrIncompleteCoverage) {
		t.Fatalf("missing pole accepted: %v", err)
	}
	inputs[0].Geometry.MinPitch = -90
	_, _ = rand.New(rand.NewSource(325)).Read(inputs[2].Image.(*image.RGBA).Pix)
	if _, err := StitchBands(context.Background(), inputs); !errors.Is(err, ErrUnreliableAlignment) {
		t.Fatalf("unrelated strip accepted: %v", err)
	}
	for i := range inputs {
		inputs[i].Image = image.NewGray(inputs[i].Image.Bounds())
	}
	if _, err := StitchBands(context.Background(), inputs); !errors.Is(err, ErrUnreliableAlignment) {
		t.Fatalf("covered lens accepted: %v", err)
	}
}
