import { createQrCanvas } from './tongxue-share-qr-v113.js';
const W=1080,H=3600,BOTTOM=3380;
export async function generateShareAssets(model,variant='featured'){
  if(document.fonts?.ready)await document.fonts.ready.catch(()=>{});
  const qr=await createQrCanvas(model.shareUrl).catch(()=>null);
  const writer=new Writer(model);
  if(model.mode==='ai_summary')model.groups.forEach(group=>writer.summary(group));
  else (variant==='full'?model.reviews:model.reviews.slice(0,3)).forEach((review,index)=>writer.review(review,index+1));
  writer.footer(model.shareUrl,qr);
  const canvases=writer.finish(),blobs=[];
  for(const canvas of canvases)blobs.push(await toBlob(canvas));
  const base=safeName(model.school);
  const files=blobs.map((blob,index)=>new File([blob],`同学你好-${base}${blobs.length>1?`-${index+1}`:''}.png`,{type:'image/png'}));
  return {blobs,files,urls:blobs.map(blob=>URL.createObjectURL(blob)),variant};
}
class Writer{
  constructor(model){this.model=model;this.pages=[];this.page();}
  page(){this.canvas=document.createElement('canvas');this.canvas.width=W;this.canvas.height=H;this.ctx=this.canvas.getContext('2d',{alpha:false});this.ctx.fillStyle='#f6f8f7';this.ctx.fillRect(0,0,W,H);this.y=58;this.header();}
  header(){const c=this.ctx;c.fillStyle='#155e75';c.font=font(30,850);c.fillText('同学你好',72,this.y);this.y+=72;c.fillStyle='#17242d';c.font=font(64,900);for(const line of wrap(c,this.model.school,900).slice(0,2)){c.fillText(line,72,this.y);this.y+=78;}c.fillStyle='#60717a';c.font=font(27,600);c.fillText(this.model.mode==='ai_summary'?'来源站 AI 摘要':'近期公开评论',72,this.y);this.y+=50;if(this.model.meta.length){c.font=font(25,600);for(const line of wrap(c,this.model.meta.join('　'),900)){c.fillText(line,72,this.y);this.y+=38;}}this.y+=22;}
  ensure(height){if(this.y+height<=BOTTOM)return;this.crop();this.page();}
  summary(group){
    const c=this.ctx;c.font=font(31,500);const lines=[];
    for(const item of group.items){wrap(c,item,820).forEach((line,index)=>lines.push((index?'　':'• ')+line));lines.push('');}
    split(lines,42).forEach((part,index)=>{const visible=part.at(-1)===''?part.slice(0,-1):part;const height=106+visible.length*48;this.ensure(height+30);const top=this.y;c.fillStyle=group.attention?'#fff6ed':'#fff';rounded(c,58,top,964,height,28);c.fill();c.strokeStyle=group.attention?'#f0d4bc':'#dce6e2';c.lineWidth=2;c.stroke();c.fillStyle=group.attention?'#8d4b20':'#155e75';c.font=font(31,900);c.fillText(group.title+(index?'（续）':''),94,top+58);let y=top+108;c.fillStyle='#17242d';c.font=font(31,500);for(const line of visible){if(line)c.fillText(line,96,y);y+=48;}this.y=top+height+30;});
  }
  review(item,number){const c=this.ctx;c.font=font(31,500);const chunks=split(wrap(c,item.content,820),34);chunks.forEach((lines,part)=>{const tags=item.tags.join(' · '),extra=(item.rating?1:0)+(item.dimensions.length?1:0)+(item.social.length?1:0),height=150+lines.length*48+(tags?42:0)+extra*42;this.ensure(height+28);const top=this.y;c.fillStyle='#fff';rounded(c,58,top,964,height,28);c.fill();c.strokeStyle='#dce6e2';c.lineWidth=2;c.stroke();c.fillStyle='#155e75';c.font=font(30,900);c.fillText(`${number}. ${item.author}${part?'（续）':''}`,94,top+58);c.fillStyle='#60717a';c.font=font(23,600);c.textAlign='right';c.fillText(item.date||'',986,top+56);c.textAlign='left';let y=top+100;if(tags){c.fillText(tags,94,y);y+=42;}c.fillStyle='#17242d';c.font=font(31,500);for(const line of lines){c.fillText(line,94,y);y+=48;}c.fillStyle='#8d4b20';c.font=font(24,700);if(item.rating){c.fillText(`体验评分 ${item.rating} / 5.0`,94,y);y+=42;}c.fillStyle='#60717a';c.font=font(23,600);if(item.dimensions.length){c.fillText(item.dimensions.join('　'),94,y);y+=42;}if(item.social.length)c.fillText(item.social.join('　'),94,y);this.y=top+height+28;});}
  footer(url,qr){const height=qr?340:230;this.ensure(height);const c=this.ctx,top=this.y+8;c.strokeStyle='#dce6e2';c.beginPath();c.moveTo(72,top);c.lineTo(1008,top);c.stroke();c.fillStyle='#60717a';c.font=font(24,600);let y=top+62;const note='内容来自公开评价整理，反映部分评论者的个人体验，不代表学校官方结论。请结合招生章程、培养方案和官方就业信息判断。';for(const line of wrap(c,note,qr?690:900)){c.fillText(line,72,y);y+=38;}c.fillStyle='#155e75';c.font=font(23,750);for(const line of wrap(c,url,qr?690:900)){c.fillText(line,72,y);y+=34;}if(qr){c.drawImage(qr,790,top+38,190,190);c.fillStyle='#60717a';c.font=font(20,600);c.fillText('扫码查看最新内容',790,top+250);}this.y=top+height;}
  crop(){const height=Math.max(1350,Math.min(H,Math.ceil(this.y+70))),out=document.createElement('canvas');out.width=W;out.height=height;out.getContext('2d',{alpha:false}).drawImage(this.canvas,0,0,W,height,0,0,W,height);this.pages.push(out);}
  finish(){this.crop();const total=this.pages.length;this.pages.forEach((canvas,index)=>{const c=canvas.getContext('2d');c.fillStyle='#60717a';c.font=font(23,700);c.textAlign='right';c.fillText(`${index+1}/${total}`,1008,62);c.textAlign='left';});return this.pages;}
}
function wrap(ctx,text,max){const value=String(text||'').replace(/\s+/g,' ').trim();if(!value)return[];const lines=[];let line='';for(const char of value){const next=line+char;if(line&&ctx.measureText(next).width>max){lines.push(line);line=char;}else line=next;}if(line)lines.push(line);return lines;}
function split(items,size){const out=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out.length?out:[[]];}
function font(size,weight=500){return `${weight} ${size}px -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif`;}
function rounded(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function toBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG failed')),'image/png'));}
function safeName(value){return String(value||'学校体验').replace(/[\\/:*?"<>|]/g,'').slice(0,40)||'学校体验';}
