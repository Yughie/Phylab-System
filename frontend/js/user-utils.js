// ===== UTILITY FUNCTIONS FOR USER PAGE =====

/**
 * Generate a short, unique request ID
 */
export function generateShortId() {
  const t = Date.now().toString(36).slice(-4);
  const r = Math.random().toString(36).slice(2, 5);
  return ("R" + (t + r)).toUpperCase();
}

/**
 * Show a centered modal popup with an OK button
 * @param {string} message - Message to display
 * @param {Object} options - Optional configuration
 */
export function showPopup(message, options = {}) {
  const overlay = document.createElement("div");
  overlay.className = "center-popup-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const box = document.createElement("div");
  box.className = "center-popup";

  // Logo: use typographic text by default
  const useTextLogo = options.useTextLogo !== false;
  let logoEl = null;
  if (useTextLogo) {
    logoEl = document.createElement("div");
    logoEl.className = "center-popup-logo-text";
    logoEl.setAttribute("aria-hidden", "true");
    logoEl.textContent = options.logoText || "PhyLab";
  } else {
    const logoSrc = options.logoSrc || "Phylab.png";
    const logoImg = document.createElement("img");
    logoImg.className = "center-popup-logo";
    logoImg.src = logoSrc;
    logoImg.alt = "PhyLab";
    logoEl = logoImg;
  }

  box.appendChild(logoEl);

  if (options.detailImage) {
    const detailImg = document.createElement("img");
    detailImg.className = "center-popup-detail-image";
    detailImg.src = options.detailImage;
    detailImg.alt = options.title ? options.title + " image" : "Item image";
    box.appendChild(detailImg);
  }

  if (options.title) {
    const titleEl = document.createElement("h3");
    titleEl.className = "center-popup-title";
    titleEl.textContent = options.title;
    box.appendChild(titleEl);
  }

  const msg = document.createElement("p");
  msg.className = "center-popup-message";
  msg.textContent = message || "";
  box.appendChild(msg);

  // Items list (if provided)
  if (Array.isArray(options.items) && options.items.length) {
    const list = document.createElement("ul");
    list.className = "center-popup-items";
    options.items.forEach((it) => {
      const li = document.createElement("li");
      const name = it.name || it.itemName || it.title || "Item";
      if (options.isSpecList) {
        li.textContent = name;
      } else {
        const qty = it.quantity != null ? it.quantity : null;
        li.textContent = qty != null ? `${name} × ${qty}` : name;
      }
      list.appendChild(li);
    });
    box.appendChild(list);
  }

  const btn = document.createElement("button");
  btn.className = "center-popup-ok";
  btn.type = "button";
  btn.textContent = "OK";

  btn.addEventListener("click", () => {
    try {
      document.body.removeChild(overlay);
    } catch (e) {}
    if (typeof options.onClose === "function") options.onClose();
  });

  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  btn.focus();
}

/**
 * Show submitting indicator
 */
export function showSubmittingIndicator() {
  try {
    if (document.getElementById("submitting-indicator")) return;
    const o = document.createElement("div");
    o.id = "submitting-indicator";
    o.style.position = "fixed";
    o.style.left = "12px";
    o.style.bottom = "12px";
    o.style.padding = "10px 14px";
    o.style.background = "rgba(0,0,0,0.75)";
    o.style.color = "#fff";
    o.style.borderRadius = "8px";
    o.style.zIndex = 99999;
    o.style.fontSize = "13px";
    o.textContent = "Submitting review...";
    document.body.appendChild(o);
  } catch (e) {
    console.warn("showSubmittingIndicator error", e);
  }
}

/**
 * Hide submitting indicator
 */
export function hideSubmittingIndicator() {
  try {
    const e = document.getElementById("submitting-indicator");
    if (e) e.remove();
  } catch (err) {}
}

/**
 * Animate an image flying to the borrow button
 */
