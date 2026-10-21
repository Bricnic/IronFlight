# Playtest update audit

## Left/right cause and correction

The original model named negative local X "left" despite +Z being forward. That naming matches a front-facing drawing, but swaps the driver's left and right when viewed from the chase camera. Steering already correctly turned A/Left toward +X, so fixing steering would have introduced another error. Existing tests separately checked steering direction and part destruction without checking that a destroyed left part occupied the driver's left.

The correction uses +X as driver left throughout: PARTS definitions, suspension wheel indices, model pivots, windows, handles, mirrors, stripes, door decals, lab IDs, detached debris origins, collision colliders, and side-landing wheel/door targets. Wheel positions retain front-left/front-right/rear-left/rear-right order. New tests tie these positions to steering and cabin identities. The driver's steering wheel is on +X.

## Damage and controls

Roof impacts remove 70% of full-car health, including roof destruction in that budget. Side impacts remove 25%, including door destruction and, when severe enough, same-side wheel destruction. Damage requires downward motion and a real static contact manifold, and is debounced against repeated contact. Nose/rear/underbody landings have a 25% budget. Regular upright suspension contacts do not trigger these penalties.

Direction switching uses a smoothstep blend across opposite-direction speed 0–20/3.6 m/s. At high opposing speed the pedal brakes, below the threshold increasing motor torque overlaps decreasing braking, and zero speed has full requested-direction torque. Opposing speed never suppresses that torque through the normal top-speed taper. Handbrake uses a separately tunable multiplier on regular brake power.

## Rendering

Skid paths are sampled from actual attached grounded tire contacts under acceleration, steering, and lateral slip. Ribbons use normal alpha blending, no depth writes, soft transverse edges, and 1.1-meter longitudinal fades. They persist for the run and clear when rebuilding the arena. The burnout end-to-end test measures a half-turn and a curved path, confirms persistence, and saves an overview screenshot.

Hammer rotation integrates a continuous phase so moving its slider does not jump rotor orientation. Rendered and physical perpendicular head spikes match. The arcade strike function retains its prior fixed knockback calibration, independent of the spin multiplier. A 0.45-second solver grace interval after the registered strike lets the launched truck and debris clear the same head’s new spikes, while contact manifolds remain available for episode tracking. Rapier’s physics hooks require the event-queue stepping path; the queue is recreated and freed with the world.

The user-supplied lava image is preserved as the tiled source. Shader sampling applies slow diagonal drift and spatially localized animated refraction to both its diffuse and emissive samples.

## Four-wheel drive and hard braking

Both axles receive equal forward/reverse motor force. Detached wheels lose drive and braking, and reduce the supplemental motor's available power. The observed forward flip was caused by multiplying Rapier's tire-contact brake impulse, not by an exclusively front-driven axle.

The four wheel brakes retain their progressive baseline impulse. Brake power above that baseline adds mass-scaled deceleration through the center of mass, proportional to contacting attached wheels and capped at the current speed so a handbrake cannot reverse the truck. Grounded braking adds pitch/roll damping and a mild restoring torque; yaw remains free, with no stability assistance in flight or on the vertical loop.

`tests/braking.test.ts` checks both axles, detached tires, forward/reverse stops, steering during braking, and airborne rotation. From 144 displayed MPH at 10x brake power, service braking reaches below 0.5 m/s in 0.95 seconds and 18.7 meters; 10x handbrake takes 0.60 seconds and 11.9 meters. It also tests 198 MPH. All stops preserve integrity and remain upright. Measurements are written to `artifacts/braking-results.json`. `e2e/braking.spec.ts` accelerates with real W events past 100 MPH, then checks S and Space at maximum tuning.

## Viscous lava and basin texture stability

Lava is a sensor volume rather than a rigid tire support. Each truck part begins its own two-second immersion at actual surface contact; the part detaches, loses its falling momentum, and sinks at a steady rate from its entry height until its entire rotated bounding box is submerged. It stays submerged until reset. Each part chars independently, with flame billboards and rising smoke at the exposed metal/lava interface; effects fade as the last metal disappears. Material instances are isolated by part, preserving untouched panels even when their originals shared paint or metal materials.

The previous basin floor extended beneath and through the perimeter walls. Their exterior faces overlapped at identical depth but had different texture coordinates, producing camera-dependent z-fighting. The floor now fits inside the rim, and its upper surface meets the bottom of a deeper lava fill. Grounded gantry and spike supports extend to that floor.

`tests/lava.test.ts` covers panels, tires, chassis, rotated vertical bounds, monotonic sinking, two-second completion, reset, material isolation and non-overlapping basin solids. `e2e/lava.spec.ts` checks a real dropped wheel and samples 192 fixed points on the basin wall while making tiny camera orbits below road level. Samples are reprojected with bilinear interpolation to distinguish texture switching from ordinary movement across screen pixels. Screenshots are saved in `artifacts/lava-wheel-burning.png`, `artifacts/lava-wheel-submerged.png` and `artifacts/basin-low-angle-fixed.png`.
