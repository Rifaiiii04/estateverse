package services

import "encoding/binary"

const (
	jpegMarkerAPP1     = 0xE1
	jpegMarkerSOS      = 0xDA
	jpegMarkerEOI      = 0xD9
	exifOrientationTag = 0x0112
	exifHeader         = "Exif\x00\x00"
	tiffEntrySize      = 12
)

// jpegOrientation returns the EXIF orientation (1–8) of a JPEG, or 1 when it has none or the data is malformed.
func jpegOrientation(data []byte) int {
	if len(data) < 4 || data[0] != 0xFF || data[1] != 0xD8 {
		return 1
	}
	pos := 2
	for pos+4 <= len(data) && data[pos] == 0xFF {
		marker := data[pos+1]
		size := int(binary.BigEndian.Uint16(data[pos+2:]))
		end := pos + 2 + size
		if marker == jpegMarkerSOS || marker == jpegMarkerEOI || size < 2 || end > len(data) {
			return 1
		}
		if marker == jpegMarkerAPP1 {
			if o := exifOrientation(data[pos+4 : end]); o != 0 {
				return o
			}
		}
		pos = end
	}
	return 1
}

// exifOrientation reads the orientation tag from the first IFD of an APP1 Exif segment, or 0 when absent.
func exifOrientation(segment []byte) int {
	if len(segment) < len(exifHeader)+8 || string(segment[:len(exifHeader)]) != exifHeader {
		return 0
	}
	tiff := segment[len(exifHeader):]
	var order binary.ByteOrder = binary.BigEndian
	switch string(tiff[:2]) {
	case "II":
		order = binary.LittleEndian
	case "MM":
	default:
		return 0
	}
	ifd := int(order.Uint32(tiff[4:8]))
	if ifd < 8 || ifd+2 > len(tiff) {
		return 0
	}
	count := int(order.Uint16(tiff[ifd:]))
	for i := range count {
		entry := ifd + 2 + i*tiffEntrySize
		if entry+tiffEntrySize > len(tiff) {
			return 0
		}
		if order.Uint16(tiff[entry:]) != exifOrientationTag {
			continue
		}
		if v := int(order.Uint16(tiff[entry+8:])); v >= 1 && v <= 8 {
			return v
		}
		return 0
	}
	return 0
}
