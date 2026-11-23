package panorama

import (
	"context"
	"fmt"
	"image"
	"image/jpeg"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// TestHuginRollConvention pins our rotation mapping to real Hugin output: pano_trafo placed pixels of a 720×1280,
// 40° image with y=30, p=20, r=10 at these coordinates of a 3600×1800 equirectangular canvas.
func TestHuginRollConvention(t *testing.T) {
	rot := matFromHuginYPR(30, 20, 10)
	cam := camera{w: 720, h: 1280, cx: 360, cy: 640}
	cam = cam.withLens(360/math.Tan(deg(20)), 0)
	cases := []struct{ x, y, wantX, wantY float64 }{
		{360.5, 640.5, 2099.75, 699.84},
		{720.5, 640.5, 2304.16, 745.82},
		{0.5, 0.5, 1906.20, 365.41},
	}
	for _, c := range cases {
		lon, lat := LonLatFromDir(cam.unproject(rot, c.x, c.y))
		gotX, gotY := (lon*180/math.Pi+180)*10, (90-lat*180/math.Pi)*10
		if math.Hypot(gotX-c.wantX, gotY-c.wantY) > 1.5 {
			t.Fatalf("pixel (%v,%v) maps to (%.2f,%.2f), Hugin says (%.2f,%.2f)", c.x, c.y, gotX, gotY, c.wantX, c.wantY)
		}
	}
}

// TestHuginYPRRoundTrip converts random orientations, including straight up and down, to Hugin angles and back.
func TestHuginYPRRoundTrip(t *testing.T) {
	rng := rand.New(rand.NewSource(4))
	rots := []Mat3{EulerToMat(deg(40), deg(90), 0), EulerToMat(deg(-70), deg(-90), deg(5))}
	for i := 0; i < 200; i++ {
		rots = append(rots, randomRotation(rng, 179))
	}
	for _, m := range rots {
		y, p, r := huginYPR(m)
		if back := matFromHuginYPR(y, p, r); back.AngleTo(m) > 1e-6 {
			t.Fatalf("round trip drifted by %v rad", back.AngleTo(m))
		}
	}
}

// TestParseHuginProject reads image lines (including lens fields linked with "=") and optimizer output.
func TestParseHuginProject(t *testing.T) {
	pto := "p f2 w3000 h1500 v360  k0 E0 R0 n\"TIFF_m c:LZW r:CROP\"\n" +
		"i w720 h1280 f0 v40.15 Ra0 Rb0 Eev0 Er1 Eb1 r-0.8644 p-0.5553 y1.7629 TrX0 Tpy0 b0.05 Va1 Vb0 Vm5 n\"/tmp/a/00.jpg\"\n" +
		"i w720 h1280 f0 v=0 Ra=0 Eev0.2 r12.14 p2.53 y20.2 TrX0 Tpy0 b=0 Va=0 Vm5 n\"/tmp/a/01.jpg\"\n" +
		"c n0 N1 x10 y20 X30 Y40 t0\nc n0 N1 x11 y21 X31 Y41 t0\n"
	images := parseHuginImages(pto)
	if len(images) != 2 || images[0].name != "/tmp/a/00.jpg" || !images[0].hasV || images[0].v != 40.15 {
		t.Fatalf("first image parsed wrong: %+v", images)
	}
	if images[1].hasV || images[1].y != 20.2 || images[1].p != 2.53 || images[1].r != 12.14 {
		t.Fatalf("linked image parsed wrong: %+v", images[1])
	}
	points, connected := controlPointNetwork(pto, 2)
	if w, ok := parsePanoWidth(pto); !ok || w != 3000 || points != 2 || !connected {
		t.Fatalf("width %d ok %v points %d connected %v", w, ok, points, connected)
	}
	if _, connected := controlPointNetwork(pto+"c n2 N3 t0\n", 4); connected {
		t.Fatal("two disconnected groups of photos should require fallback alignment")
	}
	out := "Optimizing...\nAverage (rms) distance between Controlpoints \nafter 27 iteration(s):          0.5624 units\n"
	if rms, ok := parseHuginRMS(out); !ok || rms != 0.5624 {
		t.Fatalf("rms %v ok %v", rms, ok)
	}
}

// TestLevelToSensors removes a shared tilt from a solved rig while keeping the photos' relative layout.
func TestLevelToSensors(t *testing.T) {
	rng := rand.New(rand.NewSource(8))
	tilt := AxisAngle(Vec3{1, 0, 0.3}, deg(3))
	var sensor, solved []Mat3
	for i := 0; i < 30; i++ {
		truth := EulerToMat(deg(float64(i)*12), deg(float64(i%3-1)*40), 0)
		sensor = append(sensor, truth.Mul(randomRotation(rng, 1)))
		solved = append(solved, tilt.Mul(truth))
	}
	leveled := levelToSensors(sensor, solved)
	worst := 0.0
	for i := range leveled {
		worst = math.Max(worst, leveled[i].AngleTo(EulerToMat(deg(float64(i)*12), deg(float64(i%3-1)*40), 0))*180/math.Pi)
	}
	if worst > 0.6 {
		t.Fatalf("leveling left a %.2f° error; the shared 3° tilt should be removed", worst)
	}
}

// TestStitchHuginSynthetic runs the full Hugin pipeline on a textured synthetic room whose lens guess is 5° off.
// It needs Hugin and Enblend installed, so it is skipped on machines without them.
func TestStitchHuginSynthetic(t *testing.T) {
	if !HuginAvailable() {
		t.Skip("hugin-tools and enblend are not installed")
	}
	frames := writeSyntheticCapture(t, t.TempDir())
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
	defer cancel()
	start := time.Now()
	res, err := StitchHugin(ctx, frames, 2048, 35)
	if err != nil {
		t.Fatal(err)
	}
	psnr := psnrAgainst(res.Panorama, roomColor)
	t.Logf("%s: fov %.2f matches %d rms %.2f px alignment %.3f coverage %.4f quality %d psnr %.2f", time.Since(start).Round(time.Second),
		res.FOV, res.Matches, res.MatchRMS, res.Alignment, res.Coverage, res.Quality, psnr)
	if res.Engine != "hugin" || math.Abs(res.FOV-40) > 1.5 || res.Matches < 200 || res.MatchRMS > 3 {
		t.Fatalf("hugin solution off: %+v", res)
	}
	if psnr < 22 {
		t.Fatalf("panorama PSNR %.2f dB too low for a clean stitch", psnr)
	}
}

// writeSyntheticCapture renders the automatic capture plan for a 40° lens as JPEG files with noisy sensors.
func writeSyntheticCapture(t *testing.T, dir string) []HuginFrame {
	targets, err := PlanCapture(40, 540.0/960.0)
	if err != nil {
		t.Fatal(err)
	}
	rng := rand.New(rand.NewSource(77))
	frames := make([]HuginFrame, 0, len(targets))
	for i, tg := range targets {
		truth := EulerToMat(deg(tg.Yaw), deg(tg.Pitch), 0).Mul(randomRotation(rng, 2))
		path := filepath.Join(dir, fmt.Sprintf("%02d.jpg", i))
		f, err := os.Create(path)
		if err != nil {
			t.Fatal(err)
		}
		err = jpeg.Encode(f, renderLensView(truth, 540, 960, 40, -0.03).(*image.RGBA), &jpeg.Options{Quality: 88})
		f.Close()
		if err != nil {
			t.Fatal(err)
		}
		frames = append(frames, HuginFrame{Path: path, Orientation: matToQuat(truth.Mul(randomRotation(rng, 3)))})
	}
	return frames
}
