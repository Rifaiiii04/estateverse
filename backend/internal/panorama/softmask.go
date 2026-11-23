package panorama

import "math"

const (
	minNarrowSigma = 0.5  // seam cells: the narrow blend never gets sharper than the grid can represent
	minWideSigma   = 1.0  // seam cells: the wide blend always spans at least one cell
	poleStretch    = 0.25 // smallest cos(latitude) used to widen horizontal blur near the poles
)

// softMask is a frame's seam mask blurred into smooth blending weights on the seam grid.
type softMask struct {
	p   patch
	val []float32
}

// attachSoftMasks blurs every frame's final seam mask into its wide (brightness) and narrow (detail) weights.
func (g *seamGrid) attachSoftMasks(rfs []*renderFrame) {
	cellDeg := 360 / float64(g.w)
	wide := math.Max(minWideSigma, wideBlendDeg/cellDeg)
	narrow := math.Max(minNarrowSigma, narrowBlendDeg/cellDeg)
	parallelFor(len(rfs), func(i int) {
		sf := &g.frames[i]
		rfs[i].wide = blurMask(sf, wide, g.h)
		rfs[i].narrow = blurMask(sf, narrow, g.h)
	})
}

// blurMask converts a binary seam mask into weights with a separable Gaussian of sigma cells.
func blurMask(sf *seamFrame, sigma float64, gridH int) softMask {
	src := make([]float32, len(sf.mask))
	for k, on := range sf.mask {
		if on {
			src[k] = 1
		}
	}
	rows := make([]float32, len(src))
	wrap := sf.p.w == sf.p.gridW
	for r := 0; r < sf.p.h; r++ {
		lat := math.Pi/2 - (float64(sf.p.v0+r)+0.5)/float64(gridH)*math.Pi
		kernel := gaussianKernel(sigma / math.Max(math.Cos(lat), poleStretch))
		blurLine(src[r*sf.p.w:(r+1)*sf.p.w], rows[r*sf.p.w:(r+1)*sf.p.w], kernel, wrap)
	}
	return softMask{p: sf.p, val: blurColumns(rows, sf.p, gaussianKernel(sigma))}
}

// blurColumns applies a vertical 1-D kernel to every column of a patch, treating cells outside as zero.
func blurColumns(src []float32, p patch, kernel []float32) []float32 {
	out := make([]float32, len(src))
	col, dst := make([]float32, p.h), make([]float32, p.h)
	for x := 0; x < p.w; x++ {
		for y := 0; y < p.h; y++ {
			col[y] = src[y*p.w+x]
		}
		blurLine(col, dst, kernel, false)
		for y := 0; y < p.h; y++ {
			out[y*p.w+x] = dst[y]
		}
	}
	return out
}

// blurLine convolves one line with a kernel, wrapping around its ends or treating outside samples as zero.
func blurLine(src, dst, kernel []float32, wrap bool) {
	n, r := len(src), len(kernel)/2
	for i := range dst {
		var sum float32
		for t := -r; t <= r; t++ {
			q := i + t
			if wrap {
				q = ((q % n) + n) % n
			} else if q < 0 || q >= n {
				continue
			}
			sum += kernel[t+r] * src[q]
		}
		dst[i] = sum
	}
}

// sample returns the bilinear weight at continuous seam-grid coordinates (cell centres at integers).
func (m *softMask) sample(us, vs float64, gridH int) float64 {
	u0, v0 := int(math.Floor(us)), int(math.Floor(vs))
	fx, fy := us-float64(u0), vs-float64(v0)
	top := (1-fx)*m.at(u0, v0, gridH) + fx*m.at(u0+1, v0, gridH)
	bottom := (1-fx)*m.at(u0, v0+1, gridH) + fx*m.at(u0+1, v0+1, gridH)
	return (1-fy)*top + fy*bottom
}

// at returns the weight of one seam cell, wrapping longitude and clamping latitude.
func (m *softMask) at(u, v, gridH int) float64 {
	v = min(max(v, 0), gridH-1)
	u = ((u % m.p.gridW) + m.p.gridW) % m.p.gridW
	if k := m.p.index(u, v); k >= 0 {
		return float64(m.val[k])
	}
	return 0
}
