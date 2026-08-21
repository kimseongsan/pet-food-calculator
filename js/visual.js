/* ==========================================================================
   반려동물 사료량 계산기 - 급여량 시각화 (SVG)
   - 건식: 종이컵 실루엣 + 사료 모양 흩뿌림
   - 습식: 숟가락 실루엣
   window.PetCalcVisual.render({foodType, dailyGram, cupWeight, shape}) 호출로 그려진다.
   ========================================================================== */

(function () {
  "use strict";

  var TABLESPOON_ML = 15; // 큰술 1스푼 = 15ml, 물과 밀도가 비슷하다고 가정해 g ≈ ml로 취급

  var CUP_SCATTER_POINTS = [
    [45, 130], [65, 130], [55, 115], [40, 110], [70, 112],
    [50, 95], [62, 97], [75, 90], [38, 90], [58, 80],
    [45, 70], [68, 68], [55, 55], [42, 45], [65, 45], [52, 32]
  ];

  var SPOON_SCATTER_POINTS = [
    [30, 55], [45, 40], [60, 65], [75, 42], [90, 58],
    [40, 62], [70, 30], [55, 50], [25, 45], [80, 50]
  ];

  function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
  }

  /**
   * value를 denom 분모의 분수로 반올림해 {whole, num, den} 형태로 반환한다.
   */
  function toFraction(value, denom) {
    var totalUnits = Math.round(value * denom);
    if (totalUnits < 0) totalUnits = 0;
    var whole = Math.floor(totalUnits / denom);
    var rem = totalUnits % denom;
    var num = rem;
    var den = denom;
    if (num > 0) {
      var g = gcd(num, den);
      num = num / g;
      den = den / g;
    }
    return { whole: whole, num: num, den: den };
  }

  function formatMixedFraction(value, denom, unitLabel) {
    var f = toFraction(value, denom);
    if (f.whole === 0 && f.num === 0) return "0" + unitLabel;
    if (f.num === 0) return f.whole + unitLabel;
    if (f.whole === 0) return f.num + "/" + f.den + unitLabel;
    return f.whole + "과 " + f.num + "/" + f.den + unitLabel;
  }

  function shapeMarkup(shape, cx, cy, size, color) {
    switch (shape) {
      case "star":
        return '<polygon points="' + starPoints(cx, cy, size / 2, size / 4.2, 5) + '" fill="' + color + '"/>';
      case "heart":
        return heartMarkup(cx, cy, size, color);
      case "triangle":
        return (
          '<polygon points="' +
          cx + "," + (cy - size / 1.7) + " " +
          (cx - size / 1.7) + "," + (cy + size / 2.2) + " " +
          (cx + size / 1.7) + "," + (cy + size / 2.2) +
          '" fill="' + color + '"/>'
        );
      case "bar":
        return (
          '<rect x="' + (cx - size * 0.65) + '" y="' + (cy - size * 0.22) +
          '" width="' + size * 1.3 + '" height="' + size * 0.44 +
          '" rx="' + size * 0.2 + '" fill="' + color + '"/>'
        );
      case "circle":
      default:
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + size / 2 + '" fill="' + color + '"/>';
    }
  }

  function starPoints(cx, cy, outerR, innerR, points) {
    var step = Math.PI / points;
    var pts = [];
    for (var i = 0; i < 2 * points; i++) {
      var r = i % 2 === 0 ? outerR : innerR;
      var angle = i * step - Math.PI / 2;
      pts.push((cx + r * Math.cos(angle)).toFixed(1) + "," + (cy + r * Math.sin(angle)).toFixed(1));
    }
    return pts.join(" ");
  }

  function heartMarkup(cx, cy, size, color) {
    var s = size / 2;
    var d =
      "M" + cx + "," + (cy + s * 0.6) +
      " C" + (cx - s * 1.3) + "," + (cy - s * 0.4) + " " + (cx - s * 0.5) + "," + (cy - s * 1.3) + " " + cx + "," + (cy - s * 0.4) +
      " C" + (cx + s * 0.5) + "," + (cy - s * 1.3) + " " + (cx + s * 1.3) + "," + (cy - s * 0.4) + " " + cx + "," + (cy + s * 0.6) +
      " Z";
    return '<path d="' + d + '" fill="' + color + '"/>';
  }

  function buildCupSVG(ratio, shape) {
    var clampedRatio = Math.max(0, Math.min(1, ratio));
    var top = 15, bottom = 145;
    var fillTopY = bottom - clampedRatio * (bottom - top);

    var svg =
      '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="사료 채움 정도를 보여주는 컵 그림">' +
      '<clipPath id="cupClip"><path d="M10,15 L110,15 L90,145 L30,145 Z"/></clipPath>' +
      '<path d="M10,15 L110,15 L90,145 L30,145 Z" fill="#fff7ec" stroke="#e8792f" stroke-width="3"/>' +
      '<ellipse cx="60" cy="15" rx="50" ry="6" fill="#fff" stroke="#e8792f" stroke-width="3"/>' +
      '<g clip-path="url(#cupClip)">' +
      '<rect x="0" y="' + fillTopY + '" width="120" height="' + (bottom - fillTopY) + '" fill="#ffd8ac"/>';

    CUP_SCATTER_POINTS.forEach(function (p) {
      if (p[1] >= fillTopY - 4) {
        svg += shapeMarkup(shape, p[0], p[1], 12, "#e8792f");
      }
    });

    svg += "</g></svg>";
    return svg;
  }

  function buildSpoonSVG(ratio) {
    var clampedRatio = Math.max(0, Math.min(1, ratio));
    var cx = 55, cy = 50, rx = 45, ry = 32;
    var bowlTop = cy - ry, bowlBottom = cy + ry;
    var fillTopY = bowlBottom - clampedRatio * (bowlBottom - bowlTop);

    var svg =
      '<svg viewBox="0 0 170 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="사료 채움 정도를 보여주는 숟가락 그림">' +
      '<clipPath id="spoonClip"><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/></clipPath>' +
      '<rect x="95" y="44" width="70" height="12" rx="6" fill="#fff7ec" stroke="#e8792f" stroke-width="3"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#fff7ec" stroke="#e8792f" stroke-width="3"/>' +
      '<g clip-path="url(#spoonClip)">' +
      '<rect x="0" y="' + fillTopY + '" width="110" height="' + (bowlBottom - fillTopY) + '" fill="#ffd8ac"/>';

    SPOON_SCATTER_POINTS.forEach(function (p) {
      if (p[1] >= fillTopY - 4) {
        svg += shapeMarkup("circle", p[0], p[1], 8, "#e8792f");
      }
    });

    svg += "</g></svg>";
    return svg;
  }

  function render(opts) {
    var container = document.getElementById("visual-svg-wrap");
    var captionEl = document.getElementById("visual-caption");
    var shapePicker = document.getElementById("shape-picker");
    if (!container) return;

    if (opts.foodType === "dry") {
      var cupWeight = opts.cupWeight && opts.cupWeight > 0 ? opts.cupWeight : 90;
      var cups = opts.dailyGram / cupWeight;
      var ratio = cups > 1 ? 1 : cups;
      container.innerHTML = buildCupSVG(ratio, opts.shape || "circle");
      var cupLabel = formatMixedFraction(cups, 4, "컵");
      captionEl.innerHTML =
        "약 " + cupLabel + " (약 " + Math.round(opts.dailyGram) + "g) · 사료 1컵(180ml) ≈ " + cupWeight + "g 기준<br>" +
        "사료 알갱이 크기·브랜드에 따라 부피가 달라질 수 있어요. 정확한 계량은 저울 사용을 권장합니다.<br>" +
        "실제 알갱이 개수가 아닌, 모양과 채움 정도를 보여주는 예시 이미지입니다.";
      if (shapePicker) shapePicker.classList.remove("hidden");
    } else {
      var tbsp = opts.dailyGram / TABLESPOON_ML;
      var ratio2 = tbsp > 1 ? 1 : tbsp;
      container.innerHTML = buildSpoonSVG(ratio2);
      var tbspLabel = formatMixedFraction(tbsp, 2, "큰술");
      captionEl.innerHTML =
        "약 " + tbspLabel + " (약 " + Math.round(opts.dailyGram) + "g)<br>" +
        "실제 질감·양은 사료 브랜드에 따라 다를 수 있어요. 참고용 예시입니다.";
      if (shapePicker) shapePicker.classList.add("hidden");
    }

    document.getElementById("visual-wrap").classList.remove("hidden");
  }

  function onFoodTypeChange() {
    // 사료 종류가 바뀌면 상세 계산을 다시 실행해야 시각화가 갱신되므로 여기서는 별도 처리하지 않는다.
    // (calculator.js의 폼 재제출 시 render()가 다시 호출됨)
  }

  document.addEventListener("DOMContentLoaded", function () {
    var shapeButtons = document.querySelectorAll("[data-shape]");
    shapeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        shapeButtons.forEach(function (b) {
          b.setAttribute("aria-pressed", "false");
        });
        btn.setAttribute("aria-pressed", "true");
        var shape = btn.dataset.shape;
        if (window.PetCalc) window.PetCalc.setShape(shape);

        var state = window.PetCalc ? window.PetCalc.getState() : null;
        if (state && state.foodType === "dry") {
          var container = document.getElementById("visual-svg-wrap");
          if (container && container.innerHTML) {
            var lastGram = parseFloat(document.getElementById("detail-daily-gram").textContent);
            if (lastGram) {
              render({ foodType: "dry", dailyGram: lastGram, cupWeight: state.cupWeight, shape: shape });
            }
          }
        }
      });
    });
  });

  window.PetCalcVisual = {
    render: render,
    onFoodTypeChange: onFoodTypeChange
  };
})();
