// Command sanitize-media re-checks every stored listing photo. Files that are not readable images (for example
// script files disguised with a JPEG/PNG header) are moved to a private quarantine folder, and readable photos that
// carry extra data are re-encoded in place. Without -apply it only reports what it would do.
//
//	go run ./cmd/sanitize-media          # report only
//	go run ./cmd/sanitize-media -apply   # quarantine and clean
package main

import (
	"bytes"
	"encoding/binary"
	"flag"
	"log"
	"os"
	"path/filepath"
	"strings"

	"projectfai/backend/internal/config"
	"projectfai/backend/internal/services"
)

const quarantineDirName = "quarantine"

// scriptMarkers are byte patterns that never belong in a photo and point to an uploaded script or webshell.
var scriptMarkers = [][]byte{
	[]byte("<?php"), []byte("<script"), []byte("NODESHELL"), []byte("child_process"),
	[]byte("require("), []byte("eval("),
}

type verdict struct {
	action string // "ok", "clean" (re-encode in place), or "quarantine"
	reason string
}

// main walks the images folder of the configured upload directory and reports or fixes each file.
func main() {
	apply := flag.Bool("apply", false, "quarantine and re-encode files instead of only reporting")
	flag.Parse()
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration load failed: %v", err)
	}
	imagesDir := filepath.Join(cfg.UploadDir, services.CategoryImages)
	entries, err := os.ReadDir(imagesDir)
	if err != nil {
		log.Fatalf("cannot read %s: %v", imagesDir, err)
	}
	quarantine := filepath.Join(cfg.UploadDir, quarantineDirName, services.CategoryImages)
	counts := map[string]int{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		v := handleFile(filepath.Join(imagesDir, entry.Name()), quarantine, *apply)
		counts[v.action]++
		if v.action != "ok" {
			log.Printf("%-10s /api/v1/storage/images/%s (%s)", v.action, entry.Name(), v.reason)
		}
	}
	log.Printf("selesai: %d ok, %d dibersihkan, %d dikarantina (apply=%t)", counts["ok"], counts["clean"], counts["quarantine"], *apply)
}

// handleFile inspects one stored photo and, when apply is set, quarantines or re-encodes it.
func handleFile(path, quarantineDir string, apply bool) verdict {
	data, err := os.ReadFile(path)
	if err != nil {
		return verdict{"quarantine", "tidak bisa dibaca: " + err.Error()}
	}
	v, clean := inspect(data, strings.ToLower(filepath.Ext(path)))
	if !apply || v.action == "ok" {
		return v
	}
	if v.action == "clean" {
		if err := os.WriteFile(path, clean, 0o644); err != nil {
			log.Printf("gagal menulis ulang %s: %v", path, err)
		}
		return v
	}
	if err := os.MkdirAll(quarantineDir, 0o700); err != nil {
		log.Fatalf("cannot create quarantine folder: %v", err)
	}
	target := filepath.Join(quarantineDir, filepath.Base(path))
	if err := os.Rename(path, target); err != nil {
		log.Printf("gagal memindahkan %s: %v", path, err)
		return v
	}
	_ = os.Chmod(target, 0o600)
	return v
}

// inspect decides what to do with a photo and returns re-encoded bytes when it should be cleaned in place.
func inspect(data []byte, ext string) (verdict, []byte) {
	clean, cleanExt, err := services.SanitizeImage(data)
	if err != nil {
		return verdict{"quarantine", "bukan gambar valid: " + err.Error()}, nil
	}
	suspicious := containsScript(data) || trailingBytes(data, ext) > 0
	if !suspicious {
		return verdict{"ok", ""}, nil
	}
	sameFormat := cleanExt == ext || (cleanExt == ".jpg" && ext == ".jpeg")
	if !sameFormat {
		return verdict{"quarantine", "gambar berisi data tambahan dan formatnya tidak bisa ditulis ulang"}, nil
	}
	return verdict{"clean", "gambar berisi data tambahan; disimpan ulang hanya pikselnya"}, clean
}

// containsScript reports whether any known script marker appears in the file.
func containsScript(data []byte) bool {
	for _, marker := range scriptMarkers {
		if bytes.Contains(data, marker) {
			return true
		}
	}
	return false
}

// trailingBytes counts bytes stored after the image's own end marker (JPEG EOI, PNG IEND, or the WebP RIFF size).
func trailingBytes(data []byte, ext string) int {
	end := len(data)
	switch ext {
	case ".jpg", ".jpeg":
		if i := bytes.LastIndex(data, []byte{0xFF, 0xD9}); i >= 0 {
			end = i + 2
		}
	case ".png":
		if i := bytes.LastIndex(data, []byte("IEND")); i >= 0 {
			end = i + 8 // chunk type plus CRC
		}
	case ".webp":
		if len(data) >= 8 {
			end = int(binary.LittleEndian.Uint32(data[4:8])) + 8
		}
	}
	return max(0, len(data)-end)
}
