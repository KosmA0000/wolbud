
    (() => {
      'use strict';
      const video = document.getElementById('scene-video');
      const track = document.getElementById('track');
      const lastBlock = document.getElementById('last-block');
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const recMode = new URLSearchParams(location.search).get('rec') === '1';
      const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
      let viewport = innerHeight, trackTop = 0, end = 1, knee = .8;
      let target = 0, cur = 0, frame = 0, dirty = true;
      let recAnimation = null, recMarker = null, externalRecorder = false;

      // The selected Downloads clip is 720p, 24fps and about 10 seconds.
      // Its original soundtrack is removed; a keyframe every four frames makes seeks responsive.
      function measure() {
        const sceneRect = track.querySelector('.scene').getBoundingClientRect();
        viewport = sceneRect.height || innerHeight;
        trackTop = track.getBoundingClientRect().top + scrollY;
        const lastBottom = lastBlock.getBoundingClientRect().bottom + scrollY - trackTop;
        end = lastBottom + .75 * viewport;
        knee = lastBottom / end;
        track.style.height = `${end + viewport}px`;
        dirty = true;
        requestTick();
      }
      function clipTime(progress, media = video) {
        const p = clamp(progress);
        const clipProgress = p < knee ? p / knee * .46 : .46 + (p - knee) / (1 - knee) * .54;
        const duration = Number.isFinite(media.duration) ? media.duration : 10;
        return clipProgress * Math.max(0, duration - 1 / 48);
      }
      function seek() {
        if (video.readyState < 1 || video.seeking) return;
        if (Math.abs(video.currentTime - cur) > 1 / 60) {
          try { video.currentTime = cur; } catch (_) { /* Metadata may reset during a media reload. */ }
        }
      }
      function requestTick() { if (!frame) frame = requestAnimationFrame(tick); }
      function tick() {
        frame = 0;
        if (document.hidden) return;
        if (recAnimation && !externalRecorder) {
          const progress = clamp(parseFloat(getComputedStyle(recMarker).getPropertyValue('--rec-progress')) || 0);
          window.scrollTo({ top: trackTop + progress * (end + .9 * viewport), behavior: 'instant' });
          dirty = true;
        }
        if (dirty && !externalRecorder) {
          target = clipTime((scrollY - trackTop) / end);
          dirty = false;
        }
        if (!externalRecorder) {
          cur += (target - cur) * (reducedMotion.matches ? 1 : .22);
          if (Math.abs(target - cur) < .001) cur = target;
        }
        seek();
        if (Math.abs(target - cur) > .001 || (recAnimation && recAnimation.playState === 'running' && !externalRecorder)) requestTick();
      }
      // Re-seek after the decoder finishes, never issuing overlapping seeks.
      video.addEventListener('seeked', () => { seek(); requestTick(); });
      video.addEventListener('loadedmetadata', () => { dirty = true; requestTick(); });
      video.addEventListener('loadeddata', requestTick);
      video.addEventListener('error', () => { document.querySelector('.media-status').hidden = false; });
      addEventListener('scroll', () => { dirty = true; requestTick(); }, { passive: true });
      addEventListener('resize', measure, { passive: true });
      addEventListener('pageshow', measure);
      document.addEventListener('visibilitychange', () => { dirty = true; requestTick(); });
      new ResizeObserver(measure).observe(track.querySelector('.content'));
      if (document.fonts) document.fonts.ready.then(measure);
      measure();

      // Deterministic recorder hook. t is elapsed time in seconds (0–6.5).
      // Pause the Web Animation and use the same cubic-bezier curve as its keyframes.
      function ease(x) {
        const cubic = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
        let lo = 0, hi = 1;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (cubic(mid, .45, .55) < x) lo = mid; else hi = mid;
        }
        return cubic((lo + hi) / 2, .05, .95);
      }
      window.__recTime = (media, t) => {
        externalRecorder = true;
        if (recAnimation) { recAnimation.pause(); recAnimation.currentTime = clamp(t / 6.5) * 6500; }
        const x = clamp(t / 6.5);
        const progress = x <= .03 ? 0 : x >= .94 ? 1 : ease((x - .03) / .91);
        const y = trackTop + progress * (end + .9 * viewport);
        window.scrollTo({ top: y, behavior: 'instant' });
        cur = target = clipTime((y - trackTop) / end, media || video);
        seek();
        return cur;
      };
      if (recMode) {
        recMarker = document.createElement('span');
        recMarker.className = 'rec-marker';
        recMarker.setAttribute('aria-hidden', 'true');
        document.body.append(recMarker);
        const startRecording = () => {
          if (externalRecorder) return;
          measure();
          recAnimation = recMarker.animate([
            { '--rec-progress': '0', offset: 0 },
            { '--rec-progress': '0', offset: .03, easing: 'cubic-bezier(.45,.05,.55,.95)' },
            { '--rec-progress': '1', offset: .94 },
            { '--rec-progress': '1', offset: 1 }
          ], { duration: 6500, fill: 'both' });
          requestTick();
        };
        Promise.all([
          document.fonts ? document.fonts.ready : Promise.resolve(),
          video.readyState >= 2 ? Promise.resolve() : new Promise(resolve => {
            video.addEventListener('loadeddata', resolve, { once: true });
            video.addEventListener('error', resolve, { once: true });
          })
        ]).then(startRecording);
      }
    })();
  