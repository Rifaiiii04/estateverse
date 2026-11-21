package services

import (
	"fmt"
	"image"
	_ "image/jpeg" // registers JPEG decoding for listing photos
	_ "image/png"  // registers PNG decoding for listing photos
	"io"

	_ "golang.org/x/image/webp" // registers WebP decoding for listing photos
)

const (
	dhashCols       = 9  // one extra column so each row yields 8 left-vs-right comparisons
	dhashRows       = 8  // 8 rows x 8 comparisons = 64-bit hash
	dhashSamplesDim = 32 // samples per cell edge used to average a cell without reading every pixel
)

// ComputeDHash decodes an image and returns its 64-bit difference hash, which survives resizing and recompression.
func ComputeDHash(r io.Reader) (uint64, error) {
	img, _, err := image.Decode(r)
	if err != nil {
		return 0, fmt.Errorf("decode image: %w", err)
	}
	return dhashOf(img), nil
}

// dhashOf shrinks the image to a 9x8 grid of average brightness and sets one bit per brighter-than-right-neighbour cell.
func dhashOf(img image.Image) uint64 {
	cells := averageCells(img)
	var hash uint64
	for row := range dhashRows {
		for col := 0; col < dhashCols-1; col++ {
			hash <<= 1
			if cells[row][col] > cells[row][col+1] {
				hash |= 1
			}
		}
	}
	return hash
}

// averageCells samples an even grid inside each cell and averages its luminance.
func averageCells(img image.Image) [dhashRows][dhashCols]float64 {
	var cells [dhashRows][dhashCols]float64
	b := img.Bounds()
	gridW, gridH := dhashCols*dhashSamplesDim, dhashRows*dhashSamplesDim
	for gy := range gridH {
		y := b.Min.Y + (2*gy+1)*b.Dy()/(2*gridH)
		for gx := range gridW {
			x := b.Min.X + (2*gx+1)*b.Dx()/(2*gridW)
			cells[gy/dhashSamplesDim][gx/dhashSamplesDim] += luminance(img, x, y)
		}
	}
	return cells
}

// luminance returns the perceived brightness of one pixel using Rec. 601 weights.
func luminance(img image.Image, x, y int) float64 {
	r, g, b, _ := img.At(x, y).RGBA()
	return 0.299*float64(r) + 0.587*float64(g) + 0.114*float64(b)
}
