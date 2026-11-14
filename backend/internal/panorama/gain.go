package panorama

const (
	gainNoiseSigma = 10.0 // expected intensity noise between overlapping frames
	gainPriorSigma = 0.1  // how strongly gains are pulled towards 1.0
	gainIterations = 60
	gainMin        = 0.5
	gainMax        = 2.0
)

// gainLink stores the mean overlap intensities between frame i and neighbor j.
type gainLink struct {
	j            int
	n            float64
	meanI, meanJ float64
}

// compensateGains solves per-frame exposure gains so overlapping regions share the same brightness.
func compensateGains(frames []*Frame, nbrs [][]int) []float64 {
	links := collectGainLinks(frames, nbrs)
	gains := make([]float64, len(frames))
	for i := range gains {
		gains[i] = 1
	}
	prior := 1 / (gainPriorSigma * gainPriorSigma)
	noise := 1 / (gainNoiseSigma * gainNoiseSigma)
	for iter := 0; iter < gainIterations; iter++ {
		for i := range frames {
			gains[i] = solveGain(links[i], gains, prior, noise)
		}
	}
	return gains
}

// collectGainLinks measures mean overlap intensities for every neighboring pair, including textureless ones.
func collectGainLinks(frames []*Frame, nbrs [][]int) [][]gainLink {
	links := make([][]gainLink, len(frames))
	total, count := 0.0, 0.0
	for i := range frames {
		for _, j := range nbrs[i] {
			o := measureOverlap(frames[i], frames[j], frames[i].rot, frames[j].rot)
			if o.n < minOverlapPts {
				continue
			}
			links[i] = append(links[i], gainLink{j: j, n: float64(o.n), meanI: o.meanA, meanJ: o.meanB})
			total += float64(o.n)
			count++
		}
	}
	normalizeLinkWeights(links, total, count)
	return links
}

// normalizeLinkWeights rescales overlap sizes so the average link weight is one.
func normalizeLinkWeights(links [][]gainLink, total, count float64) {
	if total == 0 {
		return
	}
	mean := total / count
	for i := range links {
		for k := range links[i] {
			links[i][k].n /= mean
		}
	}
}

// solveGain performs one Gauss-Seidel update of a frame gain given its neighbors' current gains.
func solveGain(links []gainLink, gains []float64, prior, noise float64) float64 {
	num, den := prior, prior
	for _, l := range links {
		num += l.n * noise * gains[l.j] * l.meanJ * l.meanI
		den += l.n * noise * l.meanI * l.meanI
	}
	return clamp(num/den, gainMin, gainMax)
}
