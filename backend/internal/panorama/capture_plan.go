package panorama

import (
	"fmt"
	"math"
	"sort"
)

const maxPlannedFrames = 48

// PlanCapture greedily covers the measured viewing sphere while requiring connected overlap for image alignment.
func PlanCapture(hfov, aspect float64) ([]CaptureTarget, error) {
	if math.IsNaN(hfov) || math.IsNaN(aspect) || hfov < 25 || hfov > 140 || aspect < 0.4 || aspect > 2.5 {
		return nil, fmt.Errorf("unsupported camera footprint")
	}
	points := sphereSamples()
	var best []CaptureTarget
	for _, fine := range []bool{false, true} {
		plan, err := optimizeCapture(points, hfov, aspect, captureCandidates(points, hfov, aspect, fine))
		if err == nil && (best == nil || len(plan) < len(best)) {
			best = plan
		}
	}
	if best == nil {
		return nil, fmt.Errorf("camera requires too many photos for reliable coverage")
	}
	orderPlan(best)
	return best, nil
}

// optimizeCapture compares coverage contributions for one candidate resolution and then removes redundant views.
func optimizeCapture(points []sphereSample, hfov, aspect float64, candidates []captureFootprint) ([]CaptureTarget, error) {
	covered := make([]bool, len(points))
	total := 0.0
	for _, p := range points {
		total += p.weight
	}
	plan := []CaptureTarget{{Yaw: 0, Ring: "horizon"}, {Yaw: 20, Ring: "horizon"}, {Yaw: 40, Ring: "horizon"}}
	area := 0.0
	for _, t := range plan {
		area += addFootprint(targetFootprint(t, points, hfov, aspect), covered, points)
	}
	used := make([]bool, len(candidates))
	for area/total < 0.998 || len(plan) < MinFrames {
		index := bestFootprint(candidates, used, covered, points)
		if index < 0 || len(plan) >= 64 {
			return nil, fmt.Errorf("cannot cover camera footprint")
		}
		used[index] = true
		plan = append(plan, candidates[index].target)
		area += addFootprint(candidates[index], covered, points)
	}
	plan = prunePlan(plan, points, hfov, aspect, total)
	if len(plan) > maxPlannedFrames {
		return nil, fmt.Errorf("camera requires too many photos")
	}
	return plan, nil
}

// prunePlan removes redundant additional views while retaining all calibration photos and the coverage safety margin.
func prunePlan(plan []CaptureTarget, points []sphereSample, hfov, aspect, total float64) []CaptureTarget {
	counts := make([]int, len(points))
	footprints := make([]captureFootprint, len(plan))
	for i, t := range plan {
		footprints[i] = targetFootprint(t, points, hfov, aspect)
		for _, p := range footprints[i].samples {
			counts[p]++
		}
	}
	missing := 0.0
	for i, n := range counts {
		if n == 0 {
			missing += points[i].weight
		}
	}
	for len(plan) > MinFrames {
		best, loss := -1, math.Inf(1)
		for i := 3; i < len(plan); i++ {
			unique := 0.0
			for _, p := range footprints[i].samples {
				if counts[p] == 1 {
					unique += points[p].weight
				}
			}
			if unique < loss && (missing+unique)/total <= 0.002 {
				best, loss = i, unique
			}
		}
		if best < 0 {
			break
		}
		for _, p := range footprints[best].samples {
			counts[p]--
		}
		missing += loss
		plan = append(plan[:best], plan[best+1:]...)
		footprints = append(footprints[:best], footprints[best+1:]...)
	}
	return plan
}

// bestFootprint selects the largest new solid-angle coverage with at least 18 percent overlap with captured territory.
func bestFootprint(candidates []captureFootprint, used, covered []bool, points []sphereSample) int {
	best, bestGain := -1, 0.0
	for i, c := range candidates {
		if used[i] || c.area == 0 {
			continue
		}
		gain := 0.0
		for _, p := range c.samples {
			if !covered[p] {
				gain += points[p].weight
			}
		}
		overlap := (c.area - gain) / c.area
		if overlap >= 0.18 && gain > bestGain+1e-8 {
			best, bestGain = i, gain
		}
	}
	return best
}

// addFootprint counts only newly observed surface area, so interpolated pixels never substitute for capture coverage.
func addFootprint(c captureFootprint, covered []bool, points []sphereSample) float64 {
	gain := 0.0
	for _, i := range c.samples {
		if !covered[i] {
			covered[i] = true
			gain += points[i].weight
		}
	}
	return gain
}

// orderPlan retains the three calibration photos and groups additional targets into convenient sweeps.
func orderPlan(plan []CaptureTarget) {
	remaining := plan[3:]
	sort.SliceStable(remaining, func(i, j int) bool {
		a, b := remaining[i], remaining[j]
		if a.Pitch == b.Pitch {
			return a.Yaw < b.Yaw
		}
		if a.Pitch == 0 {
			return true
		}
		if b.Pitch == 0 {
			return false
		}
		return a.Pitch > b.Pitch
	})
	for i := range plan {
		plan[i].ID = i
	}
}
