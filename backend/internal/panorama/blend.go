package panorama

import "math"

const (
	maxBlendHits  = 32   // most frames considered for one output pixel
	weightEpsilon = 1e-6 // summed seam weight below which a band falls back to centre weighting
)

// blendHit is one frame that sees an output direction, with its image position and blending weights.
type blendHit struct {
	rf           *renderFrame
	x, y         float64
	wide, narrow float64
}

// blendPixel composites every frame seeing direction d: the low band is averaged with wide seam weights and
// the high band with narrow ones, so brightness changes fade gently while edges come from a single photo.
func blendPixel(cands []*renderFrame, d Vec3, us, vs float64, seamH int) (r, g, b float64, ok bool) {
	var buf [maxBlendHits]blendHit
	hits := collectHits(buf[:0], cands, d, us, vs, seamH)
	if len(hits) == 0 {
		return 0, 0, 0, false
	}
	sumWide, sumNarrow := 0.0, 0.0
	for _, h := range hits {
		sumWide += h.wide
		sumNarrow += h.narrow
	}
	var low, high [3]float64
	lowW, highW := 0.0, 0.0
	for _, h := range hits {
		wl, wh := bandWeights(h, sumWide, sumNarrow)
		if wl == 0 && wh == 0 {
			continue
		}
		lr, lg, lb := h.rf.low.sample(h.x, h.y)
		fr, fg, fb := h.rf.f.rgb.sample(h.x, h.y)
		k := h.rf.gain
		low[0], low[1], low[2] = low[0]+wl*k*lr, low[1]+wl*k*lg, low[2]+wl*k*lb
		high[0], high[1], high[2] = high[0]+wh*k*(fr-lr), high[1]+wh*k*(fg-lg), high[2]+wh*k*(fb-lb)
		lowW, highW = lowW+wl, highW+wh
	}
	return clamp(low[0]/lowW+high[0]/highW, 0, 255), clamp(low[1]/lowW+high[1]/highW, 0, 255),
		clamp(low[2]/lowW+high[2]/highW, 0, 255), true
}

// collectHits gathers the frames whose image actually contains direction d, with their seam weights.
func collectHits(hits []blendHit, cands []*renderFrame, d Vec3, us, vs float64, seamH int) []blendHit {
	for _, c := range cands {
		if len(hits) == maxBlendHits || d.Dot(c.fwd) < c.cosLimit {
			continue
		}
		x, y, in := c.f.full.project(c.f.rot, d)
		if !in {
			continue
		}
		hits = append(hits, blendHit{rf: c, x: x, y: y, wide: c.wide.sample(us, vs, seamH), narrow: c.narrow.sample(us, vs, seamH)})
	}
	return hits
}

// bandWeights picks a hit's low- and high-band weights, falling back to centre weighting where the seam grid
// assigned the direction to no frame that actually sees it (thin borders the grid cannot resolve).
func bandWeights(h blendHit, sumWide, sumNarrow float64) (wl, wh float64) {
	wl = h.wide
	if sumWide < weightEpsilon {
		wl = edgeWeight(h.rf.f.full, h.x, h.y)
	}
	wh = h.narrow
	if sumNarrow < weightEpsilon {
		wh = wl
	}
	return wl, wh
}

// edgeWeight favors pixels near the image center so fallback blends lean on the least distorted photo.
func edgeWeight(c camera, x, y float64) float64 {
	wx := math.Min(x, c.w-x) / (c.w / 2)
	wy := math.Min(y, c.h-y) / (c.h / 2)
	base := wx * wy
	return base*base*base + 1e-9
}
