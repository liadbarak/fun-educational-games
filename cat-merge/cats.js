/* Original, code-drawn cat portraits. Shared geometry, twelve distinct personalities. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CatMergeArt=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const coats=['#ffd4b3','#f5b871','#bacbdd','#f3e8fb','#ead9c6','#daa875','#b8a5ee','#f5c473','#b5e3e3','#8b91df','#ffad86','#f8d3ea'];
  const extras=[
    '<path d="M46 30q4-9 9-6" fill="none"/>',
    '<path d="m34 36 5 9m10-15 2 13m11-7-3 9" stroke="#ad714a"/><path d="M66 81q12-12 14-2" fill="none" stroke="#de9070"/>',
    '<circle cx="40" cy="55" r="12" fill="#fff" opacity=".6"/><path d="M34 49h8m-4-4v8" stroke="#7b9db6"/>',
    '<path d="m24 44-8 6 6 5-7 7 9 3-4 9 12-2m44-28 8 6-6 5 7 7-9 3 4 9-12-2" fill="#f3e8fb" stroke="#d4bedf"/>',
    '<path d="m39 79-12-7v17l12-5m22-5 12-7v17l-12-5" fill="#a36caf"/><circle cx="50" cy="81" r="5" fill="#845496"/><path d="M57 55h16" stroke="#bf9152"/><circle cx="62" cy="56" r="10" fill="none" stroke="#bf9152"/>',
    '<path d="M24 40h52l-8-14H35z" fill="#769e7d"/><path d="m32 80 31 3-4 13-13-13" fill="#e07e62"/><path d="M24 38h53" stroke="#476c57" stroke-width="5"/>',
    '<path d="m28 35 26-31 16 32z" fill="#7762bb"/><path d="M21 37q29-10 58 0" stroke="#7762bb" stroke-width="7"/><path d="m51 16 2 4 5 1-4 3v5l-4-3-4 1 2-5-3-3z" fill="#ffe69c" stroke="none"/><path d="m27 79 24 11 23-11" fill="#8c73c7"/>',
    '<path d="m29 33-4-18 15 9L50 9l10 15 15-9-4 18z" fill="#f4cf64" stroke="#bb8939"/><circle cx="50" cy="26" r="4" fill="#dc6f92"/><path d="m26 78 24 10 24-10-5 15H31z" fill="#b66ba4"/>',
    '<path d="M66 7a11 11 0 1 0 12 17A11 11 0 0 1 66 7" fill="#f8e4aa" stroke="none"/><path d="M29 81q21 16 42 0" fill="none" stroke="#7abcb9" stroke-width="6"/><circle cx="50" cy="34" r="4" fill="#fcf1bd"/>',
    '<ellipse cx="50" cy="58" rx="46" ry="15" transform="rotate(-22 50 58)" fill="none" stroke="#e5bddf" stroke-width="4"/><path d="m50 26 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#f8e6a2" stroke="none"/><circle cx="20" cy="22" r="3" fill="#fff"/><circle cx="83" cy="37" r="3" fill="#fff"/>',
    '<path d="M26 66Q4 48 9 23q8 11 15 8L18 17q16 9 18 31m38 18q22-18 17-43-8 11-15 8l6-14Q66 26 64 48" fill="#f5c365" stroke="#dc855a"/><path d="m42 31 7-19 9 20" fill="#f5c365" stroke="#dc855a"/>',
    '<path d="m19 50-8-14 14 4m50 0 14-4-8 14" fill="#b8ccea"/><ellipse cx="50" cy="16" rx="20" ry="7" fill="none" stroke="#d5ab63" stroke-width="4"/><path d="m50 27 4 7 8 2-6 6 1 8-7-4-7 4 1-8-6-6 8-2z" fill="#fff5c9" stroke="none"/><path d="M25 82q25 21 50 0" fill="none" stroke="#c3a2dc" stroke-width="6"/>'
  ];
  function svg(level,locked=false){
    if(locked)return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 48 20 22l23 13q7-2 14 0l23-13-2 26q12 42-28 42T22 48" fill="#d2cedf"/><text x="50" y="70" text-anchor="middle" font-size="29" fill="#706b85" font-family="sans-serif">?</text></svg>';
    const c=coats[level-1];
    return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><ellipse cx="50" cy="91" rx="29" ry="4" fill="#453b63" opacity=".10"/><g stroke="#665371" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M23 48 21 23q12 1 22 13 7-3 14 0 10-12 22-13l-2 25q13 40-27 40T23 48" fill="${c}"/><path d="m26 30 3 17 10-8m22 0 10 8 3-17" fill="#ed9fa7" stroke="none"/><ellipse cx="35" cy="66" rx="7" ry="4" fill="#ee9b9f" opacity=".6" stroke="none"/><ellipse cx="65" cy="66" rx="7" ry="4" fill="#ee9b9f" opacity=".6" stroke="none"/>${level===4||level===9?'<path d="m33 57 4-3 4 3m18 0 4-3 4 3" fill="none" stroke-width="2.8"/>':'<ellipse cx="37" cy="57" rx="3.5" ry="5" fill="#44394f" stroke="none"/><ellipse cx="63" cy="57" rx="3.5" ry="5" fill="#44394f" stroke="none"/><circle cx="38" cy="55" r="1.2" fill="white" stroke="none"/><circle cx="64" cy="55" r="1.2" fill="white" stroke="none"/>'}<path d="m47 65 3 3 3-3z" fill="#ab6b86" stroke="none"/><path d="M50 68v3q-5 5-8 0m8 0q5 5 8 0M20 63l8 2m-9 5 9-1m52-6-8 2m9 5-9-1" fill="none"/>${extras[level-1]}</g></svg>`;
  }
  return {svg,coats};
});
