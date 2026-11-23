package panorama

import "math"

const (
	templateRadius = 4 // template half-size in pixels at every pyramid level (9×9 samples)
	templateSide   = 2*templateRadius + 1
	matchMinNCC    = 0.82 // weakest finest-level correlation accepted as a correspondence
	templateMinVar = 20.0 // flatter templates (gray levels²) are skipped: they cannot be located reliably
)

// pairMatch is one point correspondence between two frames in full-resolution pixel coordinates.
type pairMatch struct {
	a, b   int
	pa, pb [2]float64
}

// matchSearch is the coarse-to-fine search schedule: the level to start at and the search radius per level.
type matchSearch struct {
	start  int
	radius [matchLevels]int
}

// coarseSearch tolerates several degrees of orientation error; fineSearch assumes poses are already close.
var (
	coarseSearch = matchSearch{start: 2, radius: [matchLevels]int{2, 2, 6}}
	fineSearch   = matchSearch{start: 1, radius: [matchLevels]int{2, 2, 0}}
)

// pairView holds the pose and lens of two frames at one pyramid level.
type pairView struct {
	ga, gb   *grayImage
	ca, cb   camera
	ra, rb   Mat3
	template [templateSide * templateSide]float64
	targets  [templateSide * templateSide][2]float64
	tMean    float64
	tNorm    float64
}

// matchCorner tracks one corner of frame a into frame b and returns its finest-level position in b.
func matchCorner(ctx *alignContext, a, b int, p [2]float64, s matchSearch) ([2]float64, bool) {
	start := min(s.start, len(ctx.pyr[a].levels)-1, len(ctx.pyr[b].levels)-1)
	var shift [2]float64
	var v pairView
	score := -1.0
	for level := start; level >= 0; level-- {
		shift[0], shift[1] = shift[0]*2, shift[1]*2
		if !ctx.prepareView(&v, a, b, level, p) {
			return [2]float64{}, false
		}
		shift, score = v.search(shift, s.radius[level])
		if score < 0 {
			return [2]float64{}, false
		}
	}
	if score < matchMinNCC {
		return [2]float64{}, false
	}
	shift = v.subpixel(shift, score)
	center := v.targets[len(v.targets)/2]
	return [2]float64{center[0] + shift[0], center[1] + shift[1]}, true
}

// prepareView samples the template around corner p in frame a and predicts where each sample lands in frame b.
func (ctx *alignContext) prepareView(v *pairView, a, b, level int, p [2]float64) bool {
	pa, pb := ctx.pyr[a], ctx.pyr[b]
	v.ga, v.gb = &pa.levels[level], &pb.levels[level]
	v.ca, v.cb = pa.levelCamera(ctx.frames[a], level), pb.levelCamera(ctx.frames[b], level)
	v.ra, v.rb = ctx.frames[a].rot, ctx.frames[b].rot
	s := math.Pow(2, float64(level))
	cx, cy := p[0]/s, p[1]/s
	sum, sumSq := 0.0, 0.0
	for k := 0; k < len(v.template); k++ {
		x := cx + float64(k%templateSide-templateRadius)
		y := cy + float64(k/templateSide-templateRadius)
		bx, by, ok := v.cb.project(v.rb, v.ca.unproject(v.ra, x, y))
		if !ok || x < 0.5 || y < 0.5 || x > v.ca.w-0.5 || y > v.ca.h-0.5 {
			return false
		}
		val := v.ga.sample(x, y)
		v.template[k], v.targets[k] = val, [2]float64{bx, by}
		sum, sumSq = sum+val, sumSq+val*val
	}
	n := float64(len(v.template))
	v.tMean = sum / n
	variance := sumSq/n - v.tMean*v.tMean
	v.tNorm = math.Sqrt(math.Max(variance, 0) * n)
	return variance >= templateMinVar
}

// search scans integer offsets within radius around a predicted shift and returns the best one and its NCC.
func (v *pairView) search(center [2]float64, radius int) ([2]float64, float64) {
	best, bestScore := center, -1.0
	for dy := -radius; dy <= radius; dy++ {
		for dx := -radius; dx <= radius; dx++ {
			cand := [2]float64{center[0] + float64(dx), center[1] + float64(dy)}
			if s, ok := v.ncc(cand); ok && s > bestScore {
				best, bestScore = cand, s
			}
		}
	}
	return best, bestScore
}

// subpixel refines an integer shift by fitting a parabola to the correlation on each axis.
func (v *pairView) subpixel(shift [2]float64, center float64) [2]float64 {
	out := shift
	for axis := 0; axis < 2; axis++ {
		lo, hi := shift, shift
		lo[axis]--
		hi[axis]++
		sl, okL := v.ncc(lo)
		sh, okH := v.ncc(hi)
		denom := sl - 2*center + sh
		if okL && okH && denom < -1e-9 {
			out[axis] += clamp(0.5*(sl-sh)/denom, -0.5, 0.5)
		}
	}
	return out
}

// ncc correlates the template with frame b sampled at the predicted positions moved by shift.
func (v *pairView) ncc(shift [2]float64) (float64, bool) {
	sum, sumSq, cross := 0.0, 0.0, 0.0
	for k, t := range v.targets {
		x, y := t[0]+shift[0], t[1]+shift[1]
		if x < 0.5 || y < 0.5 || x > v.cb.w-0.5 || y > v.cb.h-0.5 {
			return 0, false
		}
		val := v.gb.sample(x, y)
		sum, sumSq, cross = sum+val, sumSq+val*val, cross+val*(v.template[k]-v.tMean)
	}
	n := float64(len(v.targets))
	variance := sumSq - sum*sum/n
	if variance < templateMinVar*n || v.tNorm == 0 {
		return 0, false
	}
	return cross / (math.Sqrt(variance) * v.tNorm), true
}
