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

// Language and Theme Buttons
const themeBtn = document.getElementById("themeBtn");
const langBtn = document.getElementById("langBtn");

let allChannels = [];
let recentChannels = JSON.parse(localStorage.getItem("iptv_recents") || "[]");
let hls = null;

// Default State Settings
let currentLang = localStorage.getItem("iptv_lang") || "bn"; // 'bn' or 'en'
let currentTheme = localStorage.getItem("iptv_theme") || "dark"; // 'dark' or 'light'

// 1. Language Translation Data
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
    notFound: "কোনো চ্যানেল পাওয়া যায়নি।"
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
    notFound: "No channels found."
  }
};

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
}

// 2. Theme Toggle Logic
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

// 3. Aspect Ratio / Video Size Logic
aspectRatioSelect.addEventListener("change", (e) => {
  const mode = e.target.value;
  video.style.objectFit = mode;
});

// 4. M3U Fetch & Parse
function fetchPlaylist() {
  list.innerHTML = `<div style="color:#a0a0b0; padding:20px; grid-column: 1/-1; text-align: center;">Loading...</div>`;

  fetch("mixiptvchannel.m3u", { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error("HTTP error " + r.status);
      return r.text();
    })
    .then(data => parseM3U(data))
    .catch(() => {
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
  const groups = new Set(["ALL"]);
  allChannels.forEach(ch => {
    if (ch.group) groups.add(ch.group.toUpperCase());
  });

  const currentSelection = categorySelect.value;
  categorySelect.innerHTML = "";

  groups.forEach(group => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    categorySelect.appendChild(option);
  });

  if (groups.has(currentSelection)) {
    categorySelect.value = currentSelection;
  }
}

// 5. Search & Category Filter
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

  if (data.length === 0) {
    const t = translations[currentLang];
    list.innerHTML = `<div style="color:#a0a0b0; padding:20px; grid-column: 1/-1; text-align: center; font-size: 13px;">${t.notFound}</div>`;
    return;
  }

  data.forEach(ch => {
    const card = document.createElement("div");
    card.className = "card";

    const logoSrc = ch.logo ? ch.logo : "logo.png";
    card.innerHTML = `
      <img src="${logoSrc}" alt="${ch.name}" onerror="this.onerror=null; this.src='logo.png';">
      <div>${ch.name}</div>
    `;

    card.onclick = () => {
      document.querySelectorAll(".card").forEach(x => x.classList.remove("active"));
      card.classList.add("active");
      addRecentChannel(ch);
      play(ch.url);
    };

    list.appendChild(card);
  });
}

categorySelect.addEventListener("change", () => {
  searchInput.value = "";
  filterAndRender();
});

searchInput.addEventListener("input", filterAndRender);

// Side Menu Navigation
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

function addRecentChannel(ch) {
  recentChannels = recentChannels.filter(c => c.url !== ch.url);
  recentChannels.unshift(ch);
  if (recentChannels.length > 20) recentChannels.pop();
  localStorage.setItem("iptv_recents", JSON.stringify(recentChannels));
}

recentBtn.addEventListener("click", () => {
  render(recentChannels);
  closeMenu();
});

// Auto Fullscreen on Rotate
window.addEventListener("orientationchange", () => {
  if (window.orientation === 90 || window.orientation === -90) {
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
  }
});

// HLS Stream Player
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
      video.play().catch(e => console.log(e));
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = cleanUrl;
    video.play().catch(e => console.log(e));
  }
}

// Initialize Theme, Language & Load Data
applyTheme();
fetchPlaylist();
