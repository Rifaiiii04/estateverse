package panorama

import "math"

const (
	baIterations = 60
	baMinDamping = 1e-9
	baMaxDamping = 1e8
)

// normalEq is a dense Gauss-Newton system H·δ = -g accumulated from weighted residual rows.
type normalEq struct {
	n    int
	h, g []float64
}

// newNormalEq allocates an empty system for n unknowns.
func newNormalEq(n int) *normalEq {
	return &normalEq{n: n, h: make([]float64, n*n), g: make([]float64, n)}
}

// addRows accumulates three residual rows that touch the same eight unknowns.
func (e *normalEq) addRows(idx [8]int, rows [3][8]float64, res [3]float64, w float64) {
	for k := 0; k < 3; k++ {
		e.addRow(idx[:], rows[k][:], res[k], w)
	}
}

// addRow accumulates one weighted residual row into the system.
func (e *normalEq) addRow(idx []int, row []float64, r, w float64) {
	for i, pi := range idx {
		if row[i] == 0 {
			continue
		}
		e.g[pi] += w * row[i] * r
		for j, pj := range idx {
			e.h[pi*e.n+pj] += w * row[i] * row[j]
		}
	}
}

// addPrior accumulates a single-unknown prior residual with derivative d and value r.
func (e *normalEq) addPrior(i int, d, r float64) {
	e.g[i] += d * r
	e.h[i*e.n+i] += d * d
}

// solveDamped solves the Levenberg-Marquardt step (H + μ·diag(H))·δ = -g.
func (e *normalEq) solveDamped(mu float64) ([]float64, bool) {
	a := append([]float64(nil), e.h...)
	b := make([]float64, e.n)
	for i := 0; i < e.n; i++ {
		a[i*e.n+i] += mu*a[i*e.n+i] + 1e-12
		b[i] = -e.g[i]
	}
	return solveCholesky(a, b, e.n)
}

// solve runs Levenberg-Marquardt from a starting state and returns the lowest-cost state found.
func (p *baProblem) solve(start baState) baState {
	st, cost, mu := start, p.cost(start), 1e-4
	for it := 0; it < baIterations && mu < baMaxDamping; it++ {
		delta, ok := p.linearize(st).solveDamped(mu)
		if !ok {
			mu *= 10
			continue
		}
		cand := st.apply(delta)
		next := p.cost(cand)
		if next >= cost {
			mu *= 4
			continue
		}
		converged := cost-next < 1e-9*cost
		st, cost, mu = cand, next, math.Max(mu/3, baMinDamping)
		if converged {
			break
		}
	}
	return st
}

// apply returns a new state moved by an update: local rotation vectors, log focal step, and k1 step.
func (st baState) apply(delta []float64) baState {
	out := baState{rot: make([]Mat3, len(st.rot))}
	for i, r := range st.rot {
		out.rot[i] = r.Mul(expRot(Vec3{delta[3*i], delta[3*i+1], delta[3*i+2]}))
	}
	n := len(delta)
	out.f = st.f * math.Exp(clamp(delta[n-2], -0.2, 0.2))
	out.k1 = clamp(st.k1+delta[n-1], -maxDistortion, maxDistortion)
	return out
}
