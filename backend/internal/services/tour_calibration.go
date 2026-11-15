package services

import (
	"bytes"
	"image/jpeg"

	"projectfai/backend/internal/panorama"
)

// CalibrateCapture validates the initial raw JPEGs and delegates lens estimation to the backend panorama engine.
func CalibrateCapture(frames []CaptureFrame) (*panorama.Calibration, error) {
	if len(frames) != 3 {
		return nil, newValidationError("kalibrasi membutuhkan tiga foto")
	}
	inputs := make([]panorama.FrameInput, len(frames))
	for i, frame := range frames {
		if _, err := inspectFrame(frame); err != nil {
			return nil, newValidationError("foto kalibrasi tidak valid")
		}
		img, err := jpeg.Decode(bytes.NewReader(frame.Data))
		if err != nil {
			return nil, newValidationError("foto kalibrasi tidak dapat dibaca")
		}
		if i > 0 && img.Bounds().Size() != inputs[0].Image.Bounds().Size() {
			return nil, newValidationError("ukuran foto kalibrasi berubah; mulai ulang rekaman")
		}
		inputs[i] = panorama.FrameInput{Image: img, Orientation: frame.Orientation}
	}
	result, err := panorama.Calibrate(inputs)
	if err != nil {
		return nil, newValidationError("lensa kamera terlalu sempit untuk cakupan penuh; gunakan kamera belakang utama tanpa zoom")
	}
	return result, nil
}
