package panorama

import "image"

// fillHoles patches uncovered pixels by horizontal interpolation and returns the fraction originally covered.
func fillHoles(img *image.RGBA, holes []bool) float64 {
	w, h := img.Rect.Dx(), img.Rect.Dy()
	missing := 0
	rowFilled := make([]bool, h)
	for v := 0; v < h; v++ {
		row := holes[v*w : (v+1)*w]
		missing += countTrue(row)
		rowFilled[v] = fillRow(img, row, v)
	}
	fillEmptyRows(img, rowFilled)
	return 1 - float64(missing)/float64(w*h)
}

// countTrue counts set flags in a slice.
func countTrue(flags []bool) int {
	n := 0
	for _, f := range flags {
		if f {
			n++
		}
	}
	return n
}

// fillRow interpolates hole pixels between the nearest covered pixels, wrapping around 360°.
func fillRow(img *image.RGBA, row []bool, v int) bool {
	w := len(row)
	valid := make([]int, 0, w)
	for u, hole := range row {
		if !hole {
			valid = append(valid, u)
		}
	}
	if len(valid) == 0 {
		return false
	}
	for k, left := range valid {
		right := valid[(k+1)%len(valid)]
		gap := (right - left - 1 + w) % w
		for s := 1; s <= gap; s++ {
			lerpPixel(img, v, (left+s)%w, left, right, float64(s)/float64(gap+1))
		}
	}
	return true
}

// lerpPixel writes the blend of two pixels in row v into column dst.
func lerpPixel(img *image.RGBA, v, dst, left, right int, t float64) {
	a, b, o := img.PixOffset(left, v), img.PixOffset(right, v), img.PixOffset(dst, v)
	for c := 0; c < 3; c++ {
		img.Pix[o+c] = uint8(float64(img.Pix[a+c])*(1-t) + float64(img.Pix[b+c])*t)
	}
	img.Pix[o+3] = 255
}

// fillEmptyRows copies the nearest covered row into rows that no frame reached (typically at the poles).
func fillEmptyRows(img *image.RGBA, rowFilled []bool) {
	h := len(rowFilled)
	for v := 0; v < h; v++ {
		if rowFilled[v] {
			continue
		}
		if src := nearestFilledRow(rowFilled, v); src >= 0 {
			copy(img.Pix[img.PixOffset(0, v):img.PixOffset(0, v+1)], img.Pix[img.PixOffset(0, src):img.PixOffset(0, src+1)])
		}
	}
}

// nearestFilledRow finds the closest row index that has pixel data, or -1 if none exist.
func nearestFilledRow(rowFilled []bool, v int) int {
	for d := 1; d < len(rowFilled); d++ {
		if v-d >= 0 && rowFilled[v-d] {
			return v - d
		}
		if v+d < len(rowFilled) && rowFilled[v+d] {
			return v + d
		}
	}
	return -1
}
