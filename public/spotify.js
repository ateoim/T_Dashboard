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
    // Recently played
    const recentData = await fetchSpotifyData(
      "me/player/recently-played?limit=3"
    );
    console.log("Recent tracks response:", recentData);

    const recentTracks = document.getElementById("recent-tracks");
    if (recentData?.items) {
      const tracks = recentData.items
        .map((item) => `${item.track.name} - ${item.track.artists[0].name}`)
        .join("<br>");
      recentTracks.innerHTML = tracks;
    } else {
      recentTracks.innerHTML = "Error loading recent tracks";
      console.error("Recent tracks data:", recentData);
    }

    // Top artists
    const artistData = await fetchSpotifyData(
      "me/top/artists?limit=3&time_range=short_term"
    );
    console.log("Top artists response:", artistData);

    const topArtists = document.getElementById("top-artists");
    if (artistData?.items) {
      const artists = artistData.items
        .map((artist) => artist.name)
        .join("<br>");
      topArtists.innerHTML = artists;
    } else {
      topArtists.innerHTML = "Error loading top artists";
      console.error("Top artists data:", artistData);
    }

    // Update timestamp
    document.getElementById(
      "last-updated"
    ).textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error("Dashboard update error:", error);
  }
}

// Initial load and refresh every minute
updateDashboard();
setInterval(updateDashboard, 60000);
