/* ==========================================================================
   반려동물 사료량 계산기 - 결과 공유 / URL 복원 / 인쇄
   ========================================================================== */

(function () {
  "use strict";

  var PARAM_MAP = {
    species: "species",
    weight: "w",
    ageYears: "ay",
    ageMonths: "am",
    activity: "act",
    neuter: "nt",
    repro: "rp",
    foodType: "ft",
    packKcal: "pk",
    packWeight: "pw",
    cupWeightInput: "cwv",
    cupWeightUnit: "cwu",
    mode: "mode"
  };

  function buildShareURL(state) {
    var url = new URL(window.location.href);
    url.search = "";
    Object.keys(PARAM_MAP).forEach(function (stateKey) {
      var value = state[stateKey];
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(PARAM_MAP[stateKey], value);
      }
    });
    return url.toString();
  }

  function parseStateFromURL() {
    var params = new URLSearchParams(window.location.search);
    if (![].concat.apply([], [Array.from(params.keys())]).length) return null;

    var reverseMap = {};
    Object.keys(PARAM_MAP).forEach(function (stateKey) {
      reverseMap[PARAM_MAP[stateKey]] = stateKey;
    });

    var partial = {};
    var found = false;
    params.forEach(function (value, key) {
      var stateKey = reverseMap[key];
      if (!stateKey) return;
      found = true;
      if (["weight", "ageYears", "ageMonths", "packKcal", "packWeight", "cupWeightInput"].indexOf(stateKey) !== -1) {
        partial[stateKey] = parseFloat(value);
      } else {
        partial[stateKey] = value;
      }
    });

    return found ? partial : null;
  }

  function showToast(message) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(function () {
      toast.classList.remove("show");
    }, 2200);
  }

  function copyShareLink() {
    var state = window.PetCalc.getState();
    var url = buildShareURL(state);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(function () {
          showToast("결과 링크가 복사되었어요!");
        })
        .catch(function () {
          fallbackCopy(url);
        });
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    var temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    try {
      document.execCommand("copy");
      showToast("결과 링크가 복사되었어요!");
    } catch (e) {
      showToast("복사에 실패했어요. 주소창의 URL을 직접 복사해주세요.");
    }
    document.body.removeChild(temp);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var copyBtn = document.getElementById("copy-link-btn");
    if (copyBtn) copyBtn.addEventListener("click", copyShareLink);

    var kakaoBtn = document.getElementById("kakao-share-btn");
    if (kakaoBtn) {
      kakaoBtn.addEventListener("click", function () {
        // TODO: 카카오 SDK(Kakao.Share.sendDefault) 연동 후 실제 공유 기능으로 교체
        showToast("카카오 SDK 연동 후 활성화되는 기능입니다.");
      });
    }

    var printBtn = document.getElementById("print-btn");
    if (printBtn) {
      printBtn.addEventListener("click", function () {
        window.print();
      });
    }
  });

  window.addEventListener("petcalc:ready", function () {
    var partial = parseStateFromURL();
    if (partial && window.PetCalc) {
      window.PetCalc.applyState(partial);
    }
  });
})();
