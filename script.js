const video=
document.getElementById("video");

const list=
document.getElementById("channelList");

fetch("mixiptvchannel.m3u")

.then(r=>r.text())

.then(data=>{

const lines=
data.split("\n");

let channels=[];

for(
let i=0;
i<lines.length;
i++
){

if(
lines[i]
.startsWith("#EXTINF")
){

const info=
lines[i];

const name=
info.split(",").pop();

const logo=
(
info.match(
/tvg-logo="([^"]+)"/
)||[]
)[1];

const url=
lines[i+1];

channels.push({

name,

logo,

url

});

}

}

channels.forEach(
(ch,index)=>{

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
'logo.png'
}">

<div>

${ch.name}

</div>

`;

card.onclick=
()=>play(
ch.url
);

list.appendChild(
card
);

if(index===0){

play(
ch.url
);

}

});

});

function play(url){

if(
Hls.isSupported()
){

const hls=
new Hls();

hls.loadSource(
url
);

hls.attachMedia(
video
);

}else{

video.src=
url;

}

}
