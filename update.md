# EstateVerse Project Update

Update date: November 15, 2026

This document summarizes the changes applied to the Walk Inside 360° capture system, Go backend, website, and mobile application.

## Adaptive 360° capture

- Removed fixed capture-count options such as 24 or 42 photos.
- Capture starts with three calibration photos at 0°, 20°, and 40°.
- The backend estimates horizontal FOV, camera aspect ratio, and calibration confidence.
- The backend calculates the remaining capture targets using weighted sphere coverage.
- The planner uses at least 18% overlap, a 2° safety margin, a 99.8% coverage target, and redundant-target pruning.
- The number of photos adapts to the camera, with an upload limit of 8–48 frames.
- Calibration photos are reused in the final panorama.
- Validation covers JPEG format, resolution, quaternion orientation, consistent frame dimensions, sensor availability, rotation speed, and camera stability during the shutter interval.

## Go backend and asynchronous processing

- Added `POST /api/v1/tours/calibration` to calculate the capture plan from the first three photos.
- Added the `POST /api/v1/tours/captures` flow to store raw frames privately.
- New rooms start with `processing` status before stitching completes.
- `TourQueue` runs stitching, alignment, exposure balancing, blending, panorama generation, and preview generation in the background.
- The final room status becomes `ready` or `failed` with seller-friendly guidance.
- Interrupted `processing` jobs are recovered automatically after a backend restart.
- The queue has a large capacity and does not drop jobs when it is full.
- New captures for an already published property automatically move the property back to `draft`.
- Publishing is deferred until every panorama room has `ready` status.
- All backend endpoints run from one process:

  ```powershell
  cd backend
  go run .
  ```

## Website

- The website uses the same planner and capture protocol as mobile.
- The website sends JPEG frames and quaternions to the backend; stitching is not performed in the browser.
- The new-property page keeps captures temporarily, creates the property, and then uploads rooms to the backend queue.
- The edit page can upload rooms directly and monitor asynchronous processing status.
- Manual photo-count selection has been removed.
- The website shows a toast when panorama processing succeeds or fails.
- The website still supports importing an equirectangular 360° photo.
- The website includes a hotspot editor for creating and removing navigation arrows between rooms.

## Expo mobile application

- Native capture uses the same targets, tolerance, hold time, and quaternion format from the shared folder as the website.
- Mobile only captures and uploads JPEG frames; panorama generation remains on the backend.
- Capture waits for camera and motion permissions before the session becomes active.
- Capture stops when the application actually enters the background.
- Raw files remain on the device until the upload succeeds.
- Mobile polls room status and shows a dialog when processing succeeds or fails.
- Mobile login uses the same backend account system with a bearer token stored in SecureStore.
- Mobile JSON login errors and API configuration issues were fixed.

## Activity logging and history

- Added the `activity_logs` table for persistent backend activity history.
- Every HTTP request records its method, path, status, duration, IP address, user agent, user, and request ID.
- Backend responses include an `X-Request-ID` header for error tracing.
- Login, registration, logout, capture queue, stitching, recovery, model processing, warnings, and failures are recorded.
- Internal error details remain on the server and are not returned to clients.
- Added the seller history endpoint:

  ```http
  GET /api/v1/dashboard/activity?limit=50&offset=0
  ```

- Background property and room activity can be traced by the related owner.

## Database and migrations

- Migration `013_create_activity_logs.sql` creates the activity history table.
- Migration `014_add_activity_resource_index.sql` adds indexes for property and room history lookups.
- Migrations run automatically when `go run .` starts the backend.
- The MySQL schema was verified, and migrations 013 and 014 were applied to the active database.

## Validation

- `go test ./...` passed.
- `go vet ./...` passed.
- Frontend capture tests, lint, and production build passed.
- Mobile TypeScript checks, Expo lint, API tests, and Android export passed.
- The backend health endpoint was verified with HTTP 200.

## Remaining feature differences

- Mobile does not yet support importing an equirectangular 360° photo.
- Mobile does not yet include hotspot editing or room-reordering UI.
- Activity history has a backend endpoint but no dedicated history screen in the website or mobile app yet.
- Browser-camera and native-camera JPEG files are not guaranteed to be byte-identical, but their manifest format, orientation data, algorithm, and backend processing are shared.
