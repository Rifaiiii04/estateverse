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
	samples []int
	area    float64
}

// lensFootprint holds the usable half-angles (degrees) of one photo after reserving a margin for aiming error.
type lensFootprint struct {
	halfH, halfV float64
}

// newLensFootprint derives the guaranteed photo extent from the measured horizontal FOV and frame aspect.
func newLensFootprint(hfov, aspect float64) lensFootprint {
	return lensFootprint{
		halfH: math.Max(10, hfov/2-2),
		halfV: math.Atan(math.Tan(deg(hfov)/2)/aspect)*180/math.Pi - 2,
	}
}

// halfYaw is how far one photo reaches sideways around the room at its centre row for a given tilt.
func (l lensFootprint) halfYaw(pitch float64) float64 {
	return math.Atan(math.Tan(deg(l.halfH))/math.Cos(deg(pitch))) * 180 / math.Pi
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

// targetFootprint projects coverage probes through the lens tilted straight from the target heading, which is
// also how a ceiling or floor photo is held after tilting up or down from the previous photo.
func targetFootprint(target CaptureTarget, points []sphereSample, lens lensFootprint) captureFootprint {
	rot := EulerToMat(deg(target.Yaw), deg(target.Pitch), 0)
	tanH, tanV := math.Tan(deg(lens.halfH)), math.Tan(deg(lens.halfV))
	var out captureFootprint
	for i, point := range points {
		p := rot.MulTVec(point.direction)
		if p.Z < 0 && math.Abs(p.X/-p.Z) <= tanH && math.Abs(p.Y/-p.Z) <= tanV {
			out.samples = append(out.samples, i)
			out.area += point.weight
		}
	}
	return out
}
