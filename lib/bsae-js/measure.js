/**
 * Created by liyz on 2017/12/25.
 */
var bMeasure = false ;
var mearMap = bMap.getLayer();
var defaultCursorStyle = mearMap.getDefaultCursor();
var curPolyInfo = null;
var isClickMarker = false ;
var closeIcons = [];

BMap.Marker.prototype.setPolyInfo = function(info) {
    this.polyInfo = info ;
}
BMap.Marker.prototype.getPolyInfo= function() {
    return this.polyInfo;
}


mearMap.addEventListener("mousemove" , function(type, target, point, pixel, overlay){ //  鼠标在地图区域移动过程中触发此事件
    if(bMeasure) {
        drawCotent(type);
        drawPolyline(type.point.lng , type.point.lat , true);
    }
});

mearMap.addEventListener("rightclick" , function() {
    if(bMeasure) {
        cancelDistance();
    }
})



mearMap.addEventListener("click" , function(type, target, point, pixel, overlay) {
    if(bMeasure && !isClickMarker) {
        drawMarker(type.point.lng , type.point.lat);
    }
    isClickMarker = false;
});

mearMap.addEventListener("zoomend" , function() {
    refreshCloseIconPosition();
});

mearMap.addEventListener("dblclick" , function(type, target, point, pixel, overlay) {
    if(bMeasure) {

    }
});

$("#disTool").click(function() {
    initDistanceTool();
});



function initDistanceTool() {
    if(!bMeasure) {
        bMeasure = true;
        mearMap.setDefaultCursor("crosshair");
        mearMap.disableDoubleClickZoom();
        $("#pad").show();
        if(curPolyInfo == null) {
            curPolyInfo = new DistanceInfo();
        }else {
            curPolyInfo.getCloseIcon().delete();
            var markers = curPolyInfo.getMarkers();
            var lastMarker = markers[markers.length - 1];
            var position = lastMarker.getPosition();
            drawPolyline(position.lng , position.lat , true);
        }
        $('.pgRight .measure').addClass('active-measure');
        $('.pgRight i').addClass('active-i');
    }
}


function drawPolyline(lng , lat , bCurrent) {
    //处理当前的
    var points = curPolyInfo.getPoints();
    if(points.length == 0) {
        return ;
    }
    var polylinePoints = [];
    for(x in points) {
        var point = points[x];
        polylinePoints.push(new BMap.Point(point[0] , point[1]));
    }
    if(bCurrent) {
        polylinePoints.push(new BMap.Point(lng , lat));
    }
    if(curPolyInfo.getPolyline() == null) {
        var polyline = new BMap.Polyline(polylinePoints, {strokeColor:"blue", strokeWeight:2, strokeOpacity:0.5});
        curPolyInfo.setPolyline(polyline);
        mearMap.addOverlay(polyline);
    }else {
        curPolyInfo.getPolyline().setPath(polylinePoints);
    }
}

function drawMarker(lng , lat) {
    if(curPolyInfo == null || curPolyInfo == undefined) {
        return ;
    }
    var lastMarker = curPolyInfo.getLastMarker();
    if(lastMarker  != null) {
        var lastPosition = lastMarker.getPosition();
        var dis = getDistance(lastPosition.lng , lastPosition.lat , lng ,lat);
        if(dis < 20) {
            return ;
        }
    }

    var pt = new BMap.Point(lng, lat);
    var myIcon = new BMap.Icon("plugins/map/img/focus_@2X.png", new BMap.Size(20,20));
    var marker = new BMap.Marker(pt , {icon:myIcon});
    curPolyInfo.addMarker(marker);
    if(curPolyInfo.getMarkers().length > 1) {
        var points = curPolyInfo.getPoints();
        var startPoint = points[points.length - 1];
        var distance = getShowDistance(startPoint[0], startPoint[1] , lng , lat , true);
        var label = new BMap.Label(distance ,{offset:new BMap.Size(20,-10)});
        marker.setLabel(label);
        marker.addEventListener("dblclick" , function() {
            cancelDistance();
        });

        marker.addEventListener("click" , function() {
            if(!bMeasure) {
                curPolyInfo = this.getPolyInfo();
                removeRefreshCloseIcon(curPolyInfo.getCloseIcon().getMarker());
                initDistanceTool();
                isClickMarker = true;
            }
        });
        curPolyInfo.getLastMarker().removeEventListener("dblclick");
        curPolyInfo.getLastMarker().removeEventListener("click");
    }
    mearMap.addOverlay(marker);
    curPolyInfo.addPoint(lng , lat);
}

function cancelDistance() {
    if(curPolyInfo.getMarkers().length == 1) {
        curPolyInfo.removeAll();
    }else {
        var lastMarker = curPolyInfo.getLastMarker();
        var closeIcon = new CloseIcon();
        closeIcon.create( lastMarker , curPolyInfo);
        curPolyInfo.setCloseIcon(closeIcon);
        lastMarker.setPolyInfo(curPolyInfo);
        var markers = curPolyInfo.getMarkers();
        closeIcons.push(closeIcon);
        drawPolyline(lastMarker.getPosition().lng ,lastMarker.getPosition().lat   ,false);
    }
    mearMap.setDefaultCursor(defaultCursorStyle);
    mearMap.enableDoubleClickZoom();
    $("#pad").hide();
    $('.pgRight .measure').removeClass('active-measure');
    $('.pgRight i').removeClass('active-i');
    curPolyInfo = null;
    bMeasure = false;
}

