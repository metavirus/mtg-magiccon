function fitNeighborhoodFrame([x,y,w,minHeight=0],viewport){const h=Math.max(minHeight,w*viewport.height/viewport.width),width=h*viewport.width/viewport.height;return [x-(width-w)/2,y,width,h]}
function destinationFrame(p){return [p.kind==='lobby'?Math.min(760,p.x-250):p.x+p.width/2-340,Math.max(0,p.y*2.3-400),680,930]}
if(typeof module!=='undefined')module.exports={fitNeighborhoodFrame,destinationFrame};
