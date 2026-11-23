package panorama

import (
	"image"
	"math"
	"math/rand"
	"testing"
)

// roomColor adds sharp-edged cells of random brightness to the smooth scene, like furniture edges and posters.
func roomColor(d Vec3) (r, g, b float64) {
	r, g, b = sceneColor(d)
	cx, cy, cz := int(math.Floor(d.X*7)), int(math.Floor(d.Y*7)), int(math.Floor(d.Z*7))
	hash := uint32(cx*73856093) ^ uint32(cy*19349663) ^ uint32(cz*83492791)
	hash = (hash ^ (hash >> 13)) * 0x5bd1e995
	offset := float64(hash>>24)/255*120 - 60
	return clamp(r+offset, 0, 255), clamp(g+offset, 0, 255), clamp(b+offset, 0, 255)
}

// renderLensView renders the textured room through a distorted camera, averaging 2×2 samples per pixel.
func renderLensView(rot Mat3, w, h int, hfovDeg, k1 float64) image.Image {
	cam := camera{w: float64(w), h: float64(h), cx: float64(w) / 2, cy: float64(h) / 2}
	cam = cam.withLens((cam.w/2)/math.Tan(deg(hfovDeg)/2), k1)
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			var sr, sg, sb float64
			for s := 0; s < 4; s++ {
				r, g, b := roomColor(cam.unproject(rot, float64(x)+0.25+0.5*float64(s%2), float64(y)+0.25+0.5*float64(s/2)))
				sr, sg, sb = sr+r/4, sg+g/4, sb+b/4
			}
			i := img.PixOffset(x, y)
			img.Pix[i], img.Pix[i+1], img.Pix[i+2], img.Pix[i+3] = uint8(sr), uint8(sg), uint8(sb), 255
		}
	}
	return img
}

// syntheticRig renders the compact grid with known true orientations and noisy sensor readings.
func syntheticRig(seed int64, w, h int, hfov, sensorErr, k1 float64) ([]FrameInput, []Mat3) {
	rng := rand.New(rand.NewSource(seed))
	var inputs []FrameInput
	var truth []Mat3
	for _, t := range compactTargets() {
		real := EulerToMat(deg(t.yaw), deg(t.pitch), 0).Mul(randomRotation(rng, 2))
		sensor := real.Mul(randomRotation(rng, sensorErr))
		inputs = append(inputs, FrameInput{Image: renderLensView(real, w, h, hfov, k1), Orientation: matToQuat(sensor)})
		truth = append(truth, real)
	}
	return inputs, truth
}

// relativeError is the mean angle (degrees) between estimated and true relative rotations of neighbouring frames.
func relativeError(frames []*Frame, truth []Mat3, nbrs [][]int) float64 {
	sum, n := 0.0, 0
	for i := range frames {
		for _, j := range nbrs[i] {
			est := frames[i].rot.MulT(frames[j].rot)
			real := truth[i].MulT(truth[j])
			sum += est.AngleTo(real) * 180 / math.Pi
			n++
		}
	}
	return sum / float64(n)
}

// correlationAligned runs the original correlation-only refinement used before feature alignment.
func correlationAligned(t *testing.T, inputs []FrameInput) ([]*Frame, [][]int) {
	frames, err := buildFrames(inputs)
	if err != nil {
		t.Fatal(err)
	}
	nbrs := findNeighbors(frames)
	fov := estimateFOV(frames, nbrs, 48)
	refineOrientations(frames, nbrs, 8)
	refineFOV(frames, nbrs, fov, 2)
	refineOrientations(frames, nbrs, 8)
	return frames, nbrs
}

// TestFeatureAlignSharpensOrientations checks matched corners plus bundle adjustment beat correlation refinement.
func TestFeatureAlignSharpensOrientations(t *testing.T) {
	inputs, truth := syntheticRig(5, 270, 480, 46, 3, 0)
	frames, nbrs := correlationAligned(t, inputs)
	before := relativeError(frames, truth, nbrs)
	stats := alignFeatures(frames, nbrs)
	after := relativeError(frames, truth, nbrs)
	t.Logf("relative error %.4f° -> %.4f°, matches %d, rms %.3f px, fov %.2f", before, after, stats.matches, stats.rms, frames[0].full.hfov())
	if stats.matches < 500 {
		t.Fatalf("expected hundreds of matches on a textured scene, got %d", stats.matches)
	}
	if after > 0.05 || after > before/2 {
		t.Fatalf("feature alignment did not sharpen orientations: %.4f° -> %.4f°", before, after)
	}
	if math.Abs(frames[0].full.hfov()-46) > 0.3 {
		t.Fatalf("bundle adjustment lens estimate %.2f° is off the true 46°", frames[0].full.hfov())
	}
}

// TestFeatureAlignRecoversDistortion checks barrel distortion is measured instead of smearing seams.
func TestFeatureAlignRecoversDistortion(t *testing.T) {
	const trueK1 = -0.06
	inputs, truth := syntheticRig(9, 270, 480, 46, 3, trueK1)
	frames, nbrs := correlationAligned(t, inputs)
	before := relativeError(frames, truth, nbrs)
	stats := alignFeatures(frames, nbrs)
	after := relativeError(frames, truth, nbrs)
	k1 := frames[0].full.k1
	t.Logf("relative error %.4f° -> %.4f°, k1 %.4f (true %.2f), rms %.3f px", before, after, k1, trueK1, stats.rms)
	if math.Abs(k1-trueK1) > 0.012 {
		t.Fatalf("distortion estimate %.4f too far from %.2f", k1, trueK1)
	}
	if after > 0.06 {
		t.Fatalf("orientations still off by %.4f° with a distorted lens", after)
	}
}
