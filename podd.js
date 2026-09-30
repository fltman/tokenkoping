// Veckobladets podd: grammofonen är spelknappen. Webbupplagans enda skript,
// och bara på sidor med en spelare. Utan skript står ljudspelaren kvar med
// webbläsarens egna reglage. Se DESIGN.md, ”Podden”.
(function () {
  'use strict';
  const minSek = (t) => {
    t = Math.max(0, Math.floor(t || 0));
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  };

  document.querySelectorAll('.podd').forEach((modul) => {
    const knapp = modul.querySelector('.grammofon');
    const ljud = modul.querySelector('.podd-ljud');
    const reglage = modul.querySelector('.podd-reglage');
    const nu = modul.querySelector('.podd-nu');
    const helLangd = modul.querySelector('.podd-langd');
    const linje = modul.querySelector('.podd-linje');
    const fyllt = modul.querySelector('.podd-fyllt');
    if (!knapp || !ljud || !linje) return;

    // Skriptet tar över: egna reglage i stället för webbläsarens.
    ljud.controls = false;
    ljud.hidden = true;
    reglage.hidden = false;
    knapp.disabled = false;

    let langd = Number(modul.dataset.langd) || 0;
    let vantande = null; // ett läge valt innan ljudet laddats

    const tid = () => (vantande !== null ? vantande : ljud.currentTime);
    function visa() {
      const t = Math.min(tid(), langd || Infinity);
      nu.textContent = minSek(t);
      helLangd.textContent = minSek(langd);
      fyllt.style.width = langd ? (t / langd) * 100 + '%' : '0';
      linje.setAttribute('aria-valuemax', String(Math.round(langd)));
      linje.setAttribute('aria-valuenow', String(Math.round(t)));
      linje.setAttribute('aria-valuetext', minSek(t) + ' av ' + minSek(langd));
    }

    function ga(t) {
      t = Math.max(0, Math.min(t, langd || 0));
      if (ljud.readyState >= 1) {
        ljud.currentTime = t;
        vantande = null;
      } else {
        vantande = t;
      }
      visa();
    }

    function spelar(ja) {
      modul.classList.toggle('spelar', ja);
      knapp.setAttribute('aria-label', ja ? knapp.dataset.pausa : knapp.dataset.spela);
    }

    knapp.addEventListener('click', () => {
      if (ljud.paused) ljud.play().catch(() => spelar(false));
      else ljud.pause();
    });
    ljud.addEventListener('play', () => spelar(true));
    ljud.addEventListener('pause', () => spelar(false));
    ljud.addEventListener('ended', () => spelar(false));
    ljud.addEventListener('timeupdate', visa);
    ljud.addEventListener('loadedmetadata', () => {
      if (isFinite(ljud.duration) && ljud.duration > 0) langd = ljud.duration;
      if (vantande !== null) {
        ljud.currentTime = vantande;
        vantande = null;
      }
      visa();
    });

    // Förloppslinjen: klicka, dra, eller pilar ±10 s.
    const lageVid = (x) => {
      const r = linje.getBoundingClientRect();
      return (Math.max(0, Math.min(1, (x - r.left) / r.width))) * langd;
    };
    linje.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      linje.setPointerCapture(e.pointerId);
      linje.classList.add('drar');
      ga(lageVid(e.clientX));
      e.preventDefault();
    });
    linje.addEventListener('pointermove', (e) => {
      if (linje.hasPointerCapture(e.pointerId)) ga(lageVid(e.clientX));
    });
    const slapp = () => linje.classList.remove('drar');
    linje.addEventListener('pointerup', slapp);
    linje.addEventListener('pointercancel', slapp);
    linje.addEventListener('keydown', (e) => {
      const steg = { ArrowLeft: -10, ArrowDown: -10, ArrowRight: 10, ArrowUp: 10, PageDown: -60, PageUp: 60 }[e.key];
      if (steg !== undefined) ga(tid() + steg);
      else if (e.key === 'Home') ga(0);
      else if (e.key === 'End') ga(langd);
      else return;
      e.preventDefault();
    });

    visa();
  });
})();
