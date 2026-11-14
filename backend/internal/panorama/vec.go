// Package panorama stitches orientation-tagged phone photos into equirectangular 360° panoramas.
//
// World frame: X points right, Y points up, and -Z is the forward reference direction.
// Camera frame: the camera looks down -Z with +X to the right and +Y towards the top of the image.
package panorama

import "math"

// Vec3 is a three-dimensional vector in camera or world coordinates.
type Vec3 struct{ X, Y, Z float64 }

// Dot returns the scalar product of two vectors.
func (a Vec3) Dot(b Vec3) float64 {
	return a.X*b.X + a.Y*b.Y + a.Z*b.Z
}

// Norm returns the unit-length version of the vector.
func (a Vec3) Norm() Vec3 {
	l := math.Sqrt(a.Dot(a))
	if l == 0 {
		return a
	}
	return Vec3{a.X / l, a.Y / l, a.Z / l}
}

// Mat3 is a row-major 3x3 rotation matrix mapping camera coordinates into world coordinates.
type Mat3 [9]float64

// identity returns the 3x3 identity rotation.
func identity() Mat3 {
	return Mat3{1, 0, 0, 0, 1, 0, 0, 0, 1}
}

// MulVec rotates a camera-space vector into world space.
func (m Mat3) MulVec(v Vec3) Vec3 {
	return Vec3{
		m[0]*v.X + m[1]*v.Y + m[2]*v.Z,
		m[3]*v.X + m[4]*v.Y + m[5]*v.Z,
		m[6]*v.X + m[7]*v.Y + m[8]*v.Z,
	}
}

// MulTVec rotates a world-space vector into camera space using the transpose.
func (m Mat3) MulTVec(v Vec3) Vec3 {
	return Vec3{
		m[0]*v.X + m[3]*v.Y + m[6]*v.Z,
		m[1]*v.X + m[4]*v.Y + m[7]*v.Z,
		m[2]*v.X + m[5]*v.Y + m[8]*v.Z,
	}
}

// Mul composes two rotations so that (m·n)·v equals m·(n·v).
func (m Mat3) Mul(n Mat3) Mat3 {
	var out Mat3
	for r := 0; r < 3; r++ {
		for c := 0; c < 3; c++ {
			out[r*3+c] = m[r*3]*n[c] + m[r*3+1]*n[3+c] + m[r*3+2]*n[6+c]
		}
	}
	return out
}

// Forward returns the world direction of the camera's optical axis.
func (m Mat3) Forward() Vec3 {
	return Vec3{-m[2], -m[5], -m[8]}
}

// AngleTo returns the rotation angle in radians separating two orientations.
func (m Mat3) AngleTo(n Mat3) float64 {
	trace := 0.0
	for i := range m {
		trace += m[i] * n[i]
	}
	return math.Acos(clamp((trace-1)/2, -1, 1))
}

// QuatToMat converts a quaternion (w, x, y, z) into a rotation matrix, normalizing it first.
func QuatToMat(w, x, y, z float64) Mat3 {
	l := math.Sqrt(w*w + x*x + y*y + z*z)
	if l == 0 {
		return identity()
	}
	w, x, y, z = w/l, x/l, y/l, z/l
	return Mat3{
		1 - 2*(y*y+z*z), 2 * (x*y - w*z), 2 * (x*z + w*y),
		2 * (x*y + w*z), 1 - 2*(x*x+z*z), 2 * (y*z - w*x),
		2 * (x*z - w*y), 2 * (y*z + w*x), 1 - 2*(x*x+y*y),
	}
}

// AxisAngle builds the rotation of angle radians around a unit axis (Rodrigues formula).
func AxisAngle(axis Vec3, angle float64) Mat3 {
	a := axis.Norm()
	c, s := math.Cos(angle), math.Sin(angle)
	t := 1 - c
	return Mat3{
		t*a.X*a.X + c, t*a.X*a.Y - s*a.Z, t*a.X*a.Z + s*a.Y,
		t*a.X*a.Y + s*a.Z, t*a.Y*a.Y + c, t*a.Y*a.Z - s*a.X,
		t*a.X*a.Z - s*a.Y, t*a.Y*a.Z + s*a.X, t*a.Z*a.Z + c,
	}
}

// EulerToMat builds Ry(-yaw)·Rx(pitch)·Rz(roll): yaw turns right, pitch tilts up, roll spins the image.
func EulerToMat(yaw, pitch, roll float64) Mat3 {
	ry := AxisAngle(Vec3{0, 1, 0}, -yaw)
	rx := AxisAngle(Vec3{1, 0, 0}, pitch)
	rz := AxisAngle(Vec3{0, 0, 1}, roll)
	return ry.Mul(rx).Mul(rz)
}

// DirFromLonLat converts equirectangular longitude/latitude (radians) into a world direction.
func DirFromLonLat(lon, lat float64) Vec3 {
	cl := math.Cos(lat)
	return Vec3{cl * math.Sin(lon), math.Sin(lat), -cl * math.Cos(lon)}
}

// LonLatFromDir converts a world direction into equirectangular longitude/latitude (radians).
func LonLatFromDir(d Vec3) (lon, lat float64) {
	n := d.Norm()
	return math.Atan2(n.X, -n.Z), math.Asin(clamp(n.Y, -1, 1))
}

// clamp limits v to the closed interval [lo, hi].
func clamp(v, lo, hi float64) float64 {
	return math.Max(lo, math.Min(hi, v))
}

// deg converts degrees to radians.
func deg(d float64) float64 {
	return d * math.Pi / 180
}
