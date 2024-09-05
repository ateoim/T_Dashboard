// Define your Spotify app details
const client_id = "e2e15c5deef14339b504d97037b8abe3"; // Replace with your Spotify Client ID
const redirect_uri = "https://ateoim.github.io/T_Dashboard/index.html";
const scopes =
  "user-read-recently-played user-top-read user-modify-playback-state streaming playlist-modify-public playlist-modify-private";
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
    const topArtistsDiv = document.getElementById("topArtists");

    if (artists.length === 0) {
      topArtistsDiv.innerHTML = "<p>No top artists found</p>";
      return;
    }

    artists.forEach((artist) => {
      const artistElement = document.createElement("div");
      artistElement.className = "artist-item";
      if (artist.topTrack) {
        artistElement.innerHTML = `
            <img src="${artist.images[0].url}" alt="${artist.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px;">
            <div class="artist-info" style="margin-left: 5px;">
              <p>${artist.name}</p>
              <p style="font-size: 0.8em; color: #b3b3b3;">Top track: ${artist.topTrack.name}</p>
            </div>
            <button onclick="playSong('${artist.topTrack.uri}')">Play</button>
          `;
      } else {
        artistElement.innerHTML = `
            <img src="${artist.images[0].url}" alt="${artist.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px;">
            <div class="artist-info" style="margin-left: 5px;">
              <p>${artist.name}</p>
              <p style="font-size: 0.8em; color: #b3b3b3;">No top track found</p>
            </div>
          `;
      }
      topArtistsDiv.appendChild(artistElement);
    });
  } catch (error) {
    console.error("Error displaying top artists:", error);
    document.getElementById("topArtists").innerHTML =
      "<p>Error displaying top artists</p>";
  }
};

// Function to display recently played songs
const displayRecentlyPlayed = async () => {
  const songs = await fetchRecentlyPlayed();
  const recentSongsDiv = document.getElementById("recentSongs");

  songs.forEach((song) => {
    const songElement = document.createElement("div");
    songElement.className = "song-item";
    songElement.innerHTML = `
        <img src="${song.track.album.images[0].url}" alt="${
      song.track.name
    }" style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px;">
        <div class="song-info" style="margin-left: 5px;">
          <p>${song.track.name}</p>
          <p style="font-size: 0.8em; color: #b3b3b3;">${song.track.artists
            .map((artist) => artist.name)
            .join(", ")}</p>
        </div>
        <button onclick="playSong('${song.track.uri}')">Play</button>
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
  viewerElement.innerHTML = `
    <iframe src="https://open.spotify.com/embed/playlist/${playlistId}" 
            width="100%" 
            height="380" 
            frameborder="0" 
            allowtransparency="true" 
            allow="encrypted-media">
    </iframe>
  `;
};

// Function to initialize the page
const initializePage = () => {
  displayCollaborationLink();
  embedPlaylistViewer();
};

// Call this function when the page loads
window.onload = initializePage;

// ... rest of your existing code (searchTracks, addToPlaylist, etc.) ...

//

const searchTracks = async (query) => {
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
  const data = await response.json();
  return data.tracks.items;
};

const addToPlaylist = async (playlistId, trackUri) => {
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uris: [trackUri],
    }),
  });
};

const searchAndDisplayTracks = async () => {
  const query = document.getElementById("searchInput").value;
  const tracks = await searchTracks(query);
  const searchResultsDiv = document.getElementById("searchResults");
  searchResultsDiv.innerHTML = "";

  tracks.forEach((track) => {
    const trackElement = document.createElement("div");
    trackElement.className = "track-item";
    trackElement.innerHTML = `
        <p>${track.name} - ${track.artists
      .map((artist) => artist.name)
      .join(", ")}</p>
        <button onclick="addTrackToPlaylist('${
          track.uri
        }')">Add to Playlist</button>
      `;
    searchResultsDiv.appendChild(trackElement);
  });
};

const addTrackToPlaylist = async (trackUri) => {
  const playlistId = "3l4a9oLo9GLIb4bMm0RGZg";
  await addToPlaylist(playlistId, trackUri);
  alert("Track added to the playlist!");
};

// Fetch Spotify data once access token is available
const fetchSpotifyData = () => {
  displayRecentlyPlayed().catch((error) =>
    console.error("Error with recently played", error)
  );
  displayTopArtists().catch((error) =>
    console.error("Error with top artists", error)
  );
};

// Start the app
checkAuth();
