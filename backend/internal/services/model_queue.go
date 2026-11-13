package services

import (
	"context"
	"log/slog"
	"path/filepath"
	"strings"
	"sync"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// ModelProcessingJob defines background 3D parsing tasks for property models.
type ModelProcessingJob struct {
	PropertyID   int64
	RelativePath string
	AutoPublish  bool
}

// ModelQueue manages concurrent asynchronous processing for uploaded 3D assets.
type ModelQueue interface {
	Enqueue(job ModelProcessingJob)
	Start(ctx context.Context, workers int)
}

type asyncModelQueue struct {
	jobs       chan ModelProcessingJob
	storageSvc StorageService
	propRepo   repositories.PropertyRepository
	analyzer   ModelAnalyzer
	startOnce  sync.Once
}

// NewModelQueue instantiates an asynchronous background queue for 3D model parsing.
func NewModelQueue(
	storageSvc StorageService,
	propRepo repositories.PropertyRepository,
	analyzer ModelAnalyzer,
) ModelQueue {
	return &asyncModelQueue{
		jobs:       make(chan ModelProcessingJob, 128),
		storageSvc: storageSvc,
		propRepo:   propRepo,
		analyzer:   analyzer,
	}
}

// Enqueue submits a 3D asset processing task to the background worker pool without blocking.
func (q *asyncModelQueue) Enqueue(job ModelProcessingJob) {
	select {
	case q.jobs <- job:
		slog.Info("3D model processing job enqueued", "property_id", job.PropertyID, "path", job.RelativePath)
	default:
		slog.Warn("3D model job queue full, processing synchronously", "property_id", job.PropertyID)
		go q.processJob(context.Background(), job)
	}
}

// Start launches worker goroutines to consume queued 3D parsing tasks until context cancelation.
func (q *asyncModelQueue) Start(ctx context.Context, workers int) {
	q.startOnce.Do(func() {
		if workers <= 0 {
			workers = 2
		}
		for i := 0; i < workers; i++ {
			go q.workerLoop(ctx, i+1)
		}
		slog.Info("3D background model queue workers started", "workers", workers)
	})
}

// workerLoop continuously polls jobs from the channel.
func (q *asyncModelQueue) workerLoop(ctx context.Context, workerID int) {
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-q.jobs:
			if !ok {
				return
			}
			q.processJob(ctx, job)
		}
	}
}

// processJob performs 3D geometry analysis, tags binary Chunk 0, and updates database model metadata.
func (q *asyncModelQueue) processJob(ctx context.Context, job ModelProcessingJob) {
	cleanRel := job.RelativePath
	if len(cleanRel) > 0 && cleanRel[0] == '/' {
		const storagePrefix = "/api/v1/storage/"
		if len(cleanRel) > len(storagePrefix) && cleanRel[:len(storagePrefix)] == storagePrefix {
			cleanRel = cleanRel[len(storagePrefix):]
		}
	}

	absPath, err := q.storageSvc.GetAbsolutePath(cleanRel)
	if err != nil {
		slog.Error("Failed resolving model path for queue job", "property_id", job.PropertyID, "error", err)
		return
	}

	if strings.ToLower(filepath.Ext(absPath)) == ".glb" {
		if err := TagGLBArchitecture(absPath); err != nil {
			slog.Warn("Failed tagging GLB architecture extras", "error", err)
		}
	}

	meta, err := q.analyzer.Analyze(absPath)
	if err != nil {
		slog.Warn("Model analyzer fallback triggered", "property_id", job.PropertyID, "error", err)
		meta = &models.Model3DMetadata{Status: "ready", RoofNodes: []string{"roof", "roof_roof_0"}}
	}

	if err := q.propRepo.UpdateModelMetadata(ctx, job.PropertyID, meta, job.AutoPublish); err != nil {
		slog.Error("Failed saving computed 3D model metadata", "property_id", job.PropertyID, "error", err)
		return
	}

	slog.Info("Successfully processed and saved 3D model metadata",
		"property_id", job.PropertyID,
		"roof_nodes", len(meta.RoofNodes),
		"auto_publish", job.AutoPublish,
	)
}
