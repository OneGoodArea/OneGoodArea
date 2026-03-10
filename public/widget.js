(function () {
  "use strict";

  var API_BASE = "https://www.area-iq.co.uk";
  var WIDGET_SELECTOR = "[data-areaiq-postcode]";

  function getScoreColor(score) {
    if (score >= 70) return "#00ff88";
    if (score >= 40) return "#ffaa00";
    return "#ff3344";
  }

  function getScoreLabel(score) {
    if (score >= 80) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 55) return "Fair";
    if (score >= 40) return "Below avg";
    return "Poor";
  }

  function createStyles(theme) {
    var isDark = theme !== "light";
    return {
      container: [
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        "border-radius:6px",
        "overflow:hidden",
        "border:1px solid " + (isDark ? "#1c1c22" : "#e2e2e8"),
        "background:" + (isDark ? "#09090b" : "#ffffff"),
        "color:" + (isDark ? "#e4e4e8" : "#1a1a2e"),
        "max-width:360px",
        "width:100%",
      ].join(";"),
      header: [
        "display:flex",
        "align-items:center",
        "justify-content:space-between",
        "padding:12px 16px",
        "border-bottom:1px solid " + (isDark ? "#1c1c22" : "#e2e2e8"),
      ].join(";"),
      logo: [
        "font-size:11px",
        "font-weight:700",
        "letter-spacing:0.5px",
        "color:" + (isDark ? "#e4e4e8" : "#1a1a2e"),
      ].join(";"),
      area: [
        "font-size:10px",
        "font-family:monospace",
        "color:" + (isDark ? "#8a8a96" : "#6b6b78"),
      ].join(";"),
      scoreSection: [
        "display:flex",
        "align-items:center",
        "gap:16px",
        "padding:16px",
      ].join(";"),
      scoreRing: [
        "width:64px",
        "height:64px",
        "flex-shrink:0",
        "position:relative",
      ].join(";"),
      scoreText: [
        "position:absolute",
        "inset:0",
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "justify-content:center",
      ].join(";"),
      scoreNumber: [
        "font-size:20px",
        "font-weight:700",
        "font-family:monospace",
        "line-height:1",
      ].join(";"),
      scoreLabel: [
        "font-size:8px",
        "text-transform:uppercase",
        "letter-spacing:0.5px",
        "margin-top:2px",
        "color:" + (isDark ? "#8a8a96" : "#6b6b78"),
      ].join(";"),
      dims: [
        "flex:1",
        "display:grid",
        "grid-template-columns:1fr 1fr",
        "gap:6px 12px",
      ].join(";"),
      dimRow: [
        "display:flex",
        "align-items:center",
        "justify-content:space-between",
        "gap:6px",
      ].join(";"),
      dimLabel: [
        "font-size:10px",
        "color:" + (isDark ? "#8a8a96" : "#6b6b78"),
        "white-space:nowrap",
        "overflow:hidden",
        "text-overflow:ellipsis",
      ].join(";"),
      dimScore: [
        "font-size:11px",
        "font-weight:600",
        "font-family:monospace",
      ].join(";"),
      footer: [
        "display:flex",
        "align-items:center",
        "justify-content:space-between",
        "padding:8px 16px",
        "border-top:1px solid " + (isDark ? "#1c1c22" : "#e2e2e8"),
      ].join(";"),
      footerLink: [
        "font-size:9px",
        "color:" + (isDark ? "#5a5a66" : "#8a8a96"),
        "text-decoration:none",
        "display:flex",
        "align-items:center",
        "gap:4px",
      ].join(";"),
      viewReport: [
        "font-size:9px",
        "font-weight:600",
        "color:#00ff88",
        "text-decoration:none",
      ].join(";"),
      loading: [
        "padding:32px 16px",
        "text-align:center",
        "font-size:11px",
        "font-family:monospace",
        "color:" + (isDark ? "#5a5a66" : "#8a8a96"),
      ].join(";"),
      error: [
        "padding:24px 16px",
        "text-align:center",
        "font-size:11px",
        "color:" + (isDark ? "#ff3344" : "#dc2626"),
      ].join(";"),
    };
  }

  function createSVGRing(score, color, size) {
    var r = (size - 6) / 2;
    var c = size / 2;
    var circumference = 2 * Math.PI * r;
    var offset = circumference * (1 - score / 100);

    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-opacity="0.1" stroke-width="3"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="3" ' +
      'stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" ' +
      'stroke-linecap="round" transform="rotate(-90 ' + c + " " + c + ')"/>' +
      "</svg>"
    );
  }

  function renderWidget(el, data, theme) {
    var s = createStyles(theme);
    var scoreColor = getScoreColor(data.score);
    var scoreLabel = getScoreLabel(data.score);

    var dimsHTML = "";
    var dims = data.dimensions || [];
    for (var i = 0; i < dims.length && i < 6; i++) {
      var d = dims[i];
      var dColor = getScoreColor(d.score);
      dimsHTML +=
        '<div style="' + s.dimRow + '">' +
        '<span style="' + s.dimLabel + '">' + d.label + "</span>" +
        '<span style="' + s.dimScore + ";color:" + dColor + '">' + d.score + "</span>" +
        "</div>";
    }

    var reportUrl = API_BASE + "/?utm_source=widget&utm_medium=embed&utm_campaign=" + encodeURIComponent(data.postcode);

    el.innerHTML =
      '<div style="' + s.container + '">' +
      '<div style="' + s.header + '">' +
      '<span style="' + s.logo + '">AreaIQ</span>' +
      '<span style="' + s.area + '">' + (data.area || data.postcode) + (data.area_type ? " \u00b7 " + data.area_type : "") + "</span>" +
      "</div>" +
      '<div style="' + s.scoreSection + '">' +
      '<div style="' + s.scoreRing + '">' +
      createSVGRing(data.score, scoreColor, 64) +
      '<div style="' + s.scoreText + '">' +
      '<span style="' + s.scoreNumber + ";color:" + scoreColor + '">' + data.score + "</span>" +
      '<span style="' + s.scoreLabel + '">' + scoreLabel + "</span>" +
      "</div>" +
      "</div>" +
      '<div style="' + s.dims + '">' + dimsHTML + "</div>" +
      "</div>" +
      '<div style="' + s.footer + '">' +
      '<a href="' + API_BASE + '?utm_source=widget" target="_blank" rel="noopener" style="' + s.footerLink + '">Powered by AreaIQ</a>' +
      '<a href="' + reportUrl + '" target="_blank" rel="noopener" style="' + s.viewReport + '">View full report \u2192</a>' +
      "</div>" +
      "</div>";
  }

  function renderLoading(el, theme) {
    var s = createStyles(theme);
    el.innerHTML =
      '<div style="' + s.container + '">' +
      '<div style="' + s.loading + '">Loading area intelligence...</div>' +
      "</div>";
  }

  function renderError(el, msg, theme) {
    var s = createStyles(theme);
    el.innerHTML =
      '<div style="' + s.container + '">' +
      '<div style="' + s.error + '">' + (msg || "Failed to load area data") + "</div>" +
      "</div>";
  }

  function initWidget(el) {
    var postcode = el.getAttribute("data-areaiq-postcode");
    var intent = el.getAttribute("data-areaiq-intent") || "moving";
    var theme = el.getAttribute("data-areaiq-theme") || "dark";

    if (!postcode) {
      renderError(el, "Missing data-areaiq-postcode attribute", theme);
      return;
    }

    renderLoading(el, theme);

    var url = API_BASE + "/api/widget?postcode=" + encodeURIComponent(postcode) + "&intent=" + encodeURIComponent(intent);

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          renderWidget(el, data, theme);
        } catch (e) {
          renderError(el, "Invalid response", theme);
        }
      } else {
        try {
          var err = JSON.parse(xhr.responseText);
          renderError(el, err.error || "Request failed", theme);
        } catch (e) {
          renderError(el, "Request failed (" + xhr.status + ")", theme);
        }
      }
    };
    xhr.onerror = function () {
      renderError(el, "Network error", theme);
    };
    xhr.send();
  }

  function init() {
    var widgets = document.querySelectorAll(WIDGET_SELECTOR);
    for (var i = 0; i < widgets.length; i++) {
      initWidget(widgets[i]);
    }
  }

  // Run on DOM ready or immediately if already loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
