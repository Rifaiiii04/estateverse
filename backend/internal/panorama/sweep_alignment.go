package panorama

import (
	"context"
	"image"
	"math"
)

// alignBands keeps the horizon pass fixed and corrects heading drift and exposure one adjacent strip at a time.
func alignBands(ctx context.Context, bands []placedBand) (float64, error) {
	anchor := 0
	for i := range bands {
		if math.Abs(bands[i].Pitch) < math.Abs(bands[anchor].Pitch) {
			anchor = i
		}
	}
	sum := 0.0
	for _, step := range []int{-1, 1} {
		for i := anchor + step; i >= 0 && i < len(bands); i += step {
			if err := ctx.Err(); err != nil {
				return 0, err
			}
			score, err := registerBand(bands[i-step], &bands[i])
			if err != nil {
				return 0, err
			}
			sum += score
		}
	}
	return sum / float64(len(bands)-1), nil
}

// registerBand corrects modest yaw and pitch errors using luminance sampled throughout the shared latitude region.
func registerBand(anchor placedBand, band *placedBand) (float64, error) {
	height := min(anchor.bottom, band.bottom) - max(anchor.top, band.top)
	limit := image.Pt(band.Width*8/360, min(band.Width*2/360, (height-1)/2))
	step := max(1, band.Width/720)
	bounds := image.Rectangle{Min: limit.Mul(-1), Max: limit.Add(image.Pt(1, 1))}
	best := bandMatch{overlap: measureBandOverlap(anchor, *band, image.Point{})}
	best = searchBandOffsets(anchor, *band, best, bounds, step)
	fine := image.Rect(1-step, 1-step, step, step).Add(best.shift).Intersect(bounds)
	best = searchBandOffsets(anchor, *band, best, fine, 1)
	if best.ncc < minAlignmentScore {
		return 0, ErrUnreliableAlignment
	}
	band.shift, band.lift = anchor.shift+best.shift.X, anchor.lift+best.shift.Y
	if best.meanB >= 20 && best.meanA >= 20 {
		band.gain = clamp(anchor.gain*best.meanA/best.meanB, 0.80, 1.25)
	}
	return best.ncc, nil
}

type bandMatch struct {
	overlap
	shift image.Point
}

// searchBandOffsets searches around the supplied placement and prefers smaller displacements at comparable quality.
func searchBandOffsets(a, b placedBand, best bandMatch, window image.Rectangle, step int) bandMatch {
	for dy := window.Min.Y; dy < window.Max.Y; dy += step {
		for dx := window.Min.X; dx < window.Max.X; dx += step {
			shift := image.Pt(dx, dy)
			candidate := measureBandOverlap(a, b, shift)
			delta := candidate.ncc - best.ncc
			if delta > 0.0002 || (math.Abs(delta) < 0.0002 && shift.X*shift.X+shift.Y*shift.Y < best.shift.X*best.shift.X+best.shift.Y*best.shift.Y) {
				best = bandMatch{candidate, shift}
			}
		}
	}
	return best
}

// measureBandOverlap samples corresponding room longitudes at several latitudes across the entire shared region.
func measureBandOverlap(a, b placedBand, shift image.Point) overlap {
	top, bottom := max(a.top, b.top), min(a.bottom, b.bottom)
	b.lift = a.lift + shift.Y
	var stats corrAcc
	for y := top; y < bottom; y += max(1, (bottom-top)/12) {
		aRow, bRow := a.rgb.PixOffset(0, a.sourceRow(y)), b.rgb.PixOffset(0, b.sourceRow(y))
		for x := 0; x < a.Width; x += max(1, a.Width/256) {
			other := (x + shift.X + a.Width) % a.Width
			stats.add(bandLuma(a.rgb.Pix[aRow+x*4:]), bandLuma(b.rgb.Pix[bRow+other*4:]))
		}
	}
	match := stats.result()
	// A featureless common wall can support exposure agreement at the original heading, but cannot determine a shift.
	if !match.valid && shift == (image.Point{}) && stats.n >= minOverlapPts && math.Abs(match.meanA-match.meanB) <= 15 {
		n := float64(stats.n)
		if stats.saa/n-match.meanA*match.meanA < minOverlapVar && stats.sbb/n-match.meanB*match.meanB < minOverlapVar {
			match.ncc = 0.55
		}
	}
	return match
}

// bandLuma converts a packed RGB pixel to luminance for matching.
func bandLuma(pixel []byte) float64 {
	return (77*float64(pixel[0]) + 150*float64(pixel[1]) + 29*float64(pixel[2])) / 256
}
