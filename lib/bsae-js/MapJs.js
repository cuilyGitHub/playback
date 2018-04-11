var GMap = function() {
    this.flag = 1;
}
GMap.Map = function(flag , divCss) {
    if(flag != null && flag != undefined && flag != ''){
        GMap.flag = flag;
    }

    if(GMap.flag == 1) {//百度地图
        this.$map = new BDMap(divCss);
    } else if(GMap.flag == 2) {//高德地图
        this.$map = new GDMap(divCss);
    } else if(GMap.flag == 3) {//腾讯地图
        this.$map = new TXMap(divCss);
    } else if(GMap.flag == 4) {//大连海大地图
        this.$map = new HDMap(divCss);
    }

    this.centerAndZoom = function (lng , lat , level) {
        this.$map.centerAndZoom(lng , lat , level);
    }

    this.addEventListener = function(operator , callback) {
        this.$map.addEventListener(operator , callback);
    }

    this.removeOverlay = function (staff) {
        if(staff != undefined && staff != null) {
            return this.$map.removeOverlay(staff);
        }
    }

    this.addOverlay = function (staff)  {
        if(staff != undefined && staff != null) {
            return this.$map.addOverlay(staff);
        }
    }

    this.clearOverlays = function() {
        this.$map.clearOverlays();
    }

    this.createPoint = function (lng , lat) {
        return this.$map.createPoint(lng , lat);
    }

    this.setMapDragging = function(bDrag) {
        return this.$map.setMapDragging(bDrag);
    }
    this.getBounds = function() {
        return new GMap.GBounds(this.$map.getBounds());
    }

    this.getZoom = function() {
        return this.$map.getZoom();
    }

    this.getDistance = function(point1 , point2) {
        return this.$map.getDistance(point1 , point2);
    }

    this.getCenter = function() {
        var lng = 0 ;
        var lat = 0 ;
        if(GMap.flag == 1) {//百度地图
            lng = this.$map.getCenter().lng ;
            lat = this.$map.getCenter().lat ;
        } else if(GMap.flag == 2) {//高德地图
            lng = this.$map.getCenter().getLng();
            lat = this.$map.getCenter().getLat();
        } else if(GMap.flag == 3) {//腾讯地图
            lng = this.$map.getCenter().getLng();
            lat = this.$map.getCenter().getLat();
        } else if(GMap.flag == 4) {//大连海大地图
            lng = this.$map.getCenter().lng ;
            lat = this.$map.getCenter().lat ;
        }
        return new GMap.GPoint(lng , lat);
    }

    this.setBounds = function(lng1, lat1, lng2 , lat2) {
        this.$map.setBounds(lng1 ,lat1,lng2,lat2);
    }

    this.getLayer = function() {
        return this.$map.getLayer();
    }

    this.setOptions = function(options) {
        this.$map.setOptions(options);
    }

    this.openInfoWindow = function (infoWindow,lng, lat) {
        infoWindow.getLayer().open(this.$map.$map, new AMap.LngLat(lng , lat));
    }
}


GMap.GCircle = function(tMap , lng , lat , radius , color) {
    if(GMap.flag == 1) {//百度地图
        this.$circle = new BDCircle(tMap , lng , lat , radius , color);
    } else if(GMap.flag == 2) {//高德地图
        this.$circle = new GDCircle(tMap , lng , lat , radius , color);
    } else if(GMap.flag == 3) {//腾讯地图
        this.$circle = new TXCircle(tMap , lng , lat , radius , color);
    } else if(GMap.flag == 4) {//大连海大地图
        this.$circle = new HDCircle(tMap , lng , lat , radius , color);
    }

    this.enableEdit = function(callback) {
        this.$circle.enableEdit(callback);
    }

    this.disenableEdit = function() {
        this.$circle.disenableEdit();
    }

    this.getCenter = function() {
        var lng = 0 ;
        var lat = 0 ;
        if(GMap.flag == 1) {//百度地图
            lng = this.$circle.getCenter().lng ;
            lat = this.$circle.getCenter().lat ;
        } else if(GMap.flag == 2) {//高德地图
            lng = this.$circle.getCenter().getLng();
            lat = this.$circle.getCenter().getLat();
        } else if(GMap.flag == 3) {//腾讯地图
            lng = this.$circle.getCenter().getLng().toFixed(5);
            lat = this.$circle.getCenter().getLat().toFixed(5);
        } else if(GMap.flag == 4) {//大连海大地图
            lng = this.$circle.getCenter().lng ;
            lat = this.$circle.getCenter().lat ;
        }
        return new GMap.GPoint(lng , lat);
    }

    this.setCenter = function(lng , lat) {
        this.$circle.setCenter(lng , lat);
    }

    this.getRadius = function() {
        return this.$circle.getRadius();
    }

    this.setRadius = function(radius) {
        this.$circle.setRadius(radius);
    }

    this.getLayer = function() {
        return this.$circle.getLayer();
    }

    this.addEventListener = function (name , callback)  {
        return this.$circle.addEventListener(name , callback);
    }

    this.getBounds = function() {
        var cirBounds = this.$circle.getBounds();
        return  new GMap.GBounds(cirBounds);
    }
}


