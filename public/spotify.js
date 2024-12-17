// Define your Spotify app details
const SPOTIFY_CONFIG = {
  client_id: "e2e15c5deef14339b504d97037b8abe3",
  redirect_uri: "https://ateoim.github.io/T_Dashboard/index.html",
  scopes: [
    "user-read-recently-played",
    "user-top-read",
    "playlist-read-collaborative",
    "playlist-modify-public",
    "playlist-modify-private",
  ].join(" "),
};

const client_id = SPOTIFY_CONFIG.client_id;
const redirect_uri = SPOTIFY_CONFIG.redirect_uri;
const scopes = SPOTIFY_CONFIG.scopes;

let accessToken = null;

// Function to fetch recently played songs
const fetchRecentlyPlayed = async () => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=3",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    handleApiError(
      error,
      "recentSongs",
      "Failed to load recently played songs"
    );
    return [];
  }
};

// Function to fetch top artists with their most listened tracks
const fetchTopArtists = async () => {
  try {
    const artistsResponse = await fetchWithSpotifyAuth(
      "https://api.spotify.com/v1/me/top/artists?limit=3&time_range=short_term"
    );
    if (!artistsResponse) return [];
    const artistsData = await artistsResponse.json();

    const tracksResponse = await fetchWithSpotifyAuth(
      "https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term"
    );
    if (!tracksResponse) return [];
    const tracksData = await tracksResponse.json();

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

// Add this function to handle playlist loading errors
const handlePlaylistError = () => {
  const viewerElement = document.getElementById("playlistViewer");
  if (viewerElement) {
    viewerElement.innerHTML = `
      <div class="error-message">
        Failed to load playlist. Please check your connection and try refreshing the page.
      </div>
    `;
  }
};

// Add click handlers for stat options
const initializeStatOptions = () => {
  const recentlyPlayedOption = document.getElementById("recentlyPlayedOption");
  const topArtistsOption = document.getElementById("topArtistsOption");
  const recentlyPlayedSection = document.getElementById("recentlyPlayed");
  const topArtistsSection = document.getElementById("topArtists");

  recentlyPlayedOption.addEventListener("click", () => {
    recentlyPlayedSection.style.display = "block";
    topArtistsSection.style.display = "none";
    displayRecentlyPlayed();
  });

  topArtistsOption.addEventListener("click", () => {
    topArtistsSection.style.display = "block";
    recentlyPlayedSection.style.display = "none";
    displayTopArtists();
  });
};

// Initialize all event listeners and app functionality
const initializeApp = () => {
  // Add dropdown click listener
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  if (dropdownToggle) {
    dropdownToggle.addEventListener("click", toggleDropdown);
  }

  // Initialize stat options
  initializeStatOptions();

  // Initialize search functionality
  const searchButton = document.getElementById("songSearchButton");
  const searchInput = document.getElementById("songSearchInput");

  if (searchButton && searchInput) {
    searchButton.addEventListener("click", () => handleSearch(searchInput));
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

  if (!dropdown) {
    console.error("Dropdown element not found");
    return;
  }

  const isActive = dropdown.classList.toggle("active");

  if (toggleButton) {
    toggleButton.style.transform = isActive ? "rotate(180deg)" : "rotate(0)";
  }

  if (isActive) {
    // Fetch and display data
    displayRecentlyPlayed().catch((error) =>
      console.error("Error displaying recently played:", error)
    );
    displayTopArtists().catch((error) =>
      console.error("Error displaying top artists:", error)
    );
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

// Update the DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
  // Initialize app components
  initializeApp();

  // Check for and handle authentication
  const params = new URLSearchParams(window.location.hash.substring(1));
  const token = params.get("access_token");

  if (token) {
    // We have a token from auth redirect
    accessToken = token;
    localStorage.setItem("spotify_access_token", token);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    // Try to get token from localStorage
    accessToken = localStorage.getItem("spotify_access_token");
  }

  if (!accessToken) {
    // No token, need to authenticate
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=token&redirect_uri=${encodeURIComponent(
      redirect_uri
    )}&scope=${encodeURIComponent(scopes)}`;
    window.location.href = authUrl;
    return;
  }

  // We have a token, initialize everything
  embedPlaylistViewer();
  initializeStatOptions();
});

// Remove any duplicate event listeners and initialization calls

// Add the missing fetchSpotifyData function
const fetchSpotifyData = async () => {
  try {
    const recentSongs = document.getElementById("recentSongs");
    const topArtistsList = document.getElementById("topArtistsList");

    if (recentSongs) {
      recentSongs.innerHTML = '<div class="loading">Loading...</div>';
    }
    if (topArtistsList) {
      topArtistsList.innerHTML = '<div class="loading">Loading...</div>';
    }

    await Promise.all([displayRecentlyPlayed(), displayTopArtists()]);
  } catch (error) {
    console.error("Error fetching Spotify data:", error);
    if (error.message.includes("401")) {
      handleAuthError();
    }
  }
};

// Add these functions for search functionality
const searchSpotifySongs = async (query) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.tracks.items;
  } catch (error) {
    console.error("Error searching songs:", error);
    throw error;
  }
};

// Function to display search results
const displaySearchResults = (songs) => {
  const searchResults = document.getElementById("songSearchResults");
  searchResults.innerHTML = "";

  if (!songs || songs.length === 0) {
    searchResults.innerHTML = '<div class="no-results">No songs found</div>';
    return;
  }

  songs.forEach((song) => {
    const resultItem = document.createElement("div");
    resultItem.className = "search-result-item";
    resultItem.innerHTML = `
      <img 
        src="${song.album.images[song.album.images.length - 1].url}" 
        alt="${song.name}" 
        class="song-thumbnail"
      >
      <div class="song-details">
        <p class="song-title">${song.name}</p>
        <p class="song-artist">${song.artists
          .map((artist) => artist.name)
          .join(", ")}</p>
      </div>
      <button 
        class="add-song-btn" 
        onclick="addSongToPlaylist('${song.uri}')"
        title="Add to playlist"
      >
        <i class="fas fa-plus"></i>
      </button>
    `;
    searchResults.appendChild(resultItem);
  });
};

// Function to add song to playlist
const addSongToPlaylist = async (songUri) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: [songUri],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Show success message
    const searchResults = document.getElementById("songSearchResults");
    searchResults.innerHTML =
      '<div class="success-message">Song added successfully!</div>';

    // Refresh the playlist iframe after a short delay
    setTimeout(() => {
      embedPlaylistViewer();
    }, 1000);
  } catch (error) {
    console.error("Error adding song to playlist:", error);
    const searchResults = document.getElementById("songSearchResults");
    searchResults.innerHTML =
      '<div class="error-message">Failed to add song. Please try again.</div>';
  }
};

// Add this function to handle the initial auth
const initializeSpotify = () => {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = params.get("access_token");

  if (!accessToken) {
    // Redirect to Spotify auth
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.append("client_id", SPOTIFY_CONFIG.client_id);
    authUrl.searchParams.append("response_type", "token");
    authUrl.searchParams.append("redirect_uri", SPOTIFY_CONFIG.redirect_uri);
    authUrl.searchParams.append("scope", SPOTIFY_CONFIG.scopes);

    window.location.href = authUrl.toString();
    return;
  }

  // Store the token
  localStorage.setItem("spotify_access_token", accessToken);

  // Clear the URL hash
  window.history.replaceState({}, document.title, window.location.pathname);

  return accessToken;
};

// Update the fetch functions to use the stored token
const getSpotifyToken = () => {
  return localStorage.getItem("spotify_access_token");
};

const fetchWithSpotifyAuth = async (url, options = {}) => {
  const token = getSpotifyToken();
  if (!token) {
    initializeSpotify();
    return;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token expired, clear it and re-authenticate
    localStorage.removeItem("spotify_access_token");
    initializeSpotify();
    return;
  }

  return response;
};

const handleApiError = (error, elementId, message = "Error loading data") => {
  console.error(error);
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="error-message">${message}</div>`;
  }
};

// Add this function at the bottom of the file
const handleAuthError = () => {
  // Clear stored token
  localStorage.removeItem("spotify_access_token");
  accessToken = null;

  // Redirect to auth
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=token&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&scope=${encodeURIComponent(scopes)}`;
  window.location.href = authUrl;
};
