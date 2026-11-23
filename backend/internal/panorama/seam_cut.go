package panorama

import "math"

const (
	seamEdgeEps  = 1.0 // base cost of every seam edge, so regions that look alike still prefer short seams
	seamTerminal = 1e7 // capacity tying a cell to the frame that alone covers one of its neighbours
)

// neighbourOffsets lists the 4-connected neighbours; the first two are the ones that own the shared edge.
var neighbourOffsets = [4][2]int{{1, 0}, {0, 1}, {-1, 0}, {0, -1}}

// cutSeams leaves every covered seam cell to exactly one frame, routing each seam through places where
// the overlapping photos agree so doors, cables, and furniture are not sliced into doubled copies.
func (g *seamGrid) cutSeams() {
	for i := range g.frames {
		for j := i + 1; j < len(g.frames); j++ {
			a, b := &g.frames[i], &g.frames[j]
			if math.Acos(clamp(a.fwd.Dot(b.fwd), -1, 1)) < a.radius+b.radius {
				g.cutPair(a, b)
			}
		}
	}
}

// cutPair splits the current overlap of two frames along the minimum-cost seam between them.
func (g *seamGrid) cutPair(a, b *seamFrame) {
	cells, nodeOf := overlapCells(a, b)
	if len(cells) == 0 {
		return
	}
	graph := newFlowGraph(len(cells) + 2)
	src, sink := len(cells), len(cells)+1
	for n, k := range cells {
		g.linkCell(graph, a, b, nodeOf, n, k, src, sink)
	}
	side := graph.minCut(src, sink)
	for n, k := range cells {
		if side[n] {
			b.mask[b.p.index(a.p.cell(k))] = false
		} else {
			a.mask[k] = false
		}
	}
}

// overlapCells lists frame a's mask cells that frame b's mask also holds, and maps them to graph nodes.
func overlapCells(a, b *seamFrame) ([]int, []int32) {
	var cells []int
	nodeOf := make([]int32, len(a.mask))
	for k, on := range a.mask {
		nodeOf[k] = -1
		if !on {
			continue
		}
		if kb := b.p.index(a.p.cell(k)); kb >= 0 && b.mask[kb] {
			nodeOf[k] = int32(len(cells))
			cells = append(cells, k)
		}
	}
	return cells, nodeOf
}

// linkCell adds the seam edges from one overlap cell to its neighbours and ties it to a frame when a
// neighbour belongs to only one of the two frames.
func (g *seamGrid) linkCell(graph *flowGraph, a, b *seamFrame, nodeOf []int32, n, k, src, sink int) {
	u, v := a.p.cell(k)
	cost := colorDistance(a, k, b, b.p.index(u, v))
	toSource, toSink := false, false
	for i, off := range neighbourOffsets {
		qu, qv := (u+off[0]+g.w)%g.w, v+off[1]
		if qv < 0 || qv >= g.h {
			continue
		}
		qa, qb := a.p.index(qu, qv), b.p.index(qu, qv)
		inA, inB := qa >= 0 && a.mask[qa], qb >= 0 && b.mask[qb]
		switch {
		case inA && inB && i < 2:
			c := cost + colorDistance(a, qa, b, qb) + seamEdgeEps
			graph.addEdge(n, int(nodeOf[qa]), c, c)
		case inA && !inB:
			toSource = true
		case inB && !inA:
			toSink = true
		}
	}
	if toSource {
		graph.addEdge(src, n, seamTerminal, 0)
	}
	if toSink {
		graph.addEdge(n, sink, seamTerminal, 0)
	}
}
