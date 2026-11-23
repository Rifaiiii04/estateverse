package panorama

import (
	"fmt"
	"image"
	"image/draw"
	_ "image/jpeg" // frame headers are read with image.DecodeConfig
	"os"
	"path/filepath"

	"golang.org/x/image/tiff"
)

// level turns the solved rig so its average orientation matches the sensors, fixing horizon tilt that the
// first photo's own sensor error would otherwise spread over the whole panorama.
func (h *huginRun) level() error {
	text, err := h.readPTO("optd.pto")
	if err != nil {
		return err
	}
	images := parseHuginImages(text)
	if len(images) != len(h.sensor) {
		return fmt.Errorf("hugin optimizer returned %d images, expected %d", len(images), len(h.sensor))
	}
	solved := make([]Mat3, len(images))
	for i, img := range images {
		solved[i] = matFromHuginYPR(img.y, img.p, img.r)
	}
	_, err = h.run("pto_var", "--set="+huginPositions(levelToSensors(h.sensor, solved)), "-o", "level.pto", "optd.pto")
	h.lastPTO = "level.pto"
	return err
}

// photometric equalizes exposure and white balance between photos (the phone adjusts both while turning).
// It is best effort: if it fails, the geometrically solved project is rendered as is.
func (h *huginRun) photometric() error {
	if _, err := h.run("pto_var", "--opt=Eev,Er,Eb,!Eev0,!Er0,!Eb0", "-o", "photo.pto", h.lastPTO); err != nil {
		return nil
	}
	if _, err := h.run("vig_optimize", "-o", "photod.pto", "photo.pto"); err == nil {
		h.lastPTO = "photod.pto"
	}
	return nil
}

// render projects every photo onto a full 360×180 equirectangular canvas and blends them with enblend.
func (h *huginRun) render(width int) error {
	height := width / 2
	_, err := h.run("pano_modify", "--projection=2", "--fov=360x180", fmt.Sprintf("--canvas=%dx%d", width, height),
		fmt.Sprintf("--crop=0,%d,0,%d", width, height), "-o", "final.pto", h.lastPTO)
	if err != nil {
		return err
	}
	if _, err := h.run("nona", "-m", "TIFF_m", "-o", "remap_", "final.pto"); err != nil {
		return err
	}
	layers, err := filepath.Glob(filepath.Join(h.dir, "remap_*.tif"))
	if err != nil || len(layers) == 0 {
		return fmt.Errorf("hugin nona produced no layers")
	}
	_, err = h.run("enblend", append([]string{"--wrap=horizontal", "-o", "pano.tif"}, layers...)...)
	return err
}

// result reads the blended panorama, fills the few pixels no photo covered, and scores the stitch.
func (h *huginRun) result() (*Result, error) {
	pano, holes, err := readBlended(filepath.Join(h.dir, "pano.tif"))
	if err != nil {
		return nil, err
	}
	coverage := fillHoles(pano, holes)
	alignment := clamp(1-h.rmsDeg/huginRMSScaleDeg, 0, 1)
	if err := validateStitch(alignment, coverage); err != nil {
		return nil, err
	}
	return &Result{
		Panorama:  pano,
		FOV:       h.fov,
		Alignment: alignment,
		Coverage:  coverage,
		Quality:   qualityScore(alignment, coverage),
		Matches:   h.points,
		MatchRMS:  h.rmsDeg / h.fov * h.frameWidth(),
		Engine:    "hugin",
	}, nil
}

// frameWidth reads the pixel width of the first photo, used to express the matched-point RMS in photo pixels.
func (h *huginRun) frameWidth() float64 {
	if h.frameW > 0 {
		return h.frameW
	}
	f, err := os.Open(h.frames[0].Path)
	if err != nil {
		return 0
	}
	defer f.Close()
	if cfg, _, err := image.DecodeConfig(f); err == nil {
		h.frameW = float64(cfg.Width)
	}
	return h.frameW
}

// readBlended decodes enblend's TIFF and marks fully transparent pixels as holes.
func readBlended(path string) (*image.RGBA, []bool, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	defer f.Close()
	src, err := tiff.Decode(f)
	if err != nil {
		return nil, nil, fmt.Errorf("hugin panorama unreadable: %w", err)
	}
	b := src.Bounds()
	pano := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	draw.Draw(pano, pano.Rect, src, b.Min, draw.Src)
	holes := make([]bool, b.Dx()*b.Dy())
	for i := range holes {
		if pano.Pix[i*4+3] == 0 {
			holes[i] = true
		}
	}
	return pano, holes, nil
}
