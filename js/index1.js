// 百度地图API功能
let bMap = new BMap.Map("map");    // 创建Map实例,
bMap.centerAndZoom(new BMap.Point(121.57613, 38.872458), 11);  // 初始化地图,设置中心点坐标和地图级别
bMap.enableScrollWheelZoom(true);     //开启鼠标滚轮缩放

// L地图API
let map = new L.Map('map');

const tickLen = 250;//ms
const speed = 1;
let playbackOptions = {
    tickLen: tickLen,
    speed: speed,
    orientIcons:true,
};

let playbackData = {
    "type": "Feature",
    "icon":"images/normalboat2.png",
    "geometry": {
        "type": "LineString",
        "coordinates": []
    },
    "properties": {
        "time": [],
    }
};

//假数据
let demo = [
    {
        utc_time: 1502329141000,
        latlng: [38.872458, 121.57613],
    }, {
        utc_time: 1502329541001,
        latlng: [38.772458, 121.67613],
    }, {
        utc_time: 1502329941002,
        latlng: [38.372458, 121.77613],
    }, {
        utc_time: 1502329961002,
        latlng: [38.172458, 121.27613],
    }, {
        utc_time: 1502329981002,
        latlng: [38.272458, 121.17613],
    },
];

for (let i = 0, len = demo.length; i < len; i++) {
    let latlng = demo[i].latlng;
    playbackData.geometry.coordinates.push([latlng[1], latlng[0]]);
    playbackData.properties.time.push(demo[i].utc_time);
}

let playback = new L.Playback(map, playbackData, null, playbackOptions);
let control = new L.Playback.Control(playback);//下面控件
control.addTo(map);