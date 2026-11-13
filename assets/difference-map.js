/*
 * Difference-map replay. The constraint sets and the trajectory follow the
 * non-convex difference-map GIF in github.com/jn2clark/nn-iterated-projections.
 * No external dependencies. No unvisited/future trajectory is drawn.
 */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const WIDTH = 538, HEIGHT = 340;
  const A = [[[0, 0], [4, -1.6]], [[5, -2], [8, -3.2]]];
  const B = [[[0.5, 0], [3, -2]], [[3.5, -2.4], [4.5, -3.2]]];
  const SCALE = 48.85, ORIGIN = [101.7, 294];
  const RUN = 8115, HOLD = 1250, FADE = 465, CYCLE = RUN + HOLD + FADE;

  function projection(point, segments) {
    let best = null, bestDistance = Infinity;
    for (const [a, b] of segments) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1,
        ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)));
      const candidate = [a[0] + t * dx, a[1] + t * dy];
      const distance = (point[0] - candidate[0]) ** 2 + (point[1] - candidate[1]) ** 2;
      if (distance < bestDistance) { best = candidate; bestDistance = distance; }
    }
    return best;
  }
  function toScreen(p) { return [ORIGIN[0] + SCALE * p[0], ORIGIN[1] + SCALE * p[1]]; }
  // Iterates read frame by frame from assets/ncvx-dm.gif in
  // github.com/jn2clark/nn-iterated-projections, in the same units as A and B.
  const ITERATES = [[5.026,-3.616],[3.415,-4.246],[1.908,-4.649],[0.226,-4.442],[-1.21,-3.843],[-1.662,-3.471],[-1.559,-3.306],[-1.456,-3.151],[-1.364,-2.986],[-1.262,-2.831],[-1.159,-2.665],[-1.056,-2.5],[-0.964,-2.345],[-0.862,-2.19],[-0.759,-2.025],[-0.656,-1.86],[-0.554,-1.705],[-0.462,-1.539],[-0.359,-1.384],[-0.256,-1.219],[-0.154,-1.064],[-0.062,-0.899],[0.041,-0.744],[0.144,-0.579],[0.246,-0.424],[0.349,-0.258],[0.462,-0.114],[0.626,-0.01],[0.81,0.041],[0.995,0.052],[1.159,0.01],[1.303,-0.072],[1.395,-0.165],[1.436,-0.289],[1.436,-0.393],[1.395,-0.496],[1.313,-0.579],[1.221,-0.64],[1.108,-0.661],[0.995,-0.661],[0.903,-0.63],[0.821,-0.579],[0.769,-0.517],[0.749,-0.444],[0.759,-0.382],[0.79,-0.32],[0.841,-0.279],[0.903,-0.248],[0.964,-0.238],[1.034,-0.238],[1.085,-0.269],[1.126,-0.289],[1.157,-0.331],[1.167,-0.372],[1.157,-0.413],[1.134,-0.452],[1.104,-0.469],[1.067,-0.483],[1.034,-0.481],[1.005,-0.469],[0.989,-0.461],[0.976,-0.446],[0.968,-0.432],[0.97,-0.413],[0.97,-0.401],[0.976,-0.388],[0.978,-0.38],[1,-0.4]];
  function calculatePath() { return ITERATES.map(toScreen); }
  function element(tag, attrs = {}) {
    const e = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) e.setAttribute(key, String(value));
    return e;
  }
  const fmt = p => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;

  function mount(target, options = {}) {
    if (typeof target === 'string') target = document.querySelector(target);
    if (!(target instanceof Element)) throw new TypeError('DifferenceMap.mount requires a DOM element.');
    if (target._differenceMap) return target._differenceMap;
    // A canvas placeholder is swapped for a div so the SVG can mount.
    if (target.tagName.toLowerCase() === 'canvas') {
      const replacement = document.createElement('div');
      replacement.id = target.id;
      replacement.className = target.className;
      target.replaceWith(replacement);
      target = replacement;
    }
    target.setAttribute('data-difference-map', '');
    const svg = element('svg', {
      viewBox: `0 0 ${WIDTH} ${HEIGHT}`, role: 'img',
      'aria-label': 'Difference-map trajectory passing around a local trap and converging to the intersection of two gapped line sets',
      preserveAspectRatio: 'xMidYMid meet'
    });
    svg.style.cssText = 'display:block;width:100%;height:auto;overflow:visible';
    const title = element('title'); title.textContent = 'Difference map'; svg.append(title);
    const constraints = element('g', {
      fill: 'none', 'stroke-width': 4.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    });
    for (const [segments, color] of [[A, 'var(--dm-red, #d3202e)'], [B, 'var(--dm-blue, #2142bd)']]) {
      for (const [a, b] of segments) {
        constraints.append(element('polyline', { points: `${fmt(toScreen(a))} ${fmt(toScreen(b))}`, stroke: color }));
      }
    }
    svg.append(constraints);
    const endpoint = toScreen([1, -0.4]);
    svg.append(element('circle', {
      cx: endpoint[0], cy: endpoint[1], r: 5.4,
      fill: 'var(--dm-target-fill, #ccd5dd)', 'fill-opacity': 0.64,
      stroke: 'var(--dm-target, #55769e)', 'stroke-opacity': 0.68, 'stroke-width': 1.35
    }));
    const moving = element('g');
    const trace = element('polyline', {
      fill: 'none', stroke: 'var(--dm-path, #75828d)', 'stroke-width': 1.65,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    });
    const halo = element('circle', { r: 9.7, fill: 'var(--dm-halo, #61788a)', 'fill-opacity': 0.15 });
    const dot = element('circle', { r: 3.75, fill: 'var(--dm-dot, #263b4c)' });
    moving.append(trace, halo, dot); svg.append(moving); target.replaceChildren(svg);

    const points = calculatePath(), distances = [0];
    for (let i = 1; i < points.length; i++) {
      distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
    const totalLength = distances.at(-1);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let elapsed = media.matches ? RUN : 0;
    let playing = options.autoplay !== false && !media.matches;
    let previous = null, request = 0, disposed = false, inView = true;
    const button = options.button || target.closest('figure')?.querySelector('[data-dm-toggle], #pause-trajectory');

    function draw(time) {
      const phase = ((time % CYCLE) + CYCLE) % CYCLE;
      const fraction = Math.min(1, phase / RUN);
      const progress = 0.5 - 0.5 * Math.cos(Math.PI * fraction);
      const length = totalLength * progress;
      let end = 1;
      while (end < distances.length - 1 && distances[end] < length) end++;
      const span = distances[end] - distances[end - 1];
      const mix = span > 1e-10 ? Math.max(0, Math.min(1, (length - distances[end - 1]) / span)) : 1;
      const head = [
        points[end - 1][0] + mix * (points[end][0] - points[end - 1][0]),
        points[end - 1][1] + mix * (points[end][1] - points[end - 1][1])
      ];
      // Only the visited prefix is placed in the DOM: there is no future-path layer.
      trace.setAttribute('points', points.slice(0, end).concat([head]).map(fmt).join(' '));
      for (const mark of [halo, dot]) { mark.setAttribute('cx', head[0]); mark.setAttribute('cy', head[1]); }
      const fadeIn = Math.min(1, phase / 400);
      const fadeOut = phase > RUN + HOLD ? Math.max(0, 1 - (phase - RUN - HOLD) / FADE) : 1;
      moving.setAttribute('opacity', Math.min(fadeIn, fadeOut));
    }
    function updateButton() {
      if (!button) return;
      button.textContent = playing ? 'Ⅱ  Pause' : '▷  Play';
      button.setAttribute('aria-label', playing ? 'Pause trajectory animation' : 'Play trajectory animation');
    }
    function frame(timestamp) {
      request = 0;
      if (disposed || !playing || !inView || document.hidden) { previous = null; return; }
      if (previous !== null) elapsed += Math.max(0, timestamp - previous);
      previous = timestamp; draw(elapsed);
      request = requestAnimationFrame(frame);
    }
    function schedule() {
      if (!disposed && playing && inView && !document.hidden && !request) request = requestAnimationFrame(frame);
    }
    function pause() {
      playing = false; cancelAnimationFrame(request); request = 0; previous = null; updateButton();
    }
    function play() { playing = true; previous = null; updateButton(); schedule(); }
    function toggle() { playing ? pause() : play(); }
    function visibility() {
      previous = null;
      if (document.hidden) { cancelAnimationFrame(request); request = 0; }
      else schedule();
    }
    function motionChange(e) { if (e.matches) { pause(); elapsed = RUN; draw(elapsed); } }
    button?.addEventListener('click', toggle);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', motionChange);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      previous = null;
      if (!inView) { cancelAnimationFrame(request); request = 0; } else schedule();
    }) : null;
    observer?.observe(target);
    const api = {
      play, pause,
      setTimeMs(value) {
        if (!Number.isFinite(value)) throw new TypeError('Time must be a finite number.');
        elapsed = value; previous = null; draw(elapsed);
      },
      getTimeMs() { return elapsed; },
      destroy() {
        disposed = true; pause(); observer?.disconnect();
        button?.removeEventListener('click', toggle);
        document.removeEventListener('visibilitychange', visibility);
        media.removeEventListener('change', motionChange);
        delete target._differenceMap;
      }
    };
    target._differenceMap = api;
    updateButton(); draw(elapsed); schedule(); return api;
  }
  window.DifferenceMap = Object.freeze({ mount, calculatePath, cycleDurationMs: CYCLE, runDurationMs: RUN });
  function start() {
    document.querySelectorAll('[data-difference-map], canvas#trajectory').forEach(e => mount(e));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