export function animateAddToBorrow(src, sourceImgEl) {
  const startRect = sourceImgEl
    ? sourceImgEl.getBoundingClientRect()
    : {
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        width: 60,
        height: 60,
      };

  const endBtn = document.getElementById("borrowToggleButton");
  if (!endBtn) return;

  let endRect = endBtn.getBoundingClientRect();
  const btnStyle = window.getComputedStyle(endBtn);

  if (
    !endRect.width ||
    !endRect.height ||
    btnStyle.display === "none" ||
    btnStyle.visibility === "hidden"
  ) {
    const borrowModal = document.getElementById("borrowModal");
    const modalContent = borrowModal
      ? borrowModal.querySelector(".modal-content")
      : null;
    if (modalContent) {
      endRect = modalContent.getBoundingClientRect();
    } else {
      endRect = {
        left: window.innerWidth - 60,
        top: window.innerHeight - 60,
        width: 48,
        height: 48,
      };
    }
  }

  const flying = document.createElement("img");
  flying.src = src;
  flying.className = "flying-img";
  flying.style.left = startRect.left + "px";
  flying.style.top = startRect.top + "px";
  flying.style.width = startRect.width + "px";
  flying.style.height = startRect.height + "px";
  flying.style.opacity = "1";
  flying.style.transformOrigin = "center center";
  flying.style.transition =
    "transform 220ms cubic-bezier(.2,.8,.2,1), opacity 200ms ease";
  document.body.appendChild(flying);

  const startCenterX = startRect.left + startRect.width / 2;
  const startCenterY = startRect.top + startRect.height / 2;
  const endCenterX = endRect.left + endRect.width / 2;
  const endCenterY = endRect.top + endRect.height / 2;
  const deltaX = endCenterX - startCenterX;
  const deltaY = endCenterY - startCenterY;

  requestAnimationFrame(() => {
    flying.style.transform = `translate(0px, -30px) scale(1.6)`;
  });

  setTimeout(() => {
    const midX = deltaX * 0.5;
    const midY = deltaY * 0.5 - Math.max(60, Math.abs(deltaX) * 0.12);
    const kf = [
      { transform: `translate(0px, -30px) scale(1.6)`, opacity: 1 },
      {
        transform: `translate(${midX}px, ${midY}px) scale(0.9)`,
        opacity: 0.9,
        offset: 0.5,
      },
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(0.28)`,
        opacity: 0.6,
      },
    ];

    const anim = flying.animate(kf, {
      duration: 680,
      easing: "cubic-bezier(.22,.9,.4,1)",
      fill: "forwards",
    });

    anim.onfinish = () => {
      endBtn.classList.add("borrow-pulse");
      setTimeout(() => endBtn.classList.remove("borrow-pulse"), 420);
      flying.animate([{ opacity: 0.6 }, { opacity: 0 }], {
        duration: 260,
        fill: "forwards",
      });
      setTimeout(() => {
        try {
          document.body.removeChild(flying);
        } catch (e) {}
      }, 300);
    };
  }, 220);
}

/**
 * Sync stock display across cards
 */
export function syncStockDisplay() {
  const allCards = document.querySelectorAll(".inventory-section-card");
  allCards.forEach((card) => {
    const stockElement = card.querySelector(".stock-display");
    if (!stockElement) return;

    const itemKey =
      stockElement.getAttribute("data-item") || card.getAttribute("data-item");
    const savedStock = localStorage.getItem(`stock_${itemKey}`);

    if (savedStock !== null) {
      const currentStock = parseInt(savedStock);
      stockElement.innerText = currentStock;

      const borrowBtn = card.querySelector(".inventory-button-borrow");
      if (borrowBtn) {
        if (currentStock <= 0) {
          const svgIcon = borrowBtn.querySelector("svg");
          if (!svgIcon) {
            borrowBtn.innerText = "Out of Stock";
          }
          borrowBtn.style.backgroundColor = "#ccc";
          borrowBtn.style.cursor = "not-allowed";
          borrowBtn.disabled = true;
          card.style.opacity = "0.7";
        } else {
          const svgIcon = borrowBtn.querySelector("svg");
          if (svgIcon) {
            borrowBtn.innerHTML = "";
            borrowBtn.appendChild(svgIcon);
            borrowBtn.appendChild(document.createTextNode(" Borrow"));
          } else {
            borrowBtn.innerText = "Borrow";
          }
          borrowBtn.style.backgroundColor = "var(--color-primary)";
          borrowBtn.style.cursor = "pointer";
          borrowBtn.disabled = false;
          card.style.opacity = "1";
        }
      }
    }
  });
}

/**
 * Populate teacher dropdown list
 */
export function populateTeacherList(teachers) {
  const sel = document.getElementById("teacher-name");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Select teacher --</option>';
  if (!Array.isArray(teachers)) return;
  teachers.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

/**
 * Get session user data
 */
export function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem("current_user")) || {};
  } catch (e) {
    return {};
  }
}
