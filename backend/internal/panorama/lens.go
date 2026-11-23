package panorama

import "math"

// maxDistortion bounds the radial distortion term so the lens model stays monotonic across the whole image.
const maxDistortion = 0.1

// camera is a pinhole model with one radial distortion term and a centered principal point in continuous
// pixel coordinates. Distortion acts on normalized coordinates: r_distorted = r·(1 + k1·r²).
type camera struct {
	w, h, cx, cy, f float64
	k1              float64
	r2max           float64 // largest undistorted r² that still projects monotonically (only used when k1 ≠ 0)
}

// project maps a world direction into image coordinates and reports whether it lands inside the image.
func (c camera) project(rot Mat3, d Vec3) (x, y float64, ok bool) {
	p := rot.MulTVec(d)
	if p.Z > -1e-6 {
		return 0, 0, false
	}
	xn, yn := p.X/(-p.Z), p.Y/(-p.Z)
	s := 1.0
	if c.k1 != 0 {
		r2 := xn*xn + yn*yn
		if r2 > c.r2max {
			return 0, 0, false
		}
		s += c.k1 * r2
	}
	x = c.cx + c.f*xn*s
	y = c.cy - c.f*yn*s
	return x, y, x >= 0.5 && y >= 0.5 && x <= c.w-0.5 && y <= c.h-0.5
}

// unproject maps image coordinates back into a unit world direction.
func (c camera) unproject(rot Mat3, x, y float64) Vec3 {
	xd, yd := (x-c.cx)/c.f, -(y-c.cy)/c.f
	if c.k1 != 0 {
		s := undistortScale(math.Hypot(xd, yd), c.k1)
		xd, yd = xd*s, yd*s
	}
	return rot.MulVec(Vec3{xd, yd, -1}).Norm()
}

// withLens returns the camera with a new focal length and distortion, refreshing the monotonic projection bound.
func (c camera) withLens(f, k1 float64) camera {
	c.f, c.k1 = f, k1
	c.r2max = math.Inf(1)
	if k1 == 0 {
		return c
	}
	rd := c.cornerRadius()
	ru := rd * undistortScale(rd, k1)
	c.r2max = ru * ru * 1.21
	if k1 < 0 {
		c.r2max = math.Min(c.r2max, 0.9/(-3*k1))
	}
	return c
}

// cornerRadius is the normalized distance from the principal point to the farthest image corner.
func (c camera) cornerRadius() float64 {
	return math.Hypot(math.Max(c.cx, c.w-c.cx), math.Max(c.cy, c.h-c.cy)) / c.f
}

// halfAngle returns the angular radius of the image footprint around the optical axis.
func (c camera) halfAngle() float64 {
	rd := c.cornerRadius()
	return math.Atan(rd * undistortScale(rd, c.k1))
}

// hfov returns the horizontal field of view in degrees across the full image width.
func (c camera) hfov() float64 {
	rd := (c.w / 2) / c.f
	return 2 * math.Atan(rd*undistortScale(rd, c.k1)) * 180 / math.Pi
}

// undistortScale returns r/rd where the undistorted radius r solves r·(1 + k1·r²) = rd (Newton's method).
func undistortScale(rd, k1 float64) float64 {
	if rd < 1e-12 || k1 == 0 {
		return 1
	}
	r := rd
	for range 10 {
		slope := 1 + 3*k1*r*r
		if slope < 0.1 {
			break
		}
		step := (r + k1*r*r*r - rd) / slope
		r -= step
		if math.Abs(step) < 1e-12 {
			break
		}
	}
	return r / rd
}

// cameraRay converts a pixel into a unit camera-space direction for an explicit focal length and distortion.
func cameraRay(c camera, x, y, f, k1 float64) Vec3 {
	xd, yd := (x-c.cx)/f, -(y-c.cy)/f
	s := undistortScale(math.Hypot(xd, yd), k1)
	return Vec3{xd * s, yd * s, -1}.Norm()
}
