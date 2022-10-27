export function getMetadata(backendUrl, streamUrl, onUpdate) {
  setInterval(() => {
    fetch(`${backendUrl}/metadata?streamUrl=${encodeURIComponent(streamUrl)}`)
      .then((res) => {
        return res.json();
      })
      .then((res) => {
        onUpdate(res.streamTitle);
      })
      .catch((err) => {
        console.error("Error getting metadata", err);
      })
  }, 5000);
}