GMap.GMarker = function(lng , lat , iconPath) {
    if(GMap.flag == 1) {//百度地图
        this.$marker = new BDMarker(lng , lat , iconPath);
    } else if(GMap.flag == 2) {//高德地图
        this.$marker = new GDMarker(lng , lat ,iconPath);
    } else if(GMap.flag == 3) {//腾讯地图
        this.$marker = new TXMarker(lng , lat ,iconPath);
    } else if(GMap.flag == 4) {//大连海大地图
        this.$marker = new HDMarker(lng , lat ,iconPath);
    }

    this.addEventListener = function(name , callback) {
        this.$marker.addEventListener(name , callback);
    }

    this.setId = function(id) {
        this.$marker.setId(id);
    }

    this.getId = function() {
        return this.$marker.getId();
    }

    this.getLayer = function () {
        return this.$marker.getLayer();
    }

    this.setInfoWindow = function(infoWindow , tMap) {
        this.$marker.setInfoWindow(infoWindow , tMap);
    }

    this.openInfoWindow = function() {
        this.$marker.openInfoWindow();
    }
    this.closeInfoWindow = function() {
        this.$marker.closeInfoWindow();
    }

    this.setPosition = function(lng , lat) {
        this.$marker.setPosition(lng,lat);
    }

    this.setRotation = function(angle) {
        this.$marker.setRotation(angle);
    }


}


GMap.GBounds = function(bounds) {
    if(GMap.flag == 1) {//百度地图
        this.$bounds = new BDBounds(bounds);
    } else if(GMap.flag == 2) {//高德地图
        this.$bounds = new GDBounds(bounds);
    } else if(GMap.flag == 3) {//腾讯地图
        this.$bounds = new TXBounds(bounds);
    } else if(GMap.flag == 4) {//大连海大地图
        this.$bounds = new HDBounds(bounds);
    }


    this.getSouthWest = function() {
        var lng = 0 ;
        var lat = 0 ;
        if(GMap.flag == 1) {//百度地图
            lng = this.$bounds.getSouthWest().lng ;
            lat =this.$bounds.getSouthWest().lat ;
        } else if(GMap.flag == 2) {//高德地图
            lng = this.$bounds.getSouthWest().getLng();
            lat = this.$bounds.getSouthWest().getLat();
        } else if(GMap.flag == 3) {//腾讯地图
            lng = this.$bounds.getSouthWest().getLng();
            lat = this.$bounds.getSouthWest().getLat();
        } else if(GMap.flag == 4) {//大连海大地图
            lng = this.$bounds.getSouthWest().lng ;
            lat =this.$bounds.getSouthWest().lat ;
        }
        return new GMap.GPoint(lng , lat);
    }

    this.getNorthEast = function() {
        var lng = 0 ;
        var lat = 0 ;
        if(GMap.flag == 1) {//百度地图
            lng = this.$bounds.getNorthEast().lng ;
            lat =this.$bounds.getNorthEast().lat ;
        } else if(GMap.flag == 2) {//高德地图
            lng = this.$bounds.getNorthEast().getLng();
            lat = this.$bounds.getNorthEast().getLat();
        } else if(GMap.flag == 3) {//腾讯地图
            lng = this.$bounds.getNorthEast().getLng();
            lat = this.$bounds.getNorthEast().getLat();
        } else if(GMap.flag == 4) {//大连海大地图
            lng = this.$bounds.getNorthEast().lng ;
            lat =this.$bounds.getNorthEast().lat ;
        }
        return new GMap.GPoint(lng , lat);
    }

}


GMap.GPoint = function(lng , lat) {
    if(GMap.flag == 1) {
        var gdPoint = bdTogd(lng , lat);
        this.$lng = gdPoint['lng'] ;
        this.$lat = gdPoint['lat'] ;
    }else {
        this.$lng = lng ;
        this.$lat = lat ;
    }

    this.getLng = function() {
        return this.$lng;
    }

    this.getLat = function() {
        return this.$lat;
    }
}




GMap.GInfoWindow = function(infoContent , lng , lat) {
    if(GMap.flag == 1) {//百度地图
        this.$infoWindow = new BDInfoWindow(infoContent , lng , lat);
    } else if(GMap.flag == 2) {//高德地图
        this.$infoWindow = new GDInfoWindow(infoContent , lng , lat);
    } else if(GMap.flag == 3) {//腾讯地图
        this.$infoWindow = new TXInfoWindow(infoContent , lng , lat);
    } else if(GMap.flag == 4) {//大连海大地图
        this.$infoWindow = new HDInfoWindow(infoContent , lng , lat);
    }
    this.getLayer = function() {
        return this.$infoWindow.getLayer();
    }
}

GMap.GNoMarkInfoWindow = function(infoContent , lng , lat) {
    if(GMap.flag == 1) {//百度地图
        this.$noMarkInfoWindow = new BDNoMarkInfoWindow(infoContent , lng , lat);
    } else if(GMap.flag == 2) {//高德地图
        this.$noMarkInfoWindow = new GDNoMarkInfoWindow(infoContent , lng , lat);
    } else if(GMap.flag == 3) {//腾讯地图
        this.$noMarkInfoWindow = new TXNoMarkInfoWindow(infoContent , lng , lat);
    } else if(GMap.flag == 4) {//大连海大地图
        this.$noMarkInfoWindow = new HDNoMarkInfoWindow(infoContent , lng , lat);
    }
    this.getLayer = function() {
        return this.$noMarkInfoWindow.getLayer();
    }
}

GMap.GDrivingRoute = function(tMap) {
    if(GMap.flag == 1) {//百度地图
        this.$driving = new BDDrivingRoute(tMap);
    } else if(GMap.flag == 2) {//高德地图
        this.$driving = new GDDrivingRoute(tMap);
    } else if(GMap.flag == 3) {//腾讯地图
        this.$driving = new TXDrivingRoute(tMap);
    } else if(GMap.flag == 4) {//大连海大地图
        this.$driving = new HDDrivingRoute(tMap);
    }

    this.calc = function(lng1 , lat1 , lng2 , lat2) {
        this.$driving.calc(lng1 , lat1, lng2 , lat2);
    }

    this.delete = function() {
        this.$driving.delete();
    }
}


