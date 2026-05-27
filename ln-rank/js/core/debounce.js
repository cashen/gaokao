export function debounce(fn, wait=300){let t=null;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)}}
