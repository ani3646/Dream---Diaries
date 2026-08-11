window.addEventListener("load", () => {

    const map = L.map("map");

    map.setView([coordinates[1], coordinates[0]], 10);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.marker([coordinates[1], coordinates[0]])
        .addTo(map)
        .bindPopup(listingTitle);

    setTimeout(() => {
        map.invalidateSize();
    }, 500);

});
