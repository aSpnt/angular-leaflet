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
            dynamicLayers: '=?',
            baseLat: '@?',
            baseLon: '@?',
            baseScale: '@?',
            layers: '='
        },
        templateUrl: 'template/leaflet.html',
        controller: ["$scope", "$interpolate", "$templateRequest", function(scope, interpolate, templateRequest) {

            scope.interpolate = interpolate;
            scope.templateRequest = templateRequest;
            scope.overlay = [];

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

            scope.externalControl.flyToBounds = function(southWestRaw, northEastRaw) {
                var southWest = L.latLng(southWestRaw.lat, southWestRaw.lng);
                var northEast = L.latLng(northEastRaw.lat, northEastRaw.lng);
                scope.mymap.fitBounds(new L.LatLngBounds([southWest, northEast]))
            }

            /* items - объекты для которых строятся маркеры, layer:  layerGroup */
            scope.recreateMarkers = function(layerData, layer) {
                layer.clearLayers();

                for (var i = 0; i < layerData.items.length; i++) {

                    /* Определение иконки по главному свойству */
                    var iconValueRaw = scope.getDescendantProp(layerData.items[i], layerData.iconDiffPath);
                    if (iconValueRaw != null && layerData.iconDiffFunc) {
                        var iconValue = layerData.iconDiffFunc(iconValueRaw);
                    } else {
                        var iconValue = iconValueRaw;
                    }

                    /* Определение иконки по втричному свойству (статусу) */
                    var iconStatusRaw = scope.getDescendantProp(layerData.items[i], layerData.iconStatusPath);
                    if (iconStatusRaw != null && layerData.iconStatusFunc) {
                        var iconStatus = layerData.iconStatusFunc(iconStatusRaw);
                    } else {
                        var iconStatus = iconStatusRaw;
                    }

                    if (iconValue) {
                        /* Формирвоание конечного URL иконки по главному и вторичному признаку */
                        var iconURL = scope.format(layerData.iconBaseFormat, iconValue, iconStatus);
                        var icon = L.icon({
                            iconUrl: iconURL,
                            shadowUrl: layerData.iconShadow,
                            iconSize: (layerData.iconSettings) ? (layerData.iconSettings.iconSize) : undefined,
                            shadowSize: (layerData.iconSettings) ? (layerData.iconSettings.shadowSize) : undefined,
                            iconAnchor: (layerData.iconSettings) ? (layerData.iconSettings.iconAnchor) : undefined,
                            shadowAnchor: (layerData.iconSettings) ? (layerData.iconSettings.shadowAnchor) : undefined,
                            popupAnchor: (layerData.iconSettings) ? (layerData.iconSettings.popupAnchor) : undefined
                        });
                        var newMarker = new L.marker([scope.getDescendantProp(layerData.items[i], layerData.lat), scope.getDescendantProp(layerData.items[i], layerData.lon)], {icon: icon})

                        /* Установка значения z-index */
                        newMarker.setZIndexOffset((layerData.zIndexOffset ? layerData.zIndexOffset : 0) + i);

                        layer.addLayer(newMarker);

                        /* Если функция динамической подгрузки не указана, всплывающее меню генерируется заранее */
                        if (!layerData.popupPromise) {
                            var closure = scope.$new(true);
                            closure.marker = newMarker;
                            closure.item = layerData.items[i];
                            (function (closure) {
                                scope.templateRequest(layerData.templatePopup).then(function (html) {
                                    var compiled = scope.interpolate(html)(closure);
                                    closure.marker.bindPopup(compiled);
                                });
                            })(closure);
                        }

                        /*scope.markers[i].bindLabel(scope.getDescendantProp(scope.items[i, scope.name), {noHide: true, className: "car-label", offset: [0, 0] });*/
                        newMarker.on('click', function (item, marker) {
                            return function () {
                                /* Если функция динамической подгрузки указана, генерируется всплывающее меню */
                                if (layerData.popupPromise) {
                                    layerData.popupPromise(item.id).then(function(checkpoint) {
                                        var closure = scope.$new(true);
                                        closure.item = checkpoint;
                                        scope.templateRequest(layerData.templatePopup).then(function (html) {
                                            var compiled = scope.interpolate(html)(closure);
                                            marker.bindPopup(compiled).openPopup();
                                        });
                                    });
                                }
                                if (layerData.selectCallback) {
                                    layerData.selectCallback(item)
                                }
                            };
                        }(layerData.items[i], newMarker));
                    }
                }
            }

            /* Настройка реакции на изменение списоков данных */
            scope.recreateAll = function() {
                if (scope.overlay) {
                    for (var i = 0; i < scope.overlay.length; i++) {
                        if (scope.overlay[i].collectionDestroyer) {
                            scope.overlay[i].collectionDestroyer();
                        }
                        if (scope.overlay[i].itemDestroyer) {
                            scope.overlay[i].itemDestroyer();
                        }
                    }
                }
                scope.overlay = [];
                if (scope.dynamicLayers) {
                    for (var i = 0; i < scope.dynamicLayers.length; i++) {
                        scope.overlay[i] = L.layerGroup();
                        if (scope.dynamicLayers[i]) {
                            (function(index) {
                                /* Перестроение при изменении данных */
                                scope.overlay[index].collectionDestroyer = scope.$watchCollection('dynamicLayers[' + index + '].items', function(newItems, oldItems) {
                                    scope.recreateMarkers(scope.dynamicLayers[index], scope.overlay[index]);
                                });
                            })(i);
                        }
                        scope.overlay[i].addTo(scope.mymap)
                    }
                }
            }
            scope.recreateAll();

            /* Пересоздание всех слоев при изменеении коллекции */
            scope.$watchCollection(scope.dynamicLayers, function(newItems, oldItems) {
                scope.recreateAll();
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
