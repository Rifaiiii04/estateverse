package panorama

import "math"

const (
	matchBaseSide = 360  // short side, in pixels, of the finest matching level
	matchLevels   = 3    // pyramid depth: finest level plus two halvings
	cornerCell    = 20   // grid cell size on the finest level; each cell keeps its strongest corner
	cornerBorder  = 8    // corners closer than this to the border cannot carry a matching template
	cornerMinEig  = 10.0 // weakest structure-tensor eigenvalue (gray levels²) that counts as a corner
)

// matchPyramid is the coarse-to-fine grayscale pyramid of one frame used for feature matching.
type matchPyramid struct {
	levels []grayImage // levels[0] is the finest
	k0     float64     // full-resolution pixels per finest-level pixel
}

// buildPyramid creates the matching pyramid of a frame, starting near matchBaseSide on the short side.
func buildPyramid(f *Frame) matchPyramid {
	k0 := max(1, min(f.rgb.w, f.rgb.h)/matchBaseSide)
	base, k := downscaleGray(f.rgb, f.rgb.w/k0)
	levels := []grayImage{base}
	for len(levels) < matchLevels && levels[len(levels)-1].w >= 32 && levels[len(levels)-1].h >= 32 {
		levels = append(levels, halveGray(levels[len(levels)-1]))
	}
	return matchPyramid{levels: levels, k0: float64(k)}
}

// levelCamera returns the frame's current lens model expressed in the pixel units of one pyramid level.
func (p matchPyramid) levelCamera(f *Frame, level int) camera {
	s := p.k0 * math.Pow(2, float64(level))
	g := p.levels[level]
	c := camera{w: float64(g.w), h: float64(g.h), cx: f.full.cx / s, cy: f.full.cy / s}
	return c.withLens(f.full.f/s, f.full.k1)
}

// halveGray averages 2×2 blocks into an image of half the width and height.
func halveGray(src grayImage) grayImage {
	out := grayImage{w: src.w / 2, h: src.h / 2}
	out.pix = make([]float32, out.w*out.h)
	for y := 0; y < out.h; y++ {
		i := 2 * y * src.w
		for x := 0; x < out.w; x++ {
			a, b := i+2*x, i+2*x+src.w
			out.pix[y*out.w+x] = (src.pix[a] + src.pix[a+1] + src.pix[b] + src.pix[b+1]) / 4
		}
	}
	return out
}

// detectCorners returns the strongest Shi-Tomasi corner of every grid cell, in finest-level pixel coordinates.
func detectCorners(g grayImage) [][2]float64 {
	eig := minEigenMap(g)
	var pts [][2]float64
	for y0 := cornerBorder; y0+cornerCell <= g.h-cornerBorder; y0 += cornerCell {
		for x0 := cornerBorder; x0+cornerCell <= g.w-cornerBorder; x0 += cornerCell {
			if p, ok := strongestInCell(eig, g.w, x0, y0); ok {
				pts = append(pts, p)
			}
		}
	}
	return pts
}

// strongestInCell finds the pixel with the largest corner response inside one cell, if it is strong enough.
func strongestInCell(eig []float32, w, x0, y0 int) ([2]float64, bool) {
	best, bx, by := float32(cornerMinEig), -1, -1
	for y := y0; y < y0+cornerCell; y++ {
		for x := x0; x < x0+cornerCell; x++ {
			if v := eig[y*w+x]; v > best {
				best, bx, by = v, x, y
			}
		}
	}
	if bx < 0 {
		return [2]float64{}, false
	}
	return [2]float64{float64(bx) + 0.5, float64(by) + 0.5}, true
}

// minEigenMap computes the smaller eigenvalue of the 5×5 averaged structure tensor at every pixel.
func minEigenMap(g grayImage) []float32 {
	n := g.w * g.h
	ixx, iyy, ixy := make([]float32, n), make([]float32, n), make([]float32, n)
	for y := 1; y < g.h-1; y++ {
		for x := 1; x < g.w-1; x++ {
			i := y*g.w + x
			gx := (g.pix[i+1] - g.pix[i-1]) / 2
			gy := (g.pix[i+g.w] - g.pix[i-g.w]) / 2
			ixx[i], iyy[i], ixy[i] = gx*gx, gy*gy, gx*gy
		}
	}
	a, c, b := boxFilter5(ixx, g.w, g.h), boxFilter5(iyy, g.w, g.h), boxFilter5(ixy, g.w, g.h)
	out := make([]float32, n)
	for i := range out {
		half := (a[i] + c[i]) / 2
		diff := (a[i] - c[i]) / 2
		out[i] = half - float32(math.Sqrt(float64(diff*diff+b[i]*b[i])))
	}
	return out
}

// boxFilter5 averages every pixel with its 5×5 neighbourhood, leaving a 2-pixel border at zero.
func boxFilter5(src []float32, w, h int) []float32 {
	tmp, out := make([]float32, len(src)), make([]float32, len(src))
	for y := 0; y < h; y++ {
		for x := 2; x < w-2; x++ {
			i := y*w + x
			tmp[i] = src[i-2] + src[i-1] + src[i] + src[i+1] + src[i+2]
		}
	}
	for y := 2; y < h-2; y++ {
		for x := 0; x < w; x++ {
			i := y*w + x
			out[i] = (tmp[i-2*w] + tmp[i-w] + tmp[i] + tmp[i+w] + tmp[i+2*w]) / 25
		}
	}
	return out
}
