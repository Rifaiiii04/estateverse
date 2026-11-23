package panorama

import (
	"image"
	"math"
	"testing"
)

// psnrAgainst measures how closely an equirectangular image matches a scene function.
func psnrAgainst(img *image.RGBA, scene func(Vec3) (float64, float64, float64)) float64 {
	w, h := img.Rect.Dx(), img.Rect.Dy()
	sum, n := 0.0, 0.0
	for v := 0; v < h; v++ {
		lat := math.Pi/2 - (float64(v)+0.5)/float64(h)*math.Pi
		for u := 0; u < w; u++ {
			r, g, b := scene(DirFromLonLat((float64(u)+0.5)/float64(w)*2*math.Pi-math.Pi, lat))
			i := img.PixOffset(u, v)
			sum += sq(float64(img.Pix[i])-r) + sq(float64(img.Pix[i+1])-g) + sq(float64(img.Pix[i+2])-b)
			n += 3
		}
	}
	return 10 * math.Log10(255*255/(sum/n))
}

// TestMinCutSeparatesCheapestEdge checks the max-flow solver cuts the weakest link of a chain.
func TestMinCutSeparatesCheapestEdge(t *testing.T) {
	g := newFlowGraph(5) // source 0, chain 1-2-3, sink 4
	g.addEdge(0, 1, seamTerminal, 0)
	g.addEdge(1, 2, 5, 5)
	g.addEdge(2, 3, 1, 1)
	g.addEdge(3, 4, seamTerminal, 0)
	side := g.minCut(0, 4)
	want := []bool{true, true, true, false, false}
	for i := range want {
		if side[i] != want[i] {
			t.Fatalf("node %d on source side = %v, want %v (sides %v)", i, side[i], want[i], side)
		}
	}
}

// TestStitchTexturedRoom stitches a room with sharp edges, a distorted lens, and noisy sensors end to end.
func TestStitchTexturedRoom(t *testing.T) {
	const k1 = -0.04
	inputs, _ := syntheticRig(11, 270, 480, 46, 3, k1)
	res, err := Stitch(inputs, Options{OutputWidth: 1024, FallbackFOV: 48, MaxCorrection: 8})
	if err != nil {
		t.Fatal(err)
	}
	// Barrel distortion widens the true edge-to-edge view beyond the 46° pinhole focal length used to render.
	edge := math.Tan(deg(23))
	want := 2 * math.Atan(edge*undistortScale(edge, k1)) * 180 / math.Pi
	t.Logf("fov %.2f (true %.2f) matches %d rms %.2f px alignment %.3f coverage %.4f", res.FOV, want, res.Matches, res.MatchRMS, res.Alignment, res.Coverage)
	if res.Matches < 500 || res.MatchRMS > 1.5 {
		t.Fatalf("expected a dense, tight bundle adjustment, got %d matches at %.2f px", res.Matches, res.MatchRMS)
	}
	if math.Abs(res.FOV-want) > 0.15 {
		t.Fatalf("lens estimate %.2f° is off the true %.2f°", res.FOV, want)
	}
}

// TestSeamAvoidsMovedObject paints an object into one photo where a neighbour also sees the room; the seam
// must hand that region to a single photo instead of averaging both into a half-transparent ghost.
func TestSeamAvoidsMovedObject(t *testing.T) {
	inputs, truth := syntheticRig(13, 270, 480, 46, 0, 0)
	img := inputs[0].Image.(*image.RGBA)
	w, h := img.Rect.Dx(), img.Rect.Dy()
	for y := int(0.42 * float64(h)); y < int(0.58*float64(h)); y++ {
		for x := int(0.78 * float64(w)); x < int(0.99*float64(w)); x++ {
			i := img.PixOffset(x, y)
			img.Pix[i], img.Pix[i+1], img.Pix[i+2] = 255, 0, 255
		}
	}
	res, err := Stitch(inputs, Options{OutputWidth: 1024, FallbackFOV: 48, MaxCorrection: 8})
	if err != nil {
		t.Fatal(err)
	}
	ghost, total := objectGhosting(res.Panorama, truth[0], w, h)
	t.Logf("ghosted pixels inside the object: %d of %d", ghost, total)
	if total == 0 || float64(ghost) > 0.02*float64(total) {
		t.Fatalf("moved object left a ghost in %d of %d pixels", ghost, total)
	}
}

// objectGhosting counts output pixels inside the painted object's core that mix magenta with the room.
func objectGhosting(pano *image.RGBA, rot Mat3, w, h int) (ghost, total int) {
	cam := camera{w: float64(w), h: float64(h), cx: float64(w) / 2, cy: float64(h) / 2}
	cam = cam.withLens((cam.w/2)/math.Tan(deg(46)/2), 0)
	pw, ph := pano.Rect.Dx(), pano.Rect.Dy()
	for v := 0; v < ph; v++ {
		for u := 0; u < pw; u++ {
			d := DirFromLonLat((float64(u)+0.5)/float64(pw)*2*math.Pi-math.Pi, math.Pi/2-(float64(v)+0.5)/float64(ph)*math.Pi)
			x, y, ok := cam.project(rot, d)
			if !ok || x < 0.85*float64(w) || x > 0.95*float64(w) || y < 0.45*float64(h) || y > 0.55*float64(h) {
				continue
			}
			total++
			i := pano.PixOffset(u, v)
			r, g, b := roomColor(d)
			room := math.Abs(float64(pano.Pix[i])-r) + math.Abs(float64(pano.Pix[i+1])-g) + math.Abs(float64(pano.Pix[i+2])-b)
			magenta := math.Abs(float64(pano.Pix[i])-255) + float64(pano.Pix[i+1]) + math.Abs(float64(pano.Pix[i+2])-255)
			if math.Min(room, magenta) > 60 {
				ghost++
			}
		}
	}
	return ghost, total
}
