package panorama

import "math"

// expRot converts a rotation vector (axis·angle in radians) into a rotation matrix.
func expRot(w Vec3) Mat3 {
	angle := math.Sqrt(w.Dot(w))
	if angle < 1e-15 {
		return identity()
	}
	return AxisAngle(w, angle)
}

// logRot converts a rotation matrix into its rotation vector (axis·angle in radians).
func logRot(m Mat3) Vec3 {
	v := Vec3{m[7] - m[5], m[2] - m[6], m[3] - m[1]}
	angle := math.Acos(clamp((m[0]+m[4]+m[8]-1)/2, -1, 1))
	s := math.Sin(angle)
	if s < 1e-9 {
		return Vec3{v.X / 2, v.Y / 2, v.Z / 2}
	}
	k := angle / (2 * s)
	return Vec3{v.X * k, v.Y * k, v.Z * k}
}

// matToQuat converts a rotation matrix into a (w, x, y, z) quaternion.
func matToQuat(m Mat3) [4]float64 {
	tr := m[0] + m[4] + m[8]
	switch {
	case tr > 0:
		s := math.Sqrt(tr+1) * 2
		return [4]float64{s / 4, (m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s}
	case m[0] > m[4] && m[0] > m[8]:
		s := math.Sqrt(1+m[0]-m[4]-m[8]) * 2
		return [4]float64{(m[7] - m[5]) / s, s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s}
	case m[4] > m[8]:
		s := math.Sqrt(1+m[4]-m[0]-m[8]) * 2
		return [4]float64{(m[2] - m[6]) / s, (m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s}
	default:
		s := math.Sqrt(1+m[8]-m[0]-m[4]) * 2
		return [4]float64{(m[3] - m[1]) / s, (m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4}
	}
}

// transpose returns the inverse of a rotation matrix.
func transpose(m Mat3) Mat3 {
	return Mat3{m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]}
}

// MulT composes the inverse of m with n, i.e. mᵀ·n, which is the rotation from n's frame into m's frame.
func (m Mat3) MulT(n Mat3) Mat3 {
	t := Mat3{m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]}
	return t.Mul(n)
}

// mulSkew returns m·[c]×, the derivative of m·exp([ω]×)·c with respect to ω, negated.
func mulSkew(m Mat3, c Vec3) Mat3 {
	skew := Mat3{0, -c.Z, c.Y, c.Z, 0, -c.X, -c.Y, c.X, 0}
	return m.Mul(skew)
}

// solveCholesky solves the symmetric positive-definite system a·x = b; ok is false if a is not positive definite.
func solveCholesky(a []float64, b []float64, n int) ([]float64, bool) {
	l := make([]float64, n*n)
	for i := 0; i < n; i++ {
		for j := 0; j < i; j++ {
			l[i*n+j] = (a[i*n+j] - rowDot(l, i, j, j, n)) / l[j*n+j]
		}
		d := a[i*n+i] - rowDot(l, i, i, i, n)
		if d <= 0 {
			return nil, false
		}
		l[i*n+i] = math.Sqrt(d)
	}
	return backSubstitute(l, b, n), true
}

// rowDot returns the dot product of the first k entries of rows r1 and r2 of an n×n matrix.
func rowDot(m []float64, r1, r2, k, n int) float64 {
	sum := 0.0
	for t := 0; t < k; t++ {
		sum += m[r1*n+t] * m[r2*n+t]
	}
	return sum
}

// backSubstitute solves L·Lᵀ·x = b given the lower-triangular Cholesky factor L.
func backSubstitute(l, b []float64, n int) []float64 {
	y := make([]float64, n)
	for i := 0; i < n; i++ {
		sum := b[i]
		for k := 0; k < i; k++ {
			sum -= l[i*n+k] * y[k]
		}
		y[i] = sum / l[i*n+i]
	}
	x := make([]float64, n)
	for i := n - 1; i >= 0; i-- {
		sum := y[i]
		for k := i + 1; k < n; k++ {
			sum -= l[k*n+i] * x[k]
		}
		x[i] = sum / l[i*n+i]
	}
	return x
}
