const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

let rockets = [];
let particles = [];

class Particle {
  constructor(x, y, dx, dy, life, color, size=2) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.life = life;
    this.color = color;
    this.size = size;
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
    this.dy += 0.05;
    this.life--;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
    ctx.fillStyle = `hsla(${this.color},100%,60%,${this.life/100})`;
    ctx.fill();
  }
}

class Rocket {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height;
    this.target = Math.random() * canvas.height * 0.5;
    this.color = Math.random() * 360;
    this.trail = [];
  }

  update() {
    this.trail.push({x:this.x, y:this.y});
    if (this.trail.length > 6) this.trail.shift();

    this.y -= 5;

    this.trail.forEach((t,i) => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 1.5, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${this.color},100%,70%,${i/this.trail.length})`;
      ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI*2);
    ctx.fillStyle = "white";
    ctx.fill();
  }
}

function explodeNormal(x,y,color){
  for(let i=0;i<80;i++){
    particles.push(new Particle(
      x,y,
      (Math.random()-0.5)*5,
      (Math.random()-0.5)*4,
      80,
      color
    ));
  }
}

function explodeStar(x,y){
  for(let angle=0; angle<360; angle+=30){
    let rad = angle * Math.PI/180;
    for(let s of [2,3]){
      particles.push(new Particle(
        x,y,
        Math.cos(rad)*s,
        Math.sin(rad)*s,
        120,
        60,
        2.5
      ));
    }
  }
}

function animate(){
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if(Math.random()<0.25){
    rockets.push(new Rocket());
  }

  rockets = rockets.filter(r=>{
    r.update();

    if(r.y <= r.target){
      if(Math.random()<0.75){
        explodeNormal(r.x,r.y,r.color);
      } else {
        explodeStar(r.x,r.y);
      }
      return false;
    }
    return true;
  });

  particles = particles.filter(p=>{
    p.update();
    p.draw();
    return p.life > 0;
  });

  requestAnimationFrame(animate);
}

animate();