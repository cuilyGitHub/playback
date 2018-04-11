/**
 * Created by liyz on 2017/11/22.
 */

var x_pi = 3.14159265358979324 * 3000.0 / 180.0;
var pi = 3.1415926535897932384626
var a = 6378245.0;
var ee = 0.00669342162296594323;

function transformlat(lng , lat) {
    var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * pi) + 20.0 * Math.sin(2.0 * lng * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * pi) + 40.0 * Math.sin(lat / 3.0 * pi)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * pi) + 320 * Math.sin(lat * pi / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformlng(lng , lat) {
    var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * pi) + 20.0 * Math.sin(2.0 * lng * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * pi) + 40.0 * Math.sin(lng / 3.0 * pi)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * pi) + 300.0 * Math.sin(lng / 30.0 * pi)) * 2.0 / 3.0;
    return ret;
}

function outOfChina(lng , lat) {
    if(lng < 72.004 || lng > 137.8347) {
        return true;
    } else if(lat < 0.8293 || lat > 55.8271) {
        return true;
    }
    return false;
}

//WGS84转GCJ02(火星坐标系  中国坐标系)
function wgs84Togcj02(lng , lat) {
    if(outOfChina(lng , lat)) {
        return {lng : lng , lat : lat}
    }
    var dlat = transformlat(lng - 105.0, lat - 35.0);
    var dlng = transformlng(lng - 105.0, lat - 35.0);
    var radlat = lat / 180.0 * pi;
    var magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    var sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * pi);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * pi);
    var mglat = lat + dlat;
    var mglng = lng + dlng;
    return { lng : mglng , lat : mglat};

}



//GCJ02(火星坐标系)转GPS84
function gcj02Towgs84(lng , lat) {
    if(outOfChina(lng , lat)) {
        return {lng : lng , lat : lat}
    }
    var dlat = transformlat(lng - 105.0, lat - 35.0);
    var dlng = transformlng(lng - 105.0, lat - 35.0);
    var radlat = lat / 180.0 * pi;
    var magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    var sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * pi);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * pi);
    var mglat = lat + dlat;
    var mglng = lng + dlng;
    return  { lng : lng * 2 - mglng, lat : lat * 2 - mglat };
}



//高德转百度
function gdTobd(lng, lat){
    var x = lng, y = lat;
    var z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * x_pi);
    var theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * x_pi);
    var bd_lon = z * Math.cos(theta) + 0.0065;
    var bd_lat = z * Math.sin(theta) + 0.006;
    return {
        lat: bd_lat,
        lng: bd_lon
    };
}

function bdToowgs84(lng , lat) {
    var gd = bdTogd(lng , lat);
    return gcj02Towgs84(gd['lng'] , gd['lat']);
}

function wgs84Tobd(lng , lat) {
    var gd = wgs84Togcj02(lng ,lat);
    return gdTobd(gd['lng'] , gd['lat']);
}

//百度转高德
function bdTogd(lng,lat) {
    var x = lng - 0.0065;
    var y = lat - 0.006;
    var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
    var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
    var gg_lon = z * Math.cos(theta);
    var gg_lat = z * Math.sin(theta);
    return {
        lng: gg_lon,
        lat: gg_lat
    }
}


var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
String.prototype.colorRgb = function(){
    var sColor = this.toLowerCase();
    if(sColor && reg.test(sColor)){
        if(sColor.length === 4){
            var sColorNew = "#";
            for(var i=1; i<4; i+=1){
                sColorNew += sColor.slice(i,i+1).concat(sColor.slice(i,i+1));
            }
            sColor = sColorNew;
        }
        //处理六位的颜色值
        var sColorChange = [];
        for(var i=1; i<7; i+=2){
            sColorChange.push(parseInt("0x"+sColor.slice(i,i+2)));
        }
        return sColorChange;
    }else{
        return sColor;
    }
};