GMap.GGeolocation = function(tMap , callback) {
    // if(GMap.flag == 1) {//百度地图
    //     //this.$geolocation = new BDGeolocation(tMap  , callback);
    // } else if(GMap.flag == 2) {//高德地图
    //     testMap = tMap;
    // } else if(GMap.flag == 3) {//腾讯地图
    //     //this.$geolocation = new TXGeolocation(tMap , callback);
    // } else if(GMap.flag == 4) {//大连海大地图
    //     //this.$geolocation = new HDGeolocation(tMap , callback);
    // }

    if(GMap.flag != 2) {
        var locationMap = new AMap.Map("gdMap");
        this.$geolocation = new GDGeolocation(locationMap , callback);
    }else {
        this.$geolocation = new GDGeolocation(tMap.getLayer() , callback);
    }

}


GMap.GPolyline = function(route , tMap) {
    if(GMap.flag == 1) {//百度地图
        this.$polyline = new BDPolyline(tMap  , route);
    } else if(GMap.flag == 2) {//高德地图
        this.$polyline = new GDPolyline(tMap , route);
    } else if(GMap.flag == 3) {//腾讯地图
        this.$polyline = new TXPolyline(tMap , route);
    } else if(GMap.flag == 4) {//大连海大地图
        this.$polyline = new HDPolyline(tMap , route);
    }

    this.getBounds = function() {
        return new GMap.GBounds(this.$polyline.getBounds());
    }

    this.getLayer = function () {
        return this.$polyline.getLayer();
    }
}


//===================================================百度地图===========================================================
var BDMap = function(divCss) {
    this.$map = new BMap.Map(divCss);
    this.$map.enableScrollWheelZoom(true);
    this.centerAndZoom = function(lng , lat , level) {
        var bdPoint = gdTobd(lng ,lat);
        this.$map.centerAndZoom(new BMap.Point(bdPoint["lng"],bdPoint['lat']), level);
    }

    this.addEventListener = function(operator , callback) {
        this.$map.addEventListener(operator , function(type, target, point, pixel, overlay) {
            if(operator == "mousemove") {
                var bdPoint = bdTogd(type.point.lng  , type.point.lat)
                callback(bdPoint['lng'] ,bdPoint['lat'] , true);
            }else {
                callback();
            }
        });
    }

    this.getBounds = function() {
        return this.$map.getBounds();
    }

    this.removeOverlay = function (staff) {
        return this.$map.removeOverlay(staff.getLayer());
    }
    this.addOverlay = function(staff)  {
        return this.$map.addOverlay(staff.getLayer());
    }
    this.clearOverlays = function() {
        this.$map.clearOverlays();
    }

    this.createPoint = function(lng , lat)  {
        return  new BMap.Point(lng , lat);
    }


    this.setMapDragging = function(bDrag) {
        if(bDrag) {
            this.$map.enableDragging();
        }else {
            this.$map.disableDragging();
        }
    }

    this.getBounds = function() {
        var xbounds =this.$map.getBounds();
        return xbounds;
    }
    this.getZoom = function() {
        return this.$map.getZoom();
    }

    this.getCenter = function() {
        return this.$map.getCenter();
    }
    this.getDistance = function(point1 , point2) {
        return this.$map.getDistance(new BMap.Point(point1.getLng(),point1.getLat()), new BMap.Point(point2.getLng(),point2.getLat()));
    }
    this.getLayer = function () {
        return this.$map;
    }

    this.setBounds = function(lng1 , lat1 , lng2 , lat2) {
        var points = [new BMap.Point(lng1, lat1) , new BMap.Point(lng2 , lat2)];
        this.$map.setViewport(points);
    }
}



var BDCircle = function(tMap , lng , lat , radius , color ) {
    var bdPoint = gdTobd(lng , lat);
    var center = new BMap.Point(bdPoint['lng'], bdPoint['lat']);
    if(color == null || color == undefined) {
        color = "blue";
    }
    this.$circle = new BMap.Circle(center , radius , {fillColor:"blue", strokeWeight: 1 ,fillOpacity: 0.3, strokeOpacity: 0.3});
    this.$map = tMap;
    this.enableEdit = function(callback) {
        this.$circle.enableEditing();
        this.$circle.addEventListener("lineupdate" , function(type, target) {
            if(type.type == 'onlineupdate') {
                if(callback!=null) {
                    callback();
                }
            }
        })
    }

    this.disenableEdit = function() {
        this.$circle.disableEditing();
        this.$circle.removeEventListener("lineupdate" , function() {

        });
    }

    this.getCenter = function() {
        return this.$circle.getCenter();
    }

    this.setCenter = function(lng , lat) {
        var bdPoint = gdTobd(lng , lat);
        var point = new BMap.Point(bdPoint['lng'],bdPoint['lat']);
        this.$circle.setCenter(point);
    }

    this.getRadius = function() {
        return this.$circle.getRadius();
    }

    this.setRadius = function(radius) {
        this.$circle.setRadius(radius);
    }


    this.getLayer = function() {
        return this.$circle;
    }


    this.addEventListener = function (name , callback)  {
        this.$circle.addEventListener(name , function(type, target) {
            if(type.type != 'onlineupdate') {
                callback();
            }
        })
    }

    this.getBounds = function() {
        return this.$circle.getBounds();
    }
}



