package panorama

import (
	"fmt"
	"math"
)

const (
	maxPlannedFrames = 48
	planCoverage     = 0.998 // share of the sphere the planned photos must observe
	minRingOverlap   = 0.18  // share of each tilted photo that must overlap the rings nearer eye level
	poleReserve      = 2.5   // extra tilt beyond the pole after the lens footprint's aiming margin
)

// calibrationYaws are the first three eye-level photos; the horizon ring continues from the last one.
var calibrationYaws = []float64{0, 20, 40}

// preferredOverlaps are the sideways overlaps between neighbouring photos; equal photo counts favour the larger.
var preferredOverlaps = []float64{0.3, 0.25, 0.2}

// fallbackOverlap is accepted only when a narrow lens (often the conservative uncalibrated estimate) would
// otherwise exceed the photo cap.
const fallbackOverlap = 0.15

// PlanCapture lays photos along one continuous path sized from the measured lens: an eye-level ring turning
// right, rising rings, the ceiling, falling rings, then the floor, so the photographer never hunts for points.
func PlanCapture(hfov, aspect float64) ([]CaptureTarget, error) {
	if math.IsNaN(hfov) || math.IsNaN(aspect) || hfov < 25 || hfov > 140 || aspect < 0.4 || aspect > 2.5 {
		return nil, fmt.Errorf("unsupported camera footprint")
	}
	lens := newLensFootprint(hfov, aspect)
	points := sphereSamples()
	var best []CaptureTarget
	for _, overlap := range preferredOverlaps {
		best = bestRingPlan(lens, points, overlap, best)
	}
	if best == nil {
		best = bestRingPlan(lens, points, fallbackOverlap, nil)
	}
	if best == nil {
		return nil, fmt.Errorf("camera requires too many photos for reliable coverage")
	}
	for i := range best {
		best[i].ID = i
	}
	return best, nil
}

// bestRingPlan returns the shortest covering ring layout for one sideways overlap, keeping best unless beaten.
func bestRingPlan(lens lensFootprint, points []sphereSample, overlap float64, best []CaptureTarget) []CaptureTarget {
	options := ringPitchOptions()
	// Try the smallest whole-degree tilt that still reaches the pole during a moving shutter.
	minPolePitch := math.Ceil(90 + poleReserve - lens.halfV)
	if minPolePitch > 0 && minPolePitch <= 75 {
		options = append(options, []float64{minPolePitch})
	}
	for _, pitches := range options {
		for _, poles := range []bool{true, false} {
			plan := ringPlan(lens, pitches, overlap, poles)
			if len(plan) <= maxPlannedFrames && (best == nil || len(plan) < len(best)) && planCovers(plan, lens, points) {
				best = plan
			}
		}
	}
	return best
}

// ringPitchOptions enumerates one to three tilted rings per hemisphere on a 5° grid, at least 10° apart.
func ringPitchOptions() [][]float64 {
	var out [][]float64
	var grow func(prefix []float64, from float64)
	grow = func(prefix []float64, from float64) {
		for pitch := from; pitch <= 75; pitch += 5 {
			next := append(append([]float64{}, prefix...), pitch)
			out = append(out, next)
			if len(next) < 3 {
				grow(next, pitch+10)
			}
		}
	}
	grow(nil, 20)
	return out
}

// ringPlan orders every photo along the path; each ring starts at the previous photo's heading, so moving
// between rings is a pure tilt and every ring is swept clockwise (turning right). Pole photos are optional
// because a steep top ring of a wide lens already sees the ceiling and floor.
func ringPlan(lens lensFootprint, pitches []float64, overlap float64, poles bool) []CaptureTarget {
	plan := make([]CaptureTarget, 0, maxPlannedFrames)
	for _, yaw := range calibrationYaws {
		plan = append(plan, CaptureTarget{Yaw: yaw, Ring: "horizon"})
	}
	plan = appendHorizon(plan, lens, overlap)
	for _, side := range []struct {
		sign       float64
		ring, pole string
	}{{1, "up", "ceiling"}, {-1, "down", "floor"}} {
		for _, pitch := range pitches {
			plan = appendRing(plan, lens, side.sign*pitch, side.ring, overlap)
		}
		if poles {
			plan = append(plan, CaptureTarget{Yaw: lastYaw(plan), Pitch: side.sign * 90, Ring: side.pole})
		}
	}
	return plan
}

