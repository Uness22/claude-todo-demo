/* ==========================================================================
   microbes.js — shape library for bacteria / viruses / fungi / parasites
   Two renderers:  MB.svg(kind)  → inline SVG (cards, figures)
                   MB.draw(ctx,kind,x,y,size,angle,o) → canvas (microscope)
   ========================================================================== */
(function (W) {
  "use strict";
  const C = {
    gpos: "#8b5cf6", gpos2: "#c084fc", gneg: "#f472b6", gneg2: "#fda4af",
    unstained: "#cbd5e1", yeast: "#a3e635", mold: "#86efac", proto: "#67e8f9",
    vir: "#94a3b8", debris: "#94a3b8"
  };

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function body(ctx, x, y, w, h, c1, c2, angle) {
    ctx.save(); ctx.translate(x, y); if (angle) ctx.rotate(angle);
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, c1); g.addColorStop(.55, c2); g.addColorStop(1, c1);
    ctx.fillStyle = g;
    if (h >= w * 0.92) { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); ctx.fill(); }
    else { rr(ctx, -w / 2, -h / 2, w, h, Math.min(h / 2, w / 2)); ctx.fill(); }
    ctx.strokeStyle = "rgba(0,0,0,.42)"; ctx.lineWidth = Math.max(.5, w * .055); ctx.stroke();
    ctx.restore();
  }
  function sphere(ctx, x, y, d, c1, c2) {
    const g = ctx.createRadialGradient(x - d * .22, y - d * .26, d * .05, x, y, d * .68);
    g.addColorStop(0, "#fff"); g.addColorStop(.28, c2); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, d / 2, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = Math.max(.4, d * .05); ctx.stroke();
  }

  /* ------------------------------------------------------------------ canvas */
  function draw(ctx, kind, x, y, s, angle, o) {
    o = o || {};
    const A = angle || 0, a = o.alpha == null ? 1 : o.alpha;
    ctx.save(); ctx.globalAlpha = a;
    const c1 = o.color || C.gpos, c2 = o.color2 || C.gpos2;
    switch (kind) {
      case "coccus": sphere(ctx, x, y, s, c1, c2); break;

      case "coccus_cluster": {           // staphylococci — grape-like clusters
        const r = s * .34;
        const spots = [[-.55, -.5], [.2, -.72], [.72, -.2], [-.3, .1], [.34, .3], [-.72, .45], [.06, .78], [.62, .62]];
        spots.forEach((p, i) => sphere(ctx, x + p[0] * s * .6, y + p[1] * s * .6, r, c1, c2));
        break;
      }
      case "coccus_chain": {             // streptococci
        const n = o.n || 6, r = s * .3;
        for (let i = 0; i < n; i++) {
          const t = (i - (n - 1) / 2) * r * 1.85;
          sphere(ctx, x + Math.cos(A) * t, y + Math.sin(A) * t, r, c1, c2);
        }
        break;
      }
      case "coccus_tetrad": {
        const r = s * .36;
        [[-r, -r], [r, -r], [-r, r], [r, r]].forEach(p => sphere(ctx, x + p[0], y + p[1], r, c1, c2));
        break;
      }
      case "bacillus":
        body(ctx, x, y, s, s * .42, c1, c2, A); break;

      case "bacillus_chain": {
        const n = o.n || 4, w = s * .8, h = s * .42;
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * (w * .92);
          const g = ctx.createLinearGradient(off - w / 2, -h / 2, off + w / 2, h / 2);
          g.addColorStop(0, c1); g.addColorStop(.5, c2); g.addColorStop(1, c1);
          ctx.fillStyle = g; rr(ctx, off - w / 2, -h / 2, w, h, h / 2); ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = Math.max(.4, h * .07); ctx.stroke();
        }
        ctx.restore(); break;
      }
      case "bacillus_spore": {           // rod with refractile endospore
        body(ctx, x, y, s, s * .44, c1, c2, A);
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = Math.max(.4, s * .035);
        ctx.beginPath(); ctx.ellipse(s * .27, 0, s * .13, s * .14, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.restore(); break;
      }
      case "spore": {                    // free endospore
        ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.strokeStyle = "rgba(120,120,140,.9)"; ctx.lineWidth = Math.max(.4, s * .07);
        ctx.beginPath(); ctx.ellipse(x, y, s / 2, s / 2.6, A, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(190,220,255,.5)"; ctx.beginPath(); ctx.ellipse(x - s * .1, y - s * .1, s * .16, s * .12, A, 0, 7); ctx.fill();
        break;
      }
      case "vibrio": {                   // curved (comma) rod
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        ctx.lineWidth = s * .34; ctx.lineCap = "round";
        ctx.strokeStyle = c1;
        ctx.beginPath(); ctx.arc(0, s * .34, s * .62, -2.45, -0.7); ctx.stroke();
        ctx.lineWidth = s * .22; ctx.strokeStyle = c2;
        ctx.beginPath(); ctx.arc(0, s * .34, s * .62, -2.4, -0.75); ctx.stroke();
        ctx.restore(); break;
      }
      case "spirillum": {
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        ctx.lineWidth = s * .13; ctx.lineCap = "round"; ctx.strokeStyle = c1;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const t = i / 40; const px = (t - .5) * s; const py = Math.sin(t * Math.PI * 3.2) * s * .17; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
        ctx.lineWidth = s * .07; ctx.strokeStyle = c2; ctx.stroke();
        ctx.restore(); break;
      }
      case "spirochete": {
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        ctx.lineWidth = s * .07; ctx.lineCap = "round"; ctx.strokeStyle = c1;
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let i = 1; i <= 180; i++) { const t = i / 180; ctx.lineTo(Math.cos(t * 30 + x) * s * .11 + t * s * .1, Math.sin(t * 30 + x) * s * .11); }
        ctx.stroke(); ctx.restore(); break;
      }
      case "yeast": {
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        const g = ctx.createRadialGradient(-s * .12, -s * .14, s * .04, 0, 0, s * .62);
        g.addColorStop(0, "#f7fee7"); g.addColorStop(.4, c2 || C.yeast); g.addColorStop(1, c1 || "#4d7c0f");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * .5, s * .38, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(30,40,10,.75)"; ctx.lineWidth = Math.max(.5, s * .07); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.ellipse(s * .12, s * .05, s * .12, s * .09, 0, 0, 7); ctx.fill();
        ctx.restore(); break;
      }
      case "yeast_budding": {
        draw(ctx, "yeast", x, y, s, A, o);
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        const g = ctx.createRadialGradient(s * .3, -s * .28, s * .03, s * .38, -s * .32, s * .34);
        g.addColorStop(0, "#f7fee7"); g.addColorStop(1, c1 || "#4d7c0f");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s * .38, -s * .32, s * .2, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(30,40,10,.7)"; ctx.lineWidth = Math.max(.5, s * .06); ctx.stroke();
        ctx.restore(); break;
      }
      case "hypha": {
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        ctx.lineCap = "round"; ctx.lineWidth = s * .14; ctx.strokeStyle = c1 || C.mold;
        ctx.beginPath(); ctx.moveTo(-s / 2, 0);
        for (let i = 1; i <= 24; i++) { const t = i / 24; ctx.lineTo((t - .5) * s, Math.sin(t * 6) * s * .06); }
        ctx.stroke();
        ctx.lineWidth = Math.max(.4, s * .02); ctx.strokeStyle = "rgba(20,60,30,.6)";
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * s * .2, -s * .07); ctx.lineTo(k * s * .2, s * .07); ctx.stroke(); }
        ctx.restore(); break;
      }
      case "aspergillus": {              // conidiophore: stalk + vesicle + radiating phialides
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        const st = s * .2;
        ctx.strokeStyle = c1 || "#22c55e"; ctx.lineWidth = s * .07; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, s * .5); ctx.lineTo(0, -s * .1); ctx.stroke();
        ctx.fillStyle = c2 || "#65a30d";
        ctx.beginPath(); ctx.arc(0, -s * .16, s * .17, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = Math.max(.4, s * .03); ctx.stroke();
        for (let i = 0; i < 22; i++) {
          const th = -Math.PI + (i / 21) * Math.PI, r1 = s * .19, r2 = s * (1 + (i % 3) * .1) * .3;
          ctx.strokeStyle = c2 || "#65a30d"; ctx.lineWidth = s * .045;
          ctx.beginPath(); ctx.moveTo(Math.cos(th) * r1, -s * .16 + Math.sin(th) * r1);
          ctx.lineTo(Math.cos(th) * r2, -s * .16 + Math.sin(th) * r2); ctx.stroke();
          ctx.fillStyle = "#bef264"; ctx.beginPath(); ctx.arc(Math.cos(th) * (r2 + s * .05), -s * .16 + Math.sin(th) * (r2 + s * .05), s * .055, 0, 7); ctx.fill();
        }
        ctx.restore(); break;
      }
      case "penicillium": {              // brush-like conidiophore
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        ctx.strokeStyle = c1 || "#22c55e"; ctx.lineWidth = s * .07; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, s * .5); ctx.lineTo(0, -s * .12); ctx.stroke();
        for (let b = -1; b <= 1; b++) {
          ctx.beginPath(); ctx.moveTo(0, -s * .12); ctx.lineTo(b * s * .22, -s * .3); ctx.stroke();
          for (let k = 0; k < 4; k++) {
            ctx.fillStyle = "#bef264";
            ctx.beginPath(); ctx.arc(b * s * .22 + b * k * s * .04, -s * .3 - k * s * .085, s * .06, 0, 7); ctx.fill();
          }
        }
        ctx.restore(); break;
      }
      case "ciliate": {                  // protozoan (ciliate) — kidney/oval with cilia
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        const g = ctx.createRadialGradient(-s * .15, -s * .15, s * .05, 0, 0, s * .55);
        g.addColorStop(0, "#e0fbff"); g.addColorStop(.5, c2 || "#67e8f9"); g.addColorStop(1, c1 || "#0e7490");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * .5, s * .32, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(10,60,70,.7)"; ctx.lineWidth = Math.max(.5, s * .04); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = Math.max(.4, s * .02);
        for (let i = 0; i < 40; i++) {
          const th = (i / 40) * Math.PI * 2;
          const px = Math.cos(th) * s * .5, py = Math.sin(th) * s * .32;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px * 1.11, py * 1.2); ctx.stroke();
        }
        ctx.fillStyle = "rgba(20,80,90,.85)"; ctx.beginPath(); ctx.ellipse(0, 0, s * .13, s * .1, 0, 0, 7); ctx.fill();
        ctx.restore(); break;
      }
      case "helminth_egg": {
        const g = ctx.createRadialGradient(x - s * .12, y - s * .12, s * .05, x, y, s * .5);
        g.addColorStop(0, "#fef9c3"); g.addColorStop(.6, "#d9c98a"); g.addColorStop(1, "#7c6a2a");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * .42, s * .5, A, 0, 7); ctx.fill();
        ctx.lineWidth = Math.max(.8, s * .09); ctx.strokeStyle = "#5b4a17"; ctx.stroke();
        ctx.fillStyle = "rgba(120,80,30,.55)"; ctx.beginPath(); ctx.ellipse(x, y, s * .19, s * .26, A, 0, 7); ctx.fill();
        break;
      }
      case "giardia_cyst": {
        const g = ctx.createRadialGradient(x - s * .1, y - s * .12, s * .04, x, y, s * .5);
        g.addColorStop(0, "#ecfeff"); g.addColorStop(.6, "#bae6fd"); g.addColorStop(1, "#0369a1");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * .42, s * .5, A, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(3,55,90,.75)"; ctx.lineWidth = Math.max(.6, s * .06); ctx.stroke();
        ctx.fillStyle = "rgba(12,74,110,.7)";
        ctx.beginPath(); ctx.ellipse(x - s * .1, y - s * .12, s * .07, s * .1, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + s * .1, y - s * .12, s * .07, s * .1, 0, 0, 7); ctx.fill();
        break;
      }
      case "oocyst": {
        ctx.fillStyle = "rgba(224,242,254,.9)"; ctx.beginPath(); ctx.arc(x, y, s * .46, 0, 7); ctx.fill();
        ctx.strokeStyle = "#0c4a6e"; ctx.lineWidth = Math.max(.6, s * .06); ctx.stroke();
        ctx.fillStyle = "rgba(12,74,110,.65)"; ctx.beginPath(); ctx.arc(x, y, s * .26, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(x - s * .1, y - s * .1, s * .09, 0, 7); ctx.fill();
        break;
      }
      /* ----- electron microscope particles (grayscale) ----- */
      case "phage": {
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        const g = ctx.createLinearGradient(0, -s, 0, s); g.addColorStop(0, "#e5e7eb"); g.addColorStop(1, "#6b7280");
        ctx.fillStyle = g; ctx.strokeStyle = "#1f2937"; ctx.lineWidth = Math.max(.5, s * .05);
        ctx.beginPath();
        const r = s * .3;
        for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2 - Math.PI / 2; const px = Math.cos(th) * r, py = -s * .38 + Math.sin(th) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.lineWidth = s * .09; ctx.beginPath(); ctx.moveTo(0, -s * .1); ctx.lineTo(0, s * .35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, s * .32); ctx.lineTo(0, s * .5); ctx.stroke();
        ctx.lineWidth = s * .05;
        [-1, 0, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(0, s * .36); ctx.lineTo(k * s * .34, s * .58); ctx.stroke(); });
        ctx.restore(); break;
      }
      case "norovirus": {                // calicivirus: cup-shaped depressions
        const g = ctx.createRadialGradient(x - s * .15, y - s * .15, s * .05, x, y, s * .55);
        g.addColorStop(0, "#f3f4f6"); g.addColorStop(.75, "#9ca3af"); g.addColorStop(1, "#4b5563");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * .44, 0, 7); ctx.fill();
        ctx.strokeStyle = "#111827"; ctx.lineWidth = Math.max(.5, s * .045); ctx.stroke();
        ctx.fillStyle = "rgba(55,65,81,.65)";
        for (let i = 0; i < 6; i++) {
          const th = i / 6 * Math.PI * 2 + A;
          ctx.beginPath(); ctx.ellipse(x + Math.cos(th) * s * .22, y + Math.sin(th) * s * .22, s * .11, s * .08, th, 0, 7); ctx.fill();
        }
        ctx.fillStyle = "rgba(17,24,39,.6)"; ctx.beginPath(); ctx.ellipse(x, y, s * .12, s * .09, 0, 0, 7); ctx.fill();
        break;
      }
      case "coronavirus": {
        const g = ctx.createRadialGradient(x - s * .12, y - s * .12, s * .05, x, y, s * .5);
        g.addColorStop(0, "#f9fafb"); g.addColorStop(.7, "#9ca3af"); g.addColorStop(1, "#4b5563");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * .34, 0, 7); ctx.fill();
        ctx.strokeStyle = "#111827"; ctx.lineWidth = Math.max(.5, s * .04); ctx.stroke();
        for (let i = 0; i < 18; i++) {
          const th = i / 18 * Math.PI * 2 + A, r1 = s * .34, r2 = s * (i % 2 ? .5 : .58);
          ctx.strokeStyle = "#374151"; ctx.lineWidth = s * .035;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(th) * r1, y + Math.sin(th) * r1);
          ctx.lineTo(x + Math.cos(th) * r2, y + Math.sin(th) * r2); ctx.stroke();
          ctx.fillStyle = "#6b7280"; ctx.beginPath(); ctx.arc(x + Math.cos(th) * r2, y + Math.sin(th) * r2, s * .045, 0, 7); ctx.fill();
        }
        ctx.strokeStyle = "rgba(17,24,39,.45)"; ctx.lineWidth = Math.max(.4, s * .02);
        ctx.beginPath(); ctx.arc(x, y, s * .22, 0, 7); ctx.stroke();
        break;
      }
      case "rotavirus": {                // wheel-like triple-layered
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        const g = ctx.createRadialGradient(-s * .1, -s * .1, s * .04, 0, 0, s * .5);
        g.addColorStop(0, "#f3f4f6"); g.addColorStop(1, "#6b7280");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * .46, 0, 7); ctx.fill();
        ctx.strokeStyle = "#111827"; ctx.lineWidth = Math.max(.6, s * .05); ctx.stroke();
        ctx.strokeStyle = "rgba(17,24,39,.55)"; ctx.lineWidth = Math.max(.4, s * .03);
        ctx.beginPath(); ctx.arc(0, 0, s * .32, 0, 7); ctx.stroke();
        for (let i = 0; i < 16; i++) {
          const th = i / 16 * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(Math.cos(th) * s * .12, Math.sin(th) * s * .12);
          ctx.lineTo(Math.cos(th) * s * .34, Math.sin(th) * s * .34); ctx.stroke();
        }
        ctx.fillStyle = "rgba(31,41,55,.75)"; ctx.beginPath(); ctx.arc(0, 0, s * .12, 0, 7); ctx.fill();
        ctx.restore(); break;
      }
      case "hav": {                      // small icosahedral (Hepatitis A)
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        ctx.fillStyle = "#9ca3af"; ctx.strokeStyle = "#111827"; ctx.lineWidth = Math.max(.5, s * .05);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2 - Math.PI / 2; i ? ctx.lineTo(Math.cos(th) * s * .42, Math.sin(th) * s * .42) : ctx.moveTo(Math.cos(th) * s * .42, Math.sin(th) * s * .42); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.lineWidth = Math.max(.4, s * .028);
        for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(th) * s * .42, Math.sin(th) * s * .42); ctx.stroke(); }
        ctx.restore(); break;
      }
      /* ----- food-matrix artefacts (practice material) ----- */
      case "starch_granule": {
        const g = ctx.createRadialGradient(x - s * .15, y - s * .15, s * .05, x, y, s * .55);
        g.addColorStop(0, "#ffffff"); g.addColorStop(.7, "#cbd5e1"); g.addColorStop(1, "#64748b");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * .48, s * .42, A, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(71,85,105,.9)"; ctx.lineWidth = Math.max(.5, s * .035); ctx.stroke();
        ctx.strokeStyle = "rgba(100,116,139,.7)";
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x, y, s * .48 * i / 4, s * .42 * i / 4, A, 0, 7); ctx.stroke(); }
        break;
      }
      case "fat_globule": {
        const g = ctx.createRadialGradient(x - s * .18, y - s * .2, s * .05, x, y, s * .5);
        g.addColorStop(0, "#fffef0"); g.addColorStop(.6, "#fde68a"); g.addColorStop(1, "#b45309");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * .46, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(120,53,15,.65)"; ctx.lineWidth = Math.max(.6, s * .05); ctx.stroke();
        break;
      }
      case "fiber": {
        ctx.save(); ctx.translate(x, y); ctx.rotate(A);
        ctx.strokeStyle = "rgba(148,163,184,.85)"; ctx.lineCap = "round";
        for (let k = -1; k <= 1; k++) {
          ctx.lineWidth = Math.max(.5, s * .03);
          ctx.beginPath(); ctx.moveTo(-s / 2, k * s * .06);
          ctx.bezierCurveTo(-s * .18, k * s * .06 - s * .1, s * .18, k * s * .06 + s * .1, s / 2, k * s * .05);
          ctx.stroke();
        }
        ctx.restore(); break;
      }
      case "air_bubble": {
        ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = Math.max(1, s * .09);
        ctx.beginPath(); ctx.arc(x, y, s * .46, 0, 7); ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.lineWidth = Math.max(.6, s * .05);
        ctx.beginPath(); ctx.arc(x, y, s * .46, .6, 2.2); ctx.stroke();
        break;
      }
      case "dust": {
        ctx.fillStyle = "rgba(90,100,115,.85)";
        ctx.beginPath(); ctx.ellipse(x, y, s * .38, s * .3, A, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(50,60,70,.7)";
        ctx.beginPath(); ctx.ellipse(x + s * .2, y + s * .1, s * .16, s * .13, A, 0, 7); ctx.fill();
        break;
      }
      default: sphere(ctx, x, y, s, c1, c2);
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------------- SVG */
  const SVG_HEAD = '<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" role="img">';
  function g(id, c1, c2) {
    return '<defs><radialGradient id="' + id + '" cx="35%" cy="30%" r="70%">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset="45%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="' + c1 + '"/></radialGradient></defs>';
  }
  function svg(kind, o) {
    o = o || {};
    const P = o.color || C.gpos, P2 = o.color2 || C.gpos2, GN = o.color2 || C.gneg2, GN1 = o.color || C.gneg;
    let inner = "";
    switch (kind) {
      case "coccus":
        inner = g("cg", P, P2) + '<circle cx="60" cy="50" r="30" fill="url(#cg)" stroke="rgba(0,0,0,.4)"/>'; break;
      case "coccus_cluster": {
        inner = g("cg", P, P2);
        [[42, 36], [66, 30], [80, 48], [50, 58], [72, 66], [36, 62], [58, 22], [86, 70]].forEach(p =>
          inner += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="15" fill="url(#cg)" stroke="rgba(0,0,0,.35)"/>');
        break;
      }
      case "coccus_chain": {
        inner = g("cg", P, P2);
        for (let i = 0; i < 6; i++) inner += '<circle cx="' + (18 + i * 17) + '" cy="' + (50 + Math.sin(i) * 6) + '" r="13" fill="url(#cg)" stroke="rgba(0,0,0,.35)"/>';
        break;
      }
      case "coccus_tetrad": {
        inner = g("cg", P, P2);
        [[46, 38], [72, 38], [46, 64], [72, 64]].forEach(p => inner += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="14" fill="url(#cg)" stroke="rgba(0,0,0,.35)"/>');
        break;
      }
      case "bacillus":
      case "bacillus_chain": {
        inner = g("cg", P, P2);
        const n = kind === "bacillus_chain" ? 3 : 1;
        for (let i = 0; i < n; i++)
          inner += '<rect x="' + (26 + i * 24) + '" y="' + (44 + (i % 2) * 3) + '" width="42" height="17" rx="8.5" fill="url(#cg)" stroke="rgba(0,0,0,.35)"/>';
        if (o.spore) inner += '<ellipse cx="60" cy="52" rx="7" ry="7" fill="#fff" stroke="rgba(0,0,0,.45)"/>';
        break;
      }
      case "bacillus_spore":
        inner = g("cg", P, P2) + '<rect x="22" y="43" width="76" height="18" rx="9" fill="url(#cg)" stroke="rgba(0,0,0,.35)"/>' +
          '<ellipse cx="76" cy="52" rx="9" ry="8" fill="#ffffff" stroke="rgba(0,0,0,.5)"/>' +
          '<text x="60" y="86" font-size="11" text-anchor="middle" fill="#cbd5e1">endospore</text>'; break;
      case "spore":
        inner = '<ellipse cx="60" cy="50" rx="24" ry="18" fill="#f8fafc" stroke="#94a3b8"/>' +
          '<ellipse cx="54" cy="44" rx="8" ry="5" fill="rgba(190,220,255,.7)"/>'; break;
      case "vibrio":
        inner = '<path d="M30 74 Q30 26 74 26" fill="none" stroke="' + P + '" stroke-width="19" stroke-linecap="round"/>' +
          '<path d="M30 74 Q30 26 74 26" fill="none" stroke="' + P2 + '" stroke-width="11" stroke-linecap="round"/>'; break;
      case "spirillum":
        inner = '<path d="M14 50 Q26 22 38 50 T62 50 T86 50 T106 50" fill="none" stroke="' + P + '" stroke-width="11" stroke-linecap="round"/>' +
          '<path d="M14 50 Q26 22 38 50 T62 50 T86 50 T106 50" fill="none" stroke="' + P2 + '" stroke-width="5" stroke-linecap="round"/>'; break;
      case "spirochete": {
        inner = '<path d="M10 50 '; for (let i = 0; i <= 60; i++) { const t = i / 60; inner += "L" + (12 + t * 96) + " " + (50 + Math.sin(t * 22) * 18); } inner += '" fill="none" stroke="' + P + '" stroke-width="5" stroke-linecap="round"/>';
        break;
      }
      case "yeast": case "yeast_budding": {
        inner = g("yg", "#65a30d", C.yeast || "#d9f99d") +
          '<ellipse cx="56" cy="52" rx="27" ry="21" fill="url(#yg)" stroke="rgba(60,60,10,.6)"/>' +
          '<ellipse cx="51" cy="47" rx="9" ry="6" fill="rgba(255,255,255,.55)"/>' +
          (kind === "yeast_budding" ? '<circle cx="84" cy="36" r="12" fill="url(#yg)" stroke="rgba(60,60,10,.6)"/>' : ""); break;
      }
      case "hypha": {
        inner = '<path d="M8 66 Q30 40 60 52 T112 34" fill="none" stroke="#4ade80" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M30 56 v9M56 50 v9M82 41 v9" stroke="rgba(20,60,30,.7)" stroke-width="2"/>';
        break;
      }
      case "aspergillus": {
        inner = '<path d="M60 92 V44" stroke="#22c55e" stroke-width="7" stroke-linecap="round"/>' +
          '<circle cx="60" cy="38" r="13" fill="#65a30d" stroke="rgba(0,0,0,.35)"/>';
        for (let i = 0; i < 15; i++) {
          const th = -Math.PI + (i / 14) * Math.PI;
          const x1 = 60 + Math.cos(th) * 14, y1 = 38 + Math.sin(th) * 14;
          const x2 = 60 + Math.cos(th) * 30, y2 = 38 + Math.sin(th) * 30;
          inner += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#65a30d" stroke-width="3"/>' +
            '<circle cx="' + (x2 + Math.cos(th) * 5) + '" cy="' + (y2 + Math.sin(th) * 5) + '" r="4" fill="#bef264"/>';
        }
        break;
      }
      case "penicillium": {
        inner = '<path d="M60 92 V46" stroke="#22c55e" stroke-width="7" stroke-linecap="round"/>';
        [-1, 0, 1].forEach(b => {
          inner += '<path d="M60 46 L' + (60 + b * 22) + ' 30" stroke="#22c55e" stroke-width="5" stroke-linecap="round"/>';
          for (let k = 0; k < 4; k++) inner += '<circle cx="' + (60 + b * 22 + b * k * 4) + '" cy="' + (26 - k * 8) + '" r="5" fill="#bef264"/>';
        });
        break;
      }
      case "ciliate": {
        inner = g("pg", "#0e7490", "#a5f3fc") + '<ellipse cx="60" cy="52" rx="34" ry="21" fill="url(#pg)" stroke="rgba(10,50,60,.7)"/>' +
          '<ellipse cx="60" cy="52" rx="9" ry="7" fill="rgba(20,80,90,.8)"/>';
        for (let i = 0; i < 34; i++) { const th = (i / 34) * Math.PI * 2; inner += '<line x1="' + (60 + Math.cos(th) * 34) + '" y1="' + (52 + Math.sin(th) * 21) + '" x2="' + (60 + Math.cos(th) * 41) + '" y2="' + (52 + Math.sin(th) * 27) + '" stroke="rgba(255,255,255,.7)" stroke-width="1.6"/>'; }
        break;
      }
      case "helminth_egg": {
        inner = '<ellipse cx="60" cy="50" rx="27" ry="33" fill="#e6d9a2" stroke="#6b5a1e" stroke-width="6"/>' +
          '<ellipse cx="60" cy="50" rx="13" ry="18" fill="rgba(120,80,30,.55)"/>'; break;
      }
      case "giardia_cyst": {
        inner = g("gg", "#0369a1", "#e0f2fe") + '<ellipse cx="60" cy="50" rx="27" ry="32" fill="url(#gg)" stroke="#0c4a6e" stroke-width="4"/>' +
          '<ellipse cx="53" cy="42" rx="5" ry="7" fill="rgba(12,74,110,.75)"/><ellipse cx="67" cy="42" rx="5" ry="7" fill="rgba(12,74,110,.75)"/>'; break;
      }
      case "oocyst":
        inner = g("og", "#0369a1", "#f0f9ff") + '<circle cx="60" cy="50" r="30" fill="url(#og)" stroke="#0c4a6e" stroke-width="4"/>' +
          '<circle cx="60" cy="50" r="17" fill="rgba(12,74,110,.6)"/><circle cx="53" cy="43" r="6" fill="rgba(255,255,255,.85)"/>'; break;
      case "phage": {
        inner = '<g stroke="#1f2937" stroke-width="3" fill="#cbd5e1">' +
          '<polygon points="60,12 76,21 76,39 60,48 44,39 44,21"/>' +
          '<line x1="60" y1="48" x2="60" y2="66"/></g>' +
          '<line x1="60" y1="66" x2="60" y2="78" stroke="#1f2937" stroke-width="3"/>' +
          '<line x1="60" y1="70" x2="44" y2="86" stroke="#1f2937" stroke-width="2.5"/>' +
          '<line x1="60" y1="70" x2="76" y2="86" stroke="#1f2937" stroke-width="2.5"/>' +
          '<line x1="60" y1="70" x2="60" y2="90" stroke="#1f2937" stroke-width="2.5"/>'; break;
      }
      case "norovirus": {
        inner = g("nv", "#4b5563", "#f3f4f6") + '<circle cx="60" cy="50" r="30" fill="url(#nv)" stroke="#111827" stroke-width="3"/>';
        for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2; inner += '<ellipse cx="' + (60 + Math.cos(th) * 15) + '" cy="' + (50 + Math.sin(th) * 15) + '" rx="8" ry="6" transform="rotate(' + (th * 57) + ' ' + (60 + Math.cos(th) * 15) + ' ' + (50 + Math.sin(th) * 15) + ')" fill="rgba(55,65,81,.6)"/>'; }
        inner += '<ellipse cx="60" cy="50" rx="9" ry="7" fill="rgba(17,24,39,.6)"/>'; break;
      }
      case "coronavirus": {
        inner = g("cv", "#4b5563", "#f9fafb") + '<circle cx="60" cy="50" r="24" fill="url(#cv)" stroke="#111827" stroke-width="3"/>';
        for (let i = 0; i < 18; i++) { const th = i / 18 * Math.PI * 2; const x2 = 60 + Math.cos(th) * 42, y2 = 50 + Math.sin(th) * 42;
          inner += '<line x1="' + (60 + Math.cos(th) * 24) + '" y1="' + (50 + Math.sin(th) * 24) + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#374151" stroke-width="3"/><circle cx="' + x2 + '" cy="' + y2 + '" r="4" fill="#6b7280"/>'; }
        break;
      }
      case "rotavirus": {
        inner = g("rv", "#6b7280", "#f3f4f6") + '<circle cx="60" cy="50" r="31" fill="url(#rv)" stroke="#111827" stroke-width="3"/>' +
          '<circle cx="60" cy="50" r="21" fill="none" stroke="rgba(17,24,39,.5)" stroke-width="3"/>' +
          '<circle cx="60" cy="50" r="8" fill="rgba(31,41,55,.8)"/>';
        for (let i = 0; i < 16; i++) { const th = i / 16 * Math.PI * 2; inner += '<line x1="' + (60 + Math.cos(th) * 8) + '" y1="' + (50 + Math.sin(th) * 8) + '" x2="' + (60 + Math.cos(th) * 23) + '" y2="' + (50 + Math.sin(th) * 23) + '" stroke="rgba(17,24,39,.5)" stroke-width="2"/>'; }
        break;
      }
      case "hav": {
        inner = '<polygon points="60,20 86,35 86,65 60,80 34,65 34,35" fill="#9ca3af" stroke="#111827" stroke-width="3"/>';
        for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2 - Math.PI / 2; inner += '<line x1="60" y1="50" x2="' + (60 + Math.cos(th) * 30) + '" y2="' + (50 + Math.sin(th) * 30) + '" stroke="rgba(17,24,39,.6)" stroke-width="2"/>'; }
        break;
      }
      default: inner = g("cg", P, P2) + '<circle cx="60" cy="50" r="28" fill="url(#cg)"/>';
    }
    return SVG_HEAD + inner + "</svg>";
  }

  const Morph = {
    "coccus": "كروي مفرد", "coccus_cluster": "كرويات عنقودية (Staphylococci)", "coccus_chain": "كرويات سبحية (Streptococci)",
    "coccus_tetrad": "كرويات رباعية (Tetrads)", "bacillus": "عصوية مفردة", "bacillus_chain": "عصويات متسلسلة",
    "bacillus_spore": "عصوية حاملة للسبور", "spore": "سبور حر (Endospore)", "vibrio": "عصوية منحنية (Vibrio)",
    "spirillum": "حلزونية (Spirillum)", "spirochete": "لولبية (Spirochete)", "yeast": "خميرة بَيضاوية",
    "yeast_budding": "خميرة متبرعمة", "hypha": "خيط فطري مُحوَّز", "aspergillus": "رأس كونيدي (Aspergillus)",
    "penicillium": "رأس فرشائي (Penicillium)", "ciliate": "هدبيات (Protozoa)", "helminth_egg": "بيضة ديدان",
    "giardia_cyst": "كيسة جيارديا", "oocyst": "بويضة كريبتوسبوريديوم", "phage": "عاثية (Bacteriophage)",
    "norovirus": "نوروفيروس", "coronavirus": "كورونا فيروس", "rotavirus": "روتا فيروس", "hav": "فيروس الكبد الوبائي A",
    "starch_granule": "حبيبة نشأ", "fat_globule": "كرية دهن", "fiber": "ألياف غذائية", "air_bubble": "فقاعة هواء", "dust": "شائبة/غبار"
  };

  W.MB = { draw, svg, C, Morph, KINDS: Object.keys(Morph) };
})(window);
