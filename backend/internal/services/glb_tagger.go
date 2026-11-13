package services

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"regexp"
)

// TagGLBArchitecture marks roof, wall, and floor nodes in GLB Chunk 0 extras without touching 3D buffers.
func TagGLBArchitecture(filePath string) error {
	src, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed opening source glb: %w", err)
	}
	defer src.Close()

	header := make([]byte, 12)
	if _, err := io.ReadFull(src, header); err != nil {
		return fmt.Errorf("failed reading glb header: %w", err)
	}
	if binary.LittleEndian.Uint32(header[0:4]) != 0x46546C67 {
		return errors.New("not a valid binary glTF file")
	}

	chunk0Header := make([]byte, 8)
	if _, err := io.ReadFull(src, chunk0Header); err != nil {
		return fmt.Errorf("failed reading chunk 0 header: %w", err)
	}
	chunk0Len := binary.LittleEndian.Uint32(chunk0Header[0:4])
	if binary.LittleEndian.Uint32(chunk0Header[4:8]) != 0x4E4F534A {
		return errors.New("chunk 0 is not JSON manifest")
	}

	jsonBytes := make([]byte, chunk0Len)
	if _, err := io.ReadFull(src, jsonBytes); err != nil {
		return fmt.Errorf("failed reading chunk 0 json: %w", err)
	}

	taggedJSON, err := injectArchitectureExtras(jsonBytes)
	if err != nil {
		return err
	}

	return writeTaggedGLBFile(filePath, src, header, taggedJSON, int64(20+chunk0Len))
}

// injectArchitectureExtras scans glTF nodes and assigns semantic role flags into node extras.
func injectArchitectureExtras(jsonBytes []byte) ([]byte, error) {
	var manifest map[string]any
	if err := json.Unmarshal(jsonBytes, &manifest); err != nil {
		return nil, fmt.Errorf("failed unmarshaling gltf manifest: %w", err)
	}

	nodesRaw, ok := manifest["nodes"].([]any)
	if !ok {
		return jsonBytes, nil
	}

	roofRegex := regexp.MustCompile(`(?i)roof|atap|genteng|canopy|ceiling|truss|top`)
	wallRegex := regexp.MustCompile(`(?i)wall|dinding|tembok|facade|sekat|siding`)
	floorRegex := regexp.MustCompile(`(?i)floor|lantai`)

	for _, nodeItem := range nodesRaw {
		nodeMap, ok := nodeItem.(map[string]any)
		if !ok {
			continue
		}
		name, _ := nodeMap["name"].(string)
		extras, _ := nodeMap["extras"].(map[string]any)
		if extras == nil {
			extras = make(map[string]any)
		}

		if roofRegex.MatchString(name) {
			extras["isRoof"] = true
			extras["role"] = "roof"
		} else if wallRegex.MatchString(name) {
			extras["isWall"] = true
			extras["role"] = "wall"
		} else if floorRegex.MatchString(name) {
			extras["isFloor"] = true
			extras["role"] = "floor"
		}
		nodeMap["extras"] = extras
	}

	newJSON, err := json.Marshal(manifest)
	if err != nil {
		return nil, fmt.Errorf("failed marshaling tagged gltf manifest: %w", err)
	}

	for len(newJSON)%4 != 0 {
		newJSON = append(newJSON, 0x20)
	}
	return newJSON, nil
}

// writeTaggedGLBFile streams the new header, tagged Chunk 0, and untouched binary chunks to disk.
func writeTaggedGLBFile(filePath string, src *os.File, header []byte, taggedJSON []byte, binOffset int64) error {
	fi, err := src.Stat()
	if err != nil {
		return err
	}
	binBytesLen := fi.Size() - binOffset
	if binBytesLen < 0 {
		return errors.New("invalid binary chunk offset")
	}

	tmpPath := filePath + ".tagged.tmp"
	dst, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed creating tagged glb temp file: %w", err)
	}
	defer dst.Close()

	totalLen := uint32(12 + 8 + len(taggedJSON) + int(binBytesLen))
	binary.LittleEndian.PutUint32(header[8:12], totalLen)
	if _, err := dst.Write(header); err != nil {
		return err
	}

	chunk0Header := make([]byte, 8)
	binary.LittleEndian.PutUint32(chunk0Header[0:4], uint32(len(taggedJSON)))
	binary.LittleEndian.PutUint32(chunk0Header[4:8], 0x4E4F534A)
	if _, err := dst.Write(chunk0Header); err != nil {
		return err
	}
	if _, err := dst.Write(taggedJSON); err != nil {
		return err
	}

	if _, err := src.Seek(binOffset, io.SeekStart); err != nil {
		return fmt.Errorf("failed seeking binary chunk: %w", err)
	}
	buf := make([]byte, 64*1024)
	if _, err := io.CopyBuffer(dst, src, buf); err != nil {
		return fmt.Errorf("failed streaming binary chunk: %w", err)
	}

	_ = dst.Close()
	_ = src.Close()

	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed replacing glb file: %w", err)
	}
	return os.Rename(tmpPath, filePath)
}
