// Fetch functions
async function fetchSpotifyData(endpoint) {
  try {
    const response = await fetch(
      `/.netlify/functions/spotify-fetch?endpoint=${endpoint}`
    );
    if (!response.ok) throw new Error("Spotify API error");
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// Update UI functions
async function updateDashboard() {
  try {
    // Now Playing
    const nowPlayingData = await fetchSpotifyData(
      "me/player/currently-playing"
    );
    console.log("Now playing response:", nowPlayingData);

    const nowPlaying = document.getElementById("now-playing");
    const nowPlayingArt = document.getElementById("now-playing-art");
    const nowPlayingArtist = document.getElementById("now-playing-artist");

    if (nowPlayingData?.item) {
      nowPlayingArt.src = nowPlayingData.item.album.images[0].url;
      nowPlaying.textContent = nowPlayingData.item.name;
      nowPlayingArtist.textContent = nowPlayingData.item.artists[0].name;

      // Show the now playing section
      document.querySelector(".now-playing-card").style.display = "flex";
    } else {
      // Hide the now playing section if nothing is playing
      document.querySelector(".now-playing-card").style.display = "none";

      // Or show a message
      // nowPlaying.textContent = "Not currently playing";
      // nowPlayingArt.src = 'placeholder.jpg';
      // nowPlayingArtist.textContent = '';
    }

    // Top Track (weekly)
    const topTrackData = await fetchSpotifyData(
      "me/top/tracks?limit=1&time_range=short_term"
    );
    console.log("Top track response:", topTrackData);

    const topTrack = document.getElementById("top-track");
    if (topTrackData?.items?.[0]) {
      const track = topTrackData.items[0];
      document.getElementById("top-track-art").src = track.album.images[0].url;
      topTrack.textContent = track.name;
      document.getElementById("top-track-artist").textContent =
        track.artists[0].name;
    } else {
      topTrack.textContent = "Error loading top track";
    }

    // Recently played
    const recentData = await fetchSpotifyData(
      "me/player/recently-played?limit=3"
    );
    console.log("Recent tracks response:", recentData);

    const recentTracks = document.getElementById("recent-tracks");
    if (recentData?.items) {
      const tracksHTML = recentData.items
        .map(
          (item) => `
        <div class="track-item">
          <div class="track-art">
            <img src="${item.track.album.images[0].url}" alt="Album art">
            <button class="play-button">
              <i class="fas fa-play"></i>
            </button>
          </div>
          <div class="track-details">
            <span class="track-name">${item.track.name}</span>
            <span class="artist-name">${item.track.artists[0].name}</span>
          </div>
          <div class="track-meta">
            <span class="track-time">${new Date(
              item.played_at
            ).toLocaleTimeString()}</span>
          </div>
        </div>
      `
        )
        .join("");
      recentTracks.innerHTML = tracksHTML;
    } else {
      recentTracks.textContent = "Error loading recent tracks";
      console.error("Recent tracks data:", recentData);
    }

    // Top artists
    const artistData = await fetchSpotifyData(
      "me/top/artists?limit=3&time_range=short_term"
    );
    console.log("Top artists response:", artistData);

    const topArtists = document.getElementById("top-artists");
    if (artistData?.items) {
      const artistsHTML = artistData.items
        .map(
          (artist) => `
        <div class="artist-item">
          <img src="${artist.images[0].url}" alt="${artist.name}" class="artist-image">
          <span class="artist-name">${artist.name}</span>
        </div>
      `
        )
        .join("");
      topArtists.innerHTML = artistsHTML;
    } else {
      topArtists.textContent = "Error loading top artists";
      console.error("Top artists data:", artistData);
    }

    // Update timestamp
    document.getElementById(
      "last-updated"
    ).textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error("Dashboard update error:", error);
    // Hide the now playing section on error
    document.querySelector(".now-playing-card").style.display = "none";
  }
}

// Initial load and refresh every minute
updateDashboard();
setInterval(updateDashboard, 60000);
