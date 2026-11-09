import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const dir=fileURLToPath(new URL('./artifacts/',import.meta.url));
const reviews=[
 ['desktop-library','Library | visual design 8/10',[
  [535,190,'Clear hierarchy','The heading, study summary and search','form an easy-to-scan starting point.'],
  [800,505,'Useful next action','Each set offers a specific learning CTA','and a readable mastery summary.'],
  [504,658,'Low-priority duplication','Create appears in the header and a large','empty tile. A smaller tile would tighten it.']]],
 ['mobile-library','Mobile library | hierarchy 7/10',[
  [206,270,'Summary takes too much height','Two stacked badges push the first set','to y=450. Use a compact summary row.'],
  [340,485,'Pin meaning is subtle','The icon is small and visually faint.','Give pinning a clearer affordance.'],
  [185,630,'Strong study CTA','The learning action is easy to spot.','Keep this visual priority.']]],
 ['mobile-flashcards','Flashcards | mobile usability 6.5/10',[
  [360,154,'Last mode is clipped','Match is partially outside the tab bar.','Fit four tabs or signal horizontal scroll.'],
  [192,454,'Desktop wording on touch','The hint says Click or press Space.','Use Tap to flip on touch devices.'],
  [74,518,'Tools lose visible labels','Options, Shuffle and Fullscreen become','icons. Add labels or a labelled menu.']]],
 ['mobile-match-active','Match | mobile gameplay 6/10',[
  [195,580,'Board exceeds the viewport','All 12 tiles span roughly 830px below','the nav. Timed play requires scrolling.'],
  [342,105,'Timer scrolls out of view','The timer is above the board. Keep it','visible while the player scans tiles.'],
  [110,255,'Generous tap targets','Tiles are easy to hit, but a shorter','mobile tile height would reduce scrolling.']]],
 ['mobile-create','Create | form efficiency 6.5/10',[
  [190,190,'Title has no persistent label','The example is truncated on mobile.','Add a visible Title label and short hint.'],
  [183,530,'Blank cards are oversized','Three empty rows make a long form.','Compact empty inputs and expand on typing.'],
  [302,1287,'Save is available twice','The sticky top Create button helps.','Use Create set consistently at both ends.']]],
 ['mobile-learn-active','Learn | task clarity 8/10',[
  [192,366,'Focused learning prompt','The term and round count are clear.','The question stays visually central.'],
  [192,543,'Comfortable answer buttons','Large choices and generous spacing','make answering easy on touch.'],
  [190,152,'Header consumes study space','Back link, answer direction, tabs and','mastery take about 230px before content.']]],
];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
for(const [file,title,notes] of reviews){
 const {width:w,height:h}=await sharp(`${dir}${file}.png`).metadata();
 const panel=480, height=Math.max(h,650);
 let svg=`<svg width="${w+panel}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="${w}" width="${panel}" height="${height}" fill="#111827"/><text x="${w+28}" y="46" fill="white" font-family="Arial" font-size="19" font-weight="bold">${esc(title)}</text><text x="${w+28}" y="78" fill="#a5b4fc" font-family="Arial" font-size="14">Recall UI review | sample-data preview</text>`;
 notes.forEach(([x,y,label,...lines],i)=>{
  const cy=135+i*155;
  svg+=`<circle cx="${x}" cy="${y}" r="15" fill="#f43f5e" stroke="white" stroke-width="3"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="15">${i+1}</text><circle cx="${w+40}" cy="${cy}" r="14" fill="#f43f5e"/><text x="${w+40}" y="${cy+5}" text-anchor="middle" fill="white" font-family="Arial" font-size="15">${i+1}</text><text x="${w+66}" y="${cy+5}" fill="white" font-family="Arial" font-size="17" font-weight="bold">${esc(label)}</text>`;
  lines.forEach((line,j)=>svg+=`<text x="${w+28}" y="${cy+40+j*23}" fill="#d1d5db" font-family="Arial" font-size="16">${esc(line)}</text>`);
 });
 svg+=`<text x="${w+28}" y="${height-28}" fill="#9ca3af" font-family="Arial" font-size="13">Numbered markers reference the original capture.</text></svg>`;
 await sharp({create:{width:w+panel,height,channels:4,background:'#f6f7fb'}}).composite([{input:await sharp(`${dir}${file}.png`).toBuffer(),left:0,top:0},{input:Buffer.from(svg),left:0,top:0}]).png().toFile(`${dir}${file}-annotated.png`);
}
console.log('Annotated six screenshots.');
