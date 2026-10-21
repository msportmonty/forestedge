/* Forest Edge Kart Club — site behaviour
   No dependencies. Everything degrades to a working page without JS. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EVENTS = window.FEKC_EVENTS || [];

  /* ------------------------------------------------------------ cancelled */
  /* Dates the club has called off since the last rebuild, from notice.json.
     One edit has to reach everything: the banner, the calendar, the pit board
     and the live badge. A site that says "Round 6 is off" in a banner while
     the calendar underneath still lists it is worse than one that says
     nothing, because the visitor now has to decide which half to believe. */
  var cancelled = {};        // iso -> reason (may be '')

  function isOff(ev) {
    return ev.off || Object.prototype.hasOwnProperty.call(cancelled, ev.iso);
  }

  function readCancellations(list) {
    var out = {};
    if (!list || !list.length) return out;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      // forgiving on purpose: this file gets edited on a phone, in a hurry,
      // by someone standing in a wet field
      if (typeof c === 'string') out[c.trim()] = '';
      else if (c && c.date) out[String(c.date).trim()] = c.reason || '';
    }
    return out;
  }

  function eventFor(iso) {
    for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].iso === iso) return EVENTS[i];
    return null;
  }

  /* -------------------------------------------------------------- notice */
  /* data/notice.json is the one file someone can edit from a phone when a
     meeting is called off. Absent, empty or active:false means no banner, so
     it costs nothing for the rest of the year. */
  var notice = document.querySelector('[data-notice]');

  function autoNoticeText(isos) {
    /* The club listed cancellations but did not write a banner. Write one for
       them rather than leave the strike-through on the calendar as the only
       hint, which nobody reads on a page they did not open. */
    var named = [];
    for (var i = 0; i < isos.length; i++) {
      var ev = eventFor(isos[i]);
      if (ev) named.push({ ev: ev, reason: cancelled[isos[i]] });
    }
    if (!named.length) return null;

    if (named.length === 1) {
      var one = named[0];
      return {
        title: one.ev.name + ' on ' + one.ev.long + ' is cancelled.',
        message: one.reason || 'Contact the Competition Secretary if you have already entered.'
      };
    }
    var parts = named.map(function (n) {
      var s = n.ev.name + ' (' + n.ev.long + ')';
      return n.reason ? s + ' — ' + n.reason : s;
    });
    return {
      title: named.length + ' dates are cancelled.',
      message: parts.join('. ') + '.'
    };
  }

  function showNotice(n) {
    if (!notice) return;
    var isos = Object.keys(cancelled);
    var title = (n && n.active && n.message) ? (n.title || '') : null;
    var message = (n && n.active && n.message) ? n.message : null;
    var level = (n && n.level) || 'info';

    if (message === null && isos.length) {
      // a round called off is red, not amber. Amber is for a change of plan;
      // this is "do not load the trailer". Writing a banner by hand still
      // wins, so a club that wants a softer wording just uses active:true.
      var auto = autoNoticeText(isos);
      if (auto) { title = auto.title; message = auto.message; level = 'urgent'; }
    }
    if (message === null) return;

    notice.querySelector('[data-notice-title]').textContent = title || '';
    notice.querySelector('[data-notice-body]').textContent = message;
    notice.setAttribute('data-level', level);
    notice.hidden = false;
  }

  /* ---------------------------------------------------------------- menu */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');

  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('menu-open'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenu(false);
        burger.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900) setMenu(false);
    });
  }

  /* --------------------------------------------------- desktop dropdowns */
  /* Disclosures, not a role="menu" menubar. These are links to pages, so Tab
     to move, Enter to follow and Escape to close is what someone expects, and
     it is what a screen reader announces without being told a story about
     menus. The CSS opens them on hover and focus by itself; once the script is
     running it takes the open state over, because otherwise Escape cannot
     close a panel the pointer is still resting on. */
  var navItems = [].slice.call(document.querySelectorAll('.nav__i'));

  function navSet(item, open) {
    var b = item.querySelector('.nav__t');
    if (open) item.setAttribute('data-open', '');
    else item.removeAttribute('data-open');
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function navCloseAll(except) {
    navItems.forEach(function (i) { if (i !== except) navSet(i, false); });
  }

  navItems.forEach(function (item) {
    var btn = item.querySelector('.nav__t');
    if (!btn) return;
    // set when Escape closed a panel the pointer or the focus is still in, so
    // it does not spring straight back open
    var dismissed = false;
    // The events land in the order pointerdown, focus, focusin, click. By the
    // time click runs, focusin has already opened the panel, so a naive
    // toggle reads "open" and shuts it again - on a touchscreen the panel
    // appears and vanishes under the finger. Record the state before focus
    // gets a say, and toggle from that.
    var openedBeforePress = null;

    btn.addEventListener('pointerdown', function () {
      openedBeforePress = item.hasAttribute('data-open');
    });

    btn.addEventListener('click', function () {
      var open = openedBeforePress === null
        ? item.hasAttribute('data-open')     // keyboard: no pointerdown fired
        : openedBeforePress;
      openedBeforePress = null;
      navCloseAll(item);
      dismissed = open;
      navSet(item, !open);
    });

    item.addEventListener('mouseenter', function () {
      dismissed = false;
      navCloseAll(item);
      navSet(item, true);
    });
    item.addEventListener('mouseleave', function () {
      if (!item.contains(document.activeElement)) navSet(item, false);
    });

    item.addEventListener('focusin', function () {
      if (dismissed) return;
      navCloseAll(item);
      navSet(item, true);
    });
    item.addEventListener('focusout', function () {
      // let the browser move focus before deciding whether it left
      setTimeout(function () {
        if (!item.contains(document.activeElement)) {
          dismissed = false;
          navSet(item, false);
        }
      }, 0);
    });

    item.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !item.hasAttribute('data-open')) return;
      dismissed = true;
      navSet(item, false);
      btn.focus();
    });
  });

  if (navItems.length) {
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav__i')) navCloseAll(null);
    });
  }

  /* ----------------------------------------------------------- countdown */
  /* Re-runnable: it is called once with the built-in calendar and again if
     notice.json turns out to have cancelled the meeting it was counting to. */
  var board = document.querySelector('[data-countdown]');
  var cdTimer = null;

  function applyCountdown() {
    if (!board || !EVENTS.length) return;
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }

    var now = new Date();
    var next = null;
    for (var i = 0; i < EVENTS.length; i++) {
      var ev = EVENTS[i];
      if (isOff(ev)) continue;
      var d = new Date(ev.iso + 'T08:00:00');
      // keep an event current until the end of its day
      if (d.getTime() + 14 * 36e5 > now.getTime()) { next = ev; next.date = d; break; }
    }

    var wrap = board.querySelector('[data-cd-wrap]');
    if (!next) {
      // the season is over, or everything left has been called off. The
      // server-rendered fixture stays on the board; the clock does not.
      if (wrap) wrap.hidden = true;
      return;
    }

    board.querySelector('[data-ev-name]').textContent = next.name;
    board.querySelector('[data-ev-date]').textContent = next.long;
    var tag = board.querySelector('[data-ev-tag]');
    if (tag) tag.textContent = next.type;

    var cells = board.querySelectorAll('[data-unit]');
    var tick = function () {
      var ms = next.date - new Date();
      if (ms < 0) ms = 0;
      var s = Math.floor(ms / 1000);
      var v = {
        days: Math.floor(s / 86400),
        hours: Math.floor(s / 3600) % 24,
        mins: Math.floor(s / 60) % 60,
        secs: s % 60
      };
      for (var j = 0; j < cells.length; j++) {
        var u = cells[j].getAttribute('data-unit');
        var n = v[u];
        cells[j].textContent = (u === 'days' ? String(n) : ('0' + n).slice(-2));
      }
    };
    tick();
    cdTimer = setInterval(tick, 1000);
    // the digits only appear once they mean something
    if (wrap) wrap.hidden = false;
  }

  /* ------------------------------------------------------------ live day */
  /* The club races on about 27 days a year. The badge in the header only
     lights up on one of those days, so it never claims to be live when the
     circuit is a field — and never on a day that has been called off. */
  var liveLink = document.querySelector('[data-live]');

  function applyLive() {
    if (!liveLink || !EVENTS.length) return;
    liveLink.classList.remove('live--on');
    liveLink.removeAttribute('title');
    var txt = liveLink.querySelector('[data-live-text]');
    if (txt) txt.textContent = 'Live timing';

    var iso = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4)
      .toISOString().slice(0, 10);
    for (var q = 0; q < EVENTS.length; q++) {
      if (EVENTS[q].iso === iso && !isOff(EVENTS[q])) {
        liveLink.classList.add('live--on');
        if (txt) txt.textContent = 'Live now';
        liveLink.setAttribute('title', EVENTS[q].name + ' — live timing');
        break;
      }
    }
  }

  /* --------------------------------------------------- calendar: mark next */
  var cal = document.querySelector('[data-cal]');

  function applyCalendar() {
    if (!cal) return;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var rows = cal.querySelectorAll('[data-iso]');
    var marked = false;

    for (var k = 0; k < rows.length; k++) {
      var row = rows[k];
      var iso = row.getAttribute('data-iso');
      var t = row.querySelector('.ev__t');

      // stash the row's built state the first time through, so re-running
      // this never stacks "Next up · Next up · Practice"
      if (t && row.__t0 === undefined) row.__t0 = t.innerHTML;
      if (row.__off0 === undefined) row.__off0 = row.classList.contains('ev--off');

      row.classList.remove('ev--past', 'ev--next');
      if (t && row.__t0 !== undefined) t.innerHTML = row.__t0;
      row.classList.toggle('ev--off', row.__off0);

      var off = row.__off0 || Object.prototype.hasOwnProperty.call(cancelled, iso);
      if (off && !row.__off0 && t) {
        // cancelled since the build: say so where the type label was, and
        // keep whatever note the row already carried
        var reason = cancelled[iso];
        var note = t.querySelector('.ev__note');
        t.textContent = reason ? 'Cancelled: ' + reason : 'Cancelled';
        if (note) t.appendChild(note);
        row.classList.add('ev--off');
        var cb = row.querySelector('[data-pick]');
        if (cb) cb.checked = false;
      }

      var rd = new Date(iso + 'T00:00:00');
      if (rd < today) {
        row.classList.add('ev--past');
      } else if (!marked && !off) {
        row.classList.add('ev--next');
        if (t) t.insertBefore(document.createTextNode('Next up · '), t.firstChild);
        marked = true;
      }
    }
  }

  function applyAll() {
    applyCountdown();
    applyLive();
    applyCalendar();
  }

  // Run once against what the build knew, then again if notice.json has
  // anything to add. The pages are server-rendered, so this is only ever
  // sharpening something already on screen.
  applyAll();

  fetch('data/notice.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (n) {
      cancelled = readCancellations(n && n.cancelled);
      if (Object.keys(cancelled).length) applyAll();
      showNotice(n);
    })
    .catch(function () { /* no banner is the correct failure mode */ });

  /* ------------------------------------------------------------ the map */
  /* Nothing is requested from Google until someone asks for the map, so the
     site sets no cookies of its own or anyone else's until then. */
  document.querySelectorAll('[data-map]').forEach(function (box) {
    var btn = box.querySelector('.mapfig__load');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.getAttribute('data-src');
      f.title = 'Google map of Forest Edge Kart Club, Barton Stacey';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.setAttribute('allowfullscreen', '');
      box.textContent = '';
      box.appendChild(f);
      box.setAttribute('data-loaded', 'true');
    });
  });

  /* -------------------------------------------------------- pick dates */
  /* Subscribing to the whole season is right for a regular. Someone doing
     three rounds wants three dates, not twenty-nine. Built in the browser
     from a Blob: no request, so which dates anyone picked never leaves the
     phone, and there is still no form anywhere on the site. */
  var pickbar = document.querySelector('[data-pickbar]');

  if (pickbar && EVENTS.length && window.Blob) {
    var boxes = document.querySelectorAll('[data-pick]');
    var count = pickbar.querySelector('[data-pick-count]');
    var msg = pickbar.querySelector('[data-pick-msg]');
    var go = pickbar.querySelector('[data-pick-go]');
    var hint = document.querySelector('[data-pickhint]');

    var pad = function (n) { return ('0' + n).slice(-2); };

    var esc = function (t) {
      return String(t).replace(/\\/g, '\\\\').replace(/,/g, '\\,')
        .replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
    };

    var stamp = function (d) {
      return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
    };

    var dayAfter = function (iso) {
      var d = new Date(iso + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
    };

    var chosen = function () {
      var out = [];
      for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) out.push(boxes[i].value);
      return out;
    };

    var refresh = function () {
      var n = chosen().length;
      if (count) count.textContent = n;
      if (go) go.disabled = n === 0;
      pickbar.classList.toggle('calpick--live', n > 0);
    };

    var buildIcs = function (isos) {
      var cfg = window.FEKC_ICS || {};
      var now = stamp(new Date());
      var out = ['BEGIN:VCALENDAR', 'VERSION:2.0',
        'PRODID:-//Forest Edge Kart Club//2026 Season//EN',
        'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'X-WR-CALNAME:Forest Edge Kart Club',
        'X-WR-TIMEZONE:Europe/London'];

      for (var i = 0; i < isos.length; i++) {
        var ev = eventFor(isos[i]);
        if (!ev) continue;
        var off = isOff(ev);
        var desc = ev.type + (ev.kind === 'social' ? '' : '. Gates open 07:00, signing-on 08:00');
        out.push('BEGIN:VEVENT',
          // the same UID the season feed uses, so this updates an event
          // someone already has rather than duplicating it
          'UID:fekc-' + ev.iso + '@fekc.co.uk',
          'DTSTAMP:' + now,
          'DTSTART;VALUE=DATE:' + ev.iso.replace(/-/g, ''),
          'DTEND;VALUE=DATE:' + dayAfter(ev.iso),
          'SUMMARY:FEKC ' + esc(ev.name),
          'LOCATION:' + esc(cfg.loc || 'Forest Edge Kart Club'),
          'URL:' + (cfg.url || ''),
          'DESCRIPTION:' + esc(desc),
          'STATUS:' + (off ? 'CANCELLED' : 'CONFIRMED'),
          'SEQUENCE:' + (off ? 1 : 0),
          'TRANSP:TRANSPARENT',
          'END:VEVENT');
      }
      out.push('END:VCALENDAR');
      return out.join('\r\n') + '\r\n';
    };

    pickbar.addEventListener('click', function (e) {
      var set = e.target.closest('[data-pick-set]');
      if (set) {
        var want = set.getAttribute('data-pick-set');
        for (var i = 0; i < boxes.length; i++) {
          var row = boxes[i].closest('[data-kind]');
          var kind = row ? row.getAttribute('data-kind') : '';
          var dead = row && row.classList.contains('ev--off');
          boxes[i].checked = want === 'none' ? false : (kind === want && !dead);
        }
        refresh();
        if (msg) msg.textContent = chosen().length + ' dates selected';
        return;
      }
      if (!e.target.closest('[data-pick-go]')) return;

      var isos = chosen();
      if (!isos.length) return;
      var blob = new Blob([buildIcs(isos)], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = isos.length === 1
        ? 'forest-edge-' + isos[0] + '.ics'
        : 'forest-edge-' + isos.length + '-dates.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      if (msg) msg.textContent = isos.length + ' dates downloaded';
    });

    for (var b = 0; b < boxes.length; b++) boxes[b].addEventListener('change', refresh);

    pickbar.hidden = false;
    if (hint) hint.hidden = false;
    refresh();
  }

  /* ------------------------------------------------------------- circuit */
  document.querySelectorAll('.circuit').forEach(function (fig) {
    // measure each sector, then start the draw-on - doing it in this order
    // means a JS failure leaves the circuit visible rather than blank
    fig.querySelectorAll('.drawable').forEach(function (p) {
      p.style.setProperty('--len', Math.ceil(p.getTotalLength()));
      p.classList.add('draw');
    });
    fig.classList.add('circuit--anim');

    var btns = fig.querySelectorAll('.secbtn');
    var hits = fig.querySelectorAll('.trk-hit');

    function select(s) {
      var same = fig.getAttribute('data-active') === s;
      if (same || !s) { fig.removeAttribute('data-active'); s = null; }
      else fig.setAttribute('data-active', s);
      btns.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-s') === s ? 'true' : 'false');
      });
    }

    btns.forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-s')); });
    });
    hits.forEach(function (h) {
      h.addEventListener('click', function () { select(h.getAttribute('data-s')); });
      h.addEventListener('mouseenter', function () {
        fig.setAttribute('data-active', h.getAttribute('data-s'));
      });
      h.addEventListener('mouseleave', function () {
        // fall back to whatever the buttons have pinned, if anything
        var pinned = fig.querySelector('.secbtn[aria-pressed="true"]');
        if (pinned) fig.setAttribute('data-active', pinned.getAttribute('data-s'));
        else fig.removeAttribute('data-active');
      });
    });
  });

  /* ------------------------------------------------------ offline shell */
  /* The circuit is on MOD ground off the A303 and the signal is poor. The
     pages someone needs while standing there are the ones least likely to
     load. sw.js keeps a copy; notice.json is never served from it. */
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* fine */ });
    });
  }

  /* -------------------------------------------------------------- reveal */
  var rv = document.querySelectorAll('.rv');
  if (!rv.length) return;
  if (reduce || !('IntersectionObserver' in window)) {
    rv.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  rv.forEach(function (el) { io.observe(el); });
})();
