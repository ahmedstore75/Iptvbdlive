const video=
document.getElementById(
"video"
);

const list=
document.getElementById(
"channelList"
);

let current=null;

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

const logo=
(
lines[i]
.match(
/tvg-logo="([^"]+)"/
)||[]
)[1];

const name=
lines[i]
.split(",")
.pop();

const url=
lines[i+1];

create(
name,
logo,
url
);

}

}

});

function create(
name,
logo,
url
){

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
logo||
'logo.png'
}">

<div>

${name}

</div>
`;

card.onclick=
()=>{

play(
url
);

document
.querySelectorAll(
".card"
)

.forEach(

x=>

x.classList
.remove(
"active"
)

);

card
.classList
.add(
"active"
);

};

list
.appendChild(
card
);

if(
!current
){

current=
card;

card
.classList
.add(
"active"
);

play(
url
);

}

}

function play(
url
){

if(
Hls
.isSupported()
){

const hls=
new Hls();

hls
.loadSource(
url
);

hls
.attachMedia(
video
);

}else{

video.src=
url;

}

}
