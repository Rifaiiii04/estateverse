package panorama

import "math"

const (
	seamMaxWidth = 512   // widest equirectangular grid used to choose seams (0.7° per cell)
	seamMinWidth = 256   // narrowest grid, so small test panoramas still get meaningful seams
	seamInset    = 0.015 // share of each image border kept out of seam placement (vignetting, distortion)
)

// patch is a rectangle of the seam grid that may wrap around 360° of longitude.
type patch struct {
	u0, v0, w, h int
	gridW        int
}

// index returns the offset of grid cell (u, v) inside the patch, or -1 when the cell lies outside it.
func (p patch) index(u, v int) int {
	if v < p.v0 || v >= p.v0+p.h {
		return -1
	}
	du := u - p.u0
	if du < 0 {
		du += p.gridW
	}
	if du >= p.w {
		return -1
	}
	return (v-p.v0)*p.w + du
}

// cell returns the grid coordinates of a patch offset.
func (p patch) cell(k int) (u, v int) {
	return (p.u0 + k%p.w) % p.gridW, p.v0 + k/p.w
}

// seamFrame holds one frame's gain-compensated colours and its current share (mask) of the seam grid.
type seamFrame struct {
	p      patch
	fwd    Vec3
	radius float64
	color  []float32
	mask   []bool
}

// seamGrid is the low-resolution equirectangular canvas on which every frame's share of the panorama is decided.
type seamGrid struct {
	w, h   int
	frames []seamFrame
}

// seamWidth picks the seam grid width for an output panorama width.
func seamWidth(outW int) int {
	return max(min(seamMaxWidth, outW/8), min(outW, seamMinWidth))
}

// newSeamGrid projects every frame onto the seam grid, starting each mask as the frame's whole usable footprint.
func newSeamGrid(rfs []*renderFrame, outW int) *seamGrid {
	g := &seamGrid{w: seamWidth(outW)}
	g.h = g.w / 2
	g.frames = make([]seamFrame, len(rfs))
	parallelFor(len(rfs), func(i int) { g.frames[i] = g.projectFrame(rfs[i]) })
	return g
}

// cellDir returns the world direction through the centre of seam-grid cell (u, v).
func (g *seamGrid) cellDir(u, v int) Vec3 {
	lon := (float64(u)+0.5)/float64(g.w)*2*math.Pi - math.Pi
	lat := math.Pi/2 - (float64(v)+0.5)/float64(g.h)*math.Pi
	return DirFromLonLat(lon, lat)
}

// footprintPatch bounds the spherical cap around a frame's optical axis on the seam grid.
func (g *seamGrid) footprintPatch(rf *renderFrame) patch {
	cellLat := math.Pi / float64(g.h)
	latMax, latMin := rf.lat+rf.radius, rf.lat-rf.radius
	v0 := max(0, int(math.Floor((math.Pi/2-latMax)/cellLat))-1)
	v1 := min(g.h, int(math.Ceil((math.Pi/2-latMin)/cellLat))+1)
	p := patch{u0: 0, v0: v0, w: g.w, h: v1 - v0, gridW: g.w}
	ratio := math.Sin(rf.radius) / math.Cos(rf.lat)
	if latMax >= math.Pi/2 || latMin <= -math.Pi/2 || ratio >= 1 {
		return p
	}
	half := math.Asin(ratio)
	cellLon := 2 * math.Pi / float64(g.w)
	width := int(math.Ceil(2*half/cellLon)) + 4
	if width >= g.w {
		return p
	}
	lon, _ := LonLatFromDir(rf.fwd)
	p.u0 = ((int(math.Floor((lon-half+math.Pi)/cellLon))-2)%g.w + g.w) % g.w
	p.w = width
	return p
}

// projectFrame records which seam cells a frame covers (away from its border) and their colours there.
func (g *seamGrid) projectFrame(rf *renderFrame) seamFrame {
	p := g.footprintPatch(rf)
	sf := seamFrame{p: p, fwd: rf.fwd, radius: rf.radius, color: make([]float32, 3*p.w*p.h), mask: make([]bool, p.w*p.h)}
	c := rf.f.full
	mx, my := seamInset*c.w, seamInset*c.h
	for k := range sf.mask {
		d := g.cellDir(p.cell(k))
		if d.Dot(rf.fwd) < rf.cosLimit {
			continue
		}
		x, y, ok := c.project(rf.f.rot, d)
		if !ok || x < mx || y < my || x > c.w-mx || y > c.h-my {
			continue
		}
		r, gr, b := rf.small.sample(x, y)
		sf.color[3*k], sf.color[3*k+1], sf.color[3*k+2] = float32(r*rf.gain), float32(gr*rf.gain), float32(b*rf.gain)
		sf.mask[k] = true
	}
	return sf
}

// colorDistance is the RGB distance between two frames at the same seam cell.
func colorDistance(a *seamFrame, ka int, b *seamFrame, kb int) float64 {
	dr := float64(a.color[3*ka] - b.color[3*kb])
	dg := float64(a.color[3*ka+1] - b.color[3*kb+1])
	db := float64(a.color[3*ka+2] - b.color[3*kb+2])
	return math.Sqrt(dr*dr + dg*dg + db*db)
}
