package panorama

import "errors"

const (
	minSphereCoverage = 0.985
	minAlignmentScore = 0.45
)

// ErrIncompleteCoverage means captured photos leave a significant part of the sphere unseen.
var ErrIncompleteCoverage = errors.New("capture does not cover the full sphere")

// ErrUnreliableAlignment means overlapping photos cannot be matched confidently.
var ErrUnreliableAlignment = errors.New("capture images do not align reliably")

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
