package panorama

import "math"

const (
	baCauchy       = 2.0  // pixels: residuals beyond this are progressively down-weighted
	baOutlier      = 5.0  // pixels: matches still this far apart after the first solve are discarded
	baRotPrior     = 0.1  // pull towards the starting orientation, in focal lengths per radian
	baFocalPrior   = 20.0 // pull towards the starting focal length, in pixels per unit of log focal length
	baDistortPrior = 20.0 // pull of the distortion term towards zero, in pixels per unit of k1
	minPairMatches = 6    // frame pairs with fewer surviving matches are treated as unmatched
)

// baState is one candidate solution: per-frame camera-to-world rotations plus the shared lens.
type baState struct {
	rot   []Mat3
	f, k1 float64
}

// baProblem holds the correspondences and priors of a global bundle adjustment over all frames.
type baProblem struct {
	cam     camera
	matches []pairMatch
	init    baState
	n       int
}

// bundleAdjust jointly refines all orientations, the focal length, and radial distortion so matched points
// see the same world ray, rejects matches that still disagree, solves again, and writes the result back.
func bundleAdjust(frames []*Frame, matches []pairMatch) alignStats {
	p := &baProblem{cam: frames[0].full, init: baState{rot: make([]Mat3, len(frames)), f: frames[0].full.f, k1: frames[0].full.k1}}
	for i, f := range frames {
		p.init.rot[i] = f.rot
	}
	p.n = 3*len(frames) + 2
	p.matches = keepWellMatchedPairs(matches)
	if len(p.matches) < minAlignMatches {
		return alignStats{}
	}
	st := p.solve(p.init)
	p.matches = keepWellMatchedPairs(p.inliers(st))
	if len(p.matches) < minAlignMatches {
		return alignStats{}
	}
	st = p.solve(st)
	for i, f := range frames {
		f.rot = st.rot[i]
		f.setLens(st.f, st.k1)
	}
	return alignStats{matches: len(p.matches), rms: p.rms(st)}
}

// residual is the focal-scaled difference between the world rays of a match's two pixels (≈ pixels).
func (p *baProblem) residual(m pairMatch, st baState) Vec3 {
	return p.residualWith(m, st, st.f, st.k1)
}

// residualWith evaluates a match residual for an explicit focal length and distortion.
func (p *baProblem) residualWith(m pairMatch, st baState, f, k1 float64) Vec3 {
	da := st.rot[m.a].MulVec(cameraRay(p.cam, m.pa[0], m.pa[1], f, k1))
	db := st.rot[m.b].MulVec(cameraRay(p.cam, m.pb[0], m.pb[1], f, k1))
	return Vec3{f * (da.X - db.X), f * (da.Y - db.Y), f * (da.Z - db.Z)}
}

// robustWeight is the Cauchy IRLS weight for a squared residual norm.
func robustWeight(s float64) float64 {
	return 1 / (1 + s/(baCauchy*baCauchy))
}

// cost is half the robust match cost plus half the squared priors for a candidate state.
func (p *baProblem) cost(st baState) float64 {
	total := 0.0
	for _, m := range p.matches {
		r := p.residual(m, st)
		total += baCauchy * baCauchy * math.Log1p(r.Dot(r)/(baCauchy*baCauchy))
	}
	lambda := baRotPrior * p.init.f
	for i := range st.rot {
		d := logRot(p.init.rot[i].MulT(st.rot[i]))
		total += lambda * lambda * d.Dot(d)
	}
	lf := baFocalPrior * math.Log(st.f/p.init.f)
	lk := baDistortPrior * st.k1
	return (total + lf*lf + lk*lk) / 2
}

// linearize builds the Gauss-Newton normal equations of the robust cost around a state.
func (p *baProblem) linearize(st baState) *normalEq {
	eq := newNormalEq(p.n)
	fi, ki := p.n-2, p.n-1
	for _, m := range p.matches {
		r := p.residual(m, st)
		rows := p.jacobian(m, st)
		idx := [8]int{3 * m.a, 3*m.a + 1, 3*m.a + 2, 3 * m.b, 3*m.b + 1, 3*m.b + 2, fi, ki}
		eq.addRows(idx, rows, [3]float64{r.X, r.Y, r.Z}, robustWeight(r.Dot(r)))
	}
	lambda := baRotPrior * p.init.f
	for i := range st.rot {
		d := logRot(p.init.rot[i].MulT(st.rot[i]))
		eq.addPrior(3*i, lambda, lambda*d.X)
		eq.addPrior(3*i+1, lambda, lambda*d.Y)
		eq.addPrior(3*i+2, lambda, lambda*d.Z)
	}
	eq.addPrior(fi, baFocalPrior, baFocalPrior*math.Log(st.f/p.init.f))
	eq.addPrior(ki, baDistortPrior, baDistortPrior*st.k1)
	return eq
}

// jacobian returns the 3×8 derivative of a match residual with respect to both rotations, log focal, and k1.
func (p *baProblem) jacobian(m pairMatch, st baState) [3][8]float64 {
	ca := cameraRay(p.cam, m.pa[0], m.pa[1], st.f, st.k1)
	cb := cameraRay(p.cam, m.pb[0], m.pb[1], st.f, st.k1)
	ja, jb := mulSkew(st.rot[m.a], ca), mulSkew(st.rot[m.b], cb)
	const hf, hk = 1e-4, 1e-5
	up, down := p.residualWith(m, st, st.f*math.Exp(hf), st.k1), p.residualWith(m, st, st.f*math.Exp(-hf), st.k1)
	kp, km := p.residualWith(m, st, st.f, st.k1+hk), p.residualWith(m, st, st.f, st.k1-hk)
	dF := [3]float64{(up.X - down.X) / (2 * hf), (up.Y - down.Y) / (2 * hf), (up.Z - down.Z) / (2 * hf)}
	dK := [3]float64{(kp.X - km.X) / (2 * hk), (kp.Y - km.Y) / (2 * hk), (kp.Z - km.Z) / (2 * hk)}
	var rows [3][8]float64
	for r := 0; r < 3; r++ {
		for c := 0; c < 3; c++ {
			rows[r][c] = -st.f * ja[r*3+c]
			rows[r][3+c] = st.f * jb[r*3+c]
		}
		rows[r][6], rows[r][7] = dF[r], dK[r]
	}
	return rows
}

// inliers returns the matches whose residual stays within the outlier threshold at a state.
func (p *baProblem) inliers(st baState) []pairMatch {
	out := make([]pairMatch, 0, len(p.matches))
	for _, m := range p.matches {
		if r := p.residual(m, st); r.Dot(r) <= baOutlier*baOutlier {
			out = append(out, m)
		}
	}
	return out
}

// rms is the root-mean-square residual of the current matches at a state.
func (p *baProblem) rms(st baState) float64 {
	sum := 0.0
	for _, m := range p.matches {
		r := p.residual(m, st)
		sum += r.Dot(r)
	}
	return math.Sqrt(sum / float64(max(1, len(p.matches))))
}

// keepWellMatchedPairs drops every frame pair with too few correspondences to be trusted.
func keepWellMatchedPairs(matches []pairMatch) []pairMatch {
	counts := map[[2]int]int{}
	for _, m := range matches {
		counts[pairKey(m.a, m.b)]++
	}
	out := make([]pairMatch, 0, len(matches))
	for _, m := range matches {
		if counts[pairKey(m.a, m.b)] >= minPairMatches {
			out = append(out, m)
		}
	}
	return out
}

// pairKey identifies an unordered frame pair.
func pairKey(a, b int) [2]int {
	return [2]int{min(a, b), max(a, b)}
}
