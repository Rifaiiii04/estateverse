package panorama

import "math"

// lowBandSide is the short side, in pixels, of the reduced copies used for seams and low frequencies.
const lowBandSide = 180

// lowBand is a downscaled RGB copy of a frame. Unblurred it gives seam colours; blurred it holds the frame's
// low spatial frequencies, and rendering adds back (full image − low band) as detail, so a pixel seen by only
// one frame is reproduced exactly while seams blend brightness smoothly and detail sharply.
type lowBand struct {
	w, h int
	k    float64
	pix  []float32
}

// shrinkFrame box-downscales a frame to about lowBandSide pixels on its short side.
func shrinkFrame(src rgbImage) lowBand {
	k := max(1, min(src.w, src.h)/lowBandSide)
	lb := lowBand{w: src.w / k, h: src.h / k, k: float64(k)}
	lb.pix = make([]float32, lb.w*lb.h*3)
	for y := 0; y < lb.h; y++ {
		for x := 0; x < lb.w; x++ {
			r, g, b := boxRGB(src, x*k, y*k, k)
			i := (y*lb.w + x) * 3
			lb.pix[i], lb.pix[i+1], lb.pix[i+2] = r, g, b
		}
	}
	return lb
}

// blurred returns a copy smoothed by a Gaussian of sigma pixels of this reduced image.
func (lb lowBand) blurred(sigma float64) lowBand {
	kernel := gaussianKernel(math.Max(sigma, 0.5))
	out := lb
	out.pix = blurAxis(lb.pix, lb.w, lb.h, kernel, true)
	out.pix = blurAxis(out.pix, lb.w, lb.h, kernel, false)
	return out
}

// boxRGB averages a k×k block of an RGB image starting at (x0, y0).
func boxRGB(src rgbImage, x0, y0, k int) (r, g, b float32) {
	var sr, sg, sb int
	for y := y0; y < y0+k; y++ {
		i := (y*src.w + x0) * 3
		for x := 0; x < k; x++ {
			sr, sg, sb = sr+int(src.pix[i]), sg+int(src.pix[i+1]), sb+int(src.pix[i+2])
			i += 3
		}
	}
	n := float32(k * k)
	return float32(sr) / n, float32(sg) / n, float32(sb) / n
}

// blurAxis convolves interleaved RGB data horizontally or vertically, repeating the edge pixels.
func blurAxis(src []float32, w, h int, kernel []float32, horizontal bool) []float32 {
	out := make([]float32, len(src))
	stride, n, lineStep, lines := 3, w, 3*w, h
	if !horizontal {
		stride, n, lineStep, lines = 3*w, h, 3, w
	}
	radius := len(kernel) / 2
	for line := 0; line < lines; line++ {
		for p := 0; p < n; p++ {
			for c := 0; c < 3; c++ {
				base := line*lineStep + c
				out[base+p*stride] = convolveAt(src, base, p, stride, n, radius, kernel)
			}
		}
	}
	return out
}

// convolveAt applies a 1-D kernel centred on sample p of a line, clamping indices at the line ends.
func convolveAt(src []float32, base, p, stride, n, radius int, kernel []float32) float32 {
	var sum float32
	for t := -radius; t <= radius; t++ {
		q := min(max(p+t, 0), n-1)
		sum += kernel[t+radius] * src[base+q*stride]
	}
	return sum
}

// gaussianKernel returns a normalized 1-D Gaussian kernel truncated at three standard deviations.
func gaussianKernel(sigma float64) []float32 {
	radius := int(math.Ceil(3 * sigma))
	kernel := make([]float32, 2*radius+1)
	var sum float32
	for i := range kernel {
		x := float64(i - radius)
		kernel[i] = float32(math.Exp(-x * x / (2 * sigma * sigma)))
		sum += kernel[i]
	}
	for i := range kernel {
		kernel[i] /= sum
	}
	return kernel
}

// sample returns bilinear low-band RGB at full-resolution continuous coordinates.
func (lb *lowBand) sample(x, y float64) (r, g, b float64) {
	x0, y0, fx, fy := bilinearCell(x/lb.k, y/lb.k, lb.w, lb.h)
	i00 := (y0*lb.w + x0) * 3
	i10, i01 := i00+3, i00+lb.w*3
	i11 := i01 + 3
	w00, w10, w01, w11 := (1-fx)*(1-fy), fx*(1-fy), (1-fx)*fy, fx*fy
	p := lb.pix
	r = w00*float64(p[i00]) + w10*float64(p[i10]) + w01*float64(p[i01]) + w11*float64(p[i11])
	g = w00*float64(p[i00+1]) + w10*float64(p[i10+1]) + w01*float64(p[i01+1]) + w11*float64(p[i11+1])
	b = w00*float64(p[i00+2]) + w10*float64(p[i10+2]) + w01*float64(p[i01+2]) + w11*float64(p[i11+2])
	return r, g, b
}
