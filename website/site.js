const yearNode = document.querySelector("#current-year");

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}
