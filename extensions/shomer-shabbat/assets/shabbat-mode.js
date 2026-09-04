(function () {
  var configEl = document.getElementById("shomer-shabbat-config");
  if (!configEl) return;

  var statusUrl =
    configEl.getAttribute("data-status-url") || "/apps/shomer-shabbat/status";
  var forcePreview = configEl.getAttribute("data-force") === "true";
  var showCountdown = configEl.getAttribute("data-show-countdown") !== "false";

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function activate(opensAtISO, isHoliday) {
    document.body.classList.add("shabbat-mode");

    var bar = document.getElementById("shabbat-announcement-bar");
    if (bar) {
      bar.hidden = false;
    }

    if (isHoliday) {
      document.querySelectorAll("[data-shabbat-text]").forEach(function (el) {
        el.hidden = true;
      });
      document.querySelectorAll("[data-holiday-text]").forEach(function (el) {
        el.hidden = false;
      });
    } else {
      document.querySelectorAll("[data-holiday-text]").forEach(function (el) {
        el.hidden = true;
      });
      document.querySelectorAll("[data-shabbat-text]").forEach(function (el) {
        el.hidden = false;
      });
    }

    var countdownWrap = document.getElementById("shabbat-countdown-wrap");
    if (countdownWrap) {
      countdownWrap.hidden = true;
    }

    if (showCountdown && opensAtISO && countdownWrap) {
      countdownWrap.hidden = false;
      var target = new Date(opensAtISO).getTime();
      if (!isNaN(target)) {
        var d = document.getElementById("shabbat-cd-days");
        var h = document.getElementById("shabbat-cd-hours");
        var m = document.getElementById("shabbat-cd-mins");
        var s = document.getElementById("shabbat-cd-secs");
        (function tick() {
          var diff = Math.max(0, target - Date.now());
          var sec = Math.floor(diff / 1000);
          var dd = Math.floor(sec / 86400);
          sec -= dd * 86400;
          var hh = Math.floor(sec / 3600);
          sec -= hh * 3600;
          var mm = Math.floor(sec / 60);
          sec -= mm * 60;
          if (d) d.textContent = pad(dd);
          if (h) h.textContent = pad(hh);
          if (m) m.textContent = pad(mm);
          if (s) s.textContent = pad(sec);
          if (diff > 0) setTimeout(tick, 1000);
          else window.location.reload();
        })();
      }
    }

    document.querySelectorAll('[name="checkout"]').forEach(function (btn) {
      if (!btn.parentNode.querySelector(".shabbat-checkout-message")) {
        var msg = document.createElement("div");
        msg.className = "shabbat-checkout-message";
        msg.textContent = "החנות סגורה";
        btn.parentNode.insertBefore(msg, btn.nextSibling);
      }
    });

    var hide = function () {
      document
        .querySelectorAll(
          ".shopify-payment-button, .shopify-payment-button__button, " +
            ".additional-checkout-buttons, .product-card__buy-now-button, " +
            ".product-card__quick-add-button",
        )
        .forEach(function (el) {
          el.style.setProperty("display", "none", "important");
        });
    };
    hide();
    new MutationObserver(hide).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function previewOpensAt(data) {
    if (data.opensAt) return data.opensAt;
    if (data.nextOpensAt) return data.nextOpensAt;
    return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }

  function run() {
    fetch(statusUrl, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("status " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (forcePreview) {
          if (data.ok && data.isClosed) {
            activate(data.opensAt, data.isHoliday);
          } else {
            activate(previewOpensAt(data), Boolean(data.isHoliday));
          }
          return;
        }

        if (data.ok && data.isClosed) {
          activate(data.opensAt, data.isHoliday);
        }
      })
      .catch(function () {
        if (forcePreview) {
          activate(previewOpensAt({}), false);
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
