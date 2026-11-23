package panorama

import (
	"image"
	"math"
)

const (
	footprintMargin = 0.02 // radians added to each frame's angular radius when culling
	wideBlendDeg    = 1.5  // angular scale of the low band and of its blend across seams
	narrowBlendDeg  = 0.3  // angular width over which detail crosses a seam
)

// renderFrame caches per-frame values used while compositing the output panorama.
type renderFrame struct {
	f        *Frame
	gain     float64
	fwd      Vec3
	cosLimit float64
	lat      float64
	radius   float64
	small    lowBand // reduced, unblurred copy that seams compare
	low      lowBand // the same copy blurred to wideBlendDeg: the low-frequency band
	wide     softMask
	narrow   softMask
}

// renderGrid maps output pixels onto the seam grid that holds every frame's blending weights.
type renderGrid struct {
	w, h         int // output size
	seamW, seamH int
}

// render composites all frames into an equirectangular image: a graph cut picks which photo owns each region,
// then low frequencies blend widely and detail narrowly across seams. It also returns real pixel coverage.
func render(frames []*Frame, gains []float64, width int) (*image.RGBA, float64) {
	height := width / 2
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	holes := make([]bool, width*height)
	rfs := prepareRenderFrames(frames, gains)
	seams := newSeamGrid(rfs, width)
	seams.cutSeams()
	seams.attachSoftMasks(rfs)
	grid := renderGrid{w: width, h: height, seamW: seams.w, seamH: seams.h}
	parallelFor(height, func(v int) { renderRow(img, holes, rfs, grid, v) })
	return img, fillHoles(img, holes)
}

// prepareRenderFrames precomputes optical axes, angular footprints, and low-frequency copies.
func prepareRenderFrames(frames []*Frame, gains []float64) []*renderFrame {
	out := make([]*renderFrame, len(frames))
	parallelFor(len(frames), func(i int) {
		f := frames[i]
		fwd := f.rot.Forward()
		_, lat := LonLatFromDir(fwd)
		radius := f.halfDiagonal() + footprintMargin
		small := shrinkFrame(f.rgb)
		low := small.blurred(f.full.f * deg(wideBlendDeg) / small.k)
		out[i] = &renderFrame{f: f, gain: gains[i], fwd: fwd, cosLimit: math.Cos(radius), lat: lat, radius: radius, small: small, low: low}
	})
	return out
}

// renderRow fills one output row, marking pixels no frame covers as holes.
func renderRow(img *image.RGBA, holes []bool, rfs []*renderFrame, grid renderGrid, v int) {
	lat := math.Pi/2 - (float64(v)+0.5)/float64(grid.h)*math.Pi
	vs := (float64(v)+0.5)*float64(grid.seamH)/float64(grid.h) - 0.5
	cands := rowCandidates(rfs, lat)
	for u := 0; u < grid.w; u++ {
		lon := (float64(u)+0.5)/float64(grid.w)*2*math.Pi - math.Pi
		us := (float64(u)+0.5)*float64(grid.seamW)/float64(grid.w) - 0.5
		r, g, b, ok := blendPixel(cands, DirFromLonLat(lon, lat), us, vs, grid.seamH)
		if !ok {
			holes[v*grid.w+u] = true
			continue
		}
		i := img.PixOffset(u, v)
		img.Pix[i], img.Pix[i+1], img.Pix[i+2], img.Pix[i+3] = uint8(r+0.5), uint8(g+0.5), uint8(b+0.5), 255
	}
}

// rowCandidates keeps only frames whose footprint can reach the given latitude.
func rowCandidates(rfs []*renderFrame, lat float64) []*renderFrame {
	out := make([]*renderFrame, 0, len(rfs))
	for _, rf := range rfs {
		if math.Abs(lat-rf.lat) <= rf.radius {
			out = append(out, rf)
		}
	}
	return out
}

// Downsample2 halves an image's resolution with a 2×2 box filter for lighter mobile delivery.
func Downsample2(src *image.RGBA) *image.RGBA {
	w, h := src.Rect.Dx()/2, src.Rect.Dy()/2
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			a, b := src.PixOffset(2*x, 2*y), src.PixOffset(2*x, 2*y+1)
			o := dst.PixOffset(x, y)
			for c := 0; c < 4; c++ {
				sum := int(src.Pix[a+c]) + int(src.Pix[a+4+c]) + int(src.Pix[b+c]) + int(src.Pix[b+4+c])
				dst.Pix[o+c] = uint8(sum / 4)
			}
		}
	}
	return dst
}
