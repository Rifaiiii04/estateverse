package panorama

import (
	"context"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	huginMinControlPoints = 20  // fewer matched points than this means the photos could not be tied together
	huginMaxRMSDeg        = 3.0 // a solution whose matched points still disagree this much is rejected
	huginRMSScaleDeg      = 2.0 // matched-point disagreement (degrees) that maps to an alignment score of zero
	huginMinFOV           = 20.0
	huginMaxFOV           = 120.0
)

// huginTools are the Hugin and Enblend command-line programs the pipeline runs.
var huginTools = []string{"pto_gen", "pto_var", "cpfind", "cpclean", "autooptimiser", "vig_optimize", "pano_modify", "nona", "enblend"}

// HuginFrame is one stored capture photo and its device orientation quaternion (w, x, y, z).
type HuginFrame struct {
	Path        string
	Orientation [4]float64
}

// huginRun carries the state of one Hugin stitching job inside its scratch directory.
type huginRun struct {
	ctx     context.Context
	dir     string
	frames  []HuginFrame
	sensor  []Mat3
	points  int
	rmsDeg  float64
	fov     float64
	frameW  float64
	lastPTO string
}

// HuginAvailable reports whether every Hugin command-line tool the pipeline needs is installed.
func HuginAvailable() bool {
	for _, tool := range huginTools {
		if _, err := exec.LookPath(tool); err != nil {
			return false
		}
	}
	return true
}

// StitchHugin builds the panorama with Hugin: phone orientations seed the layout, cpfind matches features
// (independent of the lens guess), the optimizer solves positions, field of view, and distortion, exposure and
// white balance are equalized, and enblend blends the seams across the 360° wrap.
func StitchHugin(ctx context.Context, frames []HuginFrame, outputWidth int, initialFOV float64) (*Result, error) {
	if len(frames) < MinFrames {
		return nil, ErrTooFewFrames
	}
	dir, err := os.MkdirTemp("", "estateverse-hugin-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	h := &huginRun{ctx: ctx, dir: dir, frames: frames}
	steps := []func() error{
		func() error { return h.project(initialFOV) },
		h.controlPoints,
		h.optimize,
		h.level,
		h.photometric,
		func() error { return h.render(outputWidth) },
	}
	for _, step := range steps {
		if err := step(); err != nil {
			return nil, err
		}
	}
	return h.result()
}

// run executes one Hugin tool in the scratch directory and returns its combined output.
func (h *huginRun) run(name string, args ...string) (string, error) {
	cmd := exec.CommandContext(h.ctx, name, args...)
	cmd.Dir = h.dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("hugin %s: %w: %s", name, err, tail(string(out), 300))
	}
	return string(out), nil
}

// readPTO loads a project file from the scratch directory.
func (h *huginRun) readPTO(name string) (string, error) {
	data, err := os.ReadFile(filepath.Join(h.dir, name))
	return string(data), err
}

// project writes the initial project with every photo placed where the phone's sensors say it was aimed.
func (h *huginRun) project(fov float64) error {
	args := []string{"-p", "0", "-f", fmt.Sprintf("%.3f", fov), "-o", "base.pto"}
	h.sensor = make([]Mat3, len(h.frames))
	for i, f := range h.frames {
		args = append(args, f.Path)
		q := f.Orientation
		h.sensor[i] = QuatToMat(q[0], q[1], q[2], q[3])
	}
	if _, err := h.run("pto_gen", args...); err != nil {
		return err
	}
	if err := h.checkOrder("base.pto"); err != nil {
		return err
	}
	_, err := h.run("pto_var", "--set="+huginPositions(h.sensor), "-o", "pre.pto", "base.pto")
	return err
}

// checkOrder confirms pto_gen kept the photos in capture order, since orientations are matched by index.
func (h *huginRun) checkOrder(pto string) error {
	text, err := h.readPTO(pto)
	if err != nil {
		return err
	}
	images := parseHuginImages(text)
	if len(images) != len(h.frames) {
		return fmt.Errorf("hugin project has %d images, expected %d", len(images), len(h.frames))
	}
	for i, img := range images {
		if filepath.Base(img.name) != filepath.Base(h.frames[i].Path) {
			return fmt.Errorf("hugin reordered photos: image %d is %s", i, img.name)
		}
	}
	return nil
}

// controlPoints matches features between photos that overlap according to the sensors and drops outliers.
// The rotation-only RANSAC model (rpyv) suits a phone turned in place and rejects repeated-texture mismatches.
func (h *huginRun) controlPoints() error {
	if _, err := h.run("cpfind", "--prealigned", "--ransacmode=rpyv", "--ransacdist=10", "-o", "cp.pto", "pre.pto"); err != nil {
		return err
	}
	if _, err := h.run("cpclean", "-o", "clean.pto", "cp.pto"); err != nil {
		return err
	}
	text, err := h.readPTO("clean.pto")
	if err != nil {
		return err
	}
	if h.points = countControlPoints(text); h.points < huginMinControlPoints {
		return fmt.Errorf("%w: only %d matched points", ErrUnreliableAlignment, h.points)
	}
	return nil
}

// optimize solves every orientation except the first plus the shared field of view and barrel distortion.
func (h *huginRun) optimize() error {
	if _, err := h.run("pto_var", "--opt=y,p,r,v,b,!y0,!p0,!r0", "-o", "opt.pto", "clean.pto"); err != nil {
		return err
	}
	out, err := h.run("autooptimiser", "-n", "-o", "optd.pto", "opt.pto")
	if err != nil {
		return err
	}
	text, err := h.readPTO("optd.pto")
	if err != nil {
		return err
	}
	return h.readSolution(out, text)
}

// readSolution checks the optimized lens and converts the matched-point RMS from panorama pixels to degrees.
func (h *huginRun) readSolution(optimizerOutput, pto string) error {
	rms, okRMS := parseHuginRMS(optimizerOutput)
	width, okW := parsePanoWidth(pto)
	images := parseHuginImages(pto)
	if !okRMS || !okW || len(images) == 0 || !images[0].hasV {
		return fmt.Errorf("hugin optimizer output could not be read")
	}
	h.rmsDeg = rms * 360 / float64(width)
	h.fov = images[0].v
	if h.fov < huginMinFOV || h.fov > huginMaxFOV || math.IsNaN(h.rmsDeg) || h.rmsDeg > huginMaxRMSDeg {
		return fmt.Errorf("%w: hugin solution rejected (fov %.1f°, rms %.2f°)", ErrUnreliableAlignment, h.fov, h.rmsDeg)
	}
	return nil
}

// tail returns at most the last n bytes of s, for compact error messages.
func tail(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return "…" + s[len(s)-n:]
}
