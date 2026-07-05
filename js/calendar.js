/* GET OUT THERE — ride calendar (vanilla, no deps)
 *
 * Pulls events from the public GOT Google Calendar via the Calendar API v3.
 *
 * SETUP (one time, ~5 min):
 * 1. Make the calendar public:
 *    Google Calendar > Settings > [GOT calendar] > Access permissions
 *    > check "Make available to public" (See all event details).
 * 2. Get an API key:
 *    console.cloud.google.com > create/select project > enable
 *    "Google Calendar API" > Credentials > Create credentials > API key.
 *    Restrict the key: Application restrictions = Websites
 *    (add https://www.getoutthereuae.com/*), API restrictions = Calendar API.
 * 3. Paste the key into API_KEY below.
 */
(function () {
  'use strict';

  var CONFIG = {
    CALENDAR_ID: 'c_a56ec7babe6891855614c1765a9d14f9ff8a638f5ca0fe51f9cf3586ea7690a0@group.calendar.google.com',
    API_KEY: 'AIzaSyB-n4b6221JDZw4SfJCTGlDULIMPQ45VOg',
    TZ: 'Asia/Dubai',
    TZ_OFFSET: '+04:00'
  };

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DOWS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  var grid = document.getElementById('calGrid');
  var title = document.getElementById('calTitle');
  var panelTitle = document.getElementById('panelTitle');
  var panelList = document.getElementById('panelList');
  if (!grid) return;

  /* today in Dubai */
  var parts = new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
  var TODAY = { y: +parts[0], m: +parts[1] - 1, d: +parts[2] };
  var todayKey = key(TODAY.y, TODAY.m, TODAY.d);

  var view = { y: TODAY.y, m: TODAY.m };
  var cache = {};          /* 'y-m' -> { byDay: {key:[ev]}, list: [ev] } */
  var selectedKey = null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }

  function fetchMonth(y, m, cb) {
    var ck = y + '-' + m;
    if (cache[ck]) return cb(cache[ck]);
    if (!CONFIG.API_KEY) return cb(null);
    var timeMin = y + '-' + pad(m + 1) + '-01T00:00:00' + CONFIG.TZ_OFFSET;
    var ny = m === 11 ? y + 1 : y, nm = m === 11 ? 0 : m + 1;
    var timeMax = ny + '-' + pad(nm + 1) + '-01T00:00:00' + CONFIG.TZ_OFFSET;
    var url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(CONFIG.CALENDAR_ID) +
      '/events?key=' + CONFIG.API_KEY +
      '&singleEvents=true&orderBy=startTime&maxResults=250' +
      '&timeZone=' + encodeURIComponent(CONFIG.TZ) +
      '&timeMin=' + encodeURIComponent(timeMin) +
      '&timeMax=' + encodeURIComponent(timeMax);
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var month = { byDay: {}, list: [] };
        (data.items || []).forEach(function (item) {
          if (item.status === 'cancelled') return;
          var ev = normalize(item);
          if (!ev) return;
          month.list.push(ev);
          ev.dayKeys.forEach(function (k) {
            (month.byDay[k] = month.byDay[k] || []).push(ev);
          });
        });
        cache[ck] = month;
        cb(month);
      })
      .catch(function () { cb(null); });
  }

  function normalize(item) {
    var allDay = !!(item.start && item.start.date);
    var startStr = allDay ? item.start.date : (item.start && item.start.dateTime);
    if (!startStr) return null;
    var sd = startStr.slice(0, 10).split('-');
    var y = +sd[0], m = +sd[1] - 1, d = +sd[2];
    var dayKeys = [key(y, m, d)];
    /* all-day events: end.date is exclusive — mark every covered day */
    if (allDay && item.end && item.end.date) {
      var cur = new Date(Date.UTC(y, m, d));
      var end = new Date(item.end.date + 'T00:00:00Z');
      while (true) {
        cur.setUTCDate(cur.getUTCDate() + 1);
        if (cur >= end) break;
        dayKeys.push(key(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate()));
      }
    }
    var time = '';
    if (!allDay) {
      time = new Intl.DateTimeFormat('en-GB', { timeZone: CONFIG.TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(startStr));
    }
    return {
      title: item.summary || 'GOT event',
      day: d, month: m, year: y,
      time: allDay ? 'All day' : time,
      location: item.location ? item.location.split(',')[0] : '',
      dayKeys: dayKeys,
      startKey: key(y, m, d)
    };
  }

  function render() {
    var y = view.y, m = view.m;
    title.innerHTML = MONTHS[m] + ' <span>' + y + '</span>';
    grid.innerHTML = DOWS.map(function (d) { return '<div class="cal__dow">' + d + '</div>'; }).join('');

    fetchMonth(y, m, function (month) {
      var first = new Date(y, m, 1);
      var lead = (first.getDay() + 6) % 7;               /* Monday start */
      var days = new Date(y, m + 1, 0).getDate();
      var prevDays = new Date(y, m, 0).getDate();
      var cells = Math.ceil((lead + days) / 7) * 7;
      var html = '';

      for (var i = 0; i < cells; i++) {
        var d = i - lead + 1;
        if (d < 1) {
          html += '<div class="cal__day is-out">' + (prevDays + d) + '</div>';
        } else if (d > days) {
          html += '<div class="cal__day is-out">' + (d - days) + '</div>';
        } else {
          var k = key(y, m, d);
          var cls = 'cal__day';
          var has = month && month.byDay[k];
          if (k === todayKey) cls += ' is-today';
          if (has) cls += ' has-events';
          if (k === selectedKey) cls += ' is-selected';
          html += '<div class="' + cls + '"' + (has ? ' data-key="' + k + '" role="button" tabindex="0" aria-label="' + has.length + ' event(s)"' : '') + '>' + d + '</div>';
        }
      }
      grid.innerHTML += html;

      grid.querySelectorAll('[data-key]').forEach(function (cell) {
        var go = function () {
          selectedKey = (selectedKey === cell.dataset.key) ? null : cell.dataset.key;
          render();
        };
        cell.addEventListener('click', go);
        cell.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });

      renderPanel(month);
    });
  }

  function renderPanel(month) {
    if (!month) {
      panelTitle.textContent = 'Upcoming';
      panelList.innerHTML = '<p class="cal-note">Live schedule is syncing. For now, the full ride calendar is on the app.</p>';
      return;
    }
    var evs, label;
    if (selectedKey && month.byDay[selectedKey]) {
      evs = month.byDay[selectedKey];
      var p = selectedKey.split('-');
      label = +p[2] + ' ' + MONTHS[+p[1] - 1];
    } else {
      selectedKey = null;
      evs = month.list.filter(function (ev) { return ev.startKey >= todayKey; });
      label = 'Upcoming · ' + MONTHS[view.m];
      if (!evs.length) evs = month.list; /* past month: show what happened */
    }
    panelTitle.textContent = label;
    if (!evs.length) {
      panelList.innerHTML = '<p class="cal-note">Nothing scheduled this month yet. New rides drop on the app first.</p>';
      return;
    }
    panelList.innerHTML = evs.map(function (ev) {
      return '<div class="evt">' +
        '<div class="evt__date"><b>' + ev.day + '</b><span>' + MONTHS[ev.month].slice(0, 3) + '</span></div>' +
        '<div class="evt__body"><h4>' + esc(ev.title) + '</h4><p>' + ev.time + (ev.location ? ' &middot; ' + esc(ev.location) : '') + '</p></div>' +
        '</div>';
    }).join('');
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  document.getElementById('calPrev').addEventListener('click', function () {
    view.m--; if (view.m < 0) { view.m = 11; view.y--; }
    selectedKey = null; render();
  });
  document.getElementById('calNext').addEventListener('click', function () {
    view.m++; if (view.m > 11) { view.m = 0; view.y++; }
    selectedKey = null; render();
  });

  render();
})();
