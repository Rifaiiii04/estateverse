package panorama

import (
	"context"
	"fmt"
	"image"
	"image/draw"
	"math"
	"sort"
)

// BandGeometry describes the true rectangular footprint of one fully observed equirectangular strip.
type BandGeometry struct {
	Pitch, MinPitch, MaxPitch float64
	Width, Height             int
}

// BandInput holds a finished strip and its placement on the room sphere.
type BandInput struct {
	Geometry BandGeometry
	Image    image.Image
}

// ValidateBandLayout checks that three to five overlapping strips cover a complete sphere at one resolution.
func ValidateBandLayout(layout []BandGeometry) error {
	if len(layout) < 3 || len(layout) > 5 {
		return fmt.Errorf("dibutuhkan 3–5 pita panorama")
	}
	ordered := append([]BandGeometry(nil), layout...)
	sort.Slice(ordered, func(i, j int) bool { return ordered[i].Pitch < ordered[j].Pitch })
	for i, band := range ordered {
		if !validBandShape(band, ordered[0].Width) {
			return fmt.Errorf("batas sudut atau resolusi pita panorama tidak valid")
		}
		if i > 0 && !overlappingBands(ordered[i-1], band) {
			return fmt.Errorf("pita panorama berurutan harus saling bertumpuk sedikitnya 2 derajat")
		}
	}
	if ordered[0].MinPitch != -90 || ordered[len(ordered)-1].MaxPitch != 90 {
		return ErrIncompleteCoverage
	}
	return nil
}

// validBandShape checks native angular sampling and rejects nonfinite or reversed latitude bounds.
func validBandShape(b BandGeometry, width int) bool {
	span := b.MaxPitch - b.MinPitch
	return width >= 1024 && width <= 4096 && width%2 == 0 && b.Width == width &&
		b.MinPitch >= -90 && b.MaxPitch <= 90 && span > 0 && span < 180 &&
		b.Pitch >= b.MinPitch && b.Pitch <= b.MaxPitch && b.Height > 1 && b.Height <= width/2 &&
		math.Abs(float64(b.Height)-float64(width)*span/360) <= 2
}

// overlappingBands requires distinct passes with both fresh coverage and an observed shared latitude interval.
func overlappingBands(lower, higher BandGeometry) bool {
	return higher.Pitch > lower.Pitch && higher.MinPitch > lower.MinPitch && higher.MaxPitch > lower.MaxPitch &&
		lower.MaxPitch-higher.MinPitch >= 2-1e-6
}

type placedBand struct {
	BandGeometry
	rgb         *image.RGBA
	top, bottom int
	shift, lift int
	gain        float64
}

// StitchBands aligns finished sweeps through their observed overlaps and composes one native-resolution panorama.
func StitchBands(ctx context.Context, inputs []BandInput) (*Result, error) {
	layout := make([]BandGeometry, len(inputs))
	for i, band := range inputs {
		layout[i] = band.Geometry
		if band.Image == nil || band.Image.Bounds().Size() != image.Pt(layout[i].Width, layout[i].Height) {
			return nil, ErrMixedSizes
		}
	}
	if err := ValidateBandLayout(layout); err != nil {
		return nil, err
	}
	bands := make([]placedBand, len(inputs))
	for i, band := range inputs {
		bands[i] = placeBand(band)
	}
	sort.Slice(bands, func(i, j int) bool { return bands[i].Pitch < bands[j].Pitch })
	confidence, err := alignBands(ctx, bands)
	if err != nil {
		return nil, err
	}
	pano, err := renderBands(ctx, bands)
	if err != nil {
		return nil, err
	}
	if !hasRoomDetail(pano) {
		return nil, ErrUnreliableAlignment
	}
	return &Result{Panorama: pano, Engine: "sweep-bands", Alignment: confidence, Coverage: 1,
		Quality: qualityScore(confidence, 1)}, nil
}

// hasRoomDetail rejects a covered lens or completely blank render while allowing featureless overlap on real walls.
func hasRoomDetail(pano *image.RGBA) bool {
	width, height := pano.Rect.Dx(), pano.Rect.Dy()
	sum, squares, count := 0.0, 0.0, 0.0
	for y := 0; y < height; y += max(1, height/64) {
		for x := 0; x < width; x += max(1, width/128) {
			pixel := bandLuma(pano.Pix[pano.PixOffset(x, y):])
			sum, squares, count = sum+pixel, squares+pixel*pixel, count+1
		}
	}
	return squares/count-(sum/count)*(sum/count) >= minOverlapVar
}

// placeBand caches fast pixel access and the strip's row interval on the output canvas.
func placeBand(input BandInput) placedBand {
	g := input.Geometry
	rgb := image.NewRGBA(image.Rect(0, 0, g.Width, g.Height))
	draw.Draw(rgb, rgb.Rect, input.Image, input.Image.Bounds().Min, draw.Src)
	return placedBand{BandGeometry: g, rgb: rgb, gain: 1,
		top:    int(math.Round((90 - g.MaxPitch) * float64(g.Width) / 360)),
		bottom: int(math.Round((90 - g.MinPitch) * float64(g.Width) / 360))}
}

// sourceRow maps an output latitude to its nearest source row allowing for rounded crop boundaries.
func (b placedBand) sourceRow(y int) int {
	// Let small pitch corrections decay over the final 15 degrees so the true pole stays at the image edge.
	distance := min(y, b.Width/2-1-y)
	taper := math.Min(1, float64(distance)*24/float64(b.Width))
	adjusted := y + int(math.Round(float64(b.lift)*taper))
	row := ((adjusted-b.top)*2 + 1) * b.Height / (2 * (b.bottom - b.top))
	return max(0, min(b.Height-1, row))
}

// renderBands feathers the observed RGB strips across their overlaps with wraparound longitude.
func renderBands(ctx context.Context, bands []placedBand) (*image.RGBA, error) {
	width := bands[0].Width
	out := image.NewRGBA(image.Rect(0, 0, width, width/2))
	for y := 0; y < width/2; y++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		drawBandRow(out, bands, y)
	}
	return out, nil
}

// drawBandRow blends one degree around the best-supported seam to keep overlapping door edges from doubling.
func drawBandRow(out *image.RGBA, bands []placedBand, y int) {
	width := out.Rect.Dx()
	var layers [5]struct {
		pixels []byte
		shift  int
		depth  int
		weight float64
	}
	n, bestDepth := 0, 0
	for _, band := range bands {
		if y < band.top || y >= band.bottom {
			continue
		}
		edge := min(y-band.top, band.bottom-y-1)
		offset := band.rgb.PixOffset(0, band.sourceRow(y))
		layers[n].pixels, layers[n].shift = band.rgb.Pix[offset:offset+width*4], band.shift
		layers[n].depth, layers[n].weight = edge, band.gain
		bestDepth = max(bestDepth, edge)
		n++
	}
	total := 0.0
	for i := range n {
		weight := math.Max(0, 1-float64(bestDepth-layers[i].depth)*360/float64(width))
		layers[i].weight *= weight
		total += weight
	}
	dst := out.Pix[out.PixOffset(0, y):]
	for x := 0; x < width; x++ {
		var rgb [3]float64
		for _, layer := range layers[:n] {
			p := (x + layer.shift + width) % width * 4
			for c := range rgb {
				rgb[c] += float64(layer.pixels[p+c]) * layer.weight
			}
		}
		for c := range rgb {
			dst[x*4+c] = uint8(clamp(rgb[c]/total+0.5, 0, 255))
		}
		dst[x*4+3] = 255
	}
}
