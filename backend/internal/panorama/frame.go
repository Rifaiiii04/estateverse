package panorama

import (
	"image"
	"math"
)

const (
	alignMaxWidth   = 192 // width of the luminance copy used for alignment scoring
	alignSampleStep = 3.0 // spacing in low-res pixels between correlation samples
	minOverlapPts   = 150 // fewest overlapping samples for a trustworthy correlation
	minOverlapVar   = 12.0
)

// camera is a pinhole model with a centered principal point in continuous pixel coordinates.
type camera struct {
	w, h, cx, cy, f float64
}

// project maps a world direction into image coordinates and reports whether it lands inside the image.
func (c camera) project(rot Mat3, d Vec3) (x, y float64, ok bool) {
	p := rot.MulTVec(d)
	if p.Z > -1e-6 {
		return 0, 0, false
	}
	x = c.cx + c.f*p.X/(-p.Z)
	y = c.cy - c.f*p.Y/(-p.Z)
	return x, y, x >= 0.5 && y >= 0.5 && x <= c.w-0.5 && y <= c.h-0.5
}

// unproject maps image coordinates back into a unit world direction.
func (c camera) unproject(rot Mat3, x, y float64) Vec3 {
	return rot.MulVec(Vec3{(x - c.cx) / c.f, -(y - c.cy) / c.f, -1}).Norm()
}

// Frame is one captured photo with its sensor orientation and refined orientation.
type Frame struct {
	rgb    rgbImage
	gray   grayImage
	full   camera
	low    camera
	k      float64
	sensor Mat3
	rot    Mat3
}

// newFrame decodes pixels into sampling buffers and records the sensor orientation.
func newFrame(img image.Image, sensor Mat3) *Frame {
	rgb := toRGB(img)
	gray, k := downscaleGray(rgb, alignMaxWidth)
	fw, fh := float64(rgb.w), float64(rgb.h)
	return &Frame{
		rgb:    rgb,
		gray:   gray,
		full:   camera{w: fw, h: fh, cx: fw / 2, cy: fh / 2},
		low:    camera{w: float64(gray.w), h: float64(gray.h), cx: fw / 2 / float64(k), cy: fh / 2 / float64(k)},
		k:      float64(k),
		sensor: sensor,
		rot:    sensor,
	}
}

// setFOV sets the focal length of both resolutions from a horizontal field of view in degrees.
func (f *Frame) setFOV(hfovDeg float64) {
	f.full.f = (f.full.w / 2) / math.Tan(deg(hfovDeg)/2)
	f.low.f = f.full.f / f.k
}

// halfDiagonal returns the angular radius of the image footprint around the optical axis.
func (f *Frame) halfDiagonal() float64 {
	return math.Atan(math.Hypot(f.full.w/2, f.full.h/2) / f.full.f)
}

// overlap summarizes how well two frames agree where their views intersect.
type overlap struct {
	ncc          float64
	n            int
	meanA, meanB float64
	valid        bool
}

// measureOverlap correlates frame a's luminance samples with their reprojection into frame b.
func measureOverlap(a, b *Frame, ra, rb Mat3) overlap {
	var s corrAcc
	for y := alignSampleStep / 2; y < a.low.h; y += alignSampleStep {
		for x := alignSampleStep / 2; x < a.low.w; x += alignSampleStep {
			bx, by, ok := b.low.project(rb, a.low.unproject(ra, x, y))
			if !ok {
				continue
			}
			s.add(a.gray.sample(x, y), b.gray.sample(bx, by))
		}
	}
	return s.result()
}

// corrAcc accumulates the sums needed for normalized cross-correlation.
type corrAcc struct {
	n                     int
	sa, sb, saa, sbb, sab float64
}

// add records one pair of corresponding intensities.
func (c *corrAcc) add(a, b float64) {
	c.n++
	c.sa += a
	c.sb += b
	c.saa += a * a
	c.sbb += b * b
	c.sab += a * b
}

// result computes means and NCC, marking textureless or tiny overlaps as invalid.
func (c *corrAcc) result() overlap {
	if c.n < minOverlapPts {
		return overlap{n: c.n}
	}
	n := float64(c.n)
	ma, mb := c.sa/n, c.sb/n
	va, vb := c.saa/n-ma*ma, c.sbb/n-mb*mb
	o := overlap{n: c.n, meanA: ma, meanB: mb}
	if va < minOverlapVar || vb < minOverlapVar {
		return o
	}
	o.ncc = (c.sab/n - ma*mb) / math.Sqrt(va*vb)
	o.valid = true
	return o
}
