package panorama

import (
	"image"
	"math"
	"runtime"
	"sync"
)

const footprintMargin = 0.02 // radians added to each frame's angular radius when culling

// renderFrame caches per-frame values used while blending the output panorama.
type renderFrame struct {
	f        *Frame
	gain     float64
	fwd      Vec3
	cosLimit float64
	lat      float64
	radius   float64
}

// render blends all frames into an equirectangular image of the given width and returns pixel coverage.
func render(frames []*Frame, gains []float64, width int) (*image.RGBA, float64) {
	height := width / 2
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	holes := make([]bool, width*height)
	rfs := prepareRenderFrames(frames, gains)

	rows := make(chan int, height)
	for v := 0; v < height; v++ {
		rows <- v
	}
	close(rows)

	var wg sync.WaitGroup
	for w := 0; w < runtime.NumCPU(); w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for v := range rows {
				renderRow(img, holes, rfs, v)
			}
		}()
	}
	wg.Wait()
	return img, fillHoles(img, holes)
}

// prepareRenderFrames precomputes optical axes and angular footprints for culling.
func prepareRenderFrames(frames []*Frame, gains []float64) []renderFrame {
	out := make([]renderFrame, len(frames))
	for i, f := range frames {
		fwd := f.rot.Forward()
		_, lat := LonLatFromDir(fwd)
		radius := f.halfDiagonal() + footprintMargin
		out[i] = renderFrame{f: f, gain: gains[i], fwd: fwd, cosLimit: math.Cos(radius), lat: lat, radius: radius}
	}
	return out
}

// renderRow fills one output row, marking pixels no frame covers as holes.
func renderRow(img *image.RGBA, holes []bool, rfs []renderFrame, v int) {
	w, h := img.Rect.Dx(), img.Rect.Dy()
	lat := math.Pi/2 - (float64(v)+0.5)/float64(h)*math.Pi
	cands := rowCandidates(rfs, lat)
	for u := 0; u < w; u++ {
		lon := (float64(u)+0.5)/float64(w)*2*math.Pi - math.Pi
		r, g, b, ok := blendPixel(cands, DirFromLonLat(lon, lat))
		if !ok {
			holes[v*w+u] = true
			continue
		}
		i := img.PixOffset(u, v)
		img.Pix[i], img.Pix[i+1], img.Pix[i+2], img.Pix[i+3] = uint8(r), uint8(g), uint8(b), 255
	}
}

// rowCandidates keeps only frames whose footprint can reach the given latitude.
func rowCandidates(rfs []renderFrame, lat float64) []renderFrame {
	out := make([]renderFrame, 0, len(rfs))
	for _, rf := range rfs {
		if math.Abs(lat-rf.lat) <= rf.radius {
			out = append(out, rf)
		}
	}
	return out
}

// blendPixel averages all frames seeing direction d, weighting each by distance from its image border.
func blendPixel(cands []renderFrame, d Vec3) (r, g, b float64, ok bool) {
	var sr, sg, sb, sw float64
	for _, c := range cands {
		if d.Dot(c.fwd) < c.cosLimit {
			continue
		}
		x, y, in := c.f.full.project(c.f.rot, d)
		if !in {
			continue
		}
		wt := edgeWeight(c.f.full, x, y)
		pr, pg, pb := c.f.rgb.sample(x, y)
		sr += wt * pr * c.gain
		sg += wt * pg * c.gain
		sb += wt * pb * c.gain
		sw += wt
	}
	if sw <= 0 {
		return 0, 0, 0, false
	}
	return clamp(sr/sw, 0, 255), clamp(sg/sw, 0, 255), clamp(sb/sw, 0, 255), true
}

// edgeWeight favors pixels near the image center so seams fall where frames overlap most.
func edgeWeight(c camera, x, y float64) float64 {
	wx := math.Min(x, c.w-x) / (c.w / 2)
	wy := math.Min(y, c.h-y) / (c.h / 2)
	base := wx * wy
	return base*base*base + 1e-9
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
