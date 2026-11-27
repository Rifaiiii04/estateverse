package services

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

// testPhoto builds a small blue w×h image with a red top-left block (big enough to survive JPEG compression)
// so orientation changes can be detected.
func testPhoto(w, h int) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := range h {
		for x := range w {
			c := color.RGBA{0, 0, 255, 255}
			if x < 8 && y < 8 {
				c = color.RGBA{255, 0, 0, 255}
			}
			img.Set(x, y, c)
		}
	}
	return img
}

// encodePNG returns PNG bytes of an image.
func encodePNG(t *testing.T, img image.Image) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// withOrientation inserts an APP1 Exif segment carrying the given orientation right after the JPEG SOI marker.
func withOrientation(jpg []byte, orientation uint16) []byte {
	tiff := []byte{'M', 'M', 0, 42, 0, 0, 0, 8, 0, 1}
	entry := make([]byte, 12)
	binary.BigEndian.PutUint16(entry[0:], exifOrientationTag)
	binary.BigEndian.PutUint16(entry[2:], 3) // SHORT
	binary.BigEndian.PutUint32(entry[4:], 1)
	binary.BigEndian.PutUint16(entry[8:], orientation)
	payload := append(append([]byte(exifHeader), tiff...), append(entry, 0, 0, 0, 0)...)
	segment := []byte{0xFF, jpegMarkerAPP1, 0, 0}
	binary.BigEndian.PutUint16(segment[2:], uint16(len(payload)+2))
	out := append([]byte{}, jpg[:2]...)
	out = append(out, segment...)
	out = append(out, payload...)
	return append(out, jpg[2:]...)
}

// TestSanitizeRejectsScriptBehindImageHeader covers the webshell found in production: an image header followed by code.
func TestSanitizeRejectsScriptBehindImageHeader(t *testing.T) {
	header := encodePNG(t, testPhoto(4, 4))[:33] // signature + IHDR only
	shell := append(append([]byte{}, header...), []byte("/*NODESHELL*/ const http = require('http');")...)
	if _, _, err := sanitizeImageUpload(shell); err == nil {
		t.Fatal("polyglot file with an image header and a script body was accepted")
	}
	jpegHeader := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0, 1, 1, 0, 0, 1, 0, 1, 0, 0}
	if _, _, err := sanitizeImageUpload(append(jpegHeader, []byte("/*NODESHELL*/")...)); err == nil {
		t.Fatal("JFIF header followed by a script was accepted")
	}
}

// TestSanitizeDropsAppendedPayload keeps a real photo but removes anything appended after it.
func TestSanitizeDropsAppendedPayload(t *testing.T) {
	data := append(encodePNG(t, testPhoto(8, 6)), []byte("<?php system($_GET['c']); ?>")...)
	clean, ext, err := sanitizeImageUpload(data)
	if err != nil || ext != ".png" {
		t.Fatalf("valid photo rejected: ext=%q err=%v", ext, err)
	}
	if bytes.Contains(clean, []byte("<?php")) {
		t.Fatal("appended script survived re-encoding")
	}
	if img, err := png.Decode(bytes.NewReader(clean)); err != nil || img.Bounds().Dx() != 8 {
		t.Fatalf("re-encoded photo unreadable or resized: %v", err)
	}
}

// TestSanitizeAppliesEXIFRotation keeps portrait phone photos upright after EXIF metadata is dropped.
func TestSanitizeAppliesEXIFRotation(t *testing.T) {
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, testPhoto(40, 20), &jpeg.Options{Quality: 95}); err != nil {
		t.Fatal(err)
	}
	clean, ext, err := sanitizeImageUpload(withOrientation(buf.Bytes(), 6))
	if err != nil || ext != ".jpg" {
		t.Fatalf("rotated JPEG rejected: ext=%q err=%v", ext, err)
	}
	img, err := jpeg.Decode(bytes.NewReader(clean))
	if err != nil {
		t.Fatal(err)
	}
	if b := img.Bounds(); b.Dx() != 20 || b.Dy() != 40 {
		t.Fatalf("orientation 6 should swap to 20x40, got %dx%d", b.Dx(), b.Dy())
	}
	if r, _, _, _ := img.At(17, 2).RGBA(); r < 0x8000 {
		t.Fatal("red corner should move to the top-right after a 90° clockwise rotation")
	}
}

// TestSanitizeRejectsHugeDimensions guards against decompression bombs declared in the image header.
func TestSanitizeRejectsHugeDimensions(t *testing.T) {
	data := encodePNG(t, testPhoto(2, 2))
	binary.BigEndian.PutUint32(data[16:], 100_000) // IHDR width
	binary.BigEndian.PutUint32(data[20:], 100_000) // IHDR height
	if _, _, err := sanitizeImageUpload(data); err == nil {
		t.Fatal("10-gigapixel header accepted")
	}
}
