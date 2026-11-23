package panorama

import (
	"fmt"
	"math"
)

// Calibration describes a measured lens footprint, or a conservative fallback when overlaps have too little texture.
type Calibration struct {
	HorizontalFOV float64         `json:"horizontal_fov"`
	AspectRatio   float64         `json:"aspect_ratio"`
	Confidence    float64         `json:"confidence"`
	Calibrated    bool            `json:"calibrated"`
	Targets       []CaptureTarget `json:"targets"`
}

// EstimateFOV measures a capture's horizontal field of view from its overlaps, returning fallback when it cannot.
// It is the starting lens guess handed to Hugin, which then refines it from matched features.
func EstimateFOV(inputs []FrameInput, fallback float64) float64 {
	frames, err := buildFrames(inputs)
	if err != nil {
		return fallback
	}
	return estimateFOV(frames, findNeighbors(frames), fallback)
}

// Calibrate estimates the lens from three overlapping raw views without producing or storing a panorama.
func Calibrate(inputs []FrameInput) (*Calibration, error) {
	if len(inputs) != 3 {
		return nil, fmt.Errorf("lens calibration requires three overlapping photos")
	}
	frames := make([]*Frame, len(inputs))
	size := inputs[0].Image.Bounds().Size()
	for i, input := range inputs {
		if input.Image.Bounds().Size() != size {
			return nil, ErrMixedSizes
		}
		q := input.Orientation
		frames[i] = newFrame(input.Image, QuatToMat(q[0], q[1], q[2], q[3]))
	}
	nbrs := findNeighbors(frames)
	lo, _ := lensSearchBounds(frames[0].full)
	fov := estimateFOV(frames, nbrs, lo)
	confidence := math.Max(0, globalScore(frames, nbrs))
	calibrated := confidence >= 0.75
	if !calibrated {
		fov = lo
	}
	aspect := float64(size.X) / float64(size.Y)
	targets, err := PlanCapture(fov, aspect)
	if err != nil {
		return nil, err
	}
	return &Calibration{HorizontalFOV: fov, AspectRatio: aspect, Confidence: confidence, Calibrated: calibrated, Targets: targets}, nil
}
