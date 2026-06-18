// Shared browser download / clipboard helpers used by every app's export flow.

export function downloadTextFile(fileName, value) {
  const blob = new Blob([value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function copyText(value) {
  navigator.clipboard?.writeText(value);
}