var BDMarker = function(lng , lat , iconPath) {
    var bdPoint = gdTobd(lng , lat);
    var point = new BMap.Point( bdPoint['lng'] , bdPoint['lat'] );
    var myIcon = null;
    if(iconPath != null && iconPath != undefined && iconPath !="") {
        myIcon = new BMap.Icon(iconPath, new BMap.Size(30,53));
        this.$bdMarker = new BMap.Marker(point , {icon:myIcon});
    }else {
        this.$bdMarker = new BMap.Marker(point);
    }

    this.setId = function(id) {
        this.$dId = id ;
    }

    this.getId = function()  {
        return this.$dId;
    }

    this.addEventListener = function(name , callback) {
        this.$callback = callback;
        var gThis = this;
        this.$bdMarker.addEventListener(name , function() {
            if(gThis.$callback != null) {
                gThis.$callback();
            }
        })
    }

    this.getLayer = function()  {
        return this.$bdMarker;
    }

    this.setInfoWindow = function(infoWindow , tMap) {
        this.$infoWindow = infoWindow;
        this.$map = tMap;
    }

    this.openInfoWindow = function() {
        if(this.$infoWindow != null && this.$infoWindow != undefined) {
            this.$bdMarker.openInfoWindow(this.$infoWindow.getLayer());
        }
    }
    this.closeInfoWindow = function() {
        if(this.$infoWindow != null && this.$infoWindow != undefined) {
            this.$map.removeOverlay(this.$infoWindow);
        }
    }

    this.setPosition = function(lng , lat) {
        var bdMarkerTmpLngLat = gdTobd(lng , lat);
        this.$bdMarker.setPosition(new BMap.Point(bdMarkerTmpLngLat["lng"] , bdMarkerTmpLngLat["lat"]));
    }

    this.setRotation = function(angle) {
        this.$bdMarker.setRotation(angle);
    }
}

function BDBounds(bounds) {
    this.$bounds = bounds;
    this.getSouthWest = function() {
        return this.$bounds.getSouthWest();
    }

    this.getNorthEast = function() {
        return this.$bounds.getNorthEast();
    }
}


var BDInfoWindow = function(infoWindowContent) {
    var opts = {
        width : 50,     // 信息窗口宽度
        height: 10,
        enableMessage:false
    }
    this.$infoWindow = new BMap.InfoWindow(infoWindowContent,opts);
    this.getLayer = function() {
        return this.$infoWindow;
    }
}


var BDDrivingRoute = function(tMap) {
    this.$map = tMap ;
    this.$driving = new BMap.DrivingRoute(this.$map.getLayer(), {renderOptions:{map: this.$map.getLayer(), autoViewport: true}});
    var followRoute = null;
    var routeMarker = null;
    var bddrThis = this ;
    this.$isCalced = false ;
    this.$isDeleted = false ;
    this.$driving.setSearchCompleteCallback(function(routes) {
        var plan = routes.getPlan(0);
        followRoute = plan.getRoute(0);
        // 获取每个关键步骤,并输出到页面
        bddrThis.$isCalced = true;
        if(bddrThis.$isDeleted) {
            bddrThis.delete();
            bddrThis.$isDeleted = false ;
        }

    });
    this.$driving.setMarkersSetCallback(function(pois) {
        routeMarker = pois;
    })
    this.calc = function(lng1 , lat1 , lng2 , lat2) {
        var bdPointStart = gdTobd(lng1 , lat1);
        var bdPointEnd = gdTobd(lng2 , lat2);
        var p1 = new BMap.Point(bdPointStart['lng'] , bdPointStart['lat'] );
        var p2 = new BMap.Point(bdPointEnd['lng'] , bdPointEnd['lat']);
        this.$driving.search(p1, p2);
    }
    this.delete = function() {
        if(this.$isCalced) {
            if(followRoute != null && followRoute != undefined) {
                this.$map.getLayer().removeOverlay(followRoute.getPolyline());
                followRoute = null;
            }
            if(routeMarker != null && routeMarker != undefined) {
                for(x in routeMarker) {
                    var marker = routeMarker[x];
                    this.$map.getLayer().removeOverlay(marker.marker);
                }
                routeMarker = null;
            }
            this.$isCalced = false ;
        }else {
            this.$isDeleted = true;
        }


    }
}


var BDGeolocation = function(tMap , callback) {
    this.$map = tMap;
    this.$callback = callback ;
    var bdgThis = this;
    this.$myCity = new BMap.LocalCity();
    this.$myCity.get(function(result) {
        var bdPoint = bdTogd(result.center.lng , result.center.lat);
        bdgThis.$callback(bdPoint['lng'] , bdPoint['lat']);
    });
    // this.$geolocation = new BMap.Geolocation();
    // this.$geolocation.getCurrentPosition(function(r){
    //     if(this.getStatus() == BMAP_STATUS_SUCCESS){
    //         var bdPoint = bdTogd(r.point.lng , r.point.lat);
    //         bdgThis.$callback(bdPoint['lng'] , bdPoint['lat']);
    //     }else {
    //         bdgThis.$callback(116.404, 39.915);
    //     }
    // },{enableHighAccuracy: true});
}


var BDPolyline = function(tMap , route) {

    var dbRoutes = [];


    for(var i=0 ; i<route.latlng.length ; i++) {
        var gdLngLat = gdTobd(route.latlng[i]["lng"],route.latlng[i]["lat"]);
        dbRoutes.push(new BMap.Point(gdLngLat["lng"],gdLngLat["lat"]));
    }
    this.$dbPolyine = new BMap.Polyline(dbRoutes , {strokeColor:route.color, strokeWeight:4, strokeOpacity:1});

    this.getBounds = function() {
        return this.$dbPolyine.getBounds();
    }

    this.getLayer = function () {
        return this.$dbPolyine;
    }
}


//==================================================高德地图===========================================================

