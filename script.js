// ==========================================
// 1. HTML Elements Reference
// ==========================================
const video = document.getElementById("video");
const list = document.getElementById("channelList");
const categorySelect = document.getElementById("categorySelect");
const searchInput = document.getElementById("searchInput");

const menuBtn = document.getElementById("menuBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("sideMenuOverlay");
const reloadBtn = document.getElementById("reloadBtn");
const aspectRatioSelect = document.getElementById("aspectRatioSelect");
const favBtn = document.getElementById("favBtn");
const recentBtn = document.getElementById("recentBtn");

const themeBtn = document.getElementById("themeBtn");
const langBtn = document.getElementById("langBtn");
const channelCounterBadge = document.getElementById("channelCounterBadge");

// ==========================================
// 2. Application State & Storage
// ==========================================
let allChannels = [];
let recentChannels = JSON.parse(localStorage.getItem("iptv_recents") || "[]");
let favoriteChannels = JSON.parse(localStorage.getItem("iptv_favorites") || "[]");
let hls = null;

let currentLang = localStorage.getItem("iptv_lang") || "bn";
let currentTheme = localStorage.getItem("iptv_theme") || "dark";

// ==========================================
// 3. Language & Localization Data
// ==========================================
const translations = {
  bn: {
    heading: "নিয়ন্ত্রণ প্যানেল",
    fav: "প্রিয় চ্যানেলসমূহ",
    recent: "সাম্প্রতিক প্লে",
    size: "ভিডিও সাইজ",
    lang: "Language: English",
    themeDark: "থিম: Dark",
    themeLight: "থিম: Light",
    reload: "প্লেলিস্ট রিফ্রেশ করুন",
    telegram: "টেলিগ্রাম (সাপোর্ট)",
    facebook: "ফেসবুক (সাপোর্ট)",
    searchPlaceholder: "Search...",
    notFound: "কোনো চ্যানেল পাওয়া যায়নি।",
    categoryDefault: "ক্যাটাগরি"
  },
  en: {
    heading: "Control Panel",
    fav: "Favorite Channels",
    recent: "Recently Played",
    size: "Video Size",
    lang: "ভাষা: বাংলা",
    themeDark: "Theme: Dark",
    themeLight: "Theme: Light",
    reload: "Refresh Playlist",
    telegram: "Telegram (Support)",
    facebook: "Facebook (Support)",
    searchPlaceholder: "Search channels...",
    notFound: "No channels found.",
    categoryDefault: "Category"
  }
};

// প্রতিটি শব্দের প্রথম বর্ণ Capitalize করার ফাংশন
function capitalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Apply text translations to UI elements
function applyLanguage() {
  const t = translations[currentLang];
  document.getElementById("menuHeading").textContent = t.heading;
  document.getElementById("lblFav").textContent = t.fav;
  document.getElementById("lblRecent").textContent = t.recent;
  document.getElementById("lblVideoSize").textContent = t.size;
  document.getElementById("lblLang").textContent = t.lang;
  document.getElementById("lblTheme").textContent = currentTheme === "dark" ? t.themeDark : t.themeLight;
  document.getElementById("lblReload").textContent = t.reload;
  document.getElementById("lblTelegram").textContent = t.telegram;
  document.getElementById("lblFacebook").textContent = t.facebook;
  searchInput.placeholder = t.searchPlaceholder;

  updateCategoryDropdownOptions();
}

// ==========================================
// 4. Theme & Settings Controls
// ==========================================
function applyTheme() {
  if (currentTheme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }
  applyLanguage();
}

themeBtn.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("iptv_theme", currentTheme);
  applyTheme();
});

langBtn.addEventListener("click", () => {
  currentLang = currentLang === "bn" ? "en" : "bn";
  localStorage.setItem("iptv_lang", currentLang);
  applyLanguage();
});

aspectRatioSelect.addEventListener("change", (e) => {
  video.style.objectFit = e.target.value;
});

