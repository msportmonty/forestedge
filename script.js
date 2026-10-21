(() => {
  document.documentElement.classList.remove("no-js");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nav: scrolled state + mobile menu
  const nav = $(".nav");
  const toggle = $(".nav__toggle");
  const links = $("#nav-links");
  const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 20);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const setMenu = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // Count-up stats
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const fmt = (v) => v.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (reduceMotion) { el.textContent = fmt(target); return; }
    // Lock the width to the final value so the unit beside it doesn't shift while counting
    // (digits aren't equal width in this face, so reserve room for the widest)
    const final = fmt(target);
    const widths = [..."0123456789"].map((d) => {
      el.textContent = final.replace(/\d/g, d);
      return el.getBoundingClientRect().width;
    });
    el.style.width = `${Math.ceil(Math.max(...widths))}px`;
    el.textContent = fmt(0);
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      el.textContent = fmt(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Scroll reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      $$("[data-count]", entry.target).forEach(countUp);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 80}ms`;
    io.observe(el);
  });

  // Circuit sectors
  const track = $(".track");
  $$("#sectors li").forEach((li) => {
    const path = $(`.track__sector.s${li.dataset.sector}`);
    const on = () => { track.classList.add("has-focus"); path.classList.add("is-active"); li.classList.add("is-active"); };
    const off = () => { track.classList.remove("has-focus"); path.classList.remove("is-active"); li.classList.remove("is-active"); };
    li.tabIndex = 0;
    li.addEventListener("mouseenter", on);
    li.addEventListener("mouseleave", off);
    li.addEventListener("focus", on);
    li.addEventListener("blur", off);
  });

  // Fleet switcher
  const karts = {
    cadet: { name: "Cadet 120", num: "08", color: "#b5612f", engine: "120cc 4-stroke", power: "4 hp", speed: "55 km/h", age: "8 – 12",
      desc: "Lightweight and forgiving — the perfect first step for younger drivers in the Junior Academy." },
    sport: { name: "Sport 270", num: "27", color: "#5e8f4e", engine: "270cc 4-stroke", power: "9 hp", speed: "75 km/h", age: "12+",
      desc: "Our arrive-and-drive workhorse. Punchy, predictable and matched to within a tenth across the fleet." },
    pro: { name: "Pro 390", num: "01", color: "#1f3d2b", engine: "390cc 4-stroke", power: "13 hp", speed: "98 km/h", age: "16+ / licensed",
      desc: "Sharp, stiff and seriously quick. Reserved for championship classes and experienced drivers." },
  };
  const panel = $("#kart-panel");
  const info = $(".kart__info", panel);
  const fill = (k) => {
    $("#kart-name").textContent = k.name;
    $("#kart-desc").textContent = k.desc;
    $("#kart-engine").textContent = k.engine;
    $("#kart-power").textContent = k.power;
    $("#kart-speed").textContent = k.speed;
    $("#kart-age").textContent = k.age;
    $("#kart-num").textContent = k.num;
  };
  // Reserve the tallest kart's height so switching classes never moves the page.
  // All three are measured within one frame, so nothing flashes on screen.
  let current = karts.cadet;
  const reserve = () => {
    info.style.minHeight = "";
    const tallest = Math.max(...Object.values(karts).map((k) => { fill(k); return info.offsetHeight; }));
    fill(current);
    info.style.minHeight = `${tallest}px`;
  };
  reserve();
  let resizeTimer;
  addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(reserve, 150); });
  document.fonts?.ready.then(reserve);
  $$(".fleet button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = karts[btn.dataset.kart];
      $$(".fleet button").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      panel.classList.remove("is-switching");
      void panel.offsetWidth;
      panel.classList.add("is-switching");
      current = k;
      setTimeout(() => {
        fill(k);
        panel.style.setProperty("--kart-color", k.color);
      }, reduceMotion ? 0 : 280);
    });
  });
  panel.style.setProperty("--kart-color", karts.cadet.color);

  // Leaderboard (sample data)
  const laps = [
    ["M. Carter", "Pro", 47.382], ["J. Okafor", "Pro", 47.519], ["S. Lindqvist", "Pro", 47.604],
    ["R. Patel", "Sport", 49.211], ["A. Moreno", "Pro", 47.918], ["E. Walsh", "Sport", 49.340],
    ["T. Nakamura", "Sport", 49.587], ["L. Byrne", "Cadet", 54.102], ["O. Hughes", "Sport", 49.902],
    ["K. Mensah", "Cadet", 54.388], ["I. Rossi", "Cadet", 54.771], ["D. Fraser", "Pro", 48.155],
  ];
  const body = $("#board-body");
  const render = (filter) => {
    const rows = laps.filter(([, c]) => filter === "all" || c === filter).sort((a, b) => a[2] - b[2]).slice(0, 10);
    const best = rows[0]?.[2] ?? 0;
    body.innerHTML = rows.map(([name, cls, t], i) => `
      <tr style="animation-delay:${i * 40}ms">
        <td class="pos pos--${i + 1}">${String(i + 1).padStart(2, "0")}</td>
        <td class="driver">${name}</td>
        <td><span class="cls cls--${cls}">${cls}</span></td>
        <td class="lap">${t.toFixed(3)}</td>
        <td class="gap">${i === 0 ? "—" : "+" + (t - best).toFixed(3)}</td>
      </tr>`).join("");
  };
  $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
    $$(".chip").forEach((c) => {
      c.classList.toggle("is-active", c === chip);
      c.setAttribute("aria-pressed", String(c === chip));
    });
    render(chip.dataset.filter);
  }));
  render("all");

  // Pricing buttons preselect package
  $$("[data-package]").forEach((a) => a.addEventListener("click", () => { $("#package").value = a.dataset.package; }));

  // Booking form
  const form = $("#book-form");
  const status = $(".form__status", form);
  const dateInput = form.elements.date;
  dateInput.min = new Date().toISOString().split("T")[0];
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    $$("input[required]", form).forEach((input) => {
      const valid = input.checkValidity();
      input.classList.toggle("is-invalid", !valid);
      input.setAttribute("aria-invalid", String(!valid));
      ok = ok && valid;
    });
    status.classList.toggle("is-error", !ok);
    if (!ok) { status.textContent = "Please check the highlighted fields."; return; }
    const name = form.elements.name.value.trim().split(" ")[0];
    status.textContent = `Thanks ${name}! Your ${form.elements.package.value} request is on the grid — we'll be in touch shortly.`;
    form.reset();
  });

  $("#year").textContent = new Date().getFullYear();
})();
