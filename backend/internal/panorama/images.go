package panorama

import (
	"image"
	"image/color"
	"math"
)

// rgbImage stores pixels as packed 8-bit RGB triplets for fast bilinear sampling.
type rgbImage struct {
	w, h int
	pix  []uint8
}

// grayImage stores a low-resolution luminance copy used for alignment scoring.
type grayImage struct {
	w, h int
	pix  []float32
}

// toRGB converts any decoded image into a packed RGB buffer, with a fast path for JPEG YCbCr data.
func toRGB(img image.Image) rgbImage {
	b := img.Bounds()
	out := rgbImage{w: b.Dx(), h: b.Dy(), pix: make([]uint8, b.Dx()*b.Dy()*3)}
	if yc, ok := img.(*image.YCbCr); ok {
		fillFromYCbCr(&out, yc)
		return out
	}
	if rgba, ok := img.(*image.RGBA); ok {
		fillFromRGBA(&out, rgba)
		return out
	}
	for y := 0; y < out.h; y++ {
		for x := 0; x < out.w; x++ {
			r, g, bl, _ := img.At(b.Min.X+x, b.Min.Y+y).RGBA()
			i := (y*out.w + x) * 3
			out.pix[i], out.pix[i+1], out.pix[i+2] = uint8(r>>8), uint8(g>>8), uint8(bl>>8)
		}
	}
	return out
}

// fillFromYCbCr converts JPEG YCbCr planes into packed RGB without per-pixel interface calls.
func fillFromYCbCr(out *rgbImage, yc *image.YCbCr) {
	b := yc.Bounds()
	for y := 0; y < out.h; y++ {
		for x := 0; x < out.w; x++ {
			yi := yc.YOffset(b.Min.X+x, b.Min.Y+y)
			ci := yc.COffset(b.Min.X+x, b.Min.Y+y)
			r, g, bl := color.YCbCrToRGB(yc.Y[yi], yc.Cb[ci], yc.Cr[ci])
			i := (y*out.w + x) * 3
			out.pix[i], out.pix[i+1], out.pix[i+2] = r, g, bl
		}
	}
}

// fillFromRGBA copies an RGBA image (as produced by tests and PNG decoding) into packed RGB.
func fillFromRGBA(out *rgbImage, src *image.RGBA) {
	for y := 0; y < out.h; y++ {
		row := src.Pix[src.PixOffset(src.Rect.Min.X, src.Rect.Min.Y+y):]
		for x := 0; x < out.w; x++ {
			i := (y*out.w + x) * 3
			out.pix[i], out.pix[i+1], out.pix[i+2] = row[x*4], row[x*4+1], row[x*4+2]
		}
	}
}

// sample returns bilinear RGB at continuous coordinates where pixel i spans [i, i+1).
func (m *rgbImage) sample(x, y float64) (r, g, b float64) {
	x0, y0, fx, fy := bilinearCell(x, y, m.w, m.h)
	i00 := (y0*m.w + x0) * 3
	i10 := i00 + 3
	i01 := i00 + m.w*3
	i11 := i01 + 3
	w00, w10, w01, w11 := (1-fx)*(1-fy), fx*(1-fy), (1-fx)*fy, fx*fy
	px := m.pix
	r = w00*float64(px[i00]) + w10*float64(px[i10]) + w01*float64(px[i01]) + w11*float64(px[i11])
	g = w00*float64(px[i00+1]) + w10*float64(px[i10+1]) + w01*float64(px[i01+1]) + w11*float64(px[i11+1])
	b = w00*float64(px[i00+2]) + w10*float64(px[i10+2]) + w01*float64(px[i01+2]) + w11*float64(px[i11+2])
	return r, g, b
}

// sample returns bilinear luminance at continuous coordinates where pixel i spans [i, i+1).
func (m *grayImage) sample(x, y float64) float64 {
	x0, y0, fx, fy := bilinearCell(x, y, m.w, m.h)
	i := y0*m.w + x0
	p := m.pix
	top := float64(p[i])*(1-fx) + float64(p[i+1])*fx
	bottom := float64(p[i+m.w])*(1-fx) + float64(p[i+m.w+1])*fx
	return top*(1-fy) + bottom*fy
}

// bilinearCell finds the top-left sample index and fractional offsets, clamped inside the image.
func bilinearCell(x, y float64, w, h int) (x0, y0 int, fx, fy float64) {
	px := clamp(x-0.5, 0, float64(w)-1.001)
	py := clamp(y-0.5, 0, float64(h)-1.001)
	x0, y0 = int(px), int(py)
	return x0, y0, px - float64(x0), py - float64(y0)
}

// downscaleGray box-filters an RGB image into luminance by an integer factor so width stays within maxW.
func downscaleGray(src rgbImage, maxW int) (grayImage, int) {
	k := int(math.Ceil(float64(src.w) / float64(maxW)))
	if k < 1 {
		k = 1
	}
	out := grayImage{w: src.w / k, h: src.h / k}
	out.pix = make([]float32, out.w*out.h)
	for gy := 0; gy < out.h; gy++ {
		for gx := 0; gx < out.w; gx++ {
			out.pix[gy*out.w+gx] = float32(boxLuma(src, gx*k, gy*k, k))
		}
	}
	return out, k
}

// boxLuma averages Rec.601 luminance over a k×k block starting at (x0, y0).
func boxLuma(src rgbImage, x0, y0, k int) float64 {
	sum := 0.0
	for y := y0; y < y0+k; y++ {
		i := (y*src.w + x0) * 3
		for x := 0; x < k; x++ {
			sum += 0.299*float64(src.pix[i]) + 0.587*float64(src.pix[i+1]) + 0.114*float64(src.pix[i+2])
			i += 3
		}
	}
	return sum / float64(k*k)
}
