// Static, non-sensitive preference bootstrap runs before first paint.
export const appearanceScript = `(function(){try{var p=localStorage.getItem('whizz-appearance-v1');document.documentElement.classList.toggle('dark',p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))}catch(e){}})()`;
