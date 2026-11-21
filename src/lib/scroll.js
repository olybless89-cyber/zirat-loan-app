export function scrollToSection(id) {
  if (typeof document === 'undefined') return;
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
