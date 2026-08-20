// Corre ANTES del primer paint, sincrónico y sin React: si el tema se
// aplicara desde un useEffect, la página parpadearía en oscuro antes de
// pasar a claro en cada carga. Por eso va inline y no como módulo.
//
// Si nunca eligió, respeta la preferencia del sistema.
const script = `
(function () {
  try {
    var t = localStorage.getItem('kayroz-theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
