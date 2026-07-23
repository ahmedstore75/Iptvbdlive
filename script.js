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

let allChannels = [];
let recentChannels = JSON.parse(localStorage.getItem("iptv_recents") || "[]");
let hls = null;

// ১. M3U ফাইল ফেচ (Robust Error Handling সহ)
function fetchPlaylist() {
  list.innerHTML = `<div style="color:#a0a0b0; padding:20px; grid-column: 1/-1; text-align: center;">প্লেলিস্ট লোড হচ্ছে...</div>`;

  fetch("mixiptvchannel.m3u", { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error("HTTP error " + r.status);
      return r.text();
    })
    .then(data => {
      parseM3U(data);
    })
    .catch(err => {
      console.error("Playlist Loading Failed:", err);
      list.innerHTML = `
        <div style="color:#ff244f; padding:20px; grid-column: 1/-1; text-align: center; font-size: 13px;">
          ⚠️ mixiptvchannel.m3u ফাইলটি পাওয়া যায়নি অথবা লোড হতে সমস্যা হচ্ছে।<br><br>
          <small style="color:#aaa;">ফাইলটি index.html এর একই ফোল্ডারে আছে কিনা নিশ্চিত করুন।</small>
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

// ২. ফিল্টার ও সার্চ লজিক
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
    list.innerHTML = `<div style="color:#a0a0b0; padding:20px; grid-column: 1/-1; text-align: center; font-size: 13px;">কোনো চ্যানেল পাওয়া যায়নি।</div>`;
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

// ৩. সাইড মেনু
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

aspectRatioSelect.addEventListener("change", (e) => {
  video.style.objectFit = e.target.value;
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

// ৪. স্ক্রিন রোটেট করলে অটোমেটিক ফুলস্ক্রিন (Auto Fullscreen on Landscape)
window.addEventListener("orientationchange", () => {
  if (window.orientation === 90 || window.orientation === -90) {
    // মোবাইল কাত করলে (Landscape)
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    }
  } else {
    // মোবাইল সোজা করলে (Portrait)
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
  }
});

// ৫. প্লেয়ার লজিক
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
      video.play().catch(e => console.log("Autoplay blocked:", e));
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = cleanUrl;
    video.play().catch(e => console.log("Autoplay blocked:", e));
  }
}

fetchPlaylist();