var GDMap = function(divCss) {
    this.$map = new AMap.Map(divCss);

    this.centerAndZoom = function(lng , lat , level) {
        this.$map.setZoomAndCenter(level , [lng,lat]);
    }

    this.addEventListener = function(operator , callback) {
        this.$map.on(operator , function(MapsEvent) {
            if(operator != "mousemove") {
                callback();
            }
        })
    }

    this.getBounds = function() {
        return this.$map.getBounds();
    }

    this.removeOverlay = function (staff) {
        staff.getLayer().setMap(null);
    }

    this.addOverlay = function(staff)  {
        staff.getLayer().setMap(this.$map);
    }

    this.clearOverlays = function() {
        this.$map.clearMap();
    }

    this.setMapDragging = function(bDrag) {
    }

    this.getZoom = function() {
        return this.$map.getZoom();
    }

    this.getCenter = function() {
        return this.$map.getCenter();
    }

    this.getDistance = function(point1 , point2) {
        var lnglat1 = new AMap.LngLat(point1.getLng() , point1.getLat());
        return lnglat1.distance([point2.getLng() , point2.getLat()]);
    }

    this.getLayer = function() {
        return this.$map;
    }

    this.setBounds = function(lng1, lat1, lng2 , lat2) {
        this.$map.setBounds(new AMap.Bounds(new AMap.LngLat(lng1 , lat1) ,new AMap.LngLat(lng2 , lat2)));
    }
}




var GDCircle = function(tMap , lng , lat , radius , color) {
    if(color == null || color==undefined) {
        color="#0000ff"
    }
    this.$circle = new AMap.Circle({
        center: [lng, lat],// 圆心位置
        radius: radius, //半径
        strokeColor:  "#F33", //线颜色
        strokeOpacity: 1, //线透明度
        strokeWeight: 3, //线粗细度
        fillColor:color, //填充颜色
        fillOpacity: 0.35//填充透明度
    });
    this.$map = tMap ;
    this.editor = new AMap.CircleEditor(this.$map.getLayer(), this.$circle);

    this.enableEdit = function(callback) {
        this.editor.open();
        this.$circle.on("change" , function(type, target) {
            callback();
        })
    }

    this.disenableEdit = function() {
        this.editor.close();
        this.$circle.off("change");
    }

    this.getCenter = function() {
        return this.$circle.getCenter();
    }

    this.setCenter = function(lng , lat) {
        var point = new AMap.LngLat(lng,lat)
        this.$circle.setCenter(point);
    }

    this.getRadius = function() {
        return this.$circle.getRadius();
    }

    this.setRadius = function(radius) {
        this.$circle.setRadius(radius);
    }

    this.getLayer = function() {
        return this.$circle;
    }

    this.addEventListener = function (name , callback)  {
        this.$circle.on(name , function(MapsEvent) {
            if(name != "change") {
                callback();
            }
        })
    }

    this.getBounds = function() {
        return this.$circle.getBounds();
    }
}


var GDMarker = function(lng , lat , iconPath) {
    if(iconPath != null && iconPath !=undefined && iconPath!="") {
        this.$gdMarker = new AMap.Marker({
            icon: iconPath,
            position: [lng, lat]
        });
    }else {
        this.$gdMarker = new AMap.Marker({
            icon: "http://webapi.amap.com/theme/v1.3/markers/n/mark_b.png",
            position: [lng, lat]
        });
    }

    this.setId = function(id) {
        this.$dId = id ;
    }

    this.getId = function()  {
        return this.$dId;
    }

    this.addEventListener = function(name , callback) {
        this.$callback = callback;
        var gThis = this;
        this.$gdMarker.on(name , function() {
            if(gThis.$callback != null) {
                gThis.$callback();
            }
        })
    }

    this.getLayer = function()  {
        return this.$gdMarker;
    }

    this.setInfoWindow = function(infoWindow , tMap) {
        this.$infoWindow = infoWindow;
        this.$map = tMap;
    }

    this.openInfoWindow = function() {
        if(this.$infoWindow != null && this.$infoWindow != undefined) {
            this.$infoWindow.getLayer().open(this.$map);
        }
    }
    this.closeInfoWindow = function() {
        if(this.$infoWindow != null && this.$infoWindow != undefined) {
            this.$infoWindow.getLayer().close();
            this.$map.getLayer().clearInfoWindow();
        }
    }

    this.setPosition = function(lng , lat) {
        this.$gdMarker.setPosition(new AMap.LngLat(lng , lat));
    }

    this.setRotation = function(angle) {
        this.$gdMarker.setAngle(angle);
    }
}

function GDBounds(bounds) {
    this.$bounds = bounds;
}

GDBounds.prototype.getSouthWest = function() {
    return this.$bounds.getSouthWest();
}

GDBounds.prototype.getNorthEast = function() {
    return this.$bounds.getNorthEast();
}

var GDInfoWindow = function(infoWindowContent) {
    this.$infoWindow = new AMap.InfoWindow({
        content: infoWindowContent  //使用默认信息窗体框样式，显示信息内容
    });

    this.getLayer = function() {
        return this.$infoWindow;
    }
}


var GDDrivingRoute = function(tMap) {
    this.$map = tMap ;
    this.$driving = new AMap.Driving({
        map: this.$map.getLayer(),
    });
    var gddrThis = this;
    this.$isDelete = false ;
    this.$isCalced = false ;
    this.$driving.on("complete" , function() {
        gddrThis.$isCalced = true;
        if(gddrThis.$isDelete) {
            gddrThis.delete();
            gddrThis.$isDelete = false ;
        }
    })

    this.calc = function(lng1 , lat1 , lng2 , lat2) {
        var point1 = new AMap.LngLat(lng1 ,lat1);
        var point2 = new AMap.LngLat(lng2 ,lat2);
        this.$driving.search(point1 , point2);
    }

    this.delete = function() {
        if(this.$isCalced) {
            this.$driving.clear();
            this.$isCalced = false ;
        }else {
            this.$isDelete = true;
        }
    }
}


