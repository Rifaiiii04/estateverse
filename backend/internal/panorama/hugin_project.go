package panorama

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// huginImage holds the fields of a Hugin project "i" line that the pipeline reads back.
type huginImage struct {
	name       string
	y, p, r, v float64
	hasV       bool
}

var (
	huginImageField = regexp.MustCompile(`\s([yprv])(-?[0-9][0-9.eE+-]*)`)
	huginImageName  = regexp.MustCompile(`\sn"([^"]*)"`)
	huginRMSLine    = regexp.MustCompile(`after \d+ iteration\(s\):\s+([0-9.eE+-]+) units`)
	huginPanoWidth  = regexp.MustCompile(`(?m)^p .*?\sw(\d+)`)
)

// huginYPR converts a camera-to-world rotation into Hugin's yaw, pitch and roll in degrees.
// Checked against Hugin's own pano_trafo: Hugin composes yaw, pitch and roll exactly like EulerToMat,
// except that its roll turns the other way.
func huginYPR(m Mat3) (y, p, r float64) {
	lon, lat := LonLatFromDir(m.Forward())
	up := EulerToMat(lon, lat, 0).MulTVec(m.MulVec(Vec3{0, 1, 0}))
	roll := math.Atan2(-up.X, up.Y)
	return lon * 180 / math.Pi, lat * 180 / math.Pi, -roll * 180 / math.Pi
}

// matFromHuginYPR is the inverse of huginYPR.
func matFromHuginYPR(y, p, r float64) Mat3 {
	return EulerToMat(deg(y), deg(p), deg(-r))
}

// huginPositions formats every orientation as a pto_var --set argument ("y0=..,p0=..,r0=..,y1=..").
func huginPositions(rots []Mat3) string {
	parts := make([]string, 0, len(rots))
	for i, m := range rots {
		y, p, r := huginYPR(m)
		parts = append(parts, fmt.Sprintf("y%d=%.5f,p%d=%.5f,r%d=%.5f", i, y, i, p, i, r))
	}
	return strings.Join(parts, ",")
}

// parseHuginImages reads the image lines of a Hugin project in order.
func parseHuginImages(pto string) []huginImage {
	var images []huginImage
	for _, line := range strings.Split(pto, "\n") {
		if !strings.HasPrefix(line, "i ") {
			continue
		}
		img := huginImage{}
		if m := huginImageName.FindStringSubmatch(line); m != nil {
			img.name = m[1]
		}
		for _, f := range huginImageField.FindAllStringSubmatch(line, -1) {
			img.set(f[1], f[2])
		}
		images = append(images, img)
	}
	return images
}

// set stores one parsed numeric field of an image line.
func (img *huginImage) set(key, raw string) {
	val, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return
	}
	switch key {
	case "y":
		img.y = val
	case "p":
		img.p = val
	case "r":
		img.r = val
	case "v":
		img.v, img.hasV = val, true
	}
}

// countControlPoints counts the control-point lines of a Hugin project.
func countControlPoints(pto string) int {
	n := 0
	for _, line := range strings.Split(pto, "\n") {
		if strings.HasPrefix(line, "c ") {
			n++
		}
	}
	return n
}

// parseHuginRMS extracts autooptimiser's final control-point RMS, which is measured in panorama pixels.
func parseHuginRMS(output string) (float64, bool) {
	all := huginRMSLine.FindAllStringSubmatch(output, -1)
	if len(all) == 0 {
		return 0, false
	}
	v, err := strconv.ParseFloat(all[len(all)-1][1], 64)
	return v, err == nil
}

// parsePanoWidth reads the output width from the panorama ("p") line of a Hugin project.
func parsePanoWidth(pto string) (int, bool) {
	m := huginPanoWidth.FindStringSubmatch(pto)
	if m == nil {
		return 0, false
	}
	w, err := strconv.Atoi(m[1])
	return w, err == nil && w > 0
}

// levelToSensors turns the optimized rig as a whole so it agrees on average with the phone's sensors: the
// control points keep every relative position, while gravity and the gyroscope set the horizon and heading.
func levelToSensors(sensor, optimized []Mat3) []Mat3 {
	var sum, ref [4]float64
	for i := range sensor {
		q := matToQuat(sensor[i].Mul(transpose(optimized[i])))
		if i == 0 {
			ref = q
		}
		if q[0]*ref[0]+q[1]*ref[1]+q[2]*ref[2]+q[3]*ref[3] < 0 {
			q = [4]float64{-q[0], -q[1], -q[2], -q[3]}
		}
		for k := range sum {
			sum[k] += q[k]
		}
	}
	g := QuatToMat(sum[0], sum[1], sum[2], sum[3])
	out := make([]Mat3, len(optimized))
	for i, m := range optimized {
		out[i] = g.Mul(m)
	}
	return out
}
