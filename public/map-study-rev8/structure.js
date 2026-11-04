// A single shared hall/lobby edge drives both fills and its interrupted wall.
const STRUCTURE={
 edge:[[234,300],[526,300],[605,300],[900,300],[977,300],[1270,300],[1355,300],[1380,300],[1695,410]],
 gaps:[[526,605],[900,977],[1270,1355]],
 // Outer lobby/corridor contour runs from the shared edge's east end back to its west end.
 exterior:'L1695 390L1600 325L1427 280V208Q930 130 252 132H202V150H32L30 216L54 218L38 810H92V835H115V810H175V835H198V380L216 345L234 300',
 hallRemainder:'V835H1645V1095H1800V1082H1828V1125L1870 1168H1917V1508H936V1270H1064V1111H995V835H198V380L216 345Z'
};
function structureGeometry(expansion=1){
 const e=STRUCTURE.edge,edgePath=e.map((p,i)=>(i?'L':'M')+p.join(' ')).join('');
 const lobby=edgePath+STRUCTURE.exterior+'Z',hall=edgePath+STRUCTURE.hallRemainder;
 const walls=[];
 for(let i=1;i<e.length;i++)if(!STRUCTURE.gaps.some(g=>e[i-1][0]===g[0]&&e[i][0]===g[1]))walls.push('M'+e[i-1].join(' ')+'L'+e[i].join(' '));
 walls.push('M'+e[e.length-1].join(' ')+STRUCTURE.exterior);
 const thresholds=STRUCTURE.gaps.map(([a,b])=>{const c=(a+b)/2,y=300+15/expansion,depth=12/expansion;return 'M'+(c-24)+' '+y+'L'+(c-18)+' '+(y+depth)+'H'+(c+18)+'L'+(c+24)+' '+y});
 return {edgePath,lobby,hall,walls,thresholds};
}
if(typeof module!=='undefined')module.exports={STRUCTURE,structureGeometry};