var GDGeolocation = function(tMap , callback) {
    this.$map = tMap ;
    this.$callback = callback ;
    var gdgThis = this;
    tMap.plugin('AMap.Geolocation', function() {
        geolocation = new AMap.Geolocation({
            enableHighAccuracy: true,//是否使用高精度定位，默认:true
            timeout: 10000,          //超过10秒后停止定位，默认：无穷大
            buttonOffset: new AMap.Pixel(10, 20),//定位按钮与设置的停靠位置的偏移量，默认：Pixel(10, 20)
            // zoomToAccuracy: true,      //定位成功后调整地图视野范围使定位位置及精度范围视野内可见，默认：false
            buttonPosition:'RB'
        });
        gdgThis.$map.addControl(geolocation);
        geolocation.getCurrentPosition();
        AMap.event.addListener(geolocation, 'complete', onComplete);//返回定位信息
        AMap.event.addListener(geolocation, 'error', onError);      //返回定位出错信息
    });

    //解析定位结果
    function onComplete(data) {
        gdgThis.$callback(data.position.getLng() , data.position.getLat());
    }
    //解析定位错误信息
    function onError(data) {
        this.$callback(116.404, 39.915);
    }
}


var GDPolyline = function(tMap , route) {

    /*var gdRoutes = [];
    for(var i=0 ; i<route.length ; i++) {
        var gdLngLat = [route["lng"] , route["lat"]];
        gdRoutes.push(gdLngLat);

    }

    this.$gdPolyline = new AMap.Polyline({
        path: gdRoutes,          //设置线覆盖物路径
        strokeColor: '#000', //线颜色
        strokeOpacity: 1,       //线透明度
        strokeWeight: 5,        //线宽
        strokeStyle: "solid",   //线样式
        strokeDasharray: [10, 5] //补充线样式
    });*/

    var gdRoutes = [];
    for(var i=0 ; i<route.latlng.length ; i++) {
        var gdLngLat = [route.latlng[i]["lng"] , route.latlng[i]["lat"]];
        gdRoutes.push(gdLngLat);

    }

    this.$gdPolyline = new AMap.Polyline({
        path: gdRoutes,          //设置线覆盖物路径
        strokeColor: route.color, //线颜色
        strokeOpacity: 1,       //线透明度
        strokeWeight: 5,        //线宽
        strokeStyle: "solid",   //线样式
        strokeDasharray: [10, 5] //补充线样式
    });

    this.getBounds = function() {
        return this.$gdPolyline.getBounds();
    }

    this.getLayer = function () {
        return this.$gdPolyline;
    }

}


//==================================================腾讯地图===========================================================

var TXMap = function(divCss) {
    this.$txMap = new qq.maps.Map(document.getElementById(divCss) , {
    })
    this._ids = 1 ;
    this.overlays = {};
    this.centerAndZoom = function(lng , lat , level) {
        this.$txMap.setCenter(new qq.maps.LatLng(lat , lng));
        this.$txMap.setZoom(level);
    }

    this.addEventListener = function(operator , callback) {
        if(operator == "zoomend") {
            operator = "zoom_changed";
        }else if(operator == "moveend"){
            operator = "dragend";
        }
        qq.maps.event.addListener(this.$txMap , operator , function(event) {
            if(operator == "mousemove") {
                callback(event.latLng.lng ,event.latLng.lat);
            }else {
                callback();
            }
        });
    }

    this.getBounds = function() {
        return this.$txMap.getBounds();
    }

    this.removeOverlay = function (staff) {
        staff.getLayer().setMap(null);
        delete this.overlays[staff.tmpId];
    }

    this.addOverlay = function(staff)  {
        staff.getLayer().setMap(this.$txMap);
        staff.tmpId = this.ids;
        this.overlays[this.ids++] = staff;
    }
    this.clearOverlays = function() {
        for(x in this.overlays) {
            this.removeOverlay(this.overlays[x]);
        }
        this.overlays = {};
    }

    this.setMapDragging = function(bDrag) {
        if(bDrag) {
            this.$txMap.setOptions({draggable:true})
        }else {
            this.$txMap.setOptions({draggable:false})
        }
    }

    this.getZoom = function() {
        return this.$txMap.getZoom();
    }

    this.getCenter = function() {
        return this.$txMap.getCenter();
    }

    this.getDistance = function(point1 , point2) {
        var lnglat1 = new AMap.LngLat(point1.getLng() , point1.getLat());
        return lnglat1.distance([point2.getLng() , point2.getLat()]);
    }

    this.getLayer = function() {
        return this.$txMap;
    }

    this.setBounds = function(lng1, lat1, lng2 , lat2) {
        this.$txMap.fitBounds(new qq.maps.LatLngBounds(new qq.maps.LatLng(lat1 , lng1) ,new qq.maps.LatLng(lat2 , lng2)));
    }
}


var TXCircle = function(tMap , lng , lat , radius , color) {
    this.$map = tMap ;
    if(color == null || color ==undefined) {
        color = "#0000ff";
    }
    var tmpColor = color.colorRgb();
    this.$circle = new qq.maps.Circle({
        center: new qq.maps.LatLng(lat , lng) ,
        radius: radius,
        fillColor: new qq.maps.Color(tmpColor[0] , tmpColor[1] , tmpColor[2] , 0.35),
        strokeWeight: 5 ,
    });

    this.enableEdit = function(callback) {
        qq.maps.event.addListener(this.$circle , "center_changed" , function() {
            callback();
        });
    }

    this.disenableEdit = function() {

    }

    this.getCenter = function() {
        return this.$circle.getCenter();
    }

    this.setCenter = function(lng , lat) {
        var point = new qq.maps.LatLng(lat,lng)
        this.$circle.setCenter(point);
    }

    this.getRadius = function() {
        return this.$circle.getRadius();
    }

    this.setRadius = function(radius) {
        this.$circle.setRadius(radius);
    }

    this.getLayer = function() {
        return this.$circle;
    }

    this.addEventListener = function (name , callback)  {
        qq.maps.event.addListener(this.$circle , name , function() {
            callback();
        });
    }

    this.getBounds = function() {
        return this.$circle.getBounds();
    }
}




