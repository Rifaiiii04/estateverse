package services

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"

	_ "golang.org/x/image/webp" // registers WebP decoding; WebP uploads are stored as JPEG
)

const (
	maxImageUploadPixels = 40_000_000 // decompression-bomb guard, roughly 8000x5000
	listingJPEGQuality   = 88
)

var (
	errUnreadableImage = errors.New("file is not a readable JPEG, PNG, or WebP image")
	errCorruptImage    = errors.New("image data is corrupt or incomplete")
)

// sanitizeImageUpload decodes an uploaded photo and re-encodes only its pixels, so appended or embedded data
// (scripts, metadata, GPS location) never reaches storage. It returns the clean bytes and their file extension.
func sanitizeImageUpload(data []byte) ([]byte, string, error) {
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, "", errUnreadableImage
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width*cfg.Height > maxImageUploadPixels {
		return nil, "", fmt.Errorf("image is too large; maximum is %d megapixels", maxImageUploadPixels/1_000_000)
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, "", errCorruptImage
	}
	if format == "jpeg" {
		img = applyEXIFOrientation(img, jpegOrientation(data))
	}
	var buf bytes.Buffer
	if format == "png" {
		err = png.Encode(&buf, img)
		return buf.Bytes(), ".png", err
	}
	err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: listingJPEGQuality})
	return buf.Bytes(), ".jpg", err
}

// applyEXIFOrientation bakes the camera orientation into the pixels, because re-encoding drops the EXIF tag
// that browsers would otherwise use to rotate phone photos.
func applyEXIFOrientation(img image.Image, orientation int) image.Image {
	if orientation < 2 || orientation > 8 {
		return img
	}
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	dw, dh := w, h
	if orientation >= 5 {
		dw, dh = h, w
	}
	source := orientationSource(orientation, w, h)
	out := image.NewRGBA(image.Rect(0, 0, dw, dh))
	for y := range dh {
		for x := range dw {
			sx, sy := source(x, y)
			out.Set(x, y, img.At(b.Min.X+sx, b.Min.Y+sy))
		}
	}
	return out
}

// orientationSource maps a pixel of the upright output to the stored pixel for EXIF orientations 2–8.
func orientationSource(orientation, w, h int) func(x, y int) (int, int) {
	switch orientation {
	case 2:
		return func(x, y int) (int, int) { return w - 1 - x, y }
	case 3:
		return func(x, y int) (int, int) { return w - 1 - x, h - 1 - y }
	case 4:
		return func(x, y int) (int, int) { return x, h - 1 - y }
	case 5:
		return func(x, y int) (int, int) { return y, x }
	case 6:
		return func(x, y int) (int, int) { return y, h - 1 - x }
	case 7:
		return func(x, y int) (int, int) { return w - 1 - y, h - 1 - x }
	default: // 8
		return func(x, y int) (int, int) { return w - 1 - y, x }
	}
}

// SanitizeImage re-encodes photo bytes the same way uploads are, for maintenance tools that clean stored files.
func SanitizeImage(data []byte) ([]byte, string, error) {
	return sanitizeImageUpload(data)
}
