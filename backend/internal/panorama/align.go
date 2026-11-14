package panorama

import "math"

const (
	neighborMaxAngle = 75.0 // degrees between optical axes for two frames to be compared
	fovSearchMin     = 34.0
	fovSearchMax     = 80.0
)

// refineSteps lists the rotation step sizes in degrees for coarse-to-fine refinement.
var refineSteps = []float64{1.0, 0.5, 0.25, 0.1}

// localAxes are the camera axes used to nudge an orientation: yaw, pitch, and roll.
var localAxes = []Vec3{{0, 1, 0}, {1, 0, 0}, {0, 0, 1}}

// findNeighbors lists, for every frame, the frames whose sensor views are close enough to overlap.
func findNeighbors(frames []*Frame) [][]int {
	limit := math.Cos(deg(neighborMaxAngle))
	nbrs := make([][]int, len(frames))
	for i, a := range frames {
		for j, b := range frames {
			if i != j && a.sensor.Forward().Dot(b.sensor.Forward()) >= limit {
				nbrs[i] = append(nbrs[i], j)
			}
		}
	}
	return nbrs
}

// frameScore is the sample-weighted mean NCC of frame i against its neighbors using orientation rot.
func frameScore(frames []*Frame, nbrs [][]int, i int, rot Mat3) float64 {
	return parallelWeightedMean(len(nbrs[i]), func(k int) weightedSum {
		j := nbrs[i][k]
		return overlapContribution(measureOverlap(frames[i], frames[j], rot, frames[j].rot))
	})
}

// globalScore is the sample-weighted mean NCC across all neighboring pairs at current orientations.
func globalScore(frames []*Frame, nbrs [][]int) float64 {
	return parallelWeightedMean(len(frames), func(i int) weightedSum {
		total := weightedSum{}
		for _, j := range nbrs[i] {
			c := overlapContribution(measureOverlap(frames[i], frames[j], frames[i].rot, frames[j].rot))
			total.sum += c.sum
			total.weight += c.weight
		}
		return total
	})
}

// estimateFOV runs a coarse-to-fine search for the horizontal field of view that best aligns overlapping frames.
func estimateFOV(frames []*Frame, nbrs [][]int, fallback float64) float64 {
	coarse, score := searchFOV(frames, nbrs, fovSearchMin, fovSearchMax, 2)
	if score <= 0 {
		setAllFOV(frames, fallback)
		return fallback
	}
	return refineFOV(frames, nbrs, coarse, 1.5)
}

// refineFOV searches ±span degrees around a known field of view in quarter-degree steps.
func refineFOV(frames []*Frame, nbrs [][]int, center, span float64) float64 {
	best, _ := searchFOV(frames, nbrs, center-span, center+span, 0.25)
	setAllFOV(frames, best)
	return best
}

// searchFOV evaluates evenly spaced fields of view and returns the best one with its score.
func searchFOV(frames []*Frame, nbrs [][]int, lo, hi, step float64) (float64, float64) {
	best, bestScore := lo, -2.0
	for fov := lo; fov <= hi+1e-9; fov += step {
		setAllFOV(frames, fov)
		if s := globalScore(frames, nbrs); s > bestScore {
			best, bestScore = fov, s
		}
	}
	return best, bestScore
}

// setAllFOV applies one field of view to every frame of the capture.
func setAllFOV(frames []*Frame, fov float64) {
	for _, f := range frames {
		f.setFOV(fov)
	}
}

// refineOrientations nudges each frame's rotation to maximize overlap correlation within maxDeg of its sensor value.
func refineOrientations(frames []*Frame, nbrs [][]int, maxDeg float64) {
	for _, step := range refineSteps {
		for pass := 0; pass < 3; pass++ {
			if !refinePass(frames, nbrs, deg(step), deg(maxDeg)) {
				break
			}
		}
	}
}

// refinePass tries ±step around each local axis for every frame except the anchor, reporting any improvement.
func refinePass(frames []*Frame, nbrs [][]int, step, maxAngle float64) bool {
	improved := false
	for i := 1; i < len(frames); i++ {
		current := frameScore(frames, nbrs, i, frames[i].rot)
		for _, axis := range localAxes {
			if rot, score, ok := bestNudge(frames, nbrs, i, axis, step, maxAngle); ok && score > current+1e-4 {
				frames[i].rot, current, improved = rot, score, true
			}
		}
	}
	return improved
}

// bestNudge evaluates rotating frame i by ±step around a local axis and returns the better candidate.
func bestNudge(frames []*Frame, nbrs [][]int, i int, axis Vec3, step, maxAngle float64) (Mat3, float64, bool) {
	var bestRot Mat3
	bestScore, found := -2.0, false
	for _, sign := range []float64{1, -1} {
		cand := frames[i].rot.Mul(AxisAngle(axis, sign*step))
		if cand.AngleTo(frames[i].sensor) > maxAngle {
			continue
		}
		if s := frameScore(frames, nbrs, i, cand); s > bestScore {
			bestRot, bestScore, found = cand, s, true
		}
	}
	return bestRot, bestScore, found
}
