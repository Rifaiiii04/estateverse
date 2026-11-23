package panorama

const (
	minAlignMatches  = 30    // fewer correspondences than this leave the correlation-based orientations untouched
	alignRegressTol  = 0.005 // feature alignment is reverted if it lowers the overlap correlation by more than this
	visibilityMargin = 2.0   // finest-level pixels a corner must lie inside the neighbour before it is tracked
)

// alignStats summarizes the feature alignment for diagnostics.
type alignStats struct {
	matches int     // correspondences kept by the final bundle adjustment
	rms     float64 // root-mean-square ray disagreement of kept matches, in full-resolution pixels
}

// alignContext holds the per-frame matching pyramids and corners used during feature alignment.
type alignContext struct {
	frames  []*Frame
	pyr     []matchPyramid
	corners [][][2]float64
}

// lensSnapshot remembers orientations and the shared lens so a failed refinement can be undone.
type lensSnapshot struct {
	rot   []Mat3
	f, k1 float64
}

// alignFeatures refines every orientation plus the shared focal length and distortion by matching corners
// between overlapping photos and solving one global bundle adjustment, falling back if it makes things worse.
func alignFeatures(frames []*Frame, nbrs [][]int) alignStats {
	ctx := newAlignContext(frames)
	saved := snapshotLens(frames)
	baseline := globalScore(frames, nbrs)
	var stats alignStats
	for _, search := range []matchSearch{coarseSearch, fineSearch} {
		matches := ctx.matchAll(nbrs, search)
		if len(matches) < minAlignMatches {
			break
		}
		stats = bundleAdjust(frames, matches)
	}
	if stats.matches < minAlignMatches || globalScore(frames, nbrs) < baseline-alignRegressTol {
		saved.restore(frames)
		return alignStats{}
	}
	return stats
}

// newAlignContext builds the matching pyramid and corner list of every frame concurrently.
func newAlignContext(frames []*Frame) *alignContext {
	ctx := &alignContext{frames: frames, pyr: make([]matchPyramid, len(frames)), corners: make([][][2]float64, len(frames))}
	parallelFor(len(frames), func(i int) {
		ctx.pyr[i] = buildPyramid(frames[i])
		ctx.corners[i] = detectCorners(ctx.pyr[i].levels[0])
	})
	return ctx
}

// matchAll tracks corners across every ordered neighbour pair and pools the correspondences.
func (ctx *alignContext) matchAll(nbrs [][]int, s matchSearch) []pairMatch {
	perFrame := make([][]pairMatch, len(ctx.frames))
	parallelFor(len(ctx.frames), func(a int) {
		for _, b := range nbrs[a] {
			perFrame[a] = append(perFrame[a], ctx.matchPair(a, b, s)...)
		}
	})
	var all []pairMatch
	for _, m := range perFrame {
		all = append(all, m...)
	}
	return all
}

// matchPair tracks the corners of frame a that should be visible in frame b.
func (ctx *alignContext) matchPair(a, b int, s matchSearch) []pairMatch {
	ka, kb := ctx.pyr[a].k0, ctx.pyr[b].k0
	ca, cb := ctx.pyr[a].levelCamera(ctx.frames[a], 0), ctx.pyr[b].levelCamera(ctx.frames[b], 0)
	ra, rb := ctx.frames[a].rot, ctx.frames[b].rot
	var out []pairMatch
	for _, p := range ctx.corners[a] {
		x, y, ok := cb.project(rb, ca.unproject(ra, p[0], p[1]))
		if !ok || x < visibilityMargin || y < visibilityMargin || x > cb.w-visibilityMargin || y > cb.h-visibilityMargin {
			continue
		}
		if q, found := matchCorner(ctx, a, b, p, s); found {
			out = append(out, pairMatch{a: a, b: b, pa: [2]float64{p[0] * ka, p[1] * ka}, pb: [2]float64{q[0] * kb, q[1] * kb}})
		}
	}
	return out
}

// snapshotLens copies the current orientations and lens of all frames.
func snapshotLens(frames []*Frame) lensSnapshot {
	s := lensSnapshot{rot: make([]Mat3, len(frames)), f: frames[0].full.f, k1: frames[0].full.k1}
	for i, f := range frames {
		s.rot[i] = f.rot
	}
	return s
}

// restore writes the remembered orientations and lens back into the frames.
func (s lensSnapshot) restore(frames []*Frame) {
	for i, f := range frames {
		f.rot = s.rot[i]
		f.setLens(s.f, s.k1)
	}
}
