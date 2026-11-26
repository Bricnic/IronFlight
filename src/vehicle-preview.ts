/** One lazy-loaded decoder for the whole garage, shared by hover and keyboard focus. */
export function createVehiclePreview(grid: HTMLElement) {
  let video: HTMLVideoElement | undefined;
  let hovered: HTMLElement | null = null;
  let focused: HTMLElement | null = null;
  let active: HTMLElement | null = null;
  let enabled = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const cardFor = (target: EventTarget | null) => {
    const card =
      target instanceof Element
        ? target.closest<HTMLElement>(".vehicle-card")
        : null;
    return card && grid.contains(card) ? card : null;
  };
  const clear = () => {
    active?.classList.remove("preview-playing");
    active = null;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    }
  };
  const update = () => {
    const next =
      enabled && !document.hidden && !reducedMotion.matches
        ? (hovered ?? focused)
        : null;
    if (next === active) return;
    clear();
    if (!next) return;
    if (!video) {
      video = document.createElement("video");
      video.className = "vehicle-turntable";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.setAttribute("aria-hidden", "true");
      video.addEventListener("playing", () => {
        if (
          active &&
          video?.parentElement === active.querySelector(".vehicle-preview")
        )
          active.classList.add("preview-playing");
      });
      video.addEventListener("error", () =>
        active?.classList.remove("preview-playing"),
      );
    }
    active = next;
    video.src = `/vehicles/turntables/${next.dataset.vehicle}.webm`;
    next.querySelector(".vehicle-preview")!.append(video);
    // Autoplay failures leave the still image visible and never block vehicle selection.
    void video.play().catch(() => {});
  };
  grid.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return;
    const card = cardFor(event.target);
    if (hovered === card) return;
    hovered = card;
    update();
  });
  grid.addEventListener("pointerout", (event) => {
    if (event.pointerType === "touch") return;
    const next = cardFor(event.relatedTarget);
    if (hovered === next) return;
    hovered = next;
    update();
  });
  grid.addEventListener("focusin", (event) => {
    focused =
      event.target instanceof Element && event.target.matches(":focus-visible")
        ? cardFor(event.target)
        : null;
    if (focused) hovered = null;
    update();
  });
  grid.addEventListener("focusout", () => {
    focused = null;
    update();
  });
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", update);
  return {
    show() {
      enabled = true;
    },
    stop() {
      enabled = false;
      hovered = focused = null;
      clear();
    },
  };
}
