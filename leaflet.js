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
            control: '=?',
            items: '=',
            /* Путь до свойства с широтой */
            lat: '@?',
            /* Путь до свойства с долготой */
            lon: '@?',
            /* Путь до свойства, по которому можно дифференцировать иконку */
            iconDiffPath: '@?',
            /* Функция, получающая код (название) части иконки по объекту diff */
            iconDiffFunc: '=?',
            /* Путь до свойства, по которому можно статус объекта (для определения иконки) */
            iconStatusPath: '@?',
            /* Функция, получающая код (название) части иконки по объекту status */
            iconStatusFunc: '=?',
            /* Базовый шаблон для определения адреса иконки (передаются ппараметры diff и статус) */
            iconBaseFormat: '@?',
            /* Настройки размера иконок */
            iconSettings: '=?',
            baseLat: '@?',
            baseLon: '@?',
            baseScale: '@?',
            name: '@',
            subname: '@',
            selectCallback: '=?selectOnMapCallback',
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
            scope.mymap = L.map(element[0]).setView([scope.baseLat ? scope.baseLat : 0, scope.baseLon ? scope.baseLon : 0], scope.baseScale ? scope.baseScale : 13);

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

                    /* Определение иконки по главному свойству */
                    var iconValueRaw = scope.getDescendantProp(scope.items[i], scope.iconDiffPath);
                    if (iconValueRaw != null && scope.iconDiffFunc) {
                        var iconValue = scope.iconDiffFunc(iconValueRaw);
                    } else {
                        var iconValue = iconValueRaw;
                    }

                    /* Определение иконки по втричному свойству (статусу) */
                    var iconStatusRaw = scope.getDescendantProp(scope.items[i], scope.iconStatusPath);
                    if (iconStatusRaw != null && scope.iconStatusFunc) {
                        var iconStatus = scope.iconStatusFunc(iconStatusRaw);
                    } else {
                        var iconStatus = iconStatusRaw;
                    }

                    if (iconValue) {
                        /* Формирвоание конечного URL иконки по главному и вторичному признаку */
                        var iconURL = scope.format(scope.iconBaseFormat, iconValue, iconStatus);
                        var icon = L.icon({
                            iconUrl: iconURL,

                            iconSize: (scope.iconSettings) ? (scope.iconSettings.iconSize) : undefined,
                            shadowSize: (scope.iconSettings) ? (scope.iconSettings.shadowSize) : undefined,
                            iconAnchor: (scope.iconSettings) ? (scope.iconSettings.iconAnchor) : undefined,
                            shadowAnchor: (scope.iconSettings) ? (scope.iconSettings.shadowAnchor) : undefined,
                            popupAnchor: (scope.iconSettings) ? (scope.iconSettings.popupAnchor) : undefined
                        });
                        scope.markers[i] = new L.marker([scope.getDescendantProp(scope.items[i], scope.lat), scope.getDescendantProp(scope.items[i], scope.lon)], {icon: icon});
                        scope.markers[i].bindPopup('<b>' + scope.getDescendantProp(scope.items[i], scope.name) + '</b></br><small class="text-muted">' + scope.getDescendantProp(scope.items[i], scope.subname) + '</small><hr><i class="fa fa-male"></i><i class="fa fa-train"></i>').openPopup();
                        /*scope.markers[i].bindLabel(scope.getDescendantProp(scope.items[i, scope.name), {noHide: true, className: "car-label", offset: [0, 0] });*/
                        scope.markers[i].addTo(scope.mymap).on('click', function (item) {
                            return function () {
                                if (scope.selectCallback) {
                                    scope.selectCallback(item)
                                }
                            };
                        }(scope.items[i]));
                    }
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

            scope.format = function(str) {
                var args = arguments;
                return str.replace(/{[0-9]}/g, function(matched) {
                    return args[parseInt(matched.replace(/[{}]/g, '')) + 1];
                });
            }
        }
    };
});

})(angular);
