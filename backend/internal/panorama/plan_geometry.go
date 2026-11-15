package panorama

import "math"

// CaptureTarget is one required raw photograph direction in a server-computed capture plan.
type CaptureTarget struct {
	ID    int     `json:"id"`
	Yaw   float64 `json:"yaw"`
	Pitch float64 `json:"pitch"`
	Ring  string  `json:"ring"`
}

type sphereSample struct {
	direction Vec3
	weight    float64
}
type captureFootprint struct {
	target  CaptureTarget
	samples []int
	area    float64
}

// sphereSamples distributes weighted coverage probes over the entire sphere including ceiling and floor.
func sphereSamples() []sphereSample {
	var points []sphereSample
	for lat := -87.5; lat < 90; lat += 5 {
		for lon := 0.0; lon < 360; lon += 10 {
			points = append(points, sphereSample{DirFromLonLat(deg(lon), deg(lat)), math.Cos(deg(lat))})
		}
	}
	return points
}

// targetFootprint projects coverage probes through the measured lens with a margin for aiming error.
func targetFootprint(target CaptureTarget, points []sphereSample, hfov, aspect float64) captureFootprint {
	halfH := math.Max(10, hfov/2-2)
	halfV := math.Atan(math.Tan(deg(hfov)/2)/aspect)*180/math.Pi - 2
	rot := EulerToMat(deg(target.Yaw), deg(target.Pitch), 0)
	out := captureFootprint{target: target}
	for i, point := range points {
		p := rot.MulTVec(point.direction)
		inside := p.Z < 0 && math.Abs(p.X/-p.Z) <= math.Tan(deg(halfH)) && math.Abs(p.Y/-p.Z) <= math.Tan(deg(halfV))
		if inside {
			out.samples = append(out.samples, i)
			out.area += point.weight
		}
	}
	return out
}

// captureCandidates generates possible viewpoints for the optimizer rather than exposing fixed photo-count modes.
func captureCandidates(points []sphereSample, hfov, aspect float64, fine bool) []captureFootprint {
	var candidates []captureFootprint
	pitches := []float64{0, 30, -30, 45, -45, 60, -60, 90, -90}
	stepSize := 15.0
	if fine {
		pitches = []float64{0, 30, -30, 45, -45, 55, -55, 65, -65, 75, -75, 90, -90}
		stepSize = 10
	}
	for _, pitch := range pitches {
		step := stepSize
		if math.Abs(pitch) == 90 {
			step = 360
		}
		for yaw := 0.0; yaw < 360; yaw += step {
			ring := "horizon"
			if pitch > 0 {
				ring = "up"
			}
			if pitch < 0 {
				ring = "down"
			}
			candidates = append(candidates, targetFootprint(CaptureTarget{Yaw: yaw, Pitch: pitch, Ring: ring}, points, hfov, aspect))
		}
	}
	return candidates
}
