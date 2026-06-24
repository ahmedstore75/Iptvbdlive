const video =
document.getElementById("video");

const list =
document.getElementById("channelList");

const buttons =
document.querySelectorAll(
".category button"
);

let channels=[];

fetch(
"mixiptvchannel.m3u"
)

.then(
r=>r.text()
)

.then(data=>{

const lines=
data.split("\n");

for(
let i=0;
i<lines.length;
i++
){

if(
lines[i]
.startsWith(
"#EXTINF"
)
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

const group=
(
info.match(
/group-title="([^"]+)"/
)||[]
)[1]||
"ALL";

channels.push({

name,

logo,

group,

url:
lines[i+1]

});

}

}

render(
channels
);

play(
channels[0].url
);

});

function render(data){

list.innerHTML="";

data.forEach(ch=>{

const card=
document.createElement(
"div"
);

card.className=
"card";

card.innerHTML=

`
<img
src="${
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

});

}

buttons.forEach(
btn=>{

btn.onclick=()=>{

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
channels
);

}else{

render(

channels.filter(
x=>

x.group
===cat

)

);

}

};

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
