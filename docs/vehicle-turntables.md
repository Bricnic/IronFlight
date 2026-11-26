# Garage turntable videos

Hovering a vehicle card plays its silent eight-second, 360-degree WebM clip.
Keyboard/controller focus also starts a preview. The garage shares one video
element, loads only the active clip, and releases playback when the card or
screen is left. Locked vehicles retain their lock overlay and selection rules.
Reduced-motion preferences and playback failures retain the still thumbnail.

The 84 clips in `public/vehicles/turntables/` use the actual destruction lab
environment and game renderer. The generator captures each 800 by 450 thumbnail
and the video's first frame from the same render, so camera pose, lighting,
grid floor and background match when hovering. Each clip contains 160 frames at
20 fps, 512 by 288 pixels, encoded as VP8. The camera completes a full orbit
without duplicating the endpoint frame, keeping the loop continuous.

After adding or changing a model, regenerate its thumbnail and clip together:

```powershell
npm run generate:vehicle-turntables -- meteor-prospector
```

Omit the vehicle ID to regenerate the whole garage. The generator uses the
installed Playwright Chromium browser and bundled FFmpeg; `FFMPEG_PATH` can
select another compatible encoder. On Windows, setting `$env:TURNTABLE_GPU='1'`
enables the D3D11 hardware rendering path. The default uses SwiftShader.

`tests/vehicle-turntables.test.ts` checks that every registered vehicle ships
a WebM clip. `e2e/vehicle-turntable.spec.ts` checks playback and wrapping,
visually different front/back frames, one active preview, stopping playback,
keyboard navigation, reduced motion, missing-video fallback and locked cars.
It also compares thumbnail and first-frame background pixels and saves a
side-by-side screenshot to `artifacts/vehicle-turntables/lab-background-comparison.png`.