var TXMarker = function(lng , lat , iconPath) {
    var size = new qq.maps.Size(42, 68);
    var origin = new qq.maps.Point(0, 0);
    var anchor = new qq.maps.Point(0, 39);
    if(iconPath != null && iconPath !=undefined && iconPath!="") {
        this.$txMarker = new qq.maps.Marker({
            //设置Marker的位置坐标
            position: new qq.maps.LatLng(lat, lng),
            icon : new qq.maps.MarkerImage(iconPath)
        });
    }else {
        this.$txMarker = new qq.maps.Marker({
            //设置Marker的位置坐标
            position: new qq.maps.LatLng(lat, lng),
            icon : new qq.maps.MarkerImage("http://webapi.amap.com/theme/v1.3/markers/n/mark_b.png")
        });
    }

    this.setId = function(id) {
        this.$dId = id ;
    }

    this.getId = function()  {
        return this.$dId;
    }

    this.addEventListener = function(name , callback) {
        this.$callback = callback;
        var gThis = this;
        qq.maps.event.addListener(this.$txMarker , name , function() {
            if(gThis.$callback != null) {
                gThis.$callback();
            }
        })
    }

    this.getLayer = function()  {
        return this.$txMarker;
    }

    this.setInfoWindow = function(infoWindow , tMap) {
        this.$infoWindow = infoWindow;
        this.$map = tMap;
    }

    this.openInfoWindow = function() {
        if(this.$infoWindow != null && this.$infoWindow != undefined) {
            this.$infoWindow.getLayer().setPosition(this.$txMarker.getPosition());
            this.$infoWindow.getLayer().setMap(this.$map.getLayer());
            this.$infoWindow.getLayer().open();

        }
    }
    this.closeInfoWindow = function() {
        if(this.$infoWindow != null && this.$infoWindow != undefined) {
            this.$infoWindow.getLayer().close();
        }
    }

    this.setPosition = function(lng , lat) {
        this.$txMarker.setPosition(new qq.maps.LatLng(lat , lng));
    }

    this.setRotation = function(angle) {
        this.$txMarker.setRotation(angle);
    }

}

function TXBounds(bounds) {
    this.$txBounds = bounds;

    this.getSouthWest = function() {
        return this.$txBounds.getSouthWest();
    }

    this.getNorthEast = function() {
        return this.$txBounds.getNorthEast();
    }
}

var TXInfoWindow = function(infoWindowContent) {
    this.$infoWindow = new qq.maps.InfoWindow({
        content: infoWindowContent  //使用默认信息窗体框样式，显示信息内容
    });

    this.getLayer = function() {
        return this.$infoWindow;
    }
}

var TXDrivingRoute = function(tMap) {
    this.$map = tMap ;
    this.$driving = new qq.maps.DrivingService({
        map: this.$map.getLayer()
    });
    var gddrThis = this;
    this.$isDelete = false ;
    this.$isCalced = false ;
    this.$driving.setComplete( function(result) {
        gddrThis.$isCalced = true;
        if(gddrThis.$isDelete) {
            gddrThis.delete();
            gddrThis.$isDelete = false ;
        }
    })

    this.calc = function(lng1 , lat1 , lng2 , lat2) {
        var point1 = new qq.maps.LatLng(lat1 ,lng1);
        var point2 = new qq.maps.LatLng(lat2 ,lng2);
        this.$driving.search(point1 , point2);
    }

    this.delete = function() {
        if(this.$isCalced) {
            this.$driving.clear();
            this.$isCalced = false ;
        }else {
            this.$isDelete = true;
        }
    }
}

var TXGeolocation = function(tMap , callback) {
    this.$map = tMap ;
    this.$callback = callback ;
    var gdgThis = this;
    this.$citylocation = new qq.maps.CityService({
        map : tMap.getLayer(),
        complete : function(results){
            map.setCenter(results.detail.latLng);
            var marker = new qq.maps.Marker({
                map:tMap.getLayer(),
                position: results.detail.latLng
            });
            callback();
        }
    });
    //解析定位结果
    function onComplete(data) {
        gdgThis.$callback(data.position.getLng() , data.position.getLat());
    }
    //解析定位错误信息
    function onError(data) {
        this.$callback(116.404, 39.915);
    }
}


var TXPolyline = function(tMap , route) {

    var txRoutes = [];


    for(var i=0 ; i<route.latlng.length ; i++) {
        var txLngLat = new qq.maps.LatLng(route.latlng[i]["lat"] , route.latlng[i]["lng"] );
        txRoutes.push(txLngLat);
    }

    this.$txPolyline = new qq.maps.Polyline({
        path: txRoutes,          //设置线覆盖物路径
        strokeColor: route.color ,//new qq.maps.Color(0, 0, 0, 0.5), //线颜色
        strokeWeight : 4
    });



    this.getBounds = function() {
        return this.$txPolyline.getBounds();
    }

    this.getLayer = function () {
        return this.$txPolyline;
    }

}



//==================================================大连海大地图===========================================================