function drawCotent(type) {
    $("#pad").css("left",type.offsetX+10);
    $("#pad").css("top",type.offsetY+10);
    if(curPolyInfo != null) {
        var points = curPolyInfo.getPoints();
        if(points.length == 0) {
            $("#pad").html("单击确定起点");
        }else {
            var point = points[points.length - 1];
            $("#pad").html("总长："+getShowDistance(point[0],point[1] ,type.point.lng , type.point.lat , false));
        }
    }
}

function getShowDistance(lng1 , lat1 , lng2 , lat2 , bAdd) {
    var distance =  getDistance(lng1 , lat1 , lng2 , lat2);
    var totalDistance = distance ;
    if(bAdd) {
        curPolyInfo.addDistance(distance);
        totalDistance = curPolyInfo.getDistance();
    }else {
        totalDistance = curPolyInfo.getDistance() + distance;
    }
    if( totalDistance > 1000) {
        var fixdDistance = totalDistance/1000.0;
        return fixdDistance.toFixed(1) + "公里";
    }else {
        return totalDistance + "米";
    }
}

function getDistance(lng1 , lat1 , lng2 , lat2) {
    var distance = mearMap.getDistance(new BMap.Point(lng1, lat1 ), new BMap.Point(lng2 , lat2));
    return distance ;
}



function refreshCloseIconPosition() {
    for(x in closeIcons) {
        var closeIcon = closeIcons[x];
        closeIcon.refreshPosition();
    }
}


var DistanceInfo = function() {
    this._points = [];
    this._markers = [];
    this._polyline = null;
    this._self = null;
    this._contentDiv = null;
    this._closeIcon = null;
    this._totalDistance = 0;

    this.addPoint = function(lng , lat) {
        this._points.push([lng , lat]);
    }

    this.getPoints = function() {
        return this._points;
    }

    this.setPolyline = function(polyline) {
        this._polyline = polyline;
    }

    this.getPolyline = function() {
        return this._polyline;
    }

    this.addMarker = function(marker) {
        this._markers.push(marker);
    }

    this.getMarkers = function() {
        return this._markers;
    }

    this.getLastMarker = function() {
        if(this._markers.length > 1) {
            return this._markers[this._markers.length -1];
        }
        return null;
    }

    this.setSelf = function(info) {
        this._self = info ;
    }

    this.getSelf = function() {
        return this._self ;
    }

    this.addDistance = function(distance) {
        this._totalDistance += distance;
    }

    this.getDistance = function() {
        return this._totalDistance;
    }

    this.setCloseIcon = function(closeIcon) {
        this._closeIcon =closeIcon;
    }

    this.getCloseIcon = function() {
        return this._closeIcon;
    }

    this.removeAll = function() {
        for(x in this._markers) {
            mearMap.removeOverlay(this._markers[x]);
        }
        mearMap.removeOverlay(this._polyline);
        if(this._closeIcon != null) {
            this._closeIcon.delete();
        }

    }
}


function removeRefreshCloseIcon(removeMarker) {
    var newCloseIcons = [] ;
    for(x in closeIcons) {
        var oldCloseIcon = closeIcons[x];
        if(removeMarker.ba != oldCloseIcon.getMarker().ba) {
            newCloseIcons.push(oldCloseIcon);
        }
    }
    closeIcons = newCloseIcons;
}

var CloseIcon = function() {
    this._marker ;
    this._lastMarker;
    this.create = function(lastMarker , parent) {
        this._lastMarker = lastMarker;
        var lastPosition = lastMarker.getPosition();
        var screen = mearMap.pointToPixel(lastPosition);
        var newScreen = new BMap.Pixel(screen.x - 5 , screen.y);
        var closeIconPosition = mearMap.pixelToPoint(newScreen);
        var myIcon = new BMap.Icon("plugins/map/img/cancel.png", new BMap.Size(20,20));
        this._marker = new BMap.Marker(closeIconPosition , {icon:myIcon});
        this._marker.setPolyInfo(parent);
        this._marker.addEventListener("click" , function() {

            this.getPolyInfo().removeAll();
            removeRefreshCloseIcon(this);
        });
        mearMap.addOverlay(this._marker);
    }

    this.delete = function() {
        mearMap.removeOverlay(this._marker);
    }

    this.refreshPosition = function() {
        var lastPosition = this._lastMarker.getPosition();
        var screen = mearMap.pointToPixel(lastPosition);
        var newScreen = new BMap.Pixel(screen.x - 5 , screen.y);
        var closeIconPosition = mearMap.pixelToPoint(newScreen);
        if(this._marker) {
            this._marker.setPosition(closeIconPosition);
        }
    }

    this.getMarker = function() {
        return this._marker;
    }
}