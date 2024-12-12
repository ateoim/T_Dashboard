// Define your Spotify app details
const client_id = "e2e15c5deef14339b504d97037b8abe3";
const redirect_uri = "https://ateoim.github.io/T_Dashboard/index.html";
const scopes =
  "user-read-recently-played user-top-read user-modify-playback-state streaming playlist-modify-public playlist-modify-private playlist-read-collaborative";
let accessToken = null;

// Function to get access token from URL hash
const getAccessTokenFromUrl = () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
};

// If the access token is not available, redirect to Spotify authorization
const checkAuth = () => {
  accessToken = getAccessTokenFromUrl();

  if (!accessToken) {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=token&redirect_uri=${encodeURIComponent(
      redirect_uri
    )}&scope=${encodeURIComponent(scopes)}`;
    window.location = authUrl;
  } else {
    // Initialize everything after we have the token
    initializePage();
    fetchSpotifyData();
  }
};

// Function to fetch recently played songs
const fetchRecentlyPlayed = async () => {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=3",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await response.json();
  return data.items;
};

// Function to fetch top artists with their most listened tracks
const fetchTopArtists = async () => {
  try {
    const artistsResponse = await fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=3&time_range=short_term",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const artistsData = await artistsResponse.json();
    console.log("Top artists data:", artistsData);

    const tracksResponse = await fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const tracksData = await tracksResponse.json();
    console.log("Top tracks data:", tracksData);

    return artistsData.items.map((artist) => {
      const topTrack = tracksData.items.find((track) =>
        track.artists.some((trackArtist) => trackArtist.id === artist.id)
      );
      return { ...artist, topTrack };
    });
  } catch (error) {
    console.error("Error fetching top artists:", error);
    return [];
  }
};

// Function to display top artists
const displayTopArtists = async () => {
  try {
    const artists = await fetchTopArtists();
    const topArtistsDiv = document.getElementById("topArtistsList");
    topArtistsDiv.innerHTML = ""; // Clear previous content

    artists.forEach((artist) => {
      const artistElement = document.createElement("div");
      artistElement.className = "artist-item";
      artistElement.innerHTML = `
        <div class="artist-image">
          <img src="${artist.images[0].url}" alt="${artist.name}">
          ${
            artist.topTrack
              ? `
            <button class="play-button" onclick="playSong('${artist.topTrack.uri}')">
              <i class="fas fa-play"></i>
            </button>
          `
              : ""
          }
        </div>
        <div class="artist-info">
          <h3 class="artist-name">${artist.name}</h3>
          ${
            artist.topTrack
              ? `
            <p class="top-track">Top track: ${artist.topTrack.name}</p>
          `
              : ""
          }
        </div>
      `;
      topArtistsDiv.appendChild(artistElement);
    });
  } catch (error) {
    console.error("Error displaying top artists:", error);
  }
};

// Function to display recently played songs
const displayRecentlyPlayed = async () => {
  const songs = await fetchRecentlyPlayed();
  const recentSongsDiv = document.getElementById("recentSongs");
  recentSongsDiv.innerHTML = ""; // Clear previous content

  songs.forEach((song) => {
    const songElement = document.createElement("div");
    songElement.className = "song-item";
    songElement.innerHTML = `
      <div class="song-image">
        <img src="${song.track.album.images[0].url}" alt="${song.track.name}">
        <button class="play-button" onclick="playSong('${song.track.uri}')">
          <i class="fas fa-play"></i>
        </button>
      </div>
      <div class="song-info">
        <h3 class="song-title">${song.track.name}</h3>
        <p class="song-artist">${song.track.artists
          .map((artist) => artist.name)
          .join(", ")}</p>
      </div>
    `;
    recentSongsDiv.appendChild(songElement);
  });
};

// Function to play song using Spotify Web Playback SDK
const playSong = (uri) => {
  fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: [uri] }),
  });
};

// Initialize Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
  const player = new Spotify.Player({
    name: "Tom's Web Player",
    getOAuthToken: (cb) => {
      cb(accessToken);
    },
  });

  player.connect();
};
///
const playlistId = "3l4a9oLo9GLIb4bMm0RGZg";
const collaborationLink =
  " https://open.spotify.com/playlist/3l4a9oLo9GLIb4bMm0RGZg?si=zBjuRdVUQrGFESNeExnymw&pt=cddddf56622922b92aeecceab91def9e"; // Replace with your actual invite link

// Function to display the collaboration invite link
const displayCollaborationLink = () => {
  const inviteElement = document.getElementById("playlistInvite");
  inviteElement.innerHTML = `
    
    <a href="${collaborationLink}" target="_blank" class="invite-link">Add a song!</a>
  `;
};

// Function to embed the Spotify playlist viewer
const embedPlaylistViewer = () => {
  const viewerElement = document.getElementById("playlistViewer");

  if (!viewerElement) {
    console.error("Playlist viewer element not found");
    return;
  }

  // Directly embed the playlist with the exact code from Spotify
  viewerElement.innerHTML = `
    <iframe 
      style="border-radius:12px" 
      src="https://open.spotify.com/embed/playlist/3l4a9oLo9GLIb4bMm0RGZg?utm_source=generator&theme=0" 
      width="100%" 
      height="352" 
      frameBorder="0" 
      allowfullscreen="" 
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
      loading="lazy">
    </iframe>
  `;
};

// Initialize all event listeners and app functionality
const initializeApp = () => {
  // Check authentication first
  checkAuth();
  checkLoginStatus();
  embedPlaylistViewer();

  // Initialize dropdown functionality
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  if (dropdownToggle) {
    dropdownToggle.addEventListener("click", toggleDropdown);
  }

  // Initialize search functionality
  const searchButton = document.getElementById("songSearchButton");
  const searchInput = document.getElementById("songSearchInput");

  if (searchButton && searchInput) {
    // Handle search button click
    searchButton.addEventListener("click", () => handleSearch(searchInput));

    // Handle enter key in search input
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSearch(searchInput);
      }
    });
  }
};

// Separate search handling function
const handleSearch = async (searchInput) => {
  const query = searchInput.value.trim();
  if (query) {
    try {
      const songs = await searchSpotifySongs(query);
      displaySearchResults(songs);
    } catch (error) {
      console.error("Search failed:", error);
      displayError("Failed to search songs. Please try again.");
    }
  }
};

// Update the toggleDropdown function
const toggleDropdown = () => {
  const dropdown = document.getElementById("statsDropdown");
  const toggleButton = document.querySelector(
    ".dropdown-toggle .fas.fa-chevron-down"
  );

  if (!dropdown || !toggleButton) {
    console.error("Dropdown elements not found");
    return;
  }

  const isActive = dropdown.classList.toggle("active");
  toggleButton.style.transform = isActive ? "rotate(180deg)" : "rotate(0)";

  if (isActive && accessToken) {
    fetchSpotifyData();
  }
};

// Add error display function
const displayError = (message) => {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;

  const searchResults = document.getElementById("songSearchResults");
  if (searchResults) {
    searchResults.innerHTML = "";
    searchResults.appendChild(errorDiv);
  }
};

// Single DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", initializeApp);

// Remove any duplicate event listeners and initialization calls
