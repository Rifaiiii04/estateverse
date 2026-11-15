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
	Alignment float64 // mean overlap correlation after refinement (0..1)
	Coverage  float64 // fraction of the sphere covered by real pixels (0..1)
	Quality   int     // combined 0..100 score shown to the seller
}

// DefaultOptions returns settings tuned for portrait phone video frames.
func DefaultOptions() Options {
	return Options{OutputWidth: 4096, FallbackFOV: 48, MaxCorrection: 8}
}

// Stitch calibrates the camera, refines sensor orientations, balances exposure, and renders the panorama.
func Stitch(inputs []FrameInput, opts Options) (*Result, error) {
	frames, err := buildFrames(inputs)
	if err != nil {
		return nil, err
	}
	nbrs := findNeighbors(frames)

	fov := opts.FallbackFOV
	if !opts.SkipRefine {
		fov = estimateFOV(frames, nbrs, opts.FallbackFOV)
		refineOrientations(frames, nbrs, opts.MaxCorrection)
		fov = refineFOV(frames, nbrs, fov, 2)
		refineOrientations(frames, nbrs, opts.MaxCorrection)
	} else {
		setAllFOV(frames, fov)
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
		FOV:       fov,
		Alignment: alignment,
		Coverage:  coverage,
		Quality:   qualityScore(alignment, coverage),
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
