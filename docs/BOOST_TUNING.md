# Dragon loop boost tuning

The pad targets 75 m/s (270 km/h), three times the nominal 25 m/s top speed at the default top-speed setting. The power slider multiplies the pad's 25 m/s² acceleration; it does not change that target. Its tested default is **3.0x**.

The physics sweep starts a fresh truck 15 meters before the pad and uses throttle and steering only. The driver follows the loop's slight lateral offset, without modifying position, orientation or velocity. The 45-meter-radius track uses the same dimensions for rendering and colliders. Completion requires tire contact while inverted near the apex and a subsequent upright return to the bottom.

| Pad power | Peak speed (m/s) | Peak height (m) | Apex tire contacts | Completed |
| --- | ---: | ---: | ---: | --- |
| 1.0x | 47.28 | 66.26 | 0 | No |
| 1.5x | 57.53 | 84.92 | 0 | No |
| 2.0x | 66.10 | 87.98 | 4 | Yes |
| 2.5x | 73.99 | 88.01 | 4 | Yes |
| **3.0x** | **74.95** | **88.02** | **4** | **Yes** |
| 4.0x | 74.95 | 88.02 | 4 | Yes |

The 3.0x default reaches the speed target with margin before leaving the pad. Firmer suspension in the loop approach region supplies the required radial force; the chassis remains a dynamic rigid body. There is no track attachment or trajectory correction. A sideways offset of 12 meters separates the descending track from the entrance, allowing a physical exit.

Dragon jets fire for three seconds, followed by five seconds clear. Damage is proportional to each part's original health: uninterrupted exposure costs one third of total integrity per simulated second. Thus 1.5 seconds removes about 50%. Fire timing and damage use simulation time, so accelerated playback preserves the same behavior.

Reproduce the sweep with `npm test -- tests/loop.test.ts`; raw results are written to `artifacts/boost-sweep.json`. Browser tests in `e2e/loop.spec.ts` drive from the original starting line through the jump and the complete loop at both 1x and 16x on all three routes, then continue onto the exit road. They record speed, height, tire contact, orientation and integrity. Tuned combinations beyond the defaults are deliberately available for playtesting; the default configuration is the feasibility baseline.