// appendHorizon spreads the rest of the eye-level ring evenly from the last calibration photo back to 0°.
func appendHorizon(plan []CaptureTarget, lens lensFootprint, overlap float64) []CaptureTarget {
	start := calibrationYaws[len(calibrationYaws)-1]
	arc := 360 - start
	gaps := math.Ceil(arc / (2 * lens.halfYaw(0) * (1 - overlap)))
	for k := 1.0; k < gaps; k++ {
		plan = append(plan, CaptureTarget{Yaw: wrapYaw(start + k*arc/gaps), Ring: "horizon"})
	}
	return plan
}

// appendRing adds one evenly spaced tilted ring that begins where the photographer is already facing.
func appendRing(plan []CaptureTarget, lens lensFootprint, pitch float64, ring string, overlap float64) []CaptureTarget {
	count := math.Max(3, math.Ceil(360/(2*lens.halfYaw(pitch)*(1-overlap))))
	start := lastYaw(plan)
	for k := 0.0; k < count; k++ {
		plan = append(plan, CaptureTarget{Yaw: wrapYaw(start + k*360/count), Pitch: pitch, Ring: ring})
	}
	return plan
}

// planCovers checks that each tilted photo overlaps the rings nearer eye level and that all photos cover the sphere.
func planCovers(plan []CaptureTarget, lens lensFootprint, points []sphereSample) bool {
	// Both hemispheres use the same pitches, and the last photo is on the steepest ring or at the pole.
	if math.Abs(plan[len(plan)-1].Pitch)+lens.halfV < 90+poleReserve {
		return false
	}
	all := make([]bool, len(points))
	for _, side := range []float64{1, -1} {
		inner, current := make([]bool, len(points)), make([]bool, len(points))
		pitch := 0.0
		for _, target := range plan {
			if target.Pitch*side < 0 {
				continue
			}
			if target.Pitch != pitch {
				copy(inner, current)
				pitch = target.Pitch
			}
			fp := targetFootprint(target, points, lens)
			if target.Pitch != 0 && overlapShare(fp, inner, points) < minRingOverlap {
				return false
			}
			markFootprint(fp, current, all)
		}
	}
	return coveredShare(all, points) >= planCoverage
}

// overlapShare is the fraction of a photo's solid angle that earlier rings already observed.
func overlapShare(fp captureFootprint, covered []bool, points []sphereSample) float64 {
	if fp.area == 0 {
		return 0
	}
	shared := 0.0
	for _, i := range fp.samples {
		if covered[i] {
			shared += points[i].weight
		}
	}
	return shared / fp.area
}

// markFootprint records a photo's probes in every given coverage set.
func markFootprint(fp captureFootprint, sets ...[]bool) {
	for _, i := range fp.samples {
		for _, set := range sets {
			set[i] = true
		}
	}
}

// coveredShare is the observed fraction of the sphere's weighted probes.
func coveredShare(covered []bool, points []sphereSample) float64 {
	seen, total := 0.0, 0.0
	for i, p := range points {
		total += p.weight
		if covered[i] {
			seen += p.weight
		}
	}
	return seen / total
}

// lastYaw is the heading of the most recent photo, where the next ring begins.
func lastYaw(plan []CaptureTarget) float64 {
	return plan[len(plan)-1].Yaw
}

// wrapYaw rounds a heading to whole degrees inside [0, 360).
func wrapYaw(yaw float64) float64 {
	return math.Mod(math.Round(yaw), 360)
}
