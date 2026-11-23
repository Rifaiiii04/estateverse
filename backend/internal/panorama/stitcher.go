package panorama

import (
	"errors"
	"image"
	"math"
)

// MinFrames is the fewest photos accepted for a single room capture.
const MinFrames = 8

// Errors returned for captures that cannot be stitched.
var (
	ErrTooFewFrames = errors.New("too few frames to build a 360° panorama")
	ErrMixedSizes   = errors.New("all frames of one capture must share the same resolution")
)

// FrameInput is one captured photo plus the camera-to-world orientation quaternion (w, x, y, z) from the device.
type FrameInput struct {
	Image       image.Image
	Orientation [4]float64
}

// Options tunes the stitching pipeline.
type Options struct {
	OutputWidth   int     // equirectangular width in pixels; height is half
	FallbackFOV   float64 // horizontal field of view (degrees) used when calibration fails
	MaxCorrection float64 // largest orientation correction (degrees) allowed away from sensor values
	SkipRefine    bool    // place frames purely from sensors (fallback mode)
}

// Result is the stitched panorama with diagnostics.
type Result struct {
	Panorama  *image.RGBA
	FOV       float64 // estimated horizontal field of view of the phone camera
	Alignment float64 // alignment confidence (0..1): overlap correlation for Go, matched-point agreement for Hugin
	Coverage  float64 // fraction of the sphere covered by real pixels (0..1)
	Quality   int     // combined 0..100 score shown to the seller
	Matches   int     // matched feature points kept by the solver (0 when feature alignment was skipped)
	MatchRMS  float64 // remaining disagreement of matched points, in full-resolution photo pixels
	Engine    string  // "hugin" or "go": which pipeline produced the panorama
}

// DefaultOptions returns settings tuned for portrait phone video frames.
func DefaultOptions() Options {
	return Options{OutputWidth: 4096, FallbackFOV: 48, MaxCorrection: 8}
}

// Stitch calibrates the camera, refines orientations (correlation, then matched corners and a bundle adjustment),
// balances exposure, and renders the panorama with graph-cut seams.
func Stitch(inputs []FrameInput, opts Options) (*Result, error) {
	frames, err := buildFrames(inputs)
	if err != nil {
		return nil, err
	}
	nbrs := findNeighbors(frames)

	var stats alignStats
	if !opts.SkipRefine {
		fov := estimateFOV(frames, nbrs, opts.FallbackFOV)
		refineOrientations(frames, nbrs, opts.MaxCorrection)
		refineFOV(frames, nbrs, fov, 2)
		refineOrientations(frames, nbrs, opts.MaxCorrection)
		stats = alignFeatures(frames, nbrs)
	} else {
		setAllFOV(frames, opts.FallbackFOV)
	}

	alignment := math.Max(0, globalScore(frames, nbrs))
	gains := compensateGains(frames, nbrs)
	pano, coverage := render(frames, gains, opts.OutputWidth)
	if !opts.SkipRefine {
		if err := validateStitch(alignment, coverage); err != nil {
			return nil, err
		}
	}
	return &Result{
		Panorama:  pano,
		FOV:       frames[0].full.hfov(),
		Alignment: alignment,
		Coverage:  coverage,
		Quality:   qualityScore(alignment, coverage),
		Matches:   stats.matches,
		MatchRMS:  stats.rms,
		Engine:    "go",
	}, nil
}

// buildFrames validates inputs and converts them into internal frames sharing one resolution.
func buildFrames(inputs []FrameInput) ([]*Frame, error) {
	if len(inputs) < MinFrames {
		return nil, ErrTooFewFrames
	}
	size := inputs[0].Image.Bounds().Size()
	frames := make([]*Frame, len(inputs))
	for i, in := range inputs {
		if in.Image.Bounds().Size() != size {
			return nil, ErrMixedSizes
		}
		q := in.Orientation
		frames[i] = newFrame(in.Image, QuatToMat(q[0], q[1], q[2], q[3]))
	}
	return frames, nil
}

// qualityScore combines coverage and alignment into a 0..100 score.
func qualityScore(alignment, coverage float64) int {
	score := coverage * (0.4 + 0.6*clamp(alignment, 0, 1)) * 100
	return int(math.Round(score))
}
