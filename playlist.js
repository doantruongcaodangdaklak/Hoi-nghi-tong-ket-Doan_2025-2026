
const playlist = [
  {
    title: "Bài nhạc 1",
    src: "./media/music/bai-01.mp3"
  },
  {
    title: "Bài nhạc 2",
    src: "./media/music/bai-02.mp3"
  },
  {
    title: "Bài nhạc 3",
    src: "./media/music/bai-03.mp3"
  }
];

let currentTrack = 0;

const audio = document.getElementById("conference-audio");
const title = document.getElementById("music-title");
const playButton = document.getElementById("music-play");
const nextButton = document.getElementById("music-next");
const prevButton = document.getElementById("music-prev");

function loadTrack(index, autoPlay = false) {
  currentTrack = (index + playlist.length) % playlist.length;
  audio.src = playlist[currentTrack].src;
  title.textContent = playlist[currentTrack].title;

  if (autoPlay) {
    audio.play().catch(() => {
      title.textContent =
        playlist[currentTrack].title + " — hãy bấm Phát nhạc";
    });
  }
}

playButton.addEventListener("click", () => {
  if (audio.paused) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
});

nextButton.addEventListener("click", () => {
  loadTrack(currentTrack + 1, true);
});

prevButton.addEventListener("click", () => {
  loadTrack(currentTrack - 1, true);
});

audio.addEventListener("ended", () => {
  loadTrack(currentTrack + 1, true);
});

audio.addEventListener("play", () => {
  playButton.textContent = "Tạm dừng";
});

audio.addEventListener("pause", () => {
  playButton.textContent = "Phát nhạc";
});

loadTrack(0);
