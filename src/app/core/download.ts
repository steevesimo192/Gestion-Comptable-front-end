/**
 * Petits utilitaires navigateur : télécharger un texte et lire un fichier choisi par l'utilisateur.
 * Ils ne lèvent jamais d'exception : l'appelant reçoit `false` ou un texte vide.
 */

/** Télécharge un texte (CSV par défaut). Un BOM est ajouté pour qu'Excel lise bien les accents. */
export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8'): boolean {
  try {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
    const blob = new Blob(['\uFEFF' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

function readAs(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Lecture impossible'));
    reader.readAsText(file, encoding);
  });
}

/** Lit un fichier texte en UTF-8 ; si des accents sont abîmés, le relit en Windows-1252 (fréquent dans les exports de banque). */
export async function readTextFile(file: File): Promise<string> {
  const utf8 = await readAs(file, 'utf-8');
  return utf8.includes('\uFFFD') ? readAs(file, 'windows-1252') : utf8;
}