// ==========================================
// 5. Skeleton Loading UI
// ==========================================
function renderSkeletons(count = 12) {
  list.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "card skeleton";
    card.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-text"></div>
    `;
    fragment.appendChild(card);
  }
  list.appendChild(fragment);
}

// ==========================================
// 6. M3U Playlist Processing
// ==========================================
function fetchPlaylist() {
  renderSkeletons(15);

  fetch("mixiptvchannel.m3u", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("HTTP error " + response.status);
      return response.text();
    })
    .then(data => parseM3U(data))
    .catch(() => {
      if (channelCounterBadge) channelCounterBadge.textContent = "CH: 0";
      list.innerHTML = `
        <div style="color:#ff244f; padding:20px; grid-column: 1/-1; text-align: center; font-size: 13px;">
          ⚠️ mixiptvchannel.m3u ফাইলটি পাওয়া যায়নি।
        </div>`;
    });
}

function parseM3U(data) {
  allChannels = [];
  const lines = data.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXTINF:")) {
      const name = line.split(",").pop().trim();
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);

      const logo = logoMatch ? logoMatch[1] : "";
      const group = groupMatch ? groupMatch[1] : "ALL";

      let url = "";
      for (let j = i + 1; j < lines.length; j++) {
        const candidate = lines[j].trim();
        if (candidate && !candidate.startsWith("#")) {
          url = candidate;
          break;
        }
      }

      if (url) {
        allChannels.push({ name, logo, group, url });
      }
    }
  }

  updateCategoryDropdownOptions();
  filterAndRender();
}

function updateCategoryDropdownOptions() {
  const groups = new Set();
  allChannels.forEach(ch => {
    if (ch.group) groups.add(ch.group.trim());
  });

  const currentSelection = categorySelect.value;
  const t = translations[currentLang];
  categorySelect.innerHTML = "";

  // ১ম অপশন: বাংলা হলে "ক্যাটাগরি" এবং ইংরেজি হলে "Category"
  const defaultOption = document.createElement("option");
  defaultOption.value = "ALL";
  defaultOption.textContent = t.categoryDefault;
  categorySelect.appendChild(defaultOption);

  // অন্যান্য ক্যাটাগরির ১ম বর্ণ Capitalize হবে
  groups.forEach(group => {
    if (group.toUpperCase() !== "ALL") {
      const option = document.createElement("option");
      option.value = group.toUpperCase();
      option.textContent = capitalizeText(group);
      categorySelect.appendChild(option);
    }
  });

  if (groups.has(currentSelection) || currentSelection === "ALL") {
    categorySelect.value = currentSelection;
  }
}

// ==========================================
// 7. Channel Filtering & UI Rendering
// ==========================================
function filterAndRender() {
  const selectedCat = categorySelect.value.toUpperCase();
  const query = searchInput.value.trim().toLowerCase();

  const filtered = allChannels.filter(ch => {
    if (query !== "") {
      return ch.name.toLowerCase().includes(query);
    }
    return selectedCat === "ALL" || ch.group.toUpperCase().includes(selectedCat);
  });

  render(filtered);
}

function render(data) {
  list.innerHTML = "";

  // রিয়েলটাইম চ্যানেল কাউন্টার (যেমন: CH 140)
  if (channelCounterBadge) {
    channelCounterBadge.textContent = `CH ${data.length}`;
  }

  if (data.length === 0) {
    const t = translations[currentLang];
    list.innerHTML = `<div style="color:#a0a0b0; padding:20px; grid-column: 1/-1; text-align: center; font-size: 13px;">${t.notFound}</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  data.forEach(ch => {
    const card = document.createElement("div");
    card.className = "card";

    const isFav = favoriteChannels.some(fav => fav.url === ch.url);
    const logoSrc = ch.logo ? ch.logo : "logo.png";

    card.innerHTML = `
      <span class="fav-star ${isFav ? 'active' : ''}">★</span>
      <img src="${logoSrc}" alt="${ch.name}" loading="lazy" onerror="this.onerror=null; this.src='logo.png';">
      <div>${ch.name}</div>
    `;

    const starBtn = card.querySelector(".fav-star");
    starBtn.onclick = (e) => {
      e.stopPropagation();
      toggleFavorite(ch);
      starBtn.classList.toggle("active");
    };

    card.onclick = () => {
      document.querySelectorAll(".card").forEach(x => x.classList.remove("active"));
      card.classList.add("active");
      addRecentChannel(ch);
      play(ch.url);
    };

    fragment.appendChild(card);
  });

  list.appendChild(fragment);
}

// ==========================================
// 8. Favorites & Playing History Management
// ==========================================
function toggleFavorite(ch) {
  const index = favoriteChannels.findIndex(fav => fav.url === ch.url);
  if (index > -1) {
    favoriteChannels.splice(index, 1);
  } else {
    favoriteChannels.push(ch);
  }
  localStorage.setItem("iptv_favorites", JSON.stringify(favoriteChannels));
}

function addRecentChannel(ch) {
  recentChannels = recentChannels.filter(c => c.url !== ch.url);
  recentChannels.unshift(ch);
  if (recentChannels.length > 20) recentChannels.pop();
  localStorage.setItem("iptv_recents", JSON.stringify(recentChannels));
}

favBtn.addEventListener("click", () => {
  render(favoriteChannels);
  closeMenu();
});

recentBtn.addEventListener("click", () => {
  render(recentChannels);
  closeMenu();
});

categorySelect.addEventListener("change", () => {
  searchInput.value = "";
  filterAndRender();
});

searchInput.addEventListener("input", filterAndRender);

// ==========================================
// 9. Navigation Side-Menu Events
// ==========================================
menuBtn.addEventListener("click", () => {
  sideMenu.classList.add("active");
  menuOverlay.classList.add("active");
});

function closeMenu() {
  sideMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
}

closeMenuBtn.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

reloadBtn.addEventListener("click", () => {
  fetchPlaylist();
  closeMenu();
});

// ==========================================
// 10. Screen Orientation & Fullscreen Handler
// ==========================================
function handleOrientationChange() {
  const isLandscape = screen.orientation ? screen.orientation.type.startsWith("landscape") : (window.orientation === 90 || window.orientation === -90);

  if (isLandscape) {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    }
  } else {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

if (screen.orientation) {
  screen.orientation.addEventListener("change", handleOrientationChange);
} else {
  window.addEventListener("orientationchange", handleOrientationChange);
}

// ==========================================
// 11. HLS Stream Playback Engine
// ==========================================
function play(url) {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  const cleanUrl = url.trim();

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(cleanUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(err => console.log("Autoplay blocked/failed:", err));
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = cleanUrl;
    video.play().catch(err => console.log("Autoplay blocked/failed:", err));
  }
}

// ==========================================
// 12. App Initialization
// ==========================================
applyTheme();
fetchPlaylist();