function HDMap(divCss ) {
    this.$hdmap = new FMap.Map(divCss);//.setView([ 39.915 , 116.404], 12);
    this._ids = 1 ;
    this.overlays = {};
    FMap.tileLayer('http://navgo.vicp.net:8009/apis/v1/rastertiles/mix_map/{z}/{x}/{y}.png', {
        maxZoom: 17,
        minZoom: 2
    }).addTo(this.$hdmap);

    this.centerAndZoom = function (lng , lat , level) {
        this.$hdmap.setZoom(level);
        this.$hdmap.panTo([lat , lng]);
    }

    this.addEventListener = function(operator , callback) {
        this.$hdmap.on(operator , function(event) {
            if(event.type == 'mousemove') {
                callback(event.latlng.lng ,event.latlng.lat);
            } else {
                callback();
            }
        })
    }

    this.getBounds = function () {
        return this.$hdmap.getBounds();
    }

    this.removeOverlay = function (staff) {
        staff.getLayer().remove(this.$hdmap);
        delete this.overlays[staff.tmpId];
    }

    this.addOverlay = function (staff)  {
        staff.getLayer().addTo(this.$hdmap);
        staff.tmpId = this.ids;
        this.overlays[this.ids++] = staff;
    }

    this.clearOverlays = function() {
        for(x in this.overlays) {
            this.removeOverlay(this.overlays[x]);
        }
        this.overlays = {};
    }

    this.createPoint = function (lng , lat) {
        return this.$hdmap.createPoint(lng , lat);
    }


    this.setMapDragging = function(bDrag) {//?
        // this.$hdmap.setView(this.$hdmap.getCenter() , this.$hdmap.getZoom()
        //  , {dragging : false});
        this.$hdmap.setDragging(bDrag);
    }

    this.getZoom = function() {
        return this.$hdmap.getZoom();
    }

    this.getDistance = function(point1 , point2) {
        var start = HDMap.latLng(point1.getLat() , point1.getLng());
        return start.distanceTo( HDMap.latLng(point2.getLat() , point2.getLng()));
    }

    this.getCenter = function() {
        return this.$hdmap.getCenter();
    }
    this.getLayer = function() {
        return this.$hdmap;
    }

    this.setBounds = function(lng1, lat1, lng2 , lat2) {
        var bounds =new FMap.LatLngBounds([lat1 ,lng1] , [lat2 ,lng2]);
        this.$hdmap.fitBounds(bounds);
    }
}


function HDCircle(tMap ,lng , lat , radius , color) {

    this.$hdCircle = new FMap.Circle([lat ,lng] , radius , {color:color});
    this.$map = tMap ;

    this.enableEdit = function(callback) {//? 编辑
    }

    this.disenableEdit = function() {//?
    }

    this.getCenter = function() {
        return this.$hdCircle.getLatLng();
    }

    this.setCenter = function(lng , lat) {
        this.$hdCircle.setLatLng([lat,lng]);
    }

    this.getRadius = function() {
        return this.$hdCircle.getRadius();
    }

    this.setRadius = function(radius) {
        this.$hdCircle.setRadius(radius);
    }

    this.getLayer = function() {
        return this.$hdCircle;
    }

    this.addEventListener = function (name , callback)  { //?
        this.$hdCircle.on(name , function(MapsEvent) {
            if(name != "change") {
                callback();
            }
        })
    }

    this.getBounds = function() { //?
        return this.$hdCircle.getBounds();
    }
}


function HDMarker(lng , lat , iconPath) {

    var hdmIcon = new FMap.Icon({
        iconUrl: iconPath ,
        //iconSize : [30 , 53] ,
    });

    this.$hdMarker = new FMap.Marker([lat ,lng] , {icon:hdmIcon});

    this.addEventListener = function(name , callback) {
        this.$callback = callback;
        var gThis = this;
        this.$hdMarker.on(name , function() {
            if(gThis.$callback != null) {
                gThis.$callback();
            }
        })
    }

    this.setId = function(id) {
        this.$dId = id ;
    }

    this.getId = function() {
        return this.$dId;
    }

    this.getLayer = function () {
        return this.$hdMarker;
    }

    this.setInfoWindow = function(infoWindow , tMap) {
        this.$infoWindow = infoWindow;
        this.$map = tMap ;
    }

    this.openInfoWindow = function() {
        var marLatLng = this.$hdMarker.getLatLng();
        this.$infoWindow.getLayer().setLatLng([marLatLng.lat, marLatLng.lng ]);
        this.$infoWindow.getLayer().openOn(this.$map.getLayer());
    }

    this.closeInfoWindow = function() {
        this.$map.getLayer().closePopup(this.$infoWindow.getLayer());
    }

    this.setPosition = function(lng , lat) {
        this.$hdMarker.setLatLng([lat , lng]);
    }

    this.setRotation = function(angle) {
        this.$hdMarker.setRotation(angle);
    }
}


function HDBounds(bounds) {
    this.$hdbounds = bounds;
    this.getSouthWest = function() {
        return this.$hdbounds.getSouthWest();
    }

    this.getNorthEast = function() {
        return this.$hdbounds.getNorthEast();
    }

}

var HDInfoWindow = function(infoContent , lng , lat) {//?
    this.$infoWindow = new FMap.Popup().setContent(infoContent);

    this.getLayer = function() {
        return this.$infoWindow;
    }
}



var HDDrivingRoute = function(tMap) { //?

    this.calc = function(lng1 , lat1 , lng2 , lat2) {
        this.$driving.calc(lng1 , lat1, lng2 , lat2);
    }

    this.delete = function() {
        this.$driving.delete();
    }
}


var HDGeolocation = function(tMap , callback) {//?
}



var HDPolyline = function(tMap , route) {

    var txRoutes = [];

    for(var i=0 ; i<route.latlng.length ; i++) {
        var txLngLat = [route.latlng[i]["lat"] , route.latlng[i]["lng"]];
        txRoutes.push(txLngLat);
    }

    this.$txPolyline = new FMap.Polyline(txRoutes , {
        strokeColor: route.color ,//new qq.maps.Color(0, 0, 0, 0.5), //线颜色
        strokeWeight : 4
    });

    this.getBounds = function() {
        return this.$txPolyline.getBounds();
    }

    this.getLayer = function () {
        return this.$txPolyline;
    }
}




//===================================================

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



