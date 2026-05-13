function initStrip() {
  const strip = document.querySelector("[data-strip]");
  const next = document.querySelector("[data-strip-next]");
  if (!strip || !next) return;

  const syncStartInset = () => {
    const atStart = strip.scrollLeft <= 0;
    strip.classList.toggle("strip--no-start-inset", !atStart);
  };

  next.addEventListener("click", () => {
    const amount = Math.max(320, Math.round(strip.clientWidth * 0.7));
    strip.scrollBy({ left: amount, behavior: "smooth" });
  });

  // Make trackpad/mousewheel feel like “sideways scroll”
  strip.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      strip.scrollLeft += e.deltaY;
    },
    { passive: false }
  );

  strip.addEventListener("scroll", syncStartInset, { passive: true });
  window.addEventListener("resize", syncStartInset, { passive: true });
  syncStartInset();
}

function initVisiblePreviewPlayback() {
  const strip = document.querySelector("[data-strip]");
  if (!strip) return;

  const videos = Array.from(strip.querySelectorAll(".preview video"));
  if (!videos.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const visibleVideos = new Set();
  const playTimers = new Map();
  const visibilityThreshold = 0.65;
  const resetThreshold = 0.2;
  const cascadeDelayMs = 180;

  const clearPlayTimer = (video) => {
    const timer = playTimers.get(video);
    if (timer) {
      window.clearTimeout(timer);
      playTimers.delete(video);
    }
  };

  const pauseVideo = (video, shouldReset = false) => {
    clearPlayTimer(video);
    video.pause();
    if (shouldReset) {
      video.currentTime = 0;
    }
  };

  const queueVisibleVideos = () => {
    const orderedVisibleVideos = videos.filter((video) => visibleVideos.has(video));

    orderedVisibleVideos.forEach((video, index) => {
      if (playTimers.has(video) || !video.paused) return;

      const delay = index * cascadeDelayMs;
      const timer = window.setTimeout(() => {
        playTimers.delete(video);
        if (!visibleVideos.has(video) || document.hidden) return;
        void video.play().catch(() => {});
      }, delay);

      playTimers.set(video, timer);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      let didChange = false;

      entries.forEach((entry) => {
        const video = entry.target;
        const isVisible = entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold;

        if (isVisible) {
          if (!visibleVideos.has(video)) {
            visibleVideos.add(video);
            didChange = true;
          }
          return;
        }

        if (visibleVideos.delete(video)) {
          didChange = true;
        }

        pauseVideo(video, entry.intersectionRatio <= resetThreshold);
      });

      if (didChange) {
        queueVisibleVideos();
      }
    },
    {
      root: strip,
      threshold: [0, resetThreshold, visibilityThreshold, 0.9],
    }
  );

  videos.forEach((video) => {
    pauseVideo(video, true);
    observer.observe(video);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      videos.forEach((video) => pauseVideo(video, false));
      return;
    }

    queueVisibleVideos();
  });
}

initStrip();
initVisiblePreviewPlayback();

