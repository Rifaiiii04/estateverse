package panorama

import (
	"image"
	"math"
	"math/rand"
)

// captureTarget is one aim point of the guided capture grid (degrees).
type captureTarget struct{ yaw, pitch float64 }

// testTargets mirrors the browser capture grid: 12 at the horizon, 8 at ±45°, plus zenith and nadir.
func testTargets() []captureTarget {
	var out []captureTarget
	for i := 0; i < 12; i++ {
		out = append(out, captureTarget{float64(i) * 30, 0})
	}
	for i := 0; i < 8; i++ {
		out = append(out, captureTarget{float64(i)*45 + 15, 45}, captureTarget{float64(i)*45 + 15, -45})
	}
	return append(out, captureTarget{0, 90}, captureTarget{0, -90})
}

// sceneColor is a smooth, richly textured synthetic environment defined for every world direction.
func sceneColor(d Vec3) (r, g, b float64) {
	r = 128 + 55*math.Sin(23*d.X+5)*math.Cos(19*d.Y) + 45*math.Sin(61*d.Z+13*d.Y)
	g = 128 + 55*math.Cos(29*d.Y-7*d.Z) + 45*math.Sin(53*d.X-11*d.Z)
	b = 128 + 55*math.Sin(17*d.Z+31*d.X) + 45*math.Cos(47*d.Y+9*d.X)
	return r, g, b
}

// renderView renders what a pinhole camera with the given orientation and FOV sees of the scene.
func renderView(rot Mat3, w, h int, hfovDeg float64) image.Image {
	cam := camera{w: float64(w), h: float64(h), cx: float64(w) / 2, cy: float64(h) / 2}
	cam.f = (cam.w / 2) / math.Tan(deg(hfovDeg)/2)
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			r, g, b := sceneColor(cam.unproject(rot, float64(x)+0.5, float64(y)+0.5))
			i := img.PixOffset(x, y)
			img.Pix[i], img.Pix[i+1], img.Pix[i+2], img.Pix[i+3] = uint8(r), uint8(g), uint8(b), 255
		}
	}
	return img
}

// randomRotation returns a rotation of exactly maxDeg degrees about a random axis.
func randomRotation(rng *rand.Rand, maxDeg float64) Mat3 {
	axis := Vec3{rng.NormFloat64(), rng.NormFloat64(), rng.NormFloat64()}
	return AxisAngle(axis, deg(maxDeg)*(0.5+0.5*rng.Float64()))
}

// matToQuat converts a rotation matrix into a (w, x, y, z) quaternion.
func matToQuat(m Mat3) [4]float64 {
	tr := m[0] + m[4] + m[8]
	switch {
	case tr > 0:
		s := math.Sqrt(tr+1) * 2
		return [4]float64{s / 4, (m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s}
	case m[0] > m[4] && m[0] > m[8]:
		s := math.Sqrt(1+m[0]-m[4]-m[8]) * 2
		return [4]float64{(m[7] - m[5]) / s, s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s}
	case m[4] > m[8]:
		s := math.Sqrt(1+m[4]-m[0]-m[8]) * 2
		return [4]float64{(m[2] - m[6]) / s, (m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s}
	default:
		s := math.Sqrt(1+m[8]-m[0]-m[4]) * 2
		return [4]float64{(m[3] - m[1]) / s, (m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4}
	}
}

// syntheticCapture renders frames at slightly mis-aimed true orientations and reports noisy sensor values.
func syntheticCapture(seed int64, w, h int, hfov, sensorErrDeg float64) []FrameInput {
	rng := rand.New(rand.NewSource(seed))
	var inputs []FrameInput
	for _, t := range testTargets() {
		truth := EulerToMat(deg(t.yaw), deg(t.pitch), 0).Mul(randomRotation(rng, 2))
		sensor := truth.Mul(randomRotation(rng, sensorErrDeg))
		inputs = append(inputs, FrameInput{Image: renderView(truth, w, h, hfov), Orientation: matToQuat(sensor)})
	}
	return inputs
}

// psnrAgainstScene measures how closely an equirectangular image matches the synthetic scene.
func psnrAgainstScene(img *image.RGBA) float64 {
	w, h := img.Rect.Dx(), img.Rect.Dy()
	sum, n := 0.0, 0.0
	for v := 0; v < h; v++ {
		lat := math.Pi/2 - (float64(v)+0.5)/float64(h)*math.Pi
		for u := 0; u < w; u++ {
			lon := (float64(u)+0.5)/float64(w)*2*math.Pi - math.Pi
			r, g, b := sceneColor(DirFromLonLat(lon, lat))
			i := img.PixOffset(u, v)
			sum += sq(float64(img.Pix[i])-r) + sq(float64(img.Pix[i+1])-g) + sq(float64(img.Pix[i+2])-b)
			n += 3
		}
	}
	return 10 * math.Log10(255*255/(sum/n))
}

// sq squares a number.
func sq(x float64) float64 { return x * x }
