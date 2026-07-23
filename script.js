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

let allChannels = [];
let recentChannels = JSON.parse(localStorage.getItem("iptv_recents") || "[]");
let favoriteChannels = JSON.parse(localStorage.getItem("iptv_favorites") || "[]");
let hls = null;

let currentLang = localStorage.getItem("iptv_lang") || "bn";
let currentTheme = localStorage.getItem("iptv_theme") || "dark";

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

// ভিডিও সাইজ মোড সেট করা (Original, Stretch, Cover)
aspectRatioSelect.addEventListener("change", (e) => {
  video.style.objectFit = e.target.value;
});

// M3U Playlist Fetch
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

// কার্ড রেন্ডার করা এবং ফেভারিট বাটন ম্যানেজ করা
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

    const isFav = favoriteChannels.some(fav => fav.url === ch.url);
    const logoSrc = ch.logo ? ch.logo : "logo.png";

    card.innerHTML = `
      <span class="fav-star ${isFav ? 'active' : ''}">★</span>
      <img src="${logoSrc}" alt="${ch.name}" onerror="this.onerror=null; this.src='logo.png';">
      <div>${ch.name}</div>
    `;

    // ফেভারিট বাটনে ক্লিক করার লজিক
    const starBtn = card.querySelector(".fav-star");
    starBtn.onclick = (e) => {
      e.stopPropagation(); // চ্যানেল প্লে হওয়া আটকাবে
      toggleFavorite(ch);
      starBtn.classList.toggle("active");
    };

    // চ্যানেল প্লে করার লজিক
    card.onclick = () => {
      document.querySelectorAll(".card").forEach(x => x.classList.remove("active"));
      card.classList.add("active");
      addRecentChannel(ch);
      play(ch.url);
    };

    list.appendChild(card);
  });
}

function toggleFavorite(ch) {
  const index = favoriteChannels.findIndex(fav => fav.url === ch.url);
  if (index > -1) {
    favoriteChannels.splice(index, 1);
  } else {
    favoriteChannels.push(ch);
  }
  localStorage.setItem("iptv_favorites", JSON.stringify(favoriteChannels));
}

favBtn.addEventListener("click", () => {
  render(favoriteChannels);
  closeMenu();
});

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

// Player Logic
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

// App Initialization
applyTheme();
fetchPlaylist();
