export function drawVeteranGrade(g,u,p,size,settings){
  const rank=u.veteranRank||0;if(!rank)return;
  const grade=settings.grades[rank-1];g.save();g.strokeStyle=grade.color;g.lineWidth=1.5;g.globalAlpha=.85;
  g.beginPath();g.ellipse(p.px,p.py,size*.52,size*.20,0,0,Math.PI*2);g.stroke();
  const x=p.px-size*.62,y=p.py-size*.45;
  g.strokeStyle='#101923';g.lineWidth=4;
  for(let i=0;i<rank;i++){g.beginPath();g.moveTo(x-3,y-i*5);g.lineTo(x,y-3-i*5);g.lineTo(x+3,y-i*5);g.stroke();}
  g.strokeStyle=grade.color;g.lineWidth=2;
  for(let i=0;i<rank;i++){g.beginPath();g.moveTo(x-3,y-i*5);g.lineTo(x,y-3-i*5);g.lineTo(x+3,y-i*5);g.stroke();}g.restore();
}
