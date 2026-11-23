package panorama

import "math"

// flowEps is the smallest residual capacity treated as usable.
const flowEps = 1e-9

// flowGraph is a residual graph for minimum s-t cuts solved with Dinic's algorithm.
// Arcs are stored in pairs so arc e and arc e^1 are each other's reverse.
type flowGraph struct {
	head  []int32
	next  []int32
	to    []int32
	cap   []float64
	level []int32
	iter  []int32
}

// newFlowGraph allocates a graph with the given number of nodes and no arcs.
func newFlowGraph(nodes int) *flowGraph {
	g := &flowGraph{head: make([]int32, nodes), level: make([]int32, nodes), iter: make([]int32, nodes)}
	for i := range g.head {
		g.head[i] = -1
	}
	return g
}

// addEdge adds an arc u→v with capacity c and its reverse arc v→u with capacity rc.
func (g *flowGraph) addEdge(u, v int, c, rc float64) {
	e := int32(len(g.to))
	g.to = append(g.to, int32(v), int32(u))
	g.cap = append(g.cap, c, rc)
	g.next = append(g.next, g.head[u], g.head[v])
	g.head[u], g.head[v] = e, e+1
}

// minCut saturates a maximum flow from s to t and reports, per node, whether it stays on the source side.
func (g *flowGraph) minCut(s, t int) []bool {
	for g.buildLevels(s, t) {
		copy(g.iter, g.head)
		g.augment(s, t, math.Inf(1))
	}
	side := make([]bool, len(g.level))
	for i, l := range g.level {
		side[i] = l >= 0
	}
	return side
}

// buildLevels labels nodes by BFS distance from s over usable arcs and reports whether t is reachable.
func (g *flowGraph) buildLevels(s, t int) bool {
	for i := range g.level {
		g.level[i] = -1
	}
	g.level[s] = 0
	queue := []int32{int32(s)}
	for len(queue) > 0 {
		u := queue[0]
		queue = queue[1:]
		for e := g.head[u]; e >= 0; e = g.next[e] {
			if v := g.to[e]; g.cap[e] > flowEps && g.level[v] < 0 {
				g.level[v] = g.level[u] + 1
				queue = append(queue, v)
			}
		}
	}
	return g.level[t] >= 0
}

// augment pushes a blocking flow of at most limit from u to t along level-increasing arcs and returns the amount.
// An arc is skipped for the rest of the phase once it is saturated or leads nowhere.
func (g *flowGraph) augment(u, t int, limit float64) float64 {
	if u == t {
		return limit
	}
	total := 0.0
	for ; g.iter[u] >= 0; g.iter[u] = g.next[g.iter[u]] {
		e := g.iter[u]
		v := int(g.to[e])
		if g.cap[e] <= flowEps || g.level[v] != g.level[u]+1 {
			continue
		}
		pushed := g.augment(v, t, math.Min(limit-total, g.cap[e]))
		g.cap[e] -= pushed
		g.cap[e^1] += pushed
		total += pushed
		if limit-total <= flowEps {
			return total
		}
	}
	return total
}
