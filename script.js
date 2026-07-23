const video = document.getElementById("video");
const list = document.getElementById("channelList");
const categorySelect = document.getElementById("categorySelect");
const searchInput = document.getElementById("searchInput");

// Menu Elements
const menuBtn = document.getElementById("menuBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");
const reloadBtn = document.getElementById("reloadBtn");
const aspectRatioSelect = document.getElementById("aspectRatioSelect");
const favBtn = document.getElementById("favBtn");
const recentBtn = document.getElementById("recentBtn");

let allChannels = [];
let favorites = JSON.parse(localStorage.getItem("iptv_favs") || "[]");
let recentChannels = JSON.parse(localStorage.getItem("iptv_recents") || "[]");
let hls = null;

// ১. M3U ফাইল ফেচ ও পার্স করা
function fetchPlaylist() {
  fetch("mixiptvchannel.m3u")
    .then(r => r.text())
    .then(data => {
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
    })
    .catch(err => console.error("Error loading M3U file:", err));
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

// ২. সার্চ ও ক্যাটাগরি ফিল্টার লজিক (বাগ ফিক্স সহ)
function filterAndRender() {
  const selectedCat = categorySelect.value.toUpperCase();
  const query = searchInput.value.trim().toLowerCase();

  const filtered = allChannels.filter(ch => {
    // সার্চ টাইপ করা থাকলে যেকোনো ক্যাটাগরি থেকেই ফিল্টার করবে
    if (query !== "") {
      return ch.name.toLowerCase().includes(query);
    }
    // সার্চ ফাঁকা থাকলে সিলেক্ট করা ক্যাটাগরি অনুযায়ী ফিল্টার হবে
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

      // সাম্প্রতিক প্লে হিস্টোরিতে যুক্ত করা
      addRecentChannel(ch);

      play(ch.url);
    };

    list.appendChild(card);
  });
}

// ৩. ইভেন্ট লিসেনার
categorySelect.addEventListener("change", () => {
  searchInput.value = ""; // ক্যাটাগরি পরিবর্তন করলে সার্চ বক্স ফাঁকা হবে
  filterAndRender();
});

searchInput.addEventListener("input", filterAndRender);

// ৪. নিয়ন্ত্রণ প্যানেল (Side Menu) ওপেন/ক্লোজ
function openMenu() {
  sideMenu.classList.add("active");
  menuOverlay.classList.add("active");
}

function closeMenu() {
  sideMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
}

menuBtn.addEventListener("click", openMenu);
closeMenuBtn.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

reloadBtn.addEventListener("click", () => {
  fetchPlaylist();
  closeMenu();
});

// ভিডিও সাইজ (Aspect Ratio) পরিবর্তন
aspectRatioSelect.addEventListener("change", (e) => {
  video.style.objectFit = e.target.value;
});

// সাম্প্রতিক দেখা চ্যানেল সংক্রান্ত ফাংশন
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

favBtn.addEventListener("click", () => {
  render(favorites);
  closeMenu();
});

// ৫. ভিডিও প্লেয়ার লজিক
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
