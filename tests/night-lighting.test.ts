import { expect, it } from "vitest";
import * as T from "three";
import {
  getBackgroundTemplate,
  resolveMood,
  type BackgroundTemplate,
} from "../src/backgrounds";
import { buildStarField } from "../src/background-view";

const luminance = (hex: number) =>
  0.2126 * ((hex >> 16) & 0xff) +
  0.5872 * ((hex >> 8) & 0xff) +
  0.0722 * (hex & 0xff);

const day = { night: false, rain: false };
const night = { night: true, rain: false };
const rain = { night: false, rain: true };

it("passes the template rig through on a clear day", () => {
  for (const name of ["pastoral-hills", "haunted-night", "cavern-dark"]) {
    const template = getBackgroundTemplate(name);
    expect(resolveMood(template, day)).toEqual({
      sky: { ...template.sky },
      fog: { ...template.fog },
      sun: { ...template.sun },
      hemi: { ...template.hemi },
      env: template.env,
    });
  }
});

it("dims every light channel and darkens the sky at night", () => {
  for (const name of ["pastoral-hills", "haunted-night", "cavern-dark"]) {
    const template: BackgroundTemplate = getBackgroundTemplate(name);
    const mood = resolveMood(template, night);
    expect(mood.sun.intensity).toBeLessThanOrEqual(template.sun.intensity);
    expect(mood.hemi.intensity).toBeLessThanOrEqual(template.hemi.intensity);
    expect(mood.env).toBeLessThanOrEqual(template.env);
    expect(luminance(mood.sky.top)).toBeLessThanOrEqual(
      luminance(template.sky.top),
    );
    expect(luminance(mood.sky.horizon)).toBeLessThanOrEqual(
      luminance(template.sky.horizon),
    );
    expect(luminance(mood.fog.color)).toBeLessThanOrEqual(
      luminance(template.fog.color),
    );
    expect(mood.fog.near).toBe(template.fog.near);
    expect(mood.fog.far).toBe(template.fog.far);
  }
  const pastoral = getBackgroundTemplate("pastoral-hills");
  const mood = resolveMood(pastoral, night);
  expect(mood.sun.intensity).toBeLessThan(pastoral.sun.intensity);
  expect(mood.hemi.intensity).toBeLessThan(pastoral.hemi.intensity);
  expect(mood.env).toBeLessThan(pastoral.env);
  expect(luminance(mood.sky.top)).toBeLessThan(luminance(pastoral.sky.top));
  expect(luminance(mood.fog.color)).toBeLessThan(
    luminance(pastoral.fog.color),
  );
});

it("keeps a deep-blue night sky without lifting dark templates", () => {
  const pastoral = getBackgroundTemplate("pastoral-hills");
  const mood = resolveMood(pastoral, night);
  expect(luminance(mood.sky.top)).toBeGreaterThan(15);
  expect(luminance(mood.sky.horizon)).toBeGreaterThan(40);
  const cavern = getBackgroundTemplate("cavern-dark");
  const cavernMood = resolveMood(cavern, night);
  expect(cavernMood.sky.top).toBe(cavern.sky.top);
  expect(cavernMood.sky.horizon).toBe(cavern.sky.horizon);
  expect(cavernMood.fog.color).toBe(cavern.fog.color);
});

it("casts an overcast rig when raining", () => {
  const template = getBackgroundTemplate("pastoral-hills");
  const mood = resolveMood(template, rain);
  expect(luminance(mood.sky.top)).toBeLessThan(luminance(template.sky.top));
  expect(luminance(mood.sky.horizon)).toBeLessThan(
    luminance(template.sky.horizon),
  );
  expect(mood.sun.intensity).toBeLessThan(template.sun.intensity);
  expect(mood.hemi.intensity).toBeLessThan(template.hemi.intensity);
  expect(luminance(mood.fog.color)).toBeLessThan(
    luminance(template.fog.color),
  );
  expect(mood.env).toBeGreaterThan(template.env);
  expect(mood.fog.near).toBe(template.fog.near);
  expect(mood.fog.far).toBe(template.fog.far);
  const storm = resolveMood(template, { night: true, rain: true });
  expect(luminance(storm.sky.top)).toBeLessThanOrEqual(
    luminance(mood.sky.top),
  );
  expect(storm.sun.intensity).toBeLessThanOrEqual(mood.sun.intensity);
  expect(storm.env).toBeLessThanOrEqual(mood.env);
});

it("builds a fog-free star field headlessly", () => {
  const stars = buildStarField(300);
  expect(stars.geometry.getAttribute("position").count).toBe(300);
  expect((stars.material as T.PointsMaterial).fog).toBe(false);
  expect(stars.visible).toBe(true);
});
