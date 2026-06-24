const video =
document.getElementById("video");

const list =
document.getElementById("channelList");

const buttons =
document.querySelectorAll(
".category button"
);

let allChannels=[];

let hls=null;

fetch("mixiptvchannel.m3u")

.then(r=>r.text())

.then(data=>{

const lines=
data.split("\n");

for(let i=0;i<lines.length;i++){

if(
lines[i]
.startsWith(
"#EXTINF"
)
){

const info=
lines[i];

const name=
info
.split(",")
.pop();

const logo=
(
info.match(
/tvg-logo="([^"]+)"/
)||[]
)[1];

const group=
(
info.match(
/group-title="([^"]+)"/
)||[]
)[1]
||
"ALL";

const url=
lines[i+1];

if(url){

allChannels.push({

name,

logo,

group,

url

});

}

}

}

render(
allChannels
);

});

function render(data){

list.innerHTML="";

data.forEach((ch)=>{

const card=
document.createElement(
"div"
);

card.className=
"card";

card.innerHTML=

`
<img src="${
ch.logo||
"logo.png"
}">

<div>

${ch.name}

</div>
`;

card.onclick=
()=>{

document
.querySelectorAll(
".card"
)

.forEach(
x=>
x.classList.remove(
"active"
)
);

card.classList.add(
"active"
);

play(
ch.url
);

};

list.appendChild(
card
);

});

}

buttons.forEach(
btn=>{

btn.onclick=
()=>{

buttons.forEach(
b=>
b.classList.remove(
"active"
)
);

btn.classList.add(
"active"
);

const cat=
btn.innerText;

if(
cat==="ALL"
){

render(
allChannels
);

}else{

render(

allChannels.filter(
x=>

x.group
.toUpperCase()

.includes(
cat
)

)

);

}

};

});

function play(url){

if(hls){

hls.destroy();

hls=null;

}

if(
Hls.isSupported()
){

hls=
new Hls();

hls.loadSource(
url.trim()
);

hls.attachMedia(
video
);

hls.on(
Hls.Events.MANIFEST_PARSED,

()=>{

video.play();

}

);

}else{

video.src=
url;

video.play();

}

}
