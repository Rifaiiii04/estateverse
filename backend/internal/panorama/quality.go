package panorama

import (
	"errors"
	"math"
)

const (
	minSphereCoverage   = 0.985
	minAlignmentScore   = 0.45
	minFrameCorrelation = 0.25 // at least one textured overlap should agree with each exposed photo
)

// ErrIncompleteCoverage means captured photos leave a significant part of the sphere unseen.
var ErrIncompleteCoverage = errors.New("capture does not cover the full sphere")

// ErrUnreliableAlignment means overlapping photos cannot be matched confidently.
var ErrUnreliableAlignment = errors.New("capture images do not align reliably")

// checkAlignedPhotos checks each textured photo against its neighbours so a stale frame cannot hide in the mean.
func checkAlignedPhotos(frames []*Frame, neighbors [][]int) (float64, error) {
	unmatched := make([]bool, len(frames))
	alignment := parallelWeightedMean(len(frames), func(i int) weightedSum {
		total := weightedSum{}
		best := -1.0
		for _, j := range neighbors[i] {
			overlap := measureOverlap(frames[i], frames[j], frames[i].rot, frames[j].rot)
			if !overlap.valid {
				continue
			}
			best = math.Max(best, overlap.ncc)
			pair := overlapContribution(overlap)
			total.sum += pair.sum
			total.weight += pair.weight
		}
		unmatched[i] = total.weight > 0 && best < minFrameCorrelation
		return total
	})
	for _, failed := range unmatched {
		if failed {
			return alignment, ErrUnreliableAlignment
		}
	}
	return alignment, nil
}

// validateStitch rejects missing coverage or unmatched images instead of publishing interpolated or doubled rooms.
func validateStitch(alignment, coverage float64) error {
	if coverage < minSphereCoverage {
		return ErrIncompleteCoverage
	}
	if alignment < minAlignmentScore {
		return ErrUnreliableAlignment
	}
	return nil
}
