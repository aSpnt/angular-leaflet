/**
 * Created by aivanov on 23.05.2016.
 */
(function (ng, undefined){
    'use strict';

    ng.module('angular-leaflet-directive', []).run(['$templateCache', function ($templateCache) {
    $templateCache.put('template/leaflet.html','<div style="width: 100%; height: 100%" ng-transclude></div>');
}]);

    ng.module('angular-leaflet-directive').directive('leaflet', function () {

    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        scope: {
            control: '=',
            items: '=',
            lat: '@',
            lon: '@',
            baseLat: '@',
            baseLon: '@',
            baseScale: '@',
            name: '@',
            subname: '@',
            selectCallback: '=selectOnMapCallback',
            layers: '='
        },
        templateUrl: 'template/leaflet.html',
        controller: ["$scope", function(scope) {
            // Позволяет использовать путь до нужного свойства
            scope.getDescendantProp = function(obj, desc) {
                var arr = desc.split(".");
                while(arr.length && (obj = obj[arr.shift()]));
                return obj;
            }
        }],
        link: function (scope, element, attr) {
            scope.mymap = L.map(element[0]).setView([scope.baseLat, scope.baseLon], scope.baseScale);

            scope.markers = [];

            scope.externalControl = scope.control || {};
            scope.externalControl.invalidate = function() {
                scope.mymap.invalidateSize();
            }

            if (scope.layers && scope.layers.wms) {
                angular.forEach(scope.layers.wms, function(value, key) {
                    L.tileLayer.wms(value.url, {
                        layers: value.layers,
                        crc: value.crc,
                        transparent: value.transparent,
                        format: value.format
                    }).addTo(scope.mymap);
                });
            }

            /*
            L.tileLayer(scope.server, {
                maxZoom: 18
            }).addTo(scope.mymap);
            */
            $(element[0].firstChild).resize(function() {
                scope.mymap.invalidateSize();
            })

            /** Register navigate function on external control object */
            scope.externalControl.navigateMap = function(lat, lon, zoom) {
                if (lat != undefined && lon != undefined) {
                    scope.mymap.setView([lat, lon], zoom ? zoom : 13)
                }
            }

            scope.recreateMarkers = function() {
                for (var i = 0; i < scope.markers.length; i++) {
                    scope.mymap.removeLayer(scope.markers[i]);
                }
                scope.markers = [];
                for (var i = 0; i < scope.items.length; i++) {
                    var icon = L.icon({
                        iconUrl: 'img/markers/customs.png',

                        iconSize:     [32, 37], // size of the icon
                        shadowSize:   [50, 64], // size of the shadow
                        iconAnchor:   [16, 37], // point of the icon which will correspond to marker's location
                        shadowAnchor: [16, 37],  // the same for the shadow
                        popupAnchor:  [16, -37] // point from which the popup should open relative to the iconAnchor
                    });
                    scope.markers[i] = new L.marker([scope.getDescendantProp(scope.items[i], scope.lat), scope.getDescendantProp(scope.items[i], scope.lon)], {icon: icon});
                    scope.markers[i].bindPopup('<b>' + scope.getDescendantProp(scope.items[i], scope.name) + '</b></br><small class="text-muted">' + scope.getDescendantProp(scope.items[i], scope.subname) + '</small><hr><i class="fa fa-male"></i><i class="fa fa-train"></i>').openPopup();
                    /*scope.markers[i].bindLabel(scope.getDescendantProp(scope.items[i, scope.name), {noHide: true, className: "car-label", offset: [0, 0] });*/
                    scope.markers[i].addTo(scope.mymap).on('click', function(item) {
                        return function() {
                            scope.selectCallback(item)
                        };
                    }(scope.items[i]));
                }
            }

            /* Настройка изменений маркеров */
            scope.$watchCollection('items', function(newItems, oldItems) {
                scope.recreateMarkers();
            });

            /* Настройка триггеров перерисовки */
            scope.$watch(
                function () {
                    return element[0].getBoundingClientRect().height;
                },

                function () {
                    scope.mymap.invalidateSize();
                });

            scope.$watch(
                function () {
                    return element[0].getBoundingClientRect().width;
                },

                function () {
                    scope.mymap.invalidateSize();
                });
        }
    };
});

})(angular);